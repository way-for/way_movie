/**
 * auth.js - 飘雪影视用户系统
 * 登录/注册/设置/主题，全部本地存储
 */

const Auth = (() => {
  const KEY_USERS   = 'mc_users';
  const KEY_CURRENT = 'mc_current';
  const KEY_PRE     = 'mc_user_';

  function simpleHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  }
  function getUsers()          { try{return JSON.parse(localStorage.getItem(KEY_USERS)||'{}')}catch(e){return{}} }
  function saveUsers(u)        { localStorage.setItem(KEY_USERS,JSON.stringify(u)) }
  function getUserData(name)   { try{return JSON.parse(localStorage.getItem(KEY_PRE+name)||'null')}catch(e){return null} }
  function saveUserData(n,d)   { localStorage.setItem(KEY_PRE+n,JSON.stringify(d)) }

  function register(username, password) {
    if (!username||username.length<2) return {ok:false,msg:'用户名至少2个字符'};
    if (!password||password.length<4) return {ok:false,msg:'密码至少4位'};
    const users = getUsers();
    if (users[username]) return {ok:false,msg:'用户名已存在'};
    users[username] = {hash:simpleHash(password),createdAt:Date.now()};
    saveUsers(users);
    const userData = {
      username, nickname:username,
      avatarChar:username[0].toUpperCase(),
      settings:{ theme:'dark-flame', defaultSource:0 },
      history:[], favorites:[],
    };
    saveUserData(username,userData);
    return {ok:true};
  }

  function login(username, password) {
    const users = getUsers();
    if (!users[username]) return {ok:false,msg:'用户不存在，请先注册'};
    if (users[username].hash!==simpleHash(password)) return {ok:false,msg:'密码错误'};
    localStorage.setItem(KEY_CURRENT,username);
    return {ok:true,data:getUserData(username)};
  }

  function logout()       { localStorage.removeItem(KEY_CURRENT); window.location.reload() }
  function currentUser()  { const n=localStorage.getItem(KEY_CURRENT); return n?getUserData(n):null }
  function isLoggedIn()   { return !!localStorage.getItem(KEY_CURRENT) }

  function updateSettings(settings) {
    const username = localStorage.getItem(KEY_CURRENT);
    if (!username) return false;
    const data = getUserData(username)||{};
    data.settings = {...(data.settings||{}), ...settings};
    if (settings.nickname) data.nickname = settings.nickname;
    saveUserData(username,data);
    return true;
  }

  function addHistory(item) {
    const username = localStorage.getItem(KEY_CURRENT);
    if (!username) return;
    const data = getUserData(username); if (!data) return;
    data.history = (data.history||[]).filter(h=>h.id!==item.id);
    data.history.unshift({...item,visitedAt:Date.now()});
    data.history = data.history.slice(0,50);
    saveUserData(username,data);
  }

  function getHistory()  { const u=currentUser(); return u?(u.history||[]): [] }
  function clearHistory(){ const n=localStorage.getItem(KEY_CURRENT); if(!n)return; const d=getUserData(n); if(!d)return; d.history=[]; saveUserData(n,d) }

  function addFavorite(item) {
    const username = localStorage.getItem(KEY_CURRENT); if(!username)return false;
    const data = getUserData(username); if(!data)return false;
    data.favorites = data.favorites||[];
    if (data.favorites.some(f=>f.id===item.id)) {
      data.favorites = data.favorites.filter(f=>f.id!==item.id);
      saveUserData(username,data); return false;
    }
    data.favorites.unshift(item); saveUserData(username,data); return true;
  }
  function isFavorite(id){ const u=currentUser(); if(!u)return false; return (u.favorites||[]).some(f=>f.id==id) }

  return { register,login,logout,currentUser,isLoggedIn,updateSettings,addHistory,getHistory,clearHistory,addFavorite,isFavorite };
})();

/* =============================================
   主题系统
   ============================================= */
const THEMES = [
  { id:'dark-flame',  label:'暗焰', color:'#e05c3a', dark:true  },
  { id:'midnight',    label:'极夜', color:'#5b8dee', dark:true  },
  { id:'forest',      label:'翠林', color:'#3abf7e', dark:true  },
  { id:'ocean',       label:'星海', color:'#00bcd4', dark:true  },
  { id:'rose',        label:'玫瑰', color:'#e05578', dark:false },
  { id:'snow',        label:'雪域', color:'#3a7de0', dark:false },
];

function applyTheme(themeId) {
  const theme = THEMES.find(t=>t.id===themeId) || THEMES[0];
  document.documentElement.setAttribute('data-theme', theme.id==='dark-flame' ? '' : theme.id);
  document.body.classList.toggle('light-mode', !theme.dark);
  // 更新 CSS 变量（dark-flame 用根节点默认值，其余用 data-theme）
  if (theme.id === 'dark-flame') document.documentElement.removeAttribute('data-theme');
}

function applyUserTheme() {
  const user = Auth.currentUser();
  const themeId = user?.settings?.theme || localStorage.getItem('mc_guest_theme') || 'dark-flame';
  applyTheme(themeId);
}

/* =============================================
   弹窗控制
   ============================================= */
function openLogin()    { document.getElementById('loginModal')?.classList.add('open') }
function closeModal()   { document.getElementById('loginModal')?.classList.remove('open') }
function openSettings() { document.getElementById('settingsModal')?.classList.add('open'); renderSettingsModal() }
function closeSettings(){ document.getElementById('settingsModal')?.classList.remove('open') }

function doLogin() {
  const u=document.getElementById('inputUsername')?.value?.trim();
  const p=document.getElementById('inputPassword')?.value;
  if(!u||!p) return showToast('请填写用户名和密码');
  const r=Auth.login(u,p);
  if(!r.ok) return showToast(r.msg);
  closeModal(); showToast('欢迎回来 '+( r.data?.nickname||u));
  renderUserArea(); applyUserTheme();
}

function doRegister() {
  const u=document.getElementById('inputUsername')?.value?.trim();
  const p=document.getElementById('inputPassword')?.value;
  if(!u||!p) return showToast('请填写用户名和密码');
  const r=Auth.register(u,p); if(!r.ok) return showToast(r.msg);
  Auth.login(u,p); closeModal(); showToast('注册成功！');
  renderUserArea(); applyUserTheme();
}

function doLogout() { closeSettings(); Auth.logout() }

function saveSettings() {
  const nickname = document.getElementById('setNickname')?.value?.trim();
  const defaultSource = document.getElementById('defaultSource')?.value;
  // 读取当前选中的主题
  const selectedTheme = document.querySelector('.theme-swatch.selected')?.dataset?.theme || 'dark-flame';
  Auth.updateSettings({ nickname, defaultSource:parseInt(defaultSource), theme:selectedTheme });
  applyTheme(selectedTheme);
  renderUserArea(); closeSettings(); showToast('设置已保存');
}

function pickTheme(el) {
  document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.remove('selected'));
  el.classList.add('selected');
  applyTheme(el.dataset.theme); // 实时预览
}

// 兼容旧的 setTheme / pickColor（detail页用到）
function setTheme(mode) {
  const cur = document.querySelector('.theme-swatch.selected')?.dataset?.theme || 'dark-flame';
  const t = THEMES.find(t=>t.id===cur);
  if (mode==='light' && t?.dark) pickThemeDirect('rose');
  if (mode==='dark'  && !t?.dark) pickThemeDirect('dark-flame');
}
function pickThemeDirect(themeId) {
  document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.toggle('selected',s.dataset.theme===themeId));
  applyTheme(themeId);
}
function pickColor(){}  // 不再使用，兼容旧代码保留

function renderThemePicker(currentTheme) {
  return `<div class="theme-picker">` +
    THEMES.map(t=>`
      <div class="theme-swatch ${currentTheme===t.id?'selected':''}"
           data-theme="${t.id}"
           style="background:${t.color}"
           onclick="pickTheme(this)"
           title="${t.label}">
        <span>${t.label}</span>
      </div>`).join('') +
  `</div>`;
}

function renderSettingsModal() {
  const user = Auth.currentUser(); if(!user) return;
  document.getElementById('settingsAvatar').textContent = user.avatarChar||user.username[0].toUpperCase();
  const nn=document.getElementById('setNickname'); if(nn) nn.value=user.nickname||user.username;
  const ds=document.getElementById('defaultSource'); if(ds) ds.value=user.settings?.defaultSource||0;

  const pickerEl=document.getElementById('themePicker');
  if(pickerEl) pickerEl.innerHTML=renderThemePicker(user.settings?.theme||'dark-flame');

  const hist=Auth.getHistory();
  const histEl=document.getElementById('historyList');
  if(histEl){
    if(!hist.length){
      histEl.innerHTML='<p style="color:var(--text-muted);font-size:.82rem">暂无观看记录</p>';
    } else {
      histEl.innerHTML=hist.slice(0,10).map(h=>`
        <div class="history-item" onclick="toDetail('${h.id}')">
          <div class="history-thumb">${h.pic?`<img src="${h.pic}" loading="lazy" onerror="this.style.display='none'">`:''}</div>
          <div class="history-info">
            <div class="title">${h.name}</div>
            <div class="meta">${new Date(h.visitedAt).toLocaleDateString()}</div>
          </div>
        </div>`).join('');
    }
  }
}

function clearHistory() { Auth.clearHistory(); renderSettingsModal(); showToast('历史记录已清除') }

function renderUserArea() {
  const el=document.getElementById('userArea'); if(!el) return;
  if(Auth.isLoggedIn()){
    const u=Auth.currentUser();
    el.innerHTML=`<div class="user-btn" onclick="openSettings()"><div class="user-avatar">${u?.avatarChar||'?'}</div><span class="user-name">${u?.nickname||u?.username||'我'}</span></div>`;
  } else {
    el.innerHTML=`<button class="login-btn" onclick="openLogin()">登录</button>`;
  }
}

/* =============================================
   Toast
   ============================================= */
function showToast(msg,duration=2200){
  const el=document.getElementById('toast'); if(!el) return;
  el.textContent=msg; el.classList.add('show');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),duration);
}

/* =============================================
   初始化
   ============================================= */
document.addEventListener('DOMContentLoaded',()=>{
  renderUserArea();
  applyUserTheme();
  document.querySelectorAll('.modal-overlay').forEach(o=>{
    o.addEventListener('click',e=>{ if(e.target===o) o.classList.remove('open') });
  });
});
