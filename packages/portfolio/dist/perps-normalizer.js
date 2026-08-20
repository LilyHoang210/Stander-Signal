import { Decimal } from "decimal.js";
export function normalizePerpsSnapshot(input) {
    const ingestedAt = input.ingestedAt ?? input.observedAt;
    return {
        accountId: input.accountId,
        balance: normalizeBalance({
            accountId: input.accountId,
            balance: input.balance,
            observedAt: input.observedAt,
            ingestedAt
        }),
        positions: input.positions
            .filter(position => !new Decimal(decimalString(position.qty, "position quantity")).isZero())
            .map(position => normalizePosition({
            accountId: input.accountId,
            position,
            observedAt: input.observedAt,
            ingestedAt
        })),
        openOrders: input.openOrders.result.map(order => ({
            accountId: input.accountId,
            orderId: `standx-order-${String(order.id)}`,
            positionId: order.position_id === 0 ? null : `standx-position-${String(order.position_id)}`,
            symbol: order.symbol,
            side: order.side,
            orderType: order.order_type,
            status: order.status,
            quantity: decimalString(order.qty, "open order quantity"),
            filledQuantity: decimalString(order.fill_qty, "open order filled quantity"),
            price: decimalString(order.price, "open order price"),
            averageFillPrice: decimalString(order.fill_avg_price, "open order average fill price"),
            reduceOnly: order.reduce_only,
            sourceTimestamp: parseSourceTimestamp(order.updated_at, "open order updated_at"),
            ingestedAt,
            sourceTier: "A"
        })),
        observedAt: input.observedAt,
        ingestedAt
    };
}
export function normalizePosition(input) {
    const quantity = decimalString(input.position.qty, "position quantity");
    const side = deriveSide(quantity);
    if (side === null && input.position.status === "open") {
        throw new Error(`Cannot normalize open zero-quantity position ${String(input.position.id)}`);
    }
    if (side === null) {
        throw new Error(`Cannot normalize zero-quantity position ${String(input.position.id)}`);
    }
    return {
        accountId: input.accountId,
        positionId: `standx-position-${String(input.position.id)}`,
        symbol: input.position.symbol,
        side,
        quantity,
        notional: decimalString(input.position.position_value, "position notional"),
        entryPrice: decimalString(input.position.entry_price, "entry price"),
        markPrice: decimalString(input.position.mark_price, "mark price"),
        liquidationPrice: nullableDecimalString(input.position.liq_price, "liquidation price"),
        bankruptcyPrice: nullableDecimalString(input.position.bankruptcy_price ?? null, "bankruptcy price"),
        liquidationFields: input.position.liq_price === null || input.position.bankruptcy_price === undefined
            ? "unavailable"
            : "supported",
        leverage: decimalString(input.position.leverage, "leverage"),
        marginMode: input.position.margin_mode,
        initialMargin: decimalString(input.position.initial_margin, "initial margin"),
        holdingMargin: decimalString(input.position.holding_margin, "holding margin"),
        maintenanceMargin: decimalString(input.position.maint_margin, "maintenance margin"),
        unrealizedPnl: decimalString(input.position.upnl, "unrealized PnL"),
        realizedPnl: decimalString(input.position.realized_pnl, "realized PnL"),
        marginAsset: input.position.margin_asset,
        sourceTimestamp: input.observedAt,
        ingestedAt: input.ingestedAt ?? input.observedAt,
        sourceTier: "A"
    };
}
function normalizeBalance(input) {
    return {
        accountId: input.accountId,
        balance: decimalString(input.balance.balance, "balance"),
        equity: decimalString(input.balance.equity, "equity"),
        isolatedBalance: decimalString(input.balance.isolated_balance, "isolated balance"),
        isolatedUpnl: decimalString(input.balance.isolated_upnl, "isolated unrealized PnL"),
        crossBalance: decimalString(input.balance.cross_balance, "cross balance"),
        crossMargin: decimalString(input.balance.cross_margin, "cross margin"),
        crossUpnl: decimalString(input.balance.cross_upnl, "cross unrealized PnL"),
        crossAvailable: decimalString(input.balance.cross_available, "cross available"),
        locked: decimalString(input.balance.locked, "locked balance"),
        upnl: decimalString(input.balance.upnl, "unrealized PnL"),
        pnlFreeze: decimalString(input.balance.pnl_freeze, "PnL freeze"),
        sourceTimestamp: input.observedAt,
        ingestedAt: input.ingestedAt,
        sourceTier: "A"
    };
}
function deriveSide(quantity) {
    const decimal = new Decimal(quantity);
    if (decimal.gt(0)) {
        return "long";
    }
    if (decimal.lt(0)) {
        return "short";
    }
    return null;
}
function decimalString(value, fieldName) {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
        throw new Error(`${fieldName} must be a plain decimal string`);
    }
    const decimal = new Decimal(value);
    if (!decimal.isFinite()) {
        throw new Error(`${fieldName} must be finite`);
    }
    return value;
}
function nullableDecimalString(value, fieldName) {
    return value === null ? null : decimalString(value, fieldName);
}
function parseSourceTimestamp(value, fieldName) {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
        throw new Error(`${fieldName} must be a valid timestamp`);
    }
    return timestamp;
}
//# sourceMappingURL=perps-normalizer.js.map