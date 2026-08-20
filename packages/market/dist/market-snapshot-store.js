const defaultStaleAfterMs = 15_000;
export class InMemoryMarketSnapshotStore {
    prices = new Map();
    depths = new Map();
    staleAfterMs;
    constructor(options = {}) {
        this.staleAfterMs = options.staleAfterMs ?? defaultStaleAfterMs;
    }
    put(snapshot) {
        if (isPriceSnapshot(snapshot)) {
            this.putLatest(this.prices, snapshot);
            return Promise.resolve();
        }
        this.putLatest(this.depths, snapshot);
        return Promise.resolve();
    }
    getPrice(symbol) {
        return Promise.resolve(this.prices.get(symbol) ?? null);
    }
    getDepth(symbol) {
        return Promise.resolve(this.depths.get(symbol) ?? null);
    }
    getBundle(symbol) {
        const price = this.prices.get(symbol);
        const depth = this.depths.get(symbol);
        if (!price || !depth) {
            return Promise.resolve(null);
        }
        return Promise.resolve({ price, depth });
    }
    freshness(symbol, now) {
        const snapshots = [this.prices.get(symbol), this.depths.get(symbol)].filter((snapshot) => snapshot !== undefined);
        if (snapshots.length === 0) {
            return Promise.resolve("missing");
        }
        const newestIngestedAtMs = Math.max(...snapshots.map((snapshot) => snapshot.ingestedAt.getTime()));
        return Promise.resolve(now.getTime() - newestIngestedAtMs <= this.staleAfterMs ? "fresh" : "stale");
    }
    putLatest(target, snapshot) {
        const current = target.get(snapshot.symbol);
        if (current && current.sequence > snapshot.sequence) {
            return;
        }
        target.set(snapshot.symbol, snapshot);
    }
}
const isPriceSnapshot = (snapshot) => "markPrice" in snapshot;
//# sourceMappingURL=market-snapshot-store.js.map