import { EnvelopeCipher } from "@standx/security/envelope";
export class EncryptedSnapshotProtector {
    cipher;
    constructor(cipher) {
        this.cipher = cipher;
    }
    async protect(snapshot, context) {
        const envelope = await this.cipher.encrypt(JSON.stringify(snapshot), context);
        return JSON.stringify(envelope);
    }
}
//# sourceMappingURL=encrypted-snapshot-protector.js.map