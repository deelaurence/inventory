import { create } from 'zustand';

export type UserType = 'admin' | 'user';

interface User {
  id: string;
  email: string;
  name?: string;
  userType?: UserType;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isAdmin: () => boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initializeAuth: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  isAdmin: () => {
    const { user } = get();
    return user?.userType === 'admin';
  },

  login: (user: User, token: string) => {
    console.log('[AuthStore] login() called with user:', user, 'token:', token?.substring(0, 20) + '...');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    console.log('[AuthStore] Stored in localStorage - user:', localStorage.getItem('user'), 'token exists:', !!localStorage.getItem('token'));
    set({ user, token, isAuthenticated: true, isInitialized: true });
    const state = useAuthStore.getState();
    console.log('[AuthStore] State after set:', {
      isAuthenticated: state.isAuthenticated,
      isInitialized: state.isInitialized,
      hasUser: !!state.user,
      hasToken: !!state.token
    });
  },
  
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
  },
  
  initializeAuth: () => {
    console.log('[AuthStore] initializeAuth() called');
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    console.log('[AuthStore] localStorage check - user exists:', !!user, 'token exists:', !!token);
    
    if (user && token) {
      console.log('[AuthStore] Found auth data in localStorage, setting authenticated state');
      set({ 
        user: JSON.parse(user), 
        token, 
        isAuthenticated: true,
        isInitialized: true
      });
      const state = useAuthStore.getState();
      console.log('[AuthStore] State after initializeAuth (authenticated):', {
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized
      });
    } else {
      console.log('[AuthStore] No auth data found, setting unauthenticated state');
      set({ isInitialized: true });
      const state = useAuthStore.getState();
      console.log('[AuthStore] State after initializeAuth (unauthenticated):', {
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized
      });
    }
  },

  updateUser: (user: User) => {
    console.log('[AuthStore] updateUser() called with user:', user);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));
