import { type FastifyInstance } from "fastify";
import type { DestinationStream } from "pino";
import type { AppContext } from "./context.js";
import { type TelegramWebhookHandler } from "./routes/telegram-webhook.js";
export interface BuildAppOptions {
    readonly context?: AppContext;
    readonly telegramWebhook?: TelegramWebhookHandler;
    readonly allowedOrigin?: string;
    readonly loggerStream?: DestinationStream;
}
export declare function buildApp(options?: BuildAppOptions): Promise<FastifyInstance>;
