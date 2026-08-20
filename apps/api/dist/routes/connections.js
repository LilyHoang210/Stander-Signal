import { z } from "zod";
import { ConnectionApplicationError } from "../context.js";
const connectBodySchema = z.object({
    sessionId: z.string().min(1),
    apiToken: z.string().min(20).refine(value => !/\s/.test(value), "Token must not contain whitespace")
});
export function connectionRoutes(app, context) {
    app.post("/v1/connections/session", async (request, reply) => {
        const identity = authenticateRequest(request, reply, context);
        if (identity === null) {
            return;
        }
        const session = await context.connections.createSession(identity, context.clock.now());
        return reply.code(201).send({
            sessionId: session.id,
            expiresAt: session.expiresAt.toISOString()
        });
    });
    app.post("/v1/connections", async (request, reply) => {
        const identity = authenticateRequest(request, reply, context);
        if (identity === null) {
            return;
        }
        const parsed = connectBodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.badRequest("Invalid connection request");
        }
        try {
            const connection = await context.connections.connect({
                telegramUserId: identity.telegramUserId,
                sessionId: parsed.data.sessionId,
                apiToken: parsed.data.apiToken
            }, context.clock.now());
            return await reply.code(201).send(connection);
        }
        catch (error) {
            return await handleApplicationError(error, reply);
        }
    });
    app.get("/v1/connections/:id/status", async (request, reply) => {
        const identity = authenticateRequest(request, reply, context);
        if (identity === null) {
            return;
        }
        const connection = await context.connections.getStatus(request.params.id, identity.telegramUserId);
        if (connection === null) {
            return reply.notFound("Connection not found");
        }
        return reply.send(connection);
    });
    app.delete("/v1/connections/:id", async (request, reply) => {
        const identity = authenticateRequest(request, reply, context);
        if (identity === null) {
            return;
        }
        const disconnected = await context.connections.disconnect(request.params.id, identity.telegramUserId, context.clock.now());
        if (!disconnected) {
            return reply.notFound("Connection not found");
        }
        return reply.code(204).send();
    });
    return Promise.resolve();
}
function handleApplicationError(error, reply) {
    if (!(error instanceof ConnectionApplicationError)) {
        throw error;
    }
    switch (error.code) {
        case "session_used":
        case "session_invalid":
            return reply.conflict("Connection session is no longer valid");
        case "session_expired":
            return reply.code(410).send({
                statusCode: 410,
                error: "Gone",
                message: "Connection session has expired"
            });
        case "standx_unauthorized":
            return reply.unprocessableEntity("StandX API token is invalid");
        case "standx_unavailable":
            return reply.serviceUnavailable("StandX validation is temporarily unavailable");
    }
}
function authenticateRequest(request, reply, context) {
    const authorization = request.headers.authorization;
    if (authorization === undefined || !authorization.startsWith("tma ")) {
        void reply.unauthorized("Telegram authorization is required");
        return null;
    }
    try {
        return context.authenticate(authorization.slice(4), context.clock.now());
    }
    catch {
        void reply.unauthorized("Telegram authorization is invalid");
        return null;
    }
}
//# sourceMappingURL=connections.js.map