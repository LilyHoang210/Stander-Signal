import { describe, expect, it } from "vitest";
import { InMemoryConnectionRepository } from "./connection-repository.js";
describe("InMemoryConnectionRepository", () => {
    it("never returns another Telegram user's active connection", async () => {
        const repository = new InMemoryConnectionRepository();
        await repository.save({
            id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            telegramUserId: "10",
            accountId: "bsc_0x1",
            status: "active"
        });
        expect(await repository.findActiveByTelegramUserId("11")).toBeNull();
    });
    it("does not let one Telegram user disconnect another user's connection", async () => {
        const repository = new InMemoryConnectionRepository();
        const connection = {
            id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            telegramUserId: "10",
            accountId: "bsc_0x1",
            status: "active"
        };
        await repository.save(connection);
        expect(await repository.disconnect(connection.id, "11")).toBe(false);
        expect(await repository.findActiveByTelegramUserId("10")).toEqual(connection);
    });
    it("finds only active connections by connection id", async () => {
        const repository = new InMemoryConnectionRepository();
        const activeConnection = {
            id: "8b42bd86-e7db-430f-a16b-a9dc67bba2c5",
            telegramUserId: "10",
            accountId: "bsc_0x1",
            status: "active"
        };
        await repository.save(activeConnection);
        await repository.save({
            id: "3178b0c0-c2bc-418d-9143-dc5f0331c9b1",
            telegramUserId: "11",
            accountId: "bsc_0x2",
            status: "disconnected"
        });
        expect(await repository.findActiveById(activeConnection.id)).toEqual(activeConnection);
        expect(await repository.findActiveById("3178b0c0-c2bc-418d-9143-dc5f0331c9b1")).toBeNull();
    });
});
//# sourceMappingURL=connection-repository.test.js.map