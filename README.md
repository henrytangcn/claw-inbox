# Claw Inbox

[English](./README.en.md) | 中文

浏览器插件 + 云端 Bridge，一键把网页或选中文本发送给云端 OpenClaw 处理。

## 架构

```
浏览器插件  ──HTTPS──>  云端 Bridge (Fastify)  ──CLI──>  OpenClaw Agent  ──>  Telegram / 飞书回复
                         │                                                       │
                         │ Bearer Token 鉴权                                     ↓
                         │ Zod 校验                                          Notion 存档
                         │ 消息格式化
                         │ Fire-and-forget 异步转发
                         │
                         │ action=later 时：
                         └──> 文件系统队列 (/root/.openclaw/workspace/claw-inbox/pending/)
                         │
                         │ GET /pending + POST /pending/:id/process
                         └──> 查询待处理队列 / 触发后续处理
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
│   │       │   ├── capture.ts   # POST /capture（区分 later / 其他）
│   │       │   └── pending.ts   # GET /pending + POST /pending/:id/process
│   │       ├── services/
│   │       │   ├── openclaw.ts  # OpenClaw 转发（mock / 真实 CLI）
│   │       │   └── inbox.ts     # 待处理队列（文件系统读写 + 状态流转）
│   │       └── utils/
│   │           ├── auth.ts          # Bearer Token 验证
│   │           ├── cors.ts          # CORS 配置
│   │           ├── validate.ts      # Zod payload 校验
│   │           └── formatMessage.ts # 消息格式化 + Action 指令
│   └── extension/           # Chrome 插件（Manifest V3）
│       ├── public/
│       │   └── manifest.json
│       └── src/
│           ├── popup/       # Popup 主界面（高频动作 + 历史记录）
│           │   ├── App.tsx
│           │   ├── main.tsx
│           │   └── popup.css
│           ├── options/     # 设置页面（含连接状态 + 工作方式说明）
│           │   ├── OptionsApp.tsx
│           │   └── options.tsx
│           ├── background/  # Service Worker（右键菜单 + 通知 + 历史）
│           │   └── index.ts
│           └── lib/
│               ├── api.ts       # Bridge API 调用 + 错误分类
│               ├── browser.ts   # 获取页面信息 + 选中文本
│               ├── history.ts   # 发送历史 + 待处理记录管理
│               ├── pending.ts   # 待处理队列 API 调用
│               └── settings.ts  # chrome.storage 读写
├── packages/
│   └── shared/              # 共享类型与常量
│       └── src/
│           ├── actions.ts   # Action 定义 + 中文标签 + 反馈 + 目标路径
│           ├── types.ts     # CapturePayload / CaptureResponse / CaptureHistoryItem
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
4. 提示「已发送给龙虾：总结内容 / 结果将回到 Telegram」
5. 龙虾自动阅读全文，生成摘要，发到 Telegram，存入 Notion

### 场景 2：翻译选中文本
1. 在网页中选中一段外文
2. 点击插件图标
3. 看到「已选中文本」提示
4. 点击「翻译选中文本」
5. 龙虾翻译选中内容，结果发到 Telegram

### 场景 3：右键快速发送
1. 在网页空白处右键 → **Send page to Claw Inbox**（默认加入待处理）
2. 选中文本后右键 → **Send selection to Claw Inbox**（默认总结）
3. 无需打开 popup，直接发送，系统通知反馈结果

### 场景 4：加入待处理
1. 点击插件 →「加入待处理」
2. 文章信息写入 Bridge 服务器的待处理队列
3. 不会立即处理，可后续继续总结 / 翻译 / 提取 / 归档
4. popup 历史区显示该条为「待处理」状态

### 场景 5：失败重试
1. 因网络问题发送失败
2. popup 历史区显示该条为「失败」状态，附带错误原因
3. 点击「重试」按钮，使用原始参数重新发送
4. 成功后状态自动更新

### 场景 6：从待处理队列继续处理
1. 点击插件图标，打开 popup
2. 在待处理队列区看到之前加入的文章列表
3. 选择一篇文章，点击「总结」/「翻译」/「提取」/「归档」
4. Bridge 将待处理项状态更新为 processing，转发给 OpenClaw
5. 处理成功后文件移入 `processed/`，失败则移入 `failed/`
6. popup 自动刷新显示最新状态

## 支持的 Action

| Action | UI 文案 | OpenClaw 行为 |
|---|---|---|
| **later** | 加入待处理 | 写入文件队列，不立即处理，不写 memory |
| **summarize** | 总结内容 | 访问页面，生成结构化摘要（3-5 条要点 + 关键结论） |
| **extract** | 提取正文 | 从页面提取核心数据、人名、日期、列表等结构化信息 |
| **translate** | 翻译内容 | 逐段严格全文翻译（英→中 / 中→英自动判断） |
| **archive** | 收进资料库 | 抓取全文归档，保留原始格式 |

所有 Action 均会：
- 保留原文 URL 作为来源引用
- 处理完成后上传结果到 Notion 个人库（later 除外）

## 待处理队列（Pending Queue）

「加入待处理」使用文件系统队列，不走 OpenClaw forwarding。

### 存储路径

```
/root/.openclaw/workspace/claw-inbox/
├── pending/     # 待处理项
├── processed/   # 已处理项（处理成功后自动移入）
└── failed/      # 失败项（处理失败后自动移入）
```

### 文件格式

每个待处理项为一个独立 JSON 文件：

```
2026-03-16T21-03-11-245Z__ci_a1b2c3d4e5f6.json
```

包含字段：
- `id`, `status`, `createdAt`, `updatedAt`
- `type`, `action`, `title`, `url`, `selection`, `note`
- `source`（来源信息）
- `routing`（投递渠道配置）
- `nextActions`（后续可执行的操作列表）
- `result`, `error`

### 待处理工作流

完整的待处理项生命周期：

1. **入队**：用户通过页面或选中文本点击「加入待处理」，Bridge 将信息写入 `pending/` 目录为 JSON 文件
2. **查看队列**：用户在 popup 中打开待处理队列区，通过 `GET /pending` 获取所有待处理项列表
3. **选择操作**：用户从队列中选取一项，点击目标动作按钮（总结 / 翻译 / 提取 / 归档）
4. **处理中**：`POST /pending/:id/process` 将状态从 `pending` → `processing`，并转发给 OpenClaw
5. **完成/失败**：
   - 成功：状态变为 `done`，文件从 `pending/` 移至 `processed/`
   - 失败：状态变为 `failed`，文件从 `pending/` 移至 `failed/`
6. **历史记录**：处理完成后自动写入 capture history，popup 可查看

```
用户操作                     Bridge                              文件系统
  │                           │                                    │
  ├─ 加入待处理 ─────────────> │ 写入 JSON ────────────────────────> pending/xxx.json
  │                           │                                    │
  ├─ 打开 popup ─────────────> │ GET /pending ─────────────────────> 读取 pending/*.json
  │                           │ <── 返回列表 ──                     │
  │                           │                                    │
  ├─ 点击「总结」────────────> │ POST /pending/:id/process          │
  │                           │   status: pending → processing     │
  │                           │   转发给 OpenClaw ──>               │
  │                           │                                    │
  │                           │ 处理完成：                          │
  │                           │   status → done ───────────────────> 移至 processed/
  │                           │   或 status → failed ──────────────> 移至 failed/
```

### 与 archive 的区别

| | 加入待处理 | 收进资料库 |
|---|---|---|
| **行为** | 只入队，不处理 | 龙虾立即抓取全文并归档 |
| **存储** | Bridge 本地文件队列 | Notion 个人库 |
| **后续** | 可手动继续处理 | 处理完成 |

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

# 待处理队列路径
INBOX_BASE_PATH=/root/.openclaw/workspace/claw-inbox
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

### v0.4 (当前)

**核心改进**
- [x] **待处理队列 API**：`GET /pending` 列出所有待处理项，`POST /pending/:id/process` 触发后续处理
- [x] **Popup 待处理队列区**：展示待处理列表，每项附带操作按钮（总结 / 翻译 / 提取 / 归档）
- [x] **状态流转**：`pending` → `processing` → `done` / `failed`
- [x] **文件移动**：处理成功移至 `processed/`，失败移至 `failed/`
- [x] **待处理处理写入历史**：从待处理队列触发的处理结果自动写入 capture history
- [x] **新增错误码**：PENDING_NOT_FOUND / INVALID_PENDING_STATE / FORWARD_FAILED 等

**Bridge 新增**
- [x] `routes/pending.ts`：待处理队列查询与处理路由
- [x] `services/inbox.ts` 扩展：支持读取、状态更新、文件移动
- [x] 处理完成后写入 capture history

**Extension 新增**
- [x] `lib/pending.ts`：待处理队列 API 调用封装
- [x] Popup 新增待处理队列 UI 区域
- [x] 操作按钮触发 `POST /pending/:id/process`

### v0.3

**核心改进**
- [x] **最近 5 条发送历史**：popup 底部展示发送记录（状态 + 动作 + 标题 + 时间 + 目标路径）
- [x] **失败重试**：失败记录提供「重试」按钮，使用原始 payload 重新发送
- [x] **明确结果路径**：每次发送后告知「发给谁了」和「结果去哪里」（如"结果将回到 Telegram"）
- [x] **"later" → "加入待处理"**：UI 全面替换为中文产品语义
- [x] **待处理文件队列**：`action=later` 写入 `/root/.openclaw/workspace/claw-inbox/pending/`，不走 OpenClaw
- [x] **富响应结构**：Bridge 返回 mode / targetLabel / deliveryHint / code，前端精确展示
- [x] **错误码体系**：UNAUTHORIZED / INBOX_WRITE_FAILED / VALIDATION_ERROR / SERVER_ERROR

**Bridge 新增**
- [x] `services/inbox.ts`：文件系统队列，自动创建目录，生成唯一 ID，写入 JSON
- [x] `/capture` 路由区分 later（入队）和其他 action（转发）
- [x] 配置项 `INBOX_BASE_PATH`

**Extension 新增**
- [x] `lib/history.ts`：chrome.storage.local 管理最近 5 条记录
- [x] Popup 历史列表：状态标记（✓ / ◷ / ✗）+ 相对时间 + 目标路径
- [x] 发送成功后展示 deliveryHint（如"结果将回到 Telegram"）
- [x] 右键菜单发送也写入历史
- [x] Options 页面增加"加入待处理"的工作方式说明

### v0.2

**Extension 新增**
- [x] **选中文本支持**：自动检测页面选中文本，支持发送选中内容
- [x] **右键菜单**：Send page / Send selection to Claw Inbox
- [x] **Popup 重新设计**：高频动作（总结/提取/加入待处理）作为主按钮
- [x] **选中文本区域**：检测到选中文本时展示专用操作按钮（总结/翻译）
- [x] **更多操作折叠**：低频动作（翻译/存档）折叠在「更多操作」中
- [x] **中文反馈文案**：发送成功/失败提示更具体
- [x] **错误分类提示**：区分 token 未配置/bridge 不可达/鉴权失败/服务器错误
- [x] **Options 页面优化**：连接状态指示器 + 工作方式说明

### v0.1

**Bridge**
- [x] GET `/health` 健康检查
- [x] POST `/capture` 接收页面数据
- [x] Bearer Token 鉴权 + Zod 校验
- [x] 每个 Action 独立中文指令描述
- [x] Mock 模式 / 真实 CLI 模式
- [x] Fire-and-forget 异步转发
- [x] CORS + Rate Limit

**Extension**
- [x] Manifest V3 + React + Vite
- [x] 自动获取当前页面 title / URL
- [x] Options 页面：Bridge URL + API Token + 测试连接

## Roadmap (v0.5+)

- [ ] 快捷键支持（Ctrl+Shift+S 快速发送）
- [ ] 自定义默认 Action（右键菜单/快捷键的默认动作）
- [ ] Notion 数据库 ID 可配置
- [ ] 批量发送（多个标签页）
- [ ] 侧边栏模式
- [ ] 截图捕获
- [ ] Firefox 支持

## 技术栈

| 组件 | 技术 |
|---|---|
| Shared | TypeScript |
| Bridge | Fastify, @fastify/cors, @fastify/rate-limit, dotenv, Zod |
| Extension | React 19, Vite, TypeScript, Chrome Manifest V3 |
| 进程管理 | pm2 |
| 包管理 | pnpm workspace monorepo |
