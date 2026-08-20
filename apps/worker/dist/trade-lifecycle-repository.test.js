import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it } from "vitest";
import * as schema from "@standx/db/schema";
import { perpsBalanceSnapshots, perpsPositionSnapshots, standxConnections, telegramUsers, tradeLifecycleEvents } from "@standx/db/schema";
import { PostgresTradeLifecycleRepository } from "./trade-lifecycle-repository.js";
const connectionId = "00000000-0000-4000-8000-000000000001";
function decimal(value) {
    return value;
}
describe("PostgresTradeLifecycleRepository", () => {
    const clients = [];
    afterEach(async () => {
        await Promise.all(clients.map(client => client.close()));
        clients.length = 0;
    });
    async function createDatabase() {
        const client = new PGlite();
        clients.push(client);
        const database = drizzle(client, { schema });
        await migrate(database, { migrationsFolder: "migrations" });
        await database.insert(telegramUsers).values({ telegramUserId: "1001", username: null });
        await database.insert(standxConnections).values({
            id: connectionId,
            telegramUserId: "1001",
            accountId: "account-1",
            accountLabel: "account-1",
            status: "active"
        });
        return database;
    }
    it("dedupes lifecycle candidates by deduplication key", async () => {
        const database = await createDatabase();
        const repository = new PostgresTradeLifecycleRepository(database, () => "11111111-1111-4111-8111-111111111111");
        const candidate = lifecycleCandidate();
        const first = await repository.insertPending(candidate);
        const second = await repository.insertPending(candidate);
        expect(first).not.toBeNull();
        expect(second).toBeNull();
        expect(await database.select().from(tradeLifecycleEvents)).toHaveLength(1);
    });
    it("loads the latest two comparable position snapshots", async () => {
        const database = await createDatabase();
        const repository = new PostgresTradeLifecycleRepository(database);
        const older = new Date("2026-08-12T17:23:00.000Z");
        const previous = new Date("2026-08-12T17:24:00.000Z");
        const latest = new Date("2026-08-12T17:25:00.000Z");
        await insertBalance(database, older);
        await insertBalance(database, previous);
        await insertBalance(database, latest);
        await insertPosition(database, previous, "standx-position-1");
        await insertPosition(database, latest, "standx-position-2");
        const snapshots = await repository.loadComparablePositionSnapshots(connectionId);
        expect(snapshots?.previousPositions.map(position => position.positionId)).toEqual([
            "standx-position-1"
        ]);
        expect(snapshots?.latestPositions.map(position => position.positionId)).toEqual([
            "standx-position-2"
        ]);
    });
});
function lifecycleCandidate() {
    return {
        connectionId,
        telegramUserId: "1001",
        accountId: "account-1",
        positionKey: "standx-position-1",
        symbol: "AIXBTUSDC",
        side: "long",
        eventType: "opened",
        closeReason: null,
        confidence: "high",
        entryPrice: decimal("0.018848"),
        exitPrice: null,
        quantity: decimal("3183"),
        leverage: decimal("3"),
        collateral: decimal("20.00"),
        realizedPnl: null,
        realizedPnlPct: null,
        fee: null,
        openedAt: new Date("2026-08-12T17:24:00.000Z"),
        closedAt: null,
        sourceTimestamp: new Date("2026-08-12T17:24:00.000Z"),
        detectedAt: new Date("2026-08-12T17:25:00.000Z"),
        deduplicationKey: "connection:position:opened:time",
        rawEvidence: { source: "test" }
    };
}
async function insertBalance(database, ingestedAt) {
    await database.insert(perpsBalanceSnapshots).values({
        id: crypto.randomUUID(),
        connectionId,
        accountId: "account-1",
        balance: "100",
        equity: "100",
        isolatedBalance: "0",
        isolatedUpnl: "0",
        crossBalance: "100",
        crossMargin: "20",
        crossUpnl: "0",
        crossAvailable: "80",
        locked: "0",
        upnl: "0",
        pnlFreeze: "0",
        sourceTier: "A",
        sourceTimestamp: ingestedAt,
        ingestedAt
    });
}
async function insertPosition(database, ingestedAt, positionId) {
    await database.insert(perpsPositionSnapshots).values({
        id: crypto.randomUUID(),
        connectionId,
        accountId: "account-1",
        positionId,
        symbol: "AIXBTUSDC",
        side: "long",
        quantity: "3183",
        notional: "60",
        entryPrice: "0.018848",
        markPrice: "0.018848",
        liquidationPrice: "0.01",
        bankruptcyPrice: null,
        liquidationFields: "supported",
        leverage: "3",
        marginMode: "cross",
        initialMargin: "20.00",
        holdingMargin: "20.00",
        maintenanceMargin: "1.00",
        unrealizedPnl: "0",
        realizedPnl: "0",
        marginAsset: "USDC",
        sourceTier: "A",
        sourceTimestamp: ingestedAt,
        ingestedAt
    });
}
//# sourceMappingURL=trade-lifecycle-repository.test.js.map