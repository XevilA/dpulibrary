// src/components/HeroBanner.tsx
// Clean, formal hero carousel — DPU purple accents, responsive slide view with robust error handling

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import type { BookSummary } from '../types';
import clsx from 'clsx';

interface HeroBannerProps {
  books: BookSummary[];
  onSelectBook?: (book: BookSummary) => void;
}

const SLIDE_STYLES = [
  { bg: 'from-[#6021F5] to-[#370D9C]' },
  { bg: 'from-[#5214E0] to-[#2D0D7E]' },
  { bg: 'from-[#430EBF] to-[#190554]' },
  { bg: 'from-[#6021F5] to-[#430EBF]' },
  { bg: 'from-[#7E4BCC] to-[#370D9C]' },
];

export default function HeroBanner({ books = [], onSelectBook }: HeroBannerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const featured = (books || []).slice(0, 6);

  const scrollTo = (idx: number) => {
    const container = scrollRef.current;
    if (!container || !container.children) return;
    const child = container.children[idx] as HTMLElement;
    if (child && typeof child.scrollIntoView === 'function') {
      try {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch {
        // Fallback for older browsers
        container.scrollLeft = child.offsetLeft || 0;
      }
    }
    setActiveIdx(idx);
  };

  useEffect(() => {
    if (!featured.length) return;
    const id = setInterval(() => {
      setActiveIdx((i) => {
        const next = (i + 1) % featured.length;
        scrollTo(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [featured.length]);

  if (!featured.length) {
    return null;
  }

  return (
    <section className="relative bg-white border-b border-gray-100">
      {/* Slides */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {featured.map((book, idx) => {
          if (!book) return null;
          const style = SLIDE_STYLES[idx % SLIDE_STYLES.length];
          return (
            <div
              key={book.id || idx}
              onClick={() => onSelectBook?.(book)}
              className={`flex-shrink-0 w-full snap-center bg-gradient-to-r ${style.bg} relative overflow-hidden cursor-pointer group`}
              style={{ minHeight: '230px' }}
            >
              {/* Blurred bg cover */}
              {book.cover_url && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-15 scale-110 blur-lg"
                  style={{ backgroundImage: `url(${book.cover_url})` }}
                />
              )}

              <div className="relative max-w-5xl mx-auto px-6 py-8 flex items-center gap-8">
                {/* Book cover */}
                <div className="shrink-0 w-28 md:w-36 aspect-[1/1.38] rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/30 group-hover:scale-105 transition-transform bg-white/10">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title || 'DPU E-Book'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                      <BookOpen size={36} className="text-white/60" />
                    </div>
                  )}
                </div>

                {/* Text content */}
                <div className="text-white flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      <Sparkles size={11} className="text-amber-300" />
                      E-Book แนะนำ
                    </span>
                    <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                      PDF
                    </span>
                    <span className="text-white/75 text-xs">{book.genre}</span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-extrabold leading-snug mb-1 drop-shadow-sm truncate">
                    {book.title}
                  </h2>
                  <p className="text-white/80 text-xs md:text-sm mb-3 truncate">โดย {book.author}</p>

                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        'text-xs font-semibold px-3 py-1 rounded-full border',
                        book.status === 'Available'
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
                          : 'bg-red-500/20 border-red-400/40 text-red-100'
                      )}
                    >
                      {book.status === 'Available' ? '✓ พร้อมให้บริการ' : '✗ ไม่ว่าง'}
                    </span>
                    <span className="text-white/60 text-xs">
                      ยืมแล้ว {(book.borrow_count || 0).toLocaleString()} ครั้ง
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrows */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          scrollTo(Math.max(0, activeIdx - 1));
        }}
        disabled={activeIdx === 0}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-all disabled:opacity-0 shadow-md"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          scrollTo(Math.min(featured.length - 1, activeIdx + 1));
        }}
        disabled={activeIdx === featured.length - 1}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-all disabled:opacity-0 shadow-md"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {featured.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              scrollTo(idx);
            }}
            className={clsx(
              'rounded-full transition-all duration-300',
              idx === activeIdx ? 'bg-white w-5 h-1.5' : 'bg-white/40 w-1.5 h-1.5 hover:bg-white/70'
            )}
          />
        ))}
      </div>
    </section>
  );
}
