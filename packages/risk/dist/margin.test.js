import { describe, expect, it } from "vitest";
import { evaluateCrossMargin } from "./margin.js";
const decimal = (value) => value;
const balance = (overrides = {}) => ({
    accountId: "account-1",
    balance: decimal("1000"),
    equity: decimal("1000"),
    isolatedBalance: decimal("0"),
    isolatedUpnl: decimal("0"),
    crossBalance: decimal("1000"),
    crossMargin: decimal("500"),
    crossUpnl: decimal("0"),
    crossAvailable: decimal("500"),
    locked: decimal("0"),
    upnl: decimal("0"),
    pnlFreeze: decimal("0"),
    sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
    ingestedAt: new Date("2026-08-14T08:00:01.000Z"),
    sourceTier: "A",
    ...overrides
});
const position = (overrides = {}) => ({
    accountId: "account-1",
    positionId: "position-1",
    symbol: "BTC-USD",
    side: "long",
    quantity: decimal("10"),
    notional: decimal("1000"),
    entryPrice: decimal("100"),
    markPrice: decimal("100"),
    liquidationPrice: decimal("80"),
    bankruptcyPrice: decimal("70"),
    liquidationFields: "supported",
    leverage: decimal("2"),
    marginMode: "cross",
    initialMargin: decimal("500"),
    holdingMargin: decimal("500"),
    maintenanceMargin: decimal("50"),
    unrealizedPnl: decimal("0"),
    realizedPnl: decimal("0"),
    marginAsset: "DUSD",
    sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
    ingestedAt: new Date("2026-08-14T08:00:01.000Z"),
    sourceTier: "A",
    ...overrides
});
const stressPosition = (overrides = {}) => ({
    position: position(),
    adverseMoves: {
        m5: decimal("0.60"),
        m15: decimal("0.90"),
        m60: decimal("1.20")
    },
    ...overrides
});
describe("evaluateCrossMargin", () => {
    it("evaluates cross margin from critical to warning", () => {
        const result = evaluateCrossMargin({
            balance: balance({ crossAvailable: decimal("500") }),
            positions: [stressPosition()],
            dataFresh: true,
            thresholdVersion: "margin-v1",
            evaluatedAt: new Date("2026-08-14T08:00:05.000Z")
        });
        expect(result).toMatchObject({
            accountId: "account-1",
            itemId: "account-1",
            riskType: "cross_margin",
            severity: "critical",
            status: "evaluated"
        });
        expect(result.reasons[0]).toMatchObject({
            code: "CROSS_MARGIN_STRESS_5M",
            values: {
                crossAvailable: "500",
                stressLoss5m: "600.00000000000000000000",
                stressLoss15m: "900.00000000000000000000",
                stressLoss60m: "1200.00000000000000000000"
            }
        });
    });
    it("returns warning when only the 60-minute stress loss exceeds cross available", () => {
        const result = evaluateCrossMargin({
            balance: balance({ crossAvailable: decimal("1000") }),
            positions: [stressPosition()],
            dataFresh: true,
            thresholdVersion: "margin-v1",
            evaluatedAt: new Date("2026-08-14T08:00:05.000Z")
        });
        expect(result.severity).toBe("warning");
        expect(result.reasons[0]?.code).toBe("CROSS_MARGIN_STRESS_60M");
    });
    it("returns safe when cross available covers every stress horizon", () => {
        const result = evaluateCrossMargin({
            balance: balance({ crossAvailable: decimal("1300") }),
            positions: [stressPosition()],
            dataFresh: true,
            thresholdVersion: "margin-v1",
            evaluatedAt: new Date("2026-08-14T08:00:05.000Z")
        });
        expect(result.severity).toBe("safe");
        expect(result.reasons[0]?.code).toBe("CROSS_MARGIN_STRESS_SAFE");
    });
    it("adds losses across cross positions without diversification credit", () => {
        const result = evaluateCrossMargin({
            balance: balance({ crossAvailable: decimal("1000") }),
            positions: [
                stressPosition(),
                stressPosition({
                    position: position({
                        positionId: "position-2",
                        side: "short",
                        quantity: decimal("-5"),
                        markPrice: decimal("200")
                    }),
                    adverseMoves: {
                        m5: decimal("0.20"),
                        m15: decimal("0.30"),
                        m60: decimal("0.40")
                    }
                })
            ],
            dataFresh: true,
            thresholdVersion: "margin-v1",
            evaluatedAt: new Date("2026-08-14T08:00:05.000Z")
        });
        expect(result.severity).toBe("danger");
        expect(result.reasons[0]?.values).toMatchObject({
            stressLoss5m: "800.00000000000000000000",
            stressLoss15m: "1200.00000000000000000000",
            stressLoss60m: "1600.00000000000000000000"
        });
    });
    it("marks zero available cross margin critical when stress loss is positive", () => {
        const result = evaluateCrossMargin({
            balance: balance({ crossAvailable: decimal("0") }),
            positions: [stressPosition()],
            dataFresh: true,
            thresholdVersion: "margin-v1",
            evaluatedAt: new Date("2026-08-14T08:00:05.000Z")
        });
        expect(result.severity).toBe("critical");
        expect(result.reasons[0]?.code).toBe("CROSS_MARGIN_STRESS_5M");
    });
    it("ignores isolated positions because liquidation handles them at position level", () => {
        const result = evaluateCrossMargin({
            balance: balance({ crossAvailable: decimal("500") }),
            positions: [
                stressPosition({
                    position: position({ marginMode: "isolated" })
                })
            ],
            dataFresh: true,
            thresholdVersion: "margin-v1",
            evaluatedAt: new Date("2026-08-14T08:00:05.000Z")
        });
        expect(result.severity).toBe("safe");
        expect(result.reasons[0]?.code).toBe("CROSS_MARGIN_STRESS_SAFE");
    });
    it("suppresses a financial conclusion when required account data is stale", () => {
        const result = evaluateCrossMargin({
            balance: balance(),
            positions: [stressPosition()],
            dataFresh: false,
            thresholdVersion: "margin-v1",
            evaluatedAt: new Date("2026-08-14T08:00:05.000Z")
        });
        expect(result.status).toBe("suppressed_stale");
        expect(result.severity).toBe("safe");
        expect(result.reasons[0]?.code).toBe("STALE_INPUT_DATA");
    });
});
//# sourceMappingURL=margin.test.js.map