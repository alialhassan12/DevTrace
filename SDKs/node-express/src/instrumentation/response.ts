import type { Request, Response } from "express";
import type { RequestContext } from "./request.js";
import { parseContentLength } from "./request.js";
import type { RequestOutcome } from "../types/monitoring-event.js";

export interface ResponseContext {
    durationMs: number;
    /** null when the connection closed before headers were sent. */
    statusCode: number | null;
    sizeBytes: number | null;
    route: string | null;
    outcome: RequestOutcome;
}

export const captureResponse = (
    req: Request,
    res: Response,
    context: RequestContext,
    hasError: boolean
): ResponseContext => {
    const durationMs = Number(process.hrtime.bigint() - context.startTime) / 1_000_000;

    // `close` fires both after a normal finish and after a dropped connection;
    // writableFinished tells the two apart.
    const outcome: RequestOutcome = hasError
        ? "error"
        : res.writableFinished
            ? "completed"
            : "aborted";

    return {
        durationMs: Number(durationMs.toFixed(2)),
        // Before headers are sent, res.statusCode is still the default 200, which would be a lie.
        statusCode: res.headersSent ? res.statusCode : null,
        sizeBytes: res.headersSent ? parseContentLength(res.getHeader("content-length")) : null,
        // Recorded when Express matched the route; null if nothing matched (404).
        route: context.matchedRoute,
        outcome,
    };
};
