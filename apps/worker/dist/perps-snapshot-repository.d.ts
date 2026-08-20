import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { PerpsSnapshotRepository, SavePerpsSnapshotInput } from "@standx/scanner/account-scanner";
import * as schema from "@standx/db/schema";
export declare class PostgresPerpsSnapshotRepository<TQueryResult extends PgQueryResultHKT> implements PerpsSnapshotRepository {
    private readonly database;
    private readonly generateId;
    constructor(database: PgDatabase<TQueryResult, typeof schema>, generateId?: () => string);
    savePerpsSnapshot(input: SavePerpsSnapshotInput): Promise<void>;
}
