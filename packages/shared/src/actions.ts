export const ACTIONS = [
  "later",
  "summarize",
  "extract",
  "translate",
  "archive",
] as const;

export type ClawInboxAction = (typeof ACTIONS)[number];
