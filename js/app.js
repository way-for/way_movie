/**
 * app.js - 首页主逻辑
 */

/* ---------- 卡片渲染 ---------- */
function buildCard(item, type) {
  const id=item.vod_id, name=item.vod_name||'', pic=item.vod_pic||'';
  const year=item.vod_year||'', score=item.vod_score||'', tag=item.vod_remarks||'';
  return `
    <div class="card" onclick="toDetail('${id}')">
      <div class="card-thumb">
        ${pic?`<img src="${pic}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\"no-img\\">🎬</div>'">`:`<div class="no-img">🎬</div>`}
        ${score?`<span class="card-score">⭐${score}</span>`:''}
        ${tag?`<span class="card-tag">${tag}</span>`:''}
        <div class="card-play-overlay"><svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <div class="card-info">
        <div class="card-title">${name}</div>
        <div class="card-meta">${year||type||''}</div>
      </div>
    </div>`;
}

function buildSkeletons(count, rowId) {
  const el = document.getElementById(rowId); if(!el) return;
  el.innerHTML = Array(count||8).fill(`
    <div class="skeleton skeleton-card">
      <div class="skeleton" style="aspect-ratio:2/3;border-radius:10px 10px 0 0"></div>
      <div class="skeleton" style="height:12px;margin:10px 8px 4px;border-radius:4px"></div>
      <div class="skeleton" style="height:10px;width:60%;margin:0 8px 10px;border-radius:4px"></div>
    </div>`).join('');
}

/* ---------- 跳转 ---------- */
function toDetail(id) {
  window.location.href = 'pages/detail.html?id=' + id;
}

/* ---------- 搜索 ---------- */
let searchOpen = false;
function toggleSearch() {
  searchOpen = !searchOpen;
  const bar = document.getElementById('searchBar');
  bar.classList.toggle('open', searchOpen);
  if (searchOpen) setTimeout(() => document.getElementById('searchInput')?.focus(), 50);
}
function doSearch() {
  const kw = document.getElementById('searchInput')?.value?.trim();
  if (kw) window.location.href = 'pages/search.html?q=' + encodeURIComponent(kw);
}

/* ---------- Hero ---------- */
function renderHero(item) {
  if (!item) return;
  document.getElementById('heroTitle').textContent = item.vod_name || '';
  document.getElementById('heroDesc').textContent  = (item.vod_content||item.vod_blurb||'').replace(/<[^>]+>/g,'');
  document.getElementById('heroPoster').innerHTML  =
    item.vod_pic ? `<img src="${item.vod_pic}" alt="${item.vod_name}" onerror="this.style.display='none'">` : '';
  document.getElementById('heroPlayBtn').onclick = () => toDetail(item.vod_id);
  document.getElementById('heroInfoBtn').onclick  = () => toDetail(item.vod_id);
}

/* ---------- Worker 未配置提示 ---------- */
function showWorkerGuide() {
  const rows = ['movieRow','tvRow','animeRow','varietyRow'];
  rows.forEach(id => {
    const el = document.getElementById(id); if(!el) return;
    el.innerHTML = '';
  });
  document.getElementById('heroTitle').textContent = '欢迎使用飘雪影视';
  document.getElementById('heroDesc').textContent  = '还差最后一步！需要配置 Cloudflare Worker 代理才能加载内容。';

  // 在内容区显示配置引导
  const wrap = document.querySelector('.content-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div style="max-width:680px;margin:0 auto;padding:40px 20px;text-align:center">
      <div style="font-size:3rem;margin-bottom:16px">⚙️</div>
      <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:12px">还差最后一步</h2>
      <p style="color:var(--text-dim);line-height:1.8;margin-bottom:32px">
        由于浏览器安全限制，需要部署一个免费的 <strong>Cloudflare Worker</strong> 中转代理，才能加载视频内容。<br>
        全程免费，按步骤操作约需 <strong>5 分钟</strong>。
      </p>
      <div style="text-align:left;background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px">
        <div style="display:flex;flex-direction:column;gap:20px">
          ${[
            ['1','注册 Cloudflare 账号','访问 <a href="https://workers.cloudflare.com" target="_blank" style="color:var(--accent)">workers.cloudflare.com</a>，用邮箱免费注册（无需信用卡）'],
            ['2','创建 Worker','登录后点击 Workers & Pages → Create → Create Worker'],
            ['3','粘贴代码','删除编辑器里的默认代码，把压缩包里 <code style="background:var(--bg3);padding:2px 6px;border-radius:4px">cloudflare-worker.js</code> 的全部内容粘贴进去'],
            ['4','部署','点击右上角 <strong>Deploy</strong>，复制页面显示的 Worker 地址（格式：xxx.workers.dev）'],
            ['5','填入地址','用记事本打开 <code style="background:var(--bg3);padding:2px 6px;border-radius:4px">js/api.js</code>，将第 13 行的<br><code style="background:var(--bg3);padding:2px 6px;border-radius:4px">YOUR_WORKER</code> 替换成你的 Worker 地址，上传到 GitHub 覆盖原文件'],
          ].map(([n,title,desc]) => `
            <div style="display:flex;gap:16px;align-items:flex-start">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${n}</div>
              <div>
                <div style="font-weight:600;margin-bottom:4px">${title}</div>
                <div style="font-size:.85rem;color:var(--text-dim);line-height:1.7">${desc}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <p style="margin-top:20px;font-size:.82rem;color:var(--text-muted)">
        配置完成后刷新页面，所有内容将正常加载 ✅
      </p>
    </div>`;
}

/* ---------- 首页数据加载 ---------- */
async function loadHome() {
  // 检查 Worker 是否已配置
  if (!API.isWorkerConfigured()) {
    showWorkerGuide();
    return;
  }

  ['movieRow','tvRow','animeRow','varietyRow'].forEach(id => buildSkeletons(8, id));

  try {
    const data = await API.getHomeData();
    const heroItem = data.movie[0] || data.tv[0];
    renderHero(heroItem);

    const rowMap = {
      movieRow:   { items: data.movie,   type:'电影' },
      tvRow:      { items: data.tv,      type:'剧集' },
      animeRow:   { items: data.anime,   type:'动漫' },
      varietyRow: { items: data.variety, type:'综艺' },
    };

    for (const [rowId, { items, type }] of Object.entries(rowMap)) {
      const el = document.getElementById(rowId); if(!el) continue;
      el.innerHTML = items.length
        ? items.slice(0,12).map(i => buildCard(i, type)).join('')
        : `<p style="color:var(--text-muted);padding:16px;font-size:.85rem">暂无内容</p>`;
    }
  } catch(e) {
    console.error('首页加载失败:', e);
    ['movieRow','tvRow','animeRow','varietyRow'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.innerHTML = `<p style="color:var(--text-muted);padding:16px;font-size:.85rem">⚠️ 加载失败，请刷新重试</p>`;
    });
  }
}

/* ---------- 导航滚动 ---------- */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.4)' : '';
});

document.addEventListener('DOMContentLoaded', loadHome);
