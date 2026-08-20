import type { ConnectionSessionRecord, ConnectionSessionRepository, ConsumeSessionResult } from "@standx/domain/connection";
import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import * as schema from "../schema.js";
export declare class PostgresConnectionSessionRepository<TQueryResult extends PgQueryResultHKT> implements ConnectionSessionRepository {
    private readonly database;
    constructor(database: PgDatabase<TQueryResult, typeof schema>);
    create(record: ConnectionSessionRecord): Promise<void>;
    consume(tokenHash: string, telegramUserId: string, now: Date): Promise<ConsumeSessionResult>;
}
