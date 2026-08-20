import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../schema.js";
import { accountSnapshots, auditEvents, deletionRequests, encryptedCredentials, standxConnections, telegramUsers } from "../schema.js";
import { PostgresConnectionLifecycleStore } from "./connection-lifecycle-store.js";
const now = new Date("2026-08-14T12:00:00Z");
const firstId = "b6955aef-3412-486d-be5e-d22577944a66";
const secondId = "f6ef706a-6df1-48ff-b151-e04f4b4e34e2";
function encryptedCredential(connectionId) {
    return {
        connectionId,
        version: 1,
        encryptedDataKey: "encrypted-key",
        iv: "iv",
        authTag: "tag",
        ciphertext: "ciphertext"
    };
}
describe("PostgresConnectionLifecycleStore", () => {
    const client = new PGlite();
    const database = drizzle(client, { schema });
    const store = new PostgresConnectionLifecycleStore(database);
    beforeAll(async () => {
        await migrate(database, { migrationsFolder: "migrations" });
    });
    beforeEach(async () => {
        await database.delete(auditEvents);
        await database.delete(deletionRequests);
        await database.delete(accountSnapshots);
        await database.delete(encryptedCredentials);
        await database.delete(standxConnections);
        await database.delete(telegramUsers);
    });
    afterAll(async () => {
        await client.close();
    });
    it("atomically activates a pending connection with its encrypted snapshot", async () => {
        await store.stage({
            id: firstId,
            telegramUserId: "42",
            accountId: "bsc_0x123456789abcdef",
            accountLabel: "bsc_0x12...cdef",
            createdAt: now
        });
        await database.insert(encryptedCredentials).values(encryptedCredential(firstId));
        const result = await store.activate({
            connectionId: firstId,
            telegramUserId: "42",
            snapshotCiphertext: "encrypted-snapshot",
            snapshotObservedAt: now,
            activatedAt: now
        });
        expect(result).toEqual({
            id: firstId,
            status: "active",
            accountLabel: "bsc_0x12...cdef",
            snapshotObservedAt: now
        });
        const snapshots = await database.select().from(accountSnapshots);
        expect(snapshots).toHaveLength(1);
        expect(snapshots[0]?.payloadCiphertext).toBe("encrypted-snapshot");
    });
    it("replaces the previous active connection and deletes its ciphertext in one transaction", async () => {
        await store.stage({ id: firstId, telegramUserId: "42", accountId: "account-1", accountLabel: "account-1", createdAt: now });
        await database.insert(encryptedCredentials).values(encryptedCredential(firstId));
        await store.activate({ connectionId: firstId, telegramUserId: "42", snapshotCiphertext: "snapshot-1", snapshotObservedAt: now, activatedAt: now });
        await store.stage({ id: secondId, telegramUserId: "42", accountId: "account-2", accountLabel: "account-2", createdAt: now });
        await database.insert(encryptedCredentials).values(encryptedCredential(secondId));
        await store.activate({ connectionId: secondId, telegramUserId: "42", snapshotCiphertext: "snapshot-2", snapshotObservedAt: now, activatedAt: now });
        const rows = await database.select({ id: standxConnections.id, status: standxConnections.status }).from(standxConnections);
        expect(rows).toEqual(expect.arrayContaining([
            { id: firstId, status: "disconnected" },
            { id: secondId, status: "active" }
        ]));
        const credentials = await database.select({ connectionId: encryptedCredentials.connectionId }).from(encryptedCredentials);
        expect(credentials).toEqual([{ connectionId: secondId }]);
        await expect(store.findCurrentByOwner("42")).resolves.toMatchObject({
            id: secondId,
            status: "active"
        });
        await expect(store.findCurrentByOwner("99")).resolves.toBeNull();
    });
    it("disconnects owner-scoped state, deletes ciphertext, and schedules deletion within 24 hours", async () => {
        await store.stage({ id: firstId, telegramUserId: "42", accountId: "account-1", accountLabel: "account-1", createdAt: now });
        await database.insert(encryptedCredentials).values(encryptedCredential(firstId));
        await store.activate({ connectionId: firstId, telegramUserId: "42", snapshotCiphertext: "snapshot-1", snapshotObservedAt: now, activatedAt: now });
        await expect(store.disconnect(firstId, "99", now)).resolves.toBe(false);
        await expect(store.disconnect(firstId, "42", now)).resolves.toBe(true);
        const credential = await database.select().from(encryptedCredentials).where(eq(encryptedCredentials.connectionId, firstId));
        expect(credential).toEqual([]);
        const [request] = await database.select().from(deletionRequests).where(and(eq(deletionRequests.connectionId, firstId), eq(deletionRequests.telegramUserId, "42")));
        expect(request?.status).toBe("pending");
        expect(request?.dueAt.getTime()).toBe(now.getTime() + 24 * 60 * 60 * 1_000);
        const audit = await database.select({ eventType: auditEvents.eventType, metadata: auditEvents.metadata }).from(auditEvents);
        expect(audit.map(event => event.eventType)).toEqual([
            "standx_connection_activated",
            "standx_connection_disconnected"
        ]);
        expect(JSON.stringify(audit)).not.toContain("snapshot-1");
        await expect(store.findByOwner(firstId, "99")).resolves.toBeNull();
        await expect(store.findByOwner(firstId, "42")).resolves.toMatchObject({ status: "disconnected" });
    });
});
//# sourceMappingURL=connection-lifecycle-store.integration.test.js.map