import React, { useState, useMemo } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { CircuitComponent, Wire, CircuitProject } from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { getAllComponentDefinitions } from '../../utils/customComponents';
import { formatResistance } from '../../utils/geometry';
import { useTheme } from '../../context/ThemeContext';
import { showToast, showError } from '../../utils/alert';
import {
  Download,
  X,
  Sparkles,
  Maximize2,
  Copy,
  Check,
  FileCode,
  FileSpreadsheet,
  FileText,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Cpu,
  Zap,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  components: CircuitComponent[];
  wires: Wire[];
}

type ExportScale = 1 | 2 | 3 | 4;
type ExportFormat = 'png' | 'svg' | 'jpeg';
type BackgroundOption = 'theme' | 'dark' | 'light' | 'transparent';
type ExportScope = 'auto' | 'viewport';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  components,
  wires,
}) => {
  const { theme } = useTheme();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'image' | 'files'>('image');

  // Export Settings
  const [scale, setScale] = useState<ExportScale>(3); // Default to 3x Super HD (4K)
  const [format, setFormat] = useState<ExportFormat>('png');
  const [bgOption, setBgOption] = useState<BackgroundOption>('theme');
  const [scope, setScope] = useState<ExportScope>('auto');

  // Action status states
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Calculate bounding box of all components and wires
  const boundingBox = useMemo(() => {
    if (components.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    }

    const allDefs = getAllComponentDefinitions();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    components.forEach((c) => {
      const def = allDefs[c.type] || COMPONENT_DEFINITIONS[c.type];
      const w = def?.width || 60;
      const h = def?.height || 60;
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + w);
      maxY = Math.max(maxY, c.y + h);
    });

    wires.forEach((w) => {
      if (w.fromPoint) {
        minX = Math.min(minX, w.fromPoint.x);
        minY = Math.min(minY, w.fromPoint.y);
        maxX = Math.max(maxX, w.fromPoint.x);
        maxY = Math.max(maxY, w.fromPoint.y);
      }
      if (w.toPoint) {
        minX = Math.min(minX, w.toPoint.x);
        minY = Math.min(minY, w.toPoint.y);
        maxX = Math.max(maxX, w.toPoint.x);
        maxY = Math.max(maxY, w.toPoint.y);
      }
      if (w.waypoints) {
        w.waypoints.forEach((pt) => {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        });
      }
    });

    const padding = 60;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.max(100, maxX - minX + padding * 2);
    const cropHeight = Math.max(100, maxY - minY + padding * 2);

    return {
      minX: cropX,
      minY: cropY,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    };
  }, [components, wires]);

  // Estimated resolution calculation
  const estimatedResolution = useMemo(() => {
    if (scope === 'viewport') {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const h = typeof window !== 'undefined' ? window.innerHeight - 56 : 720;
      return {
        width: Math.round(w * scale),
        height: Math.round(h * scale),
      };
    }
    return {
      width: Math.round(boundingBox.width * scale),
      height: Math.round(boundingBox.height * scale),
    };
  }, [scope, boundingBox, scale]);

  // Determine actual background color
  const resolvedBgColor = useMemo(() => {
    if (bgOption === 'transparent') {
      return format === 'jpeg' ? '#ffffff' : null;
    }
    if (bgOption === 'dark') return '#020617';
    if (bgOption === 'light') return '#ffffff';
    // 'theme' option
    return theme === 'dark' ? '#020617' : '#f8fafc';
  }, [bgOption, format, theme]);

  if (!isOpen) return null;

  // Render or clone canvas for high quality export
  const prepareExportElement = () => {
    if (scope === 'viewport') {
      const container = document.querySelector('[data-canvas-container="true"]') as HTMLElement;
      if (!container) throw new Error('Canvas container not found');
      return { element: container, cleanup: () => {} };
    }

    // Auto-fit bounding box snapshot
    const svgOriginal = document.querySelector('[data-canvas-container="true"] svg') as SVGSVGElement;
    if (!svgOriginal) throw new Error('Canvas SVG tidak ditemukan');

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '0px';
    tempContainer.style.top = '0px';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.width = `${boundingBox.width}px`;
    tempContainer.style.height = `${boundingBox.height}px`;
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.pointerEvents = 'none';
    if (resolvedBgColor) {
      tempContainer.style.backgroundColor = resolvedBgColor;
    }

    const clonedSvg = svgOriginal.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('width', `${boundingBox.width}`);
    clonedSvg.setAttribute('height', `${boundingBox.height}`);
    clonedSvg.setAttribute(
      'viewBox',
      `${boundingBox.minX} ${boundingBox.minY} ${boundingBox.width} ${boundingBox.height}`
    );
    clonedSvg.style.width = `${boundingBox.width}px`;
    clonedSvg.style.height = `${boundingBox.height}px`;
    clonedSvg.style.position = 'absolute';
    clonedSvg.style.left = '0px';
    clonedSvg.style.top = '0px';
    clonedSvg.style.overflow = 'visible';

    // Reset transform on top-level group inside cloned SVG
    const topGroup = clonedSvg.querySelector('g');
    if (topGroup) {
      topGroup.removeAttribute('transform');
    }

    // Insert background rect if needed for SVG export
    if (resolvedBgColor) {
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', `${boundingBox.minX}`);
      bgRect.setAttribute('y', `${boundingBox.minY}`);
      bgRect.setAttribute('width', `${boundingBox.width}`);
      bgRect.setAttribute('height', `${boundingBox.height}`);
      bgRect.setAttribute('fill', resolvedBgColor);
      clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
    }

    tempContainer.appendChild(clonedSvg);
    document.body.appendChild(tempContainer);

    return {
      element: tempContainer,
      clonedSvg,
      cleanup: () => {
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      },
    };
  };

  // 1. Download Diagram Image (PNG / JPEG / SVG)
  const handleDownloadImage = async () => {
    setIsExporting(true);
    let cleanupFn = () => {};
    try {
      const fileName = `${projectName.toLowerCase().replace(/\s+/g, '_')}_diagram.${format}`;

      if (format === 'svg') {
        const { clonedSvg, cleanup } = prepareExportElement();
        cleanupFn = cleanup;

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(clonedSvg || document.querySelector('[data-canvas-container="true"] svg')!);
        if (!svgString.startsWith('<?xml')) {
          svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\r\n' + svgString;
        }

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('success', `Diagram vektor (${format.toUpperCase()}) berhasil diunduh!`);
      } else {
        const { element, cleanup } = prepareExportElement();
        cleanupFn = cleanup;

        const options = {
          pixelRatio: scale,
          quality: 0.95,
          backgroundColor: resolvedBgColor || undefined,
          width: scope === 'auto' ? boundingBox.width : undefined,
          height: scope === 'auto' ? boundingBox.height : undefined,
        };

        const dataUrl =
          format === 'jpeg' ? await toJpeg(element, options) : await toPng(element, options);

        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        showToast('success', `Diagram gambar (${format.toUpperCase()}) resolusi tinggi berhasil diunduh!`);
      }
    } catch (err) {
      console.error('Failed to export image:', err);
      showError('Gagal Ekspor Gambar', 'Terjadi kesalahan saat memproses gambar diagram.');
    } finally {
      cleanupFn();
      setIsExporting(false);
    }
  };

  // 2. Copy Image to Clipboard
  const handleCopyToClipboard = async () => {
    setIsCopying(true);
    let cleanupFn = () => {};
    try {
      const { element, cleanup } = prepareExportElement();
      cleanupFn = cleanup;

      const dataUrl = await toPng(element, {
        pixelRatio: Math.min(scale, 2), // 2x is optimal for clipboard memory
        backgroundColor: resolvedBgColor || undefined,
        width: scope === 'auto' ? boundingBox.width : undefined,
        height: scope === 'auto' ? boundingBox.height : undefined,
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        showToast('success', 'Gambar diagram berhasil disalin ke Clipboard!');
      } else {
        showError('Clipboard Tidak Didukung', 'Browser Anda tidak mendukung penyalinan gambar langsung.');
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showError('Gagal Menyalin', 'Tidak dapat menyalin gambar ke clipboard.');
    } finally {
      cleanupFn();
      setIsCopying(false);
    }
  };

  // 3. Export .wire / .json Project File
  const handleExportProjectFile = (type: 'wire' | 'json') => {
    const projectData: CircuitProject = {
      version: '1.0.0',
      id: `proj_${Date.now()}`,
      name: projectName,
      components,
      wires,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.${type}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', `Berkas proyek (.${type}) berhasil diunduh!`);
  };

  // 4. Export Arduino .ino Sketch
  const handleExportIno = () => {
    const uno = components.find(
      (c) =>
        c.type === 'arduino-uno' ||
        c.type === 'arduino-nano' ||
        c.type.startsWith('esp32') ||
        c.type.startsWith('wemos')
    );

    let code = `// WireCraft - Generated Arduino Sketch\n// Proyek: ${projectName}\n\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("WireCraft Ready!");\n}\n\nvoid loop() {\n  // Masukkan perulangan di sini\n}\n`;

    if (uno) {
      const connectedToUno = wires.filter(
        (w) => w.fromComponentId === uno.id || w.toComponentId === uno.id
      );
      const ledConnections = connectedToUno.filter((w) => {
        const targetId = w.fromComponentId === uno.id ? w.toComponentId : w.fromComponentId;
        const targetComp = components.find((c) => c.id === targetId);
        return targetComp?.type === 'led';
      });

      if (ledConnections.length > 0) {
        code = `// WireCraft - Generated Arduino Sketch\n// Proyek: ${projectName}\n\nconst int LED_PIN = 13;\n\nvoid setup() {\n  pinMode(LED_PIN, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_PIN, LOW);\n  delay(1000);\n}\n`;
      }
    }

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.ino`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Sketsa Arduino (.ino) berhasil diunduh!');
  };

  // 5. Export BOM CSV
  const handleExportBomCsv = () => {
    let csv = 'No,Nama Komponen,Spesifikasi,Label / Referensi,Jumlah\n';
    const groupedParts: Record<string, { name: string; specs: string; labels: string[]; qty: number }> = {};

    components.forEach((comp) => {
      const allDefs = getAllComponentDefinitions();
      const def = allDefs[comp.type] || COMPONENT_DEFINITIONS[comp.type];
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
        groupedParts[key] = {
          name: def?.name || comp.name,
          specs,
          labels: [comp.label],
          qty: 1,
        };
      } else {
        groupedParts[key]!.qty += 1;
        groupedParts[key]!.labels.push(comp.label);
      }
    });

    if (wires.length > 0) {
      groupedParts['wires'] = {
        name: 'Kabel Jumper Fleksibel',
        specs: 'Aneka Warna',
        labels: [`${wires.length} kabel`],
        qty: wires.length,
      };
    }

    Object.values(groupedParts).forEach((part, idx) => {
      csv += `${idx + 1},"${part.name}","${part.specs}","${part.labels.join(', ')}",${part.qty}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_bom.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Tabel Bill of Materials (.csv) berhasil diunduh!');
  };

  // Copy helper for Tab 2
  const copyText = (text: string, fileKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(fileKey);
    showToast('success', 'Konten skrip berhasil disalin!');
    setTimeout(() => setCopiedFile(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 font-sans text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/90 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm shrink-0"><Download className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Export Diagram & Berkas Rangkaian</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-bold">HD Engine</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ekspor gambar diagram visual resolusi tinggi atau unduh berkas proyek, sketsa Arduino, dan BOM.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50/50 dark:bg-slate-950/20 gap-6">
          <button onClick={() => setActiveTab('image')} className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'image' ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}><ImageIcon className="w-4 h-4" /><span>Gambar Diagram (Super HD)</span><span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">AUTO CROP</span></button>
          <button onClick={() => setActiveTab('files')} className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'files' ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}><FileCode className="w-4 h-4" /><span>Berkas Proyek & Kode Rangkaian</span></button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: GAMBAR DIAGRAM */}
          {activeTab === 'image' && (
            <>
              {/* Auto-Fit Bounding Box Snapshot Banner */}
              <div className="p-3.5 bg-sky-50/70 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 rounded-xl flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{scope === 'auto' ? 'Auto-Fit Bounding Box Snapshot' : 'Camera Viewport Snapshot'}</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-400/40 uppercase">{scale === 1 ? '1x SD' : scale === 2 ? '2x RETINA HD' : scale === 3 ? '3x 4K SUPER HD' : '4x 8K ULTRA HD'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{scope === 'auto' ? `Membingkai otomatis seluruh ${components.length} modul & ${wires.length} kabel jumper dengan margin presisi 60px.` : `Mengambil tangkapan sesuai area pan dan level zoom layar kanvas saat ini.`}</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0 shadow-xs">~{estimatedResolution.width} × {estimatedResolution.height} px</div>
              </div>

              {/* 2x2 Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Kerapatan Resolusi (Scale DPI) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"><Maximize2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" /><span>Kerapatan Resolusi (Scale DPI)</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 1, title: '1x Standar', desc: 'Ukuran web standar' },
                      { val: 2, title: '2x Retina HD', desc: 'Jernih untuk layar HD' },
                      { val: 3, title: '3x Super HD (4K)', desc: 'Sangat jernih & tajam', badge: 'BEST' },
                      { val: 4, title: '4x Ultra HD (8K)', desc: 'Maksimal untuk cetak' },
                    ].map((opt) => (
                      <button key={opt.val} type="button" onClick={() => setScale(opt.val as ExportScale)} className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${scale === opt.val ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-100 shadow-sm ring-1 ring-sky-400/40' : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                        <div className="flex items-center justify-between"><span className="text-xs font-bold">{opt.title}</span>{opt.badge && <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500 text-slate-950">{opt.badge}</span>}</div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Format Berkas Gambar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"><Layers className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" /><span>Format Berkas Gambar</span></div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'png', title: 'PNG Image', desc: 'Raster tajam / transparan' },
                      { val: 'svg', title: 'SVG Vector', desc: 'Vektor tak terbatas' },
                      { val: 'jpeg', title: 'JPEG Image', desc: 'File lebih hemat' },
                    ].map((opt) => (
                      <button key={opt.val} type="button" onClick={() => setFormat(opt.val as ExportFormat)} className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${format === opt.val ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-100 shadow-sm ring-1 ring-sky-400/40' : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                        <span className="text-xs font-bold">{opt.title}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Latar Belakang (Background Canvas) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"><span className="w-2 h-2 rounded-full bg-sky-500" /><span>Latar Belakang (Background Canvas)</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 'theme', title: 'Tema Saat Ini', desc: 'Otomatis Gelap / Terang' },
                      { val: 'dark', title: 'Dark Slate 950', desc: 'Latar gelap pekat (#020617)' },
                      { val: 'light', title: 'Clean Light', desc: 'Latar putih cerah (#ffffff)' },
                      { val: 'transparent', title: 'Transparan', desc: 'Tanpa latar (khusus PNG/SVG)' },
                    ].map((opt) => (
                      <button key={opt.val} type="button" onClick={() => setBgOption(opt.val as BackgroundOption)} className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${bgOption === opt.val ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-100 shadow-sm ring-1 ring-sky-400/40' : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                        <span className="text-xs font-bold">{opt.title}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Cakupan Area Ekspor */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span>Cakupan Area Ekspor</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 'auto', title: 'Seluruh Diagram (Auto)', desc: 'Otomatis membingkai semua modul & kabel' },
                      { val: 'viewport', title: 'Kamera Layar Saat Ini', desc: 'Persis posisi pan & zoom layar sekarang' },
                    ].map((opt) => (
                      <button key={opt.val} type="button" onClick={() => setScope(opt.val as ExportScope)} className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${scope === opt.val ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-100 shadow-sm ring-1 ring-sky-400/40' : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                        <span className="text-xs font-bold">{opt.title}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SKRIP & BERKAS PROYEK */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              {/* Option 1: Native WireCraft .wire File */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0"><Zap className="w-5 h-5" /></div>
                  <div>
                    <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-900 dark:text-slate-100">Berkas Proyek WireCraft (.wire)</span><span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400">Native</span></div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Menyimpan seluruh komponen, pin wiring, posisi koordinat, dan metadata proyek.</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleExportProjectFile('wire')} className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"><Download className="w-3.5 h-3.5" /><span>Download .wire</span></button>
              </div>

              {/* Option 2: Universal JSON Format */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0"><FileCode className="w-5 h-5" /></div>
                  <div>
                    <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-900 dark:text-slate-100">Format Data JSON (.json)</span><span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">Universal</span></div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Struktur data skema sirkuit terbuka untuk integrasi, backup, atau pertukaran data.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => { const jsonStr = JSON.stringify({ version: '1.0.0', name: projectName, components, wires }, null, 2); copyText(jsonStr, 'json'); }} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer" title="Salin JSON ke Clipboard">{copiedFile === 'json' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}</button>
                  <button type="button" onClick={() => handleExportProjectFile('json')} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /><span>Download .json</span></button>
                </div>
              </div>

              {/* Option 3: Arduino C++ Code (.ino) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0"><Cpu className="w-5 h-5" /></div>
                  <div>
                    <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-900 dark:text-slate-100">Sketsa Kode Arduino C++ (.ino)</span><span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-600 dark:text-teal-400">Source Code</span></div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Kode C++ Arduino IDE otomatis terkonfigurasi sesuai modul mikrokontroler dan pin terhubung.</p>
                  </div>
                </div>
                <button type="button" onClick={handleExportIno} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"><Download className="w-3.5 h-3.5" /><span>Download .ino</span></button>
              </div>

              {/* Option 4: Bill of Materials Spreadsheet (.csv) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"><FileSpreadsheet className="w-5 h-5" /></div>
                  <div>
                    <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-900 dark:text-slate-100">Bill of Materials CSV (.csv)</span><span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Spreadsheet</span></div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Daftar rincian kebutuhan komponen, kuantitas part, dan spesifikasi perakitan fisik.</p>
                  </div>
                </div>
                <button type="button" onClick={handleExportBomCsv} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"><Download className="w-3.5 h-3.5" /><span>Download .csv</span></button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status summary */}
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>{components.length} komponen</span><span>•</span><span>{wires.length} kabel</span><span>•</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">{projectName}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {activeTab === 'image' && (
              <>
                <button type="button" onClick={handleCopyToClipboard} disabled={isCopying || isExporting} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"><Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" /><span>{isCopying ? 'Menyalin...' : 'Salin ke Clipboard'}</span></button>
                <button type="button" onClick={handleDownloadImage} disabled={isExporting || isCopying} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/25 cursor-pointer disabled:opacity-50"><Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} /><span>{isExporting ? 'Memproses...' : `Download Gambar (${format.toUpperCase()})`}</span></button>
              </>
            )}

            {activeTab === 'files' && (
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer">Selesai</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
