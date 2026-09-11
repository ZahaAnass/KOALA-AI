export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, code = "ERROR", details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, "BAD_REQUEST", details);
export const unauthorized = (message = "Unauthenticated") => new HttpError(401, message, "UNAUTHORIZED");
export const forbidden = (message = "Forbidden") => new HttpError(403, message, "FORBIDDEN");
export const notFound = (message = "Not found") => new HttpError(404, message, "NOT_FOUND");
export const tooMany = (message = "Too many requests") => new HttpError(429, message, "RATE_LIMITED");
export const serviceUnavailable = (message = "Service unavailable") =>
  new HttpError(503, message, "SERVICE_UNAVAILABLE");
