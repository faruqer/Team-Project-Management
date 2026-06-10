import { describe, expect, it } from 'vitest';
import { sanitizeText } from './sanitize';

describe('XSS sanitization', () => {
  it('strips script tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('Hello');
  });

  it('strips event handlers', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('preserves plain text', () => {
    expect(sanitizeText('  Hello @team  ')).toBe('Hello @team');
  });
});
