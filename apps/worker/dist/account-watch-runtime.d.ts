import { type StandXAccountStreamConnectOptions } from "@standx/standx/account-stream-client";
import type { ConnectionLock, RiskEvaluationQueue } from "@standx/scanner/account-scanner";
import type { AccountWatchStreamFactory } from "./account-watch-coordinator.js";
interface AccountStreamClientLike {
    connect(options: StandXAccountStreamConnectOptions): Promise<{
        close(): Promise<void>;
    }>;
}
export interface CreateAccountWatchStreamFactoryOptions {
    readonly createClient?: () => AccountStreamClientLike;
    readonly onError?: (error: Error) => void;
}
export declare function createStandXAccountWatchStreamFactory(options?: CreateAccountWatchStreamFactoryOptions): AccountWatchStreamFactory;
export declare class InMemoryConnectionLock implements ConnectionLock {
    private readonly lockedConnectionIds;
    withConnectionLock<T>(connectionId: string, callback: () => Promise<T>): Promise<T | null>;
}
export declare class NoopRiskEvaluationQueue implements RiskEvaluationQueue {
    enqueueEvaluateAccount(connectionId: string): Promise<void>;
}
export {};
