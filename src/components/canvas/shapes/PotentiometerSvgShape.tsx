import React from 'react';

interface PotentiometerSvgShapeProps {
  potValue?: number;
  width: number;
  height: number;
}

export const PotentiometerSvgShape: React.FC<PotentiometerSvgShapeProps> = ({
  potValue = 50,
  width,
  height,
}) => {
  // Rentang rotasi rotary dial: -135° (0%) sampai +135° (100%)
  const angle = -135 + (potValue / 100) * 270;
  const knobCenterCanvasX = 70.28;
  const knobCenterCanvasY = 60.71;
  const knobSize = 74.8;

  return (
    <g>
      {/* Photorealistic Potentiometer Body Asset */}
      <image href="/components/potentiometer_body.png" x="0" y="0" width={width} height={height} preserveAspectRatio="none" />

      {/* Dynamic Rotating Knurled Dial Knob */}
      <g transform={`rotate(${angle}, ${knobCenterCanvasX}, ${knobCenterCanvasY})`} style={{ transformOrigin: `${knobCenterCanvasX}px ${knobCenterCanvasY}px` }}>
        <image href="/components/potentiometer_knob.png" x={knobCenterCanvasX - knobSize / 2} y={knobCenterCanvasY - knobSize / 2} width={knobSize} height={knobSize} preserveAspectRatio="none" />
      </g>
    </g>
  );
};
