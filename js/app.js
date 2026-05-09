function buildCard(item) {
  const id=item.vod_id, name=item.vod_name||'未知', pic=item.vod_pic||'';
  const year=item.vod_year||'', score=item.vod_score||'', tag=item.vod_remarks||'';
  return `<div class="card" onclick="location.href='pages/detail.html?id=${id}'">
    <div class="card-thumb">
      ${pic?`<img src="${pic}" loading="lazy" onerror="this.style.display='none'">`:``}
      ${!pic?`<div class="no-img">🎬</div>`:''}
      ${score?`<span class="card-score">⭐${score}</span>`:''}
      ${tag?`<span class="card-tag">${tag}</span>`:''}
      <div class="card-play-overlay"><svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40"><path d="M8 5v14l11-7z"/></svg></div>
    </div>
    <div class="card-info">
      <div class="card-title">${name}</div>
      <div class="card-meta">${year}</div>
    </div>
  </div>`;
}

function skeleton(rowId, n=8) {
  const el=document.getElementById(rowId); if(!el) return;
  el.innerHTML=Array(n).fill(`<div class="skeleton skeleton-card">
    <div class="skeleton" style="aspect-ratio:2/3;border-radius:10px 10px 0 0"></div>
    <div class="skeleton" style="height:12px;margin:10px 8px 4px;border-radius:4px"></div>
    <div class="skeleton" style="height:10px;width:60%;margin:0 8px 10px;border-radius:4px"></div>
  </div>`).join('');
}

function renderHero(item) {
  if (!item) return;
  document.getElementById('heroTitle').textContent = item.vod_name||'';
  document.getElementById('heroDesc').textContent  = (item.vod_content||item.vod_blurb||'').replace(/<[^>]+>/g,'');
  document.getElementById('heroPoster').innerHTML  = item.vod_pic
    ? `<img src="${item.vod_pic}" onerror="this.style.display='none'">` : '';
  const go = ()=>location.href='pages/detail.html?id='+item.vod_id;
  document.getElementById('heroPlayBtn').onclick = go;
  document.getElementById('heroInfoBtn').onclick  = go;
}

let searchOpen=false;
function toggleSearch(){
  searchOpen=!searchOpen;
  document.getElementById('searchBar').classList.toggle('open',searchOpen);
  if(searchOpen) setTimeout(()=>document.getElementById('searchInput')?.focus(),50);
}
function doSearch(){
  const kw=document.getElementById('searchInput')?.value?.trim();
  if(kw) location.href='pages/search.html?q='+encodeURIComponent(kw);
}

async function loadHome() {
  ['movieRow','tvRow','animeRow','varietyRow'].forEach(id=>skeleton(id));
  try {
    const data = await API.getHomeData();
    renderHero(data.movie[0]||data.tv[0]);
    const map = {
      movieRow: data.movie, tvRow: data.tv,
      animeRow: data.anime, varietyRow: data.variety,
    };
    for (const [id, items] of Object.entries(map)) {
      const el=document.getElementById(id); if(!el) continue;
      el.innerHTML = items.length
        ? items.slice(0,12).map(buildCard).join('')
        : `<p style="color:var(--text-muted);padding:16px;font-size:.85rem">暂无内容</p>`;
    }
  } catch(e) {
    console.error('加载失败:', e);
    ['movieRow','tvRow','animeRow','varietyRow'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML=`<p style="color:var(--text-muted);padding:16px;font-size:.85rem">⚠️ 加载失败，请刷新</p>`;
    });
  }
}

window.addEventListener('scroll',()=>{
  const nav=document.getElementById('navbar');
  if(nav) nav.style.boxShadow=scrollY>10?'0 2px 20px rgba(0,0,0,.4)':'';
});

document.addEventListener('DOMContentLoaded', loadHome);
