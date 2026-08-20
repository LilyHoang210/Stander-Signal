import type { MarketSnapshotStore } from "./market-snapshot-store.js";
export type StandXMarketChannel = "price" | "depth_book";
export interface MarketWebSocket {
    on(event: "open" | "ping" | "close", listener: () => void): this;
    on(event: "message", listener: (data: unknown) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    send(payload: string): void;
    pong?(): void;
    close(): void;
}
export interface StandXMarketStreamOptions {
    readonly endpoint?: string;
    readonly symbols: readonly string[];
    readonly channels?: readonly StandXMarketChannel[];
    readonly store: MarketSnapshotStore;
    readonly now?: () => Date;
    readonly createWebSocket?: (endpoint: string) => MarketWebSocket;
    readonly onError?: (error: Error) => void;
    readonly reconnect?: {
        readonly baseDelayMs?: number;
        readonly maxDelayMs?: number;
    };
    readonly setTimer?: (callback: () => void, delayMs: number) => unknown;
    readonly clearTimer?: (timer: unknown) => void;
}
export declare class StandXMarketStream {
    private readonly endpoint;
    private readonly symbols;
    private readonly channels;
    private readonly store;
    private readonly now;
    private readonly createWebSocket;
    private readonly onError;
    private readonly setTimer;
    private readonly clearTimer;
    private readonly baseReconnectDelayMs;
    private readonly maxReconnectDelayMs;
    private socket;
    private stopped;
    private reconnectAttempt;
    private reconnectTimer;
    constructor(options: StandXMarketStreamOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private connect;
    private subscribe;
    private scheduleReconnect;
    private handleMessage;
    private toPriceSnapshot;
    private toDepthSnapshot;
}
