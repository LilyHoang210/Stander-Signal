import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
const telegramUpdateSchema = z.looseObject({
    update_id: z.number().int().nonnegative()
});
export function telegramWebhookRoutes(app, webhook) {
    app.post("/v1/telegram/webhook", async (request, reply) => {
        const suppliedSecret = request.headers["x-telegram-bot-api-secret-token"];
        if (typeof suppliedSecret !== "string" || !safeSecretEqual(suppliedSecret, webhook.secret)) {
            return reply.unauthorized("Telegram webhook authorization is invalid");
        }
        const update = telegramUpdateSchema.safeParse(request.body);
        if (!update.success) {
            return reply.badRequest("Telegram update is invalid");
        }
        await webhook.handleUpdate(update.data);
        return reply.code(204).send();
    });
    return Promise.resolve();
}
function safeSecretEqual(left, right) {
    const leftBuffer = Buffer.from(left, "utf8");
    const rightBuffer = Buffer.from(right, "utf8");
    return leftBuffer.byteLength === rightBuffer.byteLength && timingSafeEqual(leftBuffer, rightBuffer);
}
//# sourceMappingURL=telegram-webhook.js.map