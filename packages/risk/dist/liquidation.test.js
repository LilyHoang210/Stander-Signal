import { describe, expect, it } from "vitest";
import { evaluateLiquidation } from "./liquidation.js";
const decimal = (value) => value;
const basePosition = (overrides = {}) => ({
    accountId: "account-1",
    positionId: "position-1",
    symbol: "BTC-USD",
    side: "long",
    quantity: decimal("1"),
    notional: decimal("100"),
    entryPrice: decimal("100"),
    markPrice: decimal("100"),
    liquidationPrice: decimal("98"),
    bankruptcyPrice: decimal("95"),
    liquidationFields: "supported",
    leverage: decimal("5"),
    marginMode: "cross",
    initialMargin: decimal("20"),
    holdingMargin: decimal("20"),
    maintenanceMargin: decimal("5"),
    unrealizedPnl: decimal("0"),
    realizedPnl: decimal("0"),
    marginAsset: "DUSD",
    sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
    ingestedAt: new Date("2026-08-14T08:00:01.000Z"),
    sourceTier: "A",
    ...overrides
});
const input = (overrides = {}) => ({
    position: basePosition(),
    exitSlippagePct: decimal("0.005"),
    adverseMoves: {
        m5: decimal("0.016"),
        m15: decimal("0.03"),
        m60: decimal("0.06")
    },
    dataFresh: true,
    thresholdVersion: "liq-v1",
    evaluatedAt: new Date("2026-08-14T08:00:10.000Z"),
    ...overrides
});
describe("evaluateLiquidation", () => {
    it("returns critical for a long whose effective buffer is inside Q99 5m", () => {
        const result = evaluateLiquidation(input({
            position: basePosition({ markPrice: decimal("100"), liquidationPrice: decimal("98") })
        }));
        expect(result).toMatchObject({
            accountId: "account-1",
            itemId: "position-1",
            riskType: "liquidation",
            severity: "critical",
            status: "evaluated",
            thresholdVersion: "liq-v1",
            sourceTier: "A"
        });
        expect(result.reasons[0]).toMatchObject({
            code: "LIQUIDATION_BUFFER_5M",
            values: {
                liquidationBufferPct: "0.02000000000000000000",
                effectiveBufferPct: "0.01500000000000000000",
                adverseMovePct: "0.016"
            }
        });
    });
    it("uses the short buffer formula", () => {
        const result = evaluateLiquidation(input({
            position: basePosition({
                side: "short",
                markPrice: decimal("100"),
                liquidationPrice: decimal("103")
            }),
            exitSlippagePct: decimal("0.005"),
            adverseMoves: {
                m5: decimal("0.01"),
                m15: decimal("0.026"),
                m60: decimal("0.05")
            }
        }));
        expect(result.severity).toBe("danger");
        expect(result.reasons[0]?.code).toBe("LIQUIDATION_BUFFER_15M");
        expect(result.reasons[0]?.values).toMatchObject({
            liquidationBufferPct: "0.03000000000000000000",
            effectiveBufferPct: "0.02500000000000000000"
        });
    });
    it("treats equality with a threshold as inside that threshold", () => {
        const result = evaluateLiquidation(input({
            position: basePosition({ markPrice: decimal("100"), liquidationPrice: decimal("94") }),
            exitSlippagePct: decimal("0"),
            adverseMoves: {
                m5: decimal("0.02"),
                m15: decimal("0.04"),
                m60: decimal("0.06")
            }
        }));
        expect(result.severity).toBe("warning");
        expect(result.reasons[0]?.code).toBe("LIQUIDATION_BUFFER_60M");
    });
    it("returns safe when effective buffer is outside every horizon", () => {
        const result = evaluateLiquidation(input({
            position: basePosition({ markPrice: decimal("100"), liquidationPrice: decimal("90") }),
            exitSlippagePct: decimal("0.005"),
            adverseMoves: {
                m5: decimal("0.02"),
                m15: decimal("0.04"),
                m60: decimal("0.06")
            }
        }));
        expect(result.severity).toBe("safe");
        expect(result.reasons[0]?.code).toBe("LIQUIDATION_BUFFER_SAFE");
    });
    it("returns critical when the liquidation buffer is already zero or negative", () => {
        const result = evaluateLiquidation(input({
            position: basePosition({ markPrice: decimal("100"), liquidationPrice: decimal("101") }),
            exitSlippagePct: decimal("0")
        }));
        expect(result.severity).toBe("critical");
        expect(result.reasons[0]?.code).toBe("LIQUIDATION_BUFFER_NON_POSITIVE");
    });
    it("suppresses a financial conclusion when data is stale", () => {
        const result = evaluateLiquidation(input({ dataFresh: false }));
        expect(result.status).toBe("suppressed_stale");
        expect(result.severity).toBe("safe");
        expect(result.reasons[0]?.code).toBe("STALE_INPUT_DATA");
    });
    it("suppresses when StandX does not provide liquidation price", () => {
        const result = evaluateLiquidation(input({
            position: basePosition({
                liquidationPrice: null,
                liquidationFields: "unavailable"
            })
        }));
        expect(result.status).toBe("suppressed_missing_data");
        expect(result.reasons[0]?.code).toBe("MISSING_LIQUIDATION_PRICE");
    });
    it("suppresses when mark price is zero", () => {
        const result = evaluateLiquidation(input({
            position: basePosition({ markPrice: decimal("0"), liquidationPrice: decimal("98") })
        }));
        expect(result.status).toBe("suppressed_missing_data");
        expect(result.reasons[0]?.code).toBe("INVALID_MARK_PRICE");
    });
    it("suppresses when a position side is not recognized at runtime", () => {
        const result = evaluateLiquidation(input({
            position: basePosition({
                side: "flat"
            })
        }));
        expect(result.status).toBe("suppressed_missing_data");
        expect(result.reasons[0]?.code).toBe("INVALID_POSITION_SIDE");
    });
});
//# sourceMappingURL=liquidation.test.js.map