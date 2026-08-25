// src/components/BookDetailPage.tsx
// Full-page book detail view with custom borrow duration selector, built-in PDF Reader integration, and DPU metadata.

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Clock,
  RotateCcw,
  Heart,
  Edit,
  Trash2,
  Calendar,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { BookSummary, Book } from '../types';
import { booksApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import CountdownBadge from './CountdownBadge';
import BookCard from './BookCard';
import PdfReaderModal from './PdfReaderModal';
import { addDays, format } from 'date-fns';
import { th } from 'date-fns/locale';
import clsx from 'clsx';

interface BookDetailPageProps {
  bookSummary: BookSummary;
  onBack: () => void;
  onSelectBook: (book: BookSummary) => void;
  onLoginRequired: () => void;
  onEditBook: (book: BookSummary) => void;
}

export default function BookDetailPage({
  bookSummary,
  onBack,
  onSelectBook,
  onLoginRequired,
  onEditBook,
}: BookDetailPageProps) {
  const { user } = useAuthStore();
  const [book, setBook] = useState<Book | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<BookSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Borrow days selection state
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [readerOpen, setReaderOpen] = useState(false);

  const fetchBookDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const [detail, related] = await Promise.all([
        booksApi.getById(bookSummary.id),
        booksApi.list({ genre: bookSummary.genre, limit: 8 }),
      ]);
      setBook(detail);
      setRelatedBooks(related.data.filter((b) => b.id !== bookSummary.id));
      if (detail.max_borrow_days && detail.max_borrow_days < selectedDays) {
        setSelectedDays(detail.max_borrow_days);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [bookSummary.id, bookSummary.genre]);

  useEffect(() => {
    fetchBookDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchBookDetails]);

  const currentBook = book || (bookSummary as unknown as Book);
  const isMyBorrow = !!(user && currentBook.borrowed_by === user.id);
  const isBorrowed = currentBook.status === 'Borrowed';
  const isAdmin = user?.role === 'admin';
  const maxAllowedDays = currentBook.max_borrow_days || 14;

  // Available duration options
  const durationOptions = [1, 3, 7, 14, 30].filter((d) => d <= maxAllowedDays);
  if (!durationOptions.includes(maxAllowedDays)) {
    durationOptions.push(maxAllowedDays);
    durationOptions.sort((a, b) => a - b);
  }

  const expectedReturnDate = addDays(new Date(), selectedDays);

  const handleBorrow = async () => {
    if (!user) {
      onLoginRequired();
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await booksApi.borrow(currentBook.id, selectedDays);
      // Update local book state to reflect borrow (server keeps status Available for digital books)
      setBook((prev) => prev ? {
        ...prev,
        borrow_count: prev.borrow_count + 1,
        borrowed_by: user.id,
        expires_at: res.expires_at,
      } : prev);
      // Auto open reader upon successful borrowing
      setReaderOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถยืมหนังสือได้');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await booksApi.return(currentBook.id);
      // Update local state
      setBook((prev) => prev ? { ...prev, borrowed_by: null, expires_at: null } : prev);
      setReaderOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถคืนหนังสือได้');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือ "${currentBook.title}"?`)) return;
    try {
      await booksApi.delete(currentBook.id);
      onBack();
    } catch (err) {
      alert('ไม่สามารถลบหนังสือได้');
    }
  };

  const handleExpire = useCallback(() => {
    setTimeout(fetchBookDetails, 800);
  }, [fetchBookDetails]);

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-16">
      {/* Breadcrumb strip */}
      <div className="border-b border-gray-100 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs md:text-sm text-gray-500 overflow-x-auto">
          <button
            onClick={onBack}
            className="hover:text-[#6021F5] flex items-center gap-1 font-medium shrink-0"
          >
            <ArrowLeft size={14} />
            หน้าแรก
          </button>
          <ChevronRight size={14} className="text-gray-300 shrink-0" />
          <span className="hover:text-[#6021F5] cursor-pointer shrink-0 font-medium">{currentBook.genre}</span>
          <ChevronRight size={14} className="text-gray-300 shrink-0" />
          <span className="text-gray-900 font-semibold truncate">{currentBook.title}</span>
        </div>
      </div>

      {/* Main Detail Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">

        {/* Big Title & Admin Controls */}
        <div className="text-center md:text-left mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-snug">
            {currentBook.title}
          </h1>
          {isAdmin && (
            <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
              <button
                onClick={() => onEditBook(currentBook)}
                className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-purple-100 hover:text-[#6021F5] px-3 py-1.5 rounded-lg transition-all"
              >
                <Edit size={13} />
                แก้ไข E-Book & ตั้งระยะเวลายืม (Admin)
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
              >
                <Trash2 size={13} />
                ลบหนังสือ
              </button>
            </div>
          )}
        </div>

        {/* Two Column Layout: Cover & Main Actions/Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start pb-12 border-b border-gray-100">

          {/* Left: Book Cover with PDF Badge and Heart Button */}
          <div className="md:col-span-5 lg:col-span-4 flex justify-center">
            <div className="relative w-64 md:w-full aspect-[1/1.38] rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-gray-50">
              {currentBook.cover_url ? (
                <img
                  src={currentBook.cover_url}
                  alt={currentBook.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 text-purple-400">
                  <BookOpen size={64} style={{ color: '#6021F5' }} />
                </div>
              )}

              {/* Red PDF Badge */}
              <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-br-lg uppercase tracking-wider shadow-sm flex items-center gap-1">
                <FileText size={12} />
                PDF
              </div>

              {/* Top-Right Heart Button */}
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 text-red-500 hover:bg-white shadow-md flex items-center justify-center transition-all"
                title="รายการโปรด"
              >
                <Heart size={16} className={clsx(isFavorite ? 'fill-red-500' : '')} />
              </button>
            </div>
          </div>

          {/* Right: Metadata, Borrow Duration Selector, Buttons, Stats Grid */}
          <div className="md:col-span-7 lg:col-span-8 space-y-5">

            {/* Author & Publisher */}
            <div className="space-y-1 text-sm text-gray-700">
              <p>
                <span className="font-semibold text-gray-900">ผู้แต่ง :</span> {currentBook.author}
              </p>
              <p>
                <span className="font-semibold text-gray-900">สำนักพิมพ์ :</span> สำนักหอสมุด มหาวิทยาลัยธุรกิจบัณฑิตย์ (DPU Library)
              </p>
            </div>

            {/* 1. If currently borrowed by user: Show In-App Reader Button & Countdown */}
            {isMyBorrow ? (
              <div className="p-5 bg-purple-50/80 rounded-2xl border border-purple-200/80 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#6021F5] flex items-center gap-1.5">
                    <ShieldCheck size={16} />
                    คุณกำลังยืมหนังสือเล่มนี้อยู่
                  </span>
                  {currentBook.expires_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-purple-600" />
                      <CountdownBadge expiresAt={currentBook.expires_at} onExpire={handleExpire} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Primary In-App Reader Button */}
                  <button
                    onClick={() => setReaderOpen(true)}
                    className="w-full sm:w-2/3 py-3.5 px-6 rounded-2xl font-extrabold text-sm text-white shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#6021F5' }}
                  >
                    <BookOpen size={18} />
                    เปิดอ่าน E-Book ในระบบทันที
                  </button>

                  {/* Return Button */}
                  <button
                    onClick={handleReturn}
                    disabled={actionLoading}
                    className="w-full sm:w-1/3 py-3.5 px-4 rounded-2xl font-bold text-xs md:text-sm text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={15} />
                    {actionLoading ? 'กำลังคืน...' : 'คืนหนังสือ'}
                  </button>
                </div>
              </div>
            ) : isBorrowed ? (
              /* If borrowed by someone else */
              <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200 text-center">
                <p className="text-sm font-bold text-gray-500">หนังสือเล่มนี้ถูกยืมไปแล้ว (อยู่ระหว่างถูกยืม)</p>
                <p className="text-xs text-gray-400 mt-1">จะพร้อมให้บริการใหม่อีกครั้งเมื่อผู้ยืมคืนหรือครบกำหนดเวลา</p>
              </div>
            ) : (
              /* 2. If available: Show Duration Selector & Borrow Button */
              <div className="space-y-4 pt-1">
                {/* Duration Selector */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={15} className="text-[#6021F5]" />
                      เลือกระยะเวลายืม:
                    </span>
                    <span className="text-purple-700 font-medium">
                      กำหนดคืน: {format(expectedReturnDate, 'dd MMMM yyyy', { locale: th })}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {durationOptions.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSelectedDays(days)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                          selectedDays === days
                            ? 'bg-[#6021F5] text-white border-[#6021F5] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {days} วัน
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-gray-400 text-right">
                    * Admin กำหนดระยะเวลายืมสูงสุดเล่มนี้ได้ไม่เกิน {maxAllowedDays} วัน
                  </p>
                </div>

                {/* Action Buttons Row (ตัวอย่าง / ยืม) */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Sample / Preview Button */}
                  <a
                    href={currentBook.pdf_url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-1/3 py-3 px-6 rounded-full border-2 border-gray-300 hover:border-purple-300 text-gray-700 font-bold text-center text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileText size={16} />
                    ตัวอย่าง
                  </a>

                  {/* Borrow Button */}
                  <button
                    onClick={handleBorrow}
                    disabled={actionLoading}
                    className="w-full sm:w-2/3 py-3.5 px-6 rounded-full font-bold text-center text-sm text-white shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#6021F5' }}
                  >
                    <BookOpen size={16} />
                    {actionLoading ? 'กำลังดำเนินการ...' : `ยืมหนังสือ (${selectedDays} วัน)`}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
                {error}
              </div>
            )}

            {/* Metrics Grid 1 (คงเหลือ / ทั้งหมด / การจองคิว / ยืมแล้ว) */}
            <div className="grid grid-cols-4 gap-2 text-center py-4 border-y border-gray-100">
              <div>
                <p className="text-xs text-gray-400">คงเหลือ</p>
                <p className="text-xl md:text-2xl font-extrabold text-gray-800 mt-0.5">
                  {currentBook.status === 'Available' ? '1' : '0'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">ทั้งหมด</p>
                <p className="text-xl md:text-2xl font-extrabold text-gray-800 mt-0.5">1</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">การจองคิว</p>
                <p className="text-xl md:text-2xl font-extrabold text-gray-800 mt-0.5">
                  {currentBook.status === 'Borrowed' ? '1' : '0'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">ยืมแล้ว</p>
                <p className="text-xl md:text-2xl font-extrabold text-gray-800 mt-0.5">
                  {currentBook.borrow_count}
                </p>
              </div>
            </div>

            {/* Metrics Grid 2 (ขนาดไฟล์ / รูปแบบไฟล์ / จำนวนหน้า) */}
            <div className="grid grid-cols-3 gap-2 text-center py-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400">ขนาดไฟล์</p>
                <p className="text-base md:text-lg font-bold text-gray-800 mt-0.5">12.38MB</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">รูปแบบไฟล์</p>
                <p className="text-base md:text-lg font-bold text-gray-800 mt-0.5">PDF</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">จำนวนหน้า</p>
                <p className="text-base md:text-lg font-bold text-gray-800 mt-0.5">
                  {currentBook.pages || 71}
                </p>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <span className="px-4 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                {currentBook.genre}
              </span>
              <span className="px-4 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                ทั่วไป
              </span>
              <span className="px-4 py-1 rounded-full text-xs font-semibold bg-purple-50 text-[#6021F5]">
                ระยะเวลายืมสูงสุด: {maxAllowedDays} วัน
              </span>
            </div>
          </div>
        </div>

        {/* Section: เรื่องย่อ (Synopsis) */}
        <section className="py-10 border-b border-gray-100 space-y-3">
          <h2 className="text-lg md:text-xl font-extrabold text-gray-900">
            เรื่องย่อ
          </h2>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed max-w-4xl bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
            {currentBook.description ||
              `หนังสือ E-Book เล่มนี้จัดทำขึ้นเพื่อรวบรวมข้อมูลอันเป็นประโยชน์และทรงคุณค่า โดยสำนักหอสมุด มหาวิทยาลัยธุรกิจบัณฑิตย์ เพื่อเป็นแหล่งเรียนรู้และค้นคว้าสำหรับนักศึกษา อาจารย์ และบุคลากร ตลอดจนผู้สนใจทั่วไป`}
          </p>
        </section>

        {/* Section: หนังสือที่เกี่ยวข้อง (Related Books) */}
        {relatedBooks.length > 0 && (
          <section className="py-10 space-y-5">
            <h2 className="text-lg md:text-xl font-extrabold text-gray-900">
              หนังสือที่เกี่ยวข้อง
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
              {relatedBooks.slice(0, 6).map((rBook) => (
                <BookCard
                  key={rBook.id}
                  book={rBook}
                  onSelect={onSelectBook}
                  onEdit={onEditBook}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Built-in E-Reader / PDF Viewer Modal */}
      {readerOpen && (
        <PdfReaderModal
          book={currentBook}
          onClose={() => setReaderOpen(false)}
          onReturn={handleReturn}
          onExpire={handleExpire}
        />
      )}
    </div>
  );
}
