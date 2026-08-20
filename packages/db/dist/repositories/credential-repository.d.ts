import type { CredentialRecord, CredentialRepository } from "@standx/security/credential-service";
import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import * as schema from "../schema.js";
export declare class PostgresCredentialRepository<TQueryResult extends PgQueryResultHKT> implements CredentialRepository {
    private readonly database;
    constructor(database: PgDatabase<TQueryResult, typeof schema>);
    store(record: CredentialRecord): Promise<void>;
    find(connectionId: string): Promise<CredentialRecord | null>;
    delete(connectionId: string): Promise<boolean>;
}
