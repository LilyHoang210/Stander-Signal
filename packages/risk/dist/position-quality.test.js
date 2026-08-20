import { describe, expect, it } from "vitest";
import { applyPositionQualityModifiers } from "./position-quality.js";
const evaluatedAt = new Date("2026-08-15T00:00:00.000Z");
const decimal = (value) => value;
describe("applyPositionQualityModifiers", () => {
    it("escalates a borderline safe high-leverage position to warning", () => {
        const result = applyPositionQualityModifiers({
            evaluation: liquidationEvaluation("safe", decimal("0.07000000000000000000")),
            position: position({
                leverage: decimal("15"),
                notional: decimal("1000"),
                initialMargin: decimal("66.66666666666666666666")
            }),
            balance: balance({ equity: decimal("10000") }),
            adverseMoves: adverseMoves(),
            policy: policy()
        });
        expect(result.severity).toBe("warning");
        expect(result.reasons.map(reason => reason.code)).toContain("POSITION_QUALITY_HIGH_LEVERAGE");
    });
    it("escalates a borderline warning position to danger when negative PnL is large versus margin", () => {
        const result = applyPositionQualityModifiers({
            evaluation: liquidationEvaluation("warning", decimal("0.03500000000000000000")),
            position: position({
                unrealizedPnl: decimal("-80"),
                initialMargin: decimal("200"),
                holdingMargin: decimal("200"),
                notional: decimal("2000")
            }),
            balance: balance({ equity: decimal("5000") }),
            adverseMoves: adverseMoves(),
            policy: policy()
        });
        expect(result.severity).toBe("danger");
        expect(result.reasons.map(reason => reason.code)).toContain("POSITION_QUALITY_NEGATIVE_PNL");
    });
    it("does not create critical severity by modifier alone", () => {
        const result = applyPositionQualityModifiers({
            evaluation: liquidationEvaluation("danger", decimal("0.01500000000000000000")),
            position: position({
                leverage: decimal("25"),
                unrealizedPnl: decimal("-900"),
                initialMargin: decimal("1000")
            }),
            balance: balance({ equity: decimal("1500") }),
            adverseMoves: adverseMoves(),
            policy: policy()
        });
        expect(result.severity).toBe("danger");
        expect(result.reasons.every(reason => reason.code !== "POSITION_QUALITY_CRITICAL")).toBe(true);
    });
    it("leaves suppressed evaluations unchanged", () => {
        const suppressed = {
            ...liquidationEvaluation("safe", decimal("0")),
            status: "suppressed_missing_data",
            reasons: [{ code: "MISSING_LIQUIDATION_PRICE", message: "missing", values: {} }]
        };
        const result = applyPositionQualityModifiers({
            evaluation: suppressed,
            position: position({ liquidationPrice: null }),
            balance: balance({ equity: decimal("1000") }),
            adverseMoves: adverseMoves(),
            policy: policy()
        });
        expect(result).toBe(suppressed);
    });
});
function adverseMoves() {
    return {
        m5: decimal("0.01000000000000000000"),
        m15: decimal("0.03000000000000000000"),
        m60: decimal("0.06000000000000000000")
    };
}
function policy() {
    return {
        highLeverage: decimal("10"),
        largeNotionalToEquityRatio: decimal("0.50000000000000000000"),
        negativePnlToMarginRatio: decimal("0.25000000000000000000"),
        borderlineMultiplier: decimal("1.25000000000000000000")
    };
}
function liquidationEvaluation(severity, effectiveBufferPct) {
    return {
        accountId: "acct_1",
        itemId: "pos_1",
        riskType: "liquidation",
        severity,
        status: "evaluated",
        thresholdVersion: "auto-risk-v1",
        sourceTier: "A",
        sourceTimestamp: evaluatedAt,
        evaluatedAt,
        reasons: [{
                code: "LIQUIDATION_BUFFER_TEST",
                message: "test",
                values: {
                    effectiveBufferPct,
                    liquidationBufferPct: effectiveBufferPct,
                    markPrice: "100",
                    liquidationPrice: "94",
                    exitSlippagePct: "0.00500000000000000000"
                }
            }]
    };
}
function position(overrides) {
    return {
        accountId: "acct_1",
        positionId: "pos_1",
        symbol: "BTC",
        side: "long",
        quantity: decimal("1"),
        notional: decimal("1000"),
        entryPrice: decimal("100"),
        markPrice: decimal("100"),
        liquidationPrice: decimal("94"),
        bankruptcyPrice: null,
        liquidationFields: "supported",
        leverage: decimal("5"),
        marginMode: "cross",
        initialMargin: decimal("200"),
        holdingMargin: decimal("200"),
        maintenanceMargin: decimal("20"),
        unrealizedPnl: decimal("0"),
        realizedPnl: decimal("0"),
        marginAsset: "USDC",
        sourceTimestamp: evaluatedAt,
        ingestedAt: evaluatedAt,
        sourceTier: "A",
        ...overrides
    };
}
function balance(overrides) {
    return {
        accountId: "acct_1",
        balance: decimal("10000"),
        equity: decimal("10000"),
        isolatedBalance: decimal("0"),
        isolatedUpnl: decimal("0"),
        crossBalance: decimal("10000"),
        crossMargin: decimal("200"),
        crossUpnl: decimal("0"),
        crossAvailable: decimal("9800"),
        locked: decimal("0"),
        upnl: decimal("0"),
        pnlFreeze: decimal("0"),
        sourceTimestamp: evaluatedAt,
        ingestedAt: evaluatedAt,
        sourceTier: "A",
        ...overrides
    };
}
//# sourceMappingURL=position-quality.test.js.map