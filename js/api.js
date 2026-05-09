/**
 * api.js - 飘雪影视数据层
 * Worker地址已配置：https://way-movie.sir-way105.workers.dev
 */
const API = (() => {
  const W = 'https://way-movie.sir-way105.workers.dev';

  const TYPE = { movie:'1', tv:'2', anime:'4', variety:'3' };

  function srcIdx() {
    try {
      const u = localStorage.getItem('mc_current');
      if (u) {
        const d = JSON.parse(localStorage.getItem('mc_user_'+u)||'{}');
        return parseInt(d.settings?.defaultSource)||0;
      }
    } catch(e){}
    return 0;
  }

  async function req(params) {
    const p = new URLSearchParams({ s: srcIdx(), ...params });
    const res = await fetch(`${W}/?${p}`, { signal: AbortSignal.timeout(12000) });
    const data = await res.json();
    return data;
  }

  async function getList(type, page=1, filter='') {
    const p = { ac:'videolist', t:TYPE[type]||'1', pg:page };
    if (filter) p.f = filter;
    return req(p);
  }

  async function search(kw) {
    return req({ ac:'videolist', wd:kw });
  }

  async function getDetail(id) {
    const data = await req({ ac:'videolist', ids:id });
    const item = (data.list||[])[0];
    if (!item) throw new Error('未找到');
    item._urls = parseUrls(item.vod_play_url, item.vod_play_from);
    return item;
  }

  async function getHomeData() {
    const [a,b,c,d] = await Promise.allSettled([
      getList('movie',1), getList('tv',1), getList('anime',1), getList('variety',1)
    ]);
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
    if (/\.(m3u8|mp4|flv)/i.test(url)||url.startsWith('http'))
      return 'https://player.v.geilijiasu.com/danmu.php?url='+encodeURIComponent(url);
    return url;
  }

  // 始终返回true，Worker地址已硬编码
  function isWorkerConfigured() { return true; }

  return { getList, search, getDetail, getHomeData, buildPlayerUrl, isWorkerConfigured, TYPE };
})();
