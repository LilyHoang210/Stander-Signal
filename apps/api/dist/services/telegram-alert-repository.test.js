import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@standx/db/schema";
import { alerts, riskEvaluations, riskStates, standxConnections, telegramUsers, thresholdVersions } from "@standx/db/schema";
import { PostgresTelegramAlertRepository } from "./telegram-alert-repository.js";
describe("PostgresTelegramAlertRepository", () => {
    const client = new PGlite();
    const database = drizzle(client, { schema });
    const repository = new PostgresTelegramAlertRepository(database);
    beforeAll(async () => {
        await migrate(database, { migrationsFolder: "migrations" });
    });
    beforeEach(async () => {
        await database.delete(alerts);
        await database.delete(riskStates);
        await database.delete(riskEvaluations);
        await database.delete(thresholdVersions);
        await database.delete(standxConnections);
        await database.delete(telegramUsers);
        await seedAlert({
            itemId: "position-1",
            status: "candidate",
            createdAt: new Date("2026-08-14T08:01:00.000Z")
        });
        await seedAlert({
            itemId: "position-2",
            status: "recovered",
            createdAt: new Date("2026-08-14T08:02:00.000Z")
        });
    });
    it("lists only active alerts for a Telegram user", async () => {
        await expect(repository.listActive("42")).resolves.toEqual([
            expect.objectContaining({
                severity: "critical",
                riskType: "liquidation",
                itemId: "position-1",
                status: "candidate",
                message: "NOTIFY CRITICAL liquidation",
                createdAt: new Date("2026-08-14T08:01:00.000Z")
            })
        ]);
    });
    async function seedAlert(input) {
        await database.insert(telegramUsers).values({ telegramUserId: "42" }).onConflictDoNothing();
        await database.insert(standxConnections).values({
            id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            telegramUserId: "42",
            accountId: "standx-account",
            status: "active"
        }).onConflictDoNothing();
        await database.insert(thresholdVersions).values({
            id: "threshold-v1",
            status: "active",
            algorithmVersion: "test",
            metadata: {},
            activatedAt: new Date("2026-08-14T08:00:00.000Z")
        }).onConflictDoNothing();
        await database.insert(riskEvaluations).values({
            id: input.status === "candidate"
                ? "11111111-1111-4111-8111-111111111111"
                : "22222222-2222-4222-8222-222222222222",
            connectionId: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            accountId: "standx-account",
            itemId: input.itemId,
            riskType: "liquidation",
            severity: "critical",
            status: "evaluated",
            sourceTier: "A",
            thresholdVersionId: "threshold-v1",
            reasons: [],
            sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
            evaluatedAt: new Date("2026-08-14T08:00:30.000Z")
        });
        await database.insert(riskStates).values({
            id: input.status === "candidate"
                ? "33333333-3333-4333-8333-333333333333"
                : "44444444-4444-4444-8444-444444444444",
            connectionId: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            accountId: "standx-account",
            itemId: input.itemId,
            riskType: "liquidation",
            thresholdVersionId: "threshold-v1",
            severity: "critical",
            status: input.status,
            materialValues: {}
        });
        await database.insert(alerts).values({
            id: input.status === "candidate"
                ? "55555555-5555-4555-8555-555555555555"
                : "66666666-6666-4666-8666-666666666666",
            riskStateId: input.status === "candidate"
                ? "33333333-3333-4333-8333-333333333333"
                : "44444444-4444-4444-8444-444444444444",
            evaluationId: input.status === "candidate"
                ? "11111111-1111-4111-8111-111111111111"
                : "22222222-2222-4222-8222-222222222222",
            telegramUserId: "42",
            severity: "critical",
            status: input.status,
            message: input.status === "candidate" ? "NOTIFY CRITICAL liquidation" : "RECOVERED",
            createdAt: input.createdAt
        });
    }
});
//# sourceMappingURL=telegram-alert-repository.test.js.map