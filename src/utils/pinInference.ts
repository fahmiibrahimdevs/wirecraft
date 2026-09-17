import { PinType } from '../types/circuit';

export interface PinProfile {
  type: PinType;
  description: string;
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
  { name: 'GND', type: 'ground', description: 'Power Ground (Referensi Daya & Sinyal 0V)', category: 'Power' },
  { name: 'IN+', type: 'power', description: 'Terminal Positif Tegangan Masukan (Power Input +)', category: 'Power' },
  { name: 'IN-', type: 'power', description: 'Terminal Negatif Tegangan Masukan (Power Input -)', category: 'Power' },
  { name: 'OUT+', type: 'power', description: 'Terminal Positif Tegangan Keluaran (Power Output +)', category: 'Power' },
  { name: 'OUT-', type: 'power', description: 'Terminal Negatif Tegangan Keluaran (Power Output -)', category: 'Power' },
  { name: 'B+', type: 'power', description: 'Terminal Positif Baterai (+3.7V / +7.4V DC)', category: 'Power' },
  { name: 'B-', type: 'power', description: 'Terminal Negatif Baterai (Battery Ground -)', category: 'Power' },
  { name: 'AREF', type: 'power', description: 'Tegangan Referensi Analog (Analog Reference Voltage)', category: 'Power' },

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
    return { type: 'digital', description: '' };
  }

  const upper = name.toUpperCase().replace(/\s+/g, '_');

  // 1. EXACT & PREFIX GROUND MATCHES
  if (
    upper === 'GND' ||
    upper === '0V' ||
    upper === 'VSS' ||
    upper === 'DGND' ||
    upper === 'AGND' ||
    upper === 'PGND' ||
    upper === 'COM' ||
    upper === 'COMMON' ||
    upper === 'GROUND' ||
    /^GND(_|\d+|$)/i.test(upper)
  ) {
    if (upper === 'AGND') {
      return { type: 'ground', description: 'Analog Ground (Ground Khusus Sinyal Analog Bebas Noise)' };
    }
    if (upper.startsWith('COM')) {
      return { type: 'ground', description: 'Terminal Ground / Common Return (COM)' };
    }
    return { type: 'ground', description: 'Power Ground (Referensi Daya & Sinyal 0V)' };
  }

  // 2. POWER PINS MATCHES
  if (
    upper === 'VIN' ||
    upper === '5V' ||
    upper === '+5V' ||
    upper === '5V_IN' ||
    upper === 'VBUS' ||
    upper === 'RAW' ||
    upper === 'PWR'
  ) {
    return { type: 'power', description: 'Tegangan Masukan Power Supply (+5V DC / Eksternal)' };
  }

  if (
    upper === '3V3' ||
    upper === '3.3V' ||
    upper === '+3.3V' ||
    upper === '3V' ||
    upper === '3V3_OUT'
  ) {
    return { type: 'power', description: 'Keluaran Tegangan Teratur +3.3V DC (LDO Onboard)' };
  }

  if (
    upper === 'VCC' ||
    upper === 'VDD' ||
    upper === 'AVCC' ||
    upper === '+V' ||
    upper === 'V+'
  ) {
    return { type: 'power', description: 'Tegangan Masukan Daya Positif (+3.3V / +5V DC)' };
  }

  if (upper === 'IN+' || upper === 'VIN+' || upper === 'V_IN+') {
    return { type: 'power', description: 'Terminal Positif Tegangan Masukan (Power Input +)' };
  }
  if (upper === 'IN-' || upper === 'VIN-' || upper === 'V_IN-') {
    return { type: 'power', description: 'Terminal Negatif Tegangan Masukan (Power Input -)' };
  }
  if (upper === 'OUT+' || upper === 'VOUT+' || upper === 'V_OUT+') {
    return { type: 'power', description: 'Terminal Positif Tegangan Keluaran (Power Output +)' };
  }
  if (upper === 'OUT-' || upper === 'VOUT-' || upper === 'V_OUT-') {
    return { type: 'power', description: 'Terminal Negatif Tegangan Keluaran (Power Output -)' };
  }

  if (upper === 'B+' || upper === 'BAT+' || upper === 'VBAT' || upper === 'BATTERY+') {
    return { type: 'power', description: 'Terminal Positif Baterai (+3.7V / +7.4V DC)' };
  }
  if (upper === 'B-' || upper === 'BAT-' || upper === 'BATTERY-') {
    return { type: 'power', description: 'Terminal Negatif Baterai (Battery Ground -)' };
  }

  if (upper === 'AREF' || upper === 'VREF') {
    return { type: 'power', description: 'Tegangan Referensi Analog (Analog Reference Voltage)' };
  }
  if (upper === 'IOREF') {
    return { type: 'power', description: 'Tegangan Referensi Logika I/O Mikrokontroler' };
  }
  if (upper === '12V' || upper === '+12V') {
    return { type: 'power', description: 'Tegangan Masukan Daya Utama (+12V DC)' };
  }
  if (upper === '24V' || upper === '+24V') {
    return { type: 'power', description: 'Tegangan Masukan Daya Utama (+24V DC)' };
  }

  // 3. I2C PROTOCOL
  if (upper === 'SCL' || upper === 'I2C_SCL' || upper === 'SCLK_I2C') {
    return { type: 'i2c', description: 'I2C Serial Clock (SCL)' };
  }
  if (upper === 'SDA' || upper === 'I2C_SDA' || upper === 'SDAT') {
    return { type: 'i2c', description: 'I2C Serial Data (SDA)' };
  }

  // 4. SPI PROTOCOL
  if (
    upper === 'CLK' ||
    upper === 'SCK' ||
    upper === 'SCLK' ||
    upper === 'SPI_CLK' ||
    upper === 'SPI_SCK' ||
    upper.includes('VSPI_SCK') ||
    upper.includes('HSPI_CLK')
  ) {
    return { type: 'spi', description: 'SPI Serial Clock (SCK)' };
  }

  if (
    upper === 'MOSI' ||
    upper === 'SDI' ||
    upper === 'DIN' ||
    upper === 'SI' ||
    upper.includes('VSPI_MOSI') ||
    upper.includes('HSPI_MOSI') ||
    upper === 'CMD'
  ) {
    return { type: 'spi', description: 'SPI Serial Data Input / Master Out Slave In (MOSI/SDI)' };
  }

  if (
    upper === 'MISO' ||
    upper === 'SDO' ||
    upper === 'DOUT' ||
    upper === 'SO' ||
    upper.includes('VSPI_MISO') ||
    upper.includes('HSPI_MISO')
  ) {
    return { type: 'spi', description: 'SPI Serial Data Output / Master In Slave Out (MISO/SDO)' };
  }

  if (
    upper === 'CS' ||
    upper === 'SS' ||
    upper === 'NSS' ||
    upper === 'CSN' ||
    upper.includes('VSPI_SS') ||
    upper.includes('HSPI_CS') ||
    upper === 'CHIP_SELECT'
  ) {
    return { type: 'digital', description: 'SPI Chip Select / Slave Select (Active LOW)' };
  }

  if (upper === 'RDY' || upper === 'DRDY' || upper === 'INT' || upper === 'IRQ') {
    return { type: 'digital', description: 'Data Ready / Hardware Interrupt Indicator' };
  }

  // 5. UART / SERIAL PROTOCOL
  if (
    upper === 'TX' ||
    upper === 'TXD' ||
    upper === 'TX0' ||
    upper === 'TX1' ||
    upper === 'TX2' ||
    upper === 'UART_TX' ||
    upper === 'DOUT_UART' ||
    upper === 'SOUT'
  ) {
    return { type: 'uart', description: `UART Serial Transmit / Serial TX (${name.toUpperCase()})` };
  }

  if (
    upper === 'RX' ||
    upper === 'RXD' ||
    upper === 'RX0' ||
    upper === 'RX1' ||
    upper === 'RX2' ||
    upper === 'UART_RX' ||
    upper === 'DIN_UART' ||
    upper === 'SIN'
  ) {
    return { type: 'uart', description: `UART Serial Receive / Serial RX (${name.toUpperCase()})` };
  }

  // 6. ANALOG & RTD PINS
  if (/^A\d+$/i.test(upper) || /^ADC\d*(_CH\d+)?$/i.test(upper)) {
    return { type: 'analog', description: `Pin Masukan Analog ADC (Analog Input ${name.toUpperCase()})` };
  }
  if (upper === 'AO' || upper === 'AOUT' || upper === 'ANALOG_OUT' || /^DAC\d*$/i.test(upper)) {
    return { type: 'analog', description: 'Keluaran Sinyal Analog / DAC (Analog Output)' };
  }
  if (upper === 'VP' || upper === 'SENSOR_VP') {
    return { type: 'analog', description: 'GPIO36 / SENSOR_VP / ADC1_CH0 (Input Only)' };
  }
  if (upper === 'VN' || upper === 'SENSOR_VN') {
    return { type: 'analog', description: 'GPIO39 / SENSOR_VN / ADC1_CH3 (Input Only)' };
  }
  if (upper === 'RTD+' || upper === 'RTD_POS') {
    return { type: 'passive', description: 'RTD Sense Positive Terminal' };
  }
  if (upper === 'RTD-' || upper === 'RTD_NEG') {
    return { type: 'passive', description: 'RTD Sense Negative Terminal' };
  }
  if (upper === 'F+' || upper === 'FORCE+' || upper === 'FORCE_POS') {
    return { type: 'passive', description: 'Force Positive / RTD+ Excitation Lead' };
  }
  if (upper === 'F-' || upper === 'FORCE-' || upper === 'FORCE_NEG') {
    return { type: 'passive', description: 'Force Negative / RTD- Return Lead' };
  }
  if (upper === 'TDS' || upper === 'PH' || upper === 'TEMP') {
    return { type: 'analog', description: `Sinyal Masukan/Keluaran Sensor Analog (${name.toUpperCase()})` };
  }

  // 7. DIGITAL & PWM PINS
  if (upper.startsWith('PWM') || upper.startsWith('~')) {
    return { type: 'pwm', description: `Digital I/O dengan dukungan PWM Output (${name.toUpperCase()})` };
  }

  if (/^(D|IO|GPIO|P)\d+$/i.test(upper)) {
    const num = parseInt(upper.replace(/\D/g, ''), 10);
    // Arduino Uno standard PWM pins: D3, D5, D6, D9, D10, D11
    const isUnoPwm = (upper.startsWith('D') || upper.startsWith('GPIO')) && [3, 5, 6, 9, 10, 11].includes(num);
    if (isUnoPwm && upper.startsWith('D') && num <= 13) {
      return { type: 'pwm', description: `General Purpose Digital I/O dengan dukungan PWM (${name.toUpperCase()})` };
    }
    return { type: 'digital', description: `General Purpose Digital Input/Output (${name.toUpperCase()})` };
  }

  if (upper === 'DO' || upper === 'DOUT' || upper === 'DIGITAL_OUT' || upper === 'OUT') {
    return { type: 'digital', description: 'Keluaran Sinyal Digital (Digital Output)' };
  }
  if (upper === 'IN' || upper === 'DIN' || upper === 'DIGITAL_IN') {
    return { type: 'digital', description: 'Masukan Sinyal Digital (Digital Input)' };
  }
  if (upper === 'SIG' || upper === 'SIGNAL' || upper === 'IO') {
    return { type: 'digital', description: 'Sinyal Digital I/O (Signal Pin)' };
  }
  if (upper === 'TRIG' || upper === 'TRIGGER') {
    return { type: 'digital', description: 'Ultrasonic Trigger Pulse Input (10µs High Pulse)' };
  }
  if (upper === 'ECHO') {
    return { type: 'digital', description: 'Ultrasonic Echo Pulse Output (Lebar Pulsa Sinyal Jarak)' };
  }

  // 8. CONTROL & SPECIAL PINS
  if (upper === 'EN' || upper === 'ENABLE' || upper === 'CHIP_PU') {
    return { type: 'generic', description: 'Chip Enable / Module Activation Pin (Active LOW / HIGH)' };
  }
  if (upper === 'RST' || upper === 'RESET' || upper === 'MCLR') {
    return { type: 'generic', description: 'System Hardware Reset Pin (Active LOW)' };
  }
  if (upper === 'BOOT' || upper === 'BOOT0' || upper === 'BOOT1' || upper === 'PROG') {
    return { type: 'digital', description: 'Bootloader Mode / Flash Programming Selector' };
  }
  if (upper === 'ANODE' || upper === 'A' || upper === 'LED+' || upper === '+') {
    return { type: 'passive', description: 'Anoda Positif (+)' };
  }
  if (upper === 'CATHODE' || upper === 'K' || upper === 'CAT' || upper === 'LED-' || upper === '-') {
    return { type: 'passive', description: 'Katoda Negatif (-)' };
  }
  if (upper === 'NC' || upper === 'N/C' || upper === 'DNC' || upper === 'NOT_CONNECTED') {
    return { type: 'passive', description: 'No Connection (Jangan Dihubungkan / Kosong)' };
  }

  // 9. FALLBACK
  return {
    type: 'digital',
    description: `Terminal Pin ${name}`,
  };
}
