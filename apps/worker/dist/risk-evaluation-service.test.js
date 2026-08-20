import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@standx/db/schema";
import { alertDeliveries, alerts, perpsBalanceSnapshots, perpsOpenOrderSnapshots, perpsPositionSnapshots, riskEvaluations, riskStates, standxConnections, telegramUsers, thresholdVersions } from "@standx/db/schema";
import { createDirectRiskEvaluationQueue, PostgresRiskEvaluationService } from "./risk-evaluation-service.js";
const decimal = (value) => value;
const connection = {
    id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
    telegramUserId: "42",
    accountId: "standx-account-abcdef1234567890",
    accountLabel: "standx-main",
    status: "active"
};
describe("PostgresRiskEvaluationService", () => {
    const client = new PGlite();
    const database = drizzle(client, { schema });
    let idCounter = 0;
    let now = new Date("2026-08-15T08:00:30.000Z");
    beforeAll(async () => {
        await migrate(database, { migrationsFolder: "migrations" });
    });
    beforeEach(async () => {
        await database.delete(alertDeliveries);
        await database.delete(alerts);
        await database.delete(riskStates);
        await database.delete(riskEvaluations);
        await database.delete(perpsOpenOrderSnapshots);
        await database.delete(perpsPositionSnapshots);
        await database.delete(perpsBalanceSnapshots);
        await database.delete(thresholdVersions);
        await database.delete(standxConnections);
        await database.delete(telegramUsers);
        await database.insert(telegramUsers).values({ telegramUserId: connection.telegramUserId });
        await database.insert(standxConnections).values(connection);
        idCounter = 0;
        now = new Date("2026-08-15T08:00:30.000Z");
    });
    it("persists a critical liquidation alert candidate without sending Telegram while financial alerts are disabled", async () => {
        await insertPerpsSnapshot({
            ingestedAt: new Date("2026-08-15T08:00:00.000Z"),
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            markPrice: decimal("100"),
            liquidationPrice: decimal("99.6")
        });
        const sentTexts = [];
        const service = createService(sentTexts);
        await expect(service.evaluateConnection(connection.id)).resolves.toMatchObject({
            status: "evaluated",
            connectionId: connection.id,
            evaluationCount: 2
        });
        const persistedEvaluations = await database.select().from(riskEvaluations);
        expect(persistedEvaluations).toHaveLength(2);
        expect(persistedEvaluations).toEqual(expect.arrayContaining([
            expect.objectContaining({
                connectionId: connection.id,
                itemId: "position-1",
                riskType: "liquidation",
                severity: "critical",
                status: "evaluated"
            })
        ]));
        expect(await database.select().from(riskStates)).toEqual([
            expect.objectContaining({
                connectionId: connection.id,
                itemId: "position-1",
                riskType: "liquidation",
                severity: "critical",
                status: "notified"
            })
        ]);
        expect(await database.select().from(alerts)).toEqual([
            expect.objectContaining({
                telegramUserId: connection.telegramUserId,
                severity: "critical",
                status: "candidate"
            })
        ]);
        expect(await database.select().from(alertDeliveries)).toHaveLength(0);
        expect(sentTexts).toEqual([]);
    });
    it("does not create duplicate alert rows for repeated critical evaluations before the reminder interval", async () => {
        await insertPerpsSnapshot({
            ingestedAt: new Date("2026-08-15T08:00:00.000Z"),
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            markPrice: decimal("100"),
            liquidationPrice: decimal("99.6")
        });
        const service = createService([]);
        await service.evaluateConnection(connection.id);
        now = new Date("2026-08-15T08:01:00.000Z");
        await service.evaluateConnection(connection.id);
        expect(await database.select().from(alerts)).toHaveLength(1);
    });
    it("suppresses financial alerts when the latest account data is stale", async () => {
        await insertPerpsSnapshot({
            ingestedAt: new Date("2026-08-15T07:57:00.000Z"),
            sourceTimestamp: new Date("2026-08-15T07:57:00.000Z"),
            markPrice: decimal("100"),
            liquidationPrice: decimal("99.6")
        });
        const service = createService([]);
        await service.evaluateConnection(connection.id);
        expect(await database.select().from(riskEvaluations)).toEqual(expect.arrayContaining([
            expect.objectContaining({
                riskType: "liquidation",
                severity: "safe",
                status: "suppressed_stale"
            })
        ]));
        expect(await database.select().from(alerts)).toHaveLength(0);
    });
    it("persists the system-managed auto-risk-v1 threshold version", async () => {
        await insertPerpsSnapshot({
            ingestedAt: new Date("2026-08-15T08:00:00.000Z"),
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            markPrice: decimal("100"),
            liquidationPrice: decimal("90")
        });
        const service = createService([]);
        await service.evaluateConnection(connection.id);
        const versions = await database.select().from(thresholdVersions);
        expect(versions).toEqual([
            expect.objectContaining({
                id: "auto-risk-v1",
                status: "active",
                algorithmVersion: "auto-risk-v1"
            })
        ]);
        expect(versions[0]?.metadata).toMatchObject({
            systemManaged: true,
            accountDataFreshnessSeconds: 120,
            exitSlippagePct: "0.00500000000000000000",
            adverseMoves: {
                m5: "0.01000000000000000000",
                m15: "0.03000000000000000000",
                m60: "0.06000000000000000000"
            },
            crossMarginStress: {
                diversificationCredit: false,
                method: "sum(abs(quantity) * markPrice * adverseMove)"
            },
            marketDangerSignals: {
                status: "skipped_when_unavailable_or_stale",
                supportedSignals: [
                    "extreme_spread",
                    "weak_closing_side_depth",
                    "high_estimated_exit_slippage",
                    "adverse_funding",
                    "mark_index_divergence",
                    "open_interest_shock_with_adverse_price",
                    "high_short_horizon_volatility"
                ]
            }
        });
    });
    it("persists position-quality reasons after liquidation evaluation", async () => {
        await insertPerpsSnapshot({
            ingestedAt: new Date("2026-08-15T08:00:00.000Z"),
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            markPrice: decimal("100"),
            liquidationPrice: decimal("93.5"),
            balance: { equity: decimal("10000") },
            position: {
                leverage: decimal("15"),
                notional: decimal("8000"),
                initialMargin: decimal("533.33333333333333333333"),
                holdingMargin: decimal("533.33333333333333333333")
            }
        });
        const service = createService([]);
        await service.evaluateConnection(connection.id);
        const persistedEvaluations = await database.select().from(riskEvaluations);
        const liquidation = persistedEvaluations.find(evaluation => evaluation.riskType === "liquidation");
        expect(liquidation).toMatchObject({
            thresholdVersionId: "auto-risk-v1",
            severity: "warning"
        });
        expect(JSON.stringify(liquidation?.reasons)).toContain("POSITION_QUALITY_HIGH_LEVERAGE");
    });
    it("persists and sends a stop loss proximity alert for positions close to an active SL order", async () => {
        await insertPerpsSnapshot({
            ingestedAt: new Date("2026-08-15T08:00:00.000Z"),
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            markPrice: decimal("100"),
            liquidationPrice: decimal("50")
        });
        await insertOpenOrderSnapshot({
            ingestedAt: new Date("2026-08-15T08:00:00.000Z"),
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            price: decimal("99.95")
        });
        const sentTexts = [];
        const service = createService(sentTexts, { financialAlertsEnabled: true });
        await expect(service.evaluateConnection(connection.id)).resolves.toMatchObject({
            status: "evaluated",
            evaluationCount: 3
        });
        const persistedEvaluations = await database.select().from(riskEvaluations);
        expect(persistedEvaluations).toEqual(expect.arrayContaining([
            expect.objectContaining({
                connectionId: connection.id,
                itemId: "position-1",
                riskType: "stop_loss_proximity",
                severity: "critical",
                status: "evaluated"
            })
        ]));
        const alertRows = await database.select().from(alerts);
        expect(alertRows).toEqual([
            expect.objectContaining({
                telegramUserId: connection.telegramUserId,
                severity: "critical",
                status: "notified"
            })
        ]);
        expect(alertRows[0]?.message).toContain("🚨 Stop Loss Risk — Critical");
        expect(await database.select().from(alertDeliveries)).toEqual([
            expect.objectContaining({
                status: "sent",
                providerMessageId: "telegram-message-1"
            })
        ]);
        expect(sentTexts).toHaveLength(1);
        expect(sentTexts[0]).toContain("🚨 Stop Loss Risk — Critical");
        expect(sentTexts[0]).toContain("Asset: BTC");
        expect(sentTexts[0]).toContain("Direction: LONG 📈");
        expect(sentTexts[0]).toContain("Mark Price: $100");
        expect(sentTexts[0]).toContain("Stop Loss: $99.95");
        expect(sentTexts[0]).toContain("Distance to SL: 0.05%");
        expect(sentTexts[0]).toContain("Action: Position is extremely close to Stop Loss.");
        expect(sentTexts[0]).not.toContain("Account: standx-main");
        expect(sentTexts[0]).not.toContain("CRITICAL stop loss proximity");
        expect(sentTexts[0]).not.toContain("NOTIFY CRITICAL stop_loss_proximity");
    });
    it("does not create market-danger evaluations when no fresh market source is wired", async () => {
        await insertPerpsSnapshot({
            ingestedAt: new Date("2026-08-15T08:00:00.000Z"),
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            markPrice: decimal("100"),
            liquidationPrice: decimal("90")
        });
        const service = createService([]);
        await service.evaluateConnection(connection.id);
        const persistedEvaluations = await database.select().from(riskEvaluations);
        expect(persistedEvaluations.some(evaluation => evaluation.riskType === "market_danger")).toBe(false);
        expect(JSON.stringify(persistedEvaluations.map(evaluation => evaluation.reasons))).not.toContain("MARKET_DANGER");
    });
    function createService(sentTexts, overrides = {}) {
        return new PostgresRiskEvaluationService(database, {
            now: () => now,
            generateId: () => {
                idCounter += 1;
                return `11111111-1111-4111-8111-${String(idCounter).padStart(12, "0")}`;
            },
            financialAlertsEnabled: overrides.financialAlertsEnabled ?? false,
            sendTelegramAlert: job => {
                sentTexts.push(job.text);
                return Promise.resolve({ ok: true, status: 200, providerMessageId: "telegram-message-1" });
            }
        });
    }
    async function insertPerpsSnapshot(input) {
        await database.insert(perpsBalanceSnapshots).values({
            id: "22222222-2222-4222-8222-222222222222",
            connectionId: connection.id,
            accountId: connection.accountId,
            balance: decimal("1000"),
            equity: decimal("1000"),
            isolatedBalance: decimal("1000"),
            isolatedUpnl: decimal("0"),
            crossBalance: decimal("0"),
            crossMargin: decimal("0"),
            crossUpnl: decimal("0"),
            crossAvailable: decimal("0"),
            locked: decimal("0"),
            upnl: decimal("0"),
            pnlFreeze: decimal("0"),
            sourceTier: "A",
            sourceTimestamp: input.sourceTimestamp,
            ingestedAt: input.ingestedAt,
            ...input.balance
        });
        await database.insert(perpsPositionSnapshots).values({
            id: "33333333-3333-4333-8333-333333333333",
            connectionId: connection.id,
            accountId: connection.accountId,
            positionId: "position-1",
            symbol: "BTC-USD",
            side: "long",
            quantity: decimal("1"),
            notional: decimal("100"),
            entryPrice: decimal("100"),
            markPrice: input.markPrice,
            liquidationPrice: input.liquidationPrice,
            bankruptcyPrice: decimal("98"),
            liquidationFields: "supported",
            leverage: decimal("10"),
            marginMode: "isolated",
            initialMargin: decimal("10"),
            holdingMargin: decimal("10"),
            maintenanceMargin: decimal("5"),
            unrealizedPnl: decimal("0"),
            realizedPnl: decimal("0"),
            marginAsset: "DUSD",
            sourceTier: "A",
            sourceTimestamp: input.sourceTimestamp,
            ingestedAt: input.ingestedAt,
            ...input.position
        });
    }
    async function insertOpenOrderSnapshot(input) {
        await database.insert(perpsOpenOrderSnapshots).values({
            id: "44444444-4444-4444-8444-444444444444",
            connectionId: connection.id,
            accountId: connection.accountId,
            orderId: "standx-order-1",
            positionId: "position-1",
            symbol: "BTC-USD",
            side: "sell",
            orderType: "market",
            status: "untriggered",
            quantity: decimal("0"),
            filledQuantity: decimal("0"),
            price: input.price,
            averageFillPrice: decimal("0"),
            reduceOnly: true,
            sourceTier: "A",
            sourceTimestamp: input.sourceTimestamp,
            ingestedAt: input.ingestedAt,
            ...input.order
        });
    }
});
describe("createDirectRiskEvaluationQueue", () => {
    it("reports evaluator errors without failing the completed account scan", async () => {
        const onError = vi.fn();
        const queue = createDirectRiskEvaluationQueue({
            evaluateConnection: () => Promise.reject(new Error("database is temporarily unavailable"))
        }, onError);
        await expect(queue.enqueueEvaluateAccount("connection-1")).resolves.toBeUndefined();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), "connection-1");
    });
});
//# sourceMappingURL=risk-evaluation-service.test.js.map