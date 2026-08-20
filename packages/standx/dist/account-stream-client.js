import { WebSocket } from "ws";
import { z } from "zod";
const defaultUrl = "wss://perps.standx.com/ws-stream/v1";
const accountChannelSchema = z.enum(["balance", "position", "order", "trade"]);
const accountMessageSchema = z.object({
    seq: z.number().int().nonnegative(),
    channel: accountChannelSchema,
    data: z.unknown()
});
export class StandXAccountStreamClient {
    url;
    now;
    createWebSocket;
    onError;
    setTimer;
    clearTimer;
    baseReconnectDelayMs;
    maxReconnectDelayMs;
    socket = null;
    reconnectTimer = null;
    reconnectAttempt = 0;
    closed = true;
    connectOptions = null;
    constructor(options = {}) {
        this.url = options.url ?? defaultUrl;
        this.now = options.now ?? (() => new Date());
        this.createWebSocket = options.createWebSocket ?? (url => new WebSocket(url));
        this.onError = options.onError ?? (() => undefined);
        this.setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
        this.clearTimer =
            options.clearTimer ??
                (timer => {
                    clearTimeout(timer);
                });
        this.baseReconnectDelayMs = options.reconnect?.baseDelayMs ?? 1_000;
        this.maxReconnectDelayMs = options.reconnect?.maxDelayMs ?? 30_000;
    }
    connect(options) {
        this.connectOptions = options;
        this.closed = false;
        this.openSocket();
        return Promise.resolve({
            close: () => this.close()
        });
    }
    close() {
        this.closed = true;
        if (this.reconnectTimer !== null) {
            this.clearTimer(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        const socket = this.socket;
        this.socket = null;
        socket?.close();
        return Promise.resolve();
    }
    openSocket() {
        const socket = this.createWebSocket(this.url);
        this.socket = socket;
        socket.on("open", () => {
            this.reconnectAttempt = 0;
            this.authenticate(socket);
        });
        socket.on("message", data => {
            void this.handleMessage(data);
        });
        socket.on("ping", () => {
            socket.pong?.();
        });
        socket.on("error", error => {
            this.onError(error);
        });
        socket.on("close", () => {
            if (!this.closed) {
                this.scheduleReconnect();
            }
        });
    }
    authenticate(socket) {
        const options = this.connectOptions;
        if (options === null) {
            return;
        }
        socket.send(JSON.stringify({
            auth: {
                token: options.token,
                streams: options.streams.map(channel => ({ channel }))
            }
        }));
    }
    scheduleReconnect() {
        this.reconnectAttempt += 1;
        const delayMs = Math.min(this.baseReconnectDelayMs * 2 ** Math.max(this.reconnectAttempt - 1, 0), this.maxReconnectDelayMs);
        this.reconnectTimer = this.setTimer(() => {
            this.reconnectTimer = null;
            if (!this.closed) {
                this.openSocket();
            }
        }, delayMs);
    }
    async handleMessage(data) {
        try {
            const rawMessage = JSON.parse(toStringPayload(data));
            if (isAuthMessage(rawMessage)) {
                return;
            }
            const parsed = accountMessageSchema.parse(rawMessage);
            const options = this.connectOptions;
            if (options === null) {
                return;
            }
            await options.onEvent({
                channel: parsed.channel,
                sequence: BigInt(parsed.seq),
                payload: parsed.data,
                ingestedAt: this.now()
            });
        }
        catch (error) {
            this.onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
}
function isAuthMessage(value) {
    return (typeof value === "object" &&
        value !== null &&
        "channel" in value &&
        value.channel === "auth");
}
const toStringPayload = (data) => {
    if (typeof data === "string") {
        return data;
    }
    if (Buffer.isBuffer(data)) {
        return data.toString("utf8");
    }
    if (data instanceof ArrayBuffer) {
        return Buffer.from(data).toString("utf8");
    }
    if (Array.isArray(data)) {
        return Buffer.concat(data.map(chunk => Buffer.from(chunk))).toString("utf8");
    }
    return String(data);
};
//# sourceMappingURL=account-stream-client.js.map