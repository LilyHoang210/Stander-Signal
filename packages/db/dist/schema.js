import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
const timestamps = {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};
export const connectionStatusEnum = pgEnum("connection_status", [
    "pending",
    "active",
    "paused",
    "disconnected"
]);
export const deletionStatusEnum = pgEnum("deletion_status", [
    "pending",
    "running",
    "completed",
    "failed"
]);
export const sourceTierEnum = pgEnum("source_tier", ["A", "B", "C", "D"]);
export const riskSeverityEnum = pgEnum("risk_severity", [
    "safe",
    "warning",
    "danger",
    "critical"
]);
export const riskStatusEnum = pgEnum("risk_status", [
    "evaluated",
    "suppressed_stale",
    "suppressed_missing_data"
]);
export const alertStatusEnum = pgEnum("alert_status", [
    "candidate",
    "notified",
    "acknowledged",
    "recovered"
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
    "queued",
    "sent",
    "retrying",
    "failed"
]);
export const tradeLifecycleEventTypeEnum = pgEnum("trade_lifecycle_event_type", [
    "opened",
    "closed"
]);
export const tradeLifecycleCloseReasonEnum = pgEnum("trade_lifecycle_close_reason", [
    "take_profit",
    "stop_loss",
    "manual",
    "unknown"
]);
export const tradeLifecycleConfidenceEnum = pgEnum("trade_lifecycle_confidence", [
    "high",
    "medium",
    "low"
]);
export const tradeLifecycleNotificationStatusEnum = pgEnum("trade_lifecycle_notification_status", ["pending", "sent", "suppressed", "failed"]);
export const telegramUsers = pgTable("telegram_users", {
    telegramUserId: varchar("telegram_user_id", { length: 32 }).primaryKey(),
    username: varchar("username", { length: 64 }),
    ...timestamps
});
export const standxConnections = pgTable("standx_connections", {
    id: uuid("id").primaryKey(),
    telegramUserId: varchar("telegram_user_id", { length: 32 })
        .notNull()
        .references(() => telegramUsers.telegramUserId, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 256 }).notNull(),
    accountLabel: varchar("account_label", { length: 128 }),
    status: connectionStatusEnum("status").notNull(),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
    ...timestamps
}, table => [
    check("standx_connections_status_check", sql `${table.status} in ('pending', 'active', 'paused', 'disconnected')`),
    index("standx_connections_owner_idx").on(table.telegramUserId),
    uniqueIndex("standx_connections_one_current_per_user_idx")
        .on(table.telegramUserId)
        .where(sql `${table.status} in ('active', 'paused')`)
]);
export const connectionSessions = pgTable("connection_sessions", {
    id: uuid("id").primaryKey(),
    telegramUserId: varchar("telegram_user_id", { length: 32 })
        .notNull()
        .references(() => telegramUsers.telegramUserId, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, table => [
    uniqueIndex("connection_sessions_token_hash_idx").on(table.tokenHash),
    index("connection_sessions_owner_idx").on(table.telegramUserId)
]);
export const encryptedCredentials = pgTable("encrypted_credentials", {
    connectionId: uuid("connection_id")
        .primaryKey()
        .references(() => standxConnections.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    encryptedDataKey: text("encrypted_data_key").notNull(),
    iv: text("iv").notNull(),
    authTag: text("auth_tag").notNull(),
    ciphertext: text("ciphertext").notNull(),
    ...timestamps
});
export const accountSnapshots = pgTable("account_snapshots", {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
        .notNull()
        .references(() => standxConnections.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    payloadCiphertext: text("payload_ciphertext").notNull(),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow()
}, table => [
    index("account_snapshots_connection_idx").on(table.connectionId),
    index("account_snapshots_retention_idx").on(table.ingestedAt)
]);
export const perpsBalanceSnapshots = pgTable("perps_balance_snapshots", {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
        .notNull()
        .references(() => standxConnections.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 256 }).notNull(),
    balance: text("balance").notNull(),
    equity: text("equity").notNull(),
    isolatedBalance: text("isolated_balance").notNull(),
    isolatedUpnl: text("isolated_upnl").notNull(),
    crossBalance: text("cross_balance").notNull(),
    crossMargin: text("cross_margin").notNull(),
    crossUpnl: text("cross_upnl").notNull(),
    crossAvailable: text("cross_available").notNull(),
    locked: text("locked").notNull(),
    upnl: text("upnl").notNull(),
    pnlFreeze: text("pnl_freeze").notNull(),
    sourceTier: sourceTierEnum("source_tier").notNull(),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull()
}, table => [
    index("perps_balance_snapshots_connection_idx").on(table.connectionId, table.ingestedAt),
    index("perps_balance_snapshots_retention_idx").on(table.ingestedAt)
]);
export const perpsPositionSnapshots = pgTable("perps_position_snapshots", {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
        .notNull()
        .references(() => standxConnections.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 256 }).notNull(),
    positionId: varchar("position_id", { length: 128 }).notNull(),
    symbol: varchar("symbol", { length: 64 }).notNull(),
    side: varchar("side", { length: 8 }).notNull(),
    quantity: text("quantity").notNull(),
    notional: text("notional").notNull(),
    entryPrice: text("entry_price").notNull(),
    markPrice: text("mark_price").notNull(),
    liquidationPrice: text("liquidation_price"),
    bankruptcyPrice: text("bankruptcy_price"),
    liquidationFields: varchar("liquidation_fields", { length: 16 }).notNull(),
    leverage: text("leverage").notNull(),
    marginMode: varchar("margin_mode", { length: 16 }).notNull(),
    initialMargin: text("initial_margin").notNull(),
    holdingMargin: text("holding_margin").notNull(),
    maintenanceMargin: text("maintenance_margin").notNull(),
    unrealizedPnl: text("unrealized_pnl").notNull(),
    realizedPnl: text("realized_pnl").notNull(),
    marginAsset: varchar("margin_asset", { length: 32 }).notNull(),
    sourceTier: sourceTierEnum("source_tier").notNull(),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull()
}, table => [
    check("perps_position_snapshots_side_check", sql `${table.side} in ('long', 'short')`),
    check("perps_position_snapshots_margin_mode_check", sql `${table.marginMode} in ('cross', 'isolated')`),
    check("perps_position_snapshots_liquidation_fields_check", sql `${table.liquidationFields} in ('supported', 'unavailable')`),
    index("perps_position_snapshots_connection_idx").on(table.connectionId, table.ingestedAt),
    index("perps_position_snapshots_symbol_idx").on(table.symbol, table.ingestedAt),
    index("perps_position_snapshots_retention_idx").on(table.ingestedAt)
]);
export const perpsOpenOrderSnapshots = pgTable("perps_open_order_snapshots", {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
        .notNull()
        .references(() => standxConnections.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 256 }).notNull(),
    orderId: varchar("order_id", { length: 128 }).notNull(),
    positionId: varchar("position_id", { length: 128 }),
    symbol: varchar("symbol", { length: 64 }).notNull(),
    side: varchar("side", { length: 8 }).notNull(),
    orderType: varchar("order_type", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    quantity: text("quantity").notNull(),
    filledQuantity: text("filled_quantity").notNull(),
    price: text("price").notNull(),
    averageFillPrice: text("average_fill_price").notNull(),
    reduceOnly: boolean("reduce_only").notNull(),
    sourceTier: sourceTierEnum("source_tier").notNull(),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull()
}, table => [
    check("perps_open_order_snapshots_side_check", sql `${table.side} in ('buy', 'sell')`),
    index("perps_open_order_snapshots_connection_idx").on(table.connectionId, table.ingestedAt),
    index("perps_open_order_snapshots_symbol_idx").on(table.symbol, table.ingestedAt)
]);
export const tradeLifecycleEvents = pgTable("trade_lifecycle_events", {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
        .notNull()
        .references(() => standxConnections.id, { onDelete: "cascade" }),
    telegramUserId: varchar("telegram_user_id", { length: 32 })
        .notNull()
        .references(() => telegramUsers.telegramUserId, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 256 }).notNull(),
    positionKey: varchar("position_key", { length: 256 }).notNull(),
    symbol: varchar("symbol", { length: 64 }).notNull(),
    side: varchar("side", { length: 8 }).notNull(),
    eventType: tradeLifecycleEventTypeEnum("event_type").notNull(),
    closeReason: tradeLifecycleCloseReasonEnum("close_reason"),
    confidence: tradeLifecycleConfidenceEnum("confidence").notNull(),
    entryPrice: text("entry_price"),
    exitPrice: text("exit_price"),
    quantity: text("quantity").notNull(),
    leverage: text("leverage"),
    collateral: text("collateral"),
    realizedPnl: text("realized_pnl"),
    realizedPnlPct: text("realized_pnl_pct"),
    fee: text("fee"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    notificationStatus: tradeLifecycleNotificationStatusEnum("notification_status").notNull(),
    providerMessageId: varchar("provider_message_id", { length: 128 }),
    rawEvidence: jsonb("raw_evidence").$type().notNull().default({}),
    deduplicationKey: varchar("deduplication_key", { length: 512 }).notNull(),
    ...timestamps
}, table => [
    check("trade_lifecycle_events_side_check", sql `${table.side} in ('long', 'short')`),
    check("trade_lifecycle_events_close_reason_check", sql `(${table.eventType} = 'opened' and ${table.closeReason} is null) or (${table.eventType} = 'closed' and ${table.closeReason} is not null)`),
    uniqueIndex("trade_lifecycle_events_dedup_idx").on(table.deduplicationKey),
    index("trade_lifecycle_events_connection_idx").on(table.connectionId, table.detectedAt),
    index("trade_lifecycle_events_user_status_idx").on(table.telegramUserId, table.notificationStatus, table.detectedAt),
    index("trade_lifecycle_events_position_idx").on(table.connectionId, table.positionKey)
]);
export const marketSnapshots = pgTable("market_snapshots", {
    id: uuid("id").primaryKey(),
    symbol: varchar("symbol", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    sequence: text("sequence").notNull(),
    payload: jsonb("payload").$type().notNull(),
    sourceTier: sourceTierEnum("source_tier").notNull(),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull()
}, table => [
    index("market_snapshots_symbol_kind_idx").on(table.symbol, table.kind, table.ingestedAt),
    index("market_snapshots_freshness_idx").on(table.sourceTimestamp)
]);
export const thresholdVersions = pgTable("threshold_versions", {
    id: varchar("id", { length: 64 }).primaryKey(),
    status: varchar("status", { length: 32 }).notNull(),
    algorithmVersion: varchar("algorithm_version", { length: 64 }).notNull(),
    metadata: jsonb("metadata").$type().notNull().default({}),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
export const riskEvaluations = pgTable("risk_evaluations", {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
        .notNull()
        .references(() => standxConnections.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 256 }).notNull(),
    itemId: varchar("item_id", { length: 256 }).notNull(),
    riskType: varchar("risk_type", { length: 64 }).notNull(),
    severity: riskSeverityEnum("severity").notNull(),
    status: riskStatusEnum("status").notNull(),
    sourceTier: sourceTierEnum("source_tier").notNull(),
    thresholdVersionId: varchar("threshold_version_id", { length: 64 })
        .notNull()
        .references(() => thresholdVersions.id),
    reasons: jsonb("reasons").$type().notNull(),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }).notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull()
}, table => [
    index("risk_evaluations_connection_idx").on(table.connectionId, table.evaluatedAt),
    index("risk_evaluations_item_idx").on(table.itemId, table.riskType, table.evaluatedAt)
]);
export const riskStates = pgTable("risk_states", {
    id: uuid("id").primaryKey(),
    connectionId: uuid("connection_id")
        .notNull()
        .references(() => standxConnections.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 256 }).notNull(),
    itemId: varchar("item_id", { length: 256 }).notNull(),
    riskType: varchar("risk_type", { length: 64 }).notNull(),
    thresholdVersionId: varchar("threshold_version_id", { length: 64 })
        .notNull()
        .references(() => thresholdVersions.id),
    severity: riskSeverityEnum("severity").notNull(),
    status: alertStatusEnum("status").notNull(),
    candidateSince: timestamp("candidate_since", { withTimezone: true }),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    safeSince: timestamp("safe_since", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    materialValues: jsonb("material_values").$type().notNull().default({}),
    ...timestamps
}, table => [
    uniqueIndex("risk_states_dedup_idx").on(table.connectionId, table.itemId, table.riskType, table.thresholdVersionId)
]);
export const alerts = pgTable("alerts", {
    id: uuid("id").primaryKey(),
    riskStateId: uuid("risk_state_id")
        .notNull()
        .references(() => riskStates.id, { onDelete: "cascade" }),
    evaluationId: uuid("evaluation_id")
        .notNull()
        .references(() => riskEvaluations.id, { onDelete: "cascade" }),
    telegramUserId: varchar("telegram_user_id", { length: 32 })
        .notNull()
        .references(() => telegramUsers.telegramUserId, { onDelete: "cascade" }),
    severity: riskSeverityEnum("severity").notNull(),
    status: alertStatusEnum("status").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, table => [
    index("alerts_user_status_idx").on(table.telegramUserId, table.status, table.createdAt),
    index("alerts_state_idx").on(table.riskStateId)
]);
export const alertDeliveries = pgTable("alert_deliveries", {
    id: uuid("id").primaryKey(),
    alertId: uuid("alert_id")
        .notNull()
        .references(() => alerts.id, { onDelete: "cascade" }),
    status: deliveryStatusEnum("status").notNull(),
    providerMessageId: varchar("provider_message_id", { length: 128 }),
    errorCode: varchar("error_code", { length: 64 }),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
}, table => [
    index("alert_deliveries_alert_idx").on(table.alertId),
    index("alert_deliveries_retry_idx").on(table.status, table.nextAttemptAt)
]);
export const auditEvents = pgTable("audit_events", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    auditRef: uuid("audit_ref").notNull(),
    telegramUserId: varchar("telegram_user_id", { length: 32 }).references(() => telegramUsers.telegramUserId, { onDelete: "set null" }),
    connectionId: uuid("connection_id").references(() => standxConnections.id, {
        onDelete: "set null"
    }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    metadata: jsonb("metadata")
        .$type()
        .notNull()
        .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, table => [index("audit_events_audit_ref_idx").on(table.auditRef)]);
export const deletionRequests = pgTable("deletion_requests", {
    id: uuid("id").primaryKey(),
    telegramUserId: varchar("telegram_user_id", { length: 32 }).notNull(),
    connectionId: uuid("connection_id"),
    status: deletionStatusEnum("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
}, table => [
    check("deletion_requests_status_check", sql `${table.status} in ('pending', 'running', 'completed', 'failed')`),
    index("deletion_requests_due_idx").on(table.status, table.dueAt)
]);
//# sourceMappingURL=schema.js.map