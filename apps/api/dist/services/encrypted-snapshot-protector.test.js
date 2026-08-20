import { describe, expect, it } from "vitest";
import { EnvelopeCipher } from "@standx/security/envelope";
import { DeterministicKmsProvider } from "@standx/security/testing/fake-kms-provider";
import { EncryptedSnapshotProtector } from "./encrypted-snapshot-protector.js";
describe("EncryptedSnapshotProtector", () => {
    it("encrypts the complete account snapshot with connection-bound context", async () => {
        const cipher = new EnvelopeCipher(new DeterministicKmsProvider());
        const protector = new EncryptedSnapshotProtector(cipher);
        const context = {
            connectionId: "b6955aef-3412-486d-be5e-d22577944a66",
            telegramUserId: "42"
        };
        const snapshot = { balance: { equity: "102" }, positions: [{ symbol: "BTC-USD" }] };
        const protectedValue = await protector.protect(snapshot, context);
        const envelope = JSON.parse(protectedValue);
        expect(protectedValue).not.toContain("BTC-USD");
        await expect(cipher.decrypt(envelope, context)).resolves.toBe(JSON.stringify(snapshot));
    });
});
//# sourceMappingURL=encrypted-snapshot-protector.test.js.map