import { Decimal } from "decimal.js";
const decimalPlaces = 20;
const FinancialDecimal = Decimal.clone({ precision: 60 });
const zero = new FinancialDecimal(0);
export function evaluateCrossMargin(input) {
    if (!input.dataFresh) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_stale",
            reason: reason("STALE_INPUT_DATA", "Cross-margin risk suppressed because required account data is stale.", {})
        });
    }
    const crossAvailable = new FinancialDecimal(input.balance.crossAvailable);
    const stressLosses = calculateStressLosses(input.positions);
    if (crossAvailable.lt(stressLosses.m5)) {
        return evaluatedRisk(input, {
            severity: "critical",
            code: "CROSS_MARGIN_STRESS_5M",
            message: "Cross available margin is below the 5-minute adverse stress loss.",
            crossAvailable,
            stressLosses
        });
    }
    if (crossAvailable.lt(stressLosses.m15)) {
        return evaluatedRisk(input, {
            severity: "danger",
            code: "CROSS_MARGIN_STRESS_15M",
            message: "Cross available margin is below the 15-minute adverse stress loss.",
            crossAvailable,
            stressLosses
        });
    }
    if (crossAvailable.lt(stressLosses.m60)) {
        return evaluatedRisk(input, {
            severity: "warning",
            code: "CROSS_MARGIN_STRESS_60M",
            message: "Cross available margin is below the 60-minute adverse stress loss.",
            crossAvailable,
            stressLosses
        });
    }
    return evaluatedRisk(input, {
        severity: "safe",
        code: "CROSS_MARGIN_STRESS_SAFE",
        message: "Cross available margin covers every configured stress horizon.",
        crossAvailable,
        stressLosses
    });
}
function calculateStressLosses(positions) {
    return positions.reduce((total, stressPosition) => {
        if (stressPosition.position.marginMode === "isolated") {
            return total;
        }
        const stressedNotional = new FinancialDecimal(stressPosition.position.quantity)
            .abs()
            .times(new FinancialDecimal(stressPosition.position.markPrice));
        return {
            m5: total.m5.plus(stressedNotional.times(new FinancialDecimal(stressPosition.adverseMoves.m5))),
            m15: total.m15.plus(stressedNotional.times(new FinancialDecimal(stressPosition.adverseMoves.m15))),
            m60: total.m60.plus(stressedNotional.times(new FinancialDecimal(stressPosition.adverseMoves.m60)))
        };
    }, { m5: zero, m15: zero, m60: zero });
}
function evaluatedRisk(input, values) {
    return evaluation(input, {
        severity: values.severity,
        status: "evaluated",
        reason: reason(values.code, values.message, {
            crossAvailable: input.balance.crossAvailable,
            crossAvailableNormalized: formatDecimal(values.crossAvailable),
            stressLoss5m: formatDecimal(values.stressLosses.m5),
            stressLoss15m: formatDecimal(values.stressLosses.m15),
            stressLoss60m: formatDecimal(values.stressLosses.m60)
        })
    });
}
function evaluation(input, values) {
    return {
        accountId: input.balance.accountId,
        itemId: input.balance.accountId,
        riskType: "cross_margin",
        severity: values.severity,
        status: values.status,
        thresholdVersion: input.thresholdVersion,
        sourceTier: input.balance.sourceTier,
        sourceTimestamp: input.balance.sourceTimestamp,
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
//# sourceMappingURL=margin.js.map