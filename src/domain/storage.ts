import { initialState } from './demoData';
import type { FinanceState } from './types';

const storageKey = 'finance-splitter-tma:v1';

export function loadFinanceState(): FinanceState {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return initialState;
  }

  try {
    return JSON.parse(raw) as FinanceState;
  } catch {
    window.localStorage.removeItem(storageKey);
    return initialState;
  }
}

export function saveFinanceState(state: FinanceState): void {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function resetFinanceState(): FinanceState {
  window.localStorage.removeItem(storageKey);
  return initialState;
}
