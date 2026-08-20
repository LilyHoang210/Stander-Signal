import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import * as schema from "@standx/db/schema";
import type { TelegramAlertSummary, TelegramLiveAlertReader } from "./telegram-live-commands.js";
export declare class PostgresTelegramAlertRepository<TQueryResult extends PgQueryResultHKT> implements TelegramLiveAlertReader {
    private readonly database;
    constructor(database: PgDatabase<TQueryResult, typeof schema>);
    listActive(telegramUserId: string): Promise<readonly TelegramAlertSummary[]>;
}
