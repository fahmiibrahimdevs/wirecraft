import { PinType } from '../../../types/circuit';

export const PIN_TYPES: { type: PinType; label: string; color: string }[] = [
  { type: 'power', label: 'Power / VCC', color: '#ef4444' },
  { type: 'ground', label: 'Ground / GND', color: '#1e293b' },
  { type: 'digital', label: 'Digital I/O', color: '#38bdf8' },
  { type: 'analog', label: 'Analog Input', color: '#10b981' },
  { type: 'pwm', label: 'PWM Output', color: '#f97316' },
  { type: 'i2c', label: 'I2C (SDA/SCL)', color: '#a855f7' },
  { type: 'spi', label: 'SPI Bus', color: '#eab308' },
  { type: 'uart', label: 'UART (RX/TX)', color: '#06b6d4' },
  { type: 'passive', label: 'Passive / Terminal', color: '#94a3b8' },
  { type: 'generic', label: 'Generic Pin', color: '#64748b' },
];

export const CATEGORIES = [
  { id: 'sensors', label: 'Sensor' },
  { id: 'microcontrollers', label: 'Mikrokontroler' },
  { id: 'power', label: 'Daya / Power' },
  { id: 'outputs', label: 'Output & Aktuator' },
  { id: 'displays', label: 'Layar / Display' },
  { id: 'passives', label: 'Pasif' },
  { id: 'prototyping', label: 'Breadboard / Prototyping' },
  { id: 'custom', label: 'Custom' },
];

// Physical to Pixel Conversion Helpers (Standard 2.54mm Breadboard Pitch = 17.0px)
export const MM_PER_PX = 2.54 / 17.0; // ~0.14941176 mm per px
export const PX_PER_MM = 17.0 / 2.54; // ~6.69291339 px per mm

export const pxToMm = (px: number, decimals = 1): number => {
  return Number((px * MM_PER_PX).toFixed(decimals));
};

export const mmToPx = (mm: number, decimals = 1): number => {
  return Number((mm * PX_PER_MM).toFixed(decimals));
};

export interface CalloutGeometry {
  dir: 'top' | 'bottom' | 'left' | 'right';
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  badgeX: number;
  badgeY: number;
  badgeW: number;
  badgeH: number;
}

export const getPinCalloutGeometry = (
  pin: { x: number; y: number; name: string },
  imageOffset: { x: number; y: number },
  compWidth: number,
  compHeight: number
): CalloutGeometry => {
  const centerX = imageOffset.x + compWidth / 2;
  const centerY = imageOffset.y + compHeight / 2;

  // Calculate distances to 4 bounding box edges of the component
  const dTop = Math.abs(pin.y - imageOffset.y);
  const dBottom = Math.abs(imageOffset.y + compHeight - pin.y);
  const dLeft = Math.abs(pin.x - imageOffset.x);
  const dRight = Math.abs(imageOffset.x + compWidth - pin.x);

  const minDist = Math.min(dTop, dBottom, dLeft, dRight);
  let dir: 'top' | 'bottom' | 'left' | 'right' = 'top';
  if (minDist === dBottom) dir = 'bottom';
  else if (minDist === dLeft) dir = 'left';
  else if (minDist === dRight) dir = 'right';
  else dir = 'top';

  const isRightHalf = pin.x >= centerX;
  const isBottomHalf = pin.y >= centerY;

  const charWidth = 6.8;
  const padX = 7;
  const badgeW = Math.max(30, Math.round(pin.name.length * charWidth + padX * 2 + 6));
  const badgeH = 15;

  let p0 = { x: 0, y: 0 };
  let p1 = { x: 0, y: 0 };
  let p2 = { x: 0, y: 0 };
  let badgeX = 0;
  let badgeY = 0;

  if (dir === 'top') {
    p0 = { x: 0, y: -5.5 };
    const sx = isRightHalf ? 1 : -1;
    p1 = { x: sx * 8, y: -16 };
    p2 = { x: sx * 16, y: -16 };
    badgeX = p2.x + (sx * badgeW) / 2;
    badgeY = -16;
  } else if (dir === 'bottom') {
    p0 = { x: 0, y: 5.5 };
    const sx = isRightHalf ? 1 : -1;
    p1 = { x: sx * 8, y: 16 };
    p2 = { x: sx * 16, y: 16 };
    badgeX = p2.x + (sx * badgeW) / 2;
    badgeY = 16;
  } else if (dir === 'left') {
    p0 = { x: -5.5, y: 0 };
    const sy = isBottomHalf ? 1 : -1;
    p1 = { x: -12, y: sy * 7 };
    p2 = { x: -18, y: sy * 7 };
    badgeX = p2.x - badgeW / 2;
    badgeY = p2.y;
  } else {
    p0 = { x: 5.5, y: 0 };
    const sy = isBottomHalf ? 1 : -1;
    p1 = { x: 12, y: sy * 7 };
    p2 = { x: 18, y: sy * 7 };
    badgeX = p2.x + badgeW / 2;
    badgeY = p2.y;
  }

  return {
    dir,
    p0,
    p1,
    p2,
    badgeX,
    badgeY,
    badgeW,
    badgeH,
  };
};
