/* =========================================================
   ALARMS.JS — ALARM & EVENT MANAGEMENT (gaya ISA-18.2)
   Status alarm : ACTIVE (belum di-ack) → ACKNOWLEDGED → CLEARED
                  bila kondisi hilang sebelum di-ack → RTN UNACK (tetap tampil)
   Prioritas    : CRITICAL · HIGH · MEDIUM · LOW
   Status silo  : NORMAL · WARNING · HIGH LEVEL · LOW LEVEL · HIGH TEMPERATURE ·
                  INSTRUMENT FAULT · COMMUNICATION ERROR
   ========================================================= */
const ALARM = (() => {
  const C = CONFIG;
  let riwayat = SIM.bacaLS("alarm", []);
  let event = SIM.bacaLS("event", []);
  let nomor = SIM.bacaLS("almNo", 1000);
  const aktif = {};
  riwayat.filter((a) => a.state !== "CLEARED").forEach((a) => (aktif[a.key] = a));
  const pendengar = [];
  const PRI = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  // status silo → urutan prioritas tampilan & warna
  const STATUS = [
    ["COMMUNICATION ERROR", "grey"], ["INSTRUMENT FAULT", "red"], ["HIGH TEMPERATURE", "red"],
    ["HIGH LEVEL", "red"], ["LOW LEVEL", "yellow"], ["WARNING", "yellow"], ["NORMAL", "green"],
  ];

  /* ---------------- daftar kondisi alarm ---------------- */
  function kondisi() {
    const S = SIM.S, B = C.batas, out = [];
    const A = (key, eq, tag, desk, pri, kat, on, val) => on && out.push({ key, eq, tag, desk, pri, kat, val });
    S.silo.forEach((s, i) => {
      const n = i + 1, v = s.v, eq = C.silo[i][1], k = (x) => `${n}:${x}`;
      if (!v.WE) return;
      A(k("COMM"), eq, `PLC-0${n}`, "PLC communication error – silo values frozen (last good value)", "CRITICAL", "COMMUNICATION ERROR", s.f.plc, "No response");
      if (s.f.plc) return;                                                   // nilai lain beku → alarm proses ditahan
      const p = v.pct;
      A(k("LHH"), eq, `LT-${n}02`, `Silo level HIGH-HIGH (≥ ${B.levelHH} %) – stop filling`, "CRITICAL", "HIGH LEVEL", p >= B.levelHH, fmt(p, 1) + " %");
      A(k("LH"), eq, `LT-${n}02`, `Silo level HIGH (≥ ${B.levelH} %)`, "HIGH", "HIGH LEVEL", p >= B.levelH && p < B.levelHH, fmt(p, 1) + " %");
      A(k("LL"), eq, `LT-${n}02`, `Silo level LOW (≤ ${B.levelL} %)`, "MEDIUM", "LOW LEVEL", p <= B.levelL && p > B.levelLL, fmt(p, 1) + " %");
      A(k("LLL"), eq, `LT-${n}02`, `Silo level LOW-LOW (≤ ${B.levelLL} %) – discharge at risk`, "HIGH", "LOW LEVEL", p <= B.levelLL, fmt(p, 1) + " %");
      A(k("LSH"), eq, `LSH-${n}21`, "High level switch activated (overfill protection)", "CRITICAL", "HIGH LEVEL", v.LSH, "ACTIVE");
      A(k("LSL"), eq, `LSL-${n}22`, "Low level switch uncovered – material below 3 m", "MEDIUM", "LOW LEVEL", !v.LSL, "UNCOVERED");
      A(k("THH"), eq, `TT-${n}1x`, `Coal temperature HIGH-HIGH (≥ ${B.tempHH} °C) – self-heating risk`, "CRITICAL", "HIGH TEMPERATURE", v.Tmax >= B.tempHH, fmt(v.Tmax, 1) + " °C");
      A(k("TH"), eq, `TT-${n}1x`, `Coal temperature HIGH (≥ ${B.tempH} °C)`, "HIGH", "HIGH TEMPERATURE", v.Tmax >= B.tempH && v.Tmax < B.tempHH, fmt(v.Tmax, 1) + " °C");
      A(k("COHH"), eq, `AT-${n}41`, `CO headspace HIGH-HIGH (≥ ${B.coHH} ppm) – smouldering suspected`, "CRITICAL", "HIGH TEMPERATURE", v.CO >= B.coHH, fmt(v.CO, 0) + " ppm");
      A(k("COH"), eq, `AT-${n}41`, `CO headspace HIGH (≥ ${B.coH} ppm)`, "HIGH", "WARNING", v.CO >= B.coH && v.CO < B.coHH, fmt(v.CO, 0) + " ppm");
      A(k("RDR"), eq, `LT-${n}02`, "Radar level transmitter failure (lost echo / signal fault)", "HIGH", "INSTRUMENT FAULT", v.rSt === "FAULT", "FAULT");
      A(k("SCN"), eq, `LS-${n}01`, "3D level scanner communication failure – contour map stale", "HIGH", "INSTRUMENT FAULT", v.scanSt === "COMM FAIL", "NO DATA");
      A(k("SCQ"), eq, `LS-${n}01`, "3D scan quality low (< 80 %) – dust / reflection", "LOW", "WARNING", v.scanSt !== "COMM FAIL" && v.scanQ < 80, fmt(v.scanQ, 0) + " %");
      const rata = v.WT / 4, rusak = v.WE.findIndex((w) => rata > 5 && Math.abs(w - rata) / rata > 0.35);
      A(k("LC"), eq, `WE-${n}03${"ABCD"[rusak] || ""}`, `Load cell ${"ABCD"[rusak] || ""} failure – signal out of range`, "HIGH", "INSTRUMENT FAULT", rusak >= 0, fmt(v.WE[rusak] || 0, 1) + " t");
      A(k("DEV"), eq, `WT-${n}03`, `Weight vs scanned volume deviation > ${B.deviasiLC} %`, "MEDIUM", "WARNING", Math.abs(v.deviasi) > B.deviasiLC && rusak < 0, fmt(v.deviasi, 1) + " %");
      A(k("PT"), eq, `PT-${n}31`, `Silo pressure HIGH (> ${B.tekananH} mbar) – check vent / dust collector`, "MEDIUM", "WARNING", v.PT > B.tekananH, fmt(v.PT, 1) + " mbar");
      A(k("DSTHH"), eq, `AT-${n}42`, `Dust concentration HIGH-HIGH (≥ ${B.debuHH} mg/m³) – explosion risk`, "HIGH", "WARNING", v.DUST >= B.debuHH, fmt(v.DUST, 1) + " mg/m³");
      A(k("DSTH"), eq, `AT-${n}42`, `Dust concentration HIGH (≥ ${B.debuH} mg/m³)`, "MEDIUM", "WARNING", v.DUST >= B.debuH && v.DUST < B.debuHH, fmt(v.DUST, 1) + " mg/m³");
      C.alatSilo.forEach(([kd, nm], j) => A(k("EQ" + kd), eq, `${kd}-${n}5${j}`, `${nm} fault / trip`, "HIGH", "WARNING", s.eq[kd].st === "FAULT", "FAULT"));
    });
    // peralatan bersama
    for (const [t, nm] of C.alat) A("P:" + t, nm, t, `${nm} tripped (motor protection)`, t === "DC-001" ? "CRITICAL" : "HIGH", "WARNING", S.alat[t].st === "FAULT", "FAULT");
    const bag = S.bag || { dp: 0, debu: 0 };
    A("P:BFDP", "Bag Filter BF-001", "PDT-601", `Bag filter ΔP HIGH (≥ ${C.batas.dpBagH} mbar) – bags clogging`, "MEDIUM", "WARNING", bag.dp >= C.batas.dpBagH, fmt(bag.dp, 1) + " mbar");
    A("P:BFEM", "Bag Filter BF-001", "AT-602", "Stack dust emission HIGH – bag rupture suspected", "HIGH", "WARNING", bag.debu >= C.batas.debuH, fmt(bag.debu, 1) + " mg/m³");
    A("P:BLOK", "Filling system", "SEQ-100", `Filling request blocked – ${S.blokIsi} not available`, "MEDIUM", "WARNING", !!S.blokIsi, String(S.blokIsi));
    A("P:STOK", "Truck Hopper", "LT-100", "Receiving hopper stock low (< 5 t)", "LOW", "WARNING", S.stok < 5, fmt(S.stok, 1) + " t");
    return out;
  }

  /* ---------------- evaluasi tiap tick ---------------- */
  function evaluasi() {
    const S = SIM.S, kini = {};
    kondisi().forEach((a) => (kini[a.key] = a));
    let berubah = false;
    for (const key in kini) {
      const a = kini[key], ada = aktif[key];
      if (!ada || ada.state === "RTN UNACK") {
        if (ada) { ada.state = "ACTIVE"; ada.tOff = null; ada.val = a.val; continue; }
        const b = { id: "ALM-" + String(++nomor).padStart(5, "0"), ...a, tOn: S.t, tAck: null, tOff: null, state: "ACTIVE", val0: a.val };
        aktif[key] = b; riwayat.push(b); berubah = true; pendengar.forEach((f) => f(b));
      } else { ada.val = a.val; ada.desk = a.desk; ada.tag = a.tag; }
    }
    for (const key in aktif) {
      const a = aktif[key];
      if (kini[key] || a.state === "RTN UNACK") continue;
      a.tOff = S.t; berubah = true;
      if (a.tAck) { a.state = "CLEARED"; delete aktif[key]; } else a.state = "RTN UNACK";
    }
    if (berubah) simpan();
  }
  function simpan() {
    if (riwayat.length > 3000) riwayat = riwayat.slice(-2500);
    SIM.simpanLS("alarm", riwayat); SIM.simpanLS("event", event.slice(-3000)); SIM.simpanLS("almNo", nomor);
  }
  function ack(key) {
    const a = aktif[key]; if (!a || a.tAck) return;
    a.tAck = SIM.S.t;
    if (a.state === "RTN UNACK") { a.state = "CLEARED"; delete aktif[key]; } else a.state = "ACKNOWLEDGED";
    catat("OPERATOR", `Alarm acknowledged: ${a.id} ${a.tag} – ${a.desk}`); simpan();
  }
  function catat(sumber, teks) { event.push({ t: SIM.S.t || Date.now(), sumber, teks }); if (event.length > 3500) event.splice(0, 500); }
  SIM.dengar((e) => { if (e.jenis === "event") catat(e.sumber, e.teks); if (e.jenis === "tick") evaluasi(); });
  setInterval(simpan, 15000);

  /* status ringkas satu silo */
  function statusSilo(i) {
    const n = i + 1 + ":", a = Object.values(aktif).filter((x) => x.key.startsWith(n) && x.state !== "RTN UNACK");
    for (const [st, w] of STATUS) if (st !== "NORMAL" && a.some((x) => x.kat === st)) return { st, w };
    return { st: "NORMAL", w: "green" };
  }
  const urut = (a, b) => PRI[a.pri] - PRI[b.pri] || b.tOn - a.tOn;
  return {
    get aktif() { return Object.values(aktif).sort(urut); }, get riwayat() { return riwayat; }, get event() { return event; },
    ack, ackSemua() { Object.keys(aktif).forEach(ack); }, catat, dengar: (f) => pendengar.push(f), statusSilo, STATUS, PRI,
    untukSilo: (i) => Object.values(aktif).filter((a) => a.key.startsWith(i + 1 + ":")).sort(urut),
    untukTag: (tag) => Object.values(aktif).filter((a) => a.tag === tag),
    hitung() {
      const a = Object.values(aktif).filter((x) => x.state !== "RTN UNACK");
      return { CRITICAL: a.filter((x) => x.pri === "CRITICAL").length, HIGH: a.filter((x) => x.pri === "HIGH").length, MEDIUM: a.filter((x) => x.pri === "MEDIUM").length, LOW: a.filter((x) => x.pri === "LOW").length, unack: Object.values(aktif).filter((x) => !x.tAck).length, total: a.length };
    },
    hapus() { riwayat = []; event = []; for (const k in aktif) delete aktif[k]; simpan(); },
  };
})();
