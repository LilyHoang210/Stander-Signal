import type { PositionSide } from "@standx/domain/portfolio";
export type CloseReason = "take_profit" | "stop_loss" | "manual" | "unknown";
export interface TradeOpenedNotificationView {
    readonly symbol: string;
    readonly side: PositionSide;
    readonly leverage?: string | null;
    readonly collateral?: string | null;
    readonly collateralAsset?: string | null;
    readonly entryPrice?: string | null;
    readonly quantity: string;
    readonly sourceTimestamp: Date;
}
export interface TradeClosedNotificationView {
    readonly symbol: string;
    readonly side: PositionSide;
    readonly closeReason: CloseReason;
    readonly leverage?: string | null;
    readonly entryPrice?: string | null;
    readonly exitPrice?: string | null;
    readonly quantity: string;
    readonly realizedPnl?: string | null;
    readonly realizedPnlPct?: string | null;
    readonly fee?: string | null;
    readonly heldSeconds?: number | null;
    readonly sourceTimestamp: Date;
}
export interface CompactPositionView {
    readonly symbol: string;
    readonly side: PositionSide;
    readonly quantity: string;
    readonly entryPrice: string;
    readonly unrealizedPnl: string;
    readonly liquidationPrice: string | null;
}
export interface CompactPositionsReportInput {
    readonly positions: readonly CompactPositionView[];
}
export declare function formatTradeOpenedNotification(input: TradeOpenedNotificationView): string;
export declare function formatTradeClosedNotification(input: TradeClosedNotificationView): string;
export declare function formatCompactPositionsReport(input: CompactPositionsReportInput): string;
