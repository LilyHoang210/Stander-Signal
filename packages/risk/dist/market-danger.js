import { Decimal } from "decimal.js";
const decimalPlaces = 20;
const FinancialDecimal = Decimal.clone({ precision: 60 });
const zero = new FinancialDecimal(0);
const orderedSignalReasons = [
    {
        field: "volatilityQ99",
        code: "VOLATILITY_Q99",
        message: "Recent volatility is above the configured Q99 baseline."
    },
    {
        field: "spreadQ99",
        code: "SPREAD_Q99",
        message: "Current spread is above the configured Q99 baseline."
    },
    {
        field: "depthQ1",
        code: "DEPTH_Q1",
        message: "Visible depth is below the configured Q1 baseline."
    },
    {
        field: "adverseFundingQ99",
        code: "ADVERSE_FUNDING_Q99",
        message: "Adverse funding is above the configured Q99 baseline."
    },
    {
        field: "markIndexDivergenceQ99",
        code: "MARK_INDEX_DIVERGENCE_Q99",
        message: "Mark-index divergence is above the configured Q99 baseline."
    },
    {
        field: "openInterestShockWithAdverseMove",
        code: "OPEN_INTEREST_SHOCK_WITH_ADVERSE_MOVE",
        message: "Open interest shock appears with an adverse price move."
    },
    {
        field: "exitSlippageQ99",
        code: "EXIT_SLIPPAGE_Q99",
        message: "Estimated exit slippage is above the configured Q99 baseline."
    }
];
export function evaluateMarketDanger(input) {
    if (!input.dataFresh) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_stale",
            reason: reason("STALE_INPUT_DATA", "Market danger suppressed because required market data is stale.", {})
        });
    }
    if (input.signals.exitFillBelow80Pct) {
        return evaluation(input, {
            severity: "critical",
            status: "evaluated",
            reason: reason("EXIT_FILL_BELOW_80_PERCENT", "Visible closing-book liquidity cannot fill 80 percent of the position.", { symbol: input.symbol })
        });
    }
    const reasons = activeSignalReasons(input);
    const signalCount = reasons.length;
    const severity = classifyMarketDanger(signalCount, input.accountRiskSeverity);
    if (signalCount === 0) {
        return evaluation(input, {
            severity: "safe",
            status: "evaluated",
            reason: reason("MARKET_SIGNALS_NORMAL", "No configured market danger signal is currently extreme.", {
                symbol: input.symbol
            })
        });
    }
    const finalReasons = severity === "critical"
        ? [
            ...reasons,
            reason("MARKET_SIGNALS_WITH_ACCOUNT_RISK", "Two or more independent market signals are extreme while account risk is Danger or Critical.", {
                accountRiskSeverity: input.accountRiskSeverity,
                signalCount: String(signalCount)
            })
        ]
        : reasons;
    return {
        accountId: input.accountId,
        itemId: input.itemId,
        riskType: "market_danger",
        severity,
        status: "evaluated",
        thresholdVersion: input.thresholdVersion,
        sourceTier: input.sourceTier,
        sourceTimestamp: input.sourceTimestamp,
        evaluatedAt: input.evaluatedAt,
        reasons: finalReasons
    };
}
export function estimateFunding(position, fundingRate) {
    const rate = new FinancialDecimal(fundingRate);
    const notional = new FinancialDecimal(position.quantity)
        .abs()
        .times(new FinancialDecimal(position.markPrice));
    const adverse = (position.side === "long" && rate.gt(0)) || (position.side === "short" && rate.lt(0));
    return {
        symbol: position.symbol,
        side: position.side,
        fundingRate,
        adverse,
        estimatedFundingCost: formatDecimal(adverse ? notional.times(rate.abs()) : zero)
    };
}
function activeSignalReasons(input) {
    return orderedSignalReasons
        .filter(signal => input.signals[signal.field])
        .map(signal => reason(signal.code, signal.message, {
        symbol: input.symbol
    }));
}
function classifyMarketDanger(signalCount, accountRiskSeverity) {
    if (signalCount >= 2 &&
        (accountRiskSeverity === "danger" || accountRiskSeverity === "critical")) {
        return "critical";
    }
    if (signalCount >= 2) {
        return "danger";
    }
    return "safe";
}
function evaluation(input, values) {
    return {
        accountId: input.accountId,
        itemId: input.itemId,
        riskType: "market_danger",
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
//# sourceMappingURL=market-danger.js.map