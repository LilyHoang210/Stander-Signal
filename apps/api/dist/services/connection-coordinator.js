import { randomUUID } from "node:crypto";
import { ConnectionSessionError } from "@standx/domain/connection";
import { ConnectionApplicationError } from "../context.js";
export class StandXValidationError extends Error {
    code;
    constructor(code, options) {
        super(code, options);
        this.code = code;
        this.name = "StandXValidationError";
    }
}
export class ConnectionCoordinator {
    sessions;
    credentials;
    validator;
    lifecycle;
    snapshots;
    jobs;
    generateId;
    notifier;
    constructor(sessions, credentials, validator, lifecycle, snapshots, jobs, generateId = randomUUID, notifier = { connectionActivated: () => Promise.resolve() }) {
        this.sessions = sessions;
        this.credentials = credentials;
        this.validator = validator;
        this.lifecycle = lifecycle;
        this.snapshots = snapshots;
        this.jobs = jobs;
        this.generateId = generateId;
        this.notifier = notifier;
    }
    createSession(identity, now) {
        return this.sessions.create(identity.telegramUserId, now);
    }
    async connect(input, now) {
        try {
            await this.sessions.consume(input.sessionId, input.telegramUserId, now);
        }
        catch (error) {
            if (error instanceof ConnectionSessionError) {
                throw mapSessionError(error);
            }
            throw error;
        }
        let account;
        try {
            account = await this.credentials.withCandidate(input.apiToken, candidate => this.validator.validateAccount(candidate));
        }
        catch (error) {
            if (error instanceof StandXValidationError) {
                throw new ConnectionApplicationError(error.code === "unauthorized" ? "standx_unauthorized" : "standx_unavailable", { cause: error });
            }
            throw error;
        }
        const connectionId = this.generateId();
        const accountLabel = verifiedAccountLabel(account);
        const snapshotCiphertext = await this.snapshots.protect(account.snapshot, {
            connectionId,
            telegramUserId: input.telegramUserId
        });
        await this.lifecycle.stage({
            id: connectionId,
            telegramUserId: input.telegramUserId,
            accountId: account.accountId,
            accountLabel,
            createdAt: now
        });
        try {
            await this.credentials.store(connectionId, input.telegramUserId, input.apiToken);
            const connection = await this.lifecycle.activate({
                connectionId,
                telegramUserId: input.telegramUserId,
                snapshotCiphertext,
                snapshotObservedAt: account.observedAt,
                activatedAt: now
            });
            await this.notifyConnectionActivated(connectionId, input.telegramUserId, connection.accountLabel);
            return connection;
        }
        catch (error) {
            await Promise.allSettled([
                this.credentials.delete(connectionId),
                this.lifecycle.rollback(connectionId, input.telegramUserId)
            ]);
            throw error;
        }
    }
    async notifyConnectionActivated(connectionId, telegramUserId, accountLabel) {
        try {
            await this.notifier.connectionActivated({ connectionId, telegramUserId, accountLabel });
        }
        catch {
            // Notification delivery must not invalidate an already activated connection.
        }
    }
    getStatus(connectionId, telegramUserId) {
        return this.lifecycle.findByOwner(connectionId, telegramUserId);
    }
    getCurrentStatus(telegramUserId) {
        return this.lifecycle.findCurrentByOwner(telegramUserId);
    }
    async disconnect(connectionId, telegramUserId, now) {
        const disconnected = await this.lifecycle.disconnect(connectionId, telegramUserId, now);
        if (!disconnected) {
            return false;
        }
        await this.jobs.cancelConnectionJobs(connectionId);
        return true;
    }
    async disconnectCurrent(telegramUserId, now) {
        const current = await this.lifecycle.findCurrentByOwner(telegramUserId);
        if (current === null) {
            return false;
        }
        return this.disconnect(current.id, telegramUserId, now);
    }
}
function mapSessionError(error) {
    if (error.code === "expired") {
        return new ConnectionApplicationError("session_expired", { cause: error });
    }
    if (error.code === "used") {
        return new ConnectionApplicationError("session_used", { cause: error });
    }
    return new ConnectionApplicationError("session_invalid", { cause: error });
}
function verifiedAccountLabel(account) {
    const alias = account.alias?.trim();
    if (alias !== undefined && alias.length > 0 && alias.length <= 64) {
        return alias;
    }
    if (account.accountId.length <= 12) {
        return account.accountId;
    }
    return `${account.accountId.slice(0, 8)}...${account.accountId.slice(-4)}`;
}
//# sourceMappingURL=connection-coordinator.js.map