import type { ClawInboxAction } from "./actions.js";

export type CaptureType = "page" | "selection";

export interface CapturePayload {
  type: CaptureType;
  title: string;
  url: string;
  selection?: string;
  note?: string;
  action: ClawInboxAction;
  source?: {
    browser?: string;
    capturedAt?: string;
    via?: string;
  };
}

export interface CaptureResponse {
  ok: boolean;
  message: string;
  mode?: "forwarded" | "pending";
  code?: string;
  itemId?: string;
  targetLabel?: string;
  deliveryHint?: string;
}

export interface HealthResponse {
  ok: boolean;
}

/** Client-side history item stored in chrome.storage.local */
export interface CaptureHistoryItem {
  id: string;
  createdAt: string;
  type: CaptureType;
  action: ClawInboxAction;
  title: string;
  url: string;
  status: "success" | "failed" | "pending";
  targetLabel: string;
  retryable: boolean;
  payload: CapturePayload;
  errorMessage?: string;
}

// ── Pending Queue Types ──

export type InboxStatus = "pending" | "processing" | "done" | "failed";

export interface InboxItem {
  id: string;
  status: InboxStatus;
  createdAt: string;
  updatedAt: string;
  type: CaptureType;
  action: string;
  title: string;
  url: string;
  selection: string | null;
  note: string | null;
  source?: {
    browser?: string;
    capturedAt?: string;
    via?: string;
  };
  routing?: {
    deliverChannel?: string;
    deliverTarget?: string;
  };
  nextActions: Array<"summarize" | "translate" | "extract" | "archive">;
  result: unknown;
  error: string | null;
}

export interface PendingListResponse {
  ok: boolean;
  items: InboxItem[];
  total: number;
}

export type PendingProcessAction = "summarize" | "translate" | "extract" | "archive";

export interface PendingProcessRequest {
  action: PendingProcessAction;
}

export interface PendingProcessResponse {
  ok: boolean;
  message: string;
  code?: string;
  targetLabel?: string;
  deliveryHint?: string;
}
