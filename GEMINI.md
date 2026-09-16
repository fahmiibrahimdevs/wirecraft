# Circuit Electronics Simulator (WireCraft) - Project Context & Guidelines

## 1. Project Overview & Architecture
- **Framework**: React 18 + Vite + TypeScript.
- **Styling**: Tailwind CSS (Dark theme Slate-950 canvas, Matte zero-neon, Sky-400 single-accent based on `thumbnail-maker` design system).
- **Core Canvas**: Custom SVG Renderer (`ComponentSvg.tsx`, `WireSvg.tsx`, `BreadboardSvg.tsx`) dengan dukungan zoom, pan, grid snapping, rotasi komponen, dan routing kabel jumper orthogonal.
- **Port Dev Server**: 5180 (`bun run dev` / `npm run dev`).
- **Build Tool**: `bun run build` / `npm run build` (`tsc -b && vite build`).

---

## 2. Key File Map & Pipeline
1. `public/components/`: Direktori aset visual gambar PNG/SVG dengan latar transparan bersih (*100% alpha transparency*, tanpa bayangan meja, lubang mounting transparan).
2. `src/types/circuit.ts`: Definisi tipe data sirkuit, union `ComponentType`, `Pin`, `Wire`, dsb.
3. `src/constants/components.ts`: Master definisi seluruh komponen simulator (`COMPONENT_DEFINITIONS`): ukuran `width/height`, kategori, ikon, dan daftar koordinat pin `(x, y)`.
4. `src/components/canvas/ComponentSvg.tsx`: Renderer visual komponen di canvas SVG (gambar photorealistic PNG/SVG transparan dan titik koneksi pin + hitbox).
5. `src/components/panels/ComponentLibrary.tsx`: Library daftar komponen dengan pencarian dan filter kategori (`ICON_MAP`).
6. `src/components/panels/PropertiesInspector.tsx`: Inspector panel sebelah kanan untuk inspeksi & interaktivitas komponen terpilih (rotasi, label, resistor ohm, toggle saklar/lampu, LCD text, dsb).

---

## 3. Alur Kerja Wajib (Golden Workflow Penambahan Komponen)
1. **Asset Preparation**:
   - 100% Alpha Transparency di luar bodi komponen, kabel, dan terminal.
   - Bersihkan seluruh bayangan jatuh (*drop shadow*) dan artefak background.
   - Lubang baut mounting, celah tengah, dan lubang paking tembus transparan.
2. **Sub-Pixel Pin Alignment**:
   - Untuk **Screw Terminals / Baut**: Gunakan deteksi lingkaran *Hough Circles* / *centroid* agar titik pin tepat *dead center* di titik silang (+) kepala baut.
   - Untuk **Pin Header (Male/Female)**: Jarak antar pin (*pitch*) wajib mengikuti standar grid breadboard (17.0 px).
   - Untuk **Terminal Spade / Fork**: Titik pin ditempatkan tepat di pusat lengkungan lubang kontak U fork.
3. **Visual Preview & Konfirmasi User**:
   - Buat gambar preview verifikasi visual dengan lingkaran penanda pin dan crosshair.
   - Tampilkan tabel detail pinout (Pin ID, Label, Tipe Pin, Koordinat X/Y, Deskripsi).
   - **WAJIB**: Konfirmasi rencana ke pengguna sebelum melakukan perubahan kode.
4. **Eksekusi 3 File Pipeline**:
   - Salin aset ke `public/components/<name>.png`.
   - Update `src/types/circuit.ts`.
   - Update `src/constants/components.ts`.
   - Update `src/components/canvas/ComponentSvg.tsx` (image rendering case & `pinRadius`).
5. **Verifikasi Build**:
   - Jalankan `npm run build` dan pastikan zero error.

---

## 4. Design & Communication Rules
- **Bahasa**: Bahasa Indonesia untuk komunikasi dan penjelasan; istilah teknis tetap bahasa Inggris.
- **Visual**: Wajib latar transparan bersih tanpa kotak putih di luar bodi komponen.
- **Pin Precision**: Wajib diverifikasi presisi terhadap alur sekrup dan simetris terhadap sumbu tengah komponen sebelum dirilis.
- **Verification**: Setiap perubahan wajib divalidasi dengan `npm run build`.
