import React from 'react';
import { CircuitComponent, Pin } from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { getAllComponentDefinitions } from '../../utils/customComponents';
import { ComponentVisualRenderer } from './shapes/ComponentVisualRenderer';

interface ComponentSvgProps {
  component: CircuitComponent;
  isSelected: boolean;
  isHovered: boolean;
  activeWireStartPinId: string | null;
  activeWireTargetPinId?: string | null;
  onPinMouseDown: (componentId: string, pin: Pin, e: React.MouseEvent) => void;
  onPinMouseUp?: (componentId: string, pin: Pin, e: React.MouseEvent) => void;
  onPinMouseEnter: (componentId: string, pin: Pin, e: React.MouseEvent) => void;
  onPinMouseLeave: () => void;
}

const ComponentSvgComponent: React.FC<ComponentSvgProps> = ({
  component,
  isSelected,
  isHovered,
  activeWireStartPinId,
  activeWireTargetPinId,
  onPinMouseDown,
  onPinMouseUp,
  onPinMouseEnter,
  onPinMouseLeave,
}) => {
  const allDefs = getAllComponentDefinitions();
  const def = allDefs[component.type] || COMPONENT_DEFINITIONS[component.type];
  if (!def) return null;

  const { width, height } = def;
  const cx = width / 2;
  const cy = height / 2;

  const isBreadboard =
    component.type === 'breadboard-half' ||
    component.type === 'breadboard-mini' ||
    component.type === 'breadboard-full';

  return (
    <g id={`comp-${component.id}`} className="cursor-move group">
      {/* Rotated Component Body, Visuals & Pins */}
      <g
        transform={`translate(${component.x}, ${component.y}) rotate(${component.rotation}, ${cx}, ${cy})`}
      >
        {/* Selection Bounding Box */}
        {isSelected && <rect x="-6" y="-6" width={width + 12} height={height + 12} rx="10" fill={component.locked ? "rgba(245, 158, 11, 0.05)" : "none"} stroke={component.locked ? "#f59e0b" : "#38bdf8"} strokeWidth="2" strokeDasharray={component.locked ? "6 3" : "4 4"} className="animate-pulse pointer-events-none" />}

        {/* Locked Indicator Badge */}
        {component.locked && (
          <g transform={`translate(${width - 18}, -8)`} className="pointer-events-none">
            <circle cx="8" cy="8" r="8.5" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M5.5 8V6.5a2.5 2.5 0 0 1 5 0V8m-6 0h7a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* Component Graphics (Photorealistic PNG / Clean SVG) */}
        <ComponentVisualRenderer component={component} def={def} />

        {/* Pins Layer Overlay */}
        {def.pins.map((pin) => {
          const isStartPin = activeWireStartPinId === pin.id;
          const isTargetPin = activeWireTargetPinId === pin.id;
          const isEsp = component.type.startsWith('esp32');
          const isWemos = component.type.startsWith('wemos');
          const isLed = component.type === 'led';
          const isResistor = component.type === 'resistor';
          const isPot = component.type === 'potentiometer';
          const isUltrasonic = component.type === 'sensor-ultrasonic';
          const isDht =
            component.type === 'sensor-dht11' ||
            component.type === 'sensor-dht11-module' ||
            component.type === 'sensor-dht22' ||
            component.type === 'sensor-dht22-module';
          const isDs18b20 =
            component.type === 'sensor-ds18b20' ||
            component.type === 'sensor-ds18b20-module';
          const isRfid = component.type === 'sensor-rfid-rc522';
          const isSoilMoisture = component.type === 'sensor-soil-moisture';
          const isTds = component.type === 'sensor-tds';
          const isPt100 = component.type === 'sensor-pt100';
          const isRtdTx = component.type === 'transmitter-rtd-pt100';
          const isMax31865 = component.type.includes('max31865');
          const isLcd =
            component.type === 'display-lcd1602' ||
            component.type === 'display-lcd1602-i2c' ||
            component.type === 'display-lcd2004' ||
            component.type === 'display-lcd2004-i2c';
          const isOled = component.type === 'display-oled';
          const isBuzzer = component.type === 'buzzer';
          const isSpeaker = component.type === 'speaker';
          const isTm1637 = component.type === 'display-tm1637';
          const isServo = component.type === 'servo';
          const isRelay = component.type === 'relay';
          const isRelayBlack = component.type === 'relay-black';
          const isRelayRed = component.type === 'relay-red';
          const isRtc = component.type === 'rtc-ds3231';
          const isTft = component.type === 'display-tft-28' || component.type === 'display-tft-28-touch';
          const isKeypad = component.type === 'keypad-3x4' || component.type === 'keypad-4x4';
          const isPzem = component.type === 'pzem-004t';
          const isCtCoil = component.type === 'sensor-ct-coil';
          const isNodeMcu = component.type === 'nodemcu-v1' || component.type === 'nodemcu-ch340';
          const isAds1115 = component.type === 'sensor-ads1115';
          const isJsnSr04t = component.type === 'sensor-jsn-sr04t';
          const isSim800l = component.type === 'module-sim800l';
          const pinRadius = isBreadboard
            ? 2.8
            : isEsp || isWemos || isNodeMcu
            ? 3.4
            : isRtdTx || (isMax31865 && pin.y < 50)
            ? 5.0
            : isPt100
            ? 4.5
            : isPzem
            ? 3.2
            : isCtCoil
            ? 3.0
            : isResistor || isSpeaker
            ? 3.2
            : isLed
            ? 2.5
            : def.isCustom || isPot || isUltrasonic || isDht || isDs18b20 || isRfid || isSoilMoisture || isTds || isOled || isBuzzer || isTm1637 || isServo || isRelay || isRelayBlack || isRelayRed || isRtc || isTft || isKeypad || isMax31865 || isAds1115 || isJsnSr04t || isSim800l || component.type === 'sensor-touch-ttp223'
            ? 2.8
            : isLcd
            ? 3.6
            : 4.5;

          return (
            <g
              key={pin.id}
              transform={`translate(${pin.x}, ${pin.y})`}
              className="cursor-pointer group/pin"
              style={{ pointerEvents: 'all' }}
              onMouseDown={(e) => onPinMouseDown(component.id, pin, e)}
              onMouseUp={(e) => onPinMouseUp?.(component.id, pin, e)}
              onMouseEnter={(e) => onPinMouseEnter(component.id, pin, e)}
              onMouseLeave={onPinMouseLeave}
            >
              {/* Generous invisible hitbox for effortless wire connection (guaranteed pointer event capture) */}
              <circle cx="0" cy="0" r={pin.id === 'ac_pass' ? 18 : isBreadboard ? 7.5 : isLed || isResistor || isPot || isUltrasonic || isDht || isOled || isBuzzer || isTm1637 || isServo || isRelay || isRelayBlack || isRtc ? 9 : 12} fill="#ffffff" opacity="0.001" style={{ pointerEvents: 'all' }} />

              {/* Special guide ring for CT center hole pass-through */}
              {pin.id === 'ac_pass' ? (
                <circle cx="0" cy="0" r="14" fill={isStartPin ? 'rgba(56, 189, 248, 0.2)' : isTargetPin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 6, 23, 0.2)'} stroke={isStartPin ? '#38bdf8' : isTargetPin ? '#34d399' : 'rgba(56, 189, 248, 0.45)'} strokeWidth="1.5" strokeDasharray="3 3" className="transition-all hover:stroke-sky-400 hover:stroke-2" />
              ) : (
                <circle
                  cx="0"
                  cy="0"
                  r={pinRadius}
                  fill={isStartPin ? '#38bdf8' : isTargetPin ? '#10b981' : isBreadboard ? (pin.type === 'power' ? 'rgba(239, 68, 68, 0.4)' : pin.type === 'ground' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(30, 41, 59, 0.35)') : isResistor ? '#475569' : isLed ? 'rgba(148, 163, 184, 0.7)' : pin.type === 'power' ? 'rgba(239, 68, 68, 0.3)' : pin.type === 'ground' ? 'rgba(56, 189, 248, 0.3)' : pin.type === 'i2c' ? 'rgba(192, 132, 252, 0.3)' : pin.type === 'spi' ? 'rgba(234, 179, 8, 0.3)' : pin.type === 'uart' ? 'rgba(6, 182, 212, 0.3)' : pin.type === 'analog' ? 'rgba(34, 197, 94, 0.3)' : pin.type === 'pwm' ? 'rgba(249, 115, 22, 0.3)' : isPot || isUltrasonic || isDht || isOled || isBuzzer || isTm1637 || isServo || isRelay || isRelayBlack || isRtc ? 'rgba(100, 116, 139, 0.5)' : isLcd ? 'rgba(15, 23, 42, 0.65)' : 'rgba(30, 41, 59, 0.6)'}
                  stroke={isStartPin ? '#38bdf8' : isTargetPin ? '#34d399' : isBreadboard ? (pin.type === 'power' ? '#ef4444' : pin.type === 'ground' ? '#38bdf8' : 'rgba(148, 163, 184, 0.4)') : isResistor ? '#1e293b' : isLed ? '#cbd5e1' : pin.type === 'power' ? '#ef4444' : pin.type === 'ground' ? '#38bdf8' : pin.type === 'i2c' ? '#c084fc' : pin.type === 'spi' ? '#eab308' : pin.type === 'uart' ? '#06b6d4' : pin.type === 'analog' ? '#22c55e' : pin.type === 'pwm' ? '#f97316' : isPot || isUltrasonic || isDht || isOled || isBuzzer || isTm1637 || isServo || isRelay || isRelayBlack || isRtc ? '#64748b' : isLcd ? '#334155' : '#475569'}
                  strokeWidth={isStartPin || isTargetPin ? 2 : isBreadboard ? 1 : 1.5}
                  className="transition-all group-hover/pin:scale-125 group-hover/pin:stroke-white group-hover/pin:stroke-2"
                />
              )}

              {/* Glowing pin indicator when starting wire from this pin */}
              {isStartPin && <circle cx="0" cy="0" r="10" fill="none" stroke="#38bdf8" strokeWidth="2" className="animate-ping" />}

              {/* Glowing target snap indicator when cursor hovers or nears this pin */}
              {isTargetPin && <circle cx="0" cy="0" r="7.5" fill="none" stroke="#10b981" strokeWidth="2" className="animate-pulse" />}
            </g>
          );
        })}
      </g>
    </g>
  );
};

function areComponentPropsEqual(prev: ComponentSvgProps, next: ComponentSvgProps): boolean {
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isHovered !== next.isHovered) return false;
  if (prev.activeWireStartPinId !== next.activeWireStartPinId) return false;
  if (prev.activeWireTargetPinId !== next.activeWireTargetPinId) return false;

  const pc = prev.component;
  const nc = next.component;

  if (pc === nc) return true;
  if (pc.id !== nc.id) return false;
  if (pc.x !== nc.x || pc.y !== nc.y || pc.rotation !== nc.rotation) return false;
  if (pc.label !== nc.label || pc.name !== nc.name || pc.type !== nc.type) return false;
  if (pc.locked !== nc.locked) return false;

  if (pc.customProps !== nc.customProps) {
    const pKeys = Object.keys(pc.customProps || {});
    const nKeys = Object.keys(nc.customProps || {});
    if (pKeys.length !== nKeys.length) return false;
    for (const k of pKeys) {
      if (pc.customProps?.[k] !== nc.customProps?.[k]) return false;
    }
  }

  return true;
}

export const ComponentSvg = React.memo(ComponentSvgComponent, areComponentPropsEqual);
