// src/components/Navbar.tsx
// DPU official purple navbar — formal library style matching dpu.ac.th branding (RGB 96, 33, 245 / #6021F5)

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
    <header className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: '#6021F5' }}>
      {/* ── Top strip: logo + search + actions ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-20 gap-5">

          {/* Logo */}
          <a href="/" className="flex items-center gap-3.5 shrink-0 min-w-max hover:opacity-95 transition-opacity">
            <div className="bg-white rounded-2xl px-3.5 py-2 shadow-md flex items-center justify-center ring-2 ring-white/30">
              <img src="/dpu-logo.png" alt="DPU Logo" className="h-9 md:h-10 w-auto object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-extrabold text-lg md:text-xl leading-tight tracking-tight drop-shadow-sm">DPU Library</p>
              <p className="text-purple-100 text-xs leading-tight font-medium">สำนักหอสมุด มหาวิทยาลัยธุรกิจบัณฑิตย์</p>
            </div>
          </a>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="ค้นหาหนังสือ ผู้แต่ง หรือหมวดหมู่ใน DPU Library..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value === '') onSearch('');
                }}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-white text-gray-800
                           placeholder:text-gray-400 focus:outline-none focus:ring-2
                           focus:ring-white/60 shadow-sm"
              />
            </div>
          </form>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {['ห้องสมุด', 'เผยแพร่ฟรี', 'สื่อองค์กร'].map((label, i) => (
              <a
                key={i}
                href={i === 0 ? '#catalog' : '#popular'}
                className="px-3 py-1.5 text-sm font-medium text-white/85 hover:text-white
                           hover:bg-white/15 rounded-md transition-all"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-full shadow-sm transition-all"
                  >
                    <ShieldCheck size={14} />
                    แผงควบคุม Admin
                  </button>
                )}

                <span className="text-white/90 text-xs font-medium max-w-[100px] truncate bg-white/15 px-2.5 py-1 rounded-full">
                  {user.display_name}
                </span>

                <button
                  onClick={() => logout()}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6021F5] bg-white
                             rounded-full hover:bg-purple-50 transition-colors shadow-sm"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-1.5 text-sm font-semibold text-[#6021F5] bg-white
                           rounded-full hover:bg-purple-50 transition-colors shadow-sm"
              >
                ลงชื่อเข้าใช้
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white ml-auto"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Bottom nav underline bar (matches reference screenshot) ── */}
      <div className="hidden md:block border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 h-9">
          {[
            { label: 'ห้องสมุด', href: '#catalog', active: true },
            { label: 'เผยแพร่ฟรี', href: '#popular' },
            { label: 'สื่อองค์กร', href: '#popular' },
          ].map(({ label, href, active }) => (
            <a
              key={label}
              href={href}
              className={`text-sm font-medium pb-0.5 transition-all ${
                active
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 pt-2 space-y-2 border-t border-white/20">
          {isAdmin && onOpenAdmin && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenAdmin();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-amber-500 rounded-xl shadow-sm"
            >
              <ShieldCheck size={15} />
              เปิดแผงควบคุม Admin
            </button>
          )}

          {['ห้องสมุด', 'เผยแพร่ฟรี', 'สื่อองค์กร'].map((label) => (
            <a key={label} href="#catalog" className="block text-white/90 text-sm py-1.5">
              {label}
            </a>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <DarkModeToggle />
            {user ? (
              <button onClick={() => logout()} className="px-3 py-1.5 text-xs text-[#6021F5] bg-white rounded-full">
                ออกจากระบบ
              </button>
            ) : (
              <button onClick={onLoginClick} className="px-4 py-1.5 text-sm font-semibold text-[#6021F5] bg-white rounded-full">
                ลงชื่อเข้าใช้
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
