import { Decimal } from "decimal.js";
import { WebSocket } from "ws";
import { z } from "zod";
const defaultEndpoint = "wss://perps.standx.com/ws-stream/v1";
const defaultChannels = ["price", "depth_book"];
const decimalValueSchema = z.union([z.string(), z.number()]).transform((value, context) => {
    const stringValue = String(value);
    try {
        const decimal = new Decimal(stringValue);
        if (!decimal.isFinite()) {
            context.addIssue({ code: "custom", message: "Decimal must be finite" });
            return z.NEVER;
        }
    }
    catch {
        context.addIssue({ code: "custom", message: "Invalid decimal" });
        return z.NEVER;
    }
    return stringValue;
});
const timestampSchema = z.union([z.string(), z.number()]).transform((value, context) => {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
        context.addIssue({ code: "custom", message: "Invalid timestamp" });
        return z.NEVER;
    }
    return timestamp;
});
const depthLevelSchema = z.tuple([decimalValueSchema, decimalValueSchema]).transform(([price, quantity]) => ({
    price,
    quantity
}));
const priceMessageSchema = z.object({
    seq: z.number().int().nonnegative(),
    channel: z.literal("price"),
    symbol: z.string().min(1),
    data: z.object({
        mark_price: decimalValueSchema,
        index_price: decimalValueSchema.nullish(),
        funding_rate: decimalValueSchema.nullish(),
        time: timestampSchema
    })
});
const depthMessageSchema = z.object({
    seq: z.number().int().nonnegative(),
    channel: z.literal("depth_book"),
    symbol: z.string().min(1),
    data: z.object({
        bids: z.array(depthLevelSchema),
        asks: z.array(depthLevelSchema),
        time: timestampSchema
    })
});
const marketMessageSchema = z.union([priceMessageSchema, depthMessageSchema]);
export class StandXMarketStream {
    endpoint;
    symbols;
    channels;
    store;
    now;
    createWebSocket;
    onError;
    setTimer;
    clearTimer;
    baseReconnectDelayMs;
    maxReconnectDelayMs;
    socket = null;
    stopped = true;
    reconnectAttempt = 0;
    reconnectTimer = null;
    constructor(options) {
        this.endpoint = options.endpoint ?? defaultEndpoint;
        this.symbols = options.symbols;
        this.channels = options.channels ?? defaultChannels;
        this.store = options.store;
        this.now = options.now ?? (() => new Date());
        this.createWebSocket = options.createWebSocket ?? ((endpoint) => new WebSocket(endpoint));
        this.onError = options.onError ?? (() => undefined);
        this.setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
        this.clearTimer =
            options.clearTimer ??
                ((timer) => {
                    clearTimeout(timer);
                });
        this.baseReconnectDelayMs = options.reconnect?.baseDelayMs ?? 1_000;
        this.maxReconnectDelayMs = options.reconnect?.maxDelayMs ?? 30_000;
    }
    start() {
        if (!this.stopped) {
            return Promise.resolve();
        }
        this.stopped = false;
        this.connect();
        return Promise.resolve();
    }
    stop() {
        this.stopped = true;
        if (this.reconnectTimer !== null) {
            this.clearTimer(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        const socket = this.socket;
        this.socket = null;
        socket?.close();
        return Promise.resolve();
    }
    connect() {
        const socket = this.createWebSocket(this.endpoint);
        this.socket = socket;
        socket.on("open", () => {
            this.reconnectAttempt = 0;
            this.subscribe(socket);
        });
        socket.on("message", (data) => {
            void this.handleMessage(data);
        });
        socket.on("ping", () => {
            socket.pong?.();
        });
        socket.on("error", (error) => {
            this.onError(error);
        });
        socket.on("close", () => {
            if (!this.stopped) {
                this.scheduleReconnect();
            }
        });
    }
    subscribe(socket) {
        for (const symbol of this.symbols) {
            for (const channel of this.channels) {
                socket.send(JSON.stringify({ subscribe: { channel, symbol } }));
            }
        }
    }
    scheduleReconnect() {
        this.reconnectAttempt += 1;
        const delayMs = Math.min(this.baseReconnectDelayMs * 2 ** Math.max(this.reconnectAttempt - 1, 0), this.maxReconnectDelayMs);
        this.reconnectTimer = this.setTimer(() => {
            this.reconnectTimer = null;
            if (!this.stopped) {
                this.connect();
            }
        }, delayMs);
    }
    async handleMessage(data) {
        try {
            const raw = toStringPayload(data);
            const parsed = marketMessageSchema.parse(JSON.parse(raw));
            if (parsed.channel === "price") {
                await this.store.put(this.toPriceSnapshot(parsed));
                return;
            }
            await this.store.put(this.toDepthSnapshot(parsed));
        }
        catch (error) {
            this.onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
    toPriceSnapshot(message) {
        return {
            symbol: message.symbol,
            markPrice: message.data.mark_price,
            ...(message.data.index_price ? { indexPrice: message.data.index_price } : {}),
            ...(message.data.funding_rate ? { fundingRate: message.data.funding_rate } : {}),
            sequence: BigInt(message.seq),
            sourceTimestamp: message.data.time,
            ingestedAt: this.now(),
            sourceTier: "A"
        };
    }
    toDepthSnapshot(message) {
        return {
            symbol: message.symbol,
            bids: sortDepthLevels(message.data.bids, "desc"),
            asks: sortDepthLevels(message.data.asks, "asc"),
            sequence: BigInt(message.seq),
            sourceTimestamp: message.data.time,
            ingestedAt: this.now(),
            sourceTier: "A"
        };
    }
}
const sortDepthLevels = (levels, direction) => [...levels].sort((left, right) => {
    const comparison = new Decimal(left.price).comparedTo(new Decimal(right.price));
    return direction === "asc" ? comparison : -comparison;
});
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
        return Buffer.concat(data.map((chunk) => Buffer.from(chunk))).toString("utf8");
    }
    return String(data);
};
//# sourceMappingURL=standx-market-stream.js.map