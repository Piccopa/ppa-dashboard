/* =========================================================
   APP.JS — NAVIGASI, HEADER, TOMBOL KONTROL, MODAL DETAIL
   ========================================================= */
(() => {
  const URUT = ["overview", "tanks", "viz", "contour", "inst", "equip", "trend", "alarm", "log", "report", "settings"];
  const P = HAL.P, C = CONFIG;
  let aktif = null, tick = 0, modalId = null;
  const dibuat = {};

  // batas alarm yang disimpan pengguna
  Object.assign(C.batas, SIM.bacaLS("batas", {}));
  SIM.mulai();

  /* ---------- menu kiri ---------- */
  $("#nav").innerHTML = URUT.map((k, i) => `<button class="nav-b" data-page="${k}"><span class="nav-i">${P[k].ikon}</span><span class="nav-t">${i + 1}. ${P[k].judul}</span><span class="nav-n" id="nb_${k}"></span></button>`).join("") +
    `<div class="nav-foot"><div>Data source: <b id="navSrc">SIMULATION</b></div><div class="muted">${C.silo.length} silo · ${INST.length * C.silo.length} instrumen · ${C.alat.length + C.alatSilo.length * C.silo.length} peralatan</div><div class="muted">Three.js r128 · Chart.js 4</div></div>`;
  $("#main").innerHTML = URUT.map((k) => `<section class="page" id="pg-${k}"></section>`).join("");

  function buka(k) {
    if (!P[k]) k = "overview";
    aktif = k;
    $$(".nav-b").forEach((b) => b.classList.toggle("on", b.dataset.page === k));
    $$(".page").forEach((p) => p.classList.toggle("on", p.id === "pg-" + k));
    const sec = $("#pg-" + k);
    if (!dibuat[k]) { sec.innerHTML = P[k].html(); dibuat[k] = true; }
    if (P[k].masuk) try { P[k].masuk(); } catch (e) { console.error(e); }
    Silo3D.jeda(!(k === "overview" || k === "viz"));
    if (k !== "contour") Permukaan3D.jeda(true); else if (HAL.kv === "3d") Permukaan3D.jeda(false);
    try { P[k].update(tick); } catch (e) { console.error(e); }
    document.body.classList.remove("nav-open");
    if (location.hash !== "#" + k) history.replaceState(null, "", "#" + k);
    window.scrollTo({ top: 0 });
  }
  function pilih(i) {
    HAL.sel = i; SIM.perintah.pilih(i); Silo3D.pilihSilo(i); Permukaan3D.silo(i);
    if (aktif === "contour") HAL.gambarKv();
    if (aktif === "trend" && GRAFIK.silo >= 0) { $("#trSilo").value = i; GRAFIK.trend(null, i); }
    if (aktif === "settings" && $("#rmSilo")) { $("#rmSilo").value = i; HAL.rmTabel(); }
  }

  /* ---------- header ---------- */
  $("#speed").value = SIM.S.speed;
  $("#speed").onchange = (e) => { SIM.perintah.kecepatan(+e.target.value); toast(`Kecepatan simulasi ${e.target.value}×`); };
  $("#menuBtn").onclick = () => document.body.classList.toggle("nav-open");
  $("#almBtn").onclick = () => buka("alarm");

  /* ---------- modal detail ---------- */
  function modal(id) {
    modalId = id; GRAFIK.bersih("mdlCh");
    $("#modal").innerHTML = `<div class="mdl-bg"></div><div class="mdl"><div class="mdl-h"><b id="mdlJ">–</b><span id="mdlS"></span><span class="simtag">SIMULATION</span><button class="btn kecil" data-tutup>✕</button></div>
      <div id="mdlIsi"></div><div id="mdlTr"><div class="sub-h kecil">Trend 1 h (10-second samples)</div><div class="chart" style="height:160px"><canvas id="mdlCh"></canvas></div></div>
      <div class="sub-h kecil">Alarm status</div><div class="alm-mini" id="mdlAl"></div>
      <div class="btns" id="mdlBtn"></div></div>`;
    $("#modal").classList.add("on");
    isiModal(true);
  }
  function isiModal(baru) {
    if (!modalId || !$("#modal").classList.contains("on")) { modalId = null; return; }
    const d = HAL.detail(modalId);
    set("mdlJ", d.judul); if ($("#mdlS").innerHTML !== d.status) $("#mdlS").innerHTML = d.status;
    const kv = `<table class="tbl kv">${d.baris.map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("")}</table>`;
    if ($("#mdlIsi").innerHTML !== kv) $("#mdlIsi").innerHTML = kv;
    const al = d.alarm.length ? d.alarm.map((a) => `<div class="am pri-b-${a.pri}"><b>${a.id}</b>${a.tag} – ${a.desk}<small>${a.pri} · ${a.state}</small></div>`).join("") : '<div class="am ok">✓ Tidak ada alarm aktif</div>';
    if ($("#mdlAl").innerHTML !== al) $("#mdlAl").innerHTML = al;
    if (baru) $("#mdlBtn").innerHTML = d.tombol;
    $("#mdlTr").style.display = d.tren ? "" : "none";
    if (d.tren && (baru || tick % 5 === 0)) GRAFIK.silo1("mdlCh", d.tren[3], d.tren[0], d.tren[1], d.tren[2]);
  }
  Silo3D.setPilih((k) => { if (k.startsWith("SILO:")) pilih(+k.split(":")[1]); modal(k); });

  /* ---------- semua klik (event delegation) ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-page],[data-pg],[data-silo],[data-cam],[data-shell],[data-warna],[data-tog],[data-fs],[data-kv],[data-kt],[data-kcam],[data-cloud],[data-scan],[data-detail],[data-kontur],[data-thumb],[data-ctl],[data-filter],[data-afil],[data-ack],[data-ackall],[data-fault],[data-uji],[data-pulih],[data-alat],[data-isi],[data-keluar],[data-logtab],[data-logpg],[data-ekspor],[data-cetak],[data-lg],[data-rpjenis],[data-rp],[data-set],[data-kom],[data-rm],[data-json],[data-resetsim],[data-tutup],[data-buka],.mdl-bg");
    if (!t || t.disabled) return;
    const ds = t.dataset, S = SIM.perintah;
    if (t.classList.contains("mdl-bg") || ds.tutup !== undefined) { $("#modal").classList.remove("on"); modalId = null; }
    if (ds.pilih !== undefined) pilih(+ds.pilih);
    if (ds.page) return buka(ds.page);
    if (ds.pg) { buka(ds.pg); if (ds.logtab) LOGGER.tab(ds.logtab); return; }
    if (ds.buka) return modal(ds.buka);
    if (ds.silo !== undefined) { pilih(+ds.silo); }
    if (ds.detail !== undefined) { $("#modal").classList.remove("on"); modalId = null; pilih(+ds.detail); buka("viz"); Silo3D.ke("Isometric"); return; }
    if (ds.kontur !== undefined) { $("#modal").classList.remove("on"); modalId = null; pilih(+ds.kontur); buka("contour"); return; }
    if (ds.cam) Silo3D.ke(ds.cam);
    if (ds.shell !== undefined) Silo3D.setTransparan(ds.shell === "1");
    if (ds.warna) Silo3D.setKontur(ds.warna === "kontur");
    if (ds.tog) {
      t.classList.toggle("on"); const on = t.classList.contains("on");
      if (ds.tog === "label") Silo3D.setLabel(on); if (ds.tog === "pin") Silo3D.setPin(on); if (ds.tog === "aliran") Silo3D.setAliran(on); if (ds.tog === "rotate") Silo3D.orbit.auto = on;
    }
    if (ds.fs) { const el = $(ds.fs); if (document.fullscreenElement) document.exitFullscreen(); else if (el && el.requestFullscreen) el.requestFullscreen().then(() => setTimeout(Silo3D.ukuran, 200)); }
    if (ds.kv) { HAL.kv = ds.kv; HAL.tampilKv(); }
    if (ds.kt) { t.classList.toggle("on"); const on = t.classList.contains("on"); if (ds.kt === "garis") Permukaan3D.garis(on); else Permukaan3D.titik(on); }
    if (ds.kcam) Permukaan3D.ke(ds.kcam);
    if (ds.cloud === "contoh") { unduh(`pointcloud_${C.silo[HAL.sel][0]}_contoh.csv`, KONTUR.contohCloud(SIM.Z[HAL.sel]), "text/csv"); toast("Contoh point cloud diunduh (dibuat dari permukaan SIMULATION)"); }
    if (ds.cloud === "sim") { S.hapusCloud(HAL.sel); Permukaan3D.segarkan(); toast("Sumber kontur kembali ke SIMULATION"); }
    if (ds.scan !== undefined) { const r = S.scanSekarang(ds.scan ? +ds.scan : HAL.sel); toast(r || "3D scan dimulai"); }
    if (ds.thumb !== undefined) { HAL.foto(); toast("Thumbnail 3D diperbarui"); }
    if (ds.ctl) kontrol(ds.ctl);
    if (ds.filter) { if (ds.filter === "custom") { const a = Date.parse($("#trA").value), b = Date.parse($("#trB").value); if (!a || !b || b <= a) return toast("Isi tanggal From dan To dengan benar"); GRAFIK.custom(a, b); } else GRAFIK.trend(ds.filter); }
    if (ds.afil) HAL.filterAlm = ds.afil;
    if (ds.ack) ALARM.ack(ds.ack);
    if (ds.ackall !== undefined) { ALARM.ackSemua(); toast("Semua alarm di-acknowledge"); }
    if (ds.fault) { S.gangguan(ds.fault, HAL.sel); toast("Gangguan disimulasikan: " + t.textContent.replace(/^[◉⚙]\s*/, "")); }
    if (ds.uji) { if (!confirm(`TEST: ubah isi ${C.silo[HAL.sel][0]} menjadi ${ds.uji} % ?\n(Hanya simulasi untuk menguji alarm level.)`)) return; S.ujiLevel(HAL.sel, +ds.uji); toast(`${C.silo[HAL.sel][0]} → ${ds.uji} % (TEST)`); }
    if (ds.pulih !== undefined) { S.pulihkan(); toast("Semua gangguan dipulihkan"); }
    if (ds.alat && ds.aksi) {
      const i = ds.si !== undefined ? +ds.si : undefined;
      if (ds.aksi === "stop" && !confirm(`STOP ${ds.alat}${i !== undefined ? " " + C.silo[i][0] : ""}?`)) return;
      const r = S.alat(ds.alat, ds.aksi, i); toast(r || `${ds.alat}${i !== undefined ? " " + C.silo[i][0] : ""} → ${ds.aksi.toUpperCase()}`);
    }
    if (ds.isi !== undefined) { const r = S.isi(+ds.isi, ds.on === "1"); toast(r || `${C.silo[+ds.isi][0]} filling ${ds.on === "1" ? "START" : "STOP"}`); }
    if (ds.keluar !== undefined) { const r = S.keluar(+ds.keluar, ds.on === "1"); toast(r || `${C.silo[+ds.keluar][0]} discharge ${ds.on === "1" ? "START" : "STOP"}`); }
    if (ds.logtab && !ds.pg) LOGGER.tab(ds.logtab);
    if (ds.logpg) LOGGER.geser(+ds.logpg);
    if (ds.ekspor) LOGGER.ekspor(ds.ekspor);
    if (ds.cetak) LOGGER.cetak();
    if (ds.lg === "terap") LOGGER.filter({ cari: $("#lgCari").value, silo: +$("#lgSilo").value, st: $("#lgSt").value, dari: Date.parse($("#lgA").value) || null, sampai: Date.parse($("#lgB").value) || null });
    if (ds.lg === "reset") { $("#lgCari").value = ""; $("#lgSilo").value = -1; $("#lgSt").value = "all"; $("#lgA").value = $("#lgB").value = ""; LOGGER.filter({ cari: "", silo: -1, st: "all", dari: null, sampai: null }); }
    if (ds.rpjenis) LAPORAN.set({ jenis: ds.rpjenis });
    if (ds.rp === "buat") LAPORAN.set({ tgl: Date.parse($("#rpTgl").value + "T12:00") || null, a: Date.parse($("#rpA").value) || null, b: Date.parse($("#rpB").value) || null });
    if (ds.rp === "cetak") LAPORAN.cetak(); if (ds.rp === "xls" || ds.rp === "csv") LAPORAN.ekspor(ds.rp);
    if (ds.set === "simpan") { const b = {}; $$("[data-batas]").forEach((el) => { const v = parseFloat(el.value); if (isFinite(v)) b[el.dataset.batas] = v; }); Object.assign(C.batas, b); SIM.simpanLS("batas", b); ALARM.catat("SETTINGS", "Alarm limits updated"); toast("Batas alarm disimpan"); }
    if (ds.set === "default") { SIM.simpanLS("batas", {}); location.reload(); }
    if (ds.kom) { KOMUNIKASI.simpan({ mode: $("#kmMode").value, gateway: $("#kmGw").value, modbusTCP: { ...KOMUNIKASI.K.modbusTCP, ip: $("#kmIp").value, port: +$("#kmPort").value, unitId: +$("#kmUid").value }, modbusRTU: { ...KOMUNIKASI.K.modbusRTU, port: $("#kmCom").value, baud: +$("#kmBaud").value, format: $("#kmFmt").value }, opcua: { ...KOMUNIKASI.K.opcua, endpoint: $("#kmOpc").value }, mqtt: { ...KOMUNIKASI.K.mqtt, broker: $("#kmMq").value, topik: $("#kmTp").value } }).then((s) => { set("kmSt", s.teks); $("#kmSt").className = "note " + (s.ok ? "" : "warn"); toast(s.ok ? "Komunikasi: OK" : "Gateway belum terhubung – tetap SIMULATION"); }); set("kmSt", "Menguji koneksi…"); }
    if (ds.rm === "csv") { const L = KOMUNIKASI.petaRegister(); eksporCSV("Haiwell_register_map_coal_silo", ["Silo", "Point", "Description", "Type", "Haiwell", "Modbus 0-based", "Modbus 1-based", "Function code", "Unit"], L.map((r) => [r.silo, r.kode, r.nama, r.tipe, r.V, r.mb0, r.mb1, r.fc, r.sat])); }
    if (ds.json !== undefined) $("#kmJson").textContent = KOMUNIKASI.contohJSON();
    if (ds.resetsim !== undefined && confirm("Hapus semua histori, alarm & mulai ulang simulasi?")) { ALARM.hapus(); S.hapusHistori(); toast("Histori dihapus – simulasi dimulai ulang"); }
    perbarui();
  });
  /* ---------- input (slider, select, file) ---------- */
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.skala !== undefined) { Permukaan3D.skala(+el.value); set("ktSk", el.value); }
    if (el.dataset.sudut !== undefined) { HAL.sudut = +el.value; set("ktSd", el.value + "°"); HAL.gambarKv(); }
    if (el.dataset.laju !== undefined) { SIM.perintah.laju(+el.dataset.laju, +el.value); set("mQ" + el.dataset.laju, el.value); }
    if (el.id === "lgCari") LOGGER.filter({ cari: el.value });
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.id === "trSilo") { const i = +el.value; if (i >= 0) pilih(i); GRAFIK.trend(null, i); }
    if (el.id === "rmSilo") HAL.rmTabel();
    if (el.dataset.speed2 !== undefined) { SIM.perintah.kecepatan(+el.value); $("#speed").value = el.value; }
    if (el.id === "ktFile" && el.files[0]) {
      const r = new FileReader();
      r.onload = () => { try { const titik = KONTUR.parseCloud(String(r.result)); SIM.perintah.imporCloud(HAL.sel, titik); Permukaan3D.segarkan(); HAL.gambarKv(); toast(`Point cloud diimpor: ${titik.length} titik → ${C.silo[HAL.sel][0]}`); } catch (err) { alert("Gagal membaca point cloud:\n" + err.message); } el.value = ""; };
      r.readAsText(el.files[0]);
    }
  });

  /* ---------- tombol kontrol simulasi ---------- */
  function kontrol(k) {
    const S = SIM.perintah;
    if (k === "start") { S.mulai(); toast("SIMULATION STARTED"); }
    if (k === "stop") { S.berhenti(); toast("SIMULATION STOPPED – data dibekukan"); }
    if (k === "reset" && confirm("RESET simulasi ke data contoh awal?\n(SILO-01 = 623,2 t; histori tetap tersimpan)")) { S.reset(); toast("Simulasi di-reset ke data contoh"); }
    if (k === "auto") { S.mode(true); toast("AUTO MODE"); }
    if (k === "manual") { S.mode(false); toast("MANUAL MODE – operator mengendalikan filling / discharge"); }
  }

  /* ---------- header & banner ---------- */
  ALARM.dengar((a) => { if (a.pri === "CRITICAL") toast(`🔴 ${a.tag}: ${a.desk}`); });
  function header() {
    const SS = SIM.S;
    set("simJam", jamStr(SS.t)); set("simTgl", `${HARI[new Date(SS.t).getDay()]}, ${tglStr(SS.t)}`); set("realJam", jamStr(Date.now()));
    const h = ALARM.hitung();
    set("ac_crit", h.CRITICAL); set("ac_high", h.HIGH); set("ac_med", h.MEDIUM + h.LOW);
    $("#almBtn").classList.toggle("bunyi", h.unack > 0 && h.CRITICAL > 0);
    set("nb_alarm", h.total || "");
    $$("[data-ctl]").forEach((b) => b.classList.toggle("on", (b.dataset.ctl === "start" && SS.jalan) || (b.dataset.ctl === "stop" && !SS.jalan) || (b.dataset.ctl === "auto" && SS.auto) || (b.dataset.ctl === "manual" && !SS.auto)));
    set("hdrRun", SS.jalan ? "RUNNING" : "STOPPED", "run-pill " + (SS.jalan ? "on" : "off"));
    set("navSrc", KOMUNIKASI.K.mode === "SIMULATION" ? "SIMULATION" : KOMUNIKASI.K.mode + " (SIM)");
    const a = ALARM.aktif.find((x) => !x.tAck) || ALARM.aktif[0], ban = $("#banner");
    const inv = SS.silo.reduce((s, x) => s + x.v.berat, 0);
    ban.className = "alm-banner " + (a ? "p-" + a.pri : "normal");
    const isi = a ? `<b>${a.pri}</b> ${a.id} · ${waktuStr(a.tOn)} · <span class="tag">${a.tag}</span> ${a.eq} – ${a.desk} · <i>${a.val}</i> · ${a.state} <button class="btn kecil" data-pg="alarm">View</button>`
      : `<b>✓ NORMAL</b> Semua silo normal · Inventory ${fmt(inv, 1)} t · Mode ${SS.auto ? "AUTO" : "MANUAL"} · <span class="muted">Semua nilai adalah SIMULATION</span>`;
    if (ban.dataset.h !== isi) { ban.innerHTML = isi; ban.dataset.h = isi; }
  }
  function perbarui() {
    header();
    if (aktif && P[aktif]) try { P[aktif].update(tick); } catch (e) { console.error(e); }
    if (modalId) try { isiModal(false); } catch (e) { console.error(e); }
  }
  SIM.dengar((e) => { if (e.jenis === "tick") { tick++; perbarui(); } });

  /* ---------- pesan dari halaman induk (dashboard MITMAG) ---------- */
  window.addEventListener("message", (e) => {
    if (e.data === "pause") { Silo3D.jeda(true); Permukaan3D.jeda(true); }
    if (e.data === "resume") { Silo3D.jeda(!(aktif === "overview" || aktif === "viz")); if (aktif === "contour" && HAL.kv === "3d") Permukaan3D.jeda(false); }
  });
  document.addEventListener("fullscreenchange", () => setTimeout(() => { Silo3D.ukuran(); Permukaan3D.ukuran(); }, 150));

  buka((location.hash || "#overview").slice(1));
  perbarui();
})();
