import { type ReadOnlyTransport } from "./read-client.js";
export interface StandXAccountSnapshot {
    readonly balance: Readonly<Record<string, string>>;
    readonly positions: readonly Readonly<Record<string, unknown>>[];
    readonly openOrders: Readonly<Record<string, unknown>>;
    readonly trades: Readonly<Record<string, unknown>>;
    readonly fundingHistory: readonly Readonly<Record<string, unknown>>[];
}
export interface ValidatedStandXAccount {
    readonly accountId: string;
    readonly alias?: string;
    readonly observedAt: Date;
    readonly snapshot: StandXAccountSnapshot;
}
export declare class StandXAccountValidationError extends Error {
    readonly code: "unauthorized" | "unavailable";
    constructor(code: "unauthorized" | "unavailable", options?: ErrorOptions);
}
export declare class StandXAccountReader {
    #private;
    private readonly now;
    constructor(transport: ReadOnlyTransport, now?: () => Date);
    validateAccount(apiToken: string): Promise<ValidatedStandXAccount>;
}
