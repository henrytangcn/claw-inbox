import type { CapturePayload } from "@claw-inbox/shared";
import type { ClawInboxAction } from "@claw-inbox/shared";

const ACTION_INSTRUCTIONS: Record<ClawInboxAction, string> = {
  later:
    "请将此页面保存为「稍后阅读」。记录标题、URL 和备注，保留原文 URL 以便日后访问。",
  summarize:
    "请访问此 URL，阅读全文，生成一份结构化摘要。摘要应包含：要点概括（3-5 条）、关键结论、以及原文主要论点。必须保留原文 URL 作为来源引用。",
  extract:
    "请访问此 URL，从中提取关键信息，包括但不限于：核心数据、关键人名/机构、重要日期、列表、引用等结构化内容。必须保留原文 URL 作为来源引用。",
  translate:
    "请访问此 URL，将全文翻译为中文（如原文已是中文则翻译为英文）。保持原文结构，确保专业术语准确。必须保留原文 URL 作为来源引用。",
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
