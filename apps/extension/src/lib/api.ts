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
    // Try to extract server error code
    try {
      const body = await res.json();
      if (body.code) throw new Error(body.code);
      if (body.message) throw new Error(body.message);
    } catch (e) {
      if (e instanceof Error && e.message !== "SERVER_ERROR") throw e;
    }
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
    case "INBOX_WRITE_FAILED":
      return "待处理写入失败，请检查服务器磁盘";
    case "VALIDATION_ERROR":
      return "数据校验失败，请刷新页面重试";
    case "SERVER_ERROR":
      return "服务器错误，请稍后重试";
    default:
      return `发送失败: ${msg}`;
  }
}

/** Error code for retryable check */
export function isRetryableError(errMsg: string): boolean {
  const nonRetryable = ["TOKEN_NOT_CONFIGURED", "API Token 未配置"];
  return !nonRetryable.some((s) => errMsg.includes(s));
}
