import { describe, expect, it } from "vitest";
import { acknowledgeRiskState, alertDeduplicationKey, transitionRiskState } from "./state-machine.js";
const t0 = new Date("2026-08-14T08:00:00.000Z");
const t0Plus19s = new Date("2026-08-14T08:00:19.000Z");
const t0Plus119s = new Date("2026-08-14T08:01:59.000Z");
const t0Plus120s = new Date("2026-08-14T08:02:00.000Z");
const t0Plus4m = new Date("2026-08-14T08:04:00.000Z");
const t0Plus5m = new Date("2026-08-14T08:05:00.000Z");
const t0Plus9m = new Date("2026-08-14T08:09:00.000Z");
const evaluation = (severity, overrides = {}) => ({
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
    ],
    ...overrides
});
const safeState = (overrides = {}) => ({
    userId: "user-1",
    accountId: "account-1",
    itemId: "position-1",
    riskType: "liquidation",
    thresholdVersion: "threshold-v1",
    activeSeverity: "safe",
    candidateSeverity: null,
    candidateStartedAt: null,
    lastMaterialValues: {},
    notifiedAt: null,
    acknowledgedAt: null,
    safeSince: null,
    resolvedAt: null,
    ...overrides
});
describe("transitionRiskState", () => {
    it("sends Critical immediately and repeats after five minutes until acknowledged", () => {
        const first = transitionRiskState(safeState(), evaluation("critical"), t0);
        expect(first.action).toBe("notify");
        const early = transitionRiskState(first.state, evaluation("critical"), t0Plus4m);
        expect(early.action).toBe("none");
        const repeat = transitionRiskState(early.state, evaluation("critical"), t0Plus5m);
        expect(repeat.action).toBe("remind");
    });
    it("suppresses critical reminders after acknowledgment without suppressing evaluation", () => {
        const first = transitionRiskState(safeState(), evaluation("critical"), t0);
        const acknowledged = acknowledgeRiskState(first.state, t0Plus4m);
        const repeat = transitionRiskState(acknowledged, evaluation("critical"), t0Plus5m);
        expect(repeat.action).toBe("none");
        expect(repeat.state.activeSeverity).toBe("critical");
        expect(repeat.state.acknowledgedAt).toEqual(t0Plus4m);
    });
    it("does not let acknowledgment suppress escalation", () => {
        const danger = transitionRiskState(safeState(), evaluation("danger"), t0);
        const acknowledged = acknowledgeRiskState(danger.state, t0Plus4m);
        const critical = transitionRiskState(acknowledged, evaluation("critical"), t0Plus5m);
        expect(critical.action).toBe("notify");
        expect(critical.state.activeSeverity).toBe("critical");
        expect(critical.state.acknowledgedAt).toBeNull();
    });
    it("requires five continuous safe minutes before recovery", () => {
        const dangerState = safeState({
            activeSeverity: "danger",
            notifiedAt: t0,
            lastMaterialValues: { buffer: "danger" }
        });
        const early = transitionRiskState(dangerState, evaluation("safe"), t0Plus4m);
        expect(early.action).toBe("none");
        expect(early.state.safeSince).toEqual(t0Plus4m);
        const recover = transitionRiskState(early.state, evaluation("safe"), t0Plus9m);
        expect(recover.action).toBe("recover");
        expect(recover.state.activeSeverity).toBe("safe");
        expect(recover.state.resolvedAt).toEqual(t0Plus9m);
    });
    it("requires warning persistence before notifying", () => {
        const warningCandidate = transitionRiskState(safeState(), evaluation("warning"), t0);
        expect(warningCandidate.action).toBe("none");
        const warningEarly = transitionRiskState(warningCandidate.state, evaluation("warning"), t0Plus119s);
        expect(warningEarly.action).toBe("none");
        const warningNotify = transitionRiskState(warningEarly.state, evaluation("warning"), t0Plus120s);
        expect(warningNotify.action).toBe("notify");
    });
    it("notifies immediately when a safe position becomes danger", () => {
        const danger = transitionRiskState(safeState(), evaluation("danger"), t0);
        expect(danger.action).toBe("notify");
        expect(danger.state.activeSeverity).toBe("danger");
    });
    it("notifies immediately when a warning candidate escalates to danger", () => {
        const warningCandidate = transitionRiskState(safeState(), evaluation("warning"), t0);
        const danger = transitionRiskState(warningCandidate.state, evaluation("danger"), t0Plus19s);
        expect(danger.action).toBe("notify");
        expect(danger.state.activeSeverity).toBe("danger");
    });
    it("does not send recovery for a warning candidate that was never notified", () => {
        const warningCandidate = transitionRiskState(safeState(), evaluation("warning"), t0);
        const safe = transitionRiskState(warningCandidate.state, evaluation("safe"), t0Plus5m);
        expect(safe.action).toBe("none");
        expect(safe.state.activeSeverity).toBe("safe");
        expect(safe.state.resolvedAt).toBeNull();
    });
    it("builds deduplication key from user, item, risk type, threshold version, and severity", () => {
        expect(alertDeduplicationKey("user-1", evaluation("danger"))).toBe("user-1:account-1:position-1:liquidation:threshold-v1:danger");
    });
});
//# sourceMappingURL=state-machine.test.js.map