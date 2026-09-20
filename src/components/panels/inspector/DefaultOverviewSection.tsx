import React from 'react';
import { CircuitComponent, Wire } from '../../../types/circuit';
import { Layers, Table, Maximize2, Info } from 'lucide-react';

interface DefaultOverviewSectionProps {
  allComponents: CircuitComponent[];
  allWires: Wire[];
  snapGrid: boolean;
  onToggleSnapGrid: () => void;
  onCenterCanvas?: () => void;
  onOpenWiringTable?: () => void;
}

export const DefaultOverviewSection: React.FC<DefaultOverviewSectionProps> = ({
  allComponents,
  allWires,
  snapGrid,
  onToggleSnapGrid,
  onCenterCanvas,
  onOpenWiringTable,
}) => {
  return (
    <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl transition-colors duration-200">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
            Ringkasan Sirkuit
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0 whitespace-nowrap">
          Live Status
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Komponen</span>
            <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">{allComponents.length}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Kabel Jumper</span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{allWires.length}</div>
          </div>
        </div>

        {/* Hardware Wiring Table Button */}
        {onOpenWiringTable && (
          <button onClick={onOpenWiringTable} className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 hover:from-sky-500/20 hover:via-indigo-500/20 hover:to-emerald-500/20 border border-sky-500/30 dark:border-sky-500/40 rounded-xl text-left transition-all shadow-sm cursor-pointer group hover:border-sky-400" title="Buka Pemetaan Pin & Tabel Wiring Hardware">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-sky-500/30"><Table className="w-5 h-5" /></div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  Tabel Wiring Hardware
                  <span className="text-[9px] bg-sky-500 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">Baru</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">Mapping pin MCU, level shifter & CSV</div>
              </div>
            </div>
            <span className="text-xs text-sky-600 dark:text-sky-400 font-bold group-hover:translate-x-1 transition-transform shrink-0 ml-2">&rarr;</span>
          </button>
        )}

        {/* Action: Center Canvas View */}
        {onCenterCanvas && (
          <button onClick={onCenterCanvas} className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 text-slate-700 dark:text-slate-200 py-2.5 px-3 rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer group" title="Pusatkan pandangan ke seluruh komponen (Fit to Screen)">
            <Maximize2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="whitespace-nowrap">Pusatkan Semua Komponen (Fit View)</span>
          </button>
        )}

        {/* Canvas Options */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Pengaturan Kanvas</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">Snap to Grid (10px)</span>
            <button onClick={onToggleSnapGrid} className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${snapGrid ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-800'}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${snapGrid ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Quick Guide Card */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Info className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>Petunjuk Navigasi</span>
          </div>
          <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
            <li><strong className="text-slate-700 dark:text-slate-300">Pan Kanvas:</strong> Klik kiri & tahan drag pada background kosong.</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Seleksi Banyak:</strong> Tahan <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded text-[10px] text-slate-700 dark:text-slate-300 font-mono">Ctrl</kbd> / <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded text-[10px] text-slate-700 dark:text-slate-300 font-mono">Shift</kbd> + klik drag kanvas.</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Kabel:</strong> Klik pin awal &rarr; tarik &rarr; klik pin tujuan.</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Geser Komponen:</strong> Klik tahan dan geser komponen di kanvas.</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Zoom:</strong> Putar scroll wheel mouse ke atas/bawah.</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Menu & Kunci:</strong> Klik kanan komponen untuk kunci (L), duplikat, dll.</li>
          </ul>
        </div>
      </div>
    </aside>
  );
};
