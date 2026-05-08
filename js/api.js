/**
 * api.js - 飘雪影视数据层
 * 
 * ⚠️ 使用前必须先部署 Cloudflare Worker：
 *    1. 注册 https://workers.cloudflare.com
 *    2. 创建 Worker，粘贴 cloudflare-worker.js 内容，Deploy
 *    3. 将你的 Worker 地址填入下方 WORKER_BASE
 * 
 * Worker 地址格式：https://你的名字.workers.dev
 */

const API = (() => {

  // ⬇️ 填入你的 Cloudflare Worker 地址（部署后替换这里）
  const WORKER_BASE = 'https://way-movie.sir-way105.workers.dev';

  // 5条精选数据源（通过Worker中转，无跨域问题）
  const SOURCE_NAMES = ['百度云资源', '非凡资源', '量子资源', '木童目资源', '蓝之资源'];

  const TYPE_MAP = { movie:'1', tv:'2', anime:'4', variety:'3' };

  // ================================================================
  //  检查 Worker 是否已配置
  // ================================================================
  function isWorkerConfigured() {
    return WORKER_BASE && !WORKER_BASE.includes('YOUR_WORKER');
  }

  // ================================================================
  //  核心请求
  // ================================================================
  async function fetchData(params, sourceIdx = 0) {
    if (!isWorkerConfigured()) {
      throw new Error('WORKER_NOT_CONFIGURED');
    }

    const url = new URL(WORKER_BASE);
    url.searchParams.set('source', sourceIdx);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    });

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || data.list === undefined) throw new Error('数据格式异常');
    return data;
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

  // ================================================================
  //  Public API
  // ================================================================

  async function getList(type, page = 1, filter = '') {
    const idx = getPreferredSourceIdx();
    return fetchData({ ac:'videolist', t:TYPE_MAP[type]||'1', pg:page, f:filter }, idx);
  }

  async function search(keyword) {
    const idx = getPreferredSourceIdx();
    return fetchData({ ac:'videolist', wd:keyword }, idx);
  }

  async function getDetail(id) {
    const idx = getPreferredSourceIdx();
    const data = await fetchData({ ac:'videolist', ids:id }, idx);
    const list = data?.list || [];
    if (!list.length) throw new Error('未找到视频');
    const item = list[0];
    item._parsedUrls = parsePlayUrls(item.vod_play_url, item.vod_play_from);
    item._sourceIdx = idx;
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

  return {
    getList, search, getDetail, getHomeData, buildPlayerUrl,
    SOURCE_NAMES, TYPE_MAP, isWorkerConfigured,
  };
})();
