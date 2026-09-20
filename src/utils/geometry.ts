import { Pin, WirePoint, WireRouting, CircuitComponent, ComponentDefinition, Wire } from '../types/circuit';
import { COMPONENT_DEFINITIONS } from '../constants/components';

export type PinDirection = 'up' | 'down' | 'left' | 'right';

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
 * Calculates the escape normal vector direction of a pin on a component.
 * Considers pin offset from bounding box borders and component rotation.
 */
export function getPinDirection(
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
  pin: Pin
): PinDirection {
  // 1. Determine local direction based on proximity to component bounding box edges
  let localDir: PinDirection;
  const distTop = pin.y;
  const distBottom = height - pin.y;
  const distLeft = pin.x;
  const distRight = width - pin.x;

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);
  if (minDist === distTop) {
    localDir = 'up';
  } else if (minDist === distBottom) {
    localDir = 'down';
  } else if (minDist === distLeft) {
    localDir = 'left';
  } else {
    localDir = 'right';
  }

  // 2. Apply component rotation (0, 90, 180, 270)
  const directions: PinDirection[] = ['up', 'right', 'down', 'left'];
  const baseIndex = directions.indexOf(localDir);
  const rotationOffset = Math.round(rotation / 90) % 4;
  const finalIndex = (baseIndex + rotationOffset) % 4;

  return directions[finalIndex]!;
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
  waypoints: WirePoint[] = [],
  startDir?: PinDirection,
  endDir?: PinDirection
): string {
  const points = [start, ...waypoints, end];

  if (points.length < 2) return '';

  if (routing === 'straight') {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  if (routing === 'orthogonal') {
    // Manhattan orthogonal routing with natural escape stubs
    if (waypoints.length > 0) {
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]!;
        const p2 = points[i + 1]!;
        const midX = (p1.x + p2.x) / 2;
        d += ` L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
      }
      return d;
    }

    if (Math.abs(start.x - end.x) <= 2 || Math.abs(start.y - end.y) <= 2) {
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    const isSourceV = startDir === 'up' || startDir === 'down';
    const isTargetV = endDir === 'up' || endDir === 'down';

    if (startDir && endDir && isSourceV !== isTargetV) {
      if (isSourceV) {
        return `M ${start.x} ${start.y} L ${start.x} ${end.y} L ${end.x} ${end.y}`;
      } else {
        return `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
      }
    }

    if (isSourceV && isTargetV) {
      if (startDir === endDir) {
        const stubLen = 18;
        const sStubY = startDir === 'up' ? start.y - stubLen : start.y + stubLen;
        const tStubY = endDir === 'up' ? end.y - stubLen : end.y + stubLen;
        const busY = startDir === 'up' ? Math.min(sStubY, tStubY) - 10 : Math.max(sStubY, tStubY) + 10;
        return `M ${start.x} ${start.y} L ${start.x} ${busY} L ${end.x} ${busY} L ${end.x} ${end.y}`;
      } else {
        const midY = (start.y + end.y) / 2;
        return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
      }
    }

    if (!isSourceV && !isTargetV && startDir && endDir) {
      if (startDir === endDir) {
        const stubLen = 18;
        const sStubX = startDir === 'left' ? start.x - stubLen : start.x + stubLen;
        const tStubX = endDir === 'left' ? end.x - stubLen : end.x + stubLen;
        const busX = startDir === 'left' ? Math.min(sStubX, tStubX) - 10 : Math.max(sStubX, tStubX) + 10;
        return `M ${start.x} ${start.y} L ${busX} ${start.y} L ${busX} ${end.y} L ${end.x} ${end.y}`;
      } else {
        const midX = (start.x + end.x) / 2;
        return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
      }
    }

    // Default orthogonal between start & end
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const midX = start.x + dx / 2;

    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  }

  // Realistic curved jumper wire (smooth Bezier with natural tension and pin escape tangents)
  if (waypoints.length === 0) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy);

    // Natural jumper cable arch height (scaled gracefully with distance, not sagging loosely)
    const arch = Math.min(Math.max(dist * 0.2, 20), 80);

    // Escape tangent vectors
    let sVec = { x: 0, y: -arch };
    if (startDir === 'down') sVec = { x: 0, y: arch };
    else if (startDir === 'left') sVec = { x: -arch, y: 0 };
    else if (startDir === 'right') sVec = { x: arch, y: 0 };
    else if (!startDir) {
      sVec = { x: dx * 0.2, y: dy * 0.2 - arch * 0.6 };
    }

    let tVec = { x: 0, y: -arch };
    if (endDir === 'down') tVec = { x: 0, y: arch };
    else if (endDir === 'left') tVec = { x: -arch, y: 0 };
    else if (endDir === 'right') tVec = { x: arch, y: 0 };
    else if (!endDir) {
      tVec = { x: -dx * 0.2, y: -dy * 0.2 - arch * 0.6 };
    }

    const cp1x = start.x + sVec.x;
    const cp1y = start.y + sVec.y;
    const cp2x = end.x + tVec.x;
    const cp2y = end.y + tVec.y;

    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
  }

  // Smooth spline through waypoints with bounded tension
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

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

/**
 * Calculates the orthogonal projection / closest point from point P onto line segment (p1, p2)
 */
export function getClosestPointOnSegment(
  p: WirePoint,
  p1: WirePoint,
  p2: WirePoint
): { point: WirePoint; distance: number; isVertical: boolean; isHorizontal: boolean } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 0.0001) {
    return {
      point: { x: p1.x, y: p1.y },
      distance: Math.hypot(p.x - p1.x, p.y - p1.y),
      isVertical: false,
      isHorizontal: false,
    };
  }

  const t = Math.max(0, Math.min(1, ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq));
  const projX = Math.round((p1.x + t * dx) * 10) / 10;
  const projY = Math.round((p1.y + t * dy) * 10) / 10;
  const distance = Math.hypot(p.x - projX, p.y - projY);
  const isVertical = Math.abs(dx) < 2;
  const isHorizontal = Math.abs(dy) < 2;

  return {
    point: { x: projX, y: projY },
    distance,
    isVertical,
    isHorizontal,
  };
}

/**
 * Calculates the closest point on a polyline path (list of waypoints) to a target point P
 */
export function getClosestPointOnPath(
  p: WirePoint,
  pathPoints: WirePoint[]
): { point: WirePoint; distance: number; isVertical: boolean; isHorizontal: boolean; segmentIndex: number } | null {
  if (pathPoints.length < 2) return null;

  let bestResult: { point: WirePoint; distance: number; isVertical: boolean; isHorizontal: boolean; segmentIndex: number } | null = null;
  let minDistance = Infinity;

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i]!;
    const p2 = pathPoints[i + 1]!;
    const res = getClosestPointOnSegment(p, p1, p2);

    if (res.distance < minDistance) {
      minDistance = res.distance;
      bestResult = {
        ...res,
        segmentIndex: i,
      };
    }
  }

  return bestResult;
}

/**
 * Smartly snaps a point P onto a polyline wire path with perpendicular alignment
 * to a reference point (e.g. the source pin or other endpoint) and 10px grid alignment.
 */
export function getSmartWireSnapPoint(
  p: WirePoint,
  pathPoints: WirePoint[],
  refPoint?: WirePoint | null,
  snapGrid = true
): { point: WirePoint; distance: number; isVertical: boolean; isHorizontal: boolean; segmentIndex: number } | null {
  if (pathPoints.length < 2) return null;

  let bestResult: { point: WirePoint; distance: number; isVertical: boolean; isHorizontal: boolean; segmentIndex: number } | null = null;
  let minDistance = Infinity;

  // 1. Direct Corner/Vertex Magnetic Snap (strongest priority lock for T-junction corners)
  for (let i = 0; i < pathPoints.length; i++) {
    const v = pathPoints[i]!;
    const vDist = Math.hypot(p.x - v.x, p.y - v.y);
    if (vDist <= 24 && vDist < minDistance) {
      minDistance = vDist;
      bestResult = {
        point: { x: v.x, y: v.y },
        distance: vDist,
        isVertical: false,
        isHorizontal: false,
        segmentIndex: Math.min(i, pathPoints.length - 2),
      };
    }
  }

  // 2. Segment Magnetic Snapping
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i]!;
    const p2 = pathPoints[i + 1]!;
    const raw = getClosestPointOnSegment(p, p1, p2);

    if (raw.distance > 28) continue;

    let candidatePoint = { ...raw.point };

    // Vertex pull
    const distP1 = Math.hypot(p.x - p1.x, p.y - p1.y);
    const distP2 = Math.hypot(p.x - p2.x, p.y - p2.y);
    if (distP1 <= 24) {
      candidatePoint = { x: p1.x, y: p1.y };
    } else if (distP2 <= 24) {
      candidatePoint = { x: p2.x, y: p2.y };
    } else if (raw.isHorizontal) {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const segY = p1.y;

      // Magnetic Perpendicular Lock: if refPoint.x is near this segment
      if (
        refPoint &&
        refPoint.x >= minX - 16 &&
        refPoint.x <= maxX + 16 &&
        Math.abs(p.x - refPoint.x) < 32
      ) {
        candidatePoint = {
          x: Math.max(minX, Math.min(maxX, refPoint.x)),
          y: segY,
        };
      } else if (snapGrid) {
        const snappedX = Math.round(raw.point.x / 10) * 10;
        candidatePoint = {
          x: Math.max(minX, Math.min(maxX, snappedX)),
          y: segY,
        };
      }
    } else if (raw.isVertical) {
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      const segX = p1.x;

      // Magnetic Perpendicular Lock: if refPoint.y is near this segment
      if (
        refPoint &&
        refPoint.y >= minY - 16 &&
        refPoint.y <= maxY + 16 &&
        Math.abs(p.y - refPoint.y) < 32
      ) {
        candidatePoint = {
          x: segX,
          y: Math.max(minY, Math.min(maxY, refPoint.y)),
        };
      } else if (snapGrid) {
        const snappedY = Math.round(raw.point.y / 10) * 10;
        candidatePoint = {
          x: segX,
          y: Math.max(minY, Math.min(maxY, snappedY)),
        };
      }
    }

    const dist = Math.hypot(p.x - candidatePoint.x, p.y - candidatePoint.y);
    if (dist < minDistance) {
      minDistance = dist;
      bestResult = {
        point: candidatePoint,
        distance: dist,
        isVertical: raw.isVertical,
        isHorizontal: raw.isHorizontal,
        segmentIndex: i,
      };
    }
  }

  return bestResult;
}

/**
 * Normalizes pin names for cable marking tubes (e.g. "5v" -> "5V", "gnd1" -> "GND", "top-vcc-1" -> "+")
 */
export function getCleanPinName(pinName?: string, pinId?: string): string {
  const raw = (pinName || pinId || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();

  // Breadboard rails / tie points
  if (lower.includes('top-vcc') || lower.includes('bot-vcc') || lower === '+') return '+';
  if (lower.includes('top-gnd') || lower.includes('bot-gnd') || lower === '-') return '-';
  if (lower.startsWith('mini-row-') || lower.startsWith('row-')) {
    // e.g. mini-row-a-1 -> A1
    const parts = raw.split('-');
    if (parts.length >= 3) {
      return `${parts[1]!.toUpperCase()}${parts[2]}`;
    }
  }

  if (lower === 'gnd' || lower.startsWith('gnd') || lower === 'ground') return 'GND';
  if (lower === '5v' || lower === '+5v') return '5V';
  if (lower === '3v3' || lower === '3.3v') return '3.3V';
  if (lower === 'vin' || lower === '9v' || lower === '+9v') return 'VIN';
  if (lower === 'vcc') return 'VCC';
  if (lower === 'sda' || lower === 't_sda') return 'SDA';
  if (lower === 'scl' || lower === 't_scl') return 'SCL';
  if (lower === 'mosi' || lower === 'sdi') return 'MOSI';
  if (lower === 'miso' || lower === 'sdo') return 'MISO';
  if (lower === 'sck' || lower === 'clk') return 'SCK';
  if (lower === 'cs' || lower === 'ss') return 'CS';
  if (lower === 'rst' || lower === 'reset') return 'RST';
  if (lower.startsWith('rx')) return 'RX';
  if (lower.startsWith('tx')) return 'TX';
  if (lower === 'term_l' || lower === 'cable_l' || lower.includes('fasa')) return 'L';
  if (lower === 'term_n' || lower === 'cable_n' || lower.includes('netral')) return 'N';
  if (lower === 'cable_earth' || lower === 'pe' || lower.includes('arde')) return 'PE';
  if (lower === 'trig' || lower === 'trigger') return 'TRIG';
  if (lower === 'echo') return 'ECHO';
  if (lower === 'signal' || lower === 'sig') return 'SIG';

  if (lower === 'cathode' || lower === 'kathode' || lower === 'cat') return 'K';
  if (lower === 'anode' || lower === 'an') return 'A';

  // If pin starts with d (e.g. d13, d2) or a (e.g. a0, a1)
  if (/^d\d+$/i.test(raw)) return raw.toUpperCase();
  if (/^a\d+$/i.test(raw)) return raw.toUpperCase();

  // Generic passive pins without distinct names (e.g. pin1, pin2) return empty to let net signals take priority
  if (/^pin\d+$/i.test(lower)) return '';

  // Strip long descriptions if parentheses exist: "Signal (Orange)" -> "Signal"
  const clean = raw.replace(/\(.*?\)/g, '').trim();
  return clean.length <= 8 ? clean.toUpperCase() : clean.slice(0, 7).toUpperCase();
}

/**
 * Checks if a pin / component uses screw terminal / industrial clamping (deserving a ferrule crimp boot).
 */
export function isScrewTerminalConnection(compType?: string, pinId?: string): boolean {
  if (!compType) return false;
  const t = compType.toLowerCase();
  const p = (pinId || '').toLowerCase();

  // Industrial / AC / Terminal block components
  if (
    t.includes('terminal') ||
    t.includes('fitting-lamp') ||
    t.includes('steker-switch') ||
    t.includes('din-rail') ||
    t.includes('relay')
  ) {
    return true;
  }

  // Pin IDs indicating screw/cable clamps
  if (p.startsWith('term_') || p.startsWith('terminal_') || p.startsWith('screw_') || p.startsWith('cable_')) {
    return true;
  }

  return false;
}

/**
 * Checks whether an endpoint connection is an active signal source/destination
 * (e.g. Microcontroller GPIO, Power, GND Rail, Sensor/Display/Relay Pin)
 * as opposed to an unlabeled passive 2-terminal component (Resistor, Capacitor).
 */
export function isActivePinSignalConnection(compType?: string, pinId?: string, pinName?: string): boolean {
  const cType = (compType || '').toLowerCase();
  const pId = (pinId || '').toLowerCase();
  const pName = (pinName || '').toLowerCase();

  // Passive 2-pin components are NOT active source/destination pins
  if (cType === 'resistor' || cType === 'capacitor' || cType === 'inductor') {
    return false;
  }

  // Microcontrollers & development boards are always active
  if (
    cType.startsWith('arduino') ||
    cType.startsWith('esp32') ||
    cType.startsWith('nodemcu') ||
    cType.startsWith('wemos') ||
    cType.startsWith('raspberry') ||
    cType.startsWith('ftdi')
  ) {
    return true;
  }

  // Active sensors, displays, modules, relays
  if (
    cType.startsWith('sensor') ||
    cType.startsWith('display') ||
    cType === 'servo' ||
    cType.includes('relay')
  ) {
    return true;
  }

  // Power sources & industrial terminals
  if (
    cType.startsWith('battery') ||
    cType.includes('terminal') ||
    cType.includes('fitting-lamp') ||
    cType.includes('steker-switch')
  ) {
    return true;
  }

  // Ground / Power / Protocol / Named MCU Pin signals
  if (
    pId.includes('gnd') || pId.includes('vcc') || pId.includes('5v') || pId.includes('3v3') || pId.includes('vin') ||
    pName.includes('gnd') || pName.includes('vcc') || pName.includes('5v') || pName.includes('3v3') ||
    pId.startsWith('top-gnd') || pId.startsWith('bot-gnd') || pId.startsWith('top-vcc') || pId.startsWith('bot-vcc') ||
    pName === '+' || pName === '-' ||
    /^[da]\d+$/i.test(pName) || /^[da]\d+$/i.test(pId) ||
    ['sda', 'scl', 'mosi', 'miso', 'sck', 'tx', 'rx', 'trig', 'echo', 'pwm'].includes(pName) ||
    ['sda', 'scl', 'mosi', 'miso', 'sck', 'tx', 'rx', 'trig', 'echo', 'pwm'].includes(pId)
  ) {
    return true;
  }

  return false;
}

/**
 * Priority scoring for signal names in electrical networks:
 * Higher score means the signal name is more functionally significant (e.g. D2, 5V, GND > A11, row-1)
 */
function getSignalPriorityScore(name: string, compType?: string): number {
  const lower = name.toLowerCase().trim();
  const cType = (compType || '').toLowerCase();

  if (!lower) return 0;

  // Power & Ground
  if (lower === 'gnd' || lower === 'ground' || lower === '0v' || lower === 'pe') return 900;
  if (lower === '5v' || lower === '3v3' || lower === '3.3v' || lower === 'vin' || lower === 'vcc' || lower === '9v') return 890;
  if (lower === 'l' || lower === 'n') return 880;

  // Microcontroller Digital & Analog Pins, Bus protocols
  if (/^[da]\d+$/i.test(lower)) return 850; // D2, D13, A0, A1, etc.
  if (['sda', 'scl', 'mosi', 'miso', 'sck', 'cs', 'ss', 'rst', 'reset', 'tx', 'rx', 'trig', 'echo', 'pwm'].includes(lower)) return 840;

  // Active module signals
  if (['sig', 'signal', 'dio', 'clk', 'do', 'ao', 'dat', 'data'].includes(lower)) return 700;

  // Microcontroller components take precedence over passives
  if (
    cType.startsWith('arduino') ||
    cType.startsWith('esp32') ||
    cType.startsWith('raspberry') ||
    cType.startsWith('nodemcu') ||
    cType.startsWith('wemos') ||
    cType.startsWith('ftdi')
  ) {
    return 650;
  }

  // Active sensors / displays / outputs
  if (cType.startsWith('sensor') || cType.startsWith('display') || cType === 'servo') {
    return 600;
  }

  // Passive component pins (anode, cathode, pos, neg, pin1, pin2)
  if (['anode', 'cathode', 'a', 'k', 'pos', 'neg', 'pin1', 'pin2'].includes(lower)) return 200;

  // Breadboard grid coordinates (e.g. A1..J30, +, -)
  if (/^[a-j]\d+$/i.test(lower) || lower === '+' || lower === '-') return 100;

  return 300;
}

/**
 * Propagates electrical signal names across breadboard columns, power rails, component pins, and wires.
 * Returns a Map of wireId -> canonical Signal Name (e.g. "D2", "D3", "D4", "GND", "5V", "SDA").
 */
export function resolveCircuitNetSignals(
  components: CircuitComponent[],
  wires: Wire[],
  allDefs: Record<string, ComponentDefinition>,
  getPinCoords: (compId: string, pinId: string) => WirePoint | null
): Map<string, string> {
  // 1. Union-Find Disjoint Set
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!));
    }
    return parent.get(id)!;
  };

  const union = (idA: string, idB: string) => {
    const rootA = find(idA);
    const rootB = find(idB);
    if (rootA !== rootB) {
      parent.set(rootA, rootB);
    }
  };

  // 2. Identify Breadboards & map their physical holes
  const breadboards = components.filter((c) => c.type.startsWith('breadboard'));
  
  // Breadboard hole spatial map: "roundX,roundY" -> node key `${bb.id}:${internalNetId || pinId}`
  const bbHoleMap = new Map<string, { bbId: string; netKey: string }>();

  breadboards.forEach((bb) => {
    const bbDef = allDefs[bb.type] || COMPONENT_DEFINITIONS[bb.type];
    if (!bbDef) return;

    bbDef.pins.forEach((pin) => {
      const pWorld = getPinWorldPosition(bb.x, bb.y, bbDef.width, bbDef.height, bb.rotation, pin);
      const netKey = `${bb.id}:${pin.internalNetId || pin.id}`;
      // Map spatial coordinate (rounded to 4px tolerance)
      const coordKey = `${Math.round(pWorld.x / 4) * 4},${Math.round(pWorld.y / 4) * 4}`;
      bbHoleMap.set(coordKey, { bbId: bb.id, netKey });

      // If internalNetId is shared across multiple pins, union them
      if (pin.internalNetId) {
        union(`${bb.id}:pin:${pin.id}`, netKey);
      }
    });
  });

  // 3. Connect mounted components into Breadboard holes
  const compPinSignalMap = new Map<string, { name: string; score: number; compType: string }>();

  components.forEach((comp) => {
    if (comp.type.startsWith('breadboard')) return;
    const def = allDefs[comp.type] || COMPONENT_DEFINITIONS[comp.type];
    if (!def) return;

    def.pins.forEach((pin) => {
      const pinNode = `${comp.id}:${pin.id}`;
      const cleanName = getCleanPinName(pin.name, pin.id);
      const score = getSignalPriorityScore(cleanName, comp.type);
      compPinSignalMap.set(pinNode, { name: cleanName, score, compType: comp.type });

      // Find world position of this pin
      const pWorld = getPinCoords(comp.id, pin.id);
      if (pWorld && breadboards.length > 0) {
        const roundX = Math.round(pWorld.x / 4) * 4;
        const roundY = Math.round(pWorld.y / 4) * 4;
        let match = bbHoleMap.get(`${roundX},${roundY}`);

        // If exact 4px bucket didn't match, check neighbor buckets (-4, 0, +4)
        if (!match) {
          for (let dx = -4; dx <= 4; dx += 4) {
            for (let dy = -4; dy <= 4; dy += 4) {
              const testKey = `${roundX + dx},${roundY + dy}`;
              if (bbHoleMap.has(testKey)) {
                match = bbHoleMap.get(testKey);
                break;
              }
            }
            if (match) break;
          }
        }

        if (match) {
          // Electrically connect component pin into the breadboard's column/rail net!
          union(pinNode, match.netKey);
        }
      }
    });
  });

  // 4. Connect Wires into the Electrical Graph
  wires.forEach((w) => {
    const wireNode = `wire:${w.id}`;

    // Connect from side
    if (w.fromComponentId && w.fromPinId) {
      const fromComp = components.find((c) => c.id === w.fromComponentId);
      if (fromComp && fromComp.type.startsWith('breadboard')) {
        const def = allDefs[fromComp.type] || COMPONENT_DEFINITIONS[fromComp.type];
        const pin = def?.pins.find((p) => p.id === w.fromPinId);
        const netKey = `${fromComp.id}:${pin?.internalNetId || w.fromPinId}`;
        union(wireNode, netKey);
        union(wireNode, `${fromComp.id}:pin:${w.fromPinId}`);
      } else {
        union(wireNode, `${w.fromComponentId}:${w.fromPinId}`);
      }
    } else if (w.fromWireId) {
      union(wireNode, `wire:${w.fromWireId}`);
    }

    // Connect to side
    if (w.toComponentId && w.toPinId) {
      const toComp = components.find((c) => c.id === w.toComponentId);
      if (toComp && toComp.type.startsWith('breadboard')) {
        const def = allDefs[toComp.type] || COMPONENT_DEFINITIONS[toComp.type];
        const pin = def?.pins.find((p) => p.id === w.toPinId);
        const netKey = `${toComp.id}:${pin?.internalNetId || w.toPinId}`;
        union(wireNode, netKey);
        union(wireNode, `${toComp.id}:pin:${w.toPinId}`);
      } else {
        union(wireNode, `${w.toComponentId}:${w.toPinId}`);
      }
    } else if (w.toWireId) {
      union(wireNode, `wire:${w.toWireId}`);
    }
  });

  // 5. Aggregate Best Signal Name for each Net Cluster
  const clusterSignals = new Map<string, { bestName: string; maxScore: number }>();

  // Check user custom wire labels first (highest rank 1000)
  wires.forEach((w) => {
    if (w.label) {
      const root = find(`wire:${w.id}`);
      const clean = w.label.trim();
      const cur = clusterSignals.get(root);
      if (!cur || cur.maxScore < 1000) {
        clusterSignals.set(root, { bestName: clean, maxScore: 1000 });
      }
    }
  });

  // Check component pins in each cluster
  compPinSignalMap.forEach((info, pinNode) => {
    if (!info.name) return;
    const root = find(pinNode);
    const cur = clusterSignals.get(root);
    if (!cur || info.score > cur.maxScore) {
      clusterSignals.set(root, { bestName: info.name, maxScore: info.score });
    }
  });

  // 6. Produce result Map for every wire
  const resultMap = new Map<string, string>();

  wires.forEach((w) => {
    const root = find(`wire:${w.id}`);
    const signal = clusterSignals.get(root);
    if (signal && signal.bestName) {
      resultMap.set(w.id, signal.bestName);
    } else {
      // Fallback: derive from immediate pin names
      const fromPin = w.fromPinId ? getCleanPinName(w.fromPinId) : '';
      const toPin = w.toPinId ? getCleanPinName(w.toPinId) : '';
      resultMap.set(w.id, fromPin || toPin || 'WIRE');
    }
  });

  return resultMap;
}


