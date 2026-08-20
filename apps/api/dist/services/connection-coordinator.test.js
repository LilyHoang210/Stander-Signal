/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from "vitest";
import { ConnectionSessionError } from "@standx/domain/connection";
import { ConnectionCoordinator, StandXValidationError } from "./connection-coordinator.js";
const now = new Date("2026-08-14T12:00:00Z");
const token = "header.eyJhbGlhcyI6ImZvcmdlZCJ9.signature";
const account = {
    accountId: "bsc_0x123456789abcdef",
    observedAt: now,
    snapshot: { balance: { equity: "125.00" }, positions: [] }
};
function createHarness(accountResult = account) {
    const events = [];
    const sessions = {
        create: vi.fn(() => Promise.resolve({
            id: "single-use-session",
            telegramUserId: "42",
            expiresAt: new Date("2026-08-14T12:05:00Z")
        })),
        consume: vi.fn(() => {
            events.push("session.consume");
            return Promise.resolve({
                id: "single-use-session",
                telegramUserId: "42",
                expiresAt: new Date("2026-08-14T12:05:00Z")
            });
        })
    };
    const validator = {
        validateAccount: vi.fn(() => {
            events.push("standx.validate");
            return Promise.resolve(accountResult);
        })
    };
    const credentials = {
        withCandidate: vi.fn((_candidate, callback) => callback(_candidate)),
        store: vi.fn(() => {
            events.push("credential.store");
            return Promise.resolve();
        }),
        delete: vi.fn(() => Promise.resolve(true))
    };
    const records = new Map();
    const store = {
        stage: vi.fn((draft) => {
            events.push("connection.stage");
            records.set(draft.id, {
                ...draft,
                status: "pending",
                snapshotObservedAt: draft.createdAt
            });
            return Promise.resolve();
        }),
        activate: vi.fn((input) => {
            events.push("connection.activate");
            for (const [id, record] of records) {
                if (id !== input.connectionId && record.telegramUserId === input.telegramUserId && record.status === "active") {
                    records.set(id, { ...record, status: "disconnected" });
                }
            }
            const record = records.get(input.connectionId);
            if (record === undefined)
                throw new Error("not staged");
            const active = { ...record, status: "active", snapshotObservedAt: input.snapshotObservedAt };
            records.set(input.connectionId, active);
            return Promise.resolve({
                id: active.id,
                status: active.status,
                accountLabel: active.accountLabel,
                snapshotObservedAt: active.snapshotObservedAt
            });
        }),
        rollback: vi.fn((connectionId) => {
            records.delete(connectionId);
            return Promise.resolve();
        }),
        findByOwner: vi.fn((connectionId, telegramUserId) => {
            const record = records.get(connectionId);
            if (record === undefined || record.telegramUserId !== telegramUserId || record.status === "pending") {
                return Promise.resolve(null);
            }
            return Promise.resolve({
                id: record.id,
                status: record.status,
                accountLabel: record.accountLabel,
                snapshotObservedAt: record.snapshotObservedAt
            });
        }),
        findCurrentByOwner: vi.fn((telegramUserId) => {
            for (const record of records.values()) {
                if (record.telegramUserId === telegramUserId && (record.status === "active" || record.status === "disconnected")) {
                    if (record.status !== "active")
                        continue;
                    return Promise.resolve({
                        id: record.id,
                        status: record.status,
                        accountLabel: record.accountLabel,
                        snapshotObservedAt: record.snapshotObservedAt
                    });
                }
            }
            return Promise.resolve(null);
        }),
        disconnect: vi.fn((connectionId, telegramUserId) => {
            const record = records.get(connectionId);
            if (record === undefined || record.telegramUserId !== telegramUserId || record.status === "disconnected") {
                return Promise.resolve(false);
            }
            records.set(connectionId, { ...record, status: "disconnected" });
            return Promise.resolve(true);
        })
    };
    const snapshots = {
        protect: vi.fn(() => Promise.resolve("encrypted-snapshot"))
    };
    const jobs = { cancelConnectionJobs: vi.fn(() => Promise.resolve()) };
    const notifier = {
        connectionActivated: vi.fn(() => {
            events.push("connection.notify");
            return Promise.resolve();
        })
    };
    const ids = [
        "b6955aef-3412-486d-be5e-d22577944a66",
        "f6ef706a-6df1-48ff-b151-e04f4b4e34e2"
    ];
    const coordinator = new ConnectionCoordinator(sessions, credentials, validator, store, snapshots, jobs, () => ids.shift() ?? "9a9dbccb-b970-4c4d-8cef-2426b64be57c", notifier);
    return { coordinator, credentials, events, jobs, notifier, records, sessions, snapshots, store, validator };
}
describe("ConnectionCoordinator", () => {
    it("consumes the session, validates StandX, encrypts, then activates", async () => {
        const harness = createHarness();
        const result = await harness.coordinator.connect({
            telegramUserId: "42",
            sessionId: "single-use-session",
            apiToken: token
        }, now);
        expect(result).toEqual({
            id: "b6955aef-3412-486d-be5e-d22577944a66",
            status: "active",
            accountLabel: "bsc_0x12...cdef",
            snapshotObservedAt: now
        });
        expect(harness.events).toEqual([
            "session.consume",
            "standx.validate",
            "connection.stage",
            "credential.store",
            "connection.activate",
            "connection.notify"
        ]);
        expect(harness.snapshots.protect).toHaveBeenCalledWith(account.snapshot, {
            connectionId: result.id,
            telegramUserId: "42"
        });
        expect(harness.notifier.connectionActivated).toHaveBeenCalledWith({
            connectionId: result.id,
            telegramUserId: "42",
            accountLabel: "bsc_0x12...cdef"
        });
    });
    it("keeps the activated connection when Telegram notification delivery fails", async () => {
        const harness = createHarness();
        vi.mocked(harness.notifier.connectionActivated).mockRejectedValue(new Error("telegram unavailable"));
        const result = await harness.coordinator.connect({
            telegramUserId: "42",
            sessionId: "single-use-session",
            apiToken: token
        }, now);
        expect(result.status).toBe("active");
        expect(await harness.coordinator.getCurrentStatus("42")).toMatchObject({
            id: result.id,
            status: "active"
        });
        expect(harness.credentials.delete).not.toHaveBeenCalled();
        expect(harness.store.rollback).not.toHaveBeenCalled();
    });
    it("uses alias only when the verified account response supplies it", async () => {
        const harness = createHarness({ ...account, alias: "alice.standx" });
        const result = await harness.coordinator.connect({
            telegramUserId: "42",
            sessionId: "single-use-session",
            apiToken: token
        }, now);
        expect(result.accountLabel).toBe("alice.standx");
    });
    it("never decodes an unverified JWT payload to invent an alias", async () => {
        const harness = createHarness();
        const result = await harness.coordinator.connect({
            telegramUserId: "42",
            sessionId: "single-use-session",
            apiToken: token
        }, now);
        expect(result.accountLabel).toBe("bsc_0x12...cdef");
        expect(result.accountLabel).not.toContain("forged");
    });
    it("does not stage or store credentials when StandX rejects the token", async () => {
        const harness = createHarness();
        harness.validator.validateAccount.mockRejectedValue(new StandXValidationError("unauthorized"));
        await expect(harness.coordinator.connect({
            telegramUserId: "42",
            sessionId: "single-use-session",
            apiToken: token
        }, now)).rejects.toMatchObject({ code: "standx_unauthorized" });
        expect(harness.store.stage).not.toHaveBeenCalled();
        expect(harness.credentials.store).not.toHaveBeenCalled();
    });
    it("maps replayed and expired sessions without validating StandX", async () => {
        for (const sessionCode of ["used", "expired"]) {
            const harness = createHarness();
            harness.sessions.consume.mockRejectedValue(new ConnectionSessionError(sessionCode));
            await expect(harness.coordinator.connect({
                telegramUserId: "42",
                sessionId: "single-use-session",
                apiToken: token
            }, now)).rejects.toMatchObject({
                code: sessionCode === "used" ? "session_used" : "session_expired"
            });
            expect(harness.validator.validateAccount).not.toHaveBeenCalled();
        }
    });
    it("rolls back pending state and ciphertext when activation fails", async () => {
        const harness = createHarness();
        vi.mocked(harness.store.activate).mockRejectedValue(new Error("database failure"));
        await expect(harness.coordinator.connect({
            telegramUserId: "42",
            sessionId: "single-use-session",
            apiToken: token
        }, now)).rejects.toThrow("database failure");
        expect(harness.credentials.delete).toHaveBeenCalledWith("b6955aef-3412-486d-be5e-d22577944a66");
        expect(harness.store.rollback).toHaveBeenCalledWith("b6955aef-3412-486d-be5e-d22577944a66", "42");
        expect(harness.records.size).toBe(0);
    });
    it("replaces the previous active connection for the same Telegram user", async () => {
        const harness = createHarness();
        const first = await harness.coordinator.connect({ telegramUserId: "42", sessionId: "one", apiToken: token }, now);
        const second = await harness.coordinator.connect({ telegramUserId: "42", sessionId: "two", apiToken: token }, now);
        expect((await harness.coordinator.getStatus(first.id, "42"))?.status).toBe("disconnected");
        expect((await harness.coordinator.getStatus(second.id, "42"))?.status).toBe("active");
        expect((await harness.coordinator.getCurrentStatus("42"))?.id).toBe(second.id);
    });
    it("disconnects owner-scoped state and cancels future jobs", async () => {
        const harness = createHarness();
        const connection = await harness.coordinator.connect({ telegramUserId: "42", sessionId: "one", apiToken: token }, now);
        await expect(harness.coordinator.disconnect(connection.id, "99", now)).resolves.toBe(false);
        await expect(harness.coordinator.disconnect(connection.id, "42", now)).resolves.toBe(true);
        expect(harness.jobs.cancelConnectionJobs).toHaveBeenCalledWith(connection.id);
    });
    it("disconnects the current connection from a trusted Telegram command", async () => {
        const harness = createHarness();
        const connection = await harness.coordinator.connect({ telegramUserId: "42", sessionId: "one", apiToken: token }, now);
        await expect(harness.coordinator.disconnectCurrent("42", now)).resolves.toBe(true);
        expect(harness.jobs.cancelConnectionJobs).toHaveBeenCalledWith(connection.id);
        await expect(harness.coordinator.disconnectCurrent("42", now)).resolves.toBe(false);
    });
});
//# sourceMappingURL=connection-coordinator.test.js.map