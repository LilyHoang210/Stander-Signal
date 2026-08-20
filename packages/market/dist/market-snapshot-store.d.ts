import type { DepthSnapshot, MarketSnapshot, PriceSnapshot } from "@standx/domain/market";
export type MarketSnapshotFreshness = "fresh" | "stale" | "missing";
export interface MarketSnapshotBundle {
    readonly price: PriceSnapshot;
    readonly depth: DepthSnapshot;
}
export interface MarketSnapshotStore {
    put(snapshot: MarketSnapshot): Promise<void>;
    getPrice(symbol: string): Promise<PriceSnapshot | null>;
    getDepth(symbol: string): Promise<DepthSnapshot | null>;
    getBundle(symbol: string): Promise<MarketSnapshotBundle | null>;
    freshness(symbol: string, now: Date): Promise<MarketSnapshotFreshness>;
}
export interface InMemoryMarketSnapshotStoreOptions {
    readonly staleAfterMs?: number;
}
export declare class InMemoryMarketSnapshotStore implements MarketSnapshotStore {
    private readonly prices;
    private readonly depths;
    private readonly staleAfterMs;
    constructor(options?: InMemoryMarketSnapshotStoreOptions);
    put(snapshot: MarketSnapshot): Promise<void>;
    getPrice(symbol: string): Promise<PriceSnapshot | null>;
    getDepth(symbol: string): Promise<DepthSnapshot | null>;
    getBundle(symbol: string): Promise<MarketSnapshotBundle | null>;
    freshness(symbol: string, now: Date): Promise<MarketSnapshotFreshness>;
    private putLatest;
}
