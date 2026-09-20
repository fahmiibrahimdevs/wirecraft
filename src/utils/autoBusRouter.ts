import { CircuitComponent, ComponentDefinition, Wire, WireRouting } from '../types/circuit';
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
  id: string;
  name: string;
  busType: 'i2c' | 'spi' | 'uart' | 'power' | 'ultrasonic' | 'servo' | 'lcd-parallel' | 'relay' | 'sensor-digital' | 'sensor-analog' | 'buzzer' | 'tm1637' | 'ac-power' | string;
  sourceComp: CircuitComponent;
  targetComp: CircuitComponent;
  connections: BusConnectionLine[];
  description: string;
  badgeColor: string;
}

// Color Palette standard for protocol buses & electrical circuits
export const BUS_COLORS = {
  power5v: '#ef4444', // Red (5V / DC+)
  power3v3: '#f97316', // Orange (3.3V)
  ground: '#1e293b', // Black (GND / DC-)
  sda: '#0284c7', // Sky Blue (I2C SDA)
  scl: '#f59e0b', // Amber (I2C SCL)
  mosi: '#0284c7', // Sky Blue (SPI MOSI)
  miso: '#10b981', // Emerald Green (SPI MISO)
  sck: '#f59e0b', // Amber (SPI SCK)
  cs: '#8b5cf6', // Purple (SPI CS)
  rst: '#ec4899', // Pink (Reset)
  tx: '#06b6d4', // Cyan (UART TX)
  rx: '#10b981', // Emerald (UART RX)
  data: '#3b82f6', // Blue (Data / Sinyal)
  trig: '#0ea5e9', // Sky (Ultrasonic Trig)
  echo: '#10b981', // Emerald (Ultrasonic Echo)
  servoSignal: '#ea580c', // Dark Orange (PWM)
  relayTrigger: '#3b82f6', // Blue (Relay Trigger IN)
  analogSignal: '#f59e0b', // Amber / Orange (Analog ADC)
  digitalSignal: '#06b6d4', // Cyan (Digital I/O)
  acPhase: '#854d0e', // Brown (AC Live / Fasa L)
  acNeutral: '#0284c7', // Blue (AC Neutral N)
  acEarth: '#10b981', // Green (AC Earth PE)
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
 * Extracts alphanumeric semantic tokens from pin names, IDs, and descriptions
 */
export function extractPinTokens(name: string, id: string, desc?: string): string[] {
  const text = `${name} ${id} ${desc || ''}`.toLowerCase();
  const words = text.split(/[^a-z0-9]+/);
  return Array.from(new Set(words.filter(Boolean)));
}

/**
 * Universal Semantic Pin Matcher
 */
export function findPin(
  def: ComponentDefinition,
  aliases: string[],
  pinType?: 'i2c' | 'spi' | 'uart' | 'power' | 'ground' | 'pwm' | 'analog' | 'digital' | 'generic' | 'passive'
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
 * Universal Dynamic Free GPIO / Digital Pin Search
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
    if (p.type === 'power' || p.type === 'ground') continue;

    const isGpio = fallbackTypes.includes(p.type as any);
    const tokens = extractPinTokens(p.name, p.id, p.description);

    if (tokens.includes('aref') || tokens.includes('en') || tokens.includes('vref') || tokens.includes('reset')) continue;

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
 * Universal Dynamic Free Analog / ADC Pin Search
 */
export function findFreeAnalogPin(
  def: ComponentDefinition,
  occupiedPinIds: Set<string>,
  preferredAliases: string[] = ['a0', 'a1', 'a2', 'a3', 'd34', 'd35', 'd32', 'd33', 'd36', 'd39', 'vn', 'vp', 'g34', 'g35', 'gp26', 'gp27', 'gp28', 'a4', 'a5']
): { id: string; name: string; type?: string } | null {
  if (!def || !def.pins || def.pins.length === 0) return null;

  // Step 1: Check preferred analog aliases
  for (const alias of preferredAliases) {
    const pin = findPin(def, [alias], 'analog');
    if (pin && !occupiedPinIds.has(pin.id)) {
      return pin;
    }
  }

  // Step 2: Scan for any pin of type 'analog'
  for (const p of def.pins) {
    if (occupiedPinIds.has(p.id)) continue;
    if (p.type === 'analog') {
      return { id: p.id, name: p.name, type: p.type };
    }
  }

  // Step 3: Fallback to free GPIO pin
  return findFreeGpioPin(def, occupiedPinIds, preferredAliases, ['analog', 'digital', 'generic']);
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

  const options: BusConnectionOption[] = [];

  // ==========================================
  // SECTION A: High-Voltage AC 220V & Power Interconnects (Non-MCU pairs)
  // ==========================================
  const isAcSource = (c: CircuitComponent, d: ComponentDefinition) =>
    c.type === 'steker-switch' || c.type === 'ac-outlet' || d.name.toLowerCase().includes('steker') || d.name.toLowerCase().includes('outlet');

  const isRelayComp = (c: CircuitComponent, d: ComponentDefinition) =>
    c.type.includes('relay') || d.name.toLowerCase().includes('relay');

  const isAcLoad = (c: CircuitComponent, d: ComponentDefinition) =>
    c.type === 'fitting-lamp' || d.name.toLowerCase().includes('lamp') || d.name.toLowerCase().includes('fitting');

  // 1. AC Source (Steker / Outlet) ➔ Relay AC Terminals (COM / Live)
  if ((isAcSource(compA, defA) && isRelayComp(compB, defB)) || (isAcSource(compB, defB) && isRelayComp(compA, defA))) {
    const acSrc = isAcSource(compA, defA) ? compA : compB;
    const acSrcDef = isAcSource(compA, defA) ? defA : defB;
    const relay = isAcSource(compA, defA) ? compB : compA;
    const relayDef = isAcSource(compA, defA) ? defB : defA;

    const srcL = findPin(acSrcDef, ['cable_l', 'term_l', 'l', 'live', 'fasa'], 'power');
    const relayCom = findPin(relayDef, ['com', 'common'], 'passive') || findPin(relayDef, ['com']);

    if (srcL && relayCom) {
      options.push({
        id: 'ac-source-to-relay',
        name: 'AC Fasa (L) ➔ Relay COM',
        busType: 'ac-power',
        sourceComp: acSrc,
        targetComp: relay,
        connections: [{ fromPinId: srcL.id, fromPinName: srcL.name, toPinId: relayCom.id, toPinName: relayCom.name, signalName: 'AC Fasa (L)', color: BUS_COLORS.acPhase }],
        description: `Menghubungkan kabel fasa AC 220V (${srcL.name}) dari steker ke terminal Common (COM) relay.`,
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      });
    }
  }

  // 2. Relay AC Terminals (NO / Live Switch) ➔ Fitting Lampu (L)
  if ((isRelayComp(compA, defA) && isAcLoad(compB, defB)) || (isRelayComp(compB, defB) && isAcLoad(compA, defA))) {
    const relay = isRelayComp(compA, defA) ? compA : compB;
    const relayDef = isRelayComp(compA, defA) ? defA : defB;
    const load = isRelayComp(compA, defA) ? compB : compA;
    const loadDef = isRelayComp(compA, defA) ? defB : defA;

    const relayNo = findPin(relayDef, ['no', 'normally_open'], 'passive') || findPin(relayDef, ['no']);
    const loadL = findPin(loadDef, ['term_l', 'l', 'live', 'fasa', 'pos', 'pin1'], 'power');

    if (relayNo && loadL) {
      options.push({
        id: 'relay-to-lamp',
        name: 'Relay NO ➔ Lampu Fasa (L)',
        busType: 'ac-power',
        sourceComp: relay,
        targetComp: load,
        connections: [{ fromPinId: relayNo.id, fromPinName: relayNo.name, toPinId: loadL.id, toPinName: loadL.name, signalName: 'Relay Switched L', color: BUS_COLORS.acPhase }],
        description: `Menghubungkan kontak Normally Open (NO) relay ke terminal fasa fitting lampu sebagai saklar pemutus beban AC.`,
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      });
    }
  }

  // 3. AC Source (Steker / Outlet) ➔ Fitting Lampu (Netral Bypass & Earth)
  if ((isAcSource(compA, defA) && isAcLoad(compB, defB)) || (isAcSource(compB, defB) && isAcLoad(compA, defA))) {
    const acSrc = isAcSource(compA, defA) ? compA : compB;
    const acSrcDef = isAcSource(compA, defA) ? defA : defB;
    const load = isAcSource(compA, defA) ? compB : compA;
    const loadDef = isAcSource(compA, defA) ? defB : defA;

    const srcN = findPin(acSrcDef, ['cable_n', 'term_n', 'n', 'neutral', 'netral']);
    const loadN = findPin(loadDef, ['term_n', 'n', 'neutral', 'netral', 'neg', 'pin2']);

    if (srcN && loadN) {
      options.push({
        id: 'ac-neutral-to-lamp',
        name: 'AC Netral (N) ➔ Lampu',
        busType: 'ac-power',
        sourceComp: acSrc,
        targetComp: load,
        connections: [{ fromPinId: srcN.id, fromPinName: srcN.name, toPinId: loadN.id, toPinName: loadN.name, signalName: 'AC Netral (N)', color: BUS_COLORS.acNeutral }],
        description: `Menghubungkan kabel Netral AC 220V (${srcN.name}) langsung dari steker ke fitting lampu (jalur kembali arus).`,
        badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
      });
    }
  }

  // ==========================================
  // SECTION B: Controller / Host / Power Bus Routing
  // ==========================================
  if (!isHostComponent(compA) && !isHostComponent(compB)) {
    return options;
  }

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

  // Common Host Power & Ground resolution
  const host5v = findPin(hostDef, ['5v', 'vin', 'vbus', 'vv', 'vcc', '3v3', '3.3v', 'pos', 'v+', 'out+'], 'power');
  const host3v3 = findPin(hostDef, ['3v3', '3.3v', 'vcc', '5v', 'vin'], 'power');
  const hostGnd = findPin(hostDef, ['gnd', 'gnd1', 'gnd2', 'gnd_top', 'gnd_bot1', 'gnd_left', 'gnd_right1', 'gnd_bot2', 'gnd_bot3', 'vss', 'g', 'neg', '-', 'dc-', 'out-'], 'ground');

  const targetVcc = findPin(targetDef, ['vcc', 'dc+', '5v', '3v3', '3.3v', 'vdd', 'vin', 'pos', '+', 'power', 'v+', 'in+'], 'power');
  const targetGnd = findPin(targetDef, ['gnd', 'dc-', 'vss', 'neg', '-', 'ground', 'g', 'in-'], 'ground');

  // ==========================================
  // 1. RELAY MODULE AUTO-WIRING (1-Channel / Multi-Channel DC Control)
  // ==========================================
  const targetRelayIn = findPin(targetDef, ['in', 'in1', 'sig', 'trigger', 'control', 'din', 'ch1'], 'digital') || findPin(targetDef, ['in', 'in1', 'sig', 'trigger', 'control', 'din']);
  if ((target.type.includes('relay') || targetDef.name.toLowerCase().includes('relay')) && targetRelayIn) {
    const hostTriggerPin = findFreeGpioPin(hostDef, hostOccupiedPins, [
      'd23', 'd4', 'd8', 'd7', 'd13', 'd2', 'd5', 'd18', 'd19', 'd27', 'd26', 'd25', 'd33', 'd32', 'd14', 'd12',
      'g23', 'g4', 'g13', 'io4', 'io5', 'io18', 'io19', 'io23', 'gp0', 'gp1', 'gp2', 'gp3', 'gp4', 'gp5'
    ]);

    const pwrPin = host5v || host3v3;
    if (hostTriggerPin && pwrPin && hostGnd) {
      const relayLines: BusConnectionLine[] = [];
      if (targetVcc) {
        relayLines.push({
          fromPinId: pwrPin.id,
          fromPinName: pwrPin.name,
          toPinId: targetVcc.id,
          toPinName: targetVcc.name,
          signalName: '5V (DC+)',
          color: BUS_COLORS.power5v,
        });
      }
      if (targetGnd) {
        relayLines.push({
          fromPinId: hostGnd.id,
          fromPinName: hostGnd.name,
          toPinId: targetGnd.id,
          toPinName: targetGnd.name,
          signalName: 'GND (DC-)',
          color: BUS_COLORS.ground,
        });
      }
      relayLines.push({
        fromPinId: hostTriggerPin.id,
        fromPinName: hostTriggerPin.name,
        toPinId: targetRelayIn.id,
        toPinName: targetRelayIn.name,
        signalName: 'Trigger IN',
        color: BUS_COLORS.relayTrigger,
      });

      options.push({
        id: 'relay-control',
        name: `Relay Control (${relayLines.length} Kabel)`,
        busType: 'relay',
        sourceComp: host,
        targetComp: target,
        connections: relayLines,
        description: `Menghubungkan sinyal trigger relay (${hostTriggerPin.name} ke ${targetRelayIn.name}) beserta catu daya DC 5V & Ground.`,
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      });
    }
  }

  // ==========================================
  // 2. I2C Bus Detection (SDA, SCL, VCC, GND)
  // ==========================================
  const targetSda = findPin(targetDef, ['sda', 't_sda', 'data'], 'i2c');
  const targetScl = findPin(targetDef, ['scl', 't_scl', 'clk', 'sclk'], 'i2c');
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
    i2cLines.push(
      { fromPinId: hostSda.id, fromPinName: hostSda.name, toPinId: targetSda.id, toPinName: targetSda.name, signalName: 'SDA', color: BUS_COLORS.sda },
      { fromPinId: hostScl.id, fromPinName: hostScl.name, toPinId: targetScl.id, toPinName: targetScl.name, signalName: 'SCL', color: BUS_COLORS.scl }
    );

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
  // 3. SPI Bus Detection (MOSI, MISO, SCK, CS, RST)
  // ==========================================
  const targetMosi = findPin(targetDef, ['mosi', 'sdi', 'din'], 'spi');
  const targetMiso = findPin(targetDef, ['miso', 'sdo', 'dout'], 'spi');
  const targetSck = findPin(targetDef, ['sck', 'sclk', 'clk'], 'spi');
  const targetCs = findPin(targetDef, ['cs', 'ss', 'sda', 'nss'], 'spi');
  const targetRst = findPin(targetDef, ['reset', 'rst']);

  if (targetMosi && targetSck) {
    const hostMosi = findPin(hostDef, ['mosi', 'g23', 'd23', 'gpio23', 'd11', 'd7', 'io6', 'gp19'], 'spi');
    const hostMiso = findPin(hostDef, ['miso', 'g19', 'd19', 'gpio19', 'd12', 'd6', 'io5', 'gp16'], 'spi');
    const hostSck = findPin(hostDef, ['sck', 'g18', 'd18', 'gpio18', 'd13', 'd5', 'io4', 'gp18'], 'spi');

    const hostCs = targetCs
      ? findFreeGpioPin(hostDef, hostOccupiedPins, ['cs', 'ss', 'd10', 'd8', 'g5', 'd5', 'gpio5', 'io7', 'io10', 'gp17'])
      : null;

    const hostOccupiedWithCs = new Set(hostOccupiedPins);
    if (hostCs) hostOccupiedWithCs.add(hostCs.id);

    const hostRst = targetRst
      ? findFreeGpioPin(hostDef, hostOccupiedWithCs, ['rst', 'reset', 'd9', 'g4', 'd4', 'd3', 'gp22'])
      : null;

    if (hostMosi && hostSck) {
      const spiLines: BusConnectionLine[] = [];
      const pwrPin = host3v3 || host5v;
      if (pwrPin && targetVcc) {
        spiLines.push({ fromPinId: pwrPin.id, fromPinName: pwrPin.name, toPinId: targetVcc.id, toPinName: targetVcc.name, signalName: '3.3V', color: BUS_COLORS.power3v3 });
      }
      if (hostGnd && targetGnd) {
        spiLines.push({ fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: targetGnd.id, toPinName: targetGnd.name, signalName: 'GND', color: BUS_COLORS.ground });
      }
      if (hostMosi && targetMosi) {
        spiLines.push({ fromPinId: hostMosi.id, fromPinName: hostMosi.name, toPinId: targetMosi.id, toPinName: targetMosi.name, signalName: 'MOSI', color: BUS_COLORS.mosi });
      }
      if (hostMiso && targetMiso) {
        spiLines.push({ fromPinId: hostMiso.id, fromPinName: hostMiso.name, toPinId: targetMiso.id, toPinName: targetMiso.name, signalName: 'MISO', color: BUS_COLORS.miso });
      }
      if (hostSck && targetSck) {
        spiLines.push({ fromPinId: hostSck.id, fromPinName: hostSck.name, toPinId: targetSck.id, toPinName: targetSck.name, signalName: 'SCK', color: BUS_COLORS.sck });
      }
      if (hostCs && targetCs) {
        spiLines.push({ fromPinId: hostCs.id, fromPinName: hostCs.name, toPinId: targetCs.id, toPinName: targetCs.name, signalName: 'CS', color: BUS_COLORS.cs });
      }
      if (hostRst && targetRst) {
        spiLines.push({ fromPinId: hostRst.id, fromPinName: hostRst.name, toPinId: targetRst.id, toPinName: targetRst.name, signalName: 'RST', color: BUS_COLORS.rst });
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
  // 4. UART / Serial Bus Detection (TX ⇄ RX Crossover)
  // ==========================================
  const targetTx = findPin(targetDef, ['tx', 'txd', 'tx0', 'tx1', 'dout'], 'uart');
  const targetRx = findPin(targetDef, ['rx', 'rxd', 'rx0', 'rx1', 'din'], 'uart');

  let hostTx = findPin(hostDef, ['tx', 'txd', 'tx0', 'tx1', 'd1', 'io21', 'gp0'], 'uart');
  let hostRx = findPin(hostDef, ['rx', 'rxd', 'rx0', 'rx1', 'd0', 'io20', 'gp1'], 'uart');

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
      uartLines.push({ fromPinId: pwrPin.id, fromPinName: pwrPin.name, toPinId: targetVcc.id, toPinName: targetVcc.name, signalName: 'VCC', color: BUS_COLORS.power5v });
    }
    if (hostGnd && targetGnd) {
      uartLines.push({ fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: targetGnd.id, toPinName: targetGnd.name, signalName: 'GND', color: BUS_COLORS.ground });
    }
    uartLines.push(
      { fromPinId: hostTx.id, fromPinName: hostTx.name, toPinId: targetRx.id, toPinName: targetRx.name, signalName: 'TX→RX', color: BUS_COLORS.tx },
      { fromPinId: hostRx.id, fromPinName: hostRx.name, toPinId: targetTx.id, toPinName: targetTx.name, signalName: 'RX←TX', color: BUS_COLORS.rx }
    );

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
  // 5. Ultrasonic Sensor HC-SR04 (TRIG & ECHO)
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
        ultraLines.push({ fromPinId: pwrPin.id, fromPinName: pwrPin.name, toPinId: targetVcc.id, toPinName: targetVcc.name, signalName: '5V', color: BUS_COLORS.power5v });
      }
      if (hostGnd && targetGnd) {
        ultraLines.push({ fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: targetGnd.id, toPinName: targetGnd.name, signalName: 'GND', color: BUS_COLORS.ground });
      }
      ultraLines.push(
        { fromPinId: hostTrig.id, fromPinName: hostTrig.name, toPinId: targetTrig.id, toPinName: targetTrig.name, signalName: 'TRIG', color: BUS_COLORS.trig },
        { fromPinId: hostEcho.id, fromPinName: hostEcho.name, toPinId: targetEcho.id, toPinName: targetEcho.name, signalName: 'ECHO', color: BUS_COLORS.echo }
      );

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
  // 6. SG90 Micro Servo (PWM Control)
  // ==========================================
  const targetServoSignal = findPin(targetDef, ['signal', 'sig', 'pwm', 'control']);
  if ((target.type.includes('servo') || targetDef.name.toLowerCase().includes('servo')) && targetServoSignal && targetVcc && targetGnd) {
    const hostPwm = findFreeGpioPin(hostDef, hostOccupiedPins, ['pwm', 'sig', 'd9', 'd3', 'd5', 'd6', 'd10', 'd11', 'g13', 'g18', 'g5', 'g4', 'd4', 'd2', 'd1', 'io3', 'gp0'], ['pwm', 'digital']);
    const pwrPin = host5v || host3v3;
    if (hostPwm && pwrPin && hostGnd) {
      const servoLines: BusConnectionLine[] = [
        { fromPinId: pwrPin.id, fromPinName: pwrPin.name, toPinId: targetVcc.id, toPinName: targetVcc.name, signalName: '5V', color: BUS_COLORS.power5v },
        { fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: targetGnd.id, toPinName: targetGnd.name, signalName: 'GND', color: BUS_COLORS.ground },
        { fromPinId: hostPwm.id, fromPinName: hostPwm.name, toPinId: targetServoSignal.id, toPinName: targetServoSignal.name, signalName: 'PWM', color: BUS_COLORS.servoSignal },
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
  // 7. Digital & 1-Wire Environmental Sensors (DHT11, DHT22, DS18B20, Touch, PIR, IR Obstacle, SW-420)
  // ==========================================
  const targetSensorData = findPin(targetDef, ['data', 'out', 'sig', 'dq', 'dout', 'do', 'signal'], 'digital') || findPin(targetDef, ['data', 'out', 'sig', 'dq', 'dout', 'do']);
  const isDigitalSensor =
    !target.type.includes('relay') &&
    !target.type.includes('servo') &&
    !target.type.includes('lcd') &&
    !target.type.includes('oled') &&
    !target.type.includes('tft') &&
    !target.type.includes('breadboard') &&
    targetSensorData &&
    (targetVcc || targetGnd);

  if (isDigitalSensor && targetSensorData) {
    const hostDataPin = findFreeGpioPin(hostDef, hostOccupiedPins, [
      'd4', 'd2', 'd14', 'd5', 'd18', 'd19', 'd23', 'd27', 'd26', 'd25', 'd33', 'd32',
      'g4', 'g14', 'io4', 'io5', 'gp4', 'gp2', 'd7', 'd8'
    ]);

    const pwrPin = host3v3 || host5v;
    if (hostDataPin && pwrPin && hostGnd) {
      const sensorLines: BusConnectionLine[] = [];
      if (targetVcc) {
        sensorLines.push({
          fromPinId: pwrPin.id,
          fromPinName: pwrPin.name,
          toPinId: targetVcc.id,
          toPinName: targetVcc.name,
          signalName: 'VCC',
          color: BUS_COLORS.power3v3,
        });
      }
      if (targetGnd) {
        sensorLines.push({
          fromPinId: hostGnd.id,
          fromPinName: hostGnd.name,
          toPinId: targetGnd.id,
          toPinName: targetGnd.name,
          signalName: 'GND',
          color: BUS_COLORS.ground,
        });
      }
      sensorLines.push({
        fromPinId: hostDataPin.id,
        fromPinName: hostDataPin.name,
        toPinId: targetSensorData.id,
        toPinName: targetSensorData.name,
        signalName: 'DATA',
        color: BUS_COLORS.digitalSignal,
      });

      const sensorLabel = targetDef.name.split(' ')[0] || 'Sensor';
      options.push({
        id: `sensor-digital-${target.id}`,
        name: `${sensorLabel} (${sensorLines.length} Kabel)`,
        busType: 'sensor-digital',
        sourceComp: host,
        targetComp: target,
        connections: sensorLines,
        description: `Menghubungkan jalur data/sinyal digital (${hostDataPin.name} ke ${targetSensorData.name}) beserta daya sensor.`,
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      });
    }
  }

  // ==========================================
  // 8. Analog Sensors & Rotary Potentiometer (Potensio, Soil Moisture, TDS, PH4502C, LDR)
  // ==========================================
  const targetAnalogOut = findPin(targetDef, ['wiper', 'aout', 'ao', 'analog', 'out', 'sig'], 'analog') || findPin(targetDef, ['wiper', 'aout', 'ao', 'analog']);
  const isAnalogSensor =
    (target.type.includes('potentiometer') || target.type.includes('soil') || target.type.includes('tds') || target.type.includes('ph') || target.type.includes('ldr')) &&
    targetAnalogOut;

  if (isAnalogSensor && targetAnalogOut) {
    const hostAdcPin = findFreeAnalogPin(hostDef, hostOccupiedPins);
    const pwrPin = host5v || host3v3;

    if (hostAdcPin && pwrPin && hostGnd) {
      const analogLines: BusConnectionLine[] = [];
      const potVcc = targetVcc || findPin(targetDef, ['vcc', 'term1', 'terminal 1', 'pin1', 'pos', '+'], 'passive');
      const potGnd = targetGnd || findPin(targetDef, ['gnd', 'term2', 'terminal 2', 'pin2', 'neg', '-'], 'passive');

      if (potVcc) {
        analogLines.push({
          fromPinId: pwrPin.id,
          fromPinName: pwrPin.name,
          toPinId: potVcc.id,
          toPinName: potVcc.name,
          signalName: '5V (Ref)',
          color: BUS_COLORS.power5v,
        });
      }
      if (potGnd) {
        analogLines.push({
          fromPinId: hostGnd.id,
          fromPinName: hostGnd.name,
          toPinId: potGnd.id,
          toPinName: potGnd.name,
          signalName: 'GND',
          color: BUS_COLORS.ground,
        });
      }
      analogLines.push({
        fromPinId: hostAdcPin.id,
        fromPinName: hostAdcPin.name,
        toPinId: targetAnalogOut.id,
        toPinName: targetAnalogOut.name,
        signalName: 'ADC In',
        color: BUS_COLORS.analogSignal,
      });

      const analogLabel = targetDef.name.split(' ')[0] || 'Analog';
      options.push({
        id: `sensor-analog-${target.id}`,
        name: `${analogLabel} ADC (${analogLines.length} Kabel)`,
        busType: 'sensor-analog',
        sourceComp: host,
        targetComp: target,
        connections: analogLines,
        description: `Menghubungkan pembacaan ADC (${hostAdcPin.name} ke ${targetAnalogOut.name}) beserta tegangan referensi & Ground.`,
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      });
    }
  }

  // ==========================================
  // 9. TM1637 4-Digit 7-Segment Display (2-Wire)
  // ==========================================
  const targetTmClk = findPin(targetDef, ['clk', 'clock']);
  const targetTmDio = findPin(targetDef, ['dio', 'data']);
  if (target.type.includes('tm1637') && targetTmClk && targetTmDio) {
    const hostClk = findFreeGpioPin(hostDef, hostOccupiedPins, ['d2', 'd5', 'd14', 'd18', 'io4', 'gp4', 'd6']);
    const occupiedWithClk = new Set(hostOccupiedPins);
    if (hostClk) occupiedWithClk.add(hostClk.id);

    const hostDio = findFreeGpioPin(hostDef, occupiedWithClk, ['d3', 'd4', 'd12', 'd19', 'io5', 'gp5', 'd7']);

    if (hostClk && hostDio && host5v && hostGnd) {
      const tmLines: BusConnectionLine[] = [
        { fromPinId: host5v.id, fromPinName: host5v.name, toPinId: targetVcc ? targetVcc.id : 'vcc', toPinName: 'VCC', signalName: '5V', color: BUS_COLORS.power5v },
        { fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: targetGnd ? targetGnd.id : 'gnd', toPinName: 'GND', signalName: 'GND', color: BUS_COLORS.ground },
        { fromPinId: hostClk.id, fromPinName: hostClk.name, toPinId: targetTmClk.id, toPinName: targetTmClk.name, signalName: 'CLK', color: BUS_COLORS.scl },
        { fromPinId: hostDio.id, fromPinName: hostDio.name, toPinId: targetTmDio.id, toPinName: targetTmDio.name, signalName: 'DIO', color: BUS_COLORS.sda },
      ];

      options.push({
        id: 'tm1637-bus',
        name: `TM1637 2-Wire (${tmLines.length} Kabel)`,
        busType: 'tm1637',
        sourceComp: host,
        targetComp: target,
        connections: tmLines,
        description: `Menghubungkan display 4-digit TM1637 (CLK=${hostClk.name}, DIO=${hostDio.name}) beserta daya 5V & Ground.`,
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      });
    }
  }

  // ==========================================
  // 10. Buzzer & Speaker Audio Output
  // ==========================================
  if (target.type.includes('buzzer') || target.type.includes('speaker')) {
    const targetSig = findPin(targetDef, ['pos', '+', 'sig', 'vcc', 'pin1', 'positive']) || targetVcc;
    const targetNeg = findPin(targetDef, ['neg', '-', 'gnd', 'pin2', 'ground', 'negative']) || targetGnd;

    if (targetSig && targetNeg) {
      const hostBuzzerPin = findFreeGpioPin(hostDef, hostOccupiedPins, ['d8', 'd9', 'd5', 'd4', 'g18', 'io2', 'gp0', 'd3'], ['pwm', 'digital']);
      if (hostBuzzerPin && hostGnd) {
        const audioLines: BusConnectionLine[] = [
          { fromPinId: hostBuzzerPin.id, fromPinName: hostBuzzerPin.name, toPinId: targetSig.id, toPinName: targetSig.name, signalName: 'Buzzer Out', color: BUS_COLORS.servoSignal },
          { fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: targetNeg.id, toPinName: targetNeg.name, signalName: 'GND', color: BUS_COLORS.ground },
        ];

        options.push({
          id: `buzzer-${target.id}`,
          name: `${targetDef.name} (${audioLines.length} Kabel)`,
          busType: 'buzzer',
          sourceComp: host,
          targetComp: target,
          connections: audioLines,
          description: `Menghubungkan pin sinyal alarm buzzer (${hostBuzzerPin.name}) dan Ground.`,
          badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        });
      }
    }
  }

  // ==========================================
  // 11. Power Rails to Breadboard (5V & GND)
  // ==========================================
  if (target.type.startsWith('breadboard') && host5v && hostGnd) {
    const bbTopVcc = findPin(targetDef, ['top-vcc-1', 'top-vcc', 'full-top-vcc-1', 'mini-vcc-1']);
    const bbTopGnd = findPin(targetDef, ['top-gnd-1', 'top-gnd', 'full-top-gnd-1', 'mini-gnd-1']);
    if (bbTopVcc && bbTopGnd) {
      const pwrLines: BusConnectionLine[] = [
        { fromPinId: host5v.id, fromPinName: host5v.name, toPinId: bbTopVcc.id, toPinName: '+ Rel Daya', signalName: '5V', color: BUS_COLORS.power5v },
        { fromPinId: hostGnd.id, fromPinName: hostGnd.name, toPinId: bbTopGnd.id, toPinName: '- Rel Ground', signalName: 'GND', color: BUS_COLORS.ground },
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
  // 12. Parallel LCD 1602 / 2004 (16-Pin HD44780 Standard)
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
      markerPosition: 'start',
    });
  });

  return newWires;
}

/**
 * Detects all auto-wiring options across 2 or more selected components.
 */
export function detectMultiComponentConnections(
  selectedComps: CircuitComponent[],
  allDefs: Record<string, ComponentDefinition>,
  existingWires: Wire[] = []
): BusConnectionOption[] {
  if (!selectedComps || selectedComps.length < 2) return [];

  if (selectedComps.length === 2) {
    return detectAvailableBusConnections(selectedComps[0], selectedComps[1], allDefs, existingWires);
  }

  const options: BusConnectionOption[] = [];
  const simulatedWires = [...existingWires];

  // 1. If a Host (MCU / Controller) exists, route to each peripheral
  const hostComp = selectedComps.find(isHostComponent);
  if (hostComp) {
    const peripherals = selectedComps.filter((c) => c.id !== hostComp.id);
    for (const peri of peripherals) {
      const detected = detectAvailableBusConnections(hostComp, peri, allDefs, simulatedWires);
      if (detected.length > 0) {
        options.push(...detected);
        detected.forEach((bus) => {
          const nw = generateBusWires(bus, simulatedWires, 'orthogonal');
          nw.forEach((w) => simulatedWires.push({ ...w, id: `temp_${Math.random()}` } as Wire));
        });
      }
    }
  }

  // 2. Check non-host AC / Interconnect pairs between remaining items
  for (let i = 0; i < selectedComps.length; i++) {
    for (let j = i + 1; j < selectedComps.length; j++) {
      const compA = selectedComps[i];
      const compB = selectedComps[j];
      if (hostComp && (compA.id === hostComp.id || compB.id === hostComp.id)) {
        continue;
      }
      const pairOptions = detectAvailableBusConnections(compA, compB, allDefs, simulatedWires);
      options.push(...pairOptions);
    }
  }

  return options;
}

