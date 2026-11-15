import type { ErrorRequestHandler, Request } from "express";
import type { MonitoringEvent } from "../types/monitoring-event.js";

const DEVTRACE_ERROR = Symbol.for("devtrace.error");
const MAX_STACK_LENGTH = 4000;

type RequestWithError = Request & { [DEVTRACE_ERROR]?: unknown };

/**
 * Register AFTER your routes. It records the error for the DevTrace event and
 * passes it on unchanged, so your own error handlers still run.
 */
export const devTraceErrorHandler = (): ErrorRequestHandler => (err, req, _res, next) => {
    (req as RequestWithError)[DEVTRACE_ERROR] = err;
    next(err);
};

export const hasCapturedError = (req: Request): boolean =>
    DEVTRACE_ERROR in (req as RequestWithError);

export const serializeCapturedError = (req: Request): MonitoringEvent["error"] => {
    if (!hasCapturedError(req)) return null;
    const err = (req as RequestWithError)[DEVTRACE_ERROR];

    if (err instanceof Error) {
        return {
            name: err.name,
            message: err.message,
            stack: err.stack?.slice(0, MAX_STACK_LENGTH),
        };
    }
    // Non-Error values can be thrown too (strings, objects, ...).
    return { name: "NonError", message: String(err) };
};
