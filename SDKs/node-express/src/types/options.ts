export interface DevTraceOptions {
    /** API key from the DevTrace dashboard. Required. */
    apiKey: string;
    /** Ingestion URL. Defaults to the DevTrace ingestion endpoint. */
    endpoint?: string;
    /** Name of this service as shown in the dashboard, e.g. "orders-api". */
    serviceName?: string;
    /** Defaults to `process.env.NODE_ENV`, then "development". */
    environment?: string;
}

/** Options after validation and defaults have been applied. */
export interface ResolvedDevTraceOptions {
    apiKey: string;
    endpoint: string;
    serviceName: string | null;
    environment: string;
}
