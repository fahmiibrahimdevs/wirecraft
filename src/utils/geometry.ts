import { Pin, WirePoint, WireRouting } from '../types/circuit';

/**
 * Calculates absolute world coordinates of a pin on a component taking rotation into account.
 * Rotation center is the center of the component bounding box.
 */
export function getPinWorldPosition(
  compX: number,
  compY: number,
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
  pin: Pin
): WirePoint {
  const cx = width / 2;
  const cy = height / 2;
  const relX = pin.x - cx;
  const relY = pin.y - cy;

  let rotX = relX;
  let rotY = relY;

  switch (rotation) {
    case 90:
      rotX = -relY;
      rotY = relX;
      break;
    case 180:
      rotX = -relX;
      rotY = -relY;
      break;
    case 270:
      rotX = relY;
      rotY = -relX;
      break;
    case 0:
    default:
      break;
  }

  return {
    x: compX + cx + rotX,
    y: compY + cy + rotY,
  };
}

/**
 * Snap coordinate to nearest grid size
 */
export function snapToGrid(val: number, gridSize = 10): number {
  return Math.round(val / gridSize) * gridSize;
}

/**
 * Generates an SVG path string for a wire between start, waypoints, and end point.
 */
export function generateWirePath(
  start: WirePoint,
  end: WirePoint,
  routing: WireRouting = 'bezier',
  waypoints: WirePoint[] = []
): string {
  const points = [start, ...waypoints, end];

  if (points.length < 2) return '';

  if (routing === 'straight') {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  if (routing === 'orthogonal') {
    // Manhattan orthogonal routing with rounded corners
    if (waypoints.length > 0) {
      // Connect points sequentially with right angles
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const midX = (p1.x + p2.x) / 2;
        d += ` L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
      }
      return d;
    }

    // Default orthogonal between start & end
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const midX = start.x + dx / 2;

    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  }

  // Realistic curved jumper wire (smooth Bezier)
  if (waypoints.length === 0) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Natural wire sag or curvature
    const curvature = Math.min(Math.max(dist * 0.25, 25), 100);
    const sagY = curvature;

    const cp1x = start.x + dx * 0.25;
    const cp1y = start.y + dy * 0.1 + sagY;
    const cp2x = start.x + dx * 0.75;
    const cp2y = start.y + dy * 0.9 + sagY;

    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
  }

  // Smooth spline through waypoints
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Calculates 5-band resistor color code for precision metal film resistors (blue body).
 * Band 1: 1st significant digit (0-9)
 * Band 2: 2nd significant digit (0-9)
 * Band 3: 3rd significant digit (0-9)
 * Band 4: Multiplier (10^n)
 * Band 5: Tolerance (Brown = 1% for standard metal film)
 */
export function getResistor5BandColors(ohms: number): [string, string, string, string, string] {
  const digitColors: Record<number, string> = {
    0: '#171717', // Black
    1: '#854d0e', // Brown
    2: '#dc2626', // Red
    3: '#ea580c', // Orange
    4: '#eab308', // Yellow
    5: '#16a34a', // Green
    6: '#2563eb', // Blue
    7: '#9333ea', // Violet
    8: '#64748b', // Gray
    9: '#f8fafc', // White
  };

  const gold = '#d97706'; // 0.1 multiplier
  const silver = '#94a3b8'; // 0.01 multiplier
  const tolBrown = '#854d0e'; // 1% tolerance (standard metal film)

  if (!ohms || ohms <= 0) {
    return [digitColors[0], digitColors[0], digitColors[0], digitColors[0], tolBrown];
  }

  const exponent = Math.floor(Math.log10(ohms));
  const norm = ohms / Math.pow(10, exponent);
  const roundedNorm = Math.round(norm * 100) / 100;
  const sigStr = roundedNorm.toFixed(2).replace('.', '').padEnd(3, '0');

  const d1 = parseInt(sigStr[0] || '1', 10);
  const d2 = parseInt(sigStr[1] || '0', 10);
  const d3 = parseInt(sigStr[2] || '0', 10);
  const mult = exponent - 2;

  const c1 = digitColors[d1] ?? digitColors[1];
  const c2 = digitColors[d2] ?? digitColors[0];
  const c3 = digitColors[d3] ?? digitColors[0];

  let c4 = digitColors[0];
  if (mult >= 0 && mult <= 9) {
    c4 = digitColors[mult];
  } else if (mult === -1) {
    c4 = gold;
  } else if (mult === -2) {
    c4 = silver;
  }

  return [c1, c2, c3, c4, tolBrown];
}

/**
 * Format resistance to human readable string (e.g. 220Ω, 1kΩ, 10kΩ)
 */
export function formatResistance(ohms: number): string {
  if (ohms >= 1000000) {
    return `${(ohms / 1000000).toFixed(ohms % 1000000 === 0 ? 0 : 1)}MΩ`;
  }
  if (ohms >= 1000) {
    return `${(ohms / 1000).toFixed(ohms % 1000 === 0 ? 0 : 1)}kΩ`;
  }
  return `${ohms}Ω`;
}

/**
 * Determines standard electronics wire color based on pin type and name / protocol.
 */
export function getAutoPinColor(pin: Pin): string | null {
  const pid = pin.id.toLowerCase();
  const pname = pin.name.toLowerCase();
  const pdesc = (pin.description || '').toLowerCase();

  // 1. Ground: Black (#1e293b)
  if (
    pin.type === 'ground' ||
    pid.includes('gnd') ||
    pname.includes('gnd') ||
    pid.startsWith('cable_earth') ||
    pid === 'ct_neg' ||
    pname === '-'
  ) {
    return '#1e293b';
  }

  // 2. Power: Red (#ef4444)
  if (
    pin.type === 'power' ||
    pid.includes('vcc') ||
    pid.includes('vin') ||
    pid.includes('5v') ||
    pid.includes('3v3') ||
    pid.includes('3.3v') ||
    pid.includes('cable_l') ||
    pid === 'ct_pos' ||
    pname.includes('vcc') ||
    pname.includes('vin') ||
    pname.includes('5v') ||
    pname.includes('3v3') ||
    pname.includes('3.3v') ||
    pname === '+'
  ) {
    return '#ef4444';
  }

  // 3. Clock (SCL / SCK / CLK): Yellow (#eab308)
  if (
    pid.includes('scl') ||
    pname.includes('scl') ||
    pdesc.includes('scl') ||
    pid.includes('sck') ||
    pname.includes('sck') ||
    pid.includes('clk') ||
    pname.includes('clk')
  ) {
    return '#eab308';
  }

  // 4. I2C Data (SDA): Purple (#a855f7)
  if (pid.includes('sda') || pname.includes('sda') || pdesc.includes('sda') || pin.type === 'i2c') {
    return '#a855f7';
  }

  // 5. SPI (MOSI / MISO / CS / SS): Yellow (#eab308)
  if (
    pin.type === 'spi' ||
    pid.includes('mosi') ||
    pname.includes('mosi') ||
    pid.includes('miso') ||
    pname.includes('miso') ||
    pdesc.includes('spi') ||
    pid.includes('vspi') ||
    pid.includes('hspi') ||
    pid.includes('cs') ||
    pid.includes('ss')
  ) {
    return '#eab308';
  }

  // 6. UART Serial (TX / RX): Cyan / Teal (#06b6d4)
  if (
    pin.type === 'uart' ||
    pid.includes('tx') ||
    pid.includes('rx') ||
    pname.includes('tx') ||
    pname.includes('rx')
  ) {
    return '#06b6d4';
  }

  // 7. Analog Input: Emerald / Green (#10b981)
  if (
    pin.type === 'analog' ||
    (pid.startsWith('a') && /^a\d+$/.test(pid)) ||
    pdesc.includes('adc') ||
    pid.includes('dac')
  ) {
    return '#10b981';
  }

  // 8. PWM Output: Amber / Orange (#f97316)
  if (pin.type === 'pwm' || pdesc.includes('pwm')) {
    return '#f97316';
  }

  return null;
}

/**
 * Returns the smart auto wire color for a connection between fromPin and optional toPin,
 * with fallback to currently selected user color.
 */
export function getAutoWireColor(
  fromPin: Pin,
  toPin?: Pin | null,
  fallbackColor = '#38bdf8'
): string {
  const fromColor = getAutoPinColor(fromPin);
  const toColor = toPin ? getAutoPinColor(toPin) : null;

  // If starting from a specific pin (e.g. 5V, GND, SDA), prioritize start pin color
  if (fromColor) {
    // If fromPin is generic / passive (like breadboard row) but toPin is specific (e.g. GND), adopt target color!
    if ((fromPin.type === 'generic' || fromPin.type === 'passive') && toColor) {
      return toColor;
    }
    return fromColor;
  }

  // If start pin is generic, adopt target pin color if target has one
  if (toColor) {
    return toColor;
  }

  return fallbackColor;
}
