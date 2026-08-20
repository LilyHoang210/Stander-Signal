import { formatTelegramUtcTimestamp } from "./time-format.js";
export function formatRiskAlert(alert) {
    const evaluation = alert.evaluation;
    if (evaluation.riskType === "stop_loss_proximity") {
        return formatStopLossRiskAlert(alert);
    }
    const primaryReason = evaluation.reasons[0];
    const reasonText = primaryReason === undefined
        ? "No reason provided"
        : `${humanizeReason(primaryReason.code)} — ${primaryReason.message}`;
    const materialLines = materialValueLines(primaryReason?.values ?? {});
    return {
        text: [
            `${evaluation.severity.toUpperCase()} ${humanizeRiskType(evaluation.riskType)}`,
            `Account: ${escapeTelegramMarkup(alert.accountLabel)} (${maskAccountId(evaluation.accountId)})`,
            `Item: ${escapeTelegramMarkup(evaluation.itemId)}`,
            `Reason: ${escapeTelegramMarkup(reasonText)}`,
            ...materialLines,
            `Source: Tier ${evaluation.sourceTier}`,
            `Observed: ${formatTelegramUtcTimestamp(evaluation.sourceTimestamp)}`,
            `Evaluated: ${formatTelegramUtcTimestamp(evaluation.evaluatedAt)}`,
            "",
            "Neutral actions: reduce exposure, add margin if appropriate, close partial exposure, Review TP/SL orders, or monitor directly on StandX."
        ]
            .filter(line => line.length > 0 || line === "")
            .join("\n"),
        replyMarkup: riskAlertReplyMarkup(alert)
    };
}
function formatStopLossRiskAlert(alert) {
    const evaluation = alert.evaluation;
    const primaryReason = evaluation.reasons[0];
    const values = primaryReason?.values ?? {};
    const direction = directionFromValues(values);
    return {
        text: [
            `🚨 Stop Loss Risk — ${titleCase(evaluation.severity)}`,
            "",
            `Asset: ${escapeTelegramMarkup(assetFromSymbol(values.symbol ?? evaluation.itemId))}`,
            `Direction: ${direction}`,
            `Mark Price: ${escapeTelegramMarkup(formatUsd(values.markPrice))}`,
            `Stop Loss: ${escapeTelegramMarkup(formatUsd(values.stopPrice))}`,
            `Distance to SL: ${escapeTelegramMarkup(formatStopLossPercent(values.stopDistancePct))}`,
            `Severity: ${titleCase(evaluation.severity)}`,
            "",
            `Action: ${escapeTelegramMarkup(stopLossAction(primaryReason?.message))}`,
            formatStopLossTimestamp(evaluation.sourceTimestamp)
        ].join("\n"),
        replyMarkup: riskAlertReplyMarkup(alert)
    };
}
function riskAlertReplyMarkup(alert) {
    return {
        inline_keyboard: [
            [
                {
                    text: "Acknowledge",
                    callback_data: `alert:ack:${alert.deduplicationKey}`
                },
                {
                    text: "View status",
                    callback_data: `alert:status:${alert.evaluation.accountId}`
                }
            ],
            [{ text: "Disconnect", callback_data: "disconnect:confirm" }]
        ]
    };
}
export function formatPositionsReport(input) {
    if (input.positions.length === 0) {
        return "No open Perps positions.";
    }
    return input.positions
        .map(position => {
        const reason = position.risk.reasons[0];
        return [
            `${escapeTelegramMarkup(position.symbol)} ${position.side}`,
            `Account: ${maskAccountId(position.accountId)}`,
            `Qty: ${position.quantity}`,
            `Mark: ${position.markPrice}`,
            `Liq: ${position.liquidationPrice ?? "N/A"}`,
            `Margin: ${position.marginMode}, leverage ${position.leverage}`,
            `Estimated close: fill ${position.estimatedClose.fillRatio}, VWAP ${position.estimatedClose.vwap ?? "N/A"}, slippage ${position.estimatedClose.slippagePct}`,
            `Risk: ${position.risk.severity.toUpperCase()} ${reason?.code ?? "NO_REASON"}`,
            `Updated: ${formatAge(input.now, position.updatedAt)} ago`
        ].join("\n");
    })
        .join("\n\n");
}
export function maskAccountId(value) {
    if (value.length <= 8) {
        return value;
    }
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
export function escapeTelegramMarkup(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
function humanizeRiskType(value) {
    return value.replaceAll("_", " ");
}
function humanizeReason(value) {
    return value
        .split("_")
        .map(part => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`)
        .join(" ");
}
function assetFromSymbol(symbol) {
    const withoutQuote = symbol.replace(/[-_/]?(?:USDC|USDT|USD)$/u, "");
    return withoutQuote.length === 0 ? symbol : withoutQuote;
}
function directionFromValues(values) {
    const side = values.positionSide?.toLowerCase();
    if (side === "long") {
        return "LONG 📈";
    }
    if (side === "short") {
        return "SHORT 📉";
    }
    const stopSide = values.stopSide?.toLowerCase();
    if (stopSide === "sell") {
        return "LONG 📈";
    }
    if (stopSide === "buy") {
        return "SHORT 📉";
    }
    return "UNKNOWN";
}
function titleCase(value) {
    return `${value.slice(0, 1).toUpperCase()}${value.slice(1).toLowerCase()}`;
}
function formatUsd(value) {
    if (value === undefined || value.length === 0) {
        return "N/A";
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return `$${value}`;
    }
    return `$${numeric.toLocaleString("en-US", {
        maximumFractionDigits: 8,
        minimumFractionDigits: 0
    })}`;
}
function formatStopLossPercent(value) {
    if (value === undefined || value.length === 0) {
        return "N/A";
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return value;
    }
    return `${(numeric * 100).toLocaleString("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    })}%`;
}
function stopLossAction(message) {
    const fallback = "Position is close to Stop Loss.";
    if (message === undefined || message.length === 0) {
        return fallback;
    }
    const cleaned = message
        .replace("its Stop Loss order", "Stop Loss")
        .replace("Stop Loss order", "Stop Loss")
        .replace(/\.+$/u, "");
    return `${cleaned}.`;
}
function formatStopLossTimestamp(timestamp) {
    const month = timestamp.toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC"
    });
    const day = timestamp.getUTCDate();
    const year = timestamp.getUTCFullYear();
    const hour = String(timestamp.getUTCHours()).padStart(2, "0");
    const minute = String(timestamp.getUTCMinutes()).padStart(2, "0");
    return `🕐 ${month} ${String(day)} · ${String(year)}, ${hour}:${minute} UTC`;
}
function materialValueLines(values) {
    const lines = [];
    if (values.markPrice !== undefined) {
        lines.push(`Mark: ${escapeTelegramMarkup(values.markPrice)}`);
    }
    if (values.stopPrice !== undefined) {
        lines.push(`Stop Loss: ${escapeTelegramMarkup(values.stopPrice)}`);
    }
    if (values.stopDistancePct !== undefined) {
        lines.push(`Distance to SL: ${escapeTelegramMarkup(formatPercent(values.stopDistancePct))}`);
    }
    if (values.stopSide !== undefined) {
        lines.push(`Stop side: ${escapeTelegramMarkup(values.stopSide)}`);
    }
    if (values.liquidationPrice !== undefined && values.liquidationPrice !== "") {
        lines.push(`Liq: ${escapeTelegramMarkup(values.liquidationPrice)}`);
    }
    if (values.liquidationBufferPct !== undefined) {
        lines.push(`Buffer: ${escapeTelegramMarkup(values.liquidationBufferPct)}`);
    }
    if (values.effectiveBufferPct !== undefined) {
        lines.push(`Effective buffer: ${escapeTelegramMarkup(values.effectiveBufferPct)}`);
    }
    if (values.exitSlippagePct !== undefined) {
        lines.push(`Exit slippage assumption: ${escapeTelegramMarkup(values.exitSlippagePct)}`);
    }
    if (values.crossAvailable !== undefined) {
        lines.push(`Cross available: ${escapeTelegramMarkup(values.crossAvailable)}`);
    }
    if (values.stressLoss5m !== undefined) {
        lines.push(`5m stress loss: ${escapeTelegramMarkup(values.stressLoss5m)}`);
    }
    if (values.stressLoss15m !== undefined) {
        lines.push(`15m stress loss: ${escapeTelegramMarkup(values.stressLoss15m)}`);
    }
    if (values.stressLoss60m !== undefined) {
        lines.push(`60m stress loss: ${escapeTelegramMarkup(values.stressLoss60m)}`);
    }
    return lines;
}
function formatPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return value;
    }
    return `${(numeric * 100).toLocaleString("en-US", {
        maximumFractionDigits: 6,
        minimumFractionDigits: 0
    })}%`;
}
function formatAge(now, timestamp) {
    const ageSeconds = Math.max(0, Math.floor((now.getTime() - timestamp.getTime()) / 1000));
    if (ageSeconds < 60) {
        return `${String(ageSeconds)}s`;
    }
    const ageMinutes = Math.floor(ageSeconds / 60);
    return `${String(ageMinutes)}m`;
}
//# sourceMappingURL=risk-messages.js.map