// src/components/BookGrid.tsx
// Formal library book grid — clean white, genre chips, compact cover cards

import { Library, ChevronLeft, ChevronRight, Loader2, Plus, Sparkles } from 'lucide-react';
import BookCard from './BookCard';
import type { PaginatedBooks, BookSummary } from '../types';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

const GENRES = [
  'ทั้งหมด',
  'สาขาการจัดการ',
  'สาขาการบัญชี',
  'สาขาการจัดการการตลาดดิจิทัล',
  'สาขาการจัดการการเงินยุคดิจิทัล',
  'สาขาบริหารธุรกิจ',
  'สาขานิเทศศาสตร์ธุรกิจ',
  'สาขาการจัดการธุรกิจประกันภัย',
  'สาขาการจัดการการบิน',
  'วิทยานิพนธ์และสารนิพนธ์ DPU',
  'สารคดี',
  'Technology',
];

interface BookGridProps {
  data: PaginatedBooks | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onGenreChange: (genre: string) => void;
  selectedGenre: string;
  onSelectBook: (book: BookSummary) => void;
  onEditBook: (book: BookSummary) => void;
  onAddBook: () => void;
}

export default function BookGrid({
  data,
  isLoading,
  onPageChange,
  onGenreChange,
  selectedGenre,
  onSelectBook,
  onEditBook,
  onAddBook,
}: BookGridProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Library size={20} style={{ color: '#6021F5' }} />
          <h2 className="text-lg md:text-xl font-bold text-gray-900">อีบุ๊กทั้งหมด</h2>
          {data && (
            <span className="text-xs md:text-sm text-gray-400 font-normal">
              ({data.total.toLocaleString()} รายการ)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={onAddBook}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-full shadow-sm hover:opacity-90 transition-all"
              style={{ backgroundColor: '#6021F5' }}
            >
              <Plus size={14} />
              เพิ่ม E-Book (Admin)
            </button>
          )}

          {data && data.total_pages > 1 && (
            <a href="#catalog" className="text-xs md:text-sm font-semibold hover:underline" style={{ color: '#6021F5' }}>
              ดูทั้งหมด &rsaquo;
            </a>
          )}
        </div>
      </div>

      {/* Genre filter chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide border-b border-gray-100"
        style={{ scrollbarWidth: 'none' }}
      >
        {GENRES.map((genre) => {
          const value = genre === 'ทั้งหมด' ? '' : genre;
          const isActive = selectedGenre === value;
          return (
            <button
              key={genre}
              onClick={() => onGenreChange(value)}
              className={clsx(
                'shrink-0 px-3.5 py-1 text-xs md:text-sm font-medium rounded-full transition-all border',
                isActive
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700'
              )}
              style={isActive ? { backgroundColor: '#6021F5', borderColor: '#6021F5' } : {}}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin" style={{ color: '#6021F5' }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data && data.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Library size={44} className="mb-3 opacity-25" />
          <p className="font-semibold text-gray-700">ไม่พบหนังสือที่ค้นหา</p>
          <p className="text-xs mt-1 text-gray-400">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p>
          {isAdmin && (
            <button
              onClick={onAddBook}
              className="mt-4 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm"
              style={{ backgroundColor: '#6021F5' }}
            >
              เพิ่มหนังสือใหม่ทันที
            </button>
          )}
        </div>
      )}

      {/* Grid — Compact Cover Cards */}
      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
            {data.data.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onSelect={onSelectBook}
                onEdit={onEditBook}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-10">
              <button
                onClick={() => onPageChange(data.page - 1)}
                disabled={data.page <= 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: Math.min(data.total_pages, 7) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className="w-8 h-8 rounded-lg text-xs font-bold border transition-colors"
                    style={
                      data.page === page
                        ? { backgroundColor: '#6021F5', color: 'white', borderColor: '#6021F5' }
                        : {}
                    }
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => onPageChange(data.page + 1)}
                disabled={data.page >= data.total_pages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
