import React, { useState, useMemo } from 'react';
import { CircuitComponent, ComponentDefinition, Wire } from '../../types/circuit';
import {
  McuWiringGroup,
  WiringTableRow,
  generateMcuWiringGroups,
  exportWiringTableToCsv,
  exportWiringTableToMarkdown,
} from '../../utils/wiringTableGenerator';
import {
  X,
  Download,
  Copy,
  Check,
  Search,
  Layers,
  Cpu,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';

interface WiringTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
  wires: Wire[];
  allDefs: Record<string, ComponentDefinition>;
  onHighlightComponent?: (compId: string | null) => void;
  onHighlightWire?: (wireId: string | null) => void;
}

export const WiringTableModal: React.FC<WiringTableModalProps> = ({
  isOpen,
  onClose,
  components,
  wires,
  allDefs,
  onHighlightComponent,
  onHighlightWire,
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedType, setCopiedType] = useState<'csv' | 'markdown' | null>(null);
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});

  // Generate groups
  const groups = useMemo(() => {
    return generateMcuWiringGroups(components, wires, allDefs);
  }, [components, wires, allDefs]);

  // Apply custom notes overlay
  const groupsWithCustomNotes = useMemo(() => {
    return groups.map((g) => ({
      ...g,
      rows: g.rows.map((r) => ({
        ...r,
        note: customNotes[r.id] !== undefined ? customNotes[r.id] : r.note,
      })),
    }));
  }, [groups, customNotes]);

  // Filter by active tab and search query
  const filteredGroups = useMemo(() => {
    let result = groupsWithCustomNotes;
    if (activeTab !== 'all') {
      result = result.filter((g) => g.mcu.id === activeTab);
    }

    if (!searchQuery.trim()) return result;

    const q = searchQuery.toLowerCase().trim();
    return result
      .map((g) => ({
        ...g,
        rows: g.rows.filter(
          (r) =>
            r.componentName.toLowerCase().includes(q) ||
            r.interfaceType.toLowerCase().includes(q) ||
            r.mcuPin.toLowerCase().includes(q) ||
            r.gpio.toLowerCase().includes(q) ||
            r.note.toLowerCase().includes(q) ||
            r.converterModule.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.rows.length > 0);
  }, [groupsWithCustomNotes, activeTab, searchQuery]);

  const totalPins = useMemo(() => {
    return groupsWithCustomNotes.reduce((acc, g) => acc + g.rows.length, 0);
  }, [groupsWithCustomNotes]);

  if (!isOpen) return null;

  // Handlers
  const handleDownloadCsv = () => {
    const csvContent = exportWiringTableToCsv(
      activeTab === 'all'
        ? groupsWithCustomNotes
        : groupsWithCustomNotes.filter((g) => g.mcu.id === activeTab)
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wiring_table_pin_hardware_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyMarkdown = () => {
    const mdContent = exportWiringTableToMarkdown(
      activeTab === 'all'
        ? groupsWithCustomNotes
        : groupsWithCustomNotes.filter((g) => g.mcu.id === activeTab)
    );
    navigator.clipboard.writeText(mdContent);
    setCopiedType('markdown');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getInterfaceBadgeStyle = (type: string) => {
    switch (type) {
      case 'I2C':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
      case 'SPI':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'UART':
        return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'One Wire':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Interrupt':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Digital Output':
      case 'PWM Output':
      case 'PWM / Output':
        return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30';
      case 'Digital Input':
        return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case 'Analog Input':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      case 'Power Rail':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'Ground Rail':
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 md:px-6 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs"><TableIcon className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100">Tabel Wiring Pin Hardware</h2>
                <span className="text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full">{totalPins} Jalur Terpetakan</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pemetaan pinout mikrokontroler, antarmuka sinyal, level converter, dan GPIO fisik secara otomatis</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleDownloadCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-xs transition-all cursor-pointer" title="Unduh tabel dalam format CSV (Cocok untuk Google Sheets / Excel)"><Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Download CSV</span></button>
            <button onClick={handleCopyMarkdown} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700" title="Salin tabel format Markdown">{copiedType === 'markdown' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}<span className="hidden sm:inline">{copiedType === 'markdown' ? 'Tersalin!' : 'Salin Markdown'}</span></button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Toolbar: Search & Tab Bar (Group by MCU) */}
        <div className="px-4 md:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button onClick={() => setActiveTab('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'all' ? 'bg-sky-500 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><Layers className="w-3.5 h-3.5" /><span>Semua MCU ({totalPins})</span></button>
            {groupsWithCustomNotes.map((g, idx) => (
              <button key={g.mcu.id} onClick={() => setActiveTab(g.mcu.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === g.mcu.id ? 'bg-sky-500 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><Cpu className="w-3.5 h-3.5 text-sky-400" /><span>MCU {idx + 1}: {g.mcu.label || g.mcu.name || g.mcuDef.name} ({g.rows.length})</span></button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari pin, sensor, GPIO, interface..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 transition-colors font-normal" />
          </div>
        </div>

        {/* Content Area: Table View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400"><TableIcon className="w-7 h-7" /></div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{groups.length === 0 ? 'Belum Ada Mikrokontroler / Kabel Terhubung' : 'Tidak Ada Baris yang Cocok dengan Pencarian'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">{groups.length === 0 ? 'Tambahkan mikrokontroler (Arduino, ESP32, NodeMCU, Wemos) dan hubungkan kabel ke sensor/modul untuk melihat tabel pemetaan pin hardware otomatis.' : 'Coba ubah kata kunci pencarian pada kotak pencarian di atas.'}</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.mcu.id} className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900/60 transition-colors">
                {/* Header Group Banner */}
                <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs"><Cpu className="w-4 h-4" /></div>
                    <div>
                      <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100">{group.mcuTitle}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{group.mcuSubtitle}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg shadow-2xs">{group.rows.length} Pin Terhubung</span>
                </div>

                {/* Table Component */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Komponen</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Interface</th>
                        <th className="py-2.5 px-3 min-w-[90px]">Pin MCU</th>
                        <th className="py-2.5 px-3 min-w-[90px]">GPIO</th>
                        <th className="py-2.5 px-3 min-w-[70px] text-center">Pin LV</th>
                        <th className="py-2.5 px-3 min-w-[120px] text-center">Modul Converter</th>
                        <th className="py-2.5 px-3 min-w-[70px] text-center">Pin HV</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {group.rows.map((row) => (
                        <tr key={row.id} onMouseEnter={() => { if (onHighlightWire && row.wireId) onHighlightWire(row.wireId); if (onHighlightComponent && row.targetCompId) onHighlightComponent(row.targetCompId); }} onMouseLeave={() => { if (onHighlightWire) onHighlightWire(null); if (onHighlightComponent) onHighlightComponent(null); }} className="hover:bg-sky-50/60 dark:hover:bg-sky-950/30 transition-colors group cursor-default">
                          <td className="py-2.5 px-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500">{row.no}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              {row.wireColor && (<span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-white/20" style={{ backgroundColor: row.wireColor }} title={`Warna kabel: ${row.wireColor}`} />)}
                              <span className="truncate">{row.componentName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border inline-flex items-center whitespace-nowrap ${getInterfaceBadgeStyle(row.interfaceType)}`}>{row.interfaceType}</span></td>
                          <td className="py-2.5 px-3"><span className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded-md inline-block">{row.mcuPin}</span></td>
                          <td className="py-2.5 px-3">{row.gpio && row.gpio !== '-' ? (<span className="text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 px-2 py-0.5 rounded-md inline-block">{row.gpio}</span>) : (<span className="text-slate-300 dark:text-slate-600 text-xs font-medium">—</span>)}</td>
                          <td className="py-2.5 px-3 text-center">{row.pinLv !== '-' ? (<span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-xs font-semibold inline-block">{row.pinLv}</span>) : (<span className="text-slate-300 dark:text-slate-600 text-xs font-medium">—</span>)}</td>
                          <td className="py-2.5 px-3 text-center">{row.converterModule !== '-' ? (<span className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md text-xs font-medium inline-block">{row.converterModule}</span>) : (<span className="text-slate-300 dark:text-slate-600 text-xs font-medium">—</span>)}</td>
                          <td className="py-2.5 px-3 text-center">{row.pinHv !== '-' ? (<span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md text-xs font-semibold inline-block">{row.pinHv}</span>) : (<span className="text-slate-300 dark:text-slate-600 text-xs font-medium">—</span>)}</td>
                          <td className="py-2.5 px-3"><input type="text" value={row.note} placeholder="Tambah catatan..." onChange={(e) => { const val = e.target.value; setCustomNotes((prev) => ({ ...prev, [row.id]: val })); }} className="w-full bg-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 px-2 py-1 rounded-md text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400/60 border border-transparent focus:border-sky-500 outline-hidden transition-colors" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 md:px-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-sky-500 shrink-0" /><span>Arahkan mouse pada baris untuk menyalakan kabel & komponen terkait di kanvas.</span></div>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer">Tutup</button>
        </div>
      </div>
    </div>
  );
};
