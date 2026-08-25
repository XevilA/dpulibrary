// src/components/BookDetailModal.tsx
// Modal for viewing complete book info, PDF e-book reading, borrowing, returning & countdown

import { useState, useCallback } from 'react';
import { X, BookOpen, Clock, FileText, RotateCcw, Edit, Trash2, ExternalLink, Calendar, Hash, Globe, CheckCircle2 } from 'lucide-react';
import CountdownBadge from './CountdownBadge';
import { booksApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { BookSummary, Book } from '../types';

interface BookDetailModalProps {
  bookSummary: BookSummary | null;
  onClose: () => void;
  onUpdate: () => void;
  onLoginRequired: () => void;
  onEdit: (book: BookSummary) => void;
}

export default function BookDetailModal({
  bookSummary,
  onClose,
  onUpdate,
  onLoginRequired,
  onEdit,
}: BookDetailModalProps) {
  const { user } = useAuthStore();
  const [bookDetail, setBookDetail] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // Fetch full details if needed
  useState(() => {
    if (bookSummary) {
      setIsLoading(true);
      booksApi.getById(bookSummary.id)
        .then(setBookDetail)
        .catch(() => setBookDetail(null))
        .finally(() => setIsLoading(false));
    }
  });

  const book = bookDetail || (bookSummary as unknown as Book);
  if (!bookSummary || !book) return null;

  const isMyBorrow = !!(user && book.borrowed_by === user.id);
  const isBorrowed = book.status === 'Borrowed';
  const isAdmin = user?.role === 'admin';

  const handleBorrow = async () => {
    if (!user) {
      onLoginRequired();
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await booksApi.borrow(book.id);
      // Update local state with borrow result
      setBookDetail((prev) => prev ? {
        ...prev,
        borrow_count: prev.borrow_count + 1,
        borrowed_by: user.id,
        expires_at: res.expires_at,
      } : prev);
      onUpdate();
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
      await booksApi.return(book.id);
      setBookDetail((prev) => prev ? { ...prev, borrowed_by: null, expires_at: null } : prev);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถคืนหนังสือได้');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือ "${book.title}"?`)) return;
    setActionLoading(true);
    try {
      await booksApi.delete(book.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'ไม่สามารถลบหนังสือได้');
      setActionLoading(false);
    }
  };

  const handleExpire = useCallback(() => {
    setTimeout(() => {
      booksApi.getById(book.id).then(setBookDetail).catch(console.error);
      onUpdate();
    }, 800);
  }, [book.id, onUpdate]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">PDF E-BOOK</span>
            <span className="text-xs font-semibold text-purple-600">{book.genre}</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onEdit(book);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-purple-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                >
                  <Edit size={13} />
                  แก้ไข
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors"
                >
                  <Trash2 size={13} />
                  ลบ
                </button>
              </>
            )}

            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Cover & Quick Stats */}
          <div className="w-full md:w-48 shrink-0 flex flex-col items-center">
            <div className="w-40 md:w-full aspect-[1/1.38] rounded-xl overflow-hidden shadow-md border border-gray-200 bg-gray-100">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-50">
                  <BookOpen size={40} style={{ color: '#6021F5' }} />
                </div>
              )}
            </div>

            <div className="w-full mt-4 space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
              {book.year && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-gray-400"><Calendar size={12} /> ปีที่พิมพ์:</span>
                  <span className="font-semibold text-gray-700">{book.year}</span>
                </div>
              )}
              {book.pages && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-gray-400"><BookOpen size={12} /> จำนวนหน้า:</span>
                  <span className="font-semibold text-gray-700">{book.pages} หน้า</span>
                </div>
              )}
              {book.language && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-gray-400"><Globe size={12} /> ภาษา:</span>
                  <span className="font-semibold text-gray-700">{book.language}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-gray-400"><Clock size={12} /> สถิติการยืม:</span>
                <span className="font-semibold text-gray-700">{book.borrow_count} ครั้ง</span>
              </div>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {book.title}
              </h2>
              <p className="text-sm font-medium text-gray-600 mt-1">
                ผู้แต่ง: <span className="text-gray-800">{book.author}</span>
              </p>

              {/* Status Banner */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                  book.status === 'Available'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {book.status === 'Available' ? '● พร้อมให้บริการ' : '● ถูกยืมแล้ว'}
                </span>
                {isMyBorrow && book.expires_at && (
                  <CountdownBadge expiresAt={book.expires_at} onExpire={handleExpire} />
                )}
              </div>

              {/* Description */}
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">เนื้อหาโดยสังเขป</h4>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                  {book.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับหนังสือเล่มนี้'}
                </p>
              </div>

              {/* PDF Preview Link / Embed Option */}
              {book.pdf_url && (
                <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-900">
                    <FileText size={16} className="text-[#6021F5]" />
                    <span>มีเอกสารฉบับเต็ม (PDF)</span>
                  </div>
                  <a
                    href={book.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg shadow-sm"
                    style={{ backgroundColor: '#6021F5' }}
                  >
                    เปิดอ่าน PDF <ExternalLink size={11} />
                  </a>
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
                  {error}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
              {isMyBorrow ? (
                <button
                  onClick={handleReturn}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all"
                >
                  <RotateCcw size={15} />
                  {actionLoading ? 'กำลังคืน...' : 'คืนหนังสือ'}
                </button>
              ) : isBorrowed ? (
                <button
                  disabled
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                >
                  หนังสืออยู่ระหว่างถูกยืม (ไม่ว่าง)
                </button>
              ) : (
                <button
                  onClick={handleBorrow}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: '#6021F5' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5214E0')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6021F5')}
                >
                  {actionLoading ? 'กำลังดำเนินการ...' : 'ยืมหนังสือออนไลน์'}
                </button>
              )}

              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
