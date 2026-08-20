import type { RiskEvaluation, RiskSeverity, RiskType } from "@standx/domain/risk";
import { type AlertAction, type AlertRiskState, type RiskStateTransition } from "./state-machine.js";
export interface ProcessRiskEvaluationInput {
    readonly userId: string;
    readonly evaluation: RiskEvaluation;
    readonly now: Date;
}
export interface AcknowledgeRiskInput {
    readonly userId: string;
    readonly evaluation: RiskEvaluation;
    readonly now: Date;
}
export interface AlertDeliveryJob {
    readonly name: "deliver-alert";
    readonly deduplicationKey: string;
    readonly userId: string;
    readonly accountId: string;
    readonly itemId: string;
    readonly riskType: RiskType;
    readonly thresholdVersion: string;
    readonly severity: RiskSeverity;
    readonly action: Exclude<AlertAction, "none">;
    readonly createdAt: Date;
}
export interface AlertStateStore {
    transition(key: string, initialState: AlertRiskState, updater: (previous: AlertRiskState) => RiskStateTransition): Promise<RiskStateTransition>;
}
export interface AlertDeliveryQueue {
    enqueue(job: AlertDeliveryJob): Promise<void>;
}
export interface RiskAlertOrchestratorDependencies {
    readonly store: AlertStateStore;
    readonly queue: AlertDeliveryQueue;
}
export declare class RiskAlertOrchestrator {
    private readonly store;
    private readonly queue;
    constructor(dependencies: RiskAlertOrchestratorDependencies);
    processEvaluation(input: ProcessRiskEvaluationInput): Promise<void>;
    acknowledge(input: AcknowledgeRiskInput): Promise<void>;
}
export declare class InMemoryAlertStateStore implements AlertStateStore {
    private readonly states;
    transition(key: string, initialState: AlertRiskState, updater: (previous: AlertRiskState) => RiskStateTransition): Promise<RiskStateTransition>;
    get(key: string): AlertRiskState | null;
}
export declare class InMemoryAlertDeliveryQueue implements AlertDeliveryQueue {
    readonly jobs: AlertDeliveryJob[];
    enqueue(job: AlertDeliveryJob): Promise<void>;
}
