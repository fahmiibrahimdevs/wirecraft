import { CircuitComponent, ComponentDefinition, Wire, WireRouting, WireMarkerPosition } from '../types/circuit';
import { COMPONENT_DEFINITIONS } from '../constants/components';

export interface BusConnectionLine {
  fromPinId: string;
  fromPinName: string;
  toPinId: string;
  toPinName: string;
  signalName: string;
  color: string;
}

export interface BusConnectionOption {
  id: string; // e.g. 'i2c', 'spi', 'uart', 'power', 'ultrasonic', 'servo', 'lcd-parallel'
  name: string; // e.g. 'I2C Bus (4 Kabel)'
  busType: 'i2c' | 'spi' | 'uart' | 'power' | 'ultrasonic' | 'servo' | 'lcd-parallel' | string;
  sourceComp: CircuitComponent;
  targetComp: CircuitComponent;
  connections: BusConnectionLine[];
  description: string;
  badgeColor: string;
}

// Color Palette standard for protocol buses
export const BUS_COLORS = {
  power5v: '#ef4444', // Red
  power3v3: '#f97316', // Orange
  ground: '#1e293b', // Black / Dark Slate
  sda: '#0284c7', // Sky Blue
  scl: '#f59e0b', // Amber
  mosi: '#0284c7', // Sky Blue
  miso: '#10b981', // Emerald Green
  sck: '#f59e0b', // Amber
  cs: '#8b5cf6', // Purple
  rst: '#ec4899', // Pink
  tx: '#06b6d4', // Cyan
  rx: '#10b981', // Emerald
  data: '#3b82f6', // Blue
  trig: '#0ea5e9', // Sky
  echo: '#10b981', // Emerald
  servoSignal: '#ea580c', // Dark Orange
};

/**
 * Helper to check if a component is a Host / Controller / Power Source
 */
export function isHostComponent(comp: CircuitComponent): boolean {
  if (!comp) return false;
  const t = comp.type.toLowerCase();
  const n = (comp.name || '').toLowerCase();
  const l = (comp.label || '').toLowerCase();
  return (
    t.startsWith('arduino') ||
    t.startsWith('esp32') ||
    t.startsWith('nodemcu') ||
    t.startsWith('wemos') ||
    t.startsWith('raspberry') ||
    t.startsWith('pico') ||
    t.startsWith('stm32') ||
    t.startsWith('teensy') ||
    t.startsWith('attiny') ||
    t.startsWith('ftdi') ||
    t.startsWith('battery') ||
    t.startsWith('psu') ||
    t.startsWith('power') ||
    t.startsWith('tp4056') ||
    t.startsWith('lm2596') ||
    t.startsWith('xl4015') ||
    n.includes('arduino') ||
    n.includes('esp32') ||
    n.includes('esp8266') ||
    n.includes('nodemcu') ||
    n.includes('wemos') ||
    n.includes('pico') ||
    l.includes('arduino') ||
    l.includes('esp32') ||
    l.includes('esp8266') ||
    l.includes('nodemcu') ||
    l.includes('wemos')
  );
}

/**
 * Extracts alphanumeric semantic tokens from pin names and IDs
 * (e.g. "D2 (SDA)" -> ["d2", "sda"], "IO21 (TX)" -> ["io21", "tx"])
 */
export function extractPinTokens(name: string, id: string, desc?: string): string[] {
  const text = `${name} ${id} ${desc || ''}`.toLowerCase();
  const words = text.split(/[^a-z0-9]+/);
  return Array.from(new Set(words.filter(Boolean)));
}

/**
 * Universal Semantic Pin Matcher
 * Finds a matching pin in a component definition using exact tokens, ID/name matches,
 * description keywords, and pin types.
 */
export function findPin(
  def: ComponentDefinition,
  aliases: string[],
  pinType?: 'i2c' | 'spi' | 'uart' | 'power' | 'ground' | 'pwm' | 'analog' | 'digital' | 'generic'
): { id: string; name: string; type?: string } | null {
  if (!def || !def.pins || def.pins.length === 0) return null;
  const lowerAliases = aliases.map((a) => a.toLowerCase().trim());

  // Pass 1: Exact token match or exact pin ID / name match
  for (const a of lowerAliases) {
    for (const p of def.pins) {
      const pId = p.id.toLowerCase().trim();
      const pName = p.name.toLowerCase().trim();
      const tokens = extractPinTokens(p.name, p.id);
      if (tokens.includes(a) || pId === a || pName === a) {
        return { id: p.id, name: p.name, type: p.type };
      }
    }
  }

  // Pass 2: Description token matches
  for (const a of lowerAliases) {
    for (const p of def.pins) {
      const descTokens = extractPinTokens(p.description || '', '');
      if (descTokens.includes(a)) {
        return { id: p.id, name: p.name, type: p.type };
      }
    }
  }

  // Pass 3: Prefix / Suffix match
  for (const a of lowerAliases) {
    for (const p of def.pins) {
      const pId = p.id.toLowerCase().trim();
      const pName = p.name.toLowerCase().trim();
      if (pId.startsWith(a) || pName.startsWith(a)) {
        return { id: p.id, name: p.name, type: p.type };
      }
    }
  }

  // Pass 4: Pin Type fallback
  if (pinType) {
    const matchingTypePin = def.pins.find((p) => p.type === pinType);
    if (matchingTypePin) {
      return { id: matchingTypePin.id, name: matchingTypePin.name, type: matchingTypePin.type };
    }
  }

  return null;
}

/**
 * Helper to get all occupied pin IDs for a given component in the current circuit
 */
export function getOccupiedPinIds(compId: string, existingWires: Wire[] = []): Set<string> {
  const occupied = new Set<string>();
  for (const w of existingWires) {
    if (w.fromComponentId === compId && w.fromPinId) {
      occupied.add(w.fromPinId);
    }
    if (w.toComponentId === compId && w.toPinId) {
      occupied.add(w.toPinId);
    }
  }
  return occupied;
}

/**
 * Universal Dynamic Free GPIO / Digital Pin Search:
 * 1. Checks if any preferred alias (e.g. ['cs', 'ss', 'd10', 'g5', 'd8']) is FREE.
 * 2. If all preferred aliases are occupied or not found, dynamically finds the next available
 *    unoccupied GPIO / Digital / PWM pin in the component definition.
 */
export function findFreeGpioPin(
  def: ComponentDefinition,
  occupiedPinIds: Set<string>,
  preferredAliases: string[] = [],
  fallbackTypes: ('digital' | 'pwm' | 'generic' | 'analog')[] = ['digital', 'pwm', 'generic']
): { id: string; name: string; type?: string } | null {
  if (!def || !def.pins || def.pins.length === 0) return null;

  // Step 1: Check preferred aliases that are NOT occupied
  for (const alias of preferredAliases) {
    const pin = findPin(def, [alias]);
    if (pin && !occupiedPinIds.has(pin.id)) {
      return pin;
    }
  }

  // Step 2: Dynamically scan host pins for any free digital/pwm/generic GPIO pin
  for (const p of def.pins) {
    if (occupiedPinIds.has(p.id)) continue;
    // Exclude power and ground pins
    if (p.type === 'power' || p.type === 'ground') continue;

    const isGpio = fallbackTypes.includes(p.type as any);
    const tokens = extractPinTokens(p.name, p.id, p.description);

    // Filter out analog reference (AREF), system EN, reset
    if (tokens.includes('aref') || tokens.includes('en') || tokens.includes('vref')) continue;

    if (isGpio) {
      return { id: p.id, name: p.name, type: p.type };
    }
  }

  // Step 3: Fallback to any non-power, non-ground pin
  for (const p of def.pins) {
    if (occupiedPinIds.has(p.id)) continue;
    if (p.type !== 'power' && p.type !== 'ground') {
      return { id: p.id, name: p.name, type: p.type };
    }
  }

  return null;
}

/**
 * Detects all possible auto-wiring communication buses and interface connections between two components.
 */
export function detectAvailableBusConnections(
  compA: CircuitComponent,
  compB: CircuitComponent,
  allDefs: Record<string, ComponentDefinition>,
  existingWires: Wire[] = []
): BusConnectionOption[] {
  if (!compA || !compB || compA.id === compB.id) return [];

  const defA = allDefs[compA.type] || COMPONENT_DEFINITIONS[compA.type];
  const defB = allDefs[compB.type] || COMPONENT_DEFINITIONS[compB.type];
  if (!defA || !defB) return [];

  // Determine which is Host (MCU/Power) and which is Peripheral/Target
  let host = compA;
  let hostDef = defA;
  let target = compB;
  let targetDef = defB;

  if (!isHostComponent(compA) && isHostComponent(compB)) {
    host = compB;
    hostDef = defB;
    target = compA;
    targetDef = defA;
  }

  // Runtime occupied pin IDs on host component
  const hostOccupiedPins = getOccupiedPinIds(host.id, existingWires);

  const options: BusConnectionOption[] = [];

  // Common Host Power & Ground resolution across all microcontrollers
  const host5v = findPin(hostDef, ['5v', 'vin', 'vbus', 'vv', 'vcc', '3v3', '3.3v', 'pos', 'v+'], 'power');
  const host3v3 = findPin(hostDef, ['3v3', '3.3v', 'vcc', '5v', 'vin'], 'power');
  const hostGnd = findPin(hostDef, ['gnd', 'gnd1', 'gnd2', 'gnd_top', 'gnd_bot1', 'gnd_left', 'gnd_right1', 'gnd_bot2', 'gnd_bot3', 'vss', 'g', 'neg', '-'], 'ground');

  const targetVcc = findPin(targetDef, ['vcc', '5v', '3v3', '3.3v', 'vdd', 'vin', 'pos', '+', 'power', 'v+'], 'power');
  const targetGnd = findPin(targetDef, ['gnd', 'vss', 'neg', '-', 'ground', 'g'], 'ground');

  // ==========================================
  // 1. I2C Bus Detection (SDA, SCL, VCC, GND) - True Shared Bus
  // ==========================================
  const targetSda = findPin(targetDef, ['sda', 't_sda', 'data'], 'i2c');
  const targetScl = findPin(targetDef, ['scl', 't_scl', 'clk', 'sclk'], 'i2c');

  // Universal Host I2C pin matching (Uno/Nano A4/A5, ESP32 G21/G22 or D21/D22, ESP8266 D2/D1, ESP32-C3 IO8/IO9, Pico GP4/GP5)
  const hostSda = findPin(hostDef, ['sda', 'g21', 'd21', 'gpio21', 'io8', 'a4', 'd2', 'gp4', 'gp0'], 'i2c');
  const hostScl = findPin(hostDef, ['scl', 'g22', 'd22', 'gpio22', 'io9', 'a5', 'd1', 'gp5', 'gp1'], 'i2c');

  if (targetSda && targetScl && hostSda && hostScl) {
    const i2cLines: BusConnectionLine[] = [];
    const pwrPin = host5v || host3v3;
    if (pwrPin && targetVcc) {
      i2cLines.push({
        fromPinId: pwrPin.id,
        fromPinName: pwrPin.name,
        toPinId: targetVcc.id,
        toPinName: targetVcc.name,
        signalName: '5V',
        color: BUS_COLORS.power5v,
      });
    }
    if (hostGnd && targetGnd) {
      i2cLines.push({
        fromPinId: hostGnd.id,
        fromPinName: hostGnd.name,
        toPinId: targetGnd.id,
        toPinName: targetGnd.name,
        signalName: 'GND',
        color: BUS_COLORS.ground,
      });
    }
    i2cLines.push({
      fromPinId: hostSda.id,
      fromPinName: hostSda.name,
      toPinId: targetSda.id,
      toPinName: targetSda.name,
      signalName: 'SDA',
      color: BUS_COLORS.sda,
    });
    i2cLines.push({
      fromPinId: hostScl.id,
      fromPinName: hostScl.name,
      toPinId: targetScl.id,
      toPinName: targetScl.name,
      signalName: 'SCL',
      color: BUS_COLORS.scl,
    });

    options.push({
      id: 'i2c',
      name: `I2C Bus (${i2cLines.length} Kabel)`,
      busType: 'i2c',
      sourceComp: host,
      targetComp: target,
      connections: i2cLines,
      description: `Menghubungkan jalur I2C (${hostSda.name} ke SDA, ${hostScl.name} ke SCL) beserta daya & Ground.`,
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    });
  }

  // ==========================================
  // 2. SPI Bus Detection (Shared MOSI/MISO/SCK + Dedicated Smart CS Allocation)
  // ==========================================
  const targetMosi = findPin(targetDef, ['mosi', 'sdi', 'din'], 'spi');
  const targetMiso = findPin(targetDef, ['miso', 'sdo', 'dout'], 'spi');
  const targetSck = findPin(targetDef, ['sck', 'sclk', 'clk'], 'spi');
  const targetCs = findPin(targetDef, ['cs', 'ss', 'sda', 'nss'], 'spi');
  const targetRst = findPin(targetDef, ['reset', 'rst']);

  if (targetMosi && targetSck) {
    // Universal Host SPI pin matching for Shared Data Bus
    const hostMosi = findPin(hostDef, ['mosi', 'g23', 'd23', 'gpio23', 'd11', 'd7', 'io6', 'gp19'], 'spi');
    const hostMiso = findPin(hostDef, ['miso', 'g19', 'd19', 'gpio19', 'd12', 'd6', 'io5', 'gp16'], 'spi');
    const hostSck = findPin(hostDef, ['sck', 'g18', 'd18', 'gpio18', 'd13', 'd5', 'io4', 'gp18'], 'spi');

    // Dynamic Free GPIO Allocation for CS (Never collides with existing SPI devices!)
    const hostCs = targetCs
      ? findFreeGpioPin(hostDef, hostOccupiedPins, ['cs', 'ss', 'd10', 'd8', 'g5', 'd5', 'gpio5', 'io7', 'io10', 'gp17'])
      : null;

    // Dynamic Free GPIO Allocation for RST (if target has reset pin)
    const hostOccupiedWithCs = new Set(hostOccupiedPins);
    if (hostCs) hostOccupiedWithCs.add(hostCs.id);

    const hostRst = targetRst
      ? findFreeGpioPin(hostDef, hostOccupiedWithCs, ['rst', 'reset', 'd9', 'g4', 'd4', 'd3', 'gp22'])
      : null;

    if (hostMosi && hostSck) {
      const spiLines: BusConnectionLine[] = [];
      const pwrPin = host3v3 || host5v;
      if (pwrPin && targetVcc) {
        spiLines.push({
          fromPinId: pwrPin.id,
          fromPinName: pwrPin.name,
          toPinId: targetVcc.id,
          toPinName: targetVcc.name,
          signalName: '3.3V',
          color: BUS_COLORS.power3v3,
        });
      }
      if (hostGnd && targetGnd) {
        spiLines.push({
          fromPinId: hostGnd.id,
          fromPinName: hostGnd.name,
          toPinId: targetGnd.id,
          toPinName: targetGnd.name,
          signalName: 'GND',
          color: BUS_COLORS.ground,
        });
      }
      if (hostMosi && targetMosi) {
        spiLines.push({
          fromPinId: hostMosi.id,
          fromPinName: hostMosi.name,
          toPinId: targetMosi.id,
          toPinName: targetMosi.name,
          signalName: 'MOSI',
          color: BUS_COLORS.mosi,
        });
      }
      if (hostMiso && targetMiso) {
        spiLines.push({
          fromPinId: hostMiso.id,
          fromPinName: hostMiso.name,
          toPinId: targetMiso.id,
          toPinName: targetMiso.name,
          signalName: 'MISO',
          color: BUS_COLORS.miso,
        });
      }
      if (hostSck && targetSck) {
        spiLines.push({
          fromPinId: hostSck.id,
          fromPinName: hostSck.name,
          toPinId: targetSck.id,
          toPinName: targetSck.name,
          signalName: 'SCK',
          color: BUS_COLORS.sck,
        });
      }
      if (hostCs && targetCs) {
        spiLines.push({
          fromPinId: hostCs.id,
          fromPinName: hostCs.name,
          toPinId: targetCs.id,
          toPinName: targetCs.name,
          signalName: 'CS',
          color: BUS_COLORS.cs,
        });
      }
      if (hostRst && targetRst) {
        spiLines.push({
          fromPinId: hostRst.id,
          fromPinName: hostRst.name,
          toPinId: targetRst.id,
          toPinName: targetRst.name,
          signalName: 'RST',
          color: BUS_COLORS.rst,
        });
      }

      options.push({
        id: 'spi',
        name: `SPI Bus (${spiLines.length} Kabel)`,
        busType: 'spi',
        sourceComp: host,
        targetComp: target,
        connections: spiLines,
        description: `Menghubungkan antarmuka SPI (MOSI, MISO, SCK) dengan alokasi pin CS unik (${hostCs?.name || 'CS'}) ke modul target.`,
        badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      });
    }
  }

  // ==========================================
  // 3. UART / Serial Bus Detection (TX ⇄ RX Crossover)
  // ==========================================
  const targetTx = findPin(targetDef, ['tx', 'txd', 'tx0', 'tx1', 'dout'], 'uart');
  const targetRx = findPin(targetDef, ['rx', 'rxd', 'rx0', 'rx1', 'din'], 'uart');

  // Find free UART port or fallback
  let hostTx = findPin(hostDef, ['tx', 'txd', 'tx0', 'tx1', 'd1', 'io21', 'gp0'], 'uart');
  let hostRx = findPin(hostDef, ['rx', 'rxd', 'rx0', 'rx1', 'd0', 'io20', 'gp1'], 'uart');

  // If primary UART is occupied, try secondary UART (TX2/RX2)
  if (hostTx && hostRx && (hostOccupiedPins.has(hostTx.id) || hostOccupiedPins.has(hostRx.id))) {
    const secTx = findPin(hostDef, ['tx2', 'txd2', 'tx1', 'txd1', 'io17'], 'uart');
    const secRx = findPin(hostDef, ['rx2', 'rxd2', 'rx1', 'rxd1', 'io16'], 'uart');
    if (secTx && secRx && !hostOccupiedPins.has(secTx.id) && !hostOccupiedPins.has(secRx.id)) {
      hostTx = secTx;
      hostRx = secRx;
    }
  }

  if (targetTx && targetRx && hostTx && hostRx && target.id !== host.id) {
    const uartLines: BusConnectionLine[] = [];
    const pwrPin = host5v || host3v3;
    if (pwrPin && targetVcc) {
      uartLines.push({
        fromPinId: pwrPin.id,
        fromPinName: pwrPin.name,
        toPinId: targetVcc.id,
        toPinName: targetVcc.name,
        signalName: 'VCC',
        color: BUS_COLORS.power5v,
      });
    }
    if (hostGnd && targetGnd) {
      uartLines.push({
        fromPinId: hostGnd.id,
        fromPinName: hostGnd.name,
        toPinId: targetGnd.id,
        toPinName: targetGnd.name,
        signalName: 'GND',
        color: BUS_COLORS.ground,
      });
    }
    // Crossover lines: Host TX -> Target RX, Host RX -> Target TX
    uartLines.push({
      fromPinId: hostTx.id,
      fromPinName: hostTx.name,
      toPinId: targetRx.id,
      toPinName: targetRx.name,
      signalName: 'TX→RX',
      color: BUS_COLORS.tx,
    });
    uartLines.push({
      fromPinId: hostRx.id,
      fromPinName: hostRx.name,
      toPinId: targetTx.id,
      toPinName: targetTx.name,
      signalName: 'RX←TX',
      color: BUS_COLORS.rx,
    });

    options.push({
      id: 'uart',
      name: `UART Serial (${uartLines.length} Kabel)`,
      busType: 'uart',
      sourceComp: host,
      targetComp: target,
      connections: uartLines,
      description: `Menghubungkan komunikasi serial UART (${hostTx.name} ⇄ ${targetRx.name}) dengan silang sinyal.`,
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    });
  }

  // ==========================================
  // 4. Ultrasonic Sensor HC-SR04 (Dynamic Free TRIG & ECHO Allocation)
  // ==========================================
  const targetTrig = findPin(targetDef, ['trig', 'trigger']);
  const targetEcho = findPin(targetDef, ['echo']);

  if (targetTrig && targetEcho) {
    const hostTrig = findFreeGpioPin(hostDef, hostOccupiedPins, ['trig', 'd9', 'd1', 'd5', 'g13', 'g5', 'io4', 'gp2', 'd2']);
    const occupiedWithTrig = new Set(hostOccupiedPins);
    if (hostTrig) occupiedWithTrig.add(hostTrig.id);

    const hostEcho = findFreeGpioPin(hostDef, occupiedWithTrig, ['echo', 'd10', 'd2', 'd6', 'g12', 'g18', 'io5', 'gp3', 'd3']);

    if (hostTrig && hostEcho) {
      const ultraLines: BusConnectionLine[] = [];
      const pwrPin = host5v || host3v3;
      if (pwrPin && targetVcc) {
        ultraLines.push({
          fromPinId: pwrPin.id,
          fromPinName: pwrPin.name,
          toPinId: targetVcc.id,
          toPinName: targetVcc.name,
          signalName: '5V',
          color: BUS_COLORS.power5v,
        });
      }
      if (hostGnd && targetGnd) {
        ultraLines.push({
          fromPinId: hostGnd.id,
          fromPinName: hostGnd.name,
          toPinId: targetGnd.id,
          toPinName: targetGnd.name,
          signalName: 'GND',
          color: BUS_COLORS.ground,
        });
      }
      ultraLines.push({
        fromPinId: hostTrig.id,
        fromPinName: hostTrig.name,
        toPinId: targetTrig.id,
        toPinName: targetTrig.name,
        signalName: 'TRIG',
        color: BUS_COLORS.trig,
      });
      ultraLines.push({
        fromPinId: hostEcho.id,
        fromPinName: hostEcho.name,
        toPinId: targetEcho.id,
        toPinName: targetEcho.name,
        signalName: 'ECHO',
        color: BUS_COLORS.echo,
      });

      options.push({
        id: 'ultrasonic',
        name: `HC-SR04 Ultrasonic (${ultraLines.length} Kabel)`,
        busType: 'ultrasonic',
        sourceComp: host,
        targetComp: target,
        connections: ultraLines,
        description: `Menghubungkan pin TRIG (${hostTrig.name}) dan ECHO (${hostEcho.name}) beserta daya sensor.`,
        badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      });
    }
  }

  // ==========================================
  // 5. SG90 Micro Servo (Dynamic Free PWM Signal Allocation)
  // ==========================================
  const targetSignal = findPin(targetDef, ['signal', 'sig', 'pwm', 'data', 'control']);
  if ((target.type.includes('servo') || targetDef.name.toLowerCase().includes('servo')) && targetSignal && targetVcc && targetGnd) {
    const hostPwm = findFreeGpioPin(hostDef, hostOccupiedPins, ['pwm', 'sig', 'd9', 'd3', 'd5', 'd6', 'd10', 'd11', 'g13', 'g18', 'g5', 'g4', 'd4', 'd2', 'd1', 'io3', 'gp0'], ['pwm', 'digital']);
    const pwrPin = host5v || host3v3;
    if (hostPwm && pwrPin && hostGnd) {
      const servoLines: BusConnectionLine[] = [
        {
          fromPinId: pwrPin.id,
          fromPinName: pwrPin.name,
          toPinId: targetVcc.id,
          toPinName: targetVcc.name,
          signalName: '5V',
          color: BUS_COLORS.power5v,
        },
        {
          fromPinId: hostGnd.id,
          fromPinName: hostGnd.name,
          toPinId: targetGnd.id,
          toPinName: targetGnd.name,
          signalName: 'GND',
          color: BUS_COLORS.ground,
        },
        {
          fromPinId: hostPwm.id,
          fromPinName: hostPwm.name,
          toPinId: targetSignal.id,
          toPinName: targetSignal.name,
          signalName: 'PWM',
          color: BUS_COLORS.servoSignal,
        },
      ];

      options.push({
        id: 'servo',
        name: `SG90 Servo (${servoLines.length} Kabel)`,
        busType: 'servo',
        sourceComp: host,
        targetComp: target,
        connections: servoLines,
        description: `Menghubungkan kontroler PWM (${hostPwm.name}), daya, dan ground motor servo.`,
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      });
    }
  }

  // ==========================================
  // 6. Power Rails to Breadboard (5V & GND)
  // ==========================================
  if (target.type.startsWith('breadboard') && host5v && hostGnd) {
    const bbTopVcc = findPin(targetDef, ['top-vcc-1', 'top-vcc', 'full-top-vcc-1', 'mini-vcc-1']);
    const bbTopGnd = findPin(targetDef, ['top-gnd-1', 'top-gnd', 'full-top-gnd-1', 'mini-gnd-1']);
    if (bbTopVcc && bbTopGnd) {
      const pwrLines: BusConnectionLine[] = [
        {
          fromPinId: host5v.id,
          fromPinName: host5v.name,
          toPinId: bbTopVcc.id,
          toPinName: '+ Rel Daya',
          signalName: '5V',
          color: BUS_COLORS.power5v,
        },
        {
          fromPinId: hostGnd.id,
          fromPinName: hostGnd.name,
          toPinId: bbTopGnd.id,
          toPinName: '- Rel Ground',
          signalName: 'GND',
          color: BUS_COLORS.ground,
        },
      ];

      options.push({
        id: 'power',
        name: `Power Rails 5V & GND (${pwrLines.length} Kabel)`,
        busType: 'power',
        sourceComp: host,
        targetComp: target,
        connections: pwrLines,
        description: `Menyuplai rel daya positif (+) dan negatif (-) breadboard dari ${host.name || host.type}.`,
        badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      });
    }
  }

  // ==========================================
  // 7. Parallel LCD 1602 / 2004 (16-Pin HD44780 Standard)
  // ==========================================
  if (target.type.includes('lcd') && !target.type.includes('i2c')) {
    const lcdRs = findPin(targetDef, ['rs']);
    const lcdE = findPin(targetDef, ['e', 'enable']);
    const lcdD4 = findPin(targetDef, ['d4']);
    const lcdD5 = findPin(targetDef, ['d5']);
    const lcdD6 = findPin(targetDef, ['d6']);
    const lcdD7 = findPin(targetDef, ['d7']);
    const lcdVdd = findPin(targetDef, ['vdd', 'vcc', '5v']);
    const lcdVss = findPin(targetDef, ['vss', 'gnd']);
    const lcdRw = findPin(targetDef, ['rw']);
    const lcdA = findPin(targetDef, ['a', 'led+', 'bl+']);
    const lcdK = findPin(targetDef, ['k', 'led-', 'bl-']);

    const hD12 = findPin(hostDef, ['d12', 'g12', 'd6', 'io12', 'gp12']);
    const hD11 = findPin(hostDef, ['d11', 'g11', 'd7', 'io11', 'gp11']);
    const hD5 = findPin(hostDef, ['d5', 'g5', 'd1', 'io5', 'gp5']);
    const hD4 = findPin(hostDef, ['d4', 'g4', 'd2', 'io4', 'gp4']);
    const hD3 = findPin(hostDef, ['d3', 'g3', 'd3', 'io3', 'gp3']);
    const hD2 = findPin(hostDef, ['d2', 'g2', 'd4', 'io2', 'gp2']);

    if (lcdRs && lcdE && lcdD4 && lcdD5 && lcdD6 && lcdD7 && hD12 && hD11 && hD5 && hD4 && hD3 && hD2 && host5v && hostGnd && lcdVdd && lcdVss) {
      const lcdLines: BusConnectionLine[] = [
        { fromPinId: host5v.id, fromPinName: host5v.name, toPinId: lcdVdd.id, toPinName: lcdVdd.name, signalName: '5V', color: BUS_COLORS.power5v },
        { fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: lcdVss.id, toPinName: lcdVss.name, signalName: 'GND', color: BUS_COLORS.ground },
      ];
      if (lcdRw) {
        lcdLines.push({ fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: lcdRw.id, toPinName: lcdRw.name, signalName: 'GND', color: BUS_COLORS.ground });
      }
      lcdLines.push(
        { fromPinId: hD12.id, fromPinName: hD12.name, toPinId: lcdRs.id, toPinName: lcdRs.name, signalName: 'RS', color: BUS_COLORS.data },
        { fromPinId: hD11.id, fromPinName: hD11.name, toPinId: lcdE.id, toPinName: lcdE.name, signalName: 'EN', color: BUS_COLORS.scl },
        { fromPinId: hD5.id, fromPinName: hD5.name, toPinId: lcdD4.id, toPinName: lcdD4.name, signalName: 'D4', color: BUS_COLORS.sda },
        { fromPinId: hD4.id, fromPinName: hD4.name, toPinId: lcdD5.id, toPinName: lcdD5.name, signalName: 'D5', color: BUS_COLORS.miso },
        { fromPinId: hD3.id, fromPinName: hD3.name, toPinId: lcdD6.id, toPinName: lcdD6.name, signalName: 'D6', color: BUS_COLORS.cs },
        { fromPinId: hD2.id, fromPinName: hD2.name, toPinId: lcdD7.id, toPinName: lcdD7.name, signalName: 'D7', color: BUS_COLORS.rst }
      );

      if (lcdA && host5v) {
        lcdLines.push({ fromPinId: host5v.id, fromPinName: host5v.name, toPinId: lcdA.id, toPinName: lcdA.name, signalName: 'BL+', color: BUS_COLORS.power5v });
      }
      if (lcdK && hostGnd) {
        lcdLines.push({ fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: lcdK.id, toPinName: lcdK.name, signalName: 'BL-', color: BUS_COLORS.ground });
      }

      options.push({
        id: 'lcd-parallel',
        name: `LiquidCrystal Paralel (${lcdLines.length} Kabel)`,
        busType: 'lcd-parallel',
        sourceComp: host,
        targetComp: target,
        connections: lcdLines,
        description: `Menghubungkan 16-pin LCD paralel sesuai library LiquidCrystal standar Arduino (RS=${hD12.name}, E=${hD11.name}, D4-D7).`,
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      });
    }
  }

  return options;
}

/**
 * Generates an array of new Wire objects ready to be added to the circuit project.
 */
export function generateBusWires(
  busOption: BusConnectionOption,
  existingWires: Wire[] = [],
  routing: WireRouting = 'orthogonal'
): Omit<Wire, 'id'>[] {
  const newWires: Omit<Wire, 'id'>[] = [];

  busOption.connections.forEach((conn) => {
    // Avoid creating duplicate wires between the exact same pins
    const isDuplicate = existingWires.some(
      (w) =>
        (w.fromComponentId === busOption.sourceComp.id &&
          w.fromPinId === conn.fromPinId &&
          w.toComponentId === busOption.targetComp.id &&
          w.toPinId === conn.toPinId) ||
        (w.fromComponentId === busOption.targetComp.id &&
          w.fromPinId === conn.toPinId &&
          w.toComponentId === busOption.sourceComp.id &&
          w.toPinId === conn.fromPinId)
    );

    if (isDuplicate) return;

    newWires.push({
      fromComponentId: busOption.sourceComp.id,
      fromPinId: conn.fromPinId,
      toComponentId: busOption.targetComp.id,
      toPinId: conn.toPinId,
      color: conn.color,
      routing,
      label: conn.signalName,
      markerPosition: 'start', // Clean marker at host pin
    });
  });

  return newWires;
}
