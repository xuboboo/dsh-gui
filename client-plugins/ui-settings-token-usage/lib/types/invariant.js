/** Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-settings-token-usage`. */
export const name = 'client-ui-settings-token-usage-invariant';
/**
 * Confirm the package under test really is this package.
 * @param expected - the package name this invariant guards.
 */
export function invariant(expected) {
    if (expected !== '@deepseek-ai/dsh-client-ui-settings-token-usage') {
        throw new Error('invariant: unexpected package under test: ' + expected);
    }
}
//# sourceMappingURL=invariant.js.map