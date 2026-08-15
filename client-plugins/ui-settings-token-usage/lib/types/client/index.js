import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react';
import { UsageSection } from "./UsageSection.js";
import { HomepageSection } from "./HomepageSection.js";
import { refreshIfLoaded, UsageStatsStore } from "./store.js";
import { en, zh } from "./locales.js";
/** Dictionary namespace owned by this plugin. */
const NS = 'settings.usage';
/**
 * Required services (cordis fiber inject). The target slot is declared by
 * ui-settings' apply, whose activation order relative to this one is NOT
 * constrained; registration depends on each slot through `slots.inject()`.
 */
export const inject = ['slots', 'locale', 'connection', 'remote'];
/**
 * Register the Usage section once the `settings.section` declaration is on
 * the ledger, wire its store to the connection, and refetch on connection
 * resets once the page has loaded.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-token-usage: copy dictionaries');
    const connection = ctx.get('connection');
    const controller = new UsageStatsStore(connection.api);
    const useSnapshot = bindSnapshotSelector(controller.store);
    // Registration-time text (the nav label thunk) and the inject face share
    // one bound translate; copy freshness rides the locale revision.
    const t = ctx.locale.bind(NS);
    const injected = () => ({
        controller,
        useSnapshot,
        api: connection.api,
        t,
    });
    const homepageInjected = () => ({ t });
    // Pushed invalidations converge an open page without polling: a connection
    // reset (host restart / reconnect) refetches once the page loaded.
    ctx.effect(() => {
        const refresh = () => { refreshIfLoaded(controller); };
        const disposers = [
            ctx.on('connection/reset', refresh),
        ];
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'ui-settings-token-usage: pushed invalidations');
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'usage',
        order: 30,
        label: () => t('nav'),
        inject: injected,
    }, UsageSection));
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'homepage',
        order: 90,
        label: () => t('homepageNav'),
        inject: homepageInjected,
    }, HomepageSection));
}
//# sourceMappingURL=index.js.map