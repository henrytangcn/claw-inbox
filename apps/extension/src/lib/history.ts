import type { CaptureHistoryItem, CapturePayload, CaptureResponse } from "@claw-inbox/shared";
import { ACTION_TARGET_LABEL } from "@claw-inbox/shared";

const STORAGE_KEY = "captureHistory";
const MAX_ITEMS = 5;

function generateId(): string {
  return "h_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function getHistory(): Promise<CaptureHistoryItem[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

async function saveHistory(items: CaptureHistoryItem[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: items.slice(0, MAX_ITEMS) });
}

export async function addHistoryItem(
  payload: CapturePayload,
  response: CaptureResponse | null,
  error: string | null,
): Promise<CaptureHistoryItem> {
  const items = await getHistory();

  const isSuccess = response?.ok === true;
  const isPending = response?.mode === "pending";

  const item: CaptureHistoryItem = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    type: payload.type,
    action: payload.action,
    title: payload.title,
    url: payload.url,
    status: isSuccess ? (isPending ? "pending" : "success") : "failed",
    targetLabel: response?.targetLabel ?? ACTION_TARGET_LABEL[payload.action] ?? "",
    retryable: !isSuccess,
    payload,
    errorMessage: error ?? undefined,
  };

  items.unshift(item);
  await saveHistory(items);
  return item;
}

export async function updateHistoryItem(
  id: string,
  updates: Partial<Pick<CaptureHistoryItem, "status" | "targetLabel" | "retryable" | "errorMessage">>,
): Promise<void> {
  const items = await getHistory();
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    Object.assign(items[idx], updates);
    await saveHistory(items);
  }
}
