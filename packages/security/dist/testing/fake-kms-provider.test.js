import { describe, expect, it } from "vitest";
import { DeterministicKmsProvider } from "./fake-kms-provider.js";
describe("DeterministicKmsProvider", () => {
    it("returns reproducible key material bound to encryption context", async () => {
        const provider = new DeterministicKmsProvider(new Uint8Array(32).fill(6));
        const context = { connectionId: "c1", telegramUserId: "42" };
        const generated = await provider.generateDataKey(context);
        expect(generated.plaintextKey).toEqual(new Uint8Array(32).fill(6));
        await expect(provider.decryptDataKey(generated.encryptedKey, context)).resolves.toEqual(new Uint8Array(32).fill(6));
        await expect(provider.decryptDataKey(generated.encryptedKey, { ...context, telegramUserId: "43" })).rejects.toThrow(/context/i);
    });
});
//# sourceMappingURL=fake-kms-provider.test.js.map