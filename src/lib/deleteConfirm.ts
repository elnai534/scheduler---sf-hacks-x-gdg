/** Preference: skip the "delete this course?" confirmation (set by "Remember my choice"). */
export const SKIP_DELETE_KEY = 'scheduler.skipDeleteConfirm'
/** Key written by an earlier Build-only version of this dialog; still honored. */
const LEGACY_KEY = 'skipRemoveConfirm'

type Store = Pick<Storage, 'getItem' | 'setItem'>

const defaultStore = (): Store | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

/** True when the user previously ticked "Remember my choice". Falls back to false if storage is unavailable. */
export function readSkipDeleteConfirm(store: Store | null = defaultStore()): boolean {
  try { return !!store && (store.getItem(SKIP_DELETE_KEY) === '1' || store.getItem(LEGACY_KEY) === '1') } catch { return false }
}

/** Persist the preference; returns false (and does nothing) if storage is unavailable or blocked. */
export function writeSkipDeleteConfirm(skip: boolean, store: Store | null = defaultStore()): boolean {
  try { if (!store) return false; store.setItem(SKIP_DELETE_KEY, skip ? '1' : '0'); return true } catch { return false }
}

/** Only removals are confirmed (never adds), and not once the user opted out. */
export const shouldConfirmDelete = (isRemoval: boolean, skipPref: boolean): boolean => isRemoval && !skipPref
