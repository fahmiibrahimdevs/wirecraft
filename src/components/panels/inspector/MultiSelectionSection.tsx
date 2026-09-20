import React from 'react';
import { CircuitComponent, Wire } from '../../../types/circuit';
import { getAllComponentDefinitions } from '../../../utils/customComponents';
import { detectMultiComponentConnections, generateBusWires } from '../../../utils/autoBusRouter';
import { Layers, Lock, Unlock, Copy, Trash2, Zap, RotateCw } from 'lucide-react';

interface MultiSelectionSectionProps {
  selectedComponentIds: string[];
  allComponents: CircuitComponent[];
  allWires: Wire[];
  onToggleLock?: (ids: string[]) => void;
  onDuplicateComponents?: (ids: string[]) => void;
  onDeleteComponents?: (ids: string[]) => void;
  onRotateComponents?: (ids: string[]) => void;
  onAddMultipleWires?: (wires: Omit<Wire, 'id'>[]) => void;
}

export const MultiSelectionSection: React.FC<MultiSelectionSectionProps> = ({
  selectedComponentIds,
  allComponents,
  allWires,
  onToggleLock,
  onDuplicateComponents,
  onDeleteComponents,
  onRotateComponents,
  onAddMultipleWires,
}) => {
  const selectedComps = allComponents.filter((c) => selectedComponentIds.includes(c.id));
  const allLocked = selectedComps.length > 0 && selectedComps.every((c) => c.locked);

  const allDefs = getAllComponentDefinitions();
  const detectedBuses = selectedComps.length >= 2 ? detectMultiComponentConnections(selectedComps, allDefs, allWires) : [];
  const totalWiresCount = detectedBuses.reduce((acc, b) => acc + b.connections.length, 0);

  const handleConnectAll = () => {
    if (!onAddMultipleWires) return;
    let currentWires = [...allWires];
    const created: Omit<Wire, 'id'>[] = [];
    detectedBuses.forEach((bus) => {
      const nw = generateBusWires(bus, currentWires, 'orthogonal');
      nw.forEach((w) => {
        created.push(w);
        currentWires.push({ ...w, id: `temp_${Math.random()}` } as Wire);
      });
    });
    if (created.length > 0) onAddMultipleWires(created);
  };

  return (
    <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-fade-in transition-colors duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Multi-Selection</h3>
        </div>
        <div className="flex items-center gap-1">
          {onToggleLock && <button onClick={() => onToggleLock(selectedComponentIds)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${allLocked ? 'text-amber-500 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10'}`} title={allLocked ? 'Buka Kunci Semua (L)' : 'Kunci Semua (L)'}>{allLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>}
          {onDuplicateComponents && <button onClick={() => onDuplicateComponents(selectedComponentIds)} className="text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 p-1.5 rounded-lg hover:bg-sky-500/10 transition-colors cursor-pointer" title="Duplikat Semua (Ctrl+D)"><Copy className="w-4 h-4" /></button>}
          {onDeleteComponents && <button onClick={() => onDeleteComponents(selectedComponentIds)} className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer" title="Hapus Semua Terpilih (Delete)"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="text-xs font-semibold text-sky-600 dark:text-sky-300">{selectedComponentIds.length} Komponen Terpilih</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Anda dapat menggeser, menduplikasi, mengunci, atau memutar grup komponen ini secara serentak.</div>
        </div>

        {/* Smart Bus Auto-Wiring Section */}
        {detectedBuses.length > 0 && (
          <div className="bg-gradient-to-b from-sky-500/10 to-transparent dark:from-sky-500/15 border border-sky-500/30 rounded-xl p-3.5 space-y-3 shadow-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                <Zap className="w-4 h-4 text-sky-500 animate-pulse" />
                <span>Koneksi Cerdas (Auto-Wiring)</span>
              </div>
              {detectedBuses.length > 1 && (
                <button onClick={handleConnectAll} className="text-[10px] bg-sky-500 hover:bg-sky-600 text-white font-semibold px-2 py-0.5 rounded shadow-xs cursor-pointer transition-all">
                  ⚡ Sambung Semua ({totalWiresCount})
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              {selectedComps.length === 2 ? (<>Terdeteksi antarmuka yang kompatibel antara <b>{selectedComps[0]?.label}</b> dan <b>{selectedComps[1]?.label}</b>:</>) : (<>Terdeteksi <b>{detectedBuses.length} koneksi antarmuka</b> pada {selectedComps.length} komponen terpilih:</>)}
            </div>

            <div className="space-y-2.5">
              {detectedBuses.map((bus) => (
                <div key={bus.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{bus.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border ${bus.badgeColor}`}>{bus.busType.toUpperCase()}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{bus.description}</div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {bus.connections.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span>{c.signalName}</span>
                      </span>
                    ))}
                  </div>
                  <button onClick={() => { const newWires = generateBusWires(bus, allWires, 'orthogonal'); onAddMultipleWires?.(newWires); }} className="w-full mt-1.5 py-1.5 px-3 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white rounded-md text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Sambungkan {bus.connections.length} Kabel</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group Actions */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Aksi Massal (Grup)</div>
          <div className="grid grid-cols-2 gap-2">
            {onToggleLock && (
              <button onClick={() => onToggleLock(selectedComponentIds)} className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer">
                {allLocked ? (<><Unlock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" /><span>Buka Kunci</span></>) : (<><Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" /><span>Kunci (L)</span></>)}
              </button>
            )}
            {onRotateComponents && (
              <button onClick={() => onRotateComponents(selectedComponentIds)} className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 text-slate-700 dark:text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer">
                <RotateCw className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span>Putar (R)</span>
              </button>
            )}
            {onDuplicateComponents && (
              <button onClick={() => onDuplicateComponents(selectedComponentIds)} className="col-span-2 flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-slate-700 dark:text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer">
                <Copy className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                <span>Duplikat Semua ({selectedComponentIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
