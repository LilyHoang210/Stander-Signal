import { type StandXBalance, type StandXFundingRecord, type StandXMarketOverview, type StandXOrder, type StandXOrders, type StandXOpenOrders, type StandXPosition, type StandXSymbolMarket, type StandXTrades } from "./schemas.js";
declare const allowedPathList: readonly ["/api/query_balance", "/api/query_positions", "/api/query_open_orders", "/api/query_orders", "/api/query_order", "/api/query_trades", "/api/query_funding_history"];
declare const allowedPublicPathList: readonly ["/api/query_market_overview", "/api/query_symbol_market"];
export type AllowedStandXPath = (typeof allowedPathList)[number];
export type AllowedStandXPublicPath = (typeof allowedPublicPathList)[number];
export declare const allowedStandXReadPaths: ReadonlySet<string>;
export declare const allowedStandXPublicPaths: ReadonlySet<string>;
export interface ReadOnlyTransport {
    get(path: AllowedStandXPath, token: string, query?: URLSearchParams): Promise<unknown>;
    getPublic(path: AllowedStandXPublicPath, query?: URLSearchParams): Promise<unknown>;
}
type FetchFunction = (input: string | URL, init?: RequestInit) => Promise<Response>;
export declare class StandXTransportError extends Error {
    readonly statusCode: number | null;
    constructor(message: string, statusCode: number | null);
}
export declare class StandXRateLimitError extends StandXTransportError {
    readonly retryAfterSeconds: number | null;
    constructor(retryAfterSeconds: number | null);
}
export declare class FetchReadOnlyTransport implements ReadOnlyTransport {
    #private;
    private readonly fetchFunction;
    constructor(baseUrl: string, fetchFunction?: FetchFunction);
    get(path: string, token: string, query?: URLSearchParams): Promise<unknown>;
    getPublic(path: string, query?: URLSearchParams): Promise<unknown>;
}
export declare class StandXReadClient {
    private readonly transport;
    constructor(transport: ReadOnlyTransport);
    queryBalance(token: string): Promise<StandXBalance>;
    queryPositions(token: string, query?: URLSearchParams): Promise<StandXPosition[]>;
    queryOpenOrders(token: string, query?: URLSearchParams): Promise<StandXOpenOrders>;
    queryOrders(token: string, query?: URLSearchParams): Promise<StandXOrders>;
    queryOrder(token: string, query: URLSearchParams): Promise<StandXOrder>;
    queryTrades(token: string, query?: URLSearchParams): Promise<StandXTrades>;
    queryFundingHistory(token: string, query?: URLSearchParams): Promise<StandXFundingRecord[]>;
    queryMarketOverview(): Promise<StandXMarketOverview>;
    querySymbolMarket(query: URLSearchParams): Promise<StandXSymbolMarket>;
}
export {};
