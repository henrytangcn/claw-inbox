import type { FastifyInstance } from "fastify";
import type { CapturePayload, CaptureResponse } from "@claw-inbox/shared";
import { verifyToken } from "../utils/auth.js";
import { capturePayloadSchema } from "../utils/validate.js";
import { formatMessage } from "../utils/formatMessage.js";
import { forwardToOpenClaw } from "../services/openclaw.js";

export async function captureRoute(app: FastifyInstance) {
  app.post<{ Body: CapturePayload; Reply: CaptureResponse }>(
    "/capture",
    { preHandler: [verifyToken] },
    async (request, reply) => {
      const parsed = capturePayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          ok: false,
          message: parsed.error.issues.map((i) => i.message).join("; "),
        });
      }

      const message = formatMessage(parsed.data);
      await forwardToOpenClaw(message);

      return { ok: true, message: "Captured" };
    },
  );
}
