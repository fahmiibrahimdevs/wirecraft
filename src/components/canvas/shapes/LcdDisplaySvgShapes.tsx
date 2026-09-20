import React from 'react';

interface Lcd1602ShapeProps {
  isI2C: boolean;
  width: number;
  height: number;
  textRow1?: string;
  textRow2?: string;
}

export const Lcd1602SvgShape: React.FC<Lcd1602ShapeProps> = ({
  isI2C,
  width,
  height,
  textRow1 = '',
  textRow2 = '',
}) => {
  const imageSrc = isI2C ? '/components/lcd_1602_i2c.png' : '/components/lcd_1602_parallel.png';

  return (
    <g>
      <image href={imageSrc} x="0" y="0" width={width} height={height} preserveAspectRatio="none" />

      {(textRow1 || textRow2) && (
        <g transform="translate(68, 82)">
          {textRow1 && <text x="0" y="30" fill="#162506" fontSize="22" fontFamily="monospace" fontWeight="700" letterSpacing="3.2px" style={{ userSelect: 'none' }}>{textRow1.slice(0, 16).padEnd(16, ' ')}</text>}
          {textRow2 && <text x="0" y="58" fill="#162506" fontSize="22" fontFamily="monospace" fontWeight="700" letterSpacing="3.2px" style={{ userSelect: 'none' }}>{textRow2.slice(0, 16).padEnd(16, ' ')}</text>}
        </g>
      )}
    </g>
  );
};

interface Lcd2004ShapeProps {
  isI2C: boolean;
  width: number;
  height: number;
  textRow1?: string;
  textRow2?: string;
  textRow3?: string;
  textRow4?: string;
}

export const Lcd2004SvgShape: React.FC<Lcd2004ShapeProps> = ({
  isI2C,
  width,
  height,
  textRow1 = '',
  textRow2 = '',
  textRow3 = '',
  textRow4 = '',
}) => {
  const imageSrc = isI2C ? '/components/lcd_2004_i2c.png' : '/components/lcd_2004_parallel.png';
  const hasText = textRow1 || textRow2 || textRow3 || textRow4;

  return (
    <g>
      <image href={imageSrc} x="0" y="0" width={width} height={height} preserveAspectRatio="none" />

      {hasText && (
        <g transform="translate(70, 80)">
          {textRow1 && <text x="0" y="28" fill="#162506" fontSize="20" fontFamily="monospace" fontWeight="700" letterSpacing="2.8px" style={{ userSelect: 'none' }}>{textRow1.slice(0, 20).padEnd(20, ' ')}</text>}
          {textRow2 && <text x="0" y="56" fill="#162506" fontSize="20" fontFamily="monospace" fontWeight="700" letterSpacing="2.8px" style={{ userSelect: 'none' }}>{textRow2.slice(0, 20).padEnd(20, ' ')}</text>}
          {textRow3 && <text x="0" y="84" fill="#162506" fontSize="20" fontFamily="monospace" fontWeight="700" letterSpacing="2.8px" style={{ userSelect: 'none' }}>{textRow3.slice(0, 20).padEnd(20, ' ')}</text>}
          {textRow4 && <text x="0" y="112" fill="#162506" fontSize="20" fontFamily="monospace" fontWeight="700" letterSpacing="2.8px" style={{ userSelect: 'none' }}>{textRow4.slice(0, 20).padEnd(20, ' ')}</text>}
        </g>
      )}
    </g>
  );
};
