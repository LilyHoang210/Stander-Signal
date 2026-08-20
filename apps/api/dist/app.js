import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import helmet from "@fastify/helmet";
import Fastify, {} from "fastify";
import { connectionRoutes } from "./routes/connections.js";
import { healthRoutes } from "./routes/health.js";
import { telegramWebhookRoutes } from "./routes/telegram-webhook.js";
export async function buildApp(options = {}) {
    const app = Fastify({
        logger: {
            redact: [
                "authorization",
                "telegramWebhookSecret",
                "apiToken",
                "token",
                "req.headers.authorization",
                "req.headers.x-telegram-bot-api-secret-token",
                "req.body.apiToken",
                "req.body.token"
            ],
            ...(options.loggerStream === undefined ? {} : { stream: options.loggerStream })
        }
    });
    await app.register(sensible);
    await app.register(helmet);
    if (options.allowedOrigin !== undefined) {
        await app.register(cors, {
            origin: options.allowedOrigin,
            methods: ["GET", "POST", "DELETE", "OPTIONS"]
        });
    }
    await app.register(healthRoutes);
    if (options.context !== undefined) {
        await connectionRoutes(app, options.context);
    }
    if (options.telegramWebhook !== undefined) {
        await telegramWebhookRoutes(app, options.telegramWebhook);
    }
    return app;
}
//# sourceMappingURL=app.js.map