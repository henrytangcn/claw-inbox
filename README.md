# Claw Inbox

Browser extension + cloud bridge for sending web pages to OpenClaw.

## Architecture

```
Browser Extension  --HTTPS-->  Bridge Server  ---->  OpenClaw
   (popup/options)            (Fastify, token auth)   (mock for now)
```

- **Extension** captures current page info, lets user pick an action and add a note, sends to bridge
- **Bridge** validates requests, formats messages, forwards to OpenClaw (currently mock mode)
- **Shared** package contains types and constants used by both

## Project Structure

```
claw-inbox/
├── apps/
│   ├── bridge/          # Fastify server (cloud bridge)
│   │   └── src/
│   │       ├── server.ts
│   │       ├── config.ts
│   │       ├── routes/      # health, capture
│   │       ├── services/    # openclaw forward
│   │       └── utils/       # auth, cors, validate, formatMessage
│   └── extension/       # Chrome extension (Manifest V3)
│       ├── src/
│       │   ├── popup/       # Main popup UI
│       │   ├── options/     # Settings page
│       │   ├── background/  # Service worker
│       │   └── lib/         # api, browser, settings helpers
│       └── public/
│           └── manifest.json
├── packages/
│   └── shared/          # Shared types & constants
│       └── src/
│           ├── actions.ts
│           ├── types.ts
│           └── index.ts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Local Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Setup

```bash
pnpm install
pnpm run build:shared
```

### Run Bridge

```bash
# Copy and edit env
cp apps/bridge/.env.example apps/bridge/.env
# Edit .env to set your CLAW_INBOX_API_TOKEN

# Start dev server
pnpm run dev:bridge
```

Bridge runs at `http://127.0.0.1:8787` by default.

Test it:
```bash
curl http://127.0.0.1:8787/health
# {"ok":true}
```

### Build & Load Extension

```bash
pnpm run build:extension
```

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `apps/extension/dist/`

### Configure Extension

1. Right-click extension icon → Options (or go to extension's options page)
2. Set **Bridge URL**: `http://127.0.0.1:8787`
3. Set **API Token**: same value as `CLAW_INBOX_API_TOKEN` in bridge `.env`
4. Click **Save**, then **Test Connection** to verify

### Use It

1. Navigate to any web page
2. Click the Claw Inbox extension icon
3. Select an action (later, summarize, extract, translate, archive)
4. Optionally add a note
5. Click "Send to Claw"
6. Check bridge console for the formatted message

## Implemented (v0.1)

- [x] Monorepo with shared types
- [x] Bridge: `/health` and `/capture` endpoints
- [x] Bridge: Bearer token authentication
- [x] Bridge: Zod payload validation
- [x] Bridge: Message formatting
- [x] Bridge: Mock forward to OpenClaw (console.log)
- [x] Bridge: CORS and rate limiting
- [x] Extension: Popup with page title/url, action selector, note input
- [x] Extension: Options page with bridge URL and token config
- [x] Extension: Connection test button

## Roadmap

- [ ] Real OpenClaw forwarding (replace mock in `services/openclaw.ts`)
- [ ] Text selection capture
- [ ] Context menu integration
- [ ] Screenshot capture
- [ ] Capture history
- [ ] Keyboard shortcuts
- [ ] Firefox support
