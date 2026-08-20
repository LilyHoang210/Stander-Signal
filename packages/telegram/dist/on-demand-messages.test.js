import { describe, expect, it } from "vitest";
import { formatCoverageReport, formatFundingHistoryReport, formatMarketsReport, formatOrdersReport, formatTradesHistoryReport } from "./on-demand-messages.js";
describe("on-demand Telegram messages", () => {
    it("formats orders", () => {
        expect(formatOrdersReport({
            orders: [{
                    symbol: "BTC-USD",
                    side: "sell",
                    status: "new",
                    order_type: "limit",
                    qty: "0.060",
                    price: "121900.00",
                    fill_qty: "0",
                    fill_avg_price: "0",
                    reduce_only: false,
                    updated_at: "2025-08-11T03:35:25.559151Z"
                }]
        })).toBe([
            "Orders",
            "",
            "• BTC-USD | sell | new | limit | Qty: 0.060 | Price: $121900.00 | Filled: 0 @ $0 | Reduce-only: no"
        ].join("\n"));
    });
    it("formats trade history", () => {
        expect(formatTradesHistoryReport({
            trades: [{
                    symbol: "BTC-USD",
                    side: "sell",
                    price: "121900",
                    qty: "0.01",
                    pnl: "1.62040",
                    fee_qty: "0.121900",
                    fee_asset: "DUSD",
                    created_at: "2025-08-11T03:36:19.352620Z"
                }]
        })).toBe([
            "Trade history",
            "",
            "• BTC-USD | sell | Qty: 0.01 | Price: $121900 | PnL: 1.62040 | Fee: 0.121900 DUSD | 2025-08-11T03:36:19.352620Z"
        ].join("\n"));
    });
    it("formats funding history with a total", () => {
        expect(formatFundingHistoryReport({
            records: [
                { symbol: "BTC-USD", qty: "-0.123456", asset: "DUSD", txn_type: "funding", transact_time: "2025-08-11T08:00:00Z" },
                { symbol: "ETH-USD", qty: "0.020000", asset: "DUSD", txn_type: "funding", transact_time: "2025-08-11T08:00:00Z" }
            ]
        })).toBe([
            "Funding history",
            "Total: -0.103456 DUSD",
            "",
            "• BTC-USD | funding | -0.123456 DUSD | 2025-08-11T08:00:00Z",
            "• ETH-USD | funding | 0.020000 DUSD | 2025-08-11T08:00:00Z"
        ].join("\n"));
    });
    it("formats markets", () => {
        expect(formatMarketsReport({
            markets: [{
                    symbol: "BTC-USD",
                    mark_price: "121602.43",
                    last_price: "121599.94",
                    funding_rate: "0.00010000",
                    open_interest: "15.948",
                    volume_24h: "9030.51800000000002509",
                    next_funding_time: "2025-08-11T08:00:00Z"
                }]
        })).toBe([
            "Markets for open positions",
            "",
            "• BTC-USD | Mark: $121602.43 | Last: $121599.94 | Funding: 0.00010000 | OI: 15.948 | 24h Vol: 9030.51800000000002509 | Next funding: 2025-08-11T08:00:00Z"
        ].join("\n"));
    });
    it("formats coverage", () => {
        expect(formatCoverageReport()).toContain("Supported");
        expect(formatCoverageReport()).toContain("Perps positions");
        expect(formatCoverageReport()).toContain("Not supported by official API yet");
        expect(formatCoverageReport()).toContain("Community Vault");
    });
});
//# sourceMappingURL=on-demand-messages.test.js.map