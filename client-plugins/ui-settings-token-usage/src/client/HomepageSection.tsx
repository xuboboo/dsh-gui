/**
 * Project homepage settings section: a pointer to the dsh-gui project
 * (GitHub repository + releases). Links open through the host's window-open
 * handler, which routes http(s) targets to the system browser.
 */

import type { UsageKey } from './locales.ts'

/** Injected props the settings shell supplies to this section. */
export interface HomepageSectionInjected {
  t: (key: UsageKey) => string
}

/** Section props: the injected face, nothing else. */
export type HomepageSectionProps = HomepageSectionInjected

const PROJECT_URL = 'https://github.com/xuboboo/dsh-gui'
const RELEASES_URL = 'https://github.com/xuboboo/dsh-gui/releases'

/** The settings section body: project intro + links. */
export function HomepageSection({ t }: HomepageSectionProps): JSX.Element {
  const linkStyle = {
    color: 'var(--dsw-static-deepseek-500, #4d6bfe)',
    textDecoration: 'none',
    fontWeight: 600,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 2px 12px' }}>
      <div style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.7 }}>{t('homepageIntro')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a href={PROJECT_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {t('homepageLink')} ↗
        </a>
        <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {t('homepageReleases')} ↗
        </a>
      </div>
      <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.6 }}>{t('homepageNote')}</div>
    </div>
  )
}
