export type DecimalString = string & {
    readonly __decimalString: unique symbol;
};
export type SourceTier = "A" | "B" | "C" | "D";
export type PortfolioItemType = "PERPS_POSITION" | "PERPS_OPEN_ORDER" | "PERPS_BALANCE" | "CASH_BALANCE" | "ONCHAIN_DUSD_BALANCE" | "DEX_LP_POSITION" | "PROTOCOL_SLP_SHARE" | "COMMUNITY_VAULT_SHARE" | "MANAGED_VAULT_ACCOUNT" | "BLOCK_OPTION_OBLIGATION" | "PENDING_REDEMPTION" | "PENDING_WITHDRAWAL" | "CLAIMABLE_YIELD" | "NETWORK_YIELD";
export type PositionSide = "long" | "short";
export interface PositionSnapshot {
    readonly accountId: string;
    readonly positionId: string;
    readonly symbol: string;
    readonly side: PositionSide;
    readonly quantity: DecimalString;
    readonly notional: DecimalString;
    readonly entryPrice: DecimalString;
    readonly markPrice: DecimalString;
    readonly liquidationPrice: DecimalString | null;
    readonly bankruptcyPrice: DecimalString | null;
    readonly liquidationFields: "supported" | "unavailable";
    readonly leverage: DecimalString;
    readonly marginMode: "cross" | "isolated";
    readonly initialMargin: DecimalString;
    readonly holdingMargin: DecimalString;
    readonly maintenanceMargin: DecimalString;
    readonly unrealizedPnl: DecimalString;
    readonly realizedPnl: DecimalString;
    readonly marginAsset: string;
    readonly sourceTimestamp: Date;
    readonly ingestedAt: Date;
    readonly sourceTier: "A";
}
export interface BalanceSnapshot {
    readonly accountId: string;
    readonly balance: DecimalString;
    readonly equity: DecimalString;
    readonly isolatedBalance: DecimalString;
    readonly isolatedUpnl: DecimalString;
    readonly crossBalance: DecimalString;
    readonly crossMargin: DecimalString;
    readonly crossUpnl: DecimalString;
    readonly crossAvailable: DecimalString;
    readonly locked: DecimalString;
    readonly upnl: DecimalString;
    readonly pnlFreeze: DecimalString;
    readonly sourceTimestamp: Date;
    readonly ingestedAt: Date;
    readonly sourceTier: "A";
}
export interface OpenOrderSnapshot {
    readonly accountId: string;
    readonly orderId: string;
    readonly positionId: string | null;
    readonly symbol: string;
    readonly side: "buy" | "sell";
    readonly orderType: string;
    readonly status: string;
    readonly quantity: DecimalString;
    readonly filledQuantity: DecimalString;
    readonly price: DecimalString;
    readonly averageFillPrice: DecimalString;
    readonly reduceOnly: boolean;
    readonly sourceTimestamp: Date;
    readonly ingestedAt: Date;
    readonly sourceTier: "A";
}
export interface PerpsAccountSnapshot {
    readonly accountId: string;
    readonly balance: BalanceSnapshot;
    readonly positions: readonly PositionSnapshot[];
    readonly openOrders: readonly OpenOrderSnapshot[];
    readonly observedAt: Date;
    readonly ingestedAt: Date;
}
