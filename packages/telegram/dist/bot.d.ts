import { Bot } from "grammy";
import type { UserFromGetMe } from "grammy/types";
export declare const telegramCommandMenu: readonly [{
    readonly command: "menu";
    readonly description: "Open menu";
}];
export declare function registerTelegramCommandMenu(bot: Bot, onError?: (error: unknown) => void): Promise<void>;
export interface TelegramConnectionCommands {
    status(telegramUserId: string): Promise<{
        readonly connected: boolean;
        readonly accountLabel?: string;
    }>;
    disconnect(telegramUserId: string): Promise<boolean>;
    perps?(telegramUserId: string): Promise<string>;
    positions?(telegramUserId: string): Promise<string>;
    risk?(telegramUserId: string): Promise<string>;
    alerts?(telegramUserId: string): Promise<string>;
    orders?(telegramUserId: string): Promise<string>;
    history?(telegramUserId: string): Promise<string>;
    funding?(telegramUserId: string): Promise<string>;
    markets?(telegramUserId: string): Promise<string>;
    coverage?(telegramUserId: string): Promise<string>;
    refresh?(telegramUserId: string): Promise<string>;
    acknowledgeAlert?(telegramUserId: string, callbackData: string): Promise<string>;
}
export interface TelegramBotOptions {
    readonly token: string;
    readonly miniAppUrl: string;
    readonly fetch?: typeof fetch;
    readonly commands?: TelegramConnectionCommands;
    readonly botInfo?: UserFromGetMe;
}
export interface TelegramReply {
    readonly chat_id?: number;
    readonly text?: string;
    readonly reply_markup?: {
        readonly inline_keyboard: readonly (readonly {
            readonly text: string;
            readonly web_app?: {
                readonly url: string;
            };
            readonly callback_data?: string;
        }[])[];
    };
}
export declare function createTelegramBot(options: TelegramBotOptions): Bot;
