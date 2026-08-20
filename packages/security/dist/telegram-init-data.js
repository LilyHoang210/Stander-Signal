import { parse, validate } from "@tma.js/init-data-node";
const maximumAgeMilliseconds = 5 * 60 * 1_000;
const maximumFutureSkewMilliseconds = 30 * 1_000;
export class TelegramInitDataError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = "TelegramInitDataError";
    }
}
export function verifyTelegramInitData(raw, botToken, now) {
    try {
        validate(raw, botToken, { expiresIn: 0 });
    }
    catch (error) {
        throw new TelegramInitDataError("Telegram initData signature is invalid", { cause: error });
    }
    const data = parse(raw);
    const ageMilliseconds = now.getTime() - data.auth_date.getTime();
    if (ageMilliseconds > maximumAgeMilliseconds) {
        throw new TelegramInitDataError("Telegram initData has expired");
    }
    if (ageMilliseconds < -maximumFutureSkewMilliseconds) {
        throw new TelegramInitDataError("Telegram initData auth date is invalid");
    }
    if (data.user === undefined || !Number.isSafeInteger(data.user.id) || data.user.id <= 0) {
        throw new TelegramInitDataError("Telegram initData user is required");
    }
    if (data.chat_type !== undefined &&
        data.chat_type !== "private" &&
        data.chat_type !== "sender") {
        throw new TelegramInitDataError("Telegram Mini App must be opened from a private chat");
    }
    return {
        telegramUserId: String(data.user.id),
        ...(data.user.username === undefined ? {} : { username: data.user.username }),
        authDate: data.auth_date
    };
}
//# sourceMappingURL=telegram-init-data.js.map