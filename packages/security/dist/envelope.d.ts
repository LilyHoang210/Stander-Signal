export interface KmsProvider {
    generateDataKey(context: Record<string, string>): Promise<{
        plaintextKey: Uint8Array;
        encryptedKey: Uint8Array;
    }>;
    decryptDataKey(encryptedKey: Uint8Array, context: Record<string, string>): Promise<Uint8Array>;
}
export interface CredentialEnvelope {
    readonly version: 1;
    readonly encryptedDataKey: string;
    readonly iv: string;
    readonly authTag: string;
    readonly ciphertext: string;
}
export interface CredentialEncryptionContext {
    readonly connectionId: string;
    readonly telegramUserId: string;
}
type RandomBytesGenerator = (size: number) => Uint8Array;
export declare class EnvelopeCipher {
    private readonly kms;
    private readonly generateRandomBytes;
    constructor(kms: KmsProvider, generateRandomBytes?: RandomBytesGenerator);
    encrypt(plaintext: string, context: CredentialEncryptionContext): Promise<CredentialEnvelope>;
    decrypt(envelope: CredentialEnvelope, context: CredentialEncryptionContext): Promise<string>;
}
export {};
