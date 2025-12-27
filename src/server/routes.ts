import type { FastifyInstance } from "fastify";
import type { CheckRequest } from "./types.js";
import { UrlWrapper } from "../utils.js";
import { checkSupabaseSecurity } from "../core/checker.js";

let isChecking = false;

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CheckRequest }>("/api/check", async (request, reply) => {
    if (isChecking) {
      reply.code(429).send({ error: "Another check is already in progress. Please wait." });
      return;
    }

    const { url } = request.body;

    if (!url) {
      reply.code(400).send({ error: "URL is required" });
      return;
    }

    let urlWrapper: UrlWrapper;
    try {
      urlWrapper = new UrlWrapper(url);
    } catch (error) {
      reply.code(400).send({ error: "Invalid URL format" });
      return;
    }

    isChecking = true;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const sendEvent = (type: string, data: Record<string, unknown>) => {
      reply.raw.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    const cleanup = () => {
      isChecking = false;
    };

    request.raw.on("close", cleanup);

    try {
      const result = await checkSupabaseSecurity(urlWrapper, (message) => {
        sendEvent("status", { message });
      });

      sendEvent("result", { data: result });
      reply.raw.end();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      sendEvent("error", { message: errorMessage });
      reply.raw.end();
    } finally {
      cleanup();
    }
  });
}
