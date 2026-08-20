import { describe, expect, it } from "vitest";
import { InMemoryMarketSnapshotStore } from "./market-snapshot-store.js";
const decimal = (value) => value;
const price = (overrides = {}) => ({
    symbol: "BTC-USD",
    markPrice: decimal("100"),
    indexPrice: decimal("101"),
    sequence: 1n,
    sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
    ingestedAt: new Date("2026-08-14T08:00:01.000Z"),
    sourceTier: "A",
    ...overrides
});
const depth = (overrides = {}) => ({
    symbol: "BTC-USD",
    bids: [{ price: decimal("99"), quantity: decimal("2") }],
    asks: [{ price: decimal("101"), quantity: decimal("3") }],
    sequence: 1n,
    sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
    ingestedAt: new Date("2026-08-14T08:00:01.000Z"),
    sourceTier: "A",
    ...overrides
});
describe("InMemoryMarketSnapshotStore", () => {
    it("keeps the highest sequence price snapshot per symbol", async () => {
        const store = new InMemoryMarketSnapshotStore();
        await store.put(price({ sequence: 10n, markPrice: decimal("110") }));
        await store.put(price({ sequence: 9n, markPrice: decimal("90") }));
        await expect(store.getPrice("BTC-USD")).resolves.toMatchObject({
            markPrice: "110",
            sequence: 10n
        });
    });
    it("keeps the highest sequence depth snapshot per symbol", async () => {
        const store = new InMemoryMarketSnapshotStore();
        await store.put(depth({ sequence: 3n, bids: [{ price: decimal("99"), quantity: decimal("1") }] }));
        await store.put(depth({ sequence: 2n, bids: [{ price: decimal("88"), quantity: decimal("1") }] }));
        await expect(store.getDepth("BTC-USD")).resolves.toMatchObject({
            bids: [{ price: "99", quantity: "1" }],
            sequence: 3n
        });
    });
    it("returns a complete bundle only when price and depth are both present", async () => {
        const store = new InMemoryMarketSnapshotStore();
        await store.put(price());
        await expect(store.getBundle("BTC-USD")).resolves.toBeNull();
        await store.put(depth());
        await expect(store.getBundle("BTC-USD")).resolves.toMatchObject({
            price: { markPrice: "100" },
            depth: { asks: [{ price: "101", quantity: "3" }] }
        });
    });
    it("reports missing, fresh, and stale snapshot freshness", async () => {
        const store = new InMemoryMarketSnapshotStore({ staleAfterMs: 15_000 });
        const now = new Date("2026-08-14T08:00:20.000Z");
        await expect(store.freshness("BTC-USD", now)).resolves.toBe("missing");
        await store.put(price({ ingestedAt: new Date("2026-08-14T08:00:10.000Z") }));
        await expect(store.freshness("BTC-USD", now)).resolves.toBe("fresh");
        await store.put(price({ sequence: 2n, ingestedAt: new Date("2026-08-14T08:00:04.999Z") }));
        await expect(store.freshness("BTC-USD", now)).resolves.toBe("stale");
    });
});
//# sourceMappingURL=market-snapshot-store.test.js.map