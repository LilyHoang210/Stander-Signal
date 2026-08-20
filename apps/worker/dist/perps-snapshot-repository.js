import { randomUUID } from "node:crypto";
import * as schema from "@standx/db/schema";
import { perpsBalanceSnapshots, perpsOpenOrderSnapshots, perpsPositionSnapshots } from "@standx/db/schema";
export class PostgresPerpsSnapshotRepository {
    database;
    generateId;
    constructor(database, generateId = randomUUID) {
        this.database = database;
        this.generateId = generateId;
    }
    async savePerpsSnapshot(input) {
        await this.database.transaction(async (transaction) => {
            await transaction.insert(perpsBalanceSnapshots).values({
                id: this.generateId(),
                connectionId: input.connection.id,
                accountId: input.snapshot.balance.accountId,
                balance: input.snapshot.balance.balance,
                equity: input.snapshot.balance.equity,
                isolatedBalance: input.snapshot.balance.isolatedBalance,
                isolatedUpnl: input.snapshot.balance.isolatedUpnl,
                crossBalance: input.snapshot.balance.crossBalance,
                crossMargin: input.snapshot.balance.crossMargin,
                crossUpnl: input.snapshot.balance.crossUpnl,
                crossAvailable: input.snapshot.balance.crossAvailable,
                locked: input.snapshot.balance.locked,
                upnl: input.snapshot.balance.upnl,
                pnlFreeze: input.snapshot.balance.pnlFreeze,
                sourceTier: input.snapshot.balance.sourceTier,
                sourceTimestamp: input.snapshot.balance.sourceTimestamp,
                ingestedAt: input.snapshot.balance.ingestedAt
            });
            if (input.snapshot.positions.length > 0) {
                await transaction.insert(perpsPositionSnapshots).values(input.snapshot.positions.map(position => ({
                    id: this.generateId(),
                    connectionId: input.connection.id,
                    accountId: position.accountId,
                    positionId: position.positionId,
                    symbol: position.symbol,
                    side: position.side,
                    quantity: position.quantity,
                    notional: position.notional,
                    entryPrice: position.entryPrice,
                    markPrice: position.markPrice,
                    liquidationPrice: position.liquidationPrice,
                    bankruptcyPrice: position.bankruptcyPrice,
                    liquidationFields: position.liquidationFields,
                    leverage: position.leverage,
                    marginMode: position.marginMode,
                    initialMargin: position.initialMargin,
                    holdingMargin: position.holdingMargin,
                    maintenanceMargin: position.maintenanceMargin,
                    unrealizedPnl: position.unrealizedPnl,
                    realizedPnl: position.realizedPnl,
                    marginAsset: position.marginAsset,
                    sourceTier: position.sourceTier,
                    sourceTimestamp: position.sourceTimestamp,
                    ingestedAt: position.ingestedAt
                })));
            }
            if (input.snapshot.openOrders.length > 0) {
                await transaction.insert(perpsOpenOrderSnapshots).values(input.snapshot.openOrders.map(order => ({
                    id: this.generateId(),
                    connectionId: input.connection.id,
                    accountId: order.accountId,
                    orderId: order.orderId,
                    positionId: order.positionId,
                    symbol: order.symbol,
                    side: order.side,
                    orderType: order.orderType,
                    status: order.status,
                    quantity: order.quantity,
                    filledQuantity: order.filledQuantity,
                    price: order.price,
                    averageFillPrice: order.averageFillPrice,
                    reduceOnly: order.reduceOnly,
                    sourceTier: order.sourceTier,
                    sourceTimestamp: order.sourceTimestamp,
                    ingestedAt: order.ingestedAt
                })));
            }
        });
    }
}
//# sourceMappingURL=perps-snapshot-repository.js.map