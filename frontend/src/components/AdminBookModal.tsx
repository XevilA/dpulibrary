// src/components/AdminBookModal.tsx
// Admin modal to create or update E-books with custom cover image URL and PDF document link

import { useState, useEffect } from 'react';
import { X, Plus, Save, BookOpen, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { booksApi } from '../api/client';
import type { BookSummary, SaveBookPayload } from '../types';

interface AdminBookModalProps {
  isOpen: boolean;
  bookToEdit: BookSummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

const GENRES = [
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

export default function AdminBookModal({
  isOpen,
  bookToEdit,
  onClose,
  onSuccess,
}: AdminBookModalProps) {
  const [formData, setFormData] = useState<SaveBookPayload>({
    title: '',
    author: '',
    description: '',
    genre: 'วรรณคดีไทย',
    cover_url: '',
    pdf_url: '',
    year: new Date().getFullYear(),
    pages: 200,
    isbn: '',
    language: 'ไทย',
    featured: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookToEdit) {
      // If editing existing book, fetch detail
      booksApi.getById(bookToEdit.id).then((b) => {
        setFormData({
          title: b.title,
          author: b.author,
          description: b.description || '',
          genre: b.genre || 'วรรณคดีไทย',
          cover_url: b.cover_url || '',
          pdf_url: b.pdf_url || '',
          year: b.year,
          pages: b.pages,
          isbn: b.isbn || '',
          language: b.language || 'ไทย',
          featured: b.featured || false,
        });
      }).catch(() => {
        setFormData({
          title: bookToEdit.title,
          author: bookToEdit.author,
          description: '',
          genre: bookToEdit.genre,
          cover_url: bookToEdit.cover_url,
          pdf_url: bookToEdit.pdf_url || '',
          year: null,
          pages: null,
          isbn: '',
          language: bookToEdit.language,
          featured: bookToEdit.featured,
        });
      });
    } else {
      // New book default
      setFormData({
        title: '',
        author: '',
        description: '',
        genre: 'วรรณคดีไทย',
        cover_url: '',
        pdf_url: '',
        year: 2026,
        pages: 150,
        isbn: '',
        language: 'ไทย',
        featured: false,
      });
    }
    setError(null);
  }, [bookToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim()) {
      setError('กรุณาระบุชื่อหนังสือและผู้แต่ง');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (bookToEdit) {
        await booksApi.update(bookToEdit.id, formData);
      } else {
        await booksApi.create(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 text-white" style={{ backgroundColor: '#6021F5' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <BookOpen size={18} className="text-white" />
            </div>
            <h2 className="text-base font-bold text-white">
              {bookToEdit ? 'แก้ไขข้อมูล E-Book' : 'เพิ่ม E-Book เล่มใหม่ (Admin)'}
            </h2>
          </div>

          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                ชื่อหนังสือ / E-Book *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="เช่น การเงินและการลงทุนสำหรับศตวรรษที่ 21"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                ผู้แต่ง / สำนักพิมพ์ *
              </label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="เช่น ศ.ดร. นามสกุล"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
              />
            </div>

            {/* Genre */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                หมวดหมู่
              </label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Cover URL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                <span>URL รูปภาพหน้าปก (Cover Image URL)</span>
                <span className="text-gray-400 font-normal">Unsplash / Image Link</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.cover_url}
                  onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
                />
                {formData.cover_url && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border shrink-0">
                    <img src={formData.cover_url} alt="Cover Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* PDF URL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><FileText size={12} className="text-red-500" /> ลิงก์ไฟล์ PDF / E-Book URL</span>
                <span className="text-gray-400 font-normal">PDF Link (e.g. Google Drive, CDN)</span>
              </label>
              <input
                type="url"
                value={formData.pdf_url || ''}
                onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
                placeholder="https://example.com/books/sample.pdf"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                ปีที่พิมพ์
              </label>
              <input
                type="number"
                value={formData.year || ''}
                onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="2026"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
              />
            </div>

            {/* Pages */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                จำนวนหน้า
              </label>
              <input
                type="number"
                value={formData.pages || ''}
                onChange={(e) => setFormData({ ...formData, pages: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="150"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
              />
            </div>

            {/* Max Borrow Days */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                <span>ระยะเวลายืมสูงสุดที่อนุญาต (วัน)</span>
                <span className="text-[#6021F5] font-semibold text-[11px]">Admin Policy</span>
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={formData.max_borrow_days || 14}
                onChange={(e) => setFormData({ ...formData, max_borrow_days: e.target.value ? parseInt(e.target.value) : 14 })}
                placeholder="14"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                เนื้อหาโดยสังเขป
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="สรุปเนื้อหาสำคัญของหนังสือเล่มนี้..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#6021F5] focus:outline-none"
              />
            </div>

            {/* Featured Checkbox */}
            <div className="md:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="featured-check"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="w-4 h-4 text-[#6021F5] rounded border-gray-300 focus:ring-[#6021F5]"
              />
              <label htmlFor="featured-check" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 cursor-pointer">
                <Sparkles size={13} className="text-amber-500" />
                แสดงในแบนเนอร์หนังสือแนะนำ (Featured Hero Carousel)
              </label>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all disabled:opacity-60"
              style={{ backgroundColor: '#6021F5' }}
            >
              <Save size={14} />
              {isLoading ? 'กำลังบันทึก...' : bookToEdit ? 'บันทึกการแก้ไข' : 'เพิ่ม E-Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
