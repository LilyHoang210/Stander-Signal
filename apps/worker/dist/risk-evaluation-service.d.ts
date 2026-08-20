import type { PgDatabase } from "drizzle-orm/pg-core/db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { type AlertRiskState } from "@standx/alerts/state-machine";
import type { RiskEvaluation } from "@standx/domain/risk";
import * as schema from "@standx/db/schema";
export interface TelegramAlertSubmission {
    readonly chatId: number;
    readonly text: string;
    readonly replyMarkup?: {
        readonly inline_keyboard: readonly (readonly {
            readonly text: string;
            readonly callback_data: string;
        }[])[];
    };
}
export interface TelegramAlertSendResult {
    readonly ok: boolean;
    readonly status: number;
    readonly providerMessageId?: string;
    readonly errorCode?: string;
}
export interface PostgresRiskEvaluationServiceOptions {
    readonly now?: () => Date;
    readonly generateId?: () => string;
    readonly thresholdVersionId?: string;
    readonly financialAlertsEnabled: boolean;
    readonly sendTelegramAlert?: (job: TelegramAlertSubmission) => Promise<TelegramAlertSendResult>;
}
export type EvaluateConnectionResult = {
    readonly status: "evaluated";
    readonly connectionId: string;
    readonly evaluationCount: number;
} | {
    readonly status: "skipped_inactive";
    readonly connectionId: string;
} | {
    readonly status: "skipped_missing_snapshot";
    readonly connectionId: string;
};
export declare class PostgresRiskEvaluationService<TQueryResult extends PgQueryResultHKT> {
    private readonly database;
    private readonly options;
    private readonly now;
    private readonly generateId;
    private readonly thresholdVersionId;
    constructor(database: PgDatabase<TQueryResult, typeof schema>, options: PostgresRiskEvaluationServiceOptions);
    evaluateConnection(connectionId: string): Promise<EvaluateConnectionResult>;
    private loadLatestSnapshot;
    private ensureThresholdVersion;
    private persistEvaluation;
}
export declare function createDirectRiskEvaluationQueue(service: Pick<PostgresRiskEvaluationService<PgQueryResultHKT>, "evaluateConnection">, onError?: (error: Error, connectionId: string) => void): {
    enqueueEvaluateAccount(connectionId: string): Promise<void>;
};
export declare function initialPostgresAlertRiskState(userId: string, evaluation: RiskEvaluation): AlertRiskState;
