import type { CapturePayload, CaptureResponse, HealthResponse } from "@claw-inbox/shared";
import { getSettings } from "./settings";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { bridgeBaseUrl, apiToken } = await getSettings();
  const url = `${bridgeBaseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function sendCapture(payload: CapturePayload): Promise<CaptureResponse> {
  return request<CaptureResponse>("/capture", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
