import type { KmsProvider } from "./envelope.js";
type RandomBytesGenerator = (size: number) => Uint8Array;
export declare class LocalMasterKeyProvider implements KmsProvider {
    #private;
    private readonly randomBytes;
    constructor(masterKey: Uint8Array, randomBytes?: RandomBytesGenerator);
    static fromBase64(encoded: string): LocalMasterKeyProvider;
    generateDataKey(context: Record<string, string>): Promise<{
        plaintextKey: Uint8Array;
        encryptedKey: Uint8Array;
    }>;
    decryptDataKey(encryptedKey: Uint8Array, context: Record<string, string>): Promise<Uint8Array>;
    private wrapDataKey;
}
export {};
