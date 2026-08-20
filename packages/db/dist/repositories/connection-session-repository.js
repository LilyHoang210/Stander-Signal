import { and, eq, gt, isNull } from "drizzle-orm";
import * as schema from "../schema.js";
import { connectionSessions, telegramUsers } from "../schema.js";
export class PostgresConnectionSessionRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async create(record) {
        await this.database.transaction(async (transaction) => {
            await transaction
                .insert(telegramUsers)
                .values({
                telegramUserId: record.telegramUserId,
                createdAt: record.createdAt,
                updatedAt: record.createdAt
            })
                .onConflictDoNothing({ target: telegramUsers.telegramUserId });
            await transaction.insert(connectionSessions).values(record);
        });
    }
    async consume(tokenHash, telegramUserId, now) {
        const [consumed] = await this.database
            .update(connectionSessions)
            .set({ usedAt: now })
            .where(and(eq(connectionSessions.tokenHash, tokenHash), eq(connectionSessions.telegramUserId, telegramUserId), isNull(connectionSessions.usedAt), gt(connectionSessions.expiresAt, now)))
            .returning();
        if (consumed !== undefined) {
            return { status: "consumed", record: consumed };
        }
        const [record] = await this.database
            .select()
            .from(connectionSessions)
            .where(eq(connectionSessions.tokenHash, tokenHash))
            .limit(1);
        if (record === undefined) {
            return { status: "missing" };
        }
        if (record.telegramUserId !== telegramUserId) {
            return { status: "wrong_user" };
        }
        if (record.usedAt !== null) {
            return { status: "used" };
        }
        return { status: "expired" };
    }
}
//# sourceMappingURL=connection-session-repository.js.map