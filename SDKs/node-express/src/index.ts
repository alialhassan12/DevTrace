import { createDevTraceMiddleware } from "./middleware/devtrace.middleware.js";
import type { DevTraceOptions, ResolvedDevTraceOptions } from "./types/options.js";
import { DEFAULT_ENDPOINT, SDK_VERSION } from "./config/defaults.js";

export { SDK_VERSION };
export { devTraceErrorHandler } from "./instrumentation/error.js";

const resolveOptions = (options: DevTraceOptions): ResolvedDevTraceOptions => {
    if (!options || typeof options.apiKey !== "string" || options.apiKey.trim() === "") {
        throw new Error("[DevTrace] apiKey is required");
    }

    const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    try {
        new URL(endpoint);
    } catch {
        throw new Error(`[DevTrace] endpoint is not a valid URL: ${endpoint}`);
    }

    return {
        apiKey: options.apiKey,
        endpoint,
        serviceName: options.serviceName ?? null,
        environment: options.environment ?? process.env.NODE_ENV ?? "development",
    };
};

export const devTrace = (options: DevTraceOptions) =>
    createDevTraceMiddleware(resolveOptions(options));

export type { DevTraceOptions };
export type { MonitoringEvent, RequestOutcome } from "./types/monitoring-event.js";
