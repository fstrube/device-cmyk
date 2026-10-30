import { CssRuleAST, CssStylesheetAST, parse, stringify } from '@adobe/css-tools';
import { deviceCmykProfileSrcFromRule } from './color-profile';
import { resolveCssUrl } from './utils';
import ICCProfile from './icc-profile';

export default class DeviceCMYK {
  private static originalStyleDescriptor?: PropertyDescriptor;

  private static originalStyles: Map<HTMLElement, string> = new Map();

  private static cache: Map<number[], number[]> = new Map();

  private static observer?: MutationObserver;

  private static profile?: ICCProfile;

  private static async expandImports(css: CssStylesheetAST, base: string, found: { src?: string }) {
    const rules = css.stylesheet.rules;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];

      if ('import' in rule) {
        const importUrl = resolveCssUrl(rule.import, base);
        const importCss = parse(await fetch(importUrl).then((response) => response.text()));

        await this.expandImports(importCss, importUrl, found);

        rules.splice(i, 1, ...importCss.stylesheet.rules);
        i += importCss.stylesheet.rules.length - 1;
        continue;
      }

      const profileSrc = deviceCmykProfileSrcFromRule(rule, base);

      if (profileSrc) {
        found.src = profileSrc;
      }
    }
  }

  private static rewriteStylesheet(css: CssStylesheetAST) {
    const traverse = (rulesOrDeclarations: any[]) => {
      return rulesOrDeclarations?.map((ruleOrDeclaration: any) => {
        if ('rules' in ruleOrDeclaration) {
          ruleOrDeclaration.rules = traverse(ruleOrDeclaration.rules);
        }

        if ('declarations' in ruleOrDeclaration) {
          ruleOrDeclaration.declarations = traverse(ruleOrDeclaration.declarations);
        }

        if (ruleOrDeclaration.type === 'declaration') {
          ruleOrDeclaration.value = this.correctDeclarationValue(ruleOrDeclaration.value);
        }

        return ruleOrDeclaration;
      });
    };

    css.stylesheet.rules = traverse(css.stylesheet.rules);
  }

  private static async correct(explicitProfile?: ICCProfile) {
    const stylesheets = Array.from(document.styleSheets);
    const prepared: { owner: HTMLStyleElement | HTMLLinkElement; css: CssStylesheetAST }[] = [];
    const found: { src?: string } = {};

    for (const stylesheet of stylesheets) {
      if (stylesheet.ownerNode instanceof HTMLStyleElement) {
        const css = parse(stylesheet.ownerNode.textContent!);

        this.originalStyles.set(stylesheet.ownerNode, stylesheet.ownerNode.textContent!);

        await this.expandImports(css, document.baseURI, found);

        prepared.push({ owner: stylesheet.ownerNode, css });
      } else if (stylesheet.ownerNode instanceof HTMLLinkElement) {
        const href = stylesheet.ownerNode.href;
        const css = parse(await fetch(href).then((response) => response.text()));

        this.originalStyles.set(stylesheet.ownerNode, href);

        await this.expandImports(css, href, found);

        prepared.push({ owner: stylesheet.ownerNode, css });
      }
    }

    if (explicitProfile) {
      this.setProfile(explicitProfile);
    } else if (found.src) {
      this.setProfile(await ICCProfile.open(found.src));
    } else {
      this.setProfile(undefined);
    }

    for (const { owner, css } of prepared) {
      this.rewriteStylesheet(css);

      if (owner instanceof HTMLStyleElement) {
        owner.textContent = stringify(css);
      } else if (owner instanceof HTMLLinkElement) {
        owner.href = 'data:text/css;base64,' + btoa(stringify(css));
      } else {
        console.warn('Unknown owner type:', owner);
      }
    }

    const elements = Array.from(document.querySelectorAll('*'));

    for (const node of elements) {
      this.correctInlineStyles(node as HTMLElement);
    }
  }

  static disconnect() {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  static async init(profile?: ICCProfile) {
    await this.restore();

    await this.correct(profile);

    this.initObserver();

    this.initProxy();
  }

  private static initObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const element = mutation.target as HTMLElement;
          this.originalStyles.delete(element);
          this.correctInlineStyles(element);
        }
      }
    });

    this.observer!.observe(document.body, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
    });
  }

  private static initProxy() {
    if (!this.originalStyleDescriptor) {
      const self = this;

      this.originalStyleDescriptor = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'style'
      );

      Object.defineProperty(HTMLElement.prototype, 'style', {
        configurable: true,
        enumerable: true,
        get() {
          const element = this as HTMLElement;
          const style = self.originalStyleDescriptor?.get?.call(element);

          return new Proxy(style, {
            get(target, prop) {
              const value = target[prop as any];

              if (typeof value === 'function') {
                return function (...args: any[]) {
                  if (prop === 'setProperty') {
                    let original =
                      self.originalStyles.get(element) || element.getAttribute('style') || '';
                    const property = (args[0] as string).replace(/([A-Z])/g, '-$1').toLowerCase();

                    // Set the original styles of the element
                    const css = parse(`* { ${original} }`);
                    const rule = css.stylesheet.rules[0] as CssRuleAST;

                    for (const declaration of rule.declarations) {
                      if (declaration.type === 'declaration' && declaration.property === property) {
                        declaration.value = args[1];
                      }
                    }

                    original = stringify(css).slice('* {'.length, -1);

                    self.originalStyles.set(element, original);

                    args[1] = self.correctDeclarationValue(args[1]);
                  }

                  const result = value.apply(target, args);

                  if (prop === 'setProperty') {
                    self.observer?.takeRecords();
                  }

                  return result;
                };
              }

              return value;
            },
            set(target, prop, value) {
              let original =
                self.originalStyles.get(element) || element.getAttribute('style') || '';
              const property = (prop as string).replace(/([A-Z])/g, '-$1').toLowerCase();

              // Set the original styles of the element
              const css = parse(`* { ${original} }`);
              const rule = css.stylesheet.rules[0] as CssRuleAST;

              for (const declaration of rule.declarations) {
                if (declaration.type === 'declaration' && declaration.property === property) {
                  declaration.value = value;
                }
              }

              original = stringify(css).slice('* {'.length, -1);

              self.originalStyles.set(element, original);

              target[prop as any] = self.correctDeclarationValue(value);

              self.observer?.takeRecords();

              return true;
            },
          });
        },
      });
    }
  }

  private static correctDeclarationValue(value: string) {
    try {
      return value.replace(/device-cmyk\([^)]+\)/, (match) => this.parseCMYK(match));
    } catch (error) {
      console.error(error);
      return value;
    }
  }

  private static correctInlineStyles(node: HTMLElement) {
    const style = node.getAttribute('style')!;

    if (!style) {
      return;
    }

    const original = this.originalStyles.get(node) || style;
    const corrected = this.correctDeclarationValue(style);

    if (corrected !== style) {
      this.originalStyles.set(node, original);

      node.setAttribute('style', corrected);

      this.observer?.takeRecords();
    }
  }

  static parseCMYK(value: string): string {
    let match = value.match(/device-cmyk\(([^)]+)\)/)?.[1];

    if (!match) {
      throw new Error(`Invalid CMYK value: ${value}`);
    }

    let [cmyk, alpha = 1] = match.trim().split('/', 2);

    const parts = (match.includes(',') ? cmyk.split(',') : cmyk.split(/\s+/)).filter(
      (part) => part.trim() !== ''
    );

    if (parts.length !== 4) {
      throw new Error(`Invalid CMYK value: ${value}`);
    }

    let [c, m, y, k] = parts.map((part) => {
      if (part.trim() === 'none') {
        return 0;
      }

      return `${part.trim()}`.endsWith('%')
        ? Number(`${part.trim()}`.slice(0, -1)) / 100
        : Number(`${part.trim()}`);
    });

    alpha = `${alpha || 1}`.endsWith('%')
      ? Number(`${alpha || 1}`.slice(0, -1)) / 100
      : Number(`${alpha || 1}`);

    const [r, g, b] = this.transform(c, m, y, k);

    return `rgba(${r},${g},${b},${alpha})`;
  }

  static async restore() {
    this.disconnect();

    const promises = [];

    const entries = Array.from(this.originalStyles.entries());

    for (const [node, original] of entries) {
      if (node instanceof HTMLStyleElement) {
        node.textContent = original;
      } else if (node instanceof HTMLLinkElement) {
        promises.push(
          new Promise((resolve) => {
            node.addEventListener('load', () => resolve(true), { once: true });
          })
        );
        node.href = original;
      } else if (node instanceof HTMLElement) {
        node.setAttribute('style', original);
      }
    }

    if (this.originalStyleDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'style', this.originalStyleDescriptor);

      this.originalStyleDescriptor = undefined;
    }

    this.originalStyles.clear();

    this.cache.clear();

    await Promise.all(promises);
  }

  static setProfile(profile?: ICCProfile) {
    this.profile = profile;
    this.cache.clear();
  }

  static transform(c: number, m: number, y: number, k: number): number[] {
    if (this.cache.has([c, m, y, k])) {
      return this.cache.get([c, m, y, k])!;
    }

    const transform = this.profile
      ? this.profile.transform
      : (c: number, m: number, y: number, k: number) => {
          let r;
          let g;
          let b;

          const clamp = (value: number) => Math.max(0, Math.min(value, 255));

          r = clamp(Math.round(255 * (1 - c) * (1 - k)));
          g = clamp(Math.round(255 * (1 - m) * (1 - k)));
          b = clamp(Math.round(255 * (1 - y) * (1 - k)));

          return [r, g, b];
        };

    const transformed = transform(c, m, y, k);

    this.cache.set([c, m, y, k], transformed);

    return transformed;
  }
}
