import React from 'react';
import {
  Upload,
  Sparkles,
  Wand2,
  Crop,
  ShieldCheck,
  Globe,
  Undo,
  RotateCcw,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Magnet,
  Layers,
} from 'lucide-react';
import { CATEGORIES, pxToMm, mmToPx } from './studioConstants';

interface StudioMetadataFormProps {
  typeId: string;
  setTypeId: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
  width: number;
  setWidth: (v: number) => void;
  height: number;
  setHeight: (v: number) => void;
  unit: 'mm' | 'px';
  setUnit: (v: 'mm' | 'px') => void;
  lockAspectRatio: boolean;
  setLockAspectRatio: (v: boolean) => void;
  imageOffset: { x: number; y: number };
  setImageOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  linkPinsToImage: boolean;
  setLinkPinsToImage: (v: boolean) => void;
  imageDataUrl: string;
  rawImageDataUrl: string;
  originalImageSize: { width: number; height: number };
  bgTolerance: number;
  setBgTolerance: (v: number) => void;
  bgAlgorithm: 'flood-fill' | 'global';
  setBgAlgorithm: (v: 'flood-fill' | 'global') => void;
  isProcessingBg: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetToOriginal: () => void;
  onMagicRemoveBackground: () => void;
  onAutoCropToContent: () => void;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
  nudgeImage: (dx: number, dy: number) => void;
  nudgeAll: (dx: number, dy: number) => void;
}

export const StudioMetadataForm: React.FC<StudioMetadataFormProps> = ({
  typeId,
  setTypeId,
  name,
  setName,
  category,
  setCategory,
  description,
  setDescription,
  icon,
  setIcon,
  width,
  setWidth,
  height,
  setHeight,
  unit,
  setUnit,
  lockAspectRatio,
  setLockAspectRatio,
  imageOffset,
  setImageOffset,
  linkPinsToImage,
  setLinkPinsToImage,
  imageDataUrl,
  rawImageDataUrl,
  originalImageSize,
  bgTolerance,
  setBgTolerance,
  bgAlgorithm,
  setBgAlgorithm,
  isProcessingBg,
  fileInputRef,
  onFileUpload,
  onResetToOriginal,
  onMagicRemoveBackground,
  onAutoCropToContent,
  onRotateClockwise,
  onRotateCounterClockwise,
  nudgeImage,
  nudgeAll,
}) => {
  return (
    <div className="w-80 bg-slate-50 dark:bg-slate-950/60 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
      {/* 1. Visual Asset Image */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
          <span>1. Visual Asset Image</span>
          {imageDataUrl && (<span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{originalImageSize.width} × {originalImageSize.height} px</span>)}
        </label>

        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFileUpload} className="hidden" />

        {!imageDataUrl ? (
          <div onClick={() => fileInputRef.current?.click()} className="h-28 border-2 border-dashed border-slate-300 hover:border-sky-500 dark:border-slate-700 dark:hover:border-sky-500/60 rounded-xl bg-white/70 hover:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-3 text-center">
            <Upload className="w-6 h-6 text-sky-600 dark:text-sky-400" /><span className="text-xs font-medium text-slate-700 dark:text-slate-300">Klik atau Drop Gambar Komponen</span><span className="text-[10px] text-slate-400 dark:text-slate-500">PNG, JPG, WebP (Rekomendasi HD)</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative h-28 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/80 p-2 flex items-center justify-center overflow-hidden shadow-xs">
              <img src={imageDataUrl} alt="Component Preview" className="max-h-full max-w-full object-contain" />
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {rawImageDataUrl && rawImageDataUrl !== imageDataUrl && (
                  <button onClick={onResetToOriginal} className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-slate-600 shadow flex items-center gap-1 cursor-pointer" title="Kembalikan gambar asli sebelum remove bg"><Undo className="w-3 h-3" />Reset</button>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow cursor-pointer">Ganti</button>
              </div>
            </div>

            {/* Magic Background Remover */}
            <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />Auto Remove Background</span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-bold">{bgTolerance}%</span>
              </div>

              {/* Mode Algorithm Selector */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                <button type="button" onClick={() => setBgAlgorithm('flood-fill')} className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${bgAlgorithm === 'flood-fill' ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-semibold shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`} title="Hanya hapus background luar. Silkscreen/sablon putih di dalam board AMAN!"><ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Tepi Luar (Aman)</span></button>
                <button type="button" onClick={() => setBgAlgorithm('global')} className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${bgAlgorithm === 'global' ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 font-semibold shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`} title="Hapus semua warna putih di seluruh gambar"><Globe className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" /><span>Global (Semua)</span></button>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400"><span>Toleransi Warna</span><span>{bgTolerance <= 15 ? 'Ketat' : bgTolerance <= 35 ? 'Sedang' : 'Tinggi'}</span></div>
                <input type="range" min="5" max="70" value={bgTolerance} onChange={(e) => setBgTolerance(Number(e.target.value))} className="w-full accent-sky-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer" />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={onMagicRemoveBackground} disabled={isProcessingBg} className="py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer" title="Hapus background luar dan otomatis pangkas (crop) ke batas fisik bodi modul"><Sparkles className="w-3.5 h-3.5" /><span>{isProcessingBg ? 'Memproses...' : 'Hapus BG'}</span></button>
                <button type="button" onClick={onAutoCropToContent} className="py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-700 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer" title="Pangkas (crop) sisa area transparan di pinggir agar ukuran mm pas ke bodi modul"><Crop className="w-3.5 h-3.5" /><span>Crop Bodi</span></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Dimension, Rotation & Image Positioning Controls */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">2. Ukuran & Posisi</label>

          <div className="flex items-center gap-1.5">
            {/* Unit Switcher: mm / px */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button onClick={() => setUnit('mm')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${unit === 'mm' ? 'bg-sky-500 text-white dark:text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`} title="Gunakan satuan Milimeter (mm) - Standar Fisik Komponen">mm</button>
              <button onClick={() => setUnit('px')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${unit === 'px' ? 'bg-sky-500 text-white dark:text-slate-950 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`} title="Gunakan satuan Pixels (px) Canvas">px</button>
            </div>

            {/* Rotation Tools */}
            <button onClick={onRotateCounterClockwise} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Putar 90° Berlawanan Jarum Jam"><RotateCcw className="w-3.5 h-3.5" /></button>
            <button onClick={onRotateClockwise} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Putar 90° Searah Jarum Jam"><RotateCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Width & Height Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between"><span>Lebar ({unit})</span><span className="font-mono text-[9px] text-slate-400">{unit === 'mm' ? `${width}px` : `${pxToMm(width)}mm`}</span></span>
            <input type="number" min="5" step={unit === 'mm' ? '0.1' : '1'} value={unit === 'mm' ? pxToMm(width) : width} onChange={(e) => { const val = Number(e.target.value); const pxVal = unit === 'mm' ? mmToPx(val) : val; const aspect = width > 0 && height > 0 ? height / width : 1; setWidth(pxVal); if (lockAspectRatio && pxVal > 0) { setHeight(Math.round(pxVal * aspect * 10) / 10); } }} className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-800 dark:text-slate-100" />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between"><span>Tinggi ({unit})</span><span className="font-mono text-[9px] text-slate-400">{unit === 'mm' ? `${height}px` : `${pxToMm(height)}mm`}</span></span>
            <input type="number" min="5" step={unit === 'mm' ? '0.1' : '1'} value={unit === 'mm' ? pxToMm(height) : height} onChange={(e) => { const val = Number(e.target.value); const pxVal = unit === 'mm' ? mmToPx(val) : val; const aspect = width > 0 && height > 0 ? width / height : 1; setHeight(pxVal); if (lockAspectRatio && pxVal > 0) { setWidth(Math.round(pxVal * aspect * 10) / 10); } }} className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-800 dark:text-slate-100" />
          </div>
        </div>

        {/* Lock Aspect Ratio & Link Pins */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={lockAspectRatio} onChange={(e) => setLockAspectRatio(e.target.checked)} className="rounded text-sky-500 focus:ring-0 w-3.5 h-3.5" />
            <span>Kunci Aspek Rasio</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer" title="Gerakkan Pin & Gambar bersamaan saat tombol panah ditekan">
            <input type="checkbox" checked={linkPinsToImage} onChange={(e) => setLinkPinsToImage(e.target.checked)} className="rounded text-sky-500 focus:ring-0 w-3.5 h-3.5" />
            <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-sky-500" />Tautkan Pin</span>
          </label>
        </div>

        {/* Fine Nudge Offset Controls */}
        <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            <span>Fine Alignment (Nudge)</span><span className="font-mono text-slate-400">Offset: {imageOffset.x.toFixed(1)}, {imageOffset.y.toFixed(1)} px</span>
          </div>

          <div className="grid grid-cols-3 gap-1 w-28 mx-auto">
            <div />
            <button onClick={() => (linkPinsToImage ? nudgeAll(0, -1) : nudgeImage(0, -1))} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
            <div />
            <button onClick={() => (linkPinsToImage ? nudgeAll(-1, 0) : nudgeImage(-1, 0))} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => setImageOffset({ x: 0, y: 0 })} className="p-1 text-[9px] font-bold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center cursor-pointer" title="Reset Offset Gambar ke 0,0">0,0</button>
            <button onClick={() => (linkPinsToImage ? nudgeAll(1, 0) : nudgeImage(1, 0))} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"><ArrowRight className="w-3.5 h-3.5" /></button>
            <div />
            <button onClick={() => (linkPinsToImage ? nudgeAll(0, 1) : nudgeImage(0, 1))} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
            <div />
          </div>
        </div>
      </div>

      {/* 3. Component Metadata (TypeId, Name, Category, Description) */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">3. Metadata Komponen</label>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Type ID (Unik / Slug)</span>
          <input type="text" value={typeId} onChange={(e) => setTypeId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))} className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-sky-600 dark:text-sky-400" placeholder="custom-sensor-mq2" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Nama Tampilan</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100" placeholder="Sensor Gas MQ-2" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Kategori Katalog</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 cursor-pointer">
            {CATEGORIES.map((cat) => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Deskripsi Singkat</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 resize-none" placeholder="Modul sensor gas analog/digital dengan potesio" />
        </div>
      </div>
    </div>
  );
};
