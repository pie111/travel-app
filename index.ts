// ============================================================================
// Production-Ready Server Configuration
// ============================================================================

import { router, type RouterContext } from './src/routes';

// Environment Configuration
const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10); // 30 seconds
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// Logging Utilities
// ============================================================================

enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        env: NODE_ENV,
        ...meta,
    };
    console.log(JSON.stringify(logEntry));
}

// ============================================================================
// Server State Management
// ============================================================================

let isShuttingDown = false;
let activeConnections = 0;
let server: ReturnType<typeof Bun.serve> | null = null;

// ============================================================================
// Health Check State
// ============================================================================

let isReady = false;

// ============================================================================
// Request Handler
// ============================================================================

async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Log incoming request
    log(LogLevel.INFO, 'Incoming request', {
        method,
        path,
        userAgent: req.headers.get('user-agent'),
    });

    try {
        // Delegate to the router
        const context: RouterContext = {
            isShuttingDown,
            isReady,
        };

        return router(req, context);
    } catch (error) {
        // Request-level error handling
        log(LogLevel.ERROR, 'Request handler error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            path,
            method,
        });

        return new Response(
            JSON.stringify({
                error: 'Internal Server Error',
                message: NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

// ============================================================================
// Graceful Shutdown Handler
// ============================================================================

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) {
        log(LogLevel.WARN, 'Shutdown already in progress, ignoring signal', { signal });
        return;
    }

    isShuttingDown = true;
    isReady = false;

    log(LogLevel.INFO, 'Received shutdown signal, starting graceful shutdown', {
        signal,
        activeConnections,
    });

    // Stop accepting new connections
    if (server) {
        try {
            server.stop();
            log(LogLevel.INFO, 'Server stopped accepting new connections');
        } catch (error) {
            log(LogLevel.ERROR, 'Error stopping server', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    // Wait for active connections to complete or timeout
    const shutdownStart = Date.now();
    const checkInterval = 100; // Check every 100ms

    while (activeConnections > 0 && Date.now() - shutdownStart < SHUTDOWN_TIMEOUT) {
        log(LogLevel.INFO, 'Waiting for active connections to complete', {
            activeConnections,
            elapsed: Date.now() - shutdownStart,
        });
        await Bun.sleep(checkInterval);
    }

    if (activeConnections > 0) {
        log(LogLevel.WARN, 'Shutdown timeout reached, forcing shutdown', {
            activeConnections,
            timeout: SHUTDOWN_TIMEOUT,
        });
    } else {
        log(LogLevel.INFO, 'All connections closed gracefully');
    }

    // Perform cleanup (database connections, file handles, etc.)
    await cleanup();

    log(LogLevel.INFO, 'Graceful shutdown complete', {
        signal,
        duration: Date.now() - shutdownStart,
    });

    process.exit(0);
}

// ============================================================================
// Cleanup Handler
// ============================================================================

async function cleanup() {
    log(LogLevel.INFO, 'Running cleanup tasks');

    // Add your cleanup logic here:
    // - Close database connections
    // - Close file handles
    // - Flush logs
    // - Clear caches
    // - etc.

    // Example:
    // await db.close();
    // await cache.flush();

    log(LogLevel.INFO, 'Cleanup tasks completed');
}

// ============================================================================
// Global Error Handlers
// ============================================================================

process.on('uncaughtException', (error: Error) => {
    log(LogLevel.ERROR, 'Uncaught exception', {
        error: error.message,
        stack: error.stack,
    });

    // In production, you might want to restart the process
    // For now, we'll do a graceful shutdown
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    log(LogLevel.ERROR, 'Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
    });

    // In production, you might want to restart the process
    // For now, we'll do a graceful shutdown
    gracefulShutdown('unhandledRejection');
});

// ============================================================================
// Signal Handlers
// ============================================================================

// SIGTERM - Graceful shutdown (sent by Kubernetes, Docker, etc.)
process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM');
});

// SIGINT - Graceful shutdown (Ctrl+C)
process.on('SIGINT', () => {
    gracefulShutdown('SIGINT');
});

// SIGHUP - Graceful shutdown (terminal hangup)
process.on('SIGHUP', () => {
    gracefulShutdown('SIGHUP');
});

// Note: SIGKILL cannot be caught or handled by the application
// It immediately terminates the process without cleanup

// ============================================================================
// Server Initialization
// ============================================================================

try {
    server = Bun.serve({
        port: PORT,
        async fetch(req) {
            activeConnections++;
            try {
                const response = await handleRequest(req);
                return response;
            } finally {
                activeConnections--;
            }
        },
        error(error) {
            log(LogLevel.ERROR, 'Server error', {
                error: error.message,
                stack: error.stack,
            });

            return new Response(
                JSON.stringify({
                    error: 'Internal Server Error',
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        },
    });

    // Set process title for easier identification
    process.title = `bun-server-${PORT}`;

    // Mark server as ready
    isReady = true;

    log(LogLevel.INFO, 'Server started successfully', {
        url: server.url.toString(),
        port: PORT,
        environment: NODE_ENV,
        pid: process.pid,
        nodeVersion: process.version,
    });

    log(LogLevel.INFO, 'Health endpoints available', {
        health: `${server.url}health`,
        ready: `${server.url}ready`,
    });
} catch (error) {
    log(LogLevel.ERROR, 'Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
}