import { readFileSync } from "node:fs";
import { KMSClient } from "@aws-sdk/client-kms";
import { AwsKmsProvider } from "@standx/security/aws-kms-provider";
import { CredentialService } from "@standx/security/credential-service";
import { EnvelopeCipher } from "@standx/security/envelope";
import { LocalMasterKeyProvider } from "@standx/security/local-master-key-provider";
import { loadConfig } from "@standx/config/index";
import { createDatabase } from "@standx/db/client";
import { PostgresCredentialRepository } from "@standx/db/repositories/credential-repository";
import { PostgresConnectionRepository } from "@standx/db/repositories/connection-repository";
import { AccountScanner } from "@standx/scanner/account-scanner";
import { FetchReadOnlyTransport, StandXReadClient } from "@standx/standx/read-client";
import { AccountWatchCoordinator } from "./account-watch-coordinator.js";
import { createStandXAccountWatchStreamFactory, InMemoryConnectionLock } from "./account-watch-runtime.js";
import { PostgresPerpsSnapshotRepository } from "./perps-snapshot-repository.js";
import { createDirectRiskEvaluationQueue, PostgresRiskEvaluationService } from "./risk-evaluation-service.js";
import { PostgresTradeLifecycleRepository } from "./trade-lifecycle-repository.js";
import { PostgresTradeLifecycleService } from "./trade-lifecycle-service.js";
export async function startAccountWatchWorker(environment) {
    const config = loadConfig(environment);
    const database = createDatabase(config.databaseUrl);
    const coordinator = createAccountWatchCoordinator(config, database);
    await coordinator.start();
    logInfo("started", { maxLiveConnections: config.accountStreamMaxConnections });
    return {
        async stop() {
            await coordinator.stop();
            await database.close();
        }
    };
}
function createAccountWatchCoordinator(config, database) {
    const connectionRepository = new PostgresConnectionRepository(database.db);
    const credentialService = new CredentialService(new EnvelopeCipher(createCredentialKmsProvider(config)), new PostgresCredentialRepository(database.db));
    const standxClient = new StandXReadClient(new FetchReadOnlyTransport(config.standxBaseUrl));
    const riskEvaluationService = new PostgresRiskEvaluationService(database.db, {
        financialAlertsEnabled: config.financialAlertsEnabled,
        sendTelegramAlert: job => sendTelegramAlert(config.telegramBotToken, job)
    });
    const tradeLifecycleService = new PostgresTradeLifecycleService({
        repository: new PostgresTradeLifecycleRepository(database.db),
        credentials: credentialService,
        standxClient,
        financialAlertsEnabled: config.financialAlertsEnabled,
        telegramSender: {
            sendTelegramMessage: job => sendTelegramAlert(config.telegramBotToken, job)
        }
    });
    const scanner = new AccountScanner({
        connectionRepository,
        credentialService,
        standxClient,
        snapshotRepository: new PostgresPerpsSnapshotRepository(database.db),
        riskQueue: createDirectRiskEvaluationQueue(riskEvaluationService, (error, connectionId) => {
            logError("risk evaluation error", error, { connectionId });
        }),
        postScanHooks: [{
                async afterPerpsSnapshotSaved({ connection }) {
                    await tradeLifecycleService.processConnection(connection.id, {
                        telegramUserId: connection.telegramUserId,
                        accountId: connection.accountId
                    });
                }
            }],
        lock: new InMemoryConnectionLock()
    });
    return new AccountWatchCoordinator({
        connections: {
            async listActive() {
                return (await connectionRepository.listActive()).map(toAccountWatchConnection);
            }
        },
        credentials: credentialService,
        streamFactory: createStandXAccountWatchStreamFactory({
            onError: error => {
                logError("account stream error", error);
            }
        }),
        scanner,
        maxLiveConnections: config.accountStreamMaxConnections,
        reconcileIntervalMs: config.accountStreamReconcileMs,
        debounceMs: config.accountStreamDebounceMs,
        fallbackScanMs: config.accountFallbackScanMs,
        onError: error => {
            logError("account watch error", error);
        }
    });
}
function createCredentialKmsProvider(config) {
    if (config.credentialEncryptionProvider === "local") {
        if (config.credentialMasterKeyFile === undefined) {
            throw new Error("Local credential encryption requires a master key file");
        }
        return LocalMasterKeyProvider.fromBase64(readFileSync(config.credentialMasterKeyFile, "utf8"));
    }
    if (config.awsRegion === undefined || config.kmsKeyId === undefined) {
        throw new Error("AWS KMS credential encryption requires AWS_REGION and KMS_KEY_ID");
    }
    return new AwsKmsProvider(config.kmsKeyId, new KMSClient({ region: config.awsRegion }));
}
function toAccountWatchConnection(record) {
    if (record.status !== "active") {
        throw new Error("Account watch worker received a non-active connection");
    }
    return {
        id: record.id,
        telegramUserId: record.telegramUserId,
        accountId: record.accountId,
        status: record.status
    };
}
function logInfo(message, details = {}) {
    console.log(JSON.stringify({
        level: "info",
        component: "standx-account-watch-worker",
        message,
        ...details
    }));
}
async function sendTelegramAlert(botToken, job) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            chat_id: job.chatId,
            text: job.text,
            ...(job.replyMarkup === undefined ? {} : { reply_markup: job.replyMarkup }),
            disable_web_page_preview: true
        })
    });
    let providerMessageId;
    let errorCode;
    try {
        const body = await response.json();
        if (body.result?.message_id !== undefined) {
            providerMessageId = String(body.result.message_id);
        }
        if (body.error_code !== undefined) {
            errorCode = `TELEGRAM_${String(body.error_code)}`;
        }
    }
    catch {
        errorCode = response.ok ? undefined : `HTTP_${String(response.status)}`;
    }
    return {
        ok: response.ok,
        status: response.status,
        ...(providerMessageId === undefined ? {} : { providerMessageId }),
        ...(errorCode === undefined ? {} : { errorCode })
    };
}
function logError(message, error, details = {}) {
    console.error(JSON.stringify({
        level: "error",
        component: "standx-account-watch-worker",
        message,
        errorName: error.name,
        ...details
    }));
}
const worker = await startAccountWatchWorker(process.env);
const shutdown = async () => {
    await worker.stop();
    process.exit(0);
};
process.once("SIGINT", () => {
    void shutdown();
});
process.once("SIGTERM", () => {
    void shutdown();
});
//# sourceMappingURL=account-watch-worker.js.map