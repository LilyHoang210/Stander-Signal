import type { DecimalString } from "@standx/domain/portfolio";
export declare const autoRiskPolicyVersionId = "auto-risk-v1";
export interface AutoRiskPolicy {
    readonly versionId: typeof autoRiskPolicyVersionId;
    readonly algorithmVersion: typeof autoRiskPolicyVersionId;
    readonly staleAccountDataMs: number;
    readonly exitSlippagePct: DecimalString;
    readonly adverseMoves: {
        readonly m5: DecimalString;
        readonly m15: DecimalString;
        readonly m60: DecimalString;
    };
    readonly positionQuality: {
        readonly highLeverage: DecimalString;
        readonly largeNotionalToEquityRatio: DecimalString;
        readonly negativePnlToMarginRatio: DecimalString;
        readonly borderlineMultiplier: DecimalString;
    };
    readonly stopLossProximity: {
        readonly criticalDistancePct: DecimalString;
        readonly dangerDistancePct: DecimalString;
        readonly warningDistancePct: DecimalString;
    };
}
export declare const autoRiskPolicy: AutoRiskPolicy;
export declare function buildAutoRiskPolicyMetadata(): Record<string, unknown>;
