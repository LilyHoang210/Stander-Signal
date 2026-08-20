import { DecryptCommand, GenerateDataKeyCommand } from "@aws-sdk/client-kms";
export class AwsKmsProvider {
    keyId;
    client;
    constructor(keyId, client) {
        this.keyId = keyId;
        this.client = client;
    }
    async generateDataKey(context) {
        const response = await this.client.send(new GenerateDataKeyCommand({
            KeyId: this.keyId,
            KeySpec: "AES_256",
            EncryptionContext: context
        }));
        if (response.Plaintext === undefined || response.CiphertextBlob === undefined) {
            throw new Error("KMS GenerateDataKey response is missing key material");
        }
        return {
            plaintextKey: new Uint8Array(response.Plaintext),
            encryptedKey: new Uint8Array(response.CiphertextBlob)
        };
    }
    async decryptDataKey(encryptedKey, context) {
        const response = await this.client.send(new DecryptCommand({
            CiphertextBlob: encryptedKey,
            EncryptionContext: context,
            KeyId: this.keyId
        }));
        if (response.Plaintext === undefined) {
            throw new Error("KMS Decrypt response is missing key material");
        }
        return new Uint8Array(response.Plaintext);
    }
}
//# sourceMappingURL=aws-kms-provider.js.map