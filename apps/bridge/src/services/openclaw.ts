import { spawn } from "node:child_process";
import { config } from "../config.js";

export async function forwardToOpenClaw(message: string): Promise<void> {
  if (config.forwardMode === "mock") {
    console.log("--- OpenClaw Forward (mock) ---");
    console.log(message);
    console.log("--- End ---");
    return;
  }

  // Real OpenClaw integration via CLI (fire-and-forget)
  const args = [
    "agent",
    "--agent", config.openclawAgentId,
    "--message", message,
    "--json",
  ];

  // Optionally deliver reply to a channel
  if (config.openclawDeliverChannel) {
    args.push("--deliver");
    args.push("--reply-channel", config.openclawDeliverChannel);
    if (config.openclawDeliverTarget) {
      args.push("--reply-to", config.openclawDeliverTarget);
    }
  }

  // Fire-and-forget: spawn the process and return immediately
  const child = spawn("openclaw", args, {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Log output in background, don't block
  child.stdout?.on("data", (data: Buffer) => {
    console.log(`[OpenClaw] stdout:`, data.toString());
  });
  child.stderr?.on("data", (data: Buffer) => {
    console.warn(`[OpenClaw] stderr:`, data.toString());
  });
  child.on("error", (err) => {
    console.error(`[OpenClaw] spawn error:`, err.message);
  });
  child.on("close", (code) => {
    console.log(`[OpenClaw] process exited with code ${code}`);
  });

  // Detach so bridge doesn't wait
  child.unref();

  console.log(`[OpenClaw] Task dispatched to agent "${config.openclawAgentId}"`);
}
