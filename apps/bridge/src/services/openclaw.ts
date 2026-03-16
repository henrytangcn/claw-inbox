import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config.js";

const execFileAsync = promisify(execFile);

export async function forwardToOpenClaw(message: string): Promise<void> {
  if (config.forwardMode === "mock") {
    console.log("--- OpenClaw Forward (mock) ---");
    console.log(message);
    console.log("--- End ---");
    return;
  }

  // Real OpenClaw integration via CLI
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

  try {
    const { stdout, stderr } = await execFileAsync("openclaw", args, {
      timeout: 120_000, // 2 minutes
    });
    console.log(`[OpenClaw] Agent response:`, stdout);
    if (stderr) console.warn(`[OpenClaw] stderr:`, stderr);
  } catch (err: any) {
    throw new Error(`OpenClaw CLI error: ${err.message}`);
  }
}
