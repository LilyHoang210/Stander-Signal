import type { ConnectionNotifier } from "./connection-coordinator.js";
export declare function buildConnectionActivatedMessage(accountLabel: string): string;
export declare class TelegramConnectionNotifier implements ConnectionNotifier {
    private readonly botToken;
    private readonly fetchImpl;
    constructor(botToken: string, fetchImpl?: typeof fetch);
    connectionActivated(input: {
        readonly connectionId: string;
        readonly telegramUserId: string;
        readonly accountLabel: string;
    }): Promise<void>;
}
