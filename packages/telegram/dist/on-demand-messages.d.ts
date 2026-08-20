export interface OrderReportItem {
    readonly symbol: string;
    readonly side: string;
    readonly status: string;
    readonly order_type: string;
    readonly qty: string;
    readonly price: string;
    readonly fill_qty: string;
    readonly fill_avg_price: string;
    readonly reduce_only: boolean;
    readonly updated_at: string;
}
export interface TradeHistoryItem {
    readonly symbol: string;
    readonly side: string;
    readonly price: string;
    readonly qty: string;
    readonly pnl: string;
    readonly fee_qty: string;
    readonly fee_asset: string;
    readonly created_at: string;
}
export interface FundingHistoryItem {
    readonly symbol: string;
    readonly qty: string;
    readonly asset: string;
    readonly txn_type: string;
    readonly transact_time: string;
}
export interface MarketReportItem {
    readonly symbol: string;
    readonly mark_price: string;
    readonly last_price: string | null;
    readonly funding_rate: string;
    readonly open_interest: string;
    readonly volume_24h: string;
    readonly next_funding_time: string;
}
export declare function formatOrdersReport(input: {
    readonly orders: readonly OrderReportItem[];
}): string;
export declare function formatTradesHistoryReport(input: {
    readonly trades: readonly TradeHistoryItem[];
}): string;
export declare function formatFundingHistoryReport(input: {
    readonly records: readonly FundingHistoryItem[];
}): string;
export declare function formatMarketsReport(input: {
    readonly markets: readonly MarketReportItem[];
}): string;
export declare function formatCoverageReport(): string;
