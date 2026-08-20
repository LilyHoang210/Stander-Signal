import type { PerpsAccountSnapshot, PositionSnapshot } from "@standx/domain/portfolio";
import type { StandXBalance, StandXOpenOrders, StandXPosition } from "@standx/standx/schemas";
interface NormalizePerpsSnapshotInput {
    readonly accountId: string;
    readonly balance: StandXBalance;
    readonly positions: readonly StandXPosition[];
    readonly openOrders: StandXOpenOrders;
    readonly observedAt: Date;
    readonly ingestedAt?: Date;
}
interface NormalizePositionInput {
    readonly accountId: string;
    readonly position: StandXPosition;
    readonly observedAt: Date;
    readonly ingestedAt?: Date;
}
export declare function normalizePerpsSnapshot(input: NormalizePerpsSnapshotInput): PerpsAccountSnapshot;
export declare function normalizePosition(input: NormalizePositionInput): PositionSnapshot;
export {};
