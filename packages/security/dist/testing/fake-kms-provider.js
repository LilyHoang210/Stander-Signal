import { createHash, timingSafeEqual } from "node:crypto";
export class DeterministicKmsProvider {
    #key;
    constructor(key = new Uint8Array(32).fill(1)) {
        if (key.byteLength !== 32) {
            throw new Error("Deterministic KMS key must contain 32 bytes");
        }
        this.#key = new Uint8Array(key);
    }
    generateDataKey(context) {
        return Promise.resolve({
            plaintextKey: new Uint8Array(this.#key),
            encryptedKey: contextDigest(context)
        });
    }
    decryptDataKey(encryptedKey, context) {
        const expected = contextDigest(context);
        if (encryptedKey.byteLength !== expected.byteLength ||
            !timingSafeEqual(encryptedKey, expected)) {
            return Promise.reject(new Error("Encrypted data key does not match KMS context"));
        }
        return Promise.resolve(new Uint8Array(this.#key));
    }
}
function contextDigest(context) {
    const canonical = Object.entries(context).sort(([left], [right]) => left.localeCompare(right));
    return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest();
}
//# sourceMappingURL=fake-kms-provider.js.map