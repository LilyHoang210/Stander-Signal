import type { DeliverAlertJobDescriptor } from "./risk-worker.js";
export interface NotificationJob {
    readonly id: string;
    readonly name: string;
    readonly chatId: number;
    readonly text: string;
    readonly priority: number;
    readonly createdAt: Date;
}
export interface EnqueueOptions {
    readonly priority: number;
}
export interface TelegramSendResult {
    readonly ok: boolean;
    readonly status: number;
    readonly retryAfterSeconds?: number;
    readonly body?: string;
}
export interface NotificationSubmissionResult {
    readonly jobId: string;
    readonly chatId: number;
    readonly status: "sent" | "failed" | "retry_after" | "rate_limited";
    readonly telegramStatus?: number;
    readonly retryAfterMs?: number;
    readonly submittedAt: string;
}
export interface NotificationDeliveryWorkerOptions {
    readonly send: (job: NotificationJob) => Promise<TelegramSendResult>;
    readonly perChatIntervalMs?: number;
    readonly globalPerSecondLimit?: number;
}
export interface BuildNotificationJobFromAlertInput {
    readonly descriptor: DeliverAlertJobDescriptor;
    readonly chatId: number;
    readonly text: string;
}
export declare function buildNotificationJobFromAlert(input: BuildNotificationJobFromAlertInput): NotificationJob;
export declare class InMemoryNotificationQueue {
    private readonly jobs;
    private sequence;
    enqueue(job: NotificationJob, options: EnqueueOptions): Promise<void>;
    nextQueuedName(): Promise<string | null>;
    next(): NotificationJob | null;
}
export declare class NotificationDeliveryWorker {
    private readonly send;
    private readonly perChatIntervalMs;
    private readonly globalPerSecondLimit;
    private readonly lastChatSubmission;
    private readonly globalSubmissionTimes;
    constructor(options: NotificationDeliveryWorkerOptions);
    deliver(job: NotificationJob, now: Date): Promise<NotificationSubmissionResult>;
    private rateLimit;
    private recordSubmission;
}
