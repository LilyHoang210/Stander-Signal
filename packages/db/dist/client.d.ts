import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";
export type StandxDatabase = PostgresJsDatabase<typeof schema>;
export interface DatabaseHandle {
    readonly db: StandxDatabase;
    close(): Promise<void>;
}
export declare function createDatabase(databaseUrl: string): DatabaseHandle;
