/**
 * Token usage statistics page store: one snapshot aggregated client-side from
 * the `session.list` projection column (the same zero-log-load baseline the
 * sidebar lists with). The host stays the single fact source — the page never
 * reads session files itself.
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** Trailing daily-window length (local days) the aggregation keeps. */
export const DAYS = 30;
/** localStorage key holding the stats start marker (ms epoch, or absent for full history). */
export const RESET_KEY = 'dsh.usage.resetAt';
/** Read the persisted stats start marker; storage failures degrade to full history. */
export function readResetAt() {
    try {
        const raw = localStorage.getItem(RESET_KEY);
        if (raw === null)
            return null;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
    }
    catch {
        return null;
    }
}
/** Persist (or clear) the stats start marker; storage failures are silent no-ops. */
export function writeResetAt(value) {
    try {
        if (value === null)
            localStorage.removeItem(RESET_KEY);
        else
            localStorage.setItem(RESET_KEY, String(value));
    }
    catch {
        // Storage unavailable: the clear stays in-memory for this session only.
    }
}
/** Ranking table row cap. */
export const TOP_LIMIT = 50;
const ZERO = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
function numberOr(value, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
/**
 * Read the session row's tokenUsage projection value. The projection column
 * serves the flat bucket shape; a defensive branch also accepts the persisted
 * cache's folded `{ totals, last }` state shape should a deployment ever
 * surface it on the wire.
 * @param summary - one session.list row.
 * @returns the four buckets, zero-filled.
 */
export function usageOf(summary) {
    const values = summary.projections?.values;
    const value = values?.tokenUsage;
    if (value === undefined || value === null || typeof value !== 'object')
        return ZERO;
    const record = value;
    const totals = record.totals;
    if (totals !== undefined && typeof totals === 'object') {
        return {
            uncachedInputTokens: numberOr(totals.uncachedInputTokens),
            outputTokens: numberOr(totals.outputTokens),
            cacheReadTokens: numberOr(totals.cacheReadTokens),
            cacheWriteTokens: numberOr(totals.cacheWriteTokens),
        };
    }
    return {
        uncachedInputTokens: numberOr(record.uncachedInputTokens),
        outputTokens: numberOr(record.outputTokens),
        cacheReadTokens: numberOr(record.cacheReadTokens),
        cacheWriteTokens: numberOr(record.cacheWriteTokens),
    };
}
/** Session-level stats projection value (turns / timings), zero-filled. */
function statsOf(summary) {
    const values = summary.projections?.values;
    const value = values?.sessionStats;
    if (value === undefined || value === null || typeof value !== 'object') {
        return { turns: 0, llmMs: 0, decodeTokens: 0 };
    }
    const record = value;
    return {
        turns: numberOr(record.turns),
        llmMs: numberOr(record.llmMs),
        decodeTokens: numberOr(record.decodeTokens),
    };
}
/** Title projection value, when one exists. */
function titleOf(summary) {
    const values = summary.projections?.values;
    const value = values?.title;
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
/** Local calendar day key for a timestamp. */
function dayKey(time) {
    const date = new Date(time);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}
/** Aggregate one session.list payload into the statistics view. */
export function aggregate(items, resetAt = null) {
    const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, sessions: 0 };
    let llmMs = 0;
    let decodeTokens = 0;
    let turns = 0;
    const byDayMap = new Map();
    const rows = [];
    for (const summary of items) {
        if (summary.blank)
            continue;
        if (resetAt !== null && summary.updatedAt < resetAt)
            continue;
        const usage = usageOf(summary);
        const stats = statsOf(summary);
        const total = usage.uncachedInputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
        if (total > 0) {
            totals.input += usage.uncachedInputTokens;
            totals.output += usage.outputTokens;
            totals.cacheRead += usage.cacheReadTokens;
            totals.cacheWrite += usage.cacheWriteTokens;
            totals.sessions += 1;
        }
        llmMs += stats.llmMs;
        decodeTokens += stats.decodeTokens;
        turns += stats.turns;
        const key = dayKey(summary.updatedAt);
        const bucket = byDayMap.get(key);
        if (bucket === undefined) {
            byDayMap.set(key, {
                day: key,
                input: usage.uncachedInputTokens,
                output: usage.outputTokens,
                cacheRead: usage.cacheReadTokens,
                cacheWrite: usage.cacheWriteTokens,
                sessions: total > 0 ? 1 : 0,
            });
        }
        else {
            bucket.input += usage.uncachedInputTokens;
            bucket.output += usage.outputTokens;
            bucket.cacheRead += usage.cacheReadTokens;
            bucket.cacheWrite += usage.cacheWriteTokens;
            if (total > 0)
                bucket.sessions += 1;
        }
        rows.push({
            sessionId: summary.sessionId,
            title: titleOf(summary),
            updatedAt: summary.updatedAt,
            input: usage.uncachedInputTokens,
            output: usage.outputTokens,
            cacheRead: usage.cacheReadTokens,
            cacheWrite: usage.cacheWriteTokens,
            turns: stats.turns,
            llmMs: stats.llmMs,
        });
    }
    // Trailing window: fill every calendar day so the chart never gaps.
    const byDay = [];
    const now = Date.now();
    for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
        const time = now - offset * 86_400_000;
        const key = dayKey(time);
        byDay.push(byDayMap.get(key) ?? { day: key, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, sessions: 0 });
    }
    const topSessions = rows
        .sort((a, b) => (b.input + b.output + b.cacheRead + b.cacheWrite) - (a.input + a.output + a.cacheRead + a.cacheWrite))
        .slice(0, TOP_LIMIT);
    return { totals, llmMs, decodeTokens, turns, byDay, topSessions };
}
/** Human text for a rejected wire call. */
export function messageOf(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
/** Token usage statistics page store. */
export class UsageStatsStore {
    api;
    /** The snapshot the section renders from (uSES-safe store). */
    store = createSnapshotStore({
        status: 'idle', error: null, stats: null, refreshedAt: null, resetAt: readResetAt(),
    });
    /** Latest load wins; an older response never overwrites a newer one. */
    generation = 0;
    /**
     * @param api - the wire face (sessions domain).
     */
    constructor(api) {
        this.api = api;
    }
    /**
     * Refresh the whole page snapshot from `session.list`. A failure keeps the
     * last good stats and surfaces the error.
     * @returns nothing; the snapshot carries the outcome.
     */
    async load() {
        const generation = ++this.generation;
        this.store.update((state) => { state.status = 'loading'; state.error = null; });
        try {
            const response = await this.api.sessions.list({});
            if (!response.result.ok)
                throw new Error(response.result.error.message);
            const stats = aggregate(response.result.value.items, readResetAt());
            if (generation !== this.generation)
                return;
            this.store.update((state) => {
                state.status = 'ready';
                state.stats = stats;
                state.resetAt = readResetAt();
                state.refreshedAt = Date.now();
            });
        }
        catch (error) {
            if (generation !== this.generation)
                return;
            this.store.update((state) => {
                state.status = 'error';
                state.error = messageOf(error);
            });
        }
    }
}
/**
 * Refetch the page snapshot only after its first load: an unopened Usage
 * page must not fetch on background invalidations.
 * @param controller - the page store.
 */
export function refreshIfLoaded(controller) {
    if (controller.store.getSnapshot().status === 'idle')
        return;
    void controller.load();
}
/**
 * Clear the stats: mark "now" as the aggregation start. Sessions keep their
 * records; only the usage view resets. Reversible via {@link restoreStats}.
 * @param controller - the page store.
 */
export function clearStats(controller) {
    writeResetAt(Date.now());
    void controller.load();
}
/**
 * Restore the full history view by removing the stats start marker.
 * @param controller - the page store.
 */
export function restoreStats(controller) {
    writeResetAt(null);
    void controller.load();
}
//# sourceMappingURL=store.js.map