export interface TelegramIdentity {
    readonly telegramUserId: string;
    readonly username?: string;
    readonly authDate: Date;
}
export declare class TelegramInitDataError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
export declare function verifyTelegramInitData(raw: string, botToken: string, now: Date): TelegramIdentity;
