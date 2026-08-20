import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@standx/db/schema";
import { riskEvaluations, standxConnections, telegramUsers, thresholdVersions } from "@standx/db/schema";
import { PostgresTelegramRiskRepository } from "./telegram-risk-repository.js";
describe("PostgresTelegramRiskRepository", () => {
    const client = new PGlite();
    const database = drizzle(client, { schema });
    const repository = new PostgresTelegramRiskRepository(database);
    beforeAll(async () => {
        await migrate(database, { migrationsFolder: "migrations" });
    });
    beforeEach(async () => {
        await database.delete(riskEvaluations);
        await database.delete(thresholdVersions);
        await database.delete(standxConnections);
        await database.delete(telegramUsers);
        await seedConnection("42", "8b42bd86-e7db-430f-a16b-a9dc67bba2c5", "standx-account-1");
        await seedConnection("99", "9b42bd86-e7db-430f-a16b-a9dc67bba2c5", "standx-account-2");
        await seedEvaluation({
            id: "11111111-1111-4111-8111-111111111111",
            connectionId: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            accountId: "standx-account-1",
            itemId: "standx-account-1",
            riskType: "cross_margin",
            severity: "safe",
            evaluatedAt: new Date("2026-08-14T08:01:30.000Z")
        });
        await seedEvaluation({
            id: "44444444-4444-4444-8444-444444444444",
            connectionId: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            accountId: "standx-account-1",
            itemId: "standx-account-1",
            riskType: "cross_margin",
            severity: "safe",
            evaluatedAt: new Date("2026-08-14T08:04:30.000Z")
        });
        await seedEvaluation({
            id: "22222222-2222-4222-8222-222222222222",
            connectionId: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            accountId: "standx-account-1",
            itemId: "position-1",
            riskType: "liquidation",
            severity: "critical",
            evaluatedAt: new Date("2026-08-14T08:02:30.000Z")
        });
        await seedEvaluation({
            id: "33333333-3333-4333-8333-333333333333",
            connectionId: "9b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            accountId: "standx-account-2",
            itemId: "position-other",
            riskType: "liquidation",
            severity: "danger",
            evaluatedAt: new Date("2026-08-14T08:03:30.000Z")
        });
    });
    it("lists only the newest risk evaluation for each risk type and item", async () => {
        await expect(repository.listLatest("42")).resolves.toEqual([
            expect.objectContaining({
                riskType: "cross_margin",
                itemId: "standx-account-1",
                severity: "safe",
                status: "evaluated",
                reasonCode: "CROSS_MARGIN_STRESS_SAFE",
                evaluatedAt: new Date("2026-08-14T08:04:30.000Z")
            }),
            expect.objectContaining({
                riskType: "liquidation",
                itemId: "position-1",
                severity: "critical",
                status: "evaluated",
                reasonCode: "LIQUIDATION_BUFFER_5M",
                reasonMessage: "Effective liquidation buffer is inside the 5-minute Q99 adverse move.",
                evaluatedAt: new Date("2026-08-14T08:02:30.000Z")
            }),
        ]);
    });
    async function seedConnection(telegramUserId, connectionId, accountId) {
        await database.insert(telegramUsers).values({ telegramUserId });
        await database.insert(standxConnections).values({
            id: connectionId,
            telegramUserId,
            accountId,
            status: "active"
        });
        await database.insert(thresholdVersions).values({
            id: "threshold-v1",
            status: "active",
            algorithmVersion: "test",
            metadata: {},
            activatedAt: new Date("2026-08-14T08:00:00.000Z")
        }).onConflictDoNothing();
    }
    async function seedEvaluation(input) {
        await database.insert(riskEvaluations).values({
            id: input.id,
            connectionId: input.connectionId,
            accountId: input.accountId,
            itemId: input.itemId,
            riskType: input.riskType,
            severity: input.severity,
            status: "evaluated",
            sourceTier: "A",
            thresholdVersionId: "threshold-v1",
            reasons: [{
                    code: input.riskType === "liquidation"
                        ? "LIQUIDATION_BUFFER_5M"
                        : "CROSS_MARGIN_STRESS_SAFE",
                    message: input.riskType === "liquidation"
                        ? "Effective liquidation buffer is inside the 5-minute Q99 adverse move."
                        : "Cross available margin covers every configured stress horizon.",
                    values: {}
                }],
            sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
            evaluatedAt: input.evaluatedAt
        });
    }
});
//# sourceMappingURL=telegram-risk-repository.test.js.map