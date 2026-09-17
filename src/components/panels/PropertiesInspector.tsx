import React from 'react';
import { CircuitComponent, Wire, WireRouting } from '../../types/circuit';
import { COMPONENT_DEFINITIONS, WIRE_COLORS } from '../../constants/components';
import { getAllComponentDefinitions } from '../../utils/customComponents';
import { formatResistance, getResistor5BandColors } from '../../utils/geometry';
import {
  RotateCw,
  Trash2,
  Sliders,
  SlidersHorizontal,
  Info,
  Layers,
  Sparkles,
  Link,
  CheckCircle2,
  Copy,
  Lock,
  Unlock,
  Maximize2,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Zap,
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
  onUpdateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onToggleLock?: (ids: string[]) => void;
  onRotateComponents?: (ids: string[]) => void;
  onDuplicateComponents?: (ids: string[]) => void;
  onDeleteComponents?: (ids: string[]) => void;
  onUpdateWire: (id: string, updates: Partial<Wire>) => void;
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
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">Resistor Metal Film (5-Gelang)</span>
        <span className="text-[10px] text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
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
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-sky-500/80"
        />
        <span className="text-xs font-mono font-bold text-sky-400">
          {formatResistance(currentOhms)}
        </span>
      </div>

      {/* Dynamic 5-Band Color Code Preview */}
      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
        <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>Kode Warna 5-Gelang:</span>
          </span>
          <span className="font-mono text-slate-500 text-[9px]">IEC 60062</span>
        </div>
        <div className="grid grid-cols-5 gap-1 pt-1 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: b1 }} />
            <span className="text-[9px] text-slate-400 font-mono">D1</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: b2 }} />
            <span className="text-[9px] text-slate-400 font-mono">D2</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: b3 }} />
            <span className="text-[9px] text-slate-400 font-mono">D3</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: b4 }} />
            <span className="text-[9px] text-slate-400 font-mono">x10ⁿ</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: b5 }} />
            <span className="text-[9px] text-amber-600 font-mono font-semibold">1%</span>
          </div>
        </div>
      </div>

      {/* Quick Digit D1 Selector */}
      <div className="space-y-1">
        <div className="text-[10px] text-slate-400 flex items-center justify-between">
          <span>Ubah Digit 1 (D1):</span>
          <span className="text-[9px] font-mono text-sky-400">Pilih Angka Depan</span>
        </div>
        <div className="grid grid-cols-9 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => setD1(digit)}
              className="py-1 rounded text-center text-xs font-mono font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-sky-400 hover:border-sky-500/50 cursor-pointer transition-colors"
            >
              {digit}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-400">Preset Standar:</div>
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
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
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
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onToggleLock,
  onRotateComponents,
  onDuplicateComponents,
  onDeleteComponents,
  onUpdateWire,
  onDeleteWire,
  isOpen,
}) => {
  if (!isOpen) return null;

  // 1. If MULTIPLE Components are Selected
  if (selectedComponentIds.length > 1) {
    const selectedComps = allComponents.filter((c) => selectedComponentIds.includes(c.id));
    const allLocked = selectedComps.length > 0 && selectedComps.every((c) => c.locked);

    return (
      <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">Multi-Selection</h3>
          </div>
          <div className="flex items-center gap-1">
            {onToggleLock && (
              <button
                onClick={() => onToggleLock(selectedComponentIds)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  allLocked
                    ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                }`}
                title={allLocked ? 'Buka Kunci Semua (L)' : 'Kunci Semua (L)'}
              >
                {allLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            )}
            {onDuplicateComponents && (
              <button
                onClick={() => onDuplicateComponents(selectedComponentIds)}
                className="text-slate-400 hover:text-sky-400 p-1.5 rounded-lg hover:bg-sky-500/10 transition-colors cursor-pointer"
                title="Duplikat Semua (Ctrl+D)"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            {onDeleteComponents && (
              <button
                onClick={() => onDeleteComponents(selectedComponentIds)}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Hapus Semua Terpilih (Delete)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-semibold text-sky-300">
              {selectedComponentIds.length} Komponen Terpilih
            </div>
            <div className="text-[11px] text-slate-400">
              Anda dapat menggeser, menduplikasi, mengunci, atau memutar grup komponen ini secara serentak.
            </div>
          </div>

          {/* Group Actions */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-medium text-slate-300">Aksi Massal (Grup)</div>
            <div className="grid grid-cols-2 gap-2">
              {onToggleLock && (
                <button
                  onClick={() => onToggleLock(selectedComponentIds)}
                  className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  {allLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Buka Kunci</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Kunci (L)</span>
                    </>
                  )}
                </button>
              )}
              {onRotateComponents && (
                <button
                  onClick={() => onRotateComponents(selectedComponentIds)}
                  className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Putar (R)</span>
                </button>
              )}
              {onDuplicateComponents && (
                <button
                  onClick={() => onDuplicateComponents(selectedComponentIds)}
                  className="col-span-2 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400 shrink-0" />
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
      <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">Properties Inspector</h3>
          </div>
          <div className="flex items-center gap-1">
            {onToggleLock && (
              <button
                onClick={() => onToggleLock([selectedComponent.id])}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  selectedComponent.locked
                    ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
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
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200">{def?.name || selectedComponent.name}</div>
              {selectedComponent.locked && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  <Lock className="w-2.5 h-2.5" /> Terkunci
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{def?.description}</div>

            {/* Label Input */}
            <div className="mt-3">
              <label className="text-[11px] text-slate-400 block mb-1">Label Identitas:</label>
              <input
                type="text"
                value={selectedComponent.label}
                onChange={(e) => onUpdateComponent(selectedComponent.id, { label: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
              />
            </div>
          </div>

          {/* Actions: Duplicate, Rotation, Lock */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Aksi Komponen</span>
              <span className="font-mono text-sky-400 text-xs">{selectedComponent.rotation}°</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRotate}
                className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-200 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                title="Putar Komponen 90° (R / Space)"
              >
                <RotateCw className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Putar 90°</span>
              </button>
              {onToggleLock && (
                <button
                  onClick={() => onToggleLock([selectedComponent.id])}
                  className={`flex items-center justify-center gap-1.5 border py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedComponent.locked
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-amber-500/40 text-slate-200'
                  }`}
                  title="Kunci Posisi (L)"
                >
                  {selectedComponent.locked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Buka Kunci</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="text-xs font-medium text-slate-300">Warna LED</div>
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
                        ? 'bg-slate-800 border-sky-500/80 text-slate-100 ring-1 ring-sky-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
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
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Status Nyala (Test)</span>
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
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {selectedComponent.customProps.isLedOn ? 'Menyala (ON)' : 'Mati (OFF)'}
                </button>
              </div>
            </div>
          )}

          {selectedComponent.type === 'steker-switch' && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Steker Saklar Arde</span>
                <span className="text-[10px] text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  Broco AC 220V
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Saklar & Indikator Neon</span>
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
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {selectedComponent.customProps.isSwitchedOn !== false ? 'Saklar ON (Menyala)' : 'Saklar OFF (Mati)'}
                </button>
              </div>
            </div>
          )}

          {selectedComponent.type === 'fitting-lamp' && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Fitting Lampu E27</span>
                <span className="text-[10px] text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  Bohlam LED
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Status Bohlam</span>
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
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
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
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  {selectedComponent.type === 'push-button-12mm'
                    ? 'Push Button 12mm (Big Tactile)'
                    : 'Push Button 6mm (Mini Tactile)'}
                </span>
                <span className="text-[10px] text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  SPST 4-Pin
                </span>
              </div>

              <div className="text-[11px] text-slate-400">Warna Cap Tombol</div>
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
                          ? 'bg-slate-800 border-sky-500/80 text-slate-100 ring-1 ring-sky-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-slate-700"
                        style={{ backgroundColor: colorHexes[color] }}
                      />
                      <span className="text-[9px]">{color}</span>
                    </button>
                  );
                })}
              </div>

              {/* Push Button Interactive Press State */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Status Tombol</span>
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
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {selectedComponent.customProps.buttonPressed ? 'Ditekan (PRESSED)' : 'Dilepas (RELEASED)'}
                </button>
              </div>
            </div>
          )}

          {selectedComponent.type === 'potentiometer' && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Nilai Posisi Knob:</span>
                <span className="font-mono text-sky-400">{selectedComponent.customProps.potValue ?? 50}%</span>
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
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>
          )}

          {(selectedComponent.type === 'display-lcd1602' || selectedComponent.type === 'display-lcd1602-i2c') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="text-xs font-medium text-slate-300">Teks Layar LCD (16x2)</div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Baris 1 (Maks 16 char):</label>
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Baris 2 (Maks 16 char):</label>
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-mono outline-none"
                />
              </div>
            </div>
          )}

          {(selectedComponent.type === 'display-lcd2004' || selectedComponent.type === 'display-lcd2004-i2c') && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="text-xs font-medium text-slate-300">Teks Layar LCD (20x4)</div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Baris 1 (Maks 20 char):</label>
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Baris 2 (Maks 20 char):</label>
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Baris 3 (Maks 20 char):</label>
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Baris 4 (Maks 20 char):</label>
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-mono outline-none"
                />
              </div>
            </div>
          )}

          {/* Connected Wires Summary */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs font-medium text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-sky-400" />
                Koneksi Kabel ({compWires.length})
              </span>
            </div>
            {compWires.length === 0 ? (
              <div className="text-[11px] text-slate-500 py-1">Belum ada kabel terhubung.</div>
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
                      className="flex items-center justify-between bg-slate-900/80 border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
                        <span className="font-mono text-sky-400">{myPinId}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-300 truncate">
                          {otherComp?.label || otherCompId}.{otherPinId}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteWire(w.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
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
      <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">Kabel Jumper</h3>
          </div>
          <button
            onClick={() => onDeleteWire(selectedWire.id)}
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Hapus Kabel (Delete)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Connection Overview */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="text-xs text-slate-400">Jalur Sambungan:</div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-sky-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                {fromComp?.label || 'Comp'}:{selectedWire.fromPinId}
              </span>
              <span className="text-slate-500">⇄</span>
              <span className="text-emerald-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                {toComp?.label || 'Comp'}:{selectedWire.toPinId}
              </span>
            </div>
          </div>

          {/* Color Selector */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-medium text-slate-300">Warna Kabel</div>
            <div className="grid grid-cols-3 gap-1.5">
              {WIRE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onUpdateWire(selectedWire.id, { color: c.value })}
                  className={`p-2 rounded-lg border flex items-center gap-2 text-[11px] cursor-pointer transition-all ${
                    selectedWire.color === c.value
                      ? 'bg-slate-800 border-sky-500/80 text-slate-100 ring-1 ring-sky-500/30'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.value }} />
                  <span className="truncate">{c.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Routing Style Selector */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-medium text-slate-300">Gaya Lengkungan Jalur</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['bezier', 'orthogonal', 'straight'] as WireRouting[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onUpdateWire(selectedWire.id, { routing: r })}
                  className={`py-2 px-1 text-center rounded-lg border text-xs capitalize cursor-pointer transition-all ${
                    selectedWire.routing === r
                      ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
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
            className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Putuskan & Hapus Kabel
          </button>
        </div>
      </aside>
    );
  }

  // 3. Default Summary Panel when nothing is selected
  const allDefs = getAllComponentDefinitions();

  // Smart Circuit Health Check / Diagnostics
  const circuitDiagnostics: { type: 'error' | 'warning'; title: string; detail: string }[] = [];

  // 1. Direct Short Circuit Detection (Power directly connected to Ground)
  for (const wire of allWires) {
    const fromComp = allComponents.find((c) => c.id === wire.fromComponentId);
    const toComp = allComponents.find((c) => c.id === wire.toComponentId);
    if (!fromComp || !toComp) continue;

    const fromDef = allDefs[fromComp.type] || COMPONENT_DEFINITIONS[fromComp.type];
    const toDef = allDefs[toComp.type] || COMPONENT_DEFINITIONS[toComp.type];
    const fromPin = fromDef?.pins.find((p) => p.id === wire.fromPinId);
    const toPin = toDef?.pins.find((p) => p.id === wire.toPinId);

    const isPower = (p?: { type?: string; name?: string }) =>
      p?.type === 'power' ||
      ['5v', '3v3', '3.3v', 'vcc', 'vin', '+'].includes((p?.name || '').toLowerCase());
    const isGround = (p?: { type?: string; name?: string }) =>
      p?.type === 'ground' ||
      ['gnd', 'g', '-', 'ground'].includes((p?.name || '').toLowerCase());

    if ((isPower(fromPin) && isGround(toPin)) || (isGround(fromPin) && isPower(toPin))) {
      circuitDiagnostics.push({
        type: 'error',
        title: 'Potensi Korsleting (Short Circuit)',
        detail: `${fromComp.label} (${fromPin?.name}) terhubung langsung ke Ground di ${toComp.label} (${toPin?.name}).`,
      });
    }
  }

  // 2. Floating Power / Ground Detection for active modules & sensors
  const passiveTypes = [
    'breadboard-half',
    'breadboard-mini',
    'breadboard-full',
    'resistor',
    'push-button',
    'push-button-6mm',
    'push-button-12mm',
    'fitting-lamp',
    'steker-switch',
  ];
  const activeComps = allComponents.filter((c) => !passiveTypes.includes(c.type));

  for (const comp of activeComps) {
    const def = allDefs[comp.type] || COMPONENT_DEFINITIONS[comp.type];
    if (!def) continue;

    const powerPins = def.pins.filter(
      (p) => p.type === 'power' || ['vcc', '5v', '3v3', 'vin'].includes(p.name.toLowerCase())
    );
    const gndPins = def.pins.filter(
      (p) => p.type === 'ground' || ['gnd', 'g'].includes(p.name.toLowerCase())
    );

    const compWires = allWires.filter(
      (w) => w.fromComponentId === comp.id || w.toComponentId === comp.id
    );

    const isPinConnected = (pinId: string) =>
      compWires.some(
        (w) =>
          (w.fromComponentId === comp.id && w.fromPinId === pinId) ||
          (w.toComponentId === comp.id && w.toPinId === pinId)
      );

    const hasPowerConnected = powerPins.length === 0 || powerPins.some((p) => isPinConnected(p.id));
    const hasGndConnected = gndPins.length === 0 || gndPins.some((p) => isPinConnected(p.id));

    if (powerPins.length > 0 && !hasPowerConnected) {
      circuitDiagnostics.push({
        type: 'warning',
        title: 'Catu Daya Belum Terhubung',
        detail: `${comp.label} (${comp.name}) belum terhubung ke jalur VCC/Daya.`,
      });
    }

    if (gndPins.length > 0 && !hasGndConnected) {
      circuitDiagnostics.push({
        type: 'warning',
        title: 'Ground Belum Terhubung',
        detail: `${comp.label} (${comp.name}) belum terhubung ke jalur GND/Ground.`,
      });
    }
  }

  return (
    <aside className="fixed top-14 bottom-0 right-0 z-30 w-84 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-100 whitespace-nowrap">Ringkasan Sirkuit</h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 shrink-0 whitespace-nowrap">
          Live Status
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400">Total Komponen</span>
            <div className="text-xl font-bold font-mono text-sky-400 mt-1">
              {allComponents.length}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400">Kabel Jumper</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {allWires.length}
            </div>
          </div>
        </div>

        {/* Action: Center Canvas View */}
        {onCenterCanvas && (
          <button
            onClick={onCenterCanvas}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 text-slate-200 py-2.5 px-3 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer group"
            title="Pusatkan pandangan ke seluruh komponen (Fit to Screen)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="whitespace-nowrap">Pusatkan Semua Komponen (Fit View)</span>
          </button>
        )}

        {/* Circuit Diagnostics / Health Check */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="whitespace-nowrap">Diagnosa Sirkuit</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border shrink-0 whitespace-nowrap ${
                circuitDiagnostics.some((i) => i.type === 'error')
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : circuitDiagnostics.length > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {circuitDiagnostics.some((i) => i.type === 'error')
                ? 'Bahaya Korsleting'
                : circuitDiagnostics.length > 0
                ? `${circuitDiagnostics.length} Peringatan`
                : 'Sirkuit Sehat'}
            </span>
          </div>

          {circuitDiagnostics.length === 0 ? (
            <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5 text-[11px] text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Semua modul aktif terhubung dan tidak terdeteksi korsleting.</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {circuitDiagnostics.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                    issue.type === 'error'
                      ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                      : 'bg-amber-950/30 border-amber-500/25 text-amber-200'
                  }`}
                >
                  {issue.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[11px] leading-tight">{issue.title}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 leading-snug">{issue.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas Options */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-semibold text-slate-200">Pengaturan Kanvas</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Snap to Grid (10px)</span>
            <button
              onClick={onToggleSnapGrid}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                snapGrid ? 'bg-sky-500' : 'bg-slate-800'
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
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Petunjuk Navigasi</span>
          </div>
          <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>
              <strong className="text-slate-300">Pan Kanvas:</strong> Klik kiri & tahan drag pada background kosong.
            </li>
            <li>
              <strong className="text-slate-300">Seleksi Banyak:</strong> Tahan <kbd className="bg-slate-800 px-1 rounded text-[10px] text-slate-300 font-mono">Ctrl</kbd> / <kbd className="bg-slate-800 px-1 rounded text-[10px] text-slate-300 font-mono">Shift</kbd> + klik drag kanvas.
            </li>
            <li>
              <strong className="text-slate-300">Kabel:</strong> Klik pin awal $\rightarrow$ tarik $\rightarrow$ klik pin tujuan.
            </li>
            <li>
              <strong className="text-slate-300">Geser Komponen:</strong> Klik tahan dan geser komponen di kanvas.
            </li>
            <li>
              <strong className="text-slate-300">Zoom:</strong> Putar scroll wheel mouse ke atas/bawah.
            </li>
            <li>
              <strong className="text-slate-300">Menu & Kunci:</strong> Klik kanan komponen untuk kunci (L), duplikat, dll.
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
};
