import type { ConnectionRecord } from "@standx/db/repositories/connection-repository";
import type { PerpsAccountSnapshot } from "@standx/domain/portfolio";
import type { CredentialService } from "@standx/security/credential-service";
import type { StandXBalance, StandXOpenOrders, StandXPosition } from "@standx/standx/schemas";
import type { ScanState } from "./schedules.js";
export interface ScannerConnectionRepository {
    findActiveById(connectionId: string): Promise<ConnectionRecord | null>;
}
export interface ScannerCredentialService {
    withLease<T>(connectionId: string, callback: (token: string) => Promise<T>): Promise<T>;
}
export interface ScannerStandXClient {
    queryBalance(token: string): Promise<StandXBalance>;
    queryPositions(token: string): Promise<readonly StandXPosition[]>;
    queryOpenOrders(token: string): Promise<StandXOpenOrders>;
}
export interface SavePerpsSnapshotInput {
    readonly connection: ConnectionRecord;
    readonly snapshot: PerpsAccountSnapshot;
}
export interface PerpsSnapshotRepository {
    savePerpsSnapshot(input: SavePerpsSnapshotInput): Promise<void>;
}
export interface RiskEvaluationQueue {
    enqueueEvaluateAccount(connectionId: string): Promise<void>;
}
export interface AccountScanHook {
    afterPerpsSnapshotSaved(input: {
        readonly connection: ConnectionRecord;
        readonly result: Extract<AccountScanResult, {
            readonly status: "scanned";
        }>;
    }): Promise<void>;
}
export interface ConnectionLock {
    withConnectionLock<T>(connectionId: string, callback: () => Promise<T>): Promise<T | null>;
}
export interface AccountScannerDependencies {
    readonly connectionRepository: ScannerConnectionRepository;
    readonly credentialService: ScannerCredentialService | Pick<CredentialService, "withLease">;
    readonly standxClient: ScannerStandXClient;
    readonly snapshotRepository: PerpsSnapshotRepository;
    readonly riskQueue: RiskEvaluationQueue;
    readonly postScanHooks?: readonly AccountScanHook[];
    readonly lock: ConnectionLock;
    readonly now?: () => Date;
}
export type AccountScanResult = {
    readonly status: "scanned";
    readonly connectionId: string;
    readonly positionCount: number;
    readonly openOrderCount: number;
    readonly nextState: ScanState;
} | {
    readonly status: "skipped_inactive";
    readonly connectionId: string;
} | {
    readonly status: "skipped_disconnected";
    readonly connectionId: string;
} | {
    readonly status: "skipped_locked";
    readonly connectionId: string;
};
export declare class AccountScanner {
    private readonly dependencies;
    private readonly now;
    constructor(dependencies: AccountScannerDependencies);
    scan(connectionId: string): Promise<AccountScanResult>;
    private scanWithLock;
    private fetchRawPerpsSnapshot;
}
