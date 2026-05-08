/**
 * app.js - 首页主逻辑
 * 加载各分类内容，渲染卡片，处理搜索
 */

/* ---------- 卡片渲染工具 ---------- */

function buildCard(item, type = '') {
  const id   = item.vod_id || item.id;
  const name = item.vod_name || item.name || '未知';
  const pic  = item.vod_pic  || item.pic  || '';
  const year = item.vod_year || item.year || '';
  const score= item.vod_score|| item.score|| '';
  const tag  = item.vod_remarks || '';

  return `
    <div class="card" onclick="toDetail('${id}','${encodeURIComponent(name)}')">
      <div class="card-thumb">
        ${pic
          ? `<img src="${pic}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\"no-img\\">🎬</div>'">`
          : `<div class="no-img">🎬</div>`}
        ${score ? `<span class="card-score">⭐${score}</span>` : ''}
        ${tag ? `<span class="card-tag">${tag}</span>` : ''}
        <div class="card-play-overlay">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${name}</div>
        <div class="card-meta">${year || type}</div>
      </div>
    </div>`;
}

function buildSkeletons(count = 8, rowId) {
  const el = document.getElementById(rowId);
  if (!el) return;
  el.innerHTML = Array(count).fill(`
    <div class="skeleton skeleton-card">
      <div class="skeleton skeleton-thumb"></div>
      <div class="skeleton skeleton-line" style="margin:10px 8px 4px"></div>
      <div class="skeleton skeleton-line short" style="margin:0 8px 10px"></div>
    </div>`).join('');
}

/* ---------- 跳转详情页 ---------- */

function toDetail(id, name) {
  window.location.href = `pages/detail.html?id=${id}`;
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
  if (!kw) return;
  window.location.href = `pages/search.html?q=${encodeURIComponent(kw)}`;
}

/* ---------- Hero Banner ---------- */

function renderHero(item) {
  if (!item) return;
  const id    = item.vod_id;
  const name  = item.vod_name  || '';
  const pic   = item.vod_pic   || '';
  const desc  = item.vod_content|| item.vod_blurb || '';

  document.getElementById('heroTitle').textContent = name;
  document.getElementById('heroDesc').textContent  = desc.replace(/<[^>]+>/g, '');
  document.getElementById('heroPoster').innerHTML  =
    pic ? `<img src="${pic}" alt="${name}" onerror="this.style.display='none'">` : '';

  document.getElementById('heroPlayBtn').onclick = () => toDetail(id);
  document.getElementById('heroInfoBtn').onclick  = () => toDetail(id);
}

/* ---------- 首页数据加载 ---------- */

async function loadHome() {
  // 先渲染骨架屏
  ['movieRow','tvRow','animeRow','varietyRow'].forEach(id => buildSkeletons(8, id));

  try {
    const data = await API.getHomeData();

    // Hero：取电影第一条
    const heroItem = data.movie[0] || data.tv[0];
    renderHero(heroItem);

    // 渲染各行
    const rowMap = {
      movieRow:   { items: data.movie,   type: '电影'  },
      tvRow:      { items: data.tv,      type: '剧集'  },
      animeRow:   { items: data.anime,   type: '动漫'  },
      varietyRow: { items: data.variety, type: '综艺'  },
    };

    for (const [rowId, { items, type }] of Object.entries(rowMap)) {
      const el = document.getElementById(rowId);
      if (!el) continue;
      if (!items.length) {
        el.innerHTML = `<p style="color:var(--text-muted);padding:16px;font-size:0.85rem">暂无内容，数据源可能受限</p>`;
        continue;
      }
      el.innerHTML = items.slice(0, 12).map(i => buildCard(i, type)).join('');
    }

  } catch (e) {
    console.error('首页加载失败:', e);
    ['movieRow','tvRow','animeRow','varietyRow'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<p style="color:var(--text-muted);padding:16px;font-size:0.85rem">⚠️ 数据加载失败，请刷新重试</p>`;
    });
  }
}

/* ---------- 导航栏滚动效果 ---------- */

window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.4)' : '';
});

/* ---------- 初始化 ---------- */

document.addEventListener('DOMContentLoaded', () => {
  loadHome();
});
