/**
 * Token usage statistics settings plugin, browser half. It registers the
 * Usage page (settings.section entry 'usage'), loading its data from the
 * session.list projection column on demand.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type UsageKey } from './locales.ts';
export type { UsageSectionInjected, UsageSectionProps } from './UsageSection.tsx';
export type { UsageKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The Token usage statistics page copy. */
        'settings.usage': UsageKey;
    }
}
/**
 * Required services (cordis fiber inject). The target slot is declared by
 * ui-settings' apply, whose activation order relative to this one is NOT
 * constrained; registration depends on each slot through `slots.inject()`.
 */
export declare const inject: string[];
/**
 * Register the Usage section once the `settings.section` declaration is on
 * the ledger, wire its store to the connection, and refetch on connection
 * resets once the page has loaded.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map