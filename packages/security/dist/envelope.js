import { createCipheriv, createDecipheriv, randomBytes as nodeRandomBytes } from "node:crypto";
export class EnvelopeCipher {
    kms;
    generateRandomBytes;
    constructor(kms, generateRandomBytes = size => nodeRandomBytes(size)) {
        this.kms = kms;
        this.generateRandomBytes = generateRandomBytes;
    }
    async encrypt(plaintext, context) {
        const kmsContext = toKmsContext(context);
        const { plaintextKey, encryptedKey } = await this.kms.generateDataKey(kmsContext);
        const plaintextBuffer = Buffer.from(plaintext, "utf8");
        try {
            assertAes256Key(plaintextKey);
            const iv = this.generateRandomBytes(12);
            if (iv.byteLength !== 12) {
                throw new Error("Credential IV must be 12 bytes");
            }
            const cipher = createCipheriv("aes-256-gcm", plaintextKey, iv);
            cipher.setAAD(contextAad(context));
            const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
            return {
                version: 1,
                encryptedDataKey: Buffer.from(encryptedKey).toString("base64"),
                iv: Buffer.from(iv).toString("base64"),
                authTag: cipher.getAuthTag().toString("base64"),
                ciphertext: ciphertext.toString("base64")
            };
        }
        finally {
            plaintextBuffer.fill(0);
            plaintextKey.fill(0);
        }
    }
    async decrypt(envelope, context) {
        const encryptedKey = Buffer.from(envelope.encryptedDataKey, "base64");
        const plaintextKey = await this.kms.decryptDataKey(encryptedKey, toKmsContext(context));
        let plaintext = null;
        try {
            assertAes256Key(plaintextKey);
            const decipher = createDecipheriv("aes-256-gcm", plaintextKey, Buffer.from(envelope.iv, "base64"));
            decipher.setAAD(contextAad(context));
            decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
            plaintext = Buffer.concat([
                decipher.update(Buffer.from(envelope.ciphertext, "base64")),
                decipher.final()
            ]);
            return plaintext.toString("utf8");
        }
        finally {
            plaintext?.fill(0);
            plaintextKey.fill(0);
        }
    }
}
function contextAad(context) {
    return Buffer.from(JSON.stringify({
        connectionId: context.connectionId,
        telegramUserId: context.telegramUserId
    }), "utf8");
}
function toKmsContext(context) {
    return {
        connectionId: context.connectionId,
        telegramUserId: context.telegramUserId
    };
}
function assertAes256Key(key) {
    if (key.byteLength !== 32) {
        throw new Error("KMS data key must contain 32 bytes");
    }
}
//# sourceMappingURL=envelope.js.map