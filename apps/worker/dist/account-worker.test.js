import { describe, expect, it } from "vitest";
import { buildScanAccountJob, scanAccountJobName, scanAccountQueueName } from "./account-worker.js";
describe("account worker job contract", () => {
    it("uses a stable BullMQ queue and job name", () => {
        expect(scanAccountQueueName).toBe("standx.scan-account");
        expect(scanAccountJobName).toBe("scan-account");
    });
    it("builds one deterministic scan-account job per connection", () => {
        expect(buildScanAccountJob({
            connectionId: "11111111-1111-4111-8111-111111111111",
            delayMs: 60_000
        })).toEqual({
            name: "scan-account",
            data: {
                connectionId: "11111111-1111-4111-8111-111111111111"
            },
            options: {
                jobId: "scan-account:11111111-1111-4111-8111-111111111111",
                delay: 60_000,
                attempts: 3,
                removeOnComplete: 1000,
                removeOnFail: 5000
            }
        });
    });
});
//# sourceMappingURL=account-worker.test.js.map