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
  later: "加入待处理",
  summarize: "总结内容",
  extract: "提取正文",
  translate: "翻译内容",
  archive: "收进资料库",
};

/** Feedback messages after successful page send */
export const ACTION_FEEDBACK: Record<ClawInboxAction, string> = {
  later: "已加入待处理",
  summarize: "已发送给龙虾：总结内容",
  extract: "已发送给龙虾：提取正文",
  translate: "已发送给龙虾：翻译内容",
  archive: "已发送给龙虾：收进资料库",
};

/** Selection-specific feedback */
export const SELECTION_FEEDBACK: Record<ClawInboxAction, string> = {
  later: "已将选中文本加入待处理",
  summarize: "已发送选中文本给龙虾进行总结",
  extract: "已发送选中文本给龙虾进行提取",
  translate: "已发送选中文本给龙虾进行翻译",
  archive: "已发送选中文本给龙虾进行归档",
};

/** Delivery hint shown after success */
export const ACTION_DELIVERY_HINT: Record<ClawInboxAction, string> = {
  later: "可稍后继续总结 / 翻译 / 提取 / 归档",
  summarize: "结果将回到 Telegram",
  extract: "结果将回到 Telegram",
  translate: "结果将回到 Telegram",
  archive: "结果将回到 Telegram",
};

/** Target label for history display */
export const ACTION_TARGET_LABEL: Record<ClawInboxAction, string> = {
  later: "待处理队列",
  summarize: "龙虾 → Telegram",
  extract: "龙虾 → Telegram",
  translate: "龙虾 → Telegram",
  archive: "龙虾 → Telegram",
};
