import { apiRequest } from './client';
import type { UserWithRoles } from '../types/user.types';

export const authApi = {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserWithRoles> {
    return apiRequest<UserWithRoles>({
      method: 'GET',
      url: '/api/v1/users/me',
    });
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    return apiRequest<void>({
      method: 'POST',
      url: '/auth/logout',
    });
  },
};
