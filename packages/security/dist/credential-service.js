import { EnvelopeCipher } from "./envelope.js";
export class CredentialNotFoundError extends Error {
    constructor(connectionId) {
        super(`Credential not found for connection ${connectionId}`);
        this.name = "CredentialNotFoundError";
    }
}
export class CredentialService {
    cipher;
    repository;
    constructor(cipher, repository) {
        this.cipher = cipher;
        this.repository = repository;
    }
    async store(connectionId, telegramUserId, token) {
        const context = { connectionId, telegramUserId };
        const envelope = await this.cipher.encrypt(token, context);
        await this.repository.store({ connectionId, telegramUserId, envelope });
    }
    async withLease(connectionId, callback) {
        const record = await this.repository.find(connectionId);
        if (record === null) {
            throw new CredentialNotFoundError(connectionId);
        }
        const token = await this.cipher.decrypt(record.envelope, {
            connectionId: record.connectionId,
            telegramUserId: record.telegramUserId
        });
        return callback(token);
    }
    withCandidate(candidate, callback) {
        return callback(candidate);
    }
    delete(connectionId) {
        return this.repository.delete(connectionId);
    }
}
export class InMemoryCredentialRepository {
    #records = new Map();
    store(record) {
        this.#records.set(record.connectionId, cloneRecord(record));
        return Promise.resolve();
    }
    find(connectionId) {
        const record = this.#records.get(connectionId);
        return Promise.resolve(record === undefined ? null : cloneRecord(record));
    }
    delete(connectionId) {
        return Promise.resolve(this.#records.delete(connectionId));
    }
}
function cloneRecord(record) {
    return {
        ...record,
        envelope: { ...record.envelope }
    };
}
//# sourceMappingURL=credential-service.js.map