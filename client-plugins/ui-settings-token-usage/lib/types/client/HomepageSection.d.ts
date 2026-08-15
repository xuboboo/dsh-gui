/**
 * Project homepage settings section: a pointer to the dsh-gui project
 * (GitHub repository + releases). Links open through the host's window-open
 * handler, which routes http(s) targets to the system browser.
 */
import type { UsageKey } from './locales.ts';
/** Injected props the settings shell supplies to this section. */
export interface HomepageSectionInjected {
    t: (key: UsageKey) => string;
}
/** Section props: the injected face, nothing else. */
export type HomepageSectionProps = HomepageSectionInjected;
/** The settings section body: project intro + links. */
export declare function HomepageSection({ t }: HomepageSectionProps): JSX.Element;
//# sourceMappingURL=HomepageSection.d.ts.map