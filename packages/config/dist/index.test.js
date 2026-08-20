import { describe, expect, it } from "vitest";
import { loadConfig } from "./index.js";
const validEnvironment = {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://standx:standx@localhost:5432/standx",
    REDIS_URL: "redis://localhost:6379",
    TELEGRAM_BOT_TOKEN: "123456:telegram-test-token",
    TELEGRAM_WEBHOOK_SECRET: "a-secure-webhook-secret-with-32-characters",
    MINI_APP_ORIGIN: "https://monitor.example.com",
    CREDENTIAL_ENCRYPTION_PROVIDER: "local",
    CREDENTIAL_MASTER_KEY_FILE: "/run/secrets/credential_master_key",
    STANDX_BASE_URL: "https://perps.standx.com"
};
describe("loadConfig", () => {
    it("rejects a non-HTTPS production Mini App origin", () => {
        expect(() => loadConfig({ ...validEnvironment, MINI_APP_ORIGIN: "http://monitor.example.com" })).toThrow(/HTTPS/);
    });
    it("returns normalized URLs for a valid environment", () => {
        const config = loadConfig(validEnvironment);
        expect(config.miniAppOrigin).toBe("https://monitor.example.com");
        expect(config.standxBaseUrl).toBe("https://perps.standx.com");
        expect(config.credentialEncryptionProvider).toBe("local");
        expect(config.credentialMasterKeyFile).toBe("/run/secrets/credential_master_key");
        expect(config.shadowMode).toBe(true);
        expect(config.financialAlertsEnabled).toBe(false);
        expect(config.accountStreamMaxConnections).toBe(8);
        expect(config.accountStreamReconcileMs).toBe(30_000);
        expect(config.accountStreamDebounceMs).toBe(5_000);
        expect(config.accountFallbackScanMs).toBe(60_000);
    });
    it("reads realtime account stream worker knobs from environment", () => {
        const config = loadConfig({
            ...validEnvironment,
            ACCOUNT_STREAM_MAX_CONNECTIONS: "20",
            ACCOUNT_STREAM_RECONCILE_MS: "15000",
            ACCOUNT_STREAM_DEBOUNCE_MS: "1000",
            ACCOUNT_FALLBACK_SCAN_MS: "15000"
        });
        expect(config.accountStreamMaxConnections).toBe(20);
        expect(config.accountStreamReconcileMs).toBe(15_000);
        expect(config.accountStreamDebounceMs).toBe(1_000);
        expect(config.accountFallbackScanMs).toBe(15_000);
    });
    it("rejects a non-HTTPS StandX base URL", () => {
        expect(() => loadConfig({ ...validEnvironment, STANDX_BASE_URL: "http://perps.standx.com" })).toThrow(/HTTPS/);
    });
    it("accepts TELEGRAM_BOT_API as a backwards-compatible token alias", () => {
        const environment = { ...validEnvironment };
        delete environment.TELEGRAM_BOT_TOKEN;
        const config = loadConfig({
            ...environment,
            TELEGRAM_BOT_API: "123456:telegram-alias-token"
        });
        expect(config.telegramBotToken).toBe("123456:telegram-alias-token");
    });
    it("requires AWS settings only when AWS encryption is selected", () => {
        const config = loadConfig({
            ...validEnvironment,
            CREDENTIAL_ENCRYPTION_PROVIDER: "aws",
            AWS_REGION: "ap-southeast-1",
            KMS_KEY_ID: "alias/standx-monitor"
        });
        expect(config.credentialEncryptionProvider).toBe("aws");
        expect(config.awsRegion).toBe("ap-southeast-1");
        expect(config.kmsKeyId).toBe("alias/standx-monitor");
    });
    it("rejects financial alerts while shadow mode is enabled", () => {
        expect(() => loadConfig({
            ...validEnvironment,
            SHADOW_MODE: "true",
            FINANCIAL_ALERTS_ENABLED: "true"
        })).toThrow(/FINANCIAL_ALERTS_ENABLED/);
    });
    it("allows explicit alpha mode only when shadow mode is disabled", () => {
        const config = loadConfig({
            ...validEnvironment,
            SHADOW_MODE: "false",
            FINANCIAL_ALERTS_ENABLED: "true",
            ALPHA_USER_ALLOWLIST: "42, 43"
        });
        expect(config.shadowMode).toBe(false);
        expect(config.financialAlertsEnabled).toBe(true);
        expect(config.alphaUserAllowlist).toEqual(["42", "43"]);
    });
});
//# sourceMappingURL=index.test.js.map