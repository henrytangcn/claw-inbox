import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? "127.0.0.1",
  apiToken: process.env.CLAW_INBOX_API_TOKEN ?? "",
  forwardMode: (process.env.OPENCLAW_FORWARD_MODE ?? "mock") as "mock" | "openclaw",
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? "*",
};
