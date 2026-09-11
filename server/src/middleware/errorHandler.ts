import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { HttpError } from "../utils/errors.js";
import { isProd } from "../config/env.js";
import { logger } from "../config/logger.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} does not exist` } });
}

 
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong";
  let details: unknown;

  if (err instanceof HttpError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = "BAD_REQUEST";
    message = `Invalid value for ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = err.message;
  } else if (typeof err === "object" && err !== null && "type" in err && (err as { type: string }).type === "entity.too.large") {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request body too large";
  } else if (err instanceof SyntaxError && "body" in err) {
    status = 400;
    code = "BAD_JSON";
    message = "Malformed JSON body";
  }

  if (status >= 500) {
    logger.error({ err, reqId: req.id, url: req.originalUrl }, "Unhandled error");
  } else {
    logger.debug({ code, message, reqId: req.id }, "Request error");
  }

  if (res.headersSent) {
    // Streaming responses: best effort to signal the error, then close.
    res.end();
    return;
  }

  res.status(status).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(!isProd && status >= 500 && err instanceof Error ? { stack: err.stack } : {}),
    },
    requestId: req.id,
  });
}
