import { type KMSClient } from "@aws-sdk/client-kms";
import type { KmsProvider } from "./envelope.js";
export declare class AwsKmsProvider implements KmsProvider {
    private readonly keyId;
    private readonly client;
    constructor(keyId: string, client: KMSClient);
    generateDataKey(context: Record<string, string>): Promise<{
        plaintextKey: Uint8Array;
        encryptedKey: Uint8Array;
    }>;
    decryptDataKey(encryptedKey: Uint8Array, context: Record<string, string>): Promise<Uint8Array>;
}
