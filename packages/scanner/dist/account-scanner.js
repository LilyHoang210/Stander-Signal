import { normalizePerpsSnapshot } from "@standx/portfolio/perps-normalizer";
export class AccountScanner {
    dependencies;
    now;
    constructor(dependencies) {
        this.dependencies = dependencies;
        this.now = dependencies.now ?? (() => new Date());
    }
    async scan(connectionId) {
        const result = await this.dependencies.lock.withConnectionLock(connectionId, () => this.scanWithLock(connectionId));
        return result ?? { status: "skipped_locked", connectionId };
    }
    async scanWithLock(connectionId) {
        const connection = await this.dependencies.connectionRepository.findActiveById(connectionId);
        if (connection === null) {
            return { status: "skipped_inactive", connectionId };
        }
        const rawSnapshot = await this.dependencies.credentialService.withLease(connectionId, token => this.fetchRawPerpsSnapshot(token));
        const activeAfterRemoteCalls = await this.dependencies.connectionRepository.findActiveById(connectionId);
        if (activeAfterRemoteCalls === null) {
            return { status: "skipped_disconnected", connectionId };
        }
        const observedAt = this.now();
        const snapshot = normalizePerpsSnapshot({
            accountId: activeAfterRemoteCalls.accountId,
            balance: rawSnapshot.balance,
            positions: rawSnapshot.positions,
            openOrders: rawSnapshot.openOrders,
            observedAt,
            ingestedAt: observedAt
        });
        await this.dependencies.snapshotRepository.savePerpsSnapshot({
            connection: activeAfterRemoteCalls,
            snapshot
        });
        await this.dependencies.riskQueue.enqueueEvaluateAccount(connectionId);
        const result = {
            status: "scanned",
            connectionId,
            positionCount: snapshot.positions.length,
            openOrderCount: snapshot.openOrders.length,
            nextState: snapshot.positions.length === 0 ? "no-position" : "active"
        };
        for (const hook of this.dependencies.postScanHooks ?? []) {
            try {
                await hook.afterPerpsSnapshotSaved({ connection: activeAfterRemoteCalls, result });
            }
            catch {
                continue;
            }
        }
        return result;
    }
    async fetchRawPerpsSnapshot(token) {
        const [balance, positions, openOrders] = await Promise.all([
            this.dependencies.standxClient.queryBalance(token),
            this.dependencies.standxClient.queryPositions(token),
            this.dependencies.standxClient.queryOpenOrders(token)
        ]);
        return { balance, positions, openOrders };
    }
}
//# sourceMappingURL=account-scanner.js.map