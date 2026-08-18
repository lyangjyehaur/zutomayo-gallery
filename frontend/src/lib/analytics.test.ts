import { afterEach, describe, expect, it } from 'vitest';

import { appendUmamiScripts } from './analytics';

describe('appendUmamiScripts', () => {
  afterEach(() => {
    document.head.querySelectorAll('script[data-umami-script]').forEach((script) => script.remove());
  });

  it('loads the official Umami tracker and session recorder scripts', () => {
    expect(appendUmamiScripts()).toBe(2);

    const scripts = [...document.head.querySelectorAll<HTMLScriptElement>('script[data-umami-script]')];
    expect(scripts).toHaveLength(2);
    expect(scripts.map((script) => new URL(script.src).pathname)).toEqual([
      '/commons/commons.js',
      '/commons/telemetry.js',
    ]);
    expect(scripts.some((script) => script.src.includes('recorder.js'))).toBe(false);
  });

  it('does not inject either Umami script twice', () => {
    expect(appendUmamiScripts()).toBe(2);
    expect(appendUmamiScripts()).toBe(0);
    expect(document.head.querySelectorAll('script[data-umami-script]')).toHaveLength(2);
  });
});
