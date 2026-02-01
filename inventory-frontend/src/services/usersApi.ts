import { api } from '../lib/axios';

export type UserType = 'admin' | 'user';
export type UserStatus = 'active' | 'suspended';

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
  name?: string;
  userType?: UserType;
}

export interface User {
  id: string;
  name: string;
  email: string;
  userType: UserType;
  status: UserStatus;
  createdAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  userType?: UserType;
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

  // Admin endpoints
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  createUser: async (data: CreateUserDto): Promise<User & { message: string }> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  suspendUser: async (userId: string): Promise<User & { message: string }> => {
    const response = await api.patch(`/users/${userId}/suspend`);
    return response.data;
  },

  unsuspendUser: async (userId: string): Promise<User & { message: string }> => {
    const response = await api.patch(`/users/${userId}/unsuspend`);
    return response.data;
  },

  updateUserType: async (userId: string, userType: UserType): Promise<User & { message: string }> => {
    const response = await api.put(`/users/${userId}/user-type`, { userType });
    return response.data;
  },

  makeAllUsersAdmin: async (): Promise<{ message: string }> => {
    const response = await api.post('/users/migrate/make-all-admin');
    return response.data;
  },
};
