import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  User as UserIcon,
  RefreshCw,
  AlertCircle,
  FileText,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { User } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { user: currentAdmin, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setErrorMessage(data.error || 'Gagal memuat daftar pengguna.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Koneksi ke server gagal.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const handleToggleStatus = async (targetUser: User) => {
    if (!token) return;
    if (targetUser.id === currentAdmin?.id) {
      alert('Anda tidak dapat menonaktifkan akun Admin Anda sendiri.');
      return;
    }

    const newStatus = !targetUser.isActive;
    const confirmMsg = newStatus
      ? `Aktifkan kembali akun "${targetUser.username}"?`
      : `Nonaktifkan akun "${targetUser.username}"? Pengguna tidak akan bisa login ke workspace.`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(targetUser.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: targetUser.id,
          isActive: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: newStatus } : u))
        );
        setSuccessMessage(data.message || 'Status pengguna berhasil diperbarui.');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(data.error || 'Gagal mengubah status pengguna.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Koneksi ke server gagal.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (!token) return;
    if (targetUser.id === currentAdmin?.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    if (
      !window.confirm(
        `PERINGATAN: Hapus permanen akun "${targetUser.username}" beserta seluruh berkas desain sirkuit miliknya? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    setActionLoadingId(targetUser.id);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: targetUser.id }),
      });

      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
        setSuccessMessage(`Akun ${targetUser.username} telah dihapus.`);
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(data.error || 'Gagal menghapus pengguna.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Koneksi ke server gagal.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  // Filtered users
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-200 text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/90 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Kelola Pengguna (User Management)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kontrol status akun aktif/nonaktif, pantau aktivitas berkas, dan hak akses pengguna.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              title="Refresh Data Pengguna"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 p-5 bg-slate-950/60 border-b border-slate-800/80">
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-400">Total Pengguna</div>
              <div className="text-xl font-bold text-slate-100 mt-0.5">{totalUsers}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-400">Pengguna Aktif</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{activeCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-slate-400">Pengguna Nonaktif</div>
              <div className="text-xl font-bold text-rose-400 mt-0.5">{inactiveCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search & Alerts */}
        <div className="px-5 pt-4 pb-2 space-y-3">
          {/* Search Bar */}
          <div className="bg-slate-950/90 border border-slate-800 focus-within:border-sky-500/60 rounded-xl px-3.5 py-2 flex items-center gap-2.5 transition-all">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan username atau email..."
              className="bg-transparent text-xs text-slate-100 placeholder:text-slate-500 outline-none w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-2.5 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2.5 text-emerald-300 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Users Table / List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
              <span>Memuat data pengguna...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <Users className="w-8 h-8 stroke-1 text-slate-600" />
              <span>Tidak ada pengguna yang cocok dengan pencarian.</span>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-950/40">
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentAdmin?.id;
                const isActionLoading = actionLoadingId === u.id;

                return (
                  <div
                    key={u.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors gap-4"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-100 truncate">
                            {u.username}
                          </span>
                          {isSelf && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Akun Anda
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                              u.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{u.email}</div>
                      </div>
                    </div>

                    {/* Metadata: File Count & Date */}
                    <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400 shrink-0">
                      <div className="flex items-center gap-1.5" title="Jumlah Berkas Sirkuit">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>{u.fileCount ?? 0} Berkas</span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-[11px]"
                        title={`Bergabung: ${u.createdAt || '-'}`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>

                    {/* Status Toggle & Action Controls */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Active / Inactive Status Badge & Toggle Button */}
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={isSelf || isActionLoading}
                        title={
                          isSelf
                            ? 'Akun aktif (Akun Anda)'
                            : u.isActive
                            ? 'Klik untuk Menonaktifkan akun'
                            : 'Klik untuk Mengaktifkan akun'
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelf
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default opacity-90'
                            : u.isActive
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-xs'
                            : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300 shadow-xs'
                        } ${isActionLoading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {isActionLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : u.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </button>

                      {/* Delete User Button (Non-self only) */}
                      {!isSelf && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={isActionLoading}
                          title="Hapus Pengguna Permanen"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>Pengguna nonaktif tidak akan diizinkan login atau mengakses sirkuit.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
