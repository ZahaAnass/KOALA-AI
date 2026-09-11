import pino from "pino";
import { env, isProd, isTest } from "./env.js";

export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }),
  redact: ["req.headers.authorization", "req.headers.cookie"],
});
