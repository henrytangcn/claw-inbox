import { config } from "../config.js";

export async function forwardToOpenClaw(message: string): Promise<void> {
  if (config.forwardMode === "mock") {
    console.log("--- OpenClaw Forward (mock) ---");
    console.log(message);
    console.log("--- End ---");
    return;
  }

  // Real OpenClaw gateway integration
  const url = `${config.openclawGatewayUrl}/v1/responses`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openclawGatewayToken}`,
      "x-openclaw-agent-id": config.openclawAgentId,
    },
    body: JSON.stringify({
      model: "openclaw",
      input: message,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenClaw gateway error ${res.status}: ${body}`);
  }

  console.log(`[OpenClaw] Message forwarded to agent "${config.openclawAgentId}"`);
}
