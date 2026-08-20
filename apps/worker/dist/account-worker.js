import { nextScanDelay } from "@standx/scanner/schedules";
export const scanAccountQueueName = "standx.scan-account";
export const scanAccountJobName = "scan-account";
export function buildScanAccountJob(input) {
    const delay = input.delayMs ?? nextScanDelay(input.scanState ?? "active", input.random);
    return {
        name: scanAccountJobName,
        data: {
            connectionId: input.connectionId
        },
        options: {
            jobId: `${scanAccountJobName}:${input.connectionId}`,
            delay,
            attempts: 3,
            removeOnComplete: 1000,
            removeOnFail: 5000
        }
    };
}
//# sourceMappingURL=account-worker.js.map