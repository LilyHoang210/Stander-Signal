import { describe, expect, it } from "vitest";
import { evaluateStopLossProximity } from "./stop-loss-proximity.js";
const decimal = (value) => value;
const observedAt = new Date("2026-08-20T08:00:10.000Z");
const position = (overrides = {}) => ({
    accountId: "account-1",
    positionId: "position-1",
    symbol: "BTC-USD",
    side: "long",
    quantity: decimal("0.0001"),
    notional: decimal("6.5"),
    entryPrice: decimal("65000"),
    markPrice: decimal("65000"),
    liquidationPrice: decimal("50000"),
    bankruptcyPrice: decimal("49000"),
    liquidationFields: "supported",
    leverage: decimal("5"),
    marginMode: "cross",
    initialMargin: decimal("1.3"),
    holdingMargin: decimal("1.3"),
    maintenanceMargin: decimal("0.1"),
    unrealizedPnl: decimal("0"),
    realizedPnl: decimal("0"),
    marginAsset: "USDC",
    sourceTimestamp: observedAt,
    ingestedAt: observedAt,
    sourceTier: "A",
    ...overrides
});
const order = (overrides = {}) => ({
    accountId: "account-1",
    orderId: "standx-order-1",
    positionId: "position-1",
    symbol: "BTC-USD",
    side: "sell",
    orderType: "market",
    status: "untriggered",
    quantity: decimal("0"),
    filledQuantity: decimal("0"),
    price: decimal("64765"),
    averageFillPrice: decimal("0"),
    reduceOnly: true,
    sourceTimestamp: observedAt,
    ingestedAt: observedAt,
    sourceTier: "A",
    ...overrides
});
const evaluate = (overrides = {}) => evaluateStopLossProximity({
    position: position(),
    openOrders: [order()],
    thresholds: {
        criticalDistancePct: decimal("0.0010"),
        dangerDistancePct: decimal("0.0025"),
        warningDistancePct: decimal("0.0050")
    },
    dataFresh: true,
    thresholdVersion: "auto-risk-v1",
    evaluatedAt: observedAt,
    ...overrides
});
describe("evaluateStopLossProximity", () => {
    it("returns critical for a long position close to an untriggered reduce-only sell stop", () => {
        const result = evaluate({
            position: position({ markPrice: decimal("64786.70") }),
            openOrders: [order({ price: decimal("64765") })]
        });
        expect(result).toMatchObject({
            accountId: "account-1",
            itemId: "position-1",
            riskType: "stop_loss_proximity",
            severity: "critical",
            status: "evaluated",
            thresholdVersion: "auto-risk-v1",
            sourceTier: "A"
        });
        expect(result?.reasons[0]).toMatchObject({
            code: "STOP_LOSS_DISTANCE_CRITICAL",
            values: {
                symbol: "BTC-USD",
                positionSide: "long",
                markPrice: "64786.70",
                stopPrice: "64765",
                stopDistancePct: "0.00033494528969680505",
                orderId: "standx-order-1"
            }
        });
    });
    it("returns critical when the stop price is inside the critical distance", () => {
        const result = evaluate({
            position: position({ markPrice: decimal("100") }),
            openOrders: [order({ price: decimal("99.95") })]
        });
        expect(result?.severity).toBe("critical");
        expect(result?.reasons[0]?.code).toBe("STOP_LOSS_DISTANCE_CRITICAL");
    });
    it("returns warning when only the warning threshold is reached", () => {
        const result = evaluate({
            position: position({ markPrice: decimal("100") }),
            openOrders: [order({ price: decimal("99.7") })]
        });
        expect(result?.severity).toBe("warning");
        expect(result?.reasons[0]?.code).toBe("STOP_LOSS_DISTANCE_WARNING");
    });
    it("returns safe when the nearest stop is outside every threshold", () => {
        const result = evaluate({
            position: position({ markPrice: decimal("100") }),
            openOrders: [order({ price: decimal("98") })]
        });
        expect(result?.severity).toBe("safe");
        expect(result?.reasons[0]?.code).toBe("STOP_LOSS_DISTANCE_SAFE");
    });
    it("uses buy stops above mark for short positions", () => {
        const result = evaluate({
            position: position({
                side: "short",
                quantity: decimal("-1"),
                markPrice: decimal("100")
            }),
            openOrders: [order({ side: "buy", price: decimal("100.2") })]
        });
        expect(result?.severity).toBe("danger");
        expect(result?.reasons[0]?.values).toMatchObject({
            stopSide: "buy",
            stopPrice: "100.2"
        });
    });
    it("uses the nearest matching stop when multiple stops exist", () => {
        const result = evaluate({
            position: position({ markPrice: decimal("100") }),
            openOrders: [
                order({ orderId: "far", price: decimal("99") }),
                order({ orderId: "near", price: decimal("99.8") })
            ]
        });
        expect(result?.severity).toBe("danger");
        expect(result?.reasons[0]?.values.orderId).toBe("near");
    });
    it("ignores orders that are not active reduce-only stops for the position", () => {
        const result = evaluate({
            openOrders: [
                order({ reduceOnly: false }),
                order({ status: "filled" }),
                order({ positionId: "position-2" }),
                order({ side: "buy" })
            ]
        });
        expect(result).toBeNull();
    });
    it("suppresses stale data without producing a financial conclusion", () => {
        const result = evaluate({ dataFresh: false });
        expect(result).toMatchObject({
            severity: "safe",
            status: "suppressed_stale",
            riskType: "stop_loss_proximity"
        });
        expect(result?.reasons[0]?.code).toBe("STALE_INPUT_DATA");
    });
});
//# sourceMappingURL=stop-loss-proximity.test.js.map