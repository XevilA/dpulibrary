// src/store/authStore.ts — Zustand global auth state

import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, display_name: string) => Promise<void>;
  googleLogin: (payload: { credential?: string; email?: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,

  // ── Restore from localStorage on app load ─────────────────────────────────
  hydrate: () => {
    const token = localStorage.getItem('elib_token');
    const userStr = localStorage.getItem('elib_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token });
      } catch {
        localStorage.removeItem('elib_token');
        localStorage.removeItem('elib_user');
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { token, user } = await authApi.login(email, password);
      localStorage.setItem('elib_token', token);
      localStorage.setItem('elib_user', JSON.stringify(user));
      set({ user, token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  googleLogin: async (payload) => {
    set({ isLoading: true });
    try {
      const { token, user } = await authApi.googleLogin(payload);
      localStorage.setItem('elib_token', token);
      localStorage.setItem('elib_user', JSON.stringify(user));
      set({ user, token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, display_name) => {
    set({ isLoading: true });
    try {
      const { token, user } = await authApi.register(email, password, display_name);
      localStorage.setItem('elib_token', token);
      localStorage.setItem('elib_user', JSON.stringify(user));
      set({ user, token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const { token } = get();
    if (token) {
      try {
        await authApi.logout();
      } catch {
        // Token may already be invalid — still clear local state
      }
    }
    localStorage.removeItem('elib_token');
    localStorage.removeItem('elib_user');
    set({ user: null, token: null });
  },
}));
