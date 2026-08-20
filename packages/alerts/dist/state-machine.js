const warningPersistenceMs = 120_000;
const dangerPersistenceMs = 20_000;
const recoveryPersistenceMs = 300_000;
const criticalReminderMs = 300_000;
const severityRank = {
    safe: 0,
    warning: 1,
    danger: 2,
    critical: 3
};
function shouldNotifyDangerImmediately(previous, evaluation) {
    return evaluation.severity === "danger" && (previous.activeSeverity === "safe" ||
        previous.activeSeverity === "warning" ||
        previous.candidateSeverity === "warning");
}
export function transitionRiskState(previous, evaluation, now) {
    const deduplicationKey = alertDeduplicationKey(previous.userId, evaluation);
    if (evaluation.severity === "safe" || evaluation.status !== "evaluated") {
        return transitionTowardSafe(previous, evaluation, now, deduplicationKey);
    }
    if (evaluation.severity === "critical") {
        return transitionCritical(previous, evaluation, now, deduplicationKey);
    }
    if (shouldNotifyDangerImmediately(previous, evaluation)) {
        return {
            action: "notify",
            deduplicationKey,
            state: activate(previous, evaluation, now)
        };
    }
    if (previous.activeSeverity === evaluation.severity &&
        previous.notifiedAt !== null &&
        previous.resolvedAt === null) {
        return noAction({
            ...previous,
            candidateSeverity: null,
            candidateStartedAt: null,
            lastMaterialValues: materialValues(evaluation),
            safeSince: null
        }, deduplicationKey);
    }
    const candidateStartedAt = previous.candidateSeverity === evaluation.severity && previous.candidateStartedAt !== null
        ? previous.candidateStartedAt
        : now;
    const requiredPersistenceMs = persistenceMs(evaluation.severity);
    if (now.getTime() - candidateStartedAt.getTime() >= requiredPersistenceMs) {
        return {
            action: "notify",
            deduplicationKey,
            state: activate(previous, evaluation, now)
        };
    }
    return noAction({
        ...previous,
        accountId: evaluation.accountId,
        itemId: evaluation.itemId,
        riskType: evaluation.riskType,
        thresholdVersion: evaluation.thresholdVersion,
        candidateSeverity: evaluation.severity,
        candidateStartedAt,
        lastMaterialValues: materialValues(evaluation),
        safeSince: null
    }, deduplicationKey);
}
export function alertDeduplicationKey(userId, evaluation) {
    return [
        userId,
        evaluation.accountId,
        evaluation.itemId,
        evaluation.riskType,
        evaluation.thresholdVersion,
        evaluation.severity
    ].join(":");
}
export function riskStateStorageKey(userId, evaluation) {
    return [
        userId,
        evaluation.accountId,
        evaluation.itemId,
        evaluation.riskType,
        evaluation.thresholdVersion
    ].join(":");
}
export function initialRiskState(userId, evaluation) {
    return {
        userId,
        accountId: evaluation.accountId,
        itemId: evaluation.itemId,
        riskType: evaluation.riskType,
        thresholdVersion: evaluation.thresholdVersion,
        activeSeverity: "safe",
        candidateSeverity: null,
        candidateStartedAt: null,
        lastMaterialValues: {},
        notifiedAt: null,
        acknowledgedAt: null,
        safeSince: null,
        resolvedAt: null
    };
}
export function acknowledgeRiskState(state, now) {
    return {
        ...state,
        acknowledgedAt: now
    };
}
function transitionTowardSafe(previous, evaluation, now, deduplicationKey) {
    if (previous.activeSeverity === "safe") {
        return noAction({
            ...previous,
            candidateSeverity: null,
            candidateStartedAt: null,
            safeSince: null,
            lastMaterialValues: materialValues(evaluation)
        }, deduplicationKey);
    }
    const safeSince = previous.safeSince ?? now;
    if (now.getTime() - safeSince.getTime() >= recoveryPersistenceMs) {
        return {
            action: "recover",
            deduplicationKey,
            state: {
                ...previous,
                activeSeverity: "safe",
                candidateSeverity: null,
                candidateStartedAt: null,
                lastMaterialValues: materialValues(evaluation),
                notifiedAt: null,
                acknowledgedAt: null,
                safeSince,
                resolvedAt: now
            }
        };
    }
    return noAction({
        ...previous,
        candidateSeverity: null,
        candidateStartedAt: null,
        lastMaterialValues: materialValues(evaluation),
        safeSince
    }, deduplicationKey);
}
function transitionCritical(previous, evaluation, now, deduplicationKey) {
    if (previous.activeSeverity !== "critical") {
        return {
            action: "notify",
            deduplicationKey,
            state: activate(previous, evaluation, now)
        };
    }
    if (previous.acknowledgedAt === null &&
        previous.notifiedAt !== null &&
        now.getTime() - previous.notifiedAt.getTime() >= criticalReminderMs) {
        return {
            action: "remind",
            deduplicationKey,
            state: {
                ...previous,
                lastMaterialValues: materialValues(evaluation),
                notifiedAt: now,
                safeSince: null,
                resolvedAt: null
            }
        };
    }
    return noAction({
        ...previous,
        lastMaterialValues: materialValues(evaluation),
        safeSince: null,
        resolvedAt: null
    }, deduplicationKey);
}
function activate(previous, evaluation, now) {
    const isEscalation = severityRank[evaluation.severity] > severityRank[previous.activeSeverity];
    return {
        ...previous,
        accountId: evaluation.accountId,
        itemId: evaluation.itemId,
        riskType: evaluation.riskType,
        thresholdVersion: evaluation.thresholdVersion,
        activeSeverity: evaluation.severity,
        candidateSeverity: null,
        candidateStartedAt: null,
        lastMaterialValues: materialValues(evaluation),
        notifiedAt: now,
        acknowledgedAt: isEscalation ? null : previous.acknowledgedAt,
        safeSince: null,
        resolvedAt: null
    };
}
function noAction(state, deduplicationKey) {
    return {
        action: "none",
        deduplicationKey,
        state
    };
}
function persistenceMs(severity) {
    if (severity === "warning") {
        return warningPersistenceMs;
    }
    if (severity === "danger") {
        return dangerPersistenceMs;
    }
    return 0;
}
function materialValues(evaluation) {
    const values = {
        severity: evaluation.severity,
        status: evaluation.status
    };
    for (const reason of evaluation.reasons) {
        values[`reason.${reason.code}`] = reason.message;
        for (const [key, value] of Object.entries(reason.values)) {
            values[`${reason.code}.${key}`] = value;
        }
    }
    return values;
}
//# sourceMappingURL=state-machine.js.map