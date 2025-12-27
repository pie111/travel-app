/**
 * Logger Configuration
 * Centralized Pino logger setup with environment-based configuration
 */

import pino from 'pino';

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Pino logger instance with environment-specific configuration
 */
export const logger = pino({
    level: LOG_LEVEL,

    // Base configuration
    base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost',
    },

    // Timestamp configuration
    timestamp: () => `,"time":"${new Date().toISOString()}"`,

    // Format errors properly
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
        bindings: (bindings) => {
            return {
                pid: bindings.pid,
                hostname: bindings.hostname,
            };
        },
    },

    // Development: Pretty print for readability
    // Production: JSON format for log aggregation
    transport: NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{msg}',
        },
    } : undefined,

    // Redact sensitive information
    redact: {
        paths: [
            'password',
            'token',
            'apiKey',
            'authorization',
            'cookie',
            'secret',
        ],
        censor: '[REDACTED]',
    },
});

/**
 * Create a child logger with additional context
 * @param context - Additional context to include in all logs
 */
export const createLogger = (context: Record<string, any>) => {
    return logger.child(context);
};

/**
 * Log levels available:
 * - trace: Very detailed logs
 * - debug: Debug information
 * - info: General information
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Fatal errors
 */
