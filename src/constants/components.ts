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

// Generate ESP32 pins mapped to ESP32_30P.png
function createEsp32Pins(): Pin[] {
  const topLabels = [
    { id: 'vin', name: 'Vin (5V)', type: 'power' as const },
    { id: 'gnd1', name: 'GND', type: 'ground' as const },
    { id: 'd13', name: 'D13', type: 'digital' as const },
    { id: 'd12', name: 'D12', type: 'digital' as const },
    { id: 'd14', name: 'D14', type: 'digital' as const },
    { id: 'd27', name: 'D27', type: 'digital' as const },
    { id: 'd26', name: 'D26', type: 'digital' as const },
    { id: 'd25', name: 'D25', type: 'digital' as const },
    { id: 'd33', name: 'D33', type: 'digital' as const },
    { id: 'd32', name: 'D32', type: 'digital' as const },
    { id: 'd35', name: 'D35', type: 'digital' as const },
    { id: 'd34', name: 'D34', type: 'digital' as const },
    { id: 'vn', name: 'VN (39)', type: 'analog' as const },
    { id: 'vp', name: 'VP (36)', type: 'analog' as const },
    { id: 'en', name: 'EN (RST)', type: 'generic' as const },
  ];

  const botLabels = [
    { id: '3v3', name: '3V3', type: 'power' as const },
    { id: 'gnd2', name: 'GND', type: 'ground' as const },
    { id: 'd15', name: 'D15', type: 'digital' as const },
    { id: 'd2', name: 'D2 (LED)', type: 'digital' as const },
    { id: 'd4', name: 'D4', type: 'digital' as const },
    { id: 'rx2', name: 'RX2 (16)', type: 'digital' as const },
    { id: 'tx2', name: 'TX2 (17)', type: 'digital' as const },
    { id: 'd5', name: 'D5', type: 'digital' as const },
    { id: 'd18', name: 'D18 (SCK)', type: 'digital' as const },
    { id: 'd19', name: 'D19 (MISO)', type: 'digital' as const },
    { id: 'd21', name: 'D21 (SDA)', type: 'i2c' as const },
    { id: 'rx0', name: 'RX0 (3)', type: 'digital' as const },
    { id: 'tx0', name: 'TX0 (1)', type: 'digital' as const },
    { id: 'd22', name: 'D22 (SCL)', type: 'i2c' as const },
    { id: 'd23', name: 'D23 (MOSI)', type: 'digital' as const },
  ];

  const pins: Pin[] = [];
  const topStartX = 61.1;
  const botStartX = 61.0;
  const stepX = 15.776;

  topLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((topStartX + i * stepX) * 10) / 10,
      y: 9.3,
      type: item.type,
    });
  });

  botLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((botStartX + i * stepX) * 10) / 10,
      y: 167.0,
      type: item.type,
    });
  });

  return pins;
}

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
      { id: 'd1', name: 'D1 (TX)', x: 305.2, y: 11.5, type: 'digital', description: 'Digital Pin 1 (Serial TX)' },
      { id: 'd0', name: 'D0 (RX)', x: 316.8, y: 11.5, type: 'digital', description: 'Digital Pin 0 (Serial RX)' },

      // Bottom Power Headers
      { id: 'ioref', name: 'IOREF', x: 155.5, y: 230.4, type: 'power', description: 'I/O Reference Voltage' },
      { id: 'reset', name: 'RESET', x: 167.0, y: 230.4, type: 'generic', description: 'Active Low Reset' },
      { id: '3v3', name: '3.3V', x: 178.5, y: 230.4, type: 'power', description: '3.3V Power Output' },
      { id: '5v', name: '5V', x: 190.0, y: 230.4, type: 'power', description: '5V Regulated Power Output' },
      { id: 'gnd_bot1', name: 'GND', x: 201.6, y: 230.4, type: 'ground', description: 'Ground' },
      { id: 'gnd_bot2', name: 'GND', x: 213.1, y: 230.4, type: 'ground', description: 'Ground' },
      { id: 'vin', name: 'VIN', x: 224.6, y: 230.4, type: 'power', description: 'Voltage Input (7-12V)' },

      // Bottom Analog Headers
      { id: 'a0', name: 'A0', x: 259.2, y: 230.4, type: 'analog', description: 'Analog Input 0' },
      { id: 'a1', name: 'A1', x: 270.7, y: 230.4, type: 'analog', description: 'Analog Input 1' },
      { id: 'a2', name: 'A2', x: 282.2, y: 230.4, type: 'analog', description: 'Analog Input 2' },
      { id: 'a3', name: 'A3', x: 293.7, y: 230.4, type: 'analog', description: 'Analog Input 3' },
      { id: 'a4', name: 'A4', x: 305.2, y: 230.4, type: 'analog', description: 'Analog Input 4 / I2C SDA' },
      { id: 'a5', name: 'A5', x: 316.8, y: 230.4, type: 'analog', description: 'Analog Input 5 / I2C SCL' },
    ],
  },

  'esp32': {
    type: 'esp32',
    name: 'ESP32 DevKit V1 (30-Pin)',
    category: 'microcontrollers',
    description: 'Modul WiFi & Bluetooth 30-pin dengan dual-core Xtensa 32-bit.',
    width: 320,
    height: 176.3,
    icon: 'Radio',
    pins: createEsp32Pins(),
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

  'sensor-ultrasonic': {
    type: 'sensor-ultrasonic',
    name: 'HC-SR04 Ultrasonic',
    category: 'sensors',
    description: 'Sensor jarak ultrasonik 2cm - 400cm 4-pin standar breadboard (pitch 17.0px).',
    width: 300.0,
    height: 165.6,
    icon: 'Radar',
    pins: [
      { id: 'vcc', name: 'VCC', x: 126.1, y: 163.5, type: 'power', description: '5V Power' },
      { id: 'trig', name: 'Trig', x: 143.1, y: 163.5, type: 'digital', description: 'Trigger Pin' },
      { id: 'echo', name: 'Echo', x: 160.1, y: 163.5, type: 'digital', description: 'Echo Pin' },
      { id: 'gnd', name: 'GND', x: 177.1, y: 163.5, type: 'ground', description: 'Ground' },
    ],
  },

  'sensor-dht11': {
    type: 'sensor-dht11',
    name: 'DHT11 Temp & Humidity',
    category: 'sensors',
    description: 'Sensor suhu dan kelembaban udara digital.',
    width: 60,
    height: 90,
    icon: 'Thermometer',
    pins: [
      { id: 'vcc', name: 'VCC', x: 12, y: 82, type: 'power' },
      { id: 'data', name: 'DATA', x: 24, y: 82, type: 'digital' },
      { id: 'nc', name: 'NC', x: 36, y: 82, type: 'generic' },
      { id: 'gnd', name: 'GND', x: 48, y: 82, type: 'ground' },
    ],
  },

  'sensor-dht22': {
    type: 'sensor-dht22',
    name: 'DHT22 (No Module)',
    category: 'sensors',
    description: 'Sensor suhu & kelembaban presisi tinggi 4-pin standar breadboard (pitch 17.0px).',
    width: 101.3,
    height: 207.0,
    icon: 'Thermometer',
    pins: [
      { id: 'vcc', name: 'VCC', x: 26.5, y: 205.0, type: 'power', description: 'Power 3.3V - 5V' },
      { id: 'data', name: 'DATA', x: 43.5, y: 205.0, type: 'digital', description: 'Serial Data' },
      { id: 'nc', name: 'NC', x: 60.5, y: 205.0, type: 'generic', description: 'Not Connected' },
      { id: 'gnd', name: 'GND', x: 77.5, y: 205.0, type: 'ground', description: 'Ground' },
    ],
  },

  'sensor-dht22-module': {
    type: 'sensor-dht22-module',
    name: 'DHT22 (Module)',
    category: 'sensors',
    description: 'Modul sensor suhu & kelembaban presisi dengan breakout board 3-pin (pitch 17.0px).',
    width: 97.4,
    height: 269.4,
    icon: 'Thermometer',
    pins: [
      { id: 'vcc', name: 'VCC (+)', x: 32.7, y: 269.4, type: 'power', description: 'Power 3.3V - 5V' },
      { id: 'data', name: 'DATA (out)', x: 49.7, y: 269.4, type: 'digital', description: 'Serial Data' },
      { id: 'gnd', name: 'GND (-)', x: 66.7, y: 269.4, type: 'ground', description: 'Ground' },
    ],
  },

  'sensor-rfid-rc522': {
    type: 'sensor-rfid-rc522',
    name: 'RFID-RC522 (Reader Module)',
    category: 'sensors',
    description: 'Modul pembaca kartu & tag RFID 13.56MHz antarmuka SPI 8-pin presisi breadboard (pitch 17.0px).',
    width: 272.0,
    height: 422.0,
    icon: 'Radio',
    pins: [
      { id: 'sda', name: 'SDA (SS)', x: 76.5, y: 422.0, type: 'digital', description: 'SPI Slave Select / Chip Select' },
      { id: 'sck', name: 'SCK', x: 93.5, y: 422.0, type: 'digital', description: 'SPI Serial Clock' },
      { id: 'mosi', name: 'MOSI', x: 110.5, y: 422.0, type: 'digital', description: 'SPI Master Out Slave In' },
      { id: 'miso', name: 'MISO', x: 127.5, y: 422.0, type: 'digital', description: 'SPI Master In Slave Out' },
      { id: 'irq', name: 'IRQ', x: 144.5, y: 422.0, type: 'digital', description: 'Interrupt Request' },
      { id: 'gnd', name: 'GND', x: 161.5, y: 422.0, type: 'ground', description: 'Power Ground (0V)' },
      { id: 'rst', name: 'RST', x: 178.5, y: 422.0, type: 'digital', description: 'Reset Pin' },
      { id: '3v3', name: '3.3V (VCC)', x: 195.5, y: 422.0, type: 'power', description: 'Power Supply (3.3V Only)' },
    ],
  },

  'sensor-soil-moisture': {
    type: 'sensor-soil-moisture',
    name: 'Soil Moisture Sensor (FC-28 / YL-69)',
    category: 'sensors',
    description: 'Sensor kelembaban tanah satu set modul FC-28 probe emas & komparator LM393 4-pin breadboard (pitch 17.0px).',
    width: 260.0,
    height: 316.0,
    icon: 'Droplets',
    pins: [
      { id: 'a0', name: 'AO', x: 169.5, y: 302.0, type: 'analog', description: 'Analog Output (Kelembaban Tanah 0-1023)' },
      { id: 'd0', name: 'DO', x: 186.5, y: 302.0, type: 'digital', description: 'Digital Output (Threshold Komparator LM393)' },
      { id: 'gnd', name: 'GND', x: 203.5, y: 302.0, type: 'ground', description: 'Ground (0V)' },
      { id: 'vcc', name: 'VCC', x: 220.5, y: 302.0, type: 'power', description: 'Power Supply (3.3V - 5V)' },
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

  'buzzer': {
    type: 'buzzer',
    name: 'Piezo Buzzer',
    category: 'outputs',
    description: 'Buzzer audio penghasil nada frekuensi.',
    width: 81,
    height: 81,
    icon: 'Volume2',
    pins: [
      { id: 'pos', name: 'Positive (+)', x: 15, y: 40.5, type: 'digital' },
      { id: 'neg', name: 'Negative (-)', x: 66, y: 40.5, type: 'ground' },
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

  'relay': {
    type: 'relay',
    name: 'Modul Relay 1-Channel (5V Blue)',
    category: 'outputs',
    description: 'Modul saklar relay elektromekanik 1-channel dengan proteksi optocoupler, pin metalik horizontal & terminal sekrup.',
    width: 256,
    height: 104,
    icon: 'ToggleLeft',
    pins: [
      // Control input header metalik horizontal (kanan) - pitch 17.0px breadboard aligned
      { id: 'in', name: 'IN', x: 252.0, y: 35.0, type: 'digital', description: 'Signal Input (Trigger)' },
      { id: 'gnd', name: 'GND', x: 252.0, y: 52.0, type: 'ground', description: 'Ground (0V)' },
      { id: 'vcc', name: 'VCC', x: 252.0, y: 69.0, type: 'power', description: 'Power VCC (5V)' },
      // Screw load terminals (kiri)
      { id: 'no', name: 'NO', x: 43.0, y: 21.5, type: 'passive', description: 'Normally Open (NO)' },
      { id: 'com', name: 'COM', x: 43.0, y: 52.0, type: 'passive', description: 'Common (COM)' },
      { id: 'nc', name: 'NC', x: 43.0, y: 82.5, type: 'passive', description: 'Normally Closed (NC)' },
    ],
  },

  'relay-black': {
    type: 'relay-black',
    name: 'Modul Relay 1-Channel (Black KY-019)',
    category: 'outputs',
    description: 'Modul saklar relay 5V vertikal dengan kaki pin metalik 3-pin (S, +, -) dan terminal beban sekrup.',
    width: 160,
    height: 228,
    icon: 'ToggleLeft',
    pins: [
      // Control input header metalik (bawah) - pitch 17.0px breadboard aligned
      { id: 'signal', name: 'S (Signal)', x: 79.0, y: 222.0, type: 'digital', description: 'Trigger Signal Input' },
      { id: 'vcc', name: '+ (VCC 5V)', x: 96.0, y: 222.0, type: 'power', description: 'Power 5V' },
      { id: 'gnd', name: '- (GND)', x: 113.0, y: 222.0, type: 'ground', description: 'Ground (0V)' },
      // Screw load terminals (atas)
      { id: 'nc', name: 'NC', x: 59.0, y: 35.0, type: 'passive', description: 'Normally Closed (NC)' },
      { id: 'com', name: 'COM', x: 86.0, y: 35.0, type: 'passive', description: 'Common (COM)' },
      { id: 'no', name: 'NO', x: 113.0, y: 35.0, type: 'passive', description: 'Normally Open (NO)' },
    ],
  },

  'relay-red': {
    type: 'relay-red',
    name: 'Modul Relay 1-Channel (Red Optocoupler)',
    category: 'outputs',
    description: 'Modul saklar relay 5V dengan isolasi optocoupler, jumper pemilih High/Low level trigger, dan terminal sekrup ganda.',
    width: 220,
    height: 110,
    icon: 'ToggleLeft',
    pins: [
      // Sisi Kiri: Terminal Sekrup Input Kontrol (DC+, DC-, IN)
      { id: 'vcc', name: 'DC+ (VCC)', x: 18.1, y: 32.7, type: 'power', description: 'Power Supply 5V (DC+)' },
      { id: 'gnd', name: 'DC- (GND)', x: 18.1, y: 54.2, type: 'ground', description: 'Ground (DC-)' },
      { id: 'in', name: 'IN (Trigger)', x: 18.1, y: 75.0, type: 'digital', description: 'Trigger Signal Input (High/Low selectable)' },

      // Sisi Kanan: Terminal Sekrup Beban Output (NC, COM, NO)
      { id: 'nc', name: 'NC', x: 202.3, y: 33.0, type: 'passive', description: 'Normally Closed (NC)' },
      { id: 'com', name: 'COM', x: 202.3, y: 54.5, type: 'passive', description: 'Common Terminal (COM)' },
      { id: 'no', name: 'NO', x: 202.3, y: 75.4, type: 'passive', description: 'Normally Open (NO)' },
    ],
  },

  'rtc-ds3231': {
    type: 'rtc-ds3231',
    name: 'Modul RTC DS3231 (I2C)',
    category: 'sensors',
    description: 'Modul Real-Time Clock presisi tinggi chip DS3231 dengan EEPROM AT24C32, antarmuka I2C dan kaki pin metalik.',
    width: 258,
    height: 153,
    icon: 'Clock',
    pins: [
      // Kanan: Port I2C Utama (Kaki Pin Metalik Horizontal) - Pitch 17.0px
      { id: 'scl', name: 'SCL', x: 256.0, y: 51.0, type: 'i2c', description: 'I2C Serial Clock' },
      { id: 'sda', name: 'SDA', x: 256.0, y: 68.0, type: 'i2c', description: 'I2C Serial Data' },
      { id: 'vcc', name: 'VCC', x: 256.0, y: 85.0, type: 'power', description: 'Power 3.3V - 5.5V' },
      { id: 'gnd', name: 'GND', x: 256.0, y: 102.0, type: 'ground', description: 'Ground (0V)' },

      // Kiri: Port Tambahan (Kaki Pin Metalik Horizontal) - Pitch 17.0px
      { id: 'pin32k', name: '32K', x: 2.0, y: 34.0, type: 'digital', description: '32.768 kHz Output' },
      { id: 'sqw', name: 'SQW', x: 2.0, y: 51.0, type: 'digital', description: 'Square Wave / Alarm Interrupt' },
      { id: 'scl_l', name: 'SCL (L)', x: 2.0, y: 68.0, type: 'i2c', description: 'I2C Serial Clock (Pass-through)' },
      { id: 'sda_l', name: 'SDA (L)', x: 2.0, y: 85.0, type: 'i2c', description: 'I2C Serial Data (Pass-through)' },
      { id: 'vcc_l', name: 'VCC (L)', x: 2.0, y: 102.0, type: 'power', description: 'Power Supply (Pass-through)' },
      { id: 'gnd_l', name: 'GND (L)', x: 2.0, y: 119.0, type: 'ground', description: 'Ground (Pass-through)' },
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

  'keypad-3x4': {
    type: 'keypad-3x4',
    name: 'Keypad Matriks 3x4 (Membrane)',
    category: 'passives',
    description: 'Modul keypad membran 12-tombol matriks (0-9, *, #) dengan kabel fleksibel dan header 7-pin (4 Baris, 3 Kolom).',
    width: 240,
    height: 400,
    icon: 'Grid',
    pins: [
      // 4 Baris (Rows)
      { id: 'r1', name: 'R1', x: 69.0, y: 394.0, type: 'digital', description: 'Row 1 (Tombol 1, 2, 3)' },
      { id: 'r2', name: 'R2', x: 86.0, y: 394.0, type: 'digital', description: 'Row 2 (Tombol 4, 5, 6)' },
      { id: 'r3', name: 'R3', x: 103.0, y: 394.0, type: 'digital', description: 'Row 3 (Tombol 7, 8, 9)' },
      { id: 'r4', name: 'R4', x: 120.0, y: 394.0, type: 'digital', description: 'Row 4 (Tombol *, 0, #)' },

      // 3 Kolom (Columns)
      { id: 'c1', name: 'C1', x: 137.0, y: 394.0, type: 'digital', description: 'Column 1 (Tombol 1, 4, 7, *)' },
      { id: 'c2', name: 'C2', x: 154.0, y: 394.0, type: 'digital', description: 'Column 2 (Tombol 2, 5, 8, 0)' },
      { id: 'c3', name: 'C3', x: 171.0, y: 394.0, type: 'digital', description: 'Column 3 (Tombol 3, 6, 9, #)' },
    ],
  },

  'keypad-4x4': {
    type: 'keypad-4x4',
    name: 'Keypad Matriks 4x4 (Membrane)',
    category: 'passives',
    description: 'Modul keypad membran 16-tombol matriks (0-9, A-D, *, #) dengan kabel fleksibel dan header 8-pin (4 Baris, 4 Kolom).',
    width: 280,
    height: 400,
    icon: 'Grid',
    pins: [
      // 4 Baris (Rows)
      { id: 'r1', name: 'R1', x: 80.5, y: 394.0, type: 'digital', description: 'Row 1 (Tombol 1, 2, 3, A)' },
      { id: 'r2', name: 'R2', x: 97.5, y: 394.0, type: 'digital', description: 'Row 2 (Tombol 4, 5, 6, B)' },
      { id: 'r3', name: 'R3', x: 114.5, y: 394.0, type: 'digital', description: 'Row 3 (Tombol 7, 8, 9, C)' },
      { id: 'r4', name: 'R4', x: 131.5, y: 394.0, type: 'digital', description: 'Row 4 (Tombol *, 0, #, D)' },

      // 4 Kolom (Columns)
      { id: 'c1', name: 'C1', x: 148.5, y: 394.0, type: 'digital', description: 'Column 1 (Tombol 1, 4, 7, *)' },
      { id: 'c2', name: 'C2', x: 165.5, y: 394.0, type: 'digital', description: 'Column 2 (Tombol 2, 5, 8, 0)' },
      { id: 'c3', name: 'C3', x: 182.5, y: 394.0, type: 'digital', description: 'Column 3 (Tombol 3, 6, 9, #)' },
      { id: 'c4', name: 'C4', x: 199.5, y: 394.0, type: 'digital', description: 'Column 4 (Tombol A, B, C, D)' },
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

  'buck-converter-lm2596s': {
    type: 'buck-converter-lm2596s',
    name: 'Buck Converter LM2596S',
    category: 'power',
    description: 'Modul penurun tegangan DC-DC Step-Down Buck Converter berbasis IC LM2596S dengan trimpot multiturn presisi.',
    width: 300.0,
    height: 146.7,
    icon: 'Zap',
    pins: [
      { id: 'in_plus', name: 'IN+', x: 11.3, y: 11.3, type: 'power', description: 'Input Voltage Positive (+3.2V - 40V DC)' },
      { id: 'in_minus', name: 'IN-', x: 11.3, y: 135.0, type: 'ground', description: 'Input Ground (0V)' },
      { id: 'out_plus', name: 'OUT+', x: 288.3, y: 11.3, type: 'power', description: 'Output Voltage Positive (+1.25V - 35V DC)' },
      { id: 'out_minus', name: 'OUT-', x: 288.3, y: 135.0, type: 'ground', description: 'Output Ground (0V)' },
    ],
  },

  'psu-smps-12v': {
    type: 'psu-smps-12v',
    name: 'PSU SMPS 12V (Switching)',
    category: 'power',
    description: 'Catu daya switching jaring metal enclosure (SMPS) input AC 100-240V, output DC 12V dengan 5-terminal sekrup (L, N, Earth, -V, +V).',
    width: 220.0,
    height: 340.0,
    icon: 'Zap',
    pins: [
      { id: 'ac_l', name: 'L (Live)', x: 46.1, y: 305.7, type: 'power', description: 'AC 100-240V Input Live / Fasa' },
      { id: 'ac_n', name: 'N (Neutral)', x: 74.8, y: 305.7, type: 'passive', description: 'AC 100-240V Input Netral' },
      { id: 'earth', name: 'FG (Earth)', x: 101.9, y: 305.7, type: 'ground', description: 'Frame Ground / Arde Pentanahan Sasis' },
      { id: 'v_minus', name: '-V (GND)', x: 129.3, y: 305.7, type: 'ground', description: 'DC Output 0V (Ground / Return)' },
      { id: 'v_plus', name: '+V (+12V)', x: 155.8, y: 305.7, type: 'power', description: 'DC Output Positive (+12V DC)' },
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

  'ac-outlet': {
    type: 'ac-outlet',
    name: 'Stopkontak AC (Schuko Outlet)',
    category: 'power',
    description: 'Stopkontak dinding/plafon AC 220V Schuko Tipe F dengan 2 lubang colokan steker (Fasa L & Netral N), klip grounding arde atas/bawah, serta terminal sekrup kabel samping.',
    width: 170.0,
    height: 165.3,
    icon: 'Plug',
    pins: [
      { id: 'socket_l', name: 'L (Colokan Fasa)', x: 62.3, y: 79.3, type: 'power', description: 'Lubang Colokan Kiri (Fasa / Live - 220V AC)' },
      { id: 'socket_n', name: 'N (Colokan Netral)', x: 107.2, y: 79.3, type: 'passive', description: 'Lubang Colokan Kanan (Netral / Neutral - AC Return)' },
      { id: 'earth_top', name: 'PE (Arde Atas)', x: 85.0, y: 38.5, type: 'ground', description: 'Klip Pentanahan / Grounding Arde Atas' },
      { id: 'earth_bottom', name: 'PE (Arde Bawah)', x: 85.0, y: 119.2, type: 'ground', description: 'Klip Pentanahan / Grounding Arde Bawah' },
      { id: 'term_l', name: 'L (Terminal Sekrup)', x: 16.4, y: 81.8, type: 'power', description: 'Terminal Sekrup Kabel Kiri (Fasa / Live)' },
      { id: 'term_n', name: 'N (Terminal Sekrup)', x: 153.6, y: 81.8, type: 'passive', description: 'Terminal Sekrup Kabel Kanan (Netral / Neutral)' },
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
