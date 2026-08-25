// src/components/PdfReaderModal.tsx
// In-App PDF Reader using Google Docs Viewer — bypasses X-Frame-Options & CORS restrictions
// Also accepts UserBorrowEntry (from MyShelf) or legacy Book props

import { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  BookOpen,
  RotateCcw,
  FileText,
  Clock,
  ZoomIn,
  ZoomOut,
  Loader2,
} from 'lucide-react';
import type { UserBorrowEntry } from '../types';

interface PdfReaderModalProps {
  // Can receive either a UserBorrowEntry (from MyShelf) or basic book info
  book: {
    borrow_id?: string;
    book_id?: string;
    id?: string;
    title: string;
    author: string;
    pdf_url?: string | null;
    expires_at?: string | null;
    max_borrow_days?: number;
  };
  onClose: () => void;
  onReturn: () => Promise<void>;
  onExpire?: () => void;
}

function CountdownLabel({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) { setLabel('หมดอายุแล้ว'); return; }
      const days = Math.floor(ms / 86400000);
      const hours = Math.floor((ms % 86400000) / 3600000);
      if (days > 0) setLabel(`${days}ว ${hours}ชม.`);
      else {
        const mins = Math.floor((ms % 3600000) / 60000);
        setLabel(`${hours}ชม. ${mins}น.`);
      }
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return <span className="text-xs text-purple-200 font-semibold">{label}</span>;
}

// Google Docs Viewer — renders PDFs client-side, bypasses X-Frame-Options
function buildViewerUrl(pdfUrl: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
}

export default function PdfReaderModal({
  book,
  onClose,
  onReturn,
  onExpire,
}: PdfReaderModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isReturning, setIsReturning] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // force reload

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  const handleReturnClick = async () => {
    if (!window.confirm('คุณต้องการคืนหนังสือเล่มนี้ใช่หรือไม่?')) return;
    setIsReturning(true);
    try {
      await onReturn();
      onClose();
    } catch {
      alert('เกิดข้อผิดพลาดในการคืนหนังสือ');
    } finally {
      setIsReturning(false);
    }
  };

  const pdfUrl = book.pdf_url || '';
  const viewerUrl = pdfUrl ? buildViewerUrl(pdfUrl) : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-md">
      {/* Control Bar */}
      <div className="bg-[#181B26] text-white px-4 sm:px-6 py-3 border-b border-gray-800 flex items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-xl bg-[#6021F5] text-white flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm md:text-base text-white truncate max-w-md md:max-w-xl">
              {book.title}
            </h2>
            <p className="text-gray-400 text-xs truncate">
              ผู้แต่ง: {book.author} • สำนักหอสมุด มหาวิทยาลัยธุรกิจบัณฑิตย์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Countdown */}
          {book.expires_at && (
            <div className="hidden sm:flex items-center gap-2 bg-purple-950/70 border border-purple-800/80 px-3 py-1.5 rounded-xl">
              <Clock size={13} className="text-purple-300" />
              <span className="text-xs text-purple-300">เหลือ:</span>
              <CountdownLabel expiresAt={book.expires_at} />
            </div>
          )}

          {/* Zoom */}
          <div className="hidden md:flex items-center gap-1 bg-gray-800/80 rounded-xl p-1 border border-gray-700">
            <button onClick={() => setZoom((z) => Math.max(50, z - 15))} className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg" title="ย่อ">
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-mono px-1.5 text-gray-300">{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(200, z + 15))} className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg" title="ขยาย">
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Reload iframe */}
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors"
            title="โหลดซ้ำ"
          >
            <Loader2 size={15} />
          </button>

          {/* Fullscreen */}
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Open in new tab (direct PDF) */}
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700" title="เปิดในแท็บใหม่">
              <ExternalLink size={16} />
            </a>
          )}

          {/* Return */}
          <button
            onClick={handleReturnClick}
            disabled={isReturning}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-2 rounded-xl shadow-sm transition-all"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">คืนหนังสือ</span>
          </button>

          {/* Close */}
          <button onClick={onClose} className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors ml-1" title="ปิด">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 w-full h-full bg-gray-900 overflow-auto flex items-center justify-center p-2 sm:p-4">
        {pdfUrl ? (
          <div
            className="w-full h-full max-w-6xl bg-white rounded-2xl overflow-hidden shadow-2xl transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Google Docs Viewer — works with cross-origin PDFs without X-Frame-Options issues */}
            <iframe
              key={iframeKey}
              src={viewerUrl}
              title={book.title}
              className="w-full h-full min-h-[85vh] border-0"
              allow="fullscreen"
            />
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-800 text-gray-300 rounded-3xl max-w-md border border-gray-700 space-y-4">
            <FileText size={48} className="mx-auto text-purple-400 opacity-60" />
            <div>
              <h3 className="font-bold text-lg text-white">ไม่พบไฟล์ PDF สำหรับหนังสือเล่มนี้</h3>
              <p className="text-xs text-gray-400 mt-1">กรุณาติดต่อเจ้าหน้าที่สำนักหอสมุด DPU หรือให้แอดมินอัปเดตลิงก์ PDF</p>
            </div>
            <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-white bg-[#6021F5] rounded-xl hover:opacity-90">ปิดหน้าต่าง</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export convenience type for callers
export type { UserBorrowEntry as ShelfEntry };
