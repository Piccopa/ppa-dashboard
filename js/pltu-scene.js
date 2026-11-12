/* =========================================================
   PLTU-SCENE.JS — MODUL "POWER PLANT 3D" (PLTU batubara 300 MW)
   9 area monitoring:
     1. Fuel Handling           4. Generator              7. Emission Monitoring (CEMS)
     2. Boiler                  5. Condenser & Cooling    8. Electrical Distribution
     3. Steam Turbine           6. Feedwater              9. Auxiliary
   Model 3D peralatan: js/pltu3d.js (+ js/wtp3d.js).
   Kerangka tampilan (panel, kamera, label): js/scenes3d.js (Scene3D.alat).
   Semua angka SIMULASI → nanti bisa diganti data DCS/PLC asli di fungsi hitung().
   ========================================================= */

(() => {
  if (typeof Scene3D === "undefined" || !Scene3D.daftar || typeof Pltu3D === "undefined") return;

  // preset kamera: [sudut putar, sudut tinggi, jarak, [titik tengah x, y, z]]
  const SEKSI = [
    { id: 1, nama: "Fuel Handling", pendek: "Fuel", ikon: "⛏️", preset: [1.25, 0.85, 110, [-85, 6, -10]] },
    { id: 2, nama: "Boiler System", pendek: "Boiler", ikon: "🔥", preset: [1.2, 1.0, 105, [-5, 20, -6]] },
    { id: 3, nama: "Steam Turbine", pendek: "Turbin", ikon: "🌀", preset: [1.5, 0.62, 52, [2, 9, 30]] },
    { id: 4, nama: "Generator", pendek: "Generator", ikon: "⚡", preset: [1.3, 0.66, 46, [24, 9, 32]] },
    { id: 5, nama: "Condenser & Cooling", pendek: "Cooling", ikon: "☁️", preset: [1.35, 1.0, 170, [70, 6, 22]] },
    { id: 6, nama: "Feedwater System", pendek: "Feedwater", ikon: "💧", preset: [1.55, 0.8, 48, [14, 10, 11]] },
    { id: 7, nama: "Emission (CEMS)", pendek: "Emisi", ikon: "🏭", preset: [1.1, 0.95, 130, [65, 25, -10]] },
    { id: 8, nama: "Electrical Distribution", pendek: "Electrical", ikon: "🗼", preset: [1.1, 0.88, 95, [72, 6, 55]] },
    { id: 9, nama: "Auxiliary System", pendek: "Auxiliary", ikon: "⚙️", preset: [1.5, 0.82, 55, [-42, 3, 32]] },
  ];

  /* ---------- Peralatan yang bisa di-Start/Stop ---------- */
  const ALAT_AWAL = [
    ["CV-01", 1, "Yard Conveyor", "run"], ["CV-02", 1, "Conveyor ke Bunker", "run"], ["SR-01", 1, "Stacker Reclaimer", "run"],
    ["P-101A", 1, "HSD Pump A", "standby"], ["P-101B", 1, "HSD Pump B", "standby"],
    ["CM-A", 2, "Coal Mill + Feeder A", "run"], ["CM-B", 2, "Coal Mill + Feeder B", "run"], ["CM-C", 2, "Coal Mill + Feeder C", "run"], ["CM-D", 2, "Coal Mill + Feeder D", "standby"],
    ["FD-A", 2, "Forced Draft Fan A", "run"], ["FD-B", 2, "Forced Draft Fan B", "run"],
    ["TG", 3, "Turbine Stop Valve / Governor", "run"], ["LOP-AC", 3, "Lube Oil Pump AC", "run"], ["LOP-DC", 3, "Emergency DC Oil Pump", "standby"],
    ["GEN-CB", 4, "Generator Circuit Breaker", "run"], ["EXC", 4, "Excitation / AVR", "run"],
    ["CWP-A", 5, "CW Pump A", "run"], ["CWP-B", 5, "CW Pump B", "run"], ["CWP-C", 5, "CW Pump C", "standby"],
    ["CEP-A", 5, "Condensate Pump A", "run"], ["CEP-B", 5, "Condensate Pump B", "standby"],
    ["BFP-A", 6, "Boiler Feed Pump A", "run"], ["BFP-B", 6, "Boiler Feed Pump B", "run"], ["BFP-C", 6, "Boiler Feed Pump C", "standby"],
    ["ESP", 7, "Electrostatic Precipitator", "run"], ["FGD", 7, "FGD Absorber (recycle pump)", "run"], ["ID-A", 7, "Induced Draft Fan A", "run"], ["ID-B", 7, "Induced Draft Fan B", "run"],
    ["CB-150", 8, "PMT 150 kV (line breaker)", "run"], ["UAT", 8, "Unit Auxiliary Transformer", "run"],
    ["AC-A", 9, "Air Compressor A", "run"], ["AC-B", 9, "Air Compressor B", "standby"], ["ACW-A", 9, "Aux Cooling Water Pump A", "run"], ["ACW-B", 9, "Aux Cooling Water Pump B", "standby"],
  ];

  const SKENARIO = [
    { k: "vib", t: "Vibrasi bearing turbin tinggi", sek: 3 },
    { k: "vakum", t: "Vakum kondensor turun (udara masuk)", sek: 5 },
    { k: "drum", t: "Level drum boiler tinggi", sek: 2 },
    { k: "so2", t: "SO₂ melewati baku mutu (gangguan FGD)", sek: 7 },
    { k: "trafo", t: "Suhu trafo GSU tinggi", sek: 8 },
    { k: "trip", t: "Unit trip – proteksi generator", sek: 4 },
    { k: null, t: "Kembali normal & sinkron ulang", sek: 4 },
  ];

  function buatPLTU() {
    const { kerangka, dunia3D, label, pohon, setMalam } = Scene3D.alat;
    const W = Wtp3D, P = Pltu3D;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    /* ======================================================
       STATUS PROSES (semua angka simulasi)
       ====================================================== */
    const st = {
      mw: 300, sp: 300, rpm: 3000, trip: false, sebabTrip: "", g: null, iSken: 0,
      hsd: 78, bunker: 82, stok: 38500, totalHari: 1830, da: 55, udara: 6.6, hotwell: 600, tag: false, sek: 2, fokus: null, fokusSampai: 0,
    };
    const ALAT = {};
    ALAT_AWAL.forEach(([tag, sek, nama, s]) => (ALAT[tag] = { tag, sek, nama, st: s, obj: null }));
    const on = (tag) => ALAT[tag].st === "run";
    const nRun = (awal) => Object.values(ALAT).filter((a) => a.tag.startsWith(awal) && a.st === "run").length;
    const online = () => !st.trip && st.mw > 1;

    /* ======================================================
       KERANGKA TAMPILAN
       ====================================================== */
    const v = kerangka("power3d", {
      judul: `⚡ Power Plant 3D – ${CONFIG.namaSingkat} PLTU 300 MW`,
      bar: {
        t1: CONFIG.namaSingkat.toUpperCase(), t1s: "POWER PLANT", t2: "Digital Twin 3D – PLTU Batubara 1 × 300 MW",
        t3: "Fuel · Boiler · Turbin · Generator · Condenser & CT · Feedwater · CEMS · Switchyard 150 kV · Auxiliary",
      },
      kiri: `<h5>▮ Status Unit</h5><div data-k="unit"></div>
        ${[["mw", "Daya output"], ["ef", "Efisiensi / Heat rate"], ["hz", "Frekuensi"], ["coal", "Batubara"], ["steam", "Main steam"],
          ["vak", "Vakum kondensor"], ["so2", "SO₂ / NOx (BME 550)"], ["dust", "Debu (BME 100)"], ["exp", "Ekspor ke grid"]]
          .map(([k, n]) => `<div class="v3-kv"><span>${n}</span><b data-k="${k}">-</b></div>`).join("")}
        <div data-k="alm" class="wtp-almbox"></div>
        <h5 style="margin-top:8px">▮ Log Kejadian</h5><div data-k="log" class="wtp-log"></div>`,
      kanan: `<h5>▮ Instrumen · <span data-k="sekNama"></span></h5>
        <div class="wtp-sek">${SEKSI.map((s) => `<button class="btn sm" data-sek="${s.id}" title="${s.nama}">${s.id}</button>`).join("")}</div>
        <table class="wtp-tbl"><tbody data-k="tbl"></tbody></table>
        <h5 style="margin-top:8px">▮ Kontrol Peralatan</h5><div data-k="ktrl"></div>`,
      bawah: [
        { label: "🌐 Overview", aksi: (v) => v.orbit.ke(v.preset.Overview) },
        ...SEKSI.map((s) => ({ label: `${s.id} ${s.ikon} ${s.pendek}`, aksi: () => pilihSeksi(s.id, true) })),
        { label: "🏷️ Tag", aksi: (v, b) => { st.tag = !st.tag; b.classList.toggle("active", st.tag); } },
        { label: "🔄 Rotate", aksi: (v, b) => { v.orbit.auto = !v.orbit.auto; b.classList.toggle("active", v.orbit.auto); } },
        { label: "🌙 Malam", aksi: (v, b) => { setMalam(v, !v.malam); b.innerHTML = v.malam ? "🌞 Siang" : "🌙 Malam"; } },
        { label: "⚠ Simulasi Gangguan", bahaya: true, aksi: (v, b) => gantiSkenario(b) },
      ],
    });
    v.el.querySelector("[data-kiri]").classList.add("wtp");
    v.el.querySelector("[data-kanan]").classList.add("wtp", "wtp-kanan");
    v.el.querySelector(".v3-bottom").style.maxWidth = "900px";

    dunia3D(v, 0xc7dfef);
    v.langitSiang = 0xc7dfef;
    Object.assign(v.sun.shadow.camera, { left: -200, right: 200, top: 160, bottom: -160, far: 600 });
    v.sun.position.set(90, 170, 70);
    v.sun.shadow.camera.updateProjectionMatrix();
    const S = v.scene;

    /* ======================================================
       TANAH, JALAN, POHON
       ====================================================== */
    W.kotak(S, 1000, 1, 1000, 0xa9c48e, 0, -1.3, 0);
    W.kotak(S, 290, 0.3, 175, W.bersama("pad", 0xcfd2d4, { roughness: 0.95 }), 10, -0.3, 15);
    [-64, 98].forEach((z) => { W.kotak(S, 290, 0.06, 7, 0x4b5563, 10, 0, z); for (let x = -130; x < 150; x += 8) W.kotak(S, 3.5, 0.08, 0.18, 0xffffff, x, 0, z); });
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, r = 175 + Math.random() * 120;
      const x = 10 + Math.cos(a) * r * 1.1, z = 15 + Math.sin(a) * r * 0.75;
      if (x > 100 && Math.abs(z - 75) < 30) continue;                             // jalur transmisi
      pohon(S, x, z, 1 + Math.random() * 0.6);
    }

    /* ---------- alat bantu pipa + aliran ---------- */
    const alir = [];
    const P3 = (a) => a.map(([x, y, z]) => V(x, y, z));
    function jalur(titik, r, warnaPipa, warnaAlir, q, opsi) {
      const p = P3(titik);
      W.pipa(S, p, r, warnaPipa, opsi);
      if (warnaAlir != null) alir.push({ a: W.aliran(S, p, warnaAlir, r, { jarak: r > 0.7 ? 6 : 2.2 }), q });
    }
    const PIPA = { steam: 0xd1d5db, fw: 0x2563eb, kond: 0x0891b2, cw: 0x1e40af, hsd: 0x92400e, udara: 0x7c3aed, acw: 0x0e7490 };
    const ALIR = { steam: 0xef4444, fw: 0x7dd3fc, kond: 0xa5f3fc, cwDingin: 0x38bdf8, cwPanas: 0xfb923c, hsd: 0xf59e0b, udara: 0xe9d5ff };
    const L = () => Math.max(0, st.mw / 300);                       // fraksi beban 0..1,1

    /* ======================================================
       1) FUEL HANDLING — coal yard, stacker reclaimer, konveyor, HSD
       ====================================================== */
    W.kotak(S, 62, 0.08, 52, W.bersama("tanahYard", 0x57534e, { roughness: 1 }), -96, 0, -19);
    P.tumpukan(S, -96, -33, 52, 16, 10);
    P.tumpukan(S, -96, -5, 52, 16, 9);
    P.tumpukan(S, -112, -45.5, 16, 7, 4);
    [-21.2, -18.8].forEach((z) => W.kotak(S, 52, 0.25, 0.3, W.baja(), -100, 0, z));
    for (let x = -125; x < -76; x += 2) W.kotak(S, 0.4, 0.12, 3.4, 0x6b4f35, x, 0, -20);
    const sr = P.stackerReclaimer(S, -96, -20);
    P.galeri(S, V(-124, 1.4, -16.2), V(-73, 1.4, -16.2), { tiang: false, tinggi: 1.6 });
    W.kotak(S, 6, 13, 6, 0x64748b, -70, 0, -16); W.kotak(S, 6.4, 0.4, 6.4, 0x1d4ed8, -70, 13, -16);   // junction tower
    W.papanNama(S, "JT-1", -70, 10.5, -12.95, 0, 3, "#1d4ed8");
    const aCV2 = V(-67, 12.2, -16), bCV2 = V(-30.2, 30.6, -9.5);
    P.galeri(S, aCV2, bCV2);
    alir.push({ a: W.aliran(S, P3([[-124, 1.65, -16.2], [-73, 1.65, -16.2]]), 0x111111, 0.3, { geo: P.geoBongkah(), jarak: 1.3 }), q: () => (on("CV-01") ? 0.35 : 0) });
    alir.push({ a: W.aliran(S, [aCV2.clone().add(V(0, 0.25, 0)), bCV2.clone().add(V(0, 0.25, 0))], 0x111111, 0.3, { geo: P.geoBongkah(), jarak: 1.3 }), q: () => (on("CV-02") ? 0.35 : 0) });
    // HSD fuel oil (untuk start-up)
    const tkHSD = W.tangkiBesar(S, -95, 40, 6, 9, "HSD FUEL OIL", "TK-101 · 2.000 kL");
    W.kotak(S, 18, 1, 0.4, W.beton(), -95, 0, 31.6); W.kotak(S, 18, 1, 0.4, W.beton(), -95, 0, 48.4); W.kotak(S, 0.4, 1, 17, W.beton(), -104, 0, 40);
    ["P-101A", "P-101B"].forEach((tag, i) => {
      const z = i ? 43 : 37;
      ALAT[tag].obj = W.pompa(S, -84, z, Math.PI, 0x92400e);
      jalur([[-88.9, 0.98, z], [-86.08, 0.98, z]], 0.18, PIPA.hsd, null, null, { tiang: false, flens: false });
      jalur([[-85.15, 2.16, z], [-85.15, 4, z]], 0.18, PIPA.hsd, null, null, { tiang: false });
    });
    jalur([[-85.15, 4, 43], [-85.15, 4, 12], [-14, 4, 12], [-14, 4, 5.6]], 0.2, PIPA.hsd, ALIR.hsd, () => (nRun("P-101") && st.rpm > 0 && st.mw < 120 ? 0.6 : 0));

    /* ======================================================
       2) BOILER — bunker bay, coal mill, FD fan, gedung boiler
       ====================================================== */
    const blr = P.boiler(S, 0, -10, 30, 30, 52);
    // bunker bay
    const kb = W.bersama("kolomBoiler", 0x334155, { metalness: 0.5 });
    [-30, -16].forEach((x) => [-24, -10, 4].forEach((z) => W.kotak(S, 0.8, 30, 0.8, kb, x, 0, z)));
    W.kotak(S, 14.6, 4.2, 28.6, W.bahan(0xe6e9ec, { roughness: 0.7 }), -23, 30, -10);
    W.kotak(S, 14.8, 0.4, 28.8, 0x1d4ed8, -23, 33.9, -10);
    W.papanNama(S, "BUNKER BAY", -23, 32.1, 4.35, 0, 6, "#1d4ed8");
    const zMill = [-20, -13, -6, 1];
    const pipaBatubara = [];
    ["A", "B", "C", "D"].forEach((h, i) => {
      const z = zMill[i];
      P.bunker(S, -23, z, 2.8, 30, 13, h);
      P.weighFeeder(S, -23.5, 9.8, z);
      W.tabung(S, 0.4, 0.4, 1.6, W.baja(), -24.5, 11.1, z, 10);             // corong ke feeder
      W.tabung(S, 0.35, 0.35, 3.4, W.baja(), -21.8, 6.4, z, 10);            // chute ke mill
      P.mill(S, -23, z);
      ALAT["CM-" + h].obj = { set: () => {} };
      const pts = [[-23, 6.9, z], [-23, 8.6, z], [-15.3, 8.6, z]];
      jalur(pts, 0.32, 0x57534e, null, null, { tiang: false });
      pipaBatubara.push({ a: W.aliran(S, P3(pts), 0x0f0f0f, 0.32, { geo: new THREE.SphereGeometry(0.22, 6, 4), jarak: 0.9 }), q: () => (on("CM-" + h) && online() ? 0.9 : 0) });
    });
    alir.push(...pipaBatubara);
    // FD fan → boiler
    ["FD-A", "FD-B"].forEach((tag, i) => {
      const x = i ? 6 : -6;
      P.idFan(S, x, -32);
      ALAT[tag].obj = { set: () => {} };
      P.saluran(S, [V(x, 6.2, -32), V(x, 9, -32), V(x, 9, -25.4)], 2.4, 2.4, 0x8a94a0);
    });

    /* ======================================================
       7) JALUR GAS BUANG: APH → ESP → ID FAN → FGD → CEROBONG
       ====================================================== */
    P.saluran(S, [V(15.6, 36, -10), V(21, 36, -10), V(21, 13, -10), V(25, 13, -10)], 5, 5);
    W.tabung(S, 3.6, 3.6, 5, W.bersama("aph", 0x64748b, { metalness: 0.4 }), 21, 17, -10, 28);   // air preheater
    W.papanNama(S, "AIR PREHEATER", 21, 23.4, -6.3, 0, 5, "#64748b");
    const espM = P.esp(S, 36, -10, 22, 18, 13);
    P.saluran(S, [V(47, 12.5, -10), V(50.5, 12.5, -10), V(50.5, 4.2, -10)], 3.2, 3.2);
    P.saluran(S, [V(50.5, 4.2, -16), V(50.5, 4.2, -4)], 3.2, 3.2);
    ["ID-A", "ID-B"].forEach((tag, i) => {
      const z = i ? -4 : -16;
      P.idFan(S, 54, z);
      ALAT[tag].obj = { set: () => {} };
      P.saluran(S, [V(54, 6.1, z), V(54, 9, z), V(54, 9, -10)], 2.4, 2.4);
    });
    P.saluran(S, [V(54, 9, -10), V(64, 9, -10)], 3, 3);
    P.absorber(S, 70, -10, 6, 28);
    P.saluran(S, [V(76, 24, -10), V(84.6, 24, -10)], 3.4, 3.4);
    const stack = P.cerobong(S, 88, -10, 85);
    const gAsap = new THREE.Group(); S.add(gAsap);
    const animAsap = W.kepulan(gAsap, stack.puncak, { n: 24, warna: 0xf1f5f9, durasi: 8000, naik: 26, ukuran0: 4, ukuran1: 16, angin: V(26, 0, -8), opasitas: 0.55, sebar: 0.8 });

    /* ======================================================
       3) TURBINE HALL + TURBIN-GENERATOR (4) + KONDENSOR (5)
       ====================================================== */
    W.shelter(S, 10, 30, 72, 24, 26, { tembus: true, pita: 0x0284c7 });
    W.papanNama(S, "TURBINE HALL", -17, 24.5, 42.7, 0, 8, "#0284c7");
    const kaca = W.bahan(0xbfdbfe, { transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
    W.kotak(S, 72, 25.6, 0.15, kaca, 10, 0.3, 18.2); W.kotak(S, 0.15, 25.6, 24, kaca, -26, 0.3, 30); W.kotak(S, 0.15, 25.6, 24, kaca, 46, 0.3, 30);
    W.kotak(S, 72, 3, 0.2, W.bahan(0xe2e8f0), 10, 0.3, 41.8);                         // dinding bawah sisi selatan
    W.kotak(S, 1.2, 1.4, 25, W.bersama("crane", 0xfacc15), -20, 21.5, 30);             // overhead crane
    [18.6, 41.4].forEach((z) => W.kotak(S, 72, 0.8, 0.6, W.bersama("relCrane", 0x475569), 10, 21, z));
    W.kotak(S, 50, 2, 9, W.beton(), 9, 6.5, 30);                                     // pedestal turbin
    [-15, -6, 16, 24, 33].forEach((x) => [26.2, 33.8].forEach((z) => W.kotak(S, 1.4, 6.5, 1.4, W.beton(), x, 0, z)));
    const tg = P.turbinGenerator(S, -2, 8.5, 30);
    W.kotak(S, 12, 6, 7.4, W.bersama("kondensor", 0x64748b, { metalness: 0.4 }), 7, 0, 30);   // kondensor
    W.kotak(S, 12.4, 1.2, 7.8, W.bersama("hotwell", 0x475569), 7, 0, 30);
    W.papanNama(S, "CONDENSER", 7, 4.6, 33.75, 0, 5, "#475569");
    [3, 11].forEach((x) => W.kotak(S, 3, 3.6, 1, W.bersama("waterbox", 0x1e40af, { metalness: 0.3 }), x, 0.6, 34.2));
    // lube oil skid
    W.kotak(S, 5, 2.6, 3.2, W.bersama("lube", 0xca8a04, { metalness: 0.3 }), -20, 0, 37);
    ALAT["LOP-AC"].obj = W.pompa(S, -15.5, 38.5, 0, 0xca8a04, 0.45);
    ALAT["LOP-DC"].obj = W.pompa(S, -15.5, 36, 0, 0x7f1d1d, 0.45);
    ALAT.TG.obj = { set: () => {} };
    W.papanNama(S, "LUBE OIL", -20, 3.3, 38.65, 0, 3.4, "#ca8a04");
    // Main steam & hot reheat
    jalur([[-6, 38, 5.6], [-6, 38, 12], [-6, 17, 12], [-11, 17, 12], [-11, 17, 30], [-11, 13.6, 30]], 0.5, PIPA.steam, ALIR.steam, () => L() * 1.2, { tiang: false });
    jalur([[4, 34, 5.6], [4, 34, 13.5], [4, 18.5, 13.5], [-4, 18.5, 13.5], [-4, 18.5, 30], [-4, 13.8, 30]], 0.45, PIPA.steam, ALIR.steam, () => L(), { tiang: false });
    // Isolated phase bus duct generator → GSU
    P.saluran(S, [V(26, 5, 30), V(50.6, 5, 30)], 1.4, 1.4, 0x6b7280);

    /* ======================================================
       6) FEEDWATER — deaerator, BFP, HP heater, kondensat
       ====================================================== */
    [18.6, 33.4].forEach((x) => [10, 13].forEach((z) => W.kotak(S, 0.7, 18.2, 0.7, kb, x, 0, z)));
    W.kotak(S, 16, 0.4, 4.6, W.bersama("grating", 0x94a3b8, { metalness: 0.5 }), 26, 17.8, 11.5);
    W.poros(S, 1.8, 14, W.bersama("deaerator", 0xe5e7eb, { metalness: 0.4 }), 26, 20, 11.5, "x", 28);
    [-1, 1].forEach((sx) => { const t = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), W.bersama("deaerator", 0xe5e7eb)); t.rotation.z = (-sx * Math.PI) / 2; t.position.set(26 + sx * 7, 20, 11.5); S.add(t); });
    W.poros(S, 1.1, 3.4, W.bersama("deaerator", 0xe5e7eb), 22, 22.8, 11.5, "z", 20);
    W.papanNama(S, "DEAERATOR", 26, 20, 13.35, 0, 5, "#2563eb");
    ["BFP-A", "BFP-B", "BFP-C"].forEach((tag, i) => {
      const x = 21 + i * 5;
      ALAT[tag].obj = W.pompa(S, x, 11.5, Math.PI / 2, 0x2563eb);
      jalur([[x, 0.98, 9.42], [x, 0.98, 8.7], [x, 19, 8.7], [x, 19, 10.0]], 0.25, PIPA.fw, null, null, { tiang: false, flens: false });
      jalur([[x, 2.16, 10.35], [x, 3.6, 10.35]], 0.25, PIPA.fw, ALIR.fw, () => (on(tag) ? L() : 0), { tiang: false });
    });
    jalur([[31, 3.6, 10.35], [6.35, 3.6, 10.35]], 0.35, PIPA.fw, ALIR.fw, () => L(), { tiang: false });
    const hph = [5, 0].map((x, i) => W.bejana(S, x, 10.35, 1.3, 5.5, 0x1e3a8a, { nama: "HPH-" + (i + 1), sub: "HP Heater" }));
    jalur([[5, 7.4, 10.35], [5, 8.4, 10.35], [0, 8.4, 10.35], [0, 7.4, 10.35]], 0.3, PIPA.fw, null, null, { tiang: false, flens: false });
    jalur([[-1.35, 3.6, 10.35], [-3, 3.6, 10.35], [-3, 30, 10.35], [-3, 30, 5.6]], 0.35, PIPA.fw, ALIR.fw, () => L(), { tiang: false });
    ["CEP-A", "CEP-B"].forEach((tag, i) => { ALAT[tag].obj = W.pompaVertikal(S, 15.5 + i * 4, 0, 36.5, 0x0891b2); });
    jalur([[16.8, 0.68, 36.5], [22.4, 0.68, 36.5], [22.4, 0.68, 15.5], [22.4, 21.5, 15.5], [22.4, 21.5, 12.6]], 0.3, PIPA.kond, ALIR.kond, () => (nRun("CEP") ? L() : 0), { tiang: false });

    /* ======================================================
       5) COOLING WATER — cooling tower, pompa CW, pipa
       ====================================================== */
    const animCT1 = W.menaraPendingin(S, 130, -12, 15, 32);
    const animCT2 = W.menaraPendingin(S, 130, 32, 15, 32);
    W.kotak(S, 18, 0.6, 5, W.beton(), 106, -0.3, 32); W.kotak(S, 17, 0.1, 4, W.bahan(0x3b82b8, { roughness: 0.2 }), 106, 0.25, 32);   // saluran air dingin
    W.kotak(S, 5, 0.5, 13, W.beton(), 104, 0, 32);                                   // dek pompa CW
    W.shelter(S, 104, 32, 6, 14, 7, { tembus: true, nama: "CW PUMP HOUSE", pita: 0x1e40af });
    ["CWP-A", "CWP-B", "CWP-C"].forEach((tag, i) => {
      const z = 28 + i * 4;
      ALAT[tag].obj = W.pompaVertikal(S, 103.5, 0.5, z, 0x1e40af);
      jalur([[104.8, 1.18, z], [105.6, 1.18, z]], 0.35, PIPA.cw, null, null, { tiang: false, flens: false });
    });
    jalur([[105.6, 1.18, 28], [105.6, 1.18, 36]], 0.6, PIPA.cw, null, null, { tiang: false });
    jalur([[105.6, 1.18, 36], [105.6, 1.18, 50], [11, 1.18, 50], [11, 1.18, 34.7]], 0.9, PIPA.cw, ALIR.cwDingin, () => nRun("CWP") / 2, { tiang: false });
    jalur([[3, 2.4, 34.7], [3, 2.4, 54], [110, 2.4, 54], [110, 2.4, -12], [115.2, 2.4, -12]], 0.9, PIPA.cw, ALIR.cwPanas, () => nRun("CWP") / 2, { tiang: false });
    jalur([[110, 2.4, 40], [116.5, 2.4, 40]], 0.8, PIPA.cw, ALIR.cwPanas, () => nRun("CWP") / 2, { tiang: false });

    /* ======================================================
       8) ELECTRICAL — trafo GSU/UAT, switchyard 150 kV, transmisi
       ====================================================== */
    const gsu = P.trafo(S, 54, 30, Math.PI / 2, 1, "GSU 20/150 kV");
    P.trafo(S, 54, 41, Math.PI / 2, 0.6, "UAT");
    W.kotak(S, 9, 7.5, 0.4, W.beton(), 54, 0, 35.6);                                  // dinding api
    W.kotak(S, 46, 0.1, 34, W.bersama("kerikil", 0xb8b2a7, { roughness: 1 }), 83, 0, 75);
    const g1 = P.gantry(S, 70, 63, 10, 14), g2 = P.gantry(S, 70, 84, 10, 14), g3 = P.gantry(S, 92, 84, 10, 14), g4 = P.gantry(S, 92, 63, 10, 14);
    const pmt1 = P.pmt(S, 70, 73.5), pmt2 = P.pmt(S, 92, 73.5);
    const kepalaPMT = (x) => [-1.5, 0, 1.5].map((dx) => V(x + dx, 5.4, 73.5));
    const kabelHijau = 0x374151;
    gsu.hv.forEach((p, i) => P.kabel(S, p, g1.titik[i], 2.5, kabelHijau));
    [[g1, kepalaPMT(70), g2], [g3, kepalaPMT(92), g4]].forEach(([a, k, b]) => k.forEach((p, i) => { P.kabel(S, a.titik[i], p, 0.3, kabelHijau); P.kabel(S, p, b.titik[i], 0.3, kabelHijau); }));
    const titikBus = [];
    g2.titik.forEach((p, i) => titikBus.push(P.kabel(S, p, g3.titik[i], 0.8, kabelHijau)));
    W.kotak(S, 12, 3.5, 3, W.bersama("kiosk", 0xf1f5f9), 82, 0, 60.5); W.kotak(S, 12.2, 0.3, 3.2, 0xf59e0b, 82, 3.5, 60.5);
    W.papanNama(S, "SWITCHYARD 150 kV", 82, 2.3, 62.05, 0, 6, "#f59e0b");
    const menara = [[118, 64], [150, 68], [184, 72], [218, 76]].map(([x, z]) => P.menara(S, x, z, 34, Math.PI / 2));
    const titikLine = [];
    for (let k = 0; k < 3; k++) {
      let a = g4.titik[k];
      menara.forEach((m) => { const pts = P.kabel(S, a, m.titik[k], 2.2); titikLine.push(pts); a = m.titik[k]; });
    }
    const listrik = [...titikLine, ...titikBus].map((pts) => W.aliran(S, pts, 0xfde047, 0.1, { geo: new THREE.SphereGeometry(0.28, 8, 6), jarak: 5 }));
    // gedung Central Control Room
    const ccr = Model3D.kantor({ lebar: 20, dalam: 12, tinggi: 13, nama: "CCR" }); ccr.position.set(-55, 0, 68); S.add(ccr);

    /* ======================================================
       9) AUXILIARY — kompresor udara, ACW pump
       ====================================================== */
    W.shelter(S, -48, 30, 16, 10, 6, { tembus: true, nama: "AIR COMPRESSOR", pita: 0x7c3aed });
    ["AC-A", "AC-B"].forEach((tag, i) => {
      const x = i ? -46 : -52;
      W.kotak(S, 4, 0.3, 2.4, W.bersama("skid", 0x1f2937), x, 0.3, 30);
      W.kotak(S, 2.6, 2, 2.2, W.bersama("kompresor", 0x7c3aed, { metalness: 0.3 }), x - 0.5, 0.6, 30);
      W.poros(S, 0.6, 1.4, W.bersama("motorKomp", 0x1d4ed8), x + 1.4, 1.2, 30, "x", 16);
      const lampu = W.instrumen(S, "S", x, 0.6, 31.4);
      ALAT[tag].obj = { set: (s) => W.setStackLight(lampu, s) };
    });
    [26, 34].forEach((z, i) => W.bejana(S, -36, z, 1.1, 3.5, 0x9ca3af, { nama: "AR-" + (i + 1), kaki: 0.6 }));
    jalur([[-42, 2.2, 30], [-37.6, 2.2, 30]], 0.15, PIPA.udara, null, null, { tiang: false });
    jalur([[-37.6, 2.2, 26], [-37.6, 2.2, 34]], 0.15, PIPA.udara, null, null, { tiang: false, flens: false });
    jalur([[-34.9, 2.2, 30], [-30, 2.2, 30], [-30, 5, 30], [-26.1, 5, 30]], 0.15, PIPA.udara, ALIR.udara, () => (st.udara > 5 ? 0.5 : 0), { tiang: false });
    ["ACW-A", "ACW-B"].forEach((tag, i) => {
      const x = i ? -44 : -50;
      ALAT[tag].obj = W.pompa(S, x, 42, 0, 0x0e7490);
      jalur([[x + 1.15, 2.16, 42], [x + 1.15, 3.4, 42]], 0.22, PIPA.acw, null, null, { tiang: false });
    });
    jalur([[-48.85, 3.4, 42], [-26.1, 3.4, 42]], 0.25, PIPA.acw, ALIR.kond, () => (nRun("ACW") ? 0.5 : 0), { tiang: false });
    ALAT["CB-150"].obj = { set: () => {} }; ALAT.UAT.obj = { set: () => {} }; ALAT["GEN-CB"].obj = { set: () => {} }; ALAT.EXC.obj = { set: () => {} };
    ALAT.ESP.obj = { set: () => {} }; ALAT.FGD.obj = { set: () => {} };
    ["CV-01", "CV-02", "SR-01"].forEach((t) => (ALAT[t].obj = { set: () => {} }));

    /* ======================================================
       INSTRUMEN: [tag, area, tipe, keterangan, satuan, desimal, batas [LL, L, H, HH], posisi, opsi, rumus]
       Tipe: F flow · P pressure · L level · T temperature · A analyzer · D diff. pressure
             E listrik · X kalkulasi DCS · V vibrasi · Z speed/axial · W weigh feeder · S status
       ====================================================== */
    const zf = { A: -20, B: -13, C: -6 };
    const yP = stack.platform.y;
    const cems = (i) => [88 + Math.cos(-0.9 - i * 0.42) * 4.9, yP + 0.6, -10 + Math.sin(-0.9 - i * 0.42) * 4.9];
    const INST = [
      ["FIT-101", 1, "F", "Flow HSD ke burner (start-up)", "L/h", 0, [null, null, 6000, null], [-60, 4, 12], { r: 0.2 }, () => (nRun("P-101") && st.rpm > 0 && st.mw < 120 ? 2600 : 0)],
      ["LIT-101", 1, "L", "Level tangki HSD", "%", 1, [10, 20, 95, 98], [-92, 10.1, 40], {}, () => st.hsd],
      ["PIT-101", 1, "P", "Tekanan pompa HSD", "bar", 1, [null, null, 35, 40], [-85.15, 4, 28], { r: 0.2 }, () => (nRun("P-101") ? 24 : 0)],
      ["TIT-101", 1, "T", "Suhu HSD", "°C", 1, [null, null, 55, 65], [-74, 4, 12], { r: 0.2 }, () => 31.5],
      ...["A", "B", "C"].map((h) => ["WIT-10" + (h.charCodeAt(0) - 64), 1, "W", "Weigh feeder " + h, "t/h", 1, [null, null, 60, 65], [-21.6, 11.1, zf[h]], { r: 0.2 }, () => (on("CM-" + h) && online() ? (st.mw * 0.473) / Math.max(1, nRun("CM")) : 0)]),
      ["XS-101", 1, "S", "Status conveyor CV-01 / CV-02", "", 0, null, [-74.5, 0, -11], {}, () => (on("CV-01") && on("CV-02") ? "RUN" : on("CV-01") || on("CV-02") ? "PARTIAL" : "STOP")],
      ["FQI-101", 1, "X", "Konsumsi batubara (hari ini)", "t", 0, null, [-77, 1.8, -9], {}, () => st.totalHari],
      ["WQI-101", 1, "X", "Inventori batubara (coal yard)", "t", 0, [8000, 15000, null, null], [-79.5, 1.8, 3], {}, () => st.stok],
      ["LIT-102", 1, "L", "Level bunker batubara", "%", 1, [15, 30, 97, null], [-23, 34.3, -9], {}, () => st.bunker],

      ["LIT-201", 2, "L", "Level steam drum", "mm", 0, [-150, -75, 75, 150], [9, 45.7, -10], {}, () => (st.g === "drum" ? 112 : 0) + (online() ? 0 : -40)],
      ["PIT-201", 2, "P", "Tekanan main steam (SH outlet)", "bar", 1, [null, 120, 180, 186], [-6, 38, 10], { r: 0.5 }, () => (online() ? 128 + 42 * L() : st.rpm > 0 ? 90 : 40)],
      ["TIT-201", 2, "T", "Suhu main steam", "°C", 1, [null, 500, 548, 556], [-6, 38, 7.4], { r: 0.5 }, () => (online() ? 540 - Math.max(0, 0.55 - L()) * 90 : 380)],
      ["FIT-201", 2, "F", "Flow feedwater ke ekonomiser", "t/h", 0, [null, null, 1050, null], [-3, 30, 8], { r: 0.35, sumbu: "z" }, () => st.mw * 3.08],
      ["FIT-202", 2, "F", "Flow main steam", "t/h", 0, [null, null, 1030, null], [-8.5, 17, 12], { r: 0.5 }, () => st.mw * 3.05],
      ["PIT-202", 2, "P", "Tekanan furnace", "Pa", 0, [-600, -300, 100, 300], [11, 16, 5.6], { r: 0.1 }, () => (nRun("ID") === 0 ? 450 : online() ? -60 : -150)],
      ["TIT-202", 2, "T", "Suhu furnace", "°C", 0, [null, null, 1400, 1450], [-11, 20, 5.6], { r: 0.1 }, () => (online() ? 760 + 500 * L() : 320)],
      ["TIT-203", 2, "T", "Suhu flue gas keluar APH", "°C", 1, [null, null, 160, 175], [23.6, 28, -10], { r: 0.1 }, () => (online() ? 112 + 25 * L() : 80)],
      ["AIT-201", 2, "A", "O₂ flue gas (boiler outlet)", "%", 2, [1.5, 2.5, 6, 8], [19, 1.8, 0], {}, () => (online() ? 3.4 + (1 - L()) * 2 + (nRun("FD") < 2 ? -0.9 : 0) : 20.9)],

      ["PIT-301", 3, "P", "Main steam pressure (inlet turbin)", "bar", 1, [null, 110, 176, 182], [-11, 17, 24], { r: 0.5 }, () => (online() ? 124 + 42 * L() : 0)],
      ["TIT-301", 3, "T", "Main steam temperature", "°C", 1, [null, 495, 545, 552], [-11, 17, 21], { r: 0.5 }, () => (online() ? 537 - Math.max(0, 0.55 - L()) * 90 : 300)],
      ["FIT-301", 3, "F", "Steam flow ke turbin", "t/h", 0, [null, null, 1030, null], [-11, 17, 27], { r: 0.5, sumbu: "z" }, () => st.mw * 3.04],
      ["SIT-301", 3, "Z", "Kecepatan turbin", "rpm", 0, [2850, 2950, 3090, 3300], [-7.6, 10.9, 31.35], { r: 0.15 }, () => st.rpm],
      ["VIT-301", 3, "V", "Vibrasi bearing #1", "µm", 0, [null, null, 125, 200], [-14.6, 10.9, 31.35], { r: 0.15 }, () => (st.rpm > 100 ? (st.g === "vib" ? 152 : 34) * (st.rpm / 3000) : 0)],
      ["TIT-302", 3, "T", "Suhu bearing turbin", "°C", 1, [null, null, 105, 115], [-0.4, 10.9, 31.35], { r: 0.15 }, () => (st.rpm > 100 ? 74 + 6 * L() + (st.g === "vib" ? 12 : 0) : 45)],
      ["PIT-302", 3, "P", "Tekanan lube oil", "bar", 2, [1.0, 1.5, null, null], [-20, 3, 35.2], { r: 0.1 }, () => (on("LOP-AC") ? 2.45 : on("LOP-DC") ? 1.8 : 0)],
      ["PIT-303", 3, "P", "Tekanan exhaust turbin", "kPa(a)", 1, [null, null, 15, 25], [7, 16.2, 30], { r: 0.15 }, () => condP()],
      ["ZIT-301", 3, "Z", "Axial displacement rotor", "mm", 2, [-1.0, -0.8, 0.8, 1.0], [13.4, 10.9, 31.35], { r: 0.15 }, () => (st.rpm > 100 ? 0.18 + 0.12 * L() : 0)],

      ["EIT-401", 4, "E", "Tegangan generator", "kV", 2, [18, 19, 21, 22], [16, 1.8, 39], {}, () => (on("EXC") && st.rpm > 2800 ? 20 : 0)],
      ["IIT-401", 4, "E", "Arus generator", "kA", 2, [null, null, 10.5, 11.5], [18.4, 1.8, 39], {}, () => st.mw * 0.0301],
      ["JIT-401", 4, "E", "Daya aktif", "MW", 1, [null, null, 315, 330], [20.8, 1.8, 39], {}, () => st.mw],
      ["JIT-402", 4, "E", "Daya reaktif", "MVAr", 1, [null, null, 180, 200], [23.2, 1.8, 39], {}, () => st.mw * 0.29],
      ["PF-401", 4, "E", "Power factor", "", 3, [0.8, 0.85, null, null], [25.6, 1.8, 39], {}, () => (st.mw > 1 ? 0.96 : 0)],
      ["SIT-401", 4, "E", "Frekuensi generator", "Hz", 2, [49, 49.5, 50.5, 51], [28, 1.8, 39], {}, () => (st.mw > 1 ? 50 : (st.rpm / 3000) * 50)],
      ["TIT-401", 4, "T", "Suhu generator (cold gas)", "°C", 1, [null, null, 50, 55], [21.5, 13.6, 30], { r: 0.15 }, () => 38 + 6 * L()],
      ["TIT-402", 4, "T", "Suhu bearing generator", "°C", 1, [null, null, 95, 105], [15.8, 10.9, 31.35], { r: 0.15 }, () => (st.rpm > 100 ? 66 + 6 * L() : 42)],
      ["TIT-403", 4, "T", "Suhu belitan stator", "°C", 1, [null, null, 120, 130], [25, 13.6, 30], { r: 0.15 }, () => 58 + 38 * L() * L()],

      ["PIT-501", 5, "P", "Vakum kondensor", "kPa(g)", 1, [null, null, -85, -80], [5, 4.6, 34.3], { r: 0.1 }, () => condP() - 101.3],
      ["PIT-502", 5, "P", "Tekanan kondensor", "kPa(a)", 1, [null, null, 15, 20], [9, 4.6, 34.3], { r: 0.1 }, () => condP()],
      ["FIT-501", 5, "F", "Flow cooling water", "m³/h", 0, [null, 20000, null, null], [60, 1.18, 50], { r: 0.9 }, () => nRun("CWP") * 18200],
      ["TIT-501", 5, "T", "Suhu CW keluar kondensor", "°C", 1, [null, null, 42, 45], [60, 2.4, 54], { r: 0.9 }, () => 30.4 + (nRun("CWP") ? (9.5 * L() * 2) / Math.min(2, nRun("CWP")) : 0)],
      ["TIT-502", 5, "T", "Suhu air cooling tower (basin)", "°C", 1, [null, null, 33, 35], [105.6, 1.18, 32], { r: 0.6 }, () => 30.4],
      ["LIT-501", 5, "L", "Level hotwell kondensor", "mm", 0, [300, 400, 800, 900], [0.2, 6.2, 30], {}, () => st.hotwell],
      ...["A", "B", "C"].map((h, i) => ["XS-501" + h, 5, "S", "Status CW pump " + h, "", 0, null, [101.8, 0.5, 26.6 + i * 4], {}, () => ALAT["CWP-" + h].st.toUpperCase().replace("STANDBY", "STBY")]),

      ["FIT-601", 6, "F", "Flow feedwater (BFP)", "t/h", 0, [null, null, 1050, null], [16, 3.6, 10.35], { r: 0.35 }, () => st.mw * 3.08],
      ["PIT-601", 6, "P", "Tekanan feedwater", "bar", 1, [null, 150, 215, 225], [11, 3.6, 10.35], { r: 0.35 }, () => (nRun("BFP") && st.rpm > 0 ? 160 + 40 * L() : 0)],
      ["TIT-601", 6, "T", "Suhu feedwater (keluar HPH)", "°C", 1, [null, 200, 270, 280], [-3, 20, 10.35], { r: 0.35 }, () => (online() ? 205 + 48 * L() : 150)],
      ["LIT-601", 6, "L", "Level deaerator", "%", 1, [15, 30, 80, 90], [29, 21.85, 11.5], {}, () => st.da],
      ["PIT-602", 6, "P", "Tekanan deaerator", "bar", 2, [null, 2, 9, 10], [22.5, 20, 11.5], { r: 1.8 }, () => (online() ? 3 + 4.6 * L() : 1.2)],
      ...["A", "B", "C"].map((h, i) => ["XS-601" + h, 6, "S", "Status BFP " + h, "", 0, null, [21 + i * 5, 0, 14.3], {}, () => ALAT["BFP-" + h].st.toUpperCase().replace("STANDBY", "STBY")]),
      ["VIT-601", 6, "V", "Vibrasi BFP A", "mm/s", 2, [null, null, 7.1, 11], [21, 1.5, 12.25], { r: 0.5 }, () => (on("BFP-A") ? 2.6 + 0.4 * L() : 0)],

      ["AIT-701", 7, "A", "O₂ cerobong", "%", 2, [null, null, 10, 12], cems(0), { tiang: false }, () => (online() ? 6.1 + (1 - L()) * 2 : 20.9)],
      ["AIT-702", 7, "A", "CO", "mg/Nm³", 0, [null, null, 200, 400], cems(1), { tiang: false }, () => (online() ? 42 : 0)],
      ["AIT-703", 7, "A", "CO₂", "%", 2, [null, null, 15, 16], cems(2), { tiang: false }, () => (online() ? 12.6 * (0.85 + 0.15 * L()) : 0.04)],
      ["AIT-704", 7, "A", "NOx", "mg/Nm³", 0, [null, null, 450, 550], cems(3), { tiang: false }, () => (online() ? 300 + 85 * L() : 0)],
      ["AIT-705", 7, "A", "SO₂", "mg/Nm³", 0, [null, null, 450, 550], cems(4), { tiang: false }, () => (!online() ? 0 : st.g === "so2" ? 612 : on("FGD") ? 185 : 1350)],
      ["AIT-706", 7, "A", "Debu / partikulat", "mg/Nm³", 1, [null, null, 80, 100], cems(5), { tiang: false }, () => (!online() ? 0 : on("ESP") ? 27 : 265)],
      ["TIT-701", 7, "T", "Suhu gas cerobong", "°C", 1, [null, null, 80, 95], [84.6, yP + 2.2, -10], { r: 0.1 }, () => (online() ? (on("FGD") ? 52 : 128) : 35)],
      ["FIT-701", 7, "F", "Flow gas cerobong", "kNm³/h", 0, [null, null, 1200, null], [91.4, yP + 2.2, -10], { r: 0.25, sumbu: "z" }, () => (online() ? 1060 * (0.4 + 0.6 * L()) : 0)],

      ["EIT-801", 8, "E", "Tegangan trafo GSU (sisi 150 kV)", "kV", 1, [135, 140, 160, 165], [60, 1.8, 24], {}, () => (on("CB-150") ? 150.4 : st.mw > 1 ? 150.4 : 0)],
      ["IIT-801", 8, "E", "Arus trafo GSU", "A", 0, [null, null, 1300, 1450], [62.4, 1.8, 24], {}, () => st.mw * 4.01],
      ["TIT-801", 8, "T", "Suhu minyak / belitan trafo", "°C", 1, [null, null, 90, 105], [53, 4.9, 30], { r: 0.15 }, () => 42 + 26 * L() * L() + (st.g === "trafo" ? 32 : 0)],
      ["XS-801", 8, "S", "Status PMT 150 kV", "", 0, null, [76.5, 0, 63], {}, () => (on("CB-150") ? "CLOSED" : "OPEN")],
      ["EIT-802", 8, "E", "Tegangan busbar 150 kV", "kV", 1, [135, 140, 160, 165], [78.6, 1.8, 63.6], {}, () => 150.2],
      ["SIT-801", 8, "E", "Frekuensi jaringan", "Hz", 2, [49, 49.5, 50.5, 51], [81, 1.8, 63.6], {}, () => 50],
      ["JIT-801", 8, "E", "Daya ekspor ke grid", "MW", 1, [null, null, 320, null], [83.4, 1.8, 63.6], {}, () => Math.max(0, st.mw - auxMW())],
      ["JIT-802", 8, "E", "Daya impor dari grid", "MW", 1, [null, null, 25, null], [85.8, 1.8, 63.6], {}, () => (st.mw > auxMW() ? 0 : auxMW() - st.mw)],

      ["XS-901", 9, "S", "Status motor auxiliary", "", 0, null, [-39.5, 0, 36.5], {}, () => `${Object.values(ALAT).filter((a) => a.st === "run").length}/${Object.keys(ALAT).length} RUN`],
      ["IIT-901", 9, "E", "Arus motor ID fan A", "A", 0, [null, null, 520, 580], [58, 1.8, 1], {}, () => (on("ID-A") && st.rpm > 0 ? 260 + 180 * L() : 0)],
      ["TIT-901", 9, "T", "Suhu motor ID fan A", "°C", 1, [null, null, 110, 120], [56.6, 1.6, -16], { r: 0.9 }, () => (on("ID-A") ? 64 + 18 * L() : 35)],
      ["PIT-901", 9, "P", "Tekanan discharge pompa ACW", "bar", 2, [null, 3, 6.5, null], [-38, 3.4, 42], { r: 0.25 }, () => (nRun("ACW") ? 4.6 : 0)],
      ["PIT-902", 9, "P", "Tekanan air compressor", "bar", 2, [null, 6.5, 9.5, null], [-40, 2.2, 30], { r: 0.15 }, () => (nRun("AC") ? 8.2 : st.udara)],
      ["PIT-903", 9, "P", "Tekanan instrument air", "bar", 2, [5.0, 5.5, null, null], [-28, 5, 30], { r: 0.15 }, () => st.udara],
      ["JIT-901", 9, "E", "Konsumsi daya auxiliary", "MW", 2, [null, null, 24, null], [60, 1.8, 46], {}, () => auxMW()],
    ].map(([tag, sek, tipe, ket, satuan, d, lim, pos, opsi, rumus]) => ({ tag, sek, tipe, ket, satuan, d, lim, pos, opsi, rumus, nilai: null, status: "N" }));
    const cariInst = {};
    INST.forEach((I) => { I.obj = W.instrumen(S, I.tipe, I.pos[0], I.pos[1], I.pos[2], I.opsi); cariInst[I.tag] = I; });

    function condP() {                                             // tekanan kondensor kPa(a)
      const cw = nRun("CWP");
      if (cw === 0) return st.rpm > 0 ? 28 : 18;
      return 7.4 + 3.2 * L() * (cw >= 2 ? 1 : 2) + (st.g === "vakum" ? 8.2 : 0);
    }
    function auxMW() { return st.rpm > 0 || st.mw > 1 ? 4.2 + 14.3 * L() : 3.1; }

    /* ======================================================
       LABEL 3D
       ====================================================== */
    const ringkas = {
      1: () => `${fmt(st.mw * 0.473, 1)} t/h · stok ${fmt(st.stok)} t`,
      2: () => (online() ? `${fmt(nilai("PIT-201"), 1)} bar · ${fmt(nilai("TIT-201"))} °C` : { t: "Boiler OFF", off: true }),
      3: () => (st.rpm > 0 ? `${fmt(st.rpm)} rpm · ${fmt(nilai("VIT-301"))} µm` : { t: "Turning gear", off: true }),
      4: () => (st.mw > 1 ? `${fmt(st.mw, 1)} MW · ${fmt(nilai("SIT-401"), 2)} Hz` : { t: st.trip ? "TRIP" : "Off-line", off: true }),
      5: () => `Vakum ${fmt(nilai("PIT-501"), 1)} kPa · CW ${nRun("CWP")}/3`,
      6: () => `${fmt(nilai("FIT-601"))} t/h · DA ${fmt(st.da)} %`,
      7: () => `SO₂ ${fmt(nilai("AIT-705"))} · NOx ${fmt(nilai("AIT-704"))} · Debu ${fmt(nilai("AIT-706"))}`,
      8: () => (on("CB-150") ? `Ekspor ${fmt(nilai("JIT-801"), 1)} MW · 150 kV` : { t: "PMT OPEN", off: true }),
      9: () => `Aux ${fmt(auxMW(), 1)} MW · udara ${fmt(st.udara, 1)} bar`,
    };
    const posSeksi = { 1: [-96, 16, -20], 2: [-2, 57, -10], 3: [-6, 29.5, 24], 4: [24, 29.5, 36], 5: [118, 20, 50], 6: [26, 26, 8], 7: [88, yP + 7, -10], 8: [82, 18, 76], 9: [-48, 10.5, 30] };
    const lblSeksi = SEKSI.map((s) => {
      const L = label(v, `${s.id} · ${s.ikon} ${s.nama}`, ...posSeksi[s.id], () => ringkas[s.id](), () => pilihSeksi(s.id, true));
      L.el.classList.add("sek"); return L;
    });
    label(v, "ESP", 36, 23, -10, () => (on("ESP") ? "Efisiensi 99,7 %" : { t: "OFF", off: true }));
    label(v, "FGD Absorber", 70, 34, -10, () => (on("FGD") ? "Removal 94 %" : { t: "OFF", off: true }));
    label(v, "Cooling Tower", 130, 38, -12, () => `ΔT ${fmt(nilai("TIT-501") - nilai("TIT-502"), 1)} °C`);
    label(v, "Central Control Room", -55, 17, 68, () => "DCS · 2 operator");
    label(v, "Transmisi 150 kV", 150, 38, 68, () => `${fmt(nilai("JIT-801"), 1)} MW ke grid`);
    const lblInst = INST.map((I) => { const Lb = label(v, I.tag, I.obj.titik.x, I.obj.titik.y, I.obj.titik.z, () => teksNilai(I), () => fokusInstrumen(I.tag)); Lb.el.classList.add("tag"); return Lb; });

    /* ======================================================
       LOGIKA PROSES
       ====================================================== */
    const nilai = (tag) => cariInst[tag].nilai ?? 0;
    function teksNilai(I) {
      if (I.tipe === "S") return I.rumus();
      return fmt(I.nilai ?? 0, I.d) + (I.satuan ? " " + I.satuan : "");
    }
    // State-based alarming (ISA-18.2): saat unit off-line, alarm akibat shutdown di area proses disembunyikan
    const TETAP_AKTIF = ["PIT-302", "LIT-601", "PIT-903", "PIT-501", "PIT-502", "TIT-801"];
    function cekStatus(I) {
      if (!online() && [2, 3, 4, 6, 7].includes(I.sek) && !TETAP_AKTIF.includes(I.tag)) return "N";
      if (I.tipe === "S") { const t = String(I.rumus()); return t.startsWith("STOP") || t === "OPEN" ? "H" : "N"; }
      if (!I.lim) return "N";
      const [LL, Lo, H, HH] = I.lim, x = I.nilai;
      if (HH != null && x >= HH) return "HH";
      if (LL != null && x <= LL) return "LL";
      if (H != null && x >= H) return "H";
      if (Lo != null && x <= Lo) return "L";
      return "N";
    }
    const log = [];
    function catat(teks, warna = "#cbd5e1") { log.unshift({ j: jam(), teks, warna }); if (log.length > 8) log.pop(); }

    function cekProteksi() {                                      // kondisi yang membuat unit trip
      if (!on("TG")) return "Turbine stop valve ditutup";
      if (!on("GEN-CB")) return "Generator CB open (load rejection)";
      if (!on("CB-150")) return "PMT 150 kV open";
      if (!on("EXC")) return "Loss of excitation";
      if (nRun("BFP") === 0) return "Semua BFP berhenti";
      if (nRun("CWP") === 0) return "Vakum rendah – semua CW pump berhenti";
      if (nRun("FD") === 0 || nRun("ID") === 0) return "Semua FD / ID fan berhenti (MFT)";
      if (nRun("CM") === 0) return "Kehilangan bahan bakar (semua mill stop)";
      if (!on("LOP-AC") && !on("LOP-DC")) return "Tekanan lube oil LL";
      if (st.da < 12) return "Level deaerator LL";
      if (st.udara < 4.8) return "Instrument air LL";
      if (st.g === "trip") return "Proteksi generator (differential 87G)";
      return "";
    }
    function kapasitas() {
      return Math.min(330, nRun("CM") * 116, nRun("BFP") * 180, nRun("FD") * 180, nRun("ID") * 180, nRun("CWP") >= 2 ? 330 : 230);
    }

    function hitung() {
      const sebab = cekProteksi();
      if (sebab && !st.trip && (st.mw > 1 || st.rpm > 0)) {
        st.trip = true; st.sebabTrip = sebab;
        catat("⛔ UNIT TRIP – " + sebab, "#f87171"); toast("UNIT TRIP – " + sebab);
      }
      if (st.trip) {
        st.mw = Math.max(0, st.mw * 0.35 - 2);
        st.rpm = Math.max(0, st.rpm - 75);
      } else if (st.rpm < 3000) {                                   // start-up: turbin naik putaran dulu
        st.rpm = Math.min(3000, st.rpm + 150);
        if (st.rpm === 3000) catat("✓ Turbin 3.000 rpm – generator sinkron ke grid", "#4ade80");
      } else {
        const target = Math.min(st.sp, kapasitas());
        st.mw += Math.max(-4, Math.min(4, target - st.mw)) + rand(-0.25, 0.25);
        st.mw = Math.max(0, st.mw);
      }
      // persediaan bahan bakar
      const batubara = st.mw * 0.473;                               // t/jam
      st.totalHari += (batubara / 3600) * 60;                      // simulasi dipercepat 60x
      if (on("CV-01") && on("CV-02") && st.bunker < 95) { st.bunker += 0.06; st.stok -= 0.6; }
      st.bunker = Math.max(0, st.bunker - (batubara / 142) * 0.04);
      st.hsd = Math.max(2, st.hsd - (nRun("P-101") && st.rpm > 0 && st.mw < 120 ? 0.02 : 0));
      // deaerator & hotwell
      st.da += nRun("CEP") ? (55 - st.da) * 0.1 : -1.4;
      st.hotwell += nRun("CEP") ? (600 - st.hotwell) * 0.1 : 9;
      // instrument air
      st.udara += nRun("AC") ? (6.6 - st.udara) * 0.2 : -0.09;
      // nilai instrumen (dihaluskan + noise kecil)
      INST.forEach((I) => {
        const lama = I.status;
        if (I.tipe !== "S") {
          const target = I.rumus();
          const bising = Math.abs(target) * 0.004;
          I.nilai = I.nilai == null ? target : I.nilai + (target - I.nilai) * 0.35 + rand(-bising, bising);
        }
        I.status = cekStatus(I);
        if (lama !== I.status && I.status !== "N") catat(`⚠ ${I.tag} ${I.status} – ${I.ket} ${teksNilai(I)}`, I.status.length === 2 ? "#f87171" : "#fbbf24");
        if (lama !== "N" && I.status === "N") catat(`✓ ${I.tag} kembali normal`, "#4ade80");
      });
    }

    function resetUnit() {
      const sebab = cekProteksi();
      if (sebab) { toast("Belum bisa start: " + sebab); catat("✗ Reset ditolak – " + sebab, "#fbbf24"); return; }
      st.trip = false; st.sebabTrip = ""; st.sp = Math.max(st.sp, 150);
      catat("▶ Reset trip – turbin run-up & sinkronisasi", "#38bdf8");
      renderPanel();
    }
    function gantiSkenario(b) {
      const s = SKENARIO[st.iSken % SKENARIO.length]; st.iSken++;
      st.g = s.k;
      catat((s.k ? "🧪 Simulasi: " : "✓ ") + s.t, s.k ? "#fbbf24" : "#4ade80");
      toast((s.k ? "Simulasi gangguan: " : "") + s.t);
      b.textContent = s.k ? "⚠ " + s.t : "⚠ Simulasi Gangguan";
      if (!s.k) {
        Object.values(ALAT).forEach((a) => { const awal = ALAT_AWAL.find((x) => x[0] === a.tag); a.st = awal[3]; });
        st.da = 55; st.udara = 6.6; st.sp = 300;
        if (st.trip) setTimeout(resetUnit, 300);
      }
      pilihSeksi(s.sek, true);
    }
    function grupDari(tag) { return tag.startsWith("LOP") ? "LOP" : tag.slice(0, -1); }
    function tombolAlat(tag) {
      const a = ALAT[tag];
      if (a.st === "run") {
        a.st = "stop"; catat(`■ ${tag} ${a.nama} dihentikan operator`, "#fbbf24");
        const cadangan = Object.values(ALAT).find((x) => x.tag !== tag && grupDari(x.tag) === grupDari(tag) && x.st === "standby");
        if (cadangan) { cadangan.st = "run"; catat(`↻ Auto changeover: ${cadangan.tag} mengambil alih`, "#38bdf8"); }
      } else { a.st = "run"; catat(`▶ ${tag} ${a.nama} dijalankan`, "#4ade80"); }
      hitung(); renderPanel(); renderRingkasan();
    }

    function pilihSeksi(id, terbang) { st.sek = id; if (terbang) v.orbit.ke(SEKSI[id - 1].preset); renderPanel(); }
    function fokusInstrumen(tag) {
      const I = cariInst[tag];
      st.sek = I.sek; st.fokus = tag; st.fokusSampai = performance.now() + 4000;
      const p = I.obj.titik;
      v.orbit.ke([v.orbit.theta, 0.95, 22, [p.x, p.y - 0.5, p.z]]);
      renderPanel();
    }

    const elK = (k) => v.el.querySelector(`[data-k="${k}"]`);
    elK("tbl").onclick = (e) => { const tr = e.target.closest("tr[data-tag]"); if (tr) fokusInstrumen(tr.dataset.tag); };
    elK("ktrl").onclick = (e) => {
      const b = e.target.closest("[data-alat],[data-aksi]"); if (!b) return;
      if (b.dataset.alat) return tombolAlat(b.dataset.alat);
      if (b.dataset.aksi === "reset") resetUnit();
      if (b.dataset.aksi === "naik") { st.sp = Math.min(330, st.sp + 10); catat(`Setpoint beban → ${st.sp} MW`, "#38bdf8"); renderPanel(); }
      if (b.dataset.aksi === "turun") { st.sp = Math.max(150, st.sp - 10); catat(`Setpoint beban → ${st.sp} MW`, "#38bdf8"); renderPanel(); }
    };
    v.el.querySelectorAll("[data-sek]").forEach((b) => (b.onclick = () => pilihSeksi(+b.dataset.sek, true)));
    elK("alm").onclick = (e) => { const r = e.target.closest("[data-tag]"); if (r) fokusInstrumen(r.dataset.tag); };

    function renderPanel() {
      const s = SEKSI[st.sek - 1];
      elK("sekNama").textContent = `${s.id}. ${s.nama}`;
      v.el.querySelectorAll("[data-sek]").forEach((b) => b.classList.toggle("active", +b.dataset.sek === st.sek));
      elK("tbl").innerHTML = INST.filter((I) => I.sek === st.sek).map((I) => `
        <tr data-tag="${I.tag}" class="${I.status !== "N" ? "alm" : ""} ${st.fokus === I.tag ? "fokus" : ""}">
          <td><b>${I.tag}</b><small>${I.ket}</small></td><td class="v">${teksNilai(I)}</td>
          <td><span class="dotst ${I.status}">${I.status === "N" ? "OK" : I.status}</span></td></tr>`).join("");
      let extra = "";
      if (st.sek === 3 || st.sek === 4) extra += `<div class="v3-row"><span style="font-size:10.5px"><b>UNIT</b> ${st.trip ? '<span style="color:#f87171">TRIP</span>' : st.rpm < 3000 ? "Run-up" : "Online"}</span>
          <button class="btn sm ${st.trip ? "green" : ""}" data-aksi="reset" ${st.trip ? "" : "disabled"}>▶ Reset & Sinkron</button></div>`;
      if (st.sek === 4) extra += `<div class="v3-row"><span style="font-size:10.5px"><b>Setpoint</b> ${st.sp} MW</span>
          <span><button class="btn sm" data-aksi="turun">−10</button> <button class="btn sm" data-aksi="naik">+10</button></span></div>`;
      elK("ktrl").innerHTML = extra + Object.values(ALAT).filter((a) => a.sek === st.sek).map((a) => `
        <div class="v3-row"><span style="font-size:10.5px"><b>${a.tag}</b> ${a.nama}</span>
          <span class="toggle ${a.st === "run" ? "" : "off"}" style="${a.st === "standby" ? "color:#fbbf24" : ""}">${a.st === "run" ? "RUN" : a.st === "standby" ? "STBY" : "STOP"}</span>
          <button class="btn sm ${a.st === "run" ? "red" : ""}" data-alat="${a.tag}">${a.st === "run" ? "■ Stop" : "▶ Start"}</button></div>`).join("");
      Object.values(ALAT).forEach((a) => { if (a.obj && a.obj.set) a.obj.set(a.st); });
      ["A", "B", "C"].forEach((h) => { W.setStackLight(cariInst["XS-501" + h].obj, ALAT["CWP-" + h].st); W.setStackLight(cariInst["XS-601" + h].obj, ALAT["BFP-" + h].st); });
      W.setStackLight(cariInst["XS-101"].obj, on("CV-01") && on("CV-02") ? "run" : "standby");
      W.setStackLight(cariInst["XS-801"].obj, on("CB-150") ? "run" : "stop");
      W.setStackLight(cariInst["XS-901"].obj, st.trip ? "stop" : "run");
      tkHSD.setLevel(st.hsd);
    }
    function renderRingkasan() {
      const set = (k, h) => (elK(k).innerHTML = h);
      const merah = (tag) => (cariInst[tag].status === "N" ? "" : ' style="color:#f87171"');
      const ef = st.mw > 1 ? 38.4 - (1 - L()) * 5 : 0;
      set("unit", st.trip
        ? `<div class="wtp-alm on">⛔ UNIT TRIP<br><span style="font-weight:400;font-size:10px">${st.sebabTrip}</span></div>`
        : st.rpm < 3000 ? `<div class="wtp-alm" style="background:#422006;color:#fcd34d">⏳ Run-up ${fmt(st.rpm)} rpm</div>`
        : `<div class="wtp-alm">● ONLINE · sinkron grid 150 kV</div>`);
      set("mw", `${fmt(st.mw, 1)} / ${st.sp} MW`);
      set("ef", st.mw > 1 ? `${fmt(ef, 1)} % · ${fmt(3600 / (ef / 100))} kJ/kWh` : "–");
      set("hz", `<span${merah("SIT-401")}>${fmt(nilai("SIT-401"), 2)} Hz</span>`);
      set("coal", `${fmt(st.mw * 0.473, 1)} t/h`);
      set("steam", online() ? `<span${merah("TIT-201")}>${fmt(nilai("FIT-202"))} t/h · ${fmt(nilai("PIT-201"))} bar · ${fmt(nilai("TIT-201"))} °C</span>` : "–");
      set("vak", `<span${merah("PIT-501")}>${fmt(nilai("PIT-501"), 1)} kPa(g)</span>`);
      set("so2", `<span${merah("AIT-705")}>${fmt(nilai("AIT-705"))}</span> / <span${merah("AIT-704")}>${fmt(nilai("AIT-704"))}</span> mg/Nm³`);
      set("dust", `<span${merah("AIT-706")}>${fmt(nilai("AIT-706"), 1)} mg/Nm³</span>`);
      set("exp", `${fmt(nilai("JIT-801"), 1)} MW`);
      const aktif = INST.filter((I) => I.status !== "N");
      set("alm", aktif.length
        ? `<div class="wtp-alm on">🔔 ${aktif.length} alarm aktif</div>${aktif.slice(0, 5).map((I) => `<div class="wtp-almrow" data-tag="${I.tag}"><b>${I.tag}</b> ${I.status} · ${teksNilai(I)}</div>`).join("")}`
        : `<div class="wtp-alm">✓ Semua parameter normal</div>`);
      set("log", log.map((l) => `<div><span class="muted">${l.j}</span> <span style="color:${l.warna}">${l.teks}</span></div>`).join(""));
    }

    /* ---------- Kamera ---------- */
    v.preset = { Overview: [1.35, 0.92, 330, [10, 0, 15]] };
    SEKSI.forEach((s) => (v.preset[s.nama] = s.preset));
    v.orbit.ke(v.preset.Overview);

    /* ======================================================
       ANIMASI TIAP FRAME
       ====================================================== */
    let tLalu = 0;
    v.updaters.push((t) => {
      const dt = Math.min(0.1, (t - tLalu) / 1000); tLalu = t;
      alir.forEach((a) => a.a.update(dt, a.q ? a.q() : 0));
      const ekspor = Math.max(0, st.mw - auxMW()) / 300;
      listrik.forEach((a) => a.update(dt, on("CB-150") ? ekspor * 1.4 : 0));
      // stacker reclaimer bergerak & berputar
      if (on("SR-01")) {
        sr.g.position.x = -100 + Math.sin(t / 22000) * 14;
        sr.slew.rotation.y = Math.PI / 2 + Math.sin(t / 9000) * 0.7;
        sr.roda.rotation.z -= dt * 2.5;
      }
      // poros turbin-generator berputar
      tg.kopling.forEach((k) => (k.rotation.x += dt * (st.rpm / 3000) * 14));
      // api di boiler
      const api = online() ? 0.75 + Math.random() * 0.25 : 0.08;
      blr.nyala.color.setRGB(api, api * 0.5, api * 0.12);
      gAsap.visible = online();
      if (online()) animAsap(t);
      animCT1(t); animCT2(t);
      // lampu penerbangan berkedip
      const kedip = Math.sin(t / 400) > 0;
      stack.lampu.forEach((l) => (l.visible = kedip)); menara.forEach((m) => (m.lampu.visible = kedip));
      // halo alarm / fokus
      const fokusAktif = Boolean(st.fokus) && performance.now() < st.fokusSampai;
      INST.forEach((I, i) => {
        const alarm = I.status !== "N", lihat = Boolean(fokusAktif && st.fokus === I.tag);
        I.obj.halo.visible = (alarm && Math.sin(t / 220) > -0.2) || lihat;
        I.obj.halo.material.color.setHex(lihat && !alarm ? 0x22d3ee : 0xffffff);
        const k = 1.8 + Math.sin(t / 160) * 0.35; I.obj.halo.scale.set(k, k, 1);
        lblInst[i].el.style.visibility = st.tag || (v.orbit.r < 90 && I.sek === st.sek) || alarm || lihat ? "" : "hidden";
        lblInst[i].el.classList.toggle("alm", alarm);
      });
      lblSeksi.forEach((Lb) => (Lb.el.style.opacity = v.orbit.r < 90 ? 0.55 : 1));
    });

    v.detik = () => { hitung(); renderPanel(); renderRingkasan(); };
    catat("Unit 1 online 300 MW – sinkron grid 150 kV", "#4ade80");
    hitung(); hitung(); renderPanel(); renderRingkasan();
    return v;
  }

  Scene3D.daftar("power3d", buatPLTU);
})();
