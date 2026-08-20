import { and, desc, eq, ne } from "drizzle-orm";
import * as schema from "@standx/db/schema";
import { alerts, riskEvaluations } from "@standx/db/schema";
export class PostgresTelegramAlertRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async listActive(telegramUserId) {
        const rows = await this.database
            .select({
            severity: alerts.severity,
            status: alerts.status,
            message: alerts.message,
            createdAt: alerts.createdAt,
            riskType: riskEvaluations.riskType,
            itemId: riskEvaluations.itemId
        })
            .from(alerts)
            .innerJoin(riskEvaluations, eq(alerts.evaluationId, riskEvaluations.id))
            .where(and(eq(alerts.telegramUserId, telegramUserId), ne(alerts.status, "recovered")))
            .orderBy(desc(alerts.createdAt))
            .limit(10);
        return rows.map(row => ({
            severity: row.severity,
            riskType: row.riskType,
            itemId: row.itemId,
            status: row.status,
            message: row.message,
            createdAt: row.createdAt
        }));
    }
}
//# sourceMappingURL=telegram-alert-repository.js.map