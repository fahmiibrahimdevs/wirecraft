import React from 'react';
import { CircuitComponent, Wire, WireRouting, WireMarkerPosition } from '../../types/circuit';
import { COMPONENT_DEFINITIONS, WIRE_COLORS } from '../../constants/components';
import { getAllComponentDefinitions } from '../../utils/customComponents';
import { formatResistance, getResistor5BandColors, getCleanPinName } from '../../utils/geometry';
import { detectAvailableBusConnections, generateBusWires } from '../../utils/autoBusRouter';
import {
  RotateCw,
  Trash2,
  Sliders,
  SlidersHorizontal,
  Info,
  Layers,
  Sparkles,
  Link,
  Copy,
  Lock,
  Unlock,
  Maximize2,
  Cpu,
  Zap,
  Tag,
  Table,
} from 'lucide-react';

interface PropertiesInspectorProps {
  selectedComponent: CircuitComponent | null;
  selectedComponentIds?: string[];
  selectedWire: Wire | null;
  allComponents: CircuitComponent[];
  allWires: Wire[];
  snapGrid: boolean;
  onToggleSnapGrid: () => void;
  onCenterCanvas?: () => void;
  onOpenWiringTable?: () => void;
  onUpdateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onToggleLock?: (ids: string[]) => void;
  onRotateComponents?: (ids: string[]) => void;
  onDuplicateComponents?: (ids: string[]) => void;
  onDeleteComponents?: (ids: string[]) => void;
  onUpdateWire: (id: string, updates: Partial<Wire>) => void;
  onAddMultipleWires?: (wires: Omit<Wire, 'id'>[]) => void;
  onDeleteWire: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

const RESISTANCE_PRESETS = [100, 220, 330, 470, 1000, 2200, 4700, 10000, 100000, 1000000];

// Sub-component for editing 5-Band Metal Film Resistor with interactive D1 digit control
const ResistorPropertyEditor: React.FC<{
  component: CircuitComponent;
  onUpdate: (updates: Partial<CircuitComponent>) => void;
}> = ({ component, onUpdate }) => {
  const currentOhms = component.customProps.resistance ?? 220;
  const [textVal, setTextVal] = React.useState(String(currentOhms));

  React.useEffect(() => {
    setTextVal(String(component.customProps.resistance ?? 220));
  }, [component.id, component.customProps.resistance]);

  const [b1, b2, b3, b4, b5] = getResistor5BandColors(currentOhms);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTextVal(v);
    const num = Number(v);
    if (!isNaN(num) && num > 0) {
      onUpdate({
        customProps: {
          ...component.customProps,
          resistance: num,
        },
      });
    }
  };

  const handleInputBlur = () => {
    const num = Number(textVal);
    if (isNaN(num) || num <= 0) {
      setTextVal(String(currentOhms));
    }
  };

  const setD1 = (digit: number) => {
    // Replace 1st digit of current value while preserving the rest of digits
    const str = String(currentOhms);
    const newStr = String(digit) + (str.length > 1 ? str.slice(1) : '0');
    const num = Number(newStr);
    setTextVal(newStr);
    onUpdate({
      customProps: {
        ...component.customProps,
        resistance: num,
      },
    });
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">Resistor Metal Film (5-Gelang)</span>
        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
          Biru • 1%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max="10000000"
          value={textVal}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="Nilai ohm..."
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono outline-none focus:border-sky-500/80"
        />
        <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
          {formatResistance(currentOhms)}
        </span>
      </div>

      {/* Dynamic 5-Band Color Code Preview */}
      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1.5">
        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400"></span>
            <span>Kode Warna 5-Gelang:</span>
          </span>
          <span className="font-mono text-slate-400 dark:text-slate-500 text-[9px]">IEC 60062</span>
        </div>
        <div className="grid grid-cols-5 gap-1 pt-1 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b1 }} />
            <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">D1</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b2 }} />
            <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">D2</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b3 }} />
            <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">D3</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b4 }} />
            <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">x10ⁿ</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b5 }} />
            <span className="text-[9px] text-amber-600 dark:text-amber-500 font-mono font-semibold">1%</span>
          </div>
        </div>
      </div>

      {/* Quick Digit D1 Selector */}
      <div className="space-y-1">
        <div className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center justify-between font-medium">
          <span>Ubah Digit 1 (D1):</span>
          <span className="text-[9px] font-mono text-sky-600 dark:text-sky-400">Pilih Angka Depan</span>
        </div>
        <div className="grid grid-cols-9 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => setD1(digit)}
              className="py-1 rounded text-center text-xs font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-500/50 cursor-pointer transition-colors shadow-xs"
            >
              {digit}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Preset Standar:</div>
      <div className="flex flex-wrap gap-1.5">
        {[100, 220, 330, 470, 1000, 2200, 4700, 10000, 100000, 1000000].map((val) => (
          <button
            key={val}
            onClick={() => {
              setTextVal(String(val));
              onUpdate({
                customProps: { ...component.customProps, resistance: val },
              });
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
              currentOhms === val
                ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-500/40 font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {formatResistance(val)}
          </button>
        ))}
      </div>
    </div>
  );
};

export const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({
  selectedComponent,
  selectedComponentIds = [],
  selectedWire,
  allComponents,
  allWires,
  snapGrid,
  onToggleSnapGrid,
  onCenterCanvas,
  onOpenWiringTable,
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onToggleLock,
  onRotateComponents,
  onDuplicateComponents,
  onDeleteComponents,
  onUpdateWire,
  onAddMultipleWires,
  onDeleteWire,
  isOpen,
}) => {
  if (!isOpen) return null;

  // 1. If MULTIPLE Components are Selected
  if (selectedComponentIds.length > 1) {
    const selectedComps = allComponents.filter((c) => selectedComponentIds.includes(c.id));
    const allLocked = selectedComps.length > 0 && selectedComps.every((c) => c.locked);

    const allDefs = getAllComponentDefinitions();
    const isPair = selectedComps.length === 2;
    const detectedBuses = isPair && selectedComps[0] && selectedComps[1]
      ? detectAvailableBusConnections(selectedComps[0], selectedComps[1], allDefs, allWires)
      : [];

    return (
      <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-fade-in transition-colors duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Multi-Selection</h3>
          </div>
          <div className="flex items-center gap-1">
            {onToggleLock && (
              <button
                onClick={() => onToggleLock(selectedComponentIds)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  allLocked
                    ? 'text-amber-500 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10'
                }`}
                title={allLocked ? 'Buka Kunci Semua (L)' : 'Kunci Semua (L)'}
              >
                {allLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            )}
            {onDuplicateComponents && (
              <button
                onClick={() => onDuplicateComponents(selectedComponentIds)}
                className="text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 p-1.5 rounded-lg hover:bg-sky-500/10 transition-colors cursor-pointer"
                title="Duplikat Semua (Ctrl+D)"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            {onDeleteComponents && (
              <button
                onClick={() => onDeleteComponents(selectedComponentIds)}
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Hapus Semua Terpilih (Delete)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-semibold text-sky-600 dark:text-sky-300">
              {selectedComponentIds.length} Komponen Terpilih
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Anda dapat menggeser, menduplikasi, mengunci, atau memutar grup komponen ini secara serentak.
            </div>
          </div>

          {/* Smart Bus Auto-Wiring Section (Active when 2 compatible components are selected) */}
          {detectedBuses.length > 0 && (
            <div className="bg-gradient-to-b from-sky-500/10 to-transparent dark:from-sky-500/15 border border-sky-500/30 rounded-xl p-3.5 space-y-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                <Zap className="w-4 h-4 text-sky-500 animate-pulse" />
                <span>Koneksi Bus Cerdas (Auto-Wiring)</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                Terdeteksi antarmuka yang kompatibel antara <b>{selectedComps[0]?.label}</b> dan <b>{selectedComps[1]?.label}</b>:
              </div>

              <div className="space-y-2.5">
                {detectedBuses.map((bus) => (
                  <div
                    key={bus.id}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {bus.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border ${bus.badgeColor}`}>
                        {bus.busType.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {bus.description}
                    </div>

                    {/* Signal badges list */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {bus.connections.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                          <span>{c.signalName}</span>
                        </span>
                      ))}
                    </div>

                    {/* Connect button */}
                    <button
                      onClick={() => {
                        const newWires = generateBusWires(bus, allWires, 'orthogonal');
                        if (onAddMultipleWires) onAddMultipleWires(newWires);
                      }}
                      className="w-full mt-1.5 py-1.5 px-3 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white rounded-md text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
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
                <button
                  onClick={() => onToggleLock(selectedComponentIds)}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  {allLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span>Buka Kunci</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span>Kunci (L)</span>
                    </>
                  )}
                </button>
              )}
              {onRotateComponents && (
                <button
                  onClick={() => onRotateComponents(selectedComponentIds)}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 text-slate-700 dark:text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span>Putar (R)</span>
                </button>
              )}
              {onDuplicateComponents && (
                <button
                  onClick={() => onDuplicateComponents(selectedComponentIds)}
                  className="col-span-2 flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-slate-700 dark:text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                  <span>Duplikat Semua ({selectedComponentIds.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 2. If Single Component is Selected
  if (selectedComponent) {
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
              <button
                onClick={() => onToggleLock([selectedComponent.id])}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  selectedComponent.locked
                    ? 'text-amber-500 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10'
                }`}
                title={selectedComponent.locked ? 'Buka Kunci Posisi (L)' : 'Kunci Posisi (L)'}
              >
                {selectedComponent.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            )}
            {onDuplicateComponent && (
              <button
                onClick={() => onDuplicateComponent(selectedComponent.id)}
                className="text-slate-400 hover:text-sky-400 p-1.5 rounded-lg hover:bg-sky-500/10 transition-colors cursor-pointer"
                title="Duplikat Komponen (Ctrl+D)"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDeleteComponent(selectedComponent.id)}
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Hapus Komponen (Delete)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Component Info Card */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{def?.name || selectedComponent.name}</div>
              {selectedComponent.locked && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-semibold">
                  <Lock className="w-2.5 h-2.5" /> Terkunci
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{def?.description}</div>

            {/* Label Input */}
            <div className="mt-3">
              <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Label Identitas:</label>
              <input
                type="text"
                value={selectedComponent.label}
                onChange={(e) => onUpdateComponent(selectedComponent.id, { label: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-sky-500/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono outline-none"
              />
            </div>
          </div>

          {/* Actions: Duplicate, Rotation, Lock */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-xs">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Aksi Komponen</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 text-xs font-bold">{selectedComponent.rotation}°</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRotate}
                className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-slate-700 dark:text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs"
                title="Putar Komponen 90° (R / Space)"
              >
                <RotateCw className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                <span>Putar 90°</span>
              </button>
              {onToggleLock && (
                <button
                  onClick={() => onToggleLock([selectedComponent.id])}
                  className={`flex items-center justify-center gap-1.5 border py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs ${
                    selectedComponent.locked
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-amber-500/40 text-slate-700 dark:text-slate-200'
                  }`}
                  title="Kunci Posisi (L)"
                >
                  {selectedComponent.locked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span>Buka Kunci</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span>Kunci (L)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Component Specific Config: 5-Band Metal Film Resistor */}
          {selectedComponent.type === 'resistor' && (
            <ResistorPropertyEditor
              component={selectedComponent}
              onUpdate={(updates) => onUpdateComponent(selectedComponent.id, updates)}
            />
          )}

          {selectedComponent.type === 'led' && (
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Warna LED</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['red', 'green', 'blue', 'yellow', 'amber', 'white'] as const).map((color) => (
                  <button
                    key={color}
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        customProps: { ...selectedComponent.customProps, ledColor: color },
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg text-xs capitalize border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      selectedComponent.customProps.ledColor === color
                        ? 'bg-white dark:bg-slate-800 border-sky-500 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/30 font-semibold shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          color === 'amber'
                            ? '#f97316'
                            : color === 'white'
                            ? '#f8fafc'
                            : color,
                      }}
                    />
                    {color}
                  </button>
                ))}
              </div>

              {/* Live LED Test State */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300">Status Nyala (Test)</span>
                <button
                  onClick={() =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        isLedOn: !selectedComponent.customProps.isLedOn,
                      },
                    })
                  }
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    selectedComponent.customProps.isLedOn
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {selectedComponent.customProps.isLedOn ? 'Menyala (ON)' : 'Mati (OFF)'}
                </button>
              </div>
            </div>
          )}

          {selectedComponent.type === 'steker-switch' && (
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">Steker Saklar Arde</span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  Broco AC 220V
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600 dark:text-slate-400">Saklar & Indikator Neon</span>
                <button
                  onClick={() =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        isSwitchedOn: selectedComponent.customProps.isSwitchedOn === false ? true : false,
                      },
                    })
                  }
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    selectedComponent.customProps.isSwitchedOn !== false
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {selectedComponent.customProps.isSwitchedOn !== false ? 'Saklar ON (Menyala)' : 'Saklar OFF (Mati)'}
                </button>
              </div>
            </div>
          )}

          {selectedComponent.type === 'fitting-lamp' && (
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">Fitting Lampu E27</span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  Bohlam LED
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600 dark:text-slate-400">Status Bohlam</span>
                <button
                  onClick={() =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        isLedOn: selectedComponent.customProps.isLedOn === false ? true : false,
                      },
                    })
                  }
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    selectedComponent.customProps.isLedOn !== false
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {selectedComponent.customProps.isLedOn !== false ? 'Bohlam ON (Menyala)' : 'Bohlam OFF (Mati)'}
                </button>
              </div>
            </div>
          )}

          {(selectedComponent.type === 'push-button' ||
            selectedComponent.type === 'push-button-6mm' ||
            selectedComponent.type === 'push-button-12mm') && (
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                  {selectedComponent.type === 'push-button-12mm'
                    ? 'Push Button 12mm (Big Tactile)'
                    : 'Push Button 6mm (Mini Tactile)'}
                </span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  SPST 4-Pin
                </span>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Warna Cap Tombol</div>
              <div className="grid grid-cols-5 gap-1.5">
                {(['green', 'red', 'blue', 'yellow', 'black'] as const).map((color) => {
                  const colorHexes: Record<string, string> = {
                    green: '#22c55e',
                    red: '#ef4444',
                    blue: '#3b82f6',
                    yellow: '#eab308',
                    black: '#1e293b',
                  };
                  const currentColor = selectedComponent.customProps.buttonColor || 'green';
                  return (
                    <button
                      key={color}
                      onClick={() =>
                        onUpdateComponent(selectedComponent.id, {
                          customProps: {
                            ...selectedComponent.customProps,
                            buttonColor: color,
                          },
                        })
                      }
                      className={`py-1.5 rounded-lg text-xs capitalize border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        currentColor === color
                          ? 'bg-white dark:bg-slate-800 border-sky-500 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/30 font-semibold shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-700"
                        style={{ backgroundColor: colorHexes[color] }}
                      />
                      <span className="text-[9px]">{color}</span>
                    </button>
                  );
                })}
              </div>

              {/* Push Button Interactive Press State */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300">Status Tombol</span>
                <button
                  onClick={() =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        buttonPressed: !selectedComponent.customProps.buttonPressed,
                      },
                    })
                  }
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    selectedComponent.customProps.buttonPressed
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {selectedComponent.customProps.buttonPressed ? 'Ditekan (PRESSED)' : 'Dilepas (RELEASED)'}
                </button>
              </div>
            </div>
          )}

          {selectedComponent.type === 'potentiometer' && (
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Nilai Posisi Knob:</span>
                <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{selectedComponent.customProps.potValue ?? 50}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedComponent.customProps.potValue ?? 50}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    customProps: {
                      ...selectedComponent.customProps,
                      potValue: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          )}

          {(selectedComponent.type === 'display-lcd1602' || selectedComponent.type === 'display-lcd1602-i2c') && (
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Teks Layar LCD (16x2)</div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 1 (Maks 16 char):</label>
                <input
                  type="text"
                  maxLength={16}
                  value={selectedComponent.customProps.lcdTextRow1 || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        lcdTextRow1: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 2 (Maks 16 char):</label>
                <input
                  type="text"
                  maxLength={16}
                  value={selectedComponent.customProps.lcdTextRow2 || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        lcdTextRow2: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80"
                />
              </div>
            </div>
          )}

          {(selectedComponent.type === 'display-lcd2004' || selectedComponent.type === 'display-lcd2004-i2c') && (
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Teks Layar LCD (20x4)</div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 1 (Maks 20 char):</label>
                <input
                  type="text"
                  maxLength={20}
                  value={selectedComponent.customProps.lcdTextRow1 || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        lcdTextRow1: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 2 (Maks 20 char):</label>
                <input
                  type="text"
                  maxLength={20}
                  value={selectedComponent.customProps.lcdTextRow2 || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        lcdTextRow2: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 3 (Maks 20 char):</label>
                <input
                  type="text"
                  maxLength={20}
                  value={selectedComponent.customProps.lcdTextRow3 || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        lcdTextRow3: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1 font-medium">Baris 4 (Maks 20 char):</label>
                <input
                  type="text"
                  maxLength={20}
                  value={selectedComponent.customProps.lcdTextRow4 || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      customProps: {
                        ...selectedComponent.customProps,
                        lcdTextRow4: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300 font-mono outline-none focus:border-sky-500/80"
                />
              </div>
            </div>
          )}

          {/* Connected Wires Summary */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                Koneksi Kabel ({compWires.length})
              </span>
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
                    <div
                      key={w.id}
                      className="flex items-center justify-between bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
                        <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{myPinId}</span>
                        <span className="text-slate-400 dark:text-slate-500">→</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">
                          {otherComp?.label || otherCompId}.{otherPinId}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteWire(w.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 cursor-pointer transition-colors"
                        title="Putus Kabel"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // 2. If Wire is Selected
  if (selectedWire) {
    const fromComp = allComponents.find((c) => c.id === selectedWire.fromComponentId);
    const toComp = allComponents.find((c) => c.id === selectedWire.toComponentId);

    return (
      <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-fade-in transition-colors duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Kabel Jumper</h3>
          </div>
          <button
            onClick={() => onDeleteWire(selectedWire.id)}
            className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Hapus Kabel (Delete)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Connection Overview */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="text-xs text-slate-600 dark:text-slate-400">Jalur Sambungan:</div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                {fromComp?.label || 'Comp'}:{selectedWire.fromPinId || 'Pin'}
              </span>
              <span className="text-slate-400 dark:text-slate-500">⇄</span>
              <span className="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                {toComp?.label || 'Comp'}:{selectedWire.toPinId || 'Pin'}
              </span>
            </div>
          </div>

          {/* Wire / Net Marking Tube Config & Label */}
          {(() => {
            const allDefs = getAllComponentDefinitions();
            const fromDef = fromComp ? (allDefs[fromComp.type] || COMPONENT_DEFINITIONS[fromComp.type]) : undefined;
            const toDef = toComp ? (allDefs[toComp.type] || COMPONENT_DEFINITIONS[toComp.type]) : undefined;
            const fromPin = fromDef && selectedWire.fromPinId ? fromDef.pins.find((p) => p.id === selectedWire.fromPinId) : undefined;
            const toPin = toDef && selectedWire.toPinId ? toDef.pins.find((p) => p.id === selectedWire.toPinId) : undefined;
            const autoFrom = getCleanPinName(fromPin?.name, selectedWire.fromPinId);
            const autoTo = getCleanPinName(toPin?.name, selectedWire.toPinId);
            const defaultAutoLabel = autoFrom || autoTo || 'WIRE';

            const currentPos: WireMarkerPosition = selectedWire.markerPosition || (selectedWire.label !== undefined ? (selectedWire.label ? 'both' : 'none') : 'auto');
            const hasCustomConfig = selectedWire.label !== undefined || selectedWire.markerPosition !== undefined;

            const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              if (val.trim() === '') {
                // Auto-delete / hide marking tube when text is cleared!
                onUpdateWire(selectedWire.id, { label: '', markerPosition: 'none' });
              } else {
                onUpdateWire(selectedWire.id, {
                  label: val.toUpperCase(),
                  markerPosition: selectedWire.markerPosition === 'none' ? 'auto' : selectedWire.markerPosition,
                });
              }
            };

            const handlePosSelect = (pos: WireMarkerPosition) => {
              if (pos === 'none') {
                onUpdateWire(selectedWire.id, { markerPosition: 'none', label: '' });
              } else if (pos === 'auto') {
                onUpdateWire(selectedWire.id, { markerPosition: 'auto', label: undefined });
              } else {
                onUpdateWire(selectedWire.id, {
                  markerPosition: pos,
                  label: selectedWire.label === '' ? undefined : selectedWire.label,
                });
              }
            };

            const quickSuggestions = Array.from(new Set([autoFrom, autoTo, 'GND', '5V', '3.3V', 'VIN'])).filter(Boolean);

            return (
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <Tag className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                    <span>Marking Tube (Penanda Kabel)</span>
                  </div>
                  {hasCustomConfig && (
                    <button
                      onClick={() => onUpdateWire(selectedWire.id, { label: undefined, markerPosition: undefined })}
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer font-medium"
                      title="Kembalikan ke mode otomatis bawaan"
                    >
                      Reset Otomatis
                    </button>
                  )}
                </div>

                {/* Position Selector */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Posisi Penanda:</div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {[
                      { key: 'auto', label: '⚡ Auto' },
                      { key: 'start', label: '📍 Awal' },
                      { key: 'end', label: '📍 Akhir' },
                      { key: 'both', label: '⇄ Keduanya' },
                      { key: 'center', label: '• Tengah' },
                      { key: 'none', label: '🚫 Mati / Polos' },
                    ].map((p) => (
                      <button
                        key={p.key}
                        onClick={() => handlePosSelect(p.key as WireMarkerPosition)}
                        className={`py-1 px-1.5 rounded-md border text-center transition-all cursor-pointer font-medium ${
                          currentPos === p.key
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/40 font-semibold shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Label Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <span>Teks Label:</span>
                    {selectedWire.label === '' && (
                      <span className="text-[10px] text-rose-500 font-mono font-medium">(Dihapus / Nonaktif)</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={selectedWire.label ?? ''}
                    onChange={handleTextChange}
                    placeholder={currentPos === 'none' ? 'Kabel polos (ketik untuk aktifkan)' : `Otomatis: ${defaultAutoLabel}`}
                    maxLength={12}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono uppercase outline-none focus:border-sky-500/80 shadow-xs"
                  />
                </div>

                {/* Quick Recommendation Chips */}
                {quickSuggestions.length > 0 && currentPos !== 'none' && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Rekomendasi Cepat:</div>
                    <div className="flex flex-wrap gap-1">
                      {quickSuggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            onUpdateWire(selectedWire.id, {
                              label: s,
                              markerPosition: selectedWire.markerPosition === 'none' ? 'auto' : selectedWire.markerPosition,
                            })
                          }
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer transition-colors"
                        >
                          +{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  💡 Kosongkan teks atau pilih <b>Mati / Polos</b> untuk langsung menghapus penanda kabel.
                </div>
              </div>
            );
          })()}

          {/* Color Selector */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Warna Kabel</div>
            <div className="grid grid-cols-3 gap-1.5">
              {WIRE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onUpdateWire(selectedWire.id, { color: c.value })}
                  className={`p-2 rounded-lg border flex items-center gap-2 text-[11px] cursor-pointer transition-all ${
                    selectedWire.color === c.value
                      ? 'bg-white dark:bg-slate-800 border-sky-500 text-slate-900 dark:text-slate-100 ring-1 ring-sky-500/30'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/20" style={{ backgroundColor: c.value }} />
                  <span className="truncate">{c.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Routing Style Selector */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Gaya Lengkungan Jalur</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['bezier', 'orthogonal', 'straight'] as WireRouting[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onUpdateWire(selectedWire.id, { routing: r })}
                  className={`py-2 px-1 text-center rounded-lg border text-xs capitalize cursor-pointer transition-all ${
                    selectedWire.routing === r
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/40 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {r === 'bezier' ? 'Kurva' : r === 'orthogonal' ? 'Siku 90°' : 'Lurus'}
                </button>
              ))}
            </div>
          </div>

          {/* Delete Action Button */}
          <button
            onClick={() => onDeleteWire(selectedWire.id)}
            className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Putuskan & Hapus Kabel
          </button>
        </div>
      </aside>
    );
  }

  // 3. Default Summary Panel when nothing is selected
  return (
    <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl transition-colors duration-200">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">Ringkasan Sirkuit</h3>
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
            <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
              {allComponents.length}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Kabel Jumper</span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {allWires.length}
            </div>
          </div>
        </div>

        {/* Hardware Wiring Table Button */}
        {onOpenWiringTable && (
          <button
            onClick={onOpenWiringTable}
            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 hover:from-sky-500/20 hover:via-indigo-500/20 hover:to-emerald-500/20 border border-sky-500/30 dark:border-sky-500/40 rounded-xl text-left transition-all shadow-sm cursor-pointer group hover:border-sky-400"
            title="Buka Pemetaan Pin & Tabel Wiring Hardware"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-sky-500/30">
                <Table className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  Tabel Wiring Hardware
                  <span className="text-[9px] bg-sky-500 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                    Baru
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
                  Mapping pin MCU, level shifter & CSV
                </div>
              </div>
            </div>
            <span className="text-xs text-sky-600 dark:text-sky-400 font-bold group-hover:translate-x-1 transition-transform shrink-0 ml-2">
              &rarr;
            </span>
          </button>
        )}

        {/* Action: Center Canvas View */}
        {onCenterCanvas && (
          <button
            onClick={onCenterCanvas}
            className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 text-slate-700 dark:text-slate-200 py-2.5 px-3 rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer group"
            title="Pusatkan pandangan ke seluruh komponen (Fit to Screen)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="whitespace-nowrap">Pusatkan Semua Komponen (Fit View)</span>
          </button>
        )}

        {/* Canvas Options */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Pengaturan Kanvas</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">Snap to Grid (10px)</span>
            <button
              onClick={onToggleSnapGrid}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                snapGrid ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-800'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  snapGrid ? 'left-5' : 'left-1'
                }`}
              />
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
            <li>
              <strong className="text-slate-700 dark:text-slate-300">Pan Kanvas:</strong> Klik kiri & tahan drag pada background kosong.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-300">Seleksi Banyak:</strong> Tahan <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded text-[10px] text-slate-700 dark:text-slate-300 font-mono">Ctrl</kbd> / <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded text-[10px] text-slate-700 dark:text-slate-300 font-mono">Shift</kbd> + klik drag kanvas.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-300">Kabel:</strong> Klik pin awal $\rightarrow$ tarik $\rightarrow$ klik pin tujuan.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-300">Geser Komponen:</strong> Klik tahan dan geser komponen di kanvas.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-300">Zoom:</strong> Putar scroll wheel mouse ke atas/bawah.
            </li>
            <li>
              <strong className="text-slate-700 dark:text-slate-300">Menu & Kunci:</strong> Klik kanan komponen untuk kunci (L), duplikat, dll.
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
};
