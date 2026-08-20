import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { StandXMarketStream } from "./standx-market-stream.js";
class FakeWebSocket extends EventEmitter {
    sent = [];
    pongs = [];
    closed = false;
    send(payload) {
        this.sent.push(payload);
    }
    pong() {
        this.pongs.push(Date.now());
    }
    close() {
        this.closed = true;
        this.emit("close");
    }
}
const createStore = () => {
    const snapshots = [];
    return {
        snapshots,
        put(snapshot) {
            snapshots.push(snapshot);
            return Promise.resolve();
        },
        getPrice() {
            return Promise.resolve(null);
        },
        getDepth() {
            return Promise.resolve(null);
        },
        getBundle() {
            return Promise.resolve(null);
        },
        freshness() {
            return Promise.resolve("missing");
        }
    };
};
const parseJson = (payload) => JSON.parse(payload);
describe("StandXMarketStream", () => {
    it("subscribes to price and depth_book channels for each symbol on open", async () => {
        const socket = new FakeWebSocket();
        const stream = new StandXMarketStream({
            symbols: ["BTC-USD", "ETH-USD"],
            store: createStore(),
            createWebSocket: () => socket
        });
        await stream.start();
        socket.emit("open");
        expect(socket.sent.map(parseJson)).toEqual([
            { subscribe: { channel: "price", symbol: "BTC-USD" } },
            { subscribe: { channel: "depth_book", symbol: "BTC-USD" } },
            { subscribe: { channel: "price", symbol: "ETH-USD" } },
            { subscribe: { channel: "depth_book", symbol: "ETH-USD" } }
        ]);
    });
    it("normalizes price messages into price snapshots", async () => {
        const socket = new FakeWebSocket();
        const store = createStore();
        const stream = new StandXMarketStream({
            symbols: ["BTC-USD"],
            store,
            now: () => new Date("2026-08-14T08:00:05.000Z"),
            createWebSocket: () => socket
        });
        await stream.start();
        socket.emit("message", JSON.stringify({
            seq: 7,
            channel: "price",
            symbol: "BTC-USD",
            data: {
                mark_price: "100.5",
                index_price: "100.3",
                funding_rate: "0.0001",
                time: "2026-08-14T08:00:04.000Z"
            }
        }));
        expect(store.snapshots).toEqual([
            {
                symbol: "BTC-USD",
                markPrice: "100.5",
                indexPrice: "100.3",
                fundingRate: "0.0001",
                sequence: 7n,
                sourceTimestamp: new Date("2026-08-14T08:00:04.000Z"),
                ingestedAt: new Date("2026-08-14T08:00:05.000Z"),
                sourceTier: "A"
            }
        ]);
    });
    it("normalizes and sorts depth_book messages", async () => {
        const socket = new FakeWebSocket();
        const store = createStore();
        const stream = new StandXMarketStream({
            symbols: ["BTC-USD"],
            store,
            now: () => new Date("2026-08-14T08:00:05.000Z"),
            createWebSocket: () => socket
        });
        await stream.start();
        socket.emit("message", JSON.stringify({
            seq: 8,
            channel: "depth_book",
            symbol: "BTC-USD",
            data: {
                bids: [
                    ["98", "1"],
                    ["99", "2"]
                ],
                asks: [
                    ["102", "1"],
                    ["101", "3"]
                ],
                time: "2026-08-14T08:00:04.000Z"
            }
        }));
        expect(store.snapshots).toEqual([
            {
                symbol: "BTC-USD",
                bids: [
                    { price: "99", quantity: "2" },
                    { price: "98", quantity: "1" }
                ],
                asks: [
                    { price: "101", quantity: "3" },
                    { price: "102", quantity: "1" }
                ],
                sequence: 8n,
                sourceTimestamp: new Date("2026-08-14T08:00:04.000Z"),
                ingestedAt: new Date("2026-08-14T08:00:05.000Z"),
                sourceTier: "A"
            }
        ]);
    });
    it("pongs websocket ping frames", async () => {
        const socket = new FakeWebSocket();
        const stream = new StandXMarketStream({
            symbols: ["BTC-USD"],
            store: createStore(),
            createWebSocket: () => socket
        });
        await stream.start();
        socket.emit("ping");
        expect(socket.pongs).toHaveLength(1);
    });
    it("reports malformed messages without throwing", async () => {
        const socket = new FakeWebSocket();
        const onError = vi.fn();
        const stream = new StandXMarketStream({
            symbols: ["BTC-USD"],
            store: createStore(),
            createWebSocket: () => socket,
            onError
        });
        await stream.start();
        expect(() => socket.emit("message", "{bad-json")).not.toThrow();
        expect(onError).toHaveBeenCalledOnce();
    });
});
//# sourceMappingURL=standx-market-stream.test.js.map