import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { buildBaseline, InMemoryRiskBaselines, parseCandleCsv, readBaselineJson } from "./baselines.js";
const fixturePath = "test/fixtures/klines/btc-usd-1m.csv";
const decimal = (value) => value;
const requireMove = (moves, horizon) => {
    const value = moves[horizon];
    if (value === undefined) {
        throw new Error(`Missing move for horizon ${horizon}`);
    }
    return value;
};
const directionCandles = [
    {
        timestamp: new Date("2026-08-14T00:00:00.000Z"),
        open: decimal("100"),
        high: decimal("101"),
        low: decimal("99"),
        close: decimal("100")
    },
    {
        timestamp: new Date("2026-08-14T00:01:00.000Z"),
        open: decimal("100"),
        high: decimal("102"),
        low: decimal("99"),
        close: decimal("101")
    },
    {
        timestamp: new Date("2026-08-14T00:02:00.000Z"),
        open: decimal("100"),
        high: decimal("104"),
        low: decimal("98"),
        close: decimal("102")
    },
    {
        timestamp: new Date("2026-08-14T00:03:00.000Z"),
        open: decimal("100"),
        high: decimal("106"),
        low: decimal("96"),
        close: decimal("103")
    },
    {
        timestamp: new Date("2026-08-14T00:04:00.000Z"),
        open: decimal("100"),
        high: decimal("103"),
        low: decimal("97"),
        close: decimal("102")
    },
    {
        timestamp: new Date("2026-08-14T00:05:00.000Z"),
        open: decimal("100"),
        high: decimal("101"),
        low: decimal("99"),
        close: decimal("100")
    }
];
describe("adverse move baselines", () => {
    it("uses downward excursions for longs and upward excursions for shorts", () => {
        const baseline = buildBaseline(directionCandles, {
            symbol: "BTC-USD",
            version: "test-q99",
            quantile: "0.99",
            horizonsMinutes: [5],
            generatedAt: new Date("2026-08-14T00:00:00.000Z"),
            minCompleteDays: 0
        });
        expect(new Decimal(requireMove(baseline.moves.long, "5")).eq(requireMove(baseline.moves.short, "5"))).toBe(false);
        expect(requireMove(baseline.moves.long, "5")).toBe("0.04000000000000000000");
        expect(requireMove(baseline.moves.short, "5")).toBe("0.06000000000000000000");
    });
    it("uses nearest-rank empirical quantiles for each horizon", () => {
        const candles = parseCandleCsv(readFileSync(fixturePath, "utf8"));
        const baseline = buildBaseline(candles, {
            symbol: "BTC-USD",
            version: "test-q99",
            quantile: "0.99",
            horizonsMinutes: [5, 15, 60],
            generatedAt: new Date("2026-08-14T00:00:00.000Z"),
            minCompleteDays: 0
        });
        expect(baseline.moves.long).toEqual({
            "5": "0.10000000000000000000",
            "15": "0.10000000000000000000",
            "60": "0.10000000000000000000"
        });
        expect(baseline.moves.short).toEqual({
            "5": "0.10000000000000000000",
            "15": "0.10000000000000000000",
            "60": "0.10000000000000000000"
        });
    });
    it("refuses activation with less than thirty complete days by default", () => {
        const candles = parseCandleCsv(readFileSync(fixturePath, "utf8"));
        expect(() => buildBaseline(candles, {
            symbol: "BTC-USD",
            version: "test-q99",
            quantile: "0.99",
            horizonsMinutes: [5, 15, 60],
            generatedAt: new Date("2026-08-14T00:00:00.000Z")
        })).toThrow("at least 30 complete days");
    });
    it("looks up adverse moves by symbol, side, horizon, and version", async () => {
        const candles = parseCandleCsv(readFileSync(fixturePath, "utf8"));
        const baseline = buildBaseline(candles, {
            symbol: "BTC-USD",
            version: "test-q99",
            quantile: "0.99",
            horizonsMinutes: [5, 15, 60],
            generatedAt: new Date("2026-08-14T00:00:00.000Z"),
            minCompleteDays: 0
        });
        const store = new InMemoryRiskBaselines([baseline]);
        await expect(store.getAdverseMove("BTC-USD", "long", 5, "test-q99")).resolves.toBe("0.10000000000000000000");
        await expect(store.getAdverseMove("BTC-USD", "short", 60, "test-q99")).resolves.toBe("0.10000000000000000000");
        await expect(store.getAdverseMove("ETH-USD", "long", 5, "test-q99")).resolves.toBeNull();
    });
    it("matches deterministic Python calibration output", () => {
        const outputDir = mkdtempSync(join(tmpdir(), "standx-baseline-"));
        const outputPath = join(outputDir, "baseline.json");
        execFileSync("python", [
            "scripts/calibration/build_adverse_quantiles.py",
            fixturePath,
            "--output",
            outputPath,
            "--symbol",
            "BTC-USD",
            "--version",
            "test-q99",
            "--generated-at",
            "2026-08-14T00:00:00.000Z",
            "--min-complete-days",
            "0"
        ]);
        const fromPython = readBaselineJson(readFileSync(outputPath, "utf8"));
        const fromTypeScript = buildBaseline(parseCandleCsv(readFileSync(fixturePath, "utf8")), {
            symbol: "BTC-USD",
            version: "test-q99",
            quantile: "0.99",
            horizonsMinutes: [5, 15, 60],
            generatedAt: new Date("2026-08-14T00:00:00.000Z"),
            minCompleteDays: 0
        });
        expect(fromPython).toEqual(fromTypeScript);
    });
});
//# sourceMappingURL=baselines.test.js.map