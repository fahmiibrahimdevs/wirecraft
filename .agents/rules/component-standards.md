---
trigger: always_on
description: Standar integrasi, kalibrasi pin, pembersihan aset grafis, dan alur kerja pembuatan komponen di WireCraft.
---

# WireCraft Component Engineering & Calibration Guidelines

## 1. Alur Kerja Wajib (Golden Workflow)
Setiap kali pengguna meminta penambahan, penggantian, atau kalibrasi komponen baru:
1. **Ekstraksi & Pembersihan Aset Gambar**:
   - 100% Alpha Transparency di luar bodi komponen, kabel, dan terminal.
   - Bersihkan seluruh *drop shadow*, bayangan meja/background abu-abu/hitam, dan artefak potongan.
   - Lubang baut mounting, celah tengah, dan lubang paking wajib tembus transparan (alpha = 0).
2. **Pengukuran Koordinat & Deteksi Sub-Pixel**:
   - Untuk **Screw Terminals / Baut**: Gunakan deteksi lingkaran *Hough Circles* atau *centroid* agar titik pin berada 100% *dead center* di pusat silang (+) kepala baut dan cincin washer.
   - Untuk **Pin Header (Male/Female)**: Jarak antar pin (*pitch*) wajib mengikuti standar grid breadboard (17.0 px).
   - Untuk **Terminal Spade / Fork / O-ring**: Titik pin ditempatkan tepat di pusat lengkungan lubang kontak U fork.
3. **Presentasi Rencana & Visual Overlay**:
   - Buat gambar preview verifikasi visual dengan lingkaran dan crosshair penanda pin.
   - Tampilkan tabel detail pinout (Pin ID, Label, Tipe Pin, Koordinat X/Y, Deskripsi).
   - **WAJIB**: Minta konfirmasi/persetujuan pengguna terlebih dahulu sebelum mengedit kode aplikasi.
4. **Eksekusi 3 File Pipeline**:
   - `public/components/<name>.png`: Salin aset final.
   - `src/types/circuit.ts`: Tambahkan nama komponen ke union `ComponentType`.
   - `src/constants/components.ts`: Tambahkan master definisi `COMPONENT_DEFINITIONS` (dimensi, pin, kategori, ikon, deskripsi).
   - `src/components/canvas/ComponentSvg.tsx`: Tambahkan case rendering `<image>` dan konfigurasi `pinRadius`.
5. **Verifikasi Build**:
   - Jalankan `npm run build` / `bun run build` untuk memastikan tidak ada error TypeScript.

---

## 2. Standar Tipe Pin (`PinType`)
- `power`: Pin masukan daya positif (VCC, 5V, 3.3V, 24V, V+, AC Fasa L).
- `ground`: Pin ground / referensi nol (GND, G, 0V, AC Netral N, Arde PE).
- `analog`: Pin sinyal analog (A0, TDS Analog, pH Po, Sensor Suhu To).
- `digital`: Pin logika digital / GPIO / interrupt / alarm trigger (DO, D0-D13, Alert).
- `passive`: Terminal pasif tanpa polaritas aktif tunggal (Terminal RTD, Bohlam, Switch, Spade Fork, BNC, Resistor, Probe Sensing Tip).
- `i2c`, `spi`, `uart`: Pin protokol komunikasi data.

---

## 3. Komponen Khusus & Referensi Ukuran
- **Sensor Suhu RTD PT100 (`sensor-pt100`)**: `240.0 × 196.5 px`, radius pin `4.5`, 4 pin (`RED 1`, `RED 2`, `BLUE`, `PROBE`).
- **RTD Temperature Transmitter (`transmitter-rtd-pt100`)**: `260.0 × 250.0 px`, radius pin `5.5`, 5 screw terminals (`-`, `+`, `1`, `2`, `3`). (Catatan: Potensiometer Zero & Span tidak memiliki pin).
- **pH Sensor Module pH-4502C (`sensor-ph4502c`)**: `450.0 × 209.0 px`, 7 pin (6-pin header pitch 17.0px di sisi kanan + 1 soket BNC di sisi kiri).
- **TDS Sensor Module (`sensor-tds`)**: `200.0 × 140.0 px`, 5 pin (3-pin header + 2-pin XH2.54 probe socket).
- **Micro SD Card Module (`sd-card-module`)**: `230.0 × 115.0 px`, 6 pin SPI header pitch 17.0px.
- **DS18B20 Probe (`sensor-ds18b20`)**: `180.0 × 170.0 px`, 3 pin kawat (VCC merah, DATA kuning, GND hitam).
- **DS18B20 Module (`sensor-ds18b20-module`)**: `180.0 × 90.0 px`, 3-pin header pitch 17.0px + 3-pin screw terminal.
- **DHT11 Standalone (`sensor-dht11`)**: `80.0 × 180.0 px`, 4 pin kaki pitch 17.0px.
- **DHT11 Module (`sensor-dht11-module`)**: `220.0 × 110.0 px`, 3-pin header pitch 17.0px.
- **PZEM-004T AC Power Meter (`pzem-004t`)**: `280.0 × 124.4 px`, 8 pin (4-pin opto UART + 2-pin AC power + 2-pin CT sensor).
- **CT Coil Current Transformer (`sensor-ct-coil`)**: `190.0 × 200.0 px`, 3 pin (2 terminal wire + 1 lubang tembus `ac_pass`).
- **Fitting Lampu AC 220V (`fitting-lamp`)**: `170.0 × 157.5 px`.
- **Stopkontak AC Schuko (`ac-outlet`)**: `170.0 × 165.3 px`.
- **Steker Saklar Arde (`steker-switch`)**: `140.0 × 174.0 px`.
- **PSU SMPS 12V 5-Terminal (`psu-smps-12v`)**: `200.0 × 331.8 px`.
