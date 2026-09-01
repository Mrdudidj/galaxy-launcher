import Fastify, { type FastifyInstance } from "fastify";
import { healthRoute } from "./routes/health.route.js";
import { newsRoute } from "./routes/news.route.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  void app.register(healthRoute);
  void app.register(newsRoute);

  return app;
}
