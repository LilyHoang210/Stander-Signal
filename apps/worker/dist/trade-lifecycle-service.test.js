import { describe, expect, it, vi } from "vitest";
import { PostgresTradeLifecycleService } from "./trade-lifecycle-service.js";
function decimal(value) {
    return value;
}
function position(overrides = {}) {
    const timestamp = new Date("2026-08-12T17:24:00.000Z");
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
        sourceTimestamp: timestamp,
        ingestedAt: timestamp,
        sourceTier: "A",
        ...overrides
    };
}
function eventRecord(input) {
    return input;
}
describe("PostgresTradeLifecycleService", () => {
    it("inserts and sends one opened notification", async () => {
        const sendTelegramMessage = vi.fn();
        sendTelegramMessage.mockResolvedValue({
            ok: true,
            status: 200,
            providerMessageId: "44"
        });
        const repository = {
            loadComparablePositionSnapshots: vi.fn().mockResolvedValue({
                previousPositions: [],
                latestPositions: [position()]
            }),
            insertPending: vi.fn((candidate) => Promise.resolve(eventRecord({
                id: "event-1",
                ...candidate,
                notificationStatus: "pending",
                providerMessageId: null
            }))),
            markSent: vi.fn(),
            markSuppressed: vi.fn(),
            markFailed: vi.fn()
        };
        const service = new PostgresTradeLifecycleService({
            repository,
            credentials: { withLease: async (_connectionId, callback) => callback("token") },
            standxClient: { queryTrades: () => Promise.resolve({ page_size: 0, result: [], total: 0 }) },
            financialAlertsEnabled: true,
            telegramSender: { sendTelegramMessage },
            now: () => new Date("2026-08-12T17:25:00.000Z")
        });
        await expect(service.processConnection("connection-1", {
            telegramUserId: "1001",
            accountId: "account-1"
        })).resolves.toEqual({
            status: "processed",
            connectionId: "connection-1",
            candidateCount: 1,
            insertedCount: 1,
            sentCount: 1
        });
        expect(sendTelegramMessage.mock.calls[0]?.[0]?.text).toContain("⚡ Instant Trade Opened");
        expect(repository.markSent).toHaveBeenCalledWith("event-1", "44");
    });
    it("suppresses sending when financial alerts are disabled", async () => {
        const repository = {
            loadComparablePositionSnapshots: vi.fn().mockResolvedValue({
                previousPositions: [],
                latestPositions: [position()]
            }),
            insertPending: vi.fn((candidate) => Promise.resolve(eventRecord({
                id: "event-1",
                ...candidate,
                notificationStatus: "pending",
                providerMessageId: null
            }))),
            markSent: vi.fn(),
            markSuppressed: vi.fn(),
            markFailed: vi.fn()
        };
        const sendTelegramMessage = vi.fn();
        const service = new PostgresTradeLifecycleService({
            repository,
            credentials: { withLease: async (_connectionId, callback) => callback("token") },
            standxClient: { queryTrades: () => Promise.resolve({ page_size: 0, result: [], total: 0 }) },
            financialAlertsEnabled: false,
            telegramSender: { sendTelegramMessage },
            now: () => new Date("2026-08-12T17:25:00.000Z")
        });
        await service.processConnection("connection-1", {
            telegramUserId: "1001",
            accountId: "account-1"
        });
        expect(sendTelegramMessage).not.toHaveBeenCalled();
        expect(repository.markSuppressed).toHaveBeenCalledWith("event-1");
    });
});
//# sourceMappingURL=trade-lifecycle-service.test.js.map