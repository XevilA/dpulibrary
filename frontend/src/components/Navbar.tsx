// src/components/Navbar.tsx
// Modern Transparent White Glassmorphism Navbar with DPU branding

import { useState } from 'react';
import { Search, Menu, X, ShieldCheck } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { useAuthStore } from '../store/authStore';

interface NavbarProps {
  onSearch: (query: string) => void;
  onLoginClick: () => void;
  onOpenAdmin?: () => void;
  searchValue: string;
}

export default function Navbar({ onSearch, onLoginClick, onOpenAdmin, searchValue }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchValue);

  const isAdmin = user?.role === 'admin';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800 shadow-sm transition-all">
      {/* ── Top strip: logo + search + actions ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 sm:h-20 gap-4 sm:gap-6">

          {/* Logo */}
          <a href="/" className="flex items-center gap-3 shrink-0 min-w-max hover:opacity-90 transition-opacity">
            <div className="p-1.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 shadow-xs flex items-center justify-center">
              <img src="/dpu-logo.png" alt="DPU Logo" className="h-8 sm:h-9 md:h-10 w-auto object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-gray-900 dark:text-white font-extrabold text-base md:text-lg leading-tight tracking-tight">DPU Library</p>
              <p className="text-gray-500 dark:text-gray-400 text-[11px] md:text-xs leading-tight font-medium">สำนักหอสมุด มหาวิทยาลัยธุรกิจบัณฑิตย์</p>
            </div>
          </a>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="ค้นหาหนังสือ ผู้แต่ง หรือหมวดหมู่..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value === '') onSearch('');
                }}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-full bg-gray-100/90 dark:bg-gray-800/90 text-gray-900 dark:text-white
                           placeholder:text-gray-400 border border-transparent focus:border-purple-300 dark:focus:border-purple-700 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2
                           focus:ring-[#6021F5]/20 shadow-inner transition-all"
              />
            </div>
          </form>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {[
              { label: 'ห้องสมุด', href: '#catalog' },
              { label: 'เผยแพร่ฟรี', href: '#popular' },
              { label: 'สื่อองค์กร', href: '#popular' },
            ].map(({ label, href }, i) => (
              <a
                key={i}
                href={href}
                className="px-3.5 py-1.5 text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-[#6021F5] dark:hover:text-purple-400
                           hover:bg-purple-50/70 dark:hover:bg-purple-950/30 rounded-full transition-all"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <DarkModeToggle />

            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && onOpenAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-full shadow-xs transition-all"
                  >
                    <ShieldCheck size={14} />
                    แผงควบคุม Admin
                  </button>
                )}

                <span className="text-gray-700 dark:text-gray-200 text-xs font-semibold max-w-[120px] truncate bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700 px-3 py-1.5 rounded-full">
                  {user.display_name}
                </span>

                <button
                  onClick={() => logout()}
                  className="px-3.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/30
                             rounded-full transition-all shadow-xs"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-5 py-2 text-xs md:text-sm font-bold text-white bg-[#6021F5] hover:bg-purple-700
                           rounded-full shadow-sm hover:shadow-purple-500/20 transition-all active:scale-[0.98]"
              >
                ลงชื่อเข้าใช้
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-700 dark:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-auto"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* ── Bottom nav underline bar for desktop ── */}
      <div className="hidden md:block border-t border-gray-100 dark:border-gray-800/80 bg-white/40 dark:bg-gray-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 h-9">
          {[
            { label: 'ห้องสมุด', href: '#catalog', active: true },
            { label: 'เผยแพร่ฟรี', href: '#popular' },
            { label: 'สื่อองค์กร', href: '#popular' },
          ].map(({ label, href, active }) => (
            <a
              key={label}
              href={href}
              className={`text-xs md:text-sm font-semibold pb-0.5 transition-all ${
                active
                  ? 'text-[#6021F5] dark:text-purple-400 border-b-2 border-[#6021F5] dark:border-purple-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 pt-3 space-y-2 border-t border-gray-200/60 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-lg animate-in slide-in-from-top-2 duration-150">
          {isAdmin && onOpenAdmin && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenAdmin();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-amber-500 rounded-xl shadow-xs"
            >
              <ShieldCheck size={15} />
              เปิดแผงควบคุม Admin
            </button>
          )}

          {['ห้องสมุด', 'เผยแพร่ฟรี', 'สื่อองค์กร'].map((label) => (
            <a key={label} href="#catalog" className="block text-gray-700 dark:text-gray-200 font-medium text-sm py-2 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {label}
            </a>
          ))}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <DarkModeToggle />
            {user ? (
              <button onClick={() => logout()} className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-full">
                ออกจากระบบ ({user.display_name})
              </button>
            ) : (
              <button onClick={onLoginClick} className="px-5 py-2 text-xs font-bold text-white bg-[#6021F5] rounded-full shadow-xs">
                ลงชื่อเข้าใช้
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
