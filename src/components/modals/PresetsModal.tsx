import React from 'react';
import { CircuitComponent, Wire } from '../../types/circuit';
import { Sparkles, X, ArrowRight, Zap, Eye, Radio, Activity } from 'lucide-react';

interface PresetItem {
  id: string;
  title: string;
  badge: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  components: CircuitComponent[];
  wires: Wire[];
}

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPreset: (components: CircuitComponent[], wires: Wire[]) => void;
}

const PRESET_CIRCUITS: PresetItem[] = [
  {
    id: 'arduino-blink',
    title: 'Arduino LED Blink Dasar',
    badge: 'Pemula',
    description: 'Rangkaian standar Arduino Uno, breadboard, resistor 220Ω, dan LED Merah pada pin D13.',
    icon: Zap,
    components: [
      {
        id: 'uno-1',
        type: 'arduino-uno',
        name: 'Arduino Uno R3',
        label: 'ARDUINO_1',
        x: 80,
        y: 120,
        rotation: 0,
        customProps: {},
      },
      {
        id: 'bb-1',
        type: 'breadboard-half',
        name: 'Half Breadboard',
        label: 'BREADBOARD_1',
        x: 460,
        y: 80,
        rotation: 0,
        customProps: {},
      },
      {
        id: 'r-1',
        type: 'resistor',
        name: 'Resistor 220Ω',
        label: 'R1',
        x: 540,
        y: 280,
        rotation: 0,
        customProps: { resistance: 220 },
      },
      {
        id: 'led-1',
        type: 'led',
        name: 'LED 5mm',
        label: 'LED1',
        x: 551.9,
        y: 142.4,
        rotation: 0,
        customProps: { ledColor: 'red', isLedOn: true },
      },
    ],
    wires: [
      {
        id: 'w1',
        fromComponentId: 'uno-1',
        fromPinId: 'd13',
        toComponentId: 'r-1',
        toPinId: 'pin1',
        color: '#eab308',
        routing: 'orthogonal',
      },
      {
        id: 'w2',
        fromComponentId: 'r-1',
        fromPinId: 'pin2',
        toComponentId: 'led-1',
        toPinId: 'anode',
        color: '#ef4444',
        routing: 'orthogonal',
      },
      {
        id: 'w3',
        fromComponentId: 'led-1',
        fromPinId: 'cathode',
        toComponentId: 'uno-1',
        toPinId: 'gnd_top',
        color: '#1e293b',
        routing: 'orthogonal',
      },
    ],
  },
  {
    id: 'esp32-oled-dht11',
    title: 'ESP32 Weather & I2C OLED',
    badge: 'IoT Project',
    description: 'ESP32 terhubung dengan sensor suhu DHT11 dan layar grafis OLED 0.96" via protokol I2C.',
    icon: Radio,
    components: [
      {
        id: 'esp-1',
        type: 'esp32-30p',
        name: 'ESP32 DevKit V1 (30-Pin)',
        label: 'ESP32_1',
        x: 120,
        y: 160,
        rotation: 0,
        customProps: {},
      },
      {
        id: 'oled-1',
        type: 'display-oled',
        name: 'OLED 0.96" I2C',
        label: 'OLED_1',
        x: 420,
        y: 80,
        rotation: 0,
        customProps: { oledTitle: 'ESP32 Weather' },
      },
      {
        id: 'dht-1',
        type: 'sensor-dht11',
        name: 'DHT11 Sensor',
        label: 'DHT11_1',
        x: 580,
        y: 90,
        rotation: 0,
        customProps: {},
      },
    ],
    wires: [
      {
        id: 'w_oled_vcc',
        fromComponentId: 'esp-1',
        fromPinId: 'pin_16',
        toComponentId: 'oled-1',
        toPinId: 'vcc',
        color: '#ef4444',
        routing: 'orthogonal',
      },
      {
        id: 'w_oled_gnd',
        fromComponentId: 'esp-1',
        fromPinId: 'pin_17',
        toComponentId: 'oled-1',
        toPinId: 'gnd',
        color: '#1e293b',
        routing: 'orthogonal',
      },
      {
        id: 'w_oled_scl',
        fromComponentId: 'esp-1',
        fromPinId: 'pin_29',
        toComponentId: 'oled-1',
        toPinId: 'scl',
        color: '#eab308',
        routing: 'orthogonal',
      },
      {
        id: 'w_oled_sda',
        fromComponentId: 'esp-1',
        fromPinId: 'pin_26',
        toComponentId: 'oled-1',
        toPinId: 'sda',
        color: '#a855f7',
        routing: 'orthogonal',
      },
      {
        id: 'w_dht_vcc',
        fromComponentId: 'esp-1',
        fromPinId: 'pin_16',
        toComponentId: 'dht-1',
        toPinId: 'vcc',
        color: '#ef4444',
        routing: 'orthogonal',
      },
      {
        id: 'w_dht_data',
        fromComponentId: 'esp-1',
        fromPinId: 'pin_20',
        toComponentId: 'dht-1',
        toPinId: 'data',
        color: '#38bdf8',
        routing: 'orthogonal',
      },
      {
        id: 'w_dht_gnd',
        fromComponentId: 'esp-1',
        fromPinId: 'pin_17',
        toComponentId: 'dht-1',
        toPinId: 'gnd',
        color: '#1e293b',
        routing: 'orthogonal',
      },
    ],
  },
  {
    id: 'ultrasonic-radar',
    title: 'HC-SR04 Radar & Piezo Buzzer',
    badge: 'Sensor',
    description: 'Sensor jarak ultrasonik mendeteksi halangan dan membunyikan alarm peringatan buzzer.',
    icon: Activity,
    components: [
      {
        id: 'uno-sonar',
        type: 'arduino-uno',
        name: 'Arduino Uno R3',
        label: 'ARDUINO_1',
        x: 100,
        y: 120,
        rotation: 0,
        customProps: {},
      },
      {
        id: 'sonar-1',
        type: 'sensor-ultrasonic',
        name: 'HC-SR04 Ultrasonic',
        label: 'SONAR_1',
        x: 480,
        y: 100,
        rotation: 0,
        customProps: {},
      },
      {
        id: 'buzzer-1',
        type: 'buzzer',
        name: 'Piezo Buzzer',
        label: 'BUZZER_1',
        x: 660,
        y: 150,
        rotation: 0,
        customProps: {},
      },
    ],
    wires: [
      {
        id: 'w_s_vcc',
        fromComponentId: 'uno-sonar',
        fromPinId: '5v',
        toComponentId: 'sonar-1',
        toPinId: 'vcc',
        color: '#ef4444',
        routing: 'orthogonal',
      },
      {
        id: 'w_s_trig',
        fromComponentId: 'uno-sonar',
        fromPinId: 'd9',
        toComponentId: 'sonar-1',
        toPinId: 'trig',
        color: '#eab308',
        routing: 'orthogonal',
      },
      {
        id: 'w_s_echo',
        fromComponentId: 'uno-sonar',
        fromPinId: 'd10',
        toComponentId: 'sonar-1',
        toPinId: 'echo',
        color: '#38bdf8',
        routing: 'orthogonal',
      },
      {
        id: 'w_s_gnd',
        fromComponentId: 'uno-sonar',
        fromPinId: 'gnd_bot1',
        toComponentId: 'sonar-1',
        toPinId: 'gnd',
        color: '#1e293b',
        routing: 'orthogonal',
      },
      {
        id: 'w_b_pos',
        fromComponentId: 'uno-sonar',
        fromPinId: 'd8',
        toComponentId: 'buzzer-1',
        toPinId: 'pos',
        color: '#f97316',
        routing: 'orthogonal',
      },
      {
        id: 'w_b_neg',
        fromComponentId: 'uno-sonar',
        fromPinId: 'gnd_bot2',
        toComponentId: 'buzzer-1',
        toPinId: 'neg',
        color: '#1e293b',
        routing: 'orthogonal',
      },
    ],
  },
  {
    id: 'pot-dimmer',
    title: 'Analog Potentiometer Dimmer',
    badge: 'Analog & PWM',
    description: 'Mengatur intensitas nyala LED menggunakan pembagi tegangan potensiometer via pin PWM.',
    icon: Eye,
    components: [
      {
        id: 'uno-dim',
        type: 'arduino-uno',
        name: 'Arduino Uno R3',
        label: 'ARDUINO_1',
        x: 100,
        y: 120,
        rotation: 0,
        customProps: {},
      },
      {
        id: 'pot-1',
        type: 'potentiometer',
        name: 'Potentiometer 10k',
        label: 'POT_1',
        x: 480,
        y: 140,
        rotation: 0,
        customProps: { potValue: 65 },
      },
      {
        id: 'led-blue',
        type: 'led',
        name: 'LED Biru',
        label: 'LED_BLUE',
        x: 620,
        y: 150,
        rotation: 0,
        customProps: { ledColor: 'blue', isLedOn: true },
      },
    ],
    wires: [
      {
        id: 'w_pot_vcc',
        fromComponentId: 'uno-dim',
        fromPinId: '5v',
        toComponentId: 'pot-1',
        toPinId: 'vcc',
        color: '#ef4444',
        routing: 'orthogonal',
      },
      {
        id: 'w_pot_wiper',
        fromComponentId: 'uno-dim',
        fromPinId: 'a0',
        toComponentId: 'pot-1',
        toPinId: 'wiper',
        color: '#38bdf8',
        routing: 'orthogonal',
      },
      {
        id: 'w_pot_gnd',
        fromComponentId: 'uno-dim',
        fromPinId: 'gnd_bot1',
        toComponentId: 'pot-1',
        toPinId: 'gnd',
        color: '#1e293b',
        routing: 'orthogonal',
      },
      {
        id: 'w_led_anode',
        fromComponentId: 'uno-dim',
        fromPinId: 'd9',
        toComponentId: 'led-blue',
        toPinId: 'anode',
        color: '#3b82f6',
        routing: 'orthogonal',
      },
      {
        id: 'w_led_cathode',
        fromComponentId: 'uno-dim',
        fromPinId: 'gnd_top',
        toComponentId: 'led-blue',
        toPinId: 'cathode',
        color: '#1e293b',
        routing: 'orthogonal',
      },
    ],
  },
];

export const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose, onLoadPreset }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400"><Sparkles className="w-4 h-4" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Contoh Template Sirkuit</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Pilih rangkaian siap pakai untuk langsung dicoba dan dieksplorasi di kanvas.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Preset Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {PRESET_CIRCUITS.map((preset) => {
            const Icon = preset.icon;

            return (
              <div key={preset.id} onClick={() => { onLoadPreset(preset.components, preset.wires); onClose(); }} className="group bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/70 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-sky-500/80 hover:ring-1 hover:ring-sky-500/30 rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-center justify-between shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform shrink-0"><Icon className="w-5 h-5" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">{preset.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20 dark:border-sky-500/30">{preset.badge}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{preset.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      <span>{preset.components.length} Komponen</span><span>•</span><span>{preset.wires.length} Kabel</span>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:border-sky-300 dark:group-hover:border-sky-500/30 transition-all shrink-0 ml-4"><ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
