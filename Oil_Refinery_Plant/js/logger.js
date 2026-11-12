/* =========================================================
   LOGGER.JS — HISTORICAL DATA LOGGER & REPORTING
   Rekaman otomatis tiap 5 menit (waktu simulasi) → localStorage.
   Ekspor: CSV (Excel Indonesia) & Excel (.xls).
   ========================================================= */
const LOGGER = (() => {
  let tab = "log", hal = 0;
  const PER = 25, n1 = (x) => Math.round((x || 0) * 10) / 10;
  const P = ["gasoline", "diesel", "kero", "naphtha", "fueloil", "lpg", "inter"];
  const hE = ["Period", "Crude (m³)", "Crude (t)", "Gasoline (t)", "Diesel (t)", "Kerosene (t)", "Naphtha (t)", "Fuel oil (t)", "LPG (t)", "Intermediate (t)", "Total product (t)", "Dispatched (t)", "Fuel gas (Nm³)", "Steam (t)", "Power (MWh)", "Water (m³)", "Flare (Nm³)", "Sulfur (t)", "H₂ SMR (Nm³)"];
  const baris = (d, label) => [label, n1(d.crudeM3), n1(d.crudeT), ...P.map((p) => n1(d[p])), n1(d.prodT), n1(d.dispT), Math.round(d.fg || 0), n1(d.steam), n1((d.power || 0) / 1000), Math.round(d.water || 0), Math.round(d.flare || 0), n1(d.sulfur), Math.round(d.h2 || 0)];

  function tabel() {
    if (tab === "log") {
      const h = ["Timestamp", "Crude feed (m³/h)", "Capacity (%)", "COT TT-103 (°C)", "CDU top TT-105 (°C)", "VDU PT-201 (mbar a)", "HDT out TT-304 (°C)", "Ref R-801 in (°C)", "FCC Rx (°C)", "FCC Regen (°C)", "Steam (t/h)", "CW supply (°C)", "Flare (Nm³/h)", "Power (kW)", "Fuel gas (Nm³/h)", "Raw water (m³/h)", "SMR H₂ (Nm³/h)", "FCC SO₂ (mg/Nm³)", "Product (t/h)", "Product inventory (t)"];
      return { judul: "Process Data Log (5-minute)", h, b: SIM.log.slice().reverse().map((r) => [waktuStr(r[0]), ...r.slice(1)]) };
    }
    if (tab === "daily") { const b = SIM.harian.slice().reverse().map((d) => baris(d, tglStr(d.t))); b.unshift(baris(SIM.S.E.day, tglStr(SIM.V.t) + " (running)")); return { judul: "Daily Production Report", h: hE, b }; }
    if (tab === "monthly") { const b = SIM.bulanan.slice().reverse().map((d) => { const t = new Date(d.t); return baris(d, `${BULAN[t.getMonth()]} ${t.getFullYear()}`); }); const t = new Date(SIM.V.t); b.unshift(baris(SIM.S.E.month, `${BULAN[t.getMonth()]} ${t.getFullYear()} (running)`)); return { judul: "Monthly Production Report", h: hE, b }; }
    if (tab === "yearly") {
      const g = {}; SIM.bulanan.concat([{ t: SIM.V.t, ...SIM.S.E.month }]).forEach((d) => { const y = new Date(d.t).getFullYear(); g[y] = g[y] || SIM.kosongE(); for (const k in g[y]) g[y][k] += d[k] || 0; });
      return { judul: "Yearly Production Report", h: hE, b: Object.keys(g).sort().reverse().map((y) => baris(g[y], y + (+y === new Date(SIM.V.t).getFullYear() ? " (YTD)" : ""))) };
    }
    if (tab === "tank") {
      const b = CONFIG.tangki.map((k, i) => { const tk = SIM.S.tangki[i], n = 401 + i * 10, rho = CONFIG.rho[k[2]]; return [k[0], k[1], tk.mode, n1(SIM.nilai("LT-" + n)), n1(SIM.nilai("LIT-" + n)), Math.round(tk.vol), Math.round(k[3] - tk.vol), n1((tk.vol * rho) / 1000), n1(SIM.nilai("TT-" + n)), n1(tk.din), n1(tk.dout), Math.round(tk.tot)]; });
      return { judul: "Tank Inventory Snapshot " + waktuStr(SIM.V.t), h: ["Tank", "Service", "Mode", "Level (%)", "Level (m)", "Volume (m³)", "Remaining (m³)", "Inventory (t)", "Temp (°C)", "Inlet (m³/h)", "Outlet (m³/h)", "Totalizer (m³)"], b };
    }
    if (tab === "rot") {
      const V = SIM.V, b = [];
      for (const id in V.PV) { const p = V.PV[id]; b.push([id, CONFIG.pompa.find((x) => x[0] === id)[1], "Pump", p.st, n1(p.q), n1(p.kw), n1(p.vib), n1(p.bt), Math.round(p.h)]); }
      for (const id in V.KV) { const k = V.KV[id]; b.push([id, CONFIG.kompresor.find((x) => x[0] === id)[1], "Compressor (" + k.tipe + ")", k.st, n1(k.q), n1(k.kw), n1(k.vib), n1(k.bt), Math.round(k.h)]); }
      return { judul: "Rotating Equipment Status & Running Hours", h: ["Tag", "Service", "Type", "Status", "Flow", "Power (kW)", "Vibration (mm/s)", "Bearing (°C)", "Running hours"], b };
    }
    if (tab === "alarm") return { judul: "Alarm History", h: ["Time on", "Tag", "Area", "Description", "Priority", "Status", "Acknowledged", "Cleared"], b: ALARM.riwayat.slice().reverse().map((a) => [waktuStr(a.tOn), a.tag, a.area, a.desk, a.sev === "CRIT" ? "CRITICAL" : a.sev === "WARN" ? "WARNING" : "COMM FAILURE", a.state, a.tAck ? waktuStr(a.tAck) : "-", a.tOff ? waktuStr(a.tOff) : "-"]) };
    return { judul: "Event Log", h: ["Timestamp", "Source", "Event"], b: ALARM.event.slice().reverse().map((e) => [waktuStr(e.t), e.tag, e.teks]) };
  }
  function render() {
    const w = $("#logTabel"); if (!w) return;
    $$("[data-logtab]").forEach((b) => b.classList.toggle("on", b.dataset.logtab === tab));
    const T = tabel(), maks = Math.max(0, Math.ceil(T.b.length / PER) - 1); hal = Math.min(hal, maks);
    w.innerHTML = `<table class="tbl"><thead><tr>${T.h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${T.b.slice(hal * PER, hal * PER + PER).map((r) => `<tr>${r.map((v) => `<td class="${typeof v === "number" ? "num" : ""}">${typeof v === "number" ? fmt(v, Math.abs(v) < 100 && v % 1 ? 1 : 0) : v}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${T.h.length}" class="muted">Belum ada data</td></tr>`}</tbody></table>`;
    set("logJudul", `${T.judul} · ${fmt(T.b.length)} baris`); set("logHal", `Halaman ${hal + 1} / ${maks + 1}`);
  }
  function ekspor(jenis) {
    const T = tabel(), nama = "Refinery_" + T.judul.replace(/[^A-Za-z]+/g, "_") + "_" + new Date(SIM.V.t).toISOString().slice(0, 10);
    if (jenis === "csv") eksporCSV(nama, T.h, T.b); else eksporExcel(nama, T.judul, T.h, T.b);
    ALARM.catat("OPERATOR", `Exported ${T.judul} (${jenis.toUpperCase()}, ${T.b.length} rows)`);
    toast(`${T.judul} diekspor (${jenis === "csv" ? "CSV" : "Excel"})`);
  }
  return { render, ekspor, tab(t) { tab = t; hal = 0; render(); }, geser(d) { hal = Math.max(0, hal + d); render(); } };
})();
