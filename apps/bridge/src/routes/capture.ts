import type { FastifyInstance } from "fastify";
import type { CapturePayload, CaptureResponse } from "@claw-inbox/shared";
import { ACTION_FEEDBACK, ACTION_TARGET_LABEL, SELECTION_FEEDBACK } from "@claw-inbox/shared";
import { verifyToken } from "../utils/auth.js";
import { capturePayloadSchema } from "../utils/validate.js";
import { formatMessage } from "../utils/formatMessage.js";
import { forwardToOpenClaw } from "../services/openclaw.js";
import { createPendingItem } from "../services/inbox.js";

export async function captureRoute(app: FastifyInstance) {
  app.post<{ Body: CapturePayload; Reply: CaptureResponse }>(
    "/capture",
    { preHandler: [verifyToken] },
    async (request, reply) => {
      const parsed = capturePayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((i) => i.message).join("; "),
        });
      }

      const payload = parsed.data;

      // ── "later" → file queue, no OpenClaw forwarding ──
      if (payload.action === "later") {
        try {
          const item = await createPendingItem(payload);
          const feedback = payload.type === "selection"
            ? SELECTION_FEEDBACK.later
            : ACTION_FEEDBACK.later;
          return {
            ok: true,
            mode: "pending" as const,
            message: feedback,
            itemId: item.id,
            targetLabel: ACTION_TARGET_LABEL.later,
            deliveryHint: "可稍后继续总结 / 翻译 / 提取 / 归档",
          };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          console.error("[Inbox] Write failed:", errMsg);
          return reply.status(500).send({
            ok: false,
            code: "INBOX_WRITE_FAILED",
            message: `待处理写入失败: ${errMsg}`,
          });
        }
      }

      // ── Other actions → OpenClaw forwarding ──
      try {
        const message = formatMessage(payload);
        await forwardToOpenClaw(message);

        const feedback = payload.type === "selection" && SELECTION_FEEDBACK[payload.action]
          ? SELECTION_FEEDBACK[payload.action]
          : ACTION_FEEDBACK[payload.action];

        return {
          ok: true,
          mode: "forwarded" as const,
          message: feedback,
          targetLabel: ACTION_TARGET_LABEL[payload.action],
          deliveryHint: "结果将回到 Telegram",
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("[OpenClaw] Forward failed:", errMsg);
        return reply.status(500).send({
          ok: false,
          code: "SERVER_ERROR",
          message: `转发失败: ${errMsg}`,
        });
      }
    },
  );
}
