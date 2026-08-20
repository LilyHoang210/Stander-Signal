import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import * as schema from "@standx/db/schema";
import type { TelegramLiveRiskReader, TelegramRiskEvaluationSummary } from "./telegram-live-commands.js";
export declare class PostgresTelegramRiskRepository<TQueryResult extends PgQueryResultHKT> implements TelegramLiveRiskReader {
    private readonly database;
    constructor(database: PgDatabase<TQueryResult, typeof schema>);
    listLatest(telegramUserId: string): Promise<readonly TelegramRiskEvaluationSummary[]>;
}
