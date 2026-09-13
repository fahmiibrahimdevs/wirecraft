import math

width = 272.0
height = 422.0

svg = []
svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">')
svg.append('''<defs>
  <linearGradient id="pcbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#0083a8" />
    <stop offset="100%" stop-color="#006b8a" />
  </linearGradient>
  <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#64748b" />
    <stop offset="25%" stop-color="#cbd5e1" />
    <stop offset="50%" stop-color="#ffffff" />
    <stop offset="75%" stop-color="#94a3b8" />
    <stop offset="100%" stop-color="#475569" />
  </linearGradient>
  <linearGradient id="pinMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#475569" />
    <stop offset="30%" stop-color="#94a3b8" />
    <stop offset="60%" stop-color="#e2e8f0" />
    <stop offset="100%" stop-color="#334155" />
  </linearGradient>
  <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#b45309" />
    <stop offset="35%" stop-color="#d97706" />
    <stop offset="70%" stop-color="#f59e0b" />
    <stop offset="100%" stop-color="#b45309" />
  </linearGradient>
  <linearGradient id="resGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#0f172a" />
    <stop offset="50%" stop-color="#334155" />
    <stop offset="100%" stop-color="#0f172a" />
  </linearGradient>
  <filter id="subtleDrop" x="-10%" y="-10%" width="120%" height="120%">
    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35" />
  </filter>
</defs>''')

# 1. Main PCB Board
pcb_h = 398.0
svg.append('<!-- PCB Board -->')
svg.append(f'<rect x="0" y="0" width="{width}" height="{pcb_h}" rx="14" fill="url(#pcbGrad)" stroke="#004d63" stroke-width="1.5" />')

# 2. Four Mounting Holes (positioned authentically as in the reference)
# Top holes: (52, 60), (220, 60)
# Bottom holes: (26, 308), (246, 308)
holes = [(52, 60), (width - 52, 60), (26, 308), (width - 26, 308)]
for hx, hy in holes:
    svg.append(f'<circle cx="{hx}" cy="{hy}" r="14.5" fill="none" stroke="#22d3ee" stroke-width="1.2" stroke-opacity="0.6" />')
    svg.append(f'<circle cx="{hx}" cy="{hy}" r="11.5" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.8" />')

# 3. Antenna Trace Loops (Concentric rounded rectangles with bottom chamfer/trapezoid)
svg.append('<!-- Antenna Loop Traces -->')
# Concentric loops wrapping outer board down to y=250
# Loop 1 (outermost)
svg.append('<path d="M 12 246 L 12 24 A 12 12 0 0 1 24 12 L 248 12 A 12 12 0 0 1 260 24 L 260 246 A 12 12 0 0 1 248 258 L 202 258 L 180 238 L 92 238 L 70 258 L 24 258 A 12 12 0 0 1 12 246 Z" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-opacity="0.8" />')
# Loop 2
svg.append('<path d="M 17 243 L 17 27 A 10 10 0 0 1 27 17 L 245 17 A 10 10 0 0 1 255 27 L 255 243 A 10 10 0 0 1 245 253 L 200 253 L 178 233 L 94 233 L 72 253 L 27 253 A 10 10 0 0 1 17 243 Z" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-opacity="0.8" />')
# Loop 3
svg.append('<path d="M 22 240 L 22 30 A 8 8 0 0 1 30 22 L 242 22 A 8 8 0 0 1 250 30 L 250 240 A 8 8 0 0 1 242 248 L 198 248 L 176 228 L 96 228 L 74 248 L 30 248 A 8 8 0 0 1 22 240 Z" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-opacity="0.8" />')
# Loop 4 (innermost)
svg.append('<path d="M 27 237 L 27 33 A 6 6 0 0 1 33 27 L 239 27 A 6 6 0 0 1 245 33 L 245 237 A 6 6 0 0 1 239 243 L 196 243 L 174 223 L 98 223 L 76 243 L 33 243 A 6 6 0 0 1 27 237 Z" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-opacity="0.8" />')

# 4. Silkscreen Text: RFID-RC522 (Flipped/Upside-down centered between top holes at y=60)
svg.append('<!-- Silkscreen: RFID-RC522 -->')
svg.append('<g transform="translate(136, 60) rotate(180)">')
svg.append('<text x="0" y="4" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" fill="#f8fafc" text-anchor="middle" letter-spacing="1.2">RFID-RC522</text>')
svg.append('</g>')

# 5. RFID Wave Arcs (Radiating waves centered at (136, 134))
cx, cy = 136.0, 136.0
svg.append('<!-- RFID Radiating Waves -->')
# Center dot and circle
svg.append(f'<circle cx="{cx}" cy="{cy}" r="3.5" fill="#ffffff" />')
svg.append(f'<circle cx="{cx}" cy="{cy}" r="9.0" fill="none" stroke="#ffffff" stroke-width="2.2" />')

# Left and Right Wave Arcs (4 arcs each side)
arc_radii = [22, 36, 50, 64]
for rad in arc_radii:
    ang_rad = math.radians(52)
    x1 = cx - rad * math.cos(ang_rad)
    y1 = cy - rad * math.sin(ang_rad)
    x2 = cx - rad * math.cos(ang_rad)
    y2 = cy + rad * math.sin(ang_rad)
    svg.append(f'<path d="M {x1:.2f} {y1:.2f} A {rad} {rad} 0 0 0 {x2:.2f} {y2:.2f}" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" />')

    x1_r = cx + rad * math.cos(ang_rad)
    y1_r = cy - rad * math.sin(ang_rad)
    x2_r = cx + rad * math.cos(ang_rad)
    y2_r = cy + rad * math.sin(ang_rad)
    svg.append(f'<path d="M {x1_r:.2f} {y1_r:.2f} A {rad} {rad} 0 0 1 {x2_r:.2f} {y2_r:.2f}" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" />')

# 6. Row of 6 SMD Passives below antenna (around y=204)
svg.append('<!-- SMD Passives under antenna -->')
# Reference: [Cap(Gold), Cap(Gold), Ind(Silver), Ind(Silver), Cap(Gold), Ind(Silver)]
smd_types = ['cap', 'cap', 'ind', 'ind', 'cap', 'ind']
start_smd_x = 88.0
smd_spacing = 16.5
for i, stype in enumerate(smd_types):
    sx = start_smd_x + i * smd_spacing
    sy = 202.0
    sw = 11.5
    sh = 24.0
    # Pad background
    svg.append(f'<rect x="{sx-1}" y="{sy-1}" width="{sw+2}" height="{sh+2}" rx="1" fill="#0f172a" opacity="0.4" />')
    # Terminal end top
    svg.append(f'<rect x="{sx}" y="{sy}" width="{sw}" height="4.5" fill="#cbd5e1" stroke="#475569" stroke-width="0.5" />')
    # Terminal end bottom
    svg.append(f'<rect x="{sx}" y="{sy+sh-4.5}" width="{sw}" height="4.5" fill="#cbd5e1" stroke="#475569" stroke-width="0.5" />')
    # Core body
    if stype == 'cap':
        svg.append(f'<rect x="{sx}" y="{sy+4.5}" width="{sw}" height="{sh-9}" fill="url(#capGrad)" />')
    else:
        svg.append(f'<rect x="{sx}" y="{sy+4.5}" width="{sw}" height="{sh-9}" fill="url(#crystalGrad)" />')

# Connecting traces from SMD row to IC
svg.append('<line x1="94" y1="228" x2="124" y2="292" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.7" />')
svg.append('<line x1="178" y1="228" x2="148" y2="292" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.7" />')

# 7. Main IC: MFRC522 (QFN-32 centered at (136, 324))
ic_cx, ic_cy = 136.0, 324.0
ic_s = 48.0
ic_x = ic_cx - ic_s / 2
ic_y = ic_cy - ic_s / 2

svg.append('<!-- MFRC522 QFN-32 IC Chip -->')
pin_count = 8
pin_pitch = ic_s / (pin_count + 1)
# Top pins
for i in range(1, pin_count + 1):
    px = ic_x + i * pin_pitch
    svg.append(f'<line x1="{px}" y1="{ic_y - 4.5}" x2="{px}" y2="{ic_y}" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="square" />')
# Bottom pins
for i in range(1, pin_count + 1):
    px = ic_x + i * pin_pitch
    svg.append(f'<line x1="{px}" y1="{ic_y + ic_s}" x2="{px}" y2="{ic_y + ic_s + 4.5}" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="square" />')
# Left pins
for i in range(1, pin_count + 1):
    py = ic_y + i * pin_pitch
    svg.append(f'<line x1="{ic_x - 4.5}" y1="{py}" x2="{ic_x}" y2="{py}" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="square" />')
# Right pins (FIXED: y2="{py}")
for i in range(1, pin_count + 1):
    py = ic_y + i * pin_pitch
    svg.append(f'<line x1="{ic_x + ic_s}" y1="{py}" x2="{ic_x + ic_s + 4.5}" y2="{py}" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="square" />')

# IC Body
svg.append(f'<rect x="{ic_x}" y="{ic_y}" width="{ic_s}" height="{ic_s}" rx="3" fill="#0f172a" stroke="#334155" stroke-width="1" />')
# Pin 1 Dot
svg.append(f'<circle cx="{ic_x + 6}" cy="{ic_y + 6}" r="1.8" fill="#cbd5e1" />')
# IC Silkscreen Text
svg.append(f'<text x="{ic_cx}" y="{ic_cy + 3}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8.5" fill="#f8fafc" text-anchor="middle" letter-spacing="0.5">MFRC522</text>')

# 8. Crystal Oscillator (Bottom Left at (28, 350))
cry_x = 16.0
cry_y = 330.0
cry_w = 22.0
cry_h = 56.0
svg.append('<!-- Crystal Oscillator (27.120 MHz) -->')
svg.append(f'<rect x="{cry_x}" y="{cry_y}" width="{cry_w}" height="{cry_h}" rx="11" fill="url(#crystalGrad)" stroke="#475569" stroke-width="1.2" />')
svg.append(f'<g transform="translate({cry_x + cry_w/2}, {cry_y + cry_h/2}) rotate(-90)">')
svg.append('<text x="0" y="3" font-family="system-ui, sans-serif" font-weight="700" font-size="8.5" fill="#334155" text-anchor="middle" letter-spacing="0.5">27.120</text>')
svg.append('</g>')

# 9. Small Passives around IC
# Beside crystal (two small 0603)
svg.append(f'<rect x="48" y="340" width="8" height="13" rx="1" fill="url(#resGrad)" stroke="#64748b" stroke-width="0.6" />')
svg.append(f'<rect x="48" y="360" width="8" height="13" rx="1" fill="url(#resGrad)" stroke="#64748b" stroke-width="0.6" />')

# Left of IC (3 horizontal components)
svg.append(f'<rect x="74" y="310" width="22" height="12" rx="1" fill="url(#capGrad)" stroke="#92400e" stroke-width="0.6" />')
svg.append(f'<rect x="74" y="310" width="4" height="12" fill="#cbd5e1" />')
svg.append(f'<rect x="92" y="310" width="4" height="12" fill="#cbd5e1" />')

svg.append(f'<rect x="74" y="328" width="22" height="12" rx="1" fill="url(#resGrad)" stroke="#475569" stroke-width="0.6" />')
svg.append(f'<rect x="74" y="328" width="4" height="12" fill="#cbd5e1" />')
svg.append(f'<rect x="92" y="328" width="4" height="12" fill="#cbd5e1" />')

svg.append(f'<rect x="74" y="346" width="22" height="12" rx="1" fill="url(#capGrad)" stroke="#92400e" stroke-width="0.6" />')
svg.append(f'<rect x="74" y="346" width="4" height="12" fill="#cbd5e1" />')
svg.append(f'<rect x="92" y="346" width="4" height="12" fill="#cbd5e1" />')

# Right of IC (4 horizontal capacitors)
for idx, py in enumerate([310, 328, 346, 364]):
    svg.append(f'<rect x="172" y="{py}" width="24" height="12" rx="1" fill="url(#capGrad)" stroke="#92400e" stroke-width="0.6" />')
    svg.append(f'<rect x="172" y="{py}" width="4" height="12" fill="#cbd5e1" />')
    svg.append(f'<rect x="192" y="{py}" width="4" height="12" fill="#cbd5e1" />')

# Far right of IC (4 vertical resistors)
for idx, py in enumerate([310, 329, 348, 367]):
    svg.append(f'<rect x="222" y="{py}" width="12" height="15" rx="1" fill="url(#resGrad)" stroke="#475569" stroke-width="0.6" />')
    svg.append(f'<rect x="222" y="{py}" width="12" height="3" fill="#cbd5e1" />')
    svg.append(f'<rect x="222" y="{py+12}" width="12" height="3" fill="#cbd5e1" />')

# 10. Bottom Header Sockets & 8 Metallic Pins
svg.append('<!-- 8-Pin Header Socket & Pins -->')
hbar_x = 66.0
hbar_w = 140.0
hbar_y = 380.0
hbar_h = 16.0
svg.append(f'<rect x="{hbar_x}" y="{hbar_y}" width="{hbar_w}" height="{hbar_h}" rx="3" fill="#0f172a" stroke="#334155" stroke-width="1.2" filter="url(#subtleDrop)" />')

# 8 Header pin pads on PCB and pins extending down
pin_start_x = 76.5
pin_pitch = 17.0
pin_len = 36.0 # from y=396 to y=432

for i in range(8):
    px = pin_start_x + i * pin_pitch
    # Red copper solder pad around entry
    svg.append(f'<rect x="{px - 4.5}" y="{hbar_y + 2}" width="9" height="12" rx="2" fill="#7f1d1d" stroke="#991b1b" stroke-width="0.8" />')
    # Plastic pin cavity
    svg.append(f'<rect x="{px - 2.8}" y="{hbar_y + 3.5}" width="5.6" height="9" rx="1" fill="#020617" />')
    # Metal pin lead
    svg.append(f'<rect x="{px - 2.2}" y="{hbar_y + 6}" width="4.4" height="{pin_len}" rx="1" fill="url(#pinMetalGrad)" stroke="#334155" stroke-width="0.8" />')

svg.append('</svg>')

with open('/home/fahmi/projects/circuit-electronics/public/components/rfid_rc522.svg', 'w') as f:
    f.write('\n'.join(svg))

print('Saved rfid_rc522.svg successfully')
