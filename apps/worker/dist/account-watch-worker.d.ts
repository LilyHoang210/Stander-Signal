export interface AccountWatchWorkerHandle {
    stop(): Promise<void>;
}
export declare function startAccountWatchWorker(environment: Record<string, string | undefined>): Promise<AccountWatchWorkerHandle>;
