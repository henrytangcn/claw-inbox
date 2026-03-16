# Claw Inbox

浏览器插件 + 云端 Bridge，一键把网页发送给云端 OpenClaw 处理。

## 架构

```
浏览器插件  ──HTTPS──>  云端 Bridge (Fastify)  ──CLI──>  OpenClaw Agent  ──>  Telegram / 飞书回复
                         │                                                       │
                         │ Bearer Token 鉴权                                     ↓
                         │ Zod 校验                                          Notion 存档
                         │ 消息格式化
                         │ Fire-and-forget 异步转发
```

- **Extension**：Chrome 插件（Manifest V3），捕获当前页面信息，选择 Action，发送到 Bridge
- **Bridge**：Fastify 服务器，部署在云端，负责鉴权、校验、格式化消息，通过 CLI 调用 OpenClaw
- **Shared**：共享类型和常量，被 Bridge 和 Extension 共同使用

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
│           ├── popup/       # Popup 主界面
│           │   ├── App.tsx
│           │   ├── main.tsx
│           │   └── popup.css
│           ├── options/     # 设置页面
│           │   ├── OptionsApp.tsx
│           │   └── options.tsx
│           ├── background/  # Service Worker（预留）
│           │   └── index.ts
│           └── lib/
│               ├── api.ts       # Bridge API 调用
│               ├── browser.ts   # 获取当前页面信息
│               └── settings.ts  # chrome.storage 读写
├── packages/
│   └── shared/              # 共享类型与常量
│       └── src/
│           ├── actions.ts   # 5 种 Action 定义
│           ├── types.ts     # CapturePayload 等类型
│           └── index.ts     # 统一导出
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## 支持的 Action

| Action | 说明 | OpenClaw 行为 |
|---|---|---|
| **later** | 稍后阅读 | 保存标题、URL、备注，不立即处理 |
| **summarize** | 总结 | 访问页面，生成结构化摘要（3-5 条要点 + 关键结论） |
| **extract** | 提取 | 从页面提取核心数据、人名、日期、列表等结构化信息 |
| **translate** | 翻译 | 全文翻译（英→中 / 中→英自动判断） |
| **archive** | 存档 | 抓取全文归档，保留原始格式 |

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

## 使用方法

1. 打开任意网页
2. 点击 Claw Inbox 插件图标
3. 自动显示当前页面标题和 URL
4. 选择一个 Action（summarize / translate / extract / later / archive）
5. 可选填写备注
6. 点击「发送给龙虾」
7. 插件即时反馈发送成功
8. OpenClaw 在后台处理，结果发送到 Telegram/飞书，并上传到 Notion

## 已实现功能 (v0.1)

### Bridge
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

### Extension
- [x] Manifest V3
- [x] 自动获取当前页面 title / URL
- [x] 5 种 Action 选择器
- [x] Note 输入框
- [x] 发送成功/失败反馈
- [x] 未配置时引导跳转 Options
- [x] Options 页面：Bridge URL + API Token 设置
- [x] 测试连接按钮
- [x] chrome.storage.local 持久化设置

## Roadmap

- [ ] 选中文本（selection）支持
- [ ] 右键菜单（context menu）
- [ ] 快捷键支持
- [ ] 截图捕获
- [ ] 处理历史记录
- [ ] Notion 数据库结构优化（标签、分类）
- [ ] Firefox 支持
- [ ] 自定义 Action 支持

## 技术栈

| 组件 | 技术 |
|---|---|
| Shared | TypeScript, Zod |
| Bridge | Fastify, @fastify/cors, @fastify/rate-limit, dotenv, tsx |
| Extension | React 19, Vite, TypeScript, Chrome Manifest V3 |
| 进程管理 | pm2 |
| 包管理 | pnpm workspace monorepo |
