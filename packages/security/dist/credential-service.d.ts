import type { CredentialEnvelope } from "./envelope.js";
import { EnvelopeCipher } from "./envelope.js";
export interface CredentialRecord {
    readonly connectionId: string;
    readonly telegramUserId: string;
    readonly envelope: CredentialEnvelope;
}
export interface CredentialRepository {
    store(record: CredentialRecord): Promise<void>;
    find(connectionId: string): Promise<CredentialRecord | null>;
    delete(connectionId: string): Promise<boolean>;
}
export declare class CredentialNotFoundError extends Error {
    constructor(connectionId: string);
}
export declare class CredentialService {
    private readonly cipher;
    private readonly repository;
    constructor(cipher: EnvelopeCipher, repository: CredentialRepository);
    store(connectionId: string, telegramUserId: string, token: string): Promise<void>;
    withLease<T>(connectionId: string, callback: (token: string) => Promise<T>): Promise<T>;
    withCandidate<T>(candidate: string, callback: (token: string) => Promise<T>): Promise<T>;
    delete(connectionId: string): Promise<boolean>;
}
export declare class InMemoryCredentialRepository implements CredentialRepository {
    #private;
    store(record: CredentialRecord): Promise<void>;
    find(connectionId: string): Promise<CredentialRecord | null>;
    delete(connectionId: string): Promise<boolean>;
}
