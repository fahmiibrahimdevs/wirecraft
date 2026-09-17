export type ComponentType =
  | 'arduino-uno'
  | 'arduino-nano'
  | 'esp32-38p-cp2102'
  | 'esp32-c3-supermini'
  | 'wemos-d1-mini'
  | 'nodemcu-v1'
  | 'nodemcu-ch340'
  | 'ftdi-ft232rl'
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
  | 'speaker'
  | 'servo'
  | 'sensor-ultrasonic'
  | 'sensor-dht11'
  | 'sensor-dht11-module'
  | 'sensor-dht22'
  | 'sensor-dht22-module'
  | 'sensor-ds18b20'
  | 'sensor-ds18b20-module'
  | 'sensor-rfid-rc522'
  | 'sensor-ldr'
  | 'sensor-touch-ttp223'
  | 'sensor-pir'
  | 'sensor-soil-moisture'
  | 'display-lcd1602'
  | 'display-lcd1602-i2c'
  | 'display-lcd2004'
  | 'display-lcd2004-i2c'
  | 'display-oled'
  | 'display-tm1637'
  | 'display-tft-28'
  | 'display-tft-28-touch'
  | 'battery-9v'
  | 'fitting-lamp'
  | 'steker-switch'
  | (string & {});

export type PinType = 'power' | 'ground' | 'digital' | 'analog' | 'pwm' | 'i2c' | 'spi' | 'uart' | 'passive' | 'generic';

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
  locked?: boolean;
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
    customImage?: string;
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
  category: 'microcontrollers' | 'prototyping' | 'passives' | 'outputs' | 'sensors' | 'displays' | 'power' | 'custom' | string;
  description: string;
  width: number;
  height: number;
  pins: Pin[];
  defaultProps?: Record<string, any>;
  icon: string; // Lucide icon name or svg tag
  imageUrl?: string;
  imageOffset?: { x: number; y: number };
  imageWidth?: number;
  imageHeight?: number;
  isCustom?: boolean;
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

export interface CircuitFile {
  id: string;
  name: string;
  parentId: string | null;
  components: CircuitComponent[];
  wires: Wire[];
  wireRouting?: WireRouting;
  currentWireColor?: string;
  pan?: WirePoint;
  zoom?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CircuitFolder {
  id: string;
  name: string;
  parentId: string | null;
  isExpanded?: boolean;
  createdAt: number;
}

export interface CircuitFileSystem {
  activeFileId: string;
  files: CircuitFile[];
  folders: CircuitFolder[];
}

