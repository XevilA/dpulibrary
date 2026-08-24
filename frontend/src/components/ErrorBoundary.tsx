// src/components/ErrorBoundary.tsx
// Catches any rendering error to prevent white-screen crashes and provides a graceful fallback

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">เกิดข้อผิดพลาดในการโหลดหน้าเว็บ</h2>
            <p className="text-xs text-gray-500">
              {this.state.error?.message || 'ระบบไม่สามารถแสดงผลส่วนนี้ได้ กรุณาลองใหม่อีกครั้ง'}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('elib_token');
                localStorage.removeItem('elib_user');
                window.location.href = '/';
              }}
              className="w-full py-3 px-6 text-xs font-bold text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#6021F5' }}
            >
              <RotateCcw size={15} />
              โหลดหน้าเว็บใหม่อีกครั้ง
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
