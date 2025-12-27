/**
 * Health Check Plugin
 * Provides liveness and readiness probes for container orchestration
 */

import { Elysia } from 'elysia';

export const healthPlugin = new Elysia({ prefix: '/health' })
    // Liveness probe - checks if the server is running
    .get('/', () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    }))
    // Readiness probe - checks if the server is ready to accept traffic
    .get('/ready', ({ set }) => {
        const isReady = true; // You can add your readiness logic here

        if (!isReady) {
            set.status = 503;
            return {
                status: 'not_ready',
                ready: false,
            };
        }

        return {
            status: 'ready',
            ready: true,
            timestamp: new Date().toISOString(),
        };
    });
