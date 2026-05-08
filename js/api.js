/**
 * api.js - 苹果CMS公开数据源聚合层
 * 支持多数据源自动切换，内容含电影/剧集/动漫/综艺
 */

const API = (() => {

  // =====================================================
  //  多数据源配置（公开苹果CMS站点，内容覆盖全面）
  //  如某个源失效，自动切换下一个
  // =====================================================
  const SOURCES = [
    {
      name: '线路一',
      api:  'https://caiji.moduapi.cc/api.php/provide/vod',
      play: 'https://caiji.moduapi.cc/api.php/provide/vod/at/xml'
    },
    {
      name: '线路二',
      api:  'https://api.apibdzy.com/api.php/provide/vod',
      play: 'https://api.apibdzy.com/api.php/provide/vod/at/xml'
    },
    {
      name: '线路三',
      api:  'https://api.innkk.com/api.php/provide/vod',
      play: 'https://api.innkk.com/api.php/provide/vod/at/xml'
    },
  ];

  // 苹果CMS分类ID映射
  const TYPE_MAP = {
    movie:   '1',  // 电影
    tv:      '2',  // 电视剧
    anime:   '4',  // 动漫
    variety: '3',  // 综艺
  };

  let currentSourceIdx = 0;

  // 读取用户设置的默认线路
  function getSourceIdx() {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user') || '{}');
      if (u.settings && u.settings.defaultSource !== undefined) {
        return parseInt(u.settings.defaultSource) || 0;
      }
    } catch(e) {}
    return currentSourceIdx;
  }

  function getSource(idx) {
    return SOURCES[idx % SOURCES.length];
  }

  /**
   * 核心请求函数 - 通过 JSONP 绕过跨域
   * @param {string} url
   * @returns {Promise<object>}
   */
  function fetchJSONP(url) {
    return new Promise((resolve, reject) => {
      const cbName = 'mc_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('timeout'));
      }, 8000);

      window[cbName] = (data) => {
        cleanup();
        resolve(data);
      };

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      script.onerror = () => { cleanup(); reject(new Error('network error')); };
      script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName;
      document.head.appendChild(script);
    });
  }

  /**
   * 带自动重试的请求（最多尝试所有源）
   */
  async function request(buildUrl, sourceIdx = getSourceIdx()) {
    for (let i = 0; i < SOURCES.length; i++) {
      const idx = (sourceIdx + i) % SOURCES.length;
      try {
        const url = buildUrl(getSource(idx));
        const data = await fetchJSONP(url);
        if (data && (data.list || data.code === 1)) {
          currentSourceIdx = idx;
          return { data, sourceIdx: idx };
        }
      } catch (e) {
        console.warn(`源${idx}请求失败:`, e.message);
      }
    }
    throw new Error('所有数据源均不可用');
  }

  // =====================================================
  //  Public API
  // =====================================================

  /**
   * 获取分类列表
   * @param {string} type  movie/tv/anime/variety
   * @param {number} page
   * @param {string} filter  年份/地区等筛选，空=全部
   */
  async function getList(type, page = 1, filter = '') {
    const typeId = TYPE_MAP[type] || '1';
    const result = await request(src => {
      let url = `${src.api}/?ac=videolist&t=${typeId}&pg=${page}`;
      if (filter) url += `&f=${encodeURIComponent(filter)}`;
      return url;
    });
    return result.data;
  }

  /**
   * 搜索
   * @param {string} keyword
   */
  async function search(keyword) {
    const result = await request(src =>
      `${src.api}/?ac=videolist&wd=${encodeURIComponent(keyword)}`
    );
    return result.data;
  }

  /**
   * 获取视频详情（含播放地址）
   * @param {string|number} id
   */
  async function getDetail(id) {
    const result = await request(src =>
      `${src.api}/?ac=videolist&ids=${id}`
    );
    const list = result.data?.list || [];
    if (!list.length) throw new Error('未找到视频详情');

    const item = list[0];
    // 解析播放地址列表
    item._parsedUrls = parsePlayUrls(item.vod_play_url, item.vod_play_from);
    item._sourceIdx = result.sourceIdx;
    return item;
  }

  /**
   * 解析苹果CMS播放地址字符串
   * 格式: "线路名$url1#url2#url3"  多线路用"$$$"分隔
   */
  function parsePlayUrls(playUrlStr, playFrom) {
    if (!playUrlStr) return [];
    const fromArr = (playFrom || '').split('$$$');
    return playUrlStr.split('$$$').map((group, gi) => {
      const episodes = group.split('#').map((ep, i) => {
        const parts = ep.split('$');
        return {
          name: parts[0] || `第${i+1}集`,
          url:  parts[1] || parts[0] || ''
        };
      }).filter(ep => ep.url);
      return {
        name: fromArr[gi] || `线路${gi+1}`,
        episodes
      };
    }).filter(g => g.episodes.length > 0);
  }

  /**
   * 构建嵌入播放地址
   * 对于 m3u8 直链，使用内置播放器；其余用原始 iframe
   */
  function buildPlayerUrl(videoUrl) {
    if (!videoUrl) return '';
    if (videoUrl.includes('.m3u8') || videoUrl.startsWith('http')) {
      // 使用公共 HLS 播放器页面
      return `https://player.v.geilijiasu.com/danmu.php?url=${encodeURIComponent(videoUrl)}`;
    }
    return videoUrl;
  }

  /**
   * 获取首页推荐（取各分类最新几条）
   */
  async function getHomeData() {
    const [movies, tvs, animes, varieties] = await Promise.allSettled([
      getList('movie', 1),
      getList('tv',    1),
      getList('anime', 1),
      getList('variety',1),
    ]);
    return {
      movie:   movies.status   === 'fulfilled' ? (movies.value.list   || []) : [],
      tv:      tvs.status      === 'fulfilled' ? (tvs.value.list      || []) : [],
      anime:   animes.status   === 'fulfilled' ? (animes.value.list   || []) : [],
      variety: varieties.status=== 'fulfilled' ? (varieties.value.list|| []) : [],
    };
  }

  return {
    getList,
    search,
    getDetail,
    getHomeData,
    buildPlayerUrl,
    SOURCES,
    TYPE_MAP,
  };
})();
