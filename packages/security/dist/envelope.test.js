import { describe, expect, it } from "vitest";
import { EnvelopeCipher } from "./envelope.js";
const context = {
    connectionId: "b6955aef-3412-486d-be5e-d22577944a66",
    telegramUserId: "42"
};
class FakeKmsProvider {
    lastPlaintextKey = null;
    generateDataKey() {
        this.lastPlaintextKey = new Uint8Array(32).fill(7);
        return Promise.resolve({
            plaintextKey: this.lastPlaintextKey,
            encryptedKey: new Uint8Array([1, 2, 3, 4])
        });
    }
    decryptDataKey() {
        return Promise.resolve(new Uint8Array(32).fill(7));
    }
}
describe("EnvelopeCipher", () => {
    it("round-trips a credential without embedding plaintext", async () => {
        const cipher = new EnvelopeCipher(new FakeKmsProvider());
        const envelope = await cipher.encrypt("secret-token", context);
        expect(JSON.stringify(envelope)).not.toContain("secret-token");
        await expect(cipher.decrypt(envelope, context)).resolves.toBe("secret-token");
    });
    it("detects ciphertext tampering", async () => {
        const cipher = new EnvelopeCipher(new FakeKmsProvider());
        const envelope = await cipher.encrypt("secret-token", context);
        const first = envelope.ciphertext[0];
        const changed = {
            ...envelope,
            ciphertext: `${first === "A" ? "B" : "A"}${envelope.ciphertext.slice(1)}`
        };
        await expect(cipher.decrypt(changed, context)).rejects.toThrow();
    });
    it("binds ciphertext to the connection and Telegram user", async () => {
        const cipher = new EnvelopeCipher(new FakeKmsProvider());
        const envelope = await cipher.encrypt("secret-token", context);
        await expect(cipher.decrypt(envelope, { ...context, telegramUserId: "43" })).rejects.toThrow();
    });
    it("zeroes the plaintext KMS data-key buffer after encryption", async () => {
        const kms = new FakeKmsProvider();
        const cipher = new EnvelopeCipher(kms);
        await cipher.encrypt("secret-token", context);
        if (kms.lastPlaintextKey === null) {
            throw new Error("Expected KMS key material to be generated");
        }
        expect([...kms.lastPlaintextKey]).toEqual(new Array(32).fill(0));
    });
});
//# sourceMappingURL=envelope.test.js.map