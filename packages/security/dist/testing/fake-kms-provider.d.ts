import type { KmsProvider } from "../envelope.js";
export declare class DeterministicKmsProvider implements KmsProvider {
    #private;
    constructor(key?: Uint8Array);
    generateDataKey(context: Record<string, string>): Promise<{
        plaintextKey: Uint8Array;
        encryptedKey: Uint8Array;
    }>;
    decryptDataKey(encryptedKey: Uint8Array, context: Record<string, string>): Promise<Uint8Array>;
}
