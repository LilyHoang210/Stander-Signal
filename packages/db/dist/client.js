import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
export function createDatabase(databaseUrl) {
    const client = postgres(databaseUrl, {
        max: 10,
        prepare: false
    });
    return {
        db: drizzle(client, { schema }),
        async close() {
            await client.end({ timeout: 5 });
        }
    };
}
//# sourceMappingURL=client.js.map