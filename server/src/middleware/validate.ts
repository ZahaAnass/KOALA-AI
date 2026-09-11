import type { NextFunction, Request, Response } from "express";
import { z, type ZodTypeAny } from "zod";
import mongoose from "mongoose";
import { badRequest } from "../utils/errors.js";

type Schemas = { body?: ZodTypeAny; params?: ZodTypeAny; query?: ZodTypeAny };

/** Validates and coerces `req.body`, `req.params` and `req.query` with zod schemas. */
export const validate =
  (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          path: [key, ...i.path].join("."),
          message: i.message,
        }));
        return next(badRequest("Validation failed", details));
      }
      // Express 4 allows assignment on these properties.
      (req as unknown as Record<string, unknown>)[key] = result.data;
    }
    next();
  };

export const objectId = z
  .string()
  .refine((v) => mongoose.Types.ObjectId.isValid(v), { message: "Invalid id" });

export const idParam = z.object({ id: objectId });
