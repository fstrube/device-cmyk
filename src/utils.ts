/**
 * Resolves a CSS URL from a string.
 *
 * @example
 * resolveCssUrl('url("https://example.com/style.css")') // "https://example.com/style.css"
 * resolveCssUrl('url(https://example.com/style.css)') // "https://example.com/style.css"
 * resolveCssUrl('https://example.com/style.css') // "https://example.com/style.css"
 * @param value
 * @returns The resolved CSS URL.
 */
export function resolveCssUrl(value: string): string {
    let resolved: string = value;

    // url
    if (resolved.startsWith('url(') && resolved.endsWith(')')) {
        resolved = resolved.slice(4, -1);
    }

    // string double-quoted
    if (resolved.startsWith('"') && resolved.endsWith('"')) {
        resolved = resolved.slice(1, -1);
    }

    // string single-quoted
    if (resolved.startsWith("'") && resolved.endsWith("'")) {
        resolved = resolved.slice(1, -1);
    }

    if (!resolved) {
        throw new Error(`Invalid CSS URL: ${value}`);
    }

    return resolved;
}
