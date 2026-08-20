import { describe, expect, it, vi } from "vitest";
import { TelegramLiveCommands } from "./telegram-live-commands.js";
const balance = {
    balance: "1000",
    equity: "1012.5",
    isolated_balance: "100",
    isolated_upnl: "2.5",
    cross_balance: "900",
    cross_margin: "120",
    cross_upnl: "10",
    locked: "5",
    cross_available: "780",
    upnl: "12.5",
    pnl_freeze: "0"
};
const position = {
    bankruptcy_price: "80",
    created_at: "2026-08-14T08:00:00.000Z",
    entry_price: "100",
    entry_value: "100",
    holding_margin: "10",
    id: 7,
    initial_margin: "10",
    leverage: "10",
    liq_price: "95",
    maint_margin: "5",
    margin_asset: "USDT",
    margin_mode: "cross",
    mark_price: "100",
    mmr: "0.005",
    position_value: "100",
    qty: "1",
    realized_pnl: "0",
    status: "open",
    symbol: "BTC-USD",
    time: "2026-08-14T08:00:00.000Z",
    updated_at: "2026-08-14T08:01:00.000Z",
    upnl: "12.5",
    user: "standx-user-1"
};
const openOrders = {
    page_size: 100,
    total: 2,
    result: []
};
const order = {
    avail_locked: "0",
    cl_ord_id: "client-order-1",
    closed_block: -1,
    created_at: "2025-08-11T03:35:25.559151Z",
    created_block: -1,
    fill_avg_price: "0",
    fill_qty: "0",
    id: 1820682,
    leverage: "10",
    liq_id: 0,
    margin: "0",
    order_type: "limit",
    position_id: 15,
    price: "121900.00",
    qty: "0.060",
    reduce_only: false,
    remark: "",
    side: "sell",
    source: "user",
    status: "new",
    symbol: "BTC-USD",
    time_in_force: "gtc",
    updated_at: "2025-08-11T03:35:25.559151Z",
    user: "standx-user-1"
};
const trade = {
    created_at: "2025-08-11T03:36:19.352620Z",
    fee_asset: "DUSD",
    fee_qty: "0.121900",
    id: 409870,
    order_id: 1820682,
    pnl: "1.62040",
    price: "121900",
    qty: "0.01",
    side: "sell",
    symbol: "BTC-USD",
    updated_at: "2025-08-11T03:36:19.352620Z",
    user: "standx-user-1",
    value: "1219.00"
};
const fundingRecord = {
    id: 12345,
    user: "standx-user-1",
    asset: "DUSD",
    symbol: "BTC-USD",
    qty: "-0.123456",
    txn_type: "funding",
    transact_time: "2025-08-11T08:00:00Z",
    created_at: "2025-08-11T08:00:00.123456Z",
    updated_at: "2025-08-11T08:00:00.123456Z"
};
const symbolMarket = {
    base: "BTC",
    quote: "DUSD",
    symbol: "BTC-USD",
    funding_rate: "0.00010000",
    high_price_24h: "122164.08",
    index_price: "121601.158461",
    last_price: "121599.94",
    low_price_24h: "114098.44",
    mark_price: "121602.43",
    mid_price: "121599.99",
    next_funding_time: "2025-08-11T08:00:00Z",
    open_interest: "15.948",
    spread: ["121599.94", "121600.04"],
    time: "2025-08-11T03:44:40.922233Z",
    volume_24h: "9030.51800000000002509"
};
function createHarness(overrides = {}) {
    const client = {
        queryBalance: vi.fn(() => Promise.resolve(balance)),
        queryPositions: vi.fn(() => Promise.resolve(overrides.positions ?? [position])),
        queryOpenOrders: vi.fn(() => Promise.resolve(openOrders)),
        queryOrders: vi.fn(() => Promise.resolve({ page_size: 1, total: 1, result: [order] })),
        queryTrades: vi.fn(() => Promise.resolve({ page_size: 1, total: 1, result: [trade] })),
        queryFundingHistory: vi.fn(() => Promise.resolve([fundingRecord])),
        querySymbolMarket: vi.fn(() => Promise.resolve(symbolMarket))
    };
    let leaseCalls = 0;
    const credentials = {
        async withLease(_connectionId, callback) {
            leaseCalls += 1;
            return callback("read-only-token");
        }
    };
    const connections = {
        getCurrentStatus: vi.fn(() => Promise.resolve(overrides.connected === false
            ? null
            : {
                id: "connection-1",
                status: "active",
                accountLabel: "standx-main",
                snapshotObservedAt: new Date("2026-08-14T08:00:00.000Z")
            }))
    };
    const commands = new TelegramLiveCommands({
        client,
        connections,
        credentials,
        alerts: {
            listActive: vi.fn(() => Promise.resolve(overrides.alerts ?? []))
        },
        risk: {
            listLatest: vi.fn(() => Promise.resolve(overrides.riskEvaluations ?? []))
        },
        now: () => new Date("2026-08-14T08:02:00.000Z")
    });
    return { client, commands, connections, leaseCalls: () => leaseCalls };
}
describe("TelegramLiveCommands", () => {
    it("returns a clear connected-state message when no account is active", async () => {
        const harness = createHarness({ connected: false });
        await expect(harness.commands.perps("42")).resolves.toBe("No active StandX account is connected.");
        expect(harness.leaseCalls()).toBe(0);
    });
    it("formats a live Perps summary from StandX read-only API data", async () => {
        const harness = createHarness();
        const text = await harness.commands.perps("42");
        expect(text).toContain("Perps account: standx-main");
        expect(text).toContain("Equity: 1012.5");
        expect(text).toContain("Open positions: 1");
        expect(text).toContain("Observed: 🕘 Aug 14 · 2026, 08:02 UTC");
        expect(text).not.toContain("2026-08-14T08:02:00.000Z");
        expect(harness.client.queryBalance).toHaveBeenCalledWith("read-only-token");
    });
    it("formats live open positions instead of falling back to a not-ready message", async () => {
        const harness = createHarness();
        const text = await harness.commands.positions("42");
        expect(text).toBe("• BTC-USD | Long | Size: 1 | Entry: $100 | PnL: 12.5 | Liq: $95");
        expect(text).not.toContain("not ready");
    });
    it("returns a simple live liquidation risk preview", async () => {
        const harness = createHarness();
        const text = await harness.commands.risk("42");
        expect(text).toContain("Live risk preview");
        expect(text).toContain("BTC-USD");
        expect(text).toContain("buffer 5.00%");
    });
    it("formats persisted risk evaluations before falling back to live preview", async () => {
        const harness = createHarness({
            riskEvaluations: [{
                    riskType: "cross_margin",
                    itemId: "standx-account",
                    severity: "safe",
                    status: "evaluated",
                    reasonCode: "CROSS_MARGIN_STRESS_SAFE",
                    reasonMessage: "Cross available margin covers every configured stress horizon.",
                    evaluatedAt: new Date("2026-08-14T08:01:30.000Z")
                }]
        });
        const text = await harness.commands.risk("42");
        expect(text).toContain("Current risk assessment");
        expect(text).toContain("SAFE cross_margin");
        expect(text).toContain("Item: standx-account");
        expect(text).toContain("Reason: CROSS_MARGIN_STRESS_SAFE");
        expect(text).toContain("Evaluated: 🕘 Aug 14 · 2026, 08:01 UTC");
        expect(text).not.toContain("2026-08-14T08:01:30.000Z");
        expect(harness.client.queryPositions).not.toHaveBeenCalled();
    });
    it("prioritizes persisted risk by active severity before safe entries", async () => {
        const harness = createHarness({
            riskEvaluations: [
                {
                    riskType: "liquidation",
                    itemId: "safe_pos",
                    severity: "safe",
                    status: "evaluated",
                    reasonCode: "LIQUIDATION_BUFFER_SAFE",
                    reasonMessage: "Safe.",
                    evaluatedAt: new Date("2026-08-14T08:03:00.000Z")
                },
                {
                    riskType: "liquidation",
                    itemId: "danger_pos",
                    severity: "danger",
                    status: "evaluated",
                    reasonCode: "LIQUIDATION_BUFFER_15M",
                    reasonMessage: "Danger.",
                    evaluatedAt: new Date("2026-08-14T08:01:00.000Z")
                },
                {
                    riskType: "liquidation",
                    itemId: "warning_pos",
                    severity: "warning",
                    status: "evaluated",
                    reasonCode: "LIQUIDATION_BUFFER_60M",
                    reasonMessage: "Warning.",
                    evaluatedAt: new Date("2026-08-14T08:02:00.000Z")
                },
                {
                    riskType: "liquidation",
                    itemId: "critical_pos",
                    severity: "critical",
                    status: "evaluated",
                    reasonCode: "LIQUIDATION_BUFFER_5M",
                    reasonMessage: "Critical.",
                    evaluatedAt: new Date("2026-08-14T08:00:00.000Z")
                }
            ]
        });
        const text = await harness.commands.risk("42");
        expect(text.indexOf("critical_pos")).toBeLessThan(text.indexOf("danger_pos"));
        expect(text.indexOf("danger_pos")).toBeLessThan(text.indexOf("warning_pos"));
        expect(text.indexOf("warning_pos")).toBeLessThan(text.indexOf("safe_pos"));
        expect(harness.client.queryPositions).not.toHaveBeenCalled();
    });
    it("returns a stable no-alerts message until alert persistence has rows", async () => {
        const harness = createHarness();
        await expect(harness.commands.alerts("42")).resolves.toBe("No active alerts.");
    });
    it("formats persisted active alerts for Telegram", async () => {
        const harness = createHarness({
            alerts: [{
                    severity: "critical",
                    riskType: "liquidation",
                    itemId: "position-1",
                    status: "candidate",
                    message: "NOTIFY CRITICAL liquidation",
                    createdAt: new Date("2026-08-14T08:01:00.000Z")
                }]
        });
        const text = await harness.commands.alerts("42");
        expect(text).toContain("Active alerts");
        expect(text).toContain("CRITICAL liquidation");
        expect(text).toContain("Item: position-1");
        expect(text).toContain("Status: candidate");
        expect(text).toContain("Created: 🕘 Aug 14 · 2026, 08:01 UTC");
        expect(text).not.toContain("2026-08-14T08:01:00.000Z");
    });
    it("refreshes live data on demand and reports the result", async () => {
        const harness = createHarness();
        const text = await harness.commands.refresh("42");
        expect(text).toContain("Live StandX refresh completed.");
        expect(text).toContain("positions: 1");
        expect(text).toContain("open orders: 2");
        expect(text).toContain("Observed: 🕘 Aug 14 · 2026, 08:02 UTC");
        expect(text).not.toContain("2026-08-14T08:02:00.000Z");
    });
    it("fetches orders only when the orders command is invoked", async () => {
        const harness = createHarness();
        expect(harness.client.queryOrders).not.toHaveBeenCalled();
        const text = await harness.commands.orders("42");
        expect(text).toContain("Orders");
        expect(text).toContain("BTC-USD");
        expect(harness.client.queryOrders).toHaveBeenCalledWith("read-only-token", new URLSearchParams({ limit: "10" }));
    });
    it("fetches trade history only when the history command is invoked", async () => {
        const harness = createHarness();
        const text = await harness.commands.history("42");
        expect(text).toContain("Trade history");
        expect(harness.client.queryTrades).toHaveBeenCalledWith("read-only-token", new URLSearchParams({ limit: "10" }));
    });
    it("fetches funding history only when the funding command is invoked", async () => {
        const harness = createHarness();
        const text = await harness.commands.funding("42");
        expect(text).toContain("Funding history");
        expect(harness.client.queryFundingHistory).toHaveBeenCalledWith("read-only-token", new URLSearchParams({ limit: "10" }));
    });
    it("fetches market data only for currently open position symbols", async () => {
        const harness = createHarness();
        const text = await harness.commands.markets("42");
        expect(text).toContain("Markets for open positions");
        expect(harness.client.queryPositions).toHaveBeenCalledWith("read-only-token");
        expect(harness.client.querySymbolMarket).toHaveBeenCalledWith(new URLSearchParams({ symbol: "BTC-USD" }));
    });
    it("returns static coverage without leasing credentials", async () => {
        const harness = createHarness();
        const text = await harness.commands.coverage("42");
        expect(text).toContain("Coverage");
        expect(text).toContain("Community Vault");
        expect(harness.leaseCalls()).toBe(0);
    });
});
//# sourceMappingURL=telegram-live-commands.test.js.map