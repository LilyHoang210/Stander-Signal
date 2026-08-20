export type StandXAccountStreamChannel = "balance" | "position" | "order" | "trade";
export interface StandXAccountStreamEvent {
    readonly channel: StandXAccountStreamChannel;
    readonly sequence: bigint;
    readonly payload: unknown;
    readonly ingestedAt: Date;
}
export interface StandXAccountStreamConnectOptions {
    readonly token: string;
    readonly streams: readonly StandXAccountStreamChannel[];
    readonly onEvent: (event: StandXAccountStreamEvent) => void | Promise<void>;
}
export interface StandXAccountStreamSession {
    close(): Promise<void>;
}
export interface AccountStreamWebSocket {
    on(event: "open" | "ping" | "close", listener: () => void): this;
    on(event: "message", listener: (data: unknown) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    send(payload: string): void;
    pong?(): void;
    close(): void;
}
export interface StandXAccountStreamClientOptions {
    readonly url?: string;
    readonly now?: () => Date;
    readonly createWebSocket?: (url: string) => AccountStreamWebSocket;
    readonly onError?: (error: Error) => void;
    readonly reconnect?: {
        readonly baseDelayMs?: number;
        readonly maxDelayMs?: number;
    };
    readonly setTimer?: (callback: () => void, delayMs: number) => unknown;
    readonly clearTimer?: (timer: unknown) => void;
}
export declare class StandXAccountStreamClient {
    private readonly url;
    private readonly now;
    private readonly createWebSocket;
    private readonly onError;
    private readonly setTimer;
    private readonly clearTimer;
    private readonly baseReconnectDelayMs;
    private readonly maxReconnectDelayMs;
    private socket;
    private reconnectTimer;
    private reconnectAttempt;
    private closed;
    private connectOptions;
    constructor(options?: StandXAccountStreamClientOptions);
    connect(options: StandXAccountStreamConnectOptions): Promise<StandXAccountStreamSession>;
    private close;
    private openSocket;
    private authenticate;
    private scheduleReconnect;
    private handleMessage;
}
