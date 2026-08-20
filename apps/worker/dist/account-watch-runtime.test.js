import { describe, expect, it, vi } from "vitest";
import { createStandXAccountWatchStreamFactory, InMemoryConnectionLock } from "./account-watch-runtime.js";
describe("account watch runtime helpers", () => {
    it("subscribes account watchers to balance, position, and order streams", async () => {
        const connect = vi.fn((options) => {
            void options;
            return Promise.resolve({
                close: () => Promise.resolve()
            });
        });
        const factory = createStandXAccountWatchStreamFactory({
            createClient: () => ({ connect })
        });
        await factory.connect({
            connectionId: "connection-1",
            token: "jwt-token",
            onEvent: () => undefined,
            onDisconnect: () => undefined
        });
        const options = connect.mock.calls[0]?.[0];
        expect(options?.token).toBe("jwt-token");
        expect(options?.streams).toEqual(["balance", "position", "order"]);
        expect(typeof options?.onEvent).toBe("function");
    });
    it("skips concurrent scans for the same connection", async () => {
        const lock = new InMemoryConnectionLock();
        let resolveFirstScan = () => undefined;
        const first = lock.withConnectionLock("connection-1", () => new Promise(resolve => {
            resolveFirstScan = resolve;
        }));
        await expect(lock.withConnectionLock("connection-1", () => Promise.resolve("second"))).resolves.toBeNull();
        resolveFirstScan("first");
        await expect(first).resolves.toBe("first");
    });
});
//# sourceMappingURL=account-watch-runtime.test.js.map