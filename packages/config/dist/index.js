import { z } from "zod";
const environmentSchema = z
    .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url().refine(value => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
        message: "DATABASE_URL must use PostgreSQL"
    }),
    REDIS_URL: z.url().refine(value => value.startsWith("redis://") || value.startsWith("rediss://"), {
        message: "REDIS_URL must use Redis"
    }),
    TELEGRAM_BOT_TOKEN: z.string().min(10).optional(),
    TELEGRAM_BOT_API: z.string().min(10).optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(32),
    MINI_APP_ORIGIN: z.url(),
    CREDENTIAL_ENCRYPTION_PROVIDER: z.enum(["local", "aws"]).optional(),
    CREDENTIAL_MASTER_KEY_FILE: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).optional(),
    KMS_KEY_ID: z.string().min(1).optional(),
    STANDX_BASE_URL: z.url(),
    SHADOW_MODE: z.enum(["true", "false"]).default("true"),
    FINANCIAL_ALERTS_ENABLED: z.enum(["true", "false"]).default("false"),
    ALPHA_USER_ALLOWLIST: z.string().optional(),
    ACCOUNT_STREAM_MAX_CONNECTIONS: z.coerce.number().int().positive().default(8),
    ACCOUNT_STREAM_RECONCILE_MS: z.coerce.number().int().positive().default(30_000),
    ACCOUNT_STREAM_DEBOUNCE_MS: z.coerce.number().int().positive().default(5_000),
    ACCOUNT_FALLBACK_SCAN_MS: z.coerce.number().int().positive().default(60_000)
})
    .superRefine((environment, context) => {
    const provider = resolveEncryptionProvider(environment);
    const miniAppUrl = new URL(environment.MINI_APP_ORIGIN);
    if (environment.NODE_ENV === "production" && miniAppUrl.protocol !== "https:") {
        context.addIssue({
            code: "custom",
            message: "MINI_APP_ORIGIN must use HTTPS in production",
            path: ["MINI_APP_ORIGIN"]
        });
    }
    if (new URL(environment.STANDX_BASE_URL).protocol !== "https:") {
        context.addIssue({
            code: "custom",
            message: "STANDX_BASE_URL must use HTTPS",
            path: ["STANDX_BASE_URL"]
        });
    }
    if (environment.TELEGRAM_BOT_TOKEN === undefined && environment.TELEGRAM_BOT_API === undefined) {
        context.addIssue({
            code: "custom",
            message: "TELEGRAM_BOT_TOKEN is required",
            path: ["TELEGRAM_BOT_TOKEN"]
        });
    }
    if (provider === "local" && environment.CREDENTIAL_MASTER_KEY_FILE === undefined) {
        context.addIssue({
            code: "custom",
            message: "CREDENTIAL_MASTER_KEY_FILE is required for local encryption",
            path: ["CREDENTIAL_MASTER_KEY_FILE"]
        });
    }
    if (provider === "aws") {
        if (environment.AWS_REGION === undefined) {
            context.addIssue({
                code: "custom",
                message: "AWS_REGION is required for AWS encryption",
                path: ["AWS_REGION"]
            });
        }
        if (environment.KMS_KEY_ID === undefined) {
            context.addIssue({
                code: "custom",
                message: "KMS_KEY_ID is required for AWS encryption",
                path: ["KMS_KEY_ID"]
            });
        }
    }
    if (environment.SHADOW_MODE === "true" && environment.FINANCIAL_ALERTS_ENABLED === "true") {
        context.addIssue({
            code: "custom",
            message: "FINANCIAL_ALERTS_ENABLED cannot be true while SHADOW_MODE is true",
            path: ["FINANCIAL_ALERTS_ENABLED"]
        });
    }
});
export function loadConfig(environment) {
    const parsed = environmentSchema.parse(environment);
    const credentialEncryptionProvider = resolveEncryptionProvider(parsed);
    return {
        nodeEnv: parsed.NODE_ENV,
        databaseUrl: parsed.DATABASE_URL,
        redisUrl: parsed.REDIS_URL,
        telegramBotToken: parsed.TELEGRAM_BOT_TOKEN ?? parsed.TELEGRAM_BOT_API ?? "",
        telegramWebhookSecret: parsed.TELEGRAM_WEBHOOK_SECRET,
        miniAppOrigin: parsed.MINI_APP_ORIGIN,
        credentialEncryptionProvider,
        credentialMasterKeyFile: parsed.CREDENTIAL_MASTER_KEY_FILE,
        awsRegion: parsed.AWS_REGION,
        kmsKeyId: parsed.KMS_KEY_ID,
        standxBaseUrl: parsed.STANDX_BASE_URL,
        shadowMode: parsed.SHADOW_MODE === "true",
        financialAlertsEnabled: parsed.FINANCIAL_ALERTS_ENABLED === "true",
        alphaUserAllowlist: parseAllowlist(parsed.ALPHA_USER_ALLOWLIST),
        accountStreamMaxConnections: parsed.ACCOUNT_STREAM_MAX_CONNECTIONS,
        accountStreamReconcileMs: parsed.ACCOUNT_STREAM_RECONCILE_MS,
        accountStreamDebounceMs: parsed.ACCOUNT_STREAM_DEBOUNCE_MS,
        accountFallbackScanMs: parsed.ACCOUNT_FALLBACK_SCAN_MS
    };
}
function resolveEncryptionProvider(environment) {
    if (environment.CREDENTIAL_ENCRYPTION_PROVIDER !== undefined) {
        return environment.CREDENTIAL_ENCRYPTION_PROVIDER;
    }
    return environment.AWS_REGION !== undefined || environment.KMS_KEY_ID !== undefined
        ? "aws"
        : "local";
}
function parseAllowlist(value) {
    if (value === undefined) {
        return [];
    }
    return value
        .split(",")
        .map(item => item.trim())
        .filter(item => item.length > 0);
}
//# sourceMappingURL=index.js.map