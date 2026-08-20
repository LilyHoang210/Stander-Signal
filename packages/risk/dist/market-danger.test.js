import { describe, expect, it } from "vitest";
import { evaluateMarketDanger, estimateFunding } from "./market-danger.js";
const decimal = (value) => value;
const position = (overrides = {}) => ({
    accountId: "account-1",
    positionId: "position-1",
    symbol: "BTC-USD",
    side: "long",
    quantity: decimal("2"),
    notional: decimal("200"),
    entryPrice: decimal("100"),
    markPrice: decimal("100"),
    liquidationPrice: decimal("90"),
    bankruptcyPrice: decimal("80"),
    liquidationFields: "supported",
    leverage: decimal("5"),
    marginMode: "cross",
    initialMargin: decimal("40"),
    holdingMargin: decimal("40"),
    maintenanceMargin: decimal("5"),
    unrealizedPnl: decimal("0"),
    realizedPnl: decimal("0"),
    marginAsset: "DUSD",
    sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
    ingestedAt: new Date("2026-08-14T08:00:01.000Z"),
    sourceTier: "A",
    ...overrides
});
const signalFlags = (overrides = {}) => ({
    volatilityQ99: false,
    spreadQ99: false,
    depthQ1: false,
    adverseFundingQ99: false,
    markIndexDivergenceQ99: false,
    openInterestShockWithAdverseMove: false,
    exitSlippageQ99: false,
    exitFillBelow80Pct: false,
    ...overrides
});
const input = (overrides = {}) => ({
    accountId: "account-1",
    itemId: "BTC-USD",
    symbol: "BTC-USD",
    signals: signalFlags(),
    accountRiskSeverity: "safe",
    dataFresh: true,
    thresholdVersion: "market-v1",
    sourceTier: "A",
    sourceTimestamp: new Date("2026-08-14T08:00:02.000Z"),
    evaluatedAt: new Date("2026-08-14T08:00:05.000Z"),
    ...overrides
});
describe("evaluateMarketDanger", () => {
    it("requires two independent extreme signals for danger", () => {
        const oneSignal = evaluateMarketDanger(input({ signals: signalFlags({ volatilityQ99: true }) }));
        expect(oneSignal.severity).toBe("safe");
        expect(oneSignal.reasons[0]?.code).toBe("VOLATILITY_Q99");
        const result = evaluateMarketDanger(input({ signals: signalFlags({ volatilityQ99: true, depthQ1: true }) }));
        expect(result).toMatchObject({
            accountId: "account-1",
            itemId: "BTC-USD",
            riskType: "market_danger",
            severity: "danger",
            status: "evaluated"
        });
        expect(result.reasons.map(reason => reason.code)).toEqual(["VOLATILITY_Q99", "DEPTH_Q1"]);
    });
    it("uses deterministic reason order independent of signal input order", () => {
        const result = evaluateMarketDanger(input({
            signals: signalFlags({
                exitSlippageQ99: true,
                spreadQ99: true,
                adverseFundingQ99: true
            })
        }));
        expect(result.reasons.map(reason => reason.code)).toEqual([
            "SPREAD_Q99",
            "ADVERSE_FUNDING_Q99",
            "EXIT_SLIPPAGE_Q99"
        ]);
    });
    it("escalates to critical when two market signals combine with danger account risk", () => {
        const result = evaluateMarketDanger(input({
            signals: signalFlags({ spreadQ99: true, markIndexDivergenceQ99: true }),
            accountRiskSeverity: "danger"
        }));
        expect(result.severity).toBe("critical");
        expect(result.reasons.at(-1)?.code).toBe("MARKET_SIGNALS_WITH_ACCOUNT_RISK");
    });
    it("keeps inability to fill 80 percent immediately critical", () => {
        const result = evaluateMarketDanger(input({
            signals: signalFlags({ exitFillBelow80Pct: true })
        }));
        expect(result.severity).toBe("critical");
        expect(result.reasons[0]?.code).toBe("EXIT_FILL_BELOW_80_PERCENT");
    });
    it("suppresses financial market danger when data is stale", () => {
        const result = evaluateMarketDanger(input({
            dataFresh: false,
            signals: signalFlags({ volatilityQ99: true, spreadQ99: true })
        }));
        expect(result.status).toBe("suppressed_stale");
        expect(result.severity).toBe("safe");
        expect(result.reasons[0]?.code).toBe("STALE_INPUT_DATA");
    });
});
describe("estimateFunding", () => {
    it("treats positive funding as adverse only for a long", () => {
        expect(estimateFunding(position({ side: "long" }), decimal("0.0001")).adverse).toBe(true);
        expect(estimateFunding(position({ side: "short" }), decimal("0.0001")).adverse).toBe(false);
    });
    it("treats negative funding as adverse only for a short", () => {
        expect(estimateFunding(position({ side: "short" }), decimal("-0.0001")).adverse).toBe(true);
        expect(estimateFunding(position({ side: "long" }), decimal("-0.0001")).adverse).toBe(false);
    });
});
//# sourceMappingURL=market-danger.test.js.map