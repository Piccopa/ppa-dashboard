/* =========================================================
   PAGES.JS — 11 HALAMAN DASHBOARD
   1 Dashboard Overview · 2 Tank Overview · 3 3D Tank Visualization ·
   4 Material Contour Mapping · 5 Instrument Monitoring · 6 Equipment Monitoring ·
   7 Trend & History · 8 Alarm & Event · 9 Data Logger · 10 Report · 11 System Settings
   ========================================================= */
const HAL = (() => {
  const C = CONFIG, G = C.geo, NS = C.silo.length;
  let sel = 0, kv = "3d", sudutPotong = 0, filterAlm = "aktif", thumbT = 0;
  const S = () => SIM.S, sv = (i = sel) => SIM.S.silo[i], V = (i = sel) => SIM.S.silo[i].v;
  const STN = { RUN: "RUNNING", STOP: "STOPPED", FAULT: "FAULT", MAINT: "MAINTENANCE" };
  const STC = { RUN: "st-green", STOP: "st-grey2", FAULT: "st-red", MAINT: "st-amber" };
  const WST = { green: "st-green", yellow: "st-yellow", red: "st-red", grey: "st-grey" };

  /* ---------------- komponen kecil ---------------- */
  const kpi = (id, l, u = "", cls = "", s = "") => `<div class="kpi ${cls}"><div class="kpi-l">${l}</div><div class="kpi-v"><b id="${id}">–</b><span>${u}</span></div>${s ? `<div class="kpi-s" id="${id}_s">${s}</div>` : ""}</div>`;
  const siloTabs = () => `<div class="silo-tabs">${C.silo.map((k, i) => `<button class="stab" data-silo="${i}"><i class="dot" data-sdot="${i}"></i>${k[0]}<small data-spct="${i}">–</small></button>`).join("")}</div>`;
  const pg = (judul, sub, kanan = "") => `<div class="pg-h"><div><h2>${judul}</h2><p>${sub}</p></div><div class="pg-hr">${kanan}<span class="simtag">SIMULATION</span></div></div>`;
  const legenda = (id = "") => `<div class="legend"><span>LOW</span><i class="ramp"></i><span>HIGH</span></div><div class="legend-l"><span>BLUE</span><span>CYAN</span><span>GREEN</span><span>YELLOW</span><span>ORANGE</span><span>RED</span></div>${id ? `<div class="legend-v"><span id="${id}Min">–</span><span id="${id}Max">–</span></div>` : ""}`;
  const statusSilo = (i) => ALARM.statusSilo(i);
  const tagInst = (pola, i) => tagN(pola, i + 1);
  function isiSiloTabs() {
    $$("[data-silo]").forEach((b) => b.classList.toggle("on", +b.dataset.silo === sel));
    $$("[data-sdot]").forEach((d) => (d.className = "dot " + statusSilo(+d.dataset.sdot).w));
    $$("[data-spct]").forEach((d) => { const v = V(+d.dataset.spct); d.textContent = v.pct == null ? "–" : fmt(v.pct, 1) + " %"; });
  }

  /* ---------------- nilai instrumen (dipakai tabel, modal, settings) ---------------- */
  function instrumen(i) {
    const s = sv(i), v = s.v, n = i + 1, beku = s.f.plc;
    return INST.map(([pola, nama, unit, dec, kat]) => {
      const tag = tagN(pola, n); let nilai = null, teks = null, st = "OK", w = "green";
      if (kat === "SCANNER") { teks = v.scanSt === "SCANNING" ? `SCANNING ${fmt(v.scanProg, 0)} %` : v.scanSt; nilai = v.scanQ; if (v.scanSt === "COMM FAIL") { st = "COMM FAIL"; w = "red"; } }
      else if (kat === "RADAR") { nilai = v.rLvl; if (v.rSt === "FAULT") { st = "FAULT"; w = "red"; } }
      else if (tag.startsWith("WT")) nilai = v.WT;
      else if (tag.startsWith("WE")) { const k = "ABCD".indexOf(tag.slice(-1)); nilai = v.WE[k]; if (s.f.loadcell && k === 2) { st = "FAULT"; w = "red"; } }
      else if (kat === "TEMP") { const k = +tag.slice(-1) - 1, t = v.TT[k]; nilai = t.v; st = t.tutup ? "IN COAL" : "HEADSPACE"; w = t.tutup && t.v >= C.batas.tempHH ? "red" : t.tutup && t.v >= C.batas.tempH ? "yellow" : "green"; }
      else if (tag.startsWith("LSH")) { teks = v.LSH ? "ACTIVE" : "NORMAL"; if (v.LSH) { st = "ALARM"; w = "red"; } }
      else if (tag.startsWith("LSL")) { teks = v.LSL ? "COVERED" : "UNCOVERED"; if (!v.LSL) { st = "LOW"; w = "yellow"; } }
      else if (tag.startsWith("PT")) { nilai = v.PT; if (v.PT > C.batas.tekananH) { st = "HIGH"; w = "yellow"; } }
      else if (tag.endsWith("41")) { nilai = v.CO; if (v.CO >= C.batas.coH) { st = v.CO >= C.batas.coHH ? "HIGH-HIGH" : "HIGH"; w = v.CO >= C.batas.coHH ? "red" : "yellow"; } }
      else if (tag.endsWith("42")) { nilai = v.DUST; if (v.DUST >= C.batas.debuH) { st = v.DUST >= C.batas.debuHH ? "HIGH-HIGH" : "HIGH"; w = v.DUST >= C.batas.debuHH ? "red" : "yellow"; } }
      if (beku) { st = "COMM ERROR"; w = "grey"; }
      const alm = ALARM.untukSilo(i).filter((a) => a.tag === tag || (a.tag.endsWith("x") && tag.startsWith(a.tag.slice(0, -1))) || (a.tag.startsWith("PLC")));
      return { tag, nama, unit, dec, kat, nilai, teks: teks ?? (nilai == null ? "–" : fmt(nilai, dec)), st, w, alm };
    });
  }
  const isiInstTabel = (el, i) => {
    if (!el) return;
    const L = instrumen(i);
    el.innerHTML = `<table class="tbl"><thead><tr><th>Tag</th><th>Instrument</th><th class="num">Live value</th><th>Unit</th><th>Status</th><th>Alarm</th></tr></thead><tbody>${L.map((x) => `<tr data-buka="INST:${i}:${x.tag}" class="klik"><td class="tag">${x.tag}</td><td>${x.nama}</td><td class="num"><b>${x.teks}</b></td><td>${x.unit}</td><td><span class="st ${WST[x.w]}">${x.st}</span></td><td>${x.alm.length ? x.alm.map((a) => `<span class="pri pri-${a.pri}">${a.pri}</span>`).join(" ") : '<span class="muted">–</span>'}</td></tr>`).join("")}</tbody></table>`;
  };

  /* ---------------- KEY DATA (dipakai beberapa halaman) ---------------- */
  const KEY = [["kMat", "Material", ""], ["kTank", "Tank", ""], ["kPct", "Level", "%"], ["kLvl", "Level", "m"], ["kW", "Weight", "t"], ["kCap", "Capacity", "t"], ["kAv", "Available capacity", "t"], ["kVol", "Volume", "m³"], ["kTa", "Average temp.", "°C"], ["kTm", "Maximum temp.", "°C"], ["kRho", "Density", "t/m³"]];
  const keyHTML = (p) => `<div class="kpis key">${KEY.map(([id, l, u]) => kpi(p + id, l, u, "k-" + id)).join("")}</div>`;
  function isiKey(p) {
    const v = V(), k = C.silo[sel];
    set(p + "kMat", C.material); set(p + "kTank", k[1]); set(p + "kPct", fmt(v.pct, 1)); set(p + "kLvl", fmt(v.lvlM, 2)); set(p + "kW", fmt(v.berat, 1)); set(p + "kCap", fmt(C.kapasitas, 0));
    set(p + "kAv", fmt(v.avail, 1)); set(p + "kVol", fmt(v.vol, 1)); set(p + "kTa", fmt(v.Tavg, 1)); set(p + "kTm", fmt(v.Tmax, 1)); set(p + "kRho", fmt(C.densitas, 2));
    const el = $("#" + p + "kTm"); if (el) el.closest(".kpi").classList.toggle("warn", v.Tmax >= C.batas.tempH);
    const ep = $("#" + p + "kPct"); if (ep) ep.closest(".kpi").classList.toggle("warn", v.pct >= C.batas.levelH || v.pct <= C.batas.levelL);
  }

  /* ---------------- STATUS PANEL ---------------- */
  const statusHTML = (p) => `<div class="stat-big" id="${p}Big"><small>SILO STATUS</small><b id="${p}BigT">NORMAL</b><span id="${p}BigS"></span></div>
    <div class="stat-list">${ALARM.STATUS.slice().reverse().map(([st, w]) => `<div class="stat-i" data-st="${st}"><i class="${w}"></i>${st}</div>`).join("")}</div>`;
  function isiStatus(p) {
    const s = statusSilo(sel), a = ALARM.untukSilo(sel).filter((x) => x.state !== "RTN UNACK");
    const big = $("#" + p + "Big"); if (!big) return;
    big.className = "stat-big " + WST[s.w]; set(p + "BigT", s.st); set(p + "BigS", a.length ? `${a.length} active alarm · ${a[0].tag}` : "All instruments healthy");
    const kat = new Set(a.map((x) => x.kat)); if (!a.length) kat.add("NORMAL");
    $$(`#pg-${p === "ov" ? "overview" : "viz"} .stat-i`).forEach((el) => el.classList.toggle("on", kat.has(el.dataset.st)));
  }
  const almMini = (el, daftar) => { if (!el) return; const h = daftar.length ? daftar.slice(0, 7).map((a) => `<div class="am pri-b-${a.pri}" data-pg="alarm"><b>${a.tag}</b>${a.desk}<small>${a.state === "ACTIVE" ? "UNACK" : a.state}</small></div>`).join("") : '<div class="am ok">✓ Tidak ada alarm aktif</div>'; if (el.innerHTML !== h) el.innerHTML = h; };

  /* ---------------- CONTOUR INFO ---------------- */
  const konturInfoHTML = (p) => `<table class="tbl kv" id="${p}Info"></table>`;
  function isiKonturInfo(p) {
    const st = SIM.ST[sel], v = V(), el = $("#" + p + "Info"); if (!st || !el) return;
    const rows = [["Maximum material height", fmt(st.max, 2) + " m"], ["Minimum material height", fmt(st.min, 2) + " m"], ["Average material height", fmt(st.avg, 2) + " m"], ["Height range (max − min)", fmt(st.rentang, 2) + " m"],
      ["Surface inclination", `${fmt(st.sudut, 1)}° · high side ${KONTUR.mataAngin(st.arah)}`], ["Material distribution", `NE ${fmt(st.kuadran.NE, 0)}% · NW ${fmt(st.kuadran.NW, 0)}% · SE ${fmt(st.kuadran.SE, 0)}% · SW ${fmt(st.kuadran.SW, 0)}%`],
      ["Estimated volume (scan)", fmt(st.vol, 1) + " m³"], ["Estimated weight (scan × ρ)", fmt(st.vol * C.densitas, 1) + " t"], ["Weight (load cells)", fmt(v.WT, 1) + " t"], ["Surface profile", st.profil]];
    el.innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("");
    set(p + "LMin", fmt(st.min, 2) + " m"); set(p + "LMax", fmt(st.max, 2) + " m");
  }

  /* =====================================================
     HALAMAN
     ===================================================== */
  const P = {};

  /* ---------- 1. DASHBOARD OVERVIEW ---------- */
  P.overview = {
    judul: "Dashboard Overview", ikon: "▦",
    html: () => `${pg("Dashboard Overview", "Ringkasan silo terpilih: key data, visualisasi 3D, status, kontur material & alarm")}
      ${siloTabs()}${keyHTML("ov")}
      <div class="grid g-ov">
        <div class="card c3d"><div class="card-h"><span>3D Coal Silo Plant · klik silo / instrumen untuk detail</span><div class="btns">${["Plant", "Isometric", "Cutaway", "Top"].map((v) => `<button class="btn kecil" data-cam="${v}">${v}</button>`).join("")}<span class="sep"></span><button class="btn kecil" data-shell="1">Transparent</button><button class="btn kecil" data-shell="0">Solid</button><button class="btn kecil" data-warna="kontur">Contour</button><button class="btn kecil" data-warna="coal">Coal</button></div></div><div class="h3d" id="ov3d"></div></div>
        <div class="col">
          <div class="card"><div class="card-h">Status Panel</div><div class="card-b">${statusHTML("ov")}</div></div>
          <div class="card"><div class="card-h">Material Contour (top view)<span class="lnk" data-page="contour">Detail ›</span></div><div class="card-b"><canvas class="cv-mini" id="ovTopo"></canvas>${legenda("ovL")}</div></div>
          <div class="card"><div class="card-h">Active Alarms<span class="lnk" data-page="alarm">Semua ›</span></div><div class="card-b"><div class="alm-mini" id="ovAlm"></div></div></div>
        </div>
      </div>
      <div class="grid g3">
        <div class="card"><div class="card-h">Silo Inventory</div><div class="card-b"><div class="silo-bars" id="ovBars"></div></div></div>
        <div class="card"><div class="card-h">Level Trend 24 h (all silos)<span class="lnk" data-page="trend">Trend ›</span></div><div class="card-b"><div class="chart" style="height:220px"><canvas id="chOv"></canvas></div></div></div>
        <div class="card"><div class="card-h">Material Handling<span class="lnk" data-page="equip">Equipment ›</span></div><div class="card-b"><table class="tbl kv" id="ovFlow"></table><div class="eq-grid" id="ovEq"></div></div></div>
      </div>`,
    masuk() { Silo3D.pasang($("#ov3d")); },
    update(t) {
      isiSiloTabs(); isiKey("ov"); isiStatus("ov"); almMini($("#ovAlm"), ALARM.untukSilo(sel).concat(ALARM.aktif.filter((a) => a.key.startsWith("P:"))));
      if (t % 2 === 0) { PETA2D.mini($("#ovTopo"), sel); const st = SIM.ST[sel]; if (st) { set("ovLMin", fmt(st.min, 2) + " m"); set("ovLMax", fmt(st.max, 2) + " m"); } }
      $("#ovBars").innerHTML = C.silo.map((k, i) => { const v = V(i), s = statusSilo(i); return `<div class="sb ${i === sel ? "on" : ""}" data-silo="${i}"><div class="sb-silo"><i style="height:${Math.max(0, Math.min(100, v.pct))}%" class="${s.w}"></i><em style="bottom:${C.batas.levelH}%"></em><em class="lo" style="bottom:${C.batas.levelL}%"></em></div><b>${fmt(v.pct, 1)} %</b><small>${fmt(v.berat, 0)} t</small><span>${k[0]}</span></div>`; }).join("");
      const SS = S(), tgt = SS.silo.findIndex((x) => x.qin > 0), out = SS.silo.reduce((a, x) => a + x.qout, 0), inv = SS.silo.reduce((a, x) => a + x.v.berat, 0);
      $("#ovFlow").innerHTML = [["Operating mode", SS.auto ? "AUTO" : "MANUAL"], ["Filling target", tgt >= 0 ? `${C.silo[tgt][0]} · ${fmt(SS.silo[tgt].qin, 0)} t/h` : SS.blokIsi ? "BLOCKED – " + SS.blokIsi : "none"], ["Total discharge to boiler", fmt(out, 1) + " t/h"], ["Receiving hopper stock", fmt(SS.stok, 1) + " t"], ["Total inventory", `${fmt(inv, 1)} / ${fmt(C.kapasitas * NS)} t`]].map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("");
      $("#ovEq").innerHTML = C.alat.map(([tg, nm]) => { const o = SS.alat[tg]; return `<div class="eq ${STC[o.st]}" data-buka="EQ:${tg}"><i></i><b>${tg}</b><small>${STN[o.st]}</small></div>`; }).join("");
      if (t % 10 === 0) GRAFIK.ovLevel("chOv");
    },
  };

  /* ---------- 2. TANK OVERVIEW ---------- */
  P.tanks = {
    judul: "Tank Overview", ikon: "◫",
    html: () => `${pg("Tank Overview", "4 silo batu bara · thumbnail 3D diperbarui otomatis · klik kartu untuk membuka detail", `<button class="btn kecil" data-thumb>⟳ Refresh 3D</button>`)}
      <div class="kpis">${kpi("toInv", "Total inventory", "t", "", "all silos")}${kpi("toCap", "Total capacity", "t")}${kpi("toAv", "Available capacity", "t")}${kpi("toUt", "Utilization", "%")}${kpi("toIn", "Filling rate", "t/h")}${kpi("toOut", "Discharge rate", "t/h")}</div>
      <div class="grid g4">${C.silo.map((k, i) => `<div class="card tcard" data-detail="${i}" id="tc${i}">
        <div class="card-h"><span>${k[1]}</span><span class="st" id="tcSt${i}">–</span></div>
        <div class="tc-b"><div class="thumb"><img id="th${i}" alt="3D ${k[0]}"><div class="thumb-k" id="thK${i}">menyiapkan 3D…</div><span class="th-tag">3D · SIMULATION</span></div>
        <div class="tc-i"><div class="tc-pct"><b id="tcP${i}">–</b><span>%</span></div><div class="bar"><i id="tcB${i}"></i></div>
        <table class="tbl kv mini"><tr><td>Weight</td><td class="num" id="tcW${i}"></td></tr><tr><td>Level</td><td class="num" id="tcL${i}"></td></tr><tr><td>Available</td><td class="num" id="tcA${i}"></td></tr><tr><td>Volume</td><td class="num" id="tcV${i}"></td></tr><tr><td>Temp avg/max</td><td class="num" id="tcT${i}"></td></tr><tr><td>3D scanner</td><td class="num" id="tcS${i}"></td></tr><tr><td>Operation</td><td class="num" id="tcO${i}"></td></tr></table></div></div>
        <div class="tc-f"><button class="btn kecil g" data-detail="${i}">Open detail ›</button><button class="btn kecil" data-kontur="${i}">Contour ›</button></div></div>`).join("")}</div>
      <div class="card"><div class="card-h">Silo comparison</div><div class="card-b scroll"><table class="tbl" id="toTbl"></table></div></div>`,
    masuk() { Silo3D.siapkan(); thumbT = 0; },
    update(t) {
      const SS = S(); let inv = 0, qi = 0, qo = 0;
      C.silo.forEach((k, i) => {
        const v = V(i), s = sv(i), st = statusSilo(i); inv += v.berat; qi += s.qin; qo += s.qout;
        set("tcP" + i, fmt(v.pct, 1)); $("#tcB" + i).style.width = Math.min(100, v.pct) + "%"; $("#tcB" + i).className = st.w;
        set("tcSt" + i, st.st, "st " + WST[st.w]); $("#tc" + i).dataset.st = st.w;
        set("tcW" + i, fmt(v.berat, 1) + " t"); set("tcL" + i, fmt(v.lvlM, 2) + " m"); set("tcA" + i, fmt(v.avail, 1) + " t"); set("tcV" + i, fmt(v.vol, 1) + " m³");
        set("tcT" + i, `${fmt(v.Tavg, 1)} / ${fmt(v.Tmax, 1)} °C`); set("tcS" + i, v.scanSt === "SCANNING" ? `SCANNING ${fmt(v.scanProg, 0)} %` : v.scanSt);
        set("tcO" + i, s.qin > 0 && s.qout > 0 ? `FILL ${fmt(s.qin, 0)} · DISCH ${fmt(s.qout, 0)} t/h` : s.qin > 0 ? `FILLING ${fmt(s.qin, 0)} t/h` : s.qout > 0 ? `DISCHARGING ${fmt(s.qout, 0)} t/h` : "IDLE");
      });
      const cap = C.kapasitas * NS; set("toInv", fmt(inv, 1)); set("toCap", fmt(cap)); set("toAv", fmt(cap - inv, 1)); set("toUt", fmt((inv / cap) * 100, 1)); set("toIn", fmt(qi, 0)); set("toOut", fmt(qo, 1));
      $("#toTbl").innerHTML = `<thead><tr><th>Silo</th><th>Status</th><th class="num">Level %</th><th class="num">Level m</th><th class="num">Weight t</th><th class="num">Volume m³</th><th class="num">Max h</th><th class="num">Min h</th><th class="num">Incl.</th><th class="num">T avg</th><th class="num">T max</th><th class="num">CO ppm</th><th>Profile</th></tr></thead><tbody>${C.silo.map((k, i) => { const v = V(i), st = SIM.ST[i] || {}, s2 = statusSilo(i); return `<tr class="klik" data-detail="${i}"><td class="tag">${k[0]}</td><td><span class="st ${WST[s2.w]}">${s2.st}</span></td><td class="num">${fmt(v.pct, 1)}</td><td class="num">${fmt(v.lvlM, 2)}</td><td class="num">${fmt(v.berat, 1)}</td><td class="num">${fmt(v.vol, 1)}</td><td class="num">${fmt(st.max, 2)}</td><td class="num">${fmt(st.min, 2)}</td><td class="num">${fmt(st.sudut, 1)}°</td><td class="num">${fmt(v.Tavg, 1)}</td><td class="num">${fmt(v.Tmax, 1)}</td><td class="num">${fmt(v.CO, 0)}</td><td>${st.profil || ""}</td></tr>`; }).join("")}</tbody>`;
      if (t >= thumbT) { thumbT = t + 15; foto(); }
    },
  };
  function foto() {
    C.silo.forEach((_, i) => setTimeout(() => {
      const url = typeof THREE !== "undefined" ? Silo3D.foto(i) : null, img = $("#th" + i); if (!img) return;
      if (url && url.length > 2000) { img.src = url; img.style.display = ""; set("thK" + i, ""); } else { img.style.display = "none"; set("thK" + i, typeof THREE === "undefined" ? "Three.js tidak termuat" : "3D thumbnail"); }
    }, 60 * i));
  }

  /* ---------- 3. 3D TANK VISUALIZATION ---------- */
  P.viz = {
    judul: "3D Tank Visualization", ikon: "◈",
    html: () => `${pg("3D Tank Visualization", "Rotate: drag kiri · Pan: drag kanan / Shift+drag · Zoom: scroll · klik silo, instrumen atau peralatan untuk detail")}
      ${siloTabs()}
      <div class="toolbar">${Object.keys(Silo3D.VIEW).map((v) => `<button class="btn kecil" data-cam="${v}">${v}</button>`).join("")}<span class="sep"></span>
        <button class="btn kecil" data-shell="1">Transparent</button><button class="btn kecil" data-shell="0">Solid</button><span class="sep"></span>
        <button class="btn kecil" data-warna="kontur">Contour colors</button><button class="btn kecil" data-warna="coal">Coal lumps</button><span class="sep"></span>
        <button class="btn kecil on" data-tog="pin">Max/Min pins</button><button class="btn kecil on" data-tog="label">Labels</button><button class="btn kecil on" data-tog="aliran">Flow arrows</button><button class="btn kecil" data-tog="rotate">Auto rotate</button><button class="btn kecil" data-fs="#viz3dCard">⛶ Fullscreen</button></div>
      <div class="grid g-viz">
        <div class="card c3d tinggi" id="viz3dCard"><div class="h3d" id="viz3d"></div><div class="h3d-info"><span id="vzView">View: Plant</span> · <span id="vzSel"></span></div></div>
        <div class="col">
          <div class="card"><div class="card-h">Status Panel</div><div class="card-b">${statusHTML("vz")}</div></div>
          <div class="card"><div class="card-h">Key data</div><div class="card-b"><table class="tbl kv" id="vzKey"></table></div></div>
          <div class="card"><div class="card-h">Contour legend</div><div class="card-b">${legenda("vzL")}<p class="muted kecil">Warna permukaan = tinggi material hasil 3D scan (SIMULATION). Pin merah = titik tertinggi, pin biru = titik terendah.</p></div></div>
          <div class="card"><div class="card-h">Legend 3D</div><div class="card-b leg3d"><div><i style="background:#22d3ee"></i>Filling flow</div><div><i style="background:#f59e0b"></i>Discharge flow</div><div><i style="background:#a3b1c6"></i>Dust extraction</div><div><i style="background:#22c55e"></i>Running / OK</div><div><i style="background:#6b7280"></i>Stopped</div><div><i style="background:#ef4444"></i>Fault</div><div><i style="background:#f59e0b"></i>Maintenance</div><div><i style="background:#67e8f9"></i>Scan point cloud</div></div></div>
        </div>
      </div>`,
    masuk() { Silo3D.pasang($("#viz3d")); },
    update() {
      isiSiloTabs(); isiStatus("vz");
      const v = V(), st = SIM.ST[sel];
      $("#vzKey").innerHTML = [["Material", C.material], ["Tank", C.silo[sel][1]], ["Level", `${fmt(v.pct, 1)} % · ${fmt(v.lvlM, 2)} m`], ["Weight", fmt(v.berat, 1) + " t"], ["Available", fmt(v.avail, 1) + " t"], ["Volume", fmt(v.vol, 1) + " m³"], ["Temp avg / max", `${fmt(v.Tavg, 1)} / ${fmt(v.Tmax, 1)} °C`], ["3D scanner", v.scanSt === "SCANNING" ? `SCANNING ${fmt(v.scanProg, 0)} %` : v.scanSt], ["Radar level", v.rSt === "FAULT" ? "FAULT" : fmt(v.rLvl, 2) + " m"]].map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("");
      if (st) { set("vzLMin", fmt(st.min, 2) + " m"); set("vzLMax", fmt(st.max, 2) + " m"); }
      set("vzView", "View: " + Silo3D.vista + (Silo3D.cutaway ? " (cutaway)" : "")); set("vzSel", `Selected: ${C.silo[sel][1]} · ${Silo3D.transparan ? "transparent shell" : "solid shell"} · ${Silo3D.kontur ? "contour colors" : "coal texture"}`);
      $$("[data-shell]").forEach((b) => b.classList.toggle("on", (b.dataset.shell === "1") === Silo3D.transparan));
      $$("[data-warna]").forEach((b) => b.classList.toggle("on", (b.dataset.warna === "kontur") === Silo3D.kontur));
    },
  };

  /* ---------- 4. MATERIAL CONTOUR MAPPING ---------- */
  P.contour = {
    judul: "Material Contour Mapping", ikon: "◍",
    html: () => `${pg("Material Contour Mapping", "Peta permukaan material dari 3D level scanner – 3D surface, topografi 2D, penampang, heatmap")}
      ${siloTabs()}
      <div class="note warn"><b>SIMULATION CONTOUR.</b> Kontur ini dihasilkan model simulasi, <u>bukan hasil pengukuran aktual</u>. Kontur nyata hanya dapat diperoleh dari <b>3D level scanner</b> (multi-beam radar / LiDAR) yang mengirim point cloud. Satu radar level biasa hanya mengukur <b>satu titik</b> dan tidak dapat membentuk kontur 3D.</div>
      <div class="grid g-kt">
        <div class="card"><div class="card-h"><div class="btns">${[["3d", "3D Surface"], ["topo", "2D Topographic"], ["potong", "Cross Section"], ["heat", "Heatmap"]].map(([k, l]) => `<button class="btn kecil" data-kv="${k}">${l}</button>`).join("")}</div>
          <div class="btns" id="ktCtl"></div></div>
          <div class="kt-view"><div id="kt3d" class="h3d kt3d"></div><canvas id="ktCv"></canvas></div></div>
        <div class="col">
          <div class="card"><div class="card-h">Contour Information<span class="muted kecil" id="ktSrc"></span></div><div class="card-b">${konturInfoHTML("kt")}</div></div>
          <div class="card"><div class="card-h">Height distribution & legend</div><div class="card-b">${legenda("ktL")}<div class="pita" id="ktPita"></div><div class="kuad" id="ktKuad"></div></div></div>
          <div class="card"><div class="card-h">Scan data source</div><div class="card-b"><table class="tbl kv" id="ktScan"></table>
            <div class="btns"><label class="btn kecil g file">⬆ Import point cloud (CSV/JSON)<input type="file" id="ktFile" accept=".csv,.txt,.json,.xyz" hidden></label><button class="btn kecil" data-cloud="contoh">⬇ Sample CSV</button><button class="btn kecil" data-cloud="sim">↺ Back to SIMULATION</button><button class="btn kecil" data-scan>▶ Request scan</button></div>
            <p class="muted kecil">Format: <code>x,y,z</code> per baris (meter). x = timur, y = utara dari sumbu silo; z = tinggi dari outlet hopper. Minimal 12 titik, maks 3000. Interpolasi IDW ke grid ${KONTUR.N}×${KONTUR.N}.</p></div></div>
        </div>
      </div>`,
    masuk() { tampilKv(); },
    update(t) {
      isiSiloTabs(); isiKonturInfo("kt");
      const st = SIM.ST[sel], v = V(); if (!st) return;
      const band = [0, 1, 2, 3, 4, 5].map((q) => [st.min + (st.rentang * q) / 6, st.min + (st.rentang * (q + 1)) / 6, st.pita[q]]);
      $("#ktPita").innerHTML = band.slice().reverse().map(([a, b, p], q) => `<div class="pt"><i style="background:${KONTUR.css((5 - q + 0.5) / 6)}"></i><span>${fmt(a, 2)}–${fmt(b, 2)} m</span><em><u style="width:${p}%"></u></em><b>${fmt(p, 0)} %</b></div>`).join("");
      $("#ktKuad").innerHTML = ["NW", "NE", "SW", "SE"].map((k) => `<div><small>${k}</small><b>${fmt(st.kuadran[k], 1)} %</b></div>`).join("");
      $("#ktScan").innerHTML = [["Contour source", S().sumberKontur[sel]], ["Scanner LS-" + (sel + 1) + "01", v.scanSt === "SCANNING" ? `SCANNING ${fmt(v.scanProg, 0)} %` : v.scanSt], ["Mapping status", v.mapSt], ["Scan quality", fmt(v.scanQ, 0) + " %"], ["Last scan", waktuStr(v.scanLast)], ["Grid points", `${st.n} (${fmt(KONTUR.dx * 100, 0)} cm spacing)`]].map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("");
      set("ktSrc", S().sumberKontur[sel]);
      if (kv !== "3d" && t % 2 === 0) gambarKv();
    },
  };
  function tampilKv() {
    $$("[data-kv]").forEach((b) => b.classList.toggle("on", b.dataset.kv === kv));
    const d3 = $("#kt3d"), cv = $("#ktCv"); if (!d3) return;
    d3.style.display = kv === "3d" ? "" : "none"; cv.style.display = kv === "3d" ? "none" : "";
    const ctl = { "3d": `<label class="rng">Vertical × <input type="range" min="1" max="6" step="0.5" value="3" data-skala><b id="ktSk">3</b></label><button class="btn kecil on" data-kt="garis">Contour lines</button><button class="btn kecil" data-kt="titik">Scan points</button>${["3D", "Top", "Front", "Side"].map((v) => `<button class="btn kecil" data-kcam="${v}">${v}</button>`).join("")}`,
      topo: `<span class="muted kecil">Garis kontur tebal = label ketinggian · R = radar · S = 3D scanner · I = inlet · T = kabel suhu</span>`, potong: `<label class="rng">Section angle <input type="range" min="0" max="179" step="1" value="${sudutPotong}" data-sudut><b id="ktSd">${sudutPotong}°</b></label>`, heat: `<span class="muted kecil">Heatmap sel 0,5 m – angka = tinggi rata-rata sel</span>` }[kv];
    $("#ktCtl").innerHTML = ctl;
    if (kv === "3d") { Permukaan3D.pasang(d3); Permukaan3D.silo(sel); } else { Permukaan3D.jeda(true); gambarKv(); }
  }
  function gambarKv() { const cv = $("#ktCv"); if (!cv || cv.style.display === "none") return; if (kv === "topo") PETA2D.topo(cv, sel); if (kv === "potong") PETA2D.potong(cv, sel, sudutPotong); if (kv === "heat") PETA2D.heat(cv, sel); }

  /* ---------- 5. INSTRUMENT MONITORING ---------- */
  P.inst = {
    judul: "Instrument Monitoring", ikon: "◉",
    html: () => `${pg("Instrument Monitoring", "3D scanner, radar, load cell, suhu, level switch, tekanan, CO & debu – tag, nilai live, satuan, status, alarm")}
      ${siloTabs()}
      <div class="grid g3">
        <div class="card"><div class="card-h"><span id="iLSt">3D Level Scanner</span><span class="st" id="iLSs">–</span></div><div class="card-b">
          <div class="scan-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="sr-bg"/><circle cx="60" cy="60" r="50" class="sr-fg" id="iLSring"/></svg><div><b id="iLSp">0</b><span>% scan</span></div></div>
          <table class="tbl kv" id="iLS"></table><div class="btns"><button class="btn kecil g" data-scan>▶ Request scan</button><button class="btn kecil" data-page="contour">Contour ›</button></div></div></div>
        <div class="card"><div class="card-h"><span id="iRDt">Radar Level Transmitter</span><span class="st" id="iRDs">–</span></div><div class="card-b">
          <div class="radar-g"><div class="rg-silo"><i id="iRDf"></i><em id="iRDm"></em></div><div><div class="big"><b id="iRDl">–</b><span>m level</span></div><div class="big s"><b id="iRDd">–</b><span>m distance</span></div><div class="big s"><b id="iRDp">–</b><span>%</span></div></div></div>
          <table class="tbl kv" id="iRD"></table><p class="muted kecil">Radar mengukur <b>satu titik</b> (r ${fmt(C.posRadar.r, 1)} m dari sumbu). Tidak dipakai untuk kontur 3D.</p></div></div>
        <div class="card"><div class="card-h"><span id="iWTt">Load Cells</span><span class="st" id="iWTs">–</span></div><div class="card-b">
          <div class="big"><b id="iWT">–</b><span>t total (WT)</span></div><div class="lc" id="iLC"></div>
          <div class="chart" style="height:120px"><canvas id="chLC"></canvas></div></div></div>
      </div>
      <div class="grid g3">
        <div class="card"><div class="card-h"><span>Temperature Sensors (multi-point cable)</span><span class="st" id="iTTs">–</span></div><div class="card-b"><div class="termo"><div class="tm-silo" id="iTTsilo"></div><div class="tm-list" id="iTT"></div></div>
          <div class="kpis kecil">${kpi("iTa", "Average (in coal)", "°C")}${kpi("iTm", "Maximum", "°C")}${kpi("iTn", "Sensors covered", "of 4")}</div></div></div>
        <div class="card"><div class="card-h">Level Switches & Process</div><div class="card-b"><div class="sw" id="iSW"></div><div class="gg" id="iGG"></div></div></div>
        <div class="card"><div class="card-h">Temperature trend (1 h)</div><div class="card-b"><div class="chart" style="height:260px"><canvas id="chTT"></canvas></div></div></div>
      </div>
      <div class="card"><div class="card-h">All instruments – <span id="iJdl"></span></div><div class="card-b scroll" id="iTbl"></div></div>`,
    update(t) {
      isiSiloTabs(); const s = sv(), v = s.v, n = sel + 1, beku = s.f.plc;
      // scanner
      set("iLSt", `LS-${n}01 · 3D Level Scanner`); const ls = v.scanSt; set("iLSs", beku ? "COMM ERROR" : ls, "st " + (beku ? "st-grey" : ls === "COMM FAIL" ? "st-red" : ls === "SCANNING" ? "st-cyan" : "st-green"));
      set("iLSp", fmt(v.scanProg, 0)); $("#iLSring").style.strokeDashoffset = 314 * (1 - (v.scanProg || 0) / 100);
      $("#iLS").innerHTML = [["Scanner status", ls], ["Scan progress", fmt(v.scanProg, 0) + " %"], ["Mapping status", v.mapSt], ["Scan quality", fmt(v.scanQ, 0) + " %"], ["Last scan", waktuStr(v.scanLast)], ["Max / min height", `${fmt(v.hMax, 2)} / ${fmt(v.hMin, 2)} m`]].map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("");
      // radar
      set("iRDt", `LT-${n}02 · Radar Level`); set("iRDs", beku ? "COMM ERROR" : v.rSt, "st " + (beku ? "st-grey" : v.rSt === "FAULT" ? "st-red" : "st-green"));
      set("iRDl", v.rSt === "FAULT" ? "FAULT" : fmt(v.rLvl, 2)); set("iRDd", v.rSt === "FAULT" ? "–" : fmt(v.rDist, 2)); set("iRDp", v.rSt === "FAULT" ? "–" : fmt(v.rPct, 1));
      $("#iRDf").style.height = Math.min(100, (v.rLvl / G.Hshell) * 100) + "%"; $("#iRDm").style.height = Math.min(100, (v.rDist / G.Hradar) * 100) + "%";
      $("#iRD").innerHTML = [["Level (from outlet)", fmt(v.rLvl, 2) + " m"], ["Distance (flange → surface)", fmt(v.rDist, 2) + " m"], ["Level %", fmt(v.rPct, 1) + " %"], ["Signal quality", fmt(v.rSQ, 0) + " %"], ["Status", v.rSt]].map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("");
      // load cell
      set("iWTt", `WT-${n}03 · Load Cells`); set("iWT", fmt(v.WT, 1)); set("iWTs", beku ? "COMM ERROR" : s.f.loadcell ? "FAULT" : "OK", "st " + (beku ? "st-grey" : s.f.loadcell ? "st-red" : "st-green"));
      const rata = v.WT / 4;
      $("#iLC").innerHTML = v.WE.map((w, k) => { const dev = rata ? ((w - rata) / rata) * 100 : 0, bad = Math.abs(dev) > 35; return `<div class="lc-i ${bad ? "bad" : ""}" data-buka="INST:${sel}:WE-${n}03${"ABCD"[k]}"><span>WE-${n}03${"ABCD"[k]}</span><em><u style="width:${Math.min(100, (w / (C.kapasitas / 4)) * 100)}%"></u></em><b>${fmt(w, 1)} t</b><small>${dev >= 0 ? "+" : ""}${fmt(dev, 1)} %</small></div>`; }).join("");
      // suhu
      const tt = v.TT || [];
      $("#iTTsilo").innerHTML = `<i style="height:${Math.min(100, (v.lvlM / G.Hshell) * 100)}%"></i>${tt.map((x, k) => `<b class="${x.tutup ? (x.v >= C.batas.tempHH ? "red" : x.v >= C.batas.tempH ? "orange" : "ok") : "head"}" style="bottom:${(C.tinggiTT[k] / G.Hshell) * 100}%">${k + 1}</b>`).join("")}`;
      $("#iTT").innerHTML = tt.map((x, k) => `<div class="tm-i" data-buka="INST:${sel}:TT-${n}1${k + 1}"><span class="tag">TT-${n}1${k + 1}</span><small>${C.tinggiTT[k]} m · ${x.tutup ? "in coal" : "headspace"}</small><b class="${x.tutup && x.v >= C.batas.tempH ? "warn" : ""}">${fmt(x.v, 1)} °C</b></div>`).reverse().join("");
      set("iTa", fmt(v.Tavg, 1)); set("iTm", fmt(v.Tmax, 1)); set("iTn", v.Tn);
      const tst = v.Tmax >= C.batas.tempHH ? ["HIGH-HIGH", "st-red"] : v.Tmax >= C.batas.tempH ? ["HIGH", "st-yellow"] : ["NORMAL", "st-green"]; set("iTTs", beku ? "COMM ERROR" : tst[0], "st " + (beku ? "st-grey" : tst[1]));
      // switch & proses
      $("#iSW").innerHTML = [["LSH-" + n + "21", "High level switch", v.LSH ? "ACTIVE" : "NORMAL", v.LSH ? "red" : "green"], ["LSL-" + n + "22", "Low level switch", v.LSL ? "COVERED" : "UNCOVERED", v.LSL ? "green" : "yellow"]].map(([a, b, c, w]) => `<div class="sw-i" data-buka="INST:${sel}:${a}"><i class="${beku ? "grey" : w}"></i><div><b>${a}</b><small>${b}</small></div><span>${beku ? "COMM ERR" : c}</span></div>`).join("");
      const gg = [["PT-" + n + "31", "Silo pressure", v.PT, "mbar", -10, 10, C.batas.tekananH], ["AT-" + n + "41", "CO headspace", v.CO, "ppm", 0, 150, C.batas.coH], ["AT-" + n + "42", "Dust (silo top)", v.DUST, "mg/m³", 0, 30, C.batas.debuH]];
      $("#iGG").innerHTML = gg.map(([tg, nm, x, u, a, b, lim]) => `<div class="gg-i" data-buka="INST:${sel}:${tg}"><div><span class="tag">${tg}</span><small>${nm}</small></div><em><u style="width:${Math.max(0, Math.min(100, ((x - a) / (b - a)) * 100))}%" class="${x >= lim ? "warn" : ""}"></u><s style="left:${((lim - a) / (b - a)) * 100}%"></s></em><b>${fmt(x, 1)} <small>${u}</small></b></div>`).join("");
      set("iJdl", C.silo[sel][1]); isiInstTabel($("#iTbl"), sel);
      if (t % 5 === 0) {
        GRAFIK.lc("chLC", sel);
        const d = SIM.rt[sel].slice(-360), L = d.map((r) => jamStr(r[0]).slice(0, 5));
        GRAFIK.buat("chTT", "line", L, [{ label: "Average", data: d.map((r) => r[4]), borderColor: "#fbbf24" }, { label: "Maximum", data: d.map((r) => r[5]), borderColor: "#ef4444" }], { yJudul: "°C" });
      }
    },
  };

  /* ---------- 6. EQUIPMENT MONITORING ---------- */
  function mimic() {
    const sx = [430, 590, 750, 910], kotak = (id, x, y, w, h, t, sub) => `<g class="mn" id="mn_${id}" data-buka="${id.includes(":") ? id : "EQ:" + id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/><text x="${x + w / 2}" y="${y + h / 2 - 1}" class="mt">${t}</text>${sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 12}" class="ms" id="ms_${id.replace(/:/g, "_")}">${sub}</text>` : ""}</g>`;
    let s = `<svg viewBox="0 0 1200 520" class="mimic">
      <defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#22d3ee"/></marker></defs>
      <path class="fl" id="fl_rcv" d="M95 400 L150 400 L300 330 L318 330 L318 70 L360 70"/>
      <path class="fl" id="fl_gal" d="M360 70 L1000 70"/>
      <path class="fl du" id="fl_dust" d="M${sx[0] + 25} 108 L${sx[0] + 25} 92 L1060 92 L1060 130"/>
      <path class="fl ds" id="fl_cv3" d="M400 462 L1060 462 L1100 420"/>`;
    sx.forEach((x, i) => {
      s += `<path class="fl" id="fl_in${i}" d="M${x} 70 L${x} 112"/><path class="fl ds" id="fl_out${i}" d="M${x} 350 L${x} 445"/>`;
      s += `<g class="ms-silo" data-buka="SILO:${i}"><path d="M${x - 50} 120 L${x + 50} 120 L${x + 50} 300 L${x + 7} 340 L${x - 7} 340 L${x - 50} 300 Z" class="sl-shell"/><clipPath id="clp${i}"><path d="M${x - 50} 120 L${x + 50} 120 L${x + 50} 300 L${x + 7} 340 L${x - 7} 340 L${x - 50} 300 Z"/></clipPath><rect id="mfill${i}" x="${x - 50}" y="340" width="100" height="0" clip-path="url(#clp${i})" class="sl-fill"/><path d="M${x - 50} 120 L${x} 104 L${x + 50} 120" class="sl-shell"/>
        <text x="${x}" y="200" class="mt big">${C.silo[i][0]}</text><text x="${x}" y="222" class="ms big" id="mpct${i}">–</text><text x="${x}" y="240" class="ms" id="mw${i}">–</text></g>`;
      s += kotak(`SEQ:${i}:DV`, x - 30, 78, 60, 24, `DV-${i + 1}50`, "") + kotak(`SEQ:${i}:XV`, x - 30, 352, 60, 22, `XV-${i + 1}51`, "") + kotak(`SEQ:${i}:RV`, x - 30, 380, 60, 22, `RV-${i + 1}52`, "") + kotak(`SEQ:${i}:SC`, x - 30, 408, 60, 22, `SC-${i + 1}53`, "");
    });
    s += kotak("BFD-001", 30, 380, 70, 40, "TRUCK HOPPER", "BFD-001") + kotak("CV-001", 170, 330, 100, 34, "CV-001", "RUN") + kotak("BE-001", 296, 120, 46, 220, "BE-001", "") + kotak("CV-002", 600, 40, 160, 24, "CV-002 GALLERY", "")
      + kotak("DC-001", 1105, 130, 80, 40, "DC-001", "") + kotak("BF-001", 1020, 130, 80, 70, "BF-001", "BAG FILTER") + kotak("CV-003", 640, 474, 160, 30, "CV-003", "") + `<g class="mn boiler"><rect x="1100" y="380" width="90" height="100" rx="6"/><text x="1145" y="425" class="mt">BOILER</text><text x="1145" y="440" class="ms">BUNKER</text></g>
      <text x="40" y="365" class="ms" id="mStok">–</text></svg>`;
    return s;
  }
  function kartuAlat(tag, nm, jenis, kw, i) {
    const id = i === undefined ? tag : `${tag}${i}`, kunci = i === undefined ? `EQ:${tag}` : `SEQ:${i}:${tag}`, lbl = i === undefined ? tag : `${tag}-${i + 1}5${C.alatSilo.findIndex((x) => x[0] === tag)}`;
    return `<div class="eqc" id="eqc_${id}"><div class="eqc-h" data-buka="${kunci}"><i></i><div><b>${lbl}</b><small>${nm}${i !== undefined ? " · " + C.silo[i][0] : ""}</small></div><span class="st" id="eqs_${id}">–</span></div>
      <div class="eqc-d"><span>${jenis}</span><span>${kw} kW</span><span id="eqa_${id}">– A</span><span id="eqh_${id}">– h</span></div>
      <div class="btns">${["start", "stop", "maint", "reset"].map((a) => `<button class="btn kecil ${a === "start" ? "g" : a === "stop" ? "r" : ""}" data-alat="${tag}" data-aksi="${a}" ${i !== undefined ? `data-si="${i}"` : ""}>${a === "maint" ? "Maint." : a[0].toUpperCase() + a.slice(1)}</button>`).join("")}</div></div>`;
  }
  P.equip = {
    judul: "Equipment Monitoring", ikon: "⚙",
    html: () => `${pg("Equipment Monitoring", "Material handling: receiving → bucket elevator → distribution → silo → discharge → boiler. Panah beranimasi = aliran aktif.", `<span class="mode-pill" id="eqMode">–</span>`)}
      <div class="card"><div class="card-h">Process Flow Mimic<span class="muted kecil">klik peralatan untuk detail · biru = filling · oranye = discharge · abu = dust</span></div><div class="card-b">${mimic()}</div></div>
      <div class="grid g-eq">
        <div class="card"><div class="card-h">Common equipment</div><div class="card-b eqg">${C.alat.map(([t, nm, j, , kw]) => kartuAlat(t, nm, j, kw)).join("")}</div></div>
        <div class="card"><div class="card-h">Manual filling / discharge control<span class="muted kecil">aktif di MANUAL MODE</span></div><div class="card-b"><table class="tbl" id="eqMan"></table><p class="muted kecil">Interlock: filling butuh BFD-001, CV-001, BE-001, CV-002, DC-001 RUNNING + diverter silo. Discharge butuh XV, RV, SC silo + CV-003 RUNNING.</p></div></div>
      </div>
      <div class="card"><div class="card-h">Silo equipment (transfer chute diverter, discharge gate, rotary airlock, screw conveyor)</div><div class="card-b eqg">${C.silo.map((_, i) => C.alatSilo.map(([t, nm, j, kw]) => kartuAlat(t, nm, j, kw, i)).join("")).join("")}</div></div>`,
    masuk() { $("#eqMan").innerHTML = `<thead><tr><th>Silo</th><th class="num">Level</th><th>Filling</th><th>Discharge</th><th>Discharge rate (t/h)</th><th class="num">Actual in / out</th></tr></thead><tbody>${C.silo.map((k, i) => `<tr><td class="tag">${k[0]}</td><td class="num" id="mL${i}"></td><td><button class="btn kecil" data-isi="${i}" data-on="1">Start</button> <button class="btn kecil" data-isi="${i}" data-on="0">Stop</button></td><td><button class="btn kecil" data-keluar="${i}" data-on="1">Start</button> <button class="btn kecil" data-keluar="${i}" data-on="0">Stop</button></td><td><input type="range" min="0" max="60" step="1" data-laju="${i}" value="${sv(i).lajuKeluar}"> <b id="mQ${i}">${sv(i).lajuKeluar}</b></td><td class="num" id="mIO${i}"></td></tr>`).join("")}</tbody>`; },
    update() {
      const SS = S(), A = SS.alat, run = (o) => o.st === "RUN";
      set("eqMode", SS.auto ? "AUTO MODE" : "MANUAL MODE", "mode-pill " + (SS.auto ? "auto" : "man"));
      const arus = (o, kw, beban) => (o.st === "RUN" ? (kw * 1000 * beban) / (1.732 * 400 * 0.85) : 0);
      C.alat.forEach(([t, , , , kw]) => { const o = A[t]; set("eqs_" + t, STN[o.st], "st " + STC[o.st]); $("#eqc_" + t).className = "eqc " + STC[o.st]; set("eqa_" + t, fmt(arus(o, kw, t.startsWith("CV") || t === "BE-001" || t === "BFD-001" ? (SS.silo.some((s) => s.qin > 0) || t === "CV-003" ? 0.72 : 0.35) : 0.8), 1) + " A"); set("eqh_" + t, fmt(o.h, 0) + " h"); const m = $("#mn_" + t); if (m) m.setAttribute("class", "mn " + STC[o.st]); });
      SS.silo.forEach((s, i) => {
        C.alatSilo.forEach(([t, , , kw]) => { const o = s.eq[t], id = t + i; set("eqs_" + id, STN[o.st], "st " + STC[o.st]); $("#eqc_" + id).className = "eqc " + STC[o.st]; set("eqa_" + id, fmt(arus(o, kw, 0.7), 1) + " A"); set("eqh_" + id, fmt(o.h, 0) + " h"); const m = $(`#mn_SEQ\\:${i}\\:${t}`); if (m) m.setAttribute("class", "mn " + STC[o.st]); });
        const v = s.v, f = $("#mfill" + i); if (f) { const h = Math.max(0, Math.min(1, v.lvlM / G.Hshell)) * 220; f.setAttribute("y", 340 - h); f.setAttribute("height", h); f.setAttribute("class", "sl-fill " + statusSilo(i).w); }
        set("mpct" + i, fmt(v.pct, 1) + " %"); set("mw" + i, fmt(v.berat, 0) + " t");
        $("#fl_in" + i).classList.toggle("off", !(s.qin > 0)); $("#fl_out" + i).classList.toggle("off", !(s.qout > 0));
        set("mL" + i, fmt(v.pct, 1) + " %"); set("mIO" + i, `${fmt(s.qin, 0)} / ${fmt(s.qout, 1)} t/h`); set("mQ" + i, fmt(s.lajuKeluar, 0));
      });
      const isi = SS.silo.some((s) => s.qin > 0); $("#fl_rcv").classList.toggle("off", !isi); $("#fl_gal").classList.toggle("off", !isi);
      $("#fl_cv3").classList.toggle("off", !SS.silo.some((s) => s.qout > 0)); $("#fl_dust").classList.toggle("off", !run(A["DC-001"]));
      set("mStok", `stock ${fmt(SS.stok, 1)} t`);
      $$("[data-isi],[data-keluar],[data-laju],[data-alat]").forEach((b) => (b.disabled = SS.auto && b.dataset.aksi !== "maint" && b.dataset.aksi !== "reset"));
    },
  };

  /* ---------- 7. TREND & HISTORY ---------- */
  P.trend = {
    judul: "Trend & History", ikon: "📈",
    html: () => `${pg("Trend & History", "Level (% & m), berat, suhu, dan distribusi permukaan material (tinggi max/min/rata-rata)")}
      <div class="toolbar"><select id="trSilo"><option value="-1">All silos</option>${C.silo.map((k, i) => `<option value="${i}">${k[1]}</option>`).join("")}</select><span class="sep"></span>
        ${[["rt", "Real time"], ["1h", "1 Hour"], ["8h", "8 Hours"], ["24h", "24 Hours"], ["7d", "7 Days"]].map(([k, l]) => `<button class="btn kecil" data-filter="${k}">${l}</button>`).join("")}<span class="sep"></span>
        <label class="kecil">From <input type="datetime-local" id="trA"></label><label class="kecil">To <input type="datetime-local" id="trB"></label><button class="btn kecil g" data-filter="custom">Custom date</button><span class="muted kecil" id="trInfo"></span></div>
      <div class="grid g2">
        <div class="card"><div class="card-h">Level trend (% & m)</div><div class="card-b"><div class="chart h260"><canvas id="chLvl"></canvas></div></div></div>
        <div class="card"><div class="card-h">Weight trend (t)</div><div class="card-b"><div class="chart h260"><canvas id="chBerat"></canvas></div></div></div>
        <div class="card"><div class="card-h">Temperature trend (°C)</div><div class="card-b"><div class="chart h260"><canvas id="chSuhu"></canvas></div></div></div>
        <div class="card"><div class="card-h">Material distribution trend (surface height)</div><div class="card-b"><div class="chart h260"><canvas id="chDist"></canvas></div></div></div>
      </div>`,
    masuk() {
      $("#trSilo").value = GRAFIK.silo < 0 ? -1 : sel; const T = SIM.S.t, iso = (t) => new Date(t - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      if (!$("#trA").value) { $("#trA").value = iso(T - 2 * 86400000); $("#trB").value = iso(T); }
      GRAFIK.trend(null, GRAFIK.silo < 0 ? -1 : sel);
    },
    update(t) { const f = GRAFIK.filter; if ((f === "rt" && t % 2 === 0) || (f === "1h" && t % 5 === 0) || (f !== "custom" && t % 30 === 0)) GRAFIK.trend(); },
  };

  /* ---------- 8. ALARM & EVENT ---------- */
  const FAULT = [["radar", "Radar failure", 1], ["scanner", "3D scanner comm failure", 1], ["loadcell", "Load cell failure", 1], ["plc", "PLC communication error", 1], ["hot", "Coal hot spot (temp ↑)", 1], ["rv", "Rotary valve jam", 1], ["trip_BE-001", "Bucket elevator trip"], ["trip_CV-003", "CV-003 trip"], ["trip_DC-001", "Dust collector trip"], ["bagclog", "Bag filter clogging"], ["bagrupture", "Bag rupture"]];
  P.alarm = {
    judul: "Alarm & Event", ikon: "🔔",
    html: () => `${pg("Alarm & Event", "Manajemen alarm gaya ISA-18.2: ACTIVE (unack) → ACKNOWLEDGED → CLEARED; RTN UNACK bila kondisi hilang sebelum di-ack")}
      <div class="kpis">${kpi("aCr", "CRITICAL", "", "k-crit")}${kpi("aHi", "HIGH", "", "k-high")}${kpi("aMe", "MEDIUM", "", "k-med")}${kpi("aLo", "LOW", "", "k-low")}${kpi("aUn", "Unacknowledged", "", "k-un")}${kpi("aTot", "History (stored)", "")}</div>
      <div class="grid g-alm">
        <div class="card"><div class="card-h"><div class="btns">${[["aktif", "Active alarms"], ["hist", "Alarm history"], ["event", "Event log"]].map(([k, l]) => `<button class="btn kecil" data-afil="${k}">${l}</button>`).join("")}</div><div class="btns"><button class="btn kecil g" data-ackall>ACK ALL</button><button class="btn kecil" data-pg="log" data-logtab="alarm">Data logger ›</button></div></div><div class="card-b scroll" id="aTbl"></div></div>
        <div class="col">
          <div class="card"><div class="card-h">Fault simulation <span class="simtag">SIMULATION</span></div><div class="card-b"><p class="muted kecil">Gangguan pada silo terpilih: <b id="aSel"></b> (pilih di tab silo)</p>${siloTabs()}
            <div class="fault-g">${FAULT.map(([k, l, s]) => `<button class="btn kecil r" data-fault="${k}">${s ? "◉ " : "⚙ "}${l}</button>`).join("")}</div>
            <div class="sub-h kecil">Level alarm test</div><div class="btns"><button class="btn kecil" data-uji="94">Set 94 % (HH)</button><button class="btn kecil" data-uji="87">Set 87 % (H)</button><button class="btn kecil" data-uji="18">Set 18 % (L)</button><button class="btn kecil" data-uji="8">Set 8 % (LL)</button></div>
            <div class="btns"><button class="btn g" data-pulih>✓ Clear all faults</button></div></div></div>
          <div class="card"><div class="card-h">Status colors</div><div class="card-b leg3d"><div><i style="background:#22c55e"></i>NORMAL</div><div><i style="background:#facc15"></i>WARNING / LOW LEVEL</div><div><i style="background:#ef4444"></i>HIGH LEVEL / HIGH TEMPERATURE / INSTRUMENT FAULT</div><div><i style="background:#94a3b8"></i>COMMUNICATION ERROR</div></div></div>
        </div>
      </div>`,
    update() {
      isiSiloTabs(); set("aSel", C.silo[sel][1]);
      const h = ALARM.hitung(); set("aCr", h.CRITICAL); set("aHi", h.HIGH); set("aMe", h.MEDIUM); set("aLo", h.LOW); set("aUn", h.unack); set("aTot", fmt(ALARM.riwayat.length));
      $$("[data-afil]").forEach((b) => b.classList.toggle("on", b.dataset.afil === filterAlm));
      const kepala = `<thead><tr><th>Alarm ID</th><th>Date / time</th><th>Equipment</th><th>Tag</th><th>Description</th><th>Priority</th><th class="num">Current value</th><th>Status</th><th>Acknowledge</th></tr></thead>`;
      let isi;
      if (filterAlm === "event") isi = `<table class="tbl"><thead><tr><th>Timestamp</th><th>Source</th><th>Event</th></tr></thead><tbody>${ALARM.event.slice(-150).reverse().map((e) => `<tr><td>${waktuStr(e.t)}</td><td class="tag">${e.sumber}</td><td>${e.teks}</td></tr>`).join("")}</tbody></table>`;
      else {
        const L = filterAlm === "aktif" ? ALARM.aktif : ALARM.riwayat.slice(-200).reverse();
        isi = `<table class="tbl alm">${kepala}<tbody>${L.map((a) => `<tr class="p-${a.pri} ${!a.tAck && a.state !== "CLEARED" ? "blink" : ""}"><td class="tag">${a.id}</td><td>${waktuStr(a.tOn)}</td><td>${a.eq}</td><td class="tag">${a.tag}</td><td>${a.desk}</td><td><span class="pri pri-${a.pri}">${a.pri}</span></td><td class="num">${filterAlm === "aktif" ? a.val : a.val0 || a.val}</td><td><span class="ast ast-${a.state.replace(/ /g, "")}">${a.state}</span></td><td>${a.tAck ? `<span class="muted kecil">${jamStr(a.tAck)}</span>` : a.state === "CLEARED" ? "–" : `<button class="btn kecil g" data-ack="${a.key}">ACK</button>`}</td></tr>`).join("") || `<tr><td colspan="9" class="ok-row">✓ ${filterAlm === "aktif" ? "Tidak ada alarm aktif – semua silo NORMAL" : "Belum ada histori alarm"}</td></tr>`}</tbody></table>`;
      }
      const el = $("#aTbl"); if (el.dataset.h !== isi) { el.innerHTML = isi; el.dataset.h = isi; }
    },
  };

  /* ---------- 9. DATA LOGGER ---------- */
  P.log = {
    judul: "Data Logger", ikon: "🗄",
    html: () => `${pg("Data Logger", "Rekaman otomatis tiap 5 menit (waktu simulasi), 7 hari terakhir · cari, filter, rentang tanggal, ekspor Excel/CSV, cetak")}
      <div class="toolbar"><div class="btns">${[["proses", "Process data"], ["alarm", "Alarm history"], ["event", "Event log"]].map(([k, l]) => `<button class="btn kecil" data-logtab="${k}">${l}</button>`).join("")}</div><span class="sep"></span>
        <input type="search" id="lgCari" placeholder="Search tag, silo, value…"><select id="lgSilo"><option value="-1">All silos</option>${C.silo.map((k, i) => `<option value="${i}">${k[0]}</option>`).join("")}</select>
        <select id="lgSt"><option value="all">All status</option><option value="ok">Instrument OK</option><option value="bad">Instrument fault</option></select>
        <label class="kecil">From <input type="datetime-local" id="lgA"></label><label class="kecil">To <input type="datetime-local" id="lgB"></label><button class="btn kecil" data-lg="terap">Apply</button><button class="btn kecil" data-lg="reset">Reset</button></div>
      <div class="card"><div class="card-h"><span><span id="logJml"></span> · <span id="logHal"></span></span><div class="btns"><button class="btn kecil" data-logpg="-1">‹ Prev</button><button class="btn kecil" data-logpg="1">Next ›</button><button class="btn kecil g" data-ekspor="xls">⬇ Excel</button><button class="btn kecil g" data-ekspor="csv">⬇ CSV</button><button class="btn kecil" data-cetak="log">🖨 Print report</button></div></div><div class="card-b scroll" id="logTabel"></div></div>`,
    masuk() { LOGGER.render(); },
    update(t) { if (t % 10 === 0) LOGGER.render(); },
  };

  /* ---------- 10. REPORT ---------- */
  P.report = {
    judul: "Report", ikon: "📄",
    html: () => `${pg("Report", "Laporan operasi silo: inventory, penerimaan, pengeluaran, level, suhu, alarm – siap cetak / Excel")}
      <div class="toolbar">${[["shift", "Shift (8 h)"], ["daily", "Daily"], ["weekly", "Weekly"], ["custom", "Custom"]].map(([k, l]) => `<button class="btn kecil" data-rpjenis="${k}">${l}</button>`).join("")}<span class="sep"></span>
        <label class="kecil">Date <input type="date" id="rpTgl"></label><label class="kecil">From <input type="datetime-local" id="rpA"></label><label class="kecil">To <input type="datetime-local" id="rpB"></label><button class="btn kecil g" data-rp="buat">Generate</button><span class="sep"></span>
        <button class="btn kecil" data-rp="cetak">🖨 Print</button><button class="btn kecil g" data-rp="xls">⬇ Excel</button><button class="btn kecil" data-rp="csv">⬇ CSV</button></div>
      <div class="card"><div class="card-b" id="rpIsi"></div></div>`,
    masuk() { const d = new Date(SIM.S.t); $("#rpTgl").value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; LAPORAN.render(); },
    update(t) { if (t % 30 === 0) LAPORAN.render(); },
  };

  /* ---------- 11. SYSTEM SETTINGS ---------- */
  const BATAS = [["levelHH", "Level High-High", "%"], ["levelH", "Level High", "%"], ["levelL", "Level Low", "%"], ["levelLL", "Level Low-Low", "%"], ["tempH", "Temperature High", "°C"], ["tempHH", "Temperature High-High", "°C"], ["coH", "CO High", "ppm"], ["coHH", "CO High-High", "ppm"], ["debuH", "Dust High", "mg/m³"], ["debuHH", "Dust High-High", "mg/m³"], ["dpBagH", "Bag filter ΔP High", "mbar"], ["tekananH", "Silo pressure High", "mbar"], ["deviasiLC", "Weight vs volume deviation", "%"]];
  function arsitektur() {
    const L = [["FIELD INSTRUMENTS", "3D scanner · radar · load cell · RTD · LSH/LSL · CO/dust", "#0e7490"], ["PLC / REMOTE I/O", "4–20 mA · HART · RS-485 · digital I/O", "#155e75"], ["HAIWELL PLC", "V-register map · interlock · alarm logic", "#1d4ed8"], ["COMMUNICATION", "Modbus TCP · Modbus RTU · OPC UA · MQTT", "#7c3aed"], ["SCADA / GATEWAY", "Haiwell Cloud SCADA · Node-RED · OPC server", "#a21caf"], ["DATABASE", "MySQL (XAMPP) · historian · point cloud files", "#b45309"], ["WEB DASHBOARD", "this application · HTML/CSS/JS · Three.js · Chart.js", "#15803d"]];
    return `<svg viewBox="0 0 1180 150" class="arch">${L.map(([a, b, w], k) => `<g transform="translate(${k * 168},20)"><rect width="150" height="96" rx="10" fill="${w}" opacity=".9"/><text x="75" y="34" class="at">${a}</text>${b.split(" · ").map((s, j) => `<text x="75" y="${54 + j * 13}" class="as">${s}</text>`).join("")}</g>${k < L.length - 1 ? `<path d="M${k * 168 + 152} 68 L${k * 168 + 166} 68" class="aa"/>` : ""}`).join("")}</svg>`;
  }
  P.settings = {
    judul: "System Settings", ikon: "⚒",
    html: () => `${pg("System Settings", "Batas alarm, adapter komunikasi (Modbus TCP/RTU, OPC UA, MQTT), peta register Haiwell PLC, arsitektur sistem, geometri silo")}
      <div class="card"><div class="card-h">System architecture (target integrasi)</div><div class="card-b scroll">${arsitektur()}<p class="muted kecil">Browser tidak dapat membuka Modbus/OPC UA langsung; data lapangan dibaca lewat gateway (JSON/WebSocket/MQTT-WS). Kontur 3D hanya dari 3D level scanner (point cloud), bukan dari radar tunggal.</p></div></div>
      <div class="grid g2">
        <div class="card"><div class="card-h">Alarm limits<div class="btns"><button class="btn kecil g" data-set="simpan">Save</button><button class="btn kecil" data-set="default">Default</button></div></div><div class="card-b"><table class="tbl kv">${BATAS.map(([k, l, u]) => `<tr><td>${l}</td><td class="num"><input type="number" step="0.5" class="inp" data-batas="${k}" value="${C.batas[k]}"> ${u}</td></tr>`).join("")}</table></div></div>
        <div class="card"><div class="card-h">Communication adapter<div class="btns"><button class="btn kecil g" data-kom="simpan">Save & test</button></div></div><div class="card-b">
          <table class="tbl kv"><tr><td>Mode</td><td><select id="kmMode">${KOMUNIKASI.MODE.map((m) => `<option ${m === KOMUNIKASI.K.mode ? "selected" : ""}>${m}</option>`).join("")}</select></td></tr>
          <tr><td>Gateway URL (JSON)</td><td><input class="inp w" id="kmGw" value="${KOMUNIKASI.K.gateway || "api/realtime.php"}"></td></tr>
          <tr><td>Modbus TCP IP / port / unit</td><td><input class="inp" id="kmIp" value="${KOMUNIKASI.K.modbusTCP.ip}"> <input class="inp s" id="kmPort" value="${KOMUNIKASI.K.modbusTCP.port}"> <input class="inp s" id="kmUid" value="${KOMUNIKASI.K.modbusTCP.unitId}"></td></tr>
          <tr><td>Modbus RTU port / baud / format</td><td><input class="inp s" id="kmCom" value="${KOMUNIKASI.K.modbusRTU.port}"> <input class="inp s" id="kmBaud" value="${KOMUNIKASI.K.modbusRTU.baud}"> <input class="inp s" id="kmFmt" value="${KOMUNIKASI.K.modbusRTU.format}"></td></tr>
          <tr><td>OPC UA endpoint</td><td><input class="inp w" id="kmOpc" value="${KOMUNIKASI.K.opcua.endpoint}"></td></tr>
          <tr><td>MQTT broker (WebSocket) / topic</td><td><input class="inp w" id="kmMq" value="${KOMUNIKASI.K.mqtt.broker}"> <input class="inp" id="kmTp" value="${KOMUNIKASI.K.mqtt.topik}"></td></tr></table>
          <div class="note" id="kmSt">–</div></div></div>
      </div>
      <div class="card"><div class="card-h">Haiwell PLC register map (contoh – sesuaikan dengan program PLC)<div class="btns"><select id="rmSilo">${C.silo.map((k, i) => `<option value="${i}">${k[0]}</option>`).join("")}</select><button class="btn kecil g" data-rm="csv">⬇ CSV</button></div></div><div class="card-b scroll"><p class="muted kecil">REAL 32-bit = 2 register berurutan (urutan word CD AB / low word dulu). Alamat Modbus 0-based = 512 + V; HMI/SCADA pihak ketiga 1-based = 40513 + V (contoh V100 → 40613). Bit M: 0x 3072 + M. Instruksi MODR/MODW di Haiwell memakai alamat 0-based (tanpa +1).</p><div id="rmTbl"></div></div></div>
      <div class="grid g2">
        <div class="card"><div class="card-h">Gateway JSON format (live snapshot)<button class="btn kecil" data-json>⟳</button></div><div class="card-b"><pre class="json" id="kmJson"></pre></div></div>
        <div class="card"><div class="card-h">Silo geometry & material</div><div class="card-b"><table class="tbl kv">${[["Material", C.material + " – " + C.jenisBatubara], ["Diameter", fmt(G.D, 1) + " m"], ["Hopper height / outlet Ø", `${fmt(G.Hh, 1)} m / ${fmt(G.d0, 2)} m`], ["Hopper volume", fmt(G.Vh, 1) + " m³"], ["Max fill height (100 %)", fmt(G.Hfill, 2) + " m from outlet"], ["Shell height (outlet → roof edge)", fmt(G.Hshell, 2) + " m"], ["Working volume", fmt(G.Vkerja, 0) + " m³"], ["Bulk density", fmt(C.densitas, 2) + " t/m³"], ["Capacity per silo", fmt(C.kapasitas) + " t"], ["Outlet elevation", fmt(G.elevasi, 1) + " m above ground"], ["Level % definition", "volumetric = weight ÷ capacity"]].map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("")}</table>
          <div class="btns"><label class="kecil">Simulation speed <select data-speed2>${[1, 10, 60, 300].map((x) => `<option value="${x}" ${x === S().speed ? "selected" : ""}>${x}×</option>`).join("")}</select></label><button class="btn kecil r" data-resetsim>Clear history & restart</button></div></div></div>
      </div>`,
    masuk() { rmTabel(); set("kmSt", KOMUNIKASI.status.teks); $("#kmJson").textContent = KOMUNIKASI.contohJSON(); },
    update(t) { if (t % 5 === 0 && $("#kmJson")) $("#kmJson").textContent = KOMUNIKASI.contohJSON(); },
  };
  function rmTabel() {
    const i = +($("#rmSilo") ? $("#rmSilo").value : 0), L = KOMUNIKASI.petaRegister().filter((r) => r.i === i), s = sv(i);
    $("#rmTbl").innerHTML = `<table class="tbl"><thead><tr><th>Silo</th><th>Point</th><th>Description</th><th>Type</th><th>Haiwell</th><th class="num">Modbus 0-based</th><th class="num">1-based</th><th>FC</th><th class="num">Live value (SIM)</th><th>Unit</th></tr></thead><tbody>${L.map((r) => { let x = ""; try { x = r.get ? r.get(s.v, s) : ""; } catch (e) { x = ""; } return `<tr><td>${r.silo}</td><td class="tag">${r.kode}</td><td>${r.nama}</td><td>${r.tipe}</td><td class="tag">${r.V}</td><td class="num">${r.mb0}</td><td class="num">${r.mb1}</td><td>${r.fc}</td><td class="num">${typeof x === "number" ? fmt(x, 2) : x}</td><td>${r.sat}</td></tr>`; }).join("")}</tbody></table>`;
  }

  /* =====================================================
     DETAIL MODAL (klik 3D / tabel / mimic)
     ===================================================== */
  function detail(kunci) {
    const [jenis, a, b] = kunci.split(":"), SS = S();
    if (jenis === "SILO") {
      const i = +a, v = V(i), st = SIM.ST[i] || {}, s2 = statusSilo(i);
      return { judul: C.silo[i][1], status: `<span class="st ${WST[s2.w]}">${s2.st}</span>`, baris: [["Level", `${fmt(v.pct, 1)} % · ${fmt(v.lvlM, 2)} m`], ["Weight / capacity", `${fmt(v.berat, 1)} / ${fmt(C.kapasitas)} t`], ["Available capacity", fmt(v.avail, 1) + " t"], ["Volume", fmt(v.vol, 1) + " m³"], ["Max / min height", `${fmt(st.max, 2)} / ${fmt(st.min, 2)} m`], ["Surface profile", st.profil || ""], ["Temp avg / max", `${fmt(v.Tavg, 1)} / ${fmt(v.Tmax, 1)} °C`], ["Filling / discharge", `${fmt(sv(i).qin, 0)} / ${fmt(sv(i).qout, 1)} t/h`]],
        tren: [1, "Level (%)", "#22d3ee", i], alarm: ALARM.untukSilo(i), tombol: `<button class="btn kecil g" data-detail="${i}">3D view</button><button class="btn kecil" data-kontur="${i}">Contour</button><button class="btn kecil" data-pilih="${i}" data-pg="inst">Instruments</button>` };
    }
    if (jenis === "INST") {
      const i = +a, x = instrumen(i).find((q) => q.tag === b) || { tag: b, nama: b, teks: "–", st: "–", w: "grey", alm: [] };
      const kol = x.kat === "RADAR" || x.kat === "SCANNER" ? [2, "Level (m)", "#a78bfa"] : x.kat === "WEIGHT" ? [3, "Weight (t)", "#4ade80"] : x.kat === "TEMP" ? [5, "Max temp (°C)", "#ef4444"] : [1, "Level (%)", "#22d3ee"];
      return { judul: `${x.tag} · ${x.nama}`, status: `<span class="st ${WST[x.w]}">${x.st}</span>`, baris: [["Silo", C.silo[i][1]], ["Live value", `${x.teks} ${x.unit}`], ["Status", x.st], ["Category", x.kat], ["Data source", "SIMULATION"]], tren: [...kol, i], alarm: x.alm, tombol: x.kat === "SCANNER" ? `<button class="btn kecil g" data-scan="${i}">▶ Request scan</button>` : "" };
    }
    if (jenis === "EQ" || jenis === "SEQ") {
      const i = jenis === "SEQ" ? +a : undefined, tag = jenis === "SEQ" ? b : a, o = i === undefined ? SS.alat[tag] : SS.silo[i].eq[tag];
      const def = i === undefined ? C.alat.find((q) => q[0] === tag) : C.alatSilo.find((q) => q[0] === tag), nm = def[1], lbl = i === undefined ? tag : `${tag}-${i + 1}5${C.alatSilo.indexOf(def)}`;
      const ex = tag === "BF-001" ? [["Bag filter ΔP", fmt(SS.bag.dp, 1) + " mbar"], ["Stack dust", fmt(SS.bag.debu, 1) + " mg/m³"]] : tag === "BFD-001" ? [["Hopper stock", fmt(SS.stok, 1) + " t"]] : tag === "RV" ? [["Rotor speed", fmt(SS.silo[i].v.rvRpm, 1) + " rpm"]] : tag === "XV" ? [["Gate position", fmt(SS.silo[i].v.gate, 0) + " %"]] : [];
      return { judul: `${lbl} · ${nm}`, status: `<span class="st ${STC[o.st]}">${STN[o.st]}</span>`, baris: [["Type", i === undefined ? def[2] : def[2]], ["Area / silo", i === undefined ? def[3] : C.silo[i][1]], ["Status", STN[o.st]], ["Running hours", fmt(o.h, 1) + " h"], ["Mode", SS.auto ? "AUTO" : "MANUAL"], ...ex], tren: null, alarm: ALARM.aktif.filter((x) => x.tag === lbl || x.tag === tag),
        tombol: ["start", "stop", "maint", "reset"].map((q) => `<button class="btn kecil ${q === "start" ? "g" : q === "stop" ? "r" : ""}" data-alat="${tag}" data-aksi="${q}" ${i !== undefined ? `data-si="${i}"` : ""}>${q.toUpperCase()}</button>`).join("") };
    }
    return { judul: kunci, status: "", baris: [], tren: null, alarm: [], tombol: "" };
  }

  return {
    P, detail, foto, tampilKv, gambarKv, rmTabel, instrumen, BATAS,
    get sel() { return sel; }, set sel(i) { sel = i; },
    get kv() { return kv; }, set kv(x) { kv = x; }, set sudut(x) { sudutPotong = x; }, set filterAlm(x) { filterAlm = x; },
  };
})();
