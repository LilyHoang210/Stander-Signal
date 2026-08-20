export const autoRiskPolicyVersionId = "auto-risk-v1";
export const autoRiskPolicy = {
    versionId: autoRiskPolicyVersionId,
    algorithmVersion: autoRiskPolicyVersionId,
    staleAccountDataMs: 120_000,
    exitSlippagePct: "0.00500000000000000000",
    adverseMoves: {
        m5: "0.01000000000000000000",
        m15: "0.03000000000000000000",
        m60: "0.06000000000000000000"
    },
    positionQuality: {
        highLeverage: "10",
        largeNotionalToEquityRatio: "0.50000000000000000000",
        negativePnlToMarginRatio: "0.25000000000000000000",
        borderlineMultiplier: "1.25000000000000000000"
    },
    stopLossProximity: {
        criticalDistancePct: "0.00100000000000000000",
        dangerDistancePct: "0.00250000000000000000",
        warningDistancePct: "0.00500000000000000000"
    }
};
export function buildAutoRiskPolicyMetadata() {
    return {
        systemManaged: true,
        accountDataFreshnessSeconds: autoRiskPolicy.staleAccountDataMs / 1000,
        exitSlippagePct: autoRiskPolicy.exitSlippagePct,
        adverseMoves: autoRiskPolicy.adverseMoves,
        positionQuality: autoRiskPolicy.positionQuality,
        stopLossProximity: autoRiskPolicy.stopLossProximity,
        crossMarginStress: {
            method: "sum(abs(quantity) * markPrice * adverseMove)",
            diversificationCredit: false
        },
        notificationPolicy: {
            immediate: [
                "critical",
                "warning_to_danger_or_critical",
                "safe_to_danger",
                "new_position_starts_danger_or_critical"
            ],
            delayed: ["plain_warning_persisted_and_worsening_or_market_danger_active"],
            recovery: ["previously_notified_danger_or_critical_then_stable_safe"]
        },
        marketDangerSignals: {
            status: "skipped_when_unavailable_or_stale",
            supportedSignals: [
                "extreme_spread",
                "weak_closing_side_depth",
                "high_estimated_exit_slippage",
                "adverse_funding",
                "mark_index_divergence",
                "open_interest_shock_with_adverse_price",
                "high_short_horizon_volatility"
            ]
        },
        unsupportedAccountAreas: ["vault", "slp", "cash_wallet", "claimable_yield", "network_yield"]
    };
}
//# sourceMappingURL=auto-risk-policy.js.map