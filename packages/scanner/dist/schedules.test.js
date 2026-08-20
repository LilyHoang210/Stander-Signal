import { describe, expect, it } from "vitest";
import { canRefresh, nextRateLimitBackoffDelay, nextScanDelay } from "./schedules.js";
describe("scanner schedules", () => {
    it.each([
        ["no-position", 300_000],
        ["active", 60_000],
        ["danger", 15_000],
        ["critical", 5_000]
    ])("maps %s state to %i ms before jitter", (state, expected) => {
        expect(nextScanDelay(state, () => 0.5)).toBe(expected);
    });
    it("applies plus-or-minus ten percent jitter", () => {
        expect(nextScanDelay("active", () => 0)).toBe(54_000);
        expect(nextScanDelay("active", () => 1)).toBe(66_000);
    });
    it("enforces a sixty second refresh cooldown", () => {
        const lastRefreshAt = new Date("2026-08-14T08:00:00.000Z");
        expect(canRefresh(lastRefreshAt, new Date("2026-08-14T08:00:59.999Z"))).toBe(false);
        expect(canRefresh(lastRefreshAt, new Date("2026-08-14T08:01:00.000Z"))).toBe(true);
    });
    it("uses StandX retry-after guidance before local exponential backoff", () => {
        expect(nextRateLimitBackoffDelay({ attempt: 3, retryAfterSeconds: 17, random: () => 0.5 })).toBe(17_000);
    });
    it("caps local rate-limit exponential backoff at five minutes", () => {
        expect(nextRateLimitBackoffDelay({ attempt: 20, retryAfterSeconds: null, random: () => 0.5 })).toBe(300_000);
    });
});
//# sourceMappingURL=schedules.test.js.map