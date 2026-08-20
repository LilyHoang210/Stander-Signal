import { describe, expect, it } from "vitest";
import { formatPositionsReport, formatRiskAlert, maskAccountId } from "./risk-messages.js";
const evaluation = {
    accountId: "account-abcdef1234567890",
    itemId: "position-1",
    riskType: "liquidation",
    severity: "critical",
    status: "evaluated",
    thresholdVersion: "threshold-v1",
    sourceTier: "A",
    sourceTimestamp: new Date("2026-08-14T08:00:00.000Z"),
    evaluatedAt: new Date("2026-08-14T08:00:05.000Z"),
    reasons: [
        {
            code: "LIQUIDATION_BUFFER_5M",
            message: "Liquidation buffer <unsafe> & inside Q99.",
            values: {
                effectiveBufferPct: "0.015",
                markPrice: "100"
            }
        }
    ]
};
const alert = {
    userId: "user-1",
    chatId: 42,
    accountLabel: "standx-main",
    evaluation,
    deduplicationKey: "user-1:account-abcdef1234567890:position-1:liquidation:threshold-v1:critical"
};
describe("formatRiskAlert", () => {
    it("includes severity, reason, source tier, and compact UTC timestamps", () => {
        const formatted = formatRiskAlert(alert);
        expect(formatted.text).toContain("CRITICAL");
        expect(formatted.text).toContain("Liquidation buffer");
        expect(formatted.text).toContain("Source: Tier A");
        expect(formatted.text).toContain("Observed: 🕘 Aug 14 · 2026, 08:00 UTC");
        expect(formatted.text).toContain("Evaluated: 🕘 Aug 14 · 2026, 08:00 UTC");
        expect(formatted.text).not.toContain("2026-08-14T08:00:00.000Z");
        expect(formatted.text).not.toContain("2026-08-14T08:00:05.000Z");
    });
    it("escapes Telegram markup and masks account identifiers", () => {
        const formatted = formatRiskAlert(alert);
        expect(formatted.text).toContain("&lt;unsafe&gt; &amp;");
        expect(formatted.text).not.toContain("account-abcdef1234567890");
        expect(maskAccountId("account-abcdef1234567890")).toBe("acco…7890");
    });
    it("attaches acknowledge, view status, and disconnect callbacks", () => {
        const formatted = formatRiskAlert(alert);
        expect(formatted.replyMarkup.inline_keyboard).toEqual([
            [
                {
                    text: "Acknowledge",
                    callback_data: "alert:ack:user-1:account-abcdef1234567890:position-1:liquidation:threshold-v1:critical"
                },
                {
                    text: "View status",
                    callback_data: "alert:status:account-abcdef1234567890"
                }
            ],
            [{ text: "Disconnect", callback_data: "disconnect:confirm" }]
        ]);
    });
    it("formats risk alerts with material values and neutral action hints", () => {
        const formatted = formatRiskAlert({
            ...alert,
            evaluation: {
                ...evaluation,
                severity: "danger",
                thresholdVersion: "auto-risk-v1",
                reasons: [{
                        code: "LIQUIDATION_BUFFER_15M",
                        message: "Effective liquidation buffer is inside the 15-minute Q99 adverse move.",
                        values: {
                            markPrice: "100",
                            liquidationPrice: "97",
                            liquidationBufferPct: "0.03000000000000000000",
                            effectiveBufferPct: "0.02500000000000000000",
                            exitSlippagePct: "0.00500000000000000000"
                        }
                    }]
            }
        });
        expect(formatted.text).toContain("DANGER liquidation");
        expect(formatted.text).toContain("Mark: 100");
        expect(formatted.text).toContain("Liq: 97");
        expect(formatted.text).toContain("Buffer: 0.03000000000000000000");
        expect(formatted.text).toContain("Effective buffer: 0.02500000000000000000");
        expect(formatted.text).toContain("Exit slippage assumption: 0.00500000000000000000");
        expect(formatted.text).toContain("Review TP/SL orders");
        expect(formatted.text).not.toMatch(/\bbuy\b|\bsell\b|increase leverage|guaranteed/i);
    });
    it("formats stop loss proximity alerts with a dedicated Telegram template", () => {
        const formatted = formatRiskAlert({
            ...alert,
            evaluation: {
                ...evaluation,
                riskType: "stop_loss_proximity",
                severity: "critical",
                reasons: [{
                        code: "STOP_LOSS_DISTANCE_CRITICAL",
                        message: "Position is extremely close to its Stop Loss order.",
                        values: {
                            symbol: "BTC-USD",
                            positionSide: "short",
                            markPrice: "69480",
                            stopPrice: "69512.79",
                            stopDistancePct: "0.00047200000000000000",
                            stopSide: "buy",
                            orderId: "standx-order-123"
                        }
                    }]
            }
        });
        expect(formatted.text).toBe([
            "🚨 Stop Loss Risk — Critical",
            "",
            "Asset: BTC",
            "Direction: SHORT 📉",
            "Mark Price: $69,480",
            "Stop Loss: $69,512.79",
            "Distance to SL: 0.05%",
            "Severity: Critical",
            "",
            "Action: Position is extremely close to Stop Loss.",
            "🕐 Aug 14 · 2026, 08:00 UTC"
        ].join("\n"));
        expect(formatted.text).not.toContain("NOTIFY CRITICAL stop_loss_proximity");
    });
});
describe("formatPositionsReport", () => {
    it("uses English copy when there are no open positions", () => {
        expect(formatPositionsReport({
            now: new Date("2026-08-14T08:00:45.000Z"),
            positions: []
        })).toBe("No open Perps positions.");
    });
    it("shows approved position fields, estimated close metrics, risk reason, and update age", () => {
        const item = {
            accountId: "account-abcdef1234567890",
            symbol: "BTC-USD",
            side: "long",
            quantity: "0.5",
            markPrice: "100",
            liquidationPrice: "90",
            marginMode: "cross",
            leverage: "5",
            estimatedClose: {
                fillRatio: "1",
                vwap: "99.5",
                slippagePct: "0.005"
            },
            risk: evaluation,
            updatedAt: new Date("2026-08-14T08:00:00.000Z")
        };
        const text = formatPositionsReport({
            now: new Date("2026-08-14T08:00:45.000Z"),
            positions: [item]
        });
        expect(text).toContain("BTC-USD long");
        expect(text).toContain("Qty: 0.5");
        expect(text).toContain("Estimated close: fill 1, VWAP 99.5, slippage 0.005");
        expect(text).toContain("Risk: CRITICAL LIQUIDATION_BUFFER_5M");
        expect(text).toContain("Updated: 45s ago");
        expect(text).not.toContain("account-abcdef1234567890");
    });
});
//# sourceMappingURL=risk-messages.test.js.map