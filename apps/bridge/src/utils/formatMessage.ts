import type { CapturePayload } from "@claw-inbox/shared";
import type { ClawInboxAction } from "@claw-inbox/shared";

const ACTION_INSTRUCTIONS: Record<ClawInboxAction, string> = {
  later:
    "请将此页面保存为「稍后阅读」。记录标题、URL 和备注即可，不需要立即处理内容。",
  summarize:
    "请访问此页面，阅读全文，生成一份结构化摘要。摘要应包含：要点概括（3-5 条）、关键结论、以及原文主要论点。",
  extract:
    "请访问此页面，从中提取关键信息，包括但不限于：核心数据、关键人名/机构、重要日期、列表、引用等结构化内容。",
  translate:
    "请访问此页面，将全文翻译为中文（如原文已是中文则翻译为英文）。保持原文结构，确保专业术语准确。",
  archive:
    "请访问此页面，抓取全文内容并归档保存。保留原始格式和关键信息，作为长期知识存档。",
};

const NOTION_INSTRUCTION =
  "完成上述任务后，请将结果上传到我的 Notion 个人库中，创建一个新页面，标题使用原文标题，内容包含处理结果、原始 URL 和处理时间。";

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
