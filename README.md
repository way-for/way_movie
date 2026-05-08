# 飘雪影视 - 部署说明

## 📁 项目结构
```
movie-site/
├── index.html              # 首页
├── cloudflare-worker.js    # ⭐ Cloudflare Worker 代理脚本
├── css/style.css           # 全局样式（6套主题）
├── js/
│   ├── api.js              # 数据层（填入Worker地址后生效）
│   ├── auth.js             # 用户系统
│   └── app.js              # 首页逻辑
└── pages/
    ├── movie/tv/anime/variety.html  # 分类页
    ├── search.html         # 搜索页
    └── detail.html         # 播放页
```

---

## 🚀 两步部署

### 第一步：部署 Cloudflare Worker（解决跨域，约5分钟）

1. 注册免费账号：https://workers.cloudflare.com
2. Workers & Pages → Create → Create Worker
3. 把 `cloudflare-worker.js` 全部内容粘贴进去 → Deploy
4. **复制你的 Worker 地址**（如 `https://abc123.workers.dev`）
5. 用记事本打开 `js/api.js`，找到第13行：
   ```
   const WORKER_BASE = 'https://YOUR_WORKER.workers.dev';
   ```
   把 `YOUR_WORKER` 替换成你的实际地址

### 第二步：上传到 GitHub Pages

1. 仓库 → Add file → Upload files → 拖入所有文件 → Commit
2. Settings → Pages → Source: main → Save
3. 访问 `https://用户名.github.io/仓库名/`

---

## 🎨 6套主题

登录后点右上角头像 → 设置 → 主题风格

| 主题 | 风格 |
|------|------|
| 暗焰 | 深色橙红（默认）|
| 极夜 | 深色蓝紫 |
| 翠林 | 深色绿 |
| 星海 | 深色青 |
| 玫瑰 | 浅色暖粉 |
| 雪域 | 浅色冷蓝 |

---

## 📺 5条数据源（通过Worker自动切换）

- 百度云资源（最稳定）
- 非凡资源（速度快）
- 量子资源（内容全）
- 木童目资源
- 蓝之资源

---

## ⚠️ 注意事项

- 登录数据仅保存在本设备
- Cloudflare Worker 免费额度：每天10万次请求
- 仅供个人学习使用
