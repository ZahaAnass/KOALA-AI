import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { listModels } from "./services/providers/index.js";

async function main(): Promise<void> {
  try {
    await connectDB(env.MONGO_URI);
  } catch (err) {
    logger.fatal({ err }, "Could not connect to MongoDB");
    process.exit(1);
  }

  const models = listModels();
  if (models.length === 0) {
    logger.warn("No AI provider configured (GEMINI_API_KEY / OPENAI_API_KEY). Chat generation will fail.");
  } else {
    logger.info({ models: models.map((m) => m.id) }, "AI models available");
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`KOALA AI API listening on http://localhost:${env.PORT} (docs at /api/docs)`);
  });
  // Streaming responses can be long-lived.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => logger.error({ reason }, "Unhandled promise rejection"));
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });
}

void main();
