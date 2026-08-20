import { createHash } from "node:crypto";
import { StandXReadClient, StandXTransportError } from "./read-client.js";
export class StandXAccountValidationError extends Error {
    code;
    constructor(code, options) {
        super(code === "unauthorized" ? "StandX credential is unauthorized" : "StandX validation is unavailable", options);
        this.code = code;
        this.name = "StandXAccountValidationError";
    }
}
export class StandXAccountReader {
    now;
    #client;
    constructor(transport, now = () => new Date()) {
        this.now = now;
        this.#client = new StandXReadClient(transport);
    }
    async validateAccount(apiToken) {
        try {
            const [balance, positions, openOrders, trades, fundingHistory] = await Promise.all([
                this.#client.queryBalance(apiToken),
                this.#client.queryPositions(apiToken),
                this.#client.queryOpenOrders(apiToken),
                this.#client.queryTrades(apiToken),
                this.#client.queryFundingHistory(apiToken)
            ]);
            const verifiedUserIds = new Set([
                ...positions.map(position => position.user),
                ...openOrders.result.map(order => order.user),
                ...trades.result.map(trade => trade.user),
                ...fundingHistory.map(record => record.user)
            ]);
            if (verifiedUserIds.size > 1) {
                throw new StandXAccountValidationError("unavailable");
            }
            return {
                accountId: verifiedUserIds.values().next().value ?? tokenFingerprint(apiToken),
                observedAt: this.now(),
                snapshot: { balance, positions, openOrders, trades, fundingHistory }
            };
        }
        catch (error) {
            if (error instanceof StandXAccountValidationError) {
                throw error;
            }
            if (error instanceof StandXTransportError && (error.statusCode === 401 || error.statusCode === 403)) {
                throw new StandXAccountValidationError("unauthorized", { cause: error });
            }
            throw new StandXAccountValidationError("unavailable", { cause: error });
        }
    }
}
function tokenFingerprint(apiToken) {
    return `standx_${createHash("sha256").update(apiToken, "utf8").digest("hex").slice(0, 16)}`;
}
//# sourceMappingURL=account-validator.js.map