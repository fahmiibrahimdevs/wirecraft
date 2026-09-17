import React, { useRef, useState, useEffect } from 'react';
import { WireRouting } from '../../types/circuit';
import { WIRE_COLORS } from '../../constants/components';
import { User } from '../../types/auth';
import { useTheme } from '../../context/ThemeContext';
import {
  Zap,
  Sparkles,
  FileSpreadsheet,
  Download,
  FolderOpen,
  Trash2,
  ZoomIn,
  ZoomOut,
  Palette,
  Undo2,
  Redo2,
  Sliders,
  LogIn,
  LogOut,
  Shield,
  RefreshCw,
  ChevronDown,
  Image as ImageIcon,
  Check,
  Users,
  Sun,
  Moon,
} from 'lucide-react';

interface TopBarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  saveStatus?: 'saved' | 'saving';
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  currentWireColor: string;
  onSelectWireColor: (color: string) => void;
  wireRouting: WireRouting;
  onSelectWireRouting: (routing: WireRouting) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  snapGrid?: boolean;
  onToggleSnapGrid?: () => void;
  onOpenPresets: () => void;
  onOpenBom: () => void;
  onOpenStudio?: () => void;
  onOpenUserManagement?: () => void;
  onOpenExportModal?: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onClearCanvas: () => void;
  // Auth & Cloud Sync props
  user?: User | null;
  isAdmin?: boolean;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  cloudSyncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  onSyncToCloud?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  onProjectNameChange,
  saveStatus = 'saved',
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  currentWireColor,
  onSelectWireColor,
  wireRouting,
  onSelectWireRouting,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenPresets,
  onOpenBom,
  onOpenStudio,
  onOpenUserManagement,
  onOpenExportModal,
  onExportPng,
  onExportJson,
  onImportJson,
  onClearCanvas,
  user,
  isAdmin = false,
  onOpenAuthModal,
  onLogout,
  cloudSyncStatus = 'offline',
  onSyncToCloud,
}) => {
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(target)) {
        setColorMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setExportMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  const currentColorObj = WIRE_COLORS.find((c) => c.value === currentWireColor) || WIRE_COLORS[0];

  return (
    <header className="h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-40 select-none transition-colors duration-200">
      {/* 1. Left Section: Branding, Project Title & Undo/Redo */}
      <div className="flex items-center gap-3">
        {/* App Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-400 shadow-sm">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight hidden sm:flex items-center gap-1.5">
            Wirecraft
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              IDE
            </span>
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

        {/* Editable Project Name */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="Nama Proyek"
          className="bg-transparent hover:bg-slate-100 dark:hover:bg-slate-950/60 focus:bg-white dark:focus:bg-slate-950/90 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-sky-500/50 rounded-md px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium outline-none transition-all w-32 sm:w-44 truncate"
        />

        {/* Save & Cloud Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[10px] font-mono select-none">
          {saveStatus === 'saving' || cloudSyncStatus === 'syncing' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-ping" />
              <span className="text-sky-600 dark:text-sky-400">Menyimpan...</span>
            </>
          ) : user ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Cloud Synced</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Lokal</span>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 hidden lg:block" />

        {/* Undo & Redo Controls */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canUndo
                ? 'text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canRedo
                ? 'text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Middle Section: Wire Routing, Color & Zoom Controls */}
      <div className="flex items-center gap-2">
        {/* Wire Routing Mode Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onSelectWireRouting('bezier')}
            className={`px-2 py-1 rounded-md transition-all text-xs cursor-pointer ${
              wireRouting === 'bezier'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Kurva
          </button>
          <button
            onClick={() => onSelectWireRouting('orthogonal')}
            className={`px-2 py-1 rounded-md transition-all text-xs cursor-pointer ${
              wireRouting === 'orthogonal'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Siku 90°
          </button>
        </div>

        {/* Compact Wire Color Dropdown */}
        <div className="relative" ref={colorMenuRef}>
          <button
            onClick={() => setColorMenuOpen((prev) => !prev)}
            title={`Warna Kabel: ${currentColorObj.name}`}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
          >
            <div
              className="w-3 h-3 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
              style={{ backgroundColor: currentWireColor }}
            />
            <Palette className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
          </button>

          {colorMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase px-1.5 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 font-semibold">
                Pilih Warna Kabel
              </div>
              <div className="space-y-1">
                {WIRE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      onSelectWireColor(c.value);
                      setColorMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentWireColor === c.value
                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
                        style={{ backgroundColor: c.value }}
                      />
                      <span className="text-[11px] truncate">{c.name}</span>
                    </div>
                    {currentWireColor === c.value && <Check className="w-3 h-3 text-sky-500 dark:text-sky-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-xs text-slate-700 dark:text-slate-300">
          <button
            onClick={onZoomOut}
            title="Perkecil Kanvas"
            className="p-1 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            title="Reset Zoom ke 100%"
            className="px-1.5 py-0.5 font-mono text-[11px] hover:text-sky-600 dark:hover:text-sky-300 rounded cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            title="Perbesar Kanvas"
            className="p-1 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Right Section: Presets, Studio, BOM, Unified Export & Theme & User */}
      <div className="flex items-center gap-2">
        {/* Theme Mode Switcher Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
          className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-sky-600 animate-in spin-in-180 duration-200" />
          )}
        </button>

        {/* Presets Circuit Button */}
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span className="hidden xl:inline">Contoh Rangkaian</span>
        </button>

        {/* Component Studio (Admin-Only Mode) */}
        {isAdmin && onOpenStudio && (
          <button
            onClick={onOpenStudio}
            className="flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400 text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span className="hidden xl:inline">Component Studio</span>
            <span className="text-[9px] font-mono font-bold px-1 py-0.1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
              Admin
            </span>
          </button>
        )}

        {/* Bill of Materials (BOM) */}
        <button
          onClick={onOpenBom}
          title="Daftar Komponen (BOM)"
          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">BOM</span>
        </button>

        {/* Hidden Import JSON Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        {/* Export Button (Opens HD Export Modal) */}
        <button
          onClick={() => {
            if (onOpenExportModal) {
              onOpenExportModal();
            }
          }}
          title="Export Diagram & Berkas Rangkaian"
          className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-sky-500/20 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* AUTH / USER PROFILE BUTTON */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-slate-100 dark:bg-slate-950/90 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-xs"
            >
              {/* Avatar Circle */}
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shadow-xs">
                {user.username.charAt(0).toUpperCase()}
              </div>

              {/* Username & Role Badge */}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[90px]">
                  {user.username}
                </span>
                <span className="text-[9px] font-mono leading-none mt-0.5">
                  {user.role === 'admin' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">ADMIN</span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">USER</span>
                  )}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl py-1 text-slate-800 dark:text-slate-200 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{user.username}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
                    <Shield className="w-3 h-3" />
                    <span>Role: {user.role.toUpperCase()}</span>
                  </div>
                </div>

                <div className="py-1">
                  {isAdmin && onOpenUserManagement && (
                    <button
                      onClick={() => {
                        onOpenUserManagement();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                        <span>Kelola Pengguna</span>
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                        ADMIN
                      </span>
                    </button>
                  )}

                  {onSyncToCloud && (
                    <button
                      onClick={() => {
                        onSyncToCloud();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                        <span>Sinkronkan ke Cloud</span>
                      </span>
                    </button>
                  )}

                  <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />

                  {onLogout && (
                    <button
                      onClick={() => {
                        onLogout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-500/15 text-rose-600 dark:text-rose-300/90 hover:text-rose-700 dark:hover:text-rose-400 text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                        <span>Keluar (Logout)</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>
        )}
      </div>
    </header>
  );
};
