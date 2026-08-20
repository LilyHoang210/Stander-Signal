import { acknowledgeRiskState, alertDeduplicationKey, initialRiskState, riskStateStorageKey, transitionRiskState } from "./state-machine.js";
export class RiskAlertOrchestrator {
    store;
    queue;
    constructor(dependencies) {
        this.store = dependencies.store;
        this.queue = dependencies.queue;
    }
    async processEvaluation(input) {
        const key = riskStateStorageKey(input.userId, input.evaluation);
        const initialState = initialRiskState(input.userId, input.evaluation);
        const transition = await this.store.transition(key, initialState, previous => transitionRiskState(previous, input.evaluation, input.now));
        if (transition.action !== "none") {
            await this.queue.enqueue({
                name: "deliver-alert",
                deduplicationKey: transition.deduplicationKey,
                userId: input.userId,
                accountId: input.evaluation.accountId,
                itemId: input.evaluation.itemId,
                riskType: input.evaluation.riskType,
                thresholdVersion: input.evaluation.thresholdVersion,
                severity: input.evaluation.severity,
                action: transition.action,
                createdAt: input.now
            });
        }
    }
    async acknowledge(input) {
        const key = riskStateStorageKey(input.userId, input.evaluation);
        const initialState = initialRiskState(input.userId, input.evaluation);
        await this.store.transition(key, initialState, previous => ({
            action: "none",
            deduplicationKey: alertDeduplicationKey(input.userId, input.evaluation),
            state: acknowledgeRiskState(previous, input.now)
        }));
    }
}
export class InMemoryAlertStateStore {
    states = new Map();
    transition(key, initialState, updater) {
        const previous = this.states.get(key) ?? initialState;
        const transition = updater(previous);
        this.states.set(key, transition.state);
        return Promise.resolve(transition);
    }
    get(key) {
        return this.states.get(key) ?? null;
    }
}
export class InMemoryAlertDeliveryQueue {
    jobs = [];
    enqueue(job) {
        this.jobs.push(job);
        return Promise.resolve();
    }
}
//# sourceMappingURL=orchestrator.js.map