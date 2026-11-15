/**
 * The DevTrace event contract (schema_version 1).
 *
 * This shape is shared by every DevTrace SDK (Express today, Laravel/.NET later)
 * and is what the Laravel ingestion endpoint validates. Keep field names
 * snake_case and bump `schema_version` on any breaking change.
 *
 * Fields marked "reserved" are part of the contract but not populated yet;
 * they will be filled once header/body capture and redaction are implemented.
 */

export type SchemaVersion = 1;

/**
 * - completed: the response was fully written to the client.
 * - aborted:   the connection closed before the response finished
 *              (client disconnected, socket timeout, ...).
 * - error:     an error reached Express error handling (captured by
 *              `devTraceErrorHandler()`), whatever the response ended up being.
 */
export type RequestOutcome = "completed" | "aborted" | "error";

export interface MonitoringEvent {
    schema_version: SchemaVersion;

    /** Unique id of this event (deduplication on ingestion). */
    event_id: string;
    /** Correlation id: taken from the incoming `x-request-id` header when valid, otherwise generated. */
    request_id: string;
    /** ISO-8601 time the request started. */
    timestamp: string;

    sdk: {
        name: string;
        version: string;
        language: "node";
    };

    service: {
        name: string | null;
        environment: string;
    };

    host: {
        hostname: string;
        pid: number;
        runtime_version: string;
    };

    request: {
        method: string;
        /** Full path without the query string, e.g. `/api/users/42`. */
        path: string;
        /** Matched route template, e.g. `/api/users/:id`. `null` when no route matched (404s, static files). */
        route: string | null;
        user_agent: string | null;
        /** From the `content-length` header; `null` when absent. */
        size_bytes: number | null;
        /** Reserved: redacted query parameters. */
        query?: Record<string, string>;
        /** Reserved: redacted request headers (opt-in). */
        headers?: Record<string, string>;
        /** Reserved: client IP (opt-in, PII). */
        ip?: string | null;
        /** Reserved: truncated request body (opt-in). */
        body?: unknown;
    };

    response: {
        /** `null` when the connection closed before any headers were sent. */
        status_code: number | null;
        duration_ms: number;
        /** From the `content-length` response header; `null` when absent (e.g. chunked). */
        size_bytes: number | null;
        /** Reserved: redacted response headers (opt-in). */
        headers?: Record<string, string>;
    };

    outcome: RequestOutcome;

    error: {
        name: string;
        message: string;
        stack?: string;
    } | null;
}
