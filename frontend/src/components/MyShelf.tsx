// src/components/MyShelf.tsx
// "ชั้นหนังสือของฉัน" — shows all books currently borrowed by the logged-in user

import { useEffect, useState } from 'react';
import { BookOpen, Clock, ExternalLink, RotateCcw, BookMarked, Loader2 } from 'lucide-react';
import { booksApi } from '../api/client';
import type { UserBorrowEntry } from '../types';

interface MyShelfProps {
  onReadBook: (entry: UserBorrowEntry) => void;
}

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) { setLabel('หมดอายุแล้ว'); return; }
      const days = Math.floor(ms / 86400000);
      const hours = Math.floor((ms % 86400000) / 3600000);
      if (days > 0) setLabel(`อีก ${days} วัน ${hours} ชั่วโมง`);
      else {
        const mins = Math.floor((ms % 3600000) / 60000);
        setLabel(`อีก ${hours} ชม. ${mins} นาที`);
      }
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const isUrgent = new Date(expiresAt).getTime() - Date.now() < 86400000 * 2;
  return (
    <span className={`text-xs font-semibold ${isUrgent ? 'text-red-400' : 'text-green-400'}`}>
      {label}
    </span>
  );
}

export default function MyShelf({ onReadBook }: MyShelfProps) {
  const [borrows, setBorrows] = useState<UserBorrowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState<string | null>(null);

  const fetchBorrows = async () => {
    try {
      const data = await booksApi.myBorrows();
      setBorrows(Array.isArray(data) ? data : []);
    } catch {
      setBorrows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBorrows(); }, []);

  const handleReturn = async (borrow_id: string) => {
    if (!window.confirm('คืนหนังสือเล่มนี้ใช่ไหม?')) return;
    setReturningId(borrow_id);
    try {
      await booksApi.returnByBorrowId(borrow_id);
      setBorrows((prev) => prev.filter((b) => b.borrow_id !== borrow_id));
    } catch {
      alert('เกิดข้อผิดพลาดในการคืนหนังสือ');
    } finally {
      setReturningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  if (borrows.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <BookMarked size={48} className="mx-auto text-gray-600" />
        <p className="text-gray-400 font-medium">ยังไม่มีหนังสือในชั้นของคุณ</p>
        <p className="text-gray-500 text-sm">กด "ยืม" ที่หน้าแค็ตตาล็อกเพื่อเพิ่มหนังสือ</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {borrows.map((entry) => (
        <div
          key={entry.borrow_id}
          className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-purple-900/30 hover:border-purple-700/50 transition-all group"
        >
          {/* Cover */}
          <div className="relative w-full h-44 bg-gray-900 overflow-hidden">
            {entry.cover_url ? (
              <img
                src={entry.cover_url}
                alt={entry.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={40} className="text-gray-600" />
              </div>
            )}
            {/* Genre badge */}
            <span className="absolute top-2 left-2 text-[10px] font-bold bg-purple-600/90 text-white px-2 py-0.5 rounded-full">
              {entry.genre}
            </span>
          </div>

          {/* Info */}
          <div className="p-3 space-y-2">
            <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">{entry.title}</h3>
            <p className="text-xs text-gray-400">{entry.author}</p>

            {/* Time remaining */}
            <div className="flex items-center gap-1.5 bg-gray-900/60 rounded-xl px-2 py-1.5">
              <Clock size={12} className="text-gray-400 shrink-0" />
              <TimeRemaining expiresAt={entry.expires_at} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {entry.pdf_url ? (
                <button
                  onClick={() => onReadBook(entry)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-[#6021F5] hover:bg-purple-600 rounded-xl transition-colors"
                >
                  <BookOpen size={13} />
                  อ่าน PDF
                </button>
              ) : (
                <a
                  href={`https://libdoc.dpu.ac.th`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-gray-600 hover:bg-gray-500 rounded-xl transition-colors"
                >
                  <ExternalLink size={13} />
                  เปิด
                </a>
              )}
              <button
                onClick={() => handleReturn(entry.borrow_id)}
                disabled={returningId === entry.borrow_id}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors"
                title="คืนหนังสือ"
              >
                {returningId === entry.borrow_id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RotateCcw size={12} />
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
