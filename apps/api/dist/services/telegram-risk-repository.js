import { and, desc, eq } from "drizzle-orm";
import * as schema from "@standx/db/schema";
import { riskEvaluations, standxConnections } from "@standx/db/schema";
export class PostgresTelegramRiskRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async listLatest(telegramUserId) {
        const rows = await this.database
            .select({
            riskType: riskEvaluations.riskType,
            itemId: riskEvaluations.itemId,
            severity: riskEvaluations.severity,
            status: riskEvaluations.status,
            reasons: riskEvaluations.reasons,
            evaluatedAt: riskEvaluations.evaluatedAt
        })
            .from(riskEvaluations)
            .innerJoin(standxConnections, eq(riskEvaluations.connectionId, standxConnections.id))
            .where(and(eq(standxConnections.telegramUserId, telegramUserId), eq(standxConnections.status, "active")))
            .orderBy(desc(riskEvaluations.evaluatedAt))
            .limit(50);
        return rows.filter(uniqueLatestRiskKey).slice(0, 10).map(row => {
            const reason = firstReason(row.reasons);
            return {
                riskType: row.riskType,
                itemId: row.itemId,
                severity: row.severity,
                status: row.status,
                reasonCode: reason.code,
                reasonMessage: reason.message,
                evaluatedAt: row.evaluatedAt
            };
        });
    }
}
function uniqueLatestRiskKey(row, _index, rows) {
    const key = riskKey(row);
    return rows.findIndex(candidate => riskKey(candidate) === key) === _index;
}
function riskKey(row) {
    return `${row.riskType}:${row.itemId}`;
}
function firstReason(reasons) {
    const first = reasons[0];
    return {
        code: typeof first?.code === "string" ? first.code : "NO_REASON",
        message: typeof first?.message === "string" ? first.message : "No reason provided."
    };
}
//# sourceMappingURL=telegram-risk-repository.js.map