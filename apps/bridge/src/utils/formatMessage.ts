import type { CapturePayload } from "@claw-inbox/shared";

export function formatMessage(payload: CapturePayload): string {
  const lines = [
    "[Claw Inbox]",
    `action: ${payload.action}`,
    `type: ${payload.type}`,
    `title: ${payload.title}`,
    `url: ${payload.url}`,
    "",
    "selection:",
    payload.selection ?? "",
    "",
    "note:",
    payload.note ?? "",
  ];
  return lines.join("\n");
}
