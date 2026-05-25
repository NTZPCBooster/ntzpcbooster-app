import { describe, it, expect } from 'vitest';
import { OPTIMIZATIONS, CATEGORIES } from '../data';

describe('OPTIMIZATIONS', () => {
  it('has more than 40 optimizations', () => {
    expect(OPTIMIZATIONS.length).toBeGreaterThan(40);
  });

  it('every optimization has required fields', () => {
    for (const opt of OPTIMIZATIONS) {
      expect(opt.id).toBeTruthy();
      expect(opt.category).toMatch(/^(gaming|limpeza|tweaks)$/);
      expect(opt.title).toBeTruthy();
      expect(opt.short).toBeTruthy();
      expect(opt.long).toBeTruthy();
      expect(typeof opt.admin).toBe('boolean');
      expect(opt.risk).toMatch(/^(nenhum|baixo|medio)$/);
      expect(opt.icon).toBeTruthy();
      expect(opt.script).toBeTruthy();
    }
  });

  it('IDs are unique', () => {
    const ids = OPTIMIZATIONS.map(o => o.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('has optimizations in all three categories', () => {
    const cats = new Set(OPTIMIZATIONS.map(o => o.category));
    expect(cats.has('gaming')).toBe(true);
    expect(cats.has('limpeza')).toBe(true);
    expect(cats.has('tweaks')).toBe(true);
  });

  it('reversible optimizations (non-runOnce) have undoScript', () => {
    const reversible = OPTIMIZATIONS.filter(o => !o.runOnce);
    for (const opt of reversible) {
      expect(opt.undoScript, `${opt.id} is missing undoScript`).toBeTruthy();
    }
  });
});

describe('CATEGORIES', () => {
  it('has 7 categories', () => {
    expect(CATEGORIES).toHaveLength(7);
  });

  it('first category is dashboard', () => {
    expect(CATEGORIES[0].id).toBe('dashboard');
  });

  it('gaming/limpeza/tweaks have correct counts from OPTIMIZATIONS', () => {
    const gamingCat = CATEGORIES.find(c => c.id === 'gaming');
    const limpezaCat = CATEGORIES.find(c => c.id === 'limpeza');
    const tweaksCat = CATEGORIES.find(c => c.id === 'tweaks');

    const gamingCount = OPTIMIZATIONS.filter(o => o.category === 'gaming').length;
    const limpezaCount = OPTIMIZATIONS.filter(o => o.category === 'limpeza').length;
    const tweaksCount = OPTIMIZATIONS.filter(o => o.category === 'tweaks').length;

    expect(gamingCat?.count).toBe(gamingCount);
    expect(limpezaCat?.count).toBe(limpezaCount);
    expect(tweaksCat?.count).toBe(tweaksCount);
  });

  it('every category has an icon (short)', () => {
    for (const cat of CATEGORIES) {
      expect(cat.short).toBeTruthy();
    }
  });
});
