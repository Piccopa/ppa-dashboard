/* =========================================================
   ICONS & ILUSTRASI
   Semua gambar dibuat dengan SVG (gambar berbasis kode),
   jadi tidak perlu file foto. Anda boleh menggantinya dengan
   foto sungguhan: lihat panduan bagian "Mengganti gambar".
   ========================================================= */

// Gradien bersama, dipasang sekali di halaman
const SVG_DEFS = `
<svg width="0" height="0" style="position:absolute">
  <defs>
    <linearGradient id="gMetal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f1f5f9"/><stop offset=".5" stop-color="#a7b4c2"/><stop offset="1" stop-color="#5b6b7c"/>
    </linearGradient>
    <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="gDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#475569"/><stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="gRed" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fca5a5"/><stop offset="1" stop-color="#b91c1c"/>
    </linearGradient>
    <radialGradient id="gGlow"><stop offset="0" stop-color="#fff7d6"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></radialGradient>
  </defs>
</svg>`;

// Gambar setiap peralatan (ukuran 100 x 70)
const ICONS = {
  hvac: `<svg viewBox="0 0 100 70"><rect x="8" y="14" width="84" height="44" rx="3" fill="url(#gMetal)"/>
    <circle cx="32" cy="36" r="15" fill="#1e293b"/><circle cx="68" cy="36" r="15" fill="#1e293b"/>
    <g stroke="#93c5fd" stroke-width="3"><path d="M32 22v28M18 36h28M22 26l20 20M42 26L22 46"/><path d="M68 22v28M54 36h28M58 26l20 20M78 26L58 46"/></g>
    <rect x="4" y="30" width="6" height="14" fill="#ef4444"/><rect x="90" y="30" width="6" height="14" fill="#3b82f6"/></svg>`,
  chiller: `<svg viewBox="0 0 100 70"><rect x="6" y="20" width="88" height="38" rx="3" fill="url(#gDark)"/>
    <ellipse cx="30" cy="20" rx="20" ry="8" fill="url(#gMetal)"/><ellipse cx="70" cy="20" rx="20" ry="8" fill="url(#gMetal)"/>
    <rect x="12" y="30" width="76" height="6" fill="#64748b"/><rect x="12" y="42" width="76" height="6" fill="#64748b"/>
    <circle cx="80" cy="52" r="4" fill="#22c55e"/></svg>`,
  ahu: `<svg viewBox="0 0 100 70"><rect x="4" y="16" width="92" height="42" rx="2" fill="url(#gMetal)"/>
    <g fill="#cbd5e1" stroke="#64748b"><rect x="10" y="22" width="22" height="30"/><rect x="39" y="22" width="22" height="30"/><rect x="68" y="22" width="22" height="30"/></g>
    <g stroke="#64748b"><path d="M10 28h22M10 34h22M10 40h22M10 46h22M68 28h22M68 34h22M68 40h22M68 46h22"/></g>
    <circle cx="50" cy="37" r="9" fill="#1e293b"/><path d="M50 30v14M43 37h14" stroke="#38bdf8" stroke-width="2"/></svg>`,
  pump: `<svg viewBox="0 0 100 70"><rect x="10" y="50" width="80" height="8" fill="#334155"/>
    <rect x="16" y="28" width="34" height="22" rx="4" fill="url(#gBlue)"/><circle cx="66" cy="38" r="15" fill="url(#gBlue)"/>
    <rect x="62" y="8" width="8" height="18" fill="url(#gMetal)"/><rect x="80" y="34" width="16" height="8" fill="url(#gMetal)"/>
    <rect x="50" y="35" width="6" height="6" fill="#94a3b8"/><circle cx="66" cy="38" r="5" fill="#1e3a8a"/></svg>`,
  boiler: `<svg viewBox="0 0 100 70"><rect x="10" y="20" width="76" height="34" rx="17" fill="url(#gMetal)"/>
    <circle cx="18" cy="37" r="14" fill="url(#gRed)"/><circle cx="18" cy="37" r="6" fill="#fde047"/>
    <rect x="50" y="6" width="8" height="16" fill="#64748b"/><rect x="20" y="54" width="8" height="8" fill="#334155"/><rect x="70" y="54" width="8" height="8" fill="#334155"/>
    <path d="M40 24v26M60 24v26" stroke="#64748b"/></svg>`,
  lamp: `<svg viewBox="0 0 100 70"><circle cx="50" cy="50" r="22" fill="url(#gGlow)"/>
    <rect x="47" y="2" width="6" height="12" fill="#64748b"/><path d="M28 34 L36 14 H64 L72 34 Z" fill="url(#gDark)"/>
    <ellipse cx="50" cy="35" rx="22" ry="6" fill="#fffbeb"/></svg>`,
  panel: `<svg viewBox="0 0 100 70"><rect x="14" y="6" width="72" height="58" rx="2" fill="url(#gMetal)"/>
    <path d="M38 6v58M62 6v58" stroke="#94a3b8"/>
    <g fill="#1e293b"><rect x="20" y="12" width="12" height="8"/><rect x="44" y="12" width="12" height="8"/><rect x="68" y="12" width="12" height="8"/></g>
    <g fill="#22c55e"><circle cx="22" cy="28" r="2"/><circle cx="46" cy="28" r="2"/><circle cx="70" cy="28" r="2"/></g>
    <g fill="#ef4444"><circle cx="28" cy="28" r="2"/><circle cx="52" cy="28" r="2"/><circle cx="76" cy="28" r="2"/></g></svg>`,
  flow: `<svg viewBox="0 0 100 70"><rect x="2" y="38" width="96" height="14" fill="url(#gMetal)"/>
    <rect x="28" y="30" width="44" height="30" rx="6" fill="url(#gBlue)"/>
    <rect x="40" y="6" width="20" height="24" rx="4" fill="url(#gDark)"/><rect x="43" y="10" width="14" height="9" fill="#a7f3d0"/></svg>`,
  valve: `<svg viewBox="0 0 100 70"><rect x="4" y="46" width="92" height="12" fill="url(#gMetal)"/>
    <path d="M36 40 h28 l6 18 h-40z" fill="url(#gMetal)"/><rect x="44" y="20" width="12" height="22" fill="#64748b"/>
    <ellipse cx="50" cy="16" rx="22" ry="8" fill="url(#gMetal)"/><ellipse cx="50" cy="13" rx="16" ry="5" fill="#cbd5e1"/></svg>`,
  meter: `<svg viewBox="0 0 100 70"><rect x="24" y="4" width="52" height="62" rx="5" fill="#111827" stroke="#475569"/>
    <rect x="30" y="10" width="40" height="40" fill="#cbd5e1"/>
    <g font-family="monospace" font-size="8" fill="#0f172a" font-weight="bold"><text x="34" y="20">381.6</text><text x="40" y="31">411</text><text x="40" y="42">244</text></g>
    <circle cx="40" cy="58" r="3" fill="#64748b"/><circle cx="50" cy="58" r="3" fill="#64748b"/><circle cx="60" cy="58" r="3" fill="#64748b"/></svg>`,
  genset: `<svg viewBox="0 0 100 70"><rect x="6" y="52" width="88" height="8" fill="#334155"/>
    <rect x="10" y="14" width="80" height="38" rx="3" fill="url(#gGreen)"/>
    <circle cx="32" cy="33" r="14" fill="#064e3b"/><g stroke="#6ee7b7" stroke-width="2"><path d="M32 19v28M18 33h28"/></g>
    <rect x="54" y="22" width="30" height="22" fill="#065f46"/><path d="M56 26h26M56 31h26M56 36h26M56 41h26" stroke="#10b981"/></svg>`,
  battery: `<svg viewBox="0 0 100 70"><g fill="#1f2937" stroke="#475569">
    <rect x="6" y="18" width="26" height="44" rx="2"/><rect x="37" y="18" width="26" height="44" rx="2"/><rect x="68" y="18" width="26" height="44" rx="2"/></g>
    <g fill="#ef4444"><rect x="10" y="12" width="6" height="6"/><rect x="41" y="12" width="6" height="6"/><rect x="72" y="12" width="6" height="6"/></g>
    <g fill="#94a3b8"><rect x="22" y="12" width="6" height="6"/><rect x="53" y="12" width="6" height="6"/><rect x="84" y="12" width="6" height="6"/></g>
    <g fill="#22c55e"><rect x="10" y="30" width="18" height="3"/><rect x="41" y="30" width="18" height="3"/><rect x="72" y="30" width="18" height="3"/></g></svg>`,
};

/* ---------- Alat bantu menggambar isometrik (3D semu) ---------- */
function makeIso(ox, oy, s) {
  const c = Math.cos(Math.PI / 6), n = Math.sin(Math.PI / 6);
  const p = (x, y, z) => [ox + (x - y) * c * s, oy + (x + y) * n * s - z * s];
  const pts = (arr) => arr.map((a) => p(...a).map((v) => v.toFixed(1)).join(",")).join(" ");
  // kotak 3D: x,y,z = posisi; w,d,h = lebar, dalam, tinggi; warna = [atas, kiri, kanan]
  function box(x, y, z, w, d, h, col, extra = "") {
    const top = pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]);
    const left = pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]);
    const right = pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]);
    return `<g ${extra}><polygon points="${left}" fill="${col[1]}"/><polygon points="${right}" fill="${col[2]}"/><polygon points="${top}" fill="${col[0]}"/></g>`;
  }
  // tabung tegak
  function cyl(x, y, z, r, h, col) {
    const [cx, cy] = p(x, y, z), [, ty] = p(x, y, z + h);
    const rx = r * s * 1.0, ry = r * s * 0.5;
    return `<g><rect x="${cx - rx}" y="${ty}" width="${rx * 2}" height="${cy - ty}" fill="${col[1]}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${col[1]}"/>
      <rect x="${cx - rx * .35}" y="${ty}" width="${rx * .25}" height="${cy - ty}" fill="#ffffff" opacity=".18"/>
      <ellipse cx="${cx}" cy="${ty}" rx="${rx}" ry="${ry}" fill="${col[0]}"/></g>`;
  }
  return { p, pts, box, cyl };
}

/* Ilustrasi pabrik untuk "Digital Twin – Live Monitoring" */
function factoryIllustration() {
  const W = 900, H = 600;
  const I = makeIso(455, 200, 10.5);
  const C = {
    floor: ["#4b5563", "#374151", "#1f2937"], wall: ["#e5e7eb", "#94a3b8", "#cbd5e1"],
    mach: ["#93c5fd", "#3b82f6", "#1d4ed8"], green: ["#6ee7b7", "#10b981", "#047857"],
    gray: ["#e2e8f0", "#94a3b8", "#64748b"], dark: ["#475569", "#1e293b", "#334155"],
    cab: ["#f1f5f9", "#cbd5e1", "#e2e8f0"], tank: ["#f8fafc", "#cbd5e1"], blueTank: ["#93c5fd", "#2563eb"],
    office: ["#334155", "#0f172a", "#1e293b"], conv: ["#9ca3af", "#4b5563", "#6b7280"],
  };
  let g = "";
  // langit, gunung, laut
  g += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2a47"/><stop offset=".55" stop-color="#5b7aa3"/><stop offset="1" stop-color="#f3c08a"/></linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7aa3c7"/><stop offset="1" stop-color="#1e3a5f"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <path d="M0 150 L120 70 L210 120 L330 40 L460 125 L560 80 L700 140 L820 60 L900 110 V200 H0Z" fill="#4a6688" opacity=".9"/>
    <rect y="165" width="${W}" height="70" fill="url(#sea)"/>
    <rect y="232" width="${W}" height="${H - 232}" fill="#2a3a2c"/>`;
  // gedung latar (siluet) & cerobong berasap
  [[20, 70, 26], [52, 50, 40], [96, 40, 30], [130, 60, 22], [760, 55, 34], [800, 80, 26], [835, 45, 40], [870, 65, 30]].forEach(([x, h, w]) => {
    g += `<rect x="${x}" y="${232 - h}" width="${w}" height="${h}" fill="#3b4f66"/><rect x="${x + 4}" y="${236 - h}" width="${w - 8}" height="3" fill="#f3c08a" opacity=".5"/>`;
  });
  g += `<rect x="70" y="120" width="10" height="112" fill="#cbd5e1"/><rect x="70" y="130" width="10" height="8" fill="#dc2626"/><rect x="88" y="140" width="8" height="92" fill="#cbd5e1"/>
    <g fill="#e5e7eb" opacity=".55"><circle class="smoke" cx="76" cy="108" r="9"/><circle class="smoke" cx="88" cy="90" r="13"/><circle class="smoke" cx="104" cy="70" r="17"/></g>`;
  // lantai pabrik
  g += I.box(0, 0, 0, 40, 30, 0.8, C.floor);
  // garis lantai
  for (let i = 4; i < 40; i += 6) g += `<polyline points="${I.pts([[i, 0, 0.81], [i, 30, 0.81]])}" stroke="#6b7280" stroke-width=".6"/>`;
  // dinding belakang
  g += I.box(0, 0, 0.8, 40, 0.6, 9, C.wall) + I.box(0, 0, 0.8, 0.6, 30, 9, C.wall);
  for (let i = 3; i < 38; i += 5) g += `<polygon points="${I.pts([[i, 0.61, 6], [i + 3, 0.61, 6], [i + 3, 0.61, 8.5], [i, 0.61, 8.5]])}" fill="#7dd3fc" opacity=".8"/>`;
  // papan nama
  const [bx, by] = I.p(2, 0.6, 7.6);
  g += `<g transform="translate(${bx},${by}) skewY(30)"><rect x="0" y="-14" width="78" height="22" fill="#0f172a" rx="2"/>
    <text x="6" y="2" font-size="12" font-weight="800" fill="#d4a24c" font-family="Inter,sans-serif">${CONFIG.namaSingkat}</text></g>`;
  // kantor / ruang kontrol kaca
  g += I.box(1, 2, 0.8, 7, 8, 5, C.office);
  for (let i = 0; i < 3; i++) g += `<polygon points="${I.pts([[1.5 + i * 2.2, 10.01, 2], [3.2 + i * 2.2, 10.01, 2], [3.2 + i * 2.2, 10.01, 5], [1.5 + i * 2.2, 10.01, 5]])}" fill="#38bdf8" opacity=".7"/>`;
  // chiller & AHU & HVAC (atas)
  g += I.box(14, 2, 0.8, 7, 4, 3, C.mach) + I.box(23, 2, 0.8, 6, 4, 3, C.gray) + I.box(31, 2, 0.8, 7, 4, 3.5, C.cab);
  // boiler (tabung oranye/abu)
  g += I.cyl(36, 10, 0.8, 2.2, 4, ["#f8fafc", "#94a3b8"]) + I.cyl(36, 15, 0.8, 2.2, 4, ["#f8fafc", "#94a3b8"]);
  g += I.cyl(30, 12, 0.8, 1.5, 3, ["#fdba74", "#c2410c"]);
  // lini produksi: konveyor + mesin
  for (let r = 0; r < 3; r++) {
    const y = 12 + r * 5;
    g += I.box(10, y, 0.8, 16, 1.4, 1.2, C.conv);
    for (let m = 0; m < 4; m++) g += I.box(11 + m * 4, y - 1.2, 0.8, 2.4, 1.2, 2.2, m % 2 ? C.green : C.mach);
  }
  // pompa & tangki biru
  g += I.cyl(4, 16, 0.8, 1.4, 3, C.blueTank) + I.cyl(4, 20, 0.8, 1.4, 3, C.blueTank);
  // panel LVMDP (deret lemari)
  for (let i = 0; i < 5; i++) g += I.box(28 + i * 2.1, 24, 0.8, 2, 1.4, 4, C.cab);
  // baterai
  for (let i = 0; i < 4; i++) g += I.box(14 + i * 2.6, 26, 0.8, 2.2, 2, 4, C.dark);
  // genset
  g += I.box(2, 25, 0.8, 7, 3.5, 3, C.green);
  // label-label (id dipakai untuk update nilai langsung)
  const tag = (x, y, z, title, id, val) => {
    const [tx, ty] = I.p(x, y, z);
    return `<g class="tw-tag" transform="translate(${tx},${ty})"><line x1="0" y1="0" x2="0" y2="-14" stroke="#22d3ee" stroke-width="1"/>
      <rect x="-44" y="-44" width="88" height="30" rx="4" fill="rgba(8,24,38,.9)" stroke="#22d3ee"/>
      <text x="-38" y="-31" font-size="9.5" font-weight="700" fill="#fff">${title}</text>
      <text x="-38" y="-19" font-size="9" fill="#5eead4" id="${id}">${val}</text></g>`;
  };
  g += tag(17, 3, 4, "Chiller", "tw-chiller", "6,1 °C") + tag(34, 3, 4.5, "AHU", "tw-ahu", "23,4 °C");
  g += tag(36, 12, 5, "Boiler", "tw-boiler", "Gas 124 m³") + tag(4, 6, 6, "Lighting", "tw-light", "Normal");
  g += tag(22, 21, 3, "Flow Meter", "tw-flow", "1.336 m³/h") + tag(31, 25, 5, "LVMDP", "tw-lvmdp", "381 V");
  g += tag(4, 18, 4, "Pompa", "tw-pompa", "5,5 bar") + tag(12, 26, 5, "Aki / Battery", "tw-aki", "54,0 V");
  g += tag(5, 26, 4, "Gen Set", "tw-genset", "4,7 bar") + tag(14, 17, 3, "Lini Perakitan", "tw-lini", "8.733 unit");
  g += tag(26, 7, 4, "Power Meter", "tw-power", "245,2 kWh") + tag(8, 12, 4.5, "Suhu & RH", "tw-suhu", "23,4°C | 54%RH");
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">${g}</svg>`;
}

/* Gambar kamera CCTV (setiap kamera berbeda berdasar "seed") */
function cctvScene(seed, big) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const I = makeIso(200, 40, 9);
  let g = `<rect width="400" height="250" fill="#26323d"/>`;
  g += I.box(0, 0, 0, 30, 24, 0.3, ["#5b6670", "#3a434b", "#2f373e"]);
  g += I.box(0, 0, 0.3, 30, 0.4, 10, ["#9aa5ae", "#6b7680", "#808b94"]) + I.box(0, 0, 0.3, 0.4, 24, 10, ["#9aa5ae", "#6b7680", "#808b94"]);
  const boxes = [];
  const colorsets = [["#a7b0b8", "#6b7680", "#808b94"], ["#7fb3a0", "#3f7a66", "#4f8a76"], ["#c8ced3", "#8c959c", "#a2aab0"]];
  for (let i = 0; i < 9; i++) {
    const x = 2 + rnd() * 24, y = 2 + rnd() * 18, w = 2 + rnd() * 4, d = 2 + rnd() * 3, h = 1.5 + rnd() * 4;
    g += I.box(x, y, 0.3, w, d, h, colorsets[i % 3]);
    if (i < 3) boxes.push([x, y, w, d, h]);
  }
  // orang
  const people = [];
  for (let i = 0; i < 3; i++) {
    const [px, py] = I.p(4 + rnd() * 22, 4 + rnd() * 18, 0.3);
    g += `<g fill="#1f2937"><circle cx="${px}" cy="${py - 22}" r="4"/><rect x="${px - 4}" y="${py - 18}" width="8" height="18" rx="3"/></g>`;
    people.push([px, py]);
  }
  // kotak deteksi AI (hijau)
  const lbl = (x, y, w, h, t) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#22c55e" stroke-width="1.5"/>
    <rect x="${x}" y="${y - 11}" width="${t.length * 5.4 + 6}" height="11" fill="#22c55e"/><text x="${x + 3}" y="${y - 2.5}" font-size="8.5" font-weight="700" fill="#052e16">${t}</text>`;
  people.forEach(([px, py], i) => (g += lbl(px - 9, py - 30, 18, 32, `Person ${93 + ((seed + i) % 6)}%`)));
  const objs = ["AGV", "Pompa", "AHU", "Panel", "Genset", "Robot"];
  boxes.slice(0, 2).forEach(([x, y, w, d, h], i) => {
    const [ax, ay] = I.p(x, y + d, 0.3 + h), [bx, by] = I.p(x + w, y, 0.3);
    g += lbl(Math.min(ax, bx) - 4, ay - 4, Math.abs(bx - ax) + 20, by - ay + 12, `${objs[(seed + i) % 6]} ${94 + i}%`);
  });
  if (big) g += `<rect x="300" y="160" width="80" height="44" rx="4" fill="#0b2530" stroke="#2dd4bf"/><text x="308" y="188" font-size="17" font-weight="800" fill="#e2e8f0" id="cctv-temp">22,5°C</text>`;
  return `<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">
    <g filter="saturate(.75)">${g}</g><rect width="400" height="250" fill="#0e7490" opacity=".08"/></svg>`;
}

/* Ilustrasi gedung untuk modul Smart Tower */
function towerIllustration() {
  const W = 1200, H = 560;
  let g = `<defs><linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a4a"/><stop offset=".45" stop-color="#c26a4a"/><stop offset=".75" stop-color="#f5b26b"/><stop offset="1" stop-color="#6b4a3a"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e293b"/><stop offset=".5" stop-color="#475569"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
    <radialGradient id="sun"><stop offset="0" stop-color="#fff7e0"/><stop offset=".3" stop-color="#ffd58a"/><stop offset="1" stop-color="#ffb46b" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#dusk)"/><circle cx="90" cy="300" r="170" fill="url(#sun)"/>
    <path d="M0 330 L160 260 L300 300 L470 240 L640 290 L820 230 L1000 280 L1200 240 V400 H0Z" fill="#5b3f45" opacity=".55"/>`;
  // gedung-gedung kota
  let s = 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) {
    const x = i * 48 - 10, w = 34 + rnd() * 30, h = 70 + rnd() * 150;
    if (x > 470 && x < 760) continue;
    g += `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" fill="#3a2f38"/>`;
    for (let wy = H - h + 8; wy < H - 6; wy += 12) for (let wx = x + 5; wx < x + w - 5; wx += 9)
      if (rnd() > 0.45) g += `<rect x="${wx}" y="${wy}" width="4" height="5" fill="#ffd28a" opacity="${0.4 + rnd() * 0.5}"/>`;
  }
  // menara utama
  const tx = 520, tw = 210, top = 70;
  g += `<rect x="${tx}" y="${top}" width="${tw}" height="${H - top}" fill="url(#glass)"/>`;
  for (let fy = top + 12; fy < H; fy += 16) {
    g += `<rect x="${tx}" y="${fy}" width="${tw}" height="2" fill="#94a3b8" opacity=".5"/>`;
    for (let fx = tx + 6; fx < tx + tw - 6; fx += 14) if (rnd() > 0.35) g += `<rect x="${fx}" y="${fy + 4}" width="9" height="8" fill="#ffd28a" opacity="${0.35 + rnd() * 0.55}"/>`;
  }
  g += `<rect x="${tx + tw / 2 - 12}" y="${top}" width="24" height="${H - top}" fill="#16a34a" opacity=".55"/>`;
  g += `<rect x="${tx + 30}" y="${top + 30}" width="150" height="46" rx="4" fill="#0f172a" opacity=".9"/>
    <text x="${tx + 42}" y="${top + 52}" font-size="19" font-weight="800" fill="#d4a24c">${CONFIG.namaSingkat}</text>
    <text x="${tx + 42}" y="${top + 69}" font-size="12" fill="#e2e8f0">Smart Tower</text>`;
  const tag = (x, y, lx, ly, title, id, val) => `<line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" stroke="#e2e8f0" stroke-width="1" opacity=".7"/>
    <circle cx="${x}" cy="${y}" r="4" fill="#22d3ee"/>
    <g transform="translate(${lx},${ly})"><rect x="0" y="-22" width="118" height="44" rx="5" fill="rgba(6,24,34,.88)" stroke="#2dd4bf"/>
    <text x="9" y="-4" font-size="14" font-weight="800" fill="#fff">${title}</text><text x="9" y="14" font-size="13" fill="#5eead4" id="${id}">${val}</text></g>`;
  g += tag(560, 220, 330, 190, "HVAC", "tt-hvac", "18,7 °C");
  g += tag(640, 290, 650, 270, "Lighting", "tt-light", "306 kW");
  g += tag(720, 230, 850, 175, "CCTV", "tt-cctv", "47/48 online");
  g += tag(560, 420, 340, 400, "Fire Fighting", "tt-fire", "7,5 bar");
  g += tag(690, 480, 830, 470, "Data Center", "tt-dc", "21,6°C · PUE 1,45");
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">${g}</svg>`;
}

/* Grafik garis kecil (sparkline) dari deretan angka */
function sparkline(values, color = "#22d3ee", w = 120, h = 26) {
  const min = Math.min(...values), max = Math.max(...values), r = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / r) * (h - 4)).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
}

/* Cincin persentase (OEE) */
function ring(pct, color, size = 80) {
  const r = size / 2 - 6, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#1b3550" stroke-width="7"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="54%" text-anchor="middle" font-size="15" font-weight="800" fill="currentColor">${Math.round(pct)}%</text></svg>`;
}
