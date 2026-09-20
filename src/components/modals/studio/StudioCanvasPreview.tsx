import React from 'react';
import { Pin, PinType } from '../../../types/circuit';
import { PIN_TYPES, getPinCalloutGeometry } from './studioConstants';
import { inferPinProfile } from '../../../utils/pinInference';
import {
  Undo2,
  Redo2,
  Sparkles,
  Plus,
  Layers,
  RotateCw,
  Magnet,
  Tag,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';

interface StudioCanvasPreviewProps {
  canvasRef: React.RefObject<SVGSVGElement | null>;
  inlineInputRef: React.RefObject<HTMLInputElement | null>;
  width: number;
  height: number;
  unit: 'mm' | 'px';
  imageOffset: { x: number; y: number };
  imageDataUrl: string;
  pins: Pin[];
  selectedPinId: string | null;
  setSelectedPinId: (id: string | null) => void;
  hoveredPinId: string | null;
  setHoveredPinId: (id: string | null) => void;
  draggingPinId: string | null;
  alwaysShowLabels: boolean;
  setAlwaysShowLabels: React.Dispatch<React.SetStateAction<boolean>>;
  toolMode: 'smart' | 'add-pin';
  setToolMode: (mode: 'smart' | 'add-pin') => void;
  linkPinsToImage: boolean;
  setLinkPinsToImage: (v: boolean) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isPanning: boolean;
  setIsPanning: (v: boolean) => void;
  setStartPanPos: (v: { x: number; y: number }) => void;
  isSpacePressed: boolean;
  hasMovedPanRef: React.MutableRefObject<boolean>;
  showBreadboard: boolean;
  setShowBreadboard: (v: boolean) => void;
  breadboardType: 'half' | 'mini' | 'grid';
  setBreadboardType: (v: 'half' | 'mini' | 'grid') => void;
  breadboardOpacity: number;
  setBreadboardOpacity: (v: number) => void;
  snapToBreadboard: boolean;
  setSnapToBreadboard: (v: boolean) => void;
  breadboardOffset: { x: number; y: number };
  inlineEditPinId: string | null;
  inlinePinName: string;
  setInlinePinName: (v: string) => void;
  inlinePinDescription: string;
  setInlinePinDescription: (v: string) => void;
  historyIndex: number;
  historyLength: number;
  handleUndo: () => void;
  handleRedo: () => void;
  handleRotateClockwise: (rotatePins?: boolean) => void;
  handleAutoScaleAndSnapToBreadboard: () => void;
  handleCanvasWheel: (e: React.WheelEvent) => void;
  handleCanvasClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleImageMouseDown: (e: React.MouseEvent) => void;
  handlePinMouseDown: (e: React.MouseEvent, pinId: string) => void;
  startInlineEdit: (pinId: string) => void;
  commitAndNavigateInlineEdit: (action: 'next' | 'prev' | 'close') => void;
  applyPinNameChange: (
    pinId: string,
    newName: string,
    newType?: PinType,
    newDesc?: string
  ) => void;
}

export const StudioCanvasPreview: React.FC<StudioCanvasPreviewProps> = ({
  canvasRef,
  inlineInputRef,
  width,
  height,
  unit,
  imageOffset,
  imageDataUrl,
  pins,
  selectedPinId,
  setSelectedPinId,
  hoveredPinId,
  setHoveredPinId,
  draggingPinId,
  alwaysShowLabels,
  setAlwaysShowLabels,
  toolMode,
  setToolMode,
  linkPinsToImage,
  setLinkPinsToImage,
  zoom,
  setZoom,
  pan,
  setPan,
  isPanning,
  setIsPanning,
  setStartPanPos,
  isSpacePressed,
  hasMovedPanRef,
  showBreadboard,
  setShowBreadboard,
  breadboardType,
  setBreadboardType,
  breadboardOpacity,
  setBreadboardOpacity,
  snapToBreadboard,
  setSnapToBreadboard,
  breadboardOffset,
  inlineEditPinId,
  inlinePinName,
  setInlinePinName,
  inlinePinDescription,
  setInlinePinDescription,
  historyIndex,
  historyLength,
  handleUndo,
  handleRedo,
  handleRotateClockwise,
  handleAutoScaleAndSnapToBreadboard,
  handleCanvasWheel,
  handleCanvasClick,
  handleImageMouseDown,
  handlePinMouseDown,
  startInlineEdit,
  commitAndNavigateInlineEdit,
  applyPinNameChange,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#f1f5f9] dark:bg-slate-950 relative overflow-hidden">
      {/* Canvas Toolbar - Sleek Pro Single-Line Bar */}
      <div className="min-h-[46px] bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between z-10 gap-3 overflow-x-auto select-none">
        {/* Primary Tool Mode Switch, Undo/Redo & Rotate */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Undo / Redo Buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-900/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= historyLength - 1}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Smart Mode & Add Pin Segmented Control */}
          <div className="flex bg-slate-100 dark:bg-slate-900/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <button
              onClick={() => setToolMode('smart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                toolMode === 'smart'
                  ? 'bg-sky-500 text-white dark:text-slate-950 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/80'
              }`}
              title="Mode Pintar: Langsung geser Pin, Gambar, atau Kanvas secara otomatis tanpa gonta-ganti tombol"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mode Pintar</span>
            </button>

            <button
              onClick={() => setToolMode('add-pin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                toolMode === 'add-pin'
                  ? 'bg-emerald-500 text-white dark:text-slate-950 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/80'
              }`}
              title="Tambah Pin: Klik kanvas untuk menambah pin baru. Tips: Tahan Shift + Klik untuk Pin Stamp otomatis (jarak pas 17px berurutan)!"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pin</span>
            </button>
          </div>

          {/* Geser Bersama (Link Pins) Toggle Button */}
          <button
            onClick={() => setLinkPinsToImage(!linkPinsToImage)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
              linkPinsToImage
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:bg-purple-500/20 dark:border-purple-500/60 dark:text-purple-300'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
            title="Geser Bersama: Saat aktif, menggeser gambar otomatis menggeser semua pin bersamaan (atau tahan Shift saat tarik gambar)"
          >
            <Layers
              className={`w-3.5 h-3.5 ${linkPinsToImage ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}
            />
            <span className="hidden sm:inline">Geser Bersama</span>
            <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-800">
              Shift
            </span>
          </button>

          {/* Direct Rotate Actions */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleRotateClockwise(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Putar Seluruh Komponen (Bodi + Gambar + Semua Pin) 90° (Shortcut: Tombol R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Putar 90°</span>
              <span className="text-[10px] font-mono font-bold px-1 py-0.2 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-800">
                R
              </span>
            </button>

            <button
              onClick={() => handleRotateClockwise(false)}
              className="px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border-l border-slate-200 dark:border-slate-800 cursor-pointer"
              title="Putar visual gambar saja 90° (Pin TIDAK ikut berputar untuk kalibrasi visual)"
            >
              <RotateCw className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              <span className="hidden md:inline">Gbr Saja</span>
            </button>
          </div>
        </div>

        {/* Guides, Overlays & Zoom */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 1-Click Smart Auto-Scale & Snap to Breadboard Holes */}
          <button
            onClick={handleAutoScaleAndSnapToBreadboard}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border bg-gradient-to-r from-sky-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:to-indigo-500/20 dark:from-sky-500/20 dark:to-indigo-500/20 dark:hover:from-sky-500/30 dark:hover:to-indigo-500/30 border-sky-500/30 dark:border-sky-500/40 text-sky-700 dark:text-sky-200 transition-all shadow-xs shrink-0 cursor-pointer"
            title="1-Klik: Otomatis resize gambar sesuai jarak pin & kunci semua pin tepat di lubang breadboard (Pitch 17px / 2.54mm)"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden md:inline">Paskan Skala & Pin ke BB</span>
            <span className="md:hidden">Paskan BB</span>
          </button>

          {/* Magnet Snap Toggle Button */}
          <button
            onClick={() => setSnapToBreadboard(!snapToBreadboard)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-xs shrink-0 cursor-pointer ${
              snapToBreadboard
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
            title={
              unit === 'mm'
                ? 'Kunci posisi pin tepat di lubang breadboard (Pitch 2.54mm / 17px)'
                : 'Kunci posisi pin tepat di lubang breadboard (Pitch 17px)'
            }
          >
            <Magnet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{unit === 'mm' ? 'Snap 2.54mm' : 'Snap 17px'}</span>
          </button>

          {/* Pin Callout Toggle Button */}
          <button
            onClick={() => setAlwaysShowLabels(!alwaysShowLabels)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-xs shrink-0 cursor-pointer ${
              alwaysShowLabels
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:bg-sky-500/15 dark:border-sky-500/40 dark:text-sky-300'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
            title={alwaysShowLabels ? 'Callout selalu tampil' : 'Callout tampil saat pin di-hover / dipilih (Default)'}
          >
            <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Callout</span>
          </button>

          {/* Breadboard Capsule */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={showBreadboard}
                onChange={(e) => setShowBreadboard(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sky-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="font-semibold text-xs">Breadboard</span>
            </label>

            {showBreadboard && (
              <>
                <select
                  value={breadboardType}
                  onChange={(e) => setBreadboardType(e.target.value as any)}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-[11px] rounded-lg px-2 py-0.5 outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="half">Half (400)</option>
                  <option value="mini">Mini (170)</option>
                  <option value="grid">Grid 17px</option>
                </select>

                <div
                  className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800"
                  title="Transparansi Breadboard"
                >
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={breadboardOpacity}
                    onChange={(e) => setBreadboardOpacity(Number(e.target.value))}
                    className="w-14 accent-sky-500 h-1 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>

          {/* Zoom Capsule */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900 px-1 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-800 dark:text-slate-300 font-bold px-1 min-w-[38px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4.0, z + 0.2))}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1.8);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors ml-0.5 border-l border-slate-200 dark:border-slate-800 cursor-pointer"
              title="Reset Posisi & Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div
        className={`flex-1 overflow-hidden relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] select-none ${
          isPanning
            ? 'cursor-grabbing'
            : isSpacePressed
            ? 'cursor-grab'
            : toolMode === 'add-pin'
            ? 'cursor-crosshair'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        onWheel={handleCanvasWheel}
        onMouseDown={(e) => {
          hasMovedPanRef.current = false;
          if (
            e.button === 1 ||
            isSpacePressed ||
            e.altKey ||
            (e.button === 0 && toolMode !== 'add-pin')
          ) {
            setIsPanning(true);
            setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          }
        }}
      >
        <svg ref={canvasRef} className="w-full h-full select-none" onClick={handleCanvasClick}>
          <g transform={`translate(${pan.x + 120}, ${pan.y + 80}) scale(${zoom})`}>
            {/* REALISTIC BREADBOARD OVERLAY (HALF / MINI / GRID) */}
            {showBreadboard && (
              <g opacity={breadboardOpacity} pointerEvents="none">
                {breadboardType === 'half' ? (
                  <g transform={`translate(${breadboardOffset.x + 8.216667}, ${breadboardOffset.y})`}>
                    <image
                      href="/components/breadboard_half.svg"
                      x={0}
                      y={0}
                      width={578.554}
                      height={357.0}
                      preserveAspectRatio="none"
                    />
                  </g>
                ) : breadboardType === 'mini' ? (
                  <g
                    transform={`translate(${breadboardOffset.x - 0.288}, ${breadboardOffset.y - 8.63})`}
                  >
                    <image
                      href="/components/breadboard_mini.svg"
                      x={0}
                      y={0}
                      width={306.56}
                      height={238.27}
                      preserveAspectRatio="none"
                    />
                  </g>
                ) : (
                  <g opacity={0.4}>
                    {Array.from({ length: Math.max(22, Math.ceil(height / 17) + 8) }).map((_, r) => (
                      <React.Fragment key={`row-${r}`}>
                        {Array.from({ length: Math.max(35, Math.ceil(width / 17) + 12) }).map(
                          (__, c) => {
                            const hx = c * 17.0 + breadboardOffset.x;
                            const hy = r * 17.0 + breadboardOffset.y;
                            return (
                              <circle
                                key={`bb-${r}-${c}`}
                                cx={hx}
                                cy={hy}
                                r={2.2}
                                fill="#38bdf8"
                                stroke="#0284c7"
                                strokeWidth={0.8}
                              />
                            );
                          }
                        )}
                      </React.Fragment>
                    ))}
                  </g>
                )}
              </g>
            )}

            {/* Component Border Box */}
            <rect
              x={imageOffset.x}
              y={imageOffset.y}
              width={width}
              height={height}
              fill="#0f172a"
              fillOpacity={0.4}
              stroke="#38bdf8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              rx={4}
              className={
                toolMode === 'add-pin'
                  ? 'cursor-crosshair'
                  : 'cursor-grab active:cursor-grabbing hover:stroke-sky-400'
              }
              onMouseDown={handleImageMouseDown}
            />

            {/* Component Image */}
            {imageDataUrl && (
              <image
                href={imageDataUrl}
                x={imageOffset.x}
                y={imageOffset.y}
                width={width}
                height={height}
                preserveAspectRatio="none"
                className={
                  toolMode === 'add-pin'
                    ? 'cursor-crosshair'
                    : 'cursor-grab active:cursor-grabbing hover:opacity-95 transition-opacity duration-150'
                }
                onMouseDown={handleImageMouseDown}
              />
            )}

            {/* Render Pins & Smart Elbow Callouts */}
            {pins
              .slice()
              .sort((a, b) => {
                if (a.id === selectedPinId) return 1;
                if (b.id === selectedPinId) return -1;
                if (a.id === hoveredPinId) return 1;
                if (b.id === hoveredPinId) return -1;
                return 0;
              })
              .map((pin) => {
                const isSelected = pin.id === selectedPinId;
                const isHovered = pin.id === hoveredPinId;
                const isDragging = pin.id === draggingPinId;
                const shouldShowLabel = isHovered || isSelected || isDragging || alwaysShowLabels;
                const typeDef = PIN_TYPES.find((t) => t.type === pin.type) || PIN_TYPES[0];
                const callout = getPinCalloutGeometry(pin, imageOffset, width, height);
                const badgeColor = isSelected ? '#38bdf8' : isHovered ? '#38bdf8' : typeDef.color;
                const strokeW = isSelected ? 1.6 : isHovered ? 1.4 : 1.1;

                return (
                  <g
                    key={pin.id}
                    transform={`translate(${pin.x}, ${pin.y})`}
                    style={{ pointerEvents: 'all' }}
                    onMouseEnter={() => setHoveredPinId(pin.id)}
                    onMouseLeave={() => setHoveredPinId(null)}
                    onMouseDown={(e) => handlePinMouseDown(e, pin.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPinId(pin.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startInlineEdit(pin.id);
                    }}
                  >
                    {/* Invisible Large Hit Area */}
                    <circle
                      cx={0}
                      cy={0}
                      r={14}
                      fill="transparent"
                      className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                    />

                    {/* Selected Glowing Ring */}
                    {isSelected && (
                      <circle
                        cx={0}
                        cy={0}
                        r={10}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        className="animate-spin"
                        style={{ animationDuration: '4s' }}
                      />
                    )}

                    {/* Crosshair Precision Sniper Mode or Solid Pin */}
                    {isDragging ? (
                      <g pointerEvents="none">
                        <circle
                          cx={0}
                          cy={0}
                          r={12}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={0.9}
                          strokeDasharray="2 2"
                          opacity={0.75}
                        />
                        <circle
                          cx={0}
                          cy={0}
                          r={5.5}
                          fill={typeDef.color}
                          fillOpacity={0.2}
                          stroke="#38bdf8"
                          strokeWidth={1.5}
                        />
                        <line
                          x1={-10}
                          y1={0}
                          x2={-2.2}
                          y2={0}
                          stroke="#38bdf8"
                          strokeWidth={1.2}
                          strokeLinecap="round"
                        />
                        <line
                          x1={2.2}
                          y1={0}
                          x2={10}
                          y2={0}
                          stroke="#38bdf8"
                          strokeWidth={1.2}
                          strokeLinecap="round"
                        />
                        <line
                          x1={0}
                          y1={-10}
                          x2={0}
                          y2={-2.2}
                          stroke="#38bdf8"
                          strokeWidth={1.2}
                          strokeLinecap="round"
                        />
                        <line
                          x1={0}
                          y1={2.2}
                          x2={0}
                          y2={10}
                          stroke="#38bdf8"
                          strokeWidth={1.2}
                          strokeLinecap="round"
                        />
                        <circle cx={0} cy={0} r={2.0} fill="none" stroke="#ffffff" strokeWidth={1} />
                        <circle cx={0} cy={0} r={0.4} fill="#ffffff" opacity={0.9} />
                      </g>
                    ) : (
                      <>
                        <circle
                          cx={0}
                          cy={0}
                          r={5.5}
                          fill={typeDef.color}
                          stroke="#ffffff"
                          strokeWidth={1.8}
                          className="cursor-grab"
                        />
                        <circle cx={0} cy={0} r={1.8} fill="#ffffff" pointerEvents="none" />
                      </>
                    )}

                    {/* Smart Directional Elbow Callout Annotation */}
                    {shouldShowLabel && (
                      <g
                        pointerEvents="none"
                        className="transition-all duration-150"
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.65))',
                          opacity: isDragging ? 0.5 : 1,
                        }}
                      >
                        <path
                          d={`M ${callout.p0.x} ${callout.p0.y} L ${callout.p1.x} ${callout.p1.y} L ${callout.p2.x} ${callout.p2.y}`}
                          fill="none"
                          stroke={badgeColor}
                          strokeWidth={strokeW}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.95}
                        />
                        <circle cx={callout.p0.x} cy={callout.p0.y} r={1.6} fill={badgeColor} />
                        <rect
                          x={callout.badgeX - callout.badgeW / 2}
                          y={callout.badgeY - callout.badgeH / 2}
                          width={callout.badgeW}
                          height={callout.badgeH}
                          rx={3.5}
                          fill="#020617"
                          fillOpacity={0.96}
                          stroke={badgeColor}
                          strokeWidth={strokeW}
                        />
                        <circle
                          cx={callout.badgeX - callout.badgeW / 2 + 5.5}
                          cy={callout.badgeY}
                          r={2}
                          fill={typeDef.color}
                        />
                        <text
                          x={callout.badgeX + 3}
                          y={callout.badgeY + 3.2}
                          fill="#f8fafc"
                          fontSize={8.5}
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                          letterSpacing="0.02em"
                        >
                          {pin.name}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
          </g>
        </svg>

        {/* Floating Inline Pin Quick Edit Popover */}
        {(() => {
          const inlineEditingPin = pins.find((p) => p.id === inlineEditPinId);
          if (!inlineEditingPin) return null;
          const inlinePinIndex = pins.findIndex((p) => p.id === inlineEditPinId);
          const inlineProfile = inferPinProfile(inlinePinName);
          const inlineTypeDef =
            PIN_TYPES.find((t) => t.type === inlineEditingPin.type) || PIN_TYPES[0];

          return (
            <div
              className="absolute z-30 flex flex-col gap-2 p-3 bg-slate-900/95 border border-sky-500 rounded-xl shadow-2xl backdrop-blur-md min-w-[280px] max-w-[340px] select-none"
              style={{
                left: `${inlineEditingPin.x * zoom + pan.x + 120}px`,
                top: `${inlineEditingPin.y * zoom + pan.y + 80 - 18}px`,
                transform: 'translate(-50%, -100%)',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-800"
                    style={{ backgroundColor: inlineTypeDef.color }}
                  />
                  <span className="text-[11px] font-bold text-sky-300 font-mono">
                    Pin {inlinePinIndex + 1}/{pins.length}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({inlineEditingPin.id})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => commitAndNavigateInlineEdit('prev')}
                    disabled={inlinePinIndex <= 0}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-25 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Pin Sebelumnya (Shift + Tab)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => commitAndNavigateInlineEdit('next')}
                    disabled={inlinePinIndex >= pins.length - 1}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-25 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Pin Berikutnya (Tab / Enter)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => commitAndNavigateInlineEdit('close')}
                    className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 ml-1 transition-colors cursor-pointer"
                    title="Selesai / Tutup (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Input field with Auto-Complete */}
              <div className="flex items-center gap-1.5">
                <input
                  ref={inlineInputRef}
                  type="text"
                  list="pin-name-suggestions"
                  value={inlinePinName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInlinePinName(val);
                    const profile = inferPinProfile(val);
                    const shouldSyncDesc =
                      !inlinePinDescription ||
                      inlinePinDescription === inlineProfile.description ||
                      /^Pin\s*\d+$/i.test(inlinePinDescription) ||
                      inlinePinDescription.startsWith('Terminal Pin ');
                    const nextDesc = shouldSyncDesc ? profile.description : inlinePinDescription;
                    if (shouldSyncDesc) {
                      setInlinePinDescription(profile.description);
                    }
                    applyPinNameChange(inlineEditingPin.id, val, undefined, nextDesc);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      commitAndNavigateInlineEdit(e.shiftKey ? 'prev' : 'next');
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      commitAndNavigateInlineEdit(
                        inlinePinIndex < pins.length - 1 ? 'next' : 'close'
                      );
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      commitAndNavigateInlineEdit('close');
                    }
                  }}
                  placeholder="Label Pin (cth: VIN, GND, D2...)"
                  className="flex-1 bg-slate-950 border border-sky-500/70 focus:border-sky-400 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-sky-400 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() =>
                    commitAndNavigateInlineEdit(
                      inlinePinIndex < pins.length - 1 ? 'next' : 'close'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow"
                  title={
                    inlinePinIndex < pins.length - 1
                      ? 'Simpan & Lanjut ke Pin Berikutnya (Enter / Tab)'
                      : 'Simpan & Selesai (Enter)'
                  }
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Live Pin Type Dropdown & Editable Tooltip Description */}
              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-400 shrink-0 font-medium">Tipe Pin:</span>
                  <select
                    value={inlineEditingPin.type}
                    onChange={(e) => {
                      const newType = e.target.value as PinType;
                      applyPinNameChange(
                        inlineEditingPin.id,
                        inlinePinName,
                        newType,
                        inlinePinDescription
                      );
                    }}
                    className="bg-slate-950 border border-slate-700/80 rounded px-2 py-0.5 text-[10px] text-slate-200 focus:border-sky-400 focus:outline-none cursor-pointer flex-1"
                  >
                    {PIN_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tooltip Description Input */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">Deskripsi Tooltip:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const profile = inferPinProfile(inlinePinName);
                        setInlinePinDescription(profile.description);
                        applyPinNameChange(
                          inlineEditingPin.id,
                          inlinePinName,
                          undefined,
                          profile.description
                        );
                      }}
                      className="text-[9px] text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline cursor-pointer"
                      title="Auto isi deskripsi dari nama pin"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    value={inlinePinDescription}
                    onChange={(e) => {
                      setInlinePinDescription(e.target.value);
                      applyPinNameChange(
                        inlineEditingPin.id,
                        inlinePinName,
                        undefined,
                        e.target.value
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitAndNavigateInlineEdit(
                          inlinePinIndex < pins.length - 1 ? 'next' : 'close'
                        );
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        commitAndNavigateInlineEdit('close');
                      }
                    }}
                    placeholder="Deskripsi tooltip (cth: Ground / Power 5V)..."
                    className="w-full bg-slate-950 border border-slate-700/80 focus:border-sky-400 rounded px-2 py-0.5 text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* Shortcut Tips Footer */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 font-mono">
                <span>
                  <kbd className="bg-slate-800 px-1 py-0.2 rounded text-slate-300 border border-slate-700">
                    Tab
                  </kbd>{' '}
                  /{' '}
                  <kbd className="bg-slate-800 px-1 py-0.2 rounded text-slate-300 border border-slate-700">
                    ↵
                  </kbd>{' '}
                  Lanjut
                </span>
                <span>
                  <kbd className="bg-slate-800 px-1 py-0.2 rounded text-slate-300 border border-slate-700">
                    Shift+Tab
                  </kbd>{' '}
                  Balik
                </span>
                <span>
                  <kbd className="bg-slate-800 px-1 py-0.2 rounded text-slate-300 border border-slate-700">
                    Esc
                  </kbd>{' '}
                  Tutup
                </span>
              </div>

              {/* Downward pointing arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-sky-500 rotate-45" />
            </div>
          );
        })()}

        {/* Instructions badge */}
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-2 pointer-events-none shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          <span>
            <b>Mode Pintar:</b> Tarik <b>Pin</b> / <b>Gambar</b> •{' '}
            <b>
              Double-Click Pin /{' '}
              <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-sky-600 dark:text-sky-300 font-bold">
                ↵
              </kbd>
            </b>{' '}
            Edit Cepat di Canvas •{' '}
            <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-emerald-600 dark:text-emerald-300 font-bold">
              Alt
            </kbd>{' '}
            Geser Mulus •{' '}
            <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-purple-600 dark:text-purple-300 font-bold">
              Shift
            </kbd>{' '}
            Geser Semua •{' '}
            <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono text-sky-600 dark:text-sky-300 font-bold">
              R
            </kbd>{' '}
            Putar 90°
          </span>
        </div>
      </div>
    </div>
  );
};
