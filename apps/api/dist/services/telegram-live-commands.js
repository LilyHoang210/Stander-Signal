import { formatCoverageReport, formatFundingHistoryReport, formatMarketsReport, formatOrdersReport, formatTradesHistoryReport } from "@standx/telegram/on-demand-messages";
import { formatTelegramUtcTimestamp } from "@standx/telegram/time-format";
import { formatCompactPositionsReport } from "@standx/telegram/trade-messages";
const noActiveConnectionMessage = "No active StandX account is connected.";
const riskSeverityRank = {
    critical: 0,
    danger: 1,
    warning: 2,
    safe: 3
};
export class TelegramLiveCommands {
    connections;
    credentials;
    client;
    alertsReader;
    riskReader;
    now;
    constructor(options) {
        this.connections = options.connections;
        this.credentials = options.credentials;
        this.client = options.client;
        this.alertsReader = options.alerts;
        this.riskReader = options.risk;
        this.now = options.now ?? (() => new Date());
    }
    async perps(telegramUserId) {
        return this.withLiveSnapshot(telegramUserId, snapshot => {
            const openPositions = openPositionsOnly(snapshot.positions);
            return Promise.resolve([
                `Perps account: ${snapshot.connection.accountLabel}`,
                `Equity: ${snapshot.balance.equity}`,
                `Balance: ${snapshot.balance.balance}`,
                `Unrealized PnL: ${snapshot.balance.upnl}`,
                `Cross available: ${snapshot.balance.cross_available}`,
                `Open positions: ${String(openPositions.length)}`,
                `Open orders: ${String(snapshot.openOrders.total)}`,
                `Observed: ${formatTelegramUtcTimestamp(snapshot.observedAt)}`
            ].join("\n"));
        });
    }
    async positions(telegramUserId) {
        return this.withLiveSnapshot(telegramUserId, snapshot => {
            const positions = openPositionsOnly(snapshot.positions);
            return Promise.resolve(formatCompactPositionsReport({
                positions: positions.map(position => ({
                    symbol: position.symbol,
                    side: positionSide(position),
                    quantity: position.qty,
                    entryPrice: position.entry_price,
                    unrealizedPnl: position.upnl,
                    liquidationPrice: position.liq_price
                }))
            }));
        });
    }
    async risk(telegramUserId) {
        const persisted = await this.riskReader?.listLatest(telegramUserId) ?? [];
        if (persisted.length > 0) {
            return [
                "Current risk assessment",
                ...[...persisted]
                    .sort((left, right) => {
                    const severityDelta = riskSeverityRank[left.severity] - riskSeverityRank[right.severity];
                    if (severityDelta !== 0) {
                        return severityDelta;
                    }
                    return right.evaluatedAt.getTime() - left.evaluatedAt.getTime();
                })
                    .map(evaluation => [
                    `${evaluation.severity.toUpperCase()} ${evaluation.riskType}`,
                    `Item: ${evaluation.itemId}`,
                    `Status: ${evaluation.status}`,
                    `Reason: ${evaluation.reasonCode} — ${evaluation.reasonMessage}`,
                    `Evaluated: ${formatTelegramUtcTimestamp(evaluation.evaluatedAt)}`
                ].join("\n"))
            ].join("\n\n");
        }
        return this.withLiveSnapshot(telegramUserId, snapshot => {
            const positions = openPositionsOnly(snapshot.positions);
            if (positions.length === 0) {
                return Promise.resolve("Live risk preview: no open Perps positions.");
            }
            return Promise.resolve([
                "Live risk preview only — no persisted risk assessment is available yet.",
                "",
                ...positions.map(position => formatRiskPreview(position))
            ].join("\n"));
        });
    }
    async alerts(telegramUserId) {
        const alertRows = await this.alertsReader?.listActive(telegramUserId) ?? [];
        if (alertRows.length === 0) {
            return "No active alerts.";
        }
        return [
            "Active alerts",
            "",
            ...alertRows.map(alert => [
                `${alert.severity.toUpperCase()} ${alert.riskType}`,
                `Item: ${alert.itemId}`,
                `Status: ${alert.status}`,
                `Message: ${alert.message}`,
                `Created: ${formatTelegramUtcTimestamp(alert.createdAt)}`
            ].join("\n"))
        ].join("\n\n");
    }
    async orders(telegramUserId) {
        return this.withConnectionToken(telegramUserId, async (token) => {
            const orders = await this.client.queryOrders(token, new URLSearchParams({ limit: "10" }));
            return formatOrdersReport({ orders: orders.result.slice(0, 10) });
        });
    }
    async history(telegramUserId) {
        return this.withConnectionToken(telegramUserId, async (token) => {
            const trades = await this.client.queryTrades(token, new URLSearchParams({ limit: "10" }));
            return formatTradesHistoryReport({ trades: trades.result.slice(0, 10) });
        });
    }
    async funding(telegramUserId) {
        return this.withConnectionToken(telegramUserId, async (token) => {
            const records = await this.client.queryFundingHistory(token, new URLSearchParams({ limit: "10" }));
            return formatFundingHistoryReport({ records: records.slice(0, 10) });
        });
    }
    async markets(telegramUserId) {
        return this.withConnectionToken(telegramUserId, async (token) => {
            const positions = openPositionsOnly(await this.client.queryPositions(token));
            const symbols = [...new Set(positions.map(position => position.symbol))].slice(0, 10);
            const markets = await Promise.all(symbols.map(symbol => this.client.querySymbolMarket(new URLSearchParams({ symbol }))));
            return formatMarketsReport({ markets });
        });
    }
    coverage(telegramUserId) {
        void telegramUserId;
        return Promise.resolve(formatCoverageReport());
    }
    async refresh(telegramUserId) {
        return this.withLiveSnapshot(telegramUserId, snapshot => Promise.resolve([
            "Live StandX refresh completed.",
            `Account: ${snapshot.connection.accountLabel}`,
            `Equity: ${snapshot.balance.equity}`,
            `positions: ${String(openPositionsOnly(snapshot.positions).length)}`,
            `open orders: ${String(snapshot.openOrders.total)}`,
            `Observed: ${formatTelegramUtcTimestamp(snapshot.observedAt)}`
        ].join("\n")));
    }
    async withLiveSnapshot(telegramUserId, callback) {
        const connection = await this.connections.getCurrentStatus(telegramUserId);
        if (connection === null) {
            return noActiveConnectionMessage;
        }
        try {
            return await this.credentials.withLease(connection.id, async (token) => {
                const [balance, positions, openOrders] = await Promise.all([
                    this.client.queryBalance(token),
                    this.client.queryPositions(token),
                    this.client.queryOpenOrders(token)
                ]);
                return callback({
                    connection,
                    balance,
                    positions,
                    openOrders,
                    observedAt: this.now()
                });
            });
        }
        catch {
            return "StandX data is temporarily unavailable. Please try again later.";
        }
    }
    async withConnectionToken(telegramUserId, callback) {
        const connection = await this.connections.getCurrentStatus(telegramUserId);
        if (connection === null) {
            return noActiveConnectionMessage;
        }
        try {
            return await this.credentials.withLease(connection.id, callback);
        }
        catch {
            return "StandX data is temporarily unavailable. Please try again later.";
        }
    }
}
function openPositionsOnly(positions) {
    return positions.filter(position => Number(position.qty) !== 0);
}
function formatRiskPreview(position) {
    const buffer = liquidationBufferPct(position);
    const severity = buffer === null
        ? "unknown"
        : buffer <= 5
            ? "critical"
            : buffer <= 10
                ? "danger"
                : buffer <= 20
                    ? "warning"
                    : "safe";
    return buffer === null
        ? `${position.symbol}: ${severity}; liquidation price unavailable`
        : `${position.symbol}: ${severity}; buffer ${buffer.toFixed(2)}%; mark ${position.mark_price}; liq ${position.liq_price ?? "N/A"}`;
}
function liquidationBufferPct(position) {
    if (position.liq_price === null) {
        return null;
    }
    const markPrice = Number(position.mark_price);
    const liquidationPrice = Number(position.liq_price);
    if (!Number.isFinite(markPrice) || !Number.isFinite(liquidationPrice) || markPrice <= 0) {
        return null;
    }
    const side = positionSide(position);
    const distance = side === "short"
        ? liquidationPrice - markPrice
        : markPrice - liquidationPrice;
    return Math.max(0, (distance / markPrice) * 100);
}
function positionSide(position) {
    return Number(position.qty) < 0 ? "short" : "long";
}
//# sourceMappingURL=telegram-live-commands.js.map