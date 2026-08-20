import { Decimal } from "decimal.js";
const decimalPlaces = 20;
const FinancialDecimal = Decimal.clone({ precision: 60 });
const zero = new FinancialDecimal(0);
const one = new FinancialDecimal(1);
const criticalFillRatio = new FinancialDecimal("0.8");
const dangerFillRatio = new FinancialDecimal("0.95");
export function walkClosingBook(position, depth) {
    const requestedQuantity = new FinancialDecimal(position.quantity).abs();
    const markPrice = new FinancialDecimal(position.markPrice);
    const closingLevels = sortedClosingLevels(position, depth);
    const walk = walkLevels(requestedQuantity, closingLevels);
    const vwap = walk.filledQuantity.gt(0) ? walk.notional.div(walk.filledQuantity) : null;
    const fillRatio = requestedQuantity.gt(0) ? walk.filledQuantity.div(requestedQuantity) : zero;
    return {
        symbol: position.symbol,
        side: position.side,
        requestedQuantity: formatDecimal(requestedQuantity),
        filledQuantity: formatDecimal(walk.filledQuantity),
        fillRatio: formatDecimal(fillRatio),
        vwap: vwap === null ? null : formatDecimal(vwap),
        estimatedExitNotional: formatDecimal(walk.notional),
        slippagePct: formatDecimal(exitSlippage(position, markPrice, vwap)),
        depthBands: calculateDepthBands(position, depth, markPrice),
        sourceTier: depth.sourceTier,
        sourceTimestamp: depth.sourceTimestamp
    };
}
export function classifyExitLiquidity(input) {
    const fillRatio = new FinancialDecimal(input.fillRatio);
    if (fillRatio.lt(criticalFillRatio)) {
        return "critical";
    }
    if (fillRatio.lt(dangerFillRatio)) {
        return "danger";
    }
    if (fillRatio.lt(one)) {
        return "warning";
    }
    return "safe";
}
export function evaluateExitLiquidity(input) {
    if (!input.dataFresh) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_stale",
            reason: reason("STALE_INPUT_DATA", "Exit liquidity risk suppressed because required market data is stale.", {})
        });
    }
    const severity = classifyExitLiquidity({ fillRatio: input.estimate.fillRatio });
    const codeBySeverity = {
        critical: "EXIT_FILL_RATIO_CRITICAL",
        danger: "EXIT_FILL_RATIO_DANGER",
        warning: "EXIT_FILL_RATIO_WARNING",
        safe: "EXIT_FILL_RATIO_SAFE"
    };
    return evaluation(input, {
        severity,
        status: "evaluated",
        reason: reason(codeBySeverity[severity], "Visible closing-book liquidity was evaluated without hidden-liquidity assumptions.", {
            fillRatio: input.estimate.fillRatio,
            filledQuantity: input.estimate.filledQuantity,
            requestedQuantity: input.estimate.requestedQuantity,
            vwap: input.estimate.vwap ?? "",
            slippagePct: input.estimate.slippagePct
        })
    });
}
function sortedClosingLevels(position, depth) {
    const levels = position.side === "long" ? depth.bids : depth.asks;
    return [...levels].sort((left, right) => {
        const comparison = new FinancialDecimal(left.price).comparedTo(new FinancialDecimal(right.price));
        return position.side === "long" ? -comparison : comparison;
    });
}
function walkLevels(requestedQuantity, levels) {
    let remaining = requestedQuantity;
    let filledQuantity = zero;
    let notional = zero;
    for (const level of levels) {
        if (remaining.lte(0)) {
            break;
        }
        const availableQuantity = new FinancialDecimal(level.quantity);
        const fillQuantity = FinancialDecimal.min(remaining, availableQuantity);
        filledQuantity = filledQuantity.plus(fillQuantity);
        notional = notional.plus(fillQuantity.times(new FinancialDecimal(level.price)));
        remaining = remaining.minus(fillQuantity);
    }
    return { filledQuantity, notional };
}
function exitSlippage(position, markPrice, vwap) {
    if (vwap === null || !markPrice.isFinite() || markPrice.lte(0)) {
        return one;
    }
    const adverseMove = position.side === "long" ? markPrice.minus(vwap).div(markPrice) : vwap.minus(markPrice).div(markPrice);
    return FinancialDecimal.max(zero, adverseMove);
}
function calculateDepthBands(position, depth, markPrice) {
    if (!markPrice.isFinite() || markPrice.lte(0)) {
        return {
            within1Pct: formatDecimal(zero),
            within2Pct: formatDecimal(zero),
            within5Pct: formatDecimal(zero)
        };
    }
    return {
        within1Pct: formatDecimal(sumBandQuantity(position, depth, markPrice, new FinancialDecimal("0.01"))),
        within2Pct: formatDecimal(sumBandQuantity(position, depth, markPrice, new FinancialDecimal("0.02"))),
        within5Pct: formatDecimal(sumBandQuantity(position, depth, markPrice, new FinancialDecimal("0.05")))
    };
}
function sumBandQuantity(position, depth, markPrice, band) {
    const levels = position.side === "long" ? depth.bids : depth.asks;
    return levels.reduce((total, level) => {
        const price = new FinancialDecimal(level.price);
        const isInsideBand = position.side === "long"
            ? price.gte(markPrice.times(one.minus(band)))
            : price.lte(markPrice.times(one.plus(band)));
        return isInsideBand ? total.plus(new FinancialDecimal(level.quantity)) : total;
    }, zero);
}
function evaluation(input, values) {
    return {
        accountId: input.accountId,
        itemId: input.positionId,
        riskType: "exit_liquidity",
        severity: values.severity,
        status: values.status,
        thresholdVersion: input.thresholdVersion,
        sourceTier: input.sourceTier,
        sourceTimestamp: input.sourceTimestamp,
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
//# sourceMappingURL=order-book.js.map