import { Decimal } from "decimal.js";
const decimalPlaces = 20;
export function applyPositionQualityModifiers(input) {
    if (input.evaluation.status !== "evaluated" || input.evaluation.riskType !== "liquidation") {
        return input.evaluation;
    }
    const effectiveBuffer = extractDecimal(input.evaluation, "effectiveBufferPct");
    if (effectiveBuffer === null) {
        return input.evaluation;
    }
    const modifierReasons = collectModifierReasons(input);
    if (modifierReasons.length === 0) {
        return input.evaluation;
    }
    const nextSeverity = modifiedSeverity({
        current: input.evaluation.severity,
        effectiveBuffer,
        adverseMoves: input.adverseMoves,
        borderlineMultiplier: new Decimal(input.policy.borderlineMultiplier)
    });
    return {
        ...input.evaluation,
        severity: nextSeverity,
        reasons: [...input.evaluation.reasons, ...modifierReasons]
    };
}
function collectModifierReasons(input) {
    const reasons = [];
    const leverage = new Decimal(input.position.leverage);
    const notional = new Decimal(input.position.notional).abs();
    const equity = new Decimal(input.balance.equity);
    const initialMargin = new Decimal(input.position.initialMargin).abs();
    const holdingMargin = new Decimal(input.position.holdingMargin).abs();
    const margin = Decimal.max(initialMargin, holdingMargin);
    const unrealizedPnl = new Decimal(input.position.unrealizedPnl);
    if (leverage.gte(new Decimal(input.policy.highLeverage))) {
        reasons.push(reason("POSITION_QUALITY_HIGH_LEVERAGE", "Position leverage is high for automatic risk policy.", {
            leverage: input.position.leverage,
            highLeverage: input.policy.highLeverage
        }));
    }
    if (equity.gt(0)) {
        const notionalToEquity = notional.div(equity);
        if (notionalToEquity.gte(new Decimal(input.policy.largeNotionalToEquityRatio))) {
            reasons.push(reason("POSITION_QUALITY_LARGE_NOTIONAL", "Position notional is large relative to account equity.", {
                notional: input.position.notional,
                equity: input.balance.equity,
                notionalToEquity: formatDecimal(notionalToEquity),
                largeNotionalToEquityRatio: input.policy.largeNotionalToEquityRatio
            }));
        }
    }
    if (margin.gt(0) && unrealizedPnl.lt(0)) {
        const negativePnlToMargin = unrealizedPnl.abs().div(margin);
        if (negativePnlToMargin.gte(new Decimal(input.policy.negativePnlToMarginRatio))) {
            reasons.push(reason("POSITION_QUALITY_NEGATIVE_PNL", "Unrealized loss is large relative to position margin.", {
                unrealizedPnl: input.position.unrealizedPnl,
                margin: formatDecimal(margin),
                negativePnlToMargin: formatDecimal(negativePnlToMargin),
                negativePnlToMarginRatio: input.policy.negativePnlToMarginRatio
            }));
        }
    }
    if (input.position.marginMode === "isolated") {
        const effectiveBuffer = extractDecimal(input.evaluation, "effectiveBufferPct");
        if (effectiveBuffer !== null && effectiveBuffer.lte(new Decimal(input.adverseMoves.m60))) {
            reasons.push(reason("POSITION_QUALITY_ISOLATED_THIN_BUFFER", "Isolated position has a thin effective liquidation buffer.", {
                effectiveBufferPct: formatDecimal(effectiveBuffer),
                warningAdverseMovePct: input.adverseMoves.m60
            }));
        }
    }
    return reasons;
}
function modifiedSeverity(input) {
    if (input.current === "safe") {
        const warningBorderline = new Decimal(input.adverseMoves.m60).times(input.borderlineMultiplier);
        return input.effectiveBuffer.lte(warningBorderline) ? "warning" : "safe";
    }
    if (input.current === "warning") {
        const dangerBorderline = new Decimal(input.adverseMoves.m15).times(input.borderlineMultiplier);
        return input.effectiveBuffer.lte(dangerBorderline) ? "danger" : "warning";
    }
    return input.current;
}
function extractDecimal(evaluation, key) {
    for (const riskReason of evaluation.reasons) {
        const value = riskReason.values[key];
        if (typeof value === "string") {
            const decimal = new Decimal(value);
            if (decimal.isFinite()) {
                return decimal;
            }
        }
    }
    return null;
}
function reason(code, message, values) {
    return { code, message, values };
}
function formatDecimal(value) {
    return value.toFixed(decimalPlaces);
}
//# sourceMappingURL=position-quality.js.map