# ⚡ Wirecraft

> **Interactive Web-Based Circuit & IoT Electronics Simulator**  
> Build, wire, and simulate realistic electronic circuits, microcontrollers, and high-voltage AC electrical fixtures directly in your browser.

---

## ✨ Features Overview

### 🔌 Real-World AC 220V & Power Systems
Unlike traditional simulators that only handle low-voltage DC, Wirecraft brings photorealistic high-voltage AC fixtures:
- **AC Wall Outlet (Schuko Type-F)**: Complete with dual live/neutral sockets, brass earth clips, and side screw terminals.
- **Ceiling Lamp Holder (Fitting Lampu E27)**: Real-time interactive LED bulb illumination state (ON / OFF) with live/neutral screw terminals.
- **AC Plug with Rocker Switch (Steker Saklar Broco)**: Integrated switch toggle with glowing red neon indicator and 3-core cable terminations (L, PE, N).
- **Industrial SMPS 12V Power Supply**: 5-terminal metal chassis with perforated mesh, AC live/neutral, frame ground, and DC -V/+V outputs.
- **LM2596S DC-DC Buck Converter**: Step-down voltage regulator module with 4 precision screw pads.

### 🧠 Microcontrollers & Prototyping
- **ESP32 NodeMCU (30-Pin)**: Dual header layout, full GPIO matrix, power rails, and accurate pin spacing.
- **Arduino Uno R3**: Standard digital PWM, analog inputs, ICSP, and power bus pinout.
- **Modular Breadboards**: Full-size (830 tie-points), Half-size (400 tie-points), and Mini (170 tie-points) with visual pin snap-grid.

### 〰️ Smart Orthogonal Wire Routing
- Interactive click-to-connect pin-to-pin wiring.
- Intelligent **orthogonal pathfinding** router that keeps wire traces at clean 90-degree angles.
- Color-coded jumper wire palette (VCC Red, GND Black, Signal Cyan, Data Emerald, PWM Orange, Clock Yellow, SDA Purple, White, Blue).

### 🖥️ Displays & Human Machine Interfaces (HMI)
- **LCD 1602 & LCD 2004**: Available in standard parallel and I2C backpack configurations with real-time text inspector.
- **SSD1306 OLED 0.96"**: 128x64 I2C graphical display simulation.
- **TFT 2.8" ILI9341**: Full-color 320x240 SPI display with resistive touch screen variant.
- **TM1637 Display**: 4-digit 7-segment digital clock display.
- **Matrix Keypads**: 3x4 and 4x4 matrix membrane keypads.
- **Tactile Push Buttons & Potentiometer**: 6mm and 12mm tactile switches, plus rotary potentiometer with draggable percentage knob.

### 📡 Sensors & Actuators
- **HC-SR04**: Ultrasonic distance sensor.
- **DHT11 & DHT22**: Temperature and humidity sensors (standalone & module versions).
- **Soil Moisture Sensor**: Capacitive probe & comparator board.
- **RC522 RFID Reader**: 13.56MHz SPI module.
- **DS3231 RTC**: High-precision real-time clock with coin-cell battery.
- **1-Channel Relay Modules**: Blue, Black, and Red editions.
- **Active Buzzer & SG90 Micro Servo**.

### 🎨 Matte Dark Design System
- Built on a modern **Slate-950 (`#020617`)** matte aesthetic with zero distracting neon glows.
- Single unified **Sky/Cyan (`#38bdf8`)** accent token.
- Responsive drag-and-drop canvas with smooth pan, zoom, grid snapping, and component rotation (0°, 90°, 180°, 270°).

---

## 🛠️ Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Canvas Rendering**: Custom Scalable Vector Graphics (SVG) + Orthogonal Routing Engine

---

## 🚀 Quick Start

### Prerequisites
Ensure you have [Bun](https://bun.sh/) installed (v1.2+ recommended).

```bash
# Verify bun installation
bun --version
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/fahmiibrahimdevs/wirecraft.git

# 2. Navigate to project directory
cd wirecraft

# 3. Install dependencies
bun install
```

### Running Locally

```bash
# Start development server
bun run dev
```
Open [http://localhost:5180](http://localhost:5180) (or the port shown in terminal) in your browser.

### Building for Production

```bash
# Typecheck and build production bundle
bun run build
```
Production assets will be generated in the `dist/` directory.

---

## 📁 Project Structure

```
wirecraft/
├── public/
│   ├── components/         # Photorealistic transparent component graphics
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── canvas/         # SVG canvas, component renderer, and wire traces
│   │   ├── layout/         # Header, status bars, navigation
│   │   └── panels/         # Component Library drawer & Properties Inspector
│   ├── constants/
│   │   └── components.ts   # Component definitions, dimensions, and pin coordinates
│   ├── types/
│   │   └── circuit.ts      # TypeScript models for components, pins, and wires
│   ├── utils/
│   │   └── orthogonalRouter.ts # Smart wire routing algorithm
│   ├── App.tsx             # Main canvas application state
│   ├── index.css           # Tailwind CSS directives and custom styles
│   └── main.tsx            # React application entry point
├── GEMINI.md               # Agent guidelines and project context
├── package.json
└── vite.config.ts
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Developed with ❤️ by [fahmiibrahimdevs](https://github.com/fahmiibrahimdevs).
