import { describe, expect, it, vi } from "vitest";
import { AccountScanner } from "./account-scanner.js";
const connectionId = "11111111-1111-4111-8111-111111111111";
const connection = {
    id: connectionId,
    telegramUserId: "123456789",
    accountId: "bsc_0x1234567890abcdef",
    status: "active"
};
const balance = {
    balance: "1000",
    equity: "1000",
    isolated_balance: "0",
    isolated_upnl: "0",
    cross_balance: "1000",
    cross_margin: "50",
    cross_upnl: "0",
    cross_available: "950",
    locked: "0",
    upnl: "0",
    pnl_freeze: "0"
};
const position = {
    id: 7,
    symbol: "BTC-USD",
    qty: "1",
    position_value: "100",
    entry_price: "100",
    entry_value: "100",
    mark_price: "100",
    liq_price: "90",
    bankruptcy_price: "80",
    leverage: "5",
    margin_mode: "cross",
    initial_margin: "20",
    holding_margin: "20",
    maint_margin: "5",
    mmr: "0.005",
    upnl: "0",
    realized_pnl: "0",
    margin_asset: "DUSD",
    status: "open",
    time: "2026-08-14T08:00:00.000Z",
    created_at: "2026-08-14T08:00:00.000Z",
    updated_at: "2026-08-14T08:00:01.000Z",
    user: "bsc_0x1234567890abcdef"
};
const openOrders = {
    page_size: 0,
    result: [],
    total: 0
};
class FakeConnectionRepository {
    active = true;
    disconnectAfterFirstRead = false;
    reads = 0;
    findActiveById(id) {
        this.reads += 1;
        if (id !== connectionId || !this.active) {
            return Promise.resolve(null);
        }
        const result = { ...connection };
        if (this.disconnectAfterFirstRead && this.reads === 1) {
            this.active = false;
        }
        return Promise.resolve(result);
    }
}
const createDependencies = (overrides = {}) => {
    const connectionRepository = new FakeConnectionRepository();
    const saved = [];
    const enqueuedRisk = [];
    const leasedTokens = [];
    return {
        credentialService: {
            withLease(connectionIdToLease, callback) {
                leasedTokens.push(connectionIdToLease);
                return callback("standx-token");
            }
        },
        standxClient: {
            queryBalance(token) {
                expect(token).toBe("standx-token");
                return Promise.resolve(balance);
            },
            queryPositions(token) {
                expect(token).toBe("standx-token");
                return Promise.resolve([position]);
            },
            queryOpenOrders(token) {
                expect(token).toBe("standx-token");
                return Promise.resolve(openOrders);
            }
        },
        snapshotRepository: {
            savePerpsSnapshot(record) {
                saved.push(record.snapshot);
                return Promise.resolve();
            }
        },
        riskQueue: {
            enqueueEvaluateAccount(id) {
                enqueuedRisk.push(id);
                return Promise.resolve();
            }
        },
        lock: {
            withConnectionLock(_connectionId, callback) {
                return callback();
            }
        },
        now: () => new Date("2026-08-14T08:00:05.000Z"),
        ...overrides,
        connectionRepository,
        saved,
        enqueuedRisk,
        leasedTokens
    };
};
describe("AccountScanner", () => {
    it("persists a normalized snapshot and queues risk evaluation after commit", async () => {
        const dependencies = createDependencies();
        const scanner = new AccountScanner(dependencies);
        const result = await scanner.scan(connectionId);
        expect(result).toEqual({
            status: "scanned",
            connectionId,
            positionCount: 1,
            openOrderCount: 0,
            nextState: "active"
        });
        expect(dependencies.leasedTokens).toEqual([connectionId]);
        expect(dependencies.saved).toHaveLength(1);
        expect(dependencies.saved[0]?.positions[0]).toMatchObject({
            positionId: "standx-position-7",
            symbol: "BTC-USD",
            liquidationPrice: "90"
        });
        expect(dependencies.enqueuedRisk).toEqual([connectionId]);
    });
    it("runs post-scan hooks after saving snapshot and risk enqueue", async () => {
        const calls = [];
        const dependencies = createDependencies({
            snapshotRepository: {
                savePerpsSnapshot() {
                    calls.push("snapshot");
                    return Promise.resolve();
                }
            },
            riskQueue: {
                enqueueEvaluateAccount() {
                    calls.push("risk");
                    return Promise.resolve();
                }
            },
            postScanHooks: [{
                    afterPerpsSnapshotSaved() {
                        calls.push("hook");
                        return Promise.resolve();
                    }
                }]
        });
        const scanner = new AccountScanner(dependencies);
        await scanner.scan(connectionId);
        expect(calls).toEqual(["snapshot", "risk", "hook"]);
    });
    it("keeps scan result successful when a post-scan hook throws", async () => {
        const dependencies = createDependencies({
            postScanHooks: [{
                    afterPerpsSnapshotSaved() {
                        return Promise.reject(new Error("hook boom"));
                    }
                }]
        });
        const scanner = new AccountScanner(dependencies);
        await expect(scanner.scan(connectionId)).resolves.toMatchObject({ status: "scanned" });
        expect(dependencies.saved).toHaveLength(1);
        expect(dependencies.enqueuedRisk).toEqual([connectionId]);
    });
    it("does not fetch informational datasets during a background scan", async () => {
        const informationalCalls = {
            queryOrders: vi.fn(() => Promise.resolve({ page_size: 0, result: [], total: 0 })),
            queryFundingHistory: vi.fn(() => Promise.resolve([])),
            queryMarketOverview: vi.fn(() => Promise.resolve({ summary: {}, symbols: [] }))
        };
        const standxClient = {
            queryBalance: vi.fn(() => Promise.resolve(balance)),
            queryPositions: vi.fn(() => Promise.resolve([position])),
            queryOpenOrders: vi.fn(() => Promise.resolve(openOrders)),
            ...informationalCalls
        };
        const dependencies = createDependencies({ standxClient });
        const scanner = new AccountScanner(dependencies);
        await scanner.scan(connectionId);
        expect(informationalCalls.queryOrders).not.toHaveBeenCalled();
        expect(informationalCalls.queryFundingHistory).not.toHaveBeenCalled();
        expect(informationalCalls.queryMarketOverview).not.toHaveBeenCalled();
    });
    it("does not persist a snapshot after disconnect wins the race", async () => {
        const dependencies = createDependencies();
        dependencies.connectionRepository.disconnectAfterFirstRead = true;
        const scanner = new AccountScanner(dependencies);
        const result = await scanner.scan(connectionId);
        expect(result).toEqual({ status: "skipped_disconnected", connectionId });
        expect(dependencies.saved).toHaveLength(0);
        expect(dependencies.enqueuedRisk).toHaveLength(0);
    });
    it("does not lease credentials for an inactive connection", async () => {
        const dependencies = createDependencies();
        dependencies.connectionRepository.active = false;
        const scanner = new AccountScanner(dependencies);
        await expect(scanner.scan(connectionId)).resolves.toEqual({
            status: "skipped_inactive",
            connectionId
        });
        expect(dependencies.leasedTokens).toHaveLength(0);
    });
    it("does not run the remote scan when the lock is already held", async () => {
        const dependencies = createDependencies({
            lock: {
                withConnectionLock() {
                    return Promise.resolve(null);
                }
            }
        });
        const scanner = new AccountScanner(dependencies);
        await expect(scanner.scan(connectionId)).resolves.toEqual({
            status: "skipped_locked",
            connectionId
        });
        expect(dependencies.leasedTokens).toHaveLength(0);
    });
});
//# sourceMappingURL=account-scanner.test.js.map