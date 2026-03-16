export const ACTIONS = [
  "later",
  "summarize",
  "extract",
  "translate",
  "archive",
] as const;

export type ClawInboxAction = (typeof ACTIONS)[number];

/** User-facing Chinese labels for each action */
export const ACTION_LABELS: Record<ClawInboxAction, string> = {
  later: "稍后处理",
  summarize: "总结内容",
  extract: "提取正文",
  translate: "翻译内容",
  archive: "收进资料库",
};

/** Feedback messages after successful send */
export const ACTION_FEEDBACK: Record<ClawInboxAction, string> = {
  later: "已加入稍后处理列表",
  summarize: "已发送给龙虾：总结内容",
  extract: "已发送给龙虾：提取正文",
  translate: "已发送给龙虾：翻译内容",
  archive: "已发送给龙虾：收进资料库",
};

/** Selection-specific feedback */
export const SELECTION_FEEDBACK: Record<string, string> = {
  summarize: "已发送选中文本给龙虾进行总结",
  translate: "已发送选中文本给龙虾进行翻译",
};
