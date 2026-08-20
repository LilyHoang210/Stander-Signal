import { balanceSchema, fundingHistorySchema, marketOverviewSchema, orderSchema, ordersSchema, openOrdersSchema, positionsSchema, symbolMarketSchema, tradesSchema } from "./schemas.js";
const officialOrigin = "https://perps.standx.com";
const allowedPathList = [
    "/api/query_balance",
    "/api/query_positions",
    "/api/query_open_orders",
    "/api/query_orders",
    "/api/query_order",
    "/api/query_trades",
    "/api/query_funding_history"
];
const allowedPublicPathList = [
    "/api/query_market_overview",
    "/api/query_symbol_market"
];
export const allowedStandXReadPaths = new Set(allowedPathList);
export const allowedStandXPublicPaths = new Set(allowedPublicPathList);
export class StandXTransportError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = "StandXTransportError";
    }
}
export class StandXRateLimitError extends StandXTransportError {
    retryAfterSeconds;
    constructor(retryAfterSeconds) {
        super("StandX rate limit exceeded", 429);
        this.retryAfterSeconds = retryAfterSeconds;
        this.name = "StandXRateLimitError";
    }
}
export class FetchReadOnlyTransport {
    fetchFunction;
    #baseUrl;
    constructor(baseUrl, fetchFunction = fetch) {
        this.fetchFunction = fetchFunction;
        const parsed = new URL(baseUrl);
        if (parsed.origin !== officialOrigin || parsed.pathname !== "/") {
            throw new Error("StandX transport host must be https://perps.standx.com");
        }
        this.#baseUrl = parsed.origin;
    }
    async get(path, token, query) {
        if (!allowedStandXReadPaths.has(path)) {
            throw new StandXTransportError(`StandX path is not in the read allowlist: ${path}`, null);
        }
        const url = new URL(path, this.#baseUrl);
        if (query !== undefined) {
            url.search = query.toString();
        }
        const response = await this.fetchFunction(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            }
        });
        if (response.status === 429) {
            throw new StandXRateLimitError(parseRetryAfter(response.headers.get("retry-after")));
        }
        if (!response.ok) {
            throw new StandXTransportError("StandX read request failed", response.status);
        }
        return (await response.json());
    }
    async getPublic(path, query) {
        if (!allowedStandXPublicPaths.has(path)) {
            throw new StandXTransportError(`StandX path is not in the public allowlist: ${path}`, null);
        }
        const url = new URL(path, this.#baseUrl);
        if (query !== undefined) {
            url.search = query.toString();
        }
        const response = await this.fetchFunction(url, {
            method: "GET",
            headers: { Accept: "application/json" }
        });
        if (response.status === 429) {
            throw new StandXRateLimitError(parseRetryAfter(response.headers.get("retry-after")));
        }
        if (!response.ok) {
            throw new StandXTransportError("StandX public request failed", response.status);
        }
        return (await response.json());
    }
}
export class StandXReadClient {
    transport;
    constructor(transport) {
        this.transport = transport;
    }
    async queryBalance(token) {
        return balanceSchema.parse(await this.transport.get("/api/query_balance", token));
    }
    async queryPositions(token, query) {
        return positionsSchema.parse(await this.transport.get("/api/query_positions", token, query));
    }
    async queryOpenOrders(token, query) {
        return openOrdersSchema.parse(await this.transport.get("/api/query_open_orders", token, query));
    }
    async queryOrders(token, query) {
        return ordersSchema.parse(await this.transport.get("/api/query_orders", token, query));
    }
    async queryOrder(token, query) {
        return orderSchema.parse(await this.transport.get("/api/query_order", token, query));
    }
    async queryTrades(token, query) {
        return tradesSchema.parse(await this.transport.get("/api/query_trades", token, query));
    }
    async queryFundingHistory(token, query) {
        return fundingHistorySchema.parse(await this.transport.get("/api/query_funding_history", token, query));
    }
    async queryMarketOverview() {
        return marketOverviewSchema.parse(await this.transport.getPublic("/api/query_market_overview"));
    }
    async querySymbolMarket(query) {
        return symbolMarketSchema.parse(await this.transport.getPublic("/api/query_symbol_market", query));
    }
}
function parseRetryAfter(value) {
    if (value === null) {
        return null;
    }
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
//# sourceMappingURL=read-client.js.map