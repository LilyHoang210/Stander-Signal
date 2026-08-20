import type { DecimalString, PositionSide } from "@standx/domain/portfolio";
export type RiskHorizonMinutes = 5 | 15 | 60;
export interface RiskBaselines {
    getAdverseMove(symbol: string, side: PositionSide, horizon: RiskHorizonMinutes, version: string): Promise<DecimalString | null>;
}
export interface Candle {
    readonly timestamp: Date;
    readonly open: DecimalString;
    readonly high: DecimalString;
    readonly low: DecimalString;
    readonly close: DecimalString;
}
export interface BuildBaselineOptions {
    readonly symbol: string;
    readonly version: string;
    readonly quantile: DecimalString | string;
    readonly horizonsMinutes: readonly RiskHorizonMinutes[];
    readonly generatedAt: Date;
    readonly algorithmVersion?: string;
    readonly minCompleteDays?: number;
}
export interface BaselineJson {
    readonly algorithmVersion: string;
    readonly version: string;
    readonly symbol: string;
    readonly quantile: DecimalString;
    readonly horizonsMinutes: readonly RiskHorizonMinutes[];
    readonly sourceRange: {
        readonly from: string;
        readonly to: string;
    };
    readonly candleCount: number;
    readonly completeDays: number;
    readonly generatedAt: string;
    readonly inputChecksum: string;
    readonly moves: {
        readonly long: Readonly<Record<string, DecimalString>>;
        readonly short: Readonly<Record<string, DecimalString>>;
    };
}
export declare function parseCandleCsv(csv: string): readonly Candle[];
export declare function buildBaseline(candles: readonly Candle[], options: BuildBaselineOptions): BaselineJson;
export declare function readBaselineJson(json: string): BaselineJson;
export declare class InMemoryRiskBaselines implements RiskBaselines {
    private readonly baselines;
    constructor(baselines: readonly BaselineJson[]);
    getAdverseMove(symbol: string, side: PositionSide, horizon: RiskHorizonMinutes, version: string): Promise<DecimalString | null>;
}
