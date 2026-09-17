import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Lock,
  User,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
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
      setErrorMessage('Harap isi username/email dan kata sandi.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || 'Gagal masuk akun.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Harap lengkapi semua kolom pendaftaran.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(username.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || 'Gagal mendaftar akun.');
    }
  };

  const fillDefaultAdmin = () => {
    setTab('login');
    setIdentifier('fahmiibrahimdev');
    setPassword('31750321@admin');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              {tab === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                {tab === 'login' ? 'Masuk ke Wirecraft' : 'Daftar Akun Baru'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Simpan & sinkronkan desain sirkuit ke database cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
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
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Akun</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-rose-400 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5">
          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Nama Pengguna atau Email
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="fahmiibrahimdev / user@email.com"
                    autoFocus
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Kata Sandi
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Akun</span>
                  </>
                )}
              </button>

              {/* Seed Admin Quick Fill Helper */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-[11px] font-semibold text-slate-200">
                        Akun Admin Default
                      </div>
                      <div className="text-[10px] text-slate-500">fahmiibrahimdev (Akses Studio)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fillDefaultAdmin}
                    className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer shrink-0"
                  >
                    Isi Otomatis
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Nama Pengguna (Username)
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nama_pengguna"
                    autoFocus
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Kata Sandi
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftar Sekarang (Role: User)</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
