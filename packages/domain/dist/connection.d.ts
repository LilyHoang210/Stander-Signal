export interface ConnectionSessionRecord {
    readonly id: string;
    readonly telegramUserId: string;
    readonly tokenHash: string;
    readonly expiresAt: Date;
    readonly createdAt: Date;
    readonly usedAt: Date | null;
}
export type ConsumeSessionResult = {
    readonly status: "consumed";
    readonly record: ConnectionSessionRecord;
} | {
    readonly status: "missing" | "wrong_user" | "expired" | "used";
};
export interface ConnectionSessionRepository {
    create(record: ConnectionSessionRecord): Promise<void>;
    consume(tokenHash: string, telegramUserId: string, now: Date): Promise<ConsumeSessionResult>;
}
export interface PublicConnectionSession {
    readonly id: string;
    readonly telegramUserId: string;
    readonly expiresAt: Date;
}
export declare class ConnectionSessionError extends Error {
    readonly code: "missing" | "wrong_user" | "expired" | "used";
    constructor(code: "missing" | "wrong_user" | "expired" | "used");
}
type RandomBytesGenerator = () => Uint8Array;
export declare class ConnectionSessionService {
    private readonly repository;
    private readonly generateRandomBytes;
    constructor(repository: ConnectionSessionRepository, generateRandomBytes?: RandomBytesGenerator);
    create(telegramUserId: string, now: Date): Promise<PublicConnectionSession>;
    consume(publicId: string, telegramUserId: string, now: Date): Promise<PublicConnectionSession>;
}
export declare class InMemoryConnectionSessionRepository implements ConnectionSessionRepository {
    #private;
    create(record: ConnectionSessionRecord): Promise<void>;
    consume(tokenHash: string, telegramUserId: string, now: Date): Promise<ConsumeSessionResult>;
}
export {};
