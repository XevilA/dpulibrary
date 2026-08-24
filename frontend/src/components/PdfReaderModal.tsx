// src/components/PdfReaderModal.tsx
// Full-featured built-in In-App PDF Reader / E-Book Viewer for borrowed items

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
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Book } from '../types';
import CountdownBadge from './CountdownBadge';

interface PdfReaderModalProps {
  book: Book;
  onClose: () => void;
  onReturn: () => Promise<void>;
  onExpire: () => void;
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

  // Esc key to close or exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
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
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการคืนหนังสือ');
    } finally {
      setIsReturning(false);
    }
  };

  const pdfUrl = book.pdf_url || '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/90 backdrop-blur-md">
      {/* Top E-Reader Control Bar */}
      <div className="bg-[#181B26] text-white px-4 sm:px-6 py-3 border-b border-gray-800 flex items-center justify-between gap-4 shrink-0 shadow-lg">
        {/* Left: Book Title & DPU Badge */}
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

        {/* Right: Borrow Countdown, Controls, Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Remaining Time Countdown */}
          {book.expires_at && (
            <div className="hidden sm:flex items-center gap-2 bg-purple-950/70 border border-purple-800/80 px-3 py-1.5 rounded-xl">
              <Clock size={13} className="text-purple-300" />
              <span className="text-xs text-purple-200 font-medium">เวลายืมคงเหลือ:</span>
              <CountdownBadge expiresAt={book.expires_at} onExpire={onExpire} />
            </div>
          )}

          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-gray-800/80 rounded-xl p-1 border border-gray-700">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
              className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="ย่อขนาด"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-mono px-1.5 text-gray-300">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 15))}
              className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="ขยายขนาด"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors"
            title={isFullscreen ? 'ออกจากโหมดเต็มหน้าจอ' : 'เต็มหน้าจอ'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* External Window */}
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors"
              title="เปิดในแท็บใหม่"
            >
              <ExternalLink size={16} />
            </a>
          )}

          {/* Quick Return Book Button */}
          <button
            onClick={handleReturnClick}
            disabled={isReturning}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-2 rounded-xl shadow-sm transition-all"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">คืนหนังสือ</span>
          </button>

          {/* Close Reader */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors ml-1"
            title="ปิดหน้าต่างอ่าน"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main PDF Viewer Frame */}
      <div className="flex-1 w-full h-full bg-gray-900 overflow-auto flex items-center justify-center p-2 sm:p-4">
        {pdfUrl ? (
          <div
            className="w-full h-full max-w-6xl bg-white rounded-2xl overflow-hidden shadow-2xl transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title={book.title}
              className="w-full h-full min-h-[85vh] border-0"
            />
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-800 text-gray-300 rounded-3xl max-w-md border border-gray-700 space-y-4">
            <FileText size={48} className="mx-auto text-purple-400 opacity-60" />
            <div>
              <h3 className="font-bold text-lg text-white">ไม่พบไฟล์ PDF สำหรับหนังสือเล่มนี้</h3>
              <p className="text-xs text-gray-400 mt-1">
                กรุณาติดต่อเจ้าหน้าที่สำนักหอสมุด DPU หรือให้แอดมินอัปเดตลิงก์ PDF
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-[#6021F5] rounded-xl hover:opacity-90 transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
