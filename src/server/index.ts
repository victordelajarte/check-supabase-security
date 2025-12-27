import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { registerRoutes } from "./routes.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: "*",
});

await fastify.register(fastifyStatic, {
  root: join(__dirname, "../public"),
  prefix: "/",
});

await registerRoutes(fastify);

const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";

const gracefulShutdown = async () => {
  console.log("\nShutting down gracefully...");
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

try {
  await fastify.listen({ port, host });
  console.log(`\n🚀 Server running at http://localhost:${port}`);
  console.log(
    `📁 Serving static files from: ${join(__dirname, "../public")}\n`,
  );
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
