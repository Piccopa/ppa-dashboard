/* =========================================================
   WTP-SCENE.JS — MODUL "WATER TREATMENT 3D"
   Water Treatment Plant untuk Power Plant, 7 area:
     1. Raw Water Intake          5. Demineralization / Mixed Bed
     2. Coagulation & Clarifier   6. Chemical Dosing System
     3. Multimedia Filter (MMF)   7. Treated Water Storage & Distribution
     4. Reverse Osmosis (RO)
   Model 3D peralatan diambil dari js/wtp3d.js (Wtp3D.*).
   Kerangka tampilan (panel, kamera, label) dari js/scenes3d.js (Scene3D.alat).
   Semua angka adalah SIMULASI. Nanti bisa diganti data PLC/SCADA asli
   (lihat fungsi hitung() di bawah).
   ========================================================= */

(() => {
  if (typeof Scene3D === "undefined" || !Scene3D.daftar || typeof Wtp3D === "undefined") return;

  /* ---------- 7 area WTP + posisi kamera masing-masing ---------- */
  // preset kamera: [sudut putar, sudut tinggi, jarak, [titik tengah x, y, z]]
  const SEKSI = [
    { id: 1, nama: "Raw Water Intake", pendek: "Intake", ikon: "🌊", preset: [1.05, 0.95, 44, [-102, 2, 0]] },
    { id: 2, nama: "Coagulation & Clarifier", pendek: "Clarifier", ikon: "🧪", preset: [1.3, 0.9, 72, [-62, 2, -6]] },
    { id: 3, nama: "Multimedia Filter", pendek: "MMF", ikon: "🧱", preset: [1.35, 0.8, 46, [-8, 3, -8]] },
    { id: 4, nama: "Reverse Osmosis", pendek: "RO", ikon: "🧬", preset: [1.4, 0.8, 48, [26, 2, -9]] },
    { id: 5, nama: "Demin / Mixed Bed", pendek: "Demin", ikon: "💎", preset: [1.45, 0.82, 48, [56, 4, -11]] },
    { id: 6, nama: "Chemical Dosing", pendek: "Dosing", ikon: "⚗️", preset: [1.5, 0.85, 62, [-16, 2, 20]] },
    { id: 7, nama: "Storage & Distribution", pendek: "Storage", ikon: "🛢️", preset: [1.25, 0.95, 72, [92, 4, -3]] },
  ];

  /* ---------- Peralatan yang bisa di-Start/Stop ---------- */
  // st: "run" = jalan, "standby" = cadangan siap, "stop" = mati
  const ALAT_AWAL = [
    ["P-101A", 1, "Intake Pump A", "run"], ["P-101B", 1, "Intake Pump B", "run"], ["P-101C", 1, "Intake Pump C", "standby"],
    ["M-201", 2, "Flash Mixer", "run"], ["M-202", 2, "Flocculator", "run"], ["CL-201", 2, "Clarifier Scraper", "run"],
    ["P-301A", 3, "MMF Feed Pump A", "run"], ["P-301B", 3, "MMF Feed Pump B", "standby"],
    ["P-401A", 4, "RO HP Pump Train A", "run"], ["P-401B", 4, "RO HP Pump Train B", "run"],
    ["B-501", 5, "Degasser Blower", "run"], ["P-501A", 5, "Demin Feed Pump A", "run"], ["P-501B", 5, "Demin Feed Pump B", "standby"],
    ["DP-601", 6, "Dosing PAC", "run"], ["DP-602", 6, "Dosing NaOH", "run"], ["DP-603", 6, "Dosing NaOCl", "run"],
    ["DP-604", 6, "Dosing Antiscalant", "run"], ["DP-605", 6, "Dosing SMBS", "run"], ["DP-606", 6, "Dosing HCl", "run"],
    ["P-701A", 7, "Distribution Pump A", "run"], ["P-701B", 7, "Distribution Pump B", "run"], ["P-701C", 7, "Distribution Pump C", "standby"],
  ];

  /* ---------- Tangki kimia (area 6) ---------- */
  const KIMIA = [
    { kode: "PAC", nama: "PAC (koagulan)", warna: 0xd6a73a, bahaya: "#f59e0b" },
    { kode: "NaOH", nama: "NaOH (kaustik)", warna: 0xe0e7ff, bahaya: "#ef4444" },
    { kode: "NaOCl", nama: "NaOCl (klorin)", warna: 0xd9f99d, bahaya: "#facc15" },
    { kode: "ANTISCALANT", nama: "Antiscalant RO", warna: 0x60a5fa, bahaya: "#3b82f6" },
    { kode: "SMBS", nama: "SMBS (deklorinasi)", warna: 0xfef3c7, bahaya: "#a855f7" },
    { kode: "HCl", nama: "HCl (regenerasi)", warna: 0xfde047, bahaya: "#ef4444" },
  ];
  const X_KIMIA = [-38, -29, -20, -11, -2, 7];

  /* ---------- Skenario gangguan untuk latihan operator ---------- */
  const SKENARIO = [
    { k: "keruh", t: "Air baku keruh (banjir) – turbidity naik" },
    { k: "dp", t: "MMF tersumbat – ΔP naik, backwash otomatis" },
    { k: "fouling", t: "Membran RO fouling – ΔP & konduktivitas naik" },
    { k: "silika", t: "Silica breakthrough Mixed Bed – perlu regenerasi" },
    { k: "kimia", t: "Level tangki NaOCl turun cepat" },
    { k: null, t: "Kembali normal" },
  ];

  function buatWTP() {
    const { kerangka, dunia3D, label, pohon } = Scene3D.alat;
    const W = Wtp3D;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    /* ======================================================
       STATUS PROSES (semua angka simulasi ada di sini)
       ====================================================== */
    const st = {
      g: null, iSken: 0, backwash: 0, dp: 0.36, sludge: 1.05, tk: [72, 61],
      kimia: [62, 48, 55, 71, 40, 66], tag: false, sek: 1, fokus: null, fokusSampai: 0,
    };
    const ALAT = {};
    ALAT_AWAL.forEach(([tag, sek, nama, s]) => (ALAT[tag] = { tag, sek, nama, st: s, obj: null }));
    const on = (tag) => ALAT[tag].st === "run";
    const nRun = (awal) => Object.values(ALAT).filter((a) => a.tag.startsWith(awal) && a.st === "run").length;
    const Q = { raw: 0, clar: 0, mmf: 0, ro: 0, perm: 0, rej: 0, demin: 0, dist: 0 };

    /* ======================================================
       KERANGKA TAMPILAN (panel kiri, panel kanan, tombol bawah)
       ====================================================== */
    const v = kerangka("water3d", {
      judul: `💧 Water Treatment 3D – ${CONFIG.namaSingkat} WTP Power Plant`,
      bar: {
        t1: CONFIG.namaSingkat.toUpperCase(), t1s: "WATER TREATMENT", t2: "Digital Twin 3D – Water Treatment Plant (Power Plant)",
        t3: "Intake · Clarifier · MMF · Reverse Osmosis · Demin / Mixed Bed · Chemical Dosing · Storage & Distribusi",
      },
      kiri: `<h5>▮ Ringkasan Proses</h5>
        ${[["raw", "Air baku masuk"], ["ntu", "Turbidity clarifier"], ["dp", "ΔP MMF"], ["rec", "Recovery RO"], ["cperm", "Konduktivitas permeate"],
          ["cdem", "Konduktivitas demin"], ["sio2", "Silica demin"], ["lvl", "Level tangki demin"], ["pdist", "Tekanan distribusi"]]
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
        { label: "🏷️ Tag Instrumen", aksi: (v, b) => { st.tag = !st.tag; b.classList.toggle("active", st.tag); } },
        { label: "🔄 Auto-Rotate", aksi: (v, b) => { v.orbit.auto = !v.orbit.auto; b.classList.toggle("active", v.orbit.auto); } },
        { label: "🔁 Backwash MMF", aksi: () => mulaiBackwash("manual oleh operator") },
        { label: "⚠ Simulasi Gangguan", bahaya: true, aksi: (v, b) => gantiSkenario(b) },
      ],
    });
    v.el.querySelector("[data-kiri]").classList.add("wtp");
    v.el.querySelector("[data-kanan]").classList.add("wtp", "wtp-kanan");
    v.el.querySelector(".v3-bottom").style.maxWidth = "780px";

    dunia3D(v, 0xcfe6f3);
    v.langitSiang = 0xcfe6f3;
    v.sun.shadow.camera.left = -190; v.sun.shadow.camera.right = 190; v.sun.shadow.camera.top = 120; v.sun.shadow.camera.bottom = -120;
    v.sun.shadow.camera.updateProjectionMatrix();
    const S = v.scene;

    /* ======================================================
       TANAH, SUNGAI, JALAN, POHON
       ====================================================== */
    W.kotak(S, 900, 1, 900, 0x9cc27f, 0, -1.3, 0);
    W.kotak(S, 225, 0.3, 76, W.bersama("pad", 0xcfd2d4, { roughness: 0.95 }), 10.5, -0.3, 5);
    W.kotak(S, 225, 0.06, 6, 0x4b5563, 10.5, 0, -29);                                // jalan utara
    W.kotak(S, 225, 0.06, 6, 0x4b5563, 10.5, 0, 39);                                 // jalan selatan
    for (let x = -98; x < 120; x += 7) { W.kotak(S, 3, 0.08, 0.15, 0xffffff, x, 0, -29); W.kotak(S, 3, 0.08, 0.15, 0xffffff, x, 0, 39); }
    const animSungai = W.sungai(S, -121, 34, 500);
    for (let i = 0; i < 60; i++) {
      const sisi = i % 3;
      const x = sisi === 0 ? -95 + Math.random() * 215 : sisi === 1 ? -95 + Math.random() * 215 : 125 + Math.random() * 60;
      const z = sisi === 0 ? -36 - Math.random() * 35 : sisi === 1 ? 46 + Math.random() * 35 : -80 + Math.random() * 160;
      if (sisi === 2 && Math.abs(z - 10) < 50) continue;                         // jangan menutupi power plant
      pohon(S, x, z, 0.9 + Math.random() * 0.5);
    }

    /* ---------- Alat bantu pipa + animasi aliran ---------- */
    const alir = [];
    const P3 = (a) => a.map(([x, y, z]) => V(x, y, z));
    function jalur(titik, r, warnaPipa, warnaAlir, q, opsi) {
      const p = P3(titik);
      W.pipa(S, p, r, warnaPipa, opsi);
      if (warnaAlir != null) alir.push({ a: W.aliran(S, p, warnaAlir, r), q });
    }
    const batas = (x) => Math.max(0, Math.min(1.6, x));
    const fr = {
      raw: () => batas(Q.raw / 190), clar: () => batas(Q.clar / 185), mmf: () => batas(Q.mmf / 185), ro: () => batas(Q.ro / 170),
      perm: () => batas(Q.perm / 128), rej: () => batas(Q.rej / 42), demin: () => batas(Q.demin / 128), dist: () => batas(Q.dist / 104),
    };
    // Warna pipa menurut fungsi (kode warna pipa industri)
    const PIPA = { raw: 0x15803d, jernih: 0x2563eb, ro: 0x0891b2, demin: 0xcbd5e1, reject: 0x6b7280, lumpur: 0x78350f, kimia: 0xeab308 };
    const ALIR = { raw: 0xd9a35c, jernih: 0x7dd3fc, filtrat: 0x22d3ee, perm: 0xa5f3fc, demin: 0xffffff, reject: 0xfbbf24, lumpur: 0xa16207 };

    /* ======================================================
       1) RAW WATER INTAKE (dermaga beton di tepi sungai)
       ====================================================== */
    W.kotak(S, 14, 3.4, 18, W.beton(), -104, -2.2, 0);                                // dek intake (atas y=1,2)
    W.kotak(S, 0.25, 2.8, 16, W.bersama("grating", 0x94a3b8, { metalness: 0.5 }), -110.8, -1.6, 0);   // bar screen
    for (let z = -7; z <= 7; z += 1) W.kotak(S, 0.08, 2.8, 0.06, W.baja(), -110.95, -1.6, z);
    W.shelter(S, -105.5, 0, 6, 16, 6.2, { tembus: true, nama: "RAW WATER INTAKE", pita: 0x15803d });
    W.pagar(S, P3([[-110.7, 1.2, -8.8], [-110.7, 1.2, 8.8], [-97.3, 1.2, 8.8]]));
    const pIntake = ["P-101A", "P-101B", "P-101C"].map((tag, i) => {
      const z = -5 + i * 5;
      const p = W.pompaVertikal(S, -106, 1.2, z, 0x15803d);
      ALAT[tag].obj = p;
      jalur([[-104.7, 1.88, z], [-103.5, 1.88, z]], 0.28, PIPA.raw, ALIR.raw, () => (on(tag) ? fr.raw() : 0), { tiang: false });
      return p;
    });
    jalur([[-103.5, 1.88, -5], [-103.5, 1.88, 5]], 0.35, PIPA.raw, null, null, { tiang: false });
    jalur([[-103.5, 1.88, 0], [-97, 1.88, 0], [-97, 5.6, 0], [-90, 5.6, 0], [-90, 5.6, -8], [-82.2, 5.6, -8], [-82.2, 4.3, -8]], 0.35, PIPA.raw, ALIR.raw, fr.raw);
    W.kotak(S, 3, 2.6, 2.4, 0xe2e8f0, -99.6, 1.2, -6.6);                            // panel MCC intake
    W.kotak(S, 3.1, 0.2, 2.5, 0x15803d, -99.6, 3.8, -6.6);

    /* ======================================================
       2) COAGULATION (flash mixer + flokulator) & CLARIFIER
       ====================================================== */
    W.bak(S, -80, -8, 7, 7, 4.5, 0x8a6d43);                                        // flash mixer
    W.kotak(S, 7.4, 0.3, 0.6, W.baja(), -80, 4.5, -8);
    W.tabung(S, 0.45, 0.45, 1.1, 0x15803d, -80, 4.8, -8);
    const impeler = new THREE.Group(); impeler.position.set(-80, 3.3, -8); S.add(impeler);
    W.tabung(impeler, 0.06, 0.06, 1.6, W.baja(), 0, 0, 0, 8);
    for (let i = 0; i < 4; i++) { const b = W.kotak(impeler, 1.4, 0.1, 0.35, W.baja(), 0, 0.1, 0); b.rotation.y = (i * Math.PI) / 2; b.position.set(Math.cos((i * Math.PI) / 2) * 0.7, 0.15, Math.sin((i * Math.PI) / 2) * 0.7); }
    W.kotak(S, 2.5, 0.8, 1.6, W.beton(), -75.25, 3.5, -8);                          // saluran ke flokulator
    W.bak(S, -68, -8, 12, 9, 4.5, 0x6f7f4f);                                        // flokulator
    const paddle = [-71, -65].map((x) => {
      W.kotak(S, 0.5, 0.3, 9.4, W.baja(), x, 4.5, -8);
      W.tabung(S, 0.4, 0.4, 1, 0x15803d, x, 4.8, -8);
      const g = new THREE.Group(); g.position.set(x, 2.2, -8); S.add(g);
      W.tabung(g, 0.06, 0.06, 2.4, W.baja(), 0, 0, 0, 8);
      [0, Math.PI / 2].forEach((a) => { const b = W.kotak(g, 3, 1.5, 0.12, W.bersama("paddle", 0x334155), 0, 0.4, 0); b.rotation.y = a; });
      return g;
    });
    jalur([[-62.2, 2.6, -8], [-57.6, 2.6, -8]], 0.45, PIPA.raw, ALIR.raw, fr.raw, { tiang: false });
    const clar = W.clarifier(S, -46, -8, 11, 4.2);
    W.bak(S, -27, -8, 6, 8, 3.6, 0x5fb3c0);                                         // clear well (bak air jernih)
    W.papanNama(S, "CLEAR WELL", -27, 4.6, -3.7, 0, 5, "#2563eb");
    jalur([[-34.5, 3.2, -8], [-30.2, 3.2, -8]], 0.4, PIPA.jernih, ALIR.jernih, fr.clar, { tiang: false });
    W.bak(S, -46, 9, 5, 4, 2.2, 0x5b3a1a, { pagar: false });                         // sludge pit
    W.kotak(S, 5.2, 0.2, 0.3, W.baja(), -46, 2.2, 9);
    jalur([[-46, 0.6, 3.4], [-46, 0.6, 7.2]], 0.25, PIPA.lumpur, ALIR.lumpur, () => (on("CL-201") ? 0.35 : 0), { tiang: false });
    W.kotak(S, 0.3, 0.12, 1.4, W.baja(), -46, 4.2, -19.2);                          // dudukan radar level

    /* ======================================================
       3) MULTIMEDIA FILTER (4 bejana tekan)
       ====================================================== */
    const pMMF = ["P-301A", "P-301B"].map((tag, i) => {
      const z = i === 0 ? -11 : -5;
      const p = W.pompa(S, -21.5, z, Math.PI, 0x2563eb); ALAT[tag].obj = p;
      jalur([[-24, 0.98, z], [-23.58, 0.98, z]], 0.25, PIPA.jernih, null, null, { tiang: false, flens: false });
      jalur([[-22.65, 2.16, z], [-22.65, 6.4, z], [-22.65, 6.4, -8]], 0.3, PIPA.jernih, ALIR.jernih, () => (on(tag) ? fr.mmf() : 0), { tiang: false });
      return p;
    });
    W.shelter(S, -6, -8, 25, 9, 8.2, { tembus: true, nama: "MULTIMEDIA FILTER", pita: 0x2563eb });
    const xMMF = [-15, -9, -3, 3];
    const mmf = xMMF.map((x, i) => W.bejana(S, x, -8, 1.6, 4.2, 0x2563eb, { nama: "MMF-0" + (i + 1), sub: "Multimedia Filter" }));
    jalur([[-22.65, 6.4, -8], [3.2, 6.4, -8]], 0.35, PIPA.jernih, ALIR.jernih, fr.mmf, { tiang: false });
    xMMF.forEach((x) => jalur([[x, 0.45, -8], [x, 0.45, -11.2]], 0.25, PIPA.jernih, null, null, { tiang: false, flens: false }));
    jalur([[-15, 0.45, -11.2], [13.5, 0.45, -11.2], [13.5, 0.45, -4.1], [14.4, 0.45, -4.1]], 0.35, PIPA.jernih, ALIR.filtrat, fr.mmf, { tiang: false });
    jalur([[13.5, 0.45, -11.2], [14.4, 0.45, -11.2]], 0.3, PIPA.jernih, null, null, { tiang: false });

    /* ======================================================
       4) REVERSE OSMOSIS (2 train)
       ====================================================== */
    W.shelter(S, 26, -9, 30, 15, 8.5, { tembus: true, dindingBelakang: true, nama: "REVERSE OSMOSIS", pita: 0x0891b2 });
    const trainZ = [-11.2, -4.1];
    trainZ.forEach((zc, i) => {
      const tag = i === 0 ? "P-401A" : "P-401B";
      W.bejana(S, 15, zc, 0.6, 2.2, 0xe2e8f0, { kaki: 0.5 });                       // cartridge filter 5 mikron
      const p = W.pompa(S, 18.6, zc, Math.PI, 0x0e7490); ALAT[tag].obj = p;          // pompa tekanan tinggi
      jalur([[15.6, 0.98, zc], [16.52, 0.98, zc]], 0.22, PIPA.ro, null, null, { tiang: false, flens: false });
      const z0 = zc - 2.9;
      W.rakRO(S, 22, z0);
      const q = () => (on(tag) ? fr.ro() : 0);
      jalur([[17.45, 2.16, zc], [17.45, 5.2, zc], [21.85, 5.2, zc], [21.85, 2.55, zc]], 0.28, PIPA.ro, ALIR.filtrat, q, { tiang: false });
      jalur([[21.85, 2.55, z0 + 0.6], [21.85, 2.55, z0 + 5.4]], 0.22, PIPA.ro, null, null, { tiang: false, flens: false });
      jalur([[34.15, 2.1, z0 + 0.6], [34.15, 2.1, z0 + 5.4]], 0.18, PIPA.demin, null, null, { tiang: false, flens: false });
      jalur([[34.15, 3.4, z0 + 0.6], [34.15, 3.4, z0 + 5.4]], 0.16, PIPA.reject, null, null, { tiang: false, flens: false });
      jalur([[34.15, 2.1, zc], [36.5, 2.1, zc]], 0.22, PIPA.demin, ALIR.perm, () => (on(tag) ? fr.perm() : 0), { tiang: false });
      jalur([[34.15, 3.4, zc], [38.2, 3.4, zc]], 0.18, PIPA.reject, ALIR.reject, () => (on(tag) ? fr.rej() : 0), { tiang: false });
    });
    W.papanNama(S, "TRAIN A", 28, 5.4, -14.4, 0, 3.4, "#0891b2");
    W.papanNama(S, "TRAIN B", 28, 5.4, -7.3, 0, 3.4, "#0891b2");
    // Permeate → degasser, reject → bak reject
    jalur([[36.5, 2.1, -4.1], [36.5, 2.1, -12], [39.5, 2.1, -12], [39.5, 11.6, -12], [46.2, 11.6, -12]], 0.28, PIPA.demin, ALIR.perm, fr.perm, { tiang: false });
    jalur([[38.2, 3.4, -11.2], [38.2, 3.4, -3], [43, 3.4, -3], [43, 1.9, -3]], 0.22, PIPA.reject, ALIR.reject, fr.rej, { tiang: false });
    W.bak(S, 44.5, -3, 4, 4, 1.6, 0x8a9a9d, { pagar: false });
    W.papanNama(S, "REJECT PIT", 44.5, 2.4, -0.9, 0, 3.4, "#6b7280");

    /* ======================================================
       5) DEGASSER + DEMIN FEED PUMP + MIXED BED
       ====================================================== */
    const deg = W.degasser(S, 47.5, -12);
    W.shelter(S, 59, -12, 15, 9, 8.4, { tembus: true, nama: "DEMIN / MIXED BED", pita: 0x0f766e });
    ["P-501A", "P-501B"].forEach((tag, i) => {
      const z = i === 0 ? -13.4 : -10.6;
      const p = W.pompa(S, 53.6, z, Math.PI, 0x0f766e); ALAT[tag].obj = p;
      jalur([[50, 0.98, z], [51.52, 0.98, z]], 0.22, PIPA.demin, null, null, { tiang: false, flens: false });
      jalur([[52.45, 2.16, z], [52.45, 6.6, z], [52.45, 6.6, -12]], 0.26, PIPA.demin, ALIR.perm, () => (on(tag) ? fr.demin() : 0), { tiang: false });
    });
    const mb = [58, 64].map((x, i) => W.bejana(S, x, -12, 1.6, 4.2, 0x0f766e, { nama: i ? "MB-B" : "MB-A", sub: "Mixed Bed Polisher", kacaIntip: true }));
    jalur([[52.45, 6.6, -12], [64.2, 6.6, -12]], 0.3, PIPA.demin, ALIR.perm, fr.demin, { tiang: false });
    [58, 64].forEach((x) => jalur([[x, 0.45, -12], [x, 0.45, -9.6]], 0.25, PIPA.demin, null, null, { tiang: false, flens: false }));
    // Air demin → tangki penyimpanan
    jalur([[58, 0.45, -9.6], [72, 0.45, -9.6], [72, 11, -9.6]], 0.32, PIPA.demin, ALIR.demin, fr.demin, { tiang: false });
    jalur([[72, 11, -14], [72, 11, 6]], 0.32, PIPA.demin, null, null);
    jalur([[72, 11, -14], [74.9, 11, -14]], 0.3, PIPA.demin, ALIR.demin, fr.demin, { tiang: false });
    jalur([[72, 11, 6], [74.9, 11, 6]], 0.3, PIPA.demin, ALIR.demin, fr.demin, { tiang: false });
    // kabinet analyzer (sample panel)
    W.kotak(S, 10.5, 0.25, 2.2, W.bersama("lantai", 0xa8b0b8), 60.6, 0, -6.8);
    W.kotak(S, 11, 0.15, 2.6, W.bersama("atapA", 0xe5e7eb), 60.6, 3.1, -6.6);
    [55.8, 65.4].forEach((x) => W.kotak(S, 0.15, 3.1, 0.15, W.baja(), x, 0, -5.6));

    /* ======================================================
       6) CHEMICAL DOSING (6 tangki + 6 pompa dosing)
       ====================================================== */
    W.shelter(S, -16, 22, 54, 13, 6.8, { tembus: true, nama: "CHEMICAL DOSING", pita: 0xeab308, warnaNama: "#eab308" });
    [[-16, 15.6, 54, 0.25], [-16, 28.4, 54, 0.25]].forEach(([x, z, w, d]) => W.kotak(S, w, 0.7, d, W.beton(), x, 0.3, z));   // tanggul (bund wall)
    const tKimia = KIMIA.map((k, i) => W.tangkiKimia(S, X_KIMIA[i], 19.5, k.kode, k.warna, 1.5, 3.4, k.bahaya));
    // Jalur pipa dosing ke titik injeksi masing-masing
    const injeksi = [
      { tx: -80.6, ty: 4.9, tz: -5.2, dz: -3.9 },   // PAC  → flash mixer
      { tx: -79.2, ty: 4.9, tz: -5.2, dz: -3.9 },   // NaOH → flash mixer (koreksi pH)
      { tx: -27.6, ty: 3.9, tz: -4.6, dz: -3.4 },   // NaOCl → clear well (desinfeksi)
      { tx: 12.6, ty: 0.6, tz: -6, ex: 13.3 },      // Antiscalant → feed RO
      { tx: 12.0, ty: 0.6, tz: -8, ex: 13.3 },      // SMBS → feed RO (buang sisa klorin)
      { tx: 57, ty: 1.8, tz: -10.3, dz: -8.6 },     // HCl → regenerasi mixed bed
    ];
    const zKoridor = (i) => 13.9 - i * 0.32;
    const pDosing = KIMIA.map((k, i) => {
      const x = X_KIMIA[i], tag = "DP-60" + (i + 1);
      const p = W.pompa(S, x, 24.5, Math.PI / 2, 0xeab308, 0.45); ALAT[tag].obj = p;
      jalur([[x, 0.44, 21], [x, 0.44, 23.56]], 0.07, PIPA.kimia, null, null, { tiang: false, flens: false });
      const j = injeksi[i], zk = zKoridor(i);
      const titik = [[x, 0.97, 23.98], [x, 5.2, 23.98], [x, 5.2, 15], [x, 0.6, 15], [x, 0.6, zk], [j.tx, 0.6, zk]];
      if (j.ex) titik.push([j.tx, 0.6, j.tz], [j.ex, 0.6, j.tz]);
      else titik.push([j.tx, 0.6, j.dz], [j.tx, j.ty, j.dz], [j.tx, j.ty, j.tz]);
      jalur(titik, 0.07, PIPA.kimia, k.warna === 0xe0e7ff ? 0xf8fafc : k.warna, () => (on(tag) ? 0.45 : 0), { tiang: false, flens: false });
      return p;
    });

    /* ======================================================
       7) TREATED WATER STORAGE & DISTRIBUTION
       ====================================================== */
    const tk = [
      W.tangkiBesar(S, 82, -14, 7, 12, "DEMIN WATER TANK", "TK-701A · 1.500 m³"),
      W.tangkiBesar(S, 82, 6, 7, 12, "DEMIN WATER TANK", "TK-701B · 1.500 m³"),
    ];
    jalur([[89.1, 0.98, -14], [91, 0.98, -14], [91, 0.98, 6], [89.1, 0.98, 6]], 0.35, PIPA.demin, ALIR.demin, fr.dist, { tiang: false });
    ["P-701A", "P-701B", "P-701C"].forEach((tag, i) => {
      const z = -6 + i * 4;
      const p = W.pompa(S, 95.5, z, Math.PI, 0x1d4ed8); ALAT[tag].obj = p;
      jalur([[91, 0.98, z], [93.42, 0.98, z]], 0.25, PIPA.demin, null, null, { tiang: false, flens: false });
      jalur([[94.35, 2.16, z], [94.35, 4.2, z]], 0.25, PIPA.demin, ALIR.demin, () => (on(tag) ? fr.dist() : 0), { tiang: false });
    });
    jalur([[94.35, 4.2, -6], [94.35, 4.2, 2]], 0.32, PIPA.demin, null, null, { tiang: false });
    jalur([[94.35, 4.2, -2], [125, 4.2, -2]], 0.4, PIPA.demin, ALIR.demin, fr.dist);
    W.papanNama(S, "DISTRIBUTION PUMP", 95.5, 4.9, 5.2, 0, 6, "#1d4ed8");

    /* ---------- Power plant (tujuan air demin) & gedung kontrol ---------- */
    W.kotak(S, 70, 0.3, 110, W.bersama("pad", 0xcfd2d4), 152, -0.3, 12);               // halaman power plant
    W.kotak(S, 18, 26, 20, 0xe5e7eb, 134, 0, -4); W.kotak(S, 18.2, 2, 20.2, 0x1d4ed8, 134, 22, -4);
    W.kotak(S, 30, 14, 16, 0xcbd5e1, 140, 0, 22); W.kotak(S, 30.2, 1.6, 16.2, 0x0ea5e9, 140, 11, 22);
    W.papanNama(S, "BOILER / HRSG", 134, 18, 6.2, 0, 10, "#1d4ed8");
    const animCerobong = W.cerobong(S, 152, -22, 50);
    const animCT = W.menaraPendingin(S, 162, 52, 14, 30);
    const kontrol = Model3D.kantor({ lebar: 14, dalam: 10, tinggi: 9, nama: "WTP CONTROL" });
    kontrol.position.set(-62, 0, 22); S.add(kontrol);

    /* ======================================================
       INSTRUMEN (tag ISA): [tag, area, tipe, keterangan, satuan, desimal, batas [LL, L, H, HH], posisi, opsi, rumus nilai]
       Tipe: F=Flow, P=Pressure, L=Level, T=Temperature, A=Analyzer, D=Differential pressure, S=Status pompa
       ====================================================== */
    const n1 = () => nRun("P-701");
    const INST = [
      ["FIT-101", 1, "F", "Flow air baku masuk", "m³/h", 1, [null, 60, 220, null], [-93.5, 5.6, 0], {}, () => Q.raw],
      ["PIT-101", 1, "P", "Tekanan header intake", "bar", 2, [null, 1.5, 4.5, null], [-103.5, 1.88, -2.6], {}, () => (nRun("P-101") ? 2.75 + 0.15 * nRun("P-101") : 0)],
      ["LIT-101", 1, "L", "Level sumur intake", "m", 2, [1.0, 1.6, 4.6, null], [-109.4, 1.75, 7.5], {}, () => 3.45 - Q.raw * 0.0018],
      ["TIT-101", 1, "T", "Suhu air baku", "°C", 1, [null, null, 34, 36], [-99.6, 1.88, 0], {}, () => 29.3],
      ["AIT-101", 1, "A", "Turbidity air baku", "NTU", 0, [null, null, 100, 150], [-100.4, 2.8, 7.4], {}, () => (st.g === "keruh" ? 186 : 36)],

      ["AIT-201", 2, "A", "pH koagulasi", "pH", 2, [6.0, 6.3, 7.6, 8.0], [-85.6, 1.8, -12.6], {}, () => 6.85 + (on("DP-601") ? 0 : 0.55) - (on("DP-602") ? 0 : 0.5)],
      ["AIT-202", 2, "A", "Turbidity outlet clarifier", "NTU", 2, [null, null, 5, 10], [-32.6, 1.8, -14.2], {}, () => (on("DP-601") ? (st.g === "keruh" ? 8.4 : 2.3) : 13.5) * (on("M-202") ? 1 : 1.5)],
      ["FIT-201", 2, "F", "Flow outlet clarifier", "m³/h", 1, [null, 50, null, null], [-32.3, 3.2, -8], {}, () => Q.clar],
      ["LIT-201", 2, "L", "Level clarifier", "m", 2, [3.0, 3.4, 4.3, 4.5], [-46, 4.95, -19.2], {}, () => (Q.raw > 0 ? 4.02 : 3.82)],
      ["LIT-202", 2, "L", "Sludge level (blanket)", "m", 2, [null, null, 1.8, 2.2], [-46, 2.95, 9], {}, () => st.sludge],

      ["PIT-301", 3, "P", "Tekanan inlet MMF", "bar", 2, [null, 1.5, 5, null], [-19, 6.4, -8], {}, () => (Q.mmf > 0 ? 3.6 : 0)],
      ["PIT-302", 3, "P", "Tekanan outlet MMF", "bar", 2, [null, 1.2, null, null], [5, 0.45, -11.2], {}, () => (Q.mmf > 0 ? 3.6 - st.dp : 0)],
      ["PDIT-301", 3, "D", "Differential pressure MMF", "bar", 2, [null, null, 0.8, 1.0], [-15, 2.6, -5.8], { tiang: true }, () => (Q.mmf > 0 ? st.dp : 0)],
      ["FIT-301", 3, "F", "Flow filtrat MMF", "m³/h", 1, [null, 50, null, null], [8.6, 0.45, -11.2], {}, () => Q.mmf],
      ["AIT-301", 3, "A", "Turbidity filtrat MMF", "NTU", 2, [null, null, 1, 2], [9.4, 1.8, -14.8], {}, () => (st.g === "keruh" ? 0.86 : 0.32) + (st.dp > 0.95 ? 0.7 : 0)],

      ["PIT-401", 4, "P", "Tekanan feed RO", "bar", 1, [null, 8, 16, 17.5], [18.5, 5.2, -11.2], {}, () => (Q.ro > 0 ? (st.g === "fouling" ? 15.4 : 12.4) : 0)],
      ["FIT-401", 4, "F", "Flow feed RO", "m³/h", 1, [null, 40, null, null], [20.3, 5.2, -11.2], {}, () => Q.ro],
      ["FIT-402", 4, "F", "Flow permeate RO", "m³/h", 1, [null, 30, null, null], [36.5, 2.1, -7.6], { sumbu: "z" }, () => Q.perm],
      ["FIT-403", 4, "F", "Flow reject RO", "m³/h", 1, [null, null, null, null], [38.2, 3.4, -6.2], { sumbu: "z" }, () => Q.rej],
      ["AIT-401", 4, "A", "Konduktivitas permeate", "µS/cm", 1, [null, null, 20, 30], [35, 1.8, 0.2], {}, () => (st.g === "fouling" ? 27.5 : 8.6)],
      ["PDIT-401", 4, "D", "ΔP membran RO", "bar", 2, [null, null, 2.5, 3.5], [35.6, 2.6, -15.6], { tiang: true }, () => (Q.ro > 0 ? (st.g === "fouling" ? 3.15 : 1.55) : 0)],
      ["TIT-401", 4, "T", "Suhu feed RO", "°C", 1, [null, null, 35, 40], [19.6, 5.2, -4.1], {}, () => 29.6],

      ["AIT-501", 5, "A", "Konduktivitas demin", "µS/cm", 3, [null, null, 0.2, 0.5], [57, 1.8, -6.9], {}, () => (st.g === "silika" ? 0.34 : 0.075) + (on("B-501") ? 0 : 0.06)],
      ["AIT-502", 5, "A", "pH air demin", "pH", 2, [6.5, 6.8, 7.5, 8.0], [59.4, 1.8, -6.9], {}, () => 7.02],
      ["AIT-503", 5, "A", "Silica analyzer", "ppb", 1, [null, null, 20, 30], [61.8, 1.8, -6.9], {}, () => (st.g === "silika" ? 27 : 7.8)],
      ["AIT-504", 5, "A", "Sodium analyzer", "ppb", 1, [null, null, 10, 15], [64.2, 1.8, -6.9], {}, () => (st.g === "silika" ? 11.5 : 2.9)],
      ["FIT-501", 5, "F", "Flow air demin", "m³/h", 1, [null, 30, null, null], [68, 0.45, -9.6], {}, () => Q.demin],
      ["PIT-501", 5, "P", "Tekanan inlet mixed bed", "bar", 2, [null, 1.5, 6, null], [56, 6.6, -12], {}, () => (Q.demin > 0 ? 3.4 : 0)],

      ...KIMIA.map((k, i) => ["LIT-60" + (i + 1), 6, "L", "Level tangki " + k.nama, "%", 0, [10, 20, null, null], [X_KIMIA[i] + 0.75, 4.25, 19.5], {}, () => st.kimia[i]]),
      ["FIT-601", 6, "F", "Flow dosing PAC", "L/h", 1, [null, 10, null, null], [-55, 0.6, zKoridor(0)], { r: 0.1 }, () => (on("DP-601") ? 42 : 0)],
      ["PIT-601", 6, "P", "Tekanan discharge dosing PAC", "bar", 1, [null, 1, 8, null], [-38, 5.2, 18.2], { r: 0.1 }, () => (on("DP-601") ? 4.3 : 0)],
      ["AIT-601", 6, "A", "pH air jernih (setelah NaOH)", "pH", 2, [6.5, 6.8, 7.8, 8.2], [-23.4, 1.8, -1.6], {}, () => (on("DP-602") ? 7.25 : 6.55)],
      ["AIT-602", 6, "A", "ORP feed RO (kontrol SMBS)", "mV", 0, [null, null, 300, 400], [10.4, 1.8, -0.6], {}, () => (on("DP-605") ? 175 : 430)],
      ["XS-601", 6, "S", "Status dosing pump", "", 0, null, [13, 0, 26.5], {}, () => `${nRun("DP-60")}/6 RUN`],

      ["LIT-701A", 7, "L", "Level tangki demin A", "%", 1, [10, 20, 95, 98], [85.2, 13.25, -14], {}, () => st.tk[0]],
      ["LIT-701B", 7, "L", "Level tangki demin B", "%", 1, [10, 20, 95, 98], [85.2, 13.25, 6], {}, () => st.tk[1]],
      ["FIT-701", 7, "F", "Flow distribusi ke boiler", "m³/h", 1, [null, 30, null, null], [104, 4.2, -2], {}, () => Q.dist],
      ["PIT-701", 7, "P", "Tekanan header distribusi", "bar", 2, [4, 5, 7.5, 8], [100, 4.2, -2], {}, () => (n1() ? 5.6 + 0.4 * n1() : 0)],
      ["AIT-701", 7, "A", "Konduktivitas air distribusi", "µS/cm", 3, [null, null, 0.2, 0.5], [102, 1.8, -5.6], {}, () => (st.g === "silika" ? 0.29 : 0.09)],
      ["TIT-701", 7, "T", "Suhu air distribusi", "°C", 1, [null, null, 38, 40], [108, 4.2, -2], {}, () => 30.4],
      ...["A", "B", "C"].map((h, i) => ["XS-701" + h, 7, "S", "Status pompa P-701" + h, "", 0, null, [97.9, 0, -6 + i * 4], {}, () => ALAT["P-701" + h].st.toUpperCase().replace("STANDBY", "STBY")]),
    ].map(([tag, sek, tipe, ket, satuan, d, lim, pos, opsi, rumus]) => ({ tag, sek, tipe, ket, satuan, d, lim, pos, opsi, rumus, nilai: null, status: "N" }));
    const cariInst = {};
    INST.forEach((I) => {
      const m = W.instrumen(S, I.tipe, I.pos[0], I.pos[1], I.pos[2], I.opsi);
      I.obj = m; cariInst[I.tag] = I;
      if (I.tipe === "S" && I.tag.startsWith("XS-701")) W.setStackLight(m, "run");
    });
    W.kotak(S, 0.25, 0.12, 1.6, W.baja(), -109.4, 1.45, 7.5);                         // braket radar intake

    /* ======================================================
       LABEL 3D: label area (besar) + label tag instrumen (kecil)
       ====================================================== */
    const ringkas = {
      1: () => `${fmt(Q.raw)} m³/h · ${fmt(nilai("AIT-101"))} NTU`,
      2: () => `Outlet ${fmt(nilai("AIT-202"), 1)} NTU · pH ${fmt(nilai("AIT-201"), 2)}`,
      3: () => (st.backwash > 0 ? { t: `Backwash MMF-0${Math.min(4, Math.floor((15 - st.backwash) / 4) + 1)} · ${st.backwash} s`, off: true } : `ΔP ${fmt(st.dp, 2)} bar · ${fmt(nilai("AIT-301"), 2)} NTU`),
      4: () => `Permeate ${fmt(Q.perm)} m³/h · ${fmt(nilai("AIT-401"), 1)} µS/cm`,
      5: () => `${fmt(nilai("AIT-501"), 3)} µS/cm · SiO₂ ${fmt(nilai("AIT-503"), 1)} ppb`,
      6: () => `${nRun("DP-60")}/6 pompa dosing RUN`,
      7: () => `Tangki ${fmt(st.tk[0])}% / ${fmt(st.tk[1])}% · ${fmt(nilai("PIT-701"), 1)} bar`,
    };
    const posSeksi = { 1: [-104, 8.5, 0], 2: [-62, 9.5, -8], 3: [-6, 10.8, -8], 4: [26, 11, -9], 5: [52, 15, -12], 6: [-16, 9.5, 22], 7: [86, 17.5, -4] };
    const lblSeksi = SEKSI.map((s) => {
      const L = label(v, `${s.id} · ${s.ikon} ${s.nama}`, ...posSeksi[s.id], () => ringkas[s.id](), () => pilihSeksi(s.id, true));
      L.el.classList.add("sek"); return L;
    });
    label(v, "⚡ Power Plant", 134, 29, -4, () => `Make-up demin ${fmt(Q.dist)} m³/h`);
    label(v, "🖥️ WTP Control Room", -62, 12, 22, () => "SCADA · PLC");
    const lblInst = INST.map((I) => {
      const L = label(v, I.tag, I.obj.titik.x, I.obj.titik.y, I.obj.titik.z, () => teksNilai(I), () => fokusInstrumen(I.tag));
      L.el.classList.add("tag"); I.lbl = L; return L;
    });

    /* ======================================================
       LOGIKA: hitung proses, status alarm, panel
       ====================================================== */
    const nilai = (tag) => cariInst[tag].nilai ?? 0;
    function teksNilai(I) {
      if (I.tipe === "S") return I.rumus();
      return fmt(I.nilai ?? 0, I.d) + (I.satuan ? " " + I.satuan : "");
    }
    function cekStatus(I) {
      if (!I.lim || I.tipe === "S") return I.tipe === "S" && String(I.rumus()).startsWith("STOP") ? "H" : "N";
      const [LL, L, H, HH] = I.lim, x = I.nilai;
      if (HH != null && x >= HH) return "HH";
      if (LL != null && x <= LL) return "LL";
      if (H != null && x >= H) return "H";
      if (L != null && x <= L) return "L";
      return "N";
    }
    const log = [];
    function catat(teks, warna = "#cbd5e1") {
      log.unshift({ j: jam(), teks, warna });
      if (log.length > 7) log.pop();
    }

    function hitung() {
      // --- Debit setiap tahap (m³/jam) ---
      Q.raw = nRun("P-101") * 95 + rand(-1.5, 1.5);
      if (nRun("P-101") === 0) Q.raw = 0;
      Q.clar = Q.raw * 0.97;
      // saat backwash, 1 bejana MMF dicuci bergantian → kapasitas turun 25%
      Q.mmf = Math.min(Q.clar, nRun("P-301") * 200) * (st.backwash > 0 ? 0.75 : 1);
      Q.ro = Math.min(Q.mmf * 0.98, nRun("P-401") * 85);
      Q.perm = Q.ro * (st.g === "fouling" ? 0.68 : 0.75);
      Q.rej = Q.ro - Q.perm;
      Q.demin = Math.min(Q.perm, nRun("P-501") * 140);
      Q.dist = nRun("P-701") * 52 + (nRun("P-701") ? rand(-1, 1) : 0);
      // --- Level tangki demin (simulasi dipercepat 120x) ---
      const dLevel = (((Q.demin - Q.dist) / 2 / 3600) * 120 / 1500) * 100;
      st.tk = st.tk.map((l) => Math.max(3, Math.min(99, l + dLevel)));
      // --- Lumpur clarifier ---
      st.sludge += (st.g === "keruh" ? 0.012 : 0.0025) - (on("CL-201") ? 0.0028 : 0) + (on("CL-201") ? 0 : 0.008);
      st.sludge = Math.max(0.6, Math.min(2.6, st.sludge));
      // --- ΔP MMF naik perlahan; backwash otomatis jika ≥ 1,0 bar ---
      if (Q.mmf > 0) st.dp += st.g === "dp" ? 0.025 : 0.0006;
      if (st.backwash > 0) {
        st.backwash--;
        if (st.backwash === 0) { st.dp = 0.32; if (st.g === "dp") st.g = null; catat("✓ Backwash MMF selesai – ΔP kembali normal", "#4ade80"); }
      } else if (st.dp >= 1.0) mulaiBackwash("otomatis (PDIT-301 HH)");
      // --- Konsumsi bahan kimia ---
      st.kimia = st.kimia.map((l, i) => {
        let x = l - (on("DP-60" + (i + 1)) ? 0.004 : 0);
        if (st.g === "kimia" && i === 2) x -= 0.9;
        return Math.max(4, x);
      });
      // --- Nilai setiap instrumen (dihaluskan + sedikit noise) ---
      INST.forEach((I) => {
        if (I.tipe === "S") { I.status = cekStatus(I); return; }
        const target = I.rumus();
        const bising = target === 0 ? 0 : Math.abs(target) * 0.006;
        I.nilai = I.nilai == null ? target : I.nilai + (target - I.nilai) * 0.3 + rand(-bising, bising);
        if (Math.abs(I.nilai) < 1e-3) I.nilai = 0;
        const lama = I.status;
        I.status = cekStatus(I);
        if (lama !== I.status && I.status !== "N") catat(`⚠ ${I.tag} ${I.status} – ${I.ket} ${teksNilai(I)}`, I.status.length === 2 ? "#f87171" : "#fbbf24");
        if (lama !== "N" && I.status === "N") catat(`✓ ${I.tag} kembali normal`, "#4ade80");
      });
    }

    function mulaiBackwash(sebab) {
      if (st.backwash > 0) return;
      st.backwash = 15;
      catat(`🔁 Backwash MMF dimulai – ${sebab}`, "#38bdf8");
      toast("Backwash Multimedia Filter dimulai (" + sebab + ")");
    }
    function gantiSkenario(b) {
      const s = SKENARIO[st.iSken % SKENARIO.length]; st.iSken++;
      st.g = s.k;
      if (!s.k) { st.kimia[2] = Math.max(st.kimia[2], 55); st.dp = Math.min(st.dp, 0.4); st.sludge = Math.min(st.sludge, 1.1); }
      catat((s.k ? "🧪 Simulasi: " : "✓ ") + s.t, s.k ? "#fbbf24" : "#4ade80");
      toast((s.k ? "Simulasi gangguan: " : "") + s.t);
      b.textContent = s.k ? "⚠ Gangguan: " + s.t.split(" – ")[0] : "⚠ Simulasi Gangguan";
      const urut = { keruh: 1, dp: 3, fouling: 4, silika: 5, kimia: 6 };
      if (urut[s.k]) pilihSeksi(urut[s.k], true);
    }
    function tombolAlat(tag) {
      const a = ALAT[tag];
      if (a.st === "run") {
        a.st = "stop"; catat(`■ ${tag} ${a.nama} dihentikan operator`, "#fbbf24");
        const grup = tag.slice(0, -1), cadangan = Object.values(ALAT).find((x) => x.tag !== tag && x.tag.startsWith(grup) && x.st === "standby" && /[A-C]$/.test(tag));
        if (cadangan) { cadangan.st = "run"; catat(`↻ Auto changeover: ${cadangan.tag} mengambil alih`, "#38bdf8"); }
      } else { a.st = "run"; catat(`▶ ${tag} ${a.nama} dijalankan`, "#4ade80"); }
      hitung(); renderPanel();
    }

    /* ---------- Pilih area / fokus ke instrumen ---------- */
    function pilihSeksi(id, terbang) {
      st.sek = id;
      if (terbang) v.orbit.ke(SEKSI[id - 1].preset);
      renderPanel();
    }
    function fokusInstrumen(tag) {
      const I = cariInst[tag];
      st.sek = I.sek; st.fokus = tag; st.fokusSampai = performance.now() + 4000;
      const p = I.obj.titik;
      v.orbit.ke([v.orbit.theta, 0.95, 20, [p.x, p.y - 0.5, p.z]]);
      renderPanel();
    }

    const elK = (k) => v.el.querySelector(`[data-k="${k}"]`);
    elK("tbl").onclick = (e) => { const tr = e.target.closest("tr[data-tag]"); if (tr) fokusInstrumen(tr.dataset.tag); };
    elK("ktrl").onclick = (e) => { const b = e.target.closest("[data-alat]"); if (b) tombolAlat(b.dataset.alat); };
    v.el.querySelectorAll("[data-sek]").forEach((b) => (b.onclick = () => pilihSeksi(+b.dataset.sek, true)));

    function renderPanel() {
      const s = SEKSI[st.sek - 1];
      elK("sekNama").textContent = `${s.id}. ${s.nama}`;
      v.el.querySelectorAll("[data-sek]").forEach((b) => b.classList.toggle("active", +b.dataset.sek === st.sek));
      elK("tbl").innerHTML = INST.filter((I) => I.sek === st.sek).map((I) => `
        <tr data-tag="${I.tag}" class="${I.status !== "N" ? "alm" : ""} ${st.fokus === I.tag ? "fokus" : ""}">
          <td><b>${I.tag}</b><small>${I.ket}</small></td>
          <td class="v">${teksNilai(I)}</td>
          <td><span class="dotst ${I.status}">${I.status === "N" ? "OK" : I.status}</span></td></tr>`).join("");
      elK("ktrl").innerHTML = Object.values(ALAT).filter((a) => a.sek === st.sek).map((a) => `
        <div class="v3-row"><span style="font-size:10.5px"><b>${a.tag}</b> ${a.nama}</span>
          <span class="toggle ${a.st === "run" ? "" : "off"}" style="${a.st === "standby" ? "color:#fbbf24" : ""}">${a.st === "run" ? "RUN" : a.st === "standby" ? "STBY" : "STOP"}</span>
          <button class="btn sm ${a.st === "run" ? "red" : ""}" data-alat="${a.tag}">${a.st === "run" ? "■ Stop" : "▶ Start"}</button></div>`).join("");
      // lampu status pompa di 3D
      Object.values(ALAT).forEach((a) => { if (a.obj && a.obj.set) a.obj.set(a.st); });
      ["A", "B", "C"].forEach((h) => W.setStackLight(cariInst["XS-701" + h].obj, ALAT["P-701" + h].st));
      W.setStackLight(cariInst["XS-601"].obj, nRun("DP-60") === 6 ? "run" : nRun("DP-60") === 0 ? "stop" : "standby");
      tKimia.forEach((t, i) => t.setLevel(st.kimia[i]));
      tk.forEach((t, i) => t.setLevel(st.tk[i]));
    }

    function renderRingkasan() {
      const set = (k, h) => (elK(k).innerHTML = h);
      const warnaTag = (tag) => (cariInst[tag].status === "N" ? "" : ' style="color:#f87171"');
      set("raw", `<span${warnaTag("FIT-101")}>${fmt(Q.raw, 1)} m³/h</span>`);
      set("ntu", `<span${warnaTag("AIT-202")}>${fmt(nilai("AIT-202"), 2)} NTU</span>`);
      set("dp", `<span${warnaTag("PDIT-301")}>${st.backwash > 0 ? "Backwash" : fmt(st.dp, 2) + " bar"}</span>`);
      set("rec", Q.ro > 0 ? fmt((Q.perm / Q.ro) * 100, 1) + " %" : "–");
      set("cperm", `<span${warnaTag("AIT-401")}>${fmt(nilai("AIT-401"), 1)} µS/cm</span>`);
      set("cdem", `<span${warnaTag("AIT-501")}>${fmt(nilai("AIT-501"), 3)} µS/cm</span>`);
      set("sio2", `<span${warnaTag("AIT-503")}>${fmt(nilai("AIT-503"), 1)} ppb</span>`);
      set("lvl", `${fmt(st.tk[0], 1)} / ${fmt(st.tk[1], 1)} %`);
      set("pdist", `<span${warnaTag("PIT-701")}>${fmt(nilai("PIT-701"), 2)} bar</span>`);
      const aktif = INST.filter((I) => I.status !== "N");
      set("alm", aktif.length
        ? `<div class="wtp-alm on">🔔 ${aktif.length} alarm aktif</div>${aktif.slice(0, 4).map((I) => `<div class="wtp-almrow" data-tag="${I.tag}"><b>${I.tag}</b> ${I.status} · ${teksNilai(I)}</div>`).join("")}`
        : `<div class="wtp-alm">✓ Semua parameter normal</div>`);
      set("log", log.map((l) => `<div><span class="muted">${l.j}</span> <span style="color:${l.warna}">${l.teks}</span></div>`).join(""));
    }
    elK("alm").onclick = (e) => { const r = e.target.closest("[data-tag]"); if (r) fokusInstrumen(r.dataset.tag); };

    /* ---------- Kamera ---------- */
    v.preset = { Overview: [1.35, 0.9, 235, [5, 0, 2]] };
    SEKSI.forEach((s) => (v.preset[s.nama] = s.preset));
    v.orbit.ke(v.preset.Overview);

    /* ======================================================
       ANIMASI TIAP FRAME
       ====================================================== */
    let tLalu = 0;
    v.updaters.push((t) => {
      const dt = Math.min(0.1, (t - tLalu) / 1000); tLalu = t;
      alir.forEach((a) => a.a.update(dt, a.q ? a.q() : 0));
      if (on("CL-201")) clar.jembatan.rotation.y += dt * 0.06;
      if (on("M-201")) impeler.rotation.y += dt * 6;
      if (on("M-202")) paddle.forEach((g, i) => (g.rotation.y += dt * (0.8 + i * 0.2)));
      if (on("B-501")) deg.kipas.rotation.z += dt * 14;
      animSungai(t); animCerobong(t); animCT(t);
      // MMF berkedip biru saat backwash
      const kedip = st.backwash > 0 && Math.sin(t / 180) > 0;
      const dicuci = Math.min(3, Math.floor((15 - st.backwash) / 4));          // bejana yang sedang di-backwash
      mmf.forEach((m, i) => { m.mat.emissive.setHex(kedip && i === dicuci ? 0x0ea5e9 : 0x000000); m.mat.emissiveIntensity = 0.6; });
      mb.forEach((m) => m.mat.emissive.setHex(st.g === "silika" && Math.sin(t / 250) > 0 ? 0x7f1d1d : 0x000000));
      // Lingkaran merah berkedip pada instrumen yang alarm / sedang difokus
      const fokusAktif = Boolean(st.fokus) && performance.now() < st.fokusSampai;
      INST.forEach((I) => {
        const alarm = I.status !== "N";
        const lihat = Boolean(fokusAktif && st.fokus === I.tag);
        I.obj.halo.visible = (alarm && Math.sin(t / 220) > -0.2) || lihat;
        I.obj.halo.material.color.setHex(lihat && !alarm ? 0x22d3ee : 0xffffff);
        const k = 1.8 + Math.sin(t / 160) * 0.35; I.obj.halo.scale.set(k, k, 1);
      });
      // Label tag tampil jika tombol Tag aktif, kamera dekat, atau instrumen alarm
      const dekat = v.orbit.r < 85;
      lblInst.forEach((L, i) => {
        const I = INST[i];
        L.el.style.visibility = st.tag || (dekat && I.sek === st.sek) || I.status !== "N" || (fokusAktif && st.fokus === I.tag) ? "" : "hidden";
        L.el.classList.toggle("alm", I.status !== "N");
      });
      lblSeksi.forEach((L) => (L.el.style.opacity = v.orbit.r < 85 ? 0.55 : 1));
    });

    v.detik = () => { hitung(); renderPanel(); renderRingkasan(); };
    catat("WTP beroperasi normal – 2 train RO online", "#4ade80");
    hitung(); hitung(); renderPanel(); renderRingkasan();
    return v;
  }

  Scene3D.daftar("water3d", buatWTP);
})();
