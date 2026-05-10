/**
 * app.js - 首页逻辑（含Banner轮播）
 */

// =====================================================
//  Banner 轮播
// =====================================================
let bannerItems   = [];   // 轮播数据
let bannerIdx     = 0;    // 当前索引
let bannerTimer   = null; // 自动播放定时器
let bannerPaused  = false;
const BANNER_INTERVAL = 5000; // 5秒切换

function renderBanner(items) {
  if (!items.length) return;
  bannerItems = items;

  const slidesEl = document.getElementById('bannerSlides');
  const dotsEl   = document.getElementById('bannerDots');
  if (!slidesEl || !dotsEl) return;

  // 生成幻灯片
  slidesEl.innerHTML = items.map((item, i) => {
    const id   = item.vod_id;
    const name = item.vod_name || '';
    const pic  = item.vod_pic  || '';
    const year = item.vod_year || '';
    const area = item.vod_area || '';
    const score = parseFloat(item.vod_score) > 0 ? item.vod_score : '';
    const type = item.type_name || '';
    const desc = (item.vod_blurb || item.vod_content || '')
      .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().slice(0, 100);

    return `
      <div class="banner-slide ${i===0?'active':''}" id="slide${i}">
        <div class="banner-bg" style="background-image:url('${pic}')"></div>
        <div class="banner-mask"></div>
        ${pic ? `<div class="banner-poster"><img src="${pic}" alt="${name}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : ''}
        <div class="banner-content">
          <div class="banner-badge">✦ 推荐</div>
          <h2 class="banner-title">${name}</h2>
          <div class="banner-meta">
            ${score ? `<span class="score">⭐ ${score}</span>` : ''}
            ${year  ? `<span>${year}</span>` : ''}
            ${area  ? `<span>${area}</span>` : ''}
            ${type  ? `<span>${type}</span>` : ''}
          </div>
          ${desc ? `<p class="banner-desc">${desc}…</p>` : ''}
          <div class="banner-btns">
            <button class="btn-play" onclick="location.href='pages/detail.html?id=${id}'">▶ 立即播放</button>
            <button class="btn-info" onclick="location.href='pages/detail.html?id=${id}'">详情</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // 生成指示点
  dotsEl.innerHTML = items.map((_, i) =>
    `<button class="banner-dot ${i===0?'active':''}" onclick="gotoBanner(${i})"></button>`
  ).join('');

  // 启动自动播放
  startBanner();
}

function gotoBanner(idx) {
  const slides = document.querySelectorAll('.banner-slide');
  const dots   = document.querySelectorAll('.banner-dot');
  if (!slides.length) return;

  slides[bannerIdx]?.classList.remove('active');
  dots[bannerIdx]?.classList.remove('active');

  bannerIdx = (idx + bannerItems.length) % bannerItems.length;

  slides[bannerIdx]?.classList.add('active');
  dots[bannerIdx]?.classList.add('active');

  // 重置进度条
  resetProgress();
}

function moveBanner(dir) {
  gotoBanner(bannerIdx + dir);
  // 重置自动播放计时
  restartBanner();
}

function startBanner() {
  clearInterval(bannerTimer);
  resetProgress();
  bannerTimer = setInterval(() => {
    if (!bannerPaused) gotoBanner(bannerIdx + 1);
  }, BANNER_INTERVAL);
}

function restartBanner() {
  clearInterval(bannerTimer);
  startBanner();
}

function pauseBanner()  { bannerPaused = true;  }
function resumeBanner() { bannerPaused = false; }

// 进度条动画
function resetProgress() {
  const bar = document.getElementById('bannerProgress');
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0%';
  // 触发重排后开始动画
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.transition = `width ${BANNER_INTERVAL}ms linear`;
      bar.style.width = '100%';
    });
  });
}

// 触屏滑动支持
let touchStartX = 0;
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('banner');
  if (banner) {
    banner.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    banner.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) { moveBanner(dx < 0 ? 1 : -1); }
    });
  }
});

// =====================================================
//  卡片构建
// =====================================================
function buildCard(item) {
  const id=item.vod_id, name=item.vod_name||'', pic=item.vod_pic||'';
  const year=item.vod_year||'', score=item.vod_score||'', tag=item.vod_remarks||'';
  return `<div class="card" onclick="location.href='pages/detail.html?id=${id}'">
    <div class="card-thumb">
      ${pic?`<img src="${pic}" loading="lazy" onerror="this.style.display='none'">`:''}
      ${!pic?`<div class="no-img">🎬</div>`:''}
      ${score&&parseFloat(score)>0?`<span class="card-score">⭐${score}</span>`:''}
      ${tag?`<span class="card-tag">${tag}</span>`:''}
      <div class="card-play-overlay">
        <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title">${name}</div>
      <div class="card-meta">${year}</div>
    </div>
  </div>`;
}

function skeleton(rowId, n=8) {
  const el = document.getElementById(rowId);
  if (!el) return;
  el.innerHTML = Array(n).fill(`
    <div class="skeleton skeleton-card">
      <div class="skeleton" style="aspect-ratio:2/3;border-radius:10px 10px 0 0"></div>
      <div class="skeleton" style="height:12px;margin:10px 8px 4px;border-radius:4px"></div>
      <div class="skeleton" style="height:10px;width:60%;margin:0 8px 10px;border-radius:4px"></div>
    </div>`).join('');
}

// =====================================================
//  搜索
// =====================================================
let searchOpen = false;
function toggleSearch() {
  searchOpen = !searchOpen;
  document.getElementById('searchBar').classList.toggle('open', searchOpen);
  if (searchOpen) setTimeout(() => document.getElementById('searchInput')?.focus(), 50);
}
function doSearch() {
  const kw = document.getElementById('searchInput')?.value?.trim();
  if (kw) location.href = 'pages/search.html?q=' + encodeURIComponent(kw);
}

// =====================================================
//  首页数据加载
// =====================================================
async function loadHome() {
  ['movieRow','tvRow','animeRow','varietyRow'].forEach(id => skeleton(id));

  try {
    const data = await API.getHomeData();

    // Banner 取各分类第一条，组成轮播（最多8张，来源各分类交叉）
    const bannerPool = [];
    const maxPerType = 2;
    [data.movie, data.tv, data.anime, data.variety].forEach(arr => {
      arr.slice(0, maxPerType).forEach(item => {
        if (item.vod_pic && bannerPool.length < 8) bannerPool.push(item);
      });
    });
    // 打乱顺序让轮播更自然
    bannerPool.sort(() => Math.random() - 0.5);
    renderBanner(bannerPool.slice(0, 6));

    // 渲染各内容行
    const rowMap = {
      movieRow:   data.movie,
      tvRow:      data.tv,
      animeRow:   data.anime,
      varietyRow: data.variety,
    };
    for (const [rowId, items] of Object.entries(rowMap)) {
      const el = document.getElementById(rowId);
      if (!el) continue;
      el.innerHTML = items.length
        ? items.slice(0, 12).map(buildCard).join('')
        : `<p style="color:var(--text-muted);padding:16px;font-size:.85rem">暂无内容，请稍后刷新</p>`;
    }

  } catch(e) {
    console.error('首页加载失败:', e);
    ['movieRow','tvRow','animeRow','varietyRow'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<p style="color:var(--text-muted);padding:16px;font-size:.85rem">⚠️ 加载失败，请刷新重试</p>`;
    });
  }
}

// =====================================================
//  导航栏滚动效果
// =====================================================
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.style.boxShadow = scrollY > 10 ? '0 2px 20px rgba(0,0,0,.4)' : '';
});

document.addEventListener('DOMContentLoaded', loadHome);
