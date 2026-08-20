import type { DecimalString, PositionSnapshot, SourceTier } from "@standx/domain/portfolio";
import type { RiskEvaluation, RiskSeverity } from "@standx/domain/risk";
export interface MarketDangerSignals {
    readonly volatilityQ99: boolean;
    readonly spreadQ99: boolean;
    readonly depthQ1: boolean;
    readonly adverseFundingQ99: boolean;
    readonly markIndexDivergenceQ99: boolean;
    readonly openInterestShockWithAdverseMove: boolean;
    readonly exitSlippageQ99: boolean;
    readonly exitFillBelow80Pct: boolean;
}
export interface EvaluateMarketDangerInput {
    readonly accountId: string;
    readonly itemId: string;
    readonly symbol: string;
    readonly signals: MarketDangerSignals;
    readonly accountRiskSeverity: RiskSeverity;
    readonly dataFresh: boolean;
    readonly thresholdVersion: string;
    readonly sourceTier: SourceTier;
    readonly sourceTimestamp: Date;
    readonly evaluatedAt: Date;
}
export interface FundingEstimate {
    readonly symbol: string;
    readonly side: PositionSnapshot["side"];
    readonly fundingRate: DecimalString;
    readonly adverse: boolean;
    readonly estimatedFundingCost: DecimalString;
}
export declare function evaluateMarketDanger(input: EvaluateMarketDangerInput): RiskEvaluation;
export declare function estimateFunding(position: PositionSnapshot, fundingRate: DecimalString): FundingEstimate;
