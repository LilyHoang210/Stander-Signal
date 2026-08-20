import { Decimal } from "decimal.js";
const decimalPlaces = 20;
export function evaluateStopLossProximity(input) {
    if (!input.dataFresh) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_stale",
            reason: reason("STALE_INPUT_DATA", "Stop Loss proximity risk suppressed because required data is stale.", {})
        });
    }
    const markPrice = new Decimal(input.position.markPrice);
    if (!markPrice.isFinite() || markPrice.lte(0)) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_missing_data",
            reason: reason("INVALID_MARK_PRICE", "Stop Loss proximity risk suppressed because mark price is missing or invalid.", { markPrice: input.position.markPrice })
        });
    }
    const candidate = nearestStopLossCandidate(input.position, input.openOrders, markPrice);
    if (candidate === null) {
        return null;
    }
    const severity = severityForDistance(candidate.distancePct, input.thresholds);
    const code = severity === "safe"
        ? "STOP_LOSS_DISTANCE_SAFE"
        : `STOP_LOSS_DISTANCE_${severity.toUpperCase()}`;
    return evaluation(input, {
        severity,
        status: "evaluated",
        reason: reason(code, messageForSeverity(severity), {
            symbol: input.position.symbol,
            positionSide: input.position.side,
            markPrice: input.position.markPrice,
            stopPrice: candidate.order.price,
            stopDistancePct: formatDecimal(candidate.distancePct),
            stopSide: candidate.order.side,
            orderId: candidate.order.orderId,
            criticalDistancePct: input.thresholds.criticalDistancePct,
            dangerDistancePct: input.thresholds.dangerDistancePct,
            warningDistancePct: input.thresholds.warningDistancePct
        })
    });
}
function nearestStopLossCandidate(position, openOrders, markPrice) {
    const candidates = openOrders
        .filter(order => isStopLossCandidate(position, order, markPrice))
        .map(order => ({
        order,
        distancePct: markPrice.minus(new Decimal(order.price)).abs().div(markPrice)
    }))
        .sort((left, right) => left.distancePct.comparedTo(right.distancePct));
    return candidates[0] ?? null;
}
function isStopLossCandidate(position, order, markPrice) {
    if (!order.reduceOnly ||
        order.status !== "untriggered" ||
        order.positionId !== position.positionId ||
        order.symbol !== position.symbol) {
        return false;
    }
    const stopPrice = new Decimal(order.price);
    if (!stopPrice.isFinite() || stopPrice.lte(0)) {
        return false;
    }
    if (position.side === "long") {
        return order.side === "sell" && stopPrice.lte(markPrice);
    }
    return order.side === "buy" && stopPrice.gte(markPrice);
}
function severityForDistance(distancePct, thresholds) {
    if (distancePct.lte(new Decimal(thresholds.criticalDistancePct))) {
        return "critical";
    }
    if (distancePct.lte(new Decimal(thresholds.dangerDistancePct))) {
        return "danger";
    }
    if (distancePct.lte(new Decimal(thresholds.warningDistancePct))) {
        return "warning";
    }
    return "safe";
}
function messageForSeverity(severity) {
    if (severity === "critical") {
        return "Position is extremely close to its Stop Loss order.";
    }
    if (severity === "danger") {
        return "Position is close to its Stop Loss order.";
    }
    if (severity === "warning") {
        return "Position is approaching its Stop Loss order.";
    }
    return "Position Stop Loss order is outside configured proximity thresholds.";
}
function evaluation(input, values) {
    return {
        accountId: input.position.accountId,
        itemId: input.position.positionId,
        riskType: "stop_loss_proximity",
        severity: values.severity,
        status: values.status,
        thresholdVersion: input.thresholdVersion,
        sourceTier: input.position.sourceTier,
        sourceTimestamp: input.position.sourceTimestamp,
        evaluatedAt: input.evaluatedAt,
        reasons: [values.reason]
    };
}
function reason(code, message, values) {
    return { code, message, values };
}
function formatDecimal(value) {
    return value.toFixed(decimalPlaces);
}
//# sourceMappingURL=stop-loss-proximity.js.map