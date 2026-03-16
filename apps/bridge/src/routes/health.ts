import type { FastifyInstance } from "fastify";
import type { HealthResponse } from "@claw-inbox/shared";

export async function healthRoute(app: FastifyInstance) {
  app.get<{ Reply: HealthResponse }>("/health", async () => {
    return { ok: true };
  });
}
