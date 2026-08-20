import type { PublicConnectionView } from "../context.js";
import type { StandXBalance, StandXFundingRecord, StandXOpenOrders, StandXOrders, StandXPosition, StandXSymbolMarket, StandXTrades } from "@standx/standx/schemas";
export interface TelegramLiveCommandConnections {
    getCurrentStatus(telegramUserId: string): Promise<PublicConnectionView | null>;
}
export interface TelegramLiveCommandCredentials {
    withLease<T>(connectionId: string, callback: (token: string) => Promise<T>): Promise<T>;
}
export interface TelegramLiveStandXClient {
    queryBalance(token: string): Promise<StandXBalance>;
    queryPositions(token: string): Promise<readonly StandXPosition[]>;
    queryOpenOrders(token: string): Promise<StandXOpenOrders>;
    queryOrders(token: string, query?: URLSearchParams): Promise<StandXOrders>;
    queryTrades(token: string, query?: URLSearchParams): Promise<StandXTrades>;
    queryFundingHistory(token: string, query?: URLSearchParams): Promise<readonly StandXFundingRecord[]>;
    querySymbolMarket(query: URLSearchParams): Promise<StandXSymbolMarket>;
}
export interface TelegramAlertSummary {
    readonly severity: "safe" | "warning" | "danger" | "critical";
    readonly riskType: string;
    readonly itemId: string;
    readonly status: "candidate" | "notified" | "acknowledged" | "recovered";
    readonly message: string;
    readonly createdAt: Date;
}
export interface TelegramLiveAlertReader {
    listActive(telegramUserId: string): Promise<readonly TelegramAlertSummary[]>;
}
export interface TelegramRiskEvaluationSummary {
    readonly riskType: string;
    readonly itemId: string;
    readonly severity: "safe" | "warning" | "danger" | "critical";
    readonly status: "evaluated" | "suppressed_stale" | "suppressed_missing_data";
    readonly reasonCode: string;
    readonly reasonMessage: string;
    readonly evaluatedAt: Date;
}
export interface TelegramLiveRiskReader {
    listLatest(telegramUserId: string): Promise<readonly TelegramRiskEvaluationSummary[]>;
}
export interface TelegramLiveCommandsOptions {
    readonly connections: TelegramLiveCommandConnections;
    readonly credentials: TelegramLiveCommandCredentials;
    readonly client: TelegramLiveStandXClient;
    readonly alerts?: TelegramLiveAlertReader;
    readonly risk?: TelegramLiveRiskReader;
    readonly now?: () => Date;
}
export declare class TelegramLiveCommands {
    private readonly connections;
    private readonly credentials;
    private readonly client;
    private readonly alertsReader;
    private readonly riskReader;
    private readonly now;
    constructor(options: TelegramLiveCommandsOptions);
    perps(telegramUserId: string): Promise<string>;
    positions(telegramUserId: string): Promise<string>;
    risk(telegramUserId: string): Promise<string>;
    alerts(telegramUserId: string): Promise<string>;
    orders(telegramUserId: string): Promise<string>;
    history(telegramUserId: string): Promise<string>;
    funding(telegramUserId: string): Promise<string>;
    markets(telegramUserId: string): Promise<string>;
    coverage(telegramUserId: string): Promise<string>;
    refresh(telegramUserId: string): Promise<string>;
    private withLiveSnapshot;
    private withConnectionToken;
}
