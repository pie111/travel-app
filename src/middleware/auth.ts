/**
 * API Key Authentication Middleware
 * - Requests from the frontend (same origin) are allowed without API key
 * - Direct API calls (curl, Postman, external apps) require X-API-Key header
 */

import { Elysia } from 'elysia';

// Get API key and allowed origins from environment
const API_KEY = process.env.API_KEY;
const ALLOWED_ORIGINS = [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Local production
    'http://localhost:3100',  // Alternative local port
    process.env.FRONTEND_URL, // Production frontend URL
    'https://travel-app-production-8ae9.up.railway.app', // Railway deployment
].filter(Boolean) as string[];

/**
 * Check if request is from an allowed origin (our frontend)
 */
const isFromAllowedOrigin = (request: Request): boolean => {
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');

    // Check Origin header
    if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
        return true;
    }

    // Check Referer header as fallback
    if (referer && ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))) {
        return true;
    }

    return false;
};

/**
 * Validates the X-API-Key header against the configured API key
 */
export const validateApiKey = (request: Request): { valid: boolean; error?: string } => {
    // Skip validation if no API key is configured (development mode)
    if (!API_KEY) {
        console.warn('⚠️ API_KEY not configured - authentication disabled');
        return { valid: true };
    }

    // Allow requests from our frontend without API key
    if (isFromAllowedOrigin(request)) {
        return { valid: true };
    }

    // For external requests, require API key
    const providedKey = request.headers.get('X-API-Key');

    if (!providedKey) {
        return { valid: false, error: 'Missing X-API-Key header. Direct API access requires authentication.' };
    }

    if (providedKey !== API_KEY) {
        return { valid: false, error: 'Invalid API key' };
    }

    return { valid: true };
};

/**
 * Elysia plugin that adds API key authentication to protected routes
 * Usage: .use(authPlugin) on routes that need protection
 */
export const authPlugin = new Elysia({ name: 'auth' })
    .derive(({ request }) => {
        const auth = validateApiKey(request);
        return { auth };
    })
    .onBeforeHandle(({ auth, set, path }) => {
        // Skip auth for non-API routes
        if (!path.startsWith('/api/')) {
            return;
        }

        // Skip auth for public endpoints
        const publicPaths = ['/api', '/api/health', '/api/currencies'];
        if (publicPaths.includes(path)) {
            return;
        }

        // Check authentication
        if (!auth.valid) {
            set.status = 401;
            return {
                error: 'Unauthorized',
                message: auth.error || 'Authentication required',
            };
        }
    });

