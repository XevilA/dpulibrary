// src/components/PopularBooks.tsx
// Formal "ยอดนิยม" section — numbered list, DPU purple (RGB 96, 33, 245 / #6021F5)

import { TrendingUp, BookOpen, Clock } from 'lucide-react';
import type { BookSummary } from '../types';
import clsx from 'clsx';

interface PopularBooksProps {
  books: BookSummary[];
  onSelectBook: (book: BookSummary) => void;
}

export default function PopularBooks({ books, onSelectBook }: PopularBooksProps) {
  const bookList = Array.isArray(books) ? books : [];
  if (!bookList.length) return null;

  return (
    <section id="popular" className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={20} style={{ color: '#6021F5' }} />
          <h2 className="text-lg md:text-xl font-bold text-gray-900">ยอดนิยม</h2>
        </div>

        {/* Numbered list — 2-col responsive grid matching reference design */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bookList.map((book, idx) => (
            <article
              key={book.id}
              onClick={() => onSelectBook(book)}
              className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/20 cursor-pointer transition-all group shadow-sm bg-white"
            >
              {/* Rank number — gold for top 3 */}
              <span
                className={clsx(
                  'text-2xl font-black w-8 text-center shrink-0 leading-none',
                  idx === 0 && 'text-yellow-500',
                  idx === 1 && 'text-gray-400',
                  idx === 2 && 'text-amber-600',
                  idx > 2 && 'text-gray-300'
                )}
              >
                {idx + 1}
              </span>

              {/* Cover */}
              <div className="w-12 aspect-[1/1.38] rounded-lg overflow-hidden shrink-0 shadow-sm border border-gray-200 bg-gray-50">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-50 flex items-center justify-center">
                    <BookOpen size={14} className="text-purple-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-[#6021F5] transition-colors">
                  {book.title}
                </h3>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">{book.author}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={clsx(
                      'text-[9px] font-bold px-2 py-0.5 rounded-sm',
                      book.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-600'
                    )}
                  >
                    {book.status === 'Available' ? 'พร้อมให้บริการ' : 'ไม่ว่าง'}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Clock size={9} />
                    {book.borrow_count.toLocaleString()} ครั้ง
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
