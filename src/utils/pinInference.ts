import { PinType } from '../types/circuit';

export interface PinProfile {
  type: PinType;
  description: string;
  isConfident: boolean;
}

export interface PinSuggestion {
  name: string;
  type: PinType;
  description: string;
  category: string;
}

/**
 * Common pin suggestions for autocomplete in Component Studio
 */
export const COMMON_PIN_SUGGESTIONS: PinSuggestion[] = [
  // Power & Ground
  { name: 'VCC', type: 'power', description: 'Tegangan Masukan Daya Positif (+3.3V / +5V DC)', category: 'Power' },
  { name: 'VIN', type: 'power', description: 'Tegangan Masukan Power Supply (+5V DC / Eksternal)', category: 'Power' },
  { name: '3V3', type: 'power', description: 'Keluaran Tegangan Teratur +3.3V DC (LDO Onboard)', category: 'Power' },
  { name: '5V', type: 'power', description: 'Tegangan Masukan / Keluaran Daya Teratur +5V DC', category: 'Power' },
  { name: 'HV', type: 'power', description: 'High Voltage Supply Reference (+5V DC)', category: 'Power' },
  { name: 'LV', type: 'power', description: 'Low Voltage Supply Reference (+3.3V DC)', category: 'Power' },
  { name: 'HV (POWER)', type: 'power', description: 'High Voltage Supply Reference (+5V DC)', category: 'Power' },
  { name: 'LV (POWER)', type: 'power', description: 'Low Voltage Supply Reference (+3.3V DC)', category: 'Power' },
  { name: 'GND', type: 'ground', description: 'Power Ground (Referensi Daya & Sinyal 0V)', category: 'Power' },
  { name: 'GND_HV', type: 'ground', description: 'Power Ground Sisi High Voltage (0V)', category: 'Power' },
  { name: 'GND_LV', type: 'ground', description: 'Power Ground Sisi Low Voltage (0V)', category: 'Power' },
  { name: 'IN+', type: 'power', description: 'Terminal Positif Tegangan Masukan (Power Input +)', category: 'Power' },
  { name: 'IN-', type: 'power', description: 'Terminal Negatif Tegangan Masukan (Power Input -)', category: 'Power' },
  { name: 'OUT+', type: 'power', description: 'Terminal Positif Tegangan Keluaran (Power Output +)', category: 'Power' },
  { name: 'OUT-', type: 'power', description: 'Terminal Negatif Tegangan Keluaran (Power Output -)', category: 'Power' },
  { name: 'B+', type: 'power', description: 'Terminal Positif Baterai (+3.7V / +7.4V DC)', category: 'Power' },
  { name: 'B-', type: 'power', description: 'Terminal Negatif Baterai (Battery Ground -)', category: 'Power' },
  { name: 'AREF', type: 'power', description: 'Tegangan Referensi Analog (Analog Reference Voltage)', category: 'Power' },

  // Logic Level Converter Channels
  { name: 'HV1', type: 'digital', description: 'High Voltage Channel 1 (5V Side)', category: 'Logic' },
  { name: 'HV2', type: 'digital', description: 'High Voltage Channel 2 (5V Side)', category: 'Logic' },
  { name: 'HV3', type: 'digital', description: 'High Voltage Channel 3 (5V Side)', category: 'Logic' },
  { name: 'HV4', type: 'digital', description: 'High Voltage Channel 4 (5V Side)', category: 'Logic' },
  { name: 'LV1', type: 'digital', description: 'Low Voltage Channel 1 (3.3V Side)', category: 'Logic' },
  { name: 'LV2', type: 'digital', description: 'Low Voltage Channel 2 (3.3V Side)', category: 'Logic' },
  { name: 'LV3', type: 'digital', description: 'Low Voltage Channel 3 (3.3V Side)', category: 'Logic' },
  { name: 'LV4', type: 'digital', description: 'Low Voltage Channel 4 (3.3V Side)', category: 'Logic' },
  { name: 'OE', type: 'digital', description: 'Output Enable / Active High Control Pin', category: 'Control' },

  // I2C Protocol
  { name: 'SCL', type: 'i2c', description: 'I2C Serial Clock (SCL)', category: 'I2C' },
  { name: 'SDA', type: 'i2c', description: 'I2C Serial Data (SDA)', category: 'I2C' },

  // SPI Protocol
  { name: 'CLK', type: 'spi', description: 'SPI Serial Clock (SCK)', category: 'SPI' },
  { name: 'SCK', type: 'spi', description: 'SPI Serial Clock (SCK)', category: 'SPI' },
  { name: 'MOSI', type: 'spi', description: 'SPI Serial Data Input / Master Out Slave In (MOSI)', category: 'SPI' },
  { name: 'SDI', type: 'spi', description: 'SPI Serial Data Input / Master Out Slave In (MOSI)', category: 'SPI' },
  { name: 'MISO', type: 'spi', description: 'SPI Serial Data Output / Master In Slave Out (MISO)', category: 'SPI' },
  { name: 'SDO', type: 'spi', description: 'SPI Serial Data Output / Master In Slave Out (MISO)', category: 'SPI' },
  { name: 'CS', type: 'digital', description: 'SPI Chip Select / Slave Select (Active LOW)', category: 'SPI' },
  { name: 'SS', type: 'digital', description: 'SPI Chip Select / Slave Select (Active LOW)', category: 'SPI' },
  { name: 'RDY', type: 'digital', description: 'Data Ready / Hardware Interrupt Indicator', category: 'SPI' },

  // UART / Serial
  { name: 'TX', type: 'uart', description: 'UART Serial Transmit / Serial Monitor TX', category: 'UART' },
  { name: 'TXD', type: 'uart', description: 'UART Serial Transmit / Serial Monitor TX', category: 'UART' },
  { name: 'RX', type: 'uart', description: 'UART Serial Receive / Serial Monitor RX', category: 'UART' },
  { name: 'RXD', type: 'uart', description: 'UART Serial Receive / Serial Monitor RX', category: 'UART' },

  // Analog & RTD
  { name: 'A0', type: 'analog', description: 'Pin Masukan Analog ADC (Analog Input A0)', category: 'Analog' },
  { name: 'A1', type: 'analog', description: 'Pin Masukan Analog ADC (Analog Input A1)', category: 'Analog' },
  { name: 'A2', type: 'analog', description: 'Pin Masukan Analog ADC (Analog Input A2)', category: 'Analog' },
  { name: 'A3', type: 'analog', description: 'Pin Masukan Analog ADC (Analog Input A3)', category: 'Analog' },
  { name: 'AO', type: 'analog', description: 'Keluaran Sinyal Analog / DAC (Analog Output)', category: 'Analog' },
  { name: 'VP', type: 'analog', description: 'GPIO36 / SENSOR_VP / ADC1_CH0 (Input Only)', category: 'Analog' },
  { name: 'VN', type: 'analog', description: 'GPIO39 / SENSOR_VN / ADC1_CH3 (Input Only)', category: 'Analog' },
  { name: 'RTD+', type: 'passive', description: 'RTD Sense Positive Terminal', category: 'Analog' },
  { name: 'RTD-', type: 'passive', description: 'RTD Sense Negative Terminal', category: 'Analog' },
  { name: 'F+', type: 'passive', description: 'Force Positive / RTD+ Excitation Lead', category: 'Analog' },
  { name: 'F-', type: 'passive', description: 'Force Negative / RTD- Return Lead', category: 'Analog' },

  // Digital & Signals
  { name: 'D0', type: 'digital', description: 'General Purpose Digital Input/Output (D0)', category: 'Digital' },
  { name: 'D1', type: 'digital', description: 'General Purpose Digital Input/Output (D1)', category: 'Digital' },
  { name: 'D2', type: 'digital', description: 'General Purpose Digital Input/Output (D2)', category: 'Digital' },
  { name: 'D3', type: 'pwm', description: 'Digital I/O dengan dukungan PWM Output (D3)', category: 'Digital' },
  { name: 'D4', type: 'digital', description: 'General Purpose Digital Input/Output (D4)', category: 'Digital' },
  { name: 'D5', type: 'pwm', description: 'Digital I/O dengan dukungan PWM Output (D5)', category: 'Digital' },
  { name: 'D6', type: 'pwm', description: 'Digital I/O dengan dukungan PWM Output (D6)', category: 'Digital' },
  { name: 'D7', type: 'digital', description: 'General Purpose Digital Input/Output (D7)', category: 'Digital' },
  { name: 'D8', type: 'digital', description: 'General Purpose Digital Input/Output (D8)', category: 'Digital' },
  { name: 'D9', type: 'pwm', description: 'Digital I/O dengan dukungan PWM Output (D9)', category: 'Digital' },
  { name: 'D10', type: 'pwm', description: 'Digital I/O dengan dukungan PWM Output (D10)', category: 'Digital' },
  { name: 'D11', type: 'pwm', description: 'Digital I/O dengan dukungan PWM Output (D11)', category: 'Digital' },
  { name: 'D12', type: 'digital', description: 'General Purpose Digital Input/Output (D12)', category: 'Digital' },
  { name: 'D13', type: 'digital', description: 'General Purpose Digital Input/Output / Onboard LED (D13)', category: 'Digital' },
  { name: 'DO', type: 'digital', description: 'Keluaran Sinyal Digital (Digital Output)', category: 'Digital' },
  { name: 'OUT', type: 'digital', description: 'Keluaran Sinyal Digital (Digital Output)', category: 'Digital' },
  { name: 'SIG', type: 'digital', description: 'Sinyal Digital I/O (Signal Pin)', category: 'Digital' },
  { name: 'TRIG', type: 'digital', description: 'Ultrasonic Trigger Pulse Input (10µs High Pulse)', category: 'Sensor' },
  { name: 'ECHO', type: 'digital', description: 'Ultrasonic Echo Pulse Output (Lebar Pulsa Sinyal Jarak)', category: 'Sensor' },

  // Control & Pasif
  { name: 'EN', type: 'generic', description: 'Chip Enable / Reset Pin (Active LOW / HIGH)', category: 'Control' },
  { name: 'RST', type: 'generic', description: 'System Hardware Reset Pin (Active LOW)', category: 'Control' },
  { name: 'BOOT', type: 'digital', description: 'Bootloader Mode / Flash Programming Selector', category: 'Control' },
  { name: 'ANODE', type: 'passive', description: 'Anoda Positif (+)', category: 'Passive' },
  { name: 'CATHODE', type: 'passive', description: 'Katoda Negatif (-)', category: 'Passive' },
  { name: 'NC', type: 'passive', description: 'No Connection (Jangan Dihubungkan / Kosong)', category: 'Passive' },
];

/**
 * Automatically infers PinType and a hardware engineering description
 * based on the provided pin label name.
 */
export function inferPinProfile(rawName: string): PinProfile {
  const name = rawName.trim();
  if (!name) {
    return { type: 'digital', description: '', isConfident: false };
  }

  const upper = name.toUpperCase().replace(/\s+/g, '_');
  const cleanToken = upper.replace(/[\(\)\[\]\{\}]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');

  // 1. EXACT & PREFIX GROUND MATCHES
  if (
    cleanToken === 'GND' ||
    cleanToken === '0V' ||
    cleanToken === 'VSS' ||
    cleanToken === 'DGND' ||
    cleanToken === 'AGND' ||
    cleanToken === 'PGND' ||
    cleanToken === 'COM' ||
    cleanToken === 'COMMON' ||
    cleanToken === 'GROUND' ||
    cleanToken === 'GND_HV' ||
    cleanToken === 'GND_LV' ||
    cleanToken === 'HV_GND' ||
    cleanToken === 'LV_GND' ||
    /^GND(_|\d+|$)/i.test(cleanToken)
  ) {
    if (cleanToken === 'AGND') {
      return { type: 'ground', description: 'Analog Ground (Ground Khusus Sinyal Analog Bebas Noise)', isConfident: true };
    }
    if (cleanToken.startsWith('COM')) {
      return { type: 'ground', description: 'Terminal Ground / Common Return (COM)', isConfident: true };
    }
    if (cleanToken === 'GND_HV' || cleanToken === 'HV_GND') {
      return { type: 'ground', description: 'Power Ground Sisi High Voltage (0V)', isConfident: true };
    }
    if (cleanToken === 'GND_LV' || cleanToken === 'LV_GND') {
      return { type: 'ground', description: 'Power Ground Sisi Low Voltage (0V)', isConfident: true };
    }
    return { type: 'ground', description: 'Power Ground (Referensi Daya & Sinyal 0V)', isConfident: true };
  }

  // 2. POWER PINS MATCHES
  if (
    cleanToken === 'HV' ||
    cleanToken === 'HV_POWER' ||
    cleanToken === 'HV_5V' ||
    cleanToken === 'HIGH_VOLTAGE'
  ) {
    return { type: 'power', description: 'High Voltage Supply Reference (+5V DC)', isConfident: true };
  }

  if (
    cleanToken === 'LV' ||
    cleanToken === 'LV_POWER' ||
    cleanToken === 'LV_3V3' ||
    cleanToken === 'LOW_VOLTAGE'
  ) {
    return { type: 'power', description: 'Low Voltage Supply Reference (+3.3V DC)', isConfident: true };
  }

  if (
    cleanToken === 'VIN' ||
    cleanToken === '5V' ||
    cleanToken === '+5V' ||
    cleanToken === '5V_IN' ||
    cleanToken === '5V_POWER' ||
    cleanToken === 'VBUS' ||
    cleanToken === 'RAW' ||
    cleanToken === 'PWR' ||
    cleanToken === 'POWER'
  ) {
    return { type: 'power', description: 'Tegangan Masukan Power Supply (+5V DC / Eksternal)', isConfident: true };
  }

  if (
    cleanToken === '3V3' ||
    cleanToken === '3.3V' ||
    cleanToken === '+3.3V' ||
    cleanToken === '3V' ||
    cleanToken === '3V3_OUT' ||
    cleanToken === '3V3_POWER'
  ) {
    return { type: 'power', description: 'Keluaran Tegangan Teratur +3.3V DC (LDO Onboard)', isConfident: true };
  }

  if (
    cleanToken === 'VCC' ||
    cleanToken === 'VDD' ||
    cleanToken === 'AVCC' ||
    cleanToken === '+V' ||
    cleanToken === 'V+' ||
    cleanToken === 'VCC_5V' ||
    cleanToken === 'VCC_3V3' ||
    cleanToken === 'VCC_IN' ||
    cleanToken === 'VCC_POWER'
  ) {
    return { type: 'power', description: 'Tegangan Masukan Daya Positif (+3.3V / +5V DC)', isConfident: true };
  }

  if (cleanToken === 'IN+' || cleanToken === 'VIN+' || cleanToken === 'V_IN+') {
    return { type: 'power', description: 'Terminal Positif Tegangan Masukan (Power Input +)', isConfident: true };
  }
  if (cleanToken === 'IN-' || cleanToken === 'VIN-' || cleanToken === 'V_IN-') {
    return { type: 'power', description: 'Terminal Negatif Tegangan Masukan (Power Input -)', isConfident: true };
  }
  if (cleanToken === 'OUT+' || cleanToken === 'VOUT+' || cleanToken === 'V_OUT+') {
    return { type: 'power', description: 'Terminal Positif Tegangan Keluaran (Power Output +)', isConfident: true };
  }
  if (cleanToken === 'OUT-' || cleanToken === 'VOUT-' || cleanToken === 'V_OUT-') {
    return { type: 'power', description: 'Terminal Negatif Tegangan Keluaran (Power Output -)', isConfident: true };
  }

  if (cleanToken === 'B+' || cleanToken === 'BAT+' || cleanToken === 'VBAT' || cleanToken === 'BATTERY+') {
    return { type: 'power', description: 'Terminal Positif Baterai (+3.7V / +7.4V DC)', isConfident: true };
  }
  if (cleanToken === 'B-' || cleanToken === 'BAT-' || cleanToken === 'BATTERY-') {
    return { type: 'power', description: 'Terminal Negatif Baterai (Battery Ground -)', isConfident: true };
  }

  if (cleanToken === 'AREF' || cleanToken === 'VREF') {
    return { type: 'power', description: 'Tegangan Referensi Analog (Analog Reference Voltage)', isConfident: true };
  }
  if (cleanToken === 'IOREF') {
    return { type: 'power', description: 'Tegangan Referensi Logika I/O Mikrokontroler', isConfident: true };
  }
  if (cleanToken === '12V' || cleanToken === '+12V') {
    return { type: 'power', description: 'Tegangan Masukan Daya Utama (+12V DC)', isConfident: true };
  }
  if (cleanToken === '24V' || cleanToken === '+24V') {
    return { type: 'power', description: 'Tegangan Masukan Daya Utama (+24V DC)', isConfident: true };
  }

  // 3. LOGIC LEVEL CONVERTER CHANNELS (HV1..HV8, LV1..LV8)
  if (/^HV\d+$/i.test(cleanToken)) {
    const ch = cleanToken.replace(/^HV/i, '');
    return { type: 'digital', description: `High Voltage Channel ${ch} (5V Side)`, isConfident: true };
  }
  if (/^LV\d+$/i.test(cleanToken)) {
    const ch = cleanToken.replace(/^LV/i, '');
    return { type: 'digital', description: `Low Voltage Channel ${ch} (3.3V Side)`, isConfident: true };
  }
  if (cleanToken === 'OE' || cleanToken === 'OE_ENABLE' || cleanToken === 'OUTPUT_ENABLE') {
    return { type: 'digital', description: 'Output Enable / Active High Control Pin', isConfident: true };
  }

  // 4. I2C PROTOCOL
  if (cleanToken === 'SCL' || cleanToken === 'I2C_SCL' || cleanToken === 'SCLK_I2C') {
    return { type: 'i2c', description: 'I2C Serial Clock (SCL)', isConfident: true };
  }
  if (cleanToken === 'SDA' || cleanToken === 'I2C_SDA' || cleanToken === 'SDAT') {
    return { type: 'i2c', description: 'I2C Serial Data (SDA)', isConfident: true };
  }

  // 5. SPI PROTOCOL
  if (
    cleanToken === 'CLK' ||
    cleanToken === 'SCK' ||
    cleanToken === 'SCLK' ||
    cleanToken === 'SPI_CLK' ||
    cleanToken === 'SPI_SCK' ||
    cleanToken.includes('VSPI_SCK') ||
    cleanToken.includes('HSPI_CLK')
  ) {
    return { type: 'spi', description: 'SPI Serial Clock (SCK)', isConfident: true };
  }

  if (
    cleanToken === 'MOSI' ||
    cleanToken === 'SDI' ||
    cleanToken === 'DIN' ||
    cleanToken === 'SI' ||
    cleanToken.includes('VSPI_MOSI') ||
    cleanToken.includes('HSPI_MOSI') ||
    cleanToken === 'CMD'
  ) {
    return { type: 'spi', description: 'SPI Serial Data Input / Master Out Slave In (MOSI/SDI)', isConfident: true };
  }

  if (
    cleanToken === 'MISO' ||
    cleanToken === 'SDO' ||
    cleanToken === 'DOUT' ||
    cleanToken === 'SO' ||
    cleanToken.includes('VSPI_MISO') ||
    cleanToken.includes('HSPI_MISO')
  ) {
    return { type: 'spi', description: 'SPI Serial Data Output / Master In Slave Out (MISO/SDO)', isConfident: true };
  }

  if (
    cleanToken === 'CS' ||
    cleanToken === 'SS' ||
    cleanToken === 'NSS' ||
    cleanToken === 'CSN' ||
    cleanToken.includes('VSPI_SS') ||
    cleanToken.includes('HSPI_CS') ||
    cleanToken === 'CHIP_SELECT'
  ) {
    return { type: 'digital', description: 'SPI Chip Select / Slave Select (Active LOW)', isConfident: true };
  }

  if (cleanToken === 'RDY' || cleanToken === 'DRDY' || cleanToken === 'INT' || cleanToken === 'IRQ') {
    return { type: 'digital', description: 'Data Ready / Hardware Interrupt Indicator', isConfident: true };
  }

  // 6. UART / SERIAL PROTOCOL
  if (
    cleanToken === 'TX' ||
    cleanToken === 'TXD' ||
    cleanToken === 'TX0' ||
    cleanToken === 'TX1' ||
    cleanToken === 'TX2' ||
    cleanToken === 'UART_TX' ||
    cleanToken === 'DOUT_UART' ||
    cleanToken === 'SOUT'
  ) {
    return { type: 'uart', description: `UART Serial Transmit / Serial TX (${name.toUpperCase()})`, isConfident: true };
  }

  if (
    cleanToken === 'RX' ||
    cleanToken === 'RXD' ||
    cleanToken === 'RX0' ||
    cleanToken === 'RX1' ||
    cleanToken === 'RX2' ||
    cleanToken === 'UART_RX' ||
    cleanToken === 'DIN_UART' ||
    cleanToken === 'SIN'
  ) {
    return { type: 'uart', description: `UART Serial Receive / Serial RX (${name.toUpperCase()})`, isConfident: true };
  }

  // 7. ANALOG & RTD PINS
  if (/^A\d+$/i.test(cleanToken) || /^ADC\d*(_CH\d+)?$/i.test(cleanToken)) {
    return { type: 'analog', description: `Pin Masukan Analog ADC (Analog Input ${name.toUpperCase()})`, isConfident: true };
  }
  if (cleanToken === 'AO' || cleanToken === 'AOUT' || cleanToken === 'ANALOG_OUT' || /^DAC\d*$/i.test(cleanToken)) {
    return { type: 'analog', description: 'Keluaran Sinyal Analog / DAC (Analog Output)', isConfident: true };
  }
  if (cleanToken === 'VP' || cleanToken === 'SENSOR_VP') {
    return { type: 'analog', description: 'GPIO36 / SENSOR_VP / ADC1_CH0 (Input Only)', isConfident: true };
  }
  if (cleanToken === 'VN' || cleanToken === 'SENSOR_VN') {
    return { type: 'analog', description: 'GPIO39 / SENSOR_VN / ADC1_CH3 (Input Only)', isConfident: true };
  }
  if (cleanToken === 'RTD+' || cleanToken === 'RTD_POS') {
    return { type: 'passive', description: 'RTD Sense Positive Terminal', isConfident: true };
  }
  if (cleanToken === 'RTD-' || cleanToken === 'RTD_NEG') {
    return { type: 'passive', description: 'RTD Sense Negative Terminal', isConfident: true };
  }
  if (cleanToken === 'F+' || cleanToken === 'FORCE+' || cleanToken === 'FORCE_POS') {
    return { type: 'passive', description: 'Force Positive / RTD+ Excitation Lead', isConfident: true };
  }
  if (cleanToken === 'F-' || cleanToken === 'FORCE-' || cleanToken === 'FORCE_NEG') {
    return { type: 'passive', description: 'Force Negative / RTD- Return Lead', isConfident: true };
  }
  if (cleanToken === 'TDS' || cleanToken === 'PH' || cleanToken === 'TEMP') {
    return { type: 'analog', description: `Sinyal Masukan/Keluaran Sensor Analog (${name.toUpperCase()})`, isConfident: true };
  }

  // 8. DIGITAL & PWM PINS
  if (cleanToken.startsWith('PWM') || cleanToken.startsWith('~')) {
    return { type: 'pwm', description: `Digital I/O dengan dukungan PWM Output (${name.toUpperCase()})`, isConfident: true };
  }

  if (/^(D|IO|GPIO|P)\d+$/i.test(cleanToken)) {
    const num = parseInt(cleanToken.replace(/\D/g, ''), 10);
    // Arduino Uno standard PWM pins: D3, D5, D6, D9, D10, D11
    const isUnoPwm = (cleanToken.startsWith('D') || cleanToken.startsWith('GPIO')) && [3, 5, 6, 9, 10, 11].includes(num);
    if (isUnoPwm && cleanToken.startsWith('D') && num <= 13) {
      return { type: 'pwm', description: `General Purpose Digital I/O dengan dukungan PWM (${name.toUpperCase()})`, isConfident: true };
    }
    return { type: 'digital', description: `General Purpose Digital Input/Output (${name.toUpperCase()})`, isConfident: true };
  }

  if (cleanToken === 'DO' || cleanToken === 'DOUT' || cleanToken === 'DIGITAL_OUT' || cleanToken === 'OUT') {
    return { type: 'digital', description: 'Keluaran Sinyal Digital (Digital Output)', isConfident: true };
  }
  if (cleanToken === 'IN' || cleanToken === 'DIN' || cleanToken === 'DIGITAL_IN') {
    return { type: 'digital', description: 'Masukan Sinyal Digital (Digital Input)', isConfident: true };
  }
  if (cleanToken === 'SIG' || cleanToken === 'SIGNAL' || cleanToken === 'IO') {
    return { type: 'digital', description: 'Sinyal Digital I/O (Signal Pin)', isConfident: true };
  }
  if (cleanToken === 'TRIG' || cleanToken === 'TRIGGER') {
    return { type: 'digital', description: 'Ultrasonic Trigger Pulse Input (10µs High Pulse)', isConfident: true };
  }
  if (cleanToken === 'ECHO') {
    return { type: 'digital', description: 'Ultrasonic Echo Pulse Output (Lebar Pulsa Sinyal Jarak)', isConfident: true };
  }

  // 9. CONTROL & SPECIAL PINS
  if (cleanToken === 'EN' || cleanToken === 'ENABLE' || cleanToken === 'CHIP_PU') {
    return { type: 'generic', description: 'Chip Enable / Module Activation Pin (Active LOW / HIGH)', isConfident: true };
  }
  if (cleanToken === 'RST' || cleanToken === 'RESET' || cleanToken === 'MCLR') {
    return { type: 'generic', description: 'System Hardware Reset Pin (Active LOW)', isConfident: true };
  }
  if (cleanToken === 'BOOT' || cleanToken === 'BOOT0' || cleanToken === 'BOOT1' || cleanToken === 'PROG') {
    return { type: 'digital', description: 'Bootloader Mode / Flash Programming Selector', isConfident: true };
  }
  if (cleanToken === 'ANODE' || cleanToken === 'A' || cleanToken === 'LED+' || cleanToken === '+') {
    return { type: 'passive', description: 'Anoda Positif (+)', isConfident: true };
  }
  if (cleanToken === 'CATHODE' || cleanToken === 'K' || cleanToken === 'CAT' || cleanToken === 'LED-' || cleanToken === '-') {
    return { type: 'passive', description: 'Katoda Negatif (-)', isConfident: true };
  }
  if (cleanToken === 'NC' || cleanToken === 'N/C' || cleanToken === 'DNC' || cleanToken === 'NOT_CONNECTED') {
    return { type: 'passive', description: 'No Connection (Jangan Dihubungkan / Kosong)', isConfident: true };
  }

  // 10. FALLBACK (NOT CONFIDENT)
  return {
    type: 'digital',
    description: `Terminal Pin ${name}`,
    isConfident: false,
  };
}
