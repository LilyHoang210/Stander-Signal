export function buildConnectionActivatedMessage(accountLabel) {
    return [
        `StandX connected: ${accountLabel}.`,
        "The bot is now monitoring this account.",
        "Use /status to check the connection or /disconnect to remove access."
    ].join("\n");
}
export class TelegramConnectionNotifier {
    botToken;
    fetchImpl;
    constructor(botToken, fetchImpl = fetch) {
        this.botToken = botToken;
        this.fetchImpl = fetchImpl;
    }
    async connectionActivated(input) {
        const response = await this.fetchImpl(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                chat_id: input.telegramUserId,
                text: buildConnectionActivatedMessage(input.accountLabel)
            })
        });
        if (!response.ok) {
            throw new Error(`Telegram notification delivery failed with status ${String(response.status)}`);
        }
    }
}
//# sourceMappingURL=telegram-connection-notifier.js.map