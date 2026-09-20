import React from 'react';
import { Pin, PinType } from '../../../types/circuit';
import { PIN_TYPES, pxToMm, mmToPx } from './studioConstants';
import { COMMON_PIN_SUGGESTIONS } from '../../../utils/pinInference';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface StudioPinEditorProps {
  pins: Pin[];
  setPins: (pins: Pin[]) => void;
  selectedPin: Pin | null;
  selectedPinId: string | null;
  setSelectedPinId: (id: string | null) => void;
  setHoveredPinId: (id: string | null) => void;
  unit: 'mm' | 'px';
  genCount: number;
  setGenCount: (v: number) => void;
  genPitch: number;
  setGenPitch: (v: number) => void;
  genOrientation: 'vertical' | 'horizontal';
  setGenOrientation: (v: 'vertical' | 'horizontal') => void;
  genPrefix: string;
  setGenPrefix: (v: string) => void;
  onGeneratePinRow: () => void;
  updateSelectedPin: (updates: Partial<Pin>) => void;
  deletePin: (id: string) => void;
  startInlineEdit: (pinId: string) => void;
  handlePinNameChange: (newName: string) => void;
  handleAutoFillPinProfile: () => void;
  handleAutoInferAllPins: () => void;
  nudgePin: (dx: number, dy: number) => void;
}

export const StudioPinEditor: React.FC<StudioPinEditorProps> = ({
  pins,
  setPins,
  selectedPin,
  selectedPinId,
  setSelectedPinId,
  setHoveredPinId,
  unit,
  genCount,
  setGenCount,
  genPitch,
  setGenPitch,
  genOrientation,
  setGenOrientation,
  genPrefix,
  setGenPrefix,
  onGeneratePinRow,
  updateSelectedPin,
  deletePin,
  startInlineEdit,
  handlePinNameChange,
  handleAutoFillPinProfile,
  handleAutoInferAllPins,
  nudgePin,
}) => {
  return (
    <div className="w-80 bg-slate-50 dark:bg-slate-950/60 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
      {/* Multi-pin Header Generator */}
      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 shadow-xs">
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />Auto Header / DIP Generator</span>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Jumlah Pin</span>
            <input type="number" value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} min="1" max="60" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono" />
          </div>
          <div>
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 dark:text-slate-400">Pitch ({unit})</span><span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{unit === 'mm' ? `≈ ${genPitch} px` : `≈ ${pxToMm(genPitch, 2)} mm`}</span></div>
            <input type="number" value={unit === 'mm' ? pxToMm(genPitch, 2) : genPitch} onChange={(e) => { const val = Number(e.target.value); const pxVal = unit === 'mm' ? mmToPx(val, 2) : val; setGenPitch(pxVal); }} step={unit === 'mm' ? '0.01' : '0.5'} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono" />
          </div>
        </div>

        {/* Quick Pitch Pills */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setGenPitch(17.0)} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${Math.abs(genPitch - 17.0) < 0.1 ? 'bg-sky-50 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/50 text-sky-700 dark:text-sky-300 font-bold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`} title="Standar Breadboard / DIP (2.54 mm / 17 px)">2.54mm (DIP)</button>
          <button type="button" onClick={() => setGenPitch(mmToPx(2.0, 2))} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${Math.abs(genPitch - mmToPx(2.0, 2)) < 0.1 ? 'bg-sky-50 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/50 text-sky-700 dark:text-sky-300 font-bold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`} title="Pitch 2.0 mm (XBee / Mini Modules)">2.00mm</button>
          <button type="button" onClick={() => setGenPitch(mmToPx(1.27, 2))} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${Math.abs(genPitch - mmToPx(1.27, 2)) < 0.1 ? 'bg-sky-50 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/50 text-sky-700 dark:text-sky-300 font-bold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`} title="Pitch 1.27 mm (SMD / SOP)">1.27mm</button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Orientasi</span>
            <select value={genOrientation} onChange={(e) => setGenOrientation(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100"><option value="vertical">Vertikal</option><option value="horizontal">Horizontal</option></select>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Prefix ID</span>
            <input type="text" value={genPrefix} onChange={(e) => setGenPrefix(e.target.value)} placeholder="p / d / pin" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono" />
          </div>
        </div>

        <button onClick={onGeneratePinRow} className="w-full py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 border border-sky-400/40 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"><Plus className="w-3.5 h-3.5" />Generate Deretan Pin ({unit === 'mm' ? `${pxToMm(genPitch, 2)}mm` : `${genPitch}px`})</button>
      </div>

      {/* Selected Pin Details Inspector */}
      {selectedPin ? (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-sky-400/40 dark:border-sky-500/30 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400" />Edit Pin Terpilih</span>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => startInlineEdit(selectedPin.id)} className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 border border-sky-400/40 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors" title="Buka Edit Cepat di Canvas (Shortcut: Enter)"><Edit3 className="w-3 h-3" />Canvas (↵)</button>
              <button onClick={() => deletePin(selectedPin.id)} className="p-1 rounded hover:bg-rose-500/10 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer" title="Hapus Pin"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">ID Pin (Unik)</span>
              <input type="text" value={selectedPin.id} onChange={(e) => updateSelectedPin({ id: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Nama / Label</span>
              <input type="text" list="pin-name-suggestions" value={selectedPin.name} onChange={(e) => handlePinNameChange(e.target.value)} placeholder="cth: VCC, GND..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-bold focus:border-sky-500 focus:outline-none" />
            </div>
          </div>

          {/* Native Autocomplete Datalist for Pin Names */}
          <datalist id="pin-name-suggestions">
            {COMMON_PIN_SUGGESTIONS.map((s) => (<option key={s.name} value={s.name}>{s.description} ({s.category})</option>))}
          </datalist>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Tipe Pin</span>
            <select value={selectedPin.type} onChange={(e) => updateSelectedPin({ type: e.target.value as PinType })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none cursor-pointer">
              {PIN_TYPES.map((t) => (<option key={t.type} value={t.type}>{t.label}</option>))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 dark:text-slate-400">Koordinat X ({unit})</span><span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{unit === 'mm' ? `≈ ${selectedPin.x} px` : `≈ ${pxToMm(selectedPin.x, 2)} mm`}</span></div>
              <input type="number" value={unit === 'mm' ? pxToMm(selectedPin.x, 2) : selectedPin.x} onChange={(e) => { const val = Number(e.target.value); const pxVal = unit === 'mm' ? mmToPx(val, 2) : val; updateSelectedPin({ x: pxVal }); }} step="0.1" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono" />
            </div>
            <div>
              <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 dark:text-slate-400">Koordinat Y ({unit})</span><span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{unit === 'mm' ? `≈ ${selectedPin.y} px` : `≈ ${pxToMm(selectedPin.y, 2)} mm`}</span></div>
              <input type="number" value={unit === 'mm' ? pxToMm(selectedPin.y, 2) : selectedPin.y} onChange={(e) => { const val = Number(e.target.value); const pxVal = unit === 'mm' ? mmToPx(val, 2) : val; updateSelectedPin({ y: pxVal }); }} step="0.1" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 font-mono" />
            </div>
          </div>

          {/* Micro Nudge Buttons */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Micro Nudge:</span>
            <div className="flex items-center gap-1">
              <button onClick={() => nudgePin(unit === 'mm' ? -mmToPx(0.5, 1) : -0.5, 0)} className="p-1 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer" title={`Nudge Kiri (-${unit === 'mm' ? '0.5mm' : '0.5px'})`}><ArrowLeft className="w-3 h-3" /></button>
              <button onClick={() => nudgePin(0, unit === 'mm' ? -mmToPx(0.5, 1) : -0.5)} className="p-1 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer" title={`Nudge Atas (-${unit === 'mm' ? '0.5mm' : '0.5px'})`}><ArrowUp className="w-3 h-3" /></button>
              <button onClick={() => nudgePin(0, unit === 'mm' ? mmToPx(0.5, 1) : 0.5)} className="p-1 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer" title={`Nudge Bawah (+${unit === 'mm' ? '0.5mm' : '0.5px'})`}><ArrowDown className="w-3 h-3" /></button>
              <button onClick={() => nudgePin(unit === 'mm' ? mmToPx(0.5, 1) : 0.5, 0)} className="p-1 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer" title={`Nudge Kanan (+${unit === 'mm' ? '0.5mm' : '0.5px'})`}><ArrowRight className="w-3 h-3" /></button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Deskripsi Tooltip</span>
              <button type="button" onClick={handleAutoFillPinProfile} className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 font-medium hover:underline cursor-pointer" title="Otomatiskan Tipe Pin dan Deskripsi dari Nama Pin"><Sparkles className="w-3 h-3" />Auto Isi</button>
            </div>
            <input type="text" value={selectedPin.description || ''} onChange={(e) => updateSelectedPin({ description: e.target.value })} placeholder="Contoh: Power 5V / Signal Input..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none" />
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-100/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">Pilih pin pada canvas untuk mengedit atau geser gambar/pin langsung dengan cursor mouse.</div>
      )}

      {/* List of All Pins */}
      <div className="flex-1 flex flex-col gap-1.5 min-h-[140px]">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
          <span>Daftar Pin ({pins.length})</span>
          {pins.length > 0 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleAutoInferAllPins} className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 hover:underline cursor-pointer font-medium" title="Otomatiskan Tipe dan Deskripsi semua pin berdasarkan namanya"><Sparkles className="w-2.5 h-2.5" />Auto Semua</button>
              <button onClick={() => setPins([])} className="text-[10px] text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">Hapus Semua</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 max-h-48">
          {pins.map((pin) => {
            const isSelected = pin.id === selectedPinId;
            const typeDef = PIN_TYPES.find((t) => t.type === pin.type) || PIN_TYPES[0];

            return (
              <div key={pin.id} onClick={() => setSelectedPinId(pin.id)} onDoubleClick={() => startInlineEdit(pin.id)} onMouseEnter={() => setHoveredPinId(pin.id)} onMouseLeave={() => setHoveredPinId(null)} title="Double-click untuk Edit Cepat" className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/50 text-sky-800 dark:text-sky-200 shadow-xs' : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-300'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: typeDef.color }} />
                  <span className="font-bold">{pin.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">({pin.id})</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{unit === 'mm' ? `${pxToMm(pin.x, 1)}, ${pxToMm(pin.y, 1)}` : `${pin.x.toFixed(1)}, ${pin.y.toFixed(1)}`}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
