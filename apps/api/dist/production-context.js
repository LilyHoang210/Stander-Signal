import { readFileSync } from "node:fs";
import { KMSClient } from "@aws-sdk/client-kms";
import { createDatabase } from "@standx/db/client";
import { PostgresConnectionLifecycleStore } from "@standx/db/repositories/connection-lifecycle-store";
import { PostgresConnectionSessionRepository } from "@standx/db/repositories/connection-session-repository";
import { PostgresCredentialRepository } from "@standx/db/repositories/credential-repository";
import { ConnectionSessionService } from "@standx/domain/connection";
import { AwsKmsProvider } from "@standx/security/aws-kms-provider";
import { CredentialService } from "@standx/security/credential-service";
import { EnvelopeCipher } from "@standx/security/envelope";
import { LocalMasterKeyProvider } from "@standx/security/local-master-key-provider";
import { verifyTelegramInitData } from "@standx/security/telegram-init-data";
import { StandXAccountReader, StandXAccountValidationError } from "@standx/standx/account-validator";
import { FetchReadOnlyTransport, StandXReadClient } from "@standx/standx/read-client";
import { createTelegramBot, registerTelegramCommandMenu } from "@standx/telegram/bot";
import { ConnectionCoordinator, StandXValidationError } from "./services/connection-coordinator.js";
import { EncryptedSnapshotProtector } from "./services/encrypted-snapshot-protector.js";
import { PostgresTelegramAlertRepository } from "./services/telegram-alert-repository.js";
import { PostgresTelegramRiskRepository } from "./services/telegram-risk-repository.js";
import { TelegramConnectionNotifier } from "./services/telegram-connection-notifier.js";
import { TelegramLiveCommands } from "./services/telegram-live-commands.js";
export function createProductionContext(config) {
    const database = createDatabase(config.databaseUrl);
    const kms = createCredentialKmsProvider(config);
    const cipher = new EnvelopeCipher(kms);
    const sessions = new ConnectionSessionService(new PostgresConnectionSessionRepository(database.db));
    const credentials = new CredentialService(cipher, new PostgresCredentialRepository(database.db));
    const standxTransport = new FetchReadOnlyTransport(config.standxBaseUrl);
    const accountReader = new StandXAccountReader(standxTransport);
    const validator = {
        async validateAccount(token) {
            try {
                return await accountReader.validateAccount(token);
            }
            catch (error) {
                if (error instanceof StandXAccountValidationError) {
                    throw new StandXValidationError(error.code, { cause: error });
                }
                throw error;
            }
        }
    };
    const coordinator = new ConnectionCoordinator(sessions, credentials, validator, new PostgresConnectionLifecycleStore(database.db), new EncryptedSnapshotProtector(cipher), { cancelConnectionJobs: () => Promise.resolve() }, undefined, new TelegramConnectionNotifier(config.telegramBotToken));
    const liveCommands = new TelegramLiveCommands({
        connections: coordinator,
        credentials,
        client: new StandXReadClient(standxTransport),
        alerts: new PostgresTelegramAlertRepository(database.db),
        risk: new PostgresTelegramRiskRepository(database.db)
    });
    const telegramBot = createTelegramBot({
        token: config.telegramBotToken,
        miniAppUrl: config.miniAppOrigin,
        commands: createTelegramCommands(coordinator, liveCommands)
    });
    registerProductionTelegramCommandMenu(telegramBot, (bot, onError) => {
        void registerTelegramCommandMenu(bot, onError);
    }, error => {
        console.warn("Telegram command menu registration failed", error);
    });
    return {
        context: {
            clock: { now: () => new Date() },
            authenticate: (rawInitData, now) => verifyTelegramInitData(rawInitData, config.telegramBotToken, now),
            connections: coordinator
        },
        telegramBot,
        close: () => database.close()
    };
}
export function registerProductionTelegramCommandMenu(telegramBot, registerCommandMenu, onWarning) {
    registerCommandMenu(telegramBot, onWarning);
}
export function createTelegramCommands(coordinator, liveCommands, now = () => new Date()) {
    return {
        async status(telegramUserId) {
            const current = await coordinator.getCurrentStatus(telegramUserId);
            return current === null
                ? { connected: false }
                : { connected: true, accountLabel: current.accountLabel };
        },
        disconnect: telegramUserId => coordinator.disconnectCurrent(telegramUserId, now()),
        perps: telegramUserId => liveCommands.perps(telegramUserId),
        positions: telegramUserId => liveCommands.positions(telegramUserId),
        risk: telegramUserId => liveCommands.risk(telegramUserId),
        alerts: telegramUserId => liveCommands.alerts(telegramUserId),
        orders: telegramUserId => liveCommands.orders(telegramUserId),
        history: telegramUserId => liveCommands.history(telegramUserId),
        funding: telegramUserId => liveCommands.funding(telegramUserId),
        markets: telegramUserId => liveCommands.markets(telegramUserId),
        coverage: telegramUserId => liveCommands.coverage(telegramUserId),
        refresh: telegramUserId => liveCommands.refresh(telegramUserId)
    };
}
export function createCredentialKmsProvider(config, readTextFile = path => readFileSync(path, "utf8")) {
    if (config.credentialEncryptionProvider === "local") {
        if (config.credentialMasterKeyFile === undefined) {
            throw new Error("Local credential encryption requires a master key file");
        }
        return LocalMasterKeyProvider.fromBase64(readTextFile(config.credentialMasterKeyFile));
    }
    if (config.awsRegion === undefined || config.kmsKeyId === undefined) {
        throw new Error("AWS credential encryption requires AWS_REGION and KMS_KEY_ID");
    }
    return new AwsKmsProvider(config.kmsKeyId, new KMSClient({ region: config.awsRegion }));
}
//# sourceMappingURL=production-context.js.map