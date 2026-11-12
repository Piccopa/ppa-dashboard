/* =========================================================
   SIM.JS — MESIN SIMULASI PROSES KILANG (SIMULATION)
   Model sederhana tapi konsisten (neraca massa & energi kasar):
   crude → CDU → VDU → HDT / Reformer / FCC → tangki produk → loading,
   ditambah boiler, cooling water, utilitas, flare, emisi, listrik.
   Semua nilai = SIMULATION, bukan pengukuran nyata.
   ========================================================= */
const SIM = (() => {
  const C = CONFIG;
  const KEY = C.simpanKey;
  const acak = (a, b) => a + Math.random() * (b - a);
  const batas = (x, a, b) => Math.max(a, Math.min(b, x));
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const desainM3h = (C.kapasitasBPD * 0.158987) / 24;
  const NT = TAGS.length;

  /* ---------------- PENYIMPANAN ---------------- */
  function simpanLS(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* penuh – abaikan */ } }
  function bacaLS(k, d) { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }

  /* ---------------- STATUS AWAL ---------------- */
  const kosongE = () => ({ crudeM3: 0, crudeT: 0, gasoline: 0, diesel: 0, kero: 0, naphtha: 0, fueloil: 0, lpg: 0, inter: 0, prodT: 0, dispT: 0, fg: 0, steam: 0, power: 0, water: 0, flare: 0, sulfur: 0, h2: 0 });
  function statusAwal() {
    const pompa = {}, komp = {};
    C.pompa.forEach(([id, , , , , , ,]) => {
      const sb = /B$|C$/.test(id) && !/^P-701B|^P-901B/.test(id);
      pompa[id] = { st: /^P-901/.test(id) ? "STOP" : /^P-1171/.test(id) ? "STBY" : sb ? "STBY" : "RUN", h: acak(4000, 42000), vib0: acak(1.2, 2.0), tunda: 0 };
    });
    C.kompresor.forEach(([id]) => (komp[id] = { st: /B$/.test(id) ? "STBY" : "RUN", h: acak(9000, 60000), vib0: acak(1.0, 1.8), tunda: 0 }));
    return {
      t: Date.now(), speed: C.kecepatanAwal, feedSP: C.feedAwal, F: C.feedAwal, fcc: C.unit.fcc, sru: C.unit.sru, auto: true,
      f: {}, x: new Array(NT).fill(0), pompa, komp,
      tangki: C.tangki.map((k, i) => ({ vol: k[3] * (k[2] === "crude" ? [0.62, 0.48, 0.71, 0.33][i] : acak(0.38, 0.66)), mode: "STBY", tot: acak(2e5, 9e5), din: 0, dout: 0 })),
      blr: [{ on: true }, { on: true }], flareEv: 0, terimaCrude: false, kapal: {}, wind: { s: 4, d: 135 }, hujan: 0,
      fqi101: 4.2e6, E: { day: kosongE(), month: kosongE(), year: kosongE() }, unitOff: {},
    };
  }
  let S = statusAwal();
  let V = { tag: S.x };
  let log = [], harian = [], bulanan = [], realtime = [];
  let diam = false;
  const pendengar = [];
  function kejadian(tag, teks) { if (!diam) pendengar.forEach((f) => f({ jenis: "event", tag, teks })); }

  /* ---------------- PEMILIHAN PERAN TANGKI ---------------- */
  const idxProduk = (p) => C.tangki.map((k, i) => (k[2] === p ? i : -1)).filter((i) => i >= 0);
  const PRODUK = ["crude", "gasoline", "diesel", "kero", "naphtha", "fueloil", "inter", "lpg"];
  function aturPeranAwal() {
    PRODUK.forEach((p) => {
      const ix = idxProduk(p);
      if (p === "crude") { S.tangki[ix[0]].mode = "FEED"; S.tangki[ix[2]].mode = "RECV"; return; }
      if (ix.length === 1) { S.tangki[ix[0]].mode = "RECV"; return; }
      S.tangki[ix[0]].mode = "RECV"; S.tangki[ix[1]].mode = "DISP";
    });
  }
  aturPeranAwal();
  const pct = (i) => (S.tangki[i].vol / C.tangki[i][3]) * 100;

  function gantiPeran(p) {                                     // pergantian otomatis RECV / DISP / FEED
    if (!S.auto) return;
    const ix = idxProduk(p), T = S.tangki;
    if (p === "crude") {
      const feed = ix.find((i) => T[i].mode === "FEED");
      if (feed === undefined || pct(feed) < 12) {
        const ganti = ix.filter((i) => i !== feed && T[i].mode !== "RECV").sort((a, b) => pct(b) - pct(a))[0];
        if (ganti !== undefined && pct(ganti) > 20) { if (feed !== undefined) T[feed].mode = "STBY"; T[ganti].mode = "FEED"; kejadian(C.tangki[ganti][0], `Crude feed switched to ${C.tangki[ganti][0]} (auto)`); }
      }
      const rcv = ix.find((i) => T[i].mode === "RECV");
      if (rcv === undefined || pct(rcv) > 87) {
        const ganti = ix.filter((i) => i !== rcv && T[i].mode === "STBY").sort((a, b) => pct(a) - pct(b))[0];
        if (ganti !== undefined && pct(ganti) < 80) { if (rcv !== undefined) T[rcv].mode = "STBY"; T[ganti].mode = "RECV"; kejadian(C.tangki[ganti][0], `Crude receiving switched to ${C.tangki[ganti][0]} (auto)`); }
      }
      return;
    }
    if (ix.length < 2) return;
    const rcv = ix.find((i) => T[i].mode === "RECV"), dsp = ix.find((i) => T[i].mode === "DISP");
    if (rcv !== undefined && pct(rcv) > 88 && !(S.f.overfill && C.tangki[rcv][0] === "TK-05")) {
      const ganti = ix.filter((i) => i !== rcv).sort((a, b) => pct(a) - pct(b))[0];
      if (pct(ganti) < 70) { T[rcv].mode = "DISP"; if (T[ganti].mode === "DISP") { const lain = ix.find((i) => i !== rcv && i !== ganti); if (lain !== undefined) T[lain].mode = "STBY"; } T[ganti].mode = "RECV"; kejadian(C.tangki[ganti][0], `${C.tangki[ganti][1]} now receiving rundown (auto switch)`); }
    }
    if ((dsp === undefined || pct(dsp) < 12) && ix.length > 2) {
      const ganti = ix.filter((i) => T[i].mode === "STBY").sort((a, b) => pct(b) - pct(a))[0];
      if (ganti !== undefined) { if (dsp !== undefined) T[dsp].mode = "STBY"; T[ganti].mode = "DISP"; }
    }
  }

  /* ---------------- POMPA & KOMPRESOR ---------------- */
  const grupPompa = {};
  C.pompa.forEach((p) => { const g = p[0].replace(/[A-C]$/, ""); (grupPompa[g] = grupPompa[g] || []).push(p[0]); });
  const infoPompa = {}; C.pompa.forEach((p) => (infoPompa[p[0]] = p));
  const infoKomp = {}; C.kompresor.forEach((k) => (infoKomp[k[0]] = k));
  const jalan = (id) => (S.pompa[id] || S.komp[id] || {}).st === "RUN";
  const grupJalan = (g) => grupPompa[g].filter(jalan).length;
  function autoStart(g, perlu, dt) {                         // standby auto-start bila pompa duty trip
    const anggota = grupPompa[g];
    if (grupJalan(g) >= perlu) { anggota.forEach((id) => (S.pompa[id].tunda = 0)); return; }
    const sb = anggota.find((id) => S.pompa[id].st === "STBY");
    if (!sb) return;
    S.pompa[sb].tunda += dt;
    if (S.pompa[sb].tunda >= 10) { S.pompa[sb].st = "RUN"; S.pompa[sb].tunda = 0; kejadian(sb, `${sb} auto-started (standby take-over)`); }
  }

  /* ---------------- LANGKAH SIMULASI ---------------- */
  const tgt = new Array(NT);
  function L(tag, v, tau = 60, nz = 0.004) { const t = TAG[tag]; if (t) tgt[t.i] = [v, tau, nz]; }
  const jamDari = (t) => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };

  function langkah(dt) {
    S.t += dt * 1000;
    const h = jamDari(S.t), f = S.f, jam = dt / 3600;
    tgt.fill(undefined);

    /* ---------- 0) cuaca ---------- */
    const amb = 27.5 + 4.5 * Math.sin(((h - 9) / 24) * Math.PI * 2);
    S.wind.s = batas(S.wind.s + gauss() * 0.25 * Math.sqrt(dt / 10), 0.8, 11);
    S.wind.d = (S.wind.d + gauss() * 1.5 * Math.sqrt(dt / 10) + 360) % 360;
    L("WS-1161", S.wind.s, 30, 0.05); L("WD-1161", S.wind.d, 30, 0.01); L("TT-1161", amb, 300, 0.003); L("MT-1161", 78 - 16 * Math.sin(((h - 9) / 24) * Math.PI * 2), 300, 0.01);

    /* ---------- 1) umpan crude ---------- */
    autoStart("P-101", 1, dt); autoStart("P-102", 1, dt); autoStart("P-103", 1, dt); autoStart("P-201", 1, dt);
    autoStart("P-301", 1, dt); autoStart("P-801", 1, dt); if (S.fcc) autoStart("P-871", 1, dt); autoStart("P-601", 1, dt); autoStart("P-701", 2, dt);
    // instrument air standby
    if (!jalan("K-1021A") && S.komp["K-1021B"].st === "STBY") { S.komp["K-1021B"].tunda += dt; if (S.komp["K-1021B"].tunda > 20) { S.komp["K-1021B"].st = "RUN"; kejadian("K-1021B", "Instrument air compressor B auto-started"); } }
    const feedIx = idxProduk("crude").find((i) => S.tangki[i].mode === "FEED");
    const adaCrude = feedIx !== undefined && pct(feedIx) > 3;
    const bmsOK = !f.bms;
    const pompaCrude = grupJalan("P-101") > 0;
    const Ftarget = pompaCrude && bmsOK && adaCrude && !S.unitOff.CDU ? S.feedSP : 0;
    S.F += (Ftarget - S.F) * Math.min(1, dt / (Ftarget < S.F ? 90 : 700));
    if (S.F < 0.5) S.F = Ftarget > 0 ? S.F : 0;
    const F = S.F, cduOn = F > 40;
    const y = C.yieldCDU;

    /* ---------- 2) CDU ---------- */
    const beban = F / C.feedAwal;
    const cot = bmsOK ? 360 + 2.5 * (beban - 1) : 255;
    L("FT-101", F, 20, 0.004); L("PT-101", pompaCrude ? 18.5 - 1.5 * beban * beban : 2.5, 15, 0.006); L("TT-101", S.tangki[feedIx ?? 0] ? C.tangki[feedIx ?? 0][9] + (amb - 28) * 0.2 : 33, 600, 0.004);
    L("LT-102", 45, 120, 0.02); L("PT-102", cduOn ? 9.6 : 6, 120, 0.005); L("TT-102", cduOn ? 132 : 90, 900, 0.004); L("DPT-102", cduOn ? 22 + 14 * beban : 4, 60, 0.02); L("AIT-102", cduOn ? 70 + 25 * beban : 30, 300, 0.05);
    const fgCDU = bmsOK ? (cduOn ? F * 7.6 * (1 + (cot - 360) / 400) : 450) : 0;
    L("FT-103", fgCDU, 40, 0.01); L("PT-103", bmsOK ? 1.9 + fgCDU / 9000 : 0.05, 30, 0.01); L("TT-103", cot, bmsOK ? 120 : 600, 0.0015); L("PT-104", bmsOK ? -14 - 3 * beban : -2, 20, 0.04);
    L("BMS-103", bmsOK ? 2 : 0, 1, 0);
    L("PT-105", cduOn ? 1.05 + 0.08 * beban : 0.35, 60, 0.01); L("PT-106", cduOn ? 1.25 + 0.2 * beban : 0.4, 60, 0.01); L("DPT-105", cduOn ? 9 + 12 * beban * beban : 1, 60, 0.02);
    const prof = [118, 158, 196, 232, 268, 300, 338, 346];
    prof.forEach((T0, i) => L("TT-" + (105 + i), cduOn ? T0 + (cot - 360) * (0.3 + 0.7 * i / 7) : 80 + i * 18, 300, 0.003));
    L("LT-105", 50, 90, 0.03); L("FT-105", cduOn ? F * 0.38 : 0, 40, 0.01); L("FT-106", cduOn ? F * y.diesel : 0, 40, 0.008);
    S.fqi101 += F * jam; L("FQI-101", S.fqi101, 0, 0);

    /* ---------- 3) VDU ---------- */
    const ar = cduOn ? F * y.ar : 0;
    const vduOK = grupJalan("P-201") > 0 && !S.unitOff.VDU;
    const vduF = vduOK ? ar : 0, vduOn = vduF > 20;
    const yv = C.yieldVDU;
    L("FT-201", vduF, 60, 0.006); L("TT-201", vduOn ? 404 + 2 * (beban - 1) : 260, 300, 0.002); L("PT-201", vduOn ? 30 + 4 * beban : 1013, vduOn ? 120 : 400, 0.01);
    L("TT-202", vduOn ? 72 : 45, 300, 0.005); L("TT-203", vduOn ? 362 : 240, 600, 0.002); L("LT-201", 50, 120, 0.03); L("FT-202", vduOn ? 260 + 60 * beban : 0, 60, 0.03);
    L("DPT-201", vduOn ? 1.1 + 0.6 * beban : 0.1, 60, 0.02);
    const fgVDU = vduOn ? vduF * 8.2 : 0;
    const lvgo = vduF * yv.lvgo, hvgo = vduF * yv.hvgo, vr = vduF * yv.vr, vgo = lvgo + hvgo;

    /* ---------- 4) KOMPRESOR & HIDROGEN ---------- */
    const k301 = jalan("K-301"), k302 = jalan("K-302"), k801 = jalan("K-801");
    const dieselSR = cduOn ? F * y.diesel : 0, hnap = cduOn ? F * y.hnap : 0;
    const refOK = k801 && grupJalan("P-801") > 0 && !S.unitOff.REF;
    const refF = refOK ? hnap : 0, refOn = refF > 10;
    const refH2 = refF * C.yieldREF.h2Nm3PerM3;
    const hdtOK = k301 && k302 && grupJalan("P-301") > 0 && !S.unitOff.HDT;
    let hdtF = hdtOK ? dieselSR : 0;
    const h2Lain = cduOn ? C.h2.lainNm3h * beban : 0;
    const h2Perlu = hdtF * C.h2.hdtNm3PerM3 + h2Lain;
    const smr = batas(h2Perlu - refH2, 0, C.h2.smrMaks) * (S.unitOff.H2 ? 0 : 1);
    const defisit = Math.max(0, h2Perlu - refH2 - smr);
    if (defisit > 500) hdtF = Math.max(0, hdtF - defisit / C.h2.hdtNm3PerM3);
    const hdtOn = hdtF > 10, hb = hdtF / (C.feedAwal * y.diesel);
    S.h2Defisit = defisit;

    /* ---------- 5) HDT ---------- */
    L("FT-301", hdtF, 40, 0.006); L("PT-301", hdtOK ? 62 + 0.8 * hb : 20, 120, 0.003); L("PT-302", hdtOK ? 62 + 0.8 * hb - (1.6 + 1.2 * hb * hb) : 19.6, 120, 0.003);
    L("DPT-301", hdtOK ? 160 + 120 * hb * hb : 10, 120, 0.01);
    const tIn = hdtOn ? 340 + 4 * (hb - 1) : 210;
    L("TT-301", tIn, 300, 0.002); L("TT-302", hdtOn ? tIn + 24 * hb : tIn, 400, 0.002); L("TT-303", hdtOn ? tIn + 12 * hb : tIn, 400, 0.002); L("TT-304", hdtOn ? tIn + 33 * hb : tIn, 500, 0.002);
    L("FT-302", hdtOn ? hdtF * C.h2.hdtNm3PerM3 : 0, 40, 0.01); L("FT-303", k301 ? 52000 * Math.max(0.35, hb) : 0, 20, 0.006);
    L("LT-301", 50, 120, 0.03); L("AT-301", hdtOn ? 6.5 + 2.5 * Math.max(0, hb - 1) * 6 + 0.8 * Math.sin(S.t / 9e6) : 0, 600, 0.04);
    const fgHDT = hdtOn ? hdtF * 6 : 0;

    /* ---------- 6) REFORMER ---------- */
    const rb = refF / (C.feedAwal * y.hnap);
    L("FT-801", refF, 40, 0.006);
    const rIn = refOn ? 505 + 3 * (rb - 1) : 260;
    [[0, 72], [2, 38], [4, 16]].forEach(([k, dT]) => { L("TT-" + (801 + k), rIn, 300, 0.0015); L("TT-" + (802 + k), refOn ? rIn - dT * rb : rIn, 300, 0.0015); });
    L("PT-801", refOK ? 8.4 : 2, 120, 0.004); L("DPT-801", refOK ? 55 + 35 * rb * rb : 4, 60, 0.02);
    L("FT-802", refH2, 40, 0.01); L("LT-801", 50, 120, 0.03); L("AT-801", refOn ? 98.2 + 0.4 * Math.sin(S.t / 7e6) - (rIn < 500 ? (500 - rIn) * 0.08 : 0) : 0, 900, 0.002);
    const fgREF = refOn ? refF * 42 : 0;
    L("FT-803", fgREF, 60, 0.008);

    /* ---------- 7) FCC ---------- */
    const k871 = jalan("K-871"), k872 = jalan("K-872");
    const fccOK = S.fcc && k871 && k872 && grupJalan("P-871") > 0 && !S.unitOff.FCC;
    const fccF = fccOK ? vgo : 0, fccOn = fccF > 15, fb = fccF / (C.feedAwal * y.ar * (yv.lvgo + yv.hvgo));
    const yf = C.yieldFCC;
    const coke = (fccF * 0.91 * yf.cokeWt);          // t/h
    const udara = k872 ? (fccOn ? coke * 11000 : 25000) : 0;
    const o2 = fccOn ? 2.0 + 0.3 * Math.sin(S.t / 5e6) : 0;
    L("FT-874", fccF, 40, 0.006); L("TT-871", fccOn ? 525 : S.fcc ? 380 : 30, fccOn ? 200 : 900, 0.002); L("TT-872", fccOn ? 702 + 8 * (fb - 1) : S.fcc ? 520 : 30, fccOn ? 300 : 1200, 0.002);
    L("PT-871", fccOn ? 1.75 : S.fcc ? 0.4 : 0, 60, 0.008); L("PT-872", fccOn ? 2.05 : S.fcc ? 0.5 : 0, 60, 0.008); L("DPT-871", fccOn ? 38 + 4 * fb : 0, 40, 0.03);
    L("FT-871", fccOn ? fccF * 0.91 * 6.2 / 60 : 0, 40, 0.01); L("FT-872", udara, 30, 0.006); L("FT-873", udara * 1.04, 30, 0.006);
    L("AT-871", o2, 60, 0.02); L("AT-872", fccOn ? 60 + 380 * Math.max(0, 1.4 - o2) : 0, 120, 0.05);
    L("LT-873", S.fcc ? 50 : 0, 120, 0.03); L("TT-873", fccOn ? 342 : S.fcc ? 200 : 30, 600, 0.002); L("VT-871", k871 ? 2.4 + 0.6 * fb : 0, 60, 0.04);

    /* ---------- 8) PRODUK (m³/h) ---------- */
    const yr = C.yieldREF;
    const prod = {
      lpg: (cduOn ? F * y.lpg : 0) + refF * yr.lpg + fccF * yf.lpg,
      gasoline: refF * yr.reformate + fccF * yf.gasoline,
      kero: cduOn ? F * y.kero : 0,
      diesel: hdtF,
      naphtha: cduOn ? F * y.lnap : 0,
      fueloil: vr + (ar - vduF) + (fccOn ? fccF * (yf.lco + yf.slurry) : 0) + (vgo - fccF),
      inter: (dieselSR - hdtF) + (hnap - refF) + (cduOn ? 1.5 : 0),
    };
    let prodT = 0; for (const p in prod) prodT += (prod[p] * C.rho[p]) / 1000;

    /* ---------- 9) TANGKI ---------- */
    PRODUK.forEach(gantiPeran);
    const T = S.tangki, inv = { crude: 0, produk: 0, produkT: 0 };
    // penerimaan crude (batch pipeline dari terminal laut)
    const crudeIx = idxProduk("crude"), totCrude = crudeIx.reduce((s, i) => s + pct(i), 0) / crudeIx.length;
    if (!S.terimaCrude && totCrude < 45) { S.terimaCrude = true; kejadian("CRUDE-RCV", "Crude receiving batch started (pipeline from marine terminal)"); }
    if (S.terimaCrude && totCrude > 72) { S.terimaCrude = false; kejadian("CRUDE-RCV", "Crude receiving batch completed"); }
    const jamTruk = h >= 5 && h < 22;
    let dispT = 0;
    const loading = { gasoline: 0, diesel: 0 };
    T.forEach((tk, i) => {
      const k = C.tangki[i], p = k[2], cap = k[3], lv = pct(i);
      let qin = 0, qout = 0;
      if (p === "crude") {
        if (tk.mode === "FEED") qout = F;
        if (tk.mode === "RECV" && S.terimaCrude) qin = lv < 89 ? 3000 : 0;
      } else {
        const ix = idxProduk(p), satu = ix.length === 1;
        const fraksi = ix.reduce((s, j) => s + S.tangki[j].vol, 0) / ix.reduce((s, j) => s + C.tangki[j][3], 0);
        if (tk.mode === "RECV") qin = lv < 98 ? prod[p] : 0;
        if (lv >= 98 && tk.mode === "RECV") S.overfillBlok = k[0];
        const bisaKirim = tk.mode === "DISP" || (satu && tk.mode === "RECV");
        if (bisaKirim && lv > 4) {
          if (p === "naphtha" || p === "fueloil") {                 // kapal / pipa: batch
            if (!S.kapal[p] && lv > 72) { S.kapal[p] = true; kejadian(k[0], `${k[1]} marine/pipeline export batch started`); }
            if (S.kapal[p] && lv < 25) { S.kapal[p] = false; kejadian(k[0], `${k[1]} export batch completed`); }
            qout = S.kapal[p] ? 750 : 0;
          } else if (p === "inter") qout = lv > 60 ? 25 : lv > 20 ? 2 : 0;
          else if (jamTruk) qout = (prod[p] * 24 / 17) * (0.55 + 0.9 * fraksi) * (0.85 + 0.15 * Math.sin(h * 1.3));
        }
      }
      tk.din = qin; tk.dout = qout;
      tk.vol = batas(tk.vol + (qin - qout) * jam, 0, cap);
      tk.tot += (qin + qout) * jam;
      if (p !== "crude") { dispT += (qout * C.rho[p]) / 1000 * jam; if (p === "gasoline") loading.gasoline += qout; if (p === "diesel") loading.diesel += qout; }
      if (p === "crude") inv.crude += tk.vol; else { inv.produk += tk.vol; inv.produkT += (tk.vol * C.rho[p]) / 1000; }
      // instrumen tangki
      const n = 401 + i * 10, lvl = pct(i), sph = k[6] === "SPH";
      L(`LT-${n}`, lvl, 0, 0.0008); L(`LIT-${n}`, (lvl / 100) * k[5], 0, 0.0008);
      L(`TT-${n}`, k[9] + (qin > 0 ? 3 : 0) + (amb - 28) * 0.25, 900, 0.003);
      L(`PT-${n}`, sph ? 6.4 + 0.12 * (k[9] + (amb - 28) * 0.25 - 30) + lvl * 0.004 : k[6] === "EFR" ? 0.3 : 7 + 3 * Math.sin(h / 24 * Math.PI * 2) + (qin - qout) * 0.004, 120, 0.02);
      if (TAG[`DPT-${n}`]) L(`DPT-${n}`, (C.rho[p] * 9.81 * (lvl / 100) * k[5]) / 1000, 0, 0.001);
      L(`FIT-${n}`, qin, 20, qin ? 0.01 : 0); L(`FIT-${n + 1}`, qout, 20, qout ? 0.01 : 0); L(`FQI-${n}`, tk.tot, 0, 0);
      if (TAG[`DT-${n}`]) L(`DT-${n}`, C.rho[p] * (1 - 0.0007 * ((k[9] || 30) - 15)), 600, 0.0006);
      if (k[10]) L(`AT-${n}`, k[10][2] * (1 + 0.012 * Math.sin(S.t / 4e6 + i)), 900, 0.004);
    });

    /* ---------- 10) STEAM & BOILER ---------- */
    const steamPakai = 26 + (cduOn ? F * 0.06 : 0) + vduF * 0.12 + hdtF * 0.05 + refF * 0.05 + fccF * 0.08;
    const steamWHB = fccF * 0.2 + smr * 0.0008;
    const stgPerlu = 42;                                  // uap untuk steam turbine generator (t/h, desain)
    if (f.boiler && S.blr[0].on) { S.blr[0].on = false; kejadian("B-601A", "Boiler A tripped – flame failure"); }
    const blrOn = S.blr.map((b) => b.on);
    const nOn = blrOn.filter(Boolean).length, kapBlr = nOn * 100;
    const perluBlr = steamPakai + stgPerlu - steamWHB;
    const prodBlr = batas(perluBlr, 0, kapBlr);
    const kurang = Math.max(0, perluBlr - prodBlr);
    const stgUap = Math.max(0, stgPerlu - kurang), sisaKurang = Math.max(0, kurang - stgPerlu);
    const steamTot = prodBlr + steamWHB;
    const muatB = nOn ? prodBlr / nOn : 0;
    L("PT-601", 42 - sisaKurang * 0.35 - (kurang > 0 ? 0.6 : 0), 60, 0.004); L("TT-601", nOn ? 402 : 250, 300, 0.002); L("FT-601", steamTot, 30, 0.006);
    const effB = C.efisiensiBoiler - 0.015 * Math.abs(muatB / 100 - 0.75);
    const fgB = (m) => (m * 1000 * (3214 - 546)) / (effB * C.lhvFuelGas * 1000);
    ["A", "B"].forEach((s, i) => {
      const on = blrOn[i];
      L("LT-601" + s, on ? 50 : 0, on ? 60 : 30, 0.02); L("FT-603" + s, on ? fgB(muatB) : 0, 30, 0.008);
      L("AT-602" + s, on ? 3.0 + 0.4 * Math.sin(S.t / 3e6 + i) : 20.9, 60, 0.02); L("TT-603" + s, on ? 158 + 20 * (muatB / 100) : 60, 300, 0.004);
    });
    L("FT-602", steamTot * 1.03, 30, 0.006); L("PT-602", grupJalan("P-601") ? 54.5 : 3, 10, 0.004); L("TT-602", 128, 300, 0.003); L("AT-601", 85, 900, 0.02);
    const fgBoiler = blrOn.reduce((s, on) => s + (on ? fgB(muatB) : 0), 0);

    /* ---------- 11) COOLING WATER ---------- */
    const pompaCW = grupJalan("P-701");
    const cwPerlu = 9000 + F * 8 + fccF * 6;
    const cwQ = Math.min(cwPerlu, pompaCW * 6300);
    const kipas = f.ctfan ? 2 : 4;
    const wetBulb = amb - 4;
    const cwSup = wetBulb + 4.2 + (4 - kipas) * 1.9;
    const rangeCW = cwQ > 0 ? 10 * (cwPerlu / Math.max(cwQ, 1)) * (0.6 + 0.4 * beban) : 0;
    const evap = cwQ * rangeCW * 0.0015, blow = evap / 4, makeup = evap + blow;
    S.kipas = kipas;
    L("FT-701", cwQ, 30, 0.004); L("PT-701", pompaCW ? 4.1 + 0.25 * (pompaCW - 2) : 0.4, 20, 0.006); L("TT-701", cwSup, 400, 0.003); L("TT-702", cwSup + rangeCW, 400, 0.003);
    L("LT-701", 76, 300, 0.01); L("AIT-701", 1850, 1800, 0.01); L("AIT-702", 7.9, 900, 0.004); L("AIT-703", 0.45, 600, 0.04); L("FT-703", makeup, 120, 0.01); L("FT-704", blow, 120, 0.01);

    /* ---------- 12) UTILITAS ---------- */
    const demin = steamTot * 0.12, raw = makeup + demin * 1.15 + 45;
    L("FT-1001", raw, 120, 0.01); L("AIT-1001", 35 + 25 * Math.max(0, Math.sin(S.t / 3e7)), 3600, 0.02); L("AIT-1002", 0.35, 900, 0.05); L("LT-1001", 68, 900, 0.01); L("AIT-1003", 0.18, 900, 0.06); L("FT-1002", demin, 120, 0.01);
    const ww = 110 + F * 0.09 + (h > 13 && h < 16 ? 25 : 0);
    L("FT-1011", ww, 300, 0.02); L("LT-1011", 45 + (ww - 160) * 0.2, 900, 0.01); L("AIT-1011", 55, 900, 0.05); L("AIT-1012", 6.5, 1800, 0.04); L("AIT-1013", 72, 1800, 0.03); L("AIT-1014", 7.3, 1800, 0.006); L("AIT-1015", 26, 1800, 0.04);
    const ia = jalan("K-1021A") || jalan("K-1021B");
    L("PT-1021", ia ? 7.0 : 4.6, ia ? 60 : 90, 0.004); L("AT-1021", -42, 900, 0.01);
    L("AT-1031", 99.92, 900, 0.0002); L("FT-1031", 1200 + F * 0.6, 120, 0.02); L("PT-1031", 7.6, 120, 0.004); S.lin = batas((S.lin ?? 72) - jam * 0.05 + (h > 8 && h < 8.3 ? jam * 6 : 0), 20, 95); L("LT-1031", S.lin, 0, 0.001);
    const fgTot = fgCDU + fgVDU + fgHDT + fgREF + fgBoiler + (smr ? 320 + smr * 0.13 : 0);
    L("PT-1041", 4.5, 60, 0.006); L("FT-1041", fgTot, 30, 0.006); L("AT-1041", 45, 1800, 0.05);
    L("PT-1051", defisit > 500 ? 15.5 : 20.5, 120, 0.003); L("FT-1051", smr, 60, 0.008); L("FT-1052", h2Perlu - defisit, 60, 0.008); L("AT-1051", 99.6, 1800, 0.0005);
    const sOn = S.sru && !S.unitOff.SRU;
    const sulfur = sOn && cduOn ? ((F * C.rho.crude) / 1000) * (C.crude.sulfurPct / 100) * 0.55 * 0.993 : 0;
    L("FT-1061", sulfur, 120, 0.01); L("AT-1061", sOn && cduOn ? 99.3 : 0, 600, 0.0004);

    /* ---------- 13) FLARE ---------- */
    if (f.flare) { S.flareEv = Math.max(S.flareEv, 38000); delete f.flare; kejadian("FL-901", "PSV relief to flare header (simulated upset)"); }
    S.flareEv *= Math.exp(-dt / 600);
    const flare = 380 + F * 0.4 + (S.sru && !sOn ? 2500 : 0) + (!S.sru && cduOn ? 2500 : 0) + S.flareEv;
    S.flareQ = flare;
    L("FT-901", flare, 5, 0.03); L("PT-901", 0.04 + flare / 60000, 10, 0.03); L("LT-901", batas(14 + S.flareEv / 1400, 0, 96), 300, 0.01); L("FT-902", (flare * 0.3) / 1000, 20, 0.02);
    ["A", "B", "C"].forEach((s, i) => L("TE-901" + s, f.pilot && s === "B" ? 58 : 640 + i * 12, f.pilot && s === "B" ? 90 : 60, 0.01));

    /* ---------- 14) EMISI & K3 ---------- */
    const B = C.emisiBatas, s = C.crude.sulfurPct;
    L("AT-1101", fccOn ? 560 + 160 * s : 0, 600, 0.02); L("AT-1102", fccOn ? 240 : 0, 600, 0.03); L("AT-1103", fccOn ? 70 + 420 * Math.max(0, 1.4 - o2) : 0, 300, 0.05); L("AT-1104", fccOn ? 42 : 0, 900, 0.04);
    L("AT-1111", sOn && cduOn ? 780 : 0, 600, 0.03); L("AT-1112", sOn && cduOn ? 95 : 0, 600, 0.03); L("AT-1113", sOn && cduOn ? 60 : 0, 600, 0.05); L("AT-1114", sOn && cduOn ? 9 : 0, 900, 0.05);
    L("AT-1121", nOn ? 28 : 0, 600, 0.04); L("AT-1122", nOn ? 175 : 0, 600, 0.03); L("AT-1123", nOn ? 38 : 0, 600, 0.05); L("AT-1124", nOn ? 4.5 : 0, 900, 0.05);
    L("AT-1131", bmsOK ? 32 : 0, 600, 0.04); L("AT-1132", bmsOK ? 210 : 0, 600, 0.03); L("AT-1133", bmsOK ? 46 : 0, 600, 0.05); L("AT-1134", bmsOK ? 6 : 0, 900, 0.05);
    for (let i = 0; i < 8; i++) L("GD-" + (1141 + i), f.h2s && i === 5 ? 22 : 0.35 + 0.25 * Math.abs(Math.sin(S.t / 9e5 + i)), f.h2s && i === 5 ? 90 : 120, 0.08);
    for (let i = 0; i < 6; i++) L("GD-" + (1151 + i), f.lel && i === 3 ? 46 : 0.6 + 0.6 * Math.abs(Math.sin(S.t / 7e5 + i)), f.lel && i === 3 ? 60 : 120, 0.08);
    const deluge = !!f.lel;
    S.pompa["P-1171A"].st = deluge ? "RUN" : S.pompa["P-1171A"].st === "RUN" ? "STBY" : S.pompa["P-1171A"].st;
    S.fwTk = batas((S.fwTk ?? 98) - (deluge ? jam * 6 : -jam * 2), 60, 98);
    L("PT-1171", deluge ? 9.3 : 10.4, 20, 0.005); L("LT-1171", S.fwTk, 0, 0.001);

    /* ---------- 15) POMPA & KOMPRESOR (nilai) ---------- */
    const aliranPompa = {
      "P-101": F, "P-102": cduOn ? F * 0.38 : 0, "P-103": dieselSR, "P-201": vr, "P-301": hdtF, "P-801": refF, "P-871": fccF,
      "P-601": steamTot * 1.03, "P-701": pompaCW ? cwQ / pompaCW : 0, "P-901A": loading.gasoline, "P-901B": loading.diesel, "P-1171": deluge ? 900 : 0,
    };
    // pompa loading jalan otomatis saat ada pengiriman truk
    ["P-901A", "P-901B"].forEach((id) => { const p = S.pompa[id]; if (p.st !== "TRIP" && p.st !== "OFF") p.st = aliranPompa[id] > 1 ? "RUN" : "STOP"; });
    if (f.p101 && S.pompa["P-101A"].st === "RUN") { S.pompa["P-101A"].st = "TRIP"; kejadian("P-101A", "Crude charge pump P-101A tripped (motor overload)"); delete f.p101; }
    const PV = {};
    let kWpompa = 0;
    C.pompa.forEach(([id, , , qR, kW, volt, ps, pd]) => {
      const p = S.pompa[id], g = id.replace(/[A-C]$/, ""), run = p.st === "RUN";
      const q = run ? (aliranPompa[id] ?? (aliranPompa[g] || 0)) : 0;
      const ld = batas(q / qR, 0, 1.3);
      if (id === "P-201A" && f.pvib) p.vibF = Math.min(13, (p.vibF || 0) + dt * 0.012); else p.vibF = Math.max(0, (p.vibF || 0) - dt * 0.05);
      const vib = run ? p.vib0 + 0.9 * ld + (p.vibF || 0) + gauss() * 0.08 : 0;
      if (run && vib > 11.2) { p.st = "TRIP"; kejadian(id, `${id} tripped on high-high vibration`); }
      if (run) p.h += jam;
      const kw = run ? kW * (0.28 + 0.72 * Math.pow(ld, 1.6)) : 0;
      kWpompa += kw;
      PV[id] = {
        id, st: p.st, q, ps: run ? ps * (1 + gauss() * 0.01) : ps * 0.9, pd: run ? ps + (pd - ps) * (1.12 - 0.12 * ld * ld) * (1 + gauss() * 0.005) : ps * 0.9,
        kw, v: volt ? volt * (1 + gauss() * 0.003) : 0, a: run && volt ? (kw * 1000) / (1.732 * volt * 0.88 * 0.95) : 0, hz: run ? 50 + gauss() * 0.02 : 0,
        bt: run ? 46 + 18 * ld + (amb - 28) * 0.4 + (p.vibF || 0) * 2.2 : amb + 2, vib, h: p.h, trip: p.st === "TRIP", diesel: volt === 0,
      };
    });
    if (f.k301 && S.komp["K-301"].st === "RUN") { S.komp["K-301"].st = "TRIP"; kejadian("K-301", "Recycle gas compressor K-301 tripped – HDT emergency depressuring"); S.flareEv += 14000; delete f.k301; }
    if (f.ia && S.komp["K-1021A"].st === "RUN") { S.komp["K-1021A"].st = "TRIP"; kejadian("K-1021A", "Instrument air compressor A tripped"); delete f.ia; }
    const aliranKomp = { "K-301": k301 ? 52000 * Math.max(0.35, hb) : 0, "K-302": hdtOn ? hdtF * C.h2.hdtNm3PerM3 : 0, "K-801": refH2 * 1.15, "K-871": fccOn ? 26000 * fb : 0, "K-872": udara, "K-1021A": 2100, "K-1021B": 2100 };
    const KV = {};
    let kWkomp = 0;
    C.kompresor.forEach(([id, , , tipe, rpm, qR, kW, ps, pd]) => {
      const k = S.komp[id], run = k.st === "RUN";
      const q = run ? aliranKomp[id] || 0 : 0, ld = batas(q / qR, 0, 1.2);
      const surgeF = f.surge && id === "K-801";
      const margin = run ? (surgeF ? 6 + 2 * Math.sin(S.t / 2e4) : 14 + 18 * ld) : 0;
      if (run) k.h += jam;
      const kw = run ? kW * (0.35 + 0.65 * ld) : 0; kWkomp += kw;
      const rasio = pd / Math.max(ps, 1);
      KV[id] = {
        id, tipe, st: k.st, q, ps: run ? ps * (1 + gauss() * 0.005) : ps * 0.95, pd: run ? pd * (0.96 + 0.04 * ld) * (1 + gauss() * 0.004) : ps,
        ts: 38 + (amb - 28) * 0.3, td: run ? 38 + (tipe === "Reciprocating" ? 95 : 30 + 22 * Math.log(rasio + 1)) : amb + 3,
        rpm: run ? rpm * (tipe === "Reciprocating" || tipe === "Screw" ? 1 : 0.93 + 0.07 * ld) * (1 + gauss() * 0.001) : 0,
        vib: run ? k.vib0 + 1.1 * ld + (surgeF ? 3.2 + Math.abs(gauss()) * 1.5 : 0) : 0, bt: run ? 68 + 12 * ld + (surgeF ? 6 : 0) : amb + 2,
        lop: run ? (tipe === "Reciprocating" ? 3.6 : 2.4) * (1 + gauss() * 0.01) : 0, lot: run ? 49 + (amb - 28) * 0.3 : amb,
        surge: run ? (margin < 10 ? "ANTI-SURGE ACTIVE" : "NORMAL") : "–", margin, kw, h: k.h, trip: k.st === "TRIP",
      };
    });
    L("VT-201", PV["P-201A"].vib, 0, 0); L("VT-301", KV["K-301"].vib, 30, 0.03);
    L("PT-802", k801 ? 21.5 : 7, 30, 0.006);

    /* ---------- 16) LISTRIK ---------- */
    const kWkipas = kipas * 185 + 0, kWlain = 5200 + 2600 * beban;
    const loadKW = kWpompa + kWkomp + kWkipas + kWlain;
    const stg = stgUap > 1 ? stgUap * 205 : 0;                       // ≈ 205 kW per t/h uap
    const imp = Math.max(0, loadKW - stg);
    const tr02 = !f.tr02;
    if (f.tr02 && !S.tr02Log) { S.tr02Log = true; kejadian("TR-02", "Transformer TR-02 tripped (Buchholz) – load transferred to TR-01"); }
    if (!f.tr02) S.tr02Log = false;
    const mva = imp / 0.9 / 1000, rating = 40;
    const l1 = (tr02 ? mva / 2 : mva) / rating * 100, l2 = tr02 ? mva / 2 / rating * 100 : 0;
    L("EI-1201", 150.5, 300, 0.004); L("EI-1202", 20.1 - (tr02 ? 0 : 0.25), 60, 0.002); L("SI-1201", 50, 30, 0.0006); L("JI-1201", loadKW, 20, 0.004);
    L("JI-1202", stg, 60, 0.005); L("JI-1205", imp, 20, 0.004); L("PF-1201", 0.91, 300, 0.004); L("JI-1203", l1, 30, 0.004); L("JI-1204", l2, 30, 0.004);
    L("TT-1201", amb + 18 + 0.0062 * l1 * l1, 900, 0.003); L("TT-1202", tr02 ? amb + 18 + 0.0062 * l2 * l2 : amb, 900, 0.003);

    /* ---------- 17) terapkan nilai ke tag (lag + noise; tahan nilai bila COMM LOSS) ---------- */
    const commRusak = { CDU: !!f.commCDU, TANK: !!f.commTANK };
    for (let i = 0; i < NT; i++) {
      const g = tgt[i]; if (!g) continue;
      const area = TAGS[i][1];
      if (commRusak[area]) continue;
      const [v, tau, nz] = g;
      let x = tau <= 0 ? v : S.x[i] + (v - S.x[i]) * Math.min(1, dt / tau);
      if (nz) x += Math.abs(v) * nz * gauss() * 0.6;
      S.x[i] = x;
    }

    /* ---------- 18) energi & produksi kumulatif ---------- */
    const tambah = { crudeM3: F * jam, crudeT: (F * C.rho.crude) / 1000 * jam, prodT: prodT * jam, dispT, fg: fgTot * jam, steam: steamTot * jam, power: loadKW * jam, water: raw * jam, flare: flare * jam, sulfur: sulfur * jam, h2: smr * jam };
    for (const p in prod) tambah[p] = (prod[p] * C.rho[p]) / 1000 * jam;
    for (const per of ["day", "month", "year"]) for (const k in tambah) S.E[per][k] += tambah[k];

    /* ---------- 19) ringkasan unit ---------- */
    const st = (on, ok, tersedia = true) => (!tersedia ? "OFF" : on ? "RUNNING" : ok ? "STANDBY" : "STOPPED");
    const units = {
      CDU: st(cduOn, bmsOK && pompaCrude && S.feedSP === 0), VDU: st(vduOn, vduOK), HDT: st(hdtOn, hdtOK), REF: st(refOn, refOK),
      FCC: st(fccOn, fccOK && !cduOn, S.fcc), SRU: st(sOn && cduOn, sOn, S.sru), H2: st(smr > 100, !S.unitOff.H2), BLR: nOn === 2 ? "RUNNING" : nOn ? "RUNNING" : "STOPPED",
      CW: pompaCW >= 2 ? "RUNNING" : pompaCW ? "RUNNING" : "STOPPED", TANK: "RUNNING", FLR: "RUNNING", UTIL: "RUNNING", ENV: "RUNNING", ELEC: "RUNNING",
    };
    // ketersediaan: peralatan yang diperlukan & sedang jalan
    let wajib = 0, siap = 0;
    Object.keys(grupPompa).forEach((g) => { if (/P-901|P-1171/.test(g)) return; if (g === "P-871" && !S.fcc) return; wajib++; if (grupJalan(g) >= (g === "P-701" ? 2 : 1)) siap++; });
    C.kompresor.forEach(([id]) => { if (/B$/.test(id)) return; if (!S.fcc && /K-87/.test(id)) return; wajib++; if (jalan(id) || (id === "K-1021A" && jalan("K-1021B"))) siap++; });
    ["CDU", "VDU", "HDT", "REF"].concat(S.fcc ? ["FCC"] : []).concat(S.sru ? ["SRU"] : []).forEach((u) => { wajib++; if (units[u] === "RUNNING") siap++; });
    wajib += 2; siap += nOn;

    V = {
      t: S.t, h, amb, F, Fsp: S.feedSP, desain: desainM3h, kapasitas: (F / desainM3h) * 100, bpd: (F * 24) / 0.158987, prod, prodT, inv, fgTot, steamTot, steamPakai, loadKW, stg, imp, raw, flare, smr, refH2, h2Perlu, defisit, sulfur,
      units, PV, KV, pompaCW, kipas, blrOn, muatB, effB, fgBoiler, fccOn, cduOn, deluge, availability: wajib ? (siap / wajib) * 100 : 100,
      cot, tag: S.x, commRusak, tr02, stgUap, kurangUap: kurang,
    };
  }

  /* ---------------- REKAMAN ---------------- */
  const KOLOM = ["t", "feed", "cap", "cot", "top", "vac", "hdt", "ref", "fccR", "fccG", "steam", "cw", "flare", "power", "fg", "water", "h2", "so2", "prod", "inv"];
  const x = (tag) => S.x[TAG[tag].i];
  function rekam() {
    const r = [S.t, V.F, V.kapasitas, x("TT-103"), x("TT-105"), x("PT-201"), x("TT-304"), x("TT-801"), x("TT-871"), x("TT-872"), V.steamTot, x("TT-701"), V.flare, V.loadKW, V.fgTot, V.raw, V.smr, x("AT-1101"), V.prodT, V.inv.produkT];
    return r.map((v, i) => (i === 0 ? v : Math.round(v * 100) / 100));
  }
  function ringkasHarian(tgl, E, bulan) { return { t: +tgl, bulan: !!bulan, ...E }; }
  function cekPergantian(tSebelum) {
    const a = new Date(tSebelum), b = new Date(S.t);
    if (a.toDateString() !== b.toDateString()) {
      harian.push(ringkasHarian(new Date(a.getFullYear(), a.getMonth(), a.getDate()), S.E.day));
      if (harian.length > 400) harian.shift();
      S.E.day = kosongE();
      if (a.getMonth() !== b.getMonth()) { bulanan.push(ringkasHarian(new Date(a.getFullYear(), a.getMonth(), 1), S.E.month, true)); if (bulanan.length > 72) bulanan.shift(); S.E.month = kosongE(); }
      if (a.getFullYear() !== b.getFullYear()) S.E.year = kosongE();
    }
  }
  function maju(detikNyata = 1, rekamLog = true) {
    let sisa = S.speed * detikNyata;
    while (sisa > 0) {
      const dt = Math.min(20, sisa), t0 = S.t;
      langkah(dt);
      if (Math.floor(t0 / 60000) !== Math.floor(S.t / 60000)) { realtime.push(Float32Array.from([0].concat(S.x))); realtime[realtime.length - 1].t = S.t; if (realtime.length > 240) realtime.shift(); }
      if (rekamLog && Math.floor(t0 / 300000) !== Math.floor(S.t / 300000)) { log.push(rekam()); if (log.length > 4000) log.splice(0, log.length - 4000); }
      cekPergantian(t0);
      sisa -= dt;
    }
    pendengar.forEach((f) => f({ jenis: "tick" }));
  }

  /* ---------------- DATA AWAL (histori, SIMULASI) ---------------- */
  function isiAwal() {
    const sekarang = Date.now();
    S = statusAwal(); aturPeranAwal();
    // set nilai awal tag langsung ke kondisi tunak
    S.t = sekarang - 2 * 86400000; S.speed = 1; diam = true;
    for (let i = 0; i < 40; i++) { langkah(0.001); for (let j = 0; j < NT; j++) if (tgt[j]) S.x[j] = tgt[j][0]; }
    S.speed = 300;
    const awal = performance.now();
    while (S.t < sekarang && performance.now() - awal < 5000) maju(1, true);
    if (S.t < sekarang) { const d = new Date(sekarang); d.setHours(0, 0, 0, 0); S.t = Math.max(S.t, d.getTime()); while (S.t < sekarang) maju(1, true); }
    S.t = sekarang; S.speed = C.kecepatanAwal; diam = false;
    // laporan harian 58 hari sebelumnya & 24 bulan (perkiraan dari pola simulasi)
    const contoh = harian.length ? harian : [];
    const rata = kosongE();
    if (contoh.length) for (const k in rata) rata[k] = contoh.reduce((s, d) => s + (d[k] || 0), 0) / contoh.length;
    if (!contoh.length || rata.crudeM3 < 1000) { const r = (C.feedAwal * 24); Object.assign(rata, { crudeM3: r, crudeT: r * 0.865, prodT: r * 0.84, dispT: r * 0.83, gasoline: 3000, diesel: 2700, kero: 1380, naphtha: 800, fueloil: 3300, lpg: 590, inter: 30, fg: 330000, steam: 3500, power: 620000, water: 7600, flare: 22000, sulfur: 70, h2: 140000 }); }
    const d0 = new Date(sekarang), lama = [];
    for (let d = 60; d >= 3; d--) {
      const tgl = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - d), E = {};
      const f = d % 17 === 0 ? 0.55 : acak(0.93, 1.03);                     // sesekali hari turun kapasitas
      for (const k in rata) E[k] = rata[k] * (k === "flare" && f < 0.6 ? 3.5 : f) * acak(0.97, 1.03);
      lama.push(ringkasHarian(tgl, E));
    }
    harian = lama.concat(harian.filter((h) => h.t > lama[lama.length - 1].t));
    bulanan = [];
    for (let m = 24; m >= 1; m--) {
      const tgl = new Date(d0.getFullYear(), d0.getMonth() - m, 1), hari = new Date(tgl.getFullYear(), tgl.getMonth() + 1, 0).getDate(), E = {};
      const ta = m % 11 === 0 ? 0.62 : acak(0.9, 1.0);                    // bulan turnaround parsial
      for (const k in rata) E[k] = rata[k] * hari * ta * acak(0.98, 1.02);
      bulanan.push(ringkasHarian(tgl, E, true));
    }
    const hariIni = d0.getDate() - 1;
    for (const k in rata) { S.E.month[k] = rata[k] * hariIni + (S.E.day[k] || 0); S.E.year[k] = bulanan.filter((b) => new Date(b.t).getFullYear() === d0.getFullYear()).reduce((s, b) => s + (b[k] || 0), 0) + S.E.month[k]; }
    simpan();
  }

  /* ---------------- PERINTAH OPERATOR & GANGGUAN ---------------- */
  const perintah = {
    kecepatan(x) { S.speed = x; },
    feed(v) { S.feedSP = batas(Math.round(v), 0, Math.round(desainM3h * 1.05)); kejadian("FIC-101", `Crude feed setpoint changed to ${S.feedSP} m³/h`); },
    pompa(id, aksi) {
      const p = S.pompa[id]; if (!p) return;
      if (aksi === "start") { if (p.st === "TRIP") return "Reset trip dulu"; p.st = "RUN"; }
      if (aksi === "stop") p.st = "STOP";
      if (aksi === "stby") { if (p.st === "TRIP") return "Reset trip dulu"; p.st = "STBY"; }
      if (aksi === "reset" && p.st === "TRIP") { p.st = "STOP"; p.vibF = 0; }
      kejadian(id, `Operator: ${id} ${aksi.toUpperCase()}`);
    },
    komp(id, aksi) {
      const k = S.komp[id]; if (!k) return;
      if (aksi === "start") { if (k.st === "TRIP") return "Reset trip dulu"; k.st = "RUN"; }
      if (aksi === "stop") k.st = "STOP";
      if (aksi === "stby") { if (k.st === "TRIP") return "Reset trip dulu"; k.st = "STBY"; }
      if (aksi === "reset" && k.st === "TRIP") k.st = "STOP";
      kejadian(id, `Operator: ${id} ${aksi.toUpperCase()}`);
    },
    tangki(i, mode) { S.tangki[i].mode = mode; kejadian(C.tangki[i][0], `Operator set ${C.tangki[i][0]} mode → ${mode}`); },
    tankAuto(x) { S.auto = x; kejadian("TANK", `Tank auto-switching ${x ? "ENABLED" : "DISABLED"}`); },
    fcc(x) { S.fcc = x; if (x) ["P-871A", "K-871", "K-872"].forEach((id) => { const o = S.pompa[id] || S.komp[id]; if (o.st !== "TRIP") o.st = "RUN"; }); kejadian("FCC", `FCC unit ${x ? "ENABLED (in service)" : "DISABLED (not installed / bypassed – VGO to fuel oil)"}`); },
    sru(x) { S.sru = x; kejadian("SRU", `SRU ${x ? "in service" : "out of service – acid gas to flare"}`); },
    unit(u, on) { S.unitOff[u] = !on; kejadian(u, `Operator: ${u} ${on ? "START-UP" : "NORMAL SHUTDOWN"}`); },
    boiler(i, on) { S.blr[i].on = on; if (on && i === 0) delete S.f.boiler; kejadian("B-601" + "AB"[i], `Boiler ${"AB"[i]} ${on ? "lit / in service" : "shut down"}`); },
    gangguan(k) {
      S.f[k] = true;
      const teks = { p101: "Crude charge pump P-101A trip", bms: "CDU furnace H-101 flame failure – BMS trip", k301: "HDT recycle compressor K-301 trip", surge: "Reformer compressor K-801 approaching surge", pvib: "P-201A bearing degradation (rising vibration)", ctfan: "Cooling tower fans CT-701 cell 3 & 4 failure", boiler: "Boiler B-601A trip", pilot: "Flare pilot B flame-out", flare: "PSV relief to flare header", h2s: "H₂S release near SRU", lel: "LPG leak at sphere area – deluge activated", commCDU: "DCS controller CDU communication failure", commTANK: "Tank gauging system communication failure", tr02: "Transformer TR-02 trip", ia: "Instrument air compressor A trip", overfill: "TK-05 auto-switch failure (overfill scenario)" }[k] || k;
      if (k === "bms") { S.flareEv += 16000; kejadian("H-101", "BMS-103 trip – fuel gas shut-off valves closed"); }
      if (k === "overfill") { const i = 4; S.tangki[i].vol = C.tangki[i][3] * 0.905; S.tangki[i].mode = "RECV"; S.tangki[5].mode = "DISP"; }
      kejadian("SIMULATION", "Fault injected: " + teks);
    },
    pulihkan() {
      S.f = {}; S.blr.forEach((b) => (b.on = true)); S.unitOff = {};
      Object.values(S.pompa).forEach((p) => { if (p.st === "TRIP") p.st = "STBY"; p.vibF = 0; });
      Object.entries(S.komp).forEach(([id, k]) => { if (k.st === "TRIP" || (k.st !== "RUN" && !/B$/.test(id))) k.st = /B$/.test(id) ? "STBY" : "RUN"; });
      if (!jalan("K-1021A")) S.komp["K-1021A"].st = "RUN";
      if (S.komp["K-1021B"].st === "RUN") S.komp["K-1021B"].st = "STBY";
      kejadian("SIMULATION", "All faults cleared – equipment reset to normal line-up");
    },
    resetSemua() { Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k)); log = []; harian = []; bulanan = []; realtime = []; isiAwal(); location.reload(); },
  };

  /* ---------------- MULAI ---------------- */
  function simpan() {
    simpanLS("state", { ...S, x: S.x.map((v) => Math.round(v * 1000) / 1000) });
    simpanLS("log", log); simpanLS("daily", harian); simpanLS("monthly", bulanan);
  }
  function mulai() {
    const s = bacaLS("state", null);
    log = bacaLS("log", []); harian = bacaLS("daily", []); bulanan = bacaLS("monthly", []);
    if (s && s.x && s.x.length === NT && s.tangki && s.tangki.length === C.tangki.length && s.pompa && Object.keys(s.pompa).length === C.pompa.length) {
      S = Object.assign(statusAwal(), s);
      const lewat = Math.min(86400, (Date.now() - bacaLS("saved", Date.now())) / 1000);
      const sp = S.speed; S.speed = 300; diam = true; maju(lewat / 300, true); S.speed = sp; diam = false;
    } else isiAwal();
    maju(0.05);
    setInterval(() => maju(1), 1000);
    setInterval(() => { simpan(); simpanLS("saved", Date.now()); }, 10000);
    window.addEventListener("beforeunload", () => { simpan(); simpanLS("saved", Date.now()); });
  }

  return {
    mulai, maju, perintah, KOLOM, simpanLS, bacaLS, kosongE, PRODUK, idxProduk, pct,
    get V() { return V; }, get S() { return S; }, get log() { return log; }, get harian() { return harian; }, get bulanan() { return bulanan; }, get realtime() { return realtime; },
    nilai: (tag) => (TAG[tag] ? S.x[TAG[tag].i] : NaN),
    dengar(f) { pendengar.push(f); },
  };
})();
