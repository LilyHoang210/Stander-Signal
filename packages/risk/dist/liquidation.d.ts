import type { RiskEvaluation } from "@standx/domain/risk";
import type { DecimalString, PositionSnapshot } from "@standx/domain/portfolio";
export interface LiquidationAdverseMoves {
    readonly m5: DecimalString;
    readonly m15: DecimalString;
    readonly m60: DecimalString;
}
export interface EvaluateLiquidationInput {
    readonly position: PositionSnapshot;
    readonly exitSlippagePct: DecimalString;
    readonly adverseMoves: LiquidationAdverseMoves;
    readonly dataFresh: boolean;
    readonly thresholdVersion: string;
    readonly evaluatedAt: Date;
}
export declare function evaluateLiquidation(input: EvaluateLiquidationInput): RiskEvaluation;
