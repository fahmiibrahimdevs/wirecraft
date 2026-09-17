import React, { useState, useMemo, useEffect } from 'react';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import {
  getAllComponentDefinitions,
  deleteCustomComponent,
  CUSTOM_COMPONENTS_EVENT,
} from '../../utils/customComponents';
import {
  ComponentType,
  ComponentDefinition,
  CircuitFile,
  CircuitFolder,
  CircuitFileSystem,
} from '../../types/circuit';
import { CircuitFileExplorer } from './CircuitFileExplorer';
import { showConfirm, showToast } from '../../utils/alert';
import {
  Cpu,
  Radio,
  Grid,
  Minimize2,
  Sun,
  CircleDot,
  Sliders,
  Radar,
  Thermometer,
  Tv,
  Monitor,
  Volume2,
  RotateCw,
  BatteryCharging,
  ToggleLeft,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Lightbulb,
  Plug,
  HardDrive,
  Droplets,
  Activity,
  Layers,
  Trash2,
  Folder,
} from 'lucide-react';

interface ComponentLibraryProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddComponent: (type: ComponentType) => void;
  onOpenStudio?: (editDef?: ComponentDefinition) => void;
  // File Explorer Props
  fileSystem: CircuitFileSystem;
  activeFile: CircuitFile | null;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name?: string, parentId?: string | null) => void;
  onCreateFolder: (name?: string, parentId?: string | null) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveItem: (itemId: string, itemType: 'file' | 'folder', targetParentId: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onDuplicateFile: (fileId: string) => void;
  onImportFile: (file: File, targetParentId?: string | null) => void;
  onExportFile: (fileId: string) => void;
}

const CATEGORY_MAP: Record<string, string> = {
  all: 'Semua',
  custom: 'Custom Studio',
  microcontrollers: 'Mikrokontroler',
  prototyping: 'Breadboard',
  passives: 'Pasif',
  outputs: 'Output & Aktuator',
  sensors: 'Sensor',
  displays: 'Layar / Display',
  power: 'Daya / Power',
};

// Map string icon names to Lucide components
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Cpu,
  Radio,
  Grid,
  Minimize2,
  Sun,
  CircleDot,
  Sliders,
  Radar,
  Thermometer,
  Tv,
  Monitor,
  Volume2,
  RotateCw,
  BatteryCharging,
  ToggleLeft,
  Clock,
  Zap,
  Lightbulb,
  Plug,
  HardDrive,
  Droplets,
  Activity,
  Layers,
};

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  isOpen,
  onToggle,
  onAddComponent,
  onOpenStudio,
  fileSystem,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onRenameFolder,
  onDeleteFile,
  onDeleteFolder,
  onMoveItem,
  onToggleFolder,
  onCollapseAll,
  onExpandAll,
  onDuplicateFile,
  onImportFile,
  onExportFile,
}) => {
  const [activeTab, setActiveTab] = useState<'components' | 'explorer'>('components');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [componentDefs, setComponentDefs] = useState<Record<string, ComponentDefinition>>(() =>
    getAllComponentDefinitions()
  );

  useEffect(() => {
    const handleUpdate = () => {
      setComponentDefs(getAllComponentDefinitions());
    };
    window.addEventListener(CUSTOM_COMPONENTS_EVENT, handleUpdate);
    return () => window.removeEventListener(CUSTOM_COMPONENTS_EVENT, handleUpdate);
  }, []);

  const filteredComponents = useMemo(() => {
    return Object.values(componentDefs).filter((def) => {
      if (def.type === 'push-button') return false;
      const matchCategory =
        activeCategory === 'all' ||
        def.category === activeCategory ||
        (activeCategory === 'custom' && def.isCustom);
      const matchSearch =
        def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        def.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [searchQuery, activeCategory, componentDefs]);

  return (
    <aside
      className={`fixed top-14 bottom-0 left-0 z-30 transition-all duration-300 ease-in-out flex ${
        isOpen ? 'w-84' : 'w-0'
      }`}
    >
      {/* Main Drawer Panel */}
      <div
        className={`w-84 h-full bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Activity Tab Switcher (Katalog Komponen vs Desain Rangkaian) */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 p-1.5 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('components')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'components'
                ? 'bg-slate-900 text-sky-400 shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Katalog</span>
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'explorer'
                ? 'bg-slate-900 text-sky-400 shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>Desain Rangkaian</span>
          </button>
        </div>

        {/* TAB 1: FILE EXPLORER */}
        {activeTab === 'explorer' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <CircuitFileExplorer
              fileSystem={fileSystem}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRenameFile={onRenameFile}
              onRenameFolder={onRenameFolder}
              onDeleteFile={onDeleteFile}
              onDeleteFolder={onDeleteFolder}
              onMoveItem={onMoveItem}
              onToggleFolder={onToggleFolder}
              onCollapseAll={onCollapseAll}
              onExpandAll={onExpandAll}
              onDuplicateFile={onDuplicateFile}
              onImportFile={onImportFile}
              onExportFile={onExportFile}
            />
          </div>
        )}

        {/* TAB 2: COMPONENT CATALOG */}
        {activeTab === 'components' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono">
                    KATALOG KOMPONEN
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {filteredComponents.length} part
                </span>
              </div>

              {/* Quick Studio Trigger Button */}
              {onOpenStudio && (
                <button
                  onClick={() => onOpenStudio()}
                  className="w-full mb-2.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-sky-500/20 to-emerald-500/20 hover:from-sky-500/30 hover:to-emerald-500/30 border border-sky-500/40 text-sky-300 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all group cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-12 transition-transform" />
                  <span>+ Buat / Import Komponen (Studio)</span>
                </button>
              )}

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Arduino, LED, Sensor..."
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 transition-all outline-none"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="px-3 py-2 border-b border-slate-800/80 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {Object.entries(CATEGORY_MAP).map(([catKey, catLabel]) => {
                const isActive = activeCategory === catKey;
                return (
                  <button
                    key={catKey}
                    onClick={() => setActiveCategory(catKey)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    {catLabel}
                  </button>
                );
              })}
            </div>

            {/* Component List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredComponents.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs flex flex-col items-center gap-2">
                  <span>Tidak ada komponen ditemukan</span>
                  {activeCategory === 'custom' && onOpenStudio && (
                    <button
                      onClick={() => onOpenStudio()}
                      className="mt-2 text-xs text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Buat komponen pertama Anda di Studio
                    </button>
                  )}
                </div>
              ) : (
                filteredComponents.map((def) => {
                  const IconComp = ICON_MAP[def.icon] || Cpu;
                  const customImg = (def as any).imageUrl;

                  return (
                    <div
                      key={def.type}
                      onClick={() => onAddComponent(def.type)}
                      className="group relative bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/80 hover:ring-1 hover:ring-sky-500/30 rounded-xl p-3 cursor-pointer transition-all duration-200 flex items-start gap-3 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform shrink-0 overflow-hidden p-1">
                        {customImg ? (
                          <img
                            src={customImg}
                            alt={def.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <IconComp className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors truncate">
                              {def.name}
                            </span>
                            {def.isCustom && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                Custom
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 capitalize shrink-0 ml-1">
                            {def.pins.length} pin
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {def.description}
                        </p>

                        {/* Custom Component Action Toolbar */}
                        {def.isCustom && (
                          <div
                            className="mt-2 flex items-center gap-2 pt-1 border-t border-slate-800/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {onOpenStudio && (
                              <button
                                onClick={() => onOpenStudio(def)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-sky-500/20 text-[10px] text-sky-300 border border-slate-700 hover:border-sky-500/40 flex items-center gap-1 transition-colors"
                                title="Edit Komponen di Component Studio"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                const isConfirmed = await showConfirm({
                                  title: 'Hapus Komponen Kustom?',
                                  text: `Hapus komponen "${def.name}" dari Component Library?`,
                                  icon: 'warning',
                                  confirmText: 'Ya, Hapus',
                                  cancelText: 'Batal',
                                  isDanger: true,
                                });
                                if (isConfirmed) {
                                  deleteCustomComponent(def.type);
                                  showToast('success', `Komponen "${def.name}" telah dihapus.`);
                                }
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-500/20 text-[10px] text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 flex items-center gap-1 transition-colors"
                              title="Hapus Komponen Kustom dari Library"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Hint */}
            <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 text-center shrink-0">
              Klik komponen untuk menambahkannya ke kanvas
            </div>
          </div>
        )}
      </div>

      {/* Toggle Drawer Button */}
      <button
        onClick={onToggle}
        title={isOpen ? 'Tutup Panel Samping' : 'Buka Panel Samping'}
        className="self-center -ml-px bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-sky-400 py-3 px-1 rounded-r-md transition-colors cursor-pointer shadow-lg backdrop-blur-md"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  );
};
