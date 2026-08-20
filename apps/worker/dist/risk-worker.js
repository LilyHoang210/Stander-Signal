export const evaluateAccountQueueName = "standx.evaluate-account";
export const evaluateAccountJobName = "evaluate-account";
export const deliverAlertQueueName = "standx.deliver-alert";
export const deliverAlertJobName = "deliver-alert";
export function buildEvaluateAccountJob(input) {
    return {
        name: evaluateAccountJobName,
        data: {
            accountId: input.accountId,
            userId: input.userId
        },
        options: {
            jobId: `${evaluateAccountJobName}:${input.userId}:${input.accountId}`,
            attempts: 3,
            removeOnComplete: 1000,
            removeOnFail: 5000
        }
    };
}
export function buildDeliverAlertJob(job) {
    return {
        name: deliverAlertJobName,
        data: {
            deduplicationKey: job.deduplicationKey,
            userId: job.userId,
            accountId: job.accountId,
            itemId: job.itemId,
            riskType: job.riskType,
            thresholdVersion: job.thresholdVersion,
            severity: job.severity,
            action: job.action,
            createdAt: job.createdAt.toISOString()
        },
        options: {
            jobId: `${deliverAlertJobName}:${job.deduplicationKey}:${job.action}`,
            attempts: 5,
            priority: deliveryPriority(job),
            removeOnComplete: 1000,
            removeOnFail: 5000
        }
    };
}
function deliveryPriority(job) {
    if (job.severity === "critical") {
        return 1;
    }
    if (job.severity === "danger") {
        return 5;
    }
    if (job.severity === "warning") {
        return 10;
    }
    return 20;
}
//# sourceMappingURL=risk-worker.js.map