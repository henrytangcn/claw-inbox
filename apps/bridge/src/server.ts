import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { getCorsOptions } from "./utils/cors.js";
import { healthRoute } from "./routes/health.js";
import { captureRoute } from "./routes/capture.js";
import { pendingRoute } from "./routes/pending.js";

const app = Fastify({ logger: true });

await app.register(cors, getCorsOptions());
await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });

await app.register(healthRoute);
await app.register(captureRoute);
await app.register(pendingRoute);

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`Bridge running at http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
