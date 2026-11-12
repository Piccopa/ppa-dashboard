/* =========================================================
   ALARMS.JS — MANAJEMEN ALARM & EVENT (gaya ISA-18.2)
   Hijau = normal · Kuning = WARNING · Merah = ALARM/CRITICAL · Abu-abu = COMMUNICATION FAILURE
   - Alarm batas tag (LL / L / H / HH) dibuat otomatis dari daftar TAGS
   - Alarm peralatan (trip pompa/kompresor, getaran, surge, BMS, dll.)
   - Alarm proses unit yang sedang shutdown ditekan (state-based suppression)
   ========================================================= */
const ALARM = (() => {
  let riwayat = SIM.bacaLS("alarm", []);
  let event = SIM.bacaLS("event", []);
  const aktif = {};
  riwayat.filter((a) => a.state !== "CLEARED").forEach((a) => (aktif[a.id] = a));
  const pendengar = [];
  const sevTag = new Array(TAGS.length).fill("ok");          // status tiap tag untuk tampilan
  const unitDari = (t) => (["CDU", "VDU", "HDT", "REF", "FCC"].includes(t.area) ? t.area : t.eq === "SRU" ? "SRU" : t.eq === "H2" ? "H2" : null);

  /* ---------------- alarm diskrit (peralatan & sistem) ---------------- */
  function diskrit(V, S) {
    const out = [];
    const A = (id, tag, area, desk, sev, on) => on && out.push({ id, tag, area, desk, sev });
    for (const id in V.PV) {
      const p = V.PV[id], area = CONFIG.pompa.find((x) => x[0] === id)[2];
      A(id + ":TRIP", id, area, "Pump tripped", "CRIT", p.st === "TRIP");
      A(id + ":VHH", id, area, "Pump vibration high-high (> 11 mm/s)", "CRIT", p.st === "RUN" && p.vib > 11);
      A(id + ":VH", id, area, "Pump vibration high (> 7,1 mm/s)", "WARN", p.st === "RUN" && p.vib > 7.1 && p.vib <= 11);
      A(id + ":BT", id, area, "Pump bearing temperature high (> 85 °C)", p.bt > 95 ? "CRIT" : "WARN", p.st === "RUN" && p.bt > 85);
    }
    for (const id in V.KV) {
      const k = V.KV[id], area = CONFIG.kompresor.find((x) => x[0] === id)[2];
      if (area === "FCC" && !S.fcc) continue;
      A(id + ":TRIP", id, area, "Compressor tripped", "CRIT", k.st === "TRIP");
      A(id + ":SURGE", id, area, "Anti-surge control active (surge margin < 10 %)", "WARN", k.st === "RUN" && k.margin < 10);
      A(id + ":VH", id, area, "Compressor vibration high", k.vib > 11 ? "CRIT" : "WARN", k.st === "RUN" && k.vib > 7.1);
      A(id + ":LOP", id, area, "Lube oil pressure low", "CRIT", k.st === "RUN" && k.lop < 1.2);
    }
    const u = V.units, off = S.unitOff;
    A("BMS103", "BMS-103", "CDU", "CDU furnace H-101 BMS trip – flame failure, fuel gas SDV closed", "CRIT", !!S.f.bms);
    A("FEEDSTOP", "FIC-101", "CDU", "Crude feed interrupted – CDU not processing", "CRIT", S.feedSP > 0 && !V.cduOn && !off.CDU);
    A("VDUSD", "VDU", "VDU", "VDU shutdown (unplanned)", "CRIT", V.cduOn && u.VDU !== "RUNNING" && !off.VDU);
    A("HDTSD", "HDT", "HDT", "HDT unit shutdown – interlock (recycle compressor / feed pump / H₂)", "CRIT", V.cduOn && u.HDT !== "RUNNING" && !off.HDT);
    A("REFSD", "REF", "REF", "Reformer shutdown – interlock", "CRIT", V.cduOn && u.REF !== "RUNNING" && !off.REF);
    A("FCCSD", "FCC", "FCC", "FCC shutdown – interlock (air blower / wet gas compressor / feed)", "CRIT", S.fcc && V.cduOn && u.FCC !== "RUNNING" && !off.FCC);
    A("BLRA", "B-601A", "BLR", "Boiler A tripped – flame failure", "CRIT", !!S.f.boiler && !V.blrOn[0]);
    A("BLROOS", "B-601", "BLR", "Boiler out of service (operator)", "WARN", !S.f.boiler && V.blrOn.includes(false));
    A("STEAMD", "SH-601", "BLR", "Steam deficit – STG unloaded / steam users at risk", V.kurangUap > 42 ? "CRIT" : "WARN", V.kurangUap > 2);
    A("CTFAN", "CT-701", "CW", "Cooling tower fan failure (cells 3 & 4)", "WARN", V.kipas < 4);
    A("H2DEF", "H2", "UTIL", "Hydrogen deficit – HDT throughput reduced", "WARN", V.defisit > 500);
    A("TR02", "TR-02", "ELEC", "Transformer TR-02 tripped – single transformer operation", "CRIT", !V.tr02);
    A("DELUGE", "F&G-LPG", "ENV", "Fire & gas: deluge activated at LPG sphere area", "CRIT", V.deluge);
    A("COMMCDU", "DCS-CDU", "CDU", "DCS controller CDU – communication failure (values frozen)", "COMM", V.commRusak.CDU);
    A("COMMTANK", "TGS-01", "TANK", "Tank gauging system – communication failure", "COMM", V.commRusak.TANK);
    A("SRUOOS", "SRU", "SRU", "SRU out of service – acid gas routed to flare", "WARN", !S.sru);
    return out;
  }

  /* ---------------- evaluasi tiap tick ---------------- */
  function evaluasi() {
    const V = SIM.V, S = SIM.S; if (!V.units) return;
    const kini = {};
    // 1) batas tag
    TAGS.forEach((t, i) => {
      const d = TAG[t[0]], x = S.x[i];
      let sev = "ok", lim = "";
      const u = unitDari(d);
      const tekan = (u && V.units[u] !== "RUNNING") || (d.area === "FCC" && !S.fcc) || (/^B-601[AB]$/.test(d.eq) && !V.blrOn["AB".indexOf(d.eq.slice(-1))]) || (d.eq === "STG-01");
      if (V.commRusak[d.area]) { sevTag[i] = "off"; return; }
      if (tekan) { sevTag[i] = "sup"; return; }
      if (d.HH != null && x >= d.HH) { sev = "CRIT"; lim = "HH"; } else if (d.LL != null && x <= d.LL) { sev = "CRIT"; lim = "LL"; }
      else if (d.H != null && x >= d.H) { sev = "WARN"; lim = "H"; } else if (d.L != null && x <= d.L) { sev = "WARN"; lim = "L"; }
      sevTag[i] = sev === "CRIT" ? "crit" : sev === "WARN" ? "warn" : "ok";
      if (sev !== "ok") kini[t[0]] = { id: t[0], tag: t[0], area: d.area, desk: `${d.desk} ${lim} (${fmt(x, d.dec)} ${d.unit})`, sev, lim };
    });
    // 2) diskrit
    diskrit(V, S).forEach((a) => (kini[a.id] = a));
    // 3) bandingkan dengan yang aktif
    let berubah = false;
    for (const id in kini) {
      const a = kini[id];
      if (!aktif[id]) {
        const b = { ...a, tOn: V.t, tAck: null, tOff: null, state: "ACTIVE" };
        aktif[id] = b; riwayat.push(b); berubah = true; pendengar.forEach((f) => f(b));
      } else if (aktif[id].sev !== a.sev) { aktif[id].sev = a.sev; aktif[id].desk = a.desk; }
    }
    for (const id in aktif) if (!kini[id]) { const a = aktif[id]; a.tOff = V.t; a.state = "CLEARED"; delete aktif[id]; berubah = true; }
    if (berubah) simpan();
  }
  function simpan() { if (riwayat.length > 2500) riwayat = riwayat.slice(-2000); SIM.simpanLS("alarm", riwayat); SIM.simpanLS("event", event.slice(-2000)); }
  function ack(id) { const a = aktif[id]; if (a && !a.tAck) { a.tAck = SIM.V.t; a.state = "ACK"; catat("OPERATOR", `Alarm acknowledged: ${a.tag} – ${a.desk}`); simpan(); } }
  function catat(tag, teks) { event.push({ t: SIM.V.t || Date.now(), tag, teks }); if (event.length > 2500) event.shift(); }
  SIM.dengar((e) => { if (e.jenis === "event") catat(e.tag, e.teks); if (e.jenis === "tick") evaluasi(); });
  setInterval(simpan, 15000);

  /* status gabungan per area: COMM FAILURE > ALARM > WARNING > status unit */
  function statusArea(area) {
    const a = Object.values(aktif).filter((x) => x.area === area);
    if (a.some((x) => x.sev === "COMM")) return "COMMUNICATION FAILURE";
    if (a.some((x) => x.sev === "CRIT")) return "ALARM";
    if (a.some((x) => x.sev === "WARN")) return "WARNING";
    return SIM.V.units ? SIM.V.units[area] || "RUNNING" : "–";
  }
  return {
    get aktif() { return Object.values(aktif).sort((a, b) => (a.sev === "CRIT" ? 0 : 1) - (b.sev === "CRIT" ? 0 : 1) || b.tOn - a.tOn); },
    get riwayat() { return riwayat; }, get event() { return event; },
    ack, ackSemua() { Object.keys(aktif).forEach(ack); }, catat, dengar: (f) => pendengar.push(f), statusArea,
    sevTag: (tag) => (TAG[tag] ? sevTag[TAG[tag].i] : "ok"),
    untukAlat: (eq) => Object.values(aktif).filter((a) => a.tag === eq || (TAG[a.tag] && TAG[a.tag].eq === eq)),
    hitung() { const a = Object.values(aktif); return { CRIT: a.filter((x) => x.sev === "CRIT").length, WARN: a.filter((x) => x.sev === "WARN").length, COMM: a.filter((x) => x.sev === "COMM").length, unack: a.filter((x) => !x.tAck).length, total: a.length }; },
  };
})();
