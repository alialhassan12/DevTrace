import { randomUUID } from "node:crypto";
import os from "node:os";
import type { Request } from "express";
import { SCHEMA_VERSION, SDK_NAME, SDK_VERSION } from "../config/defaults.js";
import type { RequestContext } from "../instrumentation/request.js";
import type { ResponseContext } from "../instrumentation/response.js";
import { serializeCapturedError } from "../instrumentation/error.js";
import type { MonitoringEvent } from "../types/monitoring-event.js";
import type { ResolvedDevTraceOptions } from "../types/options.js";

// These never change while the process runs, so compute them once.
const HOST: MonitoringEvent["host"] = {
    hostname: os.hostname(),
    pid: process.pid,
    runtime_version: process.version,
};

export const buildEvent = (
    req: Request,
    options: ResolvedDevTraceOptions,
    requestContext: RequestContext,
    responseContext: ResponseContext
): MonitoringEvent => ({
    schema_version: SCHEMA_VERSION,
    event_id: randomUUID(),
    request_id: requestContext.requestId,
    timestamp: requestContext.timestamp,
    sdk: {
        name: SDK_NAME,
        version: SDK_VERSION,
        language: "node",
    },
    service: {
        name: options.serviceName,
        environment: options.environment,
    },
    host: HOST,
    request: {
        method: requestContext.method,
        path: requestContext.path,
        route: responseContext.route,
        user_agent: requestContext.userAgent,
        size_bytes: requestContext.sizeBytes,
    },
    response: {
        status_code: responseContext.statusCode,
        duration_ms: responseContext.durationMs,
        size_bytes: responseContext.sizeBytes,
    },
    outcome: responseContext.outcome,
    error: serializeCapturedError(req),
});
