import type { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";

export async function verifyToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return reply.status(401).send({ ok: false, message: "Missing token" });
  }
  const token = header.slice(7);
  if (token !== config.apiToken) {
    return reply.status(401).send({ ok: false, message: "Invalid token" });
  }
}
