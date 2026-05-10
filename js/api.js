/**
 * api.js - 飘雪影视数据层 v7
 * 锁定数据源，保证列表和详情用同一个源，内容不错乱
 */
const API = (() => {
  const W = 'https://way-movie.sir-way105.workers.dev';
  const TYPE = { movie:'1', tv:'2', anime:'4', variety:'3' };

  // 当前会话锁定的源索引（保证列表和详情用同一个源）
  let _lockedSrc = null;

  // 外部可设置 API._overrideSrc 来强制换源（电影页重试用）
  let _overrideSrc = null;

  function preferredSrc() {
    if (_overrideSrc !== null) return _overrideSrc % 12;
    try {
      const u = localStorage.getItem('mc_current');
      if (u) {
        const d = JSON.parse(localStorage.getItem('mc_user_'+u)||'{}');
        const idx = parseInt(d.settings?.defaultSource);
        if (!isNaN(idx)) return idx;
      }
    } catch(e){}
    return 0;
  }

  async function req(params, forceSrc) {
    const si = forceSrc ?? _lockedSrc ?? preferredSrc();
    const p = new URLSearchParams({ s: si, ...params });
    // 详情请求锁定源，避免和列表源不一致导致ID对不上
    if (forceSrc !== undefined) p.set('lock', '1');

    const res = await fetch(`${W}/?${p}`, { signal: AbortSignal.timeout(12000) });
    const data = await res.json();

    // 记录实际返回的源，后续详情请求用同一个源
    if (data._src !== undefined && _lockedSrc === null) {
      _lockedSrc = data._src;
    }
    return data;
  }

  async function getList(type, page=1, filter='') {
    const p = { ac:'videolist', t:TYPE[type]||'1', pg:page };
    if (filter) p.f = filter;
    _lockedSrc = null;
    const data = await req(p);
    // 锁定这次用的源，详情页保持一致
    if (data._src !== undefined) _lockedSrc = data._src;
    return data;
  }

  async function search(kw) {
    _lockedSrc = null;
    return req({ ac:'videolist', wd:kw });
  }

  async function getDetail(id) {
    // 详情锁定已知可用的源
    const src = _lockedSrc ?? preferredSrc();
    // 先用锁定源试，失败再遍历
    for (let i = 0; i < 8; i++) {
      const trySrc = (src + i) % 12;
      try {
        const data = await req({ ac:'videolist', ids:id }, trySrc);
        const item = (data.list||[])[0];
        if (!item) continue;
        item._urls = parseUrls(item.vod_play_url, item.vod_play_from);
        item._usedSrc = trySrc;
        return item;
      } catch(e) { continue; }
    }
    throw new Error('未找到视频详情');
  }

  async function getHomeData() {
    _lockedSrc = null;
    // 各分类独立请求，允许Worker自动换源找有数据的
    // 不强制lock，确保每个分类都能找到内容
    const [a,b,c,d] = await Promise.allSettled([
      req({ ac:'videolist', t:'1', pg:1 }),   // 电影
      req({ ac:'videolist', t:'2', pg:1 }),   // 剧集
      req({ ac:'videolist', t:'4', pg:1 }),   // 动漫
      req({ ac:'videolist', t:'3', pg:1 }),   // 综艺
    ]);
    // 用剧集的源作为后续详情查询的默认源（剧集数据最丰富最稳定）
    if (b.status==='fulfilled' && b.value?._src !== undefined) {
      _lockedSrc = b.value._src;
    }
    return {
      movie:   a.status==='fulfilled' ? (a.value?.list||[]) : [],
      tv:      b.status==='fulfilled' ? (b.value?.list||[]) : [],
      anime:   c.status==='fulfilled' ? (c.value?.list||[]) : [],
      variety: d.status==='fulfilled' ? (d.value?.list||[]) : [],
    };
  }

  function parseUrls(str, from) {
    if (!str) return [];
    const froms = (from||'').split('$$$');
    return str.split('$$$').map((g,gi)=>{
      const eps = g.split('#').map((ep,i)=>{
        const p = ep.split('$');
        return { name:p[0]||`第${i+1}集`, url:p[1]||p[0]||'' };
      }).filter(e=>e.url);
      return { name:froms[gi]||`线路${gi+1}`, episodes:eps };
    }).filter(g=>g.episodes.length);
  }

  function buildPlayerUrl(url) {
    if (!url) return '';
    return `${W}/player?url=${encodeURIComponent(url)}`;
  }

  function isWorkerConfigured() { return true; }

  // 暴露给外部控制
  const pub = { getList, search, getDetail, getHomeData, buildPlayerUrl, isWorkerConfigured, TYPE };
  Object.defineProperty(pub, '_overrideSrc', {
    get: () => _overrideSrc,
    set: (v) => { _overrideSrc = v; }
  });
  return pub;
})();
