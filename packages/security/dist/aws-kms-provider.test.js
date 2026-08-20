import { DecryptCommand, GenerateDataKeyCommand } from "@aws-sdk/client-kms";
import { describe, expect, it } from "vitest";
import { AwsKmsProvider } from "./aws-kms-provider.js";
describe("AwsKmsProvider", () => {
    it("requests an AES-256 data key with the exact encryption context", async () => {
        const commands = [];
        const client = {
            send(command) {
                commands.push(command);
                return Promise.resolve({
                    Plaintext: new Uint8Array(32).fill(3),
                    CiphertextBlob: new Uint8Array([1, 2, 3])
                });
            }
        };
        const provider = new AwsKmsProvider("alias/standx-monitor", client);
        const context = { connectionId: "connection-1", telegramUserId: "42" };
        await expect(provider.generateDataKey(context)).resolves.toMatchObject({
            plaintextKey: new Uint8Array(32).fill(3),
            encryptedKey: new Uint8Array([1, 2, 3])
        });
        expect(commands[0]).toBeInstanceOf(GenerateDataKeyCommand);
        expect(commands[0].input).toEqual({
            KeyId: "alias/standx-monitor",
            KeySpec: "AES_256",
            EncryptionContext: context
        });
    });
    it("decrypts only with the supplied encryption context", async () => {
        const commands = [];
        const client = {
            send(command) {
                commands.push(command);
                return Promise.resolve({ Plaintext: new Uint8Array(32).fill(4) });
            }
        };
        const provider = new AwsKmsProvider("alias/standx-monitor", client);
        const context = { connectionId: "connection-1", telegramUserId: "42" };
        await expect(provider.decryptDataKey(new Uint8Array([1, 2, 3]), context)).resolves.toEqual(new Uint8Array(32).fill(4));
        expect(commands[0]).toBeInstanceOf(DecryptCommand);
        expect(commands[0].input).toEqual({
            CiphertextBlob: new Uint8Array([1, 2, 3]),
            EncryptionContext: context,
            KeyId: "alias/standx-monitor"
        });
    });
    it("fails closed when KMS omits key material", async () => {
        const client = {
            send() {
                return Promise.resolve({});
            }
        };
        const provider = new AwsKmsProvider("alias/standx-monitor", client);
        await expect(provider.generateDataKey({ connectionId: "c1", telegramUserId: "42" })).rejects.toThrow(/key material/i);
        await expect(provider.decryptDataKey(new Uint8Array([1]), {
            connectionId: "c1",
            telegramUserId: "42"
        })).rejects.toThrow(/key material/i);
    });
});
//# sourceMappingURL=aws-kms-provider.test.js.map