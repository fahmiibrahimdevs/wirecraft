import React from 'react';
import { CircuitComponent, Wire, WireRouting, WireMarkerPosition } from '../../../types/circuit';
import { COMPONENT_DEFINITIONS, WIRE_COLORS } from '../../../constants/components';
import { getAllComponentDefinitions } from '../../../utils/customComponents';
import { getCleanPinName } from '../../../utils/geometry';
import { Link, Trash2, Tag } from 'lucide-react';

interface WirePropertiesSectionProps {
  selectedWire: Wire;
  allComponents: CircuitComponent[];
  onUpdateWire: (id: string, updates: Partial<Wire>) => void;
  onDeleteWire: (id: string) => void;
}

export const WirePropertiesSection: React.FC<WirePropertiesSectionProps> = ({
  selectedWire,
  allComponents,
  onUpdateWire,
  onDeleteWire,
}) => {
  const fromComp = allComponents.find((c) => c.id === selectedWire.fromComponentId);
  const toComp = allComponents.find((c) => c.id === selectedWire.toComponentId);

  const allDefs = getAllComponentDefinitions();
  const fromDef = fromComp ? (allDefs[fromComp.type] || COMPONENT_DEFINITIONS[fromComp.type]) : undefined;
  const toDef = toComp ? (allDefs[toComp.type] || COMPONENT_DEFINITIONS[toComp.type]) : undefined;
  const fromPin = fromDef && selectedWire.fromPinId ? fromDef.pins.find((p) => p.id === selectedWire.fromPinId) : undefined;
  const toPin = toDef && selectedWire.toPinId ? toDef.pins.find((p) => p.id === selectedWire.toPinId) : undefined;
  const autoFrom = getCleanPinName(fromPin?.name, selectedWire.fromPinId);
  const autoTo = getCleanPinName(toPin?.name, selectedWire.toPinId);
  const defaultAutoLabel = autoFrom || autoTo || 'WIRE';

  const currentPos: WireMarkerPosition =
    selectedWire.markerPosition ||
    (selectedWire.label !== undefined ? (selectedWire.label ? 'both' : 'none') : 'auto');
  const hasCustomConfig = selectedWire.label !== undefined || selectedWire.markerPosition !== undefined;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.trim() === '') {
      // Auto-delete / hide marking tube when text is cleared
      onUpdateWire(selectedWire.id, { label: '', markerPosition: 'none' });
    } else {
      onUpdateWire(selectedWire.id, {
        label: val.toUpperCase(),
        markerPosition: selectedWire.markerPosition === 'none' ? 'auto' : selectedWire.markerPosition,
      });
    }
  };

  const handlePosSelect = (pos: WireMarkerPosition) => {
    if (pos === 'none') {
      onUpdateWire(selectedWire.id, { markerPosition: 'none', label: '' });
    } else if (pos === 'auto') {
      onUpdateWire(selectedWire.id, { markerPosition: 'auto', label: undefined });
    } else {
      onUpdateWire(selectedWire.id, {
        markerPosition: pos,
        label: selectedWire.label === '' ? undefined : selectedWire.label,
      });
    }
  };

  const quickSuggestions = Array.from(new Set([autoFrom, autoTo, 'GND', '5V', '3.3V', 'VIN'])).filter(Boolean);

  return (
    <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-fade-in transition-colors duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Kabel Jumper</h3>
        </div>
        <button onClick={() => onDeleteWire(selectedWire.id)} className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer" title="Hapus Kabel (Delete)"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection Overview */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="text-xs text-slate-600 dark:text-slate-400">Jalur Sambungan:</div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">{fromComp?.label || 'Comp'}:{selectedWire.fromPinId || 'Pin'}</span>
            <span className="text-slate-400 dark:text-slate-500">⇄</span>
            <span className="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">{toComp?.label || 'Comp'}:{selectedWire.toPinId || 'Pin'}</span>
          </div>
        </div>

        {/* Wire / Net Marking Tube Config & Label */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tag className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>Marking Tube (Penanda Kabel)</span>
            </div>
            {hasCustomConfig && <button onClick={() => onUpdateWire(selectedWire.id, { label: undefined, markerPosition: undefined })} className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer font-medium" title="Kembalikan ke mode otomatis bawaan">Reset Otomatis</button>}
          </div>

          {/* Position Selector */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Posisi Penanda:</div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {[
                { key: 'auto', label: '⚡ Auto' },
                { key: 'start', label: '📍 Awal' },
                { key: 'end', label: '📍 Akhir' },
                { key: 'both', label: '⇄ Keduanya' },
                { key: 'center', label: '• Tengah' },
                { key: 'none', label: '🚫 Mati / Polos' },
              ].map((p) => (
                <button key={p.key} onClick={() => handlePosSelect(p.key as WireMarkerPosition)} className={`py-1 px-1.5 rounded-md border text-center transition-all cursor-pointer font-medium ${currentPos === p.key ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/40 font-semibold shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* Text Label Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span>Teks Label:</span>
              {selectedWire.label === '' && <span className="text-[10px] text-rose-500 font-mono font-medium">(Dihapus / Nonaktif)</span>}
            </div>
            <input type="text" value={selectedWire.label ?? ''} onChange={handleTextChange} placeholder={currentPos === 'none' ? 'Kabel polos (ketik untuk aktifkan)' : `Otomatis: ${defaultAutoLabel}`} maxLength={12} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono uppercase outline-none focus:border-sky-500/80 shadow-xs" />
          </div>

          {/* Quick Recommendation Chips */}
          {quickSuggestions.length > 0 && currentPos !== 'none' && (
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Rekomendasi Cepat:</div>
              <div className="flex flex-wrap gap-1">
                {quickSuggestions.map((s) => (
                  <button key={s} onClick={() => onUpdateWire(selectedWire.id, { label: s, markerPosition: selectedWire.markerPosition === 'none' ? 'auto' : selectedWire.markerPosition })} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer transition-colors">+{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            💡 Kosongkan teks atau pilih <b>Mati / Polos</b> untuk langsung menghapus penanda kabel.
          </div>
        </div>

        {/* Color Selector */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Warna Kabel</div>
          <div className="grid grid-cols-3 gap-1.5">
            {WIRE_COLORS.map((c) => (
              <button key={c.value} onClick={() => onUpdateWire(selectedWire.id, { color: c.value })} className={`p-2 rounded-lg border flex items-center gap-2 text-[11px] cursor-pointer transition-all ${selectedWire.color === c.value ? 'bg-white dark:bg-slate-800 border-sky-500 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/30' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                <span className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/20" style={{ backgroundColor: c.value }} />
                <span className="truncate">{c.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Routing Style Selector */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Gaya Lengkungan Jalur</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['bezier', 'orthogonal', 'straight'] as WireRouting[]).map((r) => (
              <button key={r} onClick={() => onUpdateWire(selectedWire.id, { routing: r })} className={`py-2 px-1 text-center rounded-lg border text-xs capitalize cursor-pointer transition-all ${selectedWire.routing === r ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/40 font-semibold' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>{r === 'bezier' ? 'Kurva' : r === 'orthogonal' ? 'Siku 90°' : 'Lurus'}</button>
            ))}
          </div>
        </div>

        {/* Delete Action Button */}
        <button onClick={() => onDeleteWire(selectedWire.id)} className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
          Putuskan & Hapus Kabel
        </button>
      </div>
    </aside>
  );
};
