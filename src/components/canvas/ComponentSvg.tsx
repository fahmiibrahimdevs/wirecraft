import React from 'react';
import { CircuitComponent, Pin } from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { getAllComponentDefinitions } from '../../utils/customComponents';
import { getResistor5BandColors } from '../../utils/geometry';

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

const getButtonColors = (colorName = 'green', pressed = false) => {
  const map: Record<string, { base: string; dark: string; border: string; highlight: string }> = {
    green: {
      base: pressed ? '#15803d' : '#22c55e',
      dark: '#14532d',
      border: '#052e16',
      highlight: '#86efac',
    },
    red: {
      base: pressed ? '#b91c1c' : '#ef4444',
      dark: '#7f1d1d',
      border: '#450a0a',
      highlight: '#fca5a5',
    },
    blue: {
      base: pressed ? '#1d4ed8' : '#3b82f6',
      dark: '#1e3a8a',
      border: '#172554',
      highlight: '#93c5fd',
    },
    yellow: {
      base: pressed ? '#ca8a04' : '#eab308',
      dark: '#713f12',
      border: '#422006',
      highlight: '#fef08a',
    },
    black: {
      base: pressed ? '#0f172a' : '#334155',
      dark: '#020617',
      border: '#000000',
      highlight: '#64748b',
    },
  };
  return map[colorName] || map.green;
};

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

  // Render component visual - using real PNG/SVG image assets where available!
  const renderVisual = () => {
    switch (component.type) {
      case 'arduino-nano':
        return (
          <image
            href="/components/arduino_nano.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'arduino-uno':
        return (
          <image
            href="/components/arduino_uno.svg"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'esp32':
        return (
          <image
            href="/components/ESP32_30P.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'pzem-004t':
        return (
          <image
            href="/components/pzem_004t.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-ct-coil':
        return (
          <image
            href="/components/ct_coil.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'esp32-38p-cp2102':
        return (
          <image
            href="/components/esp32_38p_cp2102.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'esp32-c3-supermini':
        return (
          <image
            href="/components/esp32_c3_supermini.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'wemos-d1-mini':
        return (
          <image
            href="/components/wemos_d1_mini.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'nodemcu-v1':
        return (
          <image
            href="/components/nodemcu_v1.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'nodemcu-ch340':
        return (
          <image
            href="/components/nodemcu_ch340.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'ftdi-ft232rl':
        return (
          <image
            href="/components/ftdi_ft232rl.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'breadboard-mini':
        return (
          <image
            href="/components/breadboard_mini.svg"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'breadboard-half':
        return (
          <image
            href="/components/breadboard_half.svg"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'breadboard-full':
        return (
          <image
            href="/components/breadboard_full.svg"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'resistor': {
        const ohms = component.customProps.resistance ?? 220;
        const [band1, band2, band3, bandMult, bandTol] = getResistor5BandColors(ohms);

        return (
          <g>
            {/* Embedded scalable vector metal-film resistor with 5 dynamic color bands */}
            <svg
              viewBox="0 0 42.917 9.71"
              width={width}
              height={height}
              preserveAspectRatio="none"
              overflow="visible"
            >
              {/* Thick Solid Metallic Leads (Pins) - High Contrast Dark Metal, No Pale Silver */}
              {/* Outer stroke / border for crisp high contrast against light breadboard */}
              <line
                strokeLinecap="round"
                x1="1.192"
                y1="4.855"
                x2="41.725"
                y2="4.855"
                stroke="#1e293b"
                strokeWidth="3.4"
              />
              {/* Solid thick metallic wire lead (graphite / dark solder lead) */}
              <line
                strokeLinecap="round"
                x1="1.192"
                y1="4.855"
                x2="41.725"
                y2="4.855"
                stroke="#64748b"
                strokeWidth="2.4"
              />
              {/* Terminal contact eyelets at lead tips */}
              <circle cx="1.192" cy="4.855" r="1.6" fill="#475569" stroke="#1e293b" strokeWidth="0.6" />
              <circle cx="41.725" cy="4.855" r="1.6" fill="#475569" stroke="#1e293b" strokeWidth="0.6" />

              {/* Precision Metal Film Resistor Body (Vibrant Sky Blue / Cyan) */}
              <path
                id="body"
                fill="#0284c7"
                stroke="#0369a1"
                strokeWidth="0.25"
                d="M14.233,0.688c-0.5-0.23-1.36-0.41-1.91-0.41h-2.76c-0.55,0-1,0.45-1,1v7.439c0,0.551,0.45,1,1,1
                  h2.76c0.55,0,1.41-0.189,1.91-0.41l0.1-0.049c0.5-0.23,1.36-0.41,1.91-0.41h9.98c0.551,0,1.409,0.189,1.909,0.41l0.101,0.049
                  c0.5,0.23,1.358,0.41,1.91,0.41h2.76c0.552,0,1-0.449,1-1V1.278c0-0.55-0.448-1-1-1h-2.76c-0.552,0-1.41,0.19-1.91,0.41
                  l-0.101,0.05c-0.5,0.23-1.358,0.41-1.909,0.41h-9.98c-0.55,0-1.41-0.19-1.91-0.41L14.233,0.688z"
              />

              {/* Band 1 (1st Digit) */}
              <path
                id="band_1"
                fill={band1}
                d="M14.762,0.888c-0.16-0.05-0.31-0.1-0.43-0.16l-0.1-0.05c-0.5-0.229-1.36-0.41-1.91-0.41
                  h-0.12v9.439h0.12c0.55,0,1.41-0.189,1.91-0.41l0.1-0.049c0.12-0.062,0.27-0.111,0.43-0.16V0.888z"
              />

              {/* Band 2 (2nd Digit) */}
              <rect
                id="band_2"
                fill={band2}
                x="16.5"
                y="1.148"
                width="2.1"
                height="7.69"
              />

              {/* Band 3 (3rd Digit) */}
              <rect
                id="band_3"
                fill={band3}
                x="19.8"
                y="1.148"
                width="2.1"
                height="7.69"
              />

              {/* Band 4 (Multiplier) */}
              <rect
                id="band_multiplier"
                fill={bandMult}
                x="23.1"
                y="1.148"
                width="2.1"
                height="7.69"
              />

              {/* Band 5 (Tolerance - 1% Brown on Metal Film) */}
              <rect
                id="band_tolerance"
                fill={bandTol}
                x="30.582"
                y="0.269"
                width="1.3"
                height="9.438"
              />

              {/* 3D Cylindrical Shadow Overlay */}
              <path
                id="Shadow"
                opacity="0.30"
                fill="#000000"
                d="M32.932,5.68L32.932,5.68c0,0.527-0.181,0.971-0.41,0.971h-2.67
                  c-0.528,0-1.358-0.078-1.851-0.17L27.9,6.459c-0.479-0.09-1.318-0.17-1.852-0.17H16.4c-0.53,0-1.36,0.08-1.85,0.17l-0.1,0.021
                  c-0.48,0.091-1.31,0.17-1.85,0.17h-0.44h-1.39h-0.43c-0.53,0-0.97,0.408-0.97,0.896v0.343V8.11v0.24c0,0.5,0.44,0.896,0.97,0.896
                  h2.25c0.53,0,1.36-0.17,1.85-0.371l0.1-0.039c0.48-0.196,1.32-0.368,1.85-0.368h9.648c0.527,0,1.357,0.172,1.853,0.369l0.103,0.039
                  c0.479,0.201,1.312,0.371,1.852,0.371h3.09c0.529,0,0.971-0.41,0.971-0.896V7.6V6.249V3.688C33.522,3.838,32.932,4.258,32.932,5.68
                  z"
              />
              <rect
                id="ShadowExtra"
                x="30.582"
                y="4.838"
                opacity="0.38"
                fill="#000000"
                width="1.3"
                height="4.379"
              />

              {/* 3D Cylindrical Specular Highlights */}
              <path
                id="ReflexRight"
                opacity="0.35"
                fill="#FFFFFF"
                d="M27.432,1.508c0.319,0,0.682-0.14,0.92-0.24
                  c0.28-0.11,0.801-0.2,1.342-0.2h2.029c0.312,0,0.312,0.34,0.312,0.52c0,0.18-0.021,0.53-0.312,0.53h-4.25
                  c-0.149,0-0.32-0.16-0.32-0.311C27.162,1.688,27.262,1.508,27.432,1.508z"
              />
              <circle
                id="ReflexLeft"
                opacity="0.4"
                fill="#FFFFFF"
                cx="9.722"
                cy="1.578"
                r="0.6"
              />
              <rect
                id="Reflex_gold"
                x="30.582"
                y="0.588"
                opacity="0.35"
                fill="#FFFFFF"
                width="1.3"
                height="2.25"
              />
            </svg>
          </g>
        );
      }

      case 'led': {
        const color = (component.customProps.ledColor || 'red').toLowerCase();
        const isOn = component.customProps.isLedOn;

        // Map color to photorealistic PNG asset provided by user
        let imageSrc = '/components/LED_RED.png';
        if (color === 'green') imageSrc = '/components/LED_GREEN.png';
        else if (color === 'yellow' || color === 'amber') imageSrc = '/components/LED_YELLOW.png';
        else if (color === 'blue' || color === 'white') imageSrc = '/components/LED_BLUE.png';

        const glowColors: Record<string, string> = {
          red: 'rgba(239, 68, 68, 0.85)',
          green: 'rgba(16, 185, 129, 0.85)',
          blue: 'rgba(59, 130, 246, 0.85)',
          yellow: 'rgba(234, 179, 8, 0.85)',
          amber: 'rgba(249, 115, 22, 0.85)',
          white: 'rgba(255, 255, 255, 0.95)',
        };
        const glowColor = glowColors[color] || glowColors.red;

        // Dome apex is near top, dome center around x = width/2, y = 11
        const domeCx = width / 2;
        const domeCy = 11;

        return (
          <g>
            {/* Glowing radial bloom when LED is turned ON */}
            {isOn && (
              <>
                <circle
                  cx={domeCx}
                  cy={domeCy}
                  r={24}
                  fill={glowColor}
                  filter="blur(8px)"
                  opacity="0.85"
                />
                <circle
                  cx={domeCx}
                  cy={domeCy}
                  r={10}
                  fill="#ffffff"
                  filter="blur(3px)"
                  opacity="0.9"
                />
              </>
            )}

            {/* Photorealistic PNG rendered with exact lead pitch */}
            <image
              href={imageSrc}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
          </g>
        );
      }

      case 'sensor-ultrasonic':
        return (
          <image
            href="/components/hc_sr04.png"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'push-button':
      case 'push-button-6mm': {
        const isPressed = Boolean(component.customProps?.buttonPressed);
        const btnColor = getButtonColors(component.customProps?.buttonColor || 'green', isPressed);

        return (
          <g>
            {/* 4 Thick Stamped Metal Terminals (Pins) - Solid Slate/Graphite, High Contrast */}
            {/* Internal bus strips under the housing */}
            <rect
              x="1.25"
              y="11.5"
              width="5.5"
              height="34"
              fill="#475569"
              opacity="0.4"
            />
            <rect
              x="35.25"
              y="11.5"
              width="5.5"
              height="34"
              fill="#475569"
              opacity="0.4"
            />

            {/* Top Left Lead (Pin 1A - Row E) */}
            <rect
              x="1.25"
              y="1.5"
              width="5.5"
              height="15"
              rx="2"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />

            {/* Top Right Lead (Pin 1B - Row E) */}
            <rect
              x="35.25"
              y="1.5"
              width="5.5"
              height="15"
              rx="2"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />

            {/* Bottom Left Lead (Pin 2A - Row F) */}
            <rect
              x="1.25"
              y="40.5"
              width="5.5"
              height="15"
              rx="2"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />

            {/* Bottom Right Lead (Pin 2B - Row F) */}
            <rect
              x="35.25"
              y="40.5"
              width="5.5"
              height="15"
              rx="2"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />

            {/* Main 6x6 mm Square Housing Plate */}
            <rect
              x="4"
              y="11.5"
              width="34"
              height="34"
              rx="3"
              fill="#f1f5f9"
              stroke="#334155"
              strokeWidth="2"
            />
            {/* Inner Plate Bezel */}
            <rect
              x="7"
              y="14.5"
              width="28"
              height="28"
              rx="2"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="1"
            />

            {/* 4 Corner Rivets */}
            <circle cx="8.5" cy="16" r="1.2" fill="#1e293b" />
            <circle cx="33.5" cy="16" r="1.2" fill="#1e293b" />
            <circle cx="8.5" cy="41" r="1.2" fill="#1e293b" />
            <circle cx="33.5" cy="41" r="1.2" fill="#1e293b" />

            {/* Tactile Button Well & Bevel Collar */}
            <circle cx="21" cy="28.5" r="10.5" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
            <circle cx="21" cy="28.5" r="9.5" fill={btnColor.dark} />

            {/* Button Cap with 3D Bevel & Press State */}
            <circle
              cx="21"
              cy="28.5"
              r={isPressed ? "7.5" : "8.5"}
              fill={btnColor.base}
              stroke={btnColor.border}
              strokeWidth="1"
            />
            {/* Top Light Specular Arc Reflex */}
            <ellipse
              cx="21"
              cy="25.5"
              rx="4"
              ry="1.8"
              fill="#ffffff"
              opacity={isPressed ? "0.15" : "0.35"}
            />
          </g>
        );
      }

      case 'push-button-12mm': {
        const isPressed = Boolean(component.customProps?.buttonPressed);
        const btnColor = getButtonColors(component.customProps?.buttonColor || 'green', isPressed);

        return (
          <g>
            {/* 4 Heavy Stamped Metal Leads (Pins) spanning Row C to Row H */}
            {/* Internal metal bus strips visible under translucent/metallic housing */}
            <rect
              x="15.75"
              y="29.5"
              width="6.5"
              height="68"
              fill="#475569"
              opacity="0.35"
            />
            <rect
              x="49.75"
              y="29.5"
              width="6.5"
              height="68"
              fill="#475569"
              opacity="0.35"
            />

            {/* Top Left Lead (Pin 1A - Row C) */}
            {/* Shoulder */}
            <rect
              x="14.5"
              y="23"
              width="9"
              height="9"
              rx="1.5"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />
            {/* Main Leg Strip */}
            <rect
              x="15.75"
              y="2"
              width="6.5"
              height="28"
              rx="2.5"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.4"
            />

            {/* Top Right Lead (Pin 1B - Row C) */}
            {/* Shoulder */}
            <rect
              x="48.5"
              y="23"
              width="9"
              height="9"
              rx="1.5"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />
            {/* Main Leg Strip */}
            <rect
              x="49.75"
              y="2"
              width="6.5"
              height="28"
              rx="2.5"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.4"
            />

            {/* Bottom Left Lead (Pin 2A - Row H) */}
            {/* Shoulder */}
            <rect
              x="14.5"
              y="95"
              width="9"
              height="9"
              rx="1.5"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />
            {/* Main Leg Strip */}
            <rect
              x="15.75"
              y="97"
              width="6.5"
              height="28"
              rx="2.5"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.4"
            />

            {/* Bottom Right Lead (Pin 2B - Row H) */}
            {/* Shoulder */}
            <rect
              x="48.5"
              y="95"
              width="9"
              height="9"
              rx="1.5"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.2"
            />
            {/* Main Leg Strip */}
            <rect
              x="49.75"
              y="97"
              width="6.5"
              height="28"
              rx="2.5"
              fill="#64748b"
              stroke="#334155"
              strokeWidth="1.4"
            />

            {/* Heavy 12x12 mm Square Housing Plate */}
            <rect
              x="2"
              y="29.5"
              width="68"
              height="68"
              rx="4"
              fill="#f1f5f9"
              stroke="#334155"
              strokeWidth="3"
            />
            {/* Inner Plate Inset */}
            <rect
              x="6"
              y="33.5"
              width="60"
              height="60"
              rx="3"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="1.2"
            />

            {/* 4 Distinct Corner Rivet Dots (Matching Reference Screenshot) */}
            <circle cx="10" cy="37.5" r="2.8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <circle cx="62" cy="37.5" r="2.8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <circle cx="10" cy="89.5" r="2.8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <circle cx="62" cy="89.5" r="2.8" fill="#0f172a" stroke="#334155" strokeWidth="1" />

            {/* Center Tactile Round Collar / Well */}
            <circle cx="36" cy="63.5" r="23" fill="#0f172a" stroke="#334155" strokeWidth="1.8" />
            <circle cx="36" cy="63.5" r="21.5" fill={btnColor.dark} />

            {/* Tactile Big Button Cap with 3D Bevel & Press State */}
            <circle
              cx="36"
              cy="63.5"
              r={isPressed ? "18" : "19.5"}
              fill={btnColor.base}
              stroke={btnColor.border}
              strokeWidth="1.2"
            />
            {/* Top Light Specular Reflex Arc */}
            <ellipse
              cx="36"
              cy="55.5"
              rx="9"
              ry="4"
              fill="#ffffff"
              opacity={isPressed ? "0.15" : "0.32"}
            />
          </g>
        );
      }

      case 'potentiometer': {
        const val = component.customProps?.potValue ?? 50;
        // Rentang rotasi rotary dial: -135° (0%) sampai +135° (100%)
        const angle = -135 + (val / 100) * 270;
        const knobCenterCanvasX = 70.28;
        const knobCenterCanvasY = 60.71;
        const knobSize = 74.8;

        return (
          <g>
            {/* Photorealistic Potentiometer Body Asset (termasuk casing logam, kuping samping, sekrup philips, papan phenolic, dan 3 kaki terminal) */}
            <image
              href="/components/potentiometer_body.png"
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="none"
            />

            {/* Dynamic Rotating Knurled Dial Knob */}
            <g
              transform={`rotate(${angle}, ${knobCenterCanvasX}, ${knobCenterCanvasY})`}
              style={{ transformOrigin: `${knobCenterCanvasX}px ${knobCenterCanvasY}px` }}
            >
              <image
                href="/components/potentiometer_knob.png"
                x={knobCenterCanvasX - knobSize / 2}
                y={knobCenterCanvasY - knobSize / 2}
                width={knobSize}
                height={knobSize}
                preserveAspectRatio="none"
              />
            </g>
          </g>
        );
      }


      case 'display-lcd1602':
      case 'display-lcd1602-i2c': {
        const isI2C = component.type === 'display-lcd1602-i2c';
        const imageSrc = isI2C ? '/components/lcd_1602_i2c.png' : '/components/lcd_1602_parallel.png';
        const textRow1 = component.customProps?.lcdTextRow1 || '';
        const textRow2 = component.customProps?.lcdTextRow2 || '';

        return (
          <g>
            {/* Photorealistic LCD 1602 Hardware Asset (Green PCB, Black Bezel, Matrix Screen & Header Pins) */}
            <image
              href={imageSrc}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="none"
            />

            {/* Dynamic Character LCD 16x2 Text Overlay (Only rendered if user inputs text) */}
            {(textRow1 || textRow2) && (
              <g transform="translate(68, 82)">
                {textRow1 && (
                  <text
                    x="0"
                    y="30"
                    fill="#162506"
                    fontSize="22"
                    fontFamily="monospace"
                    fontWeight="700"
                    letterSpacing="3.2px"
                    style={{ userSelect: 'none' }}
                  >
                    {textRow1.slice(0, 16).padEnd(16, ' ')}
                  </text>
                )}
                {textRow2 && (
                  <text
                    x="0"
                    y="58"
                    fill="#162506"
                    fontSize="22"
                    fontFamily="monospace"
                    fontWeight="700"
                    letterSpacing="3.2px"
                    style={{ userSelect: 'none' }}
                  >
                    {textRow2.slice(0, 16).padEnd(16, ' ')}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      }

      case 'display-lcd2004':
      case 'display-lcd2004-i2c': {
        const isI2C = component.type === 'display-lcd2004-i2c';
        const imageSrc = isI2C ? '/components/lcd_2004_i2c.png' : '/components/lcd_2004_parallel.png';
        const textRow1 = component.customProps?.lcdTextRow1 || '';
        const textRow2 = component.customProps?.lcdTextRow2 || '';
        const textRow3 = component.customProps?.lcdTextRow3 || '';
        const textRow4 = component.customProps?.lcdTextRow4 || '';
        const hasText = textRow1 || textRow2 || textRow3 || textRow4;

        return (
          <g>
            {/* Photorealistic LCD 2004 Hardware Asset (Green PCB, Black Bezel, Matrix Screen & Header Pins) */}
            <image
              href={imageSrc}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="none"
            />

            {/* Dynamic Character LCD 20x4 Text Overlay (Only rendered if user inputs text) */}
            {hasText && (
              <g transform="translate(70, 80)">
                {textRow1 && (
                  <text
                    x="0"
                    y="28"
                    fill="#162506"
                    fontSize="20"
                    fontFamily="monospace"
                    fontWeight="700"
                    letterSpacing="2.8px"
                    style={{ userSelect: 'none' }}
                  >
                    {textRow1.slice(0, 20).padEnd(20, ' ')}
                  </text>
                )}
                {textRow2 && (
                  <text
                    x="0"
                    y="56"
                    fill="#162506"
                    fontSize="20"
                    fontFamily="monospace"
                    fontWeight="700"
                    letterSpacing="2.8px"
                    style={{ userSelect: 'none' }}
                  >
                    {textRow2.slice(0, 20).padEnd(20, ' ')}
                  </text>
                )}
                {textRow3 && (
                  <text
                    x="0"
                    y="84"
                    fill="#162506"
                    fontSize="20"
                    fontFamily="monospace"
                    fontWeight="700"
                    letterSpacing="2.8px"
                    style={{ userSelect: 'none' }}
                  >
                    {textRow3.slice(0, 20).padEnd(20, ' ')}
                  </text>
                )}
                {textRow4 && (
                  <text
                    x="0"
                    y="112"
                    fill="#162506"
                    fontSize="20"
                    fontFamily="monospace"
                    fontWeight="700"
                    letterSpacing="2.8px"
                    style={{ userSelect: 'none' }}
                  >
                    {textRow4.slice(0, 20).padEnd(20, ' ')}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      }

      case 'display-oled':
        return (
          <image
            href="/components/oled_096.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'display-tm1637':
        return (
          <image
            href="/components/tm1637_display.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-dht11':
        return (
          <image
            href="/components/sensor_dht11.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-dht11-module':
        return (
          <image
            href="/components/sensor_dht11_module.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-dht22':
        return (
          <image
            href="/components/dht22_standalone.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-dht22-module':
        return (
          <image
            href="/components/dht22_module.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-ds18b20':
        return (
          <image
            href="/components/sensor_ds18b20.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-ds18b20-module':
        return (
          <image
            href="/components/sensor_ds18b20_module.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-rfid-rc522':
        return (
          <image
            href="/components/rfid_rc522.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sd-card-module':
        return (
          <image
            href="/components/sdcard_module.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-soil-moisture':
        return (
          <image
            href="/components/sensor_soil_moisture.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-tds':
        return (
          <image
            href="/components/sensor_tds.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-ph4502c':
        return (
          <image
            href="/components/sensor_ph4502c.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-pt100':
        return (
          <image
            href="/components/sensor_pt100.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'transmitter-rtd-pt100':
        return (
          <image
            href="/components/transmitter_rtd_pt100.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-max31865':
        return (
          <image
            href="/components/sensor_max31865.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-ldr-module':
        return (
          <image
            href="/components/sensor_ldr_module.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-ir-obstacle':
        return (
          <image
            href="/components/sensor_ir_obstacle.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-touch-ttp223':
        return (
          <image
            href="/components/sensor_touch_ttp223.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-vibration-sw420':
        return (
          <image
            href="/components/sensor_vibration_sw420.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'level-converter-4ch-blue':
        return (
          <image
            href="/components/level_converter_4ch_blue.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'level-converter-8ch-red':
        return (
          <image
            href="/components/level_converter_8ch_red.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'level-converter-4ch-red':
        return (
          <image
            href="/components/level_converter_4ch_red.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-ads1115':
        return (
          <image
            href="/components/sensor_ads1115.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'sensor-jsn-sr04t':
        return (
          <image
            href="/components/sensor_jsn_sr04t.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'module-sim800l':
        return (
          <image
            href="/components/module_sim800l.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'buzzer':
        return (
          <image
            href="/components/buzzer.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'speaker':
        return (
          <image
            href="/components/speaker.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'servo':
        return (
          <image
            href="/components/servo_sg90.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'relay':
        return (
          <image
            href="/components/relay_1ch.svg"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'relay-black':
        return (
          <image
            href="/components/relay_black.svg"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'relay-red':
        return (
          <image
            href="/components/relay_red.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'rtc-ds3231':
        return (
          <image
            href="/components/rtc_ds3231.svg"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'display-tft-28':
        return (
          <image
            href="/components/tft_28_ili9341.svg"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'display-tft-28-touch':
        return (
          <image
            href="/components/tft_28_ili9341_touch.svg"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'keypad-3x4':
        return (
          <image
            href="/components/keypad_3x4.svg"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'keypad-4x4':
        return (
          <image
            href="/components/keypad_4x4.svg"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'battery-9v':
        return (
          <g>
            <rect x="10" y="20" width="60" height="100" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <rect x="10" y="20" width="60" height="30" fill="#0284c7" />
            <text x="40" y="40" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">9V</text>
            <text x="40" y="75" fill="#94a3b8" fontSize="8" textAnchor="middle">HEAVY DUTY</text>
            <circle cx="28" cy="12" r="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
            <text x="28" y="25" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">+</text>
            <circle cx="52" cy="12" r="5" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
            <text x="52" y="25" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">-</text>
          </g>
        );

      case 'psu-smps-12v':
        return (
          <image
            href="/components/psu_smps_12v.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'fitting-lamp': {
        const isOff = component.customProps?.isLedOn === false;
        return (
          <image
            href={isOff ? "/components/fitting_lamp_off.png" : "/components/fitting_lamp_on.png"}
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );
      }

      case 'ac-outlet':
        return (
          <image
            href="/components/ac_outlet.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      case 'steker-switch': {
        const isSwitchedOn = component.customProps?.isSwitchedOn !== false;
        return (
          <image
            href={isSwitchedOn ? "/components/steker_switch_on.png" : "/components/steker_switch_off.png"}
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );
      }

      case 'dfplayer-mini':
        return (
          <image
            href="/components/dfplayer_mini.png"
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        );

      default: {
        const customImg = (def as any)?.imageUrl || component.customProps?.customImage;
        const imgOffsetX = def.imageOffset?.x || 0;
        const imgOffsetY = def.imageOffset?.y || 0;
        if (customImg) {
          return (
            <image
              href={customImg}
              x={imgOffsetX}
              y={imgOffsetY}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
          );
        }
        return (
          <g>
            <rect x="0" y="0" width={width} height={height} rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text
              x={width / 2}
              y={height / 2}
              fill="#94a3b8"
              fontSize={11}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {def.name}
            </text>
          </g>
        );
      }
    }
  };

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
        {/* Selected outline / ring */}
        {isSelected && (
          <rect
            x="-6"
            y="-6"
            width={width + 12}
            height={height + 12}
            rx="10"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
        )}

        {/* Component Graphics (Photorealistic PNG / Clean SVG) */}
        {renderVisual()}

        {/* Pins Layer Overlay */}
        {def.pins.map((pin) => {
          const isStartPin = activeWireStartPinId === pin.id;
          const isTargetPin = activeWireTargetPinId === pin.id;
          const isEsp =
            component.type === 'esp32' ||
            component.type === 'esp32-38p-cp2102' ||
            component.type === 'esp32-c3-supermini';
          const isWemos = component.type === 'wemos-d1-mini';
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
          const isSdCard = component.type === 'sd-card-module';
          const isSoilMoisture = component.type === 'sensor-soil-moisture';
          const isTds = component.type === 'sensor-tds';
          const isPh = component.type === 'sensor-ph4502c';
          const isPt100 = component.type === 'sensor-pt100';
          const isRtdTx = component.type === 'transmitter-rtd-pt100';
          const isMax31865 = component.type === 'sensor-max31865';
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
          const isLevelConverter =
            component.type === 'level-converter-4ch-blue' ||
            component.type === 'level-converter-8ch-red' ||
            component.type === 'level-converter-4ch-red';
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
            : isPot || isUltrasonic || isDht || isDs18b20 || isRfid || isSdCard || isSoilMoisture || isTds || isPh || isOled || isBuzzer || isTm1637 || isServo || isRelay || isRelayBlack || isRelayRed || isRtc || isTft || isKeypad || isMax31865 || isLevelConverter || isAds1115 || isJsnSr04t || isSim800l || component.type === 'sensor-ldr-module' || component.type === 'sensor-ir-obstacle' || component.type === 'sensor-touch-ttp223' || component.type === 'sensor-vibration-sw420'
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
              <circle
                cx="0"
                cy="0"
                r={pin.id === 'ac_pass' ? 18 : isBreadboard ? 7.5 : isLed || isResistor || isPot || isUltrasonic || isDht || isOled || isBuzzer || isTm1637 || isServo || isRelay || isRelayBlack || isRtc ? 9 : 12}
                fill="#ffffff"
                opacity="0.001"
                style={{ pointerEvents: 'all' }}
              />

              {/* Special guide ring for CT center hole pass-through */}
              {pin.id === 'ac_pass' ? (
                <circle
                  cx="0"
                  cy="0"
                  r="14"
                  fill={isStartPin ? 'rgba(56, 189, 248, 0.2)' : isTargetPin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 6, 23, 0.2)'}
                  stroke={isStartPin ? '#38bdf8' : isTargetPin ? '#34d399' : 'rgba(56, 189, 248, 0.45)'}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="transition-all hover:stroke-sky-400 hover:stroke-2"
                />
              ) : (
                <circle
                  cx="0"
                  cy="0"
                  r={pinRadius}
                  fill={
                    isStartPin
                      ? '#38bdf8'
                      : isTargetPin
                      ? '#10b981'
                      : isBreadboard
                      ? pin.type === 'power'
                        ? 'rgba(239, 68, 68, 0.4)'
                        : pin.type === 'ground'
                        ? 'rgba(56, 189, 248, 0.4)'
                        : 'rgba(30, 41, 59, 0.35)'
                      : isResistor
                      ? '#475569'
                      : isLed
                      ? 'rgba(148, 163, 184, 0.7)'
                      : pin.type === 'power'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : pin.type === 'ground'
                      ? 'rgba(56, 189, 248, 0.3)'
                      : pin.type === 'i2c'
                      ? 'rgba(192, 132, 252, 0.3)'
                      : pin.type === 'spi'
                      ? 'rgba(234, 179, 8, 0.3)'
                      : pin.type === 'uart'
                      ? 'rgba(6, 182, 212, 0.3)'
                      : pin.type === 'analog'
                      ? 'rgba(34, 197, 94, 0.3)'
                      : pin.type === 'pwm'
                      ? 'rgba(249, 115, 22, 0.3)'
                      : isPot || isUltrasonic || isDht || isOled || isBuzzer || isTm1637 || isServo || isRelay || isRelayBlack || isRtc
                      ? 'rgba(100, 116, 139, 0.5)'
                      : isLcd
                      ? 'rgba(15, 23, 42, 0.65)'
                      : 'rgba(30, 41, 59, 0.6)'
                  }
                  stroke={
                    isStartPin
                      ? '#38bdf8'
                      : isTargetPin
                      ? '#34d399'
                      : isBreadboard
                      ? pin.type === 'power'
                        ? '#ef4444'
                        : pin.type === 'ground'
                        ? '#38bdf8'
                        : 'rgba(148, 163, 184, 0.4)'
                      : isResistor
                      ? '#1e293b'
                      : isLed
                      ? '#cbd5e1'
                      : pin.type === 'power'
                      ? '#ef4444'
                      : pin.type === 'ground'
                      ? '#38bdf8'
                      : pin.type === 'i2c'
                      ? '#c084fc'
                      : pin.type === 'spi'
                      ? '#eab308'
                      : pin.type === 'uart'
                      ? '#06b6d4'
                      : pin.type === 'analog'
                      ? '#22c55e'
                      : pin.type === 'pwm'
                      ? '#f97316'
                      : isPot || isUltrasonic || isDht || isOled || isBuzzer || isTm1637 || isServo || isRelay || isRelayBlack || isRtc
                      ? '#64748b'
                      : isLcd
                      ? '#334155'
                      : '#475569'
                  }
                  strokeWidth={
                    isStartPin || isTargetPin ? 2 : isBreadboard ? 1 : 1.5
                  }
                  className="transition-all group-hover/pin:scale-125 group-hover/pin:stroke-white group-hover/pin:stroke-2"
                />
              )}

              {/* Glowing pin indicator when starting wire from this pin */}
              {isStartPin && (
                <circle
                  cx="0"
                  cy="0"
                  r="10"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  className="animate-ping"
                />
              )}

              {/* Glowing target snap indicator when cursor hovers or nears this pin */}
              {isTargetPin && (
                <circle
                  cx="0"
                  cy="0"
                  r="7.5"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              )}
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
