/* =========================================================
   SIM.JS — SIMULATION MODE (4 silo batu bara + peralatan)
   • Filling dari truck hopper → belt feeder → CV-001 → bucket elevator →
     CV-002 → transfer chute/diverter → silo
   • Discharging: slide gate → rotary airlock → screw conveyor → CV-003
   • Permukaan material berubah: kerucut saat filling, kawah saat discharge
   • Instrumen: 3D scanner, radar, load cell, suhu, level switch, tekanan, CO, debu
   Semua nilai = SIMULATION. Massa, volume, level & berat selalu konsisten.
   ========================================================= */
const SIM = (() => {
  const C = CONFIG, G = C.geo, KEY = C.simpanKey, NS = C.silo.length;
  const acak = (a, b) => a + Math.random() * (b - a);
  const batas = (x, a, b) => Math.max(a, Math.min(b, x));
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const lag = (x, t, dt, tau) => x + (t - x) * Math.min(1, dt / tau);
  const pol = (r, deg) => [r * Math.sin((deg * Math.PI) / 180), r * Math.cos((deg * Math.PI) / 180)];   // 0° = utara (+y)

  function simpanLS(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* penuh */ } }
  function bacaLS(k, d) { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }

  /* ---------------- STATUS AWAL ---------------- */
  const [ixI, iyI] = pol(C.posInlet.r, C.posInlet.sudut);
  const parAwal = (i) => ({ a: [0.9, 0.4, 1.2, 0.2][i], b: [0.5, 1.1, 0.3, 1.4][i], ix: ixI, iy: iyI, ir: C.posInlet.r, tx: acak(-0.03, 0.03), ty: acak(-0.03, 0.03), seed: i * 1.7 + 0.4,
    bumps: Array.from({ length: 5 }, () => ({ x: acak(-2.2, 2.2), y: acak(-2.2, 2.2), s: acak(0.55, 1.0), amp: acak(-0.25, 0.3) })) });
  function siloAwal(i) {
    const k = C.silo[i];
    return {
      m: k[2], p: parAwal(i), isi: false, keluar: false, lajuKeluar: C.laju.keluarManual, qin: 0, qout: 0,
      f: {}, hot: 0, drift: acak(0, 6), scan: { prog: 0, t: 0, tLast: Date.now(), q: 96 }, tot: { in: 0, out: 0 },
      eq: Object.fromEntries(C.alatSilo.map(([k2]) => [k2, { st: "STOP", h: acak(2000, 18000), cmd: false }])),
      v: {},
    };
  }
  function statusAwal() {
    return {
      t: Date.now(), speed: C.kecepatanAwal, jalan: true, auto: true, sel: 0, stok: 60, truk: 0, target: -1,
      f: {}, silo: Array.from({ length: NS }, (_, i) => siloAwal(i)),
      alat: Object.fromEntries(C.alat.map(([t]) => [t, { st: "STOP", h: acak(3000, 25000), cmd: false }])),
      E: { day: Array.from({ length: NS }, () => ({ in: 0, out: 0 })) }, sumberKontur: Array(NS).fill("SIMULATION"),
    };
  }
  let S = statusAwal();
  const Z = Array.from({ length: NS }, () => new Float32Array(KONTUR.N ** 2));      // permukaan model (truth)
  const ZS = Array.from({ length: NS }, () => new Float32Array(KONTUR.N ** 2));     // permukaan hasil scan (ditampilkan)
  const ST = Array(NS).fill(null);                                                  // statistik kontur hasil scan
  const ZImpor = Array(NS).fill(null);                                              // point cloud impor
  let log = [], rt = Array.from({ length: NS }, () => []);
  let diam = false;
  const pendengar = [];
  function kejadian(sumber, teks) { if (!diam) pendengar.forEach((f) => f({ jenis: "event", sumber, teks })); }

  /* ---------------- volume ↔ tinggi (permukaan datar, untuk histori cepat) ---------------- */
  function tinggiDatar(vol) {
    if (vol <= G.Vh) { // di dalam hopper: cari h numerik
      let lo = 0, hi = G.Hh; for (let k = 0; k < 30; k++) { const h = (lo + hi) / 2, r = G.r0 + ((G.R - G.r0) * h) / G.Hh; const v = (Math.PI * h / 3) * (r * r + r * G.r0 + G.r0 * G.r0); if (v < vol) lo = h; else hi = h; } return (lo + hi) / 2;
    }
    return G.Hh + (vol - G.Vh) / G.A;
  }

  /* ---------------- PERALATAN ---------------- */
  const OK = (st) => st === "RUN";
  const bisaJalan = (o) => o.st !== "FAULT" && o.st !== "MAINT";
  function setAuto(o, perlu) { if (!bisaJalan(o)) return; o.st = perlu ? "RUN" : "STOP"; }

  /* ---------------- LANGKAH SIMULASI ---------------- */
  function langkah(dt, cepat) {
    S.t += dt * 1000;
    const jam = dt / 3600, d = new Date(S.t), h = d.getHours() + d.getMinutes() / 60, f = S.f;
    const amb = 29 + 3.5 * Math.sin(((h - 9) / 24) * Math.PI * 2);
    const A = S.alat;

    // --- kedatangan truk batu bara (stok di truck hopper) ---
    S.truk -= dt;
    if (S.truk <= 0) { const muat = acak(35, 45); S.stok = Math.min(140, S.stok + muat); S.truk = acak(12, 22) * 60; S.trukT = S.t; if (!cepat) kejadian("TRUCK", `Coal truck unloaded ${muat.toFixed(1)} t to receiving hopper`); }

    // --- logika otomatis: pilih silo target pengisian & discharge ---
    const pct = (i) => (S.silo[i].m / C.kapasitas) * 100;
    if (S.auto) {
      if (S.target >= 0 && (pct(S.target) >= C.auto.berhentiIsi || S.silo[S.target].f.plc)) { if (!cepat) kejadian(C.silo[S.target][0], `Filling completed at ${pct(S.target).toFixed(1)} % – diverter closed`); S.target = -1; }
      if (S.target < 0) {
        const kand = S.silo.map((s, i) => i).filter((i) => pct(i) < C.auto.mulaiIsi && !S.silo[i].f.plc).sort((a, b) => pct(a) - pct(b));
        if (kand.length) { S.target = kand[0]; if (!cepat) kejadian(C.silo[S.target][0], `Auto filling started (level ${pct(S.target).toFixed(1)} %)`); }
      }
      S.silo.forEach((s, i) => { s.isi = i === S.target; s.keluar = pct(i) > C.auto.minKeluar; });
    }
    const adaIsi = S.silo.some((s) => s.isi) && S.stok > 1;
    const adaKeluar = S.silo.some((s) => s.keluar);
    if (S.auto) {
      ["BFD-001", "CV-001", "BE-001", "CV-002"].forEach((t) => setAuto(A[t], adaIsi));
      ["DC-001", "BF-001"].forEach((t) => setAuto(A[t], adaIsi || A["DC-001"].st === "RUN" && Math.random() > 0.002));
      setAuto(A["CV-003"], adaKeluar);
      S.silo.forEach((s) => { setAuto(s.eq.DV, s.isi); ["XV", "RV", "SC"].forEach((k) => setAuto(s.eq[k], s.keluar)); });
    }
    // gangguan peralatan
    for (const [t, o] of Object.entries(A)) if (f["trip_" + t] && o.st !== "FAULT") { o.st = "FAULT"; kejadian(t, `${t} tripped (motor overload) – SIMULATION fault`); }
    S.silo.forEach((s, i) => { if (s.f.rv && s.eq.RV.st !== "FAULT") { s.eq.RV.st = "FAULT"; kejadian(C.silo[i][0], `RV-${i + 1}52 rotary valve jammed`); } });
    for (const o of Object.values(A)) if (o.st === "RUN") o.h += jam;
    S.silo.forEach((s) => Object.values(s.eq).forEach((o) => { if (o.st === "RUN") o.h += jam; }));

    const rantaiIsi = ["BFD-001", "CV-001", "BE-001", "CV-002", "DC-001"].every((t) => OK(A[t].st)) && S.stok > 0.5;
    const laju = rantaiIsi ? Math.min(C.laju.isi, (S.stok / jam) || C.laju.isi) : 0;
    S.blokIsi = S.silo.some((s) => s.isi) && !rantaiIsi ? ["BFD-001", "CV-001", "BE-001", "CV-002", "DC-001"].find((t) => !OK(A[t].st)) || (S.stok <= 0.5 ? "NO COAL STOCK" : null) : null;

    // --- tiap silo ---
    let totIn = 0;
    S.silo.forEach((s, i) => {
      const p = s.p, cap = C.kapasitas;
      const hhStop = (s.m / cap) * 100 >= C.batas.levelHH || s.v.LSH;                   // interlock overfill (HH / LSH)
      if (s.isi && hhStop && !s.hhLapor && !cepat) { s.hhLapor = true; kejadian(C.silo[i][0], "Interlock: filling blocked – level HIGH-HIGH / LSH active"); }
      if (!hhStop) s.hhLapor = false;
      const isiOK = s.isi && rantaiIsi && OK(s.eq.DV.st) && !hhStop && !s.f.plc;
      const qin = isiOK ? laju : 0;
      const keluarOK = s.keluar && ["XV", "RV", "SC"].every((k) => OK(s.eq[k].st)) && OK(A["CV-003"].st) && s.m > 2;
      const kebutuhan = S.auto ? C.laju.keluarMin + (C.laju.keluarMaks - C.laju.keluarMin) * (0.5 + 0.5 * Math.sin(S.t / 5.4e6 + i * 1.9)) : s.lajuKeluar;
      const qout = keluarOK ? Math.min(kebutuhan, s.m / jam) : 0;
      s.qin = qin; s.qout = qout; totIn += qin;
      s.m = batas(s.m + (qin - qout) * jam, 0, cap);
      s.tot.in += qin * jam; s.tot.out += qout * jam;
      S.E.day[i].in += qin * jam; S.E.day[i].out += qout * jam;

      // --- dinamika bentuk permukaan ---
      const aMax = Math.tan((C.geo.sudutCurah * Math.PI) / 180) * (G.R + p.ir) * 0.6;
      let aT, bT, tau;
      if (qin > 0 && qout > 0) { aT = aMax * 0.7; bT = 0.5; tau = 0.6; }
      else if (qin > 0) { aT = aMax * Math.min(1, qin / 100); bT = 0; tau = 0.35; }
      else if (qout > 0) { aT = 0.3; bT = 2.1 * Math.min(1, qout / 30); tau = 0.9; }
      else { aT = p.a * 0.6; bT = p.b * 0.5; tau = 10; }
      const fH = Math.min(1, Math.max(0.15, (s.m / cap) * 1.6));                 // amplitudo lebih kecil saat material di hopper
      p.a = lag(p.a, aT * fH, jam, tau); p.b = lag(p.b, bT * fH, jam, tau * (bT > p.b ? 1 : 0.5));
      p.tx = batas(p.tx + gauss() * 0.002 * Math.sqrt(jam * 60) + (qin > 0 ? (p.ix * 0.012 - p.tx) * jam : 0), -0.05, 0.05);
      p.ty = batas(p.ty + gauss() * 0.002 * Math.sqrt(jam * 60) + (qin > 0 ? (p.iy * 0.012 - p.ty) * jam : 0), -0.05, 0.05);
      p.bumps.forEach((b) => {
        b.amp = batas(b.amp + gauss() * 0.02 * Math.sqrt(jam * 60) * (qin > 0 ? 2 : 0.6), -0.35, 0.4);
        b.x = batas(b.x + gauss() * 0.03 * Math.sqrt(jam * 60), -2.6, 2.6); b.y = batas(b.y + gauss() * 0.03 * Math.sqrt(jam * 60), -2.6, 2.6);
      });

      // --- permukaan (truth) ---
      const vol = s.m / C.densitas;
      let st;
      if (!cepat) { KONTUR.hitung(p, vol, Z[i]); st = KONTUR.statistik(Z[i]); }
      const hAvg = cepat ? tinggiDatar(vol) : st ? st.avg : 0;
      const zDi = (x, y) => (cepat ? hAvg + 0.4 * p.a - 0.4 * p.b : KONTUR.sampel(Z[i], x, y));

      // --- 3D level scanner: siklus scan 60 s (20 s pemindaian) ---
      const sc = s.scan;
      if (!s.f.scanner && !s.f.plc) {
        sc.t += dt;
        if (sc.t >= 40) sc.prog = Math.min(100, ((sc.t - 40) / 20) * 100);
        if (sc.t >= 60) {
          sc.t = 0; sc.prog = 0; sc.tLast = S.t; sc.q = batas(97 - (qin > 0 ? acak(4, 9) : acak(0, 3)), 70, 99.5);
          if (!cepat) {
            if (ZImpor[i]) ZS[i].set(ZImpor[i]); else for (let k = 0; k < ZS[i].length; k++) ZS[i][k] = Number.isNaN(Z[i][k]) ? NaN : Math.max(KONTUR.F[k], Z[i][k] + gauss() * 0.025);
            ST[i] = KONTUR.statistik(ZS[i]);
          }
        }
      }
      // --- instrumen ---
      const v = s.v, beku = s.f.plc;
      if (!beku) {
        const stS = cepat ? { max: hAvg + 0.66 * p.a, min: hAvg - 0.6 * p.b, avg: hAvg, sudut: 2, vol } : ST[i] || st;
        v.scanSt = s.f.scanner ? "COMM FAIL" : sc.prog > 0 ? "SCANNING" : "IDLE";
        v.scanProg = sc.prog; v.scanQ = s.f.scanner ? 0 : sc.q; v.scanLast = sc.tLast; v.mapSt = s.f.scanner ? "STALE" : ZImpor[i] ? "IMPORTED CLOUD" : "MAPPED";
        v.hMax = stS.max; v.hMin = stS.min; v.hAvg = stS.avg; v.incl = stS.sudut; v.volScan = stS.vol;
        // radar (satu titik saja – bukan kontur!)
        if (!s.f.radar) {
          const [rx, ry] = pol(C.posRadar.r, C.posRadar.sudut), zr = zDi(rx, ry);
          v.rLvl = zr + gauss() * 0.01; v.rDist = G.Hradar - v.rLvl; v.rPct = (v.rLvl / G.Hfill) * 100; v.rSt = "OK"; v.rSQ = batas(92 - (qin > 0 ? 14 : 0) + gauss() * 2, 40, 99);
        } else { v.rSt = "FAULT"; v.rSQ = 3; }
        // load cell (pembagian menurut pusat massa material)
        const cm = cepat || !st ? [0, 0] : st.cm;
        v.WE = [45, 135, 225, 315].map((sd, k) => {
          const [ux, uy] = pol(1, sd), share = 0.25 * (1 + (2.0 * (cm[0] * ux + cm[1] * uy)) / G.R);
          let w = s.m * share + gauss() * 0.25; if (s.f.loadcell && k === 2) w *= 0.38; return Math.max(0, w);
        });
        v.WT = v.WE.reduce((a, b) => a + b, 0);
        // suhu (kabel multi-titik): tertutup material → suhu batu bara; di atas → suhu headspace
        const [tx, ty] = pol(C.posTT.r, C.posTT.sudut), zT = zDi(tx, ty);
        if (s.f.hot) s.hot = Math.min(36, s.hot + jam * 10); else s.hot = Math.max(0, s.hot - jam * 6);
        v.TT = C.tinggiTT.map((ht, k) => {
          const tutup = zT > ht + 0.2;
          const tc = C.silo[i][3][k] + 0.9 * Math.sin(S.t / 2.6e8 + s.drift + k) + (k === 2 ? s.hot : k === 1 || k === 3 ? s.hot * 0.35 : 0);
          return { v: tutup ? tc + gauss() * 0.05 : amb + 3.5 + gauss() * 0.1, tutup };
        });
        const tt = v.TT.filter((x) => x.tutup).map((x) => x.v);
        v.Tavg = tt.length ? tt.reduce((a, b) => a + b, 0) / tt.length : amb + 3.5; v.Tmax = tt.length ? Math.max(...tt) : amb + 3.5; v.Tn = tt.length;
        // level switch
        v.LSH = zDi(...pol(G.R - 0.25, 90)) >= C.tinggiLSH; v.LSL = zDi(...pol(2.3, 270)) >= C.tinggiLSL;
        // tekanan, CO, debu
        const dc = OK(A["DC-001"].st);
        v.PT = lag(v.PT ?? -3, dc ? -3.2 - (qin > 0 ? 0.9 : 0) : qin > 0 ? 6.5 : 0.4, dt, 30) + gauss() * 0.05;
        v.CO = Math.max(0, 6 + 2.6 * Math.max(0, v.Tmax - 40) + gauss() * 0.5);
        v.DUST = Math.max(0, 1.2 + (qin > 0 ? 2.6 : 0) + (!dc && qin > 0 ? 16 : 0) + gauss() * 0.15);
        // turunan untuk Key Data
        v.berat = v.WT; v.pct = (v.WT / cap) * 100; v.avail = Math.max(0, cap - v.WT); v.vol = v.volScan ?? vol; v.lvlM = v.hAvg;
        v.deviasi = v.volScan ? ((v.WT - v.volScan * C.densitas) / Math.max(1, v.volScan * C.densitas)) * 100 : 0;
      }
      v.plc = beku ? "COMM ERROR" : "ONLINE";
      // status ringkas per peralatan silo
      v.gate = OK(s.eq.XV.st) ? 100 : 0; v.rvRpm = OK(s.eq.RV.st) ? 12 + qout * 0.2 : 0; v.scA = OK(s.eq.SC.st) ? 14 + qout * 0.35 : 0;
    });
    S.stok = Math.max(0, S.stok - totIn * jam);

    // --- dust collector & bag filter ---
    const dcRun = OK(A["DC-001"].st);
    S.bag = S.bag || { dp: 9 };
    S.bag.dp = lag(S.bag.dp, dcRun ? (f.bagclog ? 19 : 9 + 2 * Math.sin(S.t / 3e6)) : 0, dt, f.bagclog ? 900 : 60);
    S.bag.debu = Math.max(0, (dcRun ? 1.8 : 0.2) + (f.bagrupture ? 22 : 0) + gauss() * 0.1);
  }

  /* ---------------- REKAMAN ---------------- */
  // log: [t, idx, pct, lvlM, berat, vol, Tavg, Tmax, hMin, hMax, hAvg, kodeStatus, totalMasuk, totalKeluar]
  function kodeStatus(s) { return (s.f.plc ? 1 : 0) | (s.f.radar ? 2 : 0) | (s.f.scanner ? 4 : 0) | (s.f.loadcell ? 8 : 0); }
  function rekamLog() {
    S.silo.forEach((s, i) => { const v = s.v; log.push([S.t, i, r1(v.pct), r2(v.lvlM), r1(v.berat), r1(v.vol), r1(v.Tavg), r1(v.Tmax), r2(v.hMin), r2(v.hMax), r2(v.hAvg), kodeStatus(s), r1(s.tot.in), r1(s.tot.out)]); });
    const maks = 7 * 288 * NS + NS * 12; if (log.length > maks) log.splice(0, log.length - maks);
  }
  const r1 = (x) => Math.round((x || 0) * 10) / 10, r2 = (x) => Math.round((x || 0) * 100) / 100;
  function rekamRT() { S.silo.forEach((s, i) => { const v = s.v; rt[i].push([S.t, v.pct, v.lvlM, v.berat, v.Tavg, v.Tmax, v.hMax, v.hMin, v.hAvg]); if (rt[i].length > 400) rt[i].shift(); }); }

  function maju(detikNyata = 1, cepat = false) {
    if (!S.jalan && !cepat) { pendengar.forEach((f) => f({ jenis: "tick" })); return; }
    let sisa = S.speed * detikNyata;
    while (sisa > 0) {
      const dt = Math.min(cepat ? 300 : 20, sisa), t0 = S.t;
      langkah(dt, cepat);
      if (!cepat && Math.floor(t0 / 10000) !== Math.floor(S.t / 10000)) rekamRT();
      if (Math.floor(t0 / 300000) !== Math.floor(S.t / 300000)) rekamLog();
      if (new Date(t0).toDateString() !== new Date(S.t).toDateString()) S.E.day = S.E.day.map(() => ({ in: 0, out: 0 }));
      sisa -= dt;
    }
    if (!cepat) pendengar.forEach((f) => f({ jenis: "tick" }));
  }
  // hitung ulang permukaan penuh (setelah histori cepat / reset / impor)
  function segarkan() {
    S.silo.forEach((s, i) => {
      KONTUR.hitung(s.p, s.m / C.densitas, Z[i]);
      if (ZImpor[i]) ZS[i].set(ZImpor[i]); else ZS[i].set(Z[i]);
      ST[i] = KONTUR.statistik(ZS[i]);
    });
    const sp = S.speed, j = S.jalan; S.speed = 1; S.jalan = true; diam = true; langkah(0.001, false); diam = false; S.speed = sp; S.jalan = j;
  }

  /* ---------------- HISTORI AWAL 7 HARI (SIMULATION) ---------------- */
  function isiAwal() {
    const sekarang = Date.now();
    S = statusAwal(); log = []; rt = rt.map(() => []);
    S.t = sekarang - 7 * 86400000; diam = true;
    const target = S.silo.map((s) => s.m);
    while (S.t < sekarang - 300000) maju(6, true);                      // 7 hari, langkah 5 menit (permukaan disederhanakan)
    // geser histori agar titik akhir = data contoh (Silo-01: 623,2 t)
    S.silo.forEach((s, i) => {
      const dm = target[i] - s.m;
      log.forEach((r) => { if (r[1] !== i) return; const m = batas(r[4] + dm, 0, C.kapasitas); const vol = m / C.densitas, hh = tinggiDatar(vol); r[4] = r1(m); r[2] = r1((m / C.kapasitas) * 100); r[5] = r1(vol); r[3] = r2(hh); r[10] = r2(hh); r[8] = r2(hh - 0.6); r[9] = r2(hh + 0.7); });
      s.m = target[i]; s.p = parAwal(i);
    });
    S.t = sekarang; S.speed = C.kecepatanAwal; S.jalan = true; diam = false;
    S.E.day = S.E.day.map(() => ({ in: 0, out: 0 }));
    segarkan();
    // isi buffer real-time 1 jam terakhir dari kondisi sekarang
    rt = rt.map(() => []);
    for (let k = 360; k > 0; k--) S.silo.forEach((s, i) => { const v = s.v, w = Math.sin(k / 40 + i) * 0.4; rt[i].push([S.t - k * 10000, v.pct - w * 0.1, v.lvlM - w * 0.03, v.berat - w * 0.8, v.Tavg + w * 0.05, v.Tmax + w * 0.05, v.hMax - w * 0.05, v.hMin + w * 0.05, v.hAvg - w * 0.03]); });
    simpan();
  }

  /* ---------------- PERINTAH OPERATOR ---------------- */
  const perintah = {
    mulai() { S.jalan = true; kejadian("SIMULATION", "START SIMULATION"); },
    berhenti() { S.jalan = false; kejadian("SIMULATION", "STOP SIMULATION (data frozen)"); },
    reset() {
      const sp = S.speed; S = Object.assign(statusAwal(), { speed: sp, t: S.t }); ZImpor.fill(null);
      segarkan(); kejadian("SIMULATION", "RESET SIMULATION – example data restored (SILO-01 623,2 t)");
    },
    mode(auto) { S.auto = auto; if (!auto) S.target = -1; kejadian("OPERATOR", auto ? "AUTO MODE selected" : "MANUAL MODE selected – operator controls filling/discharge"); },
    kecepatan(x) { S.speed = x; },
    pilih(i) { S.sel = i; },
    isi(i, on) {
      if (S.auto) return "Pindah ke MANUAL MODE dulu";
      S.silo.forEach((s, k) => { s.isi = on && k === i; if (s.isi || k === i) setAuto(s.eq.DV, s.isi); });
      kejadian(C.silo[i][0], `Operator: filling ${on ? "START (diverter open)" : "STOP"}`);
    },
    keluar(i, on) {
      if (S.auto) return "Pindah ke MANUAL MODE dulu";
      const s = S.silo[i]; s.keluar = on; ["XV", "RV", "SC"].forEach((k) => setAuto(s.eq[k], on)); if (on) setAuto(S.alat["CV-003"], true);
      kejadian(C.silo[i][0], `Operator: discharge ${on ? "START" : "STOP"}`);
    },
    laju(i, q) { S.silo[i].lajuKeluar = batas(q, 0, 60); },
    alat(tag, aksi, i) {
      const o = i === undefined || i === null ? S.alat[tag] : S.silo[i].eq[tag];
      if (!o) return;
      if (aksi === "start") { if (o.st === "FAULT") return "Reset fault dulu"; if (S.auto) return "Pindah ke MANUAL MODE dulu"; o.st = "RUN"; }
      if (aksi === "stop") { if (S.auto && o.st !== "MAINT") return "Pindah ke MANUAL MODE dulu"; if (o.st !== "FAULT") o.st = "STOP"; }
      if (aksi === "maint") o.st = o.st === "MAINT" ? "STOP" : "MAINT";
      if (aksi === "reset" && o.st === "FAULT") { o.st = "STOP"; delete S.f["trip_" + tag]; if (i !== undefined && i !== null && tag === "RV") delete S.silo[i].f.rv; }
      kejadian(i === undefined || i === null ? tag : `${tag}-${i + 1}5x`, `Operator: ${tag}${i !== undefined && i !== null ? " " + C.silo[i][0] : ""} → ${aksi.toUpperCase()}`);
    },
    gangguan(k, i = S.sel) {
      const s = S.silo[i];
      const teks = { radar: "Radar level transmitter failure (lost echo)", scanner: "3D scanner communication failure", loadcell: "Load cell C failure (signal low)", plc: "PLC communication error", hot: "Coal self-heating hot spot near TT-x13", rv: "Rotary valve jammed" }[k];
      if (teks) { s.f[k] = true; kejadian(C.silo[i][0], "Fault injected (SIMULATION): " + teks); return; }
      S.f[k] = true; kejadian("PLANT", "Fault injected (SIMULATION): " + ({ "trip_BE-001": "Bucket elevator BE-001 trip", "trip_CV-003": "Discharge conveyor CV-003 trip", "trip_DC-001": "Dust collector fan DC-001 trip", bagclog: "Bag filter clogging (high ΔP)", bagrupture: "Bag rupture (dust emission)" }[k] || k));
    },
    pulihkan() {
      S.f = {}; S.silo.forEach((s) => { s.f = {}; Object.values(s.eq).forEach((o) => { if (o.st === "FAULT") o.st = "STOP"; }); });
      Object.values(S.alat).forEach((o) => { if (o.st === "FAULT") o.st = "STOP"; });
      kejadian("SIMULATION", "All faults cleared");
    },
    scanSekarang(i) { const s = S.silo[i]; if (s.f.scanner || s.f.plc) return "Scanner tidak dapat dihubungi"; if (s.scan.t < 40) s.scan.t = 40; kejadian(C.silo[i][0], `Operator: 3D scan requested (LS-${i + 1}01)`); },
    ujiLevel(i, pct) { const s = S.silo[i]; s.m = batas((pct / 100) * C.kapasitas, 0, C.kapasitas); segarkan(); kejadian(C.silo[i][0], `TEST (SIMULATION): material set to ${pct} % for alarm test`); },
    imporCloud(i, titik) { ZImpor[i] = KONTUR.dariPointCloud(titik); S.sumberKontur[i] = `POINT CLOUD (${titik.length} pts)`; ZS[i].set(ZImpor[i]); ST[i] = KONTUR.statistik(ZS[i]); kejadian(C.silo[i][0], `Point cloud imported: ${titik.length} points – contour source = IMPORTED SCAN DATA`); },
    hapusCloud(i) { ZImpor[i] = null; S.sumberKontur[i] = "SIMULATION"; ZS[i].set(Z[i]); ST[i] = KONTUR.statistik(ZS[i]); kejadian(C.silo[i][0], "Contour source back to SIMULATION"); },
    hapusHistori() { Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k)); isiAwal(); },
  };

  /* ---------------- SIMPAN / MULAI ---------------- */
  function simpan() { simpanLS("state", S); simpanLS("log", log); simpanLS("saved", Date.now()); }
  function mulai() {
    const s = bacaLS("state", null);
    log = bacaLS("log", []);
    if (s && s.silo && s.silo.length === NS && s.alat && Object.keys(s.alat).length === C.alat.length) {
      S = Object.assign(statusAwal(), s); S.sumberKontur = Array(NS).fill("SIMULATION");
      const lewat = S.jalan ? Math.min(86400, (Date.now() - bacaLS("saved", Date.now())) / 1000) : 0;
      if (lewat > 5) { diam = true; const sp = S.speed; S.speed = 300; maju(lewat / 300, true); S.speed = sp; diam = false; }
      S.t = Math.max(S.t, Date.now() - 60000);
      segarkan();
      for (let k = 60; k > 0; k--) S.silo.forEach((x, i) => { const v = x.v; rt[i].push([S.t - k * 10000, v.pct, v.lvlM, v.berat, v.Tavg, v.Tmax, v.hMax, v.hMin, v.hAvg]); });
    } else isiAwal();
    setInterval(() => maju(1), 1000);
    setInterval(simpan, 10000);
    window.addEventListener("beforeunload", simpan);
  }

  return {
    mulai, maju, perintah, simpanLS, bacaLS, tinggiDatar, pol,
    get S() { return S; }, get log() { return log; }, get rt() { return rt; },
    Z: ZS, Zmodel: Z, get ST() { return ST; }, dengar: (f) => pendengar.push(f),
  };
})();
