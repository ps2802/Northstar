import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes/index.js";

export const buildApp = async () => {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await registerRoutes(app);
  await app.ready();
  return app;
};
