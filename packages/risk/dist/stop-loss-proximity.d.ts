import type { DecimalString, OpenOrderSnapshot, PositionSnapshot } from "@standx/domain/portfolio";
import type { RiskEvaluation } from "@standx/domain/risk";
export interface StopLossProximityThresholds {
    readonly criticalDistancePct: DecimalString;
    readonly dangerDistancePct: DecimalString;
    readonly warningDistancePct: DecimalString;
}
export interface EvaluateStopLossProximityInput {
    readonly position: PositionSnapshot;
    readonly openOrders: readonly OpenOrderSnapshot[];
    readonly thresholds: StopLossProximityThresholds;
    readonly dataFresh: boolean;
    readonly thresholdVersion: string;
    readonly evaluatedAt: Date;
}
export declare function evaluateStopLossProximity(input: EvaluateStopLossProximityInput): RiskEvaluation | null;
