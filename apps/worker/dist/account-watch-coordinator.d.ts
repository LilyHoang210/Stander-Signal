import type { StandXAccountStreamChannel, StandXAccountStreamSession } from "@standx/standx/account-stream-client";
export interface AccountWatchConnection {
    readonly id: string;
    readonly telegramUserId: string;
    readonly accountId: string;
    readonly status: "active";
}
export interface AccountWatchConnections {
    listActive(): Promise<readonly AccountWatchConnection[]>;
}
export interface AccountWatchCredentials {
    withLease<T>(connectionId: string, callback: (token: string) => Promise<T>): Promise<T>;
}
export interface AccountWatchStreamEvent {
    readonly channel: StandXAccountStreamChannel;
}
export interface AccountWatchStreamFactory {
    connect(input: {
        readonly connectionId: string;
        readonly token: string;
        readonly onEvent: (event: AccountWatchStreamEvent) => void | Promise<void>;
        readonly onDisconnect: () => void | Promise<void>;
    }): Promise<StandXAccountStreamSession>;
}
export interface AccountWatchScanner {
    scan(connectionId: string): Promise<unknown>;
}
export interface AccountWatchCoordinatorOptions {
    readonly connections: AccountWatchConnections;
    readonly credentials: AccountWatchCredentials;
    readonly streamFactory: AccountWatchStreamFactory;
    readonly scanner: AccountWatchScanner;
    readonly maxLiveConnections: number;
    readonly reconcileIntervalMs: number;
    readonly debounceMs: number;
    readonly fallbackScanMs: number;
    readonly now?: () => Date;
    readonly onError?: (error: Error) => void;
    readonly setTimer?: (callback: () => void, delayMs: number) => unknown;
    readonly clearTimer?: (timer: unknown) => void;
}
export declare class AccountWatchCoordinator {
    private readonly connections;
    private readonly credentials;
    private readonly streamFactory;
    private readonly scanner;
    private readonly maxLiveConnections;
    private readonly reconcileIntervalMs;
    private readonly debounceMs;
    private readonly fallbackScanMs;
    private readonly now;
    private readonly onError;
    private readonly setTimer;
    private readonly clearTimer;
    private readonly liveSessions;
    private readonly debounceTimers;
    private readonly fallbackSchedules;
    private reconcileTimer;
    private stopped;
    constructor(options: AccountWatchCoordinatorOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    reconcile(): Promise<void>;
    handleStreamEvent(connectionId: string, event: AccountWatchStreamEvent): Promise<void>;
    handleDisconnect(connectionId: string): Promise<void>;
    nextFallbackScanAt(connectionId: string): Date | null;
    private openLiveStream;
    private scheduleReconcile;
    private scheduleFallback;
    private rescheduleFallback;
    private scanConnection;
}
