// src/types/index.ts — Shared TypeScript types mirroring the Rust models

export type BookStatus = 'Available' | 'Borrowed';

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  genre: string;
  cover_url: string;
  pdf_url?: string | null;
  status: BookStatus;
  borrowed_by: string | null;
  expires_at: string | null; // ISO 8601 timestamp
  borrow_count: number;
  year: number | null;
  pages: number | null;
  isbn: string | null;
  language: string;
  max_borrow_days: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export type BookSummary = Pick<
  Book,
  | 'id'
  | 'title'
  | 'author'
  | 'genre'
  | 'cover_url'
  | 'pdf_url'
  | 'status'
  | 'borrowed_by'
  | 'expires_at'
  | 'borrow_count'
  | 'language'
  | 'max_borrow_days'
  | 'featured'
>;

export interface SaveBookPayload {
  title: string;
  author: string;
  description: string;
  genre: string;
  cover_url: string;
  pdf_url?: string | null;
  year?: number | null;
  pages?: number | null;
  isbn?: string | null;
  language: string;
  max_borrow_days?: number;
  featured: boolean;
}

export interface PaginatedBooks {
  data: BookSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: 'member' | 'admin';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}

export interface AdminStats {
  total_books: number;
  active_borrows: number;
  total_users: number;
  total_history_records: number;
}

export interface BorrowHistoryRecord {
  id: string;
  book_id: string;
  book_title: string;
  user_id: string;
  user_name: string;
  user_email: string;
  borrowed_at: string;
  returned_at: string | null;
  expired: boolean;
}
