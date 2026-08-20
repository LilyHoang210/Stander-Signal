import type { DepthSnapshot } from "@standx/domain/market";
import type { RiskEvaluation, RiskSeverity } from "@standx/domain/risk";
import type { DecimalString, PositionSnapshot, SourceTier } from "@standx/domain/portfolio";
export interface ExitEstimate {
    readonly symbol: string;
    readonly side: PositionSnapshot["side"];
    readonly requestedQuantity: DecimalString;
    readonly filledQuantity: DecimalString;
    readonly fillRatio: DecimalString;
    readonly vwap: DecimalString | null;
    readonly estimatedExitNotional: DecimalString;
    readonly slippagePct: DecimalString;
    readonly depthBands: {
        readonly within1Pct: DecimalString;
        readonly within2Pct: DecimalString;
        readonly within5Pct: DecimalString;
    };
    readonly sourceTier: SourceTier;
    readonly sourceTimestamp: Date;
}
export interface EvaluateExitLiquidityInput {
    readonly accountId: string;
    readonly positionId: string;
    readonly estimate: ExitEstimate;
    readonly dataFresh: boolean;
    readonly thresholdVersion: string;
    readonly sourceTier: SourceTier;
    readonly sourceTimestamp: Date;
    readonly evaluatedAt: Date;
}
export declare function walkClosingBook(position: PositionSnapshot, depth: DepthSnapshot): ExitEstimate;
export declare function classifyExitLiquidity(input: {
    readonly fillRatio: DecimalString | string;
}): RiskSeverity;
export declare function evaluateExitLiquidity(input: EvaluateExitLiquidityInput): RiskEvaluation;
