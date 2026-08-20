import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../schema.js";
import { encryptedCredentials, standxConnections, telegramUsers } from "../schema.js";
import { PostgresCredentialRepository } from "./credential-repository.js";
describe("PostgresCredentialRepository", () => {
    const client = new PGlite();
    const database = drizzle(client, { schema });
    const repository = new PostgresCredentialRepository(database);
    const connectionId = "b6955aef-3412-486d-be5e-d22577944a66";
    const record = {
        connectionId,
        telegramUserId: "42",
        envelope: {
            version: 1,
            encryptedDataKey: "ZW5jcnlwdGVkLWtleQ==",
            iv: "aXY=",
            authTag: "dGFn",
            ciphertext: "Y2lwaGVydGV4dA=="
        }
    };
    beforeAll(async () => {
        await migrate(database, { migrationsFolder: "migrations" });
    });
    beforeEach(async () => {
        await database.delete(encryptedCredentials);
        await database.delete(standxConnections);
        await database.delete(telegramUsers);
        await database.insert(telegramUsers).values({ telegramUserId: "42" });
        await database.insert(standxConnections).values({
            id: connectionId,
            telegramUserId: "42",
            accountId: "bsc_0x1",
            status: "active"
        });
    });
    afterAll(async () => {
        await client.close();
    });
    it("stores and retrieves envelope fields with owner context", async () => {
        await repository.store(record);
        await expect(repository.find(connectionId)).resolves.toEqual(record);
        const rows = await database.select().from(encryptedCredentials);
        expect(JSON.stringify(rows)).not.toContain("secret-token");
    });
    it("deletes credential access idempotently", async () => {
        await repository.store(record);
        await expect(repository.delete(connectionId)).resolves.toBe(true);
        await expect(repository.delete(connectionId)).resolves.toBe(false);
        await expect(repository.find(connectionId)).resolves.toBeNull();
    });
    it("fails closed on an unsupported envelope version", async () => {
        await database.insert(encryptedCredentials).values({
            connectionId,
            version: 2,
            encryptedDataKey: "key",
            iv: "iv",
            authTag: "tag",
            ciphertext: "ciphertext"
        });
        await expect(repository.find(connectionId)).rejects.toThrow(/version/i);
    });
});
//# sourceMappingURL=credential-repository.integration.test.js.map