/**
 * api.js - 飘雪影视数据层
 * 使用支持 CORS 的苹果CMS公开JSON接口
 */

const API = (() => {

  const SOURCES = [
    { name: '线路一', api: 'https://api.xinlangapi.com/xinlangapi.php/provide/vod' },
    { name: '线路二', api: 'https://api.lziapi.com/api.php/provide/vod'            },
    { name: '线路三', api: 'https://api.feizhuapi.com/api.php/provide/vod'         },
    { name: '线路四', api: 'https://cj.lziapi.com/api.php/provide/vod'             },
  ];

  const TYPE_MAP = { movie:'1', tv:'2', anime:'4', variety:'3' };

  async function fetchJSON(url) {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  function getPreferredSourceIdx() {
    try {
      const username = localStorage.getItem('mc_current');
      if (username) {
        const d = JSON.parse(localStorage.getItem('mc_user_' + username) || '{}');
        if (d.settings?.defaultSource !== undefined) return parseInt(d.settings.defaultSource) || 0;
      }
    } catch(e) {}
    return 0;
  }

  async function request(buildUrl, startIdx) {
    const idx = startIdx ?? getPreferredSourceIdx();
    const errors = [];
    for (let i = 0; i < SOURCES.length; i++) {
      const src = SOURCES[(idx + i) % SOURCES.length];
      try {
        const data = await fetchJSON(buildUrl(src));
        if (data && data.list !== undefined) return { data, sourceIdx: (idx+i) % SOURCES.length };
      } catch(e) { errors.push(src.name + ': ' + e.message); }
    }
    throw new Error('所有数据源不可用');
  }

  async function getList(type, page=1, filter='') {
    const tid = TYPE_MAP[type] || '1';
    const {data} = await request(src => {
      let u = src.api + '/?ac=videolist&t=' + tid + '&pg=' + page;
      if (filter) u += '&f=' + encodeURIComponent(filter);
      return u;
    });
    return data;
  }

  async function search(keyword) {
    const {data} = await request(src => src.api + '/?ac=videolist&wd=' + encodeURIComponent(keyword));
    return data;
  }

  async function getDetail(id) {
    const {data, sourceIdx} = await request(src => src.api + '/?ac=videolist&ids=' + id);
    const list = data?.list || [];
    if (!list.length) throw new Error('未找到视频');
    const item = list[0];
    item._parsedUrls = parsePlayUrls(item.vod_play_url, item.vod_play_from);
    item._sourceIdx = sourceIdx;
    return item;
  }

  async function getHomeData() {
    const [movies, tvs, animes, varieties] = await Promise.allSettled([
      getList('movie',1), getList('tv',1), getList('anime',1), getList('variety',1),
    ]);
    return {
      movie:   movies.status==='fulfilled'    ? (movies.value?.list    || []) : [],
      tv:      tvs.status==='fulfilled'       ? (tvs.value?.list       || []) : [],
      anime:   animes.status==='fulfilled'    ? (animes.value?.list    || []) : [],
      variety: varieties.status==='fulfilled' ? (varieties.value?.list || []) : [],
    };
  }

  function parsePlayUrls(playUrlStr, playFrom) {
    if (!playUrlStr) return [];
    const fromArr = (playFrom||'').split('$$$');
    return playUrlStr.split('$$$').map((group, gi) => {
      const episodes = group.split('#').map((ep, i) => {
        const parts = ep.split('$');
        return { name: parts[0]||('第'+(i+1)+'集'), url: parts[1]||parts[0]||'' };
      }).filter(ep => ep.url);
      return { name: fromArr[gi]||('线路'+(gi+1)), episodes };
    }).filter(g => g.episodes.length > 0);
  }

  function buildPlayerUrl(videoUrl) {
    if (!videoUrl) return '';
    if (/\.(m3u8|mp4|flv)/i.test(videoUrl) || videoUrl.startsWith('http')) {
      return 'https://player.v.geilijiasu.com/danmu.php?url=' + encodeURIComponent(videoUrl);
    }
    return videoUrl;
  }

  return { getList, search, getDetail, getHomeData, buildPlayerUrl, SOURCES, TYPE_MAP };
})();
