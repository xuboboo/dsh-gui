/**
 * Token usage statistics settings section: summary cards, a trailing daily
 * bar chart (pure CSS, no chart library), and a top-sessions table — all
 * aggregated from the session.list projection column.
 */

import { useEffect, useMemo, useState } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-web-react'
import { clearStats, DAYS, restoreStats, UsageStatsStore, type UsageStatsState, type UsageSessionRow, type UsageDayBucket } from './store.ts'
import type { UsageKey } from './locales.ts'

/** Injected props the settings shell supplies to this section. */
export interface UsageSectionInjected {
  controller: UsageStatsStore
  useSnapshot: SnapshotSelectorHook<UsageStatsState>
  api: IApiClient
  t: (key: UsageKey) => string
}

/** Section props: the injected face, nothing else. */
export type UsageSectionProps = UsageSectionInjected

/** Format a token count compactly (1.2k / 3.4M). */
function formatTokens(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 10_000) return Math.round(value / 1_000) + 'k'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'k'
  return String(value)
}

/** Format a duration compactly. */
function formatDuration(ms: number): string {
  if (ms < 1_000) return ms + ' ms'
  if (ms < 60_000) return (ms / 1_000).toFixed(1) + ' s'
  return Math.round(ms / 60_000) + ' min'
}

/** MM-DD view of an ISO day key. */
function dayLabel(day: string): string {
  return day.slice(5)
}

/** YYYY-MM-DD view of an epoch-ms timestamp (local time). */
function dateLabel(time: number): string {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Summary card row. */
function Card({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div style={{
      flex: '1 1 120px',
      minWidth: 120,
      padding: '10px 12px',
      borderRadius: 8,
      border: '1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))',
      background: 'var(--dsw-static-surface-raised, rgba(127,140,175,0.08))',
    }}>
      <div style={{ fontSize: 12, opacity: 0.65 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }} title={hint}>{value}</div>
    </div>
  )
}

/** One day column in the stacked bar chart. */
function DayBar({ bucket, index, max, showLabel }: {
  bucket: UsageDayBucket
  index: number
  max: number
  showLabel: boolean
}): JSX.Element {
  const inputHeight = max > 0 ? Math.max((bucket.input / max) * 100, bucket.input > 0 ? 2 : 0) : 0
  const outputHeight = max > 0 ? Math.max((bucket.output / max) * 100, bucket.output > 0 ? 2 : 0) : 0
  void index
  return (
    <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
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
      }} title={`${bucket.day} — ${formatTokens(bucket.input)} in / ${formatTokens(bucket.output)} out`}>
        <div style={{
          height: outputHeight + '%',
          background: 'var(--dsw-static-deepseek-400, #7e8ffe)',
          opacity: 0.92,
        }} />
        <div style={{
          height: inputHeight + '%',
          background: 'var(--dsw-static-deepseek-600, #3750dc)',
        }} />
      </div>
      <div style={{ fontSize: 10, opacity: showLabel ? 0.8 : 0.25 }}>{dayLabel(bucket.day)}</div>
    </div>
  )
}

/** Top-sessions table row. */
function SessionRow({ row }: { row: UsageSessionRow }): JSX.Element {
  const total = row.input + row.output + row.cacheRead + row.cacheWrite
  return (
    <tr>
      <td style={{ padding: '6px 8px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.title}>
        {row.title ?? row.sessionId.slice(0, 8)}
      </td>
      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', opacity: 0.7 }}>{dayLabel(new Date(row.updatedAt).toISOString().slice(0, 10))}</td>
      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatTokens(row.input)}</td>
      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatTokens(row.output)}</td>
      <td style={{ padding: '6px 8px', textAlign: 'right', opacity: 0.75 }}>{formatTokens(row.cacheRead + row.cacheWrite)}</td>
      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatTokens(total)}</td>
    </tr>
  )
}

/**
 * The settings section body. Loads once on mount; the Refresh button and the
 * connection-reset invalidation refetch after the first load.
 */
export function UsageSection({ controller, useSnapshot, t }: UsageSectionProps): JSX.Element {
  const snapshot = useSnapshot(state => state)
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    void controller.load()
  }, [controller])

  const stats = snapshot.stats
  const visibleDays = useMemo(() => {
    if (stats === null) return []
    return stats.byDay.slice(DAYS - rangeDays)
  }, [stats, rangeDays])
  const maxDaily = useMemo(() => {
    let max = 0
    for (const bucket of visibleDays) {
      const total = bucket.input + bucket.output
      if (total > max) max = total
    }
    return max
  }, [visibleDays])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 2px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: '1 1 auto', fontSize: 14, opacity: 0.75, minWidth: 0 }}>{t('intro')}</div>
        <div style={{ display: 'flex', flexShrink: 0, gap: 8, alignItems: 'center' }}>
          {snapshot.resetAt !== null && (
            <span style={{
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 6,
              opacity: 0.85,
              background: 'var(--dsw-static-surface-raised, rgba(127,140,175,0.10))',
              border: '1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))',
              whiteSpace: 'nowrap',
            }}>
              {t('statsSince').replace('{date}', dateLabel(snapshot.resetAt))}
            </span>
          )}
          {snapshot.resetAt !== null
            ? (
              <Button onClick={() => { restoreStats(controller) }} disabled={snapshot.status === 'loading'}>
                {t('restoreStats')}
              </Button>
            )
            : (
              <Button variant="outline" onClick={() => { setConfirmOpen(true) }} disabled={snapshot.status === 'loading'}>
                {t('clearStats')}
              </Button>
            )}
          <Button onClick={() => { void controller.load() }} disabled={snapshot.status === 'loading'}>
            {t('refresh')}
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false) }}
        title={t('clearConfirmTitle')}
        closeLabel={t('cancel')}
        description={t('clearConfirmBody')}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setConfirmOpen(false) }}>{t('cancel')}</Button>
            <Button variant="primary" onClick={() => {
              setConfirmOpen(false)
              clearStats(controller)
            }}>{t('clearConfirm')}</Button>
          </div>
        )}
      />

      {snapshot.status === 'error' && (
        <div style={{
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid var(--dsw-static-danger-500, rgba(224,86,86,0.4))',
          color: 'var(--dsw-static-danger-500, #e05656)',
          fontSize: 13,
        }}>
          {t('loadFailed')}: {snapshot.error}
        </div>
      )}

      {stats === null && snapshot.status !== 'error' && snapshot.status !== 'loading' && (
        <div style={{ padding: '26px 12px', textAlign: 'center', opacity: 0.6, fontSize: 13 }}>{t('noData')}</div>
      )}

      {stats !== null && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Card label={t('totalTokens')} value={formatTokens(stats.totals.input + stats.totals.output)} hint={`in ${formatTokens(stats.totals.input)} + out ${formatTokens(stats.totals.output)}`} />
            <Card label={t('inputTokens')} value={formatTokens(stats.totals.input)} />
            <Card label={t('outputTokens')} value={formatTokens(stats.totals.output)} />
            <Card label={t('cacheTokens')} value={formatTokens(stats.totals.cacheRead + stats.totals.cacheWrite)} hint={`read ${formatTokens(stats.totals.cacheRead)} / write ${formatTokens(stats.totals.cacheWrite)}`} />
            <Card label={t('sessions')} value={String(stats.totals.sessions)} />
            <Card label={t('llmTime')} value={formatDuration(stats.llmMs)} />
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t('daily')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([7, 30] as const).map(days => (
                  <Button key={days} size="sm" variant={rangeDays === days ? 'primary' : 'ghost'}
                    onClick={() => { setRangeDays(days) }}>
                    {days === 7 ? t('range7') : t('range30')}
                  </Button>
                ))}
              </div>
            </div>
            {maxDaily === 0
              ? <div style={{ padding: '18px 0', textAlign: 'center', opacity: 0.55, fontSize: 13 }}>{t('noData')}</div>
              : (
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                  {visibleDays.map((bucket, index) => (
                    <DayBar key={bucket.day} bucket={bucket} index={index} max={maxDaily}
                      showLabel={index % 5 === 0 || index === visibleDays.length - 1} />
                  ))}
                </div>
              )}
          </div>

          {stats.topSessions.length > 0 && (
            <div style={{
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid var(--dsw-static-border-subtle, rgba(127,140,175,0.22))',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('topSessions')}</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ opacity: 0.65 }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>{t('session')}</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>{t('updated')}</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>{t('inputTokens')}</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>{t('outputTokens')}</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>{t('cacheTokens')}</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSessions.map(row => <SessionRow key={row.sessionId} row={row} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
