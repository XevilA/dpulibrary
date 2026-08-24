// src/components/DarkModeToggle.tsx — Light mode is default
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Default is LIGHT — only dark if user explicitly saved 'dark'
    return localStorage.getItem('dpu_theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dpu_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dpu_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                 text-white/80 hover:text-white hover:bg-white/15 transition-all"
      aria-label={isDark ? 'โหมดกลางวัน' : 'โหมดกลางคืน'}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
      <span className="text-xs hidden sm:block">
        {isDark ? 'กลางวัน' : 'กลางคืน'}
      </span>
    </button>
  );
}
