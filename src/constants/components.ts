import { ComponentDefinition, Pin } from '../types/circuit';

// Standard breadboard grid scaling based on official Fritzing SVG vector specs
// Official Fritzing base pitch unit: 7.200 (0.1 inch at 72 DPI)
// Target IDE grid pitch: 17.0px (100% consistent across Mini, Half, and Full breadboards)
const BREADBOARD_PITCH = 17.0;
const FRITZING_BASE_UNIT = 7.2;
const BREADBOARD_SCALE = BREADBOARD_PITCH / FRITZING_BASE_UNIT; // ~2.361111

// Helper to scale SVG coordinates to canvas coordinates with 1 decimal precision
const scaleCoord = (val: number) => Math.round(val * BREADBOARD_SCALE * 10) / 10;

/**
 * 1. Mini Breadboard (170 Tie-Point / SYB-170)
 * 17 Columns x 10 Rows (A-E and F-J), compact modular without power rails
 */
function createBreadboardMiniPins(): Pin[] {
  const pins: Pin[] = [];

  // 17 Column centers from official miniBreadboard.svg (taking transform translate(-4.5, -9) into account)
  const colXsRaw = [
    7.322, 14.522, 21.721, 28.92, 36.12, 43.322, 50.522, 57.721, 64.92,
    72.121, 79.321, 86.522, 93.721, 100.919, 108.121, 115.321, 122.52
  ];

  const rowsTop = [
    { key: 'a', y: 10.857 },
    { key: 'b', y: 18.057 },
    { key: 'c', y: 25.257 },
    { key: 'd', y: 32.457 },
    { key: 'e', y: 39.657 },
  ];

  const rowsBot = [
    { key: 'f', y: 61.257 },
    { key: 'g', y: 68.457 },
    { key: 'h', y: 75.657 },
    { key: 'i', y: 82.857 },
    { key: 'j', y: 90.057 },
  ];

  colXsRaw.forEach((rawX, colIdx) => {
    const colNum = colIdx + 1;
    const x = scaleCoord(rawX);

    // Top rows A - E
    const topNetId = `bb_mini_col_top_${colNum}`;
    rowsTop.forEach((r) => {
      pins.push({
        id: `mini-row-${r.key}-${colNum}`,
        name: `${r.key.toUpperCase()}${colNum}`,
        x,
        y: scaleCoord(r.y),
        type: 'generic',
        internalNetId: topNetId,
      });
    });

    // Bottom rows F - J
    const botNetId = `bb_mini_col_bot_${colNum}`;
    rowsBot.forEach((r) => {
      pins.push({
        id: `mini-row-${r.key}-${colNum}`,
        name: `${r.key.toUpperCase()}${colNum}`,
        x,
        y: scaleCoord(r.y),
        type: 'generic',
        internalNetId: botNetId,
      });
    });
  });

  return pins;
}

/**
 * 2. Half Breadboard (400 Tie-Point / MB-102 Half)
 * 30 Columns x 10 Rows (A-E and F-J) + Dual Power Rails (Top & Bottom)
 */
function createBreadboardHalfPins(): Pin[] {
  const pins: Pin[] = [];

  // 25 hole positions across the 5 groups of 5 holes on the power rails from halfBreadboard.svg
  const railXsRaw = [
    25.32, 32.52, 39.72, 46.92, 54.12,
    68.52, 75.72, 82.92, 90.12, 97.32,
    111.72, 118.92, 126.12, 133.32, 140.52,
    154.92, 162.12, 169.32, 176.52, 183.72,
    198.12, 205.32, 212.52, 219.72, 226.92
  ];

  // 30 Column centers (start at 25.32, step 7.200)
  const colXs: number[] = [];
  for (let c = 1; c <= 30; c++) {
    colXs.push(scaleCoord(25.32 + (c - 1) * 7.2));
  }

  // 1. Top Power Rails (- at Y=7.2, + at Y=14.4)
  railXsRaw.forEach((rawX, idx) => {
    const x = scaleCoord(rawX);
    pins.push({
      id: `top-gnd-${idx + 1}`,
      name: `- (Top Rail #${idx + 1})`,
      x,
      y: scaleCoord(7.201),
      type: 'ground',
      internalNetId: 'bb_top_gnd',
    });
    pins.push({
      id: `top-vcc-${idx + 1}`,
      name: `+ (Top Rail #${idx + 1})`,
      x,
      y: scaleCoord(14.4),
      type: 'power',
      internalNetId: 'bb_top_vcc',
    });
  });

  // 2. Terminal strips A, B, C, D, E (Cols 1 - 30)
  const rowsTop = [
    { key: 'a', y: 36.0 },
    { key: 'b', y: 43.2 },
    { key: 'c', y: 50.4 },
    { key: 'd', y: 57.6 },
    { key: 'e', y: 64.8 },
  ];

  colXs.forEach((x, colIdx) => {
    const colNum = colIdx + 1;
    const netId = `bb_col_top_${colNum}`;
    rowsTop.forEach((r) => {
      pins.push({
        id: `row-${r.key}-${colNum}`,
        name: `${r.key.toUpperCase()}${colNum}`,
        x,
        y: scaleCoord(r.y),
        type: 'generic',
        internalNetId: netId,
      });
    });
  });

  // 3. Terminal strips F, G, H, I, J (Cols 1 - 30)
  const rowsBot = [
    { key: 'f', y: 86.4 },
    { key: 'g', y: 93.6 },
    { key: 'h', y: 100.8 },
    { key: 'i', y: 108.0 },
    { key: 'j', y: 115.2 },
  ];

  colXs.forEach((x, colIdx) => {
    const colNum = colIdx + 1;
    const netId = `bb_col_bot_${colNum}`;
    rowsBot.forEach((r) => {
      pins.push({
        id: `row-${r.key}-${colNum}`,
        name: `${r.key.toUpperCase()}${colNum}`,
        x,
        y: scaleCoord(r.y),
        type: 'generic',
        internalNetId: netId,
      });
    });
  });

  // 4. Bottom Power Rails (+ at Y=136.8, - at Y=144.0)
  railXsRaw.forEach((rawX, idx) => {
    const x = scaleCoord(rawX);
    pins.push({
      id: `bot-vcc-${idx + 1}`,
      name: `+ (Bottom Rail #${idx + 1})`,
      x,
      y: scaleCoord(136.799),
      type: 'power',
      internalNetId: 'bb_bot_vcc',
    });
    pins.push({
      id: `bot-gnd-${idx + 1}`,
      name: `- (Bottom Rail #${idx + 1})`,
      x,
      y: scaleCoord(144.0),
      type: 'ground',
      internalNetId: 'bb_bot_gnd',
    });
  });

  return pins;
}

/**
 * 3. Full Breadboard (830 Tie-Point / MB-102 Full)
 * 60 Columns x 10 Rows (A-E and F-J) + Dual Power Rails (50 holes each)
 */
function createBreadboardFullPins(): Pin[] {
  const pins: Pin[] = [];

  // 50 hole positions across 10 groups on the power rails from breadboard_full.svg
  const railXsRaw = [
    25.32, 32.52, 39.72, 46.92, 54.12,
    68.52, 75.72, 82.92, 90.12, 97.32,
    111.72, 118.92, 126.12, 133.32, 140.52,
    154.92, 162.12, 169.32, 176.52, 183.72,
    198.12, 205.32, 212.52, 219.72, 226.92,
    248.52, 255.72, 262.92, 270.12, 277.32,
    291.72, 298.92, 306.12, 313.32, 320.52,
    334.92, 342.12, 349.32, 356.52, 363.72,
    378.12, 385.32, 392.52, 399.72, 406.92,
    421.32, 428.52, 435.72, 442.92, 450.12
  ];

  // 60 Column centers (start at 25.32, step 7.200)
  const colXs: number[] = [];
  for (let c = 1; c <= 60; c++) {
    colXs.push(scaleCoord(25.32 + (c - 1) * 7.2));
  }

  // 1. Top Power Rails (- at Y=7.2, + at Y=14.4)
  railXsRaw.forEach((rawX, idx) => {
    const x = scaleCoord(rawX);
    pins.push({
      id: `full-top-gnd-${idx + 1}`,
      name: `- (Top Rail #${idx + 1})`,
      x,
      y: scaleCoord(7.201),
      type: 'ground',
      internalNetId: 'bb_full_top_gnd',
    });
    pins.push({
      id: `full-top-vcc-${idx + 1}`,
      name: `+ (Top Rail #${idx + 1})`,
      x,
      y: scaleCoord(14.4),
      type: 'power',
      internalNetId: 'bb_full_top_vcc',
    });
  });

  // 2. Terminal strips A, B, C, D, E (Cols 1 - 60)
  const rowsTop = [
    { key: 'a', y: 36.0 },
    { key: 'b', y: 43.2 },
    { key: 'c', y: 50.4 },
    { key: 'd', y: 57.6 },
    { key: 'e', y: 64.8 },
  ];

  colXs.forEach((x, colIdx) => {
    const colNum = colIdx + 1;
    const netId = `bb_full_col_top_${colNum}`;
    rowsTop.forEach((r) => {
      pins.push({
        id: `full-row-${r.key}-${colNum}`,
        name: `${r.key.toUpperCase()}${colNum}`,
        x,
        y: scaleCoord(r.y),
        type: 'generic',
        internalNetId: netId,
      });
    });
  });

  // 3. Terminal strips F, G, H, I, J (Cols 1 - 60)
  const rowsBot = [
    { key: 'f', y: 86.4 },
    { key: 'g', y: 93.6 },
    { key: 'h', y: 100.8 },
    { key: 'i', y: 108.0 },
    { key: 'j', y: 115.2 },
  ];

  colXs.forEach((x, colIdx) => {
    const colNum = colIdx + 1;
    const netId = `bb_full_col_bot_${colNum}`;
    rowsBot.forEach((r) => {
      pins.push({
        id: `full-row-${r.key}-${colNum}`,
        name: `${r.key.toUpperCase()}${colNum}`,
        x,
        y: scaleCoord(r.y),
        type: 'generic',
        internalNetId: netId,
      });
    });
  });

  // 4. Bottom Power Rails (+ at Y=136.8, - at Y=144.0)
  railXsRaw.forEach((rawX, idx) => {
    const x = scaleCoord(rawX);
    pins.push({
      id: `full-bot-vcc-${idx + 1}`,
      name: `+ (Bottom Rail #${idx + 1})`,
      x,
      y: scaleCoord(136.799),
      type: 'power',
      internalNetId: 'bb_full_bot_vcc',
    });
    pins.push({
      id: `full-bot-gnd-${idx + 1}`,
      name: `- (Bottom Rail #${idx + 1})`,
      x,
      y: scaleCoord(144.0),
      type: 'ground',
      internalNetId: 'bb_full_bot_gnd',
    });
  });

  return pins;
}



// Generate ESP32 DevKit 38-Pin (CP2102 / ESP-WROOM-32D) layout mapped to official 2D visual

// Generate ESP32-C3 Supermini (RISC-V) 16-pin layout mapped to official 2D visual

// Generate NodeMCU ESP8266 V1 (Amica CP2102) 30-pin layout mapped to official 2D visual

// Generate NodeMCU ESP8266 V3 (LoLin CH340) 30-pin layout mapped to official 2D visual

export const COMPONENT_DEFINITIONS: Record<string, ComponentDefinition> = {
  'arduino-uno': {
    type: 'arduino-uno',
    name: 'Arduino Uno R3',
    category: 'microcontrollers',
    description: 'Mikrokontroler ATmega328P dengan 14 pin digital I/O dan 6 pin analog.',
    width: 340,
    height: 242,
    icon: 'Cpu',
    pins: [
      // Top Digital Headers (D0 - D13, GND, AREF, SDA, SCL)
      { id: 'scl', name: 'SCL', x: 114.0, y: 11.5, type: 'i2c', description: 'I2C Clock' },
      { id: 'sda', name: 'SDA', x: 125.5, y: 11.5, type: 'i2c', description: 'I2C Data' },
      { id: 'aref', name: 'AREF', x: 137.0, y: 11.5, type: 'analog', description: 'Analog Reference' },
      { id: 'gnd_top', name: 'GND', x: 148.6, y: 11.5, type: 'ground', description: 'Ground' },
      { id: 'd13', name: 'D13', x: 160.1, y: 11.5, type: 'digital', description: 'Digital Pin 13 (Built-in LED, SPI SCK)' },
      { id: 'd12', name: 'D12', x: 171.6, y: 11.5, type: 'digital', description: 'Digital Pin 12 (SPI MISO)' },
      { id: 'd11', name: 'D11', x: 183.1, y: 11.5, type: 'pwm', description: 'Digital Pin 11 (PWM, SPI MOSI)' },
      { id: 'd10', name: 'D10', x: 194.6, y: 11.5, type: 'pwm', description: 'Digital Pin 10 (PWM, SPI SS)' },
      { id: 'd9', name: 'D9', x: 206.2, y: 11.5, type: 'pwm', description: 'Digital Pin 9 (PWM)' },
      { id: 'd8', name: 'D8', x: 217.7, y: 11.5, type: 'digital', description: 'Digital Pin 8' },
      { id: 'd7', name: 'D7', x: 236.1, y: 11.5, type: 'digital', description: 'Digital Pin 7' },
      { id: 'd6', name: 'D6', x: 247.6, y: 11.5, type: 'pwm', description: 'Digital Pin 6 (PWM)' },
      { id: 'd5', name: 'D5', x: 259.2, y: 11.5, type: 'pwm', description: 'Digital Pin 5 (PWM)' },
      { id: 'd4', name: 'D4', x: 270.7, y: 11.5, type: 'digital', description: 'Digital Pin 4' },
      { id: 'd3', name: 'D3', x: 282.2, y: 11.5, type: 'pwm', description: 'Digital Pin 3 (PWM)' },
      { id: 'd2', name: 'D2', x: 293.7, y: 11.5, type: 'digital', description: 'Digital Pin 2 (Interrupt 0)' },
      { id: 'd1', name: 'D1 (TX)', x: 305.2, y: 11.5, type: 'uart', description: 'Digital Pin 1 (Serial TX)' },
      { id: 'd0', name: 'D0 (RX)', x: 316.8, y: 11.5, type: 'uart', description: 'Digital Pin 0 (Serial RX)' },

      // Bottom Power Headers (8 Pins: NC, IOREF, RESET, 3.3V, 5V, GND, GND, VIN)
      { id: 'nc', name: 'NC', x: 155.5, y: 230.4, type: 'generic', description: 'Not Connected' },
      { id: 'ioref', name: 'IOREF', x: 167.0, y: 230.4, type: 'power', description: 'I/O Reference Voltage' },
      { id: 'reset', name: 'RESET', x: 178.5, y: 230.4, type: 'generic', description: 'Active Low Reset' },
      { id: '3v3', name: '3.3V', x: 190.0, y: 230.4, type: 'power', description: '3.3V Power Output' },
      { id: '5v', name: '5V', x: 201.6, y: 230.4, type: 'power', description: '5V Regulated Power Output' },
      { id: 'gnd_bot1', name: 'GND', x: 213.1, y: 230.4, type: 'ground', description: 'Ground' },
      { id: 'gnd_bot2', name: 'GND', x: 224.6, y: 230.4, type: 'ground', description: 'Ground' },
      { id: 'vin', name: 'VIN', x: 236.1, y: 230.4, type: 'power', description: 'Voltage Input (7-12V)' },

      // Bottom Analog Headers
      { id: 'a0', name: 'A0', x: 259.2, y: 230.4, type: 'analog', description: 'Analog Input 0' },
      { id: 'a1', name: 'A1', x: 270.7, y: 230.4, type: 'analog', description: 'Analog Input 1' },
      { id: 'a2', name: 'A2', x: 282.2, y: 230.4, type: 'analog', description: 'Analog Input 2' },
      { id: 'a3', name: 'A3', x: 293.7, y: 230.4, type: 'analog', description: 'Analog Input 3' },
      { id: 'a4', name: 'A4', x: 305.2, y: 230.4, type: 'analog', description: 'Analog Input 4 / I2C SDA' },
      { id: 'a5', name: 'A5', x: 316.8, y: 230.4, type: 'analog', description: 'Analog Input 5 / I2C SCL' },
    ],
  },


  
  
  
  
  'breadboard-mini': {
    type: 'breadboard-mini',
    name: 'Mini Breadboard (170 Tie-Point)',
    category: 'prototyping',
    description: 'Papan breadboard mini 170 lubang modular tanpa rail daya untuk sensor dan modul ringkas.',
    width: 306.5,
    height: 238.2,
    icon: 'Grid',
    pins: createBreadboardMiniPins(),
  },

  'breadboard-half': {
    type: 'breadboard-half',
    name: 'Half Breadboard (400 Tie-Point)',
    category: 'prototyping',
    description: 'Papan eksperimen solderless 400 lubang dengan rail daya ganda atas & bawah.',
    width: 578.5,
    height: 357.0,
    icon: 'Grid',
    pins: createBreadboardHalfPins(),
  },

  'breadboard-full': {
    type: 'breadboard-full',
    name: 'Full Breadboard (830 Tie-Point)',
    category: 'prototyping',
    description: 'Papan eksperimen full-size 830 lubang untuk proyek kompleks dan multi-IC.',
    width: 1122.5,
    height: 357.0,
    icon: 'Grid',
    pins: createBreadboardFullPins(),
  },

  'resistor': {
    type: 'resistor',
    name: 'Resistor Metal Film (5-Gelang)',
    category: 'passives',
    description: 'Resistor presisi metal film biru 5-gelang toleransi 1%. Bentang 68.0px (4 pitch) presisi 100% di lubang breadboard.',
    width: 72.0,
    height: 16.0,
    icon: 'Minimize2',
    defaultProps: { resistance: 220 },
    pins: [
      { id: 'pin1', name: 'Pin 1', x: 2.0, y: 8.0, type: 'passive', description: 'Terminal 1' },
      { id: 'pin2', name: 'Pin 2', x: 70.0, y: 8.0, type: 'passive', description: 'Terminal 2' },
    ],
  },

  'led': {
    type: 'led',
    name: 'LED 5mm',
    category: 'outputs',
    description: 'Light Emitting Diode fotorealistik dengan kaki Anode (+) dan Cathode (-). Jarak kaki 17.0px presisi untuk lubang 3 & 4 breadboard.',
    width: 27.2,
    height: 58.6,
    icon: 'Sun',
    defaultProps: { ledColor: 'red', isLedOn: false },
    pins: [
      { id: 'anode', name: 'Anode (+)', x: 7.5, y: 58.6, type: 'passive', description: 'Positive Lead (Kaki 1 / Lubang 3)' },
      { id: 'cathode', name: 'Cathode (-)', x: 24.5, y: 58.6, type: 'ground', description: 'Negative Lead (Kaki 2 / Lubang 4)' },
    ],
  },

  'push-button-6mm': {
    type: 'push-button-6mm',
    name: 'Push Button 6mm (Mini Tactile)',
    category: 'passives',
    description: 'Miniatur sakelar taktil 6x6mm 4-pin. Menjembatani trough tengah breadboard (Row E ke Row F, bentang 2 kolom 34.0px).',
    width: 42.0,
    height: 57.0,
    icon: 'CircleDot',
    defaultProps: { buttonPressed: false, buttonColor: 'green' },
    pins: [
      { id: 'pin1a', name: 'Pin 1A', x: 4.0, y: 3.0, type: 'passive', description: 'Terminal 1 (Row E Kiri)', internalNetId: 'btn6_term_1' },
      { id: 'pin1b', name: 'Pin 1B', x: 38.0, y: 3.0, type: 'passive', description: 'Terminal 1 (Row E Kanan)', internalNetId: 'btn6_term_1' },
      { id: 'pin2a', name: 'Pin 2A', x: 4.0, y: 54.0, type: 'passive', description: 'Terminal 2 (Row F Kiri)', internalNetId: 'btn6_term_2' },
      { id: 'pin2b', name: 'Pin 2B', x: 38.0, y: 54.0, type: 'passive', description: 'Terminal 2 (Row F Kanan)', internalNetId: 'btn6_term_2' },
    ],
  },

  'push-button-12mm': {
    type: 'push-button-12mm',
    name: 'Push Button 12mm (Big Tactile)',
    category: 'passives',
    description: 'Sakelar taktil besar 12x12mm 4-pin dengan cap bulat lebar dan kaki panjang (Row C ke Row H, bentang 2 kolom 34.0px).',
    width: 72.0,
    height: 127.0,
    icon: 'CircleDot',
    defaultProps: { buttonPressed: false, buttonColor: 'green' },
    pins: [
      { id: 'pin1a', name: 'Pin 1A', x: 19.0, y: 4.0, type: 'passive', description: 'Terminal 1 (Row C Kiri)', internalNetId: 'btn12_term_1' },
      { id: 'pin1b', name: 'Pin 1B', x: 53.0, y: 4.0, type: 'passive', description: 'Terminal 1 (Row C Kanan)', internalNetId: 'btn12_term_1' },
      { id: 'pin2a', name: 'Pin 2A', x: 19.0, y: 123.0, type: 'passive', description: 'Terminal 2 (Row H Kiri)', internalNetId: 'btn12_term_2' },
      { id: 'pin2b', name: 'Pin 2B', x: 53.0, y: 123.0, type: 'passive', description: 'Terminal 2 (Row H Kanan)', internalNetId: 'btn12_term_2' },
    ],
  },

  'push-button': {
    type: 'push-button',
    name: 'Push Button 6mm (Mini Tactile)',
    category: 'passives',
    description: 'Miniatur sakelar taktil 6x6mm 4-pin standar breadboard.',
    width: 42.0,
    height: 57.0,
    icon: 'CircleDot',
    defaultProps: { buttonPressed: false, buttonColor: 'green' },
    pins: [
      { id: 'pin1a', name: 'Pin 1A', x: 4.0, y: 3.0, type: 'passive', description: 'Terminal 1 (Row E Kiri)', internalNetId: 'btn_term_1' },
      { id: 'pin1b', name: 'Pin 1B', x: 38.0, y: 3.0, type: 'passive', description: 'Terminal 1 (Row E Kanan)', internalNetId: 'btn_term_1' },
      { id: 'pin2a', name: 'Pin 2A', x: 4.0, y: 54.0, type: 'passive', description: 'Terminal 2 (Row F Kiri)', internalNetId: 'btn_term_2' },
      { id: 'pin2b', name: 'Pin 2B', x: 38.0, y: 54.0, type: 'passive', description: 'Terminal 2 (Row F Kanan)', internalNetId: 'btn_term_2' },
    ],
  },

  'potentiometer': {
    type: 'potentiometer',
    name: 'Rotary Potentiometer',
    category: 'passives',
    description: 'Resistor variabel putar 3-pin standar breadboard. Bentang kaki 34.0px (longkap 1 lubang tiap kaki).',
    width: 140.6,
    height: 196.8,
    icon: 'Sliders',
    defaultProps: { potValue: 50 },
    pins: [
      { id: 'vcc', name: 'Terminal 1', x: 36.0, y: 186.2, type: 'passive', description: 'Terminal 1' },
      { id: 'wiper', name: 'Wiper', x: 70.0, y: 186.2, type: 'analog', description: 'Wiper / Output' },
      { id: 'gnd', name: 'Terminal 2', x: 104.0, y: 186.2, type: 'passive', description: 'Terminal 2' },
    ],
  },

  
  
  
  
  
  
  
  
  
  

  
  

  
  

  

  'display-lcd1602': {
    type: 'display-lcd1602',
    name: 'LCD 16x2 (Tanpa I2C)',
    category: 'displays',
    description: 'Layar karakter LCD 16 kolom x 2 baris paralel 16-pin standar breadboard (pitch 17.0px).',
    width: 535.0,
    height: 241.6,
    icon: 'Tv',
    pins: [
      { id: 'vss', name: 'VSS', x: 56.8, y: 231.0, type: 'ground', description: 'Power Ground (0V)' },
      { id: 'vdd', name: 'VDD', x: 73.8, y: 231.0, type: 'power', description: 'Power Supply (+5V)' },
      { id: 'v0', name: 'V0', x: 90.8, y: 231.0, type: 'passive', description: 'Contrast Adjustment' },
      { id: 'rs', name: 'RS', x: 107.8, y: 231.0, type: 'digital', description: 'Register Select' },
      { id: 'rw', name: 'RW', x: 124.8, y: 231.0, type: 'digital', description: 'Read/Write Select' },
      { id: 'e', name: 'E', x: 141.8, y: 231.0, type: 'digital', description: 'Enable Signal' },
      { id: 'd0', name: 'D0', x: 158.8, y: 231.0, type: 'digital', description: 'Data Bus 0' },
      { id: 'd1', name: 'D1', x: 175.8, y: 231.0, type: 'digital', description: 'Data Bus 1' },
      { id: 'd2', name: 'D2', x: 192.8, y: 231.0, type: 'digital', description: 'Data Bus 2' },
      { id: 'd3', name: 'D3', x: 209.8, y: 231.0, type: 'digital', description: 'Data Bus 3' },
      { id: 'd4', name: 'D4', x: 226.8, y: 231.0, type: 'digital', description: 'Data Bus 4' },
      { id: 'd5', name: 'D5', x: 243.8, y: 231.0, type: 'digital', description: 'Data Bus 5' },
      { id: 'd6', name: 'D6', x: 260.8, y: 231.0, type: 'digital', description: 'Data Bus 6' },
      { id: 'd7', name: 'D7', x: 277.8, y: 231.0, type: 'digital', description: 'Data Bus 7' },
      { id: 'a', name: 'A', x: 294.8, y: 231.0, type: 'power', description: 'Backlight Anode (+5V)' },
      { id: 'k', name: 'K', x: 311.8, y: 231.0, type: 'ground', description: 'Backlight Cathode (GND)' },
    ],
  },

  'display-lcd1602-i2c': {
    type: 'display-lcd1602-i2c',
    name: 'LCD 16x2 (I2C)',
    category: 'displays',
    description: 'Layar karakter LCD 16 kolom x 2 baris dengan modul I2C backpack 4-pin (pitch 17.0px).',
    width: 535.0,
    height: 241.0,
    icon: 'Tv',
    pins: [
      { id: 'gnd', name: 'GND', x: 8.0, y: 56.5, type: 'ground', description: 'Ground' },
      { id: 'vcc', name: 'VCC', x: 8.0, y: 73.5, type: 'power', description: '5V Power Supply' },
      { id: 'sda', name: 'SDA', x: 8.0, y: 90.5, type: 'i2c', description: 'I2C Serial Data' },
      { id: 'scl', name: 'SCL', x: 8.0, y: 107.5, type: 'i2c', description: 'I2C Serial Clock' },
    ],
  },

  'display-lcd2004': {
    type: 'display-lcd2004',
    name: 'LCD 20x4 (Tanpa I2C)',
    category: 'displays',
    description: 'Layar karakter LCD 20 kolom x 4 baris paralel 16-pin standar breadboard (pitch 17.0px).',
    width: 629.0,
    height: 319.0,
    icon: 'Tv',
    pins: [
      { id: 'vss', name: 'VSS', x: 57.0, y: 307.0, type: 'ground', description: 'Power Ground (0V)' },
      { id: 'vdd', name: 'VDD', x: 74.0, y: 307.0, type: 'power', description: 'Power Supply (+5V)' },
      { id: 'v0', name: 'V0', x: 91.0, y: 307.0, type: 'passive', description: 'Contrast Adjustment' },
      { id: 'rs', name: 'RS', x: 108.0, y: 307.0, type: 'digital', description: 'Register Select' },
      { id: 'rw', name: 'RW', x: 125.0, y: 307.0, type: 'digital', description: 'Read/Write Select' },
      { id: 'e', name: 'E', x: 142.0, y: 307.0, type: 'digital', description: 'Enable Signal' },
      { id: 'd0', name: 'D0', x: 159.0, y: 307.0, type: 'digital', description: 'Data Bus 0' },
      { id: 'd1', name: 'D1', x: 176.0, y: 307.0, type: 'digital', description: 'Data Bus 1' },
      { id: 'd2', name: 'D2', x: 193.0, y: 307.0, type: 'digital', description: 'Data Bus 2' },
      { id: 'd3', name: 'D3', x: 210.0, y: 307.0, type: 'digital', description: 'Data Bus 3' },
      { id: 'd4', name: 'D4', x: 227.0, y: 307.0, type: 'digital', description: 'Data Bus 4' },
      { id: 'd5', name: 'D5', x: 244.0, y: 307.0, type: 'digital', description: 'Data Bus 5' },
      { id: 'd6', name: 'D6', x: 261.0, y: 307.0, type: 'digital', description: 'Data Bus 6' },
      { id: 'd7', name: 'D7', x: 278.0, y: 307.0, type: 'digital', description: 'Data Bus 7' },
      { id: 'a', name: 'A', x: 295.0, y: 307.0, type: 'power', description: 'Backlight Anode (+5V)' },
      { id: 'k', name: 'K', x: 312.0, y: 307.0, type: 'ground', description: 'Backlight Cathode (GND)' },
    ],
  },

  'display-lcd2004-i2c': {
    type: 'display-lcd2004-i2c',
    name: 'LCD 20x4 (I2C)',
    category: 'displays',
    description: 'Layar karakter LCD 20 kolom x 4 baris dengan modul I2C backpack 4-pin (pitch 17.0px).',
    width: 625.0,
    height: 316.0,
    icon: 'Tv',
    pins: [
      { id: 'gnd', name: 'GND', x: 8.0, y: 55.5, type: 'ground', description: 'Ground' },
      { id: 'vcc', name: 'VCC', x: 8.0, y: 72.5, type: 'power', description: '5V Power Supply' },
      { id: 'sda', name: 'SDA', x: 8.0, y: 89.5, type: 'i2c', description: 'I2C Serial Data' },
      { id: 'scl', name: 'SCL', x: 8.0, y: 106.5, type: 'i2c', description: 'I2C Serial Clock' },
    ],
  },

  'display-oled': {
    type: 'display-oled',
    name: 'OLED 0.96" I2C',
    category: 'displays',
    description: 'Layar grafis monokrom OLED 128x64 dengan antarmuka I2C.',
    width: 186.4,
    height: 150.7,
    icon: 'Monitor',
    defaultProps: { oledTitle: 'IoT Sensor' },
    pins: [
      { id: 'gnd', name: 'GND', x: 67.7, y: 11.2, type: 'ground' },
      { id: 'vcc', name: 'VCC', x: 84.7, y: 11.2, type: 'power' },
      { id: 'scl', name: 'SCL', x: 101.7, y: 11.2, type: 'i2c' },
      { id: 'sda', name: 'SDA', x: 118.7, y: 11.2, type: 'i2c' },
    ],
  },

  'display-tm1637': {
    type: 'display-tm1637',
    name: '4-Digit Display (TM1637)',
    category: 'displays',
    description: 'Modul display 7-segment 4-digit dengan driver TM1637 dan antarmuka 2-wire (CLK, DIO).',
    width: 307.8,
    height: 153.9,
    icon: 'Tv',
    pins: [
      { id: 'clk', name: 'CLK', x: 306.9, y: 50.5, type: 'digital', description: 'Clock Input' },
      { id: 'dio', name: 'DIO', x: 306.9, y: 67.5, type: 'digital', description: 'Data I/O' },
      { id: 'vcc', name: 'VCC', x: 306.9, y: 84.5, type: 'power', description: 'Power 3.3V / 5V' },
      { id: 'gnd', name: 'GND', x: 306.9, y: 101.5, type: 'ground', description: 'Ground' },
    ],
  },

  
  
  'servo': {
    type: 'servo',
    name: 'SG90 Micro Servo',
    category: 'outputs',
    description: 'Motor servo miniatur 180 derajat dengan kabel 3-pin (Signal, VCC, GND).',
    width: 260,
    height: 95,
    icon: 'RotateCw',
    defaultProps: { servoAngle: 90 },
    pins: [
      { id: 'signal', name: 'Signal (Orange)', x: 5.0, y: 30.5, type: 'pwm', description: 'PWM Signal Input' },
      { id: 'vcc', name: 'VCC (Red)', x: 5.0, y: 47.5, type: 'power', description: 'Power 5V' },
      { id: 'gnd', name: 'GND (Brown)', x: 5.0, y: 64.5, type: 'ground', description: 'Ground' },
    ],
  },

  
  
  
  
  
  'display-tft-28': {
    type: 'display-tft-28',
    name: 'TFT LCD 2.8" SPI (ILI9341)',
    category: 'displays',
    description: 'Modul display warna TFT 2.8 inci resolusi 240x320 dengan driver ILI9341, antarmuka SPI 4-wire, dan pin header male.',
    width: 224,
    height: 370,
    icon: 'Tv',
    pins: [
      { id: 'vcc', name: 'VCC', x: 44.0, y: 358.0, type: 'power', description: 'Power Supply 3.3V / 5V' },
      { id: 'gnd', name: 'GND', x: 61.0, y: 358.0, type: 'ground', description: 'Ground (0V)' },
      { id: 'cs', name: 'CS', x: 78.0, y: 358.0, type: 'digital', description: 'LCD Chip Select (Active Low)' },
      { id: 'reset', name: 'RESET', x: 95.0, y: 358.0, type: 'digital', description: 'LCD Reset (Active Low)' },
      { id: 'dc', name: 'DC / RS', x: 112.0, y: 358.0, type: 'digital', description: 'Data / Command Selection' },
      { id: 'mosi', name: 'MOSI / SDI', x: 129.0, y: 358.0, type: 'digital', description: 'SPI Serial Data Input' },
      { id: 'sck', name: 'SCK', x: 146.0, y: 358.0, type: 'digital', description: 'SPI Serial Clock' },
      { id: 'led', name: 'LED / BL', x: 163.0, y: 358.0, type: 'power', description: 'Backlight Control (3.3V)' },
      { id: 'miso', name: 'MISO / SDO', x: 180.0, y: 358.0, type: 'digital', description: 'SPI Serial Data Output' },
    ],
  },

  'display-tft-28-touch': {
    type: 'display-tft-28-touch',
    name: 'TFT LCD 2.8" Touch Screen (Cap Touch)',
    category: 'displays',
    description: 'Modul display warna TFT 2.8 inci dengan Capacitive Touch Screen (I2C/SPI), driver ILI9341, dan 11-pin male header.',
    width: 258,
    height: 370,
    icon: 'Tv',
    pins: [
      { id: 'vcc', name: 'VCC', x: 44.0, y: 358.0, type: 'power', description: 'Power Supply 3.3V / 5V' },
      { id: 'gnd', name: 'GND', x: 61.0, y: 358.0, type: 'ground', description: 'Ground (0V)' },
      { id: 'cs', name: 'CS', x: 78.0, y: 358.0, type: 'digital', description: 'LCD Chip Select (Active Low)' },
      { id: 'reset', name: 'RESET', x: 95.0, y: 358.0, type: 'digital', description: 'LCD Reset (Active Low)' },
      { id: 'dc', name: 'DC / RS', x: 112.0, y: 358.0, type: 'digital', description: 'Data / Command Selection' },
      { id: 'mosi', name: 'MOSI / SDI', x: 129.0, y: 358.0, type: 'digital', description: 'SPI Serial Data Input' },
      { id: 'sck', name: 'SCK', x: 146.0, y: 358.0, type: 'digital', description: 'SPI Clock' },
      { id: 'led', name: 'LED / BL', x: 163.0, y: 358.0, type: 'power', description: 'Backlight Control (3.3V)' },
      { id: 'miso', name: 'MISO / SDO', x: 180.0, y: 358.0, type: 'digital', description: 'SPI Serial Data Output' },
      { id: 't_sda', name: 'T_SDA', x: 197.0, y: 358.0, type: 'i2c', description: 'Touch Controller I2C Data' },
      { id: 't_scl', name: 'T_SCL', x: 214.0, y: 358.0, type: 'i2c', description: 'Touch Controller I2C Clock' },
    ],
  },

  
  
  'battery-9v': {
    type: 'battery-9v',
    name: 'Baterai 9V',
    category: 'power',
    description: 'Sumber daya baterai kotak 9V dengan kancing snap.',
    width: 80,
    height: 130,
    icon: 'BatteryCharging',
    pins: [
      { id: 'pos', name: '+ (9V)', x: 28, y: 12, type: 'power' },
      { id: 'neg', name: '- (GND)', x: 52, y: 12, type: 'ground' },
    ],
  },

  
  'fitting-lamp': {
    type: 'fitting-lamp',
    name: 'Fitting Lampu (Bohlam LED)',
    category: 'outputs',
    description: 'Fitting lampu plafon/dinding dengan soket bohlam E27 dan 2 terminal sekrup logam (Fasa L & Netral N).',
    width: 170.0,
    height: 157.5,
    icon: 'Lightbulb',
    pins: [
      { id: 'term_l', name: 'L (Fasa)', x: 18.6, y: 77.7, type: 'power', description: 'Terminal Sekrup Kiri (Fasa / Live)' },
      { id: 'term_n', name: 'N (Netral)', x: 151.4, y: 77.7, type: 'passive', description: 'Terminal Sekrup Kanan (Netral / Neutral)' },
    ],
  },

  
  'steker-switch': {
    type: 'steker-switch',
    name: 'Steker Saklar Arde (Broco AC Plug)',
    category: 'power',
    description: 'Steker colokan AC 220V dengan saklar ON/OFF toggle, lampu indikator neon merah, serta 3 jalur kabel (Fasa L, Ground PE, Netral N).',
    width: 140.0,
    height: 174.0,
    icon: 'ToggleLeft',
    pins: [
      { id: 'cable_l', name: 'L (Fasa)', x: 66.0, y: 168.0, type: 'power', description: 'Kabel Fasa / Live (AC 220V Terkontrol Saklar ON/OFF)' },
      { id: 'cable_earth', name: 'PE (Arde)', x: 78.0, y: 168.0, type: 'ground', description: 'Kabel Ground / Pentanahan Beban' },
      { id: 'cable_n', name: 'N (Netral)', x: 90.0, y: 168.0, type: 'passive', description: 'Kabel Netral / Neutral (AC Return)' },
    ],
  },

  
  
  };

export const WIRE_COLORS = [
  { name: 'Red (5V / VCC)', value: '#ef4444' },
  { name: 'Black (GND)', value: '#1e293b' },
  { name: 'Sky / Cyan (Signal)', value: '#38bdf8' },
  { name: 'Emerald (Data / Good)', value: '#10b981' },
  { name: 'Yellow (Clock / SCL)', value: '#eab308' },
  { name: 'Amber / Orange (PWM)', value: '#f97316' },
  { name: 'Purple (SDA)', value: '#a855f7' },
  { name: 'White', value: '#f8fafc' },
  { name: 'Blue', value: '#3b82f6' },
];
