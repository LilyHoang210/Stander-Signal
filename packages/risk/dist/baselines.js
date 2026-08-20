import { createHash } from "node:crypto";
import { Decimal } from "decimal.js";
const defaultAlgorithmVersion = "adverse-move-nearest-rank-v1";
const defaultMinCompleteDays = 30;
const decimalPlaces = 20;
export function parseCandleCsv(csv) {
    const lines = csv
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
    if (lines.length === 0) {
        throw new Error("CSV is empty");
    }
    const header = lines[0];
    if (header !== "timestamp,open,high,low,close") {
        throw new Error("CSV header must be timestamp,open,high,low,close");
    }
    return lines.slice(1).map((line, index) => {
        const columns = line.split(",");
        if (columns.length !== 5) {
            throw new Error(`CSV row ${String(index + 2)} must contain 5 columns`);
        }
        const [timestampValue, open, high, low, close] = columns;
        const timestamp = new Date(timestampValue ?? "");
        if (Number.isNaN(timestamp.getTime())) {
            throw new Error(`CSV row ${String(index + 2)} has invalid timestamp`);
        }
        return {
            timestamp,
            open: parseDecimalString(open, `row ${String(index + 2)} open`),
            high: parseDecimalString(high, `row ${String(index + 2)} high`),
            low: parseDecimalString(low, `row ${String(index + 2)} low`),
            close: parseDecimalString(close, `row ${String(index + 2)} close`)
        };
    });
}
export function buildBaseline(candles, options) {
    if (candles.length === 0) {
        throw new Error("At least one candle is required");
    }
    const sortedCandles = [...candles].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
    assertStrictlyIncreasingOneMinuteCandles(sortedCandles);
    const completeDays = countCompleteDays(sortedCandles);
    const minCompleteDays = options.minCompleteDays ?? defaultMinCompleteDays;
    if (completeDays < minCompleteDays) {
        throw new Error(`Baseline activation requires at least 30 complete days; got ${String(completeDays)}`);
    }
    const quantile = parseDecimalString(String(options.quantile), "quantile");
    const longMoves = {};
    const shortMoves = {};
    for (const horizon of options.horizonsMinutes) {
        const excursions = calculateExcursions(sortedCandles, horizon);
        longMoves[String(horizon)] = nearestRank(excursions.long, quantile);
        shortMoves[String(horizon)] = nearestRank(excursions.short, quantile);
    }
    return {
        algorithmVersion: options.algorithmVersion ?? defaultAlgorithmVersion,
        version: options.version,
        symbol: options.symbol,
        quantile,
        horizonsMinutes: [...options.horizonsMinutes],
        sourceRange: {
            from: sortedCandles[0]?.timestamp.toISOString() ?? "",
            to: sortedCandles[sortedCandles.length - 1]?.timestamp.toISOString() ?? ""
        },
        candleCount: sortedCandles.length,
        completeDays,
        generatedAt: options.generatedAt.toISOString(),
        inputChecksum: checksumCandles(sortedCandles),
        moves: {
            long: longMoves,
            short: shortMoves
        }
    };
}
export function readBaselineJson(json) {
    const parsed = JSON.parse(json);
    return parsed;
}
export class InMemoryRiskBaselines {
    baselines = new Map();
    constructor(baselines) {
        for (const baseline of baselines) {
            this.baselines.set(keyOf(baseline.symbol, baseline.version), baseline);
        }
    }
    getAdverseMove(symbol, side, horizon, version) {
        const baseline = this.baselines.get(keyOf(symbol, version));
        if (baseline === undefined) {
            return Promise.resolve(null);
        }
        return Promise.resolve(baseline.moves[side][String(horizon)] ?? null);
    }
}
function calculateExcursions(candles, horizon) {
    const long = [];
    const short = [];
    for (let startIndex = 0; startIndex + horizon < candles.length; startIndex += 1) {
        const start = candles[startIndex];
        if (start === undefined) {
            continue;
        }
        const startOpen = new Decimal(start.open);
        if (startOpen.lte(0)) {
            throw new Error("Candle open must be greater than zero");
        }
        const window = candles.slice(startIndex, startIndex + horizon + 1);
        const minimumLow = Decimal.min(...window.map(candle => new Decimal(candle.low)));
        const maximumHigh = Decimal.max(...window.map(candle => new Decimal(candle.high)));
        long.push(formatDecimal(Decimal.max(new Decimal(0), startOpen.minus(minimumLow).div(startOpen))));
        short.push(formatDecimal(Decimal.max(new Decimal(0), maximumHigh.minus(startOpen).div(startOpen))));
    }
    if (long.length === 0 || short.length === 0) {
        throw new Error(`Not enough candles for ${String(horizon)} minute horizon`);
    }
    return { long, short };
}
function nearestRank(values, quantile) {
    if (values.length === 0) {
        throw new Error("Cannot calculate quantile from empty values");
    }
    const sorted = [...values].sort((left, right) => new Decimal(left).comparedTo(new Decimal(right)));
    const rank = new Decimal(quantile).times(sorted.length).ceil().toNumber();
    const index = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
    const value = sorted[index];
    if (value === undefined) {
        throw new Error("Quantile index out of range");
    }
    return value;
}
function assertStrictlyIncreasingOneMinuteCandles(candles) {
    for (let index = 1; index < candles.length; index += 1) {
        const previous = candles[index - 1];
        const current = candles[index];
        if (previous === undefined || current === undefined) {
            continue;
        }
        const deltaMs = current.timestamp.getTime() - previous.timestamp.getTime();
        if (deltaMs !== 60_000) {
            throw new Error("Candles must be contiguous one-minute records");
        }
    }
}
function countCompleteDays(candles) {
    const days = new Map();
    for (const candle of candles) {
        const day = candle.timestamp.toISOString().slice(0, 10);
        days.set(day, (days.get(day) ?? 0) + 1);
    }
    return [...days.values()].filter(count => count >= 1_440).length;
}
function checksumCandles(candles) {
    const canonical = [
        "timestamp,open,high,low,close",
        ...candles.map(candle => [candle.timestamp.toISOString(), candle.open, candle.high, candle.low, candle.close].join(","))
    ].join("\n");
    return createHash("sha256").update(canonical).digest("hex");
}
function parseDecimalString(value, fieldName) {
    if (value === undefined || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
        throw new Error(`${fieldName} must be a plain decimal string`);
    }
    const decimal = new Decimal(value);
    if (!decimal.isFinite()) {
        throw new Error(`${fieldName} must be finite`);
    }
    return value;
}
function formatDecimal(value) {
    return value.toFixed(decimalPlaces);
}
function keyOf(symbol, version) {
    return `${symbol}:${version}`;
}
//# sourceMappingURL=baselines.js.map