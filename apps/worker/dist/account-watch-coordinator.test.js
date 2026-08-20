import { describe, expect, it, vi } from "vitest";
import { AccountWatchCoordinator } from "./account-watch-coordinator.js";
const activeConnection = (id) => ({
    id,
    telegramUserId: `telegram-${id}`,
    accountId: `account-${id}`,
    status: "active"
});
function createHarness(connections) {
    const listActive = typeof connections === "function" ? connections : () => connections;
    const timers = [];
    const closed = [];
    const scan = vi.fn(() => Promise.resolve({ status: "scanned", connectionId: "unused" }));
    const connect = vi.fn(input => Promise.resolve({
        close() {
            closed.push(input.connectionId);
            return Promise.resolve();
        }
    }));
    const streamFactory = {
        connect
    };
    const coordinator = new AccountWatchCoordinator({
        connections: {
            listActive: () => Promise.resolve(listActive())
        },
        credentials: {
            withLease: (_connectionId, callback) => callback("jwt-token")
        },
        streamFactory,
        scanner: { scan },
        maxLiveConnections: 2,
        reconcileIntervalMs: 30_000,
        debounceMs: 5_000,
        fallbackScanMs: 60_000,
        now: () => new Date("2026-08-15T08:00:00.000Z"),
        setTimer: (callback, delayMs) => {
            timers.push({ callback, delayMs });
            return callback;
        },
        clearTimer: () => undefined
    });
    return { closed, connect, coordinator, scan, timers };
}
describe("AccountWatchCoordinator", () => {
    it("starts live streams only up to the configured slot limit", async () => {
        const { connect, coordinator } = createHarness([
            activeConnection("connection-1"),
            activeConnection("connection-2"),
            activeConnection("connection-3")
        ]);
        await coordinator.reconcile();
        expect(connect).toHaveBeenCalledTimes(2);
        expect(connect).toHaveBeenNthCalledWith(1, expect.objectContaining({
            connectionId: "connection-1",
            token: "jwt-token"
        }));
        expect(connect).toHaveBeenNthCalledWith(2, expect.objectContaining({
            connectionId: "connection-2",
            token: "jwt-token"
        }));
    });
    it("coalesces bursty account stream updates into one scan", async () => {
        const { coordinator, scan, timers } = createHarness([activeConnection("connection-1")]);
        await coordinator.reconcile();
        await coordinator.handleStreamEvent("connection-1", { channel: "balance" });
        await coordinator.handleStreamEvent("connection-1", { channel: "position" });
        expect(timers.filter(timer => timer.delayMs === 5_000)).toHaveLength(1);
        timers.find(timer => timer.delayMs === 5_000)?.callback();
        expect(scan).toHaveBeenCalledTimes(1);
        expect(scan).toHaveBeenCalledWith("connection-1");
    });
    it("keeps fallback scans scheduled for active accounts without live slots", async () => {
        const { coordinator, timers } = createHarness([
            activeConnection("connection-1"),
            activeConnection("connection-2"),
            activeConnection("connection-3")
        ]);
        await coordinator.reconcile();
        expect(coordinator.nextFallbackScanAt("connection-3")).toEqual(new Date("2026-08-15T08:01:00.000Z"));
        expect(timers.filter(timer => timer.delayMs === 60_000)).toHaveLength(3);
    });
    it("closes streams for accounts that are no longer active", async () => {
        let active = [activeConnection("connection-1")];
        const harness = createHarness(() => active);
        await harness.coordinator.reconcile();
        active = [];
        await harness.coordinator.reconcile();
        expect(harness.closed).toEqual(["connection-1"]);
    });
});
//# sourceMappingURL=account-watch-coordinator.test.js.map