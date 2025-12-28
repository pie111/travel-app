/**
 * Finance App - ElysiaJS Server
 * Production-ready server with graceful shutdown and health checks
 */

import { Elysia } from 'elysia';
import { healthPlugin } from './src/plugins/health';
import { carsPlugin } from './src/plugins/cars';
import { travelPlugin } from './src/plugins/travel';
import { logger } from './src/logger';
import { openapi } from '@elysiajs/openapi';
import { staticPlugin } from '@elysiajs/static';


// ============================================================================
// Environment Configuration
// ============================================================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// Main Application
// ============================================================================

const app = new Elysia()
    // Serve static assets from dist folder (includes assets/ subfolder)
    .use(staticPlugin({
        assets: 'dist',
        prefix: '/',
        alwaysStatic: true,
    }))

    // Serve the React app at root
    .get('/', ({ set }) => {
        set.headers['content-type'] = 'text/html; charset=utf-8';
        return Bun.file('dist/index.html');
    })

    // API info endpoint
    .get('/api', () => ({
        message: 'Finance App API',
        version: '1.0.0',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        docs: '/swagger',
    }))

    // Register plugins
    .use(healthPlugin)
    .use(carsPlugin)
    .use(travelPlugin)
    .use(openapi())

    // Global error handler
    .onError(({ code, error, set }) => {
        // Helper to safely extract error message
        const getErrorMessage = (err: unknown): string => {
            if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
                return err.message;
            }
            return String(err);
        };

        const errorMessage = getErrorMessage(error);
        const errorStack = error && typeof error === 'object' && 'stack' in error ? error.stack : undefined;

        logger.error({
            code,
            message: errorMessage,
            stack: NODE_ENV === 'development' ? errorStack : undefined,
        }, 'Request error');

        if (code === 'VALIDATION') {
            set.status = 400;
            return {
                error: 'Validation Error',
                message: errorMessage,
            };
        }

        if (code === 'NOT_FOUND') {
            set.status = 404;
            return {
                error: 'Not Found',
                message: 'The requested resource was not found',
            };
        }

        set.status = 500;
        return {
            error: 'Internal Server Error',
            message: NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred',
        };
    })

    // Request logging
    .onRequest(({ request }) => {
        logger.info({
            method: request.method,
            url: request.url,
            userAgent: request.headers.get('user-agent'),
        }, 'Incoming request');
    })

    // Response logging
    .onAfterHandle(({ request, set }) => {
        logger.info({
            method: request.method,
            url: request.url,
            status: set.status,
        }, 'Request completed');
    });

// ============================================================================
// Server Startup
// ============================================================================

try {
    app.listen(Number(PORT));

    logger.info({
        url: `http://${app.server?.hostname}:${app.server?.port}`,
        port: PORT,
        environment: NODE_ENV,
    }, 'Server started successfully');
} catch (error) {
    logger.fatal({
        error: error instanceof Error ? error.message : String(error),
        port: PORT,
    }, 'Failed to start server');
    process.exit(1);
}


// ============================================================================
// Graceful Shutdown
// ============================================================================

const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    try {
        // Stop accepting new connections
        app.stop();

        logger.info('Server stopped gracefully');

        process.exit(0);
    } catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : String(error),
        }, 'Error during shutdown');

        process.exit(1);
    }
};

// Signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Error handlers
process.on('uncaughtException', (error: Error) => {
    logger.fatal({
        error: error.message,
        stack: error.stack,
    }, 'Uncaught exception');
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any) => {
    logger.fatal({
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
    }, 'Unhandled promise rejection');
    shutdown('unhandledRejection');
});