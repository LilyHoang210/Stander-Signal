import { describe, expect, it } from "vitest";
import { classifyExitLiquidity, evaluateExitLiquidity, walkClosingBook } from "./order-book.js";
const decimal = (value) => value;
const position = (overrides = {}) => ({
    accountId: "account-1",
    positionId: "position-1",
    symbol: "BTC-USD",
    side: "long",
    quantity: decimal("3"),
    notional: decimal("300"),
    entryPrice: decimal("100"),
    markPrice: decimal("100"),
    liquidationPrice: decimal("90"),
    bankruptcyPrice: decimal("80"),
    liquidationFields: "supported",
    leverage: decimal("3"),
    marginMode: "cross",
    initialMargin: decimal("100"),
    holdingMargin: decimal("100"),
    maintenanceMargin: decimal("10"),
    unrealizedPnl: decimal("0"),
    realizedPnl: decimal("0"),
    marginAsset: "DUSD",
    sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
    ingestedAt: new Date("2026-08-14T08:00:01.000Z"),
    sourceTier: "A",
    ...overrides
});
const depth = (overrides = {}) => ({
    symbol: "BTC-USD",
    bids: [
        { price: decimal("98"), quantity: decimal("10") },
        { price: decimal("100"), quantity: decimal("1") },
        { price: decimal("99"), quantity: decimal("2") }
    ],
    asks: [
        { price: decimal("103"), quantity: decimal("10") },
        { price: decimal("101"), quantity: decimal("1") },
        { price: decimal("102"), quantity: decimal("2") }
    ],
    sequence: 42n,
    sourceTimestamp: new Date("2026-08-14T08:00:02.000Z"),
    ingestedAt: new Date("2026-08-14T08:00:03.000Z"),
    sourceTier: "A",
    ...overrides
});
describe("walkClosingBook", () => {
    it("sells a long into bids from highest to lowest", () => {
        const result = walkClosingBook(position({ quantity: decimal("3") }), depth());
        expect(result).toMatchObject({
            requestedQuantity: "3.00000000000000000000",
            filledQuantity: "3.00000000000000000000",
            fillRatio: "1.00000000000000000000",
            vwap: "99.33333333333333333333",
            estimatedExitNotional: "298.00000000000000000000",
            slippagePct: "0.00666666666666666667"
        });
    });
    it("buys a short from asks from lowest to highest using absolute quantity", () => {
        const result = walkClosingBook(position({ side: "short", quantity: decimal("-3"), markPrice: decimal("100") }), depth());
        expect(result).toMatchObject({
            requestedQuantity: "3.00000000000000000000",
            filledQuantity: "3.00000000000000000000",
            fillRatio: "1.00000000000000000000",
            vwap: "101.66666666666666666667",
            slippagePct: "0.01666666666666666667"
        });
    });
    it("never assumes hidden liquidity when the visible book is incomplete", () => {
        const result = walkClosingBook(position({ quantity: decimal("10") }), depth({
            bids: [{ price: decimal("100"), quantity: decimal("7.999") }]
        }));
        expect(result.fillRatio).toBe("0.79990000000000000000");
        expect(classifyExitLiquidity({ fillRatio: result.fillRatio })).toBe("critical");
    });
    it("does not mark the exact 80 percent visible fill boundary as critical", () => {
        expect(classifyExitLiquidity({ fillRatio: decimal("0.8") })).toBe("danger");
    });
    it("returns zero fill and critical severity for an empty closing book", () => {
        const result = walkClosingBook(position(), depth({ bids: [] }));
        expect(result).toMatchObject({
            filledQuantity: "0.00000000000000000000",
            fillRatio: "0.00000000000000000000",
            vwap: null,
            slippagePct: "1.00000000000000000000"
        });
        expect(classifyExitLiquidity({ fillRatio: result.fillRatio })).toBe("critical");
    });
});
describe("evaluateExitLiquidity", () => {
    it("returns a structured exit-liquidity risk evaluation", () => {
        const estimate = walkClosingBook(position({ quantity: decimal("10") }), depth({ bids: [{ price: decimal("100"), quantity: decimal("7.999") }] }));
        const result = evaluateExitLiquidity({
            accountId: "account-1",
            positionId: "position-1",
            estimate,
            dataFresh: true,
            thresholdVersion: "liq-v1",
            sourceTimestamp: new Date("2026-08-14T08:00:02.000Z"),
            evaluatedAt: new Date("2026-08-14T08:00:05.000Z"),
            sourceTier: "A"
        });
        expect(result).toMatchObject({
            accountId: "account-1",
            itemId: "position-1",
            riskType: "exit_liquidity",
            severity: "critical",
            status: "evaluated"
        });
        expect(result.reasons[0]).toMatchObject({
            code: "EXIT_FILL_RATIO_CRITICAL",
            values: {
                fillRatio: "0.79990000000000000000"
            }
        });
    });
});
//# sourceMappingURL=order-book.test.js.map