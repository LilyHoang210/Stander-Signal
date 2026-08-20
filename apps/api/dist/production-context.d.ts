import type { AppConfig } from "@standx/config/index";
import { type KmsProvider } from "@standx/security/envelope";
import { createTelegramBot, type TelegramConnectionCommands } from "@standx/telegram/bot";
import type { AppContext } from "./context.js";
import { ConnectionCoordinator } from "./services/connection-coordinator.js";
import { TelegramLiveCommands } from "./services/telegram-live-commands.js";
export interface ProductionContextHandle {
    readonly context: AppContext;
    readonly telegramBot: ReturnType<typeof createTelegramBot>;
    close(): Promise<void>;
}
export declare function createProductionContext(config: AppConfig): ProductionContextHandle;
export declare function registerProductionTelegramCommandMenu(telegramBot: ReturnType<typeof createTelegramBot>, registerCommandMenu: (bot: ReturnType<typeof createTelegramBot>, onError: (error: unknown) => void) => void, onWarning: (error: unknown) => void): void;
export declare function createTelegramCommands(coordinator: Pick<ConnectionCoordinator, "getCurrentStatus" | "disconnectCurrent">, liveCommands: Pick<TelegramLiveCommands, "perps" | "positions" | "risk" | "alerts" | "orders" | "history" | "funding" | "markets" | "coverage" | "refresh">, now?: () => Date): TelegramConnectionCommands;
export declare function createCredentialKmsProvider(config: AppConfig, readTextFile?: (path: string) => string): KmsProvider;
