import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createTelegramBot } from "@standx/telegram/bot";
import { createCredentialKmsProvider, createTelegramCommands, registerProductionTelegramCommandMenu } from "./production-context.js";
const baseConfig = {
    nodeEnv: "production",
    databaseUrl: "postgres://standx:standx@localhost:5432/standx",
    redisUrl: "redis://localhost:6379",
    telegramBotToken: "123456:telegram-test-token",
    telegramWebhookSecret: "a-secure-webhook-secret-with-32-characters",
    miniAppOrigin: "https://standx.fundline.xyz",
    credentialEncryptionProvider: "local",
    credentialMasterKeyFile: "/run/secrets/credential_master_key",
    awsRegion: undefined,
    kmsKeyId: undefined,
    standxBaseUrl: "https://perps.standx.com",
    shadowMode: true,
    financialAlertsEnabled: false,
    alphaUserAllowlist: [],
    accountStreamMaxConnections: 8,
    accountStreamReconcileMs: 30_000,
    accountStreamDebounceMs: 5_000,
    accountFallbackScanMs: 60_000
};
describe("createCredentialKmsProvider", () => {
    it("creates a local provider from a base64 master-key file", async () => {
        const masterKey = randomBytes(32).toString("base64");
        const provider = createCredentialKmsProvider(baseConfig, () => masterKey);
        const context = { connectionId: "connection-1", telegramUserId: "42" };
        const generated = await provider.generateDataKey(context);
        await expect(provider.decryptDataKey(generated.encryptedKey, context)).resolves.toEqual(generated.plaintextKey);
    });
    it("fails closed when local encryption has no master-key file", () => {
        expect(() => createCredentialKmsProvider({
            ...baseConfig,
            credentialMasterKeyFile: undefined
        })).toThrow(/master key file/i);
    });
});
describe("createTelegramCommands", () => {
    it("wires dashboard actions to live command handlers instead of Telegram fallback copy", async () => {
        const coordinator = {
            getCurrentStatus: vi.fn(() => Promise.resolve({
                id: "connection-1",
                status: "active",
                accountLabel: "standx-main",
                snapshotObservedAt: new Date("2026-08-14T08:00:00.000Z")
            })),
            disconnectCurrent: vi.fn(() => Promise.resolve(true))
        };
        const liveCommands = {
            perps: vi.fn(() => Promise.resolve("PERPS_LIVE")),
            positions: vi.fn(() => Promise.resolve("POSITIONS_LIVE")),
            risk: vi.fn(() => Promise.resolve("RISK_LIVE")),
            alerts: vi.fn(() => Promise.resolve("ALERTS_LIVE")),
            orders: vi.fn(() => Promise.resolve("ORDERS_LIVE")),
            history: vi.fn(() => Promise.resolve("HISTORY_LIVE")),
            funding: vi.fn(() => Promise.resolve("FUNDING_LIVE")),
            markets: vi.fn(() => Promise.resolve("MARKETS_LIVE")),
            coverage: vi.fn(() => Promise.resolve("COVERAGE_LIVE")),
            refresh: vi.fn(() => Promise.resolve("REFRESH_LIVE"))
        };
        const commands = createTelegramCommands(coordinator, liveCommands, () => new Date("2026-08-14T08:00:00.000Z"));
        await expect(commands.perps?.("42")).resolves.toBe("PERPS_LIVE");
        await expect(commands.positions?.("42")).resolves.toBe("POSITIONS_LIVE");
        await expect(commands.risk?.("42")).resolves.toBe("RISK_LIVE");
        await expect(commands.alerts?.("42")).resolves.toBe("ALERTS_LIVE");
        await expect(commands.orders?.("42")).resolves.toBe("ORDERS_LIVE");
        await expect(commands.history?.("42")).resolves.toBe("HISTORY_LIVE");
        await expect(commands.funding?.("42")).resolves.toBe("FUNDING_LIVE");
        await expect(commands.markets?.("42")).resolves.toBe("MARKETS_LIVE");
        await expect(commands.coverage?.("42")).resolves.toBe("COVERAGE_LIVE");
        await expect(commands.refresh?.("42")).resolves.toBe("REFRESH_LIVE");
        await expect(commands.status("42")).resolves.toEqual({ connected: true, accountLabel: "standx-main" });
        await expect(commands.disconnect("42")).resolves.toBe(true);
    });
});
describe("registerProductionTelegramCommandMenu", () => {
    it("registers the Telegram command menu without throwing registration errors", () => {
        const bot = {};
        const warning = vi.fn();
        const registerCommandMenu = vi.fn((_bot, onError) => {
            onError(new Error("telegram unavailable"));
        });
        expect(() => {
            registerProductionTelegramCommandMenu(bot, registerCommandMenu, warning);
        }).not.toThrow();
        expect(registerCommandMenu).toHaveBeenCalledWith(bot, expect.any(Function));
        expect(warning).toHaveBeenCalledWith(expect.any(Error));
    });
});
//# sourceMappingURL=production-context.test.js.map