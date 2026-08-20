import { createHash, randomBytes, randomUUID } from "node:crypto";
const connectionSessionLifetimeMilliseconds = 15 * 60 * 1_000;
export class ConnectionSessionError extends Error {
    code;
    constructor(code) {
        super(code === "wrong_user"
            ? "Connection session belongs to another user"
            : `Connection session is ${code}`);
        this.code = code;
        this.name = "ConnectionSessionError";
    }
}
export class ConnectionSessionService {
    repository;
    generateRandomBytes;
    constructor(repository, generateRandomBytes = () => randomBytes(32)) {
        this.repository = repository;
        this.generateRandomBytes = generateRandomBytes;
    }
    async create(telegramUserId, now) {
        const publicId = Buffer.from(this.generateRandomBytes()).toString("base64url");
        const expiresAt = new Date(now.getTime() + connectionSessionLifetimeMilliseconds);
        await this.repository.create({
            id: randomUUID(),
            telegramUserId,
            tokenHash: hashSessionId(publicId),
            expiresAt,
            createdAt: now,
            usedAt: null
        });
        return { id: publicId, telegramUserId, expiresAt };
    }
    async consume(publicId, telegramUserId, now) {
        const result = await this.repository.consume(hashSessionId(publicId), telegramUserId, now);
        if (result.status !== "consumed") {
            throw new ConnectionSessionError(result.status);
        }
        return {
            id: publicId,
            telegramUserId: result.record.telegramUserId,
            expiresAt: result.record.expiresAt
        };
    }
}
export class InMemoryConnectionSessionRepository {
    #records = new Map();
    create(record) {
        this.#records.set(record.tokenHash, { ...record });
        return Promise.resolve();
    }
    consume(tokenHash, telegramUserId, now) {
        const record = this.#records.get(tokenHash);
        if (record === undefined) {
            return Promise.resolve({ status: "missing" });
        }
        if (record.telegramUserId !== telegramUserId) {
            return Promise.resolve({ status: "wrong_user" });
        }
        if (record.usedAt !== null) {
            return Promise.resolve({ status: "used" });
        }
        if (now.getTime() >= record.expiresAt.getTime()) {
            return Promise.resolve({ status: "expired" });
        }
        const consumed = { ...record, usedAt: now };
        this.#records.set(tokenHash, consumed);
        return Promise.resolve({ status: "consumed", record: consumed });
    }
}
function hashSessionId(publicId) {
    return createHash("sha256").update(publicId, "utf8").digest("hex");
}
//# sourceMappingURL=connection.js.map
