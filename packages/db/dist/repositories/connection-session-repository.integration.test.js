import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../schema.js";
import { connectionSessions, telegramUsers } from "../schema.js";
import { PostgresConnectionSessionRepository } from "./connection-session-repository.js";
describe("PostgresConnectionSessionRepository", () => {
    const client = new PGlite();
    const database = drizzle(client, { schema });
    const repository = new PostgresConnectionSessionRepository(database);
    const now = new Date("2026-08-14T12:00:00Z");
    const record = {
        id: "50af6474-55ee-44ab-875a-65c2346d545e",
        telegramUserId: "10",
        tokenHash: "a".repeat(64),
        expiresAt: new Date("2026-08-14T12:05:00Z"),
        createdAt: now,
        usedAt: null
    };
    beforeAll(async () => {
        await migrate(database, { migrationsFolder: "migrations" });
    });
    beforeEach(async () => {
        await database.delete(connectionSessions);
        await database.delete(telegramUsers);
        await database.insert(telegramUsers).values([
            { telegramUserId: "10" },
            { telegramUserId: "11" }
        ]);
    });
    afterAll(async () => {
        await client.close();
    });
    it("atomically consumes a session once", async () => {
        await repository.create(record);
        const results = await Promise.all([
            repository.consume(record.tokenHash, "10", now),
            repository.consume(record.tokenHash, "10", now)
        ]);
        expect(results.filter(result => result.status === "consumed")).toHaveLength(1);
        expect(results.filter(result => result.status === "used")).toHaveLength(1);
    });
    it("creates the Telegram user boundary on the first Mini App session", async () => {
        await database.delete(connectionSessions);
        await database.delete(telegramUsers);
        await expect(repository.create(record)).resolves.toBeUndefined();
        await expect(repository.consume(record.tokenHash, "10", now)).resolves.toMatchObject({
            status: "consumed"
        });
    });
    it("distinguishes wrong-user and expired sessions without consuming them", async () => {
        await repository.create(record);
        await expect(repository.consume(record.tokenHash, "11", now)).resolves.toEqual({
            status: "wrong_user"
        });
        await expect(repository.consume(record.tokenHash, "10", new Date("2026-08-14T12:05:00Z"))).resolves.toEqual({ status: "expired" });
    });
});
//# sourceMappingURL=connection-session-repository.integration.test.js.map