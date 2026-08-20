import { evaluateMarketDanger, estimateFunding } from "./market-danger.js";
export class RiskEngine {
    evaluateAccount(input) {
        const accountRiskSeverity = highestSeverity([
            ...input.liquidationEvaluations,
            ...input.exitLiquidityEvaluations,
            input.crossMarginEvaluation
        ]);
        return [
            ...input.liquidationEvaluations,
            ...input.exitLiquidityEvaluations,
            input.crossMarginEvaluation,
            ...input.marketDangerInputs.map(marketInput => evaluateMarketDanger({
                accountId: input.accountId,
                itemId: marketInput.symbol,
                symbol: marketInput.symbol,
                signals: marketInput.signals,
                accountRiskSeverity,
                dataFresh: marketInput.dataFresh,
                thresholdVersion: input.thresholdVersion,
                sourceTier: marketInput.sourceTier,
                sourceTimestamp: marketInput.sourceTimestamp,
                evaluatedAt: input.evaluatedAt
            })),
            ...input.positions.map(position => evaluateFunding(position, input))
        ];
    }
}
function evaluateFunding(position, input) {
    const fundingRate = input.fundingRates.get(position.symbol);
    if (fundingRate === undefined) {
        return fundingEvaluation(input, position, {
            severity: "safe",
            status: "suppressed_missing_data",
            reason: reason("MISSING_FUNDING_RATE", "Funding risk suppressed because funding rate is unavailable.", {
                symbol: position.symbol
            })
        });
    }
    const estimate = estimateFunding(position, fundingRate);
    const severity = estimate.adverse ? "warning" : "safe";
    return fundingEvaluation(input, position, {
        severity,
        status: "evaluated",
        reason: reason(estimate.adverse ? "FUNDING_ADVERSE" : "FUNDING_NOT_ADVERSE", estimate.adverse
            ? "Current funding direction is adverse for this position."
            : "Current funding direction is not adverse for this position.", {
            symbol: position.symbol,
            side: position.side,
            fundingRate: estimate.fundingRate,
            estimatedFundingCost: estimate.estimatedFundingCost
        })
    });
}
function fundingEvaluation(input, position, values) {
    return {
        accountId: input.accountId,
        itemId: position.positionId,
        riskType: "funding",
        severity: values.severity,
        status: values.status,
        thresholdVersion: input.thresholdVersion,
        sourceTier: position.sourceTier,
        sourceTimestamp: position.sourceTimestamp,
        evaluatedAt: input.evaluatedAt,
        reasons: [values.reason]
    };
}
function highestSeverity(evaluations) {
    return evaluations.reduce((highest, evaluation) => {
        return severityRank[evaluation.severity] > severityRank[highest] ? evaluation.severity : highest;
    }, "safe");
}
const severityRank = {
    safe: 0,
    warning: 1,
    danger: 2,
    critical: 3
};
function reason(code, message, values) {
    return { code, message, values };
}
//# sourceMappingURL=engine.js.map