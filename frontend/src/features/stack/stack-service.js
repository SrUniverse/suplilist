import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { apiFetch } from '../../platform/api-client.js';

/**
 * Adapter: Normalizes backend payload into the frontend UI entity.
 * Guarantees that `id` is the primary key and `supplementId` is the catalog reference.
 */
const normalizeStackItem = (backendItem) => ({
  id: backendItem.id, // Mandatory: DB row ID
  supplementId: backendItem.supplementId, // Catalog Reference
  dosage: backendItem.dose, // Nomenclature conversion
  frequency: backendItem.frequency || 'daily',
  timeOfDay: backendItem.timeOfDay || 'morning',
  version: backendItem.version || 0,
  isSyncing: false // Ephemeral UI state
});

/**
 * Adapter: Maps frontend UI payload into the backend expected DTO.
 */
const mapToBackend = (frontendItem) => ({
  supplementId: frontendItem.supplementId,
  dose: frontendItem.dosage,
  frequency: frontendItem.frequency || 'daily',
  timeOfDay: frontendItem.timeOfDay || 'anytime',
  notes: frontendItem.notes || null,
});

/**
 * Stack Service
 * 
 * Handles API mutations for the user's supplement stack with Optimistic UI updates.
 * Provides compensatory operations (rollbacks) to preserve data integrity on network failures.
 */
class StackService {
  /**
   * Remove a supplement from the stack optimistically.
   * Dispatches REMOVE_FROM_STACK immediately. If the network call fails,
   * dispatches RESTORE_STACK_ITEM_AT_INDEX to revert the deletion.
   * 
   * @param {string} id - The stack item ID to remove
   */
  async removeItem(id) {
    const stack = stateManager.stack || [];
    const index = stack.findIndex(s => s.id === id); // Strict DB id matching
    if (index === -1) return;

    // 1. Snapshot for rollback
    const itemBackup = { ...stack[index] };

    // 2. Optimistic Mutation
    stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { id });

    try {
      // 3. Network Request (DELETE ignores OCC, bypasses If-Match validation)
      await apiFetch(`/api/stack/${id}`, { method: 'DELETE' });

    } catch (_err) {
      // 4. Compensatory Rollback
      stateManager.dispatch(ACTIONS.SHOW_TOAST, {
        message: 'Sem conexão. O suplemento foi restaurado ao stack.',
        type: 'error',
        duration: 4000
      });
      stateManager.dispatch(ACTIONS.RESTORE_STACK_ITEM_AT_INDEX, { item: itemBackup, index });
    }
  }

  /**
   * Update a supplement in the stack optimistically.
   * Injects `isSyncing: true` to prevent concurrent edits.
   * 
   * @param {string} id - The stack item ID to update
   * @param {Object} updates - The new values (e.g. { dosage, timeOfDay })
   */
  async updateItem(id, updates) {
    const stack = stateManager.stack || [];
    const index = stack.findIndex(s => s.id === id); // Strict DB id matching
    if (index === -1) return;

    // 1. Snapshot for rollback
    const itemBackup = { ...stack[index] };

    // 2. Optimistic Mutation (inject isSyncing flag to lock the UI card)
    stateManager.dispatch(ACTIONS.UPDATE_STACK_ITEM, { 
      id, 
      ...updates,
      isSyncing: true 
    });

    try {
      const payload = mapToBackend({ ...itemBackup, ...updates });

      // 3. Network Request with OCC (If-Match)
      const { item: confirmed } = await apiFetch(`/api/stack/${id}`, {
        method: 'PUT',
        headers: { 'If-Match': `"${itemBackup.version}"` },
        body: JSON.stringify(payload)
      });

      // Success: Remove the isSyncing flag and sync the new __v version
      stateManager.dispatch(ACTIONS.UPDATE_STACK_ITEM, {
        id,
        ...normalizeStackItem(confirmed),
      });

    } catch (err) {
      if (err.status === 412) {
        // OCC Collision: The backend provides the updated item payload in the error data
        stateManager.dispatch(ACTIONS.SHOW_TOAST, {
          message: 'Houve um conflito! A tela foi atualizada com a versão mais recente do servidor.',
          type: 'warning',
          duration: 5000
        });
        
        const currentItem = err.data;
        
        // Surgical OCC Rollback: Overwrite the conflicting local item with the actual server state
        stateManager.dispatch(ACTIONS.RESTORE_STACK_ITEM_AT_INDEX, { 
          item: normalizeStackItem(currentItem), 
          index 
        });
        return;
      }

      // 4. Compensatory Rollback for other errors (network, 500)
      stateManager.dispatch(ACTIONS.SHOW_TOAST, {
        message: 'Falha ao salvar edição offline. Alterações revertidas.',
        type: 'error',
        duration: 4000
      });
      
      // Replace the entire object with the backup (clears isSyncing natively)
      stateManager.dispatch(ACTIONS.RESTORE_STACK_ITEM_AT_INDEX, { 
        item: { ...itemBackup, isSyncing: false }, 
        index 
      });
    }
  }

  /**
   * Add a new supplement to the stack optimistically.
   * 
   * @param {Object} itemData - The new supplement data
   */
  async addItem(itemData) {
    // Generate a temporary ID for optimistic UI
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticItem = { ...itemData, id: tempId, isSyncing: true };

    // Optimistic Add
    stateManager.dispatch(ACTIONS.ADD_TO_STACK, optimisticItem);

    try {
      const payload = mapToBackend(itemData);

      const { item: confirmed } = await apiFetch('/api/stack', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Remove temp item and replace with confirmed server item
      stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { id: tempId });
      stateManager.dispatch(ACTIONS.ADD_TO_STACK, normalizeStackItem(confirmed));

    } catch (err) {
      // Rollback: Remove the item we just optimistically added
      stateManager.dispatch(ACTIONS.SHOW_TOAST, {
        message: err.status === 409 ? 'Você já possui este suplemento no stack.' : 'Sem conexão. Falha ao adicionar.',
        type: 'error',
        duration: 4000
      });
      stateManager.dispatch(ACTIONS.REMOVE_FROM_STACK, { id: tempId });
      throw err;
    }
  }

  /**
   * Fetches the initial stack from the backend.
   */
  async getStack() {
    try {
      const { items } = await apiFetch('/api/stack');
      const normalizedItems = items.map(normalizeStackItem);
      stateManager.dispatch(ACTIONS.IMPORT_STACK, normalizedItems);
    } catch (err) {
      console.error('Failed to fetch stack', err);
    }
  }
}

export const stackService = new StackService();

