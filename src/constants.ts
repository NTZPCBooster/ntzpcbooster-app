/**
 * PCBoost — Application-wide constants
 *
 * Centralizes magic strings and shared identifiers so every file
 * references the same source of truth.
 */

/** localStorage key used by the persistence layer */
export const STORAGE_KEY = 'pcboost';

/** All navigable page identifiers */
export type PageId =
  | 'dashboard'
  | 'gaming'
  | 'limpeza'
  | 'tweaks'
  | 'startup'
  | 'hardware'
  | 'historico'
  | 'settings';
