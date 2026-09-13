export type ComponentType =
  | 'arduino-uno'
  | 'arduino-nano'
  | 'esp32'
  | 'raspberry-pico'
  | 'breadboard-half'
  | 'breadboard-mini'
  | 'breadboard-full'
  | 'resistor'
  | 'capacitor'
  | 'led'
  | 'rgb-led'
  | 'push-button'
  | 'push-button-6mm'
  | 'push-button-12mm'
  | 'potentiometer'
  | 'buzzer'
  | 'servo'
  | 'sensor-ultrasonic'
  | 'sensor-dht11'
  | 'sensor-dht22'
  | 'sensor-dht22-module'
  | 'sensor-rfid-rc522'
  | 'sensor-ldr'
  | 'sensor-pir'
  | 'sensor-soil-moisture'
  | 'display-lcd1602'
  | 'display-lcd1602-i2c'
  | 'display-lcd2004'
  | 'display-lcd2004-i2c'
  | 'display-oled'
  | 'display-tm1637'
  | 'relay'
  | 'relay-black'
  | 'relay-red'
  | 'rtc-ds3231'
  | 'display-tft-28'
  | 'display-tft-28-touch'
  | 'keypad-3x4'
  | 'keypad-4x4'
  | 'battery-9v'
  | 'buck-converter-lm2596s'
  | 'psu-smps-12v'
  | 'fitting-lamp'
  | 'ac-outlet'
  | 'steker-switch';

export type PinType = 'power' | 'ground' | 'digital' | 'analog' | 'pwm' | 'i2c' | 'passive' | 'generic';

export interface Pin {
  id: string;
  name: string;
  x: number; // relative to component width (unrotated)
  y: number; // relative to component height (unrotated)
  type: PinType;
  description?: string;
  internalNetId?: string; // For breadboard rail/column linking
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  name: string;
  label: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  customProps: {
    resistance?: number; // in Ohms for resistors
    ledColor?: 'red' | 'green' | 'blue' | 'yellow' | 'amber' | 'white';
    isLedOn?: boolean;
    potValue?: number; // 0 - 100%
    buttonPressed?: boolean;
    buttonColor?: 'green' | 'red' | 'blue' | 'yellow' | 'black';
    lcdTextRow1?: string;
    lcdTextRow2?: string;
    lcdTextRow3?: string;
    lcdTextRow4?: string;
    oledTitle?: string;
    capacitance?: string; // e.g. "10uF", "100nF"
    servoAngle?: number; // 0 - 180
    [key: string]: any;
  };
}

export interface WirePoint {
  x: number;
  y: number;
}

export type WireRouting = 'orthogonal' | 'bezier' | 'straight';

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  color: string;
  routing: WireRouting;
  waypoints?: WirePoint[];
}

export interface ComponentDefinition {
  type: ComponentType;
  name: string;
  category: 'microcontrollers' | 'prototyping' | 'passives' | 'outputs' | 'sensors' | 'displays' | 'power';
  description: string;
  width: number;
  height: number;
  pins: Pin[];
  defaultProps?: Record<string, any>;
  icon: string; // Lucide icon name or svg tag
}

export interface CircuitProject {
  version: string;
  id: string;
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
  arduinoCode?: string;
  createdAt: string;
  updatedAt: string;
}
