import type { BalanceSnapshot, DecimalString, PositionSnapshot } from "@standx/domain/portfolio";
import type { RiskEvaluation } from "@standx/domain/risk";
export interface PositionQualityPolicy {
    readonly highLeverage: DecimalString;
    readonly largeNotionalToEquityRatio: DecimalString;
    readonly negativePnlToMarginRatio: DecimalString;
    readonly borderlineMultiplier: DecimalString;
}
export interface ApplyPositionQualityModifiersInput {
    readonly evaluation: RiskEvaluation;
    readonly position: PositionSnapshot;
    readonly balance: BalanceSnapshot;
    readonly adverseMoves: {
        readonly m5: DecimalString;
        readonly m15: DecimalString;
        readonly m60: DecimalString;
    };
    readonly policy: PositionQualityPolicy;
}
export declare function applyPositionQualityModifiers(input: ApplyPositionQualityModifiersInput): RiskEvaluation;
