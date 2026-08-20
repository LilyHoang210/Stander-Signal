import { eq } from "drizzle-orm";
import * as schema from "../schema.js";
import { encryptedCredentials, standxConnections } from "../schema.js";
export class PostgresCredentialRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async store(record) {
        const values = {
            connectionId: record.connectionId,
            version: record.envelope.version,
            encryptedDataKey: record.envelope.encryptedDataKey,
            iv: record.envelope.iv,
            authTag: record.envelope.authTag,
            ciphertext: record.envelope.ciphertext
        };
        await this.database
            .insert(encryptedCredentials)
            .values(values)
            .onConflictDoUpdate({
            target: encryptedCredentials.connectionId,
            set: {
                ...values,
                updatedAt: new Date()
            }
        });
    }
    async find(connectionId) {
        const [row] = await this.database
            .select({
            connectionId: encryptedCredentials.connectionId,
            telegramUserId: standxConnections.telegramUserId,
            version: encryptedCredentials.version,
            encryptedDataKey: encryptedCredentials.encryptedDataKey,
            iv: encryptedCredentials.iv,
            authTag: encryptedCredentials.authTag,
            ciphertext: encryptedCredentials.ciphertext
        })
            .from(encryptedCredentials)
            .innerJoin(standxConnections, eq(standxConnections.id, encryptedCredentials.connectionId))
            .where(eq(encryptedCredentials.connectionId, connectionId))
            .limit(1);
        if (row === undefined) {
            return null;
        }
        if (row.version !== 1) {
            throw new Error(`Unsupported credential envelope version: ${String(row.version)}`);
        }
        return {
            connectionId: row.connectionId,
            telegramUserId: row.telegramUserId,
            envelope: {
                version: 1,
                encryptedDataKey: row.encryptedDataKey,
                iv: row.iv,
                authTag: row.authTag,
                ciphertext: row.ciphertext
            }
        };
    }
    async delete(connectionId) {
        const deleted = await this.database
            .delete(encryptedCredentials)
            .where(eq(encryptedCredentials.connectionId, connectionId))
            .returning({ connectionId: encryptedCredentials.connectionId });
        return deleted.length === 1;
    }
}
//# sourceMappingURL=credential-repository.js.map