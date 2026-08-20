import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import * as schema from "@standx/db/schema";
import { tradeLifecycleEvents } from "@standx/db/schema";
import type { PositionSnapshot } from "@standx/domain/portfolio";
import type { TradeLifecycleCandidate } from "@standx/scanner/trade-lifecycle-detector";
export interface ComparablePositionSnapshots {
    readonly previousPositions: readonly PositionSnapshot[];
    readonly latestPositions: readonly PositionSnapshot[];
}
export type TradeLifecycleEventRecord = typeof tradeLifecycleEvents.$inferSelect;
export declare class PostgresTradeLifecycleRepository<TQueryResult extends PgQueryResultHKT> {
    private readonly database;
    private readonly generateId;
    constructor(database: PgDatabase<TQueryResult, typeof schema>, generateId?: () => string);
    loadComparablePositionSnapshots(connectionId: string): Promise<ComparablePositionSnapshots | null>;
    insertPending(candidate: TradeLifecycleCandidate): Promise<TradeLifecycleEventRecord | null>;
    markSent(id: string, providerMessageId: string | null): Promise<void>;
    markSuppressed(id: string): Promise<void>;
    markFailed(id: string): Promise<void>;
    private loadPositionsAt;
}
