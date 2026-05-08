/**
 * Cloudflare Worker - 飘雪影视 API 代理
 * 
 * 部署步骤（全免费，5分钟完成）：
 * 1. 注册 https://workers.cloudflare.com （免费账号即可）
 * 2. 进入 Workers & Pages → Create → Create Worker
 * 3. 把这个文件的全部内容粘贴进去，点击 Deploy
 * 4. 复制你的 Worker 地址（格式：xxx.workers.dev）
 * 5. 把地址填入 api.js 的 WORKER_BASE 变量
 * 
 * 免费额度：每天 10 万次请求，完全够用
 */

// 5条精选数据源（速度快、内容全、无广告）
const SOURCES = [
  'https://api.apibdzy.com/api.php/provide/vod',      // 百度云资源（最稳定）
  'https://api.ffzyapi.com/api.php/provide/vod',       // 非凡资源（速度快）
  'https://api.jyszyapi.com/api.php/provide/vod',      // 量子资源（内容全）
  'https://api.mtongmu.com/api.php/provide/vod',       // 木童目资源
  'https://cj.lziapi.com/api.php/provide/vod',         // 蓝之资源
];

export default {
  async fetch(request) {
    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const url = new URL(request.url);
    
    // 解析参数
    const sourceIdx = parseInt(url.searchParams.get('source') || '0') % SOURCES.length;
    const ac   = url.searchParams.get('ac')  || 'videolist';
    const t    = url.searchParams.get('t')   || '';
    const pg   = url.searchParams.get('pg')  || '1';
    const wd   = url.searchParams.get('wd')  || '';
    const ids  = url.searchParams.get('ids') || '';
    const f    = url.searchParams.get('f')   || '';

    // 构建目标URL
    const base = SOURCES[sourceIdx];
    const target = new URL(base);
    target.searchParams.set('ac', ac);
    if (t)   target.searchParams.set('t',   t);
    if (pg)  target.searchParams.set('pg',  pg);
    if (wd)  target.searchParams.set('wd',  wd);
    if (ids) target.searchParams.set('ids', ids);
    if (f)   target.searchParams.set('f',   f);

    // 自动重试所有源
    for (let i = 0; i < SOURCES.length; i++) {
      const tryIdx = (sourceIdx + i) % SOURCES.length;
      const tryBase = SOURCES[tryIdx];
      const tryUrl = new URL(tryBase);
      tryUrl.searchParams.set('ac', ac);
      if (t)   tryUrl.searchParams.set('t',   t);
      if (pg)  tryUrl.searchParams.set('pg',  pg);
      if (wd)  tryUrl.searchParams.set('wd',  wd);
      if (ids) tryUrl.searchParams.set('ids', ids);
      if (f)   tryUrl.searchParams.set('f',   f);

      try {
        const resp = await fetch(tryUrl.toString(), {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cf: { cacheTtl: 300 }, // 缓存5分钟
        });
        if (!resp.ok) continue;
        const data = await resp.json();
        if (!data || data.list === undefined) continue;

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300',
          }
        });
      } catch(e) {
        continue;
      }
    }

    return new Response(JSON.stringify({ code: 0, msg: '所有数据源不可用', list: [] }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
