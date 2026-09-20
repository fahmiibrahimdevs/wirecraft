import React from 'react';
import { CircuitComponent, ComponentDefinition } from '../../../types/circuit';
import { ResistorSvgShape } from './ResistorSvgShape';
import { PushButton6mmShape, PushButton12mmShape } from './ButtonSvgShapes';
import { PotentiometerSvgShape } from './PotentiometerSvgShape';
import { Lcd1602SvgShape, Lcd2004SvgShape } from './LcdDisplaySvgShapes';

interface ComponentVisualRendererProps {
  component: CircuitComponent;
  def: ComponentDefinition;
}

export const ComponentVisualRenderer: React.FC<ComponentVisualRendererProps> = ({
  component,
  def,
}) => {
  const { width, height } = def;

  // 1. If this definition is a custom component or has a custom/overridden image, ALWAYS prioritize it!
  const customImg = (def as any)?.imageUrl || component.customProps?.customImage;
  if (
    def.isCustom ||
    (customImg &&
      customImg !== `/components/${component.type}.png` &&
      !customImg.includes('arduino_nano.png'))
  ) {
    if (customImg) {
      const imgOffsetX = def.imageOffset?.x || 0;
      const imgOffsetY = def.imageOffset?.y || 0;
      const imgWidth = (def as any).imageWidth || width;
      const imgHeight = (def as any).imageHeight || height;
      return (
        <image
          href={customImg}
          x={imgOffsetX}
          y={imgOffsetY}
          width={imgWidth}
          height={imgHeight}
          preserveAspectRatio="none"
        />
      );
    }
  }

  // 2. Specific hardware graphics
  switch (component.type) {
    case 'arduino-uno':
      return (
        <image
          href="/components/arduino_uno.svg"
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

    case 'resistor':
      return (
        <ResistorSvgShape
          resistance={component.customProps.resistance}
          width={width}
          height={height}
        />
      );

    case 'led': {
      const color = (component.customProps.ledColor || 'red').toLowerCase();
      const isOn = component.customProps.isLedOn;

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
      const domeCx = width / 2;
      const domeCy = 11;

      return (
        <g>
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
          <image
            href={imageSrc}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        </g>
      );
    }

    case 'push-button':
    case 'push-button-6mm':
      return (
        <PushButton6mmShape
          buttonColor={component.customProps?.buttonColor}
          isPressed={Boolean(component.customProps?.buttonPressed)}
        />
      );

    case 'push-button-12mm':
      return (
        <PushButton12mmShape
          buttonColor={component.customProps?.buttonColor}
          isPressed={Boolean(component.customProps?.buttonPressed)}
        />
      );

    case 'potentiometer':
      return (
        <PotentiometerSvgShape
          potValue={component.customProps?.potValue}
          width={width}
          height={height}
        />
      );

    case 'display-lcd1602':
    case 'display-lcd1602-i2c':
      return (
        <Lcd1602SvgShape
          isI2C={component.type === 'display-lcd1602-i2c'}
          width={width}
          height={height}
          textRow1={component.customProps?.lcdTextRow1}
          textRow2={component.customProps?.lcdTextRow2}
        />
      );

    case 'display-lcd2004':
    case 'display-lcd2004-i2c':
      return (
        <Lcd2004SvgShape
          isI2C={component.type === 'display-lcd2004-i2c'}
          width={width}
          height={height}
          textRow1={component.customProps?.lcdTextRow1}
          textRow2={component.customProps?.lcdTextRow2}
          textRow3={component.customProps?.lcdTextRow3}
          textRow4={component.customProps?.lcdTextRow4}
        />
      );

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

    case 'battery-9v':
      return (
        <g>
          <rect x="10" y="20" width="60" height="100" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <rect x="10" y="20" width="60" height="30" fill="#0284c7" />
          <text x="40" y="40" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">
            9V
          </text>
          <text x="40" y="75" fill="#94a3b8" fontSize="8" textAnchor="middle">
            HEAVY DUTY
          </text>
          <circle cx="28" cy="12" r="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
          <text x="28" y="25" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">
            +
          </text>
          <circle cx="52" cy="12" r="5" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
          <text x="52" y="25" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
            -
          </text>
        </g>
      );

    case 'fitting-lamp': {
      const isOff = component.customProps?.isLedOn === false;
      return (
        <image
          href={isOff ? '/components/fitting_lamp_off.png' : '/components/fitting_lamp_on.png'}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="none"
        />
      );
    }

    case 'steker-switch': {
      const isSwitchedOn = component.customProps?.isSwitchedOn !== false;
      return (
        <image
          href={isSwitchedOn ? '/components/steker_switch_on.png' : '/components/steker_switch_off.png'}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="none"
        />
      );
    }

    default: {
      const fallbackImg = (def as any)?.imageUrl || component.customProps?.customImage;
      const imgOffsetX = def.imageOffset?.x || 0;
      const imgOffsetY = def.imageOffset?.y || 0;
      const imgWidth = (def as any).imageWidth || width;
      const imgHeight = (def as any).imageHeight || height;
      if (fallbackImg) {
        return (
          <image
            href={fallbackImg}
            x={imgOffsetX}
            y={imgOffsetY}
            width={imgWidth}
            height={imgHeight}
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
