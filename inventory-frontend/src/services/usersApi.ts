import { api } from '../lib/axios';

export interface UpdateEmailDto {
  email: string;
}

export interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  email: string;
}

export const usersApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateEmail: async (email: string): Promise<{ id: string; email: string; message: string }> => {
    const response = await api.put('/users/profile/email', { email });
    return response.data;
  },

  updatePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.put('/users/profile/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};
