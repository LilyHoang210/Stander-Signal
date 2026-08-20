import { describe, expect, it } from "vitest";
import { CredentialService, InMemoryCredentialRepository } from "./credential-service.js";
import { EnvelopeCipher } from "./envelope.js";
class FakeKmsProvider {
    generateDataKey() {
        return Promise.resolve({
            plaintextKey: new Uint8Array(32).fill(9),
            encryptedKey: new Uint8Array([9, 8, 7])
        });
    }
    decryptDataKey() {
        return Promise.resolve(new Uint8Array(32).fill(9));
    }
}
function createHarness() {
    const repository = new InMemoryCredentialRepository();
    const service = new CredentialService(new EnvelopeCipher(new FakeKmsProvider()), repository);
    return { repository, service };
}
const connectionId = "b6955aef-3412-486d-be5e-d22577944a66";
const telegramUserId = "42";
describe("CredentialService", () => {
    it("stores ciphertext and exposes plaintext only inside a lease callback", async () => {
        const { repository, service } = createHarness();
        await service.store(connectionId, telegramUserId, "eyJ-secret-token");
        const persisted = await repository.find(connectionId);
        expect(JSON.stringify(persisted)).not.toContain("eyJ-secret-token");
        await expect(service.withLease(connectionId, token => Promise.resolve(token.slice(0, 3)))).resolves.toBe("eyJ");
        expect(Object.keys(service)).not.toContain("getPlaintext");
    });
    it("deletes credential access before another lease can start", async () => {
        const { service } = createHarness();
        await service.store(connectionId, telegramUserId, "eyJ-secret-token");
        await expect(service.delete(connectionId)).resolves.toBe(true);
        await expect(service.withLease(connectionId, token => Promise.resolve(token))).rejects.toThrow(/not found/i);
    });
    it("validates an unstored candidate in one callback", async () => {
        const { repository, service } = createHarness();
        await expect(service.withCandidate("candidate-token", token => Promise.resolve(token.length))).resolves.toBe(15);
        await expect(repository.find(connectionId)).resolves.toBeNull();
    });
});
//# sourceMappingURL=credential-service.test.js.map