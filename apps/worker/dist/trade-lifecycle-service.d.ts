import { type TradeLifecycleCandidate } from "@standx/scanner/trade-lifecycle-detector";
import type { StandXTrades } from "@standx/standx/schemas";
import type { ComparablePositionSnapshots, TradeLifecycleEventRecord } from "./trade-lifecycle-repository.js";
export interface TradeLifecycleRepository {
    loadComparablePositionSnapshots(connectionId: string): Promise<ComparablePositionSnapshots | null>;
    insertPending(candidate: TradeLifecycleCandidate): Promise<TradeLifecycleEventRecord | null>;
    markSent(id: string, providerMessageId: string | null): Promise<void>;
    markSuppressed(id: string): Promise<void>;
    markFailed(id: string): Promise<void>;
}
export interface TradeLifecycleCredentials {
    withLease<T>(connectionId: string, callback: (token: string) => Promise<T>): Promise<T>;
}
export interface TradeLifecycleStandXClient {
    queryTrades(token: string, query?: URLSearchParams): Promise<StandXTrades>;
}
export interface TradeLifecycleTelegramSender {
    sendTelegramMessage(job: {
        readonly chatId: number;
        readonly text: string;
    }): Promise<TelegramMessageSendResult>;
}
export interface TelegramMessageSendResult {
    readonly ok: boolean;
    readonly status: number;
    readonly providerMessageId?: string;
    readonly errorCode?: string;
}
export type ProcessTradeLifecycleResult = {
    readonly status: "processed";
    readonly connectionId: string;
    readonly candidateCount: number;
    readonly insertedCount: number;
    readonly sentCount: number;
} | {
    readonly status: "skipped_missing_snapshots";
    readonly connectionId: string;
};
export interface PostgresTradeLifecycleServiceOptions {
    readonly repository: TradeLifecycleRepository;
    readonly credentials: TradeLifecycleCredentials;
    readonly standxClient: TradeLifecycleStandXClient;
    readonly financialAlertsEnabled: boolean;
    readonly telegramSender: TradeLifecycleTelegramSender;
    readonly now?: () => Date;
}
export declare class PostgresTradeLifecycleService {
    private readonly options;
    private readonly now;
    constructor(options: PostgresTradeLifecycleServiceOptions);
    processConnection(connectionId: string, connection: {
        readonly telegramUserId: string;
        readonly accountId: string;
    }): Promise<ProcessTradeLifecycleResult>;
    private send;
}
