/* =========================================================
   CHARTS.JS — GRAFIK TREN (Chart.js)
   Filter: Real Time · 1 Jam · 24 Jam · Harian · Mingguan · Bulanan · Tahunan
   ========================================================= */
const GRAFIK = (() => {
  const ADA = typeof Chart !== "undefined";
  if (ADA) {
    Chart.defaults.color = "#a3b3c6"; Chart.defaults.borderColor = "rgba(148,163,184,.12)";
    Chart.defaults.font.family = "Inter, system-ui, sans-serif"; Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.animation = false;
  }
  const W = { feed: "#f59e0b", cap: "#94a3b8", cot: "#ef4444", top: "#38bdf8", hdt: "#a78bfa", ref: "#f472b6", fccR: "#fb923c", fccG: "#dc2626", steam: "#e5e7eb", cw: "#22c55e", flare: "#f97316", power: "#22d3ee", fg: "#fbbf24", water: "#0ea5e9", h2: "#d946ef", so2: "#facc15", prod: "#eab308", inv: "#60a5fa" };
  const PW = { gasoline: "#eab308", diesel: "#f97316", kero: "#38bdf8", naphtha: "#a78bfa", fueloil: "#78716c", lpg: "#fb7185", inter: "#64748b" };
  const NAMA = { gasoline: "Gasoline", diesel: "Diesel", kero: "Kerosene", naphtha: "Naphtha", fueloil: "Fuel oil", lpg: "LPG", inter: "Intermediate" };
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
        plugins: { legend: { position: "top", align: "end" }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, Math.abs(c.parsed.y) < 10 ? 2 : 0)}` } } },
        scales: opsi.scales || { x: { ticks: { maxTicksLimit: 10 }, stacked: !!opsi.stack }, y: { stacked: !!opsi.stack, beginAtZero: opsi.nol !== false, title: { display: !!opsi.yJudul, text: opsi.yJudul } } },
      },
    });
    return charts[id];
  }
  function perbarui(id, labels, nilai) { const c = charts[id]; if (!c) return false; c.data.labels = labels; nilai.forEach((d, i) => { if (c.data.datasets[i]) c.data.datasets[i].data = d; }); c.update("none"); return true; }
  const lblJam = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dua = (kiri, kanan, min1) => ({ x: { ticks: { maxTicksLimit: 10 } }, y: { title: { display: true, text: kiri } }, y1: { position: "right", beginAtZero: true, min: min1, grid: { drawOnChartArea: false }, title: { display: true, text: kanan } } });

  /* ---------- data ---------- */
  function baris(filter) {
    if (filter === "rt") return SIM.realtime.slice(-30).map(rtKeLog);
    if (filter === "1h") return SIM.realtime.slice(-60).map(rtKeLog);
    return SIM.log.filter((r) => r[0] >= SIM.V.t - 86400000);
  }
  // ubah snapshot realtime (semua tag) → bentuk baris log (kolom KOLOM)
  const ix = (t) => TAG[t].i + 1;
  function rtKeLog(a) {
    const g = (t) => a[ix(t)];
    return [a.t, g("FT-101"), (g("FT-101") / SIM.V.desain) * 100, g("TT-103"), g("TT-105"), g("PT-201"), g("TT-304"), g("TT-801"), g("TT-871"), g("TT-872"), g("FT-601"), g("TT-701"), g("FT-901"), g("JI-1201"), g("FT-1041"), g("FT-1001"), g("FT-1051"), g("AT-1101"), NaN, NaN];
  }
  function periode(filter) {
    const H = SIM.harian, hariIni = { t: new Date(SIM.V.t).setHours(0, 0, 0, 0), ...SIM.S.E.day };
    const kunci = Object.keys(SIM.kosongE());
    const kelompok = (data, kunciFn) => { const g = {}; data.forEach((d) => { const k = kunciFn(d); g[k] = g[k] || { t: k }; kunci.forEach((e) => (g[k][e] = (g[k][e] || 0) + (d[e] || 0))); }); return Object.values(g).sort((a, b) => a.t - b.t); };
    if (filter === "daily") { const d = H.slice(-29).concat([hariIni]); return { L: d.map((x) => { const t = new Date(x.t); return `${t.getDate()} ${BULAN[t.getMonth()]}`; }), d }; }
    if (filter === "weekly") { const d = kelompok(H.concat([hariIni]), (x) => { const t = new Date(x.t); return +new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7)); }).slice(-12); return { L: d.map((x) => { const t = new Date(x.t); return `Mg ${t.getDate()} ${BULAN[t.getMonth()]}`; }), d }; }
    const bln = { t: new Date(new Date(SIM.V.t).getFullYear(), new Date(SIM.V.t).getMonth(), 1).getTime(), ...SIM.S.E.month };
    const B = SIM.bulanan.concat([bln]);
    if (filter === "monthly") { const d = B.slice(-12); return { L: d.map((x) => { const t = new Date(x.t); return `${BULAN[t.getMonth()]} ${String(t.getFullYear()).slice(2)}`; }), d }; }
    const d = kelompok(B, (x) => new Date(x.t).getFullYear()).slice(-5);
    return { L: d.map((x) => String(x.t) + (x.t === new Date(SIM.V.t).getFullYear() ? " (YTD)" : "")), d };
  }

  /* ---------- HALAMAN TREND ---------- */
  let filter = "rt";
  const isRT = () => ["rt", "1h", "24h"].includes(filter);
  function trend(baru) {
    if (baru) filter = baru;
    $$("[data-filter]").forEach((b) => b.classList.toggle("on", b.dataset.filter === filter));
    if (isRT()) {
      const r = baris(filter), L = r.map((x) => lblJam(x[0])), c = (k, f = 1) => r.map((x) => x[KOL[k]] / f);
      set("trendInfo", `${r.length} sampel · resolusi ${filter === "24h" ? "5 menit" : "1 menit"} (waktu simulasi) · SIMULATION`);
      buat("chA", "line", L, [{ label: "Crude feed (m³/h)", data: c("feed"), borderColor: W.feed, fill: true }, { label: "Capacity (%)", data: c("cap"), borderColor: W.cap, yAxisID: "y1" }], { scales: dua("m³/h", "%", 0) });
      buat("chB", "line", L, [{ label: "CDU COT TT-103", data: c("cot"), borderColor: W.cot }, { label: "HDT outlet TT-304", data: c("hdt"), borderColor: W.hdt }, { label: "Reformer R-801 in", data: c("ref"), borderColor: W.ref }, { label: "FCC reactor", data: c("fccR"), borderColor: W.fccR }, { label: "FCC regenerator", data: c("fccG"), borderColor: W.fccG }], { yJudul: "°C", nol: false });
      buat("chC", "line", L, [{ label: "Steam (t/h)", data: c("steam"), borderColor: W.steam }, { label: "Power (MW)", data: c("power", 1000), borderColor: W.power }, { label: "Fuel gas (kNm³/h)", data: c("fg", 1000), borderColor: W.fg }, { label: "Raw water (m³/h ÷10)", data: c("water", 10), borderColor: W.water }], { yJudul: "satuan sesuai legenda" });
      buat("chD", "line", L, [{ label: "Flare gas FT-901 (Nm³/h)", data: c("flare"), borderColor: W.flare, fill: true }, { label: "FCC stack SO₂ (mg/Nm³)", data: c("so2"), borderColor: W.so2, yAxisID: "y1" }], { scales: dua("Nm³/h", "mg/Nm³", 0) });
      const rlog = SIM.log.filter((x) => x[0] >= SIM.V.t - 86400000), L2 = rlog.map((x) => lblJam(x[0]));
      set("jdlE", "Production rate (24 h, t/h)"); set("jdlF", "Product inventory (24 h, t)");
      buat("chE", "line", L2, [{ label: "Total product (t/h)", data: rlog.map((x) => x[KOL.prod]), borderColor: W.prod, fill: true }], { yJudul: "t/h" });
      buat("chF", "line", L2, [{ label: "Product inventory (t)", data: rlog.map((x) => x[KOL.inv]), borderColor: W.inv, fill: true }], { yJudul: "ton", nol: false });
    } else {
      const { L, d } = periode(filter), besar = filter === "monthly" || filter === "yearly", f = besar ? 1000 : 1, u = besar ? "kt" : "t";
      set("trendInfo", `${d.length} periode · data periode lalu = SIMULATION`);
      buat("chA", "bar", L, [{ label: `Crude processed (${u})`, data: d.map((x) => x.crudeT / f), borderColor: W.feed }], { yJudul: u });
      buat("chB", "bar", L, [{ label: `Total product (${u})`, data: d.map((x) => x.prodT / f), borderColor: W.prod }, { label: `Dispatched (${u})`, data: d.map((x) => x.dispT / f), borderColor: W.inv }], { yJudul: u });
      buat("chC", "bar", L, [{ label: `Steam (${u})`, data: d.map((x) => x.steam / f), borderColor: W.steam }, { label: `Power (${besar ? "GWh" : "MWh"})`, data: d.map((x) => x.power / 1000 / f), borderColor: W.power }], { yJudul: "lihat legenda" });
      buat("chD", "bar", L, [{ label: `Flare gas (${besar ? "MNm³" : "kNm³"})`, data: d.map((x) => x.flare / 1000 / f), borderColor: W.flare }, { label: `Sulfur recovered (${u})`, data: d.map((x) => x.sulfur / f), borderColor: W.so2 }], { yJudul: "lihat legenda" });
      set("jdlE", "Production by product"); set("jdlF", "Fuel gas & hydrogen");
      buat("chE", "bar", L, Object.keys(PW).map((p) => ({ label: `${NAMA[p]} (${u})`, data: d.map((x) => (x[p] || 0) / f), borderColor: PW[p] })), { yJudul: u, stack: true });
      buat("chF", "bar", L, [{ label: `Fuel gas (${besar ? "MNm³" : "kNm³"})`, data: d.map((x) => x.fg / 1000 / f), borderColor: W.fg }, { label: `SMR hydrogen (${besar ? "MNm³" : "kNm³"})`, data: d.map((x) => x.h2 / 1000 / f), borderColor: W.h2 }], { yJudul: "lihat legenda" });
    }
  }

  /* ---------- grafik kecil dari buffer realtime (4 jam terakhir, per menit) ---------- */
  function tagTren(id, tags, warna = ["#22d3ee", "#f59e0b", "#a78bfa", "#ef4444"]) {
    const r = SIM.realtime, L = r.map((a) => lblJam(a.t)), data = tags.map((t) => r.map((a) => a[ix(t)]));
    if (!perbarui(id, L, data)) buat(id, "line", L, tags.map((t, i) => ({ label: `${t} (${TAG[t].unit})`, data: data[i], borderColor: warna[i % warna.length], fill: i === 0, yAxisID: i === 1 && tags.length === 2 && TAG[t].unit !== TAG[tags[0]].unit ? "y1" : "y" })),
      tags.length === 2 && TAG[tags[1]].unit !== TAG[tags[0]].unit ? { scales: { x: { ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: false }, y1: { position: "right", grid: { drawOnChartArea: false } } } } : { nol: false });
  }
  function donat(id, labels, data, warna) { if (!perbarui(id, labels, [data])) buat(id, "doughnut", labels, [{ label: "t/h", data, borderColor: "#0f141c", backgroundColor: warna, borderWidth: 2 }], { scales: {} }); }
  function bersih(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
  return { ADA, trend, tagTren, donat, bersih, PW, NAMA, get filter() { return filter; }, isRT };
})();
