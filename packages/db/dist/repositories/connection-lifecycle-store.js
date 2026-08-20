import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import * as schema from "../schema.js";
import { accountSnapshots, auditEvents, deletionRequests, encryptedCredentials, standxConnections, telegramUsers } from "../schema.js";
export class PostgresConnectionLifecycleStore {
    database;
    generateId;
    constructor(database, generateId = randomUUID) {
        this.database = database;
        this.generateId = generateId;
    }
    async stage(draft) {
        await this.database.transaction(async (transaction) => {
            await transaction
                .insert(telegramUsers)
                .values({ telegramUserId: draft.telegramUserId, updatedAt: draft.createdAt })
                .onConflictDoUpdate({
                target: telegramUsers.telegramUserId,
                set: { updatedAt: draft.createdAt }
            });
            await transaction.insert(standxConnections).values({
                id: draft.id,
                telegramUserId: draft.telegramUserId,
                accountId: draft.accountId,
                accountLabel: draft.accountLabel,
                status: "pending",
                createdAt: draft.createdAt,
                updatedAt: draft.createdAt
            });
        });
    }
    async activate(input) {
        return this.database.transaction(async (transaction) => {
            const [pending] = await transaction
                .select({ id: standxConnections.id })
                .from(standxConnections)
                .where(and(eq(standxConnections.id, input.connectionId), eq(standxConnections.telegramUserId, input.telegramUserId), eq(standxConnections.status, "pending")))
                .limit(1);
            if (pending === undefined) {
                throw new Error("Pending connection not found");
            }
            const previous = await transaction
                .select({ id: standxConnections.id })
                .from(standxConnections)
                .where(and(eq(standxConnections.telegramUserId, input.telegramUserId), ne(standxConnections.id, input.connectionId), or(eq(standxConnections.status, "active"), eq(standxConnections.status, "paused"))));
            const previousIds = previous.map(record => record.id);
            if (previousIds.length > 0) {
                await transaction
                    .update(standxConnections)
                    .set({
                    status: "disconnected",
                    disconnectedAt: input.activatedAt,
                    updatedAt: input.activatedAt
                })
                    .where(inArray(standxConnections.id, previousIds));
                await transaction
                    .delete(encryptedCredentials)
                    .where(inArray(encryptedCredentials.connectionId, previousIds));
                await transaction.insert(auditEvents).values(previousIds.map(connectionId => ({
                    auditRef: this.generateId(),
                    telegramUserId: input.telegramUserId,
                    connectionId,
                    eventType: "standx_connection_replaced",
                    metadata: { replacementConnectionId: input.connectionId },
                    createdAt: input.activatedAt
                })));
            }
            const [active] = await transaction
                .update(standxConnections)
                .set({ status: "active", updatedAt: input.activatedAt })
                .where(and(eq(standxConnections.id, input.connectionId), eq(standxConnections.telegramUserId, input.telegramUserId), eq(standxConnections.status, "pending")))
                .returning({
                id: standxConnections.id,
                status: standxConnections.status,
                accountLabel: standxConnections.accountLabel
            });
            if (active === undefined || active.status !== "active") {
                throw new Error("Pending connection could not be activated");
            }
            await transaction.insert(accountSnapshots).values({
                id: this.generateId(),
                connectionId: input.connectionId,
                kind: "portfolio",
                payloadCiphertext: input.snapshotCiphertext,
                sourceTimestamp: input.snapshotObservedAt,
                ingestedAt: input.activatedAt
            });
            await transaction.insert(auditEvents).values({
                auditRef: this.generateId(),
                telegramUserId: input.telegramUserId,
                connectionId: input.connectionId,
                eventType: "standx_connection_activated",
                metadata: {},
                createdAt: input.activatedAt
            });
            return {
                id: active.id,
                status: active.status,
                accountLabel: active.accountLabel ?? "StandX account",
                snapshotObservedAt: input.snapshotObservedAt
            };
        });
    }
    async rollback(connectionId, telegramUserId) {
        await this.database
            .delete(standxConnections)
            .where(and(eq(standxConnections.id, connectionId), eq(standxConnections.telegramUserId, telegramUserId), eq(standxConnections.status, "pending")));
    }
    async findByOwner(connectionId, telegramUserId) {
        const [row] = await this.database
            .select({
            id: standxConnections.id,
            status: standxConnections.status,
            accountLabel: standxConnections.accountLabel,
            snapshotObservedAt: accountSnapshots.sourceTimestamp
        })
            .from(standxConnections)
            .innerJoin(accountSnapshots, eq(accountSnapshots.connectionId, standxConnections.id))
            .where(and(eq(standxConnections.id, connectionId), eq(standxConnections.telegramUserId, telegramUserId), ne(standxConnections.status, "pending")))
            .orderBy(desc(accountSnapshots.sourceTimestamp))
            .limit(1);
        if (row === undefined || row.status === "pending") {
            return null;
        }
        return {
            id: row.id,
            status: row.status,
            accountLabel: row.accountLabel ?? "StandX account",
            snapshotObservedAt: row.snapshotObservedAt
        };
    }
    async findCurrentByOwner(telegramUserId) {
        const [row] = await this.database
            .select({
            id: standxConnections.id,
            status: standxConnections.status,
            accountLabel: standxConnections.accountLabel,
            snapshotObservedAt: accountSnapshots.sourceTimestamp
        })
            .from(standxConnections)
            .innerJoin(accountSnapshots, eq(accountSnapshots.connectionId, standxConnections.id))
            .where(and(eq(standxConnections.telegramUserId, telegramUserId), or(eq(standxConnections.status, "active"), eq(standxConnections.status, "paused"))))
            .orderBy(desc(accountSnapshots.sourceTimestamp))
            .limit(1);
        if (row === undefined || (row.status !== "active" && row.status !== "paused")) {
            return null;
        }
        return {
            id: row.id,
            status: row.status,
            accountLabel: row.accountLabel ?? "StandX account",
            snapshotObservedAt: row.snapshotObservedAt
        };
    }
    async disconnect(connectionId, telegramUserId, now) {
        return this.database.transaction(async (transaction) => {
            const changed = await transaction
                .update(standxConnections)
                .set({ status: "disconnected", disconnectedAt: now, updatedAt: now })
                .where(and(eq(standxConnections.id, connectionId), eq(standxConnections.telegramUserId, telegramUserId), ne(standxConnections.status, "disconnected")))
                .returning({ id: standxConnections.id });
            if (changed.length !== 1) {
                return false;
            }
            await transaction
                .delete(encryptedCredentials)
                .where(eq(encryptedCredentials.connectionId, connectionId));
            await transaction.insert(deletionRequests).values({
                id: this.generateId(),
                telegramUserId,
                connectionId,
                status: "pending",
                requestedAt: now,
                dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000)
            });
            await transaction.insert(auditEvents).values({
                auditRef: this.generateId(),
                telegramUserId,
                connectionId,
                eventType: "standx_connection_disconnected",
                metadata: { deletionDueHours: 24 },
                createdAt: now
            });
            return true;
        });
    }
}
//# sourceMappingURL=connection-lifecycle-store.js.map