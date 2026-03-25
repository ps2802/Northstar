import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../apps/api/dist/app.js";

const appPromise = buildApp();

export default async function handler(req: IncomingMessage & { url?: string }, res: ServerResponse) {
  const app = await appPromise;
  const originalUrl = req.url ?? "/";
  req.url = originalUrl.startsWith("/api") ? originalUrl.slice(4) || "/" : originalUrl;
  app.server.emit("request", req, res);
}
