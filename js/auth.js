/**
 * auth.js - 用户认证与个人设置
 * 基于 localStorage，支持多账号切换，无需服务器
 */

const Auth = (() => {

  const KEY_USERS    = 'mc_users';    // 所有用户表
  const KEY_CURRENT  = 'mc_current';  // 当前登录用户名
  const KEY_USER_PRE = 'mc_user_';    // 单用户数据前缀

  /* ---------- 工具 ---------- */

  function simpleHash(str) {
    // 极简哈希（非安全，仅用于本地密码校验）
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(36);
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(KEY_USERS) || '{}'); }
    catch(e) { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  }

  function getUserData(username) {
    try { return JSON.parse(localStorage.getItem(KEY_USER_PRE + username) || 'null'); }
    catch(e) { return null; }
  }

  function saveUserData(username, data) {
    localStorage.setItem(KEY_USER_PRE + username, JSON.stringify(data));
  }

  /* ---------- 认证 API ---------- */

  function register(username, password) {
    if (!username || username.length < 2) return { ok: false, msg: '用户名至少2个字符' };
    if (!password || password.length < 4) return { ok: false, msg: '密码至少4位' };
    const users = getUsers();
    if (users[username]) return { ok: false, msg: '用户名已存在' };

    users[username] = { hash: simpleHash(password), createdAt: Date.now() };
    saveUsers(users);

    // 初始化用户数据
    const userData = {
      username,
      nickname: username,
      avatarChar: username[0].toUpperCase(),
      settings: {
        accent: '#e05c3a',
        theme: 'dark',
        defaultSource: 0,
      },
      history: [],
      favorites: [],
    };
    saveUserData(username, userData);
    return { ok: true };
  }

  function login(username, password) {
    const users = getUsers();
    if (!users[username]) return { ok: false, msg: '用户不存在，请先注册' };
    if (users[username].hash !== simpleHash(password)) return { ok: false, msg: '密码错误' };
    localStorage.setItem(KEY_CURRENT, username);
    return { ok: true, data: getUserData(username) };
  }

  function logout() {
    localStorage.removeItem(KEY_CURRENT);
    window.location.reload();
  }

  function currentUser() {
    const username = localStorage.getItem(KEY_CURRENT);
    if (!username) return null;
    return getUserData(username);
  }

  function isLoggedIn() {
    return !!localStorage.getItem(KEY_CURRENT);
  }

  /* ---------- 用户数据操作 ---------- */

  function updateSettings(settings) {
    const username = localStorage.getItem(KEY_CURRENT);
    if (!username) return false;
    const data = getUserData(username) || {};
    data.settings = { ...(data.settings || {}), ...settings };
    if (settings.nickname) data.nickname = settings.nickname;
    saveUserData(username, data);
    return true;
  }

  function addHistory(item) {
    const username = localStorage.getItem(KEY_CURRENT);
    if (!username) return;
    const data = getUserData(username);
    if (!data) return;

    data.history = data.history || [];
    // 去重：若已有则移到最前
    data.history = data.history.filter(h => h.id !== item.id);
    data.history.unshift({ ...item, visitedAt: Date.now() });
    // 最多保留50条
    data.history = data.history.slice(0, 50);
    saveUserData(username, data);
  }

  function getHistory() {
    const user = currentUser();
    return user ? (user.history || []) : [];
  }

  function clearHistory() {
    const username = localStorage.getItem(KEY_CURRENT);
    if (!username) return;
    const data = getUserData(username);
    if (!data) return;
    data.history = [];
    saveUserData(username, data);
  }

  function addFavorite(item) {
    const username = localStorage.getItem(KEY_CURRENT);
    if (!username) return false;
    const data = getUserData(username);
    if (!data) return false;
    data.favorites = data.favorites || [];
    if (data.favorites.some(f => f.id === item.id)) {
      data.favorites = data.favorites.filter(f => f.id !== item.id);
      saveUserData(username, data);
      return false; // 取消收藏
    }
    data.favorites.unshift(item);
    saveUserData(username, data);
    return true; // 已收藏
  }

  function isFavorite(id) {
    const user = currentUser();
    if (!user) return false;
    return (user.favorites || []).some(f => f.id === id);
  }

  return {
    register, login, logout,
    currentUser, isLoggedIn,
    updateSettings,
    addHistory, getHistory, clearHistory,
    addFavorite, isFavorite,
  };
})();

/* ---------- 全局弹窗控制 ---------- */

function openLogin() {
  document.getElementById('loginModal').classList.add('open');
}
function closeModal() {
  document.getElementById('loginModal').classList.remove('open');
}
function openSettings() {
  document.getElementById('settingsModal').classList.add('open');
  renderSettingsModal();
}
function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

function doLogin() {
  const u = document.getElementById('inputUsername')?.value?.trim();
  const p = document.getElementById('inputPassword')?.value;
  if (!u || !p) return showToast('请填写用户名和密码');
  const result = Auth.login(u, p);
  if (!result.ok) return showToast(result.msg);
  closeModal();
  showToast('登录成功，欢迎回来 ' + (result.data?.nickname || u));
  renderUserArea();
  applyUserTheme();
}

function doRegister() {
  const u = document.getElementById('inputUsername')?.value?.trim();
  const p = document.getElementById('inputPassword')?.value;
  if (!u || !p) return showToast('请填写用户名和密码');
  const result = Auth.register(u, p);
  if (!result.ok) return showToast(result.msg);
  Auth.login(u, p);
  closeModal();
  showToast('注册成功！');
  renderUserArea();
  applyUserTheme();
}

function doLogout() {
  closeSettings();
  Auth.logout();
}

function saveSettings() {
  const nickname = document.getElementById('setNickname')?.value?.trim();
  const defaultSource = document.getElementById('defaultSource')?.value;
  Auth.updateSettings({ nickname, defaultSource: parseInt(defaultSource) });
  applyUserTheme();
  renderUserArea();
  closeSettings();
  showToast('设置已保存');
}

function pickColor(el) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  const color = el.dataset.color;
  Auth.updateSettings({ accent: color });
  document.documentElement.style.setProperty('--accent', color);
}

function setTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  document.getElementById('themeDark')?.classList.toggle('active', theme === 'dark');
  document.getElementById('themeLight')?.classList.toggle('active', theme === 'light');
  Auth.updateSettings({ theme });
}

function renderSettingsModal() {
  const user = Auth.currentUser();
  if (!user) return;

  document.getElementById('settingsAvatar').textContent = user.avatarChar || user.username[0].toUpperCase();
  const nn = document.getElementById('setNickname');
  if (nn) nn.value = user.nickname || user.username;
  const ds = document.getElementById('defaultSource');
  if (ds) ds.value = user.settings?.defaultSource || 0;

  // 高亮当前主题颜色
  const ac = user.settings?.accent || '#e05c3a';
  document.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.color === ac);
  });

  // 高亮主题按钮
  const theme = user.settings?.theme || 'dark';
  document.getElementById('themeDark')?.classList.toggle('active', theme === 'dark');
  document.getElementById('themeLight')?.classList.toggle('active', theme === 'light');

  // 观看历史
  const hist = Auth.getHistory();
  const histEl = document.getElementById('historyList');
  if (histEl) {
    if (!hist.length) {
      histEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem">暂无观看记录</p>';
    } else {
      histEl.innerHTML = hist.slice(0, 10).map(h => `
        <div class="history-item" onclick="toDetail('${h.id}')">
          <div class="history-thumb">
            ${h.pic ? `<img src="${h.pic}" loading="lazy" onerror="this.style.display='none'">` : ''}
          </div>
          <div class="history-info">
            <div class="title">${h.name}</div>
            <div class="meta">${new Date(h.visitedAt).toLocaleDateString()}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

function clearHistory() {
  Auth.clearHistory();
  renderSettingsModal();
  showToast('历史记录已清除');
}

/* ---------- 用户区域渲染 ---------- */

function renderUserArea() {
  const el = document.getElementById('userArea');
  if (!el) return;

  if (Auth.isLoggedIn()) {
    const user = Auth.currentUser();
    el.innerHTML = `
      <div class="user-btn" onclick="openSettings()">
        <div class="user-avatar">${user?.avatarChar || '?'}</div>
        <span class="user-name">${user?.nickname || user?.username || '我'}</span>
      </div>`;
  } else {
    el.innerHTML = `<button class="login-btn" onclick="openLogin()">登录</button>`;
  }
}

/* ---------- 应用主题 ---------- */

function applyUserTheme() {
  const user = Auth.currentUser();
  if (!user?.settings) return;
  const { accent, theme } = user.settings;
  if (accent) document.documentElement.style.setProperty('--accent', accent);
  if (theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
  }
}

/* ---------- Toast ---------- */

function showToast(msg, duration = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ---------- 初始化 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderUserArea();
  applyUserTheme();
  // 点击遮罩关闭弹窗
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });
});
