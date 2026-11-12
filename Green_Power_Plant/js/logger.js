/* =========================================================
   LOGGER.JS — HISTORICAL DATA LOGGER & REPORTING
   Data direkam otomatis tiap 5 menit (waktu simulasi) ke localStorage.
   Laporan: data log, harian, bulanan, tahunan, alarm, BBM, distribusi energi.
   Ekspor: CSV (Excel Indonesia) & Excel (.xls).
   ========================================================= */
const LOGGER = (() => {
  let tab = "log", hal = 0;
  const PER = 25;
  const n1 = (x) => Math.round(x * 10) / 10;

  function tabel() {
    const KOL = SIM.KOLOM;
    if (tab === "log") {
      const h = ["Timestamp", "Irradiance (W/m²)", "Ambient (°C)", "Module (°C)", "Solar (kW)", "Diesel (kW)", "Factory (kW)", "Residential (kW)", "BESS (kW, +dis)", "SOC (%)", "Fuel (L/h)", "Fuel level (%)", "Grid import (kW)", "Grid export (kW)", "Bus (V)", "Freq (Hz)"];
      const b = SIM.log.slice().reverse().map((r) => [waktuStr(r[0]), ...r.slice(1)]);
      return { judul: "Data Log (5-minute)", h, b, kanan: KOL.length };
    }
    const baris = (d, label) => { const load = d.fac + d.res; return [label, n1(d.pv), n1(d.dg), n1(d.fac), n1(d.res), n1(d.ch), n1(d.dis), n1(d.imp), n1(d.exp), n1(d.fuel), n1(SIM.reDari(d)), n1(d.pv * CONFIG.emisi.gridKgPerKWh / 1000)]; };
    const hE = ["Period", "Solar (kWh)", "Diesel (kWh)", "Factory (kWh)", "Residential (kWh)", "BESS charge (kWh)", "BESS discharge (kWh)", "Grid import (kWh)", "Grid export (kWh)", "Fuel (L)", "Renewable (%)", "CO₂ avoided (t)"];
    if (tab === "daily") {
      const hari = SIM.harian.slice().reverse().map((d) => baris(d, tglStr(d.t)));
      hari.unshift(baris(SIM.S.E.day, tglStr(SIM.V.t) + " (running)"));
      return { judul: "Daily Energy Report", h: hE, b: hari };
    }
    if (tab === "monthly") {
      const b = SIM.bulanan.slice().reverse().map((d) => { const t = new Date(d.t); return baris(d, `${BULAN[t.getMonth()]} ${t.getFullYear()}`); });
      const t = new Date(SIM.V.t); b.unshift(baris(SIM.S.E.month, `${BULAN[t.getMonth()]} ${t.getFullYear()} (running)`));
      return { judul: "Monthly Energy Report", h: hE, b };
    }
    if (tab === "yearly") {
      const grup = {};
      SIM.bulanan.concat([{ t: SIM.V.t, ...SIM.S.E.month }]).forEach((d) => { const y = new Date(d.t).getFullYear(); grup[y] = grup[y] || { pv: 0, dg: 0, fac: 0, res: 0, ch: 0, dis: 0, imp: 0, exp: 0, fuel: 0 }; for (const k in grup[y]) grup[y][k] += d[k] || 0; });
      const b = Object.keys(grup).sort().reverse().map((y) => baris(grup[y], y + (+y === new Date(SIM.V.t).getFullYear() ? " (YTD)" : "")));
      return { judul: "Yearly Energy Report", h: hE, b };
    }
    if (tab === "alarm") {
      const b = ALARM.riwayat.slice().reverse().map((a) => [waktuStr(a.tOn), a.tag, a.desk, a.sev === "CRIT" ? "CRITICAL" : a.sev === "WARN" ? "WARNING" : "COMM LOSS", a.state, a.tAck ? waktuStr(a.tAck) : "-", a.tOff ? waktuStr(a.tOff) : "-"]);
      return { judul: "Alarm History", h: ["Time on", "Tag", "Description", "Priority", "Status", "Acknowledged", "Cleared"], b };
    }
    if (tab === "event") {
      const b = ALARM.event.slice().reverse().map((e) => [waktuStr(e.t), e.tag, e.teks]);
      return { judul: "Event Log", h: ["Timestamp", "Source", "Event"], b };
    }
    if (tab === "fuel") {
      const b = SIM.bbm.slice().reverse().map((f) => [f.jenis === "DAILY" ? tglStr(f.t) : waktuStr(f.t), f.jenis === "DAILY" ? "Daily consumption" : "Fuel delivery", n1(f.jenis === "DAILY" ? -f.liter : f.liter), n1(f.level), f.ket]);
      return { judul: "Fuel Consumption History", h: ["Date / time", "Type", "Volume (L, − used / + received)", "Tank level after (%)", "Note"], b };
    }
    if (tab === "dist") {
      const hari = SIM.harian.slice(-30).reverse().concat([]);
      const b = [SIM.S.E.day].concat(hari).map((d, i) => { const sup = d.pv + d.dg + d.dis + d.imp; return [i === 0 ? tglStr(SIM.V.t) + " (running)" : tglStr(d.t), n1(sup), n1(d.fac), sup > 0 ? n1((d.fac / sup) * 100) : 0, n1(d.res), sup > 0 ? n1((d.res / sup) * 100) : 0, n1(d.ch), n1(d.exp), n1(Math.max(0, sup - d.fac - d.res - d.ch - d.exp))]; });
      return { judul: "Energy Distribution Report", h: ["Date", "Total supply (kWh)", "Factory (kWh)", "Factory (%)", "Residential (kWh)", "Residential (%)", "To BESS (kWh)", "To grid (kWh)", "Losses (kWh)"], b };
    }
  }

  function render() {
    const wadah = $("#logTabel"); if (!wadah) return;
    $$("[data-logtab]").forEach((b) => b.classList.toggle("on", b.dataset.logtab === tab));
    const T = tabel(); const maks = Math.max(0, Math.ceil(T.b.length / PER) - 1); hal = Math.min(hal, maks);
    const isi = T.b.slice(hal * PER, hal * PER + PER);
    wadah.innerHTML = `<table class="tbl"><thead><tr>${T.h.map((x) => `<th>${x}</th>`).join("")}</tr></thead>
      <tbody>${isi.map((r) => `<tr>${r.map((v, i) => `<td class="${typeof v === "number" ? "num" : ""}">${typeof v === "number" ? fmt(v, Math.abs(v) < 100 && v % 1 ? 1 : 0) : v}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${T.h.length}" class="muted">Belum ada data</td></tr>`}</tbody></table>`;
    set("logJudul", `${T.judul} · ${fmt(T.b.length)} baris`);
    set("logHal", `Halaman ${hal + 1} / ${maks + 1}`);
  }
  function ekspor(jenis) {
    const T = tabel(), nama = "GreenPower_" + T.judul.replace(/[^A-Za-z]+/g, "_") + "_" + new Date(SIM.V.t).toISOString().slice(0, 10);
    if (jenis === "csv") eksporCSV(nama, T.h, T.b); else eksporExcel(nama, T.judul, T.h, T.b);
    ALARM.catat("OPERATOR", `Exported ${T.judul} (${jenis.toUpperCase()}, ${T.b.length} rows)`);
    toast(`${T.judul} diekspor (${jenis === "csv" ? "CSV" : "Excel"})`);
  }
  return {
    render, ekspor,
    tab(t) { tab = t; hal = 0; render(); },
    geser(d) { hal = Math.max(0, hal + d); render(); },
  };
})();
