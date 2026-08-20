import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import * as schema from "@standx/db/schema";
import { perpsBalanceSnapshots, perpsPositionSnapshots, tradeLifecycleEvents } from "@standx/db/schema";
export class PostgresTradeLifecycleRepository {
    database;
    generateId;
    constructor(database, generateId = randomUUID) {
        this.database = database;
        this.generateId = generateId;
    }
    async loadComparablePositionSnapshots(connectionId) {
        const balanceRows = await this.database
            .select({ ingestedAt: perpsBalanceSnapshots.ingestedAt })
            .from(perpsBalanceSnapshots)
            .where(eq(perpsBalanceSnapshots.connectionId, connectionId))
            .orderBy(desc(perpsBalanceSnapshots.ingestedAt))
            .limit(2);
        if (balanceRows.length < 2) {
            return null;
        }
        const latestRow = balanceRows.at(0);
        const previousRow = balanceRows.at(1);
        if (latestRow === undefined || previousRow === undefined) {
            return null;
        }
        return {
            latestPositions: await this.loadPositionsAt(connectionId, latestRow.ingestedAt),
            previousPositions: await this.loadPositionsAt(connectionId, previousRow.ingestedAt)
        };
    }
    async insertPending(candidate) {
        const [row] = await this.database
            .insert(tradeLifecycleEvents)
            .values({
            id: this.generateId(),
            connectionId: candidate.connectionId,
            telegramUserId: candidate.telegramUserId,
            accountId: candidate.accountId,
            positionKey: candidate.positionKey,
            symbol: candidate.symbol,
            side: candidate.side,
            eventType: candidate.eventType,
            closeReason: candidate.closeReason,
            confidence: candidate.confidence,
            entryPrice: candidate.entryPrice,
            exitPrice: candidate.exitPrice,
            quantity: candidate.quantity,
            leverage: candidate.leverage,
            collateral: candidate.collateral,
            realizedPnl: candidate.realizedPnl,
            realizedPnlPct: candidate.realizedPnlPct,
            fee: candidate.fee,
            openedAt: candidate.openedAt,
            closedAt: candidate.closedAt,
            sourceTimestamp: candidate.sourceTimestamp,
            detectedAt: candidate.detectedAt,
            notificationStatus: "pending",
            providerMessageId: null,
            rawEvidence: candidate.rawEvidence,
            deduplicationKey: candidate.deduplicationKey
        })
            .onConflictDoNothing({ target: tradeLifecycleEvents.deduplicationKey })
            .returning();
        return row ?? null;
    }
    async markSent(id, providerMessageId) {
        await this.database
            .update(tradeLifecycleEvents)
            .set({ notificationStatus: "sent", providerMessageId, updatedAt: new Date() })
            .where(eq(tradeLifecycleEvents.id, id));
    }
    async markSuppressed(id) {
        await this.database
            .update(tradeLifecycleEvents)
            .set({ notificationStatus: "suppressed", updatedAt: new Date() })
            .where(eq(tradeLifecycleEvents.id, id));
    }
    async markFailed(id) {
        await this.database
            .update(tradeLifecycleEvents)
            .set({ notificationStatus: "failed", updatedAt: new Date() })
            .where(eq(tradeLifecycleEvents.id, id));
    }
    async loadPositionsAt(connectionId, ingestedAt) {
        const rows = await this.database
            .select()
            .from(perpsPositionSnapshots)
            .where(and(eq(perpsPositionSnapshots.connectionId, connectionId), eq(perpsPositionSnapshots.ingestedAt, ingestedAt)));
        return rows.map(row => ({
            accountId: row.accountId,
            positionId: row.positionId,
            symbol: row.symbol,
            side: row.side,
            quantity: row.quantity,
            notional: row.notional,
            entryPrice: row.entryPrice,
            markPrice: row.markPrice,
            liquidationPrice: row.liquidationPrice,
            bankruptcyPrice: row.bankruptcyPrice,
            liquidationFields: row.liquidationFields,
            leverage: row.leverage,
            marginMode: row.marginMode,
            initialMargin: row.initialMargin,
            holdingMargin: row.holdingMargin,
            maintenanceMargin: row.maintenanceMargin,
            unrealizedPnl: row.unrealizedPnl,
            realizedPnl: row.realizedPnl,
            marginAsset: row.marginAsset,
            sourceTimestamp: row.sourceTimestamp,
            ingestedAt: row.ingestedAt,
            sourceTier: row.sourceTier
        }));
    }
}
//# sourceMappingURL=trade-lifecycle-repository.js.map