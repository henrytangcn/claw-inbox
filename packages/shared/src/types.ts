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
