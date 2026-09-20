import React from 'react';
import { CircuitComponent, Pin, Wire, WirePoint } from '../../types/circuit';
import { Zap } from 'lucide-react';
import { BusConnectionOption } from '../../utils/autoBusRouter';

interface CanvasFloatingTooltipsProps {
  hoveredPinInfo: {
    component: CircuitComponent;
    pin: Pin;
    screenX: number;
    screenY: number;
  } | null;
  hoveredWireSnap: {
    wire: Wire;
    point: WirePoint;
    screenX: number;
    screenY: number;
  } | null;
  drawingWire: {
    fromPin?: Pin;
    fromComponentId?: string;
    fromWireId?: string;
  } | null;
  draggingEndpoint: {
    wireId: string;
    endpoint: 'start' | 'end';
    currentPoint: WirePoint;
  } | null;
  detectedBusOptions: BusConnectionOption[];
  onCancelDrawing: () => void;
  onCancelEndpointDrag: () => void;
  onConnectBus: (bus: BusConnectionOption) => void;
}

/**
 * Isolated overlay container for all floating tooltips, active wire drawing banners,
 * and quick auto-wiring recommendations.
 */
export const CanvasFloatingTooltips: React.FC<CanvasFloatingTooltipsProps> = ({
  hoveredPinInfo,
  hoveredWireSnap,
  drawingWire,
  draggingEndpoint,
  detectedBusOptions,
  onCancelDrawing,
  onCancelEndpointDrag,
  onConnectBus,
}) => {
  return (
    <>
      {/* 1. Floating Pin Tooltip */}
      {hoveredPinInfo && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-6"
          style={{
            left: hoveredPinInfo.screenX,
            top: hoveredPinInfo.screenY - 16,
          }}
        >
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">
              {hoveredPinInfo.pin.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                hoveredPinInfo.pin.type === 'power'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : hoveredPinInfo.pin.type === 'ground'
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                  : hoveredPinInfo.pin.type === 'i2c'
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                  : hoveredPinInfo.pin.type === 'pwm'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {hoveredPinInfo.pin.type}
            </span>
          </div>
          {hoveredPinInfo.pin.description && (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 max-w-xs">
              {hoveredPinInfo.pin.description}
            </div>
          )}
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {drawingWire || draggingEndpoint
              ? '✓ Lepas / Klik untuk menyambungkan'
              : 'Klik pin untuk mulai pasang kabel'}
          </div>
        </div>
      )}

      {/* 2. Floating Wire Snap Tooltip (Elevated, Compact Pill Design) */}
      {hoveredWireSnap && !hoveredPinInfo && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 border border-sky-500/50 shadow-lg backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-6 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: hoveredWireSnap.screenX,
            top: hoveredWireSnap.screenY - 16,
          }}
        >
          <span className="w-2 h-2 rounded-full bg-sky-500 inline-block shadow-sm animate-pulse shrink-0"></span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-[11px] font-mono whitespace-nowrap">
            Cabang Kabel
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 whitespace-nowrap">
            (Klik / Lepas untuk sambung)
          </span>
        </div>
      )}

      {/* 3. Wire Drawing Help Banner */}
      {drawingWire && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-sky-500/40 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-ping" />
          <div className="text-xs flex items-center gap-1.5 flex-wrap">
            <span>{drawingWire.fromPin ? 'Menghubungkan pin' : 'Menghubungkan cabang kabel'}</span>
            {drawingWire.fromPin && (
              <span className="text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                {drawingWire.fromPin.name}
              </span>
            )}
            {hoveredPinInfo ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {hoveredPinInfo.component.label || hoveredPinInfo.component.name}.{hoveredPinInfo.pin.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Klik untuk menyambungkan)</span>
              </>
            ) : hoveredWireSnap ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                  Cabang Kabel (T-Junction)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Klik untuk menyambungkan)</span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                (Klik pin tujuan atau kabel lain untuk menyambungkan, atau klik kanvas untuk belokan)
              </span>
            )}
          </div>
          <button
            onClick={onCancelDrawing}
            className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            Batal (Esc)
          </button>
        </div>
      )}

      {/* 4. Endpoint Dragging Help Banner */}
      {draggingEndpoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-sky-500/40 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-ping" />
          <div className="text-xs flex items-center gap-1.5 flex-wrap">
            <span>Memindahkan titik sambungan</span>
            {hoveredPinInfo ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {hoveredPinInfo.component.label || hoveredPinInfo.component.name}.{hoveredPinInfo.pin.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Lepas mouse untuk sambung)</span>
              </>
            ) : hoveredWireSnap ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                  Cabang Kabel
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Lepas mouse untuk sambung)</span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                (Arahkan ke pin/kabel lain, atau lepas di kanvas kosong untuk batal)
              </span>
            )}
          </div>
          <button
            onClick={onCancelEndpointDrag}
            className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            Batal (Esc)
          </button>
        </div>
      )}

      {/* 5. Smart Auto-Wiring Floating Quick Banner when 2 compatible components are selected */}
      {!drawingWire && !draggingEndpoint && detectedBusOptions.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-sky-500/40 text-slate-800 dark:text-slate-200 px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fade-in ring-4 ring-sky-500/10">
          <Zap className="w-4 h-4 text-sky-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto-Wiring:</span>
          <div className="flex items-center gap-1.5">
            {detectedBusOptions.map((bus) => (
              <button
                key={bus.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectBus(bus);
                }}
                className="text-xs font-semibold bg-sky-500 hover:bg-sky-600 active:scale-95 text-white px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title={bus.description}
              >
                <span>⚡ {bus.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
