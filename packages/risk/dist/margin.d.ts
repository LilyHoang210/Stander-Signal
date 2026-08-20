import type { BalanceSnapshot, DecimalString, PositionSnapshot } from "@standx/domain/portfolio";
import type { RiskEvaluation } from "@standx/domain/risk";
export interface CrossMarginAdverseMoves {
    readonly m5: DecimalString;
    readonly m15: DecimalString;
    readonly m60: DecimalString;
}
export interface CrossMarginStressPosition {
    readonly position: PositionSnapshot;
    readonly adverseMoves: CrossMarginAdverseMoves;
}
export interface EvaluateCrossMarginInput {
    readonly balance: BalanceSnapshot;
    readonly positions: readonly CrossMarginStressPosition[];
    readonly dataFresh: boolean;
    readonly thresholdVersion: string;
    readonly evaluatedAt: Date;
}
export declare function evaluateCrossMargin(input: EvaluateCrossMarginInput): RiskEvaluation;
