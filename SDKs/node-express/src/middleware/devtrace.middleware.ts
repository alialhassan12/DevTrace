import type { RequestHandler } from "express";
import type { ResolvedDevTraceOptions } from "../types/options.js";
import type { MonitoringEvent } from "../types/monitoring-event.js";
import { captureRequest } from "../instrumentation/request.js";
import { captureResponse } from "../instrumentation/response.js";
import { hasCapturedError } from "../instrumentation/error.js";
import { buildEvent } from "../event/build-event.js";
import { REQUEST_ID_HEADER } from "../config/defaults.js";

export type EventReporter = (event: MonitoringEvent) => void;

// Placeholder until the batching HTTP transport exists.
const logReporter: EventReporter = (event) => {
    console.log("[DevTrace] event", JSON.stringify(event));
};

export function createDevTraceMiddleware(
    options: ResolvedDevTraceOptions,
    report: EventReporter = logReporter
): RequestHandler {
    return (req, res, next) => {
        try {
            const context = captureRequest(req);
            res.setHeader(REQUEST_ID_HEADER, context.requestId);

            // Node >= 18 always emits `close` on the response: after a normal
            // finish AND after a dropped connection. `finish` only covers the first.
            res.once("close", () => {
                try {
                    const responseContext = captureResponse(req, res, context, hasCapturedError(req));
                    report(buildEvent(req, options, context, responseContext));
                } catch (err) {
                    // An SDK bug must never crash or affect the host application.
                    console.warn("[DevTrace] failed to record request:", err);
                }
            });
        } catch (err) {
            console.warn("[DevTrace] failed to instrument request:", err);
        }

        next();
    };
}
