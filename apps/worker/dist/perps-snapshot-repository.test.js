import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@standx/db/schema";
import { perpsBalanceSnapshots, perpsOpenOrderSnapshots, perpsPositionSnapshots, standxConnections, telegramUsers } from "@standx/db/schema";
import { PostgresPerpsSnapshotRepository } from "./perps-snapshot-repository.js";
const decimal = (value) => value;
const connection = {
    id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
    telegramUserId: "42",
    accountId: "bsc_0x1",
    status: "active"
};
const snapshot = {
    accountId: "bsc_0x1",
    balance: {
        accountId: "bsc_0x1",
        balance: decimal("1000"),
        equity: decimal("1010"),
        isolatedBalance: decimal("0"),
        isolatedUpnl: decimal("0"),
        crossBalance: decimal("1000"),
        crossMargin: decimal("100"),
        crossUpnl: decimal("10"),
        crossAvailable: decimal("900"),
        locked: decimal("0"),
        upnl: decimal("10"),
        pnlFreeze: decimal("0"),
        sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
        ingestedAt: new Date("2026-08-15T08:00:01.000Z"),
        sourceTier: "A"
    },
    positions: [{
            accountId: "bsc_0x1",
            positionId: "standx-position-1",
            symbol: "BTC-USD",
            side: "long",
            quantity: decimal("1"),
            notional: decimal("100"),
            entryPrice: decimal("100"),
            markPrice: decimal("101"),
            liquidationPrice: decimal("90"),
            bankruptcyPrice: decimal("80"),
            liquidationFields: "supported",
            leverage: decimal("10"),
            marginMode: "cross",
            initialMargin: decimal("10"),
            holdingMargin: decimal("10"),
            maintenanceMargin: decimal("5"),
            unrealizedPnl: decimal("1"),
            realizedPnl: decimal("0"),
            marginAsset: "DUSD",
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            ingestedAt: new Date("2026-08-15T08:00:01.000Z"),
            sourceTier: "A"
        }],
    openOrders: [{
            accountId: "bsc_0x1",
            orderId: "standx-order-1",
            positionId: "standx-position-1",
            symbol: "BTC-USD",
            side: "buy",
            orderType: "limit",
            status: "open",
            quantity: decimal("1"),
            filledQuantity: decimal("0"),
            price: decimal("99"),
            averageFillPrice: decimal("0"),
            reduceOnly: false,
            sourceTimestamp: new Date("2026-08-15T08:00:00.000Z"),
            ingestedAt: new Date("2026-08-15T08:00:01.000Z"),
            sourceTier: "A"
        }],
    observedAt: new Date("2026-08-15T08:00:00.000Z"),
    ingestedAt: new Date("2026-08-15T08:00:01.000Z")
};
describe("PostgresPerpsSnapshotRepository", () => {
    const client = new PGlite();
    const database = drizzle(client, { schema });
    const repository = new PostgresPerpsSnapshotRepository(database, () => "11111111-1111-4111-8111-111111111111");
    beforeAll(async () => {
        await migrate(database, { migrationsFolder: "migrations" });
    });
    beforeEach(async () => {
        await database.delete(perpsOpenOrderSnapshots);
        await database.delete(perpsPositionSnapshots);
        await database.delete(perpsBalanceSnapshots);
        await database.delete(standxConnections);
        await database.delete(telegramUsers);
        await database.insert(telegramUsers).values({ telegramUserId: connection.telegramUserId });
        await database.insert(standxConnections).values(connection);
    });
    afterAll(async () => {
        await client.close();
    });
    it("persists balance, position, and open-order snapshots in one call", async () => {
        await repository.savePerpsSnapshot({ connection, snapshot });
        expect(await database.select().from(perpsBalanceSnapshots)).toHaveLength(1);
        expect(await database.select().from(perpsPositionSnapshots)).toHaveLength(1);
        expect(await database.select().from(perpsOpenOrderSnapshots)).toHaveLength(1);
    });
});
//# sourceMappingURL=perps-snapshot-repository.test.js.map