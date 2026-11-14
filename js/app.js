/* =========================================================
   APP.JS — OTAK DASHBOARD
   1) Fungsi umum (jam, tab modul, tema, layar penuh, notifikasi)
   2) Modul "Smart Manufacture" (halaman utama)
   Data di sini adalah SIMULASI (angka acak yang bergerak),
   nanti bisa diganti data sensor sungguhan.
   ========================================================= */

/* ---------------- 1. FUNGSI UMUM ---------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmt = (n, d = 0) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
const rupiah = (n) => "Rp " + fmt(Math.round(n));
const jam = (d = new Date()) => d.toLocaleTimeString("id-ID", { hour12: false }).replace(/:/g, ".");
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

// Jam di kanan atas
function updateClock() {
  const now = new Date();
  $("#clockDate").textContent = now.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  $("#clockTime").textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":");
}

// Pindah modul saat tombol di header diklik
const sudahDibuka = {};
function bukaModul(nama) {
  $$("[data-module]").forEach((b) => b.classList.toggle("active", b.dataset.module === nama));
  $$(".module").forEach((m) => m.classList.toggle("active", m.id === "mod-" + nama));
  $("#sidebar").style.display = nama === "manufacture" ? "" : "none";
  window.scrollTo({ top: 0 });
  if (!sudahDibuka[nama]) {
    sudahDibuka[nama] = true;
    if (nama === "tower") buatSmartTower();
    else if (nama === "atg3d") ATG_UI.buka();                     // halaman 3D Automatic Tank Gauge
    else if (nama === "solar3d") buatGreenPower();                // aplikasi Green Power Plant (iframe)
    else if (nama === "refinery3d") buatRefinery();               // aplikasi Oil Refinery Plant (iframe)
    else if (nama === "coalsilo3d") buatCoalSilo();               // aplikasi Coal Silo Monitoring (iframe)
    else if (nama !== "manufacture") Scene3D.buat(nama);
  }
  // Green Power Plant: hentikan gambar 3D saat modulnya tidak dilihat (hemat CPU/GPU)
  const gp = $("#gpFrame");
  if (gp && gp.contentWindow) gp.contentWindow.postMessage(nama === "solar3d" ? "resume" : "pause", "*");
  const rf = $("#rfFrame");
  if (rf && rf.contentWindow) rf.contentWindow.postMessage(nama === "refinery3d" ? "resume" : "pause", "*");
  const cs = $("#csFrame");
  if (cs && cs.contentWindow) cs.contentWindow.postMessage(nama === "coalsilo3d" ? "resume" : "pause", "*");
  if (typeof Scene3D !== "undefined") Scene3D.aktifkan(nama);   // beri tahu modul 3D mana yang harus digambar
  if (typeof ATG_UI !== "undefined") ATG_UI.setAktif(nama === "atg3d");
}

// Modul Solar Plant 3D → menampilkan aplikasi Green_Power_Plant/index.html di dalam bingkai
function buatGreenPower() {
  const m = $("#mod-solar3d");
  m.innerHTML = `
    <div class="gp-bar">
      <div><b>🌿 Green Energy Solar Power Plant</b> <span class="gp-sim">SIMULATION</span>
        <small>3D Renewable Energy Generation &amp; Distribution Management</small></div>
      <div class="gp-aksi">
        <button class="btn" id="gpFull">⛶ Layar penuh</button>
        <a class="btn" href="Green_Power_Plant/index.html" target="_blank" rel="noopener">↗ Buka di tab baru</a>
      </div>
    </div>
    <iframe id="gpFrame" class="gp-frame" src="Green_Power_Plant/index.html" title="Green Energy Solar Power Plant" allow="fullscreen"></iframe>`;
  $("#gpFull").onclick = () => layarPenuh($("#gpFrame"));
}

// Modul Oil Refinery 3D → menampilkan aplikasi Oil_Refinery_Plant/index.html di dalam bingkai
function buatRefinery() {
  const m = $("#mod-refinery3d");
  m.innerHTML = `
    <div class="gp-bar rf-bar">
      <div><b>🛢 3D Oil Refinery Plant</b> <span class="gp-sim">SIMULATION</span>
        <small>Industrial SCADA / DCS process monitoring · api flare & asap cerobong animasi</small></div>
      <div class="gp-aksi">
        <button class="btn" id="rfFull">⛶ Layar penuh</button>
        <a class="btn" href="Oil_Refinery_Plant/index.html" target="_blank" rel="noopener">↗ Buka di tab baru</a>
      </div>
    </div>
    <iframe id="rfFrame" class="gp-frame" src="Oil_Refinery_Plant/index.html" title="3D Oil Refinery Plant" allow="fullscreen"></iframe>`;
  $("#rfFull").onclick = () => layarPenuh($("#rfFrame"));
}

function buatCoalSilo() {
  const m = $("#mod-coalsilo3d");
  m.innerHTML = `
    <div class="gp-bar cs-bar">
      <div><b>⛏ 3D Coal Silo Monitoring</b> <span class="gp-sim">SIMULATION</span>
        <small>4 silo batu bara · kontur material 3D · instrumen · peralatan · alarm · data logger</small></div>
      <div class="gp-aksi">
        <button class="btn" id="csFull">⛶ Layar penuh</button>
        <a class="btn" href="Coal_Silo_Monitoring/index.html" target="_blank" rel="noopener">↗ Buka di tab baru</a>
      </div>
    </div>
    <iframe id="csFrame" class="gp-frame" src="Coal_Silo_Monitoring/index.html" title="3D Coal Silo Monitoring" allow="fullscreen"></iframe>`;
  $("#csFull").onclick = () => layarPenuh($("#csFrame"));
}

// Layar penuh untuk elemen tertentu (atau seluruh halaman)
function layarPenuh(el = document.documentElement) {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => toast("Layar penuh tidak diizinkan di jendela ini"));
  } catch (e) { toast("Layar penuh tidak didukung"); }
}

// Unduh data sebagai file CSV (bisa dibuka di Excel)
function unduhCSV(namaFile, baris) {
  const isi = baris.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + isi], { type: "text/csv" }));
    a.download = namaFile;
    a.click();
    toast("CSV diunduh: " + namaFile);
  } catch (e) { toast("Unduhan tidak diizinkan di jendela ini"); }
}
function cetakPDF() {
  try { window.print(); } catch (e) { toast("Cetak PDF tidak diizinkan di jendela ini"); }
}

/* ---------------- 2. MODUL SMART MANUFACTURE ---------------- */

// "State" = kondisi terkini semua data
const state = {
  alat: Object.fromEntries(PERALATAN.map((p) => [p.id, true])),   // true = ON
  sensor: Object.fromEntries(SENSOR.map((s) => [s.id, s.nilai])),
  riwayat: Object.fromEntries(SENSOR.map((s) => { let v = s.nilai; return [s.id, Array.from({ length: 40 }, () => (v = Math.max(s.nilai - s.acak * 4, Math.min(s.nilai + s.acak * 4, v + rand(-s.acak, s.acak)))))]; })),
  energi: 13054, produksi: 8733, biaya: 18617976, emisi: 2.48,
  anomali: [], logger: [], kameraAktif: 0,
  pintu: Object.fromEntries(PINTU.map((p) => [p, "Normal"])),
  aksesLog: [], zona: Object.fromEntries(ZONA_API.map((z) => [z, "Normal"])),
  tren: { energi: [], produksi: [], suhu: [], waktu: [] },
  oee: { a: 94, p: 100, q: 96 }, esgSkala: 1,
};
// Hubungan alat → sensor (jika alat dimatikan, sensor menjadi 0)
const ALAT_SENSOR = { pompa: "tpompa", flow: "flow", genset: "tgenset", power: "power", valve: "valve", battery: "aki" };

function buatSmartManufacture() {
  const el = $("#mod-manufacture");
  el.innerHTML = `
  <div class="grid row-top">
    <!-- RINGKASAN -->
    <div class="panel" id="ringkasan">
      <div class="panel-title" style="margin-bottom:10px">Ringkasan</div>
      <div class="kpi"><div class="label">⚡ Total Energi</div><div class="value" id="k-energi">-</div><div class="delta up">▲ 8,2%</div></div>
      <div class="kpi"><div class="label">🏭 Total Produksi</div><div class="value" id="k-produksi">-</div><div class="delta up">▲ 12,5%</div></div>
      <div class="kpi"><div class="label">💰 Biaya Operasional</div><div class="value" id="k-biaya">-</div><div class="delta down">▼ 6,8%</div></div>
      <div class="kpi"><div class="label">🌱 Emisi Karbon</div><div class="value" id="k-emisi">-</div><div class="delta up">▼ 15,3%</div></div>
      <div class="kpi"><div class="label">🛡️ Ketersediaan Sistem</div><div class="value" id="k-avail">99,1%</div><div class="delta up">▲ 0,6%</div></div>
    </div>

    <!-- DIGITAL TWIN -->
    <div class="panel" id="digital-twin">
      <div class="panel-head">
        <div class="panel-title">Digital Twin – Live Monitoring &amp; Kontrol</div>
        <button class="btn" onclick="layarPenuh(document.getElementById('digital-twin'))">⛶ Layar Penuh</button>
      </div>
      <div class="twin-wrap">${factoryIllustration()}
        <div class="live-tag"><img src="assets/logo.png" alt=""><span style="color:#22c55e">●</span> LIVE <span id="twinClock"></span></div>
      </div>
      <div class="metric-strip" id="twinStrip"></div>
      <div class="metric-strip" id="twinStops"></div>
    </div>

    <!-- KONTROL PERALATAN -->
    <div class="panel" id="kontrol">
      <div class="panel-head"><div class="panel-title">Kontrol Peralatan</div><span class="muted" id="aktifCount">12/12 aktif</span></div>
      <div class="equip-grid" id="equipGrid"></div>
      <div class="panel-title" style="margin:12px 0 8px">Kontrol Jadwal</div>
      <div class="sched-grid">
        <div class="sched"><b>Pompa</b>06:00-12:00 <span class="up">ON</span><br>12:00-13:00 <span class="down">OFF</span><br>13:00-17:00 <span class="up">ON</span></div>
        <div class="sched"><b>Lighting</b>06:00-18:00 <span class="up">ON</span><br>18:00-06:00 <span class="down">OFF</span></div>
        <div class="sched"><b>Chiller</b>06:00-18:00 <span class="up">ON</span><br>18:00-06:00 <span class="down">OFF</span></div>
        <div class="sched"><b>Flow Meter</b>24 Jam <span class="up">ON</span></div>
      </div>
    </div>
  </div>

  <!-- MONITORING REAL-TIME -->
  <div class="panel" id="realtime" style="margin-bottom:12px">
    <div class="panel-head"><div class="panel-title">Monitoring Real-Time</div><b class="muted">Pembaruan tiap 1 detik</b></div>
    <div class="rt-grid" id="rtGrid"></div>
  </div>

  <div class="grid row-3">
    <!-- CCTV -->
    <div class="panel" id="cctv">
      <div class="panel-head"><div class="panel-title">CCTV – AI Image Snapshot</div><button class="btn" id="btnSnap">📷 Snapshot AI</button></div>
      <div class="cctv-main" id="cctvMain"></div>
      <div class="cctv-info" id="cctvInfo">🧠 AI Vision: 4 orang · 9 objek terdeteksi · APD sesuai · Tidak ada intrusi</div>
      <div class="cctv-thumbs" id="cctvThumbs"></div>
    </div>

    <!-- AKSES KONTROL -->
    <div class="panel" id="akses">
      <div class="panel-head"><div class="panel-title">Akses Kontrol – Status &amp; Trip</div><span class="badge green" id="acBadge">No Trip</span></div>
      <table id="acTable"></table>
      <div class="ac-person" id="acPerson"></div>
      <div class="ac-log" id="acLog"></div>
      <button class="btn" style="margin-top:10px" id="btnResetTrip">Reset Trip</button>
    </div>

    <!-- FIRE ALARM -->
    <div class="panel" id="fire">
      <div class="panel-head"><div class="panel-title">Fire Alarm – Status &amp; Trip</div><span class="badge green" id="faBadge">Normal</span></div>
      <table id="faTable"></table>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        <select class="btn" id="faZona">${ZONA_API.map((z) => `<option>${z}</option>`).join("")}</select>
        <button class="btn" id="btnAlarm">🔔 Alarm</button>
        <button class="btn" id="btnFaTrip">⚡ Trip</button>
        <button class="btn" id="btnFaReset">✅ Reset</button>
      </div>
    </div>
  </div>

  <div class="grid row-2">
    <!-- AI ANOMALI -->
    <div class="panel" id="ai">
      <div class="panel-head"><div class="panel-title">AI – Pemicu Anomali</div>
        <div><span class="badge red" id="alertCount">0 Alert</span> <button class="btn" id="btnSimAnomali">⚡ Simulasi anomali</button></div></div>
      <table><thead><tr><th>Jam</th><th>Parameter</th><th>Nilai</th><th>Batas</th><th>Status</th></tr></thead><tbody id="anomaliBody"></tbody></table>
    </div>
    <!-- AI INSIGHT -->
    <div class="panel">
      <div class="panel-head"><div class="panel-title">AI Business Insight</div></div>
      <div class="insight-grid">
        <div class="insight"><h4>⚡ Optimasi Energi</h4><p id="in-energi">-</p></div>
        <div class="insight"><h4>🏭 Efisiensi Produksi</h4><p id="in-prod">-</p></div>
        <div class="insight"><h4>🔧 Rekomendasi Perawatan</h4><p id="in-rawat">-</p></div>
        <div class="insight"><h4>💰 Peluang Hemat Biaya</h4><p id="in-hemat">-</p></div>
      </div>
    </div>
  </div>

  <div class="grid row-2b">
    <!-- OEE -->
    <div class="panel" id="oee">
      <div class="panel-title" style="margin-bottom:10px">Machine Health &amp; OEE</div>
      <div class="oee-rings" id="oeeRings"></div>
      <div class="oee-total"><div class="small">Overall Equipment Effectiveness (A × P × Q)</div>
        <div class="big" id="oeeTotal">90,5%</div><div class="small">Target 90%</div>
        <div class="small">Waktu operasi 453/480 mnt · Downtime 27 mnt<br>Output 8.750 dari ideal 8.750 unit · Good 8.396 · Reject 353</div></div>
    </div>
    <!-- TREN -->
    <div class="panel" id="tren">
      <div class="panel-head"><div class="panel-title">Analisis Tren</div>
        <div><button class="btn" id="trenCsv">⬇ CSV</button> <button class="btn" onclick="cetakPDF()">⬇ PDF</button></div></div>
      <div class="trend-legend">
        <label><input type="checkbox" checked data-seri="energi"> <span style="color:#22d3ee">Energi (kWh)</span></label>
        <label><input type="checkbox" checked data-seri="produksi"> <span style="color:#4ade80">Produksi (unit)</span></label>
        <label><input type="checkbox" checked data-seri="suhu"> <span style="color:#f43f5e">Suhu (°C)</span></label>
      </div>
      <canvas class="trend" id="trendCanvas"></canvas>
    </div>
  </div>

  <div class="grid row-2">
    <!-- DATA LOGGER -->
    <div class="panel" id="logger">
      <div class="panel-head"><div class="panel-title">Data Logger</div>
        <div><button class="btn" id="loggerCsv">⬇ CSV</button> <button class="btn" onclick="cetakPDF()">⬇ PDF</button></div></div>
      <table><thead><tr><th>Waktu</th><th>Peralatan</th><th>Parameter</th><th>Nilai</th><th>Satuan</th></tr></thead><tbody id="loggerBody"></tbody></table>
    </div>
    <!-- ESG -->
    <div class="panel" id="esg">
      <div class="panel-head"><div class="panel-title">Reporting ESG</div>
        <div><select class="btn" id="esgPeriode"><option value="1">Harian</option><option value="7">Mingguan</option><option value="30">Bulanan</option></select>
        <button class="btn" id="esgCsv">⬇ CSV</button> <button class="btn" onclick="cetakPDF()">⬇ PDF</button></div></div>
      <div class="esg-grid" id="esgGrid"></div>
    </div>
  </div>`;

  // --- isi kartu peralatan ---
  $("#equipGrid").innerHTML = PERALATAN.map((p) => `
    <div class="equip" id="eq-${p.id}">
      <div class="name">${p.nama}</div>
      <div class="pic">${ICONS[p.icon]}</div>
      <div class="status">● ON · Normal</div>
      <div class="acts"><button class="btn green sm" onclick="setAlat('${p.id}', true)">Start</button>
      <button class="btn red sm" onclick="setAlat('${p.id}', false)">Stop</button></div>
    </div>`).join("");

  // --- kartu sensor real-time ---
  $("#rtGrid").innerHTML = SENSOR.map((s) => `
    <div class="rt" id="rt-${s.id}"><div class="label">${s.nama}</div>
      <div class="value"><span>-</span> <small>${s.satuan}</small></div><div class="spark"></div></div>`).join("");

  // --- tombol Stop di bawah digital twin ---
  const stopList = ["hvac", "chiller", "pompa", "flow", "boiler", "genset"];
  $("#twinStops").innerHTML = stopList.map((id) => `<button class="btn outline-green" id="ts-${id}" onclick="setAlat('${id}', !state.alat['${id}'])"></button>`).join("");

  // --- CCTV ---
  $("#cctvThumbs").innerHTML = KAMERA.map((k, i) => `
    <div class="cctv-thumb ${i === 0 ? "active" : ""}" data-cam="${i}">${cctvScene(i + 1, false)}<div class="scanlines"></div>
    <div class="cctv-cap">${k}</div><div class="cctv-live">LIVE</div></div>`).join("");
  $$(".cctv-thumb").forEach((t) => t.addEventListener("click", () => pilihKamera(+t.dataset.cam)));
  pilihKamera(0);
  $("#btnSnap").onclick = () => {
    const orang = 2 + Math.floor(Math.random() * 5), objek = 6 + Math.floor(Math.random() * 6);
    $("#cctvInfo").textContent = `🧠 AI Vision: ${orang} orang · ${objek} objek terdeteksi · APD sesuai · Tidak ada intrusi`;
    toast(`Snapshot AI ${KAMERA[state.kameraAktif]}: ${orang} orang, ${objek} objek`);
  };

  // --- Akses kontrol ---
  renderPintu();
  aksesMasuk();
  $("#btnResetTrip").onclick = () => { PINTU.forEach((p) => (state.pintu[p] = "Normal")); renderPintu(); toast("Semua trip akses direset"); };

  // --- Fire alarm ---
  renderZona();
  $("#btnAlarm").onclick = () => { state.zona[$("#faZona").value] = "Alarm"; renderZona(); toast("🔔 ALARM: " + $("#faZona").value); };
  $("#btnFaTrip").onclick = () => { state.zona[$("#faZona").value] = "Trip"; renderZona(); toast("⚡ TRIP: " + $("#faZona").value); };
  $("#btnFaReset").onclick = () => { ZONA_API.forEach((z) => (state.zona[z] = "Normal")); renderZona(); toast("Fire alarm direset"); };

  // --- Anomali ---
  $("#btnSimAnomali").onclick = () => {
    const s = pick(SENSOR);
    const nilai = s.bawah ? s.batas - s.acak * 3 : s.batas + s.acak * 3;
    catatAnomali(s, nilai, true);
    toast("Simulasi anomali: " + s.nama);
  };

  for (let i = 0; i < 6; i++) { const s = pick(SENSOR); catatAnomali(s, s.bawah ? s.batas * 0.99 : s.batas * 1.01, false); }

  // --- Tren ---
  for (let i = 60; i > 0; i--) tambahTren(new Date(Date.now() - i * 1000));
  $$("[data-seri]").forEach((c) => c.addEventListener("change", gambarTren));
  $("#trenCsv").onclick = () => unduhCSV("tren.csv", [["Waktu", "Energi", "Produksi", "Suhu"],
    ...state.tren.waktu.map((w, i) => [w, state.tren.energi[i].toFixed(1), state.tren.produksi[i].toFixed(0), state.tren.suhu[i].toFixed(1)])]);

  // --- Data logger ---
  for (let i = 0; i < 8; i++) tambahLogger(new Date(Date.now() - (8 - i) * 3000));
  $("#loggerCsv").onclick = () => unduhCSV("data-logger.csv", [["Waktu", "Peralatan", "Parameter", "Nilai", "Satuan"], ...state.logger]);

  // --- ESG ---
  $("#esgPeriode").onchange = (e) => { state.esgSkala = +e.target.value; renderESG(); };
  $("#esgCsv").onclick = () => unduhCSV("esg.csv", [["Indikator", "Nilai", "Satuan"], ...dataESG().map((d) => [d[0], d[1], d[2]])]);

  // --- menu samping: tandai bagian yang sedang terlihat ---
  const bagian = ["ringkasan", "digital-twin", "kontrol", "realtime", "cctv", "akses", "fire", "ai", "oee", "tren", "logger", "esg"];
  window.addEventListener("scroll", () => {
    let aktif = bagian[0];
    bagian.forEach((id) => { if (document.getElementById(id).getBoundingClientRect().top < 160) aktif = id; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) aktif = "esg";
    $$(".sidebar a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + aktif));
  });

  renderAlat();
  tickManufacture();
}

/* ---- Nyalakan / matikan peralatan ---- */
function setAlat(id, on) {
  state.alat[id] = on;
  renderAlat();
  const p = PERALATAN.find((x) => x.id === id);
  toast(`${p.nama} ${on ? "dinyalakan (Start)" : "dimatikan (Stop)"}`);
}
function renderAlat() {
  let aktif = 0;
  PERALATAN.forEach((p) => {
    const on = state.alat[p.id];
    if (on) aktif++;
    const card = $("#eq-" + p.id);
    card.classList.toggle("off", !on);
    card.querySelector(".status").textContent = on ? "● ON · Normal" : "● OFF · Berhenti";
    const b = $("#ts-" + p.id);
    if (b) b.textContent = (on ? "⏸ Stop " : "▶ Start ") + p.nama;
  });
  $("#aktifCount").textContent = `${aktif}/${PERALATAN.length} aktif`;
}

/* ---- CCTV ---- */
function pilihKamera(i) {
  state.kameraAktif = i;
  $("#cctvMain").innerHTML = `${cctvScene(i + 1, true)}<div class="scanlines"></div><div class="cctv-cap">${KAMERA[i]}</div><div class="cctv-live">LIVE</div>`;
  $$(".cctv-thumb").forEach((t) => t.classList.toggle("active", +t.dataset.cam === i));
}

/* ---- Akses kontrol ---- */
function renderPintu() {
  $("#acTable").innerHTML = PINTU.map((p) => {
    const st = state.pintu[p], cls = st === "Normal" ? "green" : st === "Terbuka" ? "orange" : "red";
    return `<tr class="ac-row"><td>🔒 ${p}</td><td><span class="badge ${cls}">${st}</span></td>
      <td style="text-align:right"><button class="btn sm" onclick="bukaPintu('${p}')">Buka</button> <button class="btn sm" onclick="tripPintu('${p}')">Trip</button></td></tr>`;
  }).join("");
  const adaTrip = Object.values(state.pintu).includes("Trip");
  $("#acBadge").className = "badge " + (adaTrip ? "red" : "green");
  $("#acBadge").textContent = adaTrip ? "TRIP" : "No Trip";
}
function bukaPintu(p) {
  state.pintu[p] = "Terbuka"; renderPintu(); toast(p + " dibuka");
  setTimeout(() => { if (state.pintu[p] === "Terbuka") { state.pintu[p] = "Normal"; renderPintu(); } }, 4000);
}
function tripPintu(p) { state.pintu[p] = "Trip"; renderPintu(); toast("⚠ Trip: " + p); }
function aksesMasuk() {
  const k = pick(KARYAWAN), p = pick(PINTU), w = jam();
  $("#acPerson").innerHTML = `<div class="snap">${cctvScene(PINTU.indexOf(p) + 3, false)}</div>
    <div><b>${k.nama}</b><div class="muted">${k.id} · ${p}</div><div>${w} <span class="badge green">Granted</span></div></div>`;
  state.aksesLog.unshift(`${w} – ${p}: ${k.nama} masuk`);
  state.aksesLog = state.aksesLog.slice(0, 4);
  $("#acLog").innerHTML = state.aksesLog.join("<br>");
}

/* ---- Fire alarm ---- */
function renderZona() {
  $("#faTable").innerHTML = ZONA_API.map((z) => {
    const st = state.zona[z], cls = st === "Normal" ? "green" : "red";
    const asap = st === "Normal" ? rand(0.02, 0.05) : rand(2, 4);
    const suhu = st === "Normal" ? Math.round(rand(27, 29)) : Math.round(rand(55, 70));
    return `<tr><td>${z}</td><td><span class="badge ${cls}">${st}</span></td><td class="fa-flame">💨 ${fmt(asap, 2)}%/m · 🌡 ${suhu}°C</td></tr>`;
  }).join("");
  const bahaya = Object.values(state.zona).some((s) => s !== "Normal");
  $("#faBadge").className = "badge " + (bahaya ? "red" : "green");
  $("#faBadge").textContent = bahaya ? "ALARM" : "Normal";
}

/* ---- Anomali ---- */
function catatAnomali(s, nilai, paksa) {
  const lewat = s.bawah ? nilai < s.batas : nilai > s.batas;
  const dekat = s.bawah ? nilai < s.batas * 1.01 : nilai > s.batas * 0.99;
  if (!paksa && !dekat) return;
  state.anomali.unshift([jam(), s.nama, `${fmt(nilai, s.desimal)} ${s.satuan}`, fmt(s.batas, s.desimal), lewat || paksa ? "Abnormal" : "Warning"]);
  state.anomali = state.anomali.slice(0, 30);
  $("#alertCount").textContent = state.anomali.length + " Alert";
  $("#anomaliBody").innerHTML = state.anomali.slice(0, 6).map((r) =>
    `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="badge ${r[4] === "Abnormal" ? "red" : "orange"}">${r[4]}</span></td></tr>`).join("");
}

/* ---- Tren ---- */
function tambahTren(t = new Date()) {
  const T = state.tren;
  T.energi.push(rand(200, 300)); T.produksi.push(rand(80, 160));
  T.suhu.push(23 + Math.sin(T.suhu.length / 12) * 1.2 + rand(-0.2, 0.2));
  T.waktu.push(jam(t));
  if (T.waktu.length > 90) Object.values(T).forEach((a) => a.shift());
}
function gambarTren() {
  const cv = $("#trendCanvas");
  if (!cv || !cv.offsetWidth) return;
  const dpr = window.devicePixelRatio || 1, w = cv.offsetWidth, h = cv.offsetHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext("2d");
  c.scale(dpr, dpr);
  c.strokeStyle = getComputedStyle(document.body).getPropertyValue("--border");
  c.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = 10 + i * ((h - 30) / 4); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  const warna = { energi: "#22d3ee", produksi: "#4ade80", suhu: "#f43f5e" };
  $$("[data-seri]").forEach((cb) => {
    if (!cb.checked) return;
    const d = state.tren[cb.dataset.seri], mn = Math.min(...d), mx = Math.max(...d), r = mx - mn || 1;
    c.strokeStyle = warna[cb.dataset.seri]; c.lineWidth = 1.6; c.beginPath();
    d.forEach((v, i) => { const x = (i / (d.length - 1)) * w, y = 10 + (1 - (v - mn) / r) * (h - 30); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.stroke();
  });
  c.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  c.font = "10px Inter, sans-serif";
  c.fillText(state.tren.waktu[0].replace(/\./g, ":"), 2, h - 4);
  const akhir = state.tren.waktu[state.tren.waktu.length - 1].replace(/\./g, ":");
  c.fillText(akhir, w - c.measureText(akhir).width - 2, h - 4);
}

/* ---- Data logger ---- */
function tambahLogger(t = new Date()) {
  const s = pick(SENSOR);
  const tgl = t.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  state.logger.unshift([`${tgl} ${t.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":")}`, s.nama, "Nilai", fmt(state.sensor[s.id], s.desimal), s.satuan]);
  state.logger = state.logger.slice(0, 200);
  const body = $("#loggerBody");
  if (body) body.innerHTML = state.logger.slice(0, 8).map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("");
}

/* ---- ESG ---- */
function dataESG() {
  const k = state.esgSkala;
  return [
    ["Skor ESG (E / S / G)", "87,6 (89 / 86 / 88)", "/100"],
    ["Konsumsi energi", fmt(state.energi * k), "kWh"],
    ["Emisi karbon", fmt(state.emisi * k, 2), "Ton CO₂"],
    ["Konsumsi air", fmt(14338 * k), "m³"],
    ["Energi terbarukan (solar)", "73", "%"],
    ["Daur ulang limbah", "78", "%"],
    ["Insiden K3", "0", "kasus"],
    ["Energi dihemat", fmt(2450 * k), "kWh"],
    ["Penghematan biaya", rupiah(3675000 * k), "IDR"],
    ["Reduksi CO₂", fmt(1.2 * k, 1), "Ton"],
    ["Ketersediaan sistem", "99,1", "%"],
    ["OEE", fmt((state.oee.a * state.oee.p * state.oee.q) / 10000, 1), "%"],
  ];
}
function renderESG() {
  $("#esgGrid").innerHTML = dataESG().map((d) => `<div class="esg"><div class="label">${d[0]}</div><div class="value">${d[1]} <small>${d[2]}</small></div></div>`).join("");
}

/* ---- DETAK SETIAP 1 DETIK: semua angka diperbarui ---- */
let detik = 0;
function tickManufacture() {
  detik++;
  // 1. sensor bergerak acak (random walk) di sekitar nilai awal
  SENSOR.forEach((s) => {
    let v = state.sensor[s.id] + rand(-s.acak, s.acak);
    v = Math.max(s.nilai - s.acak * 4, Math.min(s.nilai + s.acak * 4, v));
    const alatMati = Object.entries(ALAT_SENSOR).find(([a, sid]) => sid === s.id && !state.alat[a]);
    state.sensor[s.id] = v;
    const tampil = alatMati ? 0 : v;
    state.riwayat[s.id].push(tampil); state.riwayat[s.id].shift();
    const kartu = $("#rt-" + s.id);
    const waspada = s.bawah ? tampil < s.batas * 1.02 : tampil > s.batas * 0.98;
    kartu.classList.toggle("warn", waspada && !alatMati);
    kartu.querySelector(".value span").textContent = fmt(tampil, s.desimal);
    kartu.querySelector(".spark").innerHTML = sparkline(state.riwayat[s.id]);
    if (!alatMati && Math.random() < 0.15) catatAnomali(s, v, false);
  });
  const S = state.sensor, on = state.alat;

  // 2. ringkasan
  state.energi += rand(0.5, 1.6); state.produksi += Math.random() < 0.6 ? 1 : 0;
  state.biaya += rand(400, 1200); state.emisi += 0.00002;
  $("#k-energi").textContent = fmt(state.energi) + " kWh";
  $("#k-produksi").textContent = fmt(state.produksi) + " unit";
  $("#k-biaya").textContent = rupiah(state.biaya);
  $("#k-emisi").textContent = fmt(state.emisi, 2) + " Ton CO₂";

  // 3. label di gambar digital twin
  const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  set("tw-chiller", on.chiller ? fmt(6 + rand(-0.2, 0.2), 1) + " °C" : "OFF");
  set("tw-ahu", on.ahu ? fmt(S.suhu, 1) + " °C" : "OFF");
  set("tw-boiler", on.boiler ? "Gas " + fmt(S.gas) + " m³" : "OFF");
  set("tw-light", on.lighting ? "Normal" : "OFF");
  set("tw-flow", on.flow ? fmt(S.flow) + " m³/h" : "OFF");
  set("tw-lvmdp", on.lvmdp ? fmt(rand(379, 383)) + " V" : "OFF");
  set("tw-pompa", on.pompa ? fmt(S.tpompa, 1) + " bar" : "OFF");
  set("tw-aki", on.battery ? fmt(S.aki, 1) + " V" : "OFF");
  set("tw-genset", on.genset ? fmt(S.tgenset, 1) + " bar" : "OFF");
  set("tw-lini", fmt(state.produksi) + " unit");
  set("tw-power", on.power ? fmt(S.power, 1) + " kWh" : "OFF");
  set("tw-suhu", `${fmt(S.suhu, 1)}°C | ${fmt(S.rh)}%RH`);
  set("twinClock", jam());
  set("cctv-temp", fmt(S.suhu - 0.9, 1) + "°C");

  const nol = (a, v) => (on[a] ? v : 0);
  $("#twinStrip").innerHTML = [
    ["Flow Meter", fmt(nol("flow", S.flow)), "m³/h"], ["Power Meter", fmt(nol("power", S.power), 1), "kWh"],
    ["Tekanan Pompa", fmt(nol("pompa", S.tpompa), 1), "bar"], ["Tekanan Genset", fmt(nol("genset", S.tgenset), 1), "bar"],
    ["Suhu", fmt(S.suhu, 1), "°C"], ["Kelembapan", fmt(S.rh), "%RH"],
  ].map((m) => `<div class="metric"><div class="label">${m[0]}</div><div class="value">${m[1]} <small>${m[2]}</small></div></div>`).join("");

  // 4. OEE
  state.oee.a = Math.max(90, Math.min(97, state.oee.a + rand(-0.3, 0.3)));
  state.oee.q = Math.max(93, Math.min(98, state.oee.q + rand(-0.2, 0.2)));
  const oee = (state.oee.a * state.oee.p * state.oee.q) / 10000;
  $("#oeeRings").innerHTML = [["Availability", state.oee.a, "#22d3ee"], ["Performance", state.oee.p, "#22c55e"], ["Quality", state.oee.q, "#a855f7"]]
    .map(([n, v, c]) => `<div>${ring(v, c)}<div class="ring-label">${n}</div></div>`).join("");
  $("#oeeTotal").textContent = fmt(oee, 1) + "%";

  // 5. AI insight
  $("#in-energi").textContent = `Potensi hemat 19% (≈ ${rupiah(115000 + rand(0, 2000))} / hari)`;
  $("#in-prod").textContent = `OEE ${fmt(oee, 1)}% di atas target 90%. Fokus: Availability (${fmt(state.oee.a, 1)}%)`;
  $("#in-rawat").textContent = `Cek Kelembapan (${fmt(S.rh)} %RH) – mendekati batas operasi`;
  $("#in-hemat").textContent = `Potensi ${rupiah(3456875 + rand(0, 60000))} / bulan dari penjadwalan beban & chiller`;

  // 6. tren, logger, akses, ESG
  tambahTren(); gambarTren();
  if (detik % 3 === 0) tambahLogger();
  if (detik % 6 === 0) aksesMasuk();
  if (detik % 5 === 0) renderZona();
  renderESG();
}

/* ---------------- PENCARIAN ---------------- */
function cari(teks) {
  teks = teks.trim().toLowerCase();
  if (!teks) return;
  const kandidat = [...$$(".module.active .equip, .module.active .rt, .module.active .panel-title, .module.active .tenant, .module.active .sys")];
  const hasil = kandidat.find((el) => el.textContent.toLowerCase().includes(teks));
  if (!hasil) return toast("Tidak ditemukan: " + teks);
  const target = hasil.classList.contains("panel-title") ? hasil.closest(".panel") : hasil;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.style.outline = "2px solid var(--accent)";
  setTimeout(() => (target.style.outline = ""), 2000);
}

/* ---------------- MULAI ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  document.body.insertAdjacentHTML("afterbegin", SVG_DEFS);
  $("#brandTitle").textContent = CONFIG.namaSistem;
  $("#brandSub").textContent = CONFIG.subJudul;
  document.title = CONFIG.namaSistem;
  $("#footer").innerHTML = `<span>☎ ${CONFIG.telepon}</span><span>✉ ${CONFIG.email}</span><span>🌐 ${CONFIG.website}</span><span>${CONFIG.namaPembuat}</span><span>Provide by ${CONFIG.namaPerusahaan}</span>`;

  $$("[data-module]").forEach((b) => b.addEventListener("click", () => bukaModul(b.dataset.module)));
  $("#btnTheme").onclick = () => {
    document.body.classList.toggle("light");
    try { localStorage.setItem("tema", document.body.classList.contains("light") ? "light" : "dark"); } catch (e) {}
    gambarTren();
  };
  try { if (localStorage.getItem("tema") === "light") document.body.classList.add("light"); } catch (e) {}
  $("#btnFull").onclick = () => layarPenuh();
  $("#btnIntegrasi").onclick = () => toast("Mode integrasi: Simulasi — data dibuat otomatis. Lihat panduan untuk sensor asli.");
  $("#search").addEventListener("keydown", (e) => { if (e.key === "Enter") cari(e.target.value); });

  // Ukur tinggi header agar menu samping selalu pas di bawahnya (berapa pun ukuran logo)
  const aturTinggiHeader = () => document.documentElement.style.setProperty("--header-h", $(".app-header").offsetHeight + "px");
  aturTinggiHeader();
  window.addEventListener("resize", aturTinggiHeader);
  $(".brand-logo").addEventListener("load", aturTinggiHeader);

  buatSmartManufacture();
  updateClock();
  setInterval(() => {
    updateClock();
    tickManufacture();
    if (window.tickTower && sudahDibuka.tower) tickTower();
  }, 1000);
  window.addEventListener("resize", gambarTren);
});
