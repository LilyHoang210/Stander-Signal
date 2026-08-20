import { Decimal } from "decimal.js";
const decimalPlaces = 20;
export function evaluateLiquidation(input) {
    if (!input.dataFresh) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_stale",
            reason: reason("STALE_INPUT_DATA", "Liquidation risk suppressed because required data is stale.", {})
        });
    }
    const markPrice = new Decimal(input.position.markPrice);
    if (!markPrice.isFinite() || markPrice.lte(0)) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_missing_data",
            reason: reason("INVALID_MARK_PRICE", "Liquidation risk suppressed because mark price is missing or invalid.", {
                markPrice: input.position.markPrice
            })
        });
    }
    if (input.position.liquidationPrice === null) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_missing_data",
            reason: reason("MISSING_LIQUIDATION_PRICE", "Liquidation risk suppressed because StandX did not provide a liquidation price.", {
                liquidationFields: input.position.liquidationFields
            })
        });
    }
    if (!isSupportedPositionSide(input.position.side)) {
        return evaluation(input, {
            severity: "safe",
            status: "suppressed_missing_data",
            reason: reason("INVALID_POSITION_SIDE", "Liquidation risk suppressed because position side is not supported.", {
                side: input.position.side
            })
        });
    }
    const liquidationPrice = new Decimal(input.position.liquidationPrice);
    const liquidationBuffer = calculateLiquidationBuffer(input.position, markPrice, liquidationPrice);
    const exitSlippage = new Decimal(input.exitSlippagePct);
    const effectiveBuffer = liquidationBuffer.minus(exitSlippage);
    if (liquidationBuffer.lte(0)) {
        return evaluatedRisk(input, {
            severity: "critical",
            code: "LIQUIDATION_BUFFER_NON_POSITIVE",
            message: "Position is at or beyond its StandX liquidation price.",
            liquidationBuffer,
            effectiveBuffer,
            adverseMove: input.adverseMoves.m5
        });
    }
    if (effectiveBuffer.lte(new Decimal(input.adverseMoves.m5))) {
        return evaluatedRisk(input, {
            severity: "critical",
            code: "LIQUIDATION_BUFFER_5M",
            message: "Effective liquidation buffer is inside the 5-minute Q99 adverse move.",
            liquidationBuffer,
            effectiveBuffer,
            adverseMove: input.adverseMoves.m5
        });
    }
    if (effectiveBuffer.lte(new Decimal(input.adverseMoves.m15))) {
        return evaluatedRisk(input, {
            severity: "danger",
            code: "LIQUIDATION_BUFFER_15M",
            message: "Effective liquidation buffer is inside the 15-minute Q99 adverse move.",
            liquidationBuffer,
            effectiveBuffer,
            adverseMove: input.adverseMoves.m15
        });
    }
    if (effectiveBuffer.lte(new Decimal(input.adverseMoves.m60))) {
        return evaluatedRisk(input, {
            severity: "warning",
            code: "LIQUIDATION_BUFFER_60M",
            message: "Effective liquidation buffer is inside the 60-minute Q99 adverse move.",
            liquidationBuffer,
            effectiveBuffer,
            adverseMove: input.adverseMoves.m60
        });
    }
    return evaluatedRisk(input, {
        severity: "safe",
        code: "LIQUIDATION_BUFFER_SAFE",
        message: "Effective liquidation buffer is outside configured adverse-move thresholds.",
        liquidationBuffer,
        effectiveBuffer,
        adverseMove: input.adverseMoves.m60
    });
}
function calculateLiquidationBuffer(position, markPrice, liquidationPrice) {
    if (position.side === "long") {
        return markPrice.minus(liquidationPrice).div(markPrice);
    }
    return liquidationPrice.minus(markPrice).div(markPrice);
}
function isSupportedPositionSide(side) {
    return side === "long" || side === "short";
}
function evaluatedRisk(input, values) {
    return evaluation(input, {
        severity: values.severity,
        status: "evaluated",
        reason: reason(values.code, values.message, {
            liquidationBufferPct: formatDecimal(values.liquidationBuffer),
            effectiveBufferPct: formatDecimal(values.effectiveBuffer),
            exitSlippagePct: input.exitSlippagePct,
            adverseMovePct: values.adverseMove,
            markPrice: input.position.markPrice,
            liquidationPrice: input.position.liquidationPrice ?? ""
        })
    });
}
function evaluation(input, values) {
    return {
        accountId: input.position.accountId,
        itemId: input.position.positionId,
        riskType: "liquidation",
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
//# sourceMappingURL=liquidation.js.map