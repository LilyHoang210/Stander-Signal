import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyTelegramInitData } from "./telegram-init-data.js";
const botToken = "123456789:telegram-test-token";
function signedInitData(options) {
    const values = new URLSearchParams({
        auth_date: String(Math.floor(options.authDate.getTime() / 1_000)),
        query_id: "AAEAAAE",
        signature: "fixture-signature",
        ...(options.user === undefined
            ? {}
            : { user: JSON.stringify({ first_name: "Test", ...options.user }) }),
        ...(options.chatType === undefined ? {} : { chat_type: options.chatType })
    });
    const checkString = [...values.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
    const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
    const hash = createHmac("sha256", secret).update(checkString).digest("hex");
    values.set("hash", hash);
    return values.toString();
}
describe("verifyTelegramInitData", () => {
    it("returns only the verified Telegram identity", () => {
        const authDate = new Date("2026-08-14T12:05:00Z");
        const raw = signedInitData({ authDate, user: { id: 42, username: "alice" } });
        expect(verifyTelegramInitData(raw, botToken, new Date("2026-08-14T12:09:59Z"))).toEqual({
            telegramUserId: "42",
            username: "alice",
            authDate
        });
    });
    it("rejects initData older than five minutes", () => {
        const raw = signedInitData({
            authDate: new Date("2026-08-14T12:05:00Z"),
            user: { id: 42 }
        });
        expect(() => verifyTelegramInitData(raw, botToken, new Date("2026-08-14T12:10:01Z"))).toThrow(/expired/i);
    });
    it("rejects an auth date more than 30 seconds in the future", () => {
        const raw = signedInitData({
            authDate: new Date("2026-08-14T12:00:31Z"),
            user: { id: 42 }
        });
        expect(() => verifyTelegramInitData(raw, botToken, new Date("2026-08-14T12:00:00Z"))).toThrow(/auth date/i);
    });
    it("rejects tampering after signing", () => {
        const raw = signedInitData({
            authDate: new Date("2026-08-14T12:05:00Z"),
            user: { id: 42 }
        }).replace("%22id%22%3A42", "%22id%22%3A43");
        expect(() => verifyTelegramInitData(raw, botToken, new Date("2026-08-14T12:09:00Z"))).toThrow(/signature|valid/i);
    });
    it("requires a Telegram user and private-chat context", () => {
        const authDate = new Date("2026-08-14T12:05:00Z");
        const withoutUser = signedInitData({ authDate });
        const groupChat = signedInitData({ authDate, user: { id: 42 }, chatType: "group" });
        expect(() => verifyTelegramInitData(withoutUser, botToken, new Date("2026-08-14T12:09:00Z"))).toThrow(/user/i);
        expect(() => verifyTelegramInitData(groupChat, botToken, new Date("2026-08-14T12:09:00Z"))).toThrow(/private/i);
    });
});
//# sourceMappingURL=telegram-init-data.test.js.map