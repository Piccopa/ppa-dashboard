/* =========================================================
   APP.JS — NAVIGASI, HEADER, TOMBOL, MODAL PERALATAN
   ========================================================= */
(() => {
  const URUT = ["overview", "viz", "cdu", "vdu", "hdt", "ref", "fcc", "tank", "rot", "boil", "cw", "util", "elec", "env", "trend", "alarm", "log"];
  const P = HAL.P;
  let aktif = null, tick = 0, modalId = null;
  const dibuat = {};

  SIM.mulai();

  // ---------- menu kiri ----------
  $("#nav").innerHTML = URUT.map((k, i) => `<button class="nav-b" data-page="${k}"><span class="nav-i">${P[k].ikon}</span><span class="nav-t">${i + 1}. ${P[k].judul}</span><span class="nav-n" id="nb_${k}"></span></button>`).join("") +
    `<div class="nav-foot"><div>Data source: <b>${CONFIG.sumberData}</b></div><div class="muted">${TAGS.length} tag instrumen · Three.js · Chart.js</div></div>`;
  $("#main").innerHTML = URUT.map((k) => `<section class="page" id="pg-${k}"></section>`).join("");

  function buka(k) {
    if (!P[k]) k = "overview";
    aktif = k;
    $$(".nav-b").forEach((b) => b.classList.toggle("on", b.dataset.page === k));
    $$(".page").forEach((p) => p.classList.toggle("on", p.id === "pg-" + k));
    const sec = $("#pg-" + k);
    if (!dibuat[k]) { sec.innerHTML = P[k].html(); dibuat[k] = true; }
    if (P[k].masuk) P[k].masuk();
    Kilang3D.jeda(!(k === "overview" || k === "viz"));
    try { P[k].update(tick); } catch (e) { console.error(e); }
    document.body.classList.remove("nav-open");
    if (location.hash !== "#" + k) history.replaceState(null, "", "#" + k);
    window.scrollTo({ top: 0 });
  }

  // ---------- header ----------
  $("#speed").value = SIM.S.speed;
  $("#speed").onchange = (e) => { SIM.perintah.kecepatan(+e.target.value); toast(`Kecepatan simulasi ${e.target.value}×`); };
  $("#menuBtn").onclick = () => document.body.classList.toggle("nav-open");
  $("#almBtn").onclick = () => buka("alarm");

  // ---------- modal detail peralatan ----------
  function modal(id) {
    modalId = id; GRAFIK.bersih("mdlCh");
    $("#modal").innerHTML = `<div class="mdl-bg"></div><div class="mdl"><div class="mdl-h"><b id="mdlJ">–</b><span id="mdlS"></span><span class="simtag">SIMULATION</span><button class="btn kecil" data-tutup>✕</button></div>
      <div id="mdlIsi"></div><div class="grp-h">Historical trend (4 h, 1-minute)</div><div class="chart" style="height:170px"><canvas id="mdlCh"></canvas></div>
      <div class="grp-h">Alarm status</div><div class="alm-mini" id="mdlAl"></div>
      <div class="btns"><span id="mdlBtn"></span><button class="btn g" id="mdlPg" data-tutup>Buka halaman ›</button></div></div>`;
    $("#modal").classList.add("on");
    isiModal(true);
  }
  function isiModal(baru) {
    if (!modalId || !$("#modal").classList.contains("on")) { modalId = null; return; }
    const d = HAL.detail(modalId);
    set("mdlJ", d.judul); $("#mdlS").innerHTML = d.status; $("#mdlPg").dataset.pg = d.hal;
    const kv = d.baris.length ? `<table class="tbl kv">${d.baris.map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("")}</table>` : "";
    if (baru || $("#mdlIsi").dataset.n !== String(d.tags.length + "|" + d.baris.length)) { $("#mdlIsi").innerHTML = kv + (d.tags.length ? HAL.tabelTag(d.tags) : ""); $("#mdlIsi").dataset.n = d.tags.length + "|" + d.baris.length; }
    else if (d.baris.length) { const t = $("#mdlIsi .tbl.kv"); if (t) t.outerHTML = kv; }
    HAL.isiTag(d.tags);
    if ($("#mdlBtn").innerHTML !== d.tombol) $("#mdlBtn").innerHTML = d.tombol;
    if ($("#mdlAl").innerHTML !== d.alarm) $("#mdlAl").innerHTML = d.alarm;
    if (d.tren.length && (baru || tick % 3 === 0)) GRAFIK.tagTren("mdlCh", d.tren);
  }
  Kilang3D.setPilih(modal);

  // ---------- semua klik (event delegation) ----------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-page],[data-pg],[data-cam],[data-tog],[data-feed],[data-pompa],[data-komp],[data-tk],[data-tkmode],[data-tkpilih],[data-tkauto],[data-fcc],[data-sru],[data-blr],[data-unit],[data-filter],[data-afil],[data-ack],[data-ackall],[data-fault],[data-pulih],[data-logtab],[data-logpg],[data-ekspor],[data-resetsim],[data-tutup],[data-buka],[data-pipareset],.mdl-bg");
    if (!t) return;
    const ds = t.dataset, S = SIM.perintah;
    if (t.classList.contains("mdl-bg") || ds.tutup !== undefined) { $("#modal").classList.remove("on"); modalId = null; }
    if (ds.page) return buka(ds.page);
    if (ds.pg) { buka(ds.pg); if (ds.logtab) LOGGER.tab(ds.logtab); return; }
    if (ds.buka) return modal(ds.buka);
    if (ds.cam) { Kilang3D.ke(ds.cam); return; }
    if (ds.tog) {
      t.classList.toggle("on"); const on = t.classList.contains("on");
      if (ds.tog === "label") Kilang3D.setLabel(on); if (ds.tog === "tank") Kilang3D.setTangki(on); if (ds.tog === "aliran") Kilang3D.setAliran(on); if (ds.tog === "rotate") Kilang3D.orbit.auto = on; return;
    }
    if (ds.feed) {
      const inp = $("#feedSP"); let v = +inp.value || SIM.S.feedSP;
      if (ds.feed !== "set") { v = Math.max(0, v + +ds.feed); inp.value = v; return; }
      if (!confirm(`Ubah setpoint umpan crude FIC-101 menjadi ${v} m³/h?\n\nIni simulasi – tidak memengaruhi kilang nyata.`)) return;
      S.feed(v); toast(`Setpoint umpan → ${SIM.S.feedSP} m³/h`);
    }
    if (ds.pompa && ds.aksi) { if (ds.aksi === "stop" && !confirm(`STOP pompa ${ds.pompa}?`)) return; const r = S.pompa(ds.pompa, ds.aksi); toast(r || `${ds.pompa}: ${ds.aksi.toUpperCase()}`); }
    if (ds.komp && ds.aksi) { if (ds.aksi === "stop" && !confirm(`STOP kompresor ${ds.komp}?\nUnit terkait dapat shutdown (interlock).`)) return; const r = S.komp(ds.komp, ds.aksi); toast(r || `${ds.komp}: ${ds.aksi.toUpperCase()}`); }
    if (ds.tk !== undefined && ds.mode) { S.tangki(+ds.tk, ds.mode); toast(`${CONFIG.tangki[+ds.tk][0]} → ${ds.mode}`); }
    if (ds.tkmode) { const i = HAL.tkPilih; S.tangki(i, ds.tkmode); toast(`${CONFIG.tangki[i][0]} → ${ds.tkmode}`); }
    if (ds.tkpilih !== undefined) HAL.tkPilih = +ds.tkpilih;
    if (ds.tkauto !== undefined) { S.tankAuto(ds.tkauto === "1"); toast(`Tank auto-switching ${ds.tkauto === "1" ? "AUTO" : "MANUAL"}`); }
    if (ds.fcc !== undefined) { S.fcc(ds.fcc === "1"); toast(ds.fcc === "1" ? "FCC in service" : "FCC dinonaktifkan – VGO ke fuel oil"); }
    if (ds.sru !== undefined) { S.sru(ds.sru === "1"); toast(ds.sru === "1" ? "SRU in service" : "SRU out of service"); }
    if (ds.blr !== undefined && ds.on !== undefined) { if (ds.on === "0" && !confirm(`Shutdown boiler B-601${"AB"[+ds.blr]}?`)) return; S.boiler(+ds.blr, ds.on === "1"); toast(`Boiler ${"AB"[+ds.blr]} ${ds.on === "1" ? "in service" : "shutdown"}`); }
    if (ds.unit && ds.on !== undefined) { S.unit(ds.unit, ds.on === "1"); toast(`${ds.unit} ${ds.on === "1" ? "start-up" : "shutdown"}`); }
    if (ds.filter) GRAFIK.trend(ds.filter);
    if (ds.afil) HAL.filterAlm = ds.afil;
    if (ds.ack) ALARM.ack(ds.ack);
    if (ds.ackall !== undefined) { ALARM.ackSemua(); toast("Semua alarm di-acknowledge"); }
    if (ds.fault) { S.gangguan(ds.fault); toast("Gangguan disimulasikan: " + t.textContent.trim()); }
    if (ds.pulih !== undefined) { S.pulihkan(); toast("Semua gangguan dipulihkan"); }
    if (ds.logtab && !ds.pg) LOGGER.tab(ds.logtab);
    if (ds.logpg) LOGGER.geser(+ds.logpg);
    if (ds.ekspor) LOGGER.ekspor(ds.ekspor);
    if (ds.pipareset !== undefined) { Kilang3D.resetWarnaPipa(); $$("[data-pipa]").forEach((el) => (el.value = CONFIG.pipa[el.dataset.pipa][1])); toast("Warna pipa kembali ke default"); }
    if (ds.resetsim !== undefined && confirm("Hapus semua histori & mulai ulang simulasi?")) S.resetSemua();
    perbarui();
  });
  // legenda warna pipa
  document.addEventListener("input", (e) => { const el = e.target.closest("[data-pipa]"); if (el) Kilang3D.warnaPipa(el.dataset.pipa, el.value); });

  // ---------- header & banner ----------
  ALARM.dengar((a) => { if (a.sev === "CRIT") toast(`🔴 ${a.tag}: ${a.desk}`); });
  function header() {
    const V = SIM.V;
    set("simJam", jamStr(V.t)); set("simTgl", `${HARI[new Date(V.t).getDay()]}, ${tglStr(V.t)}`); set("realJam", jamStr(Date.now()));
    const h = ALARM.hitung();
    set("ac_crit", h.CRIT); set("ac_warn", h.WARN); set("ac_comm", h.COMM);
    $("#almBtn").classList.toggle("bunyi", h.unack > 0 && h.CRIT > 0);
    set("nb_alarm", h.total || "");
    set("hdrMode", `${fmt(V.bpd)} BPD · ${fmt(V.kapasitas, 1)} %`);
    const a = ALARM.aktif.find((x) => !x.tAck) || ALARM.aktif[0], ban = $("#banner");
    ban.className = "alm-banner " + (a ? "sev-" + a.sev : "normal");
    ban.innerHTML = a ? `<b>${a.sev === "CRIT" ? "CRITICAL" : a.sev === "WARN" ? "WARNING" : "COMM FAILURE"}</b> ${waktuStr(a.tOn)} · <span class="tag">${a.tag}</span> ${a.desk} · ${a.tAck ? "ACK" : "UNACK"} <button class="btn kecil" data-pg="alarm">Lihat</button>`
      : `<b>✓ NORMAL</b> Kilang beroperasi normal · Feed ${fmt(V.F)} m³/h · Produk ${fmt(V.prodT, 1)} t/h · Flare ${fmt(V.flare)} Nm³/h · <span class="muted">Semua nilai adalah SIMULATION</span>`;
  }
  function perbarui() {
    header();
    if (aktif && P[aktif]) try { P[aktif].update(tick); } catch (e) { console.error(e); }
    if (modalId) try { isiModal(false); } catch (e) { console.error(e); }
  }
  SIM.dengar((e) => { if (e.jenis === "tick") { tick++; perbarui(); } });

  // ---------- pesan dari halaman induk (dashboard MITMAG) ----------
  window.addEventListener("message", (e) => {
    if (e.data === "pause") Kilang3D.jeda(true);
    if (e.data === "resume") Kilang3D.jeda(!(aktif === "overview" || aktif === "viz"));
  });

  buka((location.hash || "#overview").slice(1));
  perbarui();
})();
