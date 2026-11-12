/* =========================================================
   CHARTS.JS — GRAFIK TREN (Chart.js)
   Filter waktu: Real Time · 1 Jam · 24 Jam · Harian · Mingguan · Bulanan · Tahunan
   ========================================================= */
const GRAFIK = (() => {
  const ADA = typeof Chart !== "undefined";
  if (ADA) {
    Chart.defaults.color = "#9fb8a8"; Chart.defaults.borderColor = "rgba(74,222,128,.10)";
    Chart.defaults.font.family = "Inter, system-ui, sans-serif"; Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.animation = false;
  }
  const WARNA = { pv: "#facc15", dg: "#f97316", fac: "#38bdf8", res: "#4ade80", soc: "#a78bfa", bess: "#22d3ee", fuel: "#fb7185", level: "#f59e0b", imp: "#c084fc", exp: "#34d399", G: "#fde68a", T: "#f87171", ch: "#22c55e", dis: "#f97316" };
  const KOL = {}; SIM.KOLOM.forEach((k, i) => (KOL[k] = i));
  const charts = {};

  function buat(id, tipe, labels, datasets, opsi = {}) {
    if (!ADA) return null;
    const cv = document.getElementById(id); if (!cv) return null;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(cv, {
      type: tipe, data: { labels, datasets: datasets.map((d) => ({ borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false, ...d, backgroundColor: d.backgroundColor || (tipe === "bar" ? d.borderColor + "cc" : d.borderColor + "22") })) },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "top", align: "end" }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, c.parsed.y < 10 ? 2 : 0)}` } }, ...(opsi.plugins || {}) },
        scales: opsi.scales || { x: { ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true, title: { display: !!opsi.yJudul, text: opsi.yJudul } } },
      },
    });
    return charts[id];
  }
  function perbarui(id, labels, nilai) {             // nilai = array data per dataset
    const c = charts[id]; if (!c) return false;
    c.data.labels = labels; nilai.forEach((d, i) => { if (c.data.datasets[i]) c.data.datasets[i].data = d; }); c.update("none"); return true;
  }
  const lblJam = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ---------- sumber data menurut filter ---------- */
  function barisDaya(filter) {
    if (filter === "rt") return SIM.realtime.slice(-30);
    if (filter === "1h") return SIM.realtime.slice(-60);
    const batasT = SIM.V.t - 24 * 3600000;
    return SIM.log.filter((r) => r[0] >= batasT);
  }
  function energiPeriode(filter) {
    const H = SIM.harian.filter((d) => !d.bulan);
    const kunciE = ["pv", "dg", "fac", "res", "ch", "dis", "imp", "exp", "fuel", "H"];
    const hariIni = { t: new Date(SIM.V.t).setHours(0, 0, 0, 0), ...SIM.S.E.day };
    if (filter === "daily") { const d = H.slice(-29).concat([hariIni]); return { label: d.map((x) => { const t = new Date(x.t); return `${t.getDate()} ${BULAN[t.getMonth()]}`; }), data: d }; }
    if (filter === "weekly") {
      const grup = {};
      H.concat([hariIni]).forEach((d) => { const t = new Date(d.t); const senin = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7)); const k = +senin; grup[k] = grup[k] || { t: k }; kunciE.forEach((e) => (grup[k][e] = (grup[k][e] || 0) + (d[e] || 0))); });
      const d = Object.values(grup).sort((a, b) => a.t - b.t).slice(-12);
      return { label: d.map((x) => { const t = new Date(x.t); return `Mg ${t.getDate()} ${BULAN[t.getMonth()]}`; }), data: d };
    }
    const bulanIni = { t: new Date(new Date(SIM.V.t).getFullYear(), new Date(SIM.V.t).getMonth(), 1).getTime(), ...SIM.S.E.month };
    const B = SIM.bulanan.concat([bulanIni]);
    if (filter === "monthly") { const d = B.slice(-12); return { label: d.map((x) => { const t = new Date(x.t); return `${BULAN[t.getMonth()]} ${String(t.getFullYear()).slice(2)}`; }), data: d }; }
    const grup = {};
    B.forEach((d) => { const y = new Date(d.t).getFullYear(); grup[y] = grup[y] || { t: y }; kunciE.forEach((e) => (grup[y][e] = (grup[y][e] || 0) + (d[e] || 0))); });
    const d = Object.values(grup).sort((a, b) => a.t - b.t).slice(-5);
    return { label: d.map((x) => String(x.t) + (x.t === new Date(SIM.V.t).getFullYear() ? " (YTD)" : "")), data: d };
  }

  /* ---------- HALAMAN TREND ---------- */
  let filter = "rt";
  const isDaya = () => ["rt", "1h", "24h"].includes(filter);
  function trend(filterBaru) {
    if (filterBaru) filter = filterBaru;
    $$("[data-filter]").forEach((b) => b.classList.toggle("on", b.dataset.filter === filter));
    if (isDaya()) {
      const r = barisDaya(filter), L = r.map((x) => lblJam(x[0])), c = (k) => r.map((x) => x[KOL[k]]);
      set("trendInfo", `${r.length} sampel · resolusi ${filter === "24h" ? "5 menit" : "1 menit"} (waktu simulasi) · SIMULATION`);
      buat("chGen", "line", L, [{ label: "Solar (kW)", data: c("pv"), borderColor: WARNA.pv, fill: true }, { label: "Diesel (kW)", data: c("dg"), borderColor: WARNA.dg }, { label: "Factory load (kW)", data: c("fac"), borderColor: WARNA.fac }, { label: "Residential load (kW)", data: c("res"), borderColor: WARNA.res }], { yJudul: "kW" });
      buat("chBess", "line", L, [{ label: "Battery SOC (%)", data: c("soc"), borderColor: WARNA.soc, yAxisID: "y1" }, { label: "Battery power (kW, + discharge / − charge)", data: c("bess"), borderColor: WARNA.bess, fill: true }], { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { title: { display: true, text: "kW" } }, y1: { position: "right", min: 0, max: 100, grid: { drawOnChartArea: false }, title: { display: true, text: "SOC %" } } } });
      buat("chFuel", "line", L, [{ label: "Fuel consumption (L/h)", data: c("fuelLh"), borderColor: WARNA.fuel, fill: true }, { label: "Fuel tank level (%)", data: c("fuelPct"), borderColor: WARNA.level, yAxisID: "y1" }], { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true, title: { display: true, text: "L/h" } }, y1: { position: "right", min: 0, max: 100, grid: { drawOnChartArea: false }, title: { display: true, text: "%" } } } });
      buat("chGrid", "line", L, [{ label: "Grid import (kW)", data: c("imp"), borderColor: WARNA.imp, fill: true }, { label: "Grid export (kW)", data: c("exp"), borderColor: WARNA.exp, fill: true }], { yJudul: "kW" });
      buat("chSolar", "line", L, [{ label: "Solar irradiance (W/m²)", data: c("G"), borderColor: WARNA.G, yAxisID: "y1" }, { label: "Solar power (kW)", data: c("pv"), borderColor: WARNA.pv, fill: true }], { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true, title: { display: true, text: "kW" } }, y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: "W/m²" } } } });
      set("judulChSolar", "Solar Irradiance & Power"); set("judulChKons", "Daily Energy (pilih filter Harian/Bulanan)");
      buat("chKons", "bar", ["Hari ini"], [{ label: "Solar (kWh)", data: [SIM.S.E.day.pv], borderColor: WARNA.pv }, { label: "Factory (kWh)", data: [SIM.S.E.day.fac], borderColor: WARNA.fac }, { label: "Residential (kWh)", data: [SIM.S.E.day.res], borderColor: WARNA.res }, { label: "Diesel (kWh)", data: [SIM.S.E.day.dg], borderColor: WARNA.dg }], { yJudul: "kWh" });
    } else {
      const { label: L, data: d } = energiPeriode(filter), c = (k, bagi = 1) => d.map((x) => (x[k] || 0) / bagi);
      const besar = filter === "monthly" || filter === "yearly", s = besar ? 1000 : 1, u = besar ? "MWh" : "kWh";
      set("trendInfo", `${d.length} periode · energi dalam ${u} · data periode lalu = SIMULATION`);
      buat("chGen", "bar", L, [{ label: `Solar (${u})`, data: c("pv", s), borderColor: WARNA.pv }, { label: `Diesel (${u})`, data: c("dg", s), borderColor: WARNA.dg }, { label: `Factory (${u})`, data: c("fac", s), borderColor: WARNA.fac }, { label: `Residential (${u})`, data: c("res", s), borderColor: WARNA.res }], { yJudul: u });
      buat("chBess", "bar", L, [{ label: `Battery charge (${u})`, data: c("ch", s), borderColor: WARNA.ch }, { label: `Battery discharge (${u})`, data: c("dis", s), borderColor: WARNA.dis }], { yJudul: u });
      buat("chFuel", "bar", L, [{ label: "Fuel consumption (L)", data: c("fuel"), borderColor: WARNA.fuel }], { yJudul: "Liter" });
      buat("chGrid", "bar", L, [{ label: `Grid import (${u})`, data: c("imp", s), borderColor: WARNA.imp }, { label: `Grid export (${u})`, data: c("exp", s), borderColor: WARNA.exp }], { yJudul: u });
      set("judulChSolar", "Solar Energy Production"); set("judulChKons", "Energy Consumption (Factory & Residential)");
      buat("chSolar", "bar", L, [{ label: `Solar energy (${u})`, data: c("pv", s), borderColor: WARNA.pv }], { yJudul: u });
      buat("chKons", "bar", L, [{ label: `Factory (${u})`, data: c("fac", s), borderColor: WARNA.fac }, { label: `Residential (${u})`, data: c("res", s), borderColor: WARNA.res }], { yJudul: u, scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: u } } } });
    }
  }

  /* ---------- grafik kecil di halaman lain (hari ini, dari data log 5 menit) ---------- */
  function hariIni() { const t0 = new Date(SIM.V.t).setHours(0, 0, 0, 0); return SIM.log.filter((r) => r[0] >= t0); }
  function kecil(id, keys, label, warna, opsi = {}) {
    const r = opsi.jam24 ? SIM.log.filter((x) => x[0] >= SIM.V.t - 86400000) : hariIni();
    const L = r.map((x) => lblJam(x[0]));
    const data = keys.map((k) => r.map((x) => x[KOL[k]]));
    if (!perbarui(id, L, data) || opsi.paksa) buat(id, "line", L, keys.map((k, i) => ({ label: label[i], data: data[i], borderColor: warna[i], fill: i === 0, yAxisID: opsi.y1 && i === 1 ? "y1" : "y" })), opsi.y1 ? { scales: { x: { ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true }, y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false } } } } : {});
  }
  function donat(id, labels, data, warna) {
    if (!perbarui(id, labels, [data])) buat(id, "doughnut", labels, [{ label: "kWh", data, borderColor: "#0b1a12", backgroundColor: warna, borderWidth: 2 }], { scales: {}, plugins: { legend: { position: "right" } } });
  }
  function bersih(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

  return { ADA, trend, kecil, donat, bersih, WARNA, get filter() { return filter; }, isDaya };
})();
