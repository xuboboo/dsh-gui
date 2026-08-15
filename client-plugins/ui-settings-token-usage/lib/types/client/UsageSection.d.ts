/**
 * Token usage statistics settings section: summary cards, a trailing daily
 * bar chart (pure CSS, no chart library), and a top-sessions table — all
 * aggregated from the session.list projection column.
 */
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-web-react';
import { UsageStatsStore, type UsageStatsState } from './store.ts';
import type { UsageKey } from './locales.ts';
/** Injected props the settings shell supplies to this section. */
export interface UsageSectionInjected {
    controller: UsageStatsStore;
    useSnapshot: SnapshotSelectorHook<UsageStatsState>;
    api: IApiClient;
    t: (key: UsageKey) => string;
}
/** Section props: the injected face, nothing else. */
export type UsageSectionProps = UsageSectionInjected;
/**
 * The settings section body. Loads once on mount; the Refresh button and the
 * connection-reset invalidation refetch after the first load.
 */
export declare function UsageSection({ controller, useSnapshot, t }: UsageSectionProps): JSX.Element;
//# sourceMappingURL=UsageSection.d.ts.map