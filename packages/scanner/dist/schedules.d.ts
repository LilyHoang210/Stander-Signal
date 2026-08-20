export type ScanState = "no-position" | "active" | "danger" | "critical";
export interface RateLimitBackoffInput {
    readonly attempt: number;
    readonly retryAfterSeconds: number | null;
    readonly random?: () => number;
}
export declare function nextScanDelay(state: ScanState, random?: () => number): number;
export declare function canRefresh(lastRefreshAt: Date | null, now: Date): boolean;
export declare function nextRateLimitBackoffDelay(input: RateLimitBackoffInput): number;
