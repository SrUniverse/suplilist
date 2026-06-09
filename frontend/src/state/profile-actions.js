/**
 * Profile Actions â€” State management for profile updates
 */

import { stateManager } from './state-manager.js';
import { logger } from '../utils/logger.js';

export const PROFILE_ACTIONS = {
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  UPDATE_PHOTO: 'UPDATE_PHOTO',
  DELETE_PHOTO: 'DELETE_PHOTO',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

/**
 * Update user profile
 */
export function updateProfile(profileData) {
  const currentState = stateManager.select(s => s);

  stateManager.dispatch(PROFILE_ACTIONS.UPDATE_PROFILE, {
    profile: {
      ...currentState.profile,
      ...profileData,
      updatedAt: new Date().toISOString()
    }
  });

  logger.info('Profile updated', profileData);
}

/**
 * Update only photo
 */
export function updatePhoto(photoUrl) {
  const currentState = stateManager.select(s => s);

  stateManager.dispatch(PROFILE_ACTIONS.UPDATE_PHOTO, {
    profile: {
      ...currentState.profile,
      photo: photoUrl,
      updatedAt: new Date().toISOString()
    }
  });

  logger.info('Photo updated', photoUrl);
}

/**
 * Delete photo
 */
export function deletePhoto() {
  const currentState = stateManager.select(s => s);

  stateManager.dispatch(PROFILE_ACTIONS.DELETE_PHOTO, {
    profile: {
      ...currentState.profile,
      photo: null,
      updatedAt: new Date().toISOString()
    }
  });

  logger.info('Photo deleted');
}

/**
 * Set loading state
 */
export function setLoading(isLoading) {
  stateManager.dispatch(PROFILE_ACTIONS.SET_LOADING, { isLoading });
}

/**
 * Set error
 */
export function setError(error) {
  stateManager.dispatch(PROFILE_ACTIONS.SET_ERROR, { error });
}

export default {
  PROFILE_ACTIONS,
  updateProfile,
  updatePhoto,
  deletePhoto,
  setLoading,
  setError
};


