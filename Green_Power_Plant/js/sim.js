/* =========================================================
   SIM.JS — MESIN SIMULASI PLANT (SEMUA DATA = SIMULATION)
   Menghitung: matahari & cuaca → PV → inverter → BESS → diesel →
   bus 20 kV → pabrik & perumahan → grid, plus energi, BBM, histori.
   ========================================================= */
const SIM = (() => {
  const C = CONFIG;
  const K = C.simpanKey;
  const acak = (a, b) => a + Math.random() * (b - a);
  const batas = (x, a, b) => Math.max(a, Math.min(b, x));
  const kosongE = () => ({ pv: 0, dg: 0, fac: 0, res: 0, ch: 0, dis: 0, imp: 0, exp: 0, loss: 0, curt: 0, fuel: 0, H: 0 });

  /* ---------------- STATUS (disimpan di localStorage) ---------------- */
  function statusAwal() {
    return {
      t: Date.now(), speed: C.kecepatanAwal, mode: "GREEN",
      cloud: 0.25, cloudTarget: 0.25, wind: 2.6, rain: 0, rainDay: 0,
      inv: Array.from({ length: C.pv.array }, (_, i) => ({ run: true, fault: false, comm: true, eDay: 0, eTot: 4120 + i * 37.5, temp: 30 })),
      bess: { soc: 64, soh: 97.6, mode: "AUTO", comm: true, fault: false, temp: 27 },
      dg: { state: "STOP", mode: "AUTO", timer: 0, rpm: 0, hours: 1843.6, coolant: 31, fuelL: 36500, fault: false, faultPress: false, totalL: 152340, okSec: 0, faultSec: 0, stopTimer: 0 },
      cb: { GRID: "CLOSED", PV: "CLOSED", BESS: "CLOSED", DG: "CLOSED", FAC: "CLOSED", RES: "CLOSED" },
      grid: { ok: true }, trHot: false, heat: false, shedRes: false,
      E: { day: kosongE(), month: kosongE(), year: kosongE(), total: kosongE() },
      tr: { FAC: 48, RES: 42, PV: 46 },
    };
  }
  let S = statusAwal();
  let V = {};                                      // nilai hasil hitung terakhir
  const realtime = [];                             // buffer 1 menit simulasi (untuk trend Real Time)
  let log = [], harian = [], bulanan = [], bbm = [];
  const pendengar = [];

  /* ---------------- PENYIMPANAN ---------------- */
  const simpanLS = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) { /* penuh */ } };
  const bacaLS = (k, d) => { try { const x = JSON.parse(localStorage.getItem(K + k)); return x == null ? d : x; } catch (e) { return d; } };
  function simpan() { simpanLS("state", S); simpanLS("log", log); simpanLS("daily", harian); simpanLS("monthly", bulanan); simpanLS("fuel", bbm); }

  /* ---------------- MODEL CUACA & MATAHARI ---------------- */
  const jamDari = (t) => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
  function cuaca(dt, h) {
    if (Math.random() < dt / 2400) S.cloudTarget = Math.random() < 0.65 ? acak(0.02, 0.35) : acak(0.45, 0.95);
    S.cloud += (S.cloudTarget - S.cloud) * Math.min(1, dt / 900);
    S.wind = batas(S.wind + acak(-0.08, 0.08) * Math.sqrt(dt) + (2.8 + S.cloud * 2 - S.wind) * dt / 3000, 0.3, 12);
    S.rain = S.cloud > 0.78 && h > 12 && h < 20 ? (S.cloud - 0.78) * 30 : 0;           // mm/jam
    S.rainDay += (S.rain * dt) / 3600;
  }
  function matahari(h) {
    const a = Math.PI * (h - 6) / 12;
    const elev = Math.sin(a);
    const Gcs = elev > 0 ? 1050 * Math.pow(elev, 1.25) : 0;
    return { elev, a, G: Gcs * (1 - 0.78 * S.cloud) };
  }

  /* ---------------- PROFIL BEBAN ---------------- */
  function bebanPabrik(t, h) {
    const hari = new Date(t).getDay();
    const libur = hari === 0 ? 0.55 : hari === 6 ? 0.8 : 1;
    const shift = h >= 7 && h < 17 ? 1 : h >= 17 && h < 23 ? 0.82 : 0.58;
    const lunch = h >= 12 && h < 13 ? 0.9 : 1;
    return C.beban.pabrikMaks * shift * lunch * libur * acak(0.97, 1.03);
  }
  function bebanRumah(h, i) {
    const pagi = Math.exp(-Math.pow((h - 6.5) / 1.2, 2)) * 1.6;
    const malam = Math.exp(-Math.pow((h - 19.5) / 2.0, 2)) * 3.0;
    const kwPerRumah = 0.9 + pagi + malam + (h < 5 ? 0.3 : 0);
    const rumah = C.beban.rumah / C.beban.blok.length;
    return kwPerRumah * rumah * (0.88 + 0.05 * i) * acak(0.96, 1.04);
  }

  /* ---------------- LANGKAH SIMULASI (dt detik simulasi) ---------------- */
  function langkah(dt) {
    S.t += dt * 1000;
    const tgl = new Date(S.t);
    const h = jamDari(S.t);
    cuaca(dt, h);
    const sun = matahari(h);
    const G = sun.G;
    const Tamb = 25.5 + 6.5 * Math.sin(Math.PI * (h - 9) / 12) - S.cloud * 2 + (S.heat ? 6 : 0) - (S.rain > 0 ? 2 : 0);
    const Tmod = Tamb + (G / 800) * 26 - S.wind * 0.9 + (S.heat ? 8 : 0);

    /* ---------- 1) PV ARRAY + INVERTER ---------- */
    const gridSiap = S.grid.ok && S.cb.GRID === "CLOSED";
    const bessSiap = S.cb.BESS === "CLOSED" && S.bess.comm && !S.bess.fault && S.bess.mode !== "OFF";
    const dgJalan = S.dg.state === "RUN" && S.cb.DG === "CLOSED";
    const adaPembentuk = gridSiap || bessSiap || dgJalan;              // inverter PV butuh tegangan acuan (grid-forming)
    const pvBoleh = S.cb.PV === "CLOSED" && adaPembentuk;
    const inv = S.inv.map((u, i) => {
      const kWp = C.pv.kWpPerArray * (i === 2 ? 0.985 : 1);
      const pdcPot = kWp * (G / 1000) * (1 - 0.0038 * (Tmod - 25)) * 0.965;
      const aktif = u.run && !u.fault && pvBoleh;
      const pdc = aktif ? Math.max(0, pdcPot) : 0;
      const frac = pdc / C.pv.inverterKW;
      const eff = pdc > 1 ? 0.986 - 0.03 * Math.exp(-frac * 9) : 0;
      const pac = Math.min(pdc * eff, C.pv.inverterKW);
      return { pdcPot, pdc, pac, eff, aktif };
    });
    let pvAC = inv.reduce((s, x) => s + x.pac, 0);

    /* ---------- 2) BEBAN ---------- */
    const facOn = S.cb.FAC === "CLOSED", resOn = S.cb.RES === "CLOSED";
    let pFac = facOn ? bebanPabrik(S.t, h) : 0;
    let pResBlok = C.beban.blok.map((_, i) => (resOn && !S.shedRes ? bebanRumah(h, i) : 0));
    let pRes = pResBlok.reduce((a, b) => a + b, 0);

    /* ---------- 3) DISPATCH (EMS) ---------- */
    const B = S.bess, D = S.dg;
    const rugi = (x) => 0.012 * x + 18;                                 // rugi trafo & kabel (kW)
    let load = pFac + pRes, loss = rugi(load);
    let pDG = 0, pCh = 0, pDis = 0, imp = 0, exp = 0, curt = 0, blackout = false;

    // permintaan start/stop diesel (mode AUTO)
    const defisitAwal = load + loss - pvAC;
    const ruangDis = bessSiap ? Math.min(C.bess.pcsKW, Math.max(0, (B.soc - C.bess.socMin) / 100 * C.bess.kWh * 4)) : 0;
    const perluDG =
      (!gridSiap && defisitAwal > ruangDis) ||
      (!adaPembentuk) ||
      (!gridSiap && !bessSiap) ||                                       // pulau tanpa BESS → diesel jadi pembentuk tegangan
      (S.mode === "GREEN" && defisitAwal > 30 && (B.soc <= C.bess.socStartDG || !bessSiap)) ||
      (D.state === "RUN" && S.mode === "GREEN" && defisitAwal > 0 && B.soc < 50);
    jalankanDG(dt, D.mode === "MAN" || (D.mode === "AUTO" && perluDG), Tamb);

    if (!adaPembentuk) {
      blackout = true; pvAC = 0; pFac = 0; pRes = 0; pResBlok = pResBlok.map(() => 0); load = 0; loss = 0;
    } else {
      if (S.dg.state === "RUN" && S.cb.DG === "CLOSED") {
        const isiUlang = S.mode === "GREEN" && B.soc < 60 && bessSiap ? Math.min(400, C.bess.pcsKW) : 0;
        pDG = batas(load + loss - pvAC + isiUlang, C.dg.kW * 0.3, C.dg.kW);
      }
      let net = pvAC + pDG - load - loss;                               // + surplus, − defisit
      if (bessSiap) {
        if (B.mode === "CHARGE") { pCh = Math.min(C.bess.pcsKW * 0.6, B.soc < C.bess.socMax ? 1e9 : 0); }
        else if (B.mode === "DISCHARGE") { pDis = B.soc > C.bess.socMin ? Math.min(C.bess.pcsKW * 0.6, Math.max(0, load + loss)) : 0; }
        else if (B.mode === "AUTO") {
          if (net > 0 && B.soc < C.bess.socMax) pCh = Math.min(net, C.bess.pcsKW);
          else if (net < 0 && !(S.dg.state === "RUN")) pDis = Math.min(-net, ruangDis);
        }
      }
      net += pDis - pCh;
      if (net < 0) {                                                     // masih kurang → grid, lalu lepas beban
        if (gridSiap) { imp = Math.min(-net, C.grid.imporMaks); net += imp; }
        if (net < -1) {
          if (!S.shedRes && pRes > 0) { S.shedRes = true; kejadian("LOAD SHEDDING", "Residential feeder shed (supply deficit)"); }
          const kurang = -net - pRes;
          pRes = 0; pResBlok = pResBlok.map(() => 0);
          if (kurang > 0) pFac = Math.max(0, pFac - kurang);
          load = pFac + pRes; net = 0;
        }
      } else if (net > 0) {                                              // surplus → ekspor, sisanya dipotong (curtail)
        if (gridSiap) { exp = Math.min(net, C.grid.eksporMaks); net -= exp; }
        if (net > 0) { curt = Math.min(net, pvAC); pvAC -= curt; net -= curt; }
      }
      if (S.shedRes && (gridSiap || pvAC + pDG + ruangDis > load + 400)) S.shedRes = false;
    }

    /* ---------- 4) BESS dinamik ---------- */
    const etaC = 0.95, etaD = 0.95;
    B.soc = batas(B.soc + ((pCh * etaC - pDis / etaD) * dt / 3600) / C.bess.kWh * 100, 0, 100);
    B.temp += ((26 + Math.max(0, Tamb - 28) * 0.4 + Math.abs(pCh - pDis) / 260) - B.temp) * Math.min(1, dt / 1800);
    const vB = C.bess.vNom + (B.soc - 50) * 1.9;

    /* ---------- 5) Inverter (status, energi) ---------- */
    const faktorKurtail = inv.reduce((s, x) => s + x.pac, 0) > 0 ? pvAC / inv.reduce((s, x) => s + x.pac, 0) : 0;
    const invV = inv.map((x, i) => {
      const u = S.inv[i];
      const pac = x.pac * faktorKurtail;
      const pdc = x.eff > 0 ? pac / x.eff : 0;
      const vdc = pdc > 1 ? C.pv.vMpp * (1 - 0.0034 * (Tmod - 25)) : (G > 5 && x.aktif ? 1310 : 0);
      const idc = vdc > 0 ? (pdc * 1000) / vdc : 0;
      const pf = pac > 5 ? 0.99 : 0;
      const q = pac * 0.142, s = Math.hypot(pac, q);
      const iac = s > 0 ? (s * 1000) / (Math.sqrt(3) * C.pv.vAC) : 0;
      u.temp += ((Tamb + 6 + (pac / C.pv.inverterKW) * 22) - u.temp) * Math.min(1, dt / 600);
      u.eDay += (pac * dt) / 3600; u.eTot += (pac * dt) / 3600 / 1000;
      const status = !u.comm ? "COMM LOSS" : u.fault ? "FAULT" : !u.run ? "STOP" : pac > 1 ? "RUNNING" : "STANDBY";
      return { id: "INV-0" + (i + 1), status, pdc, vdc, idc, pac, vac: pac > 0 || adaPembentuk ? C.pv.vAC * acak(0.998, 1.002) : 0, iac, q, s, pf, eff: x.eff * 100,
        f: adaPembentuk ? 50 + acak(-0.02, 0.02) : 0, eDay: u.eDay, eTot: u.eTot, temp: u.temp, strI: idc / 120, pot: x.pdcPot };
    });

    /* ---------- 6) Bus 20 kV, feeder, trafo ---------- */
    const gen = pvAC + pDG + pDis + imp;
    const busV = adaPembentuk ? C.grid.kV * 1000 * (gridSiap ? acak(0.995, 1.005) : acak(0.99, 1.01)) : 0;
    const busQ = gen * 0.22, busS = Math.hypot(gen, busQ);
    const f = !adaPembentuk ? 0 : gridSiap ? 50 + acak(-0.02, 0.02) : 50 + acak(-0.06, 0.06);
    const sFac = pFac / 0.92, sRes = pRes / 0.95;
    const trTarget = { FAC: 34 + 32 * Math.pow(sFac / C.trafo.FAC, 2) + Tamb - 28 + (S.trHot ? 42 : 0), RES: 32 + 30 * Math.pow(sRes / C.trafo.RES, 2) + Tamb - 28, PV: 32 + 30 * Math.pow(pvAC / C.trafo.PV, 2) + Tamb - 28 };
    for (const k in trTarget) S.tr[k] += (trTarget[k] - S.tr[k]) * Math.min(1, dt / 900);

    /* ---------- 7) Energi ---------- */
    const jam = dt / 3600;
    const tambah = { pv: pvAC * jam, dg: pDG * jam, fac: pFac * jam, res: pRes * jam, ch: pCh * jam, dis: pDis * jam, imp: imp * jam, exp: exp * jam, loss: loss * jam, curt: curt * jam, fuel: (V.dg ? V.dg.fuelLh : 0) * jam, H: (G / 1000) * jam };
    for (const p of ["day", "month", "year", "total"]) for (const k in tambah) S.E[p][k] += tambah[k];

    /* ---------- 8) Simpan nilai untuk tampilan ---------- */
    const Ed = S.E.day;
    const load2 = pFac + pRes;
    V = {
      t: S.t, h, tgl, sun, G, Tamb, Tmod, wind: S.wind, rain: S.rain, rainDay: S.rainDay, cloud: S.cloud,
      inv: invV, pvAC, pvDC: invV.reduce((s, x) => s + x.pdc, 0), pvPot: inv.reduce((s, x) => s + x.pdcPot, 0),
      vdc: avg(invV.filter((x) => x.vdc > 0).map((x) => x.vdc)), idc: invV.reduce((s, x) => s + x.idc, 0),
      strI: avg(invV.filter((x) => x.strI > 0).map((x) => x.strI)),
      kWp: C.pv.array * C.pv.kWpPerArray,
      pr: Ed.H > 0.05 ? batas((Ed.pv / (C.pv.array * C.pv.kWpPerArray * Ed.H)) * 100, 0, 100) : 0,
      avail: (S.inv.filter((u) => u.run && !u.fault).length / S.inv.length) * 100,
      bess: {
        p: pDis - pCh, pch: pCh, pdis: pDis, soc: B.soc, soh: B.soh, temp: B.temp, v: bessSiap || S.cb.BESS === "CLOSED" ? vB : vB,
        i: ((pDis - pCh) * 1000) / vB, cap: C.bess.kWh, rem: (B.soc / 100) * C.bess.kWh * (B.soh / 100),
        status: !B.comm ? "OFFLINE" : B.fault ? "FAULT" : pCh > 5 ? "CHARGING" : pDis > 5 ? "DISCHARGING" : "STANDBY",
        comm: B.comm, mode: B.mode, siap: bessSiap,
      },
      dg: hitungDG(pDG, Tamb), pDG,
      grid: { ok: S.grid.ok, siap: gridSiap, imp, exp, p: imp - exp },
      bus: { v: busV, i: busV > 0 ? (busS * 1000) / (Math.sqrt(3) * busV) : 0, p: gen, q: busQ, s: busS, f, pf: busS > 0 ? gen / busS : 0 },
      fac: { p: pFac, v: facOn && adaPembentuk ? 400 * acak(0.99, 1.01) : 0, i: sFac > 0 ? (sFac * 1000) / (Math.sqrt(3) * 400) : 0, pf: pFac > 0 ? 0.92 : 0, tr: (sFac / C.trafo.FAC) * 100, trT: S.tr.FAC, cb: S.cb.FAC, supply: pFac > 0 ? "ENERGIZED" : "DE-ENERGIZED" },
      res: { p: pRes, blok: pResBlok, v: resOn && adaPembentuk && !S.shedRes ? 400 * acak(0.985, 1.005) : 0, i: sRes > 0 ? (sRes * 1000) / (Math.sqrt(3) * 400) : 0, pf: pRes > 0 ? 0.95 : 0, tr: (sRes / C.trafo.RES) * 100, trT: S.tr.RES, cb: S.cb.RES,
        supply: pRes > 0 ? "ENERGIZED" : "DE-ENERGIZED", rumah: pRes > 0 ? C.beban.rumah : 0 },
      load: load2, loss, curt, blackout, shedRes: S.shedRes,
      re: reDari({ pv: pvAC, dis: pDis, dg: pDG, imp }),
      cb: S.cb, mode: S.mode, trPV: (pvAC / C.trafo.PV) * 100, trPVT: S.tr.PV,
    };
    V.co2 = S.E.total.pv * C.emisi.gridKgPerKWh;
  }
  // Kontribusi energi terbarukan = porsi sumber terbarukan (solar + baterai yang diisi solar) dari total pasokan ke bus
  function reDari(E) { const tot = (E.pv || 0) + (E.dg || 0) + (E.dis || 0) + (E.imp || 0); return tot > 0 ? Math.min(100, (((E.pv || 0) + (E.dis || 0)) / tot) * 100) : 0; }
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

  /* ---------------- DIESEL GENERATOR ---------------- */
  function jalankanDG(dt, perlu, Tamb) {
    const D = S.dg;
    if (D.fault) { D.state = "FAULT"; D.rpm = Math.max(0, D.rpm - 300 * dt); return; }
    if (D.fuelL <= 5 && D.state !== "STOP") { D.state = "STOP"; kejadian("DG-01", "Generator stopped – fuel tank empty"); }
    switch (D.state) {
      case "FAULT": D.state = "STOP"; break;
      case "STOP":
        D.rpm = 0;
        if (perlu && D.fuelL > 5 && D.mode !== "OFF") { D.state = "CRANK"; D.timer = 8; D.starts = (D.starts || 0) + 1; kejadian("DG-01", "Generator start request (" + (D.mode === "MAN" ? "manual" : "EMS auto") + ")"); }
        break;
      case "CRANK": D.timer -= dt; D.rpm = 1500 * (1 - Math.max(0, D.timer) / 8); if (D.timer <= 0) { D.state = "WARMUP"; D.timer = 60; } break;
      case "WARMUP": D.rpm = 1500; D.timer -= dt; if (D.timer <= 0) { D.state = "RUN"; D.stopTimer = 0; kejadian("DG-01", "Generator on load – breaker CB-DG closed to bus"); } break;
      case "RUN":
        D.rpm = 1500;
        if (!perlu) { D.stopTimer += dt; if (D.stopTimer > 900) { D.state = "COOLDOWN"; D.timer = 180; kejadian("DG-01", "Generator unloaded – cool-down"); } }
        else D.stopTimer = 0;
        break;
      case "COOLDOWN": D.rpm = 1500; D.timer -= dt; if (perlu) { D.state = "RUN"; } else if (D.timer <= 0) { D.state = "STOP"; kejadian("DG-01", "Generator stopped"); } break;
    }
    const jalan = D.state !== "STOP" && D.state !== "FAULT";
    D.coolant += ((jalan ? 83 : Tamb + 2) - D.coolant) * Math.min(1, dt / (jalan ? 400 : 1500));
    if (jalan) D.hours += dt / 3600;
    if (D.state === "FAULT") D.faultSec += dt; else D.okSec += dt;
  }
  function hitungDG(p, Tamb) {
    const D = S.dg;
    const jalan = D.state !== "STOP" && D.state !== "FAULT";
    const fuelLh = !jalan ? 0 : D.state === "RUN" ? 0.06 * C.dg.kW + 0.215 * p : 26;
    return {
      state: D.state, mode: D.mode, p, rpm: D.rpm + (jalan ? acak(-3, 3) : 0), fuelLh,
      fuelT: Tamb + (jalan ? 12 : 4), fuelP: jalan ? (D.faultPress ? 1.05 : 3.6) : 0.25, oilP: jalan ? 4.3 * Math.min(1, D.rpm / 1500) : 0, coolant: D.coolant,
      hours: D.hours, fuelL: D.fuelL, pct: (D.fuelL / C.dg.tangkiL) * 100, sfc: p > 20 ? fuelLh / p : 0,
      estJam: D.fuelL / (fuelLh > 30 ? fuelLh : 0.06 * C.dg.kW + 0.215 * C.dg.kW * 0.75),
      avail: (D.okSec / Math.max(1, D.okSec + D.faultSec)) * 100, totalL: D.totalL, fault: D.fault, faultPress: D.faultPress,
    };
  }

  /* ---------------- KEJADIAN (event log) ---------------- */
  let diam = false;                                 // saat mengisi histori awal, kejadian tidak diumumkan
  function kejadian(tag, teks) { if (diam) return; pendengar.forEach((f) => f({ jenis: "event", tag, teks, t: S.t })); }

  /* ---------------- PERGANTIAN HARI / BULAN / TAHUN ---------------- */
  function cekPergantian(tSebelum) {
    const a = new Date(tSebelum), b = new Date(S.t);
    if (a.toDateString() !== b.toDateString()) {
      const E = S.E.day;
      harian.push(ringkasHarian(a, E));
      if (harian.length > 400) harian.shift();
      bbm.push({ t: +new Date(a.getFullYear(), a.getMonth(), a.getDate()), jenis: "DAILY", liter: E.fuel, level: (S.dg.fuelL / C.dg.tangkiL) * 100, ket: "Daily consumption" });
      if (bbm.length > 500) bbm.shift();
      S.E.day = kosongE(); S.inv.forEach((u) => (u.eDay = 0)); S.rainDay = 0;
      if (a.getMonth() !== b.getMonth()) {
        bulanan.push(ringkasHarian(new Date(a.getFullYear(), a.getMonth(), 1), S.E.month, true));
        if (bulanan.length > 72) bulanan.shift();
        S.E.month = kosongE();
      }
      if (a.getFullYear() !== b.getFullYear()) S.E.year = kosongE();
    }
  }
  function ringkasHarian(tgl, E, bulan) {
    const load = E.fac + E.res;
    return {
      t: +tgl, bulan: !!bulan, pv: E.pv, dg: E.dg, fac: E.fac, res: E.res, ch: E.ch, dis: E.dis, imp: E.imp, exp: E.exp, loss: E.loss, fuel: E.fuel, H: E.H,
      re: reDari(E),
    };
  }

  /* ---------------- REKAM DATA (data logger) ---------------- */
  // kolom: t, G, Tamb, Tmod, pv, dg, fac, res, bess(+dis/−ch), soc, fuelLh, fuelPct, imp, exp, busV, f
  const KOLOM = ["t", "G", "Tamb", "Tmod", "pv", "dg", "fac", "res", "bess", "soc", "fuelLh", "fuelPct", "imp", "exp", "busV", "f"];
  function rekam() {
    return [Math.round(V.t / 1000) * 1000, r1(V.G), r1(V.Tamb), r1(V.Tmod), r1(V.pvAC), r1(V.pDG), r1(V.fac.p), r1(V.res.p), r1(V.bess.p), r1(V.bess.soc), r1(V.dg.fuelLh), r1(V.dg.pct), r1(V.grid.imp), r1(V.grid.exp), Math.round(V.bus.v), +V.bus.f.toFixed(2)];
  }
  const r1 = (x) => Math.round(x * 10) / 10;

  /* ---------------- MAJU WAKTU (dipanggil tiap detik nyata) ---------------- */
  function maju(detikNyata = 1, rekamLog = true) {
    let sisa = S.speed * detikNyata;
    while (sisa > 0) {
      const dt = Math.min(30, sisa);
      const t0 = S.t;
      langkah(dt);
      // konsumsi BBM
      const L = (V.dg.fuelLh * dt) / 3600;
      S.dg.fuelL = Math.max(0, S.dg.fuelL - L); S.dg.totalL += L;
      if (Math.floor(t0 / 60000) !== Math.floor(S.t / 60000)) { realtime.push(rekam()); if (realtime.length > 240) realtime.shift(); }
      if (rekamLog && Math.floor(t0 / 300000) !== Math.floor(S.t / 300000)) { log.push(rekam()); if (log.length > 4000) log.splice(0, log.length - 4000); }
      cekPergantian(t0);
      sisa -= dt;
    }
    pendengar.forEach((f) => f({ jenis: "tick" }));
  }

  /* ---------------- DATA AWAL (histori 7 hari + 12 bulan, SIMULASI) ---------------- */
  function isiAwal() {
    const sekarang = Date.now();
    S = statusAwal();
    S.t = sekarang - 7 * 86400000; S.speed = 300; diam = true;
    const awal = performance.now();
    while (S.t < sekarang && performance.now() - awal < 4000) {
      maju(1, true);
      if (S.dg.fuelL < C.dg.tangkiL * 0.3) { diam = false; perintah.isiBBM(25000); diam = true; }   // pengiriman BBM terjadwal (histori)
    }
    if (S.t < sekarang) {                       // komputer lambat: lompat ke awal hari ini lalu isi hari ini saja
      const d = new Date(sekarang); d.setHours(0, 0, 0, 0);
      S.t = Math.max(S.t, d.getTime());
      while (S.t < sekarang) { maju(1, true); if (S.dg.fuelL < C.dg.tangkiL * 0.3) { diam = false; perintah.isiBBM(25000); diam = true; } }
    }
    S.t = sekarang; S.speed = C.kecepatanAwal; diam = false;
    // ringkasan bulanan 12 bulan terakhir (perkiraan dari pola harian + musim)
    const contoh = harian.length ? harian : [{ pv: 26000, dg: 6000, fac: 52000, res: 6500, ch: 6000, dis: 5600, imp: 4000, exp: 1500, loss: 900, fuel: 1800, H: 4.8 }];
    const rata = {}; ["pv", "dg", "fac", "res", "ch", "dis", "imp", "exp", "loss", "fuel", "H"].forEach((k) => (rata[k] = avg(contoh.map((d) => d[k] || 0))));
    bulanan = [];
    const d0 = new Date(sekarang);
    for (let m = 48; m >= 1; m--) {
      const tgl = new Date(d0.getFullYear(), d0.getMonth() - m, 1);
      const hari = new Date(tgl.getFullYear(), tgl.getMonth() + 1, 0).getDate();
      const musim = 1 + 0.12 * Math.cos(((tgl.getMonth() - 8) / 12) * Math.PI * 2);   // kemarau lebih cerah
      const E = {};
      for (const k in rata) E[k] = rata[k] * hari * (k === "pv" || k === "H" || k === "exp" || k === "ch" ? musim : k === "dg" || k === "fuel" || k === "imp" ? 2 - musim : 1) * acak(0.95, 1.05);
      bulanan.push(ringkasHarian(tgl, E, true));
    }
    // laporan harian 60 hari sebelumnya (perkiraan dari pola 7 hari simulasi)
    const lama = [];
    for (let d = 60; d >= 8; d--) {
      const tgl = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - d), E = {};
      for (const k in rata) E[k] = rata[k] * (k === "fac" && tgl.getDay() === 0 ? 0.6 : 1) * acak(0.85, 1.15);
      lama.push(ringkasHarian(tgl, E));
    }
    harian = lama.concat(harian);
    // total bulan & tahun berjalan (perkiraan)
    const hariIni = d0.getDate() - 1;
    // energi hari ini (hasil simulasi sejak 00:00) tetap dipakai, lalu ditambahkan ke bulan/tahun/total
    for (const k in rata) { const hi = S.E.day[k] || 0; S.E.month[k] = rata[k] * hariIni + hi; S.E.year[k] = bulanan.filter((b) => new Date(b.t).getFullYear() === d0.getFullYear()).reduce((s, b) => s + (b[k] || 0), 0) + S.E.month[k]; S.E.total[k] = S.E.year[k] + rata[k] * 365 * 2.4; }
    simpan();
  }

  /* ---------------- PERINTAH OPERATOR & GANGGUAN ---------------- */
  const perintah = {
    kecepatan(x) { S.speed = x; },
    modeEMS(m) { S.mode = m; kejadian("EMS", "EMS dispatch mode → " + (m === "GREEN" ? "Green priority (PV → BESS → Diesel → Grid)" : "Grid backup (PV → BESS → Grid, Diesel on grid failure)")); },
    breaker(k, buka) { S.cb[k] = buka ? "OPEN" : "CLOSED"; if (k === "GRID" && !buka && !S.grid.ok) { S.cb.GRID = "TRIP"; return "Grid not available"; } kejadian("CB-" + k, "Breaker " + (buka ? "opened" : "closed") + " by operator"); },
    inverter(i, aksi) { const u = S.inv[i]; if (aksi === "start") u.run = true; if (aksi === "stop") u.run = false; if (aksi === "reset") { u.fault = false; u.comm = true; } kejadian("INV-0" + (i + 1), "Inverter " + aksi.toUpperCase() + " by operator"); },
    bessMode(m) { S.bess.mode = m; kejadian("BESS", "BESS mode → " + m); },
    dgMode(m) { S.dg.mode = m; if (m === "OFF" && S.dg.state !== "STOP") { S.dg.state = "COOLDOWN"; S.dg.timer = 60; } kejadian("DG-01", "Generator mode → " + m); },
    dgReset() { S.dg.fault = false; S.dg.faultPress = false; S.dg.state = "STOP"; kejadian("DG-01", "Generator fault reset"); },
    isiBBM(liter = 20000) {
      const masuk = Math.min(liter, C.dg.tangkiL - S.dg.fuelL); S.dg.fuelL += masuk;
      bbm.push({ t: S.t, jenis: "REFILL", liter: masuk, level: (S.dg.fuelL / C.dg.tangkiL) * 100, ket: "Fuel delivery (truck) – SIMULATION" });
      if (!diam) kejadian("TK-301", `Fuel received ${Math.round(masuk).toLocaleString("id-ID")} L`);
    },
    gangguan(jenis) {
      const g = {
        grid: () => { S.grid.ok = false; S.cb.GRID = "TRIP"; },
        inverter: () => { S.inv[2].fault = true; },
        dg: () => { S.dg.fault = true; },
        bms: () => { S.bess.comm = false; },
        comm: () => { S.inv[5].comm = false; },
        fac: () => { S.cb.FAC = "TRIP"; },
        res: () => { S.cb.RES = "TRIP"; },
        trafo: () => { S.trHot = true; },
        fuel: () => { S.dg.fuelL = C.dg.tangkiL * 0.085; },
        fuelP: () => { S.dg.faultPress = true; },
        panas: () => { S.heat = true; },
        awan: () => { S.cloud = S.cloudTarget = 0.95; },
      };
      if (g[jenis]) g[jenis]();
      kejadian("SIM", "Fault injected: " + jenis.toUpperCase() + " (SIMULATION)");
    },
    pulihkan() {
      S.grid.ok = true; S.inv.forEach((u) => { u.fault = false; u.comm = true; u.run = true; }); S.dg.fault = false; S.dg.faultPress = false;
      if (S.dg.state === "FAULT") S.dg.state = "STOP";
      S.bess.comm = true; S.bess.fault = false; S.trHot = false; S.heat = false; S.cloudTarget = 0.25;
      for (const k in S.cb) S.cb[k] = "CLOSED";
      kejadian("SIM", "All simulated faults cleared, breakers closed");
    },
    resetSemua() { ["state", "log", "daily", "monthly", "fuel", "alarm"].forEach((k) => localStorage.removeItem(K + k)); location.reload(); },
  };

  /* ---------------- MULAI ---------------- */
  function mulai() {
    const s = bacaLS("state", null);
    log = bacaLS("log", []); harian = bacaLS("daily", []); bulanan = bacaLS("monthly", []); bbm = bacaLS("fuel", []);
    if (s && s.inv && s.inv.length === C.pv.array) {
      S = Object.assign(statusAwal(), s);
      // waktu nyata yang lewat sejak terakhir dibuka dikejar maksimal 1 hari (cepat)
      const lewat = Math.min(86400, (Date.now() - (bacaLS("saved", Date.now()))) / 1000);
      const sp = S.speed; S.speed = 300; diam = true; maju(lewat / 300, true); S.speed = sp; diam = false;
    } else isiAwal();
    maju(0.05);
    setInterval(() => { maju(1); }, 1000);
    setInterval(() => { simpan(); simpanLS("saved", Date.now()); }, 10000);
    window.addEventListener("beforeunload", () => { simpan(); simpanLS("saved", Date.now()); });
  }

  return {
    mulai, maju, perintah, KOLOM, reDari,
    get V() { return V; }, get S() { return S; }, get log() { return log; }, get harian() { return harian; }, get bulanan() { return bulanan; }, get bbm() { return bbm; }, get realtime() { return realtime; },
    dengar(f) { pendengar.push(f); }, simpanLS, bacaLS,
  };
})();
