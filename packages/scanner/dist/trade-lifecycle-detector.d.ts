import type { DecimalString, PositionSnapshot } from "@standx/domain/portfolio";
import type { StandXTrade } from "@standx/standx/schemas";
export type TradeLifecycleEventType = "opened" | "closed";
export type TradeLifecycleCloseReason = "take_profit" | "stop_loss" | "manual" | "unknown";
export type TradeLifecycleConfidence = "high" | "medium" | "low";
export interface DetectTradeLifecycleEventsInput {
    readonly connectionId: string;
    readonly telegramUserId: string;
    readonly accountId: string;
    readonly previousPositions: readonly PositionSnapshot[];
    readonly latestPositions: readonly PositionSnapshot[];
    readonly recentTrades: readonly StandXTrade[];
    readonly detectedAt: Date;
}
export interface TradeLifecycleCandidate {
    readonly connectionId: string;
    readonly telegramUserId: string;
    readonly accountId: string;
    readonly positionKey: string;
    readonly symbol: string;
    readonly side: PositionSnapshot["side"];
    readonly eventType: TradeLifecycleEventType;
    readonly closeReason: TradeLifecycleCloseReason | null;
    readonly confidence: TradeLifecycleConfidence;
    readonly entryPrice: DecimalString | null;
    readonly exitPrice: DecimalString | null;
    readonly quantity: DecimalString;
    readonly leverage: DecimalString | null;
    readonly collateral: DecimalString | null;
    readonly realizedPnl: DecimalString | null;
    readonly realizedPnlPct: string | null;
    readonly fee: DecimalString | null;
    readonly openedAt: Date | null;
    readonly closedAt: Date | null;
    readonly sourceTimestamp: Date;
    readonly detectedAt: Date;
    readonly deduplicationKey: string;
    readonly rawEvidence: Record<string, unknown>;
}
export declare function detectTradeLifecycleEvents(input: DetectTradeLifecycleEventsInput): readonly TradeLifecycleCandidate[];
