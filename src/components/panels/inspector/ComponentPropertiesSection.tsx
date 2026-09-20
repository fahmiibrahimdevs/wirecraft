import React from 'react';
import { CircuitComponent, Wire } from '../../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../../constants/components';
import { getAllComponentDefinitions } from '../../../utils/customComponents';
import { ResistorPropertyEditor } from './ResistorPropertyEditor';
import {
  Sliders,
  RotateCw,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Link,
} from 'lucide-react';

interface ComponentPropertiesSectionProps {
  selectedComponent: CircuitComponent;
  allComponents: CircuitComponent[];
  allWires: Wire[];
  onUpdateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onToggleLock?: (ids: string[]) => void;
  onDeleteWire: (id: string) => void;
}

export const ComponentPropertiesSection: React.FC<ComponentPropertiesSectionProps> = ({
  selectedComponent,
  allComponents,
  allWires,
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onToggleLock,
  onDeleteWire,
}) => {
  const allDefs = getAllComponentDefinitions();
  const def = allDefs[selectedComponent.type] || COMPONENT_DEFINITIONS[selectedComponent.type];
  const compWires = allWires.filter(
    (w) => w.fromComponentId === selectedComponent.id || w.toComponentId === selectedComponent.id
  );

  const handleRotate = () => {
    const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
    const currentIndex = rotations.indexOf(selectedComponent.rotation);
    const nextRotation = rotations[(currentIndex + 1) % 4]!;
    onUpdateComponent(selectedComponent.id, { rotation: nextRotation });
  };

  return (
    <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-fade-in transition-colors duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Properties Inspector</h3>
        </div>
        <div className="flex items-center gap-1">
          {onToggleLock && (
            <button onClick={() => onToggleLock([selectedComponent.id])} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${selectedComponent.locked ? 'text-amber-500 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10'}`} title={selectedComponent.locked ? 'Buka Kunci Posisi (L)' : 'Kunci Posisi (L)'}>
              {selectedComponent.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}
          {onDuplicateComponent && <button onClick={() => onDuplicateComponent(selectedComponent.id)} className="text-slate-400 hover:text-sky-400 p-1.5 rounded-lg hover:bg-sky-500/10 transition-colors cursor-pointer" title="Duplikat Komponen (Ctrl+D)"><Copy className="w-4 h-4" /></button>}
          <button onClick={() => onDeleteComponent(selectedComponent.id)} className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer" title="Hapus Komponen (Delete)"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Component Info Card */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{def?.name || selectedComponent.name}</div>
            {selectedComponent.locked && <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-semibold"><Lock className="w-2.5 h-2.5" /> Terkunci</span>}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{def?.description}</div>

          {/* Label Input */}
          <div className="mt-3">
            <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Label Identitas:</label>
            <input type="text" value={selectedComponent.label} onChange={(e) => onUpdateComponent(selectedComponent.id, { label: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-sky-500/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono outline-none" />
          </div>
        </div>

        {/* Actions: Duplicate, Rotation, Lock */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-xs">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Aksi Komponen</span>
            <span className="font-mono text-sky-600 dark:text-sky-400 text-xs font-bold">{selectedComponent.rotation}°</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleRotate} className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-slate-700 dark:text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs" title="Putar Komponen 90° (R / Space)">
              <RotateCw className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
              <span>Putar 90°</span>
            </button>
            {onToggleLock && (
              <button onClick={() => onToggleLock([selectedComponent.id])} className={`flex items-center justify-center gap-1.5 border py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs ${selectedComponent.locked ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20' : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-amber-500/40 text-slate-700 dark:text-slate-200'}`} title="Kunci Posisi (L)">
                {selectedComponent.locked ? (<><Unlock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" /><span>Buka Kunci</span></>) : (<><Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" /><span>Kunci (L)</span></>)}
              </button>
            )}
          </div>
        </div>

        {/* Component Specific Config: 5-Band Metal Film Resistor */}
        {selectedComponent.type === 'resistor' && (
          <ResistorPropertyEditor component={selectedComponent} onUpdate={(updates) => onUpdateComponent(selectedComponent.id, updates)} />
        )}

        {/* LED Color & State */}
        {selectedComponent.type === 'led' && (
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Warna LED</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['red', 'green', 'blue', 'yellow', 'amber', 'white'] as const).map((color) => (
                <button key={color} onClick={() => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, ledColor: color } })} className={`py-1.5 px-2 rounded-lg text-xs capitalize border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${selectedComponent.customProps.ledColor === color ? 'bg-white dark:bg-slate-800 border-sky-500 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/30 font-semibold shadow-xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color === 'amber' ? '#f97316' : color === 'white' ? '#f8fafc' : color }} />
                  {color}
                </button>
              ))}
            </div>

            {/* Live LED Test State */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-700 dark:text-slate-300">Status Nyala (Test)</span>
              <button onClick={() => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, isLedOn: !selectedComponent.customProps.isLedOn } })} className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${selectedComponent.customProps.isLedOn ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>{selectedComponent.customProps.isLedOn ? 'Menyala (ON)' : 'Mati (OFF)'}</button>
            </div>
          </div>
        )}

        {/* Steker Switch AC */}
        {selectedComponent.type === 'steker-switch' && (
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">Steker Saklar Arde</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">Broco AC 220V</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">Saklar & Indikator Neon</span>
              <button onClick={() => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, isSwitchedOn: selectedComponent.customProps.isSwitchedOn === false ? true : false } })} className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${selectedComponent.customProps.isSwitchedOn !== false ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>{selectedComponent.customProps.isSwitchedOn !== false ? 'Saklar ON (Menyala)' : 'Saklar OFF (Mati)'}</button>
            </div>
          </div>
        )}

        {/* Fitting Lamp E27 */}
        {selectedComponent.type === 'fitting-lamp' && (
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">Fitting Lampu E27</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">Bohlam LED</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">Status Bohlam</span>
              <button onClick={() => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, isLedOn: selectedComponent.customProps.isLedOn === false ? true : false } })} className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${selectedComponent.customProps.isLedOn !== false ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>{selectedComponent.customProps.isLedOn !== false ? 'Bohlam ON (Menyala)' : 'Bohlam OFF (Mati)'}</button>
            </div>
          </div>
        )}

        {/* Push Buttons */}
        {(selectedComponent.type === 'push-button' || selectedComponent.type === 'push-button-6mm' || selectedComponent.type === 'push-button-12mm') && (
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">{selectedComponent.type === 'push-button-12mm' ? 'Push Button 12mm (Big Tactile)' : 'Push Button 6mm (Mini Tactile)'}</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">SPST 4-Pin</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Warna Cap Tombol</div>
            <div className="grid grid-cols-5 gap-1.5">
              {(['green', 'red', 'blue', 'yellow', 'black'] as const).map((color) => {
                const colorHexes: Record<string, string> = { green: '#22c55e', red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', black: '#1e293b' };
                const currentColor = selectedComponent.customProps.buttonColor || 'green';
                return (
                  <button key={color} onClick={() => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, buttonColor: color } })} className={`py-1.5 rounded-lg text-xs capitalize border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${currentColor === color ? 'bg-white dark:bg-slate-800 border-sky-500 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/30 font-semibold shadow-xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                    <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-700" style={{ backgroundColor: colorHexes[color] }} />
                    <span className="text-[9px]">{color}</span>
                  </button>
                );
              })}
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-700 dark:text-slate-300">Status Tombol</span>
              <button onClick={() => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, buttonPressed: !selectedComponent.customProps.buttonPressed } })} className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${selectedComponent.customProps.buttonPressed ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>{selectedComponent.customProps.buttonPressed ? 'Ditekan (PRESSED)' : 'Dilepas (RELEASED)'}</button>
            </div>
          </div>
        )}

        {/* Potentiometer */}
        {selectedComponent.type === 'potentiometer' && (
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Nilai Posisi Knob:</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{selectedComponent.customProps.potValue ?? 50}%</span>
            </div>
            <input type="range" min="0" max="100" value={selectedComponent.customProps.potValue ?? 50} onChange={(e) => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, potValue: Number(e.target.value) } })} className="w-full accent-sky-500 cursor-pointer" />
          </div>
        )}

        {/* LCD 1602 */}
        {(selectedComponent.type === 'display-lcd1602' || selectedComponent.type === 'display-lcd1602-i2c') && (
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Teks Layar LCD (16x2)</div>
            <div>
              <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 1 (Maks 16 char):</label>
              <input type="text" maxLength={16} value={selectedComponent.customProps.lcdTextRow1 || ''} onChange={(e) => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, lcdTextRow1: e.target.value } })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80" />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 2 (Maks 16 char):</label>
              <input type="text" maxLength={16} value={selectedComponent.customProps.lcdTextRow2 || ''} onChange={(e) => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, lcdTextRow2: e.target.value } })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80" />
            </div>
          </div>
        )}

        {/* LCD 2004 */}
        {(selectedComponent.type === 'display-lcd2004' || selectedComponent.type === 'display-lcd2004-i2c') && (
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Teks Layar LCD (20x4)</div>
            <div>
              <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 1 (Maks 20 char):</label>
              <input type="text" maxLength={20} value={selectedComponent.customProps.lcdTextRow1 || ''} onChange={(e) => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, lcdTextRow1: e.target.value } })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80" />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 2 (Maks 20 char):</label>
              <input type="text" maxLength={20} value={selectedComponent.customProps.lcdTextRow2 || ''} onChange={(e) => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, lcdTextRow2: e.target.value } })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80" />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 3 (Maks 20 char):</label>
              <input type="text" maxLength={20} value={selectedComponent.customProps.lcdTextRow3 || ''} onChange={(e) => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, lcdTextRow3: e.target.value } })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80" />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 4 (Maks 20 char):</label>
              <input type="text" maxLength={20} value={selectedComponent.customProps.lcdTextRow4 || ''} onChange={(e) => onUpdateComponent(selectedComponent.id, { customProps: { ...selectedComponent.customProps, lcdTextRow4: e.target.value } })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80" />
            </div>
          </div>
        )}

        {/* Connected Wires Summary */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Link className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />Koneksi Kabel ({compWires.length})</span>
          </div>
          {compWires.length === 0 ? (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 py-1">Belum ada kabel terhubung.</div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {compWires.map((w) => {
                const isFrom = w.fromComponentId === selectedComponent.id;
                const myPinId = isFrom ? w.fromPinId : w.toPinId;
                const otherCompId = isFrom ? w.toComponentId : w.fromComponentId;
                const otherPinId = isFrom ? w.toPinId : w.fromPinId;
                const otherComp = allComponents.find((c) => c.id === otherCompId);
                return (
                  <div key={w.id} className="flex items-center justify-between bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
                      <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{myPinId}</span>
                      <span className="text-slate-400 dark:text-slate-500">→</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate">{otherComp?.label || otherCompId}.{otherPinId}</span>
                    </div>
                    <button onClick={() => onDeleteWire(w.id)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 cursor-pointer transition-colors" title="Putus Kabel"><Trash2 className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
