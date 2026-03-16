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
  };
}

export interface CaptureResponse {
  ok: boolean;
  message: string;
}

export interface HealthResponse {
  ok: boolean;
}
