import { CircuitComponent, ComponentDefinition, Wire } from '../types/circuit';
import { COMPONENT_DEFINITIONS } from '../constants/components';
import { isHostComponent, extractPinTokens } from './autoBusRouter';

export interface WiringTableRow {
  id: string; // unique row id
  mcuId: string;
  mcuName: string;
  mcuLabel: string;
  no: number;
  componentName: string; // e.g. 'RTC DS3231 SDA', 'Sensor Suhu DS18B20'
  interfaceType: string; // 'I2C' | 'SPI' | 'UART' | 'One Wire' | 'Interrupt' | 'Digital Output' | 'Digital Input' | 'Analog Input' | 'PWM' | 'Power'
  mcuPin: string; // e.g. 'D2', 'D1', 'D4', 'D5', 'G21', 'A4'
  gpio: string; // e.g. 'GPIO4', 'GPIO5', 'GPIO2', 'GPIO14', 'PD2'
  pinLv: string; // e.g. 'LV1', 'LV7', '-'
  converterModule: string; // e.g. 'BSS138', '4-Ch Shifter', '-'
  pinHv: string; // e.g. 'HV1', 'HV7', '-'
  note: string; // e.g. 'sda', 'scl', 'Resistor 220Ω seri', 'Pull-up 4.7kΩ'
  wireColor?: string;
  wireId?: string;
  targetCompId?: string;
}

export interface McuWiringGroup {
  mcu: CircuitComponent;
  mcuDef: ComponentDefinition;
  mcuTitle: string;
  mcuSubtitle: string;
  rows: WiringTableRow[];
}

/**
 * Universal Hardware Board Pin to Chip Physical GPIO Mapping Dictionary
 */
export function getPhysicalGpio(mcuType: string, pinName: string, pinId: string, pinDesc?: string): string {
  const t = mcuType.toLowerCase();
  const raw = `${pinName} ${pinId} ${pinDesc || ''}`.toLowerCase();
  const tokens = extractPinTokens(pinName, pinId, pinDesc);

  // 0. Power, Ground & Reset Pins NEVER have GPIO numbers
  if (
    tokens.includes('gnd') ||
    tokens.includes('ground') ||
    tokens.includes('5v') ||
    tokens.includes('3v3') ||
    tokens.includes('3.3v') ||
    tokens.includes('vcc') ||
    tokens.includes('vin') ||
    tokens.includes('vbat') ||
    tokens.includes('rst') ||
    tokens.includes('reset') ||
    tokens.includes('en') ||
    tokens.includes('aref')
  ) {
    return '-';
  }

  // 1. ESP8266 (NodeMCU, Wemos D1 Mini)
  // On ESP8266 boards, the silkscreen pin (D0-D8) is different from the physical ESP8266 GPIO (GPIO16, GPIO5, GPIO4, etc.)
  if (t.includes('nodemcu') || t.includes('wemos') || t.includes('esp8266')) {
    if (tokens.includes('d0')) return 'GPIO16';
    if (tokens.includes('d1')) return 'GPIO5';
    if (tokens.includes('d2')) return 'GPIO4';
    if (tokens.includes('d3')) return 'GPIO0';
    if (tokens.includes('d4')) return 'GPIO2';
    if (tokens.includes('d5')) return 'GPIO14';
    if (tokens.includes('d6')) return 'GPIO12';
    if (tokens.includes('d7')) return 'GPIO13';
    if (tokens.includes('d8')) return 'GPIO15';
    if (tokens.includes('rx') || tokens.includes('rxd')) return 'GPIO3';
    if (tokens.includes('tx') || tokens.includes('txd')) return 'GPIO1';
    if (tokens.includes('a0')) return 'A0 (ADC0)';
  }

  // 2. ESP32 (30-Pin, 38-Pin, WROOM, Dev Module)
  if (t.includes('esp32') && !t.includes('esp32-c3')) {
    const matchG = raw.match(/\b(g|d|gpio)(\d+)\b/);
    if (matchG) {
      return `GPIO${matchG[2]}`;
    }
    if (tokens.includes('txd') || tokens.includes('tx0') || tokens.includes('tx')) return 'GPIO1';
    if (tokens.includes('rxd') || tokens.includes('rx0') || tokens.includes('rx')) return 'GPIO3';
    if (tokens.includes('vn') || tokens.includes('g39')) return 'GPIO39';
    if (tokens.includes('vp') || tokens.includes('g36')) return 'GPIO36';
  }

  // 3. ESP32-C3
  if (t.includes('esp32-c3') || t.includes('c3')) {
    const matchIo = raw.match(/\b(io|gpio)(\d+)\b/);
    if (matchIo) {
      return `GPIO${matchIo[2]}`;
    }
  }

  // 4. Raspberry Pi Pico (RP2040)
  if (t.includes('pico') || t.includes('rp2040')) {
    const matchGp = raw.match(/\b(gp|gpio)(\d+)\b/);
    if (matchGp) {
      return `GPIO${matchGp[2]}`;
    }
  }

  // 5. Arduino (Uno, Nano, Mega, Pro Mini, Leonardo, etc.)
  // On Arduino, physical pin names are already D0-D13, A0-A7.
  // Arduino does not have separate GPIO numbering, so GPIO column is '-'
  if (t.includes('arduino') || t.includes('uno') || t.includes('nano') || t.includes('mega') || t.includes('atmega')) {
    return '-';
  }

  // Generic fallback: check if description or pin name has explicit GPIO
  const genericMatch = raw.match(/\bgpio(\d+)\b/);
  if (genericMatch) {
    return `GPIO${genericMatch[1]}`;
  }

  return '-';
}

/**
 * Cleans pin label string (e.g. "D2 (SDA)" -> "D2", "A4 (SDA)" -> "A4", "5V (VIN)" -> "5V")
 */
export function cleanPinLabel(name: string): string {
  if (!name) return '-';
  const clean = name.replace(/\(.*?\)/g, '').trim();
  return clean || name;
}

/**
 * Infers the communication interface / electrical signal type for the table row
 */
export function inferInterfaceType(
  mcuPinName: string,
  targetPinName: string,
  targetComp: CircuitComponent,
  targetDef?: ComponentDefinition
): string {
  const pMcu = mcuPinName.toLowerCase();
  const pTgt = targetPinName.toLowerCase();
  const tType = targetComp.type.toLowerCase();
  const tName = (targetComp.name || targetComp.label || '').toLowerCase();

  // 1. Power & Ground Rails (Check first)
  if (
    pMcu.includes('5v') ||
    pMcu.includes('3v3') ||
    pMcu.includes('3.3v') ||
    pMcu.includes('vin') ||
    pMcu.includes('vcc') ||
    pTgt.includes('vcc') ||
    pTgt.includes('5v') ||
    pTgt.includes('3v3') ||
    pTgt.includes('vin')
  ) {
    return 'Power Rail';
  }
  if (
    pMcu.includes('gnd') ||
    pMcu.includes('ground') ||
    pTgt.includes('gnd') ||
    pTgt.includes('ground') ||
    pTgt.includes('vss') ||
    pTgt.includes('cathode') ||
    pTgt.includes('katoda')
  ) {
    return 'Ground Rail';
  }

  // 2. I2C Interface
  if (
    pMcu.includes('sda') ||
    pMcu.includes('scl') ||
    pTgt.includes('sda') ||
    pTgt.includes('scl') ||
    tType.includes('i2c') ||
    tType.includes('ds3231') ||
    tType.includes('ads1115') ||
    tName.includes('i2c') ||
    tName.includes('oled')
  ) {
    return 'I2C';
  }

  // 3. SPI Interface
  if (
    pMcu.includes('mosi') ||
    pMcu.includes('miso') ||
    pMcu.includes('sck') ||
    pTgt.includes('mosi') ||
    pTgt.includes('miso') ||
    pTgt.includes('sck') ||
    tType.includes('rc522') ||
    tType.includes('sdcard') ||
    tType.includes('spi')
  ) {
    return 'SPI';
  }

  // 4. UART Interface
  if (
    pMcu.includes('tx') ||
    pMcu.includes('rx') ||
    pTgt.includes('tx') ||
    pTgt.includes('rx') ||
    tType.includes('sim800') ||
    tType.includes('dfplayer') ||
    tType.includes('bluetooth') ||
    tType.includes('gps')
  ) {
    return 'UART';
  }

  // 5. One-Wire Sensor (e.g. DS18B20)
  if (tType.includes('ds18b20') || tName.includes('ds18b20') || tName.includes('one wire')) {
    return 'One Wire';
  }

  // 6. Interrupt (e.g. Flow Sensor YF-S201, Rotary Encoder, Hall Effect)
  if (tType.includes('flow') || tName.includes('flow') || tName.includes('encoder') || tName.includes('interrupt')) {
    return 'Interrupt';
  }

  // 7. Ultrasonic Sensor (TRIG=Output, ECHO=Input)
  if (tType.includes('ultrasonic') || tType.includes('jsn-sr04t') || tType.includes('hc-sr04')) {
    if (pTgt.includes('trig')) return 'Digital Output';
    if (pTgt.includes('echo')) return 'Digital Input';
    return 'Digital I/O';
  }

  // 8. Actuators / Outputs (Relay, LED, Buzzer, Solenoid, Motor)
  if (
    tType.includes('relay') ||
    tType.includes('led') ||
    tType.includes('buzzer') ||
    tType.includes('solenoid') ||
    tName.includes('relay') ||
    tName.includes('led') ||
    tName.includes('pompa')
  ) {
    if (
      pMcu.includes('d3') ||
      pMcu.includes('d5') ||
      pMcu.includes('d6') ||
      pMcu.includes('d9') ||
      pMcu.includes('d10') ||
      pMcu.includes('d11')
    ) {
      if (tType.includes('led') || tType.includes('buzzer')) {
        return 'PWM / Output';
      }
    }
    return 'Digital Output';
  }

  // 9. Servo
  if (tType.includes('servo') || tName.includes('servo')) {
    return 'PWM Output';
  }

  // 10. Digital Inputs (Push Button, PIR Motion, IR Obstacle, Vibration)
  if (
    tType.includes('button') ||
    tType.includes('pir') ||
    tType.includes('obstacle') ||
    tType.includes('vibration') ||
    tType.includes('touch') ||
    pTgt.includes('out') ||
    pTgt.includes('do')
  ) {
    return 'Digital Input';
  }

  // 11. Analog Inputs (Potentiometer, LDR, Soil, TDS, PH4502C, PT100, CT)
  if (
    pMcu.startsWith('a') ||
    tType.includes('potentiometer') ||
    tType.includes('ldr') ||
    tType.includes('soil') ||
    tType.includes('tds') ||
    tType.includes('ph4502c') ||
    tType.includes('pt100') ||
    tType.includes('ct-coil') ||
    tType.includes('analog')
  ) {
    return 'Analog Input';
  }

  return 'Digital I/O';
}

/**
 * Formats full functional component name (e.g. "RTC DS3231 SDA", "Sensor Suhu DS18B20", "Relay Pompa AC")
 */
export function formatComponentName(comp: CircuitComponent, pinName: string, def?: ComponentDefinition): string {
  const customLabel = comp.label?.trim();
  const baseName = customLabel || comp.name || def?.name || comp.type;
  const cleanPin = pinName.replace(/\(.*?\)/g, '').trim();

  // If pin has specific signal name like SDA, SCL, TRIG, ECHO, MOSI, TX, RX, append it nicely
  const lowerPin = pinName.toLowerCase();
  if (lowerPin.includes('vcc') || lowerPin.includes('5v') || lowerPin.includes('3v3')) return `${baseName} VCC`;
  if (lowerPin.includes('gnd') || lowerPin.includes('ground')) return `${baseName} GND`;
  if (lowerPin.includes('cathode') || lowerPin.includes('katoda')) return `${baseName} Cathode`;
  if (lowerPin.includes('anode') || lowerPin.includes('anoda')) return `${baseName} Anode`;
  if (lowerPin.includes('out') || lowerPin.includes('do')) return `${baseName} OUT`;
  if (lowerPin.includes('sda')) return `${baseName} SDA`;
  if (lowerPin.includes('scl')) return `${baseName} SCL`;
  if (lowerPin.includes('trig')) return `${baseName} TRIG`;
  if (lowerPin.includes('echo')) return `${baseName} ECHO`;
  if (lowerPin.includes('mosi')) return `${baseName} MOSI`;
  if (lowerPin.includes('miso')) return `${baseName} MISO`;
  if (lowerPin.includes('sck')) return `${baseName} SCK`;
  if (lowerPin.includes('cs') || lowerPin.includes('ss')) return `${baseName} CS`;
  if (lowerPin.includes('tx')) return `${baseName} TX`;
  if (lowerPin.includes('rx')) return `${baseName} RX`;
  if (lowerPin.includes('data')) return `${baseName} DATA`;
  if (lowerPin.includes('signal') || lowerPin.includes('pwm')) return `${baseName} PWM`;
  if (lowerPin.includes('in1') || lowerPin.includes('in2') || lowerPin.includes('in')) return `${baseName} IN`;

  if (cleanPin && cleanPin.length <= 6 && !baseName.toLowerCase().includes(cleanPin.toLowerCase())) {
    return `${baseName} ${cleanPin}`;
  }

  return baseName;
}

import { getPinWorldPosition } from './geometry';

/**
 * Trace End-to-End net connections starting from an MCU pin,
 * supporting direct wires, breadboard spatial tie-points,
 * passive pass-through components (Resistors), and Level Converters (BSS138).
 */
export function generateMcuWiringGroups(
  components: CircuitComponent[],
  wires: Wire[],
  allDefs: Record<string, ComponentDefinition>
): McuWiringGroup[] {
  // 1. Identify all Microcontrollers (Hosts)
  const mcuComponents = components.filter((c) => isHostComponent(c));
  if (mcuComponents.length === 0) return [];

  // 2. Build Electrical Net Disjoint-Set (Union-Find)
  const parent = new Map<string, string>();
  function find(id: string): string {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!));
    }
    return parent.get(id)!;
  }
  function union(idA: string, idB: string) {
    const rootA = find(idA);
    const rootB = find(idB);
    if (rootA !== rootB) {
      parent.set(rootA, rootB);
    }
  }

  // 3. Map Breadboards & their physical holes
  const breadboards = components.filter((c) => c.type.startsWith('breadboard'));
  const bbHoleMap = new Map<string, { bbId: string; pinId: string; netKey: string }>();

  breadboards.forEach((bb) => {
    const bbDef = allDefs[bb.type] || COMPONENT_DEFINITIONS[bb.type];
    if (!bbDef) return;

    bbDef.pins.forEach((pin) => {
      const pWorld = getPinWorldPosition(bb.x, bb.y, bbDef.width, bbDef.height, bb.rotation || 0, pin);
      const netKey = `${bb.id}:${pin.internalNetId || pin.id}`;
      const coordKey = `${Math.round(pWorld.x / 4) * 4},${Math.round(pWorld.y / 4) * 4}`;
      bbHoleMap.set(coordKey, { bbId: bb.id, pinId: pin.id, netKey });

      if (pin.internalNetId) {
        union(`${bb.id}:pin:${pin.id}`, netKey);
      }
    });
  });

  // 4. Connect mounted components into Breadboard holes
  components.forEach((comp) => {
    if (comp.type.startsWith('breadboard')) return;
    const def = allDefs[comp.type] || COMPONENT_DEFINITIONS[comp.type];
    if (!def) return;

    def.pins.forEach((pin) => {
      const pinNode = `${comp.id}:${pin.id}`;
      const pWorld = getPinWorldPosition(comp.x, comp.y, def.width, def.height, comp.rotation || 0, pin);
      const rx = Math.round(pWorld.x / 4) * 4;
      const ry = Math.round(pWorld.y / 4) * 4;

      let match = bbHoleMap.get(`${rx},${ry}`);
      if (!match) {
        for (let dx = -8; dx <= 8; dx += 4) {
          for (let dy = -8; dy <= 8; dy += 4) {
            const testKey = `${rx + dx},${ry + dy}`;
            if (bbHoleMap.has(testKey)) {
              match = bbHoleMap.get(testKey);
              break;
            }
          }
          if (match) break;
        }
      }

      if (match) {
        union(pinNode, match.netKey);
      }
    });
  });

  // 5. Connect Wires into the Electrical Net
  wires.forEach((w) => {
    const wireNode = `wire:${w.id}`;

    if (w.fromComponentId && w.fromPinId) {
      const fComp = components.find((c) => c.id === w.fromComponentId);
      if (fComp && fComp.type.startsWith('breadboard')) {
        const def = allDefs[fComp.type] || COMPONENT_DEFINITIONS[fComp.type];
        const pin = def?.pins.find((p) => p.id === w.fromPinId);
        const netKey = `${fComp.id}:${pin?.internalNetId || w.fromPinId}`;
        union(wireNode, netKey);
        union(wireNode, `${fComp.id}:pin:${w.fromPinId}`);
      } else {
        union(wireNode, `${w.fromComponentId}:${w.fromPinId}`);
      }
    } else if (w.fromWireId) {
      union(wireNode, `wire:${w.fromWireId}`);
    }

    if (w.toComponentId && w.toPinId) {
      const tComp = components.find((c) => c.id === w.toComponentId);
      if (tComp && tComp.type.startsWith('breadboard')) {
        const def = allDefs[tComp.type] || COMPONENT_DEFINITIONS[tComp.type];
        const pin = def?.pins.find((p) => p.id === w.toPinId);
        const netKey = `${tComp.id}:${pin?.internalNetId || w.toPinId}`;
        union(wireNode, netKey);
        union(wireNode, `${tComp.id}:pin:${w.toPinId}`);
      } else {
        union(wireNode, `${w.toComponentId}:${w.toPinId}`);
      }
    } else if (w.toWireId) {
      union(wireNode, `wire:${w.toWireId}`);
    }
  });

  // Helper for pass-through components (Resistor & Level Converter)
  function tracePassThroughTargets(
    connComp: CircuitComponent,
    connPin: { id: string; name: string; type?: string; description?: string }
  ): {
    targetComp: CircuitComponent;
    targetPin: { id: string; name: string; type?: string; description?: string };
    pinLv: string;
    converterModule: string;
    pinHv: string;
    note: string;
  }[] {
    // A. Resistor Pass-Through
    if (connComp.type === 'resistor') {
      const ohms = connComp.customProps?.resistance ?? 220;
      const formattedRes = ohms >= 1000 ? `${ohms / 1000}kΩ` : `${ohms}Ω`;
      const otherPinId = connPin.id === 'pin1' || connPin.id === 'pin_1' ? 'pin2' : 'pin1';
      const otherRoot = find(`${connComp.id}:${otherPinId}`);

      const nextTargets: {
        targetComp: CircuitComponent;
        targetPin: { id: string; name: string; type?: string; description?: string };
        pinLv: string;
        converterModule: string;
        pinHv: string;
        note: string;
      }[] = [];

      components.forEach((c) => {
        if (c.id === connComp.id || c.type.startsWith('breadboard')) return;
        const cDef = allDefs[c.type] || COMPONENT_DEFINITIONS[c.type];
        if (!cDef) return;

        cDef.pins.forEach((cp) => {
          if (find(`${c.id}:${cp.id}`) === otherRoot) {
            nextTargets.push({
              targetComp: c,
              targetPin: cp,
              pinLv: '-',
              converterModule: '-',
              pinHv: '-',
              note: `Resistor ${formattedRes} seri`,
            });
          }
        });
      });

      return nextTargets.length > 0
        ? nextTargets
        : [
            {
              targetComp: connComp,
              targetPin: connPin,
              pinLv: '-',
              converterModule: '-',
              pinHv: '-',
              note: `Resistor ${formattedRes}`,
            },
          ];
    }

    // B. Level Converter (BSS138, 4-Ch / 8-Ch) Pass-Through
    if (
      connComp.type.includes('level-converter') ||
      connComp.type.includes('converter') ||
      connComp.name?.toLowerCase().includes('converter') ||
      connComp.label?.toLowerCase().includes('bss138')
    ) {
      const converterModule = connComp.label || connComp.name || 'BSS138';
      const pinLv = connPin.name || connPin.id || 'LV';
      const lvIndexMatch = (connPin.id || connPin.name || '').match(/\d+/);
      const hvNum = lvIndexMatch ? lvIndexMatch[0] : '1';
      const correspondingHvPinId = `hv${hvNum}`;
      const pinHv = `HV${hvNum}`;

      const hvRoot = find(`${connComp.id}:${correspondingHvPinId}`);
      const nextTargets: {
        targetComp: CircuitComponent;
        targetPin: { id: string; name: string; type?: string; description?: string };
        pinLv: string;
        converterModule: string;
        pinHv: string;
        note: string;
      }[] = [];

      components.forEach((c) => {
        if (c.id === connComp.id || c.type.startsWith('breadboard')) return;
        const cDef = allDefs[c.type] || COMPONENT_DEFINITIONS[c.type];
        if (!cDef) return;

        cDef.pins.forEach((cp) => {
          if (find(`${c.id}:${cp.id}`) === hvRoot) {
            nextTargets.push({
              targetComp: c,
              targetPin: cp,
              pinLv,
              converterModule,
              pinHv,
              note: '',
            });
          }
        });
      });

      return nextTargets.length > 0
        ? nextTargets
        : [
            {
              targetComp: connComp,
              targetPin: connPin,
              pinLv,
              converterModule,
              pinHv,
              note: '',
            },
          ];
    }

    // C. Direct Connection
    return [
      {
        targetComp: connComp,
        targetPin: connPin,
        pinLv: '-',
        converterModule: '-',
        pinHv: '-',
        note: '',
      },
    ];
  }

  const groups: McuWiringGroup[] = [];

  mcuComponents.forEach((mcu, mcuIdx) => {
    const mcuDef = allDefs[mcu.type] || COMPONENT_DEFINITIONS[mcu.type];
    if (!mcuDef) return;

    const rows: WiringTableRow[] = [];
    const visitedSignatures = new Set<string>();
    let rowNumber = 1;

    mcuDef.pins.forEach((mcuPin) => {
      const pinNode = `${mcu.id}:${mcuPin.id}`;
      const mcuPinRoot = find(pinNode);

      // Check all other component pins connected to this MCU pin root
      const directConnectedPins: {
        comp: CircuitComponent;
        pin: { id: string; name: string; type?: string; description?: string };
      }[] = [];

      components.forEach((c) => {
        if (c.id === mcu.id || c.type.startsWith('breadboard')) return;
        const cDef = allDefs[c.type] || COMPONENT_DEFINITIONS[c.type];
        if (!cDef) return;

        cDef.pins.forEach((cp) => {
          if (find(`${c.id}:${cp.id}`) === mcuPinRoot) {
            directConnectedPins.push({ comp: c, pin: cp });
          }
        });
      });

      // Also check if any wire is connected in this net
      const netWires = wires.filter((w) => find(`wire:${w.id}`) === mcuPinRoot);
      const representativeWire = netWires[0];

      // Trace endpoints
      directConnectedPins.forEach((directConn) => {
        const resolvedTargets = tracePassThroughTargets(directConn.comp, directConn.pin);

        resolvedTargets.forEach((target) => {
          const sig = `${mcuPin.id}__${target.targetComp.id}__${target.targetPin.id}`;
          if (visitedSignatures.has(sig)) return;
          visitedSignatures.add(sig);

          const mcuPinName = mcuPin.name || mcuPin.id;
          const targetPinName = target.targetPin.name || target.targetPin.id || '';
          const targetDef = allDefs[target.targetComp.type] || COMPONENT_DEFINITIONS[target.targetComp.type];

          const interfaceType = inferInterfaceType(mcuPinName, targetPinName, target.targetComp, targetDef);
          const compName = formatComponentName(target.targetComp, targetPinName, targetDef);
          const gpio = getPhysicalGpio(mcu.type, mcuPinName, mcuPin.id, mcuPin.description);

          let rowNote = target.note;
          if (!rowNote && representativeWire?.label) {
            rowNote = representativeWire.label;
          }
          if (!rowNote) {
            const lowerTgt = targetPinName.toLowerCase();
            if (lowerTgt.includes('sda')) rowNote = 'sda';
            else if (lowerTgt.includes('scl')) rowNote = 'scl';
            else if (lowerTgt.includes('miso')) rowNote = 'miso';
            else if (lowerTgt.includes('mosi')) rowNote = 'mosi';
            else if (lowerTgt.includes('sck')) rowNote = 'sck';
            else if (lowerTgt.includes('cs') || lowerTgt.includes('ss')) rowNote = 'cs';
            else if (lowerTgt.includes('trig')) rowNote = 'trig';
            else if (lowerTgt.includes('echo')) rowNote = 'echo';
          }

          rows.push({
            id: `row_${mcu.id}_${mcuPin.id}_${target.targetComp.id}_${rowNumber}`,
            mcuId: mcu.id,
            mcuName: mcu.name || mcuDef.name,
            mcuLabel: mcu.label || mcu.name || mcuDef.name,
            no: rowNumber++,
            componentName: compName,
            interfaceType,
            mcuPin: cleanPinLabel(mcuPinName),
            gpio,
            pinLv: target.pinLv,
            converterModule: target.converterModule,
            pinHv: target.pinHv,
            note: rowNote,
            wireColor: representativeWire?.color,
            wireId: representativeWire?.id,
            targetCompId: target.targetComp.id,
          });
        });
      });
    });

    // Sort rows: I2C, SPI, UART, One Wire, Interrupt, PWM, Digital Out, Digital In, Analog, Power, Ground
    const priorityOrder: Record<string, number> = {
      'I2C': 1,
      'SPI': 2,
      'UART': 3,
      'One Wire': 4,
      'Interrupt': 5,
      'PWM Output': 6,
      'PWM / Output': 7,
      'Digital Output': 8,
      'Digital Input': 9,
      'Digital I/O': 10,
      'Analog Input': 11,
      'Power Rail': 12,
      'Ground Rail': 13,
    };

    rows.sort((a, b) => {
      const pA = priorityOrder[a.interfaceType] ?? 99;
      const pB = priorityOrder[b.interfaceType] ?? 99;
      return pA - pB;
    });

    // Re-number sequentially
    rows.forEach((r, idx) => {
      r.no = idx + 1;
    });

    groups.push({
      mcu,
      mcuDef,
      mcuTitle: `MCU ${mcuIdx + 1}: ${mcu.label || mcu.name || mcuDef.name}`,
      mcuSubtitle: mcuDef.description || `${rows.length} Jalur Pengkabelan Terhubung`,
      rows,
    });
  });

  return groups;
}

/**
 * Exports wiring table rows to standard CSV string matching Google Sheets layout
 */
export function exportWiringTableToCsv(groups: McuWiringGroup[]): string {
  const headers = ['No', 'Komponen', 'Interface', 'Pin MCU', 'GPIO', 'PIN LV', 'Modul converter', 'PIN HV', 'Note'];
  const lines: string[] = [];

  groups.forEach((g) => {
    lines.push(`=== ${g.mcuTitle} ===`);
    lines.push(headers.join(','));

    g.rows.forEach((r) => {
      const rowData = [
        r.no,
        `"${r.componentName.replace(/"/g, '""')}"`,
        `"${r.interfaceType}"`,
        `"${r.mcuPin}"`,
        `"${r.gpio}"`,
        `"${r.pinLv}"`,
        `"${r.converterModule}"`,
        `"${r.pinHv}"`,
        `"${r.note.replace(/"/g, '""')}"`,
      ];
      lines.push(rowData.join(','));
    });
    lines.push(''); // blank separator
  });

  return lines.join('\n');
}

/**
 * Exports wiring table rows to clean Markdown table
 */
export function exportWiringTableToMarkdown(groups: McuWiringGroup[]): string {
  const chunks: string[] = [];

  groups.forEach((g) => {
    chunks.push(`### 🔷 ${g.mcuTitle}\n`);
    chunks.push('| No | Komponen | Interface | Pin MCU | GPIO | PIN LV | Modul converter | PIN HV | Note |');
    chunks.push('|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|---|');

    g.rows.forEach((r) => {
      chunks.push(
        `| ${r.no} | **${r.componentName}** | \`${r.interfaceType}\` | **${r.mcuPin}** | \`${r.gpio}\` | ${r.pinLv} | ${r.converterModule} | ${r.pinHv} | ${r.note || '-'} |`
      );
    });
    chunks.push('\n');
  });

  return chunks.join('\n');
}
