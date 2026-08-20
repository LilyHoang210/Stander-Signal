import { describe, expect, it, vi } from "vitest";
import { TelegramConnectionNotifier, buildConnectionActivatedMessage } from "./telegram-connection-notifier.js";
describe("buildConnectionActivatedMessage", () => {
    it("tells the user the Mini App connection is active without exposing secrets", () => {
        expect(buildConnectionActivatedMessage("bsc_0x12...cdef")).toContain("StandX connected");
        expect(buildConnectionActivatedMessage("bsc_0x12...cdef")).toContain("bsc_0x12...cdef");
        expect(buildConnectionActivatedMessage("bsc_0x12...cdef")).toContain("/status");
    });
});
describe("TelegramConnectionNotifier", () => {
    it("sends a private Telegram message after connection activation", async () => {
        const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
        const notifier = new TelegramConnectionNotifier("123456:token", fetchMock);
        await notifier.connectionActivated({
            connectionId: "connection-1",
            telegramUserId: "42",
            accountLabel: "bsc_0x12...cdef"
        });
        expect(fetchMock).toHaveBeenCalledWith("https://api.telegram.org/bot123456:token/sendMessage", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                chat_id: "42",
                text: buildConnectionActivatedMessage("bsc_0x12...cdef")
            })
        });
    });
    it("fails with a sanitized error when Telegram rejects the delivery", async () => {
        const fetchMock = vi.fn(() => Promise.resolve(new Response("token leaked body", { status: 429 })));
        const notifier = new TelegramConnectionNotifier("123456:token", fetchMock);
        await expect(notifier.connectionActivated({
            connectionId: "connection-1",
            telegramUserId: "42",
            accountLabel: "alice"
        })).rejects.toThrow("Telegram notification delivery failed with status 429");
    });
});
//# sourceMappingURL=telegram-connection-notifier.test.js.map