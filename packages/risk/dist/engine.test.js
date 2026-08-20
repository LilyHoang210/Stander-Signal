import { describe, expect, it } from "vitest";
import { RiskEngine } from "./engine.js";
const decimal = (value) => value;
const sourceTimestamp = new Date("2026-08-14T08:00:00.000Z");
const evaluatedAt = new Date("2026-08-14T08:00:05.000Z");
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
    sourceTimestamp,
    ingestedAt: new Date("2026-08-14T08:00:01.000Z"),
    sourceTier: "A",
    ...overrides
});
const evaluation = (riskType, severity, itemId = riskType === "cross_margin" ? "account-1" : "position-1", status = "evaluated") => ({
    accountId: "account-1",
    itemId,
    riskType,
    severity,
    status,
    thresholdVersion: "engine-v1",
    sourceTier: "A",
    sourceTimestamp,
    evaluatedAt,
    reasons: [
        {
            code: `${riskType.toUpperCase()}_${severity.toUpperCase()}`,
            message: "fixture",
            values: {}
        }
    ]
});
const signals = (overrides = {}) => ({
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
describe("RiskEngine.evaluateAccount", () => {
    it("returns one explainable evaluation per account item and risk type", () => {
        const engine = new RiskEngine();
        const results = engine.evaluateAccount({
            accountId: "account-1",
            positions: [position()],
            liquidationEvaluations: [evaluation("liquidation", "warning")],
            exitLiquidityEvaluations: [evaluation("exit_liquidity", "safe")],
            crossMarginEvaluation: evaluation("cross_margin", "safe"),
            marketDangerInputs: [
                {
                    symbol: "BTC-USD",
                    signals: signals({ volatilityQ99: true }),
                    dataFresh: true,
                    sourceTier: "A",
                    sourceTimestamp
                }
            ],
            fundingRates: new Map([["BTC-USD", decimal("0.0001")]]),
            thresholdVersion: "engine-v1",
            evaluatedAt
        });
        expect(results.map(result => `${result.itemId}:${result.riskType}`)).toEqual([
            "position-1:liquidation",
            "position-1:exit_liquidity",
            "account-1:cross_margin",
            "BTC-USD:market_danger",
            "position-1:funding"
        ]);
        expect(new Set(results.map(result => `${result.accountId}:${result.itemId}:${result.riskType}`)).size).toBe(results.length);
        expect(results.every(result => result.reasons.length > 0)).toBe(true);
    });
    it("passes danger account risk into market danger escalation", () => {
        const engine = new RiskEngine();
        const results = engine.evaluateAccount({
            accountId: "account-1",
            positions: [position()],
            liquidationEvaluations: [evaluation("liquidation", "danger")],
            exitLiquidityEvaluations: [evaluation("exit_liquidity", "safe")],
            crossMarginEvaluation: evaluation("cross_margin", "safe"),
            marketDangerInputs: [
                {
                    symbol: "BTC-USD",
                    signals: signals({ volatilityQ99: true, spreadQ99: true }),
                    dataFresh: true,
                    sourceTier: "A",
                    sourceTimestamp
                }
            ],
            fundingRates: new Map([["BTC-USD", decimal("-0.0001")]]),
            thresholdVersion: "engine-v1",
            evaluatedAt
        });
        const marketDanger = results.find(result => result.riskType === "market_danger");
        const funding = results.find(result => result.riskType === "funding");
        expect(marketDanger?.severity).toBe("critical");
        expect(marketDanger?.reasons.at(-1)?.code).toBe("MARKET_SIGNALS_WITH_ACCOUNT_RISK");
        expect(funding?.severity).toBe("safe");
        expect(funding?.reasons[0]?.code).toBe("FUNDING_NOT_ADVERSE");
    });
});
//# sourceMappingURL=engine.test.js.map