/* =========================================================
   ALARMS.JS — MANAJEMEN ALARM & EVENT
   Hijau = normal · Kuning = warning · Merah = critical · Abu-abu = comm loss / offline
   ========================================================= */
const ALARM = (() => {
  const KEY = "alarm";
  let riwayat = SIM.bacaLS(KEY, []);         // semua alarm (aktif & selesai)
  let event = SIM.bacaLS("event", []);       // log kejadian / aksi operator
  const aktif = {};                           // id → objek alarm yang sedang aktif
  riwayat.filter((a) => a.state !== "CLEARED").forEach((a) => (aktif[a.id] = a));
  const pendengar = [];

  // Daftar kondisi alarm: [id, tag, deskripsi, tingkat, fungsi kondisi(V) → true bila alarm]
  const DEF = [
    ...Array.from({ length: CONFIG.pv.array }, (_, i) => [`INV${i}F`, `INV-0${i + 1}`, "Solar inverter fault", "CRIT", (V) => V.inv[i].status === "FAULT"]),
    ...Array.from({ length: CONFIG.pv.array }, (_, i) => [`INV${i}C`, `INV-0${i + 1}`, "Inverter communication failure", "COMM", (V) => V.inv[i].status === "COMM LOSS"]),
    ["LOWPV", "SI-101", "Low solar generation (PR < 60 % in daylight)", "WARN", (V) => V.G > 450 && V.pvAC < 0.6 * V.pvPot * 0.95 && V.bus.v > 0 && V.curt < 50],
    ["TMODH", "TIT-101", "High solar panel temperature > 65 °C", "WARN", (V) => V.Tmod > 65 && V.Tmod <= 75],
    ["TMODHH", "TIT-101", "Very high solar panel temperature > 75 °C", "CRIT", (V) => V.Tmod > 75],
    ["SOCL", "BESS", "Low battery SOC < 20 %", "WARN", (V) => V.bess.soc < 20 && V.bess.soc >= CONFIG.bess.socMin],
    ["SOCLL", "BESS", "Battery SOC at minimum limit", "CRIT", (V) => V.bess.soc < CONFIG.bess.socMin],
    ["BTH", "BESS", "High battery temperature > 40 °C", "WARN", (V) => V.bess.temp > 40 && V.bess.temp <= 45],
    ["BTHH", "BESS", "Battery temperature critical > 45 °C", "CRIT", (V) => V.bess.temp > 45],
    ["BMS", "BMS-01", "BMS communication failure", "COMM", (V) => !V.bess.comm],
    ["DGF", "DG-01", "Diesel generator failure", "CRIT", (V) => V.dg.state === "FAULT"],
    ["FUELL", "LIT-301", "Low fuel level", "WARN", (V) => V.dg.pct <= CONFIG.dg.rendahPct && V.dg.pct > CONFIG.dg.kritisPct],
    ["FUELLL", "LIT-301", "Critical fuel level", "CRIT", (V) => V.dg.pct <= CONFIG.dg.kritisPct],
    ["FUELH", "FIT-301", "High fuel consumption (SFC > 0,32 L/kWh)", "WARN", (V) => V.dg.state === "RUN" && V.dg.p > 200 && V.dg.sfc > 0.32],
    ["FUELP", "PIT-301", "Low fuel pressure < 1,5 bar", "CRIT", (V) => V.dg.state !== "STOP" && V.dg.state !== "FAULT" && V.dg.fuelP < 1.5],
    ["FACT", "CB-FAC", "Factory feeder trip", "CRIT", (V) => V.cb.FAC === "TRIP"],
    ["REST", "CB-RES", "Residential feeder trip", "CRIT", (V) => V.cb.RES === "TRIP"],
    ["SHED", "EMS", "Residential load shedding (supply deficit)", "WARN", (V) => V.shedRes],
    ["TRFH", "TR-FAC", "Transformer overtemperature > 90 °C", "CRIT", (V) => V.fac.trT > 90],
    ["GRIDF", "CB-GRID", "Utility grid failure", "CRIT", (V) => !V.grid.ok],
    ["BLACK", "BUS-20kV", "Main bus de-energized (blackout)", "CRIT", (V) => V.blackout],
  ];

  function simpan() { SIM.simpanLS(KEY, riwayat.slice(-1500)); SIM.simpanLS("event", event.slice(-1500)); }
  function evaluasi() {
    const V = SIM.V; if (!V.inv) return;
    let berubah = false;
    DEF.forEach(([id, tag, desk, sev, f]) => {
      let on = false; try { on = !!f(V); } catch (e) { on = false; }
      if (on && !aktif[id]) {
        const a = { id, tag, desk, sev, tOn: V.t, tAck: null, tOff: null, state: "ACTIVE" };
        aktif[id] = a; riwayat.push(a); berubah = true;
        pendengar.forEach((fn) => fn(a));
      } else if (!on && aktif[id]) {
        const a = aktif[id]; a.tOff = V.t; a.state = "CLEARED"; delete aktif[id]; berubah = true;
      }
    });
    if (berubah) simpan();
  }
  function ack(id) { const a = aktif[id]; if (a && !a.tAck) { a.tAck = SIM.V.t; a.state = "ACK"; catat("OPERATOR", `Alarm acknowledged: ${a.tag} – ${a.desk}`); simpan(); } }
  function ackSemua() { Object.keys(aktif).forEach(ack); }
  function catat(tag, teks) { event.push({ t: SIM.V.t || Date.now(), tag, teks }); if (event.length > 2000) event.shift(); }
  SIM.dengar((e) => { if (e.jenis === "event") { catat(e.tag, e.teks); } if (e.jenis === "tick") evaluasi(); });
  setInterval(simpan, 15000);

  return {
    get aktif() { return Object.values(aktif).sort((a, b) => b.tOn - a.tOn); },
    get riwayat() { return riwayat; }, get event() { return event; },
    ack, ackSemua, catat, dengar: (f) => pendengar.push(f),
    hitung() { const a = Object.values(aktif); return { CRIT: a.filter((x) => x.sev === "CRIT").length, WARN: a.filter((x) => x.sev === "WARN").length, COMM: a.filter((x) => x.sev === "COMM").length, unack: a.filter((x) => !x.tAck).length }; },
    bersihkan() { riwayat = riwayat.filter((a) => a.state !== "CLEARED"); event = []; simpan(); },
  };
})();
