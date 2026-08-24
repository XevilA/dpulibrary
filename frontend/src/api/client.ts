// src/api/client.ts — Axios API client with auth interceptor

import axios from 'axios';
import type { AuthResponse, Book, BookSummary, PaginatedBooks } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT if available ────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('elib_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('elib_token');
      localStorage.removeItem('elib_user');
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: async (email: string, password: string, display_name: string) => {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      display_name,
    });
    return data;
  },

  login: async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  googleLogin: async (payload: { credential?: string; email?: string; name?: string }) => {
    const { data } = await api.post<AuthResponse>('/auth/google', payload);
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  me: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

// ─── Books ───────────────────────────────────────────────────────────────────

export const booksApi = {
  list: async (params?: {
    search?: string;
    genre?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await api.get<PaginatedBooks>('/books', { params });
    return data;
  },

  popular: async () => {
    const { data } = await api.get<BookSummary[]>('/books/popular');
    return data;
  },

  featured: async () => {
    const { data } = await api.get<BookSummary[]>('/books/featured');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<Book>(`/books/${id}`);
    return data;
  },

  borrow: async (id: string, days?: number) => {
    const { data } = await api.post<Book>(`/books/${id}/borrow`, { days });
    return data;
  },

  return: async (id: string) => {
    const { data } = await api.post<Book>(`/books/${id}/return`);
    return data;
  },

  create: async (payload: import('../types').SaveBookPayload) => {
    const { data } = await api.post<Book>('/books', payload);
    return data;
  },

  update: async (id: string, payload: import('../types').SaveBookPayload) => {
    const { data } = await api.put<Book>(`/books/${id}`, payload);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/books/${id}`);
    return data;
  },
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: async () => {
    const { data } = await api.get<import('../types').AdminStats>('/admin/stats');
    return data;
  },

  getHistory: async () => {
    const { data } = await api.get<import('../types').BorrowHistoryRecord[]>('/admin/history');
    return data;
  },
};

export default api;
