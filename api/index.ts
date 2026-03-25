import type { IncomingMessage, ServerResponse } from "node:http";
import type { FastifyInstance } from "fastify";

let appPromise: Promise<FastifyInstance> | undefined;

async function getApp() {
  if (!appPromise) {
    appPromise = import("../apps/api/dist/app.js").then(({ buildApp }) => buildApp());
  }

  return appPromise;
}

function normalizeRequestUrl(urlString: string) {
  const url = new URL(urlString, "https://northstar.local");
  const rewrittenPath = url.searchParams.get("path");

  if (rewrittenPath) {
    url.searchParams.delete("path");
    url.pathname = `/${rewrittenPath}`;
  } else if (url.pathname.startsWith("/api")) {
    url.pathname = url.pathname.slice(4) || "/";
  }

  return `${url.pathname}${url.search}`;
}

export default async function handler(req: IncomingMessage & { url?: string }, res: ServerResponse) {
  const app = await getApp();
  req.url = normalizeRequestUrl(req.url ?? "/api");
  app.server.emit("request", req, res);
}
