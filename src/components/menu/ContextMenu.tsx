import React, { useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Copy,
  RotateCw,
  Trash2,
  Edit3,
  Grid,
  Maximize2,
  Plus,
  Layers,
  Sparkles,
  Palette,
  Check,
  Cpu,
  Sun,
  Minimize2,
  CircleDot,
  Radio,
  Sliders,
  Tag,
  Zap,
} from 'lucide-react';
import { CircuitComponent, Wire, WireRouting, ComponentType, WireMarkerPosition } from '../../types/circuit';
import { WIRE_COLORS, COMPONENT_DEFINITIONS } from '../../constants/components';
import { getAllComponentDefinitions } from '../../utils/customComponents';
import { detectMultiComponentConnections, generateBusWires } from '../../utils/autoBusRouter';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetType: 'component' | 'wire' | 'canvas';
  targetComponent?: CircuitComponent;
  selectedComponentIds?: string[];
  targetWire?: Wire;
}

interface ContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
  // Component Actions
  onToggleLock: (ids: string[]) => void;
  onDuplicate: (ids: string[]) => void;
  onRotate: (ids: string[]) => void;
  onDeleteComponents: (ids: string[]) => void;
  onEditInStudio?: (def: any) => void;
  allComponents?: CircuitComponent[];
  allWires?: Wire[];
  wireRouting?: WireRouting;
  onAddMultipleWires?: (wires: Omit<Wire, 'id'>[]) => void;
  // Wire Actions
  onUpdateWireColor: (wireId: string, color: string) => void;
  onUpdateWireRouting: (wireId: string, routing: WireRouting) => void;
  onUpdateWire?: (wireId: string, updates: Partial<Wire>) => void;
  onDeleteWire: (wireId: string) => void;
  onStartBranchWire?: (wire: Wire, worldPos: { x: number; y: number }) => void;
  // Canvas Actions
  onQuickAddComponent: (type: ComponentType, worldPos?: { x: number; y: number }) => void;
  onToggleSnapGrid: () => void;
  snapGrid: boolean;
  onResetView: () => void;
  onSelectAll: () => void;
  onClearCanvas: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  menuState,
  onClose,
  onToggleLock,
  onDuplicate,
  onRotate,
  onDeleteComponents,
  onEditInStudio,
  allComponents,
  allWires,
  wireRouting = 'orthogonal',
  onAddMultipleWires,
  onUpdateWireColor,
  onUpdateWireRouting,
  onUpdateWire,
  onDeleteWire,
  onStartBranchWire,
  onQuickAddComponent,
  onToggleSnapGrid,
  snapGrid,
  onResetView,
  onSelectAll,
  onClearCanvas,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = React.useState<'add' | 'color' | 'routing' | null>(null);

  const selectedIds = menuState.selectedComponentIds && menuState.selectedComponentIds.length > 0
    ? menuState.selectedComponentIds
    : menuState.targetComponent
    ? [menuState.targetComponent.id]
    : [];

  // Detect available smart auto-wiring protocol buses if 2 or more components are selected
  const detectedBusOptions = React.useMemo(() => {
    if (!menuState.isOpen || selectedIds.length < 2 || !allComponents) return [];
    const selectedComps = allComponents.filter((c) => selectedIds.includes(c.id));
    if (selectedComps.length < 2) return [];
    const allDefs = getAllComponentDefinitions();
    return detectMultiComponentConnections(selectedComps, allDefs, allWires || []);
  }, [menuState.isOpen, selectedIds, allComponents, allWires]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuState.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.isOpen, onClose]);

  if (!menuState.isOpen) return null;

  // Viewport edge collision protection
  const menuWidth = 240;
  const menuHeight = 320;
  const posX = Math.min(menuState.x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(menuState.y, window.innerHeight - menuHeight - 10);

  const isLocked = menuState.targetComponent?.locked ?? false;

  const quickComponents: { type: ComponentType; label: string; icon: any }[] = [
    { type: 'breadboard-half', label: 'Half Breadboard (400P)', icon: Grid },
    { type: 'breadboard-mini', label: 'Mini Breadboard (170P)', icon: Grid },
    { type: 'arduino-uno', label: 'Arduino Uno R3', icon: Cpu },
    { type: 'esp32-38p-cp2102', label: 'ESP32 38-Pin', icon: Cpu },
    { type: 'resistor', label: 'Resistor 220Ω', icon: Minimize2 },
    { type: 'led', label: 'LED 5mm', icon: Sun },
    { type: 'push-button-6mm', label: 'Push Button 6mm', icon: CircleDot },
    { type: 'potentiometer', label: 'Potentiometer', icon: Sliders },
    { type: 'sensor-ultrasonic', label: 'Ultrasonic HC-SR04', icon: Radio },
    { type: 'display-lcd1602-i2c', label: 'LCD 1602 (I2C)', icon: Layers },
  ];

  return (
    <div
      ref={menuRef}
      style={{ left: Math.max(10, posX), top: Math.max(10, posY) }}
      className="fixed z-50 min-w-[220px] max-w-[260px] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl py-1.5 text-slate-800 dark:text-slate-200 text-xs select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
    >
      {/* 1. COMPONENT CONTEXT MENU */}
      {menuState.targetType === 'component' && (
        <>
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span className="truncate max-w-[150px] font-semibold text-slate-800 dark:text-slate-200">
              {selectedIds.length > 1 ? `${selectedIds.length} Komponen Terpilih` : menuState.targetComponent?.label || menuState.targetComponent?.name}
            </span>
            {isLocked && (<span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"><Lock className="w-2.5 h-2.5" /> Terkunci</span>)}
          </div>

          {/* Smart Auto-Wiring Section when 2 components are selected */}
          {detectedBusOptions.length > 0 && (
            <div className="py-1 border-b border-slate-200 dark:border-slate-800/80">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-sky-600 dark:text-sky-400 uppercase flex items-center gap-1.5"><Zap className="w-3 h-3 text-sky-500 animate-pulse" /> Auto-Wiring Bus</div>
              {detectedBusOptions.map((bus) => (
                <button key={bus.id} onClick={() => { if (onAddMultipleWires) { const newWires = generateBusWires(bus, allWires || [], wireRouting); onAddMultipleWires(newWires); } onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors cursor-pointer" title={bus.description}>
                  <span className="flex items-center gap-2 truncate"><Zap className="w-3.5 h-3.5 text-sky-500 shrink-0" /><span className="font-medium text-[11px] truncate">{bus.name}</span></span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold shrink-0 ml-1">⚡ Sambung</span>
                </button>
              ))}
            </div>
          )}

          <div className="py-1">
            <button onClick={() => { onToggleLock(selectedIds); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors">
              <span className="flex items-center gap-2">{isLocked ? <Unlock className="w-4 h-4 text-amber-500 dark:text-amber-400" /> : <Lock className="w-4 h-4 text-slate-400" />}<span>{isLocked ? 'Buka Kunci Posisi' : 'Kunci Posisi (Lock)'}</span></span>
              <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">L</kbd>
            </button>
            <button onClick={() => { onDuplicate(selectedIds); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors">
              <span className="flex items-center gap-2"><Copy className="w-4 h-4 text-sky-600 dark:text-sky-400" /><span>Duplikat</span></span>
              <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Ctrl+D</kbd>
            </button>
            <button onClick={() => { onRotate(selectedIds); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors">
              <span className="flex items-center gap-2"><RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span>Putar 90°</span></span>
              <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">R</kbd>
            </button>
            {onEditInStudio && menuState.targetComponent && selectedIds.length === 1 && (
              <button onClick={() => { const allDefs = getAllComponentDefinitions(); const def = allDefs[menuState.targetComponent!.type] || COMPONENT_DEFINITIONS[menuState.targetComponent!.type]; if (def) onEditInStudio(def); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-500/15 hover:text-purple-600 dark:hover:text-purple-300 text-left transition-colors border-t border-slate-200 dark:border-slate-800/80 mt-1">
                <span className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-purple-600 dark:text-purple-400" /><span>Edit di Studio</span></span>
                <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              </button>
            )}
            <button onClick={() => { onDeleteComponents(selectedIds); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-left transition-colors border-t border-slate-200 dark:border-slate-800/80 mt-1">
              <span className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" /><span>Hapus Komponen</span></span>
              <kbd className="text-[10px] font-mono text-rose-600/80 dark:text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded">Del</kbd>
            </button>
          </div>
        </>
      )}

      {/* 2. WIRE CONTEXT MENU */}
      {menuState.targetType === 'wire' && menuState.targetWire && (
        <>
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Kabel Jumper: <span className="font-mono text-slate-800 dark:text-slate-200 uppercase">{menuState.targetWire.color}</span>
          </div>

          <div className="py-1">
            {onStartBranchWire && (
              <button onClick={() => { onStartBranchWire(menuState.targetWire!, { x: menuState.worldX, y: menuState.worldY }); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors border-b border-slate-200 dark:border-slate-800/80 mb-1">
                <span className="flex items-center gap-2"><CircleDot className="w-4 h-4 text-sky-600 dark:text-sky-400" /><span className="font-semibold">Cabang Kabel Dari Sini</span></span>
              </button>
            )}

            {/* Fast Color Palette Grid */}
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800/80">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1"><Palette className="w-3 h-3 text-sky-600 dark:text-sky-400" /><span>Pilih Warna Kabel:</span></div>
              <div className="grid grid-cols-5 gap-1.5">
                {WIRE_COLORS.map((c) => (
                  <button key={c.value} onClick={() => { onUpdateWireColor(menuState.targetWire!.id, c.value); onClose(); }} title={c.name} className="w-7 h-7 rounded-md border flex items-center justify-center transition-transform hover:scale-110" style={{ backgroundColor: c.value, borderColor: menuState.targetWire!.color === c.value ? '#38bdf8' : '#cbd5e1', boxShadow: menuState.targetWire!.color === c.value ? '0 0 8px rgba(56, 189, 248, 0.6)' : 'none' }}>
                    {menuState.targetWire!.color === c.value && (<Check className="w-3.5 h-3.5 text-white drop-shadow" />)}
                  </button>
                ))}
              </div>
            </div>

            {/* Routing Mode */}
            <div className="px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Mode Jalur:</div>
            {(['orthogonal', 'bezier', 'straight'] as WireRouting[]).map((r) => (
              <button key={r} onClick={() => { onUpdateWireRouting(menuState.targetWire!.id, r); onClose(); }} className={`w-full px-3 py-1 flex items-center justify-between text-left transition-colors ${menuState.targetWire!.routing === r ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                <span>{r === 'orthogonal' ? 'Siku 90° (Orthogonal)' : r === 'bezier' ? 'Lengkung (Bezier)' : 'Garis Lurus'}</span>
                {menuState.targetWire!.routing === r && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
              </button>
            ))}

            {/* Marking Tube Quick Controls */}
            {onUpdateWire && (
              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-1.5 pb-1">
                <div className="px-3 py-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-sky-500" /><span>Marking Tube:</span></span>
                  {menuState.targetWire!.markerPosition === 'none' || menuState.targetWire!.label === '' ? (<span className="text-[9px] text-rose-500 font-mono">Mati</span>) : (<span className="text-[9px] text-sky-600 font-mono capitalize">{menuState.targetWire!.markerPosition || 'Auto'}</span>)}
                </div>
                <div className="grid grid-cols-3 gap-1 px-2.5 py-1 text-[10px]">
                  {[{ pos: 'auto', label: '⚡ Auto' }, { pos: 'start', label: '📍 Awal' }, { pos: 'end', label: '📍 Akhir' }, { pos: 'both', label: '⇄ Kedua' }, { pos: 'center', label: '• Tengah' }, { pos: 'none', label: '🚫 Hapus' }].map((p) => (
                    <button key={p.pos} onClick={() => {
                      if (p.pos === 'none') { onUpdateWire(menuState.targetWire!.id, { markerPosition: 'none', label: '' }); }
                      else if (p.pos === 'auto') { onUpdateWire(menuState.targetWire!.id, { markerPosition: 'auto', label: undefined }); }
                      else { onUpdateWire(menuState.targetWire!.id, { markerPosition: p.pos as WireMarkerPosition, label: menuState.targetWire!.label === '' ? undefined : menuState.targetWire!.label }); }
                      onClose();
                    }} className={`py-1 px-1 rounded text-center transition-colors cursor-pointer ${(menuState.targetWire!.markerPosition || 'auto') === p.pos ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delete Wire */}
            <button onClick={() => { onDeleteWire(menuState.targetWire!.id); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-left transition-colors border-t border-slate-200 dark:border-slate-800/80 mt-1">
              <span className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" /><span>Hapus Kabel</span></span>
              <kbd className="text-[10px] font-mono text-rose-600/80 dark:text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded">Del</kbd>
            </button>
          </div>
        </>
      )}

      {/* 3. CANVAS EMPTY AREA CONTEXT MENU */}
      {menuState.targetType === 'canvas' && (
        <>
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <span>Canvas Area</span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">({Math.round(menuState.worldX)}, {Math.round(menuState.worldY)})</span>
          </div>

          <div className="py-1">
            <div className="relative">
              <button onMouseEnter={() => setActiveSubmenu('add')} onClick={() => setActiveSubmenu((prev) => (prev === 'add' ? null : 'add'))} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors">
                <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" /><span>Tambah Komponen</span></span>
                <span className="text-slate-400">›</span>
              </button>

              {activeSubmenu === 'add' && (
                <div className="absolute left-[98%] top-0 min-w-[210px] bg-white/98 dark:bg-slate-900/98 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl py-1.5 z-50 max-h-[300px] overflow-y-auto">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 mb-1">Tambah Cepat di Kursor</div>
                  {quickComponents.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.type} onClick={() => { onQuickAddComponent(item.type, { x: menuState.worldX, y: menuState.worldY }); onClose(); }} className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-sky-500/20 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors text-xs text-slate-800 dark:text-slate-200">
                        <Icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" /><span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={() => { onToggleSnapGrid(); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors">
              <span className="flex items-center gap-2"><Grid className="w-4 h-4 text-slate-400" /><span>Snap to Grid</span></span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${snapGrid ? 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{snapGrid ? 'ON' : 'OFF'}</span>
            </button>

            <button onClick={() => { onResetView(); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors">
              <span className="flex items-center gap-2"><Maximize2 className="w-4 h-4 text-slate-400" /><span>Pusatkan View (Center)</span></span>
            </button>

            <button onClick={() => { onSelectAll(); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-left transition-colors border-t border-slate-200 dark:border-slate-800/80 mt-1">
              <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-slate-400" /><span>Pilih Semua Komponen</span></span>
              <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Ctrl+A</kbd>
            </button>

            <button onClick={() => { onClearCanvas(); onClose(); }} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-left transition-colors border-t border-slate-200 dark:border-slate-800/80 mt-1">
              <span className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" /><span>Bersihkan Canvas</span></span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
