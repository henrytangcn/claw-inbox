import { config } from "../config.js";

export async function forwardToOpenClaw(message: string): Promise<void> {
  if (config.forwardMode === "mock") {
    console.log("--- OpenClaw Forward (mock) ---");
    console.log(message);
    console.log("--- End ---");
    return;
  }

  // TODO: Real OpenClaw integration
  // Replace this block with actual API call when ready
  throw new Error("OpenClaw forward mode 'openclaw' is not yet implemented");
}
