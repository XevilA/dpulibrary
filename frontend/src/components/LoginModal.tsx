// src/components/LoginModal.tsx
// University Institutional Auth Modal — Clean White, DPU Purple, Single Firebase Google Sign-In button, No Mock Box, and Strict @dpu.ac.th Domain Enforcement

import { useState } from 'react';
import { X, Eye, EyeOff, Loader2, Mail, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { signInWithGoogleFirebase } from '../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, register, googleLogin, isLoading } = useAuthStore();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateEmail = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return 'กรุณากรอกอีเมล';
    if (!trimmed.endsWith('@dpu.ac.th')) {
      return 'กรุณาใช้อีเมลของมหาวิทยาลัยธุรกิจบัณฑิตย์ (@dpu.ac.th) เท่านั้น';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      if (tab === 'login') {
        await login(email.trim().toLowerCase(), password);
      } else {
        if (!displayName.trim()) {
          setError('กรุณากรอกชื่อ-นามสกุล');
          return;
        }
        await register(email.trim().toLowerCase(), password, displayName.trim());
      }
      handleClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
      setError(msg);
    }
  };

  // ── Single Real Firebase Google Sign-In Popup Handler ───────────────────────
  const handleFirebaseGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      // 1. Try Firebase Auth popup
      const googleRes = await signInWithGoogleFirebase();

      if (!googleRes.email?.toLowerCase().endsWith('@dpu.ac.th')) {
        setError('กรุณาใช้บัญชี Google ของมหาวิทยาลัย (@dpu.ac.th) เท่านั้น');
        setGoogleLoading(false);
        return;
      }

      // 2. Authenticate session with backend
      await googleLogin({
        credential: googleRes.idToken,
        email: googleRes.email,
        name: googleRes.displayName || 'นักศึกษา DPU',
      });

      handleClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);

      // If user closed popup intentionally, don't show error
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setGoogleLoading(false);
        return;
      }

      // Fallback: Check if standard OAuth 2.0 token flow works
      if (window.google?.accounts?.oauth2) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: '1038472918234-dpu-library-oauth-client.apps.googleusercontent.com',
            scope: 'email profile openid',
            hd: 'dpu.ac.th',
            callback: async (tokenResponse) => {
              if (tokenResponse.access_token) {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = await res.json();
                if (!profile.email?.toLowerCase().endsWith('@dpu.ac.th')) {
                  setError('กรุณาใช้บัญชี Google ของมหาวิทยาลัย (@dpu.ac.th) เท่านั้น');
                  setGoogleLoading(false);
                  return;
                }
                await googleLogin({ email: profile.email, name: profile.name });
                handleClose();
              }
            },
          });
          client.requestAccessToken();
          return;
        } catch (fallbackErr) {
          console.warn(fallbackErr);
        }
      }

      const msg =
        err.response?.data?.error ||
        err.message ||
        'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง';
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog Card (Clean White, Formal Institutional Style) */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Strip with DPU Branding */}
        <div className="px-6 pt-6 pb-5 text-white flex items-center justify-between" style={{ backgroundColor: '#6021F5' }}>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-2xl p-2 shadow-sm flex items-center justify-center">
              <img src="/dpu-logo.png" alt="DPU Logo" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white leading-tight">DPU Library</h2>
              <p className="text-purple-100 text-xs font-medium">
                ระบบห้องสมุดออนไลน์ มหาวิทยาลัยธุรกิจบัณฑิตย์
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50/70">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-3.5 text-xs md:text-sm font-bold transition-all border-b-2 ${
              tab === 'login'
                ? 'text-[#6021F5] border-[#6021F5] bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-3.5 text-xs md:text-sm font-bold transition-all border-b-2 ${
              tab === 'register'
                ? 'text-[#6021F5] border-[#6021F5] bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-800'
            }`}
          >
            สมัครสมาชิกใหม่
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs animate-shake">
              <AlertCircle size={16} className="shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. ONLY ONE Single Official Google Sign-In Button */}
          <button
            type="button"
            onClick={handleFirebaseGoogleSignIn}
            disabled={googleLoading || isLoading}
            className="w-full py-3 px-4 bg-white border border-gray-300 hover:border-purple-400 hover:bg-purple-50/30 rounded-2xl text-xs md:text-sm font-bold text-gray-700 shadow-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin text-[#6021F5]" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>เข้าสู่ระบบด้วย Google (@dpu.ac.th)</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
              หรือเข้าสู่ระบบด้วยอีเมล
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (Register only) */}
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี"
                    className="w-full pl-10 pr-4 py-2.5 text-xs md:text-sm rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6021F5] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  อีเมล DPU <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-semibold text-[#6021F5] bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck size={11} />
                  @dpu.ac.th เท่านั้น
                </span>
              </div>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@dpu.ac.th หรือ รหัสนักศึกษา@dpu.ac.th"
                  className="w-full pl-10 pr-4 py-2.5 text-xs md:text-sm rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6021F5] transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                  className="w-full pl-10 pr-10 py-2.5 text-xs md:text-sm rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6021F5] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="w-full py-3 px-6 rounded-2xl font-bold text-xs md:text-sm text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: '#6021F5' }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {tab === 'login' ? 'เข้าสู่ระบบ' : 'ยืนยันการสมัครสมาชิก'}
            </button>
          </form>

          {/* Footer Domain Notice */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-gray-400">
              สงวนสิทธิ์การเข้าใช้งานเฉพาะนักศึกษา อาจารย์ และบุคลากร DPU
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
