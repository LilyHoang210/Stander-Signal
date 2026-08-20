import { describe, expect, it } from "vitest";
import { InMemoryAlertDeliveryQueue, InMemoryAlertStateStore, RiskAlertOrchestrator } from "./orchestrator.js";
const t0 = new Date("2026-08-14T08:00:00.000Z");
const t0Plus20s = new Date("2026-08-14T08:00:20.000Z");
const t0Plus5m = new Date("2026-08-14T08:05:00.000Z");
const evaluation = (severity) => ({
    accountId: "account-1",
    itemId: "position-1",
    riskType: "liquidation",
    severity,
    status: "evaluated",
    thresholdVersion: "threshold-v1",
    sourceTier: "A",
    sourceTimestamp: t0,
    evaluatedAt: t0,
    reasons: [
        {
            code: `RISK_${severity.toUpperCase()}`,
            message: "fixture",
            values: {
                buffer: severity
            }
        }
    ]
});
describe("RiskAlertOrchestrator", () => {
    it("enqueues only one notification when duplicate workers process the same critical evaluation", async () => {
        const store = new InMemoryAlertStateStore();
        const queue = new InMemoryAlertDeliveryQueue();
        const orchestrator = new RiskAlertOrchestrator({ store, queue });
        await orchestrator.processEvaluation({
            userId: "user-1",
            evaluation: evaluation("critical"),
            now: t0
        });
        await orchestrator.processEvaluation({
            userId: "user-1",
            evaluation: evaluation("critical"),
            now: t0
        });
        expect(queue.jobs).toHaveLength(1);
        expect(queue.jobs[0]).toMatchObject({
            name: "deliver-alert",
            action: "notify",
            deduplicationKey: "user-1:account-1:position-1:liquidation:threshold-v1:critical"
        });
    });
    it("enqueues a reminder after the critical repeat interval", async () => {
        const store = new InMemoryAlertStateStore();
        const queue = new InMemoryAlertDeliveryQueue();
        const orchestrator = new RiskAlertOrchestrator({ store, queue });
        await orchestrator.processEvaluation({ userId: "user-1", evaluation: evaluation("critical"), now: t0 });
        await orchestrator.processEvaluation({
            userId: "user-1",
            evaluation: evaluation("critical"),
            now: t0Plus5m
        });
        expect(queue.jobs.map(job => job.action)).toEqual(["notify", "remind"]);
    });
    it("persists acknowledgment and suppresses reminders", async () => {
        const store = new InMemoryAlertStateStore();
        const queue = new InMemoryAlertDeliveryQueue();
        const orchestrator = new RiskAlertOrchestrator({ store, queue });
        await orchestrator.processEvaluation({ userId: "user-1", evaluation: evaluation("critical"), now: t0 });
        await orchestrator.acknowledge({
            userId: "user-1",
            evaluation: evaluation("critical"),
            now: t0Plus20s
        });
        await orchestrator.processEvaluation({
            userId: "user-1",
            evaluation: evaluation("critical"),
            now: t0Plus5m
        });
        expect(queue.jobs.map(job => job.action)).toEqual(["notify"]);
    });
    it("enqueues danger only after persistence delay", async () => {
        const store = new InMemoryAlertStateStore();
        const queue = new InMemoryAlertDeliveryQueue();
        const orchestrator = new RiskAlertOrchestrator({ store, queue });
        await orchestrator.processEvaluation({ userId: "user-1", evaluation: evaluation("danger"), now: t0 });
        await orchestrator.processEvaluation({
            userId: "user-1",
            evaluation: evaluation("danger"),
            now: t0Plus20s
        });
        expect(queue.jobs).toHaveLength(1);
        expect(queue.jobs[0]?.action).toBe("notify");
    });
});
//# sourceMappingURL=orchestrator.test.js.map