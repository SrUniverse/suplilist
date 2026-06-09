/**
 * optimistic-update.js — Generic optimistic UI mutation helper.
 *
 * Centralises the snapshot → dispatch → network → rollback pattern that
 * every state-mutation service uses. Without this abstraction, each service
 * duplicates the try/catch/rollback boilerplate independently — meaning a
 * change to rollback semantics (e.g. a new toast duration) must be applied
 * in sync across N files.
 *
 * Sequence enforced:
 *   1. snapshotFn()      — capture current state BEFORE the mutation
 *   2. dispatchFn(backup) — apply optimistic UI change immediately
 *   3. networkFn()        — fire the actual network request
 *   4a. Success → return  result (caller handles confirmation dispatch)
 *   4b. Failure → rollbackFn(backup, err) → rethrow
 *
 * CONTRACT:
 *   - This helper ALWAYS rethrows after calling rollbackFn.
 *     Callers that want to swallow the error chain with `.catch(() => {})`.
 *   - This helper does NOT dispatch toasts or state actions itself.
 *     All dispatches live in the caller's snapshotFn / dispatchFn / rollbackFn.
 *     This keeps the helper free of stateManager imports and maximally testable.
 *   - rollbackFn receives both the backup snapshot AND the original error,
 *     so callers can implement OCC-aware rollback (e.g. 412 vs 500 paths).
 *
 * @example — removeItem
 *   const itemBackup = { ...stack[index] };
 *   await performOptimisticUpdate(
 *     () => itemBackup,
 *     () => stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { id }),
 *     () => apiFetch(`/api/stack/${id}`, { method: 'DELETE' }),
 *     (backup) => {
 *       stateManager.dispatch(ACTIONS.SHOW_TOAST, { message: '...', type: 'error' });
 *       stateManager.dispatch(ACTIONS.RESTORE_STACK_ITEM_AT_INDEX, { item: backup, index });
 *     }
 *   ).catch(() => {}); // removeItem swallows — rollback already handled UX
 *
 * @example — updateItem with 412 OCC conflict handling
 *   await performOptimisticUpdate(
 *     () => itemBackup,
 *     () => stateManager.dispatch(ACTIONS.UPDATE_STACK_ITEM, { id, ...updates, isSyncing: true }),
 *     () => apiFetch(...),
 *     (backup, err) => {
 *       if (err.status === 412) { ... OCC rollback }
 *       else                    { ... generic rollback }
 *     }
 *   ).catch(() => {});
 */

/**
 * @template T  Backup snapshot type returned by snapshotFn.
 * @template R  Return type of networkFn.
 *
 * @param {() => T}                        snapshotFn   Returns state to preserve for rollback.
 * @param {(backup: T) => void}            dispatchFn   Applies the optimistic mutation.
 * @param {() => Promise<R>}               networkFn    The real async network request.
 * @param {(backup: T, err: unknown) => void} rollbackFn  Restores state and shows feedback.
 * @returns {Promise<R>}
 */
export async function performOptimisticUpdate(snapshotFn, dispatchFn, networkFn, rollbackFn) {
  const backup = snapshotFn();
  dispatchFn(backup);
  try {
    return await networkFn();
  } catch (err) {
    rollbackFn(backup, err);
    throw err;
  }
}
