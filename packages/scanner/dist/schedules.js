const baseDelaysByState = {
    "no-position": 300_000,
    active: 60_000,
    danger: 15_000,
    critical: 5_000
};
const refreshCooldownMs = 60_000;
const rateLimitBaseDelayMs = 1_000;
const maxRateLimitBackoffMs = 300_000;
export function nextScanDelay(state, random = Math.random) {
    const boundedRandom = clamp(random(), 0, 1);
    const jitterMultiplier = 0.9 + boundedRandom * 0.2;
    return Math.round(baseDelaysByState[state] * jitterMultiplier);
}
export function canRefresh(lastRefreshAt, now) {
    if (lastRefreshAt === null) {
        return true;
    }
    return now.getTime() - lastRefreshAt.getTime() >= refreshCooldownMs;
}
export function nextRateLimitBackoffDelay(input) {
    if (input.retryAfterSeconds !== null) {
        return Math.min(Math.max(input.retryAfterSeconds, 0) * 1_000, maxRateLimitBackoffMs);
    }
    const boundedAttempt = Math.max(input.attempt, 1);
    const baseDelay = Math.min(rateLimitBaseDelayMs * 2 ** (boundedAttempt - 1), maxRateLimitBackoffMs);
    const boundedRandom = clamp((input.random ?? Math.random)(), 0, 1);
    const jitterMultiplier = 0.9 + boundedRandom * 0.2;
    return Math.round(baseDelay * jitterMultiplier);
}
function clamp(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(Math.max(value, min), max);
}
//# sourceMappingURL=schedules.js.map