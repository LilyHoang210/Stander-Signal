import { StandXAccountStreamClient } from "@standx/standx/account-stream-client";
export function createStandXAccountWatchStreamFactory(options = {}) {
    return {
        connect(input) {
            const client = options.createClient?.() ?? new StandXAccountStreamClient(options.onError === undefined ? {} : { onError: options.onError });
            return client.connect({
                token: input.token,
                streams: ["balance", "position", "order"],
                onEvent: input.onEvent
            });
        }
    };
}
export class InMemoryConnectionLock {
    lockedConnectionIds = new Set();
    async withConnectionLock(connectionId, callback) {
        if (this.lockedConnectionIds.has(connectionId)) {
            return null;
        }
        this.lockedConnectionIds.add(connectionId);
        try {
            return await callback();
        }
        finally {
            this.lockedConnectionIds.delete(connectionId);
        }
    }
}
export class NoopRiskEvaluationQueue {
    enqueueEvaluateAccount(connectionId) {
        void connectionId;
        return Promise.resolve();
    }
}
//# sourceMappingURL=account-watch-runtime.js.map