import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { RiskAlertOrchestrator } from "@standx/alerts/orchestrator";
import { initialRiskState } from "@standx/alerts/state-machine";
import { evaluateCrossMargin } from "@standx/risk/margin";
import { evaluateLiquidation } from "@standx/risk/liquidation";
import { applyPositionQualityModifiers } from "@standx/risk/position-quality";
import { evaluateStopLossProximity } from "@standx/risk/stop-loss-proximity";
import { formatRiskAlert } from "@standx/telegram/risk-messages";
import * as schema from "@standx/db/schema";
import { alertDeliveries, alerts, perpsBalanceSnapshots, perpsOpenOrderSnapshots, perpsPositionSnapshots, riskEvaluations, riskStates, standxConnections, thresholdVersions } from "@standx/db/schema";
import { autoRiskPolicy, buildAutoRiskPolicyMetadata } from "./auto-risk-policy.js";
export class PostgresRiskEvaluationService {
    database;
    options;
    now;
    generateId;
    thresholdVersionId;
    constructor(database, options) {
        this.database = database;
        this.options = options;
        this.now = options.now ?? (() => new Date());
        this.generateId = options.generateId ?? randomUUID;
        this.thresholdVersionId = options.thresholdVersionId ?? autoRiskPolicy.versionId;
    }
    async evaluateConnection(connectionId) {
        const [connection] = await this.database
            .select({
            id: standxConnections.id,
            telegramUserId: standxConnections.telegramUserId,
            accountId: standxConnections.accountId,
            accountLabel: standxConnections.accountLabel,
            status: standxConnections.status
        })
            .from(standxConnections)
            .where(and(eq(standxConnections.id, connectionId), eq(standxConnections.status, "active")))
            .limit(1);
        if (connection === undefined) {
            return { status: "skipped_inactive", connectionId };
        }
        const latestSnapshot = await this.loadLatestSnapshot(connectionId);
        if (latestSnapshot === null) {
            return { status: "skipped_missing_snapshot", connectionId };
        }
        await this.ensureThresholdVersion();
        const evaluatedAt = this.now();
        const dataFresh = latestSnapshot.positions.every(position => evaluatedAt.getTime() - position.sourceTimestamp.getTime() <= autoRiskPolicy.staleAccountDataMs);
        const evaluations = [
            ...latestSnapshot.positions.map(position => {
                const liquidationEvaluation = evaluateLiquidation({
                    position,
                    exitSlippagePct: autoRiskPolicy.exitSlippagePct,
                    adverseMoves: autoRiskPolicy.adverseMoves,
                    dataFresh,
                    thresholdVersion: this.thresholdVersionId,
                    evaluatedAt
                });
                return applyPositionQualityModifiers({
                    evaluation: liquidationEvaluation,
                    position,
                    balance: latestSnapshot.balance,
                    adverseMoves: autoRiskPolicy.adverseMoves,
                    policy: autoRiskPolicy.positionQuality
                });
            }),
            ...latestSnapshot.positions.flatMap(position => {
                const stopLossEvaluation = evaluateStopLossProximity({
                    position,
                    openOrders: latestSnapshot.openOrders,
                    thresholds: autoRiskPolicy.stopLossProximity,
                    dataFresh,
                    thresholdVersion: this.thresholdVersionId,
                    evaluatedAt
                });
                return stopLossEvaluation === null ? [] : [stopLossEvaluation];
            }),
            evaluateCrossMargin({
                balance: latestSnapshot.balance,
                positions: latestSnapshot.positions.map(position => ({
                    position,
                    adverseMoves: autoRiskPolicy.adverseMoves
                })),
                dataFresh,
                thresholdVersion: this.thresholdVersionId,
                evaluatedAt
            })
        ];
        for (const evaluation of evaluations) {
            await this.persistEvaluation(connectionId, evaluation);
            await new RiskAlertOrchestrator({
                store: new PostgresAlertStateStore(this.database, connectionId, this.generateId),
                queue: new PostgresAlertDeliveryQueue(this.database, {
                    connectionId,
                    accountLabel: connection.accountLabel ?? "StandX account",
                    generateId: this.generateId,
                    financialAlertsEnabled: this.options.financialAlertsEnabled,
                    ...(this.options.sendTelegramAlert === undefined
                        ? {}
                        : { sendTelegramAlert: this.options.sendTelegramAlert })
                })
            }).processEvaluation({
                userId: connection.telegramUserId,
                evaluation,
                now: evaluatedAt
            });
        }
        return {
            status: "evaluated",
            connectionId,
            evaluationCount: evaluations.length
        };
    }
    async loadLatestSnapshot(connectionId) {
        const [balanceRow] = await this.database
            .select()
            .from(perpsBalanceSnapshots)
            .where(eq(perpsBalanceSnapshots.connectionId, connectionId))
            .orderBy(desc(perpsBalanceSnapshots.ingestedAt))
            .limit(1);
        if (balanceRow === undefined) {
            return null;
        }
        const positionRows = await this.database
            .select()
            .from(perpsPositionSnapshots)
            .where(and(eq(perpsPositionSnapshots.connectionId, connectionId), eq(perpsPositionSnapshots.ingestedAt, balanceRow.ingestedAt)));
        const openOrderRows = await this.database
            .select()
            .from(perpsOpenOrderSnapshots)
            .where(and(eq(perpsOpenOrderSnapshots.connectionId, connectionId), eq(perpsOpenOrderSnapshots.ingestedAt, balanceRow.ingestedAt)));
        return {
            balance: {
                accountId: balanceRow.accountId,
                balance: balanceRow.balance,
                equity: balanceRow.equity,
                isolatedBalance: balanceRow.isolatedBalance,
                isolatedUpnl: balanceRow.isolatedUpnl,
                crossBalance: balanceRow.crossBalance,
                crossMargin: balanceRow.crossMargin,
                crossUpnl: balanceRow.crossUpnl,
                crossAvailable: balanceRow.crossAvailable,
                locked: balanceRow.locked,
                upnl: balanceRow.upnl,
                pnlFreeze: balanceRow.pnlFreeze,
                sourceTimestamp: balanceRow.sourceTimestamp,
                ingestedAt: balanceRow.ingestedAt,
                sourceTier: "A"
            },
            positions: positionRows.map(row => ({
                accountId: row.accountId,
                positionId: row.positionId,
                symbol: row.symbol,
                side: row.side,
                quantity: row.quantity,
                notional: row.notional,
                entryPrice: row.entryPrice,
                markPrice: row.markPrice,
                liquidationPrice: row.liquidationPrice,
                bankruptcyPrice: row.bankruptcyPrice,
                liquidationFields: row.liquidationFields,
                leverage: row.leverage,
                marginMode: row.marginMode,
                initialMargin: row.initialMargin,
                holdingMargin: row.holdingMargin,
                maintenanceMargin: row.maintenanceMargin,
                unrealizedPnl: row.unrealizedPnl,
                realizedPnl: row.realizedPnl,
                marginAsset: row.marginAsset,
                sourceTimestamp: row.sourceTimestamp,
                ingestedAt: row.ingestedAt,
                sourceTier: "A"
            })),
            openOrders: openOrderRows.map(row => ({
                accountId: row.accountId,
                orderId: row.orderId,
                positionId: row.positionId,
                symbol: row.symbol,
                side: row.side,
                orderType: row.orderType,
                status: row.status,
                quantity: row.quantity,
                filledQuantity: row.filledQuantity,
                price: row.price,
                averageFillPrice: row.averageFillPrice,
                reduceOnly: row.reduceOnly,
                sourceTimestamp: row.sourceTimestamp,
                ingestedAt: row.ingestedAt,
                sourceTier: "A"
            }))
        };
    }
    async ensureThresholdVersion() {
        await this.database
            .insert(thresholdVersions)
            .values({
            id: this.thresholdVersionId,
            status: "active",
            algorithmVersion: autoRiskPolicy.algorithmVersion,
            metadata: buildAutoRiskPolicyMetadata(),
            activatedAt: new Date("2026-08-15T00:00:00.000Z")
        })
            .onConflictDoNothing();
    }
    async persistEvaluation(connectionId, evaluation) {
        await this.database.insert(riskEvaluations).values({
            id: this.generateId(),
            connectionId,
            accountId: evaluation.accountId,
            itemId: evaluation.itemId,
            riskType: evaluation.riskType,
            severity: evaluation.severity,
            status: evaluation.status,
            sourceTier: evaluation.sourceTier,
            thresholdVersionId: evaluation.thresholdVersion,
            reasons: evaluation.reasons.map(reason => ({
                code: reason.code,
                message: reason.message,
                values: { ...reason.values }
            })),
            sourceTimestamp: evaluation.sourceTimestamp,
            evaluatedAt: evaluation.evaluatedAt
        });
    }
}
class PostgresAlertStateStore {
    database;
    connectionId;
    generateId;
    constructor(database, connectionId, generateId) {
        this.database = database;
        this.connectionId = connectionId;
        this.generateId = generateId;
    }
    async transition(key, initialState, updater) {
        void key;
        const previous = await this.loadExistingState(initialState);
        const transition = updater(previous ?? initialState);
        if (previous === null && isInactiveSafeState(transition.state) && transition.action === "none") {
            return transition;
        }
        const values = this.toRowValues(transition.state);
        if (previous === null) {
            await this.database.insert(riskStates).values(values);
            return transition;
        }
        await this.database
            .update(riskStates)
            .set({
            severity: values.severity,
            status: values.status,
            candidateSince: values.candidateSince,
            lastNotifiedAt: values.lastNotifiedAt,
            acknowledgedAt: values.acknowledgedAt,
            safeSince: values.safeSince,
            resolvedAt: values.resolvedAt,
            materialValues: values.materialValues,
            updatedAt: new Date()
        })
            .where(eq(riskStates.id, previous.id));
        return transition;
    }
    async loadExistingState(state) {
        const [row] = await this.database
            .select()
            .from(riskStates)
            .where(and(eq(riskStates.connectionId, this.connectionId), eq(riskStates.itemId, state.itemId), eq(riskStates.riskType, state.riskType), eq(riskStates.thresholdVersionId, state.thresholdVersion)))
            .limit(1);
        if (row === undefined) {
            return null;
        }
        return {
            id: row.id,
            userId: state.userId,
            accountId: row.accountId,
            itemId: row.itemId,
            riskType: row.riskType,
            thresholdVersion: row.thresholdVersionId,
            activeSeverity: row.severity,
            candidateSeverity: row.candidateSince === null ? null : row.severity,
            candidateStartedAt: row.candidateSince,
            lastMaterialValues: row.materialValues,
            notifiedAt: row.lastNotifiedAt,
            acknowledgedAt: row.acknowledgedAt,
            safeSince: row.safeSince,
            resolvedAt: row.resolvedAt
        };
    }
    toRowValues(state) {
        return {
            id: this.generateId(),
            connectionId: this.connectionId,
            accountId: state.accountId,
            itemId: state.itemId,
            riskType: state.riskType,
            thresholdVersionId: state.thresholdVersion,
            severity: state.activeSeverity,
            status: statusFromState(state),
            candidateSince: state.candidateStartedAt,
            lastNotifiedAt: state.notifiedAt,
            acknowledgedAt: state.acknowledgedAt,
            safeSince: state.safeSince,
            resolvedAt: state.resolvedAt,
            materialValues: state.lastMaterialValues
        };
    }
}
class PostgresAlertDeliveryQueue {
    database;
    options;
    constructor(database, options) {
        this.database = database;
        this.options = options;
    }
    async enqueue(job) {
        const [state] = await this.database
            .select()
            .from(riskStates)
            .where(and(eq(riskStates.connectionId, this.options.connectionId), eq(riskStates.itemId, job.itemId), eq(riskStates.riskType, job.riskType), eq(riskStates.thresholdVersionId, job.thresholdVersion)))
            .limit(1);
        const [evaluation] = await this.database
            .select()
            .from(riskEvaluations)
            .where(and(eq(riskEvaluations.connectionId, this.options.connectionId), eq(riskEvaluations.accountId, job.accountId), eq(riskEvaluations.itemId, job.itemId), eq(riskEvaluations.riskType, job.riskType), eq(riskEvaluations.thresholdVersionId, job.thresholdVersion)))
            .orderBy(desc(riskEvaluations.evaluatedAt))
            .limit(1);
        if (state === undefined || evaluation === undefined) {
            return;
        }
        const chatId = Number(job.userId);
        const alertId = this.options.generateId();
        const formatted = formatRiskAlert({
            userId: job.userId,
            chatId: Number.isSafeInteger(chatId) ? chatId : 0,
            accountLabel: this.options.accountLabel,
            evaluation: toRiskEvaluation(evaluation),
            deduplicationKey: job.deduplicationKey
        });
        const message = formatted.text;
        await this.database.insert(alerts).values({
            id: alertId,
            riskStateId: state.id,
            evaluationId: evaluation.id,
            telegramUserId: job.userId,
            severity: job.severity,
            status: "candidate",
            message
        });
        if (!this.options.financialAlertsEnabled) {
            return;
        }
        if (!Number.isSafeInteger(chatId) || this.options.sendTelegramAlert === undefined) {
            await this.database.insert(alertDeliveries).values({
                id: this.options.generateId(),
                alertId,
                status: "failed",
                errorCode: "TELEGRAM_SENDER_UNAVAILABLE",
                attemptedAt: new Date(),
                nextAttemptAt: null
            });
            return;
        }
        const result = await this.options.sendTelegramAlert({
            chatId,
            text: message,
            replyMarkup: formatted.replyMarkup
        });
        await this.database.insert(alertDeliveries).values({
            id: this.options.generateId(),
            alertId,
            status: result.ok ? "sent" : "failed",
            providerMessageId: result.providerMessageId,
            errorCode: result.errorCode,
            attemptedAt: new Date(),
            nextAttemptAt: null
        });
        if (result.ok) {
            await this.database
                .update(alerts)
                .set({ status: job.action === "recover" ? "recovered" : "notified" })
                .where(eq(alerts.id, alertId));
        }
    }
}
function toRiskEvaluation(row) {
    return {
        accountId: row.accountId,
        itemId: row.itemId,
        riskType: row.riskType,
        severity: row.severity,
        status: row.status,
        thresholdVersion: row.thresholdVersionId,
        sourceTier: row.sourceTier,
        sourceTimestamp: row.sourceTimestamp,
        evaluatedAt: row.evaluatedAt,
        reasons: row.reasons.map(toRiskReason)
    };
}
function toRiskReason(row) {
    const values = typeof row.values === "object" && row.values !== null
        ? Object.fromEntries(Object.entries(row.values).map(([key, value]) => [key, String(value)]))
        : {};
    return {
        code: typeof row.code === "string" ? row.code : "UNKNOWN_REASON",
        message: typeof row.message === "string" ? row.message : "No reason provided.",
        values
    };
}
function statusFromState(state) {
    if (state.activeSeverity === "safe" && state.resolvedAt !== null) {
        return "recovered";
    }
    if (state.acknowledgedAt !== null) {
        return "acknowledged";
    }
    if (state.notifiedAt !== null) {
        return "notified";
    }
    return "candidate";
}
function isInactiveSafeState(state) {
    return state.activeSeverity === "safe" &&
        state.candidateSeverity === null &&
        state.notifiedAt === null &&
        state.acknowledgedAt === null &&
        state.resolvedAt === null;
}
export function createDirectRiskEvaluationQueue(service, onError = () => undefined) {
    return {
        async enqueueEvaluateAccount(connectionId) {
            try {
                await service.evaluateConnection(connectionId);
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error("Risk evaluation failed"), connectionId);
            }
        }
    };
}
export function initialPostgresAlertRiskState(userId, evaluation) {
    return initialRiskState(userId, evaluation);
}
//# sourceMappingURL=risk-evaluation-service.js.map