// src/components/BookCard.tsx
// Compact, minimalist book card matching the reference e-library design (no bulky height, cover-first layout)

import { useState } from 'react';
import { BookOpen, Heart, Clock, Edit, FileText } from 'lucide-react';
import clsx from 'clsx';
import type { BookSummary } from '../types';
import { useAuthStore } from '../store/authStore';

interface BookCardProps {
  book: BookSummary;
  onSelect: (book: BookSummary) => void;
  onEdit?: (book: BookSummary) => void;
}

export default function BookCard({ book, onSelect, onEdit }: BookCardProps) {
  const { user } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const isBorrowed = book.status === 'Borrowed';
  const isAdmin = user?.role === 'admin';

  return (
    <article
      onClick={() => onSelect(book)}
      className="group cursor-pointer flex flex-col transition-all duration-200 hover:-translate-y-1"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[1/1.38] rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200/80 group-hover:shadow-md group-hover:border-purple-300 transition-all">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 p-2 text-center">
            <BookOpen size={32} style={{ color: '#6021F5' }} className="mb-1 opacity-70" />
            <span className="text-[10px] text-gray-400 line-clamp-2">{book.title}</span>
          </div>
        )}

        {/* Top-Left: Red PDF Badge */}
        <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-br-md uppercase tracking-wider shadow-sm flex items-center gap-0.5">
          <FileText size={9} />
          PDF
        </div>

        {/* Top-Right: Favorite Heart Button & Admin Edit */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {isAdmin && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(book);
              }}
              className="w-6 h-6 rounded-full bg-white/95 text-gray-700 hover:text-purple-600 hover:bg-white shadow-sm flex items-center justify-center transition-all"
              title="แก้ไข E-Book"
            >
              <Edit size={11} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
            className="w-6 h-6 rounded-full bg-white/95 text-red-500 hover:bg-white shadow-sm flex items-center justify-center transition-all"
            title="บันทึกเป็นรายการโปรด"
          >
            <Heart size={12} className={clsx(isFavorite ? 'fill-red-500' : '')} />
          </button>
        </div>

        {/* Borrowed Overlay Indicator (if borrowed) */}
        {isBorrowed && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              ถูกยืมแล้ว
            </span>
          </div>
        )}
      </div>

      {/* Book Metadata Under Cover */}
      <div className="pt-2 flex flex-col">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#6021F5] transition-colors">
          {book.title}
        </h3>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">
          {book.author}
        </p>

        <div className="flex items-center justify-between gap-1 mt-1 text-[10px] text-gray-400">
          <span className="truncate">{book.genre}</span>
          <span className="flex items-center gap-0.5 shrink-0">
            <Clock size={10} />
            {book.borrow_count}
          </span>
        </div>
      </div>
    </article>
  );
}
