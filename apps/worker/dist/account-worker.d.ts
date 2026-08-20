import type { ScanState } from "@standx/scanner/schedules";
export declare const scanAccountQueueName = "standx.scan-account";
export declare const scanAccountJobName = "scan-account";
export interface ScanAccountJobData {
    readonly connectionId: string;
}
export interface BuildScanAccountJobInput {
    readonly connectionId: string;
    readonly delayMs?: number;
    readonly scanState?: ScanState;
    readonly random?: () => number;
}
export interface ScanAccountJobDescriptor {
    readonly name: typeof scanAccountJobName;
    readonly data: ScanAccountJobData;
    readonly options: {
        readonly jobId: string;
        readonly delay: number;
        readonly attempts: number;
        readonly removeOnComplete: number;
        readonly removeOnFail: number;
    };
}
export declare function buildScanAccountJob(input: BuildScanAccountJobInput): ScanAccountJobDescriptor;
