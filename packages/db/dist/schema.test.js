import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accountSnapshots, alertDeliveries, alerts, auditEvents, connectionSessions, deletionRequests, encryptedCredentials, marketSnapshots, perpsBalanceSnapshots, perpsOpenOrderSnapshots, perpsPositionSnapshots, riskEvaluations, riskStates, standxConnections, telegramUsers, thresholdVersions, tradeLifecycleCloseReasonEnum, tradeLifecycleConfidenceEnum, tradeLifecycleEvents, tradeLifecycleEventTypeEnum, tradeLifecycleNotificationStatusEnum } from "./schema.js";
describe("database schema", () => {
    it("defines every Plan 1 durable boundary", () => {
        expect([
            telegramUsers,
            standxConnections,
            connectionSessions,
            encryptedCredentials,
            accountSnapshots,
            auditEvents,
            deletionRequests
        ].map(getTableName)).toEqual([
            "telegram_users",
            "standx_connections",
            "connection_sessions",
            "encrypted_credentials",
            "account_snapshots",
            "audit_events",
            "deletion_requests"
        ]);
    });
    it("stores credential envelope parts without a plaintext token column", () => {
        const columns = Object.keys(getTableColumns(encryptedCredentials));
        expect(columns).toEqual([
            "connectionId",
            "version",
            "encryptedDataKey",
            "iv",
            "authTag",
            "ciphertext",
            "createdAt",
            "updatedAt"
        ]);
        expect(columns).not.toContain("token");
        expect(columns).not.toContain("plaintext");
    });
    it("defines the Plan 2 Perps monitoring durable boundaries", () => {
        expect([
            perpsBalanceSnapshots,
            perpsPositionSnapshots,
            perpsOpenOrderSnapshots,
            marketSnapshots,
            thresholdVersions,
            riskEvaluations,
            riskStates,
            alerts,
            alertDeliveries
        ].map(getTableName)).toEqual([
            "perps_balance_snapshots",
            "perps_position_snapshots",
            "perps_open_order_snapshots",
            "market_snapshots",
            "threshold_versions",
            "risk_evaluations",
            "risk_states",
            "alerts",
            "alert_deliveries"
        ]);
    });
    it("keeps normalized position snapshots free of credential material", () => {
        const columns = Object.keys(getTableColumns(perpsPositionSnapshots));
        expect(columns).toContain("quantity");
        expect(columns).toContain("markPrice");
        expect(columns).toContain("liquidationPrice");
        expect(columns).not.toContain("token");
        expect(columns).not.toContain("apiToken");
        expect(columns).not.toContain("plaintext");
    });
    it("exports trade lifecycle event schema", () => {
        expect(tradeLifecycleEventTypeEnum.enumValues).toEqual(["opened", "closed"]);
        expect(tradeLifecycleCloseReasonEnum.enumValues).toEqual([
            "take_profit",
            "stop_loss",
            "manual",
            "unknown"
        ]);
        expect(tradeLifecycleConfidenceEnum.enumValues).toEqual(["high", "medium", "low"]);
        expect(tradeLifecycleNotificationStatusEnum.enumValues).toEqual([
            "pending",
            "sent",
            "suppressed",
            "failed"
        ]);
        expect(getTableName(tradeLifecycleEvents)).toBe("trade_lifecycle_events");
        expect(tradeLifecycleEvents.positionKey.name).toBe("position_key");
        expect(tradeLifecycleEvents.deduplicationKey.name).toBe("deduplication_key");
    });
});
//# sourceMappingURL=schema.test.js.map