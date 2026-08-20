import type { DecimalString, SourceTier } from "./portfolio.js";
export type RiskSeverity = "safe" | "warning" | "danger" | "critical";
export type RiskStatus = "evaluated" | "suppressed_stale" | "suppressed_missing_data";
export type RiskType = "liquidation" | "cross_margin" | "stop_loss_proximity" | "exit_liquidity" | "market_danger" | "funding";
export interface RiskReason {
    readonly code: string;
    readonly message: string;
    readonly values: Readonly<Record<string, DecimalString | string>>;
}
export interface RiskEvaluation {
    readonly accountId: string;
    readonly itemId: string;
    readonly riskType: RiskType;
    readonly severity: RiskSeverity;
    readonly status: RiskStatus;
    readonly thresholdVersion: string;
    readonly sourceTier: SourceTier;
    readonly sourceTimestamp: Date;
    readonly evaluatedAt: Date;
    readonly reasons: readonly RiskReason[];
}
