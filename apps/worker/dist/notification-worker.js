const defaultPerChatIntervalMs = 1000;
const defaultGlobalPerSecondLimit = 30;
export function buildNotificationJobFromAlert(input) {
    return {
        id: input.descriptor.options.jobId,
        name: input.descriptor.name,
        chatId: input.chatId,
        text: input.text,
        priority: input.descriptor.options.priority,
        createdAt: new Date(input.descriptor.data.createdAt)
    };
}
export class InMemoryNotificationQueue {
    jobs = [];
    sequence = 0;
    enqueue(job, options) {
        this.jobs.push({
            job,
            priority: options.priority,
            sequence: this.sequence
        });
        this.sequence += 1;
        return Promise.resolve();
    }
    nextQueuedName() {
        const next = this.next();
        return Promise.resolve(next?.name ?? null);
    }
    next() {
        this.jobs.sort((left, right) => left.priority - right.priority || left.sequence - right.sequence);
        return this.jobs.shift()?.job ?? null;
    }
}
export class NotificationDeliveryWorker {
    send;
    perChatIntervalMs;
    globalPerSecondLimit;
    lastChatSubmission = new Map();
    globalSubmissionTimes = [];
    constructor(options) {
        this.send = options.send;
        this.perChatIntervalMs = options.perChatIntervalMs ?? defaultPerChatIntervalMs;
        this.globalPerSecondLimit = options.globalPerSecondLimit ?? defaultGlobalPerSecondLimit;
    }
    async deliver(job, now) {
        const rateLimit = this.rateLimit(job.chatId, now);
        if (rateLimit !== null) {
            return {
                jobId: job.id,
                chatId: job.chatId,
                status: "rate_limited",
                retryAfterMs: rateLimit,
                submittedAt: now.toISOString()
            };
        }
        const result = await this.send(job);
        this.recordSubmission(job.chatId, now);
        if (result.status === 429 && result.retryAfterSeconds !== undefined) {
            return {
                jobId: job.id,
                chatId: job.chatId,
                status: "retry_after",
                telegramStatus: result.status,
                retryAfterMs: result.retryAfterSeconds * 1000,
                submittedAt: now.toISOString()
            };
        }
        return {
            jobId: job.id,
            chatId: job.chatId,
            status: result.ok ? "sent" : "failed",
            telegramStatus: result.status,
            submittedAt: now.toISOString()
        };
    }
    rateLimit(chatId, now) {
        const nowMs = now.getTime();
        const lastChatMs = this.lastChatSubmission.get(chatId);
        if (lastChatMs !== undefined && nowMs - lastChatMs < this.perChatIntervalMs) {
            return this.perChatIntervalMs - (nowMs - lastChatMs);
        }
        const oneSecondAgo = nowMs - 1000;
        while (this.globalSubmissionTimes[0] !== undefined && this.globalSubmissionTimes[0] <= oneSecondAgo) {
            this.globalSubmissionTimes.shift();
        }
        if (this.globalSubmissionTimes.length >= this.globalPerSecondLimit) {
            const oldest = this.globalSubmissionTimes[0];
            return oldest === undefined ? 1000 : 1000 - (nowMs - oldest);
        }
        return null;
    }
    recordSubmission(chatId, now) {
        this.lastChatSubmission.set(chatId, now.getTime());
        this.globalSubmissionTimes.push(now.getTime());
    }
}
//# sourceMappingURL=notification-worker.js.map