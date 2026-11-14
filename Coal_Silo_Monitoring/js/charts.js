/* =========================================================
   CHARTS.JS — TREND & HISTORY (Chart.js)
   Filter: Real Time (15 menit, 10 s) · 1 Jam · 8 Jam · 24 Jam · 7 Hari · Custom
   Sumber: buffer real-time 10 detik (SIM.rt) & data logger 5 menit (SIM.log)
   ========================================================= */
const GRAFIK = (() => {
  const ADA = typeof Chart !== "undefined";
  if (ADA) {
    Chart.defaults.color = "#9fb3c8"; Chart.defaults.borderColor = "rgba(56,189,248,.10)";
    Chart.defaults.font.family = "Inter, system-ui, sans-serif"; Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.animation = false;
  }
  const WS = ["#22d3ee", "#a78bfa", "#f59e0b", "#4ade80"];         // warna per silo
  const charts = {};
  let filter = "24h", silo = 0, dari = null, sampai = null;

  function buat(id, tipe, labels, datasets, opsi = {}) {
    if (!ADA) return null;
    const cv = document.getElementById(id); if (!cv) return null;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(cv, {
      type: tipe, data: { labels, datasets: datasets.map((d) => ({ borderWidth: 2, pointRadius: 0, tension: 0.25, fill: false, ...d, backgroundColor: d.backgroundColor || d.borderColor + "22" })) },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "top", align: "end" }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, 2)}` } } },
        scales: opsi.scales || { x: { ticks: { maxTicksLimit: 9, maxRotation: 0 } }, y: { beginAtZero: !!opsi.nol, min: opsi.min, max: opsi.max, title: { display: !!opsi.yJudul, text: opsi.yJudul } } },
      },
    });
    return charts[id];
  }
  function bersih(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
  const lbl = (t, panjang) => { const d = new Date(t); return panjang ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : `${pad(d.getHours())}:${pad(d.getMinutes())}${filter === "rt" ? ":" + pad(d.getSeconds()) : ""}`; };

  /* ---------- data: [t, pct, lvlM, berat, Tavg, Tmax, hMax, hMin, hAvg] ---------- */
  function data(i, f = filter) {
    const T = SIM.S.t;
    if (f === "rt") return SIM.rt[i].slice(-90);
    if (f === "1h") return SIM.rt[i].slice(-360);
    const span = { "8h": 8, "24h": 24, "7d": 168 }[f], a = f === "custom" ? dari || T - 86400000 : T - span * 3600000, b = f === "custom" ? sampai || T : T;
    let d = SIM.log.filter((r) => r[1] === i && r[0] >= a && r[0] <= b).map((r) => [r[0], r[2], r[3], r[4], r[6], r[7], r[9], r[8], r[10]]);
    if (d.length > 420) { const k = Math.ceil(d.length / 420); d = d.filter((_, j) => j % k === 0 || j === d.length - 1); }
    return d;
  }
  const garisBatas = (n, nilai, warna, label) => ({ label, data: Array(n).fill(nilai), borderColor: warna, borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0 });

  function trend(f, i) {
    if (f) filter = f; if (i !== undefined) silo = i;
    $$("[data-filter]").forEach((b) => b.classList.toggle("on", b.dataset.filter === filter));
    const semua = silo < 0, idx = semua ? CONFIG.silo.map((_, k) => k) : [silo];
    const D = idx.map((k) => data(k)), acuan = D[0] || [], panjang = filter === "7d" || filter === "custom";
    const L = acuan.map((r) => lbl(r[0], panjang)), n = L.length, B = CONFIG.batas;
    set("trInfo", `${n} titik · ${filter === "rt" || filter === "1h" ? "sampling 10 detik" : "sampling 5 menit (data logger)"}${n ? " · " + waktuStr(acuan[0][0]) + " → " + waktuStr(acuan[n - 1][0]) : ""}`);
    if (semua) {
      buat("chLvl", "line", L, D.map((d, k) => ({ label: CONFIG.silo[k][0] + " (%)", data: d.map((r) => r[1]), borderColor: WS[k] })).concat([garisBatas(n, B.levelH, "#ef4444", "High"), garisBatas(n, B.levelL, "#facc15", "Low")]), { yJudul: "Level (%)", min: 0, max: 100 });
      buat("chBerat", "line", L, D.map((d, k) => ({ label: CONFIG.silo[k][0] + " (t)", data: d.map((r) => r[3]), borderColor: WS[k] })), { yJudul: "Weight (t)", nol: true });
      buat("chSuhu", "line", L, D.map((d, k) => ({ label: CONFIG.silo[k][0] + " Tmax", data: d.map((r) => r[5]), borderColor: WS[k] })).concat([garisBatas(n, B.tempH, "#f97316", "Temp H")]), { yJudul: "°C" });
      buat("chDist", "line", L, D.map((d, k) => ({ label: CONFIG.silo[k][0] + " Δh", data: d.map((r) => r[6] - r[7]), borderColor: WS[k] })), { yJudul: "Max − min height (m)", nol: true });
      return;
    }
    const d = D[0];
    buat("chLvl", "line", L, [
      { label: "Level (%)", data: d.map((r) => r[1]), borderColor: "#22d3ee", fill: true, yAxisID: "y" },
      { label: "Level (m)", data: d.map((r) => r[2]), borderColor: "#a78bfa", yAxisID: "y1" },
      { ...garisBatas(n, B.levelHH, "#ef4444", "HH"), yAxisID: "y" }, { ...garisBatas(n, B.levelL, "#facc15", "L"), yAxisID: "y" },
    ], { scales: { x: { ticks: { maxTicksLimit: 9, maxRotation: 0 } }, y: { min: 0, max: 100, title: { display: true, text: "Level (%)" } }, y1: { position: "right", min: 0, max: Math.ceil(CONFIG.geo.Hfill + 1), grid: { drawOnChartArea: false }, title: { display: true, text: "Level (m)" } } } });
    buat("chBerat", "line", L, [{ label: "Weight (t)", data: d.map((r) => r[3]), borderColor: "#4ade80", fill: true }, garisBatas(n, CONFIG.kapasitas, "#94a3b8", "Capacity")], { yJudul: "t", nol: true });
    buat("chSuhu", "line", L, [{ label: "Average (°C)", data: d.map((r) => r[4]), borderColor: "#fbbf24" }, { label: "Maximum (°C)", data: d.map((r) => r[5]), borderColor: "#ef4444" }, garisBatas(n, B.tempH, "#f97316", "High"), garisBatas(n, B.tempHH, "#dc2626", "High-High")], { yJudul: "°C" });
    buat("chDist", "line", L, [{ label: "Max height (m)", data: d.map((r) => r[6]), borderColor: "#ef4444" }, { label: "Average (m)", data: d.map((r) => r[8]), borderColor: "#22c55e" }, { label: "Min height (m)", data: d.map((r) => r[7]), borderColor: "#3b82f6" }], { yJudul: "m" });
  }
  function custom(a, b) { dari = a; sampai = b; trend("custom"); }

  /* ---------- grafik kecil ---------- */
  function ovLevel(id) {
    const D = CONFIG.silo.map((_, k) => data(k, "24h")), L = (D[0] || []).map((r) => lbl(r[0]));
    if (!perbarui(id, L, D.map((d) => d.map((r) => r[1])))) buat(id, "line", L, D.map((d, k) => ({ label: CONFIG.silo[k][0], data: d.map((r) => r[1]), borderColor: WS[k] })), { min: 0, max: 100, yJudul: "Level (%)" });
  }
  function silo1(id, i, kol, judul, warna, f = "1h") {
    const d = data(i, f), L = d.map((r) => lbl(r[0], f === "7d"));
    if (!perbarui(id, L, [d.map((r) => r[kol])])) buat(id, "line", L, [{ label: judul, data: d.map((r) => r[kol]), borderColor: warna, fill: true }], {});
  }
  function lc(id, i) {      // tren total berat + selisih untuk halaman instrumen
    const d = data(i, "1h"), L = d.map((r) => lbl(r[0]));
    if (!perbarui(id, L, [d.map((r) => r[3])])) buat(id, "line", L, [{ label: "WT total (t)", data: d.map((r) => r[3]), borderColor: "#4ade80", fill: true }], {});
  }
  function perbarui(id, labels, nilai) { const c = charts[id]; if (!c || !c.canvas || !c.canvas.isConnected) return false; c.data.labels = labels; nilai.forEach((d, i) => { if (c.data.datasets[i]) c.data.datasets[i].data = d; }); c.update("none"); return true; }

  return { buat, bersih, trend, custom, data, ovLevel, silo1, lc, WS, get filter() { return filter; }, get silo() { return silo; } };
})();
