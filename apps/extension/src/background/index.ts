import type { CapturePayload } from "@claw-inbox/shared";

// ── Settings helper (can't import from lib due to service worker scope) ──

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

// ── Send capture to bridge ──

async function sendCaptureToBridge(payload: CapturePayload): Promise<void> {
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
    throw new Error(`HTTP ${res.status}`);
  }
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

  // Create context menus
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
    },
  };

  try {
    await sendCaptureToBridge(payload);
    const msg = isSelection
      ? "已发送选中文本给龙虾进行总结"
      : "已加入稍后处理列表";
    notify(msg);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    notify(`发送失败: ${errMsg}`, true);
  }
});
