/**
 * Resolves a CSS URL from a string.
 *
 * @example
 * resolveCssUrl('url("https://example.com/style.css")') // "https://example.com/style.css"
 * resolveCssUrl('url(https://example.com/style.css)') // "https://example.com/style.css"
 * resolveCssUrl('https://example.com/style.css') // "https://example.com/style.css"
 * resolveCssUrl('url("../profiles/a.icc")', 'https://example.com/css/style.css') // "https://example.com/profiles/a.icc"
 * @param value
 * @param base Optional base URL (stylesheet location or document).
 * @returns The resolved CSS URL.
 */
export function resolveCssUrl(value: string, base?: string): string {
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

  if (base) {
    return new URL(resolved, base).href;
  }

  return resolved;
}
