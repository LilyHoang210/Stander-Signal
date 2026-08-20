import { escapeTelegramMarkup } from "./risk-messages.js";
import { formatTelegramUtcTimestamp } from "./time-format.js";
export function formatTradeOpenedNotification(input) {
    const asset = baseAsset(input.symbol);
    return [
        "⚡ Instant Trade Opened",
        "",
        `Asset: ${escapeTelegramMarkup(asset)}`,
        `Direction: ${formatDirection(input.side)}`,
        optionalLine(input.leverage, value => `Leverage: ${formatLeverage(value)}`),
        input.collateral === null || input.collateral === undefined
            ? null
            : `Collateral: $${formatDecimal(input.collateral)} ${escapeTelegramMarkup(input.collateralAsset ?? "USDC")}`,
        optionalLine(input.entryPrice, value => `Entry Price: $${formatDecimal(value)}`),
        `Size: ${formatQuantity(input.quantity)} ${escapeTelegramMarkup(asset)}`,
        "",
        formatTelegramUtcTimestamp(input.sourceTimestamp)
    ].filter((line) => line !== null).join("\n");
}
export function formatTradeClosedNotification(input) {
    const asset = baseAsset(input.symbol);
    return [
        titleForCloseReason(input.closeReason),
        "",
        `Asset: ${escapeTelegramMarkup(asset)}`,
        `Direction: ${formatDirection(input.side)}`,
        optionalLine(input.leverage, value => `Leverage: ${formatLeverage(value)}`),
        optionalLine(input.entryPrice, value => `Entry Price: $${formatDecimal(value)}`),
        optionalLine(input.exitPrice, value => `Exit Price: $${formatDecimal(value)}`),
        formatPnlLine(input.realizedPnl ?? null, input.realizedPnlPct ?? null),
        optionalLine(input.fee, value => `Fee: $${formatDecimal(value)}`),
        `Size: ${formatQuantity(input.quantity)} ${escapeTelegramMarkup(asset)}`,
        input.heldSeconds === null || input.heldSeconds === undefined
            ? null
            : `Held: ${formatDuration(input.heldSeconds)}`,
        "",
        formatTelegramUtcTimestamp(input.sourceTimestamp)
    ].filter((line) => line !== null).join("\n");
}
export function formatCompactPositionsReport(input) {
    if (input.positions.length === 0) {
        return "No open Perps positions.";
    }
    return input.positions.map(position => [
        `• ${escapeTelegramMarkup(position.symbol)}`,
        titleCaseSide(position.side),
        `Size: ${formatQuantity(position.quantity, false)}`,
        `Entry: $${formatDecimal(position.entryPrice)}`,
        `PnL: ${formatDecimal(position.unrealizedPnl)}`,
        `Liq: ${position.liquidationPrice === null ? "N/A" : `$${formatDecimal(position.liquidationPrice)}`}`
    ].join(" | ")).join("\n");
}
function optionalLine(value, formatter) {
    return value === null || value === undefined || value.length === 0 ? null : formatter(value);
}
function formatDirection(side) {
    return side === "long" ? "LONG 📈" : "SHORT 📉";
}
function titleCaseSide(side) {
    return side === "long" ? "Long" : "Short";
}
function titleForCloseReason(reason) {
    if (reason === "take_profit") {
        return "🟢 Instant Trade — Take Profit Hit";
    }
    if (reason === "stop_loss") {
        return "🛑 Instant Trade — Stop Loss Hit";
    }
    if (reason === "manual") {
        return "🔵 Instant Trade Closed — Manual";
    }
    return "⚪ Instant Trade Closed — Unknown";
}
function baseAsset(symbol) {
    const withoutQuote = symbol.replace(/(?:USDC|USDT|USD)$/u, "");
    return withoutQuote.length === 0 ? symbol : withoutQuote;
}
function formatLeverage(value) {
    return `${formatDecimal(value)}x`;
}
function formatPnlLine(pnl, pct) {
    if (pnl === null) {
        return null;
    }
    const numeric = Number(pnl);
    const sign = Number.isFinite(numeric) && numeric < 0 ? "-" : "";
    const absolute = formatDecimal(pnl.replace(/^-/, ""));
    const pctPart = pct === null ? "" : ` (${formatDecimal(pct)}%)`;
    return `PnL: ${sign}$${absolute}${pctPart}`;
}
function formatQuantity(value, useGrouping = true) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return escapeTelegramMarkup(value);
    }
    return useGrouping
        ? numeric.toLocaleString("en-US", { maximumFractionDigits: 8 })
        : escapeTelegramMarkup(value);
}
function formatDecimal(value) {
    return escapeTelegramMarkup(value);
}
function formatDuration(seconds) {
    const wholeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(wholeSeconds / 3600);
    const minutes = Math.floor((wholeSeconds % 3600) / 60);
    const remainderSeconds = wholeSeconds % 60;
    if (hours > 0) {
        return `${String(hours)}h ${String(minutes)}m ${String(remainderSeconds)}s`;
    }
    if (minutes > 0) {
        return `${String(minutes)}m ${String(remainderSeconds)}s`;
    }
    return `${String(remainderSeconds)}s`;
}
//# sourceMappingURL=trade-messages.js.map