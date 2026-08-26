// src/App.tsx — Root application component
// Orchestrates Views: Library Home, My Shelf (ชั้นหนังสือ), Book Detail Page, and Admin Dashboard.

import { useEffect, useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import BookGrid from './components/BookGrid';
import PopularBooks from './components/PopularBooks';
import LoginModal from './components/LoginModal';
import BookDetailPage from './components/BookDetailPage';
import AdminBookModal from './components/AdminBookModal';
import AdminDashboard from './components/AdminDashboard';
import MyShelf from './components/MyShelf';
import PdfReaderModal from './components/PdfReaderModal';
import { booksApi } from './api/client';
import { useAuthStore } from './store/authStore';
import { getFirebaseRedirectResult } from './firebase';
import type { BookSummary, PaginatedBooks, UserBorrowEntry } from './types';
import { BookMarked } from 'lucide-react';

export default function App() {
  const { user, hydrate, googleLogin } = useAuthStore();

  // ── View & Navigation State ──────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<'library' | 'admin' | 'shelf'>('library');
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);

  // ── Data state ──────────────────────────────────────────────────────────
  const [featuredBooks, setFeaturedBooks] = useState<BookSummary[]>([]);
  const [popularBooks, setPopularBooks] = useState<BookSummary[]>([]);
  const [catalogData, setCatalogData] = useState<PaginatedBooks | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  // ── Filter / pagination state ─────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(1);

  // ── UI Modal states ───────────────────────────────────────────────────
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<BookSummary | null>(null);

  // ── PDF Reader state ──────────────────────────────────────────────────
  const [pdfEntry, setPdfEntry] = useState<UserBorrowEntry | null>(null);

  // ── Hydrate auth from localStorage on mount ───────────────────────────
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ── Handle Firebase redirect result (after signInWithRedirect) ────────
  useEffect(() => {
    getFirebaseRedirectResult().then(async (result) => {
      if (!result) return;
      try {
        await googleLogin({
          credential: result.idToken,
          email: result.email ?? undefined,
          name: result.displayName ?? 'นักศึกษา DPU',
        });
      } catch {
        // Silently handle — user will see login error if they open modal
      }
    });
  }, [googleLogin]);

  // ── Fetch featured books (hero banner) ───────────────────────────────
  const fetchFeatured = useCallback(() => {
    booksApi
      .featured()
      .then((res) => {
        if (Array.isArray(res)) {
          setFeaturedBooks(res);
        } else if (res && Array.isArray((res as any).data)) {
          setFeaturedBooks((res as any).data);
        } else {
          setFeaturedBooks([]);
        }
      })
      .catch(() => setFeaturedBooks([]));
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  // ── Fetch popular books (numbered list) ──────────────────────────────
  const fetchPopular = useCallback(() => {
    booksApi
      .popular()
      .then((res) => {
        if (Array.isArray(res)) {
          setPopularBooks(res);
        } else if (res && Array.isArray((res as any).data)) {
          setPopularBooks((res as any).data);
        } else {
          setPopularBooks([]);
        }
      })
      .catch(() => setPopularBooks([]));
  }, []);

  useEffect(() => {
    fetchPopular();
  }, [fetchPopular]);

  // ── Fetch catalog (paginated, searchable, filterable) ─────────────────
  const fetchCatalog = useCallback(() => {
    setIsCatalogLoading(true);
    booksApi
      .list({ search, genre, page, limit: 18 })
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          setCatalogData(res);
        } else {
          setCatalogData({ data: [], total: 0, page: 1, limit: 18, total_pages: 0 });
        }
      })
      .catch(() => {
        setCatalogData({ data: [], total: 0, page: 1, limit: 18, total_pages: 0 });
      })
      .finally(() => setIsCatalogLoading(false));
  }, [search, genre, page]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // ── Refresh all data on change ────────────────────────────────────────
  const handleUpdate = useCallback(() => {
    fetchCatalog();
    fetchPopular();
    fetchFeatured();
  }, [fetchCatalog, fetchPopular, fetchFeatured]);

  // ── Search handler (resets to page 1 & goes back to home) ─────────────
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
    setSelectedBook(null);
    setCurrentView('library');
  }, []);

  // ── Genre handler (resets to page 1) ─────────────────────────────────
  const handleGenre = useCallback((g: string) => {
    setGenre(g);
    setPage(1);
    setSelectedBook(null);
  }, []);

  // ── Admin Actions ────────────────────────────────────────────────────
  const handleOpenAddBook = () => {
    setBookToEdit(null);
    setAdminModalOpen(true);
  };

  const handleOpenEditBook = (book: BookSummary) => {
    setBookToEdit(book);
    setAdminModalOpen(true);
  };

  // ── PDF Reader ────────────────────────────────────────────────────────
  const handleReadBook = (entry: UserBorrowEntry) => {
    setPdfEntry(entry);
  };

  const handleReturnFromPdf = async () => {
    if (!pdfEntry) return;
    await booksApi.returnByBorrowId(pdfEntry.borrow_id);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFE] text-gray-900 flex flex-col selection:bg-purple-100 selection:text-purple-900">
      {/* 1. Admin Dashboard View */}
      {currentView === 'admin' && user?.role === 'admin' ? (
        <AdminDashboard
          onBackToLibrary={() => setCurrentView('library')}
          onOpenAddBook={handleOpenAddBook}
          onOpenEditBook={handleOpenEditBook}
        />
      ) : (
        <>
          {/* Main University Navbar */}
          <Navbar
            onSearch={handleSearch}
            onLoginClick={() => setLoginOpen(true)}
            onOpenAdmin={() => setCurrentView('admin')}
            searchValue={search}
          />

          {/* My Shelf Tab Button (shown when logged in) */}
          {user && (
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800 sticky top-16 sm:top-20 z-40 transition-all">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2">
                <button
                  onClick={() => { setCurrentView('library'); setSelectedBook(null); }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
                    currentView !== 'shelf'
                      ? 'bg-[#6021F5] text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
                  }`}
                >
                  📚 คลังหนังสือ
                </button>
                <button
                  onClick={() => setCurrentView('shelf')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
                    currentView === 'shelf'
                      ? 'bg-[#6021F5] text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
                  }`}
                >
                  <BookMarked size={16} />
                  ชั้นหนังสือของฉัน
                </button>
              </div>
            </div>
          )}

          {/* 2. My Shelf View */}
          {currentView === 'shelf' && user ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-gray-900">📖 ชั้นหนังสือของฉัน</h2>
                <p className="text-gray-500 text-sm mt-1">หนังสือที่คุณกำลังยืมอยู่ในขณะนี้</p>
              </div>
              <MyShelf onReadBook={handleReadBook} />
            </div>
          ) : selectedBook ? (
            /* 3. Full Book Detail Page View */
            <BookDetailPage
              bookSummary={selectedBook}
              onBack={() => setSelectedBook(null)}
              onSelectBook={setSelectedBook}
              onLoginRequired={() => setLoginOpen(true)}
              onEditBook={handleOpenEditBook}
            />
          ) : (
            /* 4. Library Home Catalog View */
            <>
              {/* Hero banner carousel */}
              <HeroBanner books={featuredBooks} onSelectBook={setSelectedBook} />

              {/* Main content */}
              <main className="flex-1">
                {/* Book catalog with compact cards */}
                <BookGrid
                  data={catalogData}
                  isLoading={isCatalogLoading}
                  onPageChange={setPage}
                  onGenreChange={handleGenre}
                  selectedGenre={genre}
                  onSelectBook={setSelectedBook}
                  onEditBook={handleOpenEditBook}
                  onAddBook={handleOpenAddBook}
                />

                {/* Popular books */}
                <PopularBooks
                  books={popularBooks}
                  onSelectBook={setSelectedBook}
                />
              </main>
            </>
          )}

          {/* Formal University Footer */}
          <footer className="bg-white border-t border-gray-200 mt-12 py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                    <img src="/dpu-logo.png" alt="DPU Logo" className="h-10 md:h-12 w-auto object-contain" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">สำนักหอสมุด มหาวิทยาลัยธุรกิจบัณฑิตย์</h3>
                    <p className="text-gray-500 text-xs">Dhurakij Pundit University Library & Information Center</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <button
                    onClick={() => { setSelectedBook(null); setCurrentView('library'); }}
                    className="hover:text-purple-700 transition-colors"
                  >
                    อีบุ๊กทั้งหมด
                  </button>
                  {user && (
                    <button onClick={() => setCurrentView('shelf')} className="hover:text-purple-700 transition-colors">
                      ชั้นหนังสือของฉัน
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setCurrentView('admin')}
                      className="text-[#6021F5] font-bold hover:underline"
                    >
                      ⚙️ แผงควบคุม Admin
                    </button>
                  )}
                  <a href="https://dpu.ac.th" target="_blank" rel="noreferrer" className="hover:text-purple-700 transition-colors font-medium">เว็บไซต์มหาวิทยาลัย DPU</a>
                </div>
              </div>
              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
                <p>© 2026 ระบบห้องสมุดออนไลน์ DPU — มหาวิทยาลัยธุรกิจบัณฑิตย์ (Dhurakij Pundit University)</p>
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  ระบบทำงานปกติ • Powered by Rust + PostgreSQL + Redis
                </p>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Admin Add / Edit Book Modal */}
      <AdminBookModal
        isOpen={adminModalOpen}
        bookToEdit={bookToEdit}
        onClose={() => setAdminModalOpen(false)}
        onSuccess={handleUpdate}
      />

      {/* Login Modal */}
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* PDF Reader Modal (from My Shelf) */}
      {pdfEntry && (
        <PdfReaderModal
          book={{
            borrow_id: pdfEntry.borrow_id,
            book_id: pdfEntry.book_id,
            title: pdfEntry.title,
            author: pdfEntry.author,
            pdf_url: pdfEntry.pdf_url,
            expires_at: pdfEntry.expires_at,
            max_borrow_days: pdfEntry.max_borrow_days,
          }}
          onClose={() => setPdfEntry(null)}
          onReturn={handleReturnFromPdf}
          onExpire={() => setPdfEntry(null)}
        />
      )}
    </div>
  );
}
