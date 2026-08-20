import { describe, expect, it } from "vitest";
import { ConnectionSessionService, InMemoryConnectionSessionRepository } from "./connection.js";
const now = new Date("2026-08-14T12:00:00Z");
function createService() {
    return new ConnectionSessionService(new InMemoryConnectionSessionRepository(), () => Buffer.alloc(32, 7));
}
describe("ConnectionSessionService", () => {
    it("creates a 32-byte identifier that expires after five minutes", async () => {
        const session = await createService().create("telegram-user-1", now);
        expect(Buffer.from(session.id, "base64url")).toHaveLength(32);
        expect(session.expiresAt).toEqual(new Date("2026-08-14T12:05:00Z"));
    });
    it("consumes a session only once", async () => {
        const service = createService();
        const session = await service.create("telegram-user-1", now);
        await expect(service.consume(session.id, "telegram-user-1", now)).resolves.toMatchObject({
            telegramUserId: "telegram-user-1"
        });
        await expect(service.consume(session.id, "telegram-user-1", now)).rejects.toThrow(/used/i);
    });
    it("rejects an expired or wrong-user session", async () => {
        const service = createService();
        const session = await service.create("telegram-user-1", now);
        await expect(service.consume(session.id, "telegram-user-2", now)).rejects.toThrow(/user/i);
        await expect(service.consume(session.id, "telegram-user-1", new Date("2026-08-14T12:05:00Z"))).rejects.toThrow(/expired/i);
    });
    it("atomically allows one concurrent consumer", async () => {
        const service = createService();
        const session = await service.create("telegram-user-1", now);
        const results = await Promise.allSettled([
            service.consume(session.id, "telegram-user-1", now),
            service.consume(session.id, "telegram-user-1", now)
        ]);
        expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
        expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    });
});
//# sourceMappingURL=connection.test.js.map