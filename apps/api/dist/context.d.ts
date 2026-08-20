export interface Clock {
    now(): Date;
}
export interface TelegramIdentityView {
    readonly telegramUserId: string;
    readonly username?: string;
    readonly authDate: Date;
}
export interface ConnectionSessionView {
    readonly id: string;
    readonly telegramUserId: string;
    readonly expiresAt: Date;
}
export interface PublicConnectionView {
    readonly id: string;
    readonly status: "active" | "paused" | "disconnected";
    readonly accountLabel: string;
    readonly snapshotObservedAt: Date;
}
export interface ConnectionApplication {
    createSession(identity: TelegramIdentityView, now: Date): Promise<ConnectionSessionView>;
    connect(input: {
        readonly telegramUserId: string;
        readonly sessionId: string;
        readonly apiToken: string;
    }, now: Date): Promise<PublicConnectionView>;
    getStatus(connectionId: string, telegramUserId: string): Promise<PublicConnectionView | null>;
    disconnect(connectionId: string, telegramUserId: string, now: Date): Promise<boolean>;
    getCurrentStatus(telegramUserId: string): Promise<PublicConnectionView | null>;
    disconnectCurrent(telegramUserId: string, now: Date): Promise<boolean>;
}
export interface AppContext {
    readonly clock: Clock;
    readonly authenticate: (rawInitData: string, now: Date) => TelegramIdentityView;
    readonly connections: ConnectionApplication;
}
export type ConnectionApplicationErrorCode = "session_used" | "session_expired" | "session_invalid" | "standx_unauthorized" | "standx_unavailable";
export declare class ConnectionApplicationError extends Error {
    readonly code: ConnectionApplicationErrorCode;
    constructor(code: ConnectionApplicationErrorCode, options?: ErrorOptions);
}
