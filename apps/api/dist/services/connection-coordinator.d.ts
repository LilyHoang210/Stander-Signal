import { type ConnectionSessionService, type PublicConnectionSession } from "@standx/domain/connection";
import { type ConnectionApplication, type PublicConnectionView, type TelegramIdentityView } from "../context.js";
export interface StandXValidatedAccount {
    readonly accountId: string;
    readonly alias?: string;
    readonly observedAt: Date;
    readonly snapshot: object;
}
export interface StandXAccountValidator {
    validateAccount(apiToken: string): Promise<StandXValidatedAccount>;
}
export declare class StandXValidationError extends Error {
    readonly code: "unauthorized" | "unavailable";
    constructor(code: "unauthorized" | "unavailable", options?: ErrorOptions);
}
export interface ConnectionDraft {
    readonly id: string;
    readonly telegramUserId: string;
    readonly accountId: string;
    readonly accountLabel: string;
    readonly createdAt: Date;
}
export interface ConnectionActivation {
    readonly connectionId: string;
    readonly telegramUserId: string;
    readonly snapshotCiphertext: string;
    readonly snapshotObservedAt: Date;
    readonly activatedAt: Date;
}
/**
 * Implementations make activation/replacement and disconnect/deletion-request atomic.
 * In particular, replacing or disconnecting a connection removes its credential row
 * in the same database transaction.
 */
export interface ConnectionLifecycleStore {
    stage(draft: ConnectionDraft): Promise<void>;
    activate(input: ConnectionActivation): Promise<PublicConnectionView>;
    rollback(connectionId: string, telegramUserId: string): Promise<void>;
    findByOwner(connectionId: string, telegramUserId: string): Promise<PublicConnectionView | null>;
    findCurrentByOwner(telegramUserId: string): Promise<PublicConnectionView | null>;
    disconnect(connectionId: string, telegramUserId: string, now: Date): Promise<boolean>;
}
export interface SnapshotProtector {
    protect(snapshot: object, context: {
        readonly connectionId: string;
        readonly telegramUserId: string;
    }): Promise<string>;
}
export interface ConnectionJobController {
    cancelConnectionJobs(connectionId: string): Promise<void>;
}
export interface ConnectionNotifier {
    connectionActivated(input: {
        readonly connectionId: string;
        readonly telegramUserId: string;
        readonly accountLabel: string;
    }): Promise<void>;
}
type SessionService = Pick<ConnectionSessionService, "create" | "consume">;
export interface ConnectionCredentials {
    withCandidate(candidate: string, callback: (token: string) => Promise<StandXValidatedAccount>): Promise<StandXValidatedAccount>;
    store(connectionId: string, telegramUserId: string, token: string): Promise<void>;
    delete(connectionId: string): Promise<boolean>;
}
export declare class ConnectionCoordinator implements ConnectionApplication {
    private readonly sessions;
    private readonly credentials;
    private readonly validator;
    private readonly lifecycle;
    private readonly snapshots;
    private readonly jobs;
    private readonly generateId;
    private readonly notifier;
    constructor(sessions: SessionService, credentials: ConnectionCredentials, validator: StandXAccountValidator, lifecycle: ConnectionLifecycleStore, snapshots: SnapshotProtector, jobs: ConnectionJobController, generateId?: () => string, notifier?: ConnectionNotifier);
    createSession(identity: TelegramIdentityView, now: Date): Promise<PublicConnectionSession>;
    connect(input: {
        readonly telegramUserId: string;
        readonly sessionId: string;
        readonly apiToken: string;
    }, now: Date): Promise<PublicConnectionView>;
    private notifyConnectionActivated;
    getStatus(connectionId: string, telegramUserId: string): Promise<PublicConnectionView | null>;
    getCurrentStatus(telegramUserId: string): Promise<PublicConnectionView | null>;
    disconnect(connectionId: string, telegramUserId: string, now: Date): Promise<boolean>;
    disconnectCurrent(telegramUserId: string, now: Date): Promise<boolean>;
}
export {};
