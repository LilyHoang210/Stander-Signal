import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import * as schema from "../schema.js";
export interface LifecycleDraft {
    readonly id: string;
    readonly telegramUserId: string;
    readonly accountId: string;
    readonly accountLabel: string;
    readonly createdAt: Date;
}
export interface LifecycleActivation {
    readonly connectionId: string;
    readonly telegramUserId: string;
    readonly snapshotCiphertext: string;
    readonly snapshotObservedAt: Date;
    readonly activatedAt: Date;
}
export interface LifecyclePublicView {
    readonly id: string;
    readonly status: "active" | "paused" | "disconnected";
    readonly accountLabel: string;
    readonly snapshotObservedAt: Date;
}
export declare class PostgresConnectionLifecycleStore<TQueryResult extends PgQueryResultHKT> {
    private readonly database;
    private readonly generateId;
    constructor(database: PgDatabase<TQueryResult, typeof schema>, generateId?: () => string);
    stage(draft: LifecycleDraft): Promise<void>;
    activate(input: LifecycleActivation): Promise<LifecyclePublicView>;
    rollback(connectionId: string, telegramUserId: string): Promise<void>;
    findByOwner(connectionId: string, telegramUserId: string): Promise<LifecyclePublicView | null>;
    findCurrentByOwner(telegramUserId: string): Promise<LifecyclePublicView | null>;
    disconnect(connectionId: string, telegramUserId: string, now: Date): Promise<boolean>;
}
