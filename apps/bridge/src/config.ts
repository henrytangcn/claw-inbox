import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? "127.0.0.1",
  apiToken: process.env.CLAW_INBOX_API_TOKEN ?? "",
  forwardMode: (process.env.OPENCLAW_FORWARD_MODE ?? "mock") as "mock" | "openclaw",
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? "*",

  // OpenClaw gateway settings
  openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789",
  openclawGatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN ?? "",
  openclawAgentId: process.env.OPENCLAW_AGENT_ID ?? "main",
};
