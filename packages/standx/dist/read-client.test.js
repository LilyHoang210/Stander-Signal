import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FetchReadOnlyTransport, StandXReadClient, StandXRateLimitError } from "./read-client.js";
const token = "standx-test-jwt";
function fixture(name) {
    return JSON.parse(readFileSync(new URL(`../../../test/fixtures/standx/${name}`, import.meta.url), "utf8"));
}
class FixtureTransport {
    responses = new Map();
    publicResponses = new Map();
    calls = [];
    publicCalls = [];
    get(path) {
        this.calls.push(path);
        return Promise.resolve(this.responses.get(path));
    }
    getPublic(path) {
        this.publicCalls.push(path);
        return Promise.resolve(this.publicResponses.get(path));
    }
}
describe("FetchReadOnlyTransport", () => {
    it("rejects a path outside the exact read allowlist before fetching", async () => {
        const calls = [];
        const transport = new FetchReadOnlyTransport("https://perps.standx.com", input => {
            calls.push(input);
            return Promise.resolve(Response.json({}));
        });
        await expect(transport.get("/api/new_order", token)).rejects.toThrow(/allowlist/i);
        expect(calls).toHaveLength(0);
    });
    it("sends only GET with Bearer authentication to the official host", async () => {
        const calls = [];
        const transport = new FetchReadOnlyTransport("https://perps.standx.com", (input, init) => {
            calls.push({ input, ...(init === undefined ? {} : { init }) });
            return Promise.resolve(Response.json(fixture("query-balance.json")));
        });
        await transport.get("/api/query_balance", token);
        expect(String(calls[0]?.input)).toBe("https://perps.standx.com/api/query_balance");
        expect(calls[0]?.init?.method).toBe("GET");
        expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe(`Bearer ${token}`);
        expect([...new Headers(calls[0]?.init?.headers).keys()]).toEqual([
            "accept",
            "authorization"
        ]);
    });
    it("rejects a non-official base URL", () => {
        expect(() => new FetchReadOnlyTransport("https://example.com", fetch)).toThrow(/host/i);
    });
    it("exposes bounded retry guidance for a StandX 429 response", async () => {
        const transport = new FetchReadOnlyTransport("https://perps.standx.com", () => Promise.resolve(Response.json({ message: "rate limited" }, { status: 429, headers: { "retry-after": "7" } })));
        const error = await transport.get("/api/query_balance", token).catch((cause) => cause);
        expect(error).toBeInstanceOf(StandXRateLimitError);
        expect(error.retryAfterSeconds).toBe(7);
    });
    it("throws a sanitized error for authentication failure", async () => {
        const transport = new FetchReadOnlyTransport("https://perps.standx.com", () => Promise.resolve(Response.json({ raw: "provider body" }, { status: 401 })));
        await expect(transport.get("/api/query_balance", token)).rejects.toMatchObject({
            message: "StandX read request failed",
            statusCode: 401
        });
    });
});
describe("StandXReadClient", () => {
    it("parses documented balance, position, and open-order fixtures", async () => {
        const transport = new FixtureTransport();
        transport.responses.set("/api/query_balance", fixture("query-balance.json"));
        transport.responses.set("/api/query_positions", fixture("query-positions.json"));
        transport.responses.set("/api/query_open_orders", fixture("query-open-orders.json"));
        const client = new StandXReadClient(transport);
        await expect(client.queryBalance(token)).resolves.toMatchObject({
            equity: "1100028.707476657"
        });
        await expect(client.queryPositions(token)).resolves.toMatchObject([
            { qty: "0.940", liq_price: "112373.50", user: "bsc_0x1234567890abcdef" }
        ]);
        await expect(client.queryOpenOrders(token)).resolves.toMatchObject({
            total: 1,
            result: [{ qty: "0.060", status: "new" }]
        });
    });
    it("rejects malformed monetary fields instead of coercing numbers", async () => {
        const transport = new FixtureTransport();
        const positions = fixture("query-positions.json");
        transport.responses.set("/api/query_positions", [{ ...positions[0], qty: 1.5 }]);
        await expect(new StandXReadClient(transport).queryPositions(token)).rejects.toThrow(/qty/i);
    });
    it("strips unknown response fields from domain-facing DTOs", async () => {
        const transport = new FixtureTransport();
        transport.responses.set("/api/query_balance", {
            ...fixture("query-balance.json"),
            undocumented_secret: "must-not-pass-through"
        });
        const balance = await new StandXReadClient(transport).queryBalance(token);
        expect(balance).not.toHaveProperty("undocumented_secret");
    });
    it("uses only documented read paths for trades and funding history", async () => {
        const transport = new FixtureTransport();
        transport.responses.set("/api/query_trades", { page_size: 0, result: [], total: 0 });
        transport.responses.set("/api/query_funding_history", []);
        const client = new StandXReadClient(transport);
        await client.queryTrades(token);
        await client.queryFundingHistory(token);
        expect(transport.calls).toEqual(["/api/query_trades", "/api/query_funding_history"]);
    });
    it("uses only documented read paths for order history", async () => {
        const transport = new FixtureTransport();
        transport.responses.set("/api/query_orders", { page_size: 0, result: [], total: 0 });
        const [orderFixture] = fixture("query-open-orders.json").result;
        transport.responses.set("/api/query_order", orderFixture);
        const client = new StandXReadClient(transport);
        await client.queryOrders(token, new URLSearchParams({ limit: "5" }));
        await client.queryOrder(token, new URLSearchParams({ order_id: "1820682" }));
        expect(transport.calls).toEqual(["/api/query_orders", "/api/query_order"]);
    });
    it("accepts open orders when StandX omits unused margin fields", async () => {
        const transport = new FixtureTransport();
        const response = fixture("query-open-orders.json");
        const order = response.result[0];
        expect(order).toBeDefined();
        if (order === undefined) {
            throw new Error("Expected query-open-orders fixture to include one order");
        }
        const orderWithoutUnusedMarginFields = { ...order };
        delete orderWithoutUnusedMarginFields.avail_locked;
        delete orderWithoutUnusedMarginFields.margin;
        transport.responses.set("/api/query_open_orders", {
            ...response,
            result: [orderWithoutUnusedMarginFields]
        });
        await expect(new StandXReadClient(transport).queryOpenOrders(token)).resolves.toMatchObject({
            total: 1,
            result: [{ qty: "0.060", status: "new" }]
        });
    });
    it("uses public market endpoints without bearer authentication", async () => {
        const transport = new FixtureTransport();
        transport.publicResponses.set("/api/query_market_overview", {
            summary: {
                open_interest_notional: "122904802.996536",
                symbol_count: 1,
                volume_quote_24h: "560815382.03054878581315279005"
            },
            symbols: [{
                    base: "BTC",
                    funding_rate: "-0.00000999",
                    last_price: "72681.45",
                    mark_price: "72697.39",
                    open_interest: "1154.4344",
                    open_interest_notional: "83924367.806216",
                    price_change_pct: 0.945710770122798,
                    quote: "DUSD",
                    symbol: "BTC-USD",
                    time: "2026-04-10T16:29:17.400234Z",
                    volume_24h: "6202.664199999995616963133214",
                    volume_quote_24h: "447190753.290538787841796875"
                }]
        });
        transport.publicResponses.set("/api/query_symbol_market", {
            base: "BTC",
            funding_rate: "0.00010000",
            high_price_24h: "122164.08",
            index_price: "121601.158461",
            last_price: "121599.94",
            low_price_24h: "114098.44",
            mark_price: "121602.43",
            mid_price: "121599.99",
            next_funding_time: "2025-08-11T08:00:00Z",
            open_interest: "15.948",
            quote: "DUSD",
            spread: ["121599.94", "121600.04"],
            symbol: "BTC-USD",
            time: "2025-08-11T03:44:40.922233Z",
            volume_24h: "9030.51800000000002509"
        });
        const client = new StandXReadClient(transport);
        await expect(client.queryMarketOverview()).resolves.toMatchObject({
            summary: { symbol_count: 1 },
            symbols: [{ symbol: "BTC-USD" }]
        });
        await expect(client.querySymbolMarket(new URLSearchParams({ symbol: "BTC-USD" }))).resolves.toMatchObject({
            symbol: "BTC-USD",
            mark_price: "121602.43"
        });
        expect(transport.publicCalls).toEqual(["/api/query_market_overview", "/api/query_symbol_market"]);
    });
    it("defaults missing paginated totals to the result length", async () => {
        const transport = new FixtureTransport();
        transport.responses.set("/api/query_open_orders", { page_size: 0, result: [] });
        transport.responses.set("/api/query_trades", { page_size: 0, result: [] });
        const client = new StandXReadClient(transport);
        await expect(client.queryOpenOrders(token)).resolves.toMatchObject({ total: 0 });
        await expect(client.queryTrades(token)).resolves.toMatchObject({ total: 0 });
    });
});
//# sourceMappingURL=read-client.test.js.map