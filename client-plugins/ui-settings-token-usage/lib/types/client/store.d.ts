/**
 * Token usage statistics page store: one snapshot aggregated client-side from
 * the `session.list` projection column (the same zero-log-load baseline the
 * sidebar lists with). The host stays the single fact source — the page never
 * reads session files itself.
 */
import type { IApiClient, SessionSummary } from '@deepseek-ai/dsh-api-remotes/client';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** Provider-reported cumulative usage buckets (mirror of the token-meter projection). */
export interface TokenUsageProjection {
    uncachedInputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
}
/** One aggregated session row for the ranking table. */
export interface UsageSessionRow {
    sessionId: string;
    title: string | undefined;
    updatedAt: number;
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    turns: number;
    llmMs: number;
}
/** One day bucket in the daily series (local calendar days). */
export interface UsageDayBucket {
    /** ISO calendar day, e.g. `2026-08-15`. */
    day: string;
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    sessions: number;
}
/** Fully aggregated statistics view. */
export interface UsageStats {
    totals: {
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
        /** Sessions reporting any provider usage. */
        sessions: number;
    };
    llmMs: number;
    decodeTokens: number;
    turns: number;
    /** Daily series over the trailing window ending today (window length = DAYS). */
    byDay: readonly UsageDayBucket[];
    /** Sessions sorted by total tokens descending, capped at TOP_LIMIT. */
    topSessions: readonly UsageSessionRow[];
}
/** Page snapshot. */
export interface UsageStatsState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    /** Whole-load failure text. */
    error: string | null;
    stats: UsageStats | null;
    /** Wall-clock time of the last successful load, ms since epoch. */
    refreshedAt: number | null;
    /** Stats start marker: sessions updated before this time are excluded; null = full history. */
    resetAt: number | null;
}
/** Trailing daily-window length (local days) the aggregation keeps. */
export declare const DAYS = 30;
/** localStorage key holding the stats start marker (ms epoch, or absent for full history). */
export declare const RESET_KEY = "dsh.usage.resetAt";
/** Read the persisted stats start marker; storage failures degrade to full history. */
export declare function readResetAt(): number | null;
/** Persist (or clear) the stats start marker; storage failures are silent no-ops. */
export declare function writeResetAt(value: number | null): void;
/** Ranking table row cap. */
export declare const TOP_LIMIT = 50;
/**
 * Read the session row's tokenUsage projection value. The projection column
 * serves the flat bucket shape; a defensive branch also accepts the persisted
 * cache's folded `{ totals, last }` state shape should a deployment ever
 * surface it on the wire.
 * @param summary - one session.list row.
 * @returns the four buckets, zero-filled.
 */
export declare function usageOf(summary: SessionSummary): TokenUsageProjection;
/** Aggregate one session.list payload into the statistics view. */
export declare function aggregate(items: readonly SessionSummary[], resetAt?: number | null): UsageStats;
/** Human text for a rejected wire call. */
export declare function messageOf(error: unknown): string;
/** Token usage statistics page store. */
export declare class UsageStatsStore {
    private readonly api;
    /** The snapshot the section renders from (uSES-safe store). */
    readonly store: SnapshotStore<UsageStatsState>;
    /** Latest load wins; an older response never overwrites a newer one. */
    private generation;
    /**
     * @param api - the wire face (sessions domain).
     */
    constructor(api: Pick<IApiClient, 'sessions'>);
    /**
     * Refresh the whole page snapshot from `session.list`. A failure keeps the
     * last good stats and surfaces the error.
     * @returns nothing; the snapshot carries the outcome.
     */
    load(): Promise<void>;
}
/**
 * Refetch the page snapshot only after its first load: an unopened Usage
 * page must not fetch on background invalidations.
 * @param controller - the page store.
 */
export declare function refreshIfLoaded(controller: UsageStatsStore): void;
/**
 * Clear the stats: mark "now" as the aggregation start. Sessions keep their
 * records; only the usage view resets. Reversible via {@link restoreStats}.
 * @param controller - the page store.
 */
export declare function clearStats(controller: UsageStatsStore): void;
/**
 * Restore the full history view by removing the stats start marker.
 * @param controller - the page store.
 */
export declare function restoreStats(controller: UsageStatsStore): void;
//# sourceMappingURL=store.d.ts.map