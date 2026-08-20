import { describe, expect, it } from "vitest";
import { StandXTransportError } from "./read-client.js";
import { StandXAccountReader, StandXAccountValidationError } from "./account-validator.js";
const observedAt = new Date("2026-08-14T12:00:00Z");
const balance = {
    isolated_balance: "0", isolated_upnl: "0", cross_balance: "100", cross_margin: "10",
    cross_upnl: "2", locked: "0", cross_available: "92", balance: "100", upnl: "2",
    equity: "102", pnl_freeze: "0"
};
const position = {
    bankruptcy_price: "50000", created_at: "2026-08-14T11:00:00Z", entry_price: "60000",
    entry_value: "100", holding_margin: "10", id: 1, initial_margin: "10", leverage: "10",
    liq_price: "55000", maint_margin: "2", margin_asset: "DUSD", margin_mode: "cross",
    mark_price: "61000", mmr: "0.02", position_value: "101", qty: "0.001", realized_pnl: "0",
    status: "open", symbol: "BTC-USD", time: "2026-08-14T11:00:00Z",
    updated_at: "2026-08-14T11:59:00Z", upnl: "1", user: "bsc_0x123456789abcdef"
};
class FixtureTransport {
    responses;
    constructor(responses) {
        this.responses = responses;
    }
    get(path) {
        return Promise.resolve(this.responses[path]);
    }
    getPublic() {
        return Promise.reject(new Error("Account validation must not call public StandX endpoints"));
    }
}
function validResponses() {
    return {
        "/api/query_balance": balance,
        "/api/query_positions": [position],
        "/api/query_open_orders": { page_size: 20, result: [], total: 0 },
        "/api/query_trades": { page_size: 20, result: [], total: 0 },
        "/api/query_funding_history": []
    };
}
describe("StandXAccountReader", () => {
    it("validates all documented account categories and derives a verified account id", async () => {
        const reader = new StandXAccountReader(new FixtureTransport(validResponses()), () => observedAt);
        const result = await reader.validateAccount("opaque-read-only-token");
        expect(result.accountId).toBe("bsc_0x123456789abcdef");
        expect(result).not.toHaveProperty("alias");
        expect(result.observedAt).toEqual(observedAt);
        expect(result.snapshot).toMatchObject({
            balance: { equity: "102" },
            positions: [{ symbol: "BTC-USD" }],
            openOrders: { total: 0 },
            trades: { total: 0 },
            fundingHistory: []
        });
    });
    it("uses a non-reversible token fingerprint only when verified reads contain no account id", async () => {
        const responses = validResponses();
        responses["/api/query_positions"] = [];
        const reader = new StandXAccountReader(new FixtureTransport(responses), () => observedAt);
        const result = await reader.validateAccount("opaque-read-only-token");
        expect(result.accountId).toMatch(/^standx_[a-f0-9]{16}$/);
        expect(JSON.stringify(result)).not.toContain("opaque-read-only-token");
    });
    it.each([401, 403])("maps StandX HTTP %s to unauthorized without exposing the token", async (statusCode) => {
        const transport = {
            get: () => Promise.reject(new StandXTransportError("StandX read request failed", statusCode)),
            getPublic: () => Promise.reject(new Error("Account validation must not call public StandX endpoints"))
        };
        const reader = new StandXAccountReader(transport, () => observedAt);
        await expect(reader.validateAccount("sensitive-token")).rejects.toEqual(expect.objectContaining({ code: "unauthorized" }));
    });
});
//# sourceMappingURL=account-validator.test.js.map