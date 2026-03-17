import type { CapturePayload, InboxItem, PendingProcessAction } from "@claw-inbox/shared";
import type { ClawInboxAction } from "@claw-inbox/shared";

const ACTION_INSTRUCTIONS: Record<ClawInboxAction, string> = {
  later:
    "请将此页面保存为「稍后阅读」。记录标题、URL 和备注，保留原文 URL 以便日后访问。",
  summarize:
    "请访问此 URL，阅读全文，生成一份结构化摘要。摘要应包含：要点概括（3-5 条）、关键结论、以及原文主要论点。必须保留原文 URL 作为来源引用。",
  extract:
    "请访问此 URL，从中提取关键信息，包括但不限于：核心数据、关键人名/机构、重要日期、列表、引用等结构化内容。必须保留原文 URL 作为来源引用。",
  translate:
    "请访问此 URL，对原文进行逐段严格翻译（非总结、非概述）。如原文为英文则翻译为中文，如原文为中文则翻译为英文。要求：1) 逐段对照翻译，不得跳过、合并或省略任何段落；2) 保持原文的段落结构、标题层级和列表格式；3) 专业术语首次出现时附注原文（如：「机器学习（Machine Learning）」）；4) 不要添加摘要、总结或个人评论。必须保留原文 URL 作为来源引用。",
  archive:
    "请访问此 URL，抓取全文内容并归档保存。保留原始格式和关键信息，作为长期知识存档。必须保留原文 URL 作为来源引用。",
};

const NOTION_INSTRUCTION =
  "完成上述任务后，请将结果上传到我的 Notion 个人库中，创建一个新页面。页面必须包含：原文标题、原文 URL（作为可点击链接）、处理结果、以及处理时间。";

export function formatMessage(payload: CapturePayload): string {
  const instruction = ACTION_INSTRUCTIONS[payload.action];

  const lines = [
    "[Claw Inbox]",
    "",
    `## 任务: ${payload.action}`,
    "",
    `**指令:** ${instruction}`,
    "",
    `**页面信息:**`,
    `- 标题: ${payload.title}`,
    `- URL: ${payload.url}`,
    `- 类型: ${payload.type}`,
  ];

  if (payload.selection) {
    lines.push("", `**选中内容:**`, payload.selection);
  }

  if (payload.note) {
    lines.push("", `**用户备注:**`, payload.note);
  }

  lines.push("", `---`, "", NOTION_INSTRUCTION);

  return lines.join("\n");
}

/** Format message from a pending item being processed */
export function formatPendingMessage(item: InboxItem, action: PendingProcessAction): string {
  const instruction = ACTION_INSTRUCTIONS[action];

  const lines = [
    "[Claw Inbox - 待处理项]",
    "",
    `## 任务: ${action}`,
    "",
    `**指令:** ${instruction}`,
    "",
    `**页面信息:**`,
    `- 标题: ${item.title}`,
    `- URL: ${item.url}`,
    `- 类型: ${item.type}`,
    `- 来源: 待处理队列 (${item.id})`,
  ];

  if (item.selection) {
    lines.push("", `**选中内容:**`, item.selection);
  }

  if (item.note) {
    lines.push("", `**用户备注:**`, item.note);
  }

  lines.push("", `---`, "", NOTION_INSTRUCTION);

  return lines.join("\n");
}
