import type { FastifyCorsOptions } from "@fastify/cors";
import { config } from "../config.js";

export function getCorsOptions(): FastifyCorsOptions {
  const origins = config.allowedOrigins;
  if (origins === "*") {
    return { origin: true };
  }
  return {
    origin: origins.split(",").map((o) => o.trim()),
  };
}
