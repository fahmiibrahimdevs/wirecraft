import React from 'react';
import { CircuitComponent } from '../../../types/circuit';
import { formatResistance, getResistor5BandColors } from '../../../utils/geometry';

interface ResistorPropertyEditorProps {
  component: CircuitComponent;
  onUpdate: (updates: Partial<CircuitComponent>) => void;
}

const RESISTANCE_PRESETS = [100, 220, 330, 470, 1000, 2200, 4700, 10000, 100000, 1000000];

/**
 * Interactive 5-Band Metal Film Resistor Property Editor:
 * - Direct Ohm text input
 * - Dynamic 5-Band Color Code (IEC 60062)
 * - Quick D1 digit selector
 * - Standard resistance presets
 */
export const ResistorPropertyEditor: React.FC<ResistorPropertyEditorProps> = ({
  component,
  onUpdate,
}) => {
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
        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">Biru • 1%</span>
      </div>

      <div className="flex items-center gap-2">
        <input type="number" min="1" max="10000000" value={textVal} onChange={handleInputChange} onBlur={handleInputBlur} placeholder="Nilai ohm..." className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono outline-none focus:border-sky-500/80" />
        <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">{formatResistance(currentOhms)}</span>
      </div>

      {/* Dynamic 5-Band Color Code Preview */}
      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1.5">
        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex items-center justify-between">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400"></span><span>Kode Warna 5-Gelang:</span></span>
          <span className="font-mono text-slate-400 dark:text-slate-500 text-[9px]">IEC 60062</span>
        </div>
        <div className="grid grid-cols-5 gap-1 pt-1 text-center">
          <div className="flex flex-col items-center gap-1"><span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b1 }} /><span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">D1</span></div>
          <div className="flex flex-col items-center gap-1"><span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b2 }} /><span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">D2</span></div>
          <div className="flex flex-col items-center gap-1"><span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b3 }} /><span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">D3</span></div>
          <div className="flex flex-col items-center gap-1"><span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b4 }} /><span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono">x10ⁿ</span></div>
          <div className="flex flex-col items-center gap-1"><span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm" style={{ backgroundColor: b5 }} /><span className="text-[9px] text-amber-600 dark:text-amber-500 font-mono font-semibold">1%</span></div>
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
            <button key={digit} onClick={() => setD1(digit)} className="py-1 rounded text-center text-xs font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-500/50 cursor-pointer transition-colors shadow-xs">{digit}</button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Preset Standar:</div>
      <div className="flex flex-wrap gap-1.5">
        {RESISTANCE_PRESETS.map((val) => (
          <button key={val} onClick={() => { setTextVal(String(val)); onUpdate({ customProps: { ...component.customProps, resistance: val } }); }} className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${currentOhms === val ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-500/40 font-bold' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>{formatResistance(val)}</button>
        ))}
      </div>
    </div>
  );
};
