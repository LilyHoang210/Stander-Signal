import type { DecimalString } from "./portfolio.js";
export interface PriceSnapshot {
    readonly symbol: string;
    readonly markPrice: DecimalString;
    readonly indexPrice?: DecimalString;
    readonly fundingRate?: DecimalString;
    readonly sequence: bigint;
    readonly sourceTimestamp: Date;
    readonly ingestedAt: Date;
    readonly sourceTier: "A";
}
export interface DepthLevel {
    readonly price: DecimalString;
    readonly quantity: DecimalString;
}
export interface DepthSnapshot {
    readonly symbol: string;
    readonly bids: readonly DepthLevel[];
    readonly asks: readonly DepthLevel[];
    readonly sequence: bigint;
    readonly sourceTimestamp: Date;
    readonly ingestedAt: Date;
    readonly sourceTier: "A";
}
export type MarketSnapshot = PriceSnapshot | DepthSnapshot;
