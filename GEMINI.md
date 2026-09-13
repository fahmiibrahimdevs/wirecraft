# Circuit Electronics Simulator - Project Context & Guidelines

## 1. Project Overview & Architecture
- **Framework**: React 18 + Vite + TypeScript.
- **Styling**: Tailwind CSS (Dark theme Slate-950 canvas, Matte zero-neon, Sky-400 single-accent based on `thumbnail-maker` design system).
- **Core Canvas**: Custom SVG Renderer (`ComponentSvg.tsx`, `WireSvg.tsx`, `BreadboardSvg.tsx`) dengan dukungan zoom, pan, grid snapping, rotasi komponen, dan routing kabel jumper orthogonal.
- **Port Dev Server**: 5180 (`bun run dev`).
- **Build Tool**: `bun run build` (`tsc -b && vite build`).

## 2. Key File Map
- `src/types/circuit.ts`: Definisi tipe data sirkuit, union `ComponentType`, `Pin`, `Wire`, dsb.
- `src/constants/components.ts`: Master definisi seluruh komponen simulator (`COMPONENT_DEFINITIONS`): ukuran `width/height`, kategori, ikon, dan daftar koordinat pin `(x, y)`.
- `src/components/canvas/ComponentSvg.tsx`: Renderer visual komponen di canvas SVG (gambar photorealistic PNG/SVG transparan dan titik koneksi pin).
- `src/components/panels/ComponentLibrary.tsx`: Library daftar komponen dengan pencarian dan filter kategori (`ICON_MAP`).
- `src/components/panels/PropertiesInspector.tsx`: Inspector panel sebelah kanan untuk inspeksi & interaktivitas komponen terpilih (rotasi, label, resistor ohm, toggle saklar/lampu, LCD text, dsb).
- `public/components/`: Direktori aset visual gambar PNG/SVG berlatar belakang transparan bersih (alpha transparency).

## 3. High-Voltage AC & Power Components Standard
Proyek ini memiliki komponen kelistrikan AC 220V dan Power Supply dengan standar presisi tinggi (100% *dead center* pada alur sekrup dan lubang colokan):
1. **Fitting Lampu (`fitting-lamp`)**:
   - Dimensi: `170.0 × 157.5 px`.
   - Aset: `fitting_lamp_on.png` (bohlam menyala), `fitting_lamp_off.png` (bohlam mati).
   - Pin Simetris: `term_l` (Fasa L) di `(18.6, 77.7)`, `term_n` (Netral N) di `(151.4, 77.7)`. Sumbu tengah: $x = 85.0\text{ px}$.
2. **Stopkontak AC Schuko Type F (`ac-outlet`)**:
   - Dimensi: `170.0 × 165.3 px`.
   - Aset: `ac_outlet.png`.
   - Pin Presisi:
     - Colokan steker: `socket_l` (Fasa) di `(62.3, 79.3)`, `socket_n` (Netral) di `(107.2, 79.3)`.
     - Arde kuningan: `earth_top` di `(85.0, 38.5)`, `earth_bottom` di `(85.0, 119.2)`.
     - Sekrup samping simetris: `term_l` di `(16.4, 81.8)`, `term_n` di `(153.6, 81.8)`. Sumbu tengah: $x = 85.0\text{ px}$.
3. **Steker Saklar Arde Broco (`steker-switch`)**:
   - Dimensi: `140.0 × 174.0 px`.
   - Aset: `steker_switch_on.png` (indikator neon merah menyala), `steker_switch_off.png` (indikator padam).
   - Pin Kabel Bawah: `cable_l` (Fasa L) di `(66.0, 168.0)`, `cable_earth` (Arde PE) di `(78.0, 168.0)`, `cable_n` (Netral N) di `(90.0, 168.0)`.
4. **PSU SMPS 12V 5-Terminal (`psu-smps-12v`)**:
   - Dimensi: `200.0 × 331.8 px`. Aset: `psu_smps_12v.png`.
   - Pin Terminal: `ac_l` (46.1, 305.7), `ac_n` (74.8, 305.7), `earth` (101.9, 305.7), `v_minus` (129.3, 305.7), `v_plus` (155.8, 305.7).
5. **Buck Converter LM2596S (`buck-converter-lm2596s`)**:
   - Dimensi: `160.0 × 110.0 px`. Aset: `buck_lm2596s.png`.

## 4. Design & Development Rules
- **Bahasa**: Bahasa Indonesia untuk penjelasan; istilah teknis tetap bahasa Inggris.
- **Visual**: Wajib latar transparan bersih tanpa kotak putih di luar bodi komponen.
- **Pin Precision**: Wajib diverifikasi presisi terhadap alur sekrup dan simetris terhadap sumbu tengah komponen sebelum dirilis.
- **Verification**: Setiap perubahan wajib divalidasi dengan `bun run build`.
