import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../schema.js";
import { standxConnections, telegramUsers } from "../schema.js";
import { PostgresConnectionRepository } from "./connection-repository.js";
describe("PostgresConnectionRepository", () => {
    const client = new PGlite();
    const database = drizzle(client, { schema });
    const repository = new PostgresConnectionRepository(database);
    beforeAll(async () => {
        await migrate(database, { migrationsFolder: "migrations" });
    });
    beforeEach(async () => {
        await database.delete(standxConnections);
        await database.delete(telegramUsers);
        await database.insert(telegramUsers).values([
            { telegramUserId: "10" },
            { telegramUserId: "11" }
        ]);
    });
    afterAll(async () => {
        await client.close();
    });
    it("scopes active lookup and disconnect by Telegram owner", async () => {
        const connection = {
            id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            telegramUserId: "10",
            accountId: "bsc_0x1",
            status: "active"
        };
        await repository.save(connection);
        expect(await repository.findActiveByTelegramUserId("11")).toBeNull();
        expect(await repository.disconnect(connection.id, "11")).toBe(false);
        expect(await repository.findActiveByTelegramUserId("10")).toEqual(connection);
        expect(await repository.disconnect(connection.id, "10")).toBe(true);
        const persisted = await database
            .select({ status: standxConnections.status })
            .from(standxConnections)
            .where(eq(standxConnections.id, connection.id));
        expect(persisted).toEqual([{ status: "disconnected" }]);
    });
    it("finds only active connections by connection id", async () => {
        const activeConnection = {
            id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            telegramUserId: "10",
            accountId: "bsc_0x1",
            status: "active"
        };
        const disconnectedConnection = {
            id: "3178b0c0-c2bc-418d-9143-dc5f0331c9b1",
            telegramUserId: "11",
            accountId: "bsc_0x2",
            status: "disconnected"
        };
        await repository.save(activeConnection);
        await repository.save(disconnectedConnection);
        expect(await repository.findActiveById(activeConnection.id)).toEqual(activeConnection);
        expect(await repository.findActiveById(disconnectedConnection.id)).toBeNull();
    });
    it("lists only active connections for realtime workers", async () => {
        const activeConnection = {
            id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            telegramUserId: "10",
            accountId: "bsc_0x1",
            status: "active"
        };
        const pausedConnection = {
            id: "3178b0c0-c2bc-418d-9143-dc5f0331c9b1",
            telegramUserId: "11",
            accountId: "bsc_0x2",
            status: "paused"
        };
        await repository.save(activeConnection);
        await repository.save(pausedConnection);
        expect(await repository.listActive()).toEqual([activeConnection]);
    });
});
//# sourceMappingURL=connection-repository.integration.test.js.map