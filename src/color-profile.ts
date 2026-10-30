import {
  CssAtRuleAST,
  CssGenericAtRuleAST,
  CssStylesheetAST,
  CssTypes,
  parse,
} from '@adobe/css-tools';
import { resolveCssUrl } from './utils';

function isColorProfileRule(rule: CssAtRuleAST): rule is CssGenericAtRuleAST {
  return rule.type === CssTypes.atRule && rule.name === 'color-profile';
}

/**
 * Returns the resolved `src` of a `@color-profile device-cmyk` rule, or undefined.
 */
export function deviceCmykProfileSrcFromRule(rule: CssAtRuleAST, base: string): string | undefined {
  if (!isColorProfileRule(rule)) {
    return undefined;
  }

  if (rule.prelude.trim() !== 'device-cmyk') {
    return undefined;
  }

  const declaration = rule.rules?.find(
    (item) => item.type === CssTypes.declaration && item.property === 'src'
  );

  if (!declaration || declaration.type !== CssTypes.declaration) {
    return undefined;
  }

  const value = declaration.value.trim();

  if (!value.toLowerCase().startsWith('url(')) {
    return undefined;
  }

  return resolveCssUrl(value, base);
}

/**
 * Last `@color-profile device-cmyk` `src` in the stylesheet, resolved against `base`.
 * Ignores dashed-ident profiles. Does not follow `@import`.
 */
export function collectDeviceCmykProfileSrc(
  css: string | CssStylesheetAST,
  base: string
): string | undefined {
  const ast = typeof css === 'string' ? parse(css) : css;
  let src: string | undefined;

  for (const rule of ast.stylesheet.rules) {
    const found = deviceCmykProfileSrcFromRule(rule, base);

    if (found) {
      src = found;
    }
  }

  return src;
}
