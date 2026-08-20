import { describe, expect, it } from "vitest";
import { InMemoryNotificationQueue, NotificationDeliveryWorker } from "./notification-worker.js";
const job = (overrides = {}) => ({
    id: "job-critical",
    name: "critical",
    chatId: 42,
    text: "CRITICAL alert",
    priority: 1,
    createdAt: new Date("2026-08-14T08:00:00.000Z"),
    ...overrides
});
describe("notification worker queue", () => {
    it("sends critical jobs before warning digests", async () => {
        const queue = new InMemoryNotificationQueue();
        await queue.enqueue(job({ id: "warning", name: "warning", priority: 20 }), { priority: 20 });
        await queue.enqueue(job({ id: "critical", name: "critical", priority: 1 }), { priority: 1 });
        expect(await queue.nextQueuedName()).toBe("critical");
    });
});
describe("NotificationDeliveryWorker", () => {
    it("enforces one message per chat per second and global limit", async () => {
        const submissions = [];
        const worker = new NotificationDeliveryWorker({
            send: sent => {
                submissions.push(sent);
                return Promise.resolve({ ok: true, status: 200 });
            },
            perChatIntervalMs: 1000,
            globalPerSecondLimit: 1
        });
        const now = new Date("2026-08-14T08:00:00.000Z");
        expect(await worker.deliver(job({ id: "first" }), now)).toMatchObject({ status: "sent" });
        expect(await worker.deliver(job({ id: "same-chat-too-fast" }), now)).toMatchObject({
            status: "rate_limited",
            retryAfterMs: 1000
        });
        expect(await worker.deliver(job({ id: "global-too-fast", chatId: 99 }), now)).toMatchObject({
            status: "rate_limited",
            retryAfterMs: 1000
        });
        expect(submissions).toHaveLength(1);
    });
    it("honors Telegram retry_after without storing full response bodies", async () => {
        const worker = new NotificationDeliveryWorker({
            send: () => Promise.resolve({ ok: false, status: 429, retryAfterSeconds: 3, body: "large telegram body" })
        });
        const result = await worker.deliver(job(), new Date("2026-08-14T08:00:00.000Z"));
        expect(result).toEqual({
            jobId: "job-critical",
            chatId: 42,
            status: "retry_after",
            telegramStatus: 429,
            retryAfterMs: 3000,
            submittedAt: "2026-08-14T08:00:00.000Z"
        });
        expect(JSON.stringify(result)).not.toContain("large telegram body");
    });
});
//# sourceMappingURL=notification-worker.test.js.map