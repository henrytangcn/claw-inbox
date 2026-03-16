import type { CapturePayload, CaptureResponse, CaptureHistoryItem } from "@claw-inbox/shared";

// ── Settings helper (inlined for service worker) ──

interface Settings {
  bridgeBaseUrl: string;
  apiToken: string;
}

async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(["bridgeBaseUrl", "apiToken"]);
  return {
    bridgeBaseUrl: result.bridgeBaseUrl || "http://127.0.0.1:8787",
    apiToken: result.apiToken || "",
  };
}

// ── History helper (inlined for service worker) ──

const STORAGE_KEY = "captureHistory";
const MAX_ITEMS = 5;

async function addHistoryFromBg(
  payload: CapturePayload,
  response: CaptureResponse | null,
  error: string | null,
): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const items: CaptureHistoryItem[] = result[STORAGE_KEY] || [];

  const isSuccess = response?.ok === true;
  const isPending = response?.mode === "pending";

  const targetLabels: Record<string, string> = {
    later: "待处理队列",
    summarize: "龙虾 → Telegram",
    extract: "龙虾 → Telegram",
    translate: "龙虾 → Telegram",
    archive: "龙虾 → Telegram",
  };

  const item: CaptureHistoryItem = {
    id: "h_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    type: payload.type,
    action: payload.action,
    title: payload.title,
    url: payload.url,
    status: isSuccess ? (isPending ? "pending" : "success") : "failed",
    targetLabel: response?.targetLabel ?? targetLabels[payload.action] ?? "",
    retryable: !isSuccess,
    payload,
    errorMessage: error ?? undefined,
  };

  items.unshift(item);
  await chrome.storage.local.set({ [STORAGE_KEY]: items.slice(0, MAX_ITEMS) });
}

// ── Send capture to bridge ──

async function sendCaptureToBridge(payload: CapturePayload): Promise<CaptureResponse> {
  const { bridgeBaseUrl, apiToken } = await getSettings();
  if (!apiToken) throw new Error("Token not configured");

  const url = `${bridgeBaseUrl.replace(/\/$/, "")}/capture`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<CaptureResponse>;
}

// ── Notification helper ──

function notify(message: string, isError = false) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#e74c3c"/><text x="24" y="32" text-anchor="middle" fill="#fff" font-size="24">C</text></svg>'),
    title: isError ? "Claw Inbox - 发送失败" : "Claw Inbox",
    message,
  });
}

// ── Context menu setup ──

chrome.runtime.onInstalled.addListener(() => {
  console.log("Claw Inbox extension installed");

  chrome.contextMenus.create({
    id: "claw-send-page",
    title: "Send page to Claw Inbox",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "claw-send-selection",
    title: "Send selection to Claw Inbox",
    contexts: ["selection"],
  });
});

// ── Context menu click handler ──

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const title = tab?.title ?? "";
  const url = tab?.url ?? "";

  const isSelection = info.menuItemId === "claw-send-selection" && info.selectionText;

  const payload: CapturePayload = {
    type: isSelection ? "selection" : "page",
    title,
    url,
    action: isSelection ? "summarize" : "later",
    selection: isSelection ? info.selectionText : undefined,
    source: {
      browser: "chrome",
      capturedAt: new Date().toISOString(),
      via: "context-menu",
    },
  };

  let response: CaptureResponse | null = null;
  let errorMsg: string | null = null;

  try {
    response = await sendCaptureToBridge(payload);
    notify(response.message);
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Unknown error";
    notify(`发送失败: ${errorMsg}`, true);
  }

  await addHistoryFromBg(payload, response, errorMsg);
});
