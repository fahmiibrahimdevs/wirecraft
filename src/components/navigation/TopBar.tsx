import React, { useRef, useState, useEffect } from 'react';
import { WireRouting } from '../../types/circuit';
import { WIRE_COLORS } from '../../constants/components';
import { User } from '../../types/auth';
import {
  Zap,
  Sparkles,
  Code2,
  FileSpreadsheet,
  Download,
  FolderOpen,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Palette,
  Spline,
  Undo2,
  Redo2,
  Sliders,
  LogIn,
  LogOut,
  User as UserIcon,
  Shield,
  Cloud,
  CloudCheck,
  RefreshCw,
  ChevronDown,
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
  snapGrid: boolean;
  onToggleSnapGrid: () => void;
  onOpenPresets: () => void;
  onOpenCodeEditor: () => void;
  onOpenBom: () => void;
  onOpenStudio?: () => void;
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
  snapGrid,
  onToggleSnapGrid,
  onOpenPresets,
  onOpenCodeEditor,
  onOpenBom,
  onOpenStudio,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between z-40 select-none">
      {/* 1. Left Section: Branding & Project Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
              Circuit Electronics
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                IDE
              </span>
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Editable Project Name */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="Nama Proyek"
          className="bg-transparent hover:bg-slate-950/60 focus:bg-slate-950/90 border border-transparent hover:border-slate-800 focus:border-sky-500/50 rounded-md px-2 py-1 text-xs text-slate-200 font-medium outline-none transition-all w-36 sm:w-48"
        />

        {/* Auto-Save & Cloud Status Indicator Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-mono select-none">
          {saveStatus === 'saving' || cloudSyncStatus === 'syncing' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              <span className="text-sky-400">Sinkronisasi...</span>
            </>
          ) : user ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-medium">Cloud Synced</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="text-slate-400 font-medium">Lokal (Guest)</span>
            </>
          )}
        </div>

        {/* Preset Circuits Button */}
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Contoh Rangkaian</span>
        </button>

        {/* Component Studio (Admin-Only Mode) Button */}
        {isAdmin && onOpenStudio && (
          <button
            onClick={onOpenStudio}
            className="flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400 text-sky-400 hover:text-sky-300 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm animate-in fade-in"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Component Studio</span>
            <span className="text-[9px] font-mono font-bold px-1 py-0.1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              Admin
            </span>
          </button>
        )}

        {/* Undo & Redo Controls */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canUndo
                ? 'text-slate-300 hover:text-sky-300 hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed opacity-40'
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
                ? 'text-slate-300 hover:text-sky-300 hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed opacity-40'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Middle Section: Wire Color & Routing Controls */}
      <div className="flex items-center gap-2">
        {/* Wire Color Quick Palette */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
          <Palette className="w-3.5 h-3.5 text-slate-500 mr-0.5" />
          {WIRE_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onSelectWireColor(c.value)}
              title={c.name}
              className={`w-3.5 h-3.5 rounded-sm transition-all cursor-pointer ${
                currentWireColor === c.value
                  ? 'ring-2 ring-sky-400 scale-110 shadow-sm'
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        {/* Wire Routing Mode Selector */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onSelectWireRouting('bezier')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              wireRouting === 'bezier'
                ? 'bg-sky-500/20 text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kurva
          </button>
          <button
            onClick={() => onSelectWireRouting('orthogonal')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              wireRouting === 'orthogonal'
                ? 'bg-sky-500/20 text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Siku 90°
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden xl:flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
          <button
            onClick={onZoomOut}
            title="Perkecil Kanvas (Ctrl + Scroll Down)"
            className="p-1 hover:text-sky-300 hover:bg-slate-800 rounded cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            title="Reset Zoom ke 100%"
            className="px-1.5 py-0.5 font-mono text-[11px] hover:text-sky-300 rounded cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            title="Perbesar Kanvas (Ctrl + Scroll Up)"
            className="p-1 hover:text-sky-300 hover:bg-slate-800 rounded cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Snap Grid Toggle */}
        <button
          onClick={onToggleSnapGrid}
          title="Toggle Grid Snapping"
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            snapGrid
              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
              : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Right Section: Modals, Export & User Auth */}
      <div className="flex items-center gap-1.5">
        {/* Arduino Code Button */}
        <button
          onClick={onOpenCodeEditor}
          className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-sky-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Arduino Code</span>
        </button>

        {/* Bill of Materials (BOM) */}
        <button
          onClick={onOpenBom}
          className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-sky-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">BOM</span>
        </button>

        {/* Import JSON File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Buka File Proyek (.json)"
          className="p-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-sky-300 rounded-lg text-xs transition-colors cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" />
        </button>

        {/* Export JSON Project */}
        <button
          onClick={onExportJson}
          title="Simpan Proyek (.json)"
          className="p-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-sky-300 rounded-lg text-xs transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Export Image PNG */}
        <button
          onClick={onExportPng}
          className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Export Diagram</span>
        </button>

        {/* Clear All */}
        <button
          onClick={onClearCanvas}
          title="Bersihkan Kanvas"
          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* AUTH / USER PROFILE BUTTON */}
        <div className="h-5 w-px bg-slate-800 mx-1" />

        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 transition-all cursor-pointer"
            >
              {/* Avatar Circle */}
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>

              {/* Username & Role Badge */}
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[100px]">
                  {user.username}
                </span>
                <span className="text-[9px] font-mono leading-none mt-0.5">
                  {user.role === 'admin' ? (
                    <span className="text-emerald-400 font-bold">ADMIN</span>
                  ) : (
                    <span className="text-slate-400">USER</span>
                  )}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl py-1 text-slate-200 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="font-semibold text-slate-100 truncate">{user.username}</div>
                  <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                    <Shield className="w-3 h-3" />
                    <span>Role: {user.role.toUpperCase()}</span>
                  </div>
                </div>

                <div className="py-1">
                  {onSyncToCloud && (
                    <button
                      onClick={() => {
                        onSyncToCloud();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                        <span>Sinkronkan ke Cloud</span>
                      </span>
                    </button>
                  )}

                  <div className="h-px bg-slate-800/80 my-1" />

                  {onLogout && (
                    <button
                      onClick={() => {
                        onLogout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-500/15 text-rose-300/90 hover:text-rose-400 text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
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
            <span>Masuk / Daftar</span>
          </button>
        )}
      </div>
    </header>
  );
};
