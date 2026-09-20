import React from 'react';
import { getResistor5BandColors } from '../../../utils/geometry';

interface ResistorSvgShapeProps {
  resistance?: number;
  width: number;
  height: number;
}

export const ResistorSvgShape: React.FC<ResistorSvgShapeProps> = ({
  resistance = 220,
  width,
  height,
}) => {
  const [band1, band2, band3, bandMult, bandTol] = getResistor5BandColors(resistance);

  return (
    <g>
      {/* Embedded scalable vector metal-film resistor with 5 dynamic color bands */}
      <svg viewBox="0 0 42.917 9.71" width={width} height={height} preserveAspectRatio="none" overflow="visible">
        {/* Thick Solid Metallic Leads (Pins) */}
        <line strokeLinecap="round" x1="1.192" y1="4.855" x2="41.725" y2="4.855" stroke="#1e293b" strokeWidth="3.4" />
        <line strokeLinecap="round" x1="1.192" y1="4.855" x2="41.725" y2="4.855" stroke="#64748b" strokeWidth="2.4" />
        {/* Terminal contact eyelets at lead tips */}
        <circle cx="1.192" cy="4.855" r="1.6" fill="#475569" stroke="#1e293b" strokeWidth="0.6" />
        <circle cx="41.725" cy="4.855" r="1.6" fill="#475569" stroke="#1e293b" strokeWidth="0.6" />

        {/* Precision Metal Film Resistor Body */}
        <path id="body" fill="#0284c7" stroke="#0369a1" strokeWidth="0.25" d="M14.233,0.688c-0.5-0.23-1.36-0.41-1.91-0.41h-2.76c-0.55,0-1,0.45-1,1v7.439c0,0.551,0.45,1,1,1 h2.76c0.55,0,1.41-0.189,1.91-0.41l0.1-0.049c0.5-0.23,1.36-0.41,1.91-0.41h9.98c0.551,0,1.409,0.189,1.909,0.41l0.101,0.049 c0.5,0.23,1.358,0.41,1.91,0.41h2.76c0.552,0,1-0.449,1-1V1.278c0-0.55-0.448-1-1-1h-2.76c-0.552,0-1.41,0.19-1.91,0.41 l-0.101,0.05c-0.5,0.23-1.358,0.41-1.909,0.41h-9.98c-0.55,0-1.41-0.19-1.91-0.41L14.233,0.688z" />

        {/* Band 1 (1st Digit) */}
        <path id="band_1" fill={band1} d="M14.762,0.888c-0.16-0.05-0.31-0.1-0.43-0.16l-0.1-0.05c-0.5-0.229-1.36-0.41-1.91-0.41 h-0.12v9.439h0.12c0.55,0,1.41-0.189,1.91-0.41l0.1-0.049c0.12-0.062,0.27-0.111,0.43-0.16V0.888z" />

        {/* Band 2 (2nd Digit) */}
        <rect id="band_2" fill={band2} x="16.5" y="1.148" width="2.1" height="7.69" />

        {/* Band 3 (3rd Digit) */}
        <rect id="band_3" fill={band3} x="19.8" y="1.148" width="2.1" height="7.69" />

        {/* Band 4 (Multiplier) */}
        <rect id="band_multiplier" fill={bandMult} x="23.1" y="1.148" width="2.1" height="7.69" />

        {/* Band 5 (Tolerance - 1% Brown on Metal Film) */}
        <rect id="band_tolerance" fill={bandTol} x="30.582" y="0.269" width="1.3" height="9.438" />

        {/* 3D Cylindrical Shadow Overlay */}
        <path id="Shadow" opacity="0.30" fill="#000000" d="M32.932,5.68L32.932,5.68c0,0.527-0.181,0.971-0.41,0.971h-2.67 c-0.528,0-1.358-0.078-1.851-0.17L27.9,6.459c-0.479-0.09-1.318-0.17-1.852-0.17H16.4c-0.53,0-1.36,0.08-1.85,0.17l-0.1,0.021 c-0.48,0.091-1.31,0.17-1.85,0.17h-0.44h-1.39h-0.43c-0.53,0-0.97,0.408-0.97,0.896v0.343V8.11v0.24c0,0.5,0.44,0.896,0.97,0.896 h2.25c0.53,0,1.36-0.17,1.85-0.371l0.1-0.039c0.48-0.196,1.32-0.368,1.85-0.368h9.648c0.527,0,1.357,0.172,1.853,0.369l0.103,0.039 c0.479,0.201,1.312,0.371,1.852,0.371h3.09c0.529,0,0.971-0.41,0.971-0.896V7.6V6.249V3.688C33.522,3.838,32.932,4.258,32.932,5.68 z" />
        <rect id="ShadowExtra" x="30.582" y="4.838" opacity="0.38" fill="#000000" width="1.3" height="4.379" />

        {/* 3D Cylindrical Specular Highlights */}
        <path id="ReflexRight" opacity="0.35" fill="#FFFFFF" d="M27.432,1.508c0.319,0,0.682-0.14,0.92-0.24 c0.28-0.11,0.801-0.2,1.342-0.2h2.029c0.312,0,0.312,0.34,0.312,0.52c0,0.18-0.021,0.53-0.312,0.53h-4.25 c-0.149,0-0.32-0.16-0.32-0.311C27.162,1.688,27.262,1.508,27.432,1.508z" />
        <circle id="ReflexLeft" opacity="0.4" fill="#FFFFFF" cx="9.722" cy="1.578" r="0.6" />
        <rect id="Reflex_gold" x="30.582" y="0.588" opacity="0.35" fill="#FFFFFF" width="1.3" height="2.25" />
      </svg>
    </g>
  );
};
