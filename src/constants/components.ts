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
function createEsp32_38P_CP2102Pins(): Pin[] {
  const leftLabels = [
    { id: '3v3', name: '3V3', type: 'power' as const, description: '3.3V Power Output (dari LDO Onboard)' },
    { id: 'en', name: 'EN', type: 'generic' as const, description: 'Enable / Reset (CHIP_PU, Active Low)' },
    { id: 'sp', name: 'SP (VP)', type: 'analog' as const, description: 'GPIO36 / SENSOR_VP / ADC1_CH0 (Input Only)' },
    { id: 'sn', name: 'SN (VN)', type: 'analog' as const, description: 'GPIO39 / SENSOR_VN / ADC1_CH3 (Input Only)' },
    { id: 'g34', name: 'G34', type: 'analog' as const, description: 'GPIO34 / ADC1_CH6 (Input Only)' },
    { id: 'g35', name: 'G35', type: 'analog' as const, description: 'GPIO35 / ADC1_CH7 (Input Only)' },
    { id: 'g32', name: 'G32', type: 'analog' as const, description: 'GPIO32 / ADC1_CH4 / Touch 9' },
    { id: 'g33', name: 'G33', type: 'analog' as const, description: 'GPIO33 / ADC1_CH5 / Touch 8' },
    { id: 'g25', name: 'G25', type: 'analog' as const, description: 'GPIO25 / DAC1 / ADC2_CH8' },
    { id: 'g26', name: 'G26', type: 'analog' as const, description: 'GPIO26 / DAC2 / ADC2_CH9' },
    { id: 'g27', name: 'G27', type: 'digital' as const, description: 'GPIO27 / ADC2_CH7 / Touch 7' },
    { id: 'g14', name: 'G14', type: 'spi' as const, description: 'GPIO14 / HSPI_CLK / ADC2_CH6 / Touch 6' },
    { id: 'g12', name: 'G12', type: 'spi' as const, description: 'GPIO12 / HSPI_MISO / ADC2_CH5 / Touch 5' },
    { id: 'gnd_left', name: 'GND', type: 'ground' as const, description: 'Power Ground (0V)' },
    { id: 'g13', name: 'G13', type: 'spi' as const, description: 'GPIO13 / HSPI_MOSI / ADC2_CH4 / Touch 4' },
    { id: 'sd2', name: 'SD2', type: 'spi' as const, description: 'GPIO9 / SPI FLASH D2 (Reserved)' },
    { id: 'sd3', name: 'SD3', type: 'spi' as const, description: 'GPIO10 / SPI FLASH D3 (Reserved)' },
    { id: 'cmd', name: 'CMD', type: 'spi' as const, description: 'GPIO11 / SPI FLASH CMD (Reserved)' },
    { id: '5v', name: '5V (VIN)', type: 'power' as const, description: '5V Power Input (USB VBUS / External 5V)' },
  ];

  const rightLabels = [
    { id: 'gnd_right1', name: 'GND', type: 'ground' as const, description: 'Power Ground (0V)' },
    { id: 'g23', name: 'G23', type: 'spi' as const, description: 'GPIO23 / VSPI_MOSI (SPI Master Out)' },
    { id: 'g22', name: 'G22', type: 'i2c' as const, description: 'GPIO22 / I2C SCL (Wire Clock)' },
    { id: 'txd', name: 'TXD (TX0)', type: 'uart' as const, description: 'GPIO1 / UART0 TX (Serial Transmit)' },
    { id: 'rxd', name: 'RXD (RX0)', type: 'uart' as const, description: 'GPIO3 / UART0 RX (Serial Receive)' },
    { id: 'g21', name: 'G21', type: 'i2c' as const, description: 'GPIO21 / I2C SDA (Wire Data)' },
    { id: 'gnd_right2', name: 'GND', type: 'ground' as const, description: 'Power Ground (0V)' },
    { id: 'g19', name: 'G19', type: 'spi' as const, description: 'GPIO19 / VSPI_MISO (SPI Master In)' },
    { id: 'g18', name: 'G18', type: 'spi' as const, description: 'GPIO18 / VSPI_CLK (SPI Clock)' },
    { id: 'g5', name: 'G5', type: 'digital' as const, description: 'GPIO5 / VSPI_CS (SPI Chip Select)' },
    { id: 'g17', name: 'G17', type: 'uart' as const, description: 'GPIO17 / UART2 TX' },
    { id: 'g16', name: 'G16', type: 'uart' as const, description: 'GPIO16 / UART2 RX' },
    { id: 'g4', name: 'G4', type: 'analog' as const, description: 'GPIO4 / ADC2_CH0 / Touch 0' },
    { id: 'g0', name: 'G0', type: 'digital' as const, description: 'GPIO0 / Boot Strapping / Touch 1' },
    { id: 'g2', name: 'G2', type: 'digital' as const, description: 'GPIO2 / Onboard LED / Touch 2' },
    { id: 'g15', name: 'G15', type: 'spi' as const, description: 'GPIO15 / HSPI_CS / Touch 3' },
    { id: 'sd1', name: 'SD1', type: 'spi' as const, description: 'GPIO8 / SPI FLASH D1 (Reserved)' },
    { id: 'sd0', name: 'SD0', type: 'spi' as const, description: 'GPIO7 / SPI FLASH D0 (Reserved)' },
    { id: 'clk', name: 'CLK', type: 'spi' as const, description: 'GPIO6 / SPI FLASH SCK (Reserved)' },
  ];

  const pins: Pin[] = [];
  const startY = 25.0;
  const stepY = 17.0; // Breadboard Grid Pitch

  leftLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: 10.8,
      y: Math.round((startY + i * stepY) * 10) / 10,
      type: item.type,
      description: item.description,
    });
  });

  rightLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: 180.8,
      y: Math.round((startY + i * stepY) * 10) / 10,
      type: item.type,
      description: item.description,
    });
  });

  return pins;
}

// Generate ESP32-C3 Supermini (RISC-V) 16-pin layout mapped to official 2D visual
function createEsp32C3SuperminiPins(): Pin[] {
  const topLabels = [
    { id: '5v', name: '5V', type: 'power' as const, description: '5V Power Input (VBUS / External 5V)' },
    { id: 'gnd', name: 'G (GND)', type: 'ground' as const, description: 'Power Ground (0V)' },
    { id: '3v3', name: '3.3V', type: 'power' as const, description: '3.3V Power Output (LDO Onboard)' },
    { id: 'rst', name: 'RST', type: 'generic' as const, description: 'Reset (CHIP_EN, Active Low)' },
    { id: 'io4', name: 'IO4', type: 'analog' as const, description: 'GPIO4 / ADC1_CH4 / FSPIHD' },
    { id: 'io3', name: 'IO3', type: 'analog' as const, description: 'GPIO3 / ADC1_CH3' },
    { id: 'io2', name: 'IO2', type: 'digital' as const, description: 'GPIO2 / ADC1_CH2 / FSPIQ' },
    { id: 'io0', name: 'IO0', type: 'analog' as const, description: 'GPIO0 / ADC1_CH0 / Boot Strapping' },
  ];

  const botLabels = [
    { id: 'io9', name: 'IO9 (BOOT)', type: 'digital' as const, description: 'GPIO9 / BOOT Button / Pull-up' },
    { id: 'io8', name: 'IO8 (LED)', type: 'digital' as const, description: 'GPIO8 / Onboard Blue LED' },
    { id: 'io5', name: 'IO5', type: 'digital' as const, description: 'GPIO5 / JTAG MTCK' },
    { id: 'io6', name: 'IO6', type: 'spi' as const, description: 'GPIO6 / FSPICLK (SPI Clock)' },
    { id: 'io7', name: 'IO7', type: 'spi' as const, description: 'GPIO7 / FSPID (SPI MOSI)' },
    { id: 'io10', name: 'IO10', type: 'spi' as const, description: 'GPIO10 / FSPICS0 (SPI CS)' },
    { id: 'io20', name: 'IO20 (RX)', type: 'uart' as const, description: 'GPIO20 / UART0 RX / USB D+' },
    { id: 'io21', name: 'IO21 (TX)', type: 'uart' as const, description: 'GPIO21 / UART0 TX / USB D-' },
  ];

  const pins: Pin[] = [];
  const startX = 24.7;
  const stepX = 17.0; // Breadboard Grid Pitch

  topLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((startX + i * stepX) * 10) / 10,
      y: 9.4,
      type: item.type,
      description: item.description,
    });
  });

  botLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((startX + i * stepX) * 10) / 10,
      y: 116.1,
      type: item.type,
      description: item.description,
    });
  });

  return pins;
}

// Generate Wemos D1 Mini (ESP8266) 16-pin layout mapped to official 2D visual
function createWemosD1MiniPins(): Pin[] {
  const topLabels = [
    { id: '3v3', name: '3V3', type: 'power' as const, description: '3.3V Power Output' },
    { id: 'd8', name: 'D8 (CS)', type: 'spi' as const, description: 'GPIO15 / SPI CS / Boot selector' },
    { id: 'd7', name: 'D7 (MOSI)', type: 'spi' as const, description: 'GPIO13 / SPI MOSI' },
    { id: 'd6', name: 'D6 (MISO)', type: 'spi' as const, description: 'GPIO12 / SPI MISO' },
    { id: 'd5', name: 'D5 (SCK)', type: 'spi' as const, description: 'GPIO14 / SPI SCK / Clock' },
    { id: 'd0', name: 'D0', type: 'digital' as const, description: 'GPIO16 / Deep-Sleep Wake' },
    { id: 'a0', name: 'A0', type: 'analog' as const, description: 'Analog Input (ADC0, 0-3.3V)' },
    { id: 'rst', name: 'RST', type: 'generic' as const, description: 'Reset (Active Low)' },
  ];

  const botLabels = [
    { id: '5v', name: '5V', type: 'power' as const, description: '5V Power Input (USB VBUS)' },
    { id: 'gnd', name: 'G (GND)', type: 'ground' as const, description: 'Ground' },
    { id: 'd4', name: 'D4 (LED)', type: 'pwm' as const, description: 'GPIO2 / Built-in Blue LED / PWM' },
    { id: 'd3', name: 'D3', type: 'pwm' as const, description: 'GPIO0 / Flash button / 10k Pull-up / PWM' },
    { id: 'd2', name: 'D2 (SDA)', type: 'i2c' as const, description: 'GPIO4 / I2C SDA' },
    { id: 'd1', name: 'D1 (SCL)', type: 'i2c' as const, description: 'GPIO5 / I2C SCL' },
    { id: 'rx', name: 'RX', type: 'uart' as const, description: 'GPIO3 / UART0 RX' },
    { id: 'tx', name: 'TX', type: 'uart' as const, description: 'GPIO1 / UART0 TX' },
  ];

  const pins: Pin[] = [];
  const startX = 61.3;
  const stepX = 17.0; // Breadboard Grid Pitch

  topLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((startX + i * stepX) * 10) / 10,
      y: 9.9,
      type: item.type,
      description: item.description,
    });
  });

  botLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((startX + i * stepX) * 10) / 10,
      y: 162.9,
      type: item.type,
      description: item.description,
    });
  });

  return pins;
}

// Generate NodeMCU ESP8266 V1 (Amica CP2102) 30-pin layout mapped to official 2D visual
function createNodeMcuPins(): Pin[] {
  const topLabels = [
    { id: 'd0', name: 'D0', type: 'digital' as const, description: 'GPIO16 / WAKE (Deep Sleep)' },
    { id: 'd1', name: 'D1 (SCL)', type: 'i2c' as const, description: 'GPIO5 / I2C SCL' },
    { id: 'd2', name: 'D2 (SDA)', type: 'i2c' as const, description: 'GPIO4 / I2C SDA' },
    { id: 'd3', name: 'D3', type: 'pwm' as const, description: 'GPIO0 / Flash button / 10k Pull-up / PWM' },
    { id: 'd4', name: 'D4 (LED)', type: 'pwm' as const, description: 'GPIO2 / Built-in Blue LED / PWM' },
    { id: '3v3_top1', name: '3V3', type: 'power' as const, description: '3.3V Power Output' },
    { id: 'gnd_top1', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: 'd5', name: 'D5 (SCK)', type: 'spi' as const, description: 'GPIO14 / SPI SCK / HSCLK' },
    { id: 'd6', name: 'D6 (MISO)', type: 'spi' as const, description: 'GPIO12 / SPI MISO / HMISO' },
    { id: 'd7', name: 'D7 (MOSI)', type: 'spi' as const, description: 'GPIO13 / SPI MOSI / HMOSI' },
    { id: 'd8', name: 'D8 (CS)', type: 'spi' as const, description: 'GPIO15 / SPI CS / HCS / Boot selector' },
    { id: 'rx', name: 'RX', type: 'uart' as const, description: 'GPIO3 / UART0 RX / USB Serial' },
    { id: 'tx', name: 'TX', type: 'uart' as const, description: 'GPIO1 / UART0 TX / USB Serial' },
    { id: 'gnd_top2', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: '3v3_top2', name: '3V3', type: 'power' as const, description: '3.3V Power Output' },
  ];

  const botLabels = [
    { id: 'a0', name: 'A0', type: 'analog' as const, description: 'Analog Input (ADC0, 0-3.3V via onboard divider)' },
    { id: 'rsv1', name: 'RSV', type: 'generic' as const, description: 'Reserved Pin' },
    { id: 'rsv2', name: 'RSV', type: 'generic' as const, description: 'Reserved Pin' },
    { id: 'sd3', name: 'SD3', type: 'generic' as const, description: 'GPIO10 / SPI Flash D3' },
    { id: 'sd2', name: 'SD2', type: 'generic' as const, description: 'GPIO9 / SPI Flash D2' },
    { id: 'sd1', name: 'SD1', type: 'generic' as const, description: 'GPIO8 / SPI Flash D1 (MOSI)' },
    { id: 'cmd', name: 'CMD', type: 'generic' as const, description: 'GPIO11 / SPI Flash CMD (CS)' },
    { id: 'sd0', name: 'SD0', type: 'generic' as const, description: 'GPIO7 / SPI Flash D0 (MISO)' },
    { id: 'clk', name: 'CLK', type: 'generic' as const, description: 'GPIO6 / SPI Flash SCLK' },
    { id: 'gnd_bot1', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: '3v3_bot', name: '3V3', type: 'power' as const, description: '3.3V Power Output' },
    { id: 'en', name: 'EN', type: 'generic' as const, description: 'Chip Enable / CH_PD (Active High)' },
    { id: 'rst', name: 'RST', type: 'generic' as const, description: 'Reset Pin (Active Low)' },
    { id: 'gnd_bot2', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: 'vin', name: 'VIN', type: 'power' as const, description: 'Power Input (5V via Micro-USB or External 5-9V DC)' },
  ];

  const pins: Pin[] = [];
  const startX = 42.2;
  const stepX = 17.0; // Exact Breadboard Grid Pitch

  topLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((startX + i * stepX) * 10) / 10,
      y: 8.0,
      type: item.type,
      description: item.description,
    });
  });

  botLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((startX + i * stepX) * 10) / 10,
      y: 195.0,
      type: item.type,
      description: item.description,
    });
  });

  return pins;
}

// Generate NodeMCU ESP8266 V3 (LoLin CH340) 30-pin layout mapped to official 2D visual
function createNodeMcuCh340Pins(): Pin[] {
  const topLabels = [
    { id: 'd0', name: 'D0', type: 'digital' as const, description: 'GPIO16 / WAKE (Deep Sleep)' },
    { id: 'd1', name: 'D1 (SCL)', type: 'i2c' as const, description: 'GPIO5 / I2C SCL' },
    { id: 'd2', name: 'D2 (SDA)', type: 'i2c' as const, description: 'GPIO4 / I2C SDA' },
    { id: 'd3', name: 'D3', type: 'pwm' as const, description: 'GPIO0 / Flash button / 10k Pull-up / PWM' },
    { id: 'd4', name: 'D4 (LED)', type: 'pwm' as const, description: 'GPIO2 / Built-in Blue LED / PWM' },
    { id: '3v3_top1', name: '3V3', type: 'power' as const, description: '3.3V Power Output' },
    { id: 'gnd_top1', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: 'd5', name: 'D5 (SCK)', type: 'spi' as const, description: 'GPIO14 / SPI SCK / HSCLK' },
    { id: 'd6', name: 'D6 (MISO)', type: 'spi' as const, description: 'GPIO12 / SPI MISO / HMISO' },
    { id: 'd7', name: 'D7 (MOSI)', type: 'spi' as const, description: 'GPIO13 / SPI MOSI / HMOSI' },
    { id: 'd8', name: 'D8 (CS)', type: 'spi' as const, description: 'GPIO15 / SPI CS / HCS / Boot selector' },
    { id: 'rx', name: 'RX', type: 'uart' as const, description: 'GPIO3 / UART0 RX / USB Serial' },
    { id: 'tx', name: 'TX', type: 'uart' as const, description: 'GPIO1 / UART0 TX / USB Serial' },
    { id: 'gnd_top2', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: '3v3_top2', name: '3V3', type: 'power' as const, description: '3.3V Power Output' },
  ];

  const botLabels = [
    { id: 'a0', name: 'A0', type: 'analog' as const, description: 'Analog Input (ADC0, 0-3.3V via onboard divider)' },
    { id: 'gnd_bot1', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: 'vv', name: 'VV', type: 'power' as const, description: '5V Direct Power from USB (VUSB)' },
    { id: 's3', name: 'S3', type: 'generic' as const, description: 'GPIO10 / SPI Flash SD3' },
    { id: 's2', name: 'S2', type: 'generic' as const, description: 'GPIO9 / SPI Flash SD2' },
    { id: 's1', name: 'S1', type: 'generic' as const, description: 'GPIO8 / SPI Flash SD1 (MOSI)' },
    { id: 'sc', name: 'SC', type: 'generic' as const, description: 'GPIO11 / SPI Flash CMD (CS)' },
    { id: 's0', name: 'S0', type: 'generic' as const, description: 'GPIO7 / SPI Flash SD0 (MISO)' },
    { id: 'sk', name: 'SK', type: 'generic' as const, description: 'GPIO6 / SPI Flash CLK' },
    { id: 'gnd_bot2', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: '3v3_bot', name: '3V3', type: 'power' as const, description: '3.3V Power Output' },
    { id: 'en', name: 'EN', type: 'generic' as const, description: 'Chip Enable / CH_PD (Active High)' },
    { id: 'rst', name: 'RST', type: 'generic' as const, description: 'Reset Pin (Active Low)' },
    { id: 'gnd_bot3', name: 'GND', type: 'ground' as const, description: 'Ground' },
    { id: 'vin', name: 'VIN', type: 'power' as const, description: 'Power Input (5V via Micro-USB or External 5-9V DC)' },
  ];

  const pins: Pin[] = [];
  const startX = 44.5;
  const stepX = 17.0; // Exact Breadboard Grid Pitch

  topLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((startX + i * stepX) * 10) / 10,
      y: 13.4,
      type: item.type,
      description: item.description,
    });
  });

  botLabels.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: Math.round((startX + i * stepX) * 10) / 10,
      y: 200.4,
      type: item.type,
      description: item.description,
    });
  });

  return pins;
}

function createArduinoNanoPins(): Pin[] {
  const leftPins = [
    { id: 'tx1', name: 'TX1', type: 'uart' as const, description: 'USART TX / Digital Pin 1' },
    { id: 'rx0', name: 'RX0', type: 'uart' as const, description: 'USART RX / Digital Pin 0' },
    { id: 'rst_left', name: 'RST', type: 'generic' as const, description: 'Active Low Reset' },
    { id: 'gnd_left', name: 'GND', type: 'ground' as const, description: 'Power Ground (0V)' },
    { id: 'd2', name: 'D2', type: 'digital' as const, description: 'Digital Pin 2 / External Interrupt 0' },
    { id: 'd3', name: 'D3', type: 'pwm' as const, description: 'Digital Pin 3 / PWM (Timer 2) / Interrupt 1' },
    { id: 'd4', name: 'D4', type: 'digital' as const, description: 'Digital Pin 4' },
    { id: 'd5', name: 'D5', type: 'pwm' as const, description: 'Digital Pin 5 / PWM (Timer 0B)' },
    { id: 'd6', name: 'D6', type: 'pwm' as const, description: 'Digital Pin 6 / PWM (Timer 0A)' },
    { id: 'd7', name: 'D7', type: 'digital' as const, description: 'Digital Pin 7' },
    { id: 'd8', name: 'D8', type: 'digital' as const, description: 'Digital Pin 8' },
    { id: 'd9', name: 'D9', type: 'pwm' as const, description: 'Digital Pin 9 / PWM (Timer 1A)' },
    { id: 'd10', name: 'D10', type: 'pwm' as const, description: 'Digital Pin 10 / PWM (Timer 1B) / SPI SS' },
    { id: 'd11', name: 'D11', type: 'pwm' as const, description: 'Digital Pin 11 / PWM / SPI MOSI' },
    { id: 'd12', name: 'D12', type: 'spi' as const, description: 'Digital Pin 12 / SPI MISO' },
  ];

  const rightPins = [
    { id: 'vin', name: 'VIN', type: 'power' as const, description: 'Unregulated Power Input (7V - 12V)' },
    { id: 'gnd_right', name: 'GND', type: 'ground' as const, description: 'Power Ground (0V)' },
    { id: 'rst_right', name: 'RST', type: 'generic' as const, description: 'Active Low Reset' },
    { id: '5v', name: '5V', type: 'power' as const, description: 'Regulated 5V Power Output / Input' },
    { id: 'a7', name: 'A7', type: 'analog' as const, description: 'Analog Input 7 (ADC Only)' },
    { id: 'a6', name: 'A6', type: 'analog' as const, description: 'Analog Input 6 (ADC Only)' },
    { id: 'a5', name: 'A5', type: 'i2c' as const, description: 'Analog Input 5 / I2C SCL' },
    { id: 'a4', name: 'A4', type: 'i2c' as const, description: 'Analog Input 4 / I2C SDA' },
    { id: 'a3', name: 'A3', type: 'analog' as const, description: 'Analog Input 3 / Digital 17' },
    { id: 'a2', name: 'A2', type: 'analog' as const, description: 'Analog Input 2 / Digital 16' },
    { id: 'a1', name: 'A1', type: 'analog' as const, description: 'Analog Input 1 / Digital 15' },
    { id: 'a0', name: 'A0', type: 'analog' as const, description: 'Analog Input 0 / Digital 14' },
    { id: 'ref', name: 'REF', type: 'analog' as const, description: 'Analog Reference Voltage (AREF)' },
    { id: '3v3', name: '3V3', type: 'power' as const, description: '3.3V Power Output' },
    { id: 'd13', name: 'D13', type: 'spi' as const, description: 'Digital Pin 13 / Built-in LED / SPI SCK' },
  ];

  const pins: Pin[] = [];
  const startY = 25.41;
  const stepY = 17.0; // Exact Breadboard Grid Pitch (2.54mm / 0.1")

  leftPins.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: 8.39,
      y: Math.round((startY + i * stepY) * 100) / 100,
      type: item.type,
      description: item.description,
    });
  });

  rightPins.forEach((item, i) => {
    pins.push({
      id: item.id,
      name: item.name,
      x: 110.39,
      y: Math.round((startY + i * stepY) * 100) / 100,
      type: item.type,
      description: item.description,
    });
  });

  return pins;
}

export const COMPONENT_DEFINITIONS: Record<string, ComponentDefinition> = {
  'arduino-nano': {
    type: 'arduino-nano',
    name: 'Arduino Nano V3.0',
    category: 'microcontrollers',
    description: 'Mikrokontroler ATmega328P 30-pin DIP ultra-ringkas yang ramah breadboard.',
    width: 118.78,
    height: 301.22,
    icon: 'Cpu',
    pins: createArduinoNanoPins(),
  },
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


  'esp32-38p-cp2102': {
    type: 'esp32-38p-cp2102',
    name: 'ESP32 DevKit 38-Pin (CP2102)',
    category: 'microcontrollers',
    description: 'Modul IoT WiFi & Bluetooth dual-core Xtensa LX6 32-bit ESP-WROOM-32D 38-pin DIP dengan chip USB Silicon Labs CP2102, tombol EN/BOOT, regulator onboard, dan rentang Row A ke Row I (170.0px).',
    width: 191.7,
    height: 383.8,
    icon: 'Radio',
    pins: createEsp32_38P_CP2102Pins(),
  },

  'esp32-c3-supermini': {
    type: 'esp32-c3-supermini',
    name: 'ESP32-C3 Supermini (16-Pin)',
    category: 'microcontrollers',
    description: 'Modul IoT ultra-ringkas berbasis SoC Espressif ESP32-C3FH4 RISC-V 32-bit single-core 160MHz dengan WiFi 2.4GHz & Bluetooth 5 (LE), USB Type-C, dan 16 pin header ramah breadboard (pitch 17.0px).',
    width: 166.0,
    height: 125.1,
    icon: 'Radio',
    pins: createEsp32C3SuperminiPins(),
  },

  'wemos-d1-mini': {
    type: 'wemos-d1-mini',
    name: 'Wemos D1 Mini (ESP8266)',
    category: 'microcontrollers',
    description: 'Modul WiFi ESP8266 ringkas 16-pin yang ramah breadboard.',
    width: 229.3,
    height: 172.4,
    icon: 'Radio',
    pins: createWemosD1MiniPins(),
  },

  'nodemcu-v1': {
    type: 'nodemcu-v1',
    name: 'NodeMCU ESP8266 (CP2102)',
    category: 'microcontrollers',
    description: 'Modul pengembangan IoT WiFi ESP8266 30-pin dengan chip USB Silicon Labs CP2102 dan regulator onboard.',
    width: 333.3,
    height: 207.8,
    icon: 'Radio',
    pins: createNodeMcuPins(),
  },

  'nodemcu-ch340': {
    type: 'nodemcu-ch340',
    name: 'NodeMCU ESP8266 (CH340)',
    category: 'microcontrollers',
    description: 'Modul pengembangan IoT WiFi ESP8266 30-pin dengan chip USB CH340G dan regulator onboard.',
    width: 332.4,
    height: 213.7,
    icon: 'Radio',
    pins: createNodeMcuCh340Pins(),
  },

  'ftdi-ft232rl': {
    type: 'ftdi-ft232rl',
    name: 'FTDI FT232RL (Red USB-UART)',
    category: 'microcontrollers',
    description: 'Modul konverter USB to Serial TTL UART berbasis IC FTDI FT232RL dengan selektor 3.3V/5V, 6-pin header utama, dan 18 through-hole pin samping.',
    width: 125.0,
    height: 268.0,
    icon: 'Radio',
    pins: [
      // 6 Main UART Bottom Pins
      { id: 'dtr', name: 'DTR', x: 18.8, y: 260.0, type: 'digital', description: 'Data Terminal Ready (Auto-Reset Arduino Pro Mini)' },
      { id: 'rx', name: 'RX', x: 35.8, y: 260.0, type: 'uart', description: 'UART Receive (Input ke FTDI / Hubungkan ke TX MCU)' },
      { id: 'tx', name: 'TX', x: 52.8, y: 260.0, type: 'uart', description: 'UART Transmit (Output dari FTDI / Hubungkan ke RX MCU)' },
      { id: 'vcc', name: 'VCC', x: 69.8, y: 260.0, type: 'power', description: 'Daya Keluaran (3.3V / 5V Jumper Selectable)' },
      { id: 'cts', name: 'CTS', x: 86.8, y: 260.0, type: 'passive', description: 'Clear To Send (Hardware Flow Control)' },
      { id: 'gnd', name: 'GND', x: 103.8, y: 260.0, type: 'ground', description: 'Ground Sasis / Referensi 0V' },

      // Left Side Through-Hole Pins (Top to Bottom)
      { id: 'pwren', name: 'PWREN', x: 9.0, y: 87.3, type: 'passive', description: 'Power Enable (Active Low Output)' },
      { id: 'txden', name: 'TXDEN', x: 9.0, y: 104.2, type: 'passive', description: 'Transmit Data Enable (for RS485 Transceiver Control)' },
      { id: 'sleep', name: 'SLEEP', x: 9.0, y: 121.1, type: 'passive', description: 'USB Suspend State Output' },
      { id: 'cts_left', name: 'CTS', x: 9.0, y: 138.0, type: 'passive', description: 'Clear To Send (Handshake Input)' },
      { id: '3v3_left', name: '3.3V', x: 9.0, y: 154.8, type: 'power', description: 'Tegangan Keluaran Regulator Onboard 3.3V' },
      { id: '5v_left', name: '5V', x: 9.0, y: 171.7, type: 'power', description: 'Tegangan Keluaran USB VBUS 5V' },
      { id: 'rxl_left', name: 'RXL', x: 9.0, y: 188.7, type: 'passive', description: 'RX LED Drive Output' },
      { id: 'txl_left', name: 'TXL', x: 9.0, y: 205.5, type: 'passive', description: 'TX LED Drive Output' },
      { id: 'gnd_left', name: 'GND', x: 9.0, y: 222.4, type: 'ground', description: 'Ground Sasis (0V)' },

      // Right Side Through-Hole Pins (Top to Bottom)
      { id: 'dcd_right', name: 'DCD', x: 114.5, y: 87.9, type: 'passive', description: 'Data Carrier Detect' },
      { id: 'dsr_right', name: 'DSR', x: 114.5, y: 104.9, type: 'passive', description: 'Data Set Ready' },
      { id: 'gnd_right', name: 'GND', x: 114.5, y: 121.8, type: 'ground', description: 'Ground Sasis (0V)' },
      { id: 'ri_right', name: 'RI', x: 114.5, y: 138.7, type: 'passive', description: 'Ring Indicator' },
      { id: 'rxd_right', name: 'RXD', x: 114.5, y: 155.7, type: 'uart', description: 'UART Receive Data Input' },
      { id: 'vcc_right', name: 'VCC', x: 114.5, y: 172.5, type: 'power', description: 'VCC Power (3.3V / 5V)' },
      { id: 'rts_right', name: 'RTS', x: 114.5, y: 189.4, type: 'passive', description: 'Request To Send (Handshake Output)' },
      { id: 'dtr_right', name: 'DTR', x: 114.5, y: 206.3, type: 'digital', description: 'Data Terminal Ready Output' },
      { id: 'txd_right', name: 'TXD', x: 114.5, y: 223.2, type: 'uart', description: 'UART Transmit Data Output' },
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

  'pzem-004t': {
    type: 'pzem-004t',
    name: 'PZEM-004T-100A (V3.0)',
    category: 'sensors',
    description: 'Modul sensor pengukur daya listrik AC (Tegangan 80-260V, Arus hingga 100A via CT, Daya, Frekuensi, & Energi kWh) antarmuka UART TTL.',
    width: 495.0,
    height: 199.5,
    icon: 'Zap',
    pins: [
      // Sisi Kiri: TTL Header 4-Pin ke Mikrokontroler (Pitch standar 16.4px / 2.54mm, tepat pada kaki logam perak)
      { id: '5v', name: '5V (VCC)', x: 51.9, y: 75.9, type: 'power', description: 'Power Supply 5V DC untuk Optocoupler & TTL Interface' },
      { id: 'rx', name: 'RX', x: 51.9, y: 92.4, type: 'uart', description: 'UART RX Input (Sambungkan ke TX Mikrokontroler)' },
      { id: 'tx', name: 'TX', x: 51.9, y: 108.8, type: 'uart', description: 'UART TX Output (Sambungkan ke RX Mikrokontroler)' },
      { id: 'gnd', name: 'GND', x: 51.9, y: 125.2, type: 'ground', description: 'Power Ground DC (0V)' },

      // Sisi Kanan: AC Line & CT Screw Terminals (Green Terminal Block P4 - Titik pusat baut)
      { id: 'ac_l', name: 'AC (L)', x: 466.3, y: 52.5, type: 'power', description: 'AC Line / Live Phase Input (80V - 260VAC)' },
      { id: 'ac_n', name: 'AC (N)', x: 466.3, y: 85.2, type: 'passive', description: 'AC Neutral Input' },
      { id: 'ct1', name: 'CT (1)', x: 466.3, y: 117.9, type: 'analog', description: 'Current Transformer Coil Input (+)' },
      { id: 'ct2', name: 'CT (2)', x: 466.3, y: 150.6, type: 'analog', description: 'Current Transformer Coil Input (-)' },
    ],
  },

  'sensor-ct-coil': {
    type: 'sensor-ct-coil',
    name: 'Current Transformer (CT Coil)',
    category: 'sensors',
    description: 'Sensor arus induksi donat toroidal (Closed-Core CT 100A) untuk modul PZEM-004T dengan rongga tembus pandang.',
    width: 220.0,
    height: 160.0,
    icon: 'CircleDot',
    pins: [
      // Output Wires to PZEM-004T
      { id: 'ct_pos', name: 'CT+ (Merah)', x: 206.0, y: 74.0, type: 'analog', description: 'Kabel output merah sensor CT (Sambungkan ke terminal CT 1 PZEM-004T)' },
      { id: 'ct_neg', name: 'CT- (Hitam)', x: 206.0, y: 86.0, type: 'analog', description: 'Kabel output hitam sensor CT (Sambungkan ke terminal CT 2 PZEM-004T)' },
      // Pass-through center hole for AC load line (Option B snap guide)
      { id: 'ac_pass', name: 'Rongga CT (AC Wire)', x: 75.0, y: 80.0, type: 'passive', description: 'Titik pusat lubang donat CT untuk melewatkan kabel fasa listrik AC' },
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
    name: 'DHT11 (No Module)',
    category: 'sensors',
    description: 'Sensor suhu dan kelembaban udara digital 4-pin standar breadboard (pitch 17.0px).',
    width: 86.0,
    height: 143.0,
    icon: 'Thermometer',
    pins: [
      { id: 'vcc', name: 'VCC', x: 17.5, y: 140.0, type: 'power', description: 'Power 3.3V - 5V' },
      { id: 'data', name: 'DATA', x: 34.5, y: 140.0, type: 'digital', description: 'Serial Data Output' },
      { id: 'nc', name: 'NC', x: 51.5, y: 140.0, type: 'generic', description: 'Not Connected' },
      { id: 'gnd', name: 'GND', x: 68.5, y: 140.0, type: 'ground', description: 'Ground (0V)' },
    ],
  },

  'sensor-dht11-module': {
    type: 'sensor-dht11-module',
    name: 'DHT11 (Module)',
    category: 'sensors',
    description: 'Modul sensor suhu & kelembaban DHT11 dengan breakout board 3-pin (GND, DAT, VCC), LED indikator daya, dan resistor pull-up onboard (pitch 17.0px).',
    width: 88.5,
    height: 228.5,
    icon: 'Thermometer',
    pins: [
      { id: 'gnd', name: 'GND', x: 27.5, y: 224.0, type: 'ground', description: 'Ground (0V)' },
      { id: 'data', name: 'DAT', x: 44.5, y: 224.0, type: 'digital', description: 'Serial Data Output (1-Wire)' },
      { id: 'vcc', name: 'VCC', x: 61.5, y: 224.0, type: 'power', description: 'Power Supply (+3.3V - +5V DC)' },
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

  'sensor-ds18b20': {
    type: 'sensor-ds18b20',
    name: 'DS18B20 (Waterproof Probe)',
    category: 'sensors',
    description: 'Sensor suhu digital tahan air DS18B20 berbahan stainless steel dengan 3 kabel terurai (VCC Merah, DATA Kuning, GND Hitam) antarmuka 1-Wire presisi (pitch 17.0px).',
    width: 50.0,
    height: 218.0,
    icon: 'Thermometer',
    pins: [
      { id: 'vcc', name: 'VCC (Merah)', x: 8.0, y: 213.0, type: 'power', description: 'Power Supply (+3.0V - +5.5V DC, Kabel Merah)' },
      { id: 'data', name: 'DAT (Kuning)', x: 25.0, y: 216.0, type: 'digital', description: '1-Wire Digital Data (Kabel Kuning)' },
      { id: 'gnd', name: 'GND (Hitam)', x: 42.0, y: 213.0, type: 'ground', description: 'Ground (0V, Kabel Hitam)' },
    ],
  },

  'sensor-ds18b20-module': {
    type: 'sensor-ds18b20-module',
    name: 'DS18B20 Module (Pluggable Terminal)',
    category: 'sensors',
    description: 'Modul breakout adapter DS18B20 dengan terminal sekrup 3-posisi hijau untuk probe kabel dan 3-pin male header untuk mikrokontroler (pitch 17.0px).',
    width: 134.0,
    height: 98.0,
    icon: 'Thermometer',
    pins: [
      // Terminal Sekrup Sisi Kiri (Input Probe) - pitch 17.0px
      { id: 'term_dat', name: 'DAT (Terminal)', x: 29.5, y: 30.0, type: 'passive', description: 'Terminal Sekrup Data Probe (Kabel Kuning)' },
      { id: 'term_vcc', name: 'VCC (Terminal)', x: 29.5, y: 47.0, type: 'power', description: 'Terminal Sekrup Daya Probe (Kabel Merah)' },
      { id: 'term_gnd', name: 'GND (Terminal)', x: 29.5, y: 64.0, type: 'ground', description: 'Terminal Sekrup Ground Probe (Kabel Hitam)' },
      // Pin Header Male Sisi Kanan (Output MCU) - pitch 17.0px
      { id: 'dat', name: 'DAT (Pin)', x: 128.5, y: 30.0, type: 'digital', description: '1-Wire Data Output ke Mikrokontroler' },
      { id: 'vcc', name: 'VCC (Pin)', x: 128.5, y: 47.0, type: 'power', description: 'Power Supply (+3.0V - +5.5V DC)' },
      { id: 'gnd', name: 'GND (Pin)', x: 128.5, y: 64.0, type: 'ground', description: 'Ground (0V)' },
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

  'sensor-tds': {
    type: 'sensor-tds',
    name: 'Analog TDS Sensor (Total Dissolved Solids)',
    category: 'sensors',
    description: 'Sensor pengukur kualitas air TDS (Total Dissolved Solids / PPM) analog dengan probe waterproof 2-elektroda dan driver board signal conditioner (A, +, -).',
    width: 405.0,
    height: 410.0,
    icon: 'Droplets',
    pins: [
      // Driver board connector pins (bawah) - pitch 17.0px breadboard aligned
      { id: 'a', name: 'A (Signal)', x: 295.5, y: 351.0, type: 'analog', description: 'Analog Output Voltage (0 - 2.3V DC)' },
      { id: 'vcc', name: '+ (VCC)', x: 312.5, y: 351.0, type: 'power', description: 'Power Supply (+3.3V - +5.5V DC)' },
      { id: 'gnd', name: '- (GND)', x: 329.5, y: 351.0, type: 'ground', description: 'Ground Daya / Sinyal (0V)' },
      // Waterproof probe electrode pins (kiri bawah)
      { id: 'probe_1', name: 'Probe 1', x: 20.7, y: 403.0, type: 'passive', description: 'Elektroda Logam Probe Air (Kiri)' },
      { id: 'probe_2', name: 'Probe 2', x: 32.5, y: 403.0, type: 'passive', description: 'Elektroda Logam Probe Air (Kanan)' },
    ],
  },

  'sensor-ph4502c': {
    type: 'sensor-ph4502c',
    name: 'pH Sensor Module (pH-4502C / HW-828)',
    category: 'sensors',
    description: 'Modul sensor pengkondisi sinyal elektroda pH analog presisi dengan konektor BNC, dual trimpot kalibrasi (offset & limit threshold), IC NE5532 & LM393, sensor suhu internal (To), dan 6-pin male header horizontal.',
    width: 450.0,
    height: 209.0,
    icon: 'Activity',
    pins: [
      // Pin Header Male Horizontal (Sisi Kanan) - Pitch 17.0px breadboard aligned
      { id: 'vcc', name: 'V+ (VCC)', x: 448.0, y: 67.0, type: 'power', description: 'Tegangan Masukan Daya (+5.0V DC)' },
      { id: 'gnd_1', name: 'G (GND 1)', x: 448.0, y: 84.0, type: 'ground', description: 'Ground Daya / Sinyal (0V)' },
      { id: 'gnd_2', name: 'G (GND 2)', x: 448.0, y: 101.0, type: 'ground', description: 'Ground Daya / Sinyal (0V)' },
      { id: 'po', name: 'Po (pH Analog)', x: 448.0, y: 118.0, type: 'analog', description: 'Output Tegangan Analog pH (0.0 - 5.0V DC, netral pH 7 ≈ 2.5V)' },
      { id: 'do', name: 'Do (Digital Out)', x: 448.0, y: 135.0, type: 'digital', description: 'Output Digital Trigger / Alarm Batas pH (Active Low)' },
      { id: 'to', name: 'To (Temp Analog)', x: 448.0, y: 152.0, type: 'analog', description: 'Output Analog Sensor Suhu Internal Modul' },
      // Soket BNC Elektroda pH (Sisi Kiri)
      { id: 'bnc', name: 'BNC (pH Probe)', x: 10.0, y: 104.5, type: 'passive', description: 'Soket Koaksial BNC untuk Elektroda Probe pH' },
    ],
  },

  'sensor-pt100': {
    type: 'sensor-pt100',
    name: 'PT100 RTD Temperature Sensor Probe',
    category: 'sensors',
    description: 'Sensor suhu RTD PT100 3-kawat industri tahan panas dengan probe silinder stainless steel, kabel pelindung anyaman (braided shield), dan 3 terminal spade fork (2 merah compensation leg, 1 biru element leg).',
    width: 240.0,
    height: 196.5,
    icon: 'Thermometer',
    pins: [
      { id: 'spade_red1', name: 'RED 1 (Spade)', x: 74.5, y: 191.5, type: 'passive', description: 'Terminal Spade Merah 1 (RTD Sensing Element Leg A1)' },
      { id: 'spade_red2', name: 'RED 2 (Spade)', x: 116.2, y: 172.5, type: 'passive', description: 'Terminal Spade Merah 2 (RTD Compensation Wire Leg A2)' },
      { id: 'spade_blue', name: 'BLUE (Spade)', x: 144.6, y: 145.9, type: 'passive', description: 'Terminal Spade Biru/Putih (RTD Sensing Element Leg B)' },
      { id: 'probe_tip', name: 'PROBE (Tip)', x: 239.7, y: 81.3, type: 'passive', description: 'Ujung Probe Stainless Steel (Sensing Apex Contact)' },
    ],
  },

  'transmitter-rtd-pt100': {
    type: 'transmitter-rtd-pt100',
    name: 'RTD Temperature Transmitter (Head-Mount 24V 4-20mA)',
    category: 'sensors',
    description: 'Transmitter pengkondisi sinyal RTD PT100 tipe head-mount (hockey puck) industri dengan suplai 24VDC, output loop arus 4~20mA linear (0-100 °C), dan 5 screw terminal berkode presisi.',
    width: 260.0,
    height: 250.0,
    icon: 'Cpu',
    pins: [
      { id: 'power_neg', name: '- (Loop Out / 4-20mA)', x: 105.2, y: 29.7, type: 'passive', description: 'Output Loop Arus (4~20mA) / Ground Return (-)' },
      { id: 'power_pos', name: '+ (Loop Power / 24VDC)', x: 155.0, y: 29.5, type: 'power', description: 'Tegangan Masukan Loop Power (+24V DC)' },
      { id: 'rtd_1', name: '1 (RTD Red 1)', x: 74.1, y: 80.5, type: 'passive', description: 'Terminal Input RTD 1 (Kabel Merah 1)' },
      { id: 'rtd_2', name: '2 (RTD Red 2)', x: 128.7, y: 79.6, type: 'passive', description: 'Terminal Input RTD 2 (Kabel Merah 2 Kompensasi)' },
      { id: 'rtd_3', name: '3 (RTD White/Blue)', x: 185.0, y: 80.5, type: 'passive', description: 'Terminal Input RTD 3 (Kabel Biru/Putih)' },
    ],
  },


  'sensor-touch-ttp223': {
    type: 'sensor-touch-ttp223',
    name: 'Sensor Touch TTP223 (Capacitive)',
    category: 'sensors',
    description: 'Modul sensor sentuh kapasitif digital chip TTP223 red edition dengan tombol sentuh bundar sensitif dan 3 solder pad header (pitch 17.0px).',
    width: 65.0,
    height: 89.5,
    icon: 'CircleDot',
    pins: [
      { id: 'gnd', name: 'GND', x: 15.5, y: 8.0, type: 'ground', description: 'Power Ground (0V)' },
      { id: 'vcc', name: 'VCC', x: 32.5, y: 8.0, type: 'power', description: 'Power Supply (+2.0V - +5.5V DC)' },
      { id: 'io', name: 'SIG / IO', x: 49.5, y: 8.0, type: 'digital', description: 'Digital Touch Output (Active HIGH saat disentuh)' },
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

  'speaker': {
    type: 'speaker',
    name: 'Dynamic Speaker (8Ω / 3W)',
    category: 'outputs',
    description: 'Speaker audio dinamis mini 8 Ohm / 4 Ohm dengan kabel 2-pin (Positif Merah & Negatif Hitam) untuk output suara audio atau DFPlayer Mini.',
    width: 136.0,
    height: 150.0,
    icon: 'Volume2',
    pins: [
      { id: 'neg', name: '- (Negatif / GND)', x: 59.5, y: 145.0, type: 'ground', description: 'Terminal Negatif / Ground / SPK_2 (Kabel Hitam)' },
      { id: 'pos', name: '+ (Positif / Audio)', x: 76.5, y: 145.0, type: 'passive', description: 'Terminal Positif / Audio Signal / SPK_1 (Kabel Merah)' },
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

  'dfplayer-mini': {
    type: 'dfplayer-mini',
    name: 'DFPlayer Mini MP3 Player',
    category: 'outputs',
    description: 'Modul pemutar audio MP3/WAV mini dengan slot Micro SD, kontrol serial UART (RX/TX), internal amplifier 3W (SPK1/SPK2), dan dual DAC.',
    width: 136.6,
    height: 143.0,
    icon: 'Radio',
    pins: [
      // Left Column Pins (Pin 1 - 8, Top to Bottom, X = 8.5)
      { id: 'vcc', name: 'VCC', x: 8.5, y: 8.5, type: 'power', description: 'Tegangan Masukan Daya (+3.3V - 5.0V DC, rek: 5V/4.2V)' },
      { id: 'rx', name: 'RX', x: 8.5, y: 25.5, type: 'uart', description: 'UART Serial Input (Hubungkan ke TX MCU via resistor 1k)' },
      { id: 'tx', name: 'TX', x: 8.5, y: 42.5, type: 'uart', description: 'UART Serial Output (Hubungkan ke RX MCU)' },
      { id: 'dac_r', name: 'DAC_R', x: 8.5, y: 59.5, type: 'passive', description: 'Audio DAC Right Channel (Headphone / Aux Amp)' },
      { id: 'dac_l', name: 'DAC_L', x: 8.5, y: 76.5, type: 'passive', description: 'Audio DAC Left Channel (Headphone / Aux Amp)' },
      { id: 'spk_1', name: 'SPK_1', x: 8.5, y: 93.5, type: 'passive', description: 'Speaker Output + (Langsung ke Speaker 3W / 4-8 Ohm)' },
      { id: 'gnd_left', name: 'GND', x: 8.5, y: 110.5, type: 'ground', description: 'Ground Daya / Sinyal (0V)' },
      { id: 'spk_2', name: 'SPK_2', x: 8.5, y: 127.5, type: 'passive', description: 'Speaker Output - (Langsung ke Speaker 3W / 4-8 Ohm)' },

      // Right Column Pins (Pin 16 - 9, Top to Bottom, X = 127.5)
      { id: 'busy', name: 'BUSY', x: 127.5, y: 8.5, type: 'digital', description: 'Status Putar Audio (LOW saat memutar musik, HIGH saat idle)' },
      { id: 'usb_minus', name: 'USB_N', x: 127.5, y: 25.5, type: 'passive', description: 'USB D- Data Line (Komunikasi PC / Flashdisk)' },
      { id: 'usb_plus', name: 'USB_P', x: 127.5, y: 42.5, type: 'passive', description: 'USB D+ Data Line (Komunikasi PC / Flashdisk)' },
      { id: 'adkey_2', name: 'ADKEY_2', x: 127.5, y: 59.5, type: 'analog', description: 'AD Key Port 2 (Input Resistor Ladder Tombol)' },
      { id: 'adkey_1', name: 'ADKEY_1', x: 127.5, y: 76.5, type: 'analog', description: 'AD Key Port 1 (Input Resistor Ladder Tombol)' },
      { id: 'io_2', name: 'IO_2', x: 127.5, y: 93.5, type: 'digital', description: 'Trigger Kontrol 2 (Klik: Next Track / Tahan: Volume +)' },
      { id: 'gnd_right', name: 'GND', x: 127.5, y: 110.5, type: 'ground', description: 'Ground Daya / Sinyal (0V)' },
      { id: 'io_1', name: 'IO_1', x: 127.5, y: 127.5, type: 'digital', description: 'Trigger Kontrol 1 (Klik: Prev Track / Tahan: Volume -)' },
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

  'level-converter-4ch-blue': {
    type: 'level-converter-4ch-blue',
    name: 'Logic Level Converter 4-Ch (Blue)',
    category: 'passives',
    description: 'Modul bidirectional 4-channel logic level shifter (I2C/UART) untuk konversi level tegangan antara sistem 5V (HV) dan 3.3V (LV).',
    width: 100.4,
    height: 87.1,
    icon: 'ArrowLeftRight',
    pins: [
      { id: 'hv1', name: 'HV1', x: 7.3, y: 7.6, type: 'digital', description: 'High Voltage Channel 1 (5V side)' },
      { id: 'hv2', name: 'HV2', x: 24.3, y: 7.6, type: 'digital', description: 'High Voltage Channel 2 (5V side)' },
      { id: 'hv', name: 'HV', x: 41.3, y: 7.6, type: 'power', description: 'High Voltage Supply Reference (+5V)' },
      { id: 'gnd_hv', name: 'GND', x: 58.3, y: 7.6, type: 'ground', description: 'Ground Sisi High Voltage (0V)' },
      { id: 'hv3', name: 'HV3', x: 75.3, y: 7.6, type: 'digital', description: 'High Voltage Channel 3 (5V side)' },
      { id: 'hv4', name: 'HV4', x: 92.3, y: 7.6, type: 'digital', description: 'High Voltage Channel 4 (5V side)' },
      { id: 'lv1', name: 'LV1', x: 7.3, y: 79.8, type: 'digital', description: 'Low Voltage Channel 1 (3.3V side)' },
      { id: 'lv2', name: 'LV2', x: 24.3, y: 79.8, type: 'digital', description: 'Low Voltage Channel 2 (3.3V side)' },
      { id: 'lv', name: 'LV', x: 41.3, y: 79.8, type: 'power', description: 'Low Voltage Supply Reference (+3.3V)' },
      { id: 'gnd_lv', name: 'GND', x: 58.3, y: 79.8, type: 'ground', description: 'Ground Sisi Low Voltage (0V)' },
      { id: 'lv3', name: 'LV3', x: 75.3, y: 79.8, type: 'digital', description: 'Low Voltage Channel 3 (3.3V side)' },
      { id: 'lv4', name: 'LV4', x: 92.3, y: 79.8, type: 'digital', description: 'Low Voltage Channel 4 (3.3V side)' },
    ],
  },

  'level-converter-8ch-red': {
    type: 'level-converter-8ch-red',
    name: 'Logic Level Converter 8-Ch (Red)',
    category: 'passives',
    description: 'Modul bidirectional 8-channel logic level shifter untuk komunikasi paralel / multi-sinyal antara sistem 5V (HV) dan 3.3V (LV).',
    width: 183.4,
    height: 84.5,
    icon: 'ArrowLeftRight',
    pins: [
      { id: 'hv1', name: 'HV1', x: 15.1, y: 8.6, type: 'digital', description: 'High Voltage Channel 1 (5V side)' },
      { id: 'hv2', name: 'HV2', x: 32.1, y: 8.6, type: 'digital', description: 'High Voltage Channel 2 (5V side)' },
      { id: 'hv3', name: 'HV3', x: 49.1, y: 8.6, type: 'digital', description: 'High Voltage Channel 3 (5V side)' },
      { id: 'hv4', name: 'HV4', x: 66.1, y: 8.6, type: 'digital', description: 'High Voltage Channel 4 (5V side)' },
      { id: 'hv', name: 'HV', x: 83.1, y: 8.6, type: 'power', description: 'High Voltage Supply Reference (+5V)' },
      { id: 'gnd_hv', name: 'GND', x: 100.1, y: 8.6, type: 'ground', description: 'Ground Sisi High Voltage (0V)' },
      { id: 'hv5', name: 'HV5', x: 117.1, y: 8.6, type: 'digital', description: 'High Voltage Channel 5 (5V side)' },
      { id: 'hv6', name: 'HV6', x: 134.1, y: 8.6, type: 'digital', description: 'High Voltage Channel 6 (5V side)' },
      { id: 'hv7', name: 'HV7', x: 151.1, y: 8.6, type: 'digital', description: 'High Voltage Channel 7 (5V side)' },
      { id: 'hv8', name: 'HV8', x: 168.1, y: 8.6, type: 'digital', description: 'High Voltage Channel 8 (5V side)' },
      { id: 'lv1', name: 'LV1', x: 15.1, y: 76.2, type: 'digital', description: 'Low Voltage Channel 1 (3.3V side)' },
      { id: 'lv2', name: 'LV2', x: 32.1, y: 76.2, type: 'digital', description: 'Low Voltage Channel 2 (3.3V side)' },
      { id: 'lv3', name: 'LV3', x: 49.1, y: 76.2, type: 'digital', description: 'Low Voltage Channel 3 (3.3V side)' },
      { id: 'lv4', name: 'LV4', x: 66.1, y: 76.2, type: 'digital', description: 'Low Voltage Channel 4 (3.3V side)' },
      { id: 'lv', name: 'LV', x: 83.1, y: 76.2, type: 'power', description: 'Low Voltage Supply Reference (+3.3V)' },
      { id: 'gnd_lv', name: 'GND', x: 100.1, y: 76.2, type: 'ground', description: 'Ground Sisi Low Voltage (0V)' },
      { id: 'lv5', name: 'LV5', x: 117.1, y: 76.2, type: 'digital', description: 'Low Voltage Channel 5 (3.3V side)' },
      { id: 'lv6', name: 'LV6', x: 134.1, y: 76.2, type: 'digital', description: 'Low Voltage Channel 6 (3.3V side)' },
      { id: 'lv7', name: 'LV7', x: 151.1, y: 76.2, type: 'digital', description: 'Low Voltage Channel 7 (3.3V side)' },
      { id: 'lv8', name: 'LV8', x: 168.1, y: 76.2, type: 'digital', description: 'Low Voltage Channel 8 (3.3V side)' },
    ],
  },

  'level-converter-4ch-red': {
    type: 'level-converter-4ch-red',
    name: 'Logic Level Converter 4-Ch (Red)',
    category: 'passives',
    description: 'Modul bi-directional logic level converter 4-channel versi Red PCB dengan susunan resistor pull-up standar.',
    width: 101.4,
    height: 95.4,
    icon: 'ArrowLeftRight',
    pins: [
      { id: 'hv1', name: 'HV1', x: 7.9, y: 8.1, type: 'digital', description: 'High Voltage Channel 1 (5V side)' },
      { id: 'hv2', name: 'HV2', x: 24.9, y: 8.1, type: 'digital', description: 'High Voltage Channel 2 (5V side)' },
      { id: 'hv', name: 'HV', x: 41.9, y: 8.1, type: 'power', description: 'High Voltage Supply Reference (+5V)' },
      { id: 'gnd_hv', name: 'GND', x: 58.9, y: 8.1, type: 'ground', description: 'Ground Sisi High Voltage (0V)' },
      { id: 'hv3', name: 'HV3', x: 75.9, y: 8.1, type: 'digital', description: 'High Voltage Channel 3 (5V side)' },
      { id: 'hv4', name: 'HV4', x: 92.9, y: 8.1, type: 'digital', description: 'High Voltage Channel 4 (5V side)' },
      { id: 'lv1', name: 'LV1', x: 7.9, y: 86.8, type: 'digital', description: 'Low Voltage Channel 1 (3.3V side)' },
      { id: 'lv2', name: 'LV2', x: 24.9, y: 86.8, type: 'digital', description: 'Low Voltage Channel 2 (3.3V side)' },
      { id: 'lv', name: 'LV', x: 41.9, y: 86.8, type: 'power', description: 'Low Voltage Supply Reference (+3.3V)' },
      { id: 'gnd_lv', name: 'GND', x: 58.9, y: 86.8, type: 'ground', description: 'Ground Sisi Low Voltage (0V)' },
      { id: 'lv3', name: 'LV3', x: 75.9, y: 86.8, type: 'digital', description: 'Low Voltage Channel 3 (3.3V side)' },
      { id: 'lv4', name: 'LV4', x: 92.9, y: 86.8, type: 'digital', description: 'Low Voltage Channel 4 (3.3V side)' },
    ],
  },

  'sensor-ads1115': {
    type: 'sensor-ads1115',
    name: 'Modul ADC 16-Bit I2C (ADS1115)',
    category: 'sensors',
    description: 'Modul Analog-to-Digital Converter (ADC) 16-bit 4-channel presisi tinggi dengan PGA internal via antarmuka komunikasi I2C.',
    width: 179.7,
    height: 97.5,
    icon: 'Cpu',
    pins: [
      { id: 'vdd', name: 'VDD', x: 12.7, y: 87.5, type: 'power', description: 'Power Supply (+2.0V - 5.5V DC)' },
      { id: 'gnd', name: 'GND', x: 29.7, y: 87.5, type: 'ground', description: 'Ground Referensi (0V)' },
      { id: 'scl', name: 'SCL', x: 46.7, y: 87.5, type: 'i2c', description: 'I2C Serial Clock' },
      { id: 'sda', name: 'SDA', x: 63.7, y: 87.5, type: 'i2c', description: 'I2C Serial Data' },
      { id: 'addr', name: 'ADDR', x: 80.7, y: 87.5, type: 'digital', description: 'I2C Address Pin (GND=0x48, VDD=0x49, SDA=0x4A, SCL=0x4B)' },
      { id: 'alrt', name: 'ALRT', x: 97.7, y: 87.5, type: 'digital', description: 'Alert / Conversion Ready Output' },
      { id: 'a0', name: 'A0', x: 114.7, y: 87.5, type: 'analog', description: 'Analog Input Channel 0' },
      { id: 'a1', name: 'A1', x: 131.7, y: 87.5, type: 'analog', description: 'Analog Input Channel 1' },
      { id: 'a2', name: 'A2', x: 148.7, y: 87.5, type: 'analog', description: 'Analog Input Channel 2' },
      { id: 'a3', name: 'A3', x: 165.7, y: 87.5, type: 'analog', description: 'Analog Input Channel 3' },
    ],
  },

  'sensor-jsn-sr04t': {
    type: 'sensor-jsn-sr04t',
    name: 'Sensor Jarak Waterproof (JSN-SR04T)',
    category: 'sensors',
    description: 'Modul sensor pengukur jarak ultrasonik tahan air (waterproof probe) terintegrasi dengan kabel dan transduser eksternal.',
    width: 587.5,
    height: 352.4,
    icon: 'Radio',
    pins: [
      { id: 'vcc', name: '5V (VCC)', x: 15.6, y: 116.5, type: 'power', description: 'Power Supply (+5V DC)' },
      { id: 'trig', name: 'TRIG (TX)', x: 15.6, y: 133.5, type: 'digital', description: 'Trigger Pulse Input / UART TX' },
      { id: 'echo', name: 'ECHO (RX)', x: 15.6, y: 150.5, type: 'digital', description: 'Echo Pulse Output / UART RX' },
      { id: 'gnd', name: 'GND', x: 15.6, y: 167.5, type: 'ground', description: 'Ground Referensi (0V)' },
    ],
  },

  'module-sim800l': {
    type: 'module-sim800l',
    name: 'Modul GSM/GPRS (SIM800L)',
    category: 'sensors',
    description: 'Modul komunikasi nirkabel GSM/GPRS Quad-band SIM800L dengan konektor antena IPEX/U.FL, antarmuka serial UART, dan port audio (SPK/MIC).',
    width: 176.4,
    height: 155.3,
    icon: 'Radio',
    pins: [
      { id: 'net', name: 'NET', x: 15.1, y: 37.3, type: 'passive', description: 'Status Indikator Jaringan GSM / Output Antena (Pad Kotak)' },
      { id: 'vcc', name: 'VCC (3.7-4.2V)', x: 15.1, y: 54.4, type: 'power', description: 'Power Supply Masukan (+3.7V - 4.2V DC, rek: 4.0V ~2A Peak)' },
      { id: 'rst', name: 'RST', x: 15.1, y: 71.4, type: 'generic', description: 'Hard Reset Pin (Active LOW)' },
      { id: 'rxd', name: 'RXD', x: 15.1, y: 88.3, type: 'uart', description: 'UART Serial Data Input (2.8V - 3.3V Logic Level)' },
      { id: 'txd', name: 'TXD', x: 15.1, y: 105.4, type: 'uart', description: 'UART Serial Data Output (2.8V - 3.3V Logic Level)' },
      { id: 'gnd', name: 'GND', x: 15.1, y: 122.8, type: 'ground', description: 'Ground Referensi Daya & Sinyal (0V)' },
      { id: 'ring', name: 'RING', x: 163.7, y: 54.4, type: 'digital', description: 'Ring Indicator (LOW saat ada Panggilan / SMS Masuk) (Pad Kotak)' },
      { id: 'dtr', name: 'DTR', x: 163.7, y: 71.6, type: 'digital', description: 'Data Terminal Ready / Pin Bangun Sleep Mode (Active LOW)' },
      { id: 'micp', name: 'MIC+', x: 163.7, y: 88.5, type: 'passive', description: 'Audio Microphone Input Positif (+)' },
      { id: 'micn', name: 'MIC-', x: 163.7, y: 105.8, type: 'passive', description: 'Audio Microphone Input Negatif (-)' },
      { id: 'spkp', name: 'SPK+', x: 163.7, y: 122.8, type: 'passive', description: 'Audio Speaker Output Positif (+)' },
      { id: 'spkn', name: 'SPK-', x: 163.7, y: 139.8, type: 'passive', description: 'Audio Speaker Output Negatif (-)' },
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
