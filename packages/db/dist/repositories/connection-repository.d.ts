import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import * as schema from "../schema.js";
export type ConnectionStatus = "pending" | "active" | "paused" | "disconnected";
export interface ConnectionRecord {
    readonly id: string;
    readonly telegramUserId: string;
    readonly accountId: string;
    readonly status: ConnectionStatus;
}
export interface ConnectionRepository {
    save(record: ConnectionRecord): Promise<void>;
    listActive(): Promise<readonly ConnectionRecord[]>;
    findActiveByTelegramUserId(telegramUserId: string): Promise<ConnectionRecord | null>;
    findActiveById(id: string): Promise<ConnectionRecord | null>;
    disconnect(id: string, telegramUserId: string): Promise<boolean>;
}
export declare class InMemoryConnectionRepository implements ConnectionRepository {
    #private;
    save(record: ConnectionRecord): Promise<void>;
    listActive(): Promise<readonly ConnectionRecord[]>;
    findActiveByTelegramUserId(telegramUserId: string): Promise<ConnectionRecord | null>;
    findActiveById(id: string): Promise<ConnectionRecord | null>;
    disconnect(id: string, telegramUserId: string): Promise<boolean>;
}
export declare class PostgresConnectionRepository<TQueryResult extends PgQueryResultHKT> implements ConnectionRepository {
    private readonly database;
    constructor(database: PgDatabase<TQueryResult, typeof schema>);
    save(record: ConnectionRecord): Promise<void>;
    listActive(): Promise<readonly ConnectionRecord[]>;
    findActiveByTelegramUserId(telegramUserId: string): Promise<ConnectionRecord | null>;
    findActiveById(id: string): Promise<ConnectionRecord | null>;
    disconnect(id: string, telegramUserId: string): Promise<boolean>;
}
