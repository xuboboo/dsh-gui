import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Token usage statistics settings section: summary cards, a trailing daily
 * bar chart (pure CSS, no chart library), and a top-sessions table — all
 * aggregated from the session.list projection column.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { clearStats, DAYS, restoreStats } from "./store.js";
/** Format a token count compactly (1.2k / 3.4M). */
function formatTokens(value) {
    if (value >= 1_000_000)
        return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 10_000)
        return Math.round(value / 1_000) + 'k';
    if (value >= 1_000)
        return (value / 1_000).toFixed(1) + 'k';
    return String(value);
}
/** Format a duration compactly. */
function formatDuration(ms) {
    if (ms < 1_000)
        return ms + ' ms';
    if (ms < 60_000)
        return (ms / 1_000).toFixed(1) + ' s';
    return Math.round(ms / 60_000) + ' min';
}
/** MM-DD view of an ISO day key. */
function dayLabel(day) {
    return day.slice(5);
}
/** YYYY-MM-DD view of an epoch-ms timestamp (local time). */
function dateLabel(time) {
    const date = new Date(time);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}
/** Summary card row. */
function Card({ label, value, hint }) {
    return (_jsxs("div", { style: {
            flex: '1 1 120px',
            minWidth: 120,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))',
            background: 'var(--dsw-static-surface-raised, rgba(127,140,175,0.08))',
        }, children: [_jsx("div", { style: { fontSize: 12, opacity: 0.65 }, children: label }), _jsx("div", { style: { fontSize: 17, fontWeight: 600, marginTop: 2 }, title: hint, children: value })] }));
}
/** One day column in the stacked bar chart. */
function DayBar({ bucket, index, max, showLabel }) {
    const inputHeight = max > 0 ? Math.max((bucket.input / max) * 100, bucket.input > 0 ? 2 : 0) : 0;
    const outputHeight = max > 0 ? Math.max((bucket.output / max) * 100, bucket.output > 0 ? 2 : 0) : 0;
    void index;
    return (_jsxs("div", { style: { flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }, children: [_jsxs("div", { style: {
                    height: 96,
                    width: '100%',
                    maxWidth: 22,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    justifyContent: 'flex-start',
                    background: 'var(--dsw-static-surface-raised, rgba(127,140,175,0.06))',
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                }, title: `${bucket.day} — ${formatTokens(bucket.input)} in / ${formatTokens(bucket.output)} out`, children: [_jsx("div", { style: {
                            height: outputHeight + '%',
                            background: 'var(--dsw-static-deepseek-400, #7e8ffe)',
                            opacity: 0.92,
                        } }), _jsx("div", { style: {
                            height: inputHeight + '%',
                            background: 'var(--dsw-static-deepseek-600, #3750dc)',
                        } })] }), _jsx("div", { style: { fontSize: 10, opacity: showLabel ? 0.8 : 0.25 }, children: dayLabel(bucket.day) })] }));
}
/** Top-sessions table row. */
function SessionRow({ row }) {
    const total = row.input + row.output + row.cacheRead + row.cacheWrite;
    return (_jsxs("tr", { children: [_jsx("td", { style: { padding: '6px 8px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: row.title, children: row.title ?? row.sessionId.slice(0, 8) }), _jsx("td", { style: { padding: '6px 8px', whiteSpace: 'nowrap', opacity: 0.7 }, children: dayLabel(new Date(row.updatedAt).toISOString().slice(0, 10)) }), _jsx("td", { style: { padding: '6px 8px', textAlign: 'right' }, children: formatTokens(row.input) }), _jsx("td", { style: { padding: '6px 8px', textAlign: 'right' }, children: formatTokens(row.output) }), _jsx("td", { style: { padding: '6px 8px', textAlign: 'right', opacity: 0.75 }, children: formatTokens(row.cacheRead + row.cacheWrite) }), _jsx("td", { style: { padding: '6px 8px', textAlign: 'right', fontWeight: 600 }, children: formatTokens(total) })] }));
}
/**
 * The settings section body. Loads once on mount; the Refresh button and the
 * connection-reset invalidation refetch after the first load.
 */
export function UsageSection({ controller, useSnapshot, t }) {
    const snapshot = useSnapshot(state => state);
    const [rangeDays, setRangeDays] = useState(7);
    const [confirmOpen, setConfirmOpen] = useState(false);
    useEffect(() => {
        void controller.load();
    }, [controller]);
    const stats = snapshot.stats;
    const visibleDays = useMemo(() => {
        if (stats === null)
            return [];
        return stats.byDay.slice(DAYS - rangeDays);
    }, [stats, rangeDays]);
    const maxDaily = useMemo(() => {
        let max = 0;
        for (const bucket of visibleDays) {
            const total = bucket.input + bucket.output;
            if (total > max)
                max = total;
        }
        return max;
    }, [visibleDays]);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 2px 12px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: { flex: '1 1 auto', fontSize: 14, opacity: 0.75, minWidth: 0 }, children: t('intro') }), _jsxs("div", { style: { display: 'flex', flexShrink: 0, gap: 8, alignItems: 'center' }, children: [snapshot.resetAt !== null && (_jsx("span", { style: {
                                    fontSize: 12,
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    opacity: 0.85,
                                    background: 'var(--dsw-static-surface-raised, rgba(127,140,175,0.10))',
                                    border: '1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))',
                                    whiteSpace: 'nowrap',
                                }, children: t('statsSince').replace('{date}', dateLabel(snapshot.resetAt)) })), snapshot.resetAt !== null
                                ? (_jsx(Button, { onClick: () => { restoreStats(controller); }, disabled: snapshot.status === 'loading', children: t('restoreStats') }))
                                : (_jsx(Button, { variant: "outline", onClick: () => { setConfirmOpen(true); }, disabled: snapshot.status === 'loading', children: t('clearStats') })), _jsx(Button, { onClick: () => { void controller.load(); }, disabled: snapshot.status === 'loading', children: t('refresh') })] })] }), _jsx(Modal, { open: confirmOpen, onClose: () => { setConfirmOpen(false); }, title: t('clearConfirmTitle'), closeLabel: t('cancel'), description: t('clearConfirmBody'), footer: (_jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx(Button, { onClick: () => { setConfirmOpen(false); }, children: t('cancel') }), _jsx(Button, { variant: "primary", onClick: () => {
                                setConfirmOpen(false);
                                clearStats(controller);
                            }, children: t('clearConfirm') })] })) }), snapshot.status === 'error' && (_jsxs("div", { style: {
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--dsw-static-danger-500, rgba(224,86,86,0.4))',
                    color: 'var(--dsw-static-danger-500, #e05656)',
                    fontSize: 13,
                }, children: [t('loadFailed'), ": ", snapshot.error] })), stats === null && snapshot.status !== 'error' && snapshot.status !== 'loading' && (_jsx("div", { style: { padding: '26px 12px', textAlign: 'center', opacity: 0.6, fontSize: 13 }, children: t('noData') })), stats !== null && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx(Card, { label: t('totalTokens'), value: formatTokens(stats.totals.input + stats.totals.output), hint: `in ${formatTokens(stats.totals.input)} + out ${formatTokens(stats.totals.output)}` }), _jsx(Card, { label: t('inputTokens'), value: formatTokens(stats.totals.input) }), _jsx(Card, { label: t('outputTokens'), value: formatTokens(stats.totals.output) }), _jsx(Card, { label: t('cacheTokens'), value: formatTokens(stats.totals.cacheRead + stats.totals.cacheWrite), hint: `read ${formatTokens(stats.totals.cacheRead)} / write ${formatTokens(stats.totals.cacheWrite)}` }), _jsx(Card, { label: t('sessions'), value: String(stats.totals.sessions) }), _jsx(Card, { label: t('llmTime'), value: formatDuration(stats.llmMs) })] }), _jsxs("div", { style: {
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))',
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600 }, children: t('daily') }), _jsx("div", { style: { display: 'flex', gap: 6 }, children: [7, 30].map(days => (_jsx(Button, { size: "sm", variant: rangeDays === days ? 'primary' : 'ghost', onClick: () => { setRangeDays(days); }, children: days === 7 ? t('range7') : t('range30') }, days))) })] }), maxDaily === 0
                                ? _jsx("div", { style: { padding: '18px 0', textAlign: 'center', opacity: 0.55, fontSize: 13 }, children: t('noData') })
                                : (_jsx("div", { style: { display: 'flex', gap: 3, alignItems: 'flex-end' }, children: visibleDays.map((bucket, index) => (_jsx(DayBar, { bucket: bucket, index: index, max: maxDaily, showLabel: index % 5 === 0 || index === visibleDays.length - 1 }, bucket.day))) }))] }), stats.topSessions.length > 0 && (_jsxs("div", { style: {
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))',
                        }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, marginBottom: 8 }, children: t('topSessions') }), _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { opacity: 0.65 }, children: [_jsx("th", { style: { textAlign: 'left', padding: '4px 8px', fontWeight: 500 }, children: t('session') }), _jsx("th", { style: { textAlign: 'left', padding: '4px 8px', fontWeight: 500 }, children: t('updated') }), _jsx("th", { style: { textAlign: 'right', padding: '4px 8px', fontWeight: 500 }, children: t('inputTokens') }), _jsx("th", { style: { textAlign: 'right', padding: '4px 8px', fontWeight: 500 }, children: t('outputTokens') }), _jsx("th", { style: { textAlign: 'right', padding: '4px 8px', fontWeight: 500 }, children: t('cacheTokens') }), _jsx("th", { style: { textAlign: 'right', padding: '4px 8px', fontWeight: 500 }, children: t('total') })] }) }), _jsx("tbody", { children: stats.topSessions.map(row => _jsx(SessionRow, { row: row }, row.sessionId)) })] }) })] }))] }))] }));
}
//# sourceMappingURL=UsageSection.js.map