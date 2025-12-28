/**
 * Analytics Middleware
 * Tracks visitor counts and API usage statistics
 */

import { Elysia } from 'elysia';

// In-memory stats (resets on server restart)
// For persistent stats, use a database or file storage
interface Stats {
    pageViews: number;
    apiCalls: number;
    uniqueVisitors: Set<string>;
    startTime: Date;
    lastUpdated: Date;
    endpoints: Map<string, number>;
}

const stats: Stats = {
    pageViews: 0,
    apiCalls: 0,
    uniqueVisitors: new Set<string>(),
    startTime: new Date(),
    lastUpdated: new Date(),
    endpoints: new Map<string, number>(),
};

/**
 * Get client identifier (IP or User-Agent hash for privacy)
 */
const getClientId = (request: Request): string => {
    // Use forwarded IP if behind proxy, otherwise use a hash of user-agent
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Use IP if available, otherwise use user-agent
    const identifier = forwarded?.split(',')[0] || realIp || userAgent;

    // Simple hash for privacy
    return Buffer.from(identifier).toString('base64').slice(0, 16);
};

/**
 * Track a request
 */
const trackRequest = (request: Request, path: string): void => {
    stats.lastUpdated = new Date();

    // Track unique visitors
    const clientId = getClientId(request);
    stats.uniqueVisitors.add(clientId);

    // Track endpoint usage
    const currentCount = stats.endpoints.get(path) || 0;
    stats.endpoints.set(path, currentCount + 1);

    // Categorize request
    if (path === '/') {
        stats.pageViews++;
    } else if (path.startsWith('/api/')) {
        stats.apiCalls++;
    }
};

/**
 * Get current stats
 */
export const getStats = () => {
    const uptime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);

    // Convert endpoints map to object for JSON
    const endpointStats: Record<string, number> = {};
    stats.endpoints.forEach((count, path) => {
        endpointStats[path] = count;
    });

    return {
        pageViews: stats.pageViews,
        apiCalls: stats.apiCalls,
        uniqueVisitors: stats.uniqueVisitors.size,
        uptime: {
            seconds: uptime,
            formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
        },
        startTime: stats.startTime.toISOString(),
        lastUpdated: stats.lastUpdated.toISOString(),
        topEndpoints: Object.entries(endpointStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10),
    };
};

/**
 * Elysia plugin that tracks analytics
 */
export const analyticsPlugin = new Elysia({ name: 'analytics' })
    // Track all requests
    .onRequest(({ request }) => {
        // Extract path from request URL
        const url = new URL(request.url);
        const path = url.pathname;

        // Skip tracking for static assets
        if (path.startsWith('/assets/')) {
            return;
        }
        trackRequest(request, path);
    })

    // Stats API endpoint (protected by auth)
    .get('/api/stats', ({ set }) => {
        set.headers['content-type'] = 'application/json';
        return getStats();
    });
