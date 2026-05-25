import { describe, it, expect } from 'vitest';
import pt from '../locales/pt';
import en from '../locales/en';
import es from '../locales/es';

describe('Locale completeness', () => {
  const ptKeys = Object.keys(pt).sort();
  const enKeys = Object.keys(en).sort();
  const esKeys = Object.keys(es).sort();

  it('PT locale has translations', () => {
    expect(ptKeys.length).toBeGreaterThan(100);
  });

  it('EN has all keys that PT has', () => {
    const missing = ptKeys.filter(k => !enKeys.includes(k));
    expect(missing, `EN is missing keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('ES has all keys that PT has', () => {
    const missing = ptKeys.filter(k => !esKeys.includes(k));
    expect(missing, `ES is missing keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('no locale has empty string values', () => {
    for (const [key, val] of Object.entries(pt)) {
      expect(val, `PT key "${key}" is empty`).toBeTruthy();
    }
    for (const [key, val] of Object.entries(en)) {
      expect(val, `EN key "${key}" is empty`).toBeTruthy();
    }
    for (const [key, val] of Object.entries(es)) {
      expect(val, `ES key "${key}" is empty`).toBeTruthy();
    }
  });

  it('EN and ES are different from PT (not just copies)', () => {
    // At least 50% of keys should be different (excluding technical terms)
    let different = 0;
    for (const key of ptKeys) {
      if (en[key as keyof typeof en] !== pt[key as keyof typeof pt]) {
        different++;
      }
    }
    const ratio = different / ptKeys.length;
    expect(ratio).toBeGreaterThan(0.4); // At least 40% different
  });

  it('all optimization keys follow the pattern opt.{id}.{title|short|long}', () => {
    const optKeys = ptKeys.filter(k => k.startsWith('opt.'));
    expect(optKeys.length).toBeGreaterThan(0);

    // Each opt should have title, short, long
    const ids = new Set(optKeys.map(k => k.split('.')[1]));
    for (const id of ids) {
      expect(pt[`opt.${id}.title` as keyof typeof pt], `Missing opt.${id}.title in PT`).toBeTruthy();
      expect(pt[`opt.${id}.short` as keyof typeof pt], `Missing opt.${id}.short in PT`).toBeTruthy();
      expect(pt[`opt.${id}.long` as keyof typeof pt], `Missing opt.${id}.long in PT`).toBeTruthy();
    }
  });
});
