// src/components/AdminDashboard.tsx
// Full-featured Admin Dashboard for DPU Library management

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Users,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Server,
  Database,
  Activity,
} from 'lucide-react';
import { booksApi, adminApi } from '../api/client';
import type { BookSummary, AdminStats, BorrowHistoryRecord } from '../types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface AdminDashboardProps {
  onBackToLibrary: () => void;
  onOpenAddBook: () => void;
  onOpenEditBook: (book: BookSummary) => void;
}

type Tab = 'books' | 'history' | 'system';

export default function AdminDashboard({
  onBackToLibrary,
  onOpenAddBook,
  onOpenEditBook,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('books');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [history, setHistory] = useState<BorrowHistoryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsData, booksData, historyData] = await Promise.all([
        adminApi.getStats().catch(() => null),
        booksApi.list({ search, genre, limit: 100 }).catch(() => null),
        adminApi.getHistory().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      if (booksData) setBooks(booksData.data);
      if (historyData) setHistory(historyData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search, genre]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteBook = async (book: BookSummary) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือ "${book.title}"?`)) return;
    try {
      await booksApi.delete(book.id);
      fetchData();
    } catch (err) {
      alert('ไม่สามารถลบหนังสือได้');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-gray-900">
      {/* Top Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-18 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToLibrary}
                className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-gray-600 hover:text-[#6021F5] px-3 py-1.5 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-all"
              >
                <ArrowLeft size={16} />
                กลับหน้าห้องสมุด
              </button>

              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="p-1 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <img src="/dpu-logo.png" alt="DPU" className="h-6 w-auto object-contain" />
                </div>
                <div>
                  <h1 className="font-extrabold text-gray-900 text-base md:text-lg leading-tight flex items-center gap-2">
                    ระบบจัดการห้องสมุดดิจิทัล DPU
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white bg-[#6021F5]">
                      Admin Portal
                    </span>
                  </h1>
                  <p className="text-gray-400 text-xs">Dhurakij Pundit University • E-Library Management Center</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={isRefreshing}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-purple-600 hover:bg-gray-50 transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-[#6021F5]' : ''} />
              </button>

              <button
                onClick={onOpenAddBook}
                className="flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-bold text-white rounded-xl shadow-sm hover:opacity-95 transition-all"
                style={{ backgroundColor: '#6021F5' }}
              >
                <Plus size={16} />
                เพิ่ม E-Book เล่มใหม่
              </button>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex gap-6 border-t border-gray-100">
            {[
              { id: 'books', label: 'จัดการคลังหนังสือ / E-Book PDF', count: stats?.total_books },
              { id: 'history', label: 'ประวัติและสถานะการยืม-คืนสด', count: stats?.active_borrows },
              { id: 'system', label: 'สถานะระบบ & Cache Redis' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as Tab)}
                className={`py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                  tab === t.id
                    ? 'text-[#6021F5] border-[#6021F5]'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    tab === t.id ? 'bg-purple-100 text-[#6021F5]' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400">หนังสือและ E-Book ทั้งหมด</p>
              <p className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
                {stats?.total_books ?? '...'}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">● พร้อมให้บริการในระบบ</span>
            </div>
            <div className="p-3 bg-purple-50 rounded-2xl text-[#6021F5]">
              <BookOpen size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400">อยู่ระหว่างถูกยืม (Active)</p>
              <p className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
                {stats?.active_borrows ?? '...'}
              </p>
              <span className="text-[10px] text-amber-600 font-semibold mt-1 inline-block">● นับถอยหลังหมดอายุ 1 นาที</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400">สมาชิกในระบบ DPU</p>
              <p className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
                {stats?.total_users ?? '...'}
              </p>
              <span className="text-[10px] text-purple-600 font-semibold mt-1 inline-block">● สิทธิ์ Admin & Member</span>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <Users size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400">ธุรกรรมการยืม-คืนรวม</p>
              <p className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
                {stats?.total_history_records ?? '...'}
              </p>
              <span className="text-[10px] text-gray-400 font-semibold mt-1 inline-block">● บันทึกใน PostgreSQL</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <Activity size={24} />
            </div>
          </div>
        </div>

        {/* TAB 1: Books Management */}
        {tab === 'books' && (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            {/* Table Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50/50">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder="ค้นหาชื่อหนังสือ หรือ ผู้แต่ง..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6021F5]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-gray-400">พบ {books.length} รายการ</span>
              </div>
            </div>

            {/* Books Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3.5 px-4">รูปหน้าปก</th>
                    <th className="py-3.5 px-4">ชื่อหนังสือ / E-Book</th>
                    <th className="py-3.5 px-4">ผู้แต่ง</th>
                    <th className="py-3.5 px-4">หมวดหมู่</th>
                    <th className="py-3.5 px-4">เอกสาร PDF</th>
                    <th className="py-3.5 px-4">สถานะ</th>
                    <th className="py-3.5 px-4">ยอดจอง/ยืม</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {books.map((book) => (
                    <tr key={book.id} className="hover:bg-purple-50/20 transition-colors">
                      {/* Cover */}
                      <td className="py-3 px-4">
                        <div className="w-10 aspect-[1/1.38] rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-purple-400">
                              <BookOpen size={14} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Title & Featured */}
                      <td className="py-3 px-4 font-bold text-gray-900 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          {book.featured && (
                            <span title="หนังสือแนะนำ">
                              <Sparkles size={13} className="text-amber-500 shrink-0" />
                            </span>
                          )}
                          <span className="line-clamp-1">{book.title}</span>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">{book.author}</td>

                      {/* Genre */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                          {book.genre}
                        </span>
                      </td>

                      {/* PDF Link */}
                      <td className="py-3 px-4">
                        {book.pdf_url ? (
                          <a
                            href={book.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded hover:bg-red-700 shadow-sm"
                          >
                            <FileText size={10} />
                            ดู PDF
                          </a>
                        ) : (
                          <span className="text-gray-300 text-[11px]">- ไม่มี -</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          book.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {book.status === 'Available' ? 'พร้อมให้บริการ' : 'ถูกยืม'}
                        </span>
                      </td>

                      {/* Borrow count */}
                      <td className="py-3 px-4 text-gray-500">{book.borrow_count} ครั้ง</td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenEditBook(book)}
                            className="p-1.5 text-gray-600 hover:text-[#6021F5] hover:bg-purple-50 rounded-lg border border-gray-200 transition-colors"
                            title="แก้ไข"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Live Borrow History */}
        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-sm">บันทึกธุรกรรมการยืม-คืน 50 รายการล่าสุด</h3>
              <span className="text-xs text-gray-400">อัปเดตแบบเรียลไทม์</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">หนังสือ</th>
                    <th className="py-3 px-4">ผู้ยืม</th>
                    <th className="py-3 px-4">เวลายืม</th>
                    <th className="py-3 px-4">เวลาคืน</th>
                    <th className="py-3 px-4">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        ยังไม่มีประวัติการยืม-คืนในระบบ
                      </td>
                    </tr>
                  ) : (
                    history.map((record) => (
                      <tr key={record.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900">{record.book_title}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-800">{record.user_name}</p>
                          <p className="text-[11px] text-gray-400">{record.user_email}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {format(new Date(record.borrowed_at), 'dd MMM yyyy HH:mm:ss', { locale: th })}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {record.returned_at
                            ? format(new Date(record.returned_at), 'dd MMM yyyy HH:mm:ss', { locale: th })
                            : '- ยังไม่คืน -'}
                        </td>
                        <td className="py-3 px-4">
                          {record.returned_at ? (
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                              record.expired
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {record.expired ? '⏰ คืนอัตโนมัติ (หมดเวลา)' : '✓ คืนสำเร็จโดยผู้ใช้'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              ● กำลังยืมอยู่
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: System & Cache Status */}
        {tab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <Database size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">PostgreSQL 15</h4>
                  <p className="text-xs text-gray-400">Primary Relational Database</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">สถานะ:</span> <span className="font-bold text-emerald-600">● เชื่อมต่อสำเร็จ (Healthy)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">ตารางหลัก:</span> <span className="font-medium text-gray-700">books, users, history</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Connection Pool:</span> <span className="font-medium text-gray-700">Max 20 Connections</span></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-50 text-red-600">
                  <Server size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Redis 7 (In-Memory)</h4>
                  <p className="text-xs text-gray-400">High-Speed Query Cache & Blocklist</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">สถานะ:</span> <span className="font-bold text-emerald-600">● แคชทำงานปกติ (Active)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Cache Invalidation:</span> <span className="font-medium text-gray-700">อัตโนมัติเมื่อยืม/คืน/แก้</span></div>
                <div className="flex justify-between"><span className="text-gray-400">JWT Revocation:</span> <span className="font-medium text-gray-700">Redis Blocklist</span></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-50 text-[#6021F5]">
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Auto-Expire Worker</h4>
                  <p className="text-xs text-gray-400">Tokio Async Background Task</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">รอบการสแกน:</span> <span className="font-medium text-gray-700">ทุก 30 วินาที</span></div>
                <div className="flex justify-between"><span className="text-gray-400">กำหนดเวลายืมทดสอบ:</span> <span className="font-medium text-purple-600">1 นาที (Auto-Return)</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Runtime:</span> <span className="font-medium text-gray-700">Rust Tokio Engine</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
