# Claw Inbox

浏览器插件 + 云端 Bridge，一键把网页或选中文本发送给云端 OpenClaw 处理。

## 架构

```
浏览器插件  ──HTTPS──>  云端 Bridge (Fastify)  ──CLI──>  OpenClaw Agent  ──>  Telegram / 飞书回复
                         │                                                       │
                         │ Bearer Token 鉴权                                     ↓
                         │ Zod 校验                                          Notion 存档
                         │ 消息格式化
                         │ Fire-and-forget 异步转发
```

- **Extension**：Chrome 插件（Manifest V3），捕获当前页面信息或选中文本，选择 Action，发送到 Bridge
- **Bridge**：Fastify 服务器，部署在云端，负责鉴权、校验、格式化消息，通过 CLI 调用 OpenClaw
- **Shared**：共享类型、常量和 Action 标签，被 Bridge 和 Extension 共同使用

## 项目结构

```
claw-inbox/
├── apps/
│   ├── bridge/              # Fastify 云端 Bridge 服务
│   │   ├── .env.example     # 环境变量模板
│   │   └── src/
│   │       ├── server.ts    # 服务入口（CORS + Rate Limit）
│   │       ├── config.ts    # 环境变量配置
│   │       ├── routes/
│   │       │   ├── health.ts    # GET /health
│   │       │   └── capture.ts   # POST /capture
│   │       ├── services/
│   │       │   └── openclaw.ts  # OpenClaw 转发（mock / 真实 CLI）
│   │       └── utils/
│   │           ├── auth.ts          # Bearer Token 验证
│   │           ├── cors.ts          # CORS 配置
│   │           ├── validate.ts      # Zod payload 校验
│   │           └── formatMessage.ts # 消息格式化 + Action 指令
│   └── extension/           # Chrome 插件（Manifest V3）
│       ├── public/
│       │   └── manifest.json
│       └── src/
│           ├── popup/       # Popup 主界面（高频动作优先）
│           │   ├── App.tsx
│           │   ├── main.tsx
│           │   └── popup.css
│           ├── options/     # 设置页面（含连接状态指示）
│           │   ├── OptionsApp.tsx
│           │   └── options.tsx
│           ├── background/  # Service Worker（右键菜单 + 通知）
│           │   └── index.ts
│           └── lib/
│               ├── api.ts       # Bridge API 调用 + 错误分类
│               ├── browser.ts   # 获取页面信息 + 选中文本
│               └── settings.ts  # chrome.storage 读写
├── packages/
│   └── shared/              # 共享类型与常量
│       └── src/
│           ├── actions.ts   # Action 定义 + 中文标签 + 反馈文案
│           ├── types.ts     # CapturePayload 等类型
│           └── index.ts     # 统一导出
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## 核心使用场景

### 场景 1：总结一篇文章
1. 打开任意网页
2. 点击 Claw Inbox 插件图标
3. 点击「总结这页」
4. 龙虾自动阅读全文，生成摘要，发到 Telegram，存入 Notion

### 场景 2：翻译选中文本
1. 在网页中选中一段外文
2. 点击插件图标
3. 看到「已选中文本」提示
4. 点击「翻译选中文本」
5. 龙虾翻译选中内容，结果发到 Telegram

### 场景 3：右键快速发送
1. 在网页空白处右键 → **Send page to Claw Inbox**（默认稍后处理）
2. 选中文本后右键 → **Send selection to Claw Inbox**（默认总结）
3. 无需打开 popup，直接发送，系统通知反馈结果

### 场景 4：稍后处理
1. 点击插件 →「稍后处理」
2. 文章信息保存到 Notion，等有空再看

## 支持的 Action

| Action | UI 文案 | OpenClaw 行为 |
|---|---|---|
| **later** | 稍后处理 | 保存标题、URL、备注，不立即处理 |
| **summarize** | 总结内容 | 访问页面，生成结构化摘要（3-5 条要点 + 关键结论） |
| **extract** | 提取正文 | 从页面提取核心数据、人名、日期、列表等结构化信息 |
| **translate** | 翻译内容 | 全文翻译（英→中 / 中→英自动判断） |
| **archive** | 收进资料库 | 抓取全文归档，保留原始格式 |

所有 Action 均会：
- 保留原文 URL 作为来源引用
- 处理完成后上传结果到 Notion 个人库

## 本地开发

### 前置要求

- Node.js >= 20
- pnpm >= 9

### 安装

```bash
git clone git@github.com:henrytangcn/claw-inbox.git
cd claw-inbox
pnpm install
pnpm run build:shared
```

### 启动 Bridge（本地开发）

```bash
cp apps/bridge/.env.example apps/bridge/.env
# 编辑 .env，设置 CLAW_INBOX_API_TOKEN

pnpm run dev:bridge
# Bridge 运行在 http://127.0.0.1:8787
```

验证：
```bash
curl http://127.0.0.1:8787/health
# {"ok":true}
```

### 构建并加载插件

```bash
pnpm run build:extension
```

1. 打开 Chrome → `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `apps/extension/dist/` 目录

### 配置插件

1. 右键插件图标 → 选项（或进入扩展程序设置页）
2. 填写 **Bridge URL**：`http://127.0.0.1:8787`
3. 填写 **API Token**：与 Bridge `.env` 中 `CLAW_INBOX_API_TOKEN` 一致
4. 点击 **Save** → **Test Connection** 确认连接成功

## 云端部署

### Bridge 部署

```bash
# 服务器上 clone 项目
git clone git@github.com:henrytangcn/claw-inbox.git /opt/claw-inbox
cd /opt/claw-inbox

# 安装依赖并构建
pnpm install
pnpm --filter @claw-inbox/shared build
pnpm --filter @claw-inbox/bridge build

# 配置环境变量
cp apps/bridge/.env.example apps/bridge/.env
vim apps/bridge/.env
```

`.env` 云端配置示例：

```env
PORT=8787
HOST=0.0.0.0
CLAW_INBOX_API_TOKEN=<用 openssl rand -hex 32 生成>
OPENCLAW_FORWARD_MODE=openclaw
ALLOWED_ORIGINS=*

# OpenClaw CLI 设置
OPENCLAW_AGENT_ID=main
OPENCLAW_DELIVER_CHANNEL=telegram
OPENCLAW_DELIVER_TARGET=<你的 Telegram chat ID>
```

### 使用 pm2 守护进程

```bash
npm install -g pm2

cd /opt/claw-inbox/apps/bridge
pm2 start dist/server.js --name claw-bridge
pm2 save
pm2 startup
```

常用命令：

```bash
pm2 status              # 查看状态
pm2 logs claw-bridge    # 查看日志
pm2 restart claw-bridge # 重启
```

### 插件连接云端

在插件 Options 页面配置：
- **Bridge URL**：`http://<服务器公网IP>:8787`（或配置 Nginx 后用 `https://bridge.yourdomain.com`）
- **API Token**：与服务器 `.env` 中的值一致

### 更新部署

```bash
cd /opt/claw-inbox
git pull
pnpm --filter @claw-inbox/shared build
pnpm --filter @claw-inbox/bridge build
pm2 restart claw-bridge
```

本地更新插件后需重新 `pnpm run build:extension`，然后在 `chrome://extensions/` 点击刷新。

## 已实现功能

### v0.2 (当前)

**Extension 新增**
- [x] **选中文本支持**：自动检测页面选中文本，支持发送选中内容
- [x] **右键菜单**：Send page / Send selection to Claw Inbox
- [x] **Popup 重新设计**：高频动作（总结/提取/稍后处理）作为主按钮
- [x] **选中文本区域**：检测到选中文本时展示专用操作按钮（总结/翻译）
- [x] **更多操作折叠**：低频动作（翻译/存档）折叠在「更多操作」中
- [x] **中文反馈文案**：发送成功/失败提示更具体（告知用户发给谁、做什么）
- [x] **错误分类提示**：区分 token 未配置/bridge 不可达/鉴权失败/服务器错误
- [x] **右键菜单通知**：发送后通过系统通知反馈结果
- [x] **Options 页面优化**：连接状态指示器 + 工作方式说明 + 保存时自动测试
- [x] **Note 智能 placeholder**：提供使用示例引导用户

**Shared 新增**
- [x] ACTION_LABELS：每个 Action 的中文显示名
- [x] ACTION_FEEDBACK / SELECTION_FEEDBACK：发送成功反馈文案

### v0.1

**Bridge**
- [x] GET `/health` 健康检查
- [x] POST `/capture` 接收页面数据
- [x] Bearer Token 鉴权（401 未授权）
- [x] Zod payload 校验（400 格式错误）
- [x] 每个 Action 独立中文指令描述
- [x] 所有 Action 要求保留原文 URL
- [x] 所有 Action 附带 Notion 上传指令
- [x] Mock 模式（console.log）
- [x] 真实模式（OpenClaw CLI 调用）
- [x] Fire-and-forget 异步转发（不阻塞响应）
- [x] 可配置回复渠道和目标
- [x] CORS 支持
- [x] Rate Limit（60 次/分钟）

**Extension**
- [x] Manifest V3
- [x] 自动获取当前页面 title / URL
- [x] 5 种 Action 选择器
- [x] Note 输入框
- [x] 发送成功/失败反馈
- [x] 未配置时引导跳转 Options
- [x] Options 页面：Bridge URL + API Token 设置
- [x] 测试连接按钮
- [x] chrome.storage.local 持久化设置

## Roadmap (v0.3+)

- [ ] 快捷键支持（Ctrl+Shift+S 快速发送）
- [ ] 截图捕获
- [ ] 处理历史记录（本地查看发送记录）
- [ ] Notion 数据库结构优化（标签、分类）
- [ ] Firefox 支持
- [ ] 自定义 Action 支持
- [ ] 批量发送（多个标签页）
- [ ] 侧边栏模式

## 技术栈

| 组件 | 技术 |
|---|---|
| Shared | TypeScript, Zod |
| Bridge | Fastify, @fastify/cors, @fastify/rate-limit, dotenv, tsx |
| Extension | React 19, Vite, TypeScript, Chrome Manifest V3 |
| 进程管理 | pm2 |
| 包管理 | pnpm workspace monorepo |
