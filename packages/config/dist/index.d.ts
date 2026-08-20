type CredentialEncryptionProviderName = "local" | "aws";
export interface AppConfig {
    readonly nodeEnv: "development" | "test" | "production";
    readonly databaseUrl: string;
    readonly redisUrl: string;
    readonly telegramBotToken: string;
    readonly telegramWebhookSecret: string;
    readonly miniAppOrigin: string;
    readonly credentialEncryptionProvider: CredentialEncryptionProviderName;
    readonly credentialMasterKeyFile: string | undefined;
    readonly awsRegion: string | undefined;
    readonly kmsKeyId: string | undefined;
    readonly standxBaseUrl: string;
    readonly shadowMode: boolean;
    readonly financialAlertsEnabled: boolean;
    readonly alphaUserAllowlist: readonly string[];
    readonly accountStreamMaxConnections: number;
    readonly accountStreamReconcileMs: number;
    readonly accountStreamDebounceMs: number;
    readonly accountFallbackScanMs: number;
}
export declare function loadConfig(environment: Record<string, string | undefined>): AppConfig;
export {};
