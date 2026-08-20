import { EnvelopeCipher } from "@standx/security/envelope";
import type { SnapshotProtector } from "./connection-coordinator.js";
export declare class EncryptedSnapshotProtector implements SnapshotProtector {
    private readonly cipher;
    constructor(cipher: EnvelopeCipher);
    protect(snapshot: object, context: {
        readonly connectionId: string;
        readonly telegramUserId: string;
    }): Promise<string>;
}
