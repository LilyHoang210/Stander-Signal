import { describe, expect, it } from "vitest";
import { formatTelegramUtcTimestamp } from "./time-format.js";
describe("formatTelegramUtcTimestamp", () => {
    it("formats absolute Telegram timestamps in compact UTC form", () => {
        expect(formatTelegramUtcTimestamp(new Date("2026-08-13T17:17:59.999Z"))).toBe("🕘 Aug 13 · 2026, 17:17 UTC");
    });
    it("uses UTC fields instead of local timezone fields", () => {
        expect(formatTelegramUtcTimestamp(new Date("2026-01-01T00:05:00.000Z"))).toBe("🕘 Jan 1 · 2026, 00:05 UTC");
    });
});
//# sourceMappingURL=time-format.test.js.map