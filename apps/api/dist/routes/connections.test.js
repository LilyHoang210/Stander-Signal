/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { ConnectionApplicationError } from "../context.js";
const now = new Date("2026-08-14T12:00:00Z");
const identity = {
    telegramUserId: "42",
    username: "alice",
    authDate: new Date("2026-08-14T11:59:00Z")
};
function createHarness(overrides = {}) {
    const connections = {
        createSession: vi.fn(() => Promise.resolve({
            id: "session-token",
            telegramUserId: "42",
            expiresAt: new Date("2026-08-14T12:05:00Z")
        })),
        connect: vi.fn(() => Promise.resolve({
            id: "b6955aef-3412-486d-be5e-d22577944a66",
            status: "active",
            accountLabel: "bsc_0x12...cdef",
            snapshotObservedAt: now
        })),
        getStatus: vi.fn(() => Promise.resolve(null)),
        disconnect: vi.fn(() => Promise.resolve(false)),
        getCurrentStatus: vi.fn(() => Promise.resolve(null)),
        disconnectCurrent: vi.fn(() => Promise.resolve(false)),
        ...overrides
    };
    const authenticate = vi.fn(() => identity);
    const context = {
        clock: { now: () => now },
        authenticate,
        connections
    };
    return { authenticate, connections, context };
}
describe("connection routes", () => {
    it("creates a single-use connection session for verified Telegram initData", async () => {
        const harness = createHarness();
        const app = await buildApp({ context: harness.context });
        const response = await app.inject({
            method: "POST",
            url: "/v1/connections/session",
            headers: { authorization: "tma signed-init-data" }
        });
        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual({
            sessionId: "session-token",
            expiresAt: "2026-08-14T12:05:00.000Z"
        });
        expect(harness.authenticate).toHaveBeenCalledWith("signed-init-data", now);
        expect(harness.connections.createSession).toHaveBeenCalledWith(identity, now);
        await app.close();
    });
    it("returns an active public view without echoing the StandX token", async () => {
        const harness = createHarness();
        const app = await buildApp({ context: harness.context });
        const apiToken = "eyJ-sensitive-standx-token";
        const response = await app.inject({
            method: "POST",
            url: "/v1/connections",
            headers: { authorization: "tma signed-init-data" },
            payload: { sessionId: "session-token", apiToken }
        });
        expect(response.statusCode).toBe(201);
        expect(response.json()).toMatchObject({
            status: "active",
            accountLabel: "bsc_0x12...cdef"
        });
        expect(JSON.stringify(response.json())).not.toContain(apiToken);
        expect(harness.connections.connect).toHaveBeenCalledWith({
            telegramUserId: "42",
            sessionId: "session-token",
            apiToken
        }, now);
        await app.close();
    });
    it("rejects invalid Telegram identity before calling the application", async () => {
        const harness = createHarness();
        harness.authenticate.mockImplementation(() => {
            throw new Error("invalid signature");
        });
        const app = await buildApp({ context: harness.context });
        const response = await app.inject({
            method: "POST",
            url: "/v1/connections/session",
            headers: { authorization: "tma forged-init-data" }
        });
        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            statusCode: 401,
            error: "Unauthorized",
            message: "Telegram authorization is invalid"
        });
        expect(harness.connections.createSession).not.toHaveBeenCalled();
        await app.close();
    });
    it.each([
        ["session_used", 409, "Connection session is no longer valid"],
        ["session_expired", 410, "Connection session has expired"],
        ["standx_unauthorized", 422, "StandX API token is invalid"]
    ])("maps %s to a sanitized response", async (code, statusCode, message) => {
        const apiToken = "eyJ-secret-token-never-returned";
        const harness = createHarness({
            connect: vi.fn(() => Promise.reject(new ConnectionApplicationError(code)))
        });
        const app = await buildApp({ context: harness.context });
        const response = await app.inject({
            method: "POST",
            url: "/v1/connections",
            headers: { authorization: "tma signed-init-data" },
            payload: { sessionId: "session-token", apiToken }
        });
        expect(response.statusCode).toBe(statusCode);
        expect(response.json().message).toBe(message);
        expect(response.body).not.toContain(apiToken);
        await app.close();
    });
    it("does not reveal a connection owned by another Telegram user", async () => {
        const harness = createHarness({ getStatus: vi.fn(() => Promise.resolve(null)) });
        const app = await buildApp({ context: harness.context });
        const response = await app.inject({
            method: "GET",
            url: "/v1/connections/b6955aef-3412-486d-be5e-d22577944a66/status",
            headers: { authorization: "tma signed-init-data" }
        });
        expect(response.statusCode).toBe(404);
        expect(harness.connections.getStatus).toHaveBeenCalledWith("b6955aef-3412-486d-be5e-d22577944a66", "42");
        await app.close();
    });
    it("disconnects only the authenticated user's connection", async () => {
        const disconnect = vi.fn(() => Promise.resolve(true));
        const harness = createHarness({ disconnect });
        const app = await buildApp({ context: harness.context });
        const response = await app.inject({
            method: "DELETE",
            url: "/v1/connections/b6955aef-3412-486d-be5e-d22577944a66",
            headers: { authorization: "tma signed-init-data" }
        });
        expect(response.statusCode).toBe(204);
        expect(response.body).toBe("");
        expect(disconnect).toHaveBeenCalledWith("b6955aef-3412-486d-be5e-d22577944a66", "42", now);
        await app.close();
    });
});
//# sourceMappingURL=connections.test.js.map