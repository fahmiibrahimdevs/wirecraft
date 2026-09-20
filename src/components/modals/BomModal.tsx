import React from 'react';
import { CircuitComponent, Wire } from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { formatResistance } from '../../utils/geometry';
import { FileSpreadsheet, Download, Copy, X, Check } from 'lucide-react';

interface BomModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
  wires: Wire[];
}

export const BomModal: React.FC<BomModalProps> = ({ isOpen, onClose, components, wires }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Group components by type & key properties
  const groupedParts: Record<string, { name: string; specs: string; labels: string[]; qty: number }> = {};

  components.forEach((comp) => {
    const def = COMPONENT_DEFINITIONS[comp.type];
    let specs = '-';
    if (comp.type === 'resistor') {
      specs = formatResistance(comp.customProps.resistance || 220);
    } else if (comp.type === 'led') {
      specs = `Warna ${comp.customProps.ledColor || 'Red'}`;
    } else if (comp.type === 'potentiometer') {
      specs = '10kΩ Linear';
    }

    const key = `${comp.type}_${specs}`;
    if (!groupedParts[key]) {
      groupedParts[key] = { name: def?.name || comp.name, specs, labels: [comp.label], qty: 1 };
    } else {
      groupedParts[key]!.qty += 1;
      groupedParts[key]!.labels.push(comp.label);
    }
  });

  // Add Jumper Wires summary with detailed color breakdown
  if (wires.length > 0) {
    const getColorName = (hex: string): string => {
      const h = hex.toLowerCase().trim();
      if (h === '#ef4444' || h === 'red') return 'Merah';
      if (h === '#1e293b' || h === '#0f172a' || h === '#020617' || h === '#000000' || h === 'black') return 'Hitam';
      if (h === '#38bdf8' || h === '#0ea5e9' || h === '#0284c7' || h === 'cyan') return 'Biru Muda';
      if (h === '#10b981' || h === '#22c55e' || h === 'green') return 'Hijau';
      if (h === '#eab308' || h === '#facc15' || h === 'yellow') return 'Kuning';
      if (h === '#f97316' || h === '#ea580c' || h === 'orange') return 'Oranye';
      if (h === '#a855f7' || h === '#c084fc' || h === 'purple') return 'Ungu';
      if (h === '#f8fafc' || h === '#ffffff' || h === 'white') return 'Putih';
      if (h === '#3b82f6' || h === '#2563eb' || h === 'blue') return 'Biru';
      return 'Kustom';
    };

    const colorCounts: Record<string, number> = {};
    wires.forEach((w) => {
      const name = getColorName(w.color || '#38bdf8');
      colorCounts[name] = (colorCounts[name] || 0) + 1;
    });

    const specsSummary = Object.entries(colorCounts).map(([colName, count]) => `${count}x ${colName}`).join(', ');

    groupedParts['wires'] = {
      name: 'Kabel Jumper Fleksibel (Breadboard Wires)',
      specs: specsSummary || 'Aneka Warna',
      labels: [`${wires.length} kabel`],
      qty: wires.length,
    };
  }

  const partsList = Object.values(groupedParts);

  const handleDownloadCsv = () => {
    let csv = 'No,Nama Komponen,Spesifikasi,Label / Referensi,Jumlah\n';
    partsList.forEach((part, idx) => {
      csv += `${idx + 1},"${part.name}","${part.specs}","${part.labels.join(', ')}",${part.qty}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bill_of_materials.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    let text = '=== BILL OF MATERIALS (BOM) ===\n\n';
    partsList.forEach((part, idx) => {
      text += `${idx + 1}. ${part.name} [${part.specs}] - Qty: ${part.qty} (${part.labels.join(', ')})\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400"><FileSpreadsheet className="w-4 h-4" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bill of Materials (BOM)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Daftar rincian kebutuhan komponen untuk perakitan sirkuit fisik.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12">No</th>
                <th className="py-2.5 px-3">Komponen</th>
                <th className="py-2.5 px-3">Nilai / Spek</th>
                <th className="py-2.5 px-3">Label</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {partsList.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">Belum ada komponen di dalam kanvas sirkuit</td></tr>
              ) : (
                partsList.map((part, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 dark:text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{part.name}</td>
                    <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400 font-medium">{part.specs}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">{part.labels.join(', ')}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 text-right">{part.qty}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Item Part: {components.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyText} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer">{copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Tersalin!' : 'Salin Text'}</button>
            <button onClick={handleDownloadCsv} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-md"><Download className="w-3.5 h-3.5" />Download CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
};
