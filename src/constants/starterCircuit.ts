import { CircuitComponent, Wire } from '../types/circuit';

export const DEFAULT_STARTER_COMPONENTS: CircuitComponent[] = [
  {
    id: 'uno_1',
    type: 'arduino-uno',
    name: 'Arduino Uno R3',
    label: 'Arduino Uno R3',
    x: 80,
    y: 100,
    rotation: 0,
    customProps: {},
  },
  {
    id: 'bb_1',
    type: 'breadboard-half',
    name: 'Half Breadboard',
    label: 'Half Breadboard (400 Tie-Point)',
    x: 480,
    y: 100,
    rotation: 0,
    customProps: {},
  },
  {
    id: 'res_1',
    type: 'resistor',
    name: 'Resistor 220Ω',
    label: 'R1 (220Ω)',
    x: 550,
    y: 200,
    rotation: 0,
    customProps: { resistance: 220 },
  },
  {
    id: 'led_1',
    type: 'led',
    name: 'LED 5mm',
    label: 'LED1',
    x: 650,
    y: 200,
    rotation: 0,
    customProps: { ledColor: 'red', isLedOn: false },
  },
];

export const DEFAULT_STARTER_WIRES: Wire[] = [
  {
    id: 'wire_5v_rail',
    fromComponentId: 'uno_1',
    fromPinId: '5v',
    toComponentId: 'bb_1',
    toPinId: 'top-vcc-1',
    color: '#ef4444', // Red 5V
    routing: 'orthogonal',
  },
  {
    id: 'wire_gnd_rail',
    fromComponentId: 'uno_1',
    fromPinId: 'gnd1',
    toComponentId: 'bb_1',
    toPinId: 'top-gnd-1',
    color: '#0f172a', // Black GND
    routing: 'orthogonal',
  },
  {
    id: 'wire_d13_resistor',
    fromComponentId: 'uno_1',
    fromPinId: 'd13',
    toComponentId: 'res_1',
    toPinId: 'pin1',
    color: '#38bdf8', // Blue D13
    routing: 'orthogonal',
  },
];
