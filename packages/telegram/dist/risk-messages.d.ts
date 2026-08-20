import type { PositionSide } from "@standx/domain/portfolio";
import type { RiskEvaluation } from "@standx/domain/risk";
export interface RiskAlertView {
    readonly userId: string;
    readonly chatId: number;
    readonly accountLabel: string;
    readonly evaluation: RiskEvaluation;
    readonly deduplicationKey: string;
}
export interface FormattedRiskAlert {
    readonly text: string;
    readonly replyMarkup: {
        readonly inline_keyboard: readonly (readonly {
            readonly text: string;
            readonly callback_data: string;
        }[])[];
    };
}
export interface PositionReportItem {
    readonly accountId: string;
    readonly symbol: string;
    readonly side: PositionSide;
    readonly quantity: string;
    readonly markPrice: string;
    readonly liquidationPrice: string | null;
    readonly marginMode: "cross" | "isolated";
    readonly leverage: string;
    readonly estimatedClose: {
        readonly fillRatio: string;
        readonly vwap: string | null;
        readonly slippagePct: string;
    };
    readonly risk: RiskEvaluation;
    readonly updatedAt: Date;
}
export interface PositionsReportInput {
    readonly now: Date;
    readonly positions: readonly PositionReportItem[];
}
export declare function formatRiskAlert(alert: RiskAlertView): FormattedRiskAlert;
export declare function formatPositionsReport(input: PositionsReportInput): string;
export declare function maskAccountId(value: string): string;
export declare function escapeTelegramMarkup(value: string): string;
