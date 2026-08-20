export function detectTradeLifecycleEvents(input) {
    const previousByKey = new Map(input.previousPositions.map(position => [positionKey(position), position]));
    const latestByKey = new Map(input.latestPositions.map(position => [positionKey(position), position]));
    const opened = input.latestPositions
        .filter(position => !previousByKey.has(positionKey(position)))
        .map(position => openedCandidate(input, position));
    const closed = input.previousPositions
        .filter(position => !latestByKey.has(positionKey(position)))
        .map(position => closedCandidate(input, position));
    return [...opened, ...closed];
}
function openedCandidate(input, position) {
    const key = positionKey(position);
    return {
        connectionId: input.connectionId,
        telegramUserId: input.telegramUserId,
        accountId: input.accountId,
        positionKey: key,
        symbol: position.symbol,
        side: position.side,
        eventType: "opened",
        closeReason: null,
        confidence: "high",
        entryPrice: position.entryPrice,
        exitPrice: null,
        quantity: absoluteDecimal(position.quantity),
        leverage: position.leverage,
        collateral: position.initialMargin,
        realizedPnl: null,
        realizedPnlPct: null,
        fee: null,
        openedAt: position.sourceTimestamp,
        closedAt: null,
        sourceTimestamp: position.sourceTimestamp,
        detectedAt: input.detectedAt,
        deduplicationKey: dedupe(input.connectionId, key, "opened", position.sourceTimestamp),
        rawEvidence: { source: "position_snapshot", positionId: position.positionId }
    };
}
function closedCandidate(input, position) {
    const key = positionKey(position);
    const trade = findClosingTrade(position, input.recentTrades);
    const closedAt = trade === null ? input.detectedAt : new Date(trade.created_at);
    return {
        connectionId: input.connectionId,
        telegramUserId: input.telegramUserId,
        accountId: input.accountId,
        positionKey: key,
        symbol: position.symbol,
        side: position.side,
        eventType: "closed",
        closeReason: classifyCloseReason(trade),
        confidence: trade === null ? "low" : "medium",
        entryPrice: position.entryPrice,
        exitPrice: trade === null ? null : trade.price,
        quantity: absoluteDecimal(position.quantity),
        leverage: position.leverage,
        collateral: position.initialMargin,
        realizedPnl: trade === null ? null : trade.pnl,
        realizedPnlPct: trade === null ? null : realizedPnlPct(trade.pnl, position.initialMargin),
        fee: trade === null ? null : trade.fee_qty,
        openedAt: position.sourceTimestamp,
        closedAt,
        sourceTimestamp: closedAt,
        detectedAt: input.detectedAt,
        deduplicationKey: dedupe(input.connectionId, key, "closed", closedAt),
        rawEvidence: trade === null
            ? { source: "position_disappeared", positionId: position.positionId }
            : { source: "trade", tradeId: trade.id, orderId: trade.order_id }
    };
}
function positionKey(position) {
    return position.positionId.length > 0
        ? position.positionId
        : `${position.symbol}:${position.side}:${position.marginMode}`;
}
function findClosingTrade(position, trades) {
    const expectedSide = position.side === "long" ? "sell" : "buy";
    const matching = trades
        .filter(trade => trade.symbol === position.symbol && trade.side === expectedSide)
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    return matching[0] ?? null;
}
function classifyCloseReason(trade) {
    if (trade === null) {
        return "unknown";
    }
    const pnl = Number(trade.pnl);
    if (!Number.isFinite(pnl) || pnl === 0) {
        return "manual";
    }
    return pnl > 0 ? "take_profit" : "stop_loss";
}
function realizedPnlPct(pnl, collateral) {
    const pnlNumber = Number(pnl);
    const collateralNumber = Number(collateral);
    if (!Number.isFinite(pnlNumber) || !Number.isFinite(collateralNumber) || collateralNumber === 0) {
        return null;
    }
    return ((pnlNumber / collateralNumber) * 100).toFixed(2);
}
function absoluteDecimal(value) {
    return value.startsWith("-") ? value.slice(1) : value;
}
function dedupe(connectionId, positionKeyValue, eventType, timestamp) {
    return `${connectionId}:${positionKeyValue}:${eventType}:${timestamp.toISOString()}`;
}
//# sourceMappingURL=trade-lifecycle-detector.js.map