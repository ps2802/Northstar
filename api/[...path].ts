import type { IncomingMessage, ServerResponse } from "node:http";
import type { FastifyInstance } from "fastify";

let appPromise: Promise<FastifyInstance> | undefined;

async function getApp() {
  if (!appPromise) {
    appPromise = import("../apps/api/dist/app.js").then(({ buildApp }) => buildApp());
  }

  return appPromise;
}

export default async function handler(req: IncomingMessage & { url?: string }, res: ServerResponse) {
  const app = await getApp();
  const originalUrl = req.url ?? "/";
  req.url = originalUrl.startsWith("/api") ? originalUrl.slice(4) || "/" : originalUrl;
  app.server.emit("request", req, res);
}
