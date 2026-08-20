import type { RiskEvaluation, RiskSeverity, RiskType } from "@standx/domain/risk";
export type AlertAction = "notify" | "remind" | "recover" | "none";
export interface AlertRiskState {
    readonly userId: string;
    readonly accountId: string;
    readonly itemId: string;
    readonly riskType: RiskType;
    readonly thresholdVersion: string;
    readonly activeSeverity: RiskSeverity;
    readonly candidateSeverity: RiskSeverity | null;
    readonly candidateStartedAt: Date | null;
    readonly lastMaterialValues: Readonly<Record<string, string>>;
    readonly notifiedAt: Date | null;
    readonly acknowledgedAt: Date | null;
    readonly safeSince: Date | null;
    readonly resolvedAt: Date | null;
}
export interface RiskStateTransition {
    readonly action: AlertAction;
    readonly state: AlertRiskState;
    readonly deduplicationKey: string;
}
export declare function transitionRiskState(previous: AlertRiskState, evaluation: RiskEvaluation, now: Date): RiskStateTransition;
export declare function alertDeduplicationKey(userId: string, evaluation: RiskEvaluation): string;
export declare function riskStateStorageKey(userId: string, evaluation: RiskEvaluation): string;
export declare function initialRiskState(userId: string, evaluation: RiskEvaluation): AlertRiskState;
export declare function acknowledgeRiskState(state: AlertRiskState, now: Date): AlertRiskState;
