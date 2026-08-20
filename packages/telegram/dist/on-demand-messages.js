import { escapeTelegramMarkup } from "./risk-messages.js";
export function formatOrdersReport(input) {
    if (input.orders.length === 0) {
        return "Orders\n\nNo recent orders found.";
    }
    return [
        "Orders",
        "",
        ...input.orders.map(order => `• ${escapeTelegramMarkup(order.symbol)} | ${escapeTelegramMarkup(order.side)} | ${escapeTelegramMarkup(order.status)} | ${escapeTelegramMarkup(order.order_type)} | Qty: ${escapeTelegramMarkup(order.qty)} | Price: $${escapeTelegramMarkup(order.price)} | Filled: ${escapeTelegramMarkup(order.fill_qty)} @ $${escapeTelegramMarkup(order.fill_avg_price)} | Reduce-only: ${order.reduce_only ? "yes" : "no"}`)
    ].join("\n");
}
export function formatTradesHistoryReport(input) {
    if (input.trades.length === 0) {
        return "Trade history\n\nNo recent trades found.";
    }
    return [
        "Trade history",
        "",
        ...input.trades.map(trade => `• ${escapeTelegramMarkup(trade.symbol)} | ${escapeTelegramMarkup(trade.side)} | Qty: ${escapeTelegramMarkup(trade.qty)} | Price: $${escapeTelegramMarkup(trade.price)} | PnL: ${escapeTelegramMarkup(trade.pnl)} | Fee: ${escapeTelegramMarkup(trade.fee_qty)} ${escapeTelegramMarkup(trade.fee_asset)} | ${escapeTelegramMarkup(trade.created_at)}`)
    ].join("\n");
}
export function formatFundingHistoryReport(input) {
    if (input.records.length === 0) {
        return "Funding history\n\nNo recent funding records found.";
    }
    const asset = input.records[0]?.asset ?? "asset";
    const total = trimDecimalZeros(input.records.reduce((sum, record) => sum + Number(record.qty), 0).toFixed(6));
    return [
        "Funding history",
        `Total: ${escapeTelegramMarkup(total)} ${escapeTelegramMarkup(asset)}`,
        "",
        ...input.records.map(record => `• ${escapeTelegramMarkup(record.symbol)} | ${escapeTelegramMarkup(record.txn_type)} | ${escapeTelegramMarkup(record.qty)} ${escapeTelegramMarkup(record.asset)} | ${escapeTelegramMarkup(record.transact_time)}`)
    ].join("\n");
}
export function formatMarketsReport(input) {
    if (input.markets.length === 0) {
        return "Markets for open positions\n\nNo open positions found.";
    }
    return [
        "Markets for open positions",
        "",
        ...input.markets.map(market => `• ${escapeTelegramMarkup(market.symbol)} | Mark: $${escapeTelegramMarkup(market.mark_price)} | Last: $${escapeTelegramMarkup(market.last_price ?? "N/A")} | Funding: ${escapeTelegramMarkup(market.funding_rate)} | OI: ${escapeTelegramMarkup(market.open_interest)} | 24h Vol: ${escapeTelegramMarkup(market.volume_24h)} | Next funding: ${escapeTelegramMarkup(market.next_funding_time)}`)
    ].join("\n");
}
export function formatCoverageReport() {
    return [
        "Coverage",
        "",
        "Supported",
        "• Perps balance",
        "• Perps positions",
        "• Open orders",
        "• Order history",
        "• Trade history",
        "• Funding history",
        "• Market data for open positions",
        "• Persisted risk evaluation",
        "",
        "Not supported by official API yet",
        "• SLP",
        "• Community Vault",
        "• Cash Wallet balance",
        "• Claimable yield",
        "• Network yield",
        "",
        "The bot does not use internal StandX web endpoints for unsupported areas."
    ].join("\n");
}
function trimDecimalZeros(value) {
    return value.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
}
//# sourceMappingURL=on-demand-messages.js.map