import type { FastifyInstance } from "fastify";
import type { PendingProcessAction } from "@claw-inbox/shared";
import { ACTION_FEEDBACK, ACTION_TARGET_LABEL } from "@claw-inbox/shared";
import { verifyToken } from "../utils/auth.js";
import { listPendingItems, getPendingItem, markProcessing, markDone, markFailed } from "../services/inbox.js";
import { formatPendingMessage } from "../utils/formatMessage.js";
import { forwardToOpenClaw } from "../services/openclaw.js";

const VALID_PROCESS_ACTIONS = ["summarize", "translate", "extract", "archive"] as const;

export async function pendingRoute(app: FastifyInstance) {
  // ── GET /pending ──
  app.get(
    "/pending",
    { preHandler: [verifyToken] },
    async () => {
      const items = await listPendingItems(20);
      return { ok: true, items, total: items.length };
    },
  );

  // ── POST /pending/:id/process ──
  app.post<{ Params: { id: string }; Body: { action: string } }>(
    "/pending/:id/process",
    { preHandler: [verifyToken] },
    async (request, reply) => {
      const { id } = request.params;
      const { action } = request.body ?? {};

      // Validate action
      if (!action || !VALID_PROCESS_ACTIONS.includes(action as PendingProcessAction)) {
        return reply.status(400).send({
          ok: false,
          code: "VALIDATION_ERROR",
          message: `无效的动作: ${action}，允许: ${VALID_PROCESS_ACTIONS.join(", ")}`,
        });
      }

      const processAction = action as PendingProcessAction;

      // Find the pending item
      const found = await getPendingItem(id);
      if (!found) {
        return reply.status(404).send({
          ok: false,
          code: "PENDING_NOT_FOUND",
          message: "待处理项不存在",
        });
      }

      if (found.item.status !== "pending") {
        return reply.status(409).send({
          ok: false,
          code: "INVALID_PENDING_STATE",
          message: `当前状态为 ${found.item.status}，无法继续处理`,
        });
      }

      // Mark as processing
      try {
        await markProcessing(id);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        return reply.status(500).send({
          ok: false,
          code: "PENDING_WRITE_FAILED",
          message: `状态更新失败: ${errMsg}`,
        });
      }

      // Generate message from pending item data and forward
      try {
        const message = formatPendingMessage(found.item, processAction);
        await forwardToOpenClaw(message);

        await markDone(id, processAction);

        return {
          ok: true,
          message: ACTION_FEEDBACK[processAction],
          targetLabel: ACTION_TARGET_LABEL[processAction],
          deliveryHint: "结果将回到 Telegram",
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Pending] Process failed for ${id}:`, errMsg);

        // Mark as failed
        try {
          await markFailed(id, errMsg);
        } catch (e) {
          console.error(`[Pending] Failed to mark failed:`, e);
        }

        return reply.status(500).send({
          ok: false,
          code: "FORWARD_FAILED",
          message: `处理失败: ${errMsg}`,
        });
      }
    },
  );
}
