import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LocalMasterKeyProvider } from "./local-master-key-provider.js";
const context = {
    connectionId: "connection-1",
    telegramUserId: "42"
};
describe("LocalMasterKeyProvider", () => {
    it("wraps generated data keys with the local master key and encryption context", async () => {
        const provider = new LocalMasterKeyProvider(randomBytes(32));
        const generated = await provider.generateDataKey(context);
        expect(generated.plaintextKey).toHaveLength(32);
        expect(generated.encryptedKey.length).toBeGreaterThan(32);
        await expect(provider.decryptDataKey(generated.encryptedKey, context)).resolves.toEqual(generated.plaintextKey);
    });
    it("rejects encrypted data keys when the context changes", async () => {
        const provider = new LocalMasterKeyProvider(randomBytes(32));
        const generated = await provider.generateDataKey(context);
        await expect(provider.decryptDataKey(generated.encryptedKey, {
            ...context,
            telegramUserId: "43"
        })).rejects.toThrow(/decrypt/i);
    });
    it("requires a 32-byte master key", () => {
        expect(() => new LocalMasterKeyProvider(randomBytes(31))).toThrow(/32 bytes/);
    });
});
//# sourceMappingURL=local-master-key-provider.test.js.map