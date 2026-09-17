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
