import type { DecimalString, PositionSnapshot, SourceTier } from "@standx/domain/portfolio";
import type { RiskEvaluation } from "@standx/domain/risk";
import { type MarketDangerSignals } from "./market-danger.js";
export interface RiskEngineMarketDangerInput {
    readonly symbol: string;
    readonly signals: MarketDangerSignals;
    readonly dataFresh: boolean;
    readonly sourceTier: SourceTier;
    readonly sourceTimestamp: Date;
}
export interface RiskEngineAccountInput {
    readonly accountId: string;
    readonly positions: readonly PositionSnapshot[];
    readonly liquidationEvaluations: readonly RiskEvaluation[];
    readonly exitLiquidityEvaluations: readonly RiskEvaluation[];
    readonly crossMarginEvaluation: RiskEvaluation;
    readonly marketDangerInputs: readonly RiskEngineMarketDangerInput[];
    readonly fundingRates: ReadonlyMap<string, DecimalString>;
    readonly thresholdVersion: string;
    readonly evaluatedAt: Date;
}
export declare class RiskEngine {
    evaluateAccount(input: RiskEngineAccountInput): readonly RiskEvaluation[];
}
