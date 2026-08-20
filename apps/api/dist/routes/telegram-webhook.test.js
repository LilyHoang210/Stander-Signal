import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
const update = {
    update_id: 100,
    message: {
        message_id: 1,
        date: 1_786_685_200,
        chat: { id: 42, type: "private" },
        text: "/start"
    }
};
describe("Telegram webhook route", () => {
    it("rejects updates without the configured webhook secret", async () => {
        const handleUpdate = vi.fn(() => Promise.resolve());
        const app = await buildApp({
            telegramWebhook: { secret: "a".repeat(32), handleUpdate }
        });
        const response = await app.inject({
            method: "POST",
            url: "/v1/telegram/webhook",
            headers: { "x-telegram-bot-api-secret-token": "wrong-secret" },
            payload: update
        });
        expect(response.statusCode).toBe(401);
        expect(handleUpdate).not.toHaveBeenCalled();
        await app.close();
    });
    it("passes an authenticated update to the bot without returning update data", async () => {
        const handleUpdate = vi.fn(() => Promise.resolve());
        const secret = "a".repeat(32);
        const app = await buildApp({ telegramWebhook: { secret, handleUpdate } });
        const response = await app.inject({
            method: "POST",
            url: "/v1/telegram/webhook",
            headers: { "x-telegram-bot-api-secret-token": secret },
            payload: update
        });
        expect(response.statusCode).toBe(204);
        expect(response.body).toBe("");
        expect(handleUpdate).toHaveBeenCalledWith(update);
        await app.close();
    });
});
//# sourceMappingURL=telegram-webhook.test.js.map