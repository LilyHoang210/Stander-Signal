import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizePerpsSnapshot, normalizePosition } from "./perps-normalizer.js";
const observedAt = new Date("2026-08-14T12:00:00Z");
const ingestedAt = new Date("2026-08-14T12:00:01Z");
describe("normalizePerpsSnapshot", () => {
    it("preserves monetary values as decimal strings", async () => {
        const result = normalizePerpsSnapshot({
            accountId: "bsc_0x1234567890abcdef",
            balance: await readFixture("query-balance.json"),
            positions: await readFixture("query-positions.json"),
            openOrders: await readFixture("query-open-orders.json"),
            observedAt,
            ingestedAt
        });
        expect(result.positions[0]).toMatchObject({
            quantity: "0.940",
            notional: "114412.14700",
            markPrice: "121715.05",
            liquidationPrice: "112373.50",
            marginMode: "isolated"
        });
        expect(typeof result.positions[0]?.markPrice).toBe("string");
        expect(result.balance.crossAvailable).toBe("1085746.571");
        expect(result.openOrders[0]).toMatchObject({
            positionId: "standx-position-15",
            quantity: "0.060",
            price: "121900.00"
        });
    });
    it("derives direction from signed quantity without losing the original quantity", async () => {
        const [position] = await readFixture("query-positions.json");
        if (position === undefined) {
            throw new Error("Fixture must contain one position");
        }
        const normalized = normalizePosition({
            accountId: "bsc_0x1234567890abcdef",
            position: { ...position, qty: "-2.5" },
            observedAt,
            ingestedAt
        });
        expect(normalized.side).toBe("short");
        expect(normalized.quantity).toBe("-2.5");
    });
    it("rejects open zero-quantity positions instead of silently storing invalid exposure", async () => {
        const [position] = await readFixture("query-positions.json");
        if (position === undefined) {
            throw new Error("Fixture must contain one position");
        }
        expect(() => normalizePosition({
            accountId: "bsc_0x1234567890abcdef",
            position: { ...position, qty: "0" },
            observedAt,
            ingestedAt
        })).toThrow(/zero-quantity/i);
    });
    it("filters zero-quantity records from account-level exposure snapshots", async () => {
        const [position] = await readFixture("query-positions.json");
        if (position === undefined) {
            throw new Error("Fixture must contain one position");
        }
        const result = normalizePerpsSnapshot({
            accountId: "bsc_0x1234567890abcdef",
            balance: await readFixture("query-balance.json"),
            positions: [{ ...position, id: 99, qty: "0" }, position],
            openOrders: await readFixture("query-open-orders.json"),
            observedAt,
            ingestedAt
        });
        expect(result.positions).toHaveLength(1);
        expect(result.positions[0]?.positionId).toBe("standx-position-15");
    });
    it("keeps live StandX positions when liquidation-only fields are unavailable", async () => {
        const [position] = await readFixture("query-positions.json");
        if (position === undefined) {
            throw new Error("Fixture must contain one position");
        }
        const normalized = normalizePosition({
            accountId: "bsc_0x1234567890abcdef",
            position: {
                ...position,
                bankruptcy_price: undefined,
                liq_price: null,
                mmr: null
            },
            observedAt,
            ingestedAt
        });
        expect(normalized.liquidationPrice).toBeNull();
        expect(normalized.bankruptcyPrice).toBeNull();
        expect(normalized.liquidationFields).toBe("unavailable");
    });
    it("uses the observation time as the position source timestamp for risk freshness", async () => {
        const [position] = await readFixture("query-positions.json");
        if (position === undefined) {
            throw new Error("Fixture must contain one position");
        }
        const staleExchangeUpdate = new Date("2026-08-14T11:55:00Z").toISOString();
        const normalized = normalizePosition({
            accountId: "bsc_0x1234567890abcdef",
            position: {
                ...position,
                mark_price: "121800.00",
                updated_at: staleExchangeUpdate
            },
            observedAt,
            ingestedAt
        });
        expect(normalized.markPrice).toBe("121800.00");
        expect(normalized.sourceTimestamp).toEqual(observedAt);
    });
});
async function readFixture(name) {
    return JSON.parse(await readFile(new URL(`../../../test/fixtures/standx/${name}`, import.meta.url), "utf8"));
}
//# sourceMappingURL=perps-normalizer.test.js.map