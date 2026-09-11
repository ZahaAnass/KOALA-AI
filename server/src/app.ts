import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { randomUUID } from "node:crypto";
import { env, isProd } from "./config/env.js";
import { logger } from "./config/logger.js";
import { clerk } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { openapi } from "./docs/openapi.js";
import healthRoutes from "./routes/health.js";
import chatRoutes from "./routes/chats.js";
import shareRoutes from "./routes/share.js";
import uploadRoutes from "./routes/upload.js";
import documentRoutes from "./routes/documents.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import promptRoutes from "./routes/prompts.js";
import toolRoutes from "./routes/tools.js";
import imageRoutes from "./routes/images.js";
import modelRoutes from "./routes/models.js";
import webhookRoutes from "./routes/webhooks.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function createApp(): express.Application {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Request id + structured logging
  app.use((req, _res, next) => {
    req.id = req.header("x-request-id") ?? randomUUID();
    next();
  });
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id ?? randomUUID(),
      autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
    }),
  );

  app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin / server-to-server (no Origin header) and configured client URLs.
        // Unknown origins simply get no CORS headers (the browser blocks the response) instead of a 500.
        cb(null, !origin || env.CLIENT_URL.includes(origin));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Test-User-Id"],
      exposedHeaders: ["X-Request-Id"],
    }),
  );
  app.use((req, res, next) => {
    res.setHeader("X-Request-Id", String(req.id ?? ""));
    next();
  });

  // Webhooks need the raw body and must be mounted before the JSON parser.
  app.use("/api/webhooks", webhookRoutes);

  app.use(express.json({ limit: "2mb" }));

  app.use(
    "/api",
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      keyGenerator: (req) => req.header("authorization")?.slice(-32) ?? req.ip ?? "anonymous",
      message: { error: { code: "RATE_LIMITED", message: "Too many requests, slow down." } },
    }),
  );

  app.use(clerk);

  app.use(healthRoutes);
  app.get("/", (_req, res) => res.json({ name: "KOALA AI API", version: "2.0.0", docs: "/api/docs", health: "/health" }));

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "KOALA AI API docs" }));
  app.get("/api/openapi.json", (_req, res) => res.json(openapi));

  app.use("/api/models", modelRoutes);
  app.use("/api/chats", chatRoutes);
  app.use("/api/share", shareRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/prompts", promptRoutes);
  app.use("/api/tools", toolRoutes);
  app.use("/api/images", imageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export default createApp;
