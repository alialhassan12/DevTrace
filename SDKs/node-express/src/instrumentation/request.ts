import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { REQUEST_ID_HEADER } from "../config/defaults.js";

export interface RequestContext {
    requestId: string;
    startTime: bigint;
    timestamp: string;
    method: string;
    path: string;
    userAgent: string | null;
    sizeBytes: number | null;
    /** Route template recorded when Express matched it (see trackMatchedRoute). */
    matchedRoute: string | null;
}

const joinRoute = (baseUrl: string, routePath: unknown): string => {
    const template = typeof routePath === "string" ? routePath : String(routePath);
    return `${baseUrl}${template === "/" && baseUrl ? "" : template}` || "/";
};

/**
 * Express assigns `req.route` the moment it matches a route. At that moment
 * `req.baseUrl` holds the full mount prefix (e.g. "/api"); Express resets it
 * later when an error propagates out of a router. Intercepting the assignment
 * lets us record the full template ("/api/users/:id") while it is still correct.
 */
const trackMatchedRoute = (req: Request, context: RequestContext): void => {
    let current: unknown = (req as { route?: unknown }).route;
    Object.defineProperty(req, "route", {
        configurable: true,
        enumerable: true,
        get: () => current,
        set: (value: { path?: unknown } | undefined) => {
            current = value;
            if (value && value.path !== undefined && value.path !== null) {
                context.matchedRoute = joinRoute(req.baseUrl ?? "", value.path);
            }
        },
    });
};

// Only accept ids that look like ids: they end up in our response header and in the dashboard.
const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

const firstHeader = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

export const resolveRequestId = (req: Request): string => {
    const incoming = firstHeader(req.headers[REQUEST_ID_HEADER]);
    return incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
};

export const parseContentLength = (value: unknown): number | null => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

export const captureRequest = (req: Request): RequestContext => {
    // originalUrl is never rewritten by Express routers (req.path / req.url are
    // relative to the mount point), so it is the only reliable full path.
    const path = req.originalUrl.split("?")[0] || "/";

    const context: RequestContext = {
        requestId: resolveRequestId(req),
        startTime: process.hrtime.bigint(),
        timestamp: new Date().toISOString(),
        method: req.method,
        path,
        userAgent: firstHeader(req.headers["user-agent"]) ?? null,
        sizeBytes: parseContentLength(req.headers["content-length"]),
        matchedRoute: null,
    };
    trackMatchedRoute(req, context);
    return context;
};
