import type { AlertDeliveryJob } from "@standx/alerts/orchestrator";
export declare const evaluateAccountQueueName = "standx.evaluate-account";
export declare const evaluateAccountJobName = "evaluate-account";
export declare const deliverAlertQueueName = "standx.deliver-alert";
export declare const deliverAlertJobName = "deliver-alert";
export interface EvaluateAccountJobData {
    readonly accountId: string;
    readonly userId: string;
}
export interface BuildEvaluateAccountJobInput {
    readonly accountId: string;
    readonly userId: string;
}
export interface EvaluateAccountJobDescriptor {
    readonly name: typeof evaluateAccountJobName;
    readonly data: EvaluateAccountJobData;
    readonly options: {
        readonly jobId: string;
        readonly attempts: number;
        readonly removeOnComplete: number;
        readonly removeOnFail: number;
    };
}
export interface DeliverAlertJobDescriptor {
    readonly name: typeof deliverAlertJobName;
    readonly data: {
        readonly deduplicationKey: string;
        readonly userId: string;
        readonly accountId: string;
        readonly itemId: string;
        readonly riskType: AlertDeliveryJob["riskType"];
        readonly thresholdVersion: string;
        readonly severity: AlertDeliveryJob["severity"];
        readonly action: AlertDeliveryJob["action"];
        readonly createdAt: string;
    };
    readonly options: {
        readonly jobId: string;
        readonly attempts: number;
        readonly priority: number;
        readonly removeOnComplete: number;
        readonly removeOnFail: number;
    };
}
export type BuildDeliverAlertJobInput = Omit<AlertDeliveryJob, "name">;
export declare function buildEvaluateAccountJob(input: BuildEvaluateAccountJobInput): EvaluateAccountJobDescriptor;
export declare function buildDeliverAlertJob(job: BuildDeliverAlertJobInput): DeliverAlertJobDescriptor;
