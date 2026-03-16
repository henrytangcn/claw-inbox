import type { CapturePayload, CaptureResponse, HealthResponse } from "@claw-inbox/shared";
import { getSettings } from "./settings";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { bridgeBaseUrl, apiToken } = await getSettings();

  if (!apiToken) {
    throw new Error("TOKEN_NOT_CONFIGURED");
  }

  const url = `${bridgeBaseUrl.replace(/\/$/, "")}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
        ...options?.headers,
      },
    });
  } catch {
    throw new Error("BRIDGE_UNREACHABLE");
  }

  if (res.status === 401) {
    throw new Error("AUTH_FAILED");
  }

  if (!res.ok) {
    throw new Error("SERVER_ERROR");
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

/** Map error codes to user-friendly Chinese messages */
export function getErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "UNKNOWN";
  switch (msg) {
    case "TOKEN_NOT_CONFIGURED":
      return "API Token 未配置，请先到设置页配置";
    case "BRIDGE_UNREACHABLE":
      return "无法连接到 Bridge，请检查网络和 Bridge 地址";
    case "AUTH_FAILED":
      return "鉴权失败，请检查 API Token 是否正确";
    case "SERVER_ERROR":
      return "服务器错误，请稍后重试";
    default:
      return `发送失败: ${msg}`;
  }
}
