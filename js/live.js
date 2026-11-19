/* =========================================================
   LIVE.JS — DATA ALAT ASLI (POWER METER) LEWAT MQTT
   Alur: Power meter (RS-485) → HMI Haiwell → MySQL XAMPP → PPA Bridge (laptop)
         → broker MQTT HiveMQ → website ini (MQTT over WebSocket, port 8884)
   Pengaturan ada di js/config.js bagian "LIVE".
   Bila LIVE.aktif = false, dashboard tetap memakai data simulasi.

   STATUS YANG DITAMPILKAN
   ● ONLINE  (hijau)  data baru masuk normal
   ⚠ OFFLINE (merah)  salah satu penyebab:
     - website tidak menerima data > LIVE.batasOffline detik  (laptop / internet / bridge mati)
     - "DATA LAMA"   database tidak diperbarui HMI              (HMI / Haiwell Client mati)
     - "NILAI BEKU"  angka tidak berubah sama sekali beberapa menit (power meter mati / RS-485 putus)
     - "ALAT OFFLINE" HMI melaporkan komunikasi power meter putus (kolom status, opsional)
   ========================================================= */
const LIVE_DATA = { status: "SIMULASI", d: {}, terima: 0, err: "", mulai: Date.now() };

(function hubungkanLive() {
  if (typeof LIVE === "undefined" || !LIVE.aktif) return;
  if (typeof mqtt === "undefined") { LIVE_DATA.status = "LIBRARY MQTT GAGAL DIMUAT"; return; }
  LIVE_DATA.status = "MENGHUBUNGKAN";
  const opsi = { clientId: "web-" + Math.random().toString(16).slice(2, 10), reconnectPeriod: 5000, connectTimeout: 10000 };
  if (LIVE.user) { opsi.username = LIVE.user; opsi.password = LIVE.pass; }      // broker publik: kosongkan user
  const klien = mqtt.connect(LIVE.url, opsi);
  klien.on("connect", () => { klien.subscribe(LIVE.topik, { qos: 1 }); LIVE_DATA.status = "TERHUBUNG – MENUNGGU DATA"; LIVE_DATA.err = ""; });
  klien.on("message", (topik, isi) => {
    try { LIVE_DATA.d = JSON.parse(typeof isi === "string" ? isi : new TextDecoder().decode(isi)); LIVE_DATA.terima = Date.now(); LIVE_DATA.status = "ONLINE"; }
    catch (e) { LIVE_DATA.err = "Format data bukan JSON"; }
  });
  klien.on("error", (e) => { LIVE_DATA.status = "ERROR"; LIVE_DATA.err = e.message; });
  klien.on("offline", () => { LIVE_DATA.status = "BROKER TIDAK TERJANGKAU"; });
})();

/* ---------- penilaian status ---------- */
const umurTerima = () => (LIVE_DATA.terima ? (Date.now() - LIVE_DATA.terima) / 1000 : Infinity);
function liveKondisi() {
  // hasil: { online: bool, judul, sebab }
  if (typeof LIVE === "undefined" || !LIVE.aktif) return { online: false, judul: "SIMULASI", sebab: "" };
  const s = String(LIVE_DATA.d.status || "OK");
  if (!LIVE_DATA.terima) {
    const tunggu = (Date.now() - LIVE_DATA.mulai) / 1000;
    if (tunggu < LIVE.batasOffline) return { online: false, menunggu: true, judul: "MENGHUBUNGKAN…", sebab: LIVE_DATA.status };
    return { online: false, judul: "OFFLINE", sebab: "Belum ada data sama sekali – pastikan laptop menyala, internet tersambung, dan jendela PPA Bridge terbuka." + (LIVE_DATA.err ? " (" + LIVE_DATA.err + ")" : "") };
  }
  if (umurTerima() >= LIVE.batasOffline) return { online: false, judul: "OFFLINE", sebab: `Tidak ada data ${Math.round(umurTerima())} detik – laptop mati, internet putus, atau jendela PPA Bridge ditutup.` };
  const detik = (s.match(/\d+/) || [""])[0];
  if (s.startsWith("DATA LAMA")) return { online: false, judul: "OFFLINE", sebab: `Database tidak diperbarui selama ${detik} detik – cek HMI Haiwell dan Haiwell Client.` };
  if (s.startsWith("NILAI BEKU")) return { online: false, judul: "OFFLINE", sebab: `Angka power meter tidak berubah selama ${detik} detik – kemungkinan power meter mati atau kabel RS-485 putus.` };
  if (s.startsWith("ALAT OFFLINE")) return { online: false, judul: "OFFLINE", sebab: "HMI melaporkan komunikasi ke power meter putus – cek power meter dan kabel RS-485." };
  if (s !== "OK") return { online: false, judul: "OFFLINE", sebab: "Status: " + s };
  return { online: true, judul: "ONLINE", sebab: "" };
}
function liveSegar() { return liveKondisi().online; }
function liveNilai(kunci) { const v = LIVE_DATA.d[kunci]; return liveSegar() && typeof v === "number" && isFinite(v) ? v : null; }
function liveStatusTeks() {
  if (typeof LIVE === "undefined" || !LIVE.aktif) return "Simulasi";
  const k = liveKondisi();
  return k.online ? "LIVE ● ONLINE" : k.menunggu ? "LIVE · MENGHUBUNGKAN…" : "LIVE ⚠ OFFLINE";
}

/* HTML panel power meter (dipanggil saat halaman Smart Manufacture dibuat) */
function livePanelHTML() {
  if (typeof LIVE === "undefined" || !LIVE.aktif) return "";
  return `<div class="panel live-panel" id="livePanel" style="margin-bottom:12px">
    <div class="panel-head"><div class="panel-title">⚡ ${LIVE.nama} – Data Asli (LIVE)</div><span class="badge" id="liveBadge">–</span></div>
    <div class="live-alarm" id="liveAlarm"></div>
    <div class="live-grid">${LIVE.titik.map(([k, label, sat]) => `<div class="live-item"><div class="label">${label}</div><div class="value"><span id="lv-${k}">–</span> <small>${sat}</small></div></div>`).join("")}</div>
    <div class="live-info" id="liveInfo">Menghubungkan ke broker…</div>
  </div>`;
}
/* dipanggil tiap 1 detik */
function liveUpdate() {
  if (typeof LIVE === "undefined" || !LIVE.aktif) return;
  const k = liveKondisi();
  const b = document.getElementById("btnIntegrasi");
  if (b) { b.textContent = "📍 Integrasi: " + liveStatusTeks(); b.classList.toggle("chip-offline", !k.online && !k.menunggu); b.classList.toggle("chip-online", k.online); }
  const panel = document.getElementById("livePanel"); if (!panel) return;
  LIVE.titik.forEach(([kk, , , dec]) => { const el = document.getElementById("lv-" + kk), v = LIVE_DATA.d[kk]; if (el) el.textContent = typeof v === "number" ? v.toLocaleString("id-ID", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : "–"; });
  panel.classList.toggle("basi", !k.online);
  const badge = document.getElementById("liveBadge");
  badge.textContent = k.online ? "● ONLINE" : k.menunggu ? "MENGHUBUNGKAN…" : "⚠ OFFLINE";
  badge.className = "badge " + (k.online ? "green" : k.menunggu ? "orange" : "red");
  const al = document.getElementById("liveAlarm");
  al.style.display = k.online || k.menunggu ? "none" : "block";
  al.innerHTML = `<b>⚠ OFFLINE</b><span>${k.sebab}</span>${LIVE_DATA.terima ? `<small>Angka di bawah adalah nilai terakhir, bukan nilai saat ini.</small>` : ""}`;
  const d = LIVE_DATA.d;
  document.getElementById("liveInfo").textContent = LIVE_DATA.terima
    ? `Data terakhir diterima ${new Date(LIVE_DATA.terima).toLocaleTimeString("id-ID")} · waktu HMI ${d.waktuAlat || (d.ts ? new Date(d.ts).toLocaleString("id-ID") : "-")} · status kurir: ${d.status || "-"}`
    : `${LIVE_DATA.status}${LIVE_DATA.err ? " – " + LIVE_DATA.err : ""}`;
}
