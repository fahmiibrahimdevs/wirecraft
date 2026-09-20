# 📋 Wirecraft - Context & Handover Guide (New Session)

Dokumen ini merangkum seluruh status proyek, arsitektur sistem, dan riwayat perbaikan terkini untuk melanjutkan pekerjaan pada sesi chat baru tanpa kehilangan konteks.

---

## 📌 1. Project Overview & Environment

- **Repository**: `/home/midpc/Projects/wirecraft`
- **Active Branch**: `feature/component-studio`
- **Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React
- **Aplikasi**: **Wirecraft** — Visual Interactive Circuit Simulator & Schematic Editor (mirip Wokwi / Fritzing / Tinkercad Circuits / Excalidraw style).

---

## 🛠️ 2. Core Architecture & File Responsibilities

| File | Peran & Tanggung Jawab Utama |
|---|---|
| **[src/utils/orthogonalRouter.ts](file:///home/midpc/Projects/wirecraft/src/utils/orthogonalRouter.ts)** | Router ortogonal cerdas (sudut 90°), resolver titik temu kabel (*Pass 1-4*), deteksi jumper bus, filtering mutual junction points, perapian collinear waypoints (`cleanAndSimplifyWaypoints`). |
| **[src/components/canvas/CircuitCanvas.tsx](file:///home/midpc/Projects/wirecraft/src/components/canvas/CircuitCanvas.tsx)** | Kanvas interaktif: viewport zoom & pan, grid snap, rendering komponen & kabel, drag multi-komponen, auto-group breadboard, segment/junction drag handle. |
| **[src/components/canvas/WireSvg.tsx](file:///home/midpc/Projects/wirecraft/src/components/canvas/WireSvg.tsx)** | Rendering visual kabel SVG: jumping arc bridges (jembatan kabel melompat), solder dots junction, hitbox drag segmen, slider handle junction. |
| **[src/components/canvas/ComponentSvg.tsx](file:///home/midpc/Projects/wirecraft/src/components/canvas/ComponentSvg.tsx)** | Rendering visual fotorealistik komponen: Resistor (5-gelang), LED (kubah 3D), Arduino Nano/Uno, Breadboard, Tombol, IC, dll. |
| **[src/App.tsx](file:///home/midpc/Projects/wirecraft/src/App.tsx)** | State management sirkuit utama (`components`, `wires`), undo/redo history (`commit`), sinkronisasi atomik koordinat waypoints/tap kabel saat komponen berpindah posisi. |
| **[src/constants/components.ts](file:///home/midpc/Projects/wirecraft/src/constants/components.ts)** | Definisi dimensi, koordinat pin, pitch breadboard (17.0px), dan metadata bawaan komponen. |
| **[src/types/circuit.ts](file:///home/midpc/Projects/wirecraft/src/types/circuit.ts)** | Type definition: `CircuitComponent`, `Wire`, `Pin`, `WirePoint`, `WireRouting`. |

---

## ✨ 3. Riwayat Fitur & Perbaikan Terkini

1. **Anti Phantom / Stranded Solder Dot**:
   - `getEffectiveWaypoints` secara ketat mengunci titik ujung ke koordinat aktif `startPoint`/`endPoint`.
   - Final Pass `resolveAllWireEndpoints` memvalidasi bahwa solder dot **hanya** digambar jika ada 2 kabel atau lebih yang saling bersentuhan secara fisik di titik tersebut.
   - Menggeser kabel ke atas ($\uparrow$), bawah ($\downarrow$), kiri ($\leftarrow$), atau kanan ($\rightarrow$) tidak akan pernah meninggalkan residu titik di posisi lama ($Y_{\text{old}}$ atau $X_{\text{old}}$).
   - Menghapus kabel atau komponen otomatis membersihkan titik sambungan (*junction*) yang terhubung.
2. **Hierarki Lapisan & Depth Sorting ($Z$-Index)**:
   - **Layer 0**: Breadboard (dasar papan).
   - **Layer 1**: Board Mikrokontroler (Arduino Nano, Uno, ESP32).
   - **Layer 2**: Sensor, Display, Modul.
   - **Layer 3**: Komponen Bodi Besar / Kubah (LED, Buzzer, Button).
   - **Layer 4 (Di Atas LED)**: Komponen Pasif Kaki Tipis (Resistor, Kapasitor) sehingga pin logam dan bodi resistor tidak tertutup kubah LED saat berada di baris breadboard yang sama.
   - **$Y$-Depth Sorting**: Komponen yang posisinya berada di atas (nilai $Y$ lebih kecil) dirender di atas komponen di bawahnya.
3. **Auto-Grouping Breadboard (Excalidraw Frame Style)**:
   - Saat breadboard digeser, fungsi `isComponentOnBreadboard` mendeteksi seluruh komponen (Nano, LED, Resistor, dll.) yang terpasang di atasnya.
   - Breadboard, semua komponen mounted, seluruh kabel internal, waypoints, serta tap points bergerak serentak $(\Delta x, \Delta y)$ secara atomik tanpa merusak geometri rangkaian.
4. **Industrial Cable Marking Tube & Flexible Placement Control**:
   - **Breadboard Net Signal Propagation (`resolveCircuitNetSignals`)**: Menggunakan algoritma Union-Find disjoint-set untuk merambatkan sinyal fungsional komponen aktif (misal Arduino Nano `D4`, `D3`, `D2`, `GND`, `5V`, `SDA`) ke seluruh lubang breadboard, power rail, dan kabel yang terhubung dalam net yang sama.
   - **Smart Clean Default**: Secara cerdas hanya menampilkan penanda di pin aktif (Arduino, Sensor, Power Rail GND/5V). Kaki komponen pasif 2-kaki (resistor, kapasitor) dan kabel jumper pasif-ke-pasif otomatis bersih polos tanpa kotak yang mengotori breadboard.
   - **Full Manual & Position-Selective Control**: Pengguna bebas menentukan posisi penanda per-kabel: `[⚡ Auto]`, `[📍 Awal]`, `[📍 Akhir]`, `[⇄ Keduanya]`, `[• Tengah]`, atau `[🚫 Mati / Polos]`.
   - **Instant Auto-Delete on Empty Text**: Mengosongkan kotak teks label langsung menghapus / menyembunyikan marking tube tanpa perlu menekan tombol delete.
   - **Properties Inspector & Context Menu Integration**: Dilengkapi tombol posisi interaktif, saran chip cepat (`+D4`, `+5V`, `+GND`), tombol "Reset Otomatis", serta menu klik kanan kabel untuk penggantian posisi cepat.
   - **Dynamic Clearance Offset (Anti-Overlap)**: Posisi kotak marking tube dihitung secara dinamis ($\text{targetDist} = \text{marginGap} + \frac{\text{tubeWidth}}{2}$, $\text{marginGap} \ge 14\text{px}$ atau $18\text{px}$ jika ferrule) sehingga tepi kotak tidak akan pernah menutupi titik sambungan (*solder dot*) terminal sekecil atau sepanjang apa pun teks labelnya.
   - **Ferrule Crimp Boot**: Otomatis aktif khusus pada terminal bersekrup / AC industri (Fitting Lampu, Steker, Terminal Block) dan tidak muncul di breadboard/pin dupont.
5. **Smart Auto-Routing / Auto-Wiring Bus & Sub-System Engine (`autoBusRouter.ts`)**:
   - **Multi-Component Protocol Inspection**: Saat 2 komponen dipilih (misal Arduino Nano + OLED Display, ESP32 + RFID RC522, Arduino + Ultrasonic HC-SR04, Arduino + SG90 Servo, atau Arduino + Breadboard Power Rail), sistem secara otomatis mendeteksi bus dan protokol komunikasi yang cocok.
   - **Zero Hardcode / Universal Dynamic Semantic Engine (`findPin`, `findFreeGpioPin`, `getOccupiedPinIds`)**:
     - Membaca metadata token nama pin (`extractPinTokens`, misal `"D2 (SDA)"` $\rightarrow$ `D2` & `SDA`, `"IO21 (TX)"` $\rightarrow$ `IO21` & `TX`), tipe pin (`i2c`, `spi`, `uart`, `power`, `ground`), dan deskripsi secara dinamis.
     - Kompatibel dengan semua mikrokontroler: **Arduino Uno/Nano/Mega**, **ESP32 (30P/38P/C3)**, **Wemos D1 Mini**, **NodeMCU ESP8266 (V1/V3)**, **Raspberry Pi Pico**, dan **semua Custom MCU** yang dibuat di Component Studio.
   - **Dynamic Multi-Device SPI CS Allocation**:
     - Jalur data SPI (`MOSI`, `MISO`, `SCK`) otomatis di-share/paralel ke hardware SPI bus.
     - Jalur `CS` (dan `RST`) memeriksa graf kabel riil (`existingWires`). Jika pin default (`D10`/`G5`/`D8`) sudah terpakai oleh modul SPI ke-1, sistem **otomatis mengalokasikan pin digital bebas berikutnya** (`D9` $\rightarrow$ `D8` $\rightarrow$ `D4` dst.) tanpa tabrakan pin (*zero collision*).
   - **7 Sub-Sistem Protokol Lengkap**:
     1. **I2C Bus** (4 kabel: `5V`, `GND`, `SDA`, `SCL` multi-drop shared bus).
     2. **SPI Bus** (6-7 kabel: `3.3V`, `GND`, `MOSI`, `MISO`, `SCK`, dedicated `CS`, `RST`).
     3. **UART Serial** (4 kabel: `VCC`, `GND`, crossover $TX \rightleftarrows RX$ dengan auto fallback ke secondary UART jika primary occupied).
     4. **HC-SR04 Ultrasonic** (4 kabel: `5V`, `GND`, dynamic free `TRIG` & `ECHO`).
     5. **SG90 Micro Servo** (3 kabel: `5V`, `GND`, dynamic free `PWM`).
     6. **Power Rails** (2 kabel: `5V` & `GND` dari MCU ke breadboard power rails).
     7. **Parallel LCD 1602/2004** (9-11 kabel: `RS=12`, `E=11`, `D4-D7=5,4,3,2`, `VDD=5V`, `VSS=GND`, `RW=GND`, `BL+=5V`, `BL-=GND`).
   - **Standard Wire Colors & Marking Tubes**: Menggunakan standar warna kabel internasional lengkap dengan marking tube teks sinyal di pin asal host.
   - **1-Click Multi-Access Point**: Auto-wiring dapat diakses dari Floating pill banner kanvas, Panel Properties Inspector, dan Menu klik kanan (Context Menu).
   - **Atomic Undo/Redo (`handleAddMultipleWires`)**: Penambahan banyak kabel sekaligus dilakukan dalam 1 langkah commit riwayat (`Ctrl+Z`).

8. **Tabel Wiring & Pemetaan Pin Hardware Interconnect Engine (`wiringTableGenerator.ts`, `WiringTableModal.tsx`)**:
   - **Tabel Mapping Pin Lengkap Sesuai Format Google Sheets**:
     Kolom: `No` | `Komponen` | `Interface` | `Pin MCU` | `GPIO` | `PIN LV` | `Modul converter (BSS138)` | `PIN HV` | `Note`.
   - **Universal Board Pin $\to$ Physical Chip GPIO Engine (`getPhysicalGpio`)**:
     Menerjemahkan nama pin board ke nomor GPIO chip fisik secara dinamis untuk **NodeMCU & Wemos D1 Mini (ESP8266)** (`D1` $\to$ `GPIO5`, `D2` $\to$ `GPIO4`, `D4` $\to$ `GPIO2`, dll.), **ESP32 (30-Pin / 38-Pin / C3)** (`G21` $\to$ `GPIO21`, dll.), **Arduino Uno / Nano / Mega (ATmega328P/2560)** (`D13` $\to$ `PB5 (SCK)`, `A4` $\to$ `PC4 (SDA)`, dll.), **Raspberry Pi Pico (RP2040)** (`GP0` $\to$ `GPIO0`), serta Custom MCU.
   - **Multi-MCU Grouping & Tab Selector**:
     Mendukung sirkuit dengan 2 atau lebih mikrokontroler. Dilengkapi tab pemilih MCU (`[Semua MCU]`, `[NodeMCU ESP8266]`, `[Arduino Nano]`) dan section header `<thead>` terkelompok per MCU.
   - **Level Shifter / Logic Converter Detection**:
     Melacak jalur kabel yang melewati modul konverter tegangan bidireksional (misal BSS138 4-Ch / 8-Ch), otomatis mengisi `PIN LV` (`LV1`), `Modul converter` (`BSS138`), dan `PIN HV` (`HV1`).
   - **Pass-through Komponen Pasif (Resistor Seri)**:
     Melacak kabel yang melewati resistor pembatas arus (misal MCU `D4` $\to$ `Resistor 220Ω` $\to$ `LED`), memetakan baris tabel langsung ke komponen fungsional (`LED`), dan mencatat nilai resistor di kolom `Note` (`Resistor 220Ω seri`).
   - **Penghapusan Diagnosa Sirkuit**:
     Fitur lama "Diagnosa Sirkuit" (ERC) di panel samping telah dibersihkan dan digantikan dengan tombol pintas interaktif `[📋 Tabel Wiring Hardware]`.
   - **Multi-Export & Code Generator**:
     - **1-Click Download CSV** (format kompatibel langsung dibuka di Google Sheets / Excel).
     - **Copy Markdown Table** (format tabel untuk dokumentasi README / laporan).
     - **Auto-Generate Arduino C++ `#define` Pin Definition Code**.
   - **Interaktif**:
     - Kolom `Note` dapat diedit secara inline langsung di tabel.
     - Hover baris tabel menyorot (*highlight*) kabel dan komponen terkait di kanvas.
     - Pencarian / filter teks live pada tabel.

---

## 🚀 4. Prompt Pembuka untuk Sesi Baru

Salin teks di bawah ini ke pesan pertama di sesi chat baru:

```markdown
Halo Antigravity! Kita sedang melanjutkan pengembangan project Wirecraft di workspace `/home/midpc/Projects/wirecraft` (branch `feature/component-studio`). Silakan baca file `HANDOVER.md` untuk ringkasan arsitektur dan riwayat perbaikan terkini.

Status saat ini:
- Anti-phantom solder dot & router ortogonal sudah tuntas.
- Hierarki Z-Index & auto-grouping breadboard sudah aktif.
- Cable Marking Tube & Net Signal Propagation sudah aktif.
- Smart Auto-Routing / Auto-Wiring Bus (I2C, SPI, UART, Power, Ultrasonic, Servo, LCD) sudah aktif.
- Tabel Wiring & Pemetaan Pin Hardware (MCU pin to GPIO, Level Shifter BSS138, Resistor series note, Multi-MCU thead group, 1-Click CSV export & Markdown copy, dynamic net resolver) sudah aktif 100%.
- Active File ID persistence saat refresh browser sudah aktif (localStorage sync).
- Tipografi & Font Family Inter + JetBrains Mono terstandardisasi via Tailwind v4 @theme.
- Diagnosa Sirkuit lama sudah dihilangkan dan diganti dengan akses Tabel Wiring Hardware.
- Build TypeScript bersih (`npm run build` sukses 100%).

Selanjutnya, saya ingin: [tuliskan instruksi/fitur baru Anda di sini]
```
