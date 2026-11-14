/* =========================================================
   LOGGER.JS — DATA LOGGER (cari, filter, rentang tanggal, ekspor, cetak)
   & REPORT (shift / harian / mingguan / custom)
   Rekaman otomatis tiap 5 menit waktu simulasi, 7 hari terakhir (localStorage).
   ========================================================= */
const LOGGER = (() => {
  let tab = "proses", hal = 0, cari = "", silo = -1, dari = null, sampai = null, stFil = "all";
  const PER = 30;
  const stTeks = (k) => (!k ? "OK" : [k & 1 ? "PLC COMM ERROR" : "", k & 2 ? "RADAR FAULT" : "", k & 4 ? "SCANNER FAULT" : "", k & 8 ? "LOAD CELL FAULT" : ""].filter(Boolean).join(" / "));
  const H = {
    proses: ["Timestamp", "Silo", "Level (%)", "Level (m)", "Weight (t)", "Volume (m³)", "Avg temp (°C)", "Max temp (°C)", "Min height (m)", "Max height (m)", "Avg height (m)", "Received total (t)", "Discharged total (t)", "Instrument status"],
    alarm: ["Alarm ID", "Time on", "Equipment", "Tag", "Description", "Priority", "Value at alarm", "Status", "Acknowledged", "Cleared"],
    event: ["Timestamp", "Source", "Event"],
  };
  function baris() {
    const a = dari || 0, b = sampai || Infinity, q = cari.toLowerCase();
    let B;
    if (tab === "proses") {
      B = SIM.log.filter((r) => (silo < 0 || r[1] === silo) && r[0] >= a && r[0] <= b && (stFil === "all" || (stFil === "ok" ? !r[11] : r[11])))
        .slice().reverse().map((r) => [waktuStr(r[0]), CONFIG.silo[r[1]][0], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[12] ?? 0, r[13] ?? 0, stTeks(r[11])]);
    } else if (tab === "alarm") {
      B = ALARM.riwayat.filter((x) => x.tOn >= a && x.tOn <= b && (silo < 0 || x.key.startsWith(silo + 1 + ":"))).slice().reverse()
        .map((x) => [x.id, waktuStr(x.tOn), x.eq, x.tag, x.desk, x.pri, x.val0 || x.val || "", x.state, x.tAck ? waktuStr(x.tAck) : "-", x.tOff ? waktuStr(x.tOff) : "-"]);
    } else B = ALARM.event.filter((e) => e.t >= a && e.t <= b).slice().reverse().map((e) => [waktuStr(e.t), e.sumber, e.teks]);
    if (q) B = B.filter((r) => r.some((v) => String(typeof v === "number" ? fmt(v, 2) : v).toLowerCase().includes(q)));
    return B;
  }
  function render() {
    const w = $("#logTabel"); if (!w) return;
    $$("[data-logtab]").forEach((b) => b.classList.toggle("on", b.dataset.logtab === tab));
    const B = baris(), h = H[tab], maks = Math.max(0, Math.ceil(B.length / PER) - 1); hal = Math.min(hal, maks);
    w.innerHTML = `<table class="tbl"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${B.slice(hal * PER, hal * PER + PER).map((r) => `<tr>${r.map((v, j) => `<td class="${typeof v === "number" ? "num" : j === 0 && tab === "alarm" ? "tag" : ""}">${typeof v === "number" ? fmt(v, Math.abs(v) < 100 ? 2 : 1) : tab === "alarm" && j === 5 ? `<span class="pri pri-${v}">${v}</span>` : v}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${h.length}" class="muted c">Tidak ada data untuk filter ini</td></tr>`}</tbody></table>`;
    set("logJml", `${fmt(B.length)} baris`); set("logHal", `Halaman ${hal + 1} / ${maks + 1}`);
  }
  const judul = () => ({ proses: "Process Data Log", alarm: "Alarm History", event: "Event Log" })[tab];
  function ekspor(jenis) {
    const B = baris(), nama = "CoalSilo_" + judul().replace(/\s+/g, "_") + "_" + new Date(SIM.S.t).toISOString().slice(0, 10);
    if (jenis === "csv") eksporCSV(nama, H[tab], B); else eksporExcel(nama, judul(), H[tab], B);
    ALARM.catat("OPERATOR", `Exported ${judul()} (${jenis.toUpperCase()}, ${B.length} rows)`);
    toast(`${judul()} diekspor (${jenis === "csv" ? "CSV" : "Excel"}) – ${B.length} baris`);
  }
  function cetak() {
    const B = baris().slice(0, 500);
    cetakHTML(`<h2>${judul()} <small>(SIMULATION)</small></h2><p>${silo < 0 ? "All silos" : CONFIG.silo[silo][1]} · ${dari ? waktuStr(dari) : "awal"} → ${sampai ? waktuStr(sampai) : "sekarang"} · ${B.length} baris${baris().length > 500 ? " (dibatasi 500 baris pertama)" : ""}</p>
      <table><thead><tr>${H[tab].map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${B.map((r) => `<tr>${r.map((v) => `<td>${typeof v === "number" ? fmt(v, 2) : v}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
  }
  return {
    render, ekspor, cetak,
    tab(t) { tab = t; hal = 0; render(); }, geser(d) { hal = Math.max(0, hal + d); render(); },
    filter(o) { if (o.cari !== undefined) cari = o.cari; if (o.silo !== undefined) silo = o.silo; if (o.dari !== undefined) dari = o.dari; if (o.sampai !== undefined) sampai = o.sampai; if (o.st !== undefined) stFil = o.st; hal = 0; render(); },
    get keadaan() { return { tab, cari, silo, dari, sampai, stFil }; },
  };
})();

/* ---------- cetak: isi #cetak lalu window.print() (CSS @media print) ---------- */
function cetakHTML(isi) {
  let el = $("#cetak"); if (!el) { el = document.createElement("div"); el.id = "cetak"; document.body.appendChild(el); }
  el.innerHTML = `<div class="ct-h"><div><b>${CONFIG.judul}</b><br>${CONFIG.subjudul}</div><div class="ct-sim">SIMULATION DATA – NOT FIELD MEASUREMENT</div></div>${isi}<div class="ct-f">Dicetak ${waktuStr(Date.now())} · Waktu simulasi ${waktuStr(SIM.S.t)}</div>`;
  setTimeout(() => window.print(), 50);
}

const LAPORAN = (() => {
  let jenis = "daily", tgl = null, a0 = null, b0 = null, hasil = null;
  function rentang() {
    const T = SIM.S.t;
    if (jenis === "shift") { const d = new Date(T), h = d.getHours(), mulai = h >= 22 ? 22 : h >= 14 ? 14 : h >= 6 ? 6 : -2; const a = new Date(d); a.setHours(mulai, 0, 0, 0); return [a.getTime(), Math.min(T, a.getTime() + 8 * 3600000), `Shift ${mulai < 0 ? "22:00–06:00" : pad((mulai + 24) % 24) + ":00–" + pad((mulai + 8) % 24) + ":00"}`]; }
    if (jenis === "daily") { const d = tgl ? new Date(tgl) : new Date(T); d.setHours(0, 0, 0, 0); return [d.getTime(), Math.min(T, d.getTime() + 86400000), "Daily " + tglStr(d)]; }
    if (jenis === "weekly") { const d = tgl ? new Date(tgl) : new Date(T); d.setHours(23, 59, 59, 0); return [d.getTime() - 7 * 86400000 + 1000, Math.min(T, d.getTime()), "Weekly (7 days to " + tglStr(d) + ")"]; }
    return [a0 || T - 86400000, b0 || T, "Custom"];
  }
  function hitung() {
    const [a, b, nama] = rentang();
    const per = CONFIG.silo.map((k, i) => {
      const R = SIM.log.filter((r) => r[1] === i && r[0] >= a && r[0] <= b);
      if (!R.length) return { k, n: 0 };
      const f = R[0], l = R[R.length - 1], kol = (j) => R.map((r) => r[j]);
      const almN = ALARM.riwayat.filter((x) => x.key.startsWith(i + 1 + ":") && x.tOn >= a && x.tOn <= b).length;
      return { k, n: R.length, buka: f[4], tutup: l[4], masuk: Math.max(0, (l[12] ?? 0) - (f[12] ?? 0)), keluar: Math.max(0, (l[13] ?? 0) - (f[13] ?? 0)), lMin: Math.min(...kol(2)), lMax: Math.max(...kol(2)), lAvg: kol(2).reduce((s, x) => s + x, 0) / R.length, tAvg: kol(6).reduce((s, x) => s + x, 0) / R.length, tMax: Math.max(...kol(7)), hMax: Math.max(...kol(9)), hMin: Math.min(...kol(8)), alm: almN, fault: R.filter((r) => r[11]).length };
    });
    const alarm = ALARM.riwayat.filter((x) => x.tOn >= a && x.tOn <= b).slice(-15).reverse();
    hasil = { a, b, nama, per, alarm };
    return hasil;
  }
  const HDR = ["Silo", "Opening (t)", "Closing (t)", "Received (t)", "Discharged (t)", "Level min (%)", "Level avg (%)", "Level max (%)", "Avg temp (°C)", "Max temp (°C)", "Max height (m)", "Min height (m)", "Alarms", "Samples"];
  const barisTabel = () => hasil.per.map((p) => (p.n ? [p.k[0], p.buka, p.tutup, p.masuk, p.keluar, p.lMin, p.lAvg, p.lMax, p.tAvg, p.tMax, p.hMax, p.hMin, p.alm, p.n] : [p.k[0], "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", 0, 0]));
  function html() {
    const h = hitung(), ok = h.per.filter((p) => p.n), jum = (k) => ok.reduce((s, p) => s + p[k], 0);
    return `<div class="rp">
      <div class="rp-h"><div><h3>COAL SILO OPERATION REPORT</h3><p>${h.nama} · ${waktuStr(h.a)} → ${waktuStr(h.b)}</p></div><span class="simtag">SIMULATION</span></div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-l">Inventory closing</div><div class="kpi-v"><b>${fmt(jum("tutup"), 1)}</b><span>t</span></div><div class="kpi-s">of ${fmt(CONFIG.kapasitas * CONFIG.silo.length)} t capacity</div></div>
        <div class="kpi"><div class="kpi-l">Coal received</div><div class="kpi-v"><b>${fmt(jum("masuk"), 1)}</b><span>t</span></div><div class="kpi-s">via BE-001 / CV-002</div></div>
        <div class="kpi"><div class="kpi-l">Coal discharged</div><div class="kpi-v"><b>${fmt(jum("keluar"), 1)}</b><span>t</span></div><div class="kpi-s">to boiler via CV-003</div></div>
        <div class="kpi"><div class="kpi-l">Net change</div><div class="kpi-v"><b>${fmt(jum("tutup") - jum("buka"), 1)}</b><span>t</span></div><div class="kpi-s">closing − opening</div></div>
        <div class="kpi"><div class="kpi-l">Alarms in period</div><div class="kpi-v"><b>${fmt(h.alarm.length ? ALARM.riwayat.filter((x) => x.tOn >= h.a && x.tOn <= h.b).length : 0)}</b></div><div class="kpi-s">all priorities</div></div>
      </div>
      <div class="scroll"><table class="tbl"><thead><tr>${HDR.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${barisTabel().map((r) => `<tr>${r.map((v, j) => `<td class="${typeof v === "number" ? "num" : j === 0 ? "tag" : ""}">${typeof v === "number" ? fmt(v, j >= 12 ? 0 : 1) : v}</td>`).join("")}</tr>`).join("")}
      <tr class="tot"><td>TOTAL</td><td class="num">${fmt(jum("buka"), 1)}</td><td class="num">${fmt(jum("tutup"), 1)}</td><td class="num">${fmt(jum("masuk"), 1)}</td><td class="num">${fmt(jum("keluar"), 1)}</td><td colspan="9"></td></tr></tbody></table></div>
      <div class="sub-h">Alarm summary (latest 15)</div>
      <table class="tbl"><thead><tr><th>Alarm ID</th><th>Time</th><th>Equipment</th><th>Tag</th><th>Description</th><th>Priority</th><th>Status</th></tr></thead><tbody>${h.alarm.map((x) => `<tr><td class="tag">${x.id}</td><td>${waktuStr(x.tOn)}</td><td>${x.eq}</td><td class="tag">${x.tag}</td><td>${x.desk}</td><td><span class="pri pri-${x.pri}">${x.pri}</span></td><td>${x.state}</td></tr>`).join("") || '<tr><td colspan="7" class="muted c">Tidak ada alarm pada periode ini</td></tr>'}</tbody></table>
      <div class="sub-h">Notes</div><p class="muted">Received/discharged dihitung dari totalizer simulasi pada data logger 5 menit. Level % = volumetrik (berat ÷ kapasitas ${fmt(CONFIG.kapasitas)} t). Semua nilai adalah SIMULATION.</p>
      <div class="ttd"><div>Prepared by<br><br><br>Operator</div><div>Checked by<br><br><br>Shift Supervisor</div><div>Approved by<br><br><br>Plant Manager</div></div>
    </div>`;
  }
  function render() { const el = $("#rpIsi"); if (el) el.innerHTML = html(); $$("[data-rpjenis]").forEach((b) => b.classList.toggle("on", b.dataset.rpjenis === jenis)); }
  return {
    render, set(o) { if (o.jenis) jenis = o.jenis; if (o.tgl !== undefined) tgl = o.tgl; if (o.a !== undefined) a0 = o.a; if (o.b !== undefined) b0 = o.b; render(); },
    ekspor(j) { hitung(); const nama = "CoalSilo_Report_" + hasil.nama.replace(/[^A-Za-z0-9]+/g, "_"); if (j === "csv") eksporCSV(nama, HDR, barisTabel()); else eksporExcel(nama, "Report " + hasil.nama, HDR, barisTabel()); toast("Report diekspor"); },
    cetak() { cetakHTML(html()); }, get jenis() { return jenis; },
  };
})();
