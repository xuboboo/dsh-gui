import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const PROJECT_URL = 'https://github.com/xuboboo/dsh-gui';
const RELEASES_URL = 'https://github.com/xuboboo/dsh-gui/releases';
/** The settings section body: project intro + links. */
export function HomepageSection({ t }) {
    const linkStyle = {
        color: 'var(--dsw-static-deepseek-500, #4d6bfe)',
        textDecoration: 'none',
        fontWeight: 600,
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 2px 12px' }, children: [_jsx("div", { style: { fontSize: 14, opacity: 0.75, lineHeight: 1.7 }, children: t('homepageIntro') }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("a", { href: PROJECT_URL, target: "_blank", rel: "noopener noreferrer", style: linkStyle, children: [t('homepageLink'), " \u2197"] }), _jsxs("a", { href: RELEASES_URL, target: "_blank", rel: "noopener noreferrer", style: linkStyle, children: [t('homepageReleases'), " \u2197"] })] }), _jsx("div", { style: { fontSize: 12, opacity: 0.55, lineHeight: 1.6 }, children: t('homepageNote') })] }));
}
//# sourceMappingURL=HomepageSection.js.map