import { detectTradeLifecycleEvents } from "@standx/scanner/trade-lifecycle-detector";
import { formatTradeClosedNotification, formatTradeOpenedNotification } from "@standx/telegram/trade-messages";
export class PostgresTradeLifecycleService {
    options;
    now;
    constructor(options) {
        this.options = options;
        this.now = options.now ?? (() => new Date());
    }
    async processConnection(connectionId, connection) {
        const snapshots = await this.options.repository.loadComparablePositionSnapshots(connectionId);
        if (snapshots === null) {
            return { status: "skipped_missing_snapshots", connectionId };
        }
        const recentTrades = await this.options.credentials.withLease(connectionId, async (token) => this.options.standxClient.queryTrades(token));
        const candidates = detectTradeLifecycleEvents({
            connectionId,
            telegramUserId: connection.telegramUserId,
            accountId: connection.accountId,
            previousPositions: snapshots.previousPositions,
            latestPositions: snapshots.latestPositions,
            recentTrades: recentTrades.result,
            detectedAt: this.now()
        });
        let insertedCount = 0;
        let sentCount = 0;
        for (const candidate of candidates) {
            const event = await this.options.repository.insertPending(candidate);
            if (event === null) {
                continue;
            }
            insertedCount += 1;
            if (!this.options.financialAlertsEnabled) {
                await this.options.repository.markSuppressed(event.id);
                continue;
            }
            const sent = await this.send(event);
            if (sent) {
                sentCount += 1;
            }
        }
        return {
            status: "processed",
            connectionId,
            candidateCount: candidates.length,
            insertedCount,
            sentCount
        };
    }
    async send(event) {
        const chatId = Number(event.telegramUserId);
        if (!Number.isSafeInteger(chatId)) {
            await this.options.repository.markFailed(event.id);
            return false;
        }
        const result = await this.options.telegramSender.sendTelegramMessage({
            chatId,
            text: event.eventType === "opened"
                ? formatTradeOpenedNotification({
                    symbol: event.symbol,
                    side: event.side,
                    leverage: event.leverage,
                    collateral: event.collateral,
                    collateralAsset: "USDC",
                    entryPrice: event.entryPrice,
                    quantity: event.quantity,
                    sourceTimestamp: event.sourceTimestamp
                })
                : formatTradeClosedNotification({
                    symbol: event.symbol,
                    side: event.side,
                    closeReason: event.closeReason ?? "unknown",
                    leverage: event.leverage,
                    entryPrice: event.entryPrice,
                    exitPrice: event.exitPrice,
                    quantity: event.quantity,
                    realizedPnl: event.realizedPnl,
                    realizedPnlPct: event.realizedPnlPct,
                    fee: event.fee,
                    heldSeconds: heldSeconds(event.openedAt, event.closedAt),
                    sourceTimestamp: event.sourceTimestamp
                })
        });
        if (result.ok) {
            await this.options.repository.markSent(event.id, result.providerMessageId ?? null);
            return true;
        }
        await this.options.repository.markFailed(event.id);
        return false;
    }
}
function heldSeconds(openedAt, closedAt) {
    if (openedAt === null || closedAt === null) {
        return null;
    }
    return Math.max(0, Math.floor((closedAt.getTime() - openedAt.getTime()) / 1000));
}
//# sourceMappingURL=trade-lifecycle-service.js.map