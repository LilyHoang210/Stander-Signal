export class AccountWatchCoordinator {
    connections;
    credentials;
    streamFactory;
    scanner;
    maxLiveConnections;
    reconcileIntervalMs;
    debounceMs;
    fallbackScanMs;
    now;
    onError;
    setTimer;
    clearTimer;
    liveSessions = new Map();
    debounceTimers = new Map();
    fallbackSchedules = new Map();
    reconcileTimer = null;
    stopped = true;
    constructor(options) {
        this.connections = options.connections;
        this.credentials = options.credentials;
        this.streamFactory = options.streamFactory;
        this.scanner = options.scanner;
        this.maxLiveConnections = options.maxLiveConnections;
        this.reconcileIntervalMs = options.reconcileIntervalMs;
        this.debounceMs = options.debounceMs;
        this.fallbackScanMs = options.fallbackScanMs;
        this.now = options.now ?? (() => new Date());
        this.onError = options.onError ?? (() => undefined);
        this.setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
        this.clearTimer =
            options.clearTimer ??
                (timer => {
                    clearTimeout(timer);
                });
    }
    async start() {
        if (!this.stopped) {
            return;
        }
        this.stopped = false;
        await this.reconcile();
        this.scheduleReconcile();
    }
    async stop() {
        this.stopped = true;
        if (this.reconcileTimer !== null) {
            this.clearTimer(this.reconcileTimer);
            this.reconcileTimer = null;
        }
        for (const timer of this.debounceTimers.values()) {
            this.clearTimer(timer);
        }
        this.debounceTimers.clear();
        for (const schedule of this.fallbackSchedules.values()) {
            this.clearTimer(schedule.timer);
        }
        this.fallbackSchedules.clear();
        const sessions = [...this.liveSessions.values()];
        this.liveSessions.clear();
        await Promise.allSettled(sessions.map(session => session.close()));
    }
    async reconcile() {
        const activeConnections = await this.connections.listActive();
        const activeIds = new Set(activeConnections.map(connection => connection.id));
        const liveIds = new Set([...activeConnections]
            .sort((left, right) => left.id.localeCompare(right.id))
            .slice(0, this.maxLiveConnections)
            .map(connection => connection.id));
        for (const [connectionId, session] of this.liveSessions.entries()) {
            if (!liveIds.has(connectionId) || !activeIds.has(connectionId)) {
                this.liveSessions.delete(connectionId);
                await session.close();
            }
        }
        for (const connection of activeConnections) {
            this.scheduleFallback(connection.id);
            if (liveIds.has(connection.id) && !this.liveSessions.has(connection.id)) {
                await this.openLiveStream(connection);
            }
        }
    }
    handleStreamEvent(connectionId, event) {
        void event;
        if (this.debounceTimers.has(connectionId)) {
            return Promise.resolve();
        }
        const timer = this.setTimer(() => {
            this.debounceTimers.delete(connectionId);
            void this.scanConnection(connectionId);
        }, this.debounceMs);
        this.debounceTimers.set(connectionId, timer);
        return Promise.resolve();
    }
    handleDisconnect(connectionId) {
        this.liveSessions.delete(connectionId);
        this.rescheduleFallback(connectionId);
        return Promise.resolve();
    }
    nextFallbackScanAt(connectionId) {
        return this.fallbackSchedules.get(connectionId)?.scanAt ?? null;
    }
    async openLiveStream(connection) {
        try {
            const session = await this.credentials.withLease(connection.id, token => this.streamFactory.connect({
                connectionId: connection.id,
                token,
                onEvent: event => this.handleStreamEvent(connection.id, event),
                onDisconnect: () => this.handleDisconnect(connection.id)
            }));
            this.liveSessions.set(connection.id, session);
        }
        catch (error) {
            this.onError(error instanceof Error ? error : new Error(String(error)));
            this.rescheduleFallback(connection.id);
        }
    }
    scheduleReconcile() {
        this.reconcileTimer = this.setTimer(() => {
            this.reconcileTimer = null;
            if (this.stopped) {
                return;
            }
            void this.reconcile()
                .catch((error) => {
                this.onError(error instanceof Error ? error : new Error(String(error)));
            })
                .finally(() => {
                if (!this.stopped) {
                    this.scheduleReconcile();
                }
            });
        }, this.reconcileIntervalMs);
    }
    scheduleFallback(connectionId) {
        if (this.fallbackSchedules.has(connectionId)) {
            return;
        }
        this.rescheduleFallback(connectionId);
    }
    rescheduleFallback(connectionId) {
        const existing = this.fallbackSchedules.get(connectionId);
        if (existing !== undefined) {
            this.clearTimer(existing.timer);
        }
        const scanAt = new Date(this.now().getTime() + this.fallbackScanMs);
        const timer = this.setTimer(() => {
            this.fallbackSchedules.delete(connectionId);
            void this.scanConnection(connectionId)
                .catch((error) => {
                this.onError(error instanceof Error ? error : new Error(String(error)));
            })
                .finally(() => {
                if (!this.stopped) {
                    this.rescheduleFallback(connectionId);
                }
            });
        }, this.fallbackScanMs);
        this.fallbackSchedules.set(connectionId, { timer, scanAt });
    }
    async scanConnection(connectionId) {
        await this.scanner.scan(connectionId);
    }
}
//# sourceMappingURL=account-watch-coordinator.js.map