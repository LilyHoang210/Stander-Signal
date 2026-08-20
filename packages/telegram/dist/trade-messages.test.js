import { describe, expect, it } from "vitest";
import { formatCompactPositionsReport, formatTradeClosedNotification, formatTradeOpenedNotification } from "./trade-messages.js";
describe("trade lifecycle Telegram messages", () => {
    it("formats opened trade notifications", () => {
        expect(formatTradeOpenedNotification({
            symbol: "AIXBT",
            side: "long",
            leverage: "3",
            collateral: "20.00",
            collateralAsset: "USDC",
            entryPrice: "0.018848",
            quantity: "3183",
            sourceTimestamp: new Date("2026-08-12T17:24:00.000Z")
        })).toBe([
            "⚡ Instant Trade Opened",
            "",
            "Asset: AIXBT",
            "Direction: LONG 📈",
            "Leverage: 3x",
            "Collateral: $20.00 USDC",
            "Entry Price: $0.018848",
            "Size: 3,183 AIXBT",
            "",
            "🕘 Aug 12 · 2026, 17:24 UTC"
        ].join("\n"));
    });
    it("formats stop loss close notifications", () => {
        expect(formatTradeClosedNotification({
            symbol: "AIXBT",
            side: "long",
            closeReason: "stop_loss",
            leverage: "3",
            entryPrice: "0.018848",
            exitPrice: "0.018565",
            quantity: "3183",
            realizedPnl: "-1.01",
            realizedPnlPct: "-5.04",
            fee: "0.11",
            heldSeconds: 3232,
            sourceTimestamp: new Date("2026-08-12T18:17:00.000Z")
        })).toBe([
            "🛑 Instant Trade — Stop Loss Hit",
            "",
            "Asset: AIXBT",
            "Direction: LONG 📈",
            "Leverage: 3x",
            "Entry Price: $0.018848",
            "Exit Price: $0.018565",
            "PnL: -$1.01 (-5.04%)",
            "Fee: $0.11",
            "Size: 3,183 AIXBT",
            "Held: 53m 52s",
            "",
            "🕘 Aug 12 · 2026, 18:17 UTC"
        ].join("\n"));
    });
    it("formats manual close notifications", () => {
        expect(formatTradeClosedNotification({
            symbol: "CRVW",
            side: "long",
            closeReason: "manual",
            leverage: "6",
            entryPrice: "108.17",
            exitPrice: "108.10",
            quantity: "1.11",
            realizedPnl: "-0.12",
            realizedPnlPct: "-0.60",
            fee: "0.04",
            heldSeconds: 665,
            sourceTimestamp: new Date("2026-08-13T17:17:00.000Z")
        })).toBe([
            "🔵 Instant Trade Closed — Manual",
            "",
            "Asset: CRVW",
            "Direction: LONG 📈",
            "Leverage: 6x",
            "Entry Price: $108.17",
            "Exit Price: $108.10",
            "PnL: -$0.12 (-0.60%)",
            "Fee: $0.04",
            "Size: 1.11 CRVW",
            "Held: 11m 5s",
            "",
            "🕘 Aug 13 · 2026, 17:17 UTC"
        ].join("\n"));
    });
    it("formats compact positions", () => {
        expect(formatCompactPositionsReport({
            positions: [
                {
                    symbol: "CRV",
                    side: "long",
                    quantity: "724.1000",
                    entryPrice: "0.28",
                    unrealizedPnl: "-0.44",
                    liquidationPrice: "0.26"
                },
                {
                    symbol: "VIRTUAL",
                    side: "long",
                    quantity: "167.3000",
                    entryPrice: "0.60",
                    unrealizedPnl: "-0.53",
                    liquidationPrice: "0.53"
                },
                {
                    symbol: "xyz:CRVW",
                    side: "long",
                    quantity: "1.4900",
                    entryPrice: "107.10",
                    unrealizedPnl: "-0.09",
                    liquidationPrice: "98.64"
                }
            ]
        })).toBe([
            "• CRV | Long | Size: 724.1000 | Entry: $0.28 | PnL: -0.44 | Liq: $0.26",
            "• VIRTUAL | Long | Size: 167.3000 | Entry: $0.60 | PnL: -0.53 | Liq: $0.53",
            "• xyz:CRVW | Long | Size: 1.4900 | Entry: $107.10 | PnL: -0.09 | Liq: $98.64"
        ].join("\n"));
    });
});
//# sourceMappingURL=trade-messages.test.js.map