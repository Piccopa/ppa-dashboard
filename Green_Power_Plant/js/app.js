/* =========================================================
   APP.JS — NAVIGASI, HEADER, TOMBOL, DAN LOOP TAMPILAN
   ========================================================= */
(() => {
  const URUT = ["overview", "viz", "pv", "inv", "bess", "dg", "fuel", "dist", "fac", "res", "energy", "env", "trend", "alarm", "log"];
  const P = HAL.P;
  let aktif = null, tick = 0;
  const dibuat = {};

  // ---------- mulai simulasi ----------
  SIM.mulai();

  // ---------- menu kiri ----------
  $("#nav").innerHTML = URUT.map((k, i) => `<button class="nav-b" data-page="${k}"><span class="nav-i">${P[k].ikon}</span><span class="nav-t">${i + 1}. ${P[k].judul}</span><span class="nav-n" id="nb_${k}"></span></button>`).join("") +
    `<div class="nav-foot"><div>Data source: <b>${CONFIG.sumberData}</b></div><div class="muted">Three.js · Chart.js · localStorage</div></div>`;
  $("#main").innerHTML = URUT.map((k) => `<section class="page" id="pg-${k}"></section>`).join("");

  function buka(k) {
    if (!P[k]) k = "overview";
    aktif = k;
    $$(".nav-b").forEach((b) => b.classList.toggle("on", b.dataset.page === k));
    $$(".page").forEach((p) => p.classList.toggle("on", p.id === "pg-" + k));
    const sec = $("#pg-" + k);
    if (!dibuat[k]) { sec.innerHTML = P[k].html(); dibuat[k] = true; }
    if (P[k].masuk) P[k].masuk();
    Kampus3D.jeda(!(k === "overview" || k === "viz"));
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

  // ---------- modal detail peralatan (klik di 3D) ----------
  function modal(kunci) {
    const d = HAL.detail(kunci);
    $("#modal").innerHTML = `<div class="mdl-bg"></div><div class="mdl"><div class="mdl-h"><b>${d.judul}</b><span class="simtag">SIMULATION</span><button class="btn kecil" data-tutup>✕</button></div>
      <table class="tbl kv">${d.baris.map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("")}</table>
      <div class="btns">${d.cb ? `<button class="btn" data-cbtog="${d.cb}">${SIM.V.cb[d.cb] === "CLOSED" ? "Open" : "Close"} CB-${d.cb}</button>` : ""}<button class="btn g" data-pg="${d.hal}" data-tutup>Buka halaman ›</button></div></div>`;
    $("#modal").classList.add("on");
  }
  Kampus3D.setPilih(modal);

  // ---------- semua klik tombol (event delegation) ----------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-page],[data-pg],[data-cam],[data-tog],[data-inv],[data-bmode],[data-dgmode],[data-dgreset],[data-refuel],[data-cbtog],[data-ems],[data-eper],[data-blok],[data-filter],[data-afil],[data-ack],[data-ackall],[data-fault],[data-pulih],[data-logtab],[data-logpg],[data-ekspor],[data-resetsim],[data-tutup],[data-buka],.mdl-bg");
    if (!t) return;
    const ds = t.dataset, S = SIM.perintah;
    if (t.classList.contains("mdl-bg") || ds.tutup !== undefined) $("#modal").classList.remove("on");
    if (ds.page) return buka(ds.page);
    if (ds.pg) { buka(ds.pg); if (ds.logtab) LOGGER.tab(ds.logtab); return; }
    if (ds.buka) { if (["pv", "inv", "bess", "dg", "fac", "res", "dist"].includes(ds.buka)) return buka(ds.buka); return modal(ds.buka); }
    if (ds.cam) { Kampus3D.ke(ds.cam); return; }
    if (ds.tog) {
      t.classList.toggle("on"); const on = t.classList.contains("on");
      if (ds.tog === "label") Kampus3D.setLabel(on); if (ds.tog === "aliran") Kampus3D.setAliran(on); if (ds.tog === "rotate") Kampus3D.orbit.auto = on; return;
    }
    if (ds.inv && ds.aksi) { S.inverter(+ds.inv, ds.aksi); toast(`INV-0${+ds.inv + 1}: ${ds.aksi.toUpperCase()}`); }
    if (ds.bmode) { S.bessMode(ds.bmode); toast("Mode BESS → " + ds.bmode); }
    if (ds.dgmode) { S.dgMode(ds.dgmode); toast("Mode genset → " + ds.dgmode); }
    if (ds.dgreset !== undefined) { S.dgReset(); toast("Fault genset di-reset"); }
    if (ds.refuel !== undefined) { S.isiBBM(20000); toast("Penerimaan BBM dicatat (SIMULATION)"); }
    if (ds.cbtog) {
      const k = ds.cbtog, buka2 = SIM.V.cb[k] === "CLOSED";
      if (!confirm(`${buka2 ? "BUKA (open)" : "TUTUP (close)"} breaker CB-${k}?\n\nIni simulasi – tidak memengaruhi peralatan nyata.`)) return;
      const r = S.breaker(k, buka2); toast(r || `CB-${k} ${buka2 ? "OPEN" : "CLOSED"}`); $("#modal").classList.remove("on");
    }
    if (ds.ems) { S.modeEMS(ds.ems); toast("Mode EMS → " + (ds.ems === "GREEN" ? "Green priority" : "Grid backup")); }
    if (ds.eper) HAL.periodeE = ds.eper;
    if (ds.blok !== undefined && ds.blok !== "") HAL.blok = +ds.blok;
    if (ds.filter) GRAFIK.trend(ds.filter);
    if (ds.afil) HAL.filterAlm = ds.afil;
    if (ds.ack) ALARM.ack(ds.ack);
    if (ds.ackall !== undefined) { ALARM.ackSemua(); toast("Semua alarm di-acknowledge"); }
    if (ds.fault) { S.gangguan(ds.fault); toast("Gangguan disimulasikan: " + t.textContent.trim()); }
    if (ds.pulih !== undefined) { S.pulihkan(); toast("Semua gangguan dipulihkan"); }
    if (ds.logtab && !ds.pg) LOGGER.tab(ds.logtab);
    if (ds.logpg) LOGGER.geser(+ds.logpg);
    if (ds.ekspor) LOGGER.ekspor(ds.ekspor);
    if (ds.resetsim !== undefined && confirm("Hapus semua histori & mulai ulang simulasi?")) S.resetSemua();
    perbarui();
  });

  // ---------- banner alarm & header ----------
  ALARM.dengar((a) => { if (a.sev === "CRIT") toast(`🔴 ${a.tag}: ${a.desk}`); });
  function header() {
    const V = SIM.V;
    set("simJam", jamStr(V.t)); set("simTgl", `${HARI[new Date(V.t).getDay()]}, ${tglStr(V.t)}`);
    set("realJam", jamStr(Date.now()));
    const h = ALARM.hitung();
    set("ac_crit", h.CRIT); set("ac_warn", h.WARN); set("ac_comm", h.COMM);
    $("#almBtn").classList.toggle("bunyi", h.unack > 0 && h.CRIT > 0);
    set("nb_alarm", h.CRIT + h.WARN + h.COMM || "");
    const a = ALARM.aktif.find((x) => !x.tAck) || ALARM.aktif[0];
    const ban = $("#banner");
    ban.className = "alm-banner " + (a ? "sev-" + a.sev : "normal");
    ban.innerHTML = a ? `<b>${a.sev === "CRIT" ? "CRITICAL" : a.sev === "WARN" ? "WARNING" : "COMM LOSS"}</b> ${waktuStr(a.tOn)} · <span class="tag">${a.tag}</span> ${a.desk} · ${a.tAck ? "ACK" : "UNACK"} <button class="btn kecil" data-pg="alarm">Lihat</button>`
      : `<b>✓ NORMAL</b> Semua sistem beroperasi normal · Solar ${fmt(V.pvAC)} kW · Beban ${fmt(V.load)} kW · RE ${fmt(V.re)} % · <span class="muted">Semua nilai adalah SIMULATION</span>`;
    set("hdrMode", V.mode === "GREEN" ? "EMS: GREEN PRIORITY" : "EMS: GRID BACKUP");
  }
  function perbarui() {
    header();
    if (aktif && P[aktif]) try { P[aktif].update(tick); } catch (e) { console.error(e); }
  }
  SIM.dengar((e) => { if (e.jenis === "tick") { tick++; perbarui(); } });

  // ---------- pesan dari halaman induk (dashboard MITMAG) ----------
  window.addEventListener("message", (e) => {
    if (e.data === "pause") Kampus3D.jeda(true);
    if (e.data === "resume") Kampus3D.jeda(!(aktif === "overview" || aktif === "viz"));
  });

  buka((location.hash || "#overview").slice(1));
  perbarui();
})();
