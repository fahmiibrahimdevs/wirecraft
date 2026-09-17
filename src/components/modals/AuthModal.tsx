import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Lock,
  User,
  Mail,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/alert';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canClose?: boolean;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  canClose = true,
  defaultTab = 'login',
}) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Harap masukkan username/email dan kata sandi.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('success', `Selamat datang kembali, ${identifier.trim()}!`);
      if (onClose) onClose();
    } else {
      setErrorMessage(result.error || 'Username atau kata sandi tidak cocok. Silakan periksa kembali.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password.trim()) {
      setErrorMessage('Harap lengkapi semua kolom pendaftaran.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMessage('Username minimal 3 karakter.');
      return;
    }

    if (cleanUsername.includes(' ')) {
      setErrorMessage('Username tidak boleh mengandung spasi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Format alamat email tidak valid (contoh: nama@domain.com).');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok dengan kata sandi.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(cleanUsername, cleanEmail, password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('success', `Akun ${cleanUsername} berhasil dibuat! Selamat datang di Wirecraft.`);
      if (onClose) onClose();
    } else {
      setErrorMessage(result.error || 'Gagal mendaftarkan akun baru.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden p-6 text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-200 flex flex-col font-sans">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Outlined Icon Squircle */}
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {tab === 'login' ? 'Wirecraft Authentication' : 'Create New Account'}
              </h2>
              <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
                CIRCUIT IDE ACCESS
              </div>
            </div>
          </div>

          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Subtitle Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          {tab === 'login'
            ? 'Enter your credentials to authenticate and access the circuit workspace.'
            : 'Register a new account to design, simulate, and synchronize your circuits to the cloud.'}
        </p>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950/70 p-1 rounded-xl border border-slate-200 dark:border-slate-800/90 mb-5 gap-1">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Akun</span>
          </button>
        </div>

        {/* Error Alert Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs shadow-lg shadow-rose-950/20 dark:shadow-rose-950/40 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <span className="font-semibold block text-rose-700 dark:text-rose-200">
                {tab === 'login' ? 'Gagal Masuk Akun' : 'Gagal Pendaftaran Akun'}
              </span>
              <span className="text-[11px] text-rose-600/90 dark:text-rose-300/90">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 dark:text-rose-400/70 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username or Email
              </label>
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter username or email"
                  autoFocus
                  required
                  className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all">
                <Key className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 disabled:opacity-50 text-white dark:text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white dark:border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Workspace</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* 2. REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Username
              </label>
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50 rounded-xl px-3.5 py-2 flex items-center gap-2.5 transition-all">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                  required
                  className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50 rounded-xl px-3.5 py-2 flex items-center gap-2.5 transition-all">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50 rounded-xl px-3.5 py-2 flex items-center gap-2.5 transition-all">
                <Key className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/50 rounded-xl px-3.5 py-2 flex items-center gap-2.5 transition-all">
                <Key className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 disabled:opacity-50 text-white dark:text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white dark:border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Modal Footer (Like Image 2) */}
        <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>JWT ENCRYPTED</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setTab(tab === 'login' ? 'register' : 'login');
              setErrorMessage(null);
            }}
            className="text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
          >
            {tab === 'login' ? 'Belum punya akun? Buat akun' : 'Sudah punya akun? Masuk'}
          </button>
        </div>
      </div>
    </div>
  );
};
