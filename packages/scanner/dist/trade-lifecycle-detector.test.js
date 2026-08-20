import { describe, expect, it } from "vitest";
import { detectTradeLifecycleEvents } from "./trade-lifecycle-detector.js";
const baseTime = new Date("2026-08-12T17:24:00.000Z");
function decimal(value) {
    return value;
}
function position(overrides = {}) {
    return {
        accountId: "account-1",
        positionId: "standx-position-1",
        symbol: "AIXBTUSDC",
        side: "long",
        quantity: decimal("3183"),
        notional: decimal("60"),
        entryPrice: decimal("0.018848"),
        markPrice: decimal("0.018848"),
        liquidationPrice: decimal("0.01"),
        bankruptcyPrice: null,
        liquidationFields: "supported",
        leverage: decimal("3"),
        marginMode: "cross",
        initialMargin: decimal("20.00"),
        holdingMargin: decimal("20.00"),
        maintenanceMargin: decimal("1.00"),
        unrealizedPnl: decimal("0"),
        realizedPnl: decimal("0"),
        marginAsset: "USDC",
        sourceTimestamp: baseTime,
        ingestedAt: baseTime,
        sourceTier: "A",
        ...overrides
    };
}
function trade(overrides = {}) {
    return {
        id: 200,
        order_id: 300,
        user: "account-1",
        symbol: "AIXBTUSDC",
        side: "sell",
        qty: "3183",
        price: "0.018565",
        value: "59.08",
        fee_qty: "0.11",
        fee_asset: "USDC",
        pnl: "-1.01",
        created_at: "2026-08-12T18:17:00.000Z",
        updated_at: "2026-08-12T18:17:00.000Z",
        ...overrides
    };
}
describe("detectTradeLifecycleEvents", () => {
    it("detects a newly opened position", () => {
        const events = detectTradeLifecycleEvents({
            connectionId: "connection-1",
            telegramUserId: "1001",
            accountId: "account-1",
            previousPositions: [],
            latestPositions: [position()],
            recentTrades: [],
            detectedAt: new Date("2026-08-12T17:25:00.000Z")
        });
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            eventType: "opened",
            closeReason: null,
            confidence: "high",
            positionKey: "standx-position-1",
            deduplicationKey: "connection-1:standx-position-1:opened:2026-08-12T17:24:00.000Z"
        });
    });
    it("does not emit when the same position remains open", () => {
        const events = detectTradeLifecycleEvents({
            connectionId: "connection-1",
            telegramUserId: "1001",
            accountId: "account-1",
            previousPositions: [position()],
            latestPositions: [position({ markPrice: decimal("0.019") })],
            recentTrades: [],
            detectedAt: new Date("2026-08-12T17:25:00.000Z")
        });
        expect(events).toEqual([]);
    });
    it("classifies a disappeared position as stop loss from negative closing trade pnl", () => {
        const events = detectTradeLifecycleEvents({
            connectionId: "connection-1",
            telegramUserId: "1001",
            accountId: "account-1",
            previousPositions: [position()],
            latestPositions: [],
            recentTrades: [trade()],
            detectedAt: new Date("2026-08-12T18:18:00.000Z")
        });
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            eventType: "closed",
            closeReason: "stop_loss",
            confidence: "medium",
            exitPrice: "0.018565",
            realizedPnl: "-1.01",
            fee: "0.11"
        });
    });
    it("classifies positive closing trade pnl as take profit", () => {
        const [event] = detectTradeLifecycleEvents({
            connectionId: "connection-1",
            telegramUserId: "1001",
            accountId: "account-1",
            previousPositions: [position()],
            latestPositions: [],
            recentTrades: [trade({
                    id: 201,
                    order_id: 301,
                    price: "0.019000",
                    value: "60.47",
                    pnl: "1.25"
                })],
            detectedAt: new Date("2026-08-12T18:18:00.000Z")
        });
        expect(event?.closeReason).toBe("take_profit");
    });
    it("classifies zero pnl closing trade as manual", () => {
        const [event] = detectTradeLifecycleEvents({
            connectionId: "connection-1",
            telegramUserId: "1001",
            accountId: "account-1",
            previousPositions: [position()],
            latestPositions: [],
            recentTrades: [trade({
                    id: 202,
                    order_id: 302,
                    price: "0.018848",
                    value: "59.98",
                    pnl: "0"
                })],
            detectedAt: new Date("2026-08-12T18:18:00.000Z")
        });
        expect(event?.closeReason).toBe("manual");
    });
    it("classifies missing closing trade as unknown", () => {
        const [event] = detectTradeLifecycleEvents({
            connectionId: "connection-1",
            telegramUserId: "1001",
            accountId: "account-1",
            previousPositions: [position()],
            latestPositions: [],
            recentTrades: [],
            detectedAt: new Date("2026-08-12T18:18:00.000Z")
        });
        expect(event?.closeReason).toBe("unknown");
        expect(event?.confidence).toBe("low");
    });
});
//# sourceMappingURL=trade-lifecycle-detector.test.js.map