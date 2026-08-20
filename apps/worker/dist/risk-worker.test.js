import { describe, expect, it } from "vitest";
import { buildDeliverAlertJob, buildEvaluateAccountJob, deliverAlertJobName, deliverAlertQueueName, evaluateAccountJobName, evaluateAccountQueueName } from "./risk-worker.js";
describe("risk worker job contract", () => {
    it("uses stable BullMQ queue and job names", () => {
        expect(evaluateAccountQueueName).toBe("standx.evaluate-account");
        expect(evaluateAccountJobName).toBe("evaluate-account");
        expect(deliverAlertQueueName).toBe("standx.deliver-alert");
        expect(deliverAlertJobName).toBe("deliver-alert");
    });
    it("builds deterministic evaluate-account jobs", () => {
        expect(buildEvaluateAccountJob({
            accountId: "account-1",
            userId: "user-1"
        })).toEqual({
            name: "evaluate-account",
            data: {
                accountId: "account-1",
                userId: "user-1"
            },
            options: {
                jobId: "evaluate-account:user-1:account-1",
                attempts: 3,
                removeOnComplete: 1000,
                removeOnFail: 5000
            }
        });
    });
    it("builds priority deliver-alert jobs from transition output", () => {
        expect(buildDeliverAlertJob({
            deduplicationKey: "user-1:account-1:position-1:liquidation:threshold-v1:critical",
            userId: "user-1",
            accountId: "account-1",
            itemId: "position-1",
            riskType: "liquidation",
            thresholdVersion: "threshold-v1",
            severity: "critical",
            action: "notify",
            createdAt: new Date("2026-08-14T08:00:00.000Z")
        })).toEqual({
            name: "deliver-alert",
            data: {
                deduplicationKey: "user-1:account-1:position-1:liquidation:threshold-v1:critical",
                userId: "user-1",
                accountId: "account-1",
                itemId: "position-1",
                riskType: "liquidation",
                thresholdVersion: "threshold-v1",
                severity: "critical",
                action: "notify",
                createdAt: "2026-08-14T08:00:00.000Z"
            },
            options: {
                jobId: "deliver-alert:user-1:account-1:position-1:liquidation:threshold-v1:critical:notify",
                attempts: 5,
                priority: 1,
                removeOnComplete: 1000,
                removeOnFail: 5000
            }
        });
    });
});
//# sourceMappingURL=risk-worker.test.js.map