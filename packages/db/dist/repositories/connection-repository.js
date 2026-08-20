import { and, asc, eq, ne } from "drizzle-orm";
import * as schema from "../schema.js";
import { standxConnections } from "../schema.js";
export class InMemoryConnectionRepository {
    #records = new Map();
    save(record) {
        this.#records.set(record.id, { ...record });
        return Promise.resolve();
    }
    listActive() {
        return Promise.resolve([...this.#records.values()]
            .filter(record => record.status === "active")
            .map(record => ({ ...record })));
    }
    findActiveByTelegramUserId(telegramUserId) {
        for (const record of this.#records.values()) {
            if (record.telegramUserId === telegramUserId && record.status === "active") {
                return Promise.resolve({ ...record });
            }
        }
        return Promise.resolve(null);
    }
    findActiveById(id) {
        const record = this.#records.get(id);
        if (record === undefined || record.status !== "active") {
            return Promise.resolve(null);
        }
        return Promise.resolve({ ...record });
    }
    disconnect(id, telegramUserId) {
        const record = this.#records.get(id);
        if (record === undefined || record.telegramUserId !== telegramUserId) {
            return Promise.resolve(false);
        }
        this.#records.set(id, { ...record, status: "disconnected" });
        return Promise.resolve(true);
    }
}
export class PostgresConnectionRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async save(record) {
        await this.database
            .insert(standxConnections)
            .values(record)
            .onConflictDoUpdate({
            target: standxConnections.id,
            set: {
                accountId: record.accountId,
                status: record.status,
                updatedAt: new Date()
            }
        });
    }
    async listActive() {
        return this.database
            .select({
            id: standxConnections.id,
            telegramUserId: standxConnections.telegramUserId,
            accountId: standxConnections.accountId,
            status: standxConnections.status
        })
            .from(standxConnections)
            .where(eq(standxConnections.status, "active"))
            .orderBy(asc(standxConnections.createdAt));
    }
    async findActiveByTelegramUserId(telegramUserId) {
        const [record] = await this.database
            .select({
            id: standxConnections.id,
            telegramUserId: standxConnections.telegramUserId,
            accountId: standxConnections.accountId,
            status: standxConnections.status
        })
            .from(standxConnections)
            .where(and(eq(standxConnections.telegramUserId, telegramUserId), eq(standxConnections.status, "active")))
            .limit(1);
        return record ?? null;
    }
    async findActiveById(id) {
        const [record] = await this.database
            .select({
            id: standxConnections.id,
            telegramUserId: standxConnections.telegramUserId,
            accountId: standxConnections.accountId,
            status: standxConnections.status
        })
            .from(standxConnections)
            .where(and(eq(standxConnections.id, id), eq(standxConnections.status, "active")))
            .limit(1);
        return record ?? null;
    }
    async disconnect(id, telegramUserId) {
        const changed = await this.database
            .update(standxConnections)
            .set({
            status: "disconnected",
            disconnectedAt: new Date(),
            updatedAt: new Date()
        })
            .where(and(eq(standxConnections.id, id), eq(standxConnections.telegramUserId, telegramUserId), ne(standxConnections.status, "disconnected")))
            .returning({ id: standxConnections.id });
        return changed.length === 1;
    }
}
//# sourceMappingURL=connection-repository.js.map