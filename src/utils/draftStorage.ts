/**
 * CivicSphere AI — Form Draft Storage Utility
 * Provides scoped temporary browser-side draft persistence for editor modals.
 * 
 * Rules:
 * - Scoped separately per entity (create vs specific entity ID)
 * - Tenant isolation: scoped by active tenant ID when available
 * - Session/Local storage based (never mock database records)
 * - Safe JSON serialization with schema validation
 * - Clear on successful submission or confirmed discard
 */

const STORAGE_PREFIX = 'civicsphere_draft_';
export const ACTIVE_MODAL_STORAGE_KEY = 'civicsphere_active_modal';

export type DraftEntityType =
  | 'course'
  | 'lesson'
  | 'project'
  | 'activity'
  | 'event'
  | 'announcement'
  | 'document'
  | 'media';

export interface ActiveModalState {
  tenantId: string;
  type: DraftEntityType;
  mode: 'create' | 'edit';
  id: string | null;
}

export function getDraftStorageKey(
  entityType: DraftEntityType,
  entityId: string | null | undefined,
  tenantId?: string | null | undefined
): string {
  const scope = entityId ? `edit_${entityId}` : 'create_new';
  const tenantPrefix = tenantId ? `t_${tenantId}_` : '';
  return `${STORAGE_PREFIX}${tenantPrefix}${entityType}_${scope}`;
}

export function saveDraft<T>(
  entityType: DraftEntityType,
  entityId: string | null | undefined,
  data: T,
  tenantId?: string | null | undefined
): void {
  try {
    const key = getDraftStorageKey(entityType, entityId, tenantId);
    const payload = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to save draft to storage:', err);
  }
}

export function loadDraft<T>(
  entityType: DraftEntityType,
  entityId: string | null | undefined,
  tenantId?: string | null | undefined
): T | null {
  try {
    const key = getDraftStorageKey(entityType, entityId, tenantId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return parsed.data as T;
    }
    return null;
  } catch (err) {
    console.warn('Failed to load draft from storage:', err);
    return null;
  }
}

export function clearDraft(
  entityType: DraftEntityType,
  entityId: string | null | undefined,
  tenantId?: string | null | undefined
): void {
  try {
    const key = getDraftStorageKey(entityType, entityId, tenantId);
    sessionStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear draft from storage:', err);
  }
}

/**
 * Persists the lightweight active modal descriptor to sessionStorage.
 */
export function setActiveModalState(state: ActiveModalState): void {
  try {
    sessionStorage.setItem(ACTIVE_MODAL_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save active modal state to storage:', err);
  }
}

/**
 * Retrieves and validates the active modal descriptor from sessionStorage.
 */
export function getActiveModalState(): ActiveModalState | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_MODAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.tenantId === 'string' &&
      typeof parsed.type === 'string' &&
      (parsed.mode === 'create' || parsed.mode === 'edit') &&
      (parsed.id === null || typeof parsed.id === 'string')
    ) {
      const validTypes: DraftEntityType[] = [
        'course',
        'lesson',
        'project',
        'activity',
        'event',
        'announcement',
        'document',
        'media',
      ];
      if (validTypes.includes(parsed.type)) {
        return parsed as ActiveModalState;
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to load active modal state from storage:', err);
    return null;
  }
}

/**
 * Clears the active modal descriptor from sessionStorage.
 */
export function clearActiveModalState(): void {
  try {
    sessionStorage.removeItem(ACTIVE_MODAL_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear active modal state from storage:', err);
  }
}
