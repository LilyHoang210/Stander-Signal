import type { FastifyInstance } from "fastify";
export interface TelegramWebhookHandler {
    readonly secret: string;
    handleUpdate(update: unknown): Promise<void>;
}
export declare function telegramWebhookRoutes(app: FastifyInstance, webhook: TelegramWebhookHandler): Promise<void>;
