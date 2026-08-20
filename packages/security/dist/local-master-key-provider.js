import { createCipheriv, createDecipheriv, randomBytes as nodeRandomBytes } from "node:crypto";
export class LocalMasterKeyProvider {
    randomBytes;
    #masterKey;
    constructor(masterKey, randomBytes = size => nodeRandomBytes(size)) {
        this.randomBytes = randomBytes;
        if (masterKey.byteLength !== 32) {
            throw new Error("Local credential master key must contain 32 bytes");
        }
        this.#masterKey = new Uint8Array(masterKey);
    }
    static fromBase64(encoded) {
        return new LocalMasterKeyProvider(decodeBase64MasterKey(encoded));
    }
    generateDataKey(context) {
        const plaintextKey = this.randomBytes(32);
        if (plaintextKey.byteLength !== 32) {
            throw new Error("Generated credential data key must contain 32 bytes");
        }
        return Promise.resolve({
            plaintextKey,
            encryptedKey: this.wrapDataKey(plaintextKey, context)
        });
    }
    decryptDataKey(encryptedKey, context) {
        try {
            const wrapped = parseWrappedDataKey(encryptedKey);
            const decipher = createDecipheriv("aes-256-gcm", this.#masterKey, Buffer.from(wrapped.iv, "base64"));
            decipher.setAAD(contextAad(context));
            decipher.setAuthTag(Buffer.from(wrapped.authTag, "base64"));
            return Promise.resolve(Buffer.concat([
                decipher.update(Buffer.from(wrapped.ciphertext, "base64")),
                decipher.final()
            ]));
        }
        catch (error) {
            return Promise.reject(new Error("Failed to decrypt local credential data key", { cause: error }));
        }
    }
    wrapDataKey(plaintextKey, context) {
        const iv = this.randomBytes(12);
        if (iv.byteLength !== 12) {
            throw new Error("Local credential data-key IV must contain 12 bytes");
        }
        const cipher = createCipheriv("aes-256-gcm", this.#masterKey, iv);
        cipher.setAAD(contextAad(context));
        const ciphertext = Buffer.concat([
            cipher.update(Buffer.from(plaintextKey)),
            cipher.final()
        ]);
        const wrapped = {
            version: 1,
            iv: Buffer.from(iv).toString("base64"),
            authTag: cipher.getAuthTag().toString("base64"),
            ciphertext: ciphertext.toString("base64")
        };
        return Buffer.from(JSON.stringify(wrapped), "utf8");
    }
}
function decodeBase64MasterKey(encoded) {
    const trimmed = encoded.trim();
    const key = Buffer.from(trimmed, "base64");
    if (key.byteLength !== 32) {
        throw new Error("Local credential master key must be base64-encoded 32 bytes");
    }
    return new Uint8Array(key);
}
function parseWrappedDataKey(encryptedKey) {
    const candidate = JSON.parse(Buffer.from(encryptedKey).toString("utf8"));
    if (candidate.version !== 1 ||
        typeof candidate.iv !== "string" ||
        typeof candidate.authTag !== "string" ||
        typeof candidate.ciphertext !== "string") {
        throw new Error("Local credential data key envelope is invalid");
    }
    return {
        version: candidate.version,
        iv: candidate.iv,
        authTag: candidate.authTag,
        ciphertext: candidate.ciphertext
    };
}
function contextAad(context) {
    return Buffer.from(JSON.stringify(Object.entries(context).sort(([left], [right]) => left.localeCompare(right))), "utf8");
}
//# sourceMappingURL=local-master-key-provider.js.map