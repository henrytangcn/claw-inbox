# Claw Inbox

English | [中文](./README.md)

Browser extension + cloud Bridge — one-click capture of web pages or selected text, sent to your cloud-hosted OpenClaw for processing.

## Architecture

```
Browser Extension  ──HTTPS──>  Cloud Bridge (Fastify)  ──CLI──>  OpenClaw Agent  ──>  Telegram / Feishu reply
                                │                                                       │
                                │ Bearer Token auth                                     ↓
                                │ Zod validation                                    Notion archive
                                │ Message formatting
                                │ Fire-and-forget async forwarding
                                │
                                │ When action=later:
                                └──> Filesystem queue (/root/.openclaw/workspace/claw-inbox/pending/)
                                │
                                │ GET /pending + POST /pending/:id/process
                                └──> Query pending queue / trigger processing
```

- **Extension**: Chrome extension (Manifest V3) — captures current page info or selected text, picks an action, sends to Bridge
- **Bridge**: Fastify server deployed in the cloud — handles auth, validation, message formatting, and forwards to OpenClaw via CLI
- **Shared**: Shared types, constants, and action labels used by both Bridge and Extension

## Project Structure

```
claw-inbox/
├── apps/
│   ├── bridge/              # Fastify cloud Bridge server
│   │   ├── .env.example     # Environment variable template
│   │   └── src/
│   │       ├── server.ts    # Entry point (CORS + Rate Limit)
│   │       ├── config.ts    # Environment config
│   │       ├── routes/
│   │       │   ├── health.ts    # GET /health
│   │       │   ├── capture.ts   # POST /capture (later → queue, others → forward)
│   │       │   └── pending.ts   # GET /pending + POST /pending/:id/process
│   │       ├── services/
│   │       │   ├── openclaw.ts  # OpenClaw forwarding (mock / real CLI)
│   │       │   └── inbox.ts     # Pending queue (filesystem read/write + status transitions)
│   │       └── utils/
│   │           ├── auth.ts          # Bearer Token verification
│   │           ├── cors.ts          # CORS config
│   │           ├── validate.ts      # Zod payload validation
│   │           └── formatMessage.ts # Message formatting + action instructions
│   └── extension/           # Chrome Extension (Manifest V3)
│       ├── public/
│       │   └── manifest.json
│       └── src/
│           ├── popup/       # Popup UI (quick actions + history)
│           │   ├── App.tsx
│           │   ├── main.tsx
│           │   └── popup.css
│           ├── options/     # Settings page (connection status + workflow info)
│           │   ├── OptionsApp.tsx
│           │   └── options.tsx
│           ├── background/  # Service Worker (context menu + notifications + history)
│           │   └── index.ts
│           └── lib/
│               ├── api.ts       # Bridge API calls + error classification
│               ├── browser.ts   # Page info + text selection detection
│               ├── history.ts   # Send history + pending record management
│               ├── pending.ts   # Pending queue API calls
│               └── settings.ts  # chrome.storage read/write
├── packages/
│   └── shared/              # Shared types and constants
│       └── src/
│           ├── actions.ts   # Action definitions + labels + feedback + target paths
│           ├── types.ts     # CapturePayload / CaptureResponse / CaptureHistoryItem
│           └── index.ts     # Unified exports
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Core Usage Scenarios

### Scenario 1: Summarize an Article
1. Open any web page
2. Click the Claw Inbox extension icon
3. Click **"Summarize this page"**
4. You'll see: "Sent to Lobster: Summarize — results will arrive in Telegram"
5. OpenClaw reads the full article, generates a summary, sends it to Telegram, and saves it to Notion

### Scenario 2: Translate Selected Text
1. Select a passage of foreign text on a web page
2. Click the extension icon
3. See the "Text selected" indicator
4. Click **"Translate selected text"**
5. OpenClaw translates the selection and sends the result to Telegram

### Scenario 3: Right-Click Quick Send
1. Right-click on a blank area → **Send page to Claw Inbox** (defaults to "Add to Pending")
2. Select text, then right-click → **Send selection to Claw Inbox** (defaults to "Summarize")
3. No need to open the popup — sends directly with a system notification for feedback

### Scenario 4: Add to Pending
1. Click the extension → **"Add to Pending"**
2. Page info is written to the Bridge server's pending queue
3. Not processed immediately — you can summarize / translate / extract / archive later
4. The popup history shows this item as "Pending"

### Scenario 5: Retry on Failure
1. A send fails due to a network issue
2. The popup history shows it as "Failed" with the error reason
3. Click the **"Retry"** button to resend with the original parameters
4. Status updates automatically on success

### Scenario 6: Process from Pending Queue
1. Click the extension icon to open the popup
2. View previously added articles in the pending queue section
3. Pick an article and click **"Summarize"** / **"Translate"** / **"Extract"** / **"Archive"**
4. Bridge updates the item status to processing and forwards to OpenClaw
5. On success the file moves to `processed/`; on failure it moves to `failed/`
6. The popup auto-refreshes to show the latest status

## Supported Actions

| Action | UI Label | OpenClaw Behavior |
|---|---|---|
| **later** | Add to Pending | Writes to file queue — no immediate processing, no memory write |
| **summarize** | Summarize | Reads the page, generates a structured summary (3–5 key points + conclusions) |
| **extract** | Extract | Extracts key data, names, dates, lists, and structured content from the page |
| **translate** | Translate | Strict paragraph-by-paragraph full-text translation (auto-detects EN↔CN) |
| **archive** | Archive | Fetches and archives the full page content, preserving original formatting |

All actions will:
- Preserve the original URL as a source reference
- Upload results to your Notion personal library (except "Add to Pending")

## Pending Queue

"Add to Pending" uses a filesystem-based queue and does **not** go through OpenClaw forwarding.

### Storage Path

```
/root/.openclaw/workspace/claw-inbox/
├── pending/     # Pending items
├── processed/   # Processed items (future)
└── failed/      # Failed items (future)
```

### File Format

Each pending item is stored as a standalone JSON file:

```
2026-03-16T21-03-11-245Z__ci_a1b2c3d4e5f6.json
```

Fields include:
- `id`, `status`, `createdAt`, `updatedAt`
- `type`, `action`, `title`, `url`, `selection`, `note`
- `source` (origin info)
- `routing` (delivery channel config)
- `nextActions` (list of actions that can be applied later)
- `result`, `error`

### Pending vs. Archive

| | Add to Pending | Archive |
|---|---|---|
| **Behavior** | Queue only, no processing | OpenClaw immediately fetches and archives |
| **Storage** | Bridge local file queue | Notion personal library |
| **Follow-up** | Can be processed manually later | Done |

## Local Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Install

```bash
git clone git@github.com:henrytangcn/claw-inbox.git
cd claw-inbox
pnpm install
pnpm run build:shared
```

### Start Bridge (Local Dev)

```bash
cp apps/bridge/.env.example apps/bridge/.env
# Edit .env, set CLAW_INBOX_API_TOKEN

pnpm run dev:bridge
# Bridge runs at http://127.0.0.1:8787
```

Verify:
```bash
curl http://127.0.0.1:8787/health
# {"ok":true}
```

### Build and Load Extension

```bash
pnpm run build:extension
```

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `apps/extension/dist/` directory

### Configure Extension

1. Right-click the extension icon → **Options** (or go to extension settings)
2. Enter **Bridge URL**: `http://127.0.0.1:8787`
3. Enter **API Token**: must match `CLAW_INBOX_API_TOKEN` in Bridge `.env`
4. Click **Save** → **Test Connection** to confirm

## Cloud Deployment

### Deploy Bridge

```bash
# Clone the project on your server
git clone git@github.com:henrytangcn/claw-inbox.git /opt/claw-inbox
cd /opt/claw-inbox

# Install dependencies and build
pnpm install
pnpm --filter @claw-inbox/shared build
pnpm --filter @claw-inbox/bridge build

# Configure environment
cp apps/bridge/.env.example apps/bridge/.env
vim apps/bridge/.env
```

Cloud `.env` example:

```env
PORT=8787
HOST=0.0.0.0
CLAW_INBOX_API_TOKEN=<generate with openssl rand -hex 32>
OPENCLAW_FORWARD_MODE=openclaw
ALLOWED_ORIGINS=*

# OpenClaw CLI settings
OPENCLAW_AGENT_ID=main
OPENCLAW_DELIVER_CHANNEL=telegram
OPENCLAW_DELIVER_TARGET=<your Telegram chat ID>

# Pending queue path
INBOX_BASE_PATH=/root/.openclaw/workspace/claw-inbox
```

### Process Management with pm2

```bash
npm install -g pm2

cd /opt/claw-inbox/apps/bridge
pm2 start dist/server.js --name claw-bridge
pm2 save
pm2 startup
```

Common commands:

```bash
pm2 status              # Check status
pm2 logs claw-bridge    # View logs
pm2 restart claw-bridge # Restart
```

### Connect Extension to Cloud

In the extension Options page:
- **Bridge URL**: `http://<your-server-public-ip>:8787` (or `https://bridge.yourdomain.com` with Nginx)
- **API Token**: must match the server `.env` value

### Update Deployment

```bash
cd /opt/claw-inbox
git pull
pnpm --filter @claw-inbox/shared build
pnpm --filter @claw-inbox/bridge build
pm2 restart claw-bridge
```

After updating the extension locally, run `pnpm run build:extension` and click reload in `chrome://extensions/`.

## Implemented Features

### v0.3 (Current)

**Core Improvements**
- [x] **Last 5 send history**: shown in popup with status + action + title + time + target path
- [x] **Retry on failure**: failed items have a "Retry" button using the original payload
- [x] **Clear result paths**: each send shows who received it and where results will go (e.g., "Results will arrive in Telegram")
- [x] **"later" → "Add to Pending"**: UI fully updated with user-friendly labels
- [x] **Pending file queue**: `action=later` writes JSON to `/root/.openclaw/workspace/claw-inbox/pending/`, skips OpenClaw
- [x] **Rich responses**: Bridge returns mode / targetLabel / deliveryHint / code for precise frontend display
- [x] **Error code system**: UNAUTHORIZED / INBOX_WRITE_FAILED / VALIDATION_ERROR / SERVER_ERROR

**Bridge**
- [x] `services/inbox.ts`: filesystem queue with auto-created directories, unique IDs, JSON writes
- [x] `/capture` route distinguishes later (queue) from other actions (forward)
- [x] `INBOX_BASE_PATH` config option

**Extension**
- [x] `lib/history.ts`: chrome.storage.local manages last 5 records
- [x] Popup history list: status badges (✓ / ◷ / ✗) + relative time + target path
- [x] Delivery hints shown after successful send
- [x] Context menu sends also write to history
- [x] Options page explains pending queue workflow

### v0.2

**Extension**
- [x] **Text selection support**: auto-detects selected text, supports sending selections
- [x] **Context menu**: Send page / Send selection to Claw Inbox
- [x] **Popup redesign**: high-frequency actions (Summarize / Extract / Add to Pending) as primary buttons
- [x] **Selection section**: dedicated action buttons when text is selected (Summarize / Translate)
- [x] **Collapsible "More"**: low-frequency actions (Translate / Archive) folded away
- [x] **Localized feedback**: specific success/failure messages in Chinese
- [x] **Error classification**: distinguishes token missing / bridge unreachable / auth failed / server error
- [x] **Options improvements**: connection status indicator + workflow explanation

### v0.1

**Bridge**
- [x] GET `/health` health check
- [x] POST `/capture` receives page data
- [x] Bearer Token auth + Zod validation
- [x] Per-action Chinese instruction descriptions
- [x] Mock mode / real CLI mode
- [x] Fire-and-forget async forwarding
- [x] CORS + Rate Limit

**Extension**
- [x] Manifest V3 + React + Vite
- [x] Auto-fetches current page title / URL
- [x] Options page: Bridge URL + API Token + Test Connection

## Roadmap (v0.4+)

- [ ] Keyboard shortcuts (Ctrl+Shift+S for quick send)
- [ ] Custom default action (for context menu / shortcuts)
- [ ] Configurable Notion database ID
- [ ] Batch send (multiple tabs)
- [ ] Side panel mode
- [ ] Screenshot capture
- [ ] Firefox support
- [ ] Process pending items (trigger summarize/translate from pending queue)

## Tech Stack

| Component | Technology |
|---|---|
| Shared | TypeScript |
| Bridge | Fastify, @fastify/cors, @fastify/rate-limit, dotenv, Zod |
| Extension | React 19, Vite, TypeScript, Chrome Manifest V3 |
| Process Mgmt | pm2 |
| Package Mgmt | pnpm workspace monorepo |
