import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { StandXAccountStreamClient } from "./account-stream-client.js";
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
const parseJson = (payload) => JSON.parse(payload);
describe("StandXAccountStreamClient", () => {
    it("authenticates with JWT and requested user streams on open", async () => {
        const socket = new FakeWebSocket();
        const client = new StandXAccountStreamClient({
            createWebSocket: () => socket
        });
        const session = await client.connect({
            token: "jwt-token",
            streams: ["balance", "position"],
            onEvent: () => undefined
        });
        socket.emit("open");
        expect(socket.sent.map(parseJson)).toEqual([
            {
                auth: {
                    token: "jwt-token",
                    streams: [{ channel: "balance" }, { channel: "position" }]
                }
            }
        ]);
        await session.close();
        expect(socket.closed).toBe(true);
    });
    it("normalizes user balance, position, and order messages", async () => {
        const socket = new FakeWebSocket();
        const events = [];
        const client = new StandXAccountStreamClient({
            now: () => new Date("2026-08-15T08:00:05.000Z"),
            createWebSocket: () => socket
        });
        await client.connect({
            token: "jwt-token",
            streams: ["balance", "position", "order"],
            onEvent: event => {
                events.push(event);
            }
        });
        socket.emit("message", JSON.stringify({ seq: 10, channel: "balance", data: { total: "100" } }));
        socket.emit("message", JSON.stringify({ seq: 11, channel: "position", data: { symbol: "BTC-USD" } }));
        socket.emit("message", JSON.stringify({ seq: 12, channel: "order", data: { status: "filled" } }));
        expect(events).toEqual([
            {
                channel: "balance",
                sequence: 10n,
                payload: { total: "100" },
                ingestedAt: new Date("2026-08-15T08:00:05.000Z")
            },
            {
                channel: "position",
                sequence: 11n,
                payload: { symbol: "BTC-USD" },
                ingestedAt: new Date("2026-08-15T08:00:05.000Z")
            },
            {
                channel: "order",
                sequence: 12n,
                payload: { status: "filled" },
                ingestedAt: new Date("2026-08-15T08:00:05.000Z")
            }
        ]);
    });
    it("ignores successful auth responses instead of reporting them as malformed user events", async () => {
        const socket = new FakeWebSocket();
        const onError = vi.fn();
        const events = [];
        const client = new StandXAccountStreamClient({
            createWebSocket: () => socket,
            onError
        });
        await client.connect({
            token: "jwt-token",
            streams: ["balance"],
            onEvent: event => {
                events.push(event);
            }
        });
        socket.emit("message", JSON.stringify({
            seq: 1,
            channel: "auth",
            data: { code: 200, msg: "success" }
        }));
        expect(events).toEqual([]);
        expect(onError).not.toHaveBeenCalled();
    });
    it("responds to websocket ping frames", async () => {
        const socket = new FakeWebSocket();
        const client = new StandXAccountStreamClient({
            createWebSocket: () => socket
        });
        await client.connect({
            token: "jwt-token",
            streams: ["balance"],
            onEvent: () => undefined
        });
        socket.emit("ping");
        expect(socket.pongs).toHaveLength(1);
    });
    it("reconnects after an unexpected close without resending secrets to logs", async () => {
        const createdSockets = [];
        const errors = [];
        const timers = [];
        const client = new StandXAccountStreamClient({
            createWebSocket: () => {
                const socket = new FakeWebSocket();
                createdSockets.push(socket);
                return socket;
            },
            onError: error => errors.push(error),
            setTimer: callback => {
                timers.push(callback);
                return callback;
            },
            clearTimer: () => undefined,
            reconnect: { baseDelayMs: 10, maxDelayMs: 10 }
        });
        await client.connect({
            token: "jwt-token",
            streams: ["balance"],
            onEvent: () => undefined
        });
        createdSockets[0]?.emit("close");
        timers[0]?.();
        createdSockets[1]?.emit("open");
        expect(createdSockets).toHaveLength(2);
        expect(errors).toEqual([]);
    });
    it("does not reconnect after close is requested by the caller", async () => {
        const socket = new FakeWebSocket();
        const timers = [];
        const client = new StandXAccountStreamClient({
            createWebSocket: () => socket,
            setTimer: callback => {
                timers.push(callback);
                return callback;
            },
            clearTimer: () => undefined
        });
        const session = await client.connect({
            token: "jwt-token",
            streams: ["balance"],
            onEvent: () => undefined
        });
        await session.close();
        expect(timers).toHaveLength(0);
    });
});
//# sourceMappingURL=account-stream-client.test.js.map