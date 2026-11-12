/* =========================================================
   PAGES.JS — ISI 15 HALAMAN SCADA
   Tiap halaman punya: html() → dibuat sekali, update() → tiap detik.
   ========================================================= */
const HAL = (() => {
  const C = CONFIG;
  const V = () => SIM.V;

  /* ---------------- KOMPONEN KECIL ---------------- */
  const kpi = (id, label, unit, ikon = "", kelas = "") => `<div class="kpi ${kelas}"><div class="kpi-l">${ikon} ${label}</div><div class="kpi-v"><b id="${id}">–</b><span>${unit}</span></div><div class="kpi-s" id="${id}_s">&nbsp;</div></div>`;
  const kartu = (judul, isi, kelas = "", ekstra = "") => `<div class="card ${kelas}"><div class="card-h"><span>${judul}</span>${ekstra}</div><div class="card-b">${isi}</div></div>`;
  const tabelInst = (baris) => `<table class="tbl inst"><thead><tr><th>Tag</th><th>Instrument</th><th>Parameter</th><th class="num">Value</th><th>Unit</th><th>Status</th></tr></thead><tbody>
    ${baris.map(([tag, inst, par, unit, id]) => `<tr><td class="tag">${tag}</td><td>${inst}</td><td>${par}</td><td class="num"><b id="${id}">–</b></td><td>${unit}</td><td><span class="st" id="${id}_st">OK</span></td></tr>`).join("")}</tbody></table>`;
  const daftar = (baris) => `<table class="tbl kv">${baris.map(([l, id, u = ""]) => `<tr><td>${l}</td><td class="num"><b id="${id}">–</b> <small>${u}</small></td></tr>`).join("")}</table>`;
  const grafik = (id, tinggi = 230) => `<div class="chart" style="height:${tinggi}px"><canvas id="${id}"></canvas></div>`;
  const simTag = `<span class="simtag">SIMULATION</span>`;
  const judul = (j, sub) => `<div class="pg-h"><div><h2>${j}</h2><p>${sub}</p></div>${simTag}</div>`;
  function status(id, tingkat, teks) {            // tingkat: ok | warn | crit | off
    const el = document.getElementById(id); if (!el) return;
    el.className = "st st-" + tingkat; if (teks !== undefined && el.textContent !== teks) el.textContent = teks;
  }
  const lv = (x, warn, crit, kebalik = false) => (kebalik ? (x <= crit ? "crit" : x <= warn ? "warn" : "ok") : x >= crit ? "crit" : x >= warn ? "warn" : "ok");
  const stInv = { RUNNING: "ok", STANDBY: "warn", STOP: "warn", FAULT: "crit", "COMM LOSS": "off" };

  /* ---------------- DIAGRAM ALIRAN DAYA (SVG) ---------------- */
  function sld(compact) {
    const id = compact ? "f" : "s";
    const kotakN = (x, y, w, h, teks, sub, kls, kunci) => `<g class="node ${kls}" ${kunci ? `data-buka="${kunci}"` : ""}><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="7"/><text x="${x}" y="${y - (sub ? 4 : -4)}" class="nt">${teks}</text>${sub ? `<text x="${x}" y="${y + 13}" class="nv" id="${sub}">–</text>` : ""}</g>`;
    const cb = (x, y, k) => `<g class="cb" data-cbtog="${k}"><rect id="${id}cb${k}" x="${x - 11}" y="${y - 11}" width="22" height="22" rx="3"/><text x="${x + 18}" y="${y + 4}" class="cbt">CB-${k}</text><text x="${x + 18}" y="${y + 17}" class="cbs" id="${id}cbs${k}">CLOSED</text></g>`;
    const trafo = (x, y, t) => `<g class="tr"><circle cx="${x}" cy="${y - 7}" r="11"/><circle cx="${x}" cy="${y + 7}" r="11"/><text x="${x + 18}" y="${y + 4}" class="cbt">${t}</text></g>`;
    const garis = (gid, d) => `<path id="${gid}" class="flow" d="${d}"/>`;
    if (compact) {
      return `<svg viewBox="0 0 420 330" class="sld mini">
        ${garis("fl_pv", "M70 70 V140 H210")}${garis("fl_bess", "M170 70 V140")}${garis("fl_dg", "M270 70 V140")}${garis("fl_grid", "M370 70 V140 H210")}
        ${garis("fl_fac", "M210 160 H110 V240")}${garis("fl_res", "M210 160 H310 V240")}
        <line x1="40" y1="150" x2="380" y2="150" class="bus"/><text x="210" y="178" class="bust" text-anchor="middle">BUS 20 kV · <tspan id="fb_v">–</tspan></text>
        ${kotakN(70, 45, 92, 44, "☀ SOLAR", "fn_pv", "n-pv", "pv")}${kotakN(170, 45, 92, 44, "🔋 BESS", "fn_bess", "n-bess", "bess")}
        ${kotakN(250 + 20, 45, 92, 44, "⛽ DIESEL", "fn_dg", "n-dg", "dg")}${kotakN(370, 45, 84, 44, "🗼 GRID", "fn_grid", "n-grid", "dist")}
        ${kotakN(110, 268, 120, 48, "🏭 FACTORY", "fn_fac", "n-fac", "fac")}${kotakN(310, 268, 120, 48, "🏘 HOUSING", "fn_res", "n-res", "res")}
      </svg>`;
    }
    return `<svg viewBox="0 0 1100 560" class="sld">
      <text x="550" y="22" class="sldj">SINGLE LINE DIAGRAM – GREEN ENERGY CAMPUS (SIMULATION)</text>
      ${garis("sl_pv", "M150 62 V300")}${garis("sl_bess", "M350 120 V300")}${garis("sl_dg", "M550 150 V300")}${garis("sl_grid", "M800 112 V300")}
      ${garis("sl_fac", "M400 300 V490")}${garis("sl_res", "M700 300 V490")}
      ${kotakN(150, 46, 150, 34, "SOLAR PV ARRAY 6 MWp", "", "n-pv", "pv")}
      ${kotakN(150, 105, 150, 30, "DC COMBINER BOX", "", "n-pv", "pv")}
      ${kotakN(150, 160, 150, 40, "SOLAR INVERTER ×6", "sn_pv", "n-pv", "inv")}
      ${trafo(150, 215, "TR-PV 0,8/20 kV")}
      ${kotakN(350, 102, 170, 40, "BESS 8 MWh", "sn_bess", "n-bess", "bess")}${kotakN(350, 158, 120, 30, "PCS 3 MW", "", "n-bess", "bess")}${trafo(350, 215, "TR-BESS")}
      ${kotakN(550, 130, 150, 44, "DIESEL GEN 2 MVA", "sn_dg", "n-dg", "dg")}${trafo(550, 215, "TR-DG 0,4/20 kV")}
      ${kotakN(800, 92, 160, 42, "UTILITY GRID 20 kV", "sn_grid", "n-grid", "dist")}${kotakN(800, 160, 190, 30, "kWh EXPORT/IMPORT METER", "", "n-grid", "dist")}
      ${cb(150, 262, "PV")}${cb(350, 262, "BESS")}${cb(550, 262, "DG")}${cb(800, 262, "GRID")}
      <line x1="70" y1="300" x2="1030" y2="300" class="bus"/>
      <text x="1030" y="324" class="bust" text-anchor="end">MAIN BUS 20 kV · <tspan id="sb_v">–</tspan> · <tspan id="sb_f">–</tspan></text>
      ${cb(400, 340, "FAC")}${cb(700, 340, "RES")}
      ${trafo(400, 400, "TR-FAC 20/0,4 kV 4 MVA")}${trafo(700, 400, "TR-RES 20/0,4 kV 630 kVA")}
      ${kotakN(400, 480, 190, 52, "🏭 FACTORY FEEDER", "sn_fac", "n-fac", "fac")}${kotakN(700, 480, 190, 52, "🏘 RESIDENTIAL FEEDER", "sn_res", "n-res", "res")}
      <text x="70" y="545" class="cbs">Klik simbol CB untuk membuka / menutup breaker · garis bergerak = aliran daya (arah & kecepatan sesuai beban)</text>
    </svg>`;
  }
  function updateAliran(pref, kunci, nilai, maks) {
    const el = document.getElementById(pref + kunci); if (!el) return;
    const a = Math.abs(nilai);
    el.classList.toggle("off", a < 1); el.classList.toggle("rev", nilai < 0);
    el.style.animationDuration = a < 1 ? "" : `${Math.max(0.35, 2.4 - (a / maks) * 2)}s`;
  }
  function updateSLD(compact) {
    const v = V(), p = compact ? "f" : "s";
    updateAliran(p === "f" ? "fl_" : "sl_", "pv", v.pvAC, 5000);
    updateAliran(p === "f" ? "fl_" : "sl_", "bess", v.bess.p, 3000);
    updateAliran(p === "f" ? "fl_" : "sl_", "dg", v.pDG, 1600);
    updateAliran(p === "f" ? "fl_" : "sl_", "grid", v.grid.imp - v.grid.exp, 2500);
    updateAliran(p === "f" ? "fl_" : "sl_", "fac", v.fac.p, 3000);
    updateAliran(p === "f" ? "fl_" : "sl_", "res", v.res.p, 400);
    const b = v.bess;
    if (compact) {
      set("fn_pv", `${fmt(v.pvAC)} kW`); set("fn_bess", `${b.status === "DISCHARGING" ? "▲" : b.status === "CHARGING" ? "▼" : "■"} ${fmt(Math.abs(b.p))} kW`);
      set("fn_dg", v.dg.state === "RUN" ? `${fmt(v.pDG)} kW` : v.dg.state); set("fn_grid", !v.grid.ok ? "FAILURE" : v.grid.imp > 1 ? `▼ ${fmt(v.grid.imp)} kW` : v.grid.exp > 1 ? `▲ ${fmt(v.grid.exp)} kW` : "0 kW");
      set("fn_fac", `${fmt(v.fac.p)} kW`); set("fn_res", `${fmt(v.res.p)} kW`); set("fb_v", `${fmt(v.bus.v / 1000, 2)} kV · ${fmt(v.bus.f, 2)} Hz`);
    } else {
      set("sn_pv", `${fmt(v.pvAC)} kW · ${v.inv.filter((x) => x.status === "RUNNING").length}/6 run`); set("sn_bess", `${b.status === "CHARGING" ? "▼" : b.status === "DISCHARGING" ? "▲" : "■"} ${fmt(Math.abs(b.p))} kW · ${fmt(b.soc)}%`);
      set("sn_dg", `${v.dg.state} · ${fmt(v.pDG)} kW`); set("sn_grid", !v.grid.ok ? "GRID FAILURE" : v.grid.imp > 1 ? `Import ${fmt(v.grid.imp)} kW` : v.grid.exp > 1 ? `Export ${fmt(v.grid.exp)} kW` : "No exchange");
      set("sn_fac", `${fmt(v.fac.p)} kW · ${v.fac.supply}`); set("sn_res", `${fmt(v.res.p)} kW · ${v.res.supply}`);
      set("sb_v", `${fmt(v.bus.v / 1000, 2)} kV`); set("sb_f", `${fmt(v.bus.f, 2)} Hz`);
    }
    for (const k in v.cb) {
      const s = v.cb[k], r = document.getElementById(p + "cb" + k);
      if (r) r.setAttribute("class", "cbr " + (s === "CLOSED" ? "cb-on" : s === "TRIP" ? "cb-trip" : "cb-off"));
      set(p + "cbs" + k, s);
    }
    $$(".n-grid").forEach((n) => n.classList.toggle("mati", !v.grid.ok));
    $$(".n-dg").forEach((n) => n.classList.toggle("mati", v.dg.state !== "RUN"));
    $$(".n-fac").forEach((n) => n.classList.toggle("mati", v.fac.supply !== "ENERGIZED"));
    $$(".n-res").forEach((n) => n.classList.toggle("mati", v.res.supply !== "ENERGIZED"));
  }

  /* ======================================================
     DEFINISI HALAMAN
     ====================================================== */
  const P = {};

  /* 1. PLANT OVERVIEW */
  P.overview = {
    judul: "Plant Overview", ikon: "🏠",
    html: () => `${judul("Plant Overview", "Ringkasan seluruh kampus energi hijau – pembangkitan, penyimpanan, distribusi & beban")}
      <div class="kpis">
        ${kpi("o_pv", "Solar Power", "kW", "☀", "k-pv")}${kpi("o_bess", "Battery SOC", "%", "🔋", "k-bess")}${kpi("o_dg", "Diesel Generator", "kW", "⛽", "k-dg")}${kpi("o_grid", "Grid Exchange", "kW", "🗼", "k-grid")}
        ${kpi("o_fac", "Factory Load", "kW", "🏭", "k-fac")}${kpi("o_res", "Residential Load", "kW", "🏘", "k-res")}${kpi("o_re", "Renewable Share", "%", "🌿", "k-re")}${kpi("o_e", "Solar Energy Today", "MWh", "⚡", "k-pv")}
      </div>
      <div class="grid g-ov">
        <div class="card c3d"><div class="card-h"><span>3D Green Energy Campus</span><span class="muted">Seret: putar · Klik kanan/Shift: geser · Scroll: zoom · Klik peralatan: detail</span></div><div class="h3d" id="h3d-ov"></div></div>
        <div class="col">
          ${kartu("Power Flow (live)", sld(true), "", '<a class="lnk" data-pg="dist">SLD ›</a>')}
          ${kartu("Active Alarms", '<div id="ovAlm" class="alm-mini"></div>', "", '<a class="lnk" data-pg="alarm">Semua ›</a>')}
          ${kartu("Equipment Status", '<div id="ovEq" class="eq-grid"></div>')}
        </div>
      </div>`,
    masuk: () => Kampus3D.pasang($("#h3d-ov")),
    update() {
      const v = V(), E = SIM.S.E.day, b = v.bess;
      set("o_pv", fmt(v.pvAC)); set("o_pv_s", `dari ${fmt(v.kWp / 1000, 1)} MWp · PR ${fmt(v.pr, 1)}%`);
      set("o_bess", fmt(b.soc, 1)); set("o_bess_s", `${b.status} ${fmt(Math.abs(b.p))} kW`);
      set("o_dg", fmt(v.pDG)); set("o_dg_s", `${v.dg.state} · ${fmt(v.dg.fuelLh)} L/h`);
      set("o_grid", fmt(v.grid.imp - v.grid.exp)); set("o_grid_s", !v.grid.ok ? "GRID FAILURE" : v.grid.imp > 1 ? "Import dari PLN" : v.grid.exp > 1 ? "Ekspor ke PLN" : "Tidak ada pertukaran");
      set("o_fac", fmt(v.fac.p)); set("o_fac_s", v.fac.supply); set("o_res", fmt(v.res.p)); set("o_res_s", `${v.res.rumah} rumah tersambung`);
      set("o_re", fmt(v.re)); set("o_re_s", `CO₂ dihindari hari ini ${fmt(E.pv * C.emisi.gridKgPerKWh / 1000, 2)} t`);
      set("o_e", fmt(E.pv / 1000, 2)); set("o_e_s", `Diesel ${fmt(E.dg / 1000, 2)} MWh · Beban ${fmt((E.fac + E.res) / 1000, 1)} MWh`);
      updateSLD(true);
      const a = ALARM.aktif.slice(0, 5);
      $("#ovAlm").innerHTML = a.length ? a.map((x) => `<div class="am sev-${x.sev}"><b>${x.tag}</b> ${x.desk}<small>${jamStr(x.tOn)}</small></div>`).join("") : '<div class="am ok">✓ Tidak ada alarm aktif</div>';
      const eq = [...v.inv.map((x) => [x.id, stInv[x.status], x.status]), ["BESS", b.status === "OFFLINE" ? "off" : b.status === "FAULT" ? "crit" : "ok", b.status], ["DG-01", v.dg.state === "FAULT" ? "crit" : v.dg.state === "RUN" ? "ok" : "warn", v.dg.state],
        ...Object.keys(v.cb).map((k) => ["CB-" + k, v.cb[k] === "CLOSED" ? "ok" : "crit", v.cb[k]])];
      $("#ovEq").innerHTML = eq.map(([n, t, s]) => `<div class="eq st-${t}"><i></i><b>${n}</b><small>${s}</small></div>`).join("");
    },
  };

  /* 2. 3D PLANT VISUALIZATION */
  P.viz = {
    judul: "3D Plant Visualization", ikon: "🧊",
    html: () => `${judul("3D Plant Visualization", "Kampus hijau: PV field, inverter, BESS, genset & tangki BBM, gardu 20 kV, pabrik, perumahan, taman & danau")}
      <div class="toolbar">${Object.keys(Kampus3D.PRESET).map((k) => `<button class="btn" data-cam="${k}">${k}</button>`).join("")}
        <span class="sep"></span><button class="btn on" data-tog="label">🏷 Labels</button><button class="btn on" data-tog="aliran">⚡ Power flow</button><button class="btn" data-tog="rotate">🔄 Auto-rotate</button></div>
      <div class="card c3d tinggi"><div class="h3d" id="h3d-viz"></div></div>
      <p class="muted kecil">Siang–malam, awan, dan lampu mengikuti jam SIMULASI. Partikel bergerak = aliran daya: kuning (solar), cyan (BESS), oranye (diesel), ungu (grid), biru (pabrik), hijau (perumahan).</p>`,
    masuk: () => Kampus3D.pasang($("#h3d-viz")),
    update() {},
  };

  /* 3. SOLAR PV MONITORING */
  P.pv = {
    judul: "Solar PV Monitoring", ikon: "☀",
    html: () => `${judul("Solar PV Monitoring", `6 PV array · ${fmt(C.pv.array * C.pv.kWpPerArray / 1000, 1)} MWp · modul ${C.pv.modulWp} Wp`)}
      <div class="kpis">${kpi("pv_cap", "Installed Capacity", "MWp", "🔆")}${kpi("pv_p", "Active Solar Power", "kW", "⚡", "k-pv")}${kpi("pv_d", "Today", "kWh", "📅")}${kpi("pv_m", "This Month", "MWh", "🗓")}${kpi("pv_y", "This Year", "MWh", "📈")}${kpi("pv_pr", "Performance Ratio", "%", "🎯")}${kpi("pv_av", "Availability", "%", "✅")}</div>
      <div class="grid g2">
        ${kartu("Field Instrumentation", tabelInst([
          ["SI-101", "Pyranometer", "Solar Irradiance", "W/m²", "i_si"], ["TIT-101", "Module Temperature", "Solar Panel Temperature", "°C", "i_tm"], ["TIT-102", "Ambient Temperature", "Ambient Temperature", "°C", "i_ta"],
          ["VIT-101", "DC Voltage Transmitter", "DC Voltage (avg)", "V", "i_vdc"], ["IIT-101", "DC Current Transmitter", "DC Current (total)", "A", "i_idc"], ["PIT-101", "DC Power Meter", "DC Power", "kW", "i_pdc"],
          ["SIT-101", "String Current Monitoring", "String Current (avg)", "A", "i_str"], ["EIT-101", "Solar Energy Meter", "Generated Energy (today)", "kWh", "i_e"], ["WST-101", "Wind Sensor", "Wind Speed", "m/s", "i_ws"]]))}
        ${kartu("Irradiance vs Solar Power – Today", grafik("cPV", 300))}
      </div>
      <div class="sub-h">Individual PV Array Status</div><div class="grid g3" id="pvArr"></div>`,
    update() {
      const v = V(), E = SIM.S.E;
      set("pv_cap", fmt(v.kWp / 1000, 1)); set("pv_cap_s", `${fmt((v.kWp * 1000) / C.pv.modulWp)} modul`);
      set("pv_p", fmt(v.pvAC)); set("pv_p_s", `DC ${fmt(v.pvDC)} kW · curtail ${fmt(v.curt)} kW`);
      set("pv_d", fmt(E.day.pv)); set("pv_m", fmt(E.month.pv / 1000, 1)); set("pv_y", fmt(E.year.pv / 1000, 0));
      set("pv_pr", fmt(v.pr, 1)); set("pv_pr_s", `Iradiasi ${fmt(E.day.H, 2)} kWh/m²`); set("pv_av", fmt(v.avail, 1));
      const isi = [["i_si", v.G, 0, lv(v.G, 9e9, 9e9)], ["i_tm", v.Tmod, 1, lv(v.Tmod, 65, 75)], ["i_ta", v.Tamb, 1, lv(v.Tamb, 38, 42)], ["i_vdc", v.vdc, 0, "ok"], ["i_idc", v.idc, 0, "ok"], ["i_pdc", v.pvDC, 0, "ok"], ["i_str", v.strI, 2, "ok"], ["i_e", E.day.pv, 0, "ok"], ["i_ws", v.wind, 1, lv(v.wind, 15, 20)]];
      isi.forEach(([id, x, d, t]) => { set(id, fmt(x, d)); status(id + "_st", t, t === "ok" ? "OK" : t === "warn" ? "HIGH" : "HH"); });
      $("#pvArr").innerHTML = v.inv.map((x, i) => `<div class="arr st-${stInv[x.status]}" data-buka="INV-0${i + 1}"><div class="arr-h"><b>PV-A${i + 1}</b><span class="st st-${stInv[x.status]}">${x.status}</span></div>
        <div class="arr-v">${fmt(x.pdc)} <small>kW DC</small></div><div class="bar"><i style="width:${Math.min(100, (x.pdc / C.pv.kWpPerArray) * 100)}%"></i></div>
        <div class="arr-g"><span>DC ${fmt(x.vdc)} V · ${fmt(x.idc)} A</span><span>String ${fmt(x.strI, 2)} A</span><span>${fmt(C.pv.kWpPerArray)} kWp</span><span>Hari ini ${fmt(x.eDay)} kWh</span></div></div>`).join("");
      GRAFIK.kecil("cPV", ["pv", "G"], ["Solar power (kW)", "Irradiance (W/m²)"], [GRAFIK.WARNA.pv, GRAFIK.WARNA.G], { y1: true });
    },
  };

  /* 4. INVERTER MONITORING */
  P.inv = {
    judul: "Inverter Monitoring", ikon: "🔌",
    html: () => `${judul("Solar Inverter Monitoring", `6 × ${C.pv.inverterKW} kW central inverter · ${C.pv.vAC} V AC · trafo step-up 0,8/20 kV`)}
      <div class="kpis">${kpi("iv_run", "Running", "unit", "🟢")}${kpi("iv_stop", "Stop / Standby", "unit", "🟡")}${kpi("iv_flt", "Fault", "unit", "🔴")}${kpi("iv_com", "Comm Loss", "unit", "⚪")}${kpi("iv_p", "Total AC Power", "kW", "⚡", "k-pv")}${kpi("iv_e", "Energy Today", "kWh", "📅")}</div>
      <div class="grid g3" id="invGrid"></div>`,
    update() {
      const v = V(), n = (s) => v.inv.filter((x) => x.status === s).length;
      set("iv_run", n("RUNNING")); set("iv_stop", n("STOP") + n("STANDBY")); set("iv_flt", n("FAULT")); set("iv_com", n("COMM LOSS")); set("iv_p", fmt(v.pvAC)); set("iv_e", fmt(SIM.S.E.day.pv));
      const g = $("#invGrid");
      if (!g.children.length) g.innerHTML = v.inv.map((x, i) => `<div class="card inv"><div class="card-h"><span>${x.id} <small class="muted">PV-A${i + 1}</small></span><span class="st" id="iv${i}_st">–</span></div><div class="card-b">
        ${daftar([["DC Input Voltage", `iv${i}_vdc`, "V"], ["DC Input Current", `iv${i}_idc`, "A"], ["AC Output Voltage", `iv${i}_vac`, "V"], ["AC Output Current", `iv${i}_iac`, "A"], ["Active Power", `iv${i}_p`, "kW"], ["Reactive Power", `iv${i}_q`, "kVAR"], ["Apparent Power", `iv${i}_s`, "kVA"], ["Frequency", `iv${i}_f`, "Hz"], ["Power Factor", `iv${i}_pf`, ""], ["Conversion Efficiency", `iv${i}_ef`, "%"], ["Daily Energy Output", `iv${i}_ed`, "kWh"], ["Total Energy Output", `iv${i}_et`, "MWh"], ["Inverter Temperature", `iv${i}_t`, "°C"]])}
        <div class="btns"><button class="btn g" data-inv="${i}" data-aksi="start">▶ Start</button><button class="btn r" data-inv="${i}" data-aksi="stop">■ Stop</button><button class="btn" data-inv="${i}" data-aksi="reset">↺ Reset</button></div></div></div>`).join("");
      v.inv.forEach((x, i) => {
        status(`iv${i}_st`, stInv[x.status], x.status);
        [["vdc", x.vdc, 0], ["idc", x.idc, 0], ["vac", x.vac, 0], ["iac", x.iac, 0], ["p", x.pac, 1], ["q", x.q, 1], ["s", x.s, 1], ["f", x.f, 2], ["pf", x.pf, 3], ["ef", x.eff, 1], ["ed", x.eDay, 0], ["et", x.eTot, 1], ["t", x.temp, 1]].forEach(([k, val, d]) => set(`iv${i}_${k}`, fmt(val, d)));
      });
    },
  };

  /* 5. BESS */
  P.bess = {
    judul: "Battery Energy Storage", ikon: "🔋",
    html: () => `${judul("Battery Energy Storage System (BESS)", `${C.bess.container} container · ${fmt(C.bess.kWh)} kWh · PCS ${fmt(C.bess.pcsKW)} kW · LFP`)}
      <div class="grid g-bess">
        ${kartu("State of Charge", `<div class="soc"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" class="soc-bg"/><circle cx="100" cy="100" r="80" class="soc-fg" id="socRing"/></svg><div class="soc-t"><b id="b_soc">–</b><span>% SOC</span><em id="b_stat">–</em></div></div>
          <div class="btns c">${["AUTO", "CHARGE", "DISCHARGE", "STANDBY"].map((m) => `<button class="btn" data-bmode="${m}">${m}</button>`).join("")}</div><p class="muted kecil c">Mode AUTO: EMS mengisi saat surplus solar & mengosongkan saat defisit.</p>`)}
        ${kartu("BESS Parameters", daftar([["Battery Voltage", "b_v", "V"], ["Battery Current", "b_i", "A"], ["Charging Power", "b_ch", "kW"], ["Discharging Power", "b_dis", "kW"], ["State of Health (SOH)", "b_soh", "%"], ["Battery Temperature", "b_t", "°C"], ["Battery Capacity", "b_cap", "kWh"], ["Remaining Battery Energy", "b_rem", "kWh"], ["BMS Communication", "b_com", ""], ["Battery Alarm Status", "b_alm", ""], ["Operating Mode", "b_mode", ""], ["Charge today / Discharge today", "b_e", "kWh"]]))}
        ${kartu("SOC & Battery Power – Today", grafik("cBess", 290))}
      </div>
      <div class="sub-h">Battery Containers</div><div class="grid g4" id="bessCont"></div>`,
    update() {
      const b = V().bess, E = SIM.S.E.day;
      set("b_soc", fmt(b.soc, 1)); set("b_stat", b.status);
      const ring = $("#socRing"); if (ring) { const L = 2 * Math.PI * 80; ring.style.strokeDasharray = `${(L * b.soc) / 100} ${L}`; ring.style.stroke = b.soc < 20 ? "#ef4444" : b.soc < 35 ? "#facc15" : "#22c55e"; }
      $(".soc-t em").className = "b-" + b.status.toLowerCase();
      [["b_v", b.v, 0], ["b_i", b.i, 0], ["b_ch", b.pch, 0], ["b_dis", b.pdis, 0], ["b_soh", b.soh, 1], ["b_t", b.temp, 1], ["b_cap", b.cap, 0], ["b_rem", b.rem, 0]].forEach(([id, x, d]) => set(id, fmt(x, d)));
      set("b_com", b.comm ? "ONLINE" : "COMM LOSS"); set("b_alm", ALARM.aktif.some((a) => a.tag.startsWith("BESS") || a.tag === "BMS-01") ? "ALARM" : "NORMAL"); set("b_mode", b.mode); set("b_e", `${fmt(E.ch)} / ${fmt(E.dis)}`);
      $$("[data-bmode]").forEach((x) => x.classList.toggle("on", x.dataset.bmode === b.mode));
      $("#bessCont").innerHTML = [0, 1, 2, 3].map((i) => { const soc = Math.max(0, Math.min(100, b.soc + (i - 1.5) * 0.6)), t = b.temp + (i - 1.5) * 0.4; return `<div class="arr st-${b.status === "OFFLINE" ? "off" : "ok"}" data-buka="BESS"><div class="arr-h"><b>BESS-0${i + 1}</b><span class="st b-${b.status.toLowerCase()}">${b.status}</span></div><div class="arr-v">${fmt(soc, 1)} <small>% SOC</small></div><div class="bar"><i style="width:${soc}%;background:${soc < 20 ? "#ef4444" : "#22c55e"}"></i></div><div class="arr-g"><span>${fmt(C.bess.kWh / 4)} kWh</span><span>${fmt(t, 1)} °C</span><span>${fmt(b.p / 4)} kW</span><span>HVAC ${t > 30 ? "COOLING" : "IDLE"}</span></div></div>`; }).join("");
      GRAFIK.kecil("cBess", ["soc", "bess"], ["SOC (%)", "Battery power (kW)"], [GRAFIK.WARNA.soc, GRAFIK.WARNA.bess], { y1: true });
    },
  };

  /* 6. DIESEL GENERATOR */
  P.dg = {
    judul: "Diesel Generator", ikon: "⛽",
    html: () => `${judul("Diesel Generator DG-01", `${fmt(C.dg.kVA)} kVA / ${fmt(C.dg.kW)} kW · ${C.dg.rpm} rpm · backup saat solar & baterai tidak cukup`)}
      <div class="kpis">${kpi("d_st", "Generator State", "", "⚙")}${kpi("d_p", "Generator Power", "kW", "⚡", "k-dg")}${kpi("d_lh", "Fuel Consumption", "L/h", "⛽")}${kpi("d_h", "Running Hours", "h", "⏱")}${kpi("d_e", "Energy Today", "kWh", "📅")}${kpi("d_av", "Availability", "%", "✅")}</div>
      <div class="grid g2">
        ${kartu("Generator Instrumentation", tabelInst([
          ["LIT-301", "Fuel Level Transmitter", "Fuel Tank Level", "%", "g_lit"], ["FIT-301", "Fuel Flow Meter", "Fuel Consumption", "L/h", "g_fit"], ["FQI-301", "Fuel Totalizer", "Total Fuel Consumption", "Liter", "g_fqi"],
          ["TIT-301", "Fuel Temperature", "Fuel Temperature", "°C", "g_tit"], ["PIT-301", "Fuel Pressure", "Fuel Pressure", "bar", "g_pit"], ["EIT-301", "Generator Energy Meter", "Generator Power", "kW", "g_eit"],
          ["SIT-301", "Engine Speed", "Engine Speed", "RPM", "g_sit"], ["HRS-301", "Engine Hour Meter", "Running Hours", "Hour", "g_hrs"], ["PIT-302", "Oil Pressure", "Lubrication Pressure", "bar", "g_pit2"], ["TIT-302", "Coolant Temperature", "Coolant Temperature", "°C", "g_tit2"]]))}
        <div class="col">
          ${kartu("Generator Control", `<div class="btns">${["AUTO", "MAN", "OFF"].map((m) => `<button class="btn" data-dgmode="${m}">${m === "AUTO" ? "AUTO (EMS)" : m === "MAN" ? "MANUAL RUN" : "OFF / LOCK"}</button>`).join("")}<button class="btn r" data-dgreset>↺ Reset Fault</button></div>
            <p class="muted kecil">AUTO: start otomatis bila SOC baterai ≤ ${C.bess.socStartDG}% dan solar defisit, atau saat grid gagal. Urutan: crank → warm-up 60 s → on-load → cool-down 180 s.</p>
            <div class="gauges">${["rpm|RPM|0|1800", "kw|kW|0|1600", "cool|°C|0|110", "oil|bar|0|6"].map((g) => { const [k, u] = g.split("|"); return `<div class="gauge"><div class="gauge-b"><i id="gg_${k}"></i></div><b id="gv_${k}">–</b><small>${u}</small></div>`; }).join("")}</div>`)}
          ${kartu("Generator Power & Fuel – Today", grafik("cDG", 220))}
        </div>
      </div>`,
    update() {
      const d = V().dg, E = SIM.S.E.day;
      set("d_st", d.state); set("d_st_s", "Mode " + d.mode); set("d_p", fmt(d.p)); set("d_p_s", `${fmt((d.p / C.dg.kW) * 100)} % beban`); set("d_lh", fmt(d.fuelLh, 1)); set("d_lh_s", d.sfc ? `SFC ${fmt(d.sfc, 3)} L/kWh` : "–");
      set("d_h", fmt(d.hours, 1)); set("d_e", fmt(E.dg)); set("d_av", fmt(d.avail, 2));
      const jalan = d.state !== "STOP" && d.state !== "FAULT";
      [["g_lit", d.pct, 1, lv(d.pct, C.dg.rendahPct, C.dg.kritisPct, true)], ["g_fit", d.fuelLh, 1, d.sfc > 0.32 ? "warn" : "ok"], ["g_fqi", d.totalL, 0, "ok"], ["g_tit", d.fuelT, 1, lv(d.fuelT, 55, 65)],
        ["g_pit", d.fuelP, 2, jalan && d.fuelP < 1.5 ? "crit" : "ok"], ["g_eit", d.p, 0, "ok"], ["g_sit", d.rpm, 0, d.state === "FAULT" ? "crit" : "ok"], ["g_hrs", d.hours, 1, "ok"], ["g_pit2", d.oilP, 2, jalan && d.oilP < 2 && d.state === "RUN" ? "crit" : "ok"], ["g_tit2", d.coolant, 1, lv(d.coolant, 95, 102)]]
        .forEach(([id, x, dd, t]) => { set(id, fmt(x, dd)); status(id + "_st", t, t === "ok" ? "OK" : t === "warn" ? "WARN" : "ALARM"); });
      $$("[data-dgmode]").forEach((x) => x.classList.toggle("on", x.dataset.dgmode === d.mode));
      [["rpm", d.rpm, 1800, 0], ["kw", d.p, 1600, 0], ["cool", d.coolant, 110, 1], ["oil", d.oilP, 6, 2]].forEach(([k, x, m, dd]) => { const el = $("#gg_" + k); if (el) el.style.height = `${Math.min(100, (x / m) * 100)}%`; set("gv_" + k, fmt(x, dd)); });
      GRAFIK.kecil("cDG", ["dg", "fuelLh"], ["Generator power (kW)", "Fuel (L/h)"], [GRAFIK.WARNA.dg, GRAFIK.WARNA.fuel], { y1: true });
    },
  };

  /* 7. FUEL MANAGEMENT */
  P.fuel = {
    judul: "Fuel Management", ikon: "🛢",
    html: () => `${judul("Fuel Management System", `Tangki solar TK-301 · kapasitas ${fmt(C.dg.tangkiL)} L · low ${C.dg.rendahPct}% · critical ${C.dg.kritisPct}%`)}
      <div class="grid g-fuel">
        ${kartu("Diesel Fuel Tank TK-301", `<div class="tank"><svg viewBox="0 0 180 260"><rect x="20" y="10" width="120" height="230" rx="16" class="tk-shell"/><rect id="tkFill" x="24" y="236" width="112" height="0" rx="12"/>
          ${[0, 25, 50, 75, 100].map((p) => `<line x1="140" x2="152" y1="${236 - p * 2.22}" y2="${236 - p * 2.22}" class="tk-tick"/><text x="154" y="${240 - p * 2.22}" class="tk-tt">${p}</text>`).join("")}</svg>
          <div class="tank-t"><b id="f_pct">–</b><span>%</span><em id="f_lvl">–</em></div></div>
          <div class="btns c"><button class="btn g" data-refuel>🚚 Terima BBM 20.000 L</button></div><p class="muted kecil c">Hijau = normal · Kuning = low fuel · Merah = critical</p>`)}
        ${kartu("Fuel Calculations", daftar([["Total Fuel Tank Capacity", "f_cap", "L"], ["Current Fuel Inventory", "f_inv", "L"], ["Remaining Fuel (usable, > 5 %)", "f_rem", "L"], ["Fuel Consumption per Hour", "f_lh", "L/h"], ["Daily Fuel Consumption", "f_day", "L/day"], ["Monthly Fuel Consumption", "f_mon", "L/month"], ["Estimated Remaining Operating Hours", "f_est", "h"], ["Specific Fuel Consumption", "f_sfc", "L/kWh"], ["Generator Daily Energy Production", "f_edg", "kWh"], ["Generator Running Hours", "f_hrs", "h"], ["Generator Availability", "f_av", "%"], ["Fuel Totalizer FQI-301", "f_tot", "L"]]))}
        ${kartu("Fuel Level & Consumption – Last 24 h", grafik("cFuel", 300))}
      </div>
      ${kartu("Fuel History (delivery & daily consumption)", '<div id="fuelHist"></div>', "", '<a class="lnk" data-pg="log" data-logtab="fuel">Data logger ›</a>')}`,
    update() {
      const d = V().dg, E = SIM.S.E;
      const fill = $("#tkFill"); if (fill) { const h = (d.pct / 100) * 222; fill.setAttribute("y", 236 - h); fill.setAttribute("height", h); fill.setAttribute("class", "tk-" + lv(d.pct, C.dg.rendahPct, C.dg.kritisPct, true)); }
      set("f_pct", fmt(d.pct, 1)); set("f_lvl", d.pct <= C.dg.kritisPct ? "CRITICAL FUEL" : d.pct <= C.dg.rendahPct ? "LOW FUEL" : "NORMAL", "lv-" + lv(d.pct, C.dg.rendahPct, C.dg.kritisPct, true));
      [["f_cap", C.dg.tangkiL, 0], ["f_inv", d.fuelL, 0], ["f_rem", Math.max(0, d.fuelL - C.dg.tangkiL * 0.05), 0], ["f_lh", d.fuelLh, 1], ["f_day", E.day.fuel, 0], ["f_mon", E.month.fuel, 0], ["f_est", d.estJam, 1], ["f_sfc", d.sfc, 3], ["f_edg", E.day.dg, 0], ["f_hrs", d.hours, 1], ["f_av", d.avail, 2], ["f_tot", d.totalL, 0]].forEach(([id, x, dd]) => set(id, fmt(x, dd)));
      $("#fuelHist").innerHTML = `<table class="tbl"><thead><tr><th>Tanggal / jam</th><th>Jenis</th><th class="num">Volume (L)</th><th class="num">Level sesudah (%)</th><th>Keterangan</th></tr></thead><tbody>${SIM.bbm.slice(-8).reverse().map((f) => `<tr><td>${f.jenis === "DAILY" ? tglStr(f.t) : waktuStr(f.t)}</td><td>${f.jenis === "DAILY" ? "Konsumsi harian" : "Penerimaan BBM"}</td><td class="num ${f.jenis === "DAILY" ? "neg" : "pos"}">${f.jenis === "DAILY" ? "−" : "+"}${fmt(f.liter)}</td><td class="num">${fmt(f.level, 1)}</td><td>${f.ket}</td></tr>`).join("") || '<tr><td colspan="5" class="muted">Belum ada data</td></tr>'}</tbody></table>`;
      GRAFIK.kecil("cFuel", ["fuelPct", "fuelLh"], ["Tank level (%)", "Fuel consumption (L/h)"], [GRAFIK.WARNA.level, GRAFIK.WARNA.fuel], { y1: true, jam24: true });
    },
  };

  /* 8. POWER DISTRIBUTION */
  P.dist = {
    judul: "Power Distribution", ikon: "⚡",
    html: () => `${judul("Main Power Distribution – Single Line Diagram", "Solar PV → combiner → inverter → switchgear → bus 20 kV → pabrik & perumahan, terintegrasi BESS, diesel & grid PLN")}
      <div class="card"><div class="card-b">${sld(false)}</div></div>
      <div class="grid g3">
        ${kartu("Main Bus Parameters", daftar([["Main Bus Voltage", "d_bv", "V"], ["Main Bus Current", "d_bi", "A"], ["Active Power", "d_bp", "kW"], ["Reactive Power", "d_bq", "kVAR"], ["Apparent Power", "d_bs", "kVA"], ["Frequency", "d_bf", "Hz"], ["Power Factor", "d_bpf", ""], ["Total Energy Generation (today)", "d_be", "kWh"], ["Grid Import", "d_imp", "kW"], ["Grid Export", "d_exp", "kW"]]))}
        ${kartu("Transformer Loading", daftar([["TR-PV (6 MVA) loading", "d_trpv", "%"], ["TR-PV temperature", "d_trpvt", "°C"], ["TR-FAC (4 MVA) loading", "d_trf", "%"], ["TR-FAC temperature", "d_trft", "°C"], ["TR-RES (630 kVA) loading", "d_trr", "%"], ["TR-RES temperature", "d_trrt", "°C"]]))}
        ${kartu("Circuit Breakers & EMS", `<div id="cbList"></div><div class="sub-h kecil">EMS Dispatch Mode</div><div class="btns"><button class="btn" data-ems="GREEN">🌿 Green priority</button><button class="btn" data-ems="GRID">🗼 Grid backup</button></div>
          <p class="muted kecil">Green: PV → BESS → Diesel → Grid. Grid backup: PV → BESS → Grid, diesel hanya saat grid gagal.</p>`)}
      </div>`,
    update() {
      const v = V(), b = v.bus;
      updateSLD(false);
      [["d_bv", b.v, 0], ["d_bi", b.i, 1], ["d_bp", b.p, 0], ["d_bq", b.q, 0], ["d_bs", b.s, 0], ["d_bf", b.f, 2], ["d_bpf", b.pf, 3], ["d_be", SIM.S.E.day.pv + SIM.S.E.day.dg, 0], ["d_imp", v.grid.imp, 0], ["d_exp", v.grid.exp, 0], ["d_trpv", v.trPV, 1], ["d_trpvt", v.trPVT, 1], ["d_trf", v.fac.tr, 1], ["d_trft", v.fac.trT, 1], ["d_trr", v.res.tr, 1], ["d_trrt", v.res.trT, 1]].forEach(([id, x, d]) => set(id, fmt(x, d)));
      $("#cbList").innerHTML = Object.keys(v.cb).map((k) => `<div class="cbrow"><span class="st st-${v.cb[k] === "CLOSED" ? "ok" : "crit"}">${v.cb[k]}</span><b>CB-${k}</b><button class="btn kecil" data-cbtog="${k}">${v.cb[k] === "CLOSED" ? "Open" : "Close"}</button></div>`).join("");
      $$("[data-ems]").forEach((x) => x.classList.toggle("on", x.dataset.ems === v.mode));
    },
  };

  /* 9. FACTORY */
  P.fac = {
    judul: "Factory Monitoring", ikon: "🏭",
    html: () => `${judul("Factory Building Electrical Monitoring", "Feeder pabrik via CB-FAC & trafo TR-FAC 20/0,4 kV 4 MVA · 2 shift produksi")}
      <div class="kpis">${kpi("fc_p", "Factory Power", "kW", "⚡", "k-fac")}${kpi("fc_d", "Today", "kWh", "📅")}${kpi("fc_m", "This Month", "MWh", "🗓")}${kpi("fc_y", "This Year", "MWh", "📈")}${kpi("fc_sup", "Supply Status", "", "🔌")}</div>
      <div class="grid g2">
        ${kartu("Factory Feeder", daftar([["Factory Feeder Voltage", "fc_v", "V"], ["Factory Feeder Current", "fc_i", "A"], ["Factory Power Factor", "fc_pf", ""], ["Factory Transformer Loading", "fc_tr", "%"], ["Transformer Temperature", "fc_trt", "°C"], ["Factory Breaker Status", "fc_cb", ""], ["Factory Electrical Supply", "fc_s", ""]]) + `<div class="btns"><button class="btn" data-cbtog="FAC" id="fc_btn">Open CB-FAC</button></div>`)}
        ${kartu("Factory Load – Today", grafik("cFac", 290))}
      </div>`,
    update() {
      const f = V().fac, E = SIM.S.E;
      set("fc_p", fmt(f.p)); set("fc_d", fmt(E.day.fac)); set("fc_m", fmt(E.month.fac / 1000, 1)); set("fc_y", fmt(E.year.fac / 1000, 0)); set("fc_sup", f.supply === "ENERGIZED" ? "ON" : "OFF"); set("fc_sup_s", f.supply);
      [["fc_v", f.v, 0], ["fc_i", f.i, 0], ["fc_pf", f.pf, 2], ["fc_tr", f.tr, 1], ["fc_trt", f.trT, 1]].forEach(([id, x, d]) => set(id, fmt(x, d)));
      set("fc_cb", f.cb); set("fc_s", f.supply); set("fc_btn", f.cb === "CLOSED" ? "Open CB-FAC" : "Close CB-FAC");
      GRAFIK.kecil("cFac", ["fac"], ["Factory load (kW)"], [GRAFIK.WARNA.fac]);
    },
  };

  /* 10. RESIDENTIAL */
  let blokPilih = 0;
  P.res = {
    judul: "Residential Monitoring", ikon: "🏘",
    html: () => `${judul("Residential Housing Electrical Monitoring", `${C.beban.rumah} rumah karyawan · 6 blok · trafo TR-RES 20/0,4 kV 630 kVA`)}
      <div class="kpis">${kpi("rs_p", "Residential Power", "kW", "⚡", "k-res")}${kpi("rs_d", "Today", "kWh", "📅")}${kpi("rs_m", "This Month", "MWh", "🗓")}${kpi("rs_n", "Connected Houses", "", "🏠")}${kpi("rs_sup", "Supply Status", "", "🔌")}</div>
      <div class="grid g2">
        ${kartu("Residential Feeder", daftar([["Residential Feeder Voltage", "rs_v", "V"], ["Residential Feeder Current", "rs_i", "A"], ["Residential Power Factor", "rs_pf", ""], ["Residential Transformer Loading", "rs_tr", "%"], ["Transformer Temperature", "rs_trt", "°C"], ["Residential Feeder Breaker", "rs_cb", ""], ["Residential Power Supply", "rs_s", ""]]) + `<div class="btns"><button class="btn" data-cbtog="RES" id="rs_btn">Open CB-RES</button></div>`)}
        ${kartu("Residential Load – Today", grafik("cRes", 290))}
      </div>
      <div class="sub-h">Housing Blocks (klik untuk detail)</div><div class="grid g6" id="resBlok"></div><div id="resDetail"></div>`,
    update() {
      const r = V().res, E = SIM.S.E;
      set("rs_p", fmt(r.p, 1)); set("rs_d", fmt(E.day.res)); set("rs_m", fmt(E.month.res / 1000, 2)); set("rs_n", r.rumah); set("rs_n_s", `dari ${C.beban.rumah} rumah`); set("rs_sup", r.supply === "ENERGIZED" ? "ON" : "OFF"); set("rs_sup_s", r.shedRes ? "LOAD SHEDDING" : r.supply);
      [["rs_v", r.v, 0], ["rs_i", r.i, 0], ["rs_pf", r.pf, 2], ["rs_tr", r.tr, 1], ["rs_trt", r.trT, 1]].forEach(([id, x, d]) => set(id, fmt(x, d)));
      set("rs_cb", r.cb); set("rs_s", r.supply); set("rs_btn", r.cb === "CLOSED" ? "Open CB-RES" : "Close CB-RES");
      const n = C.beban.rumah / 6;
      $("#resBlok").innerHTML = C.beban.blok.map((b, i) => `<div class="arr ${i === blokPilih ? "pilih" : ""} st-${r.blok[i] > 0 ? "ok" : "off"}" data-blok="${i}"><div class="arr-h"><b>Blok ${b}</b><span class="st st-${r.blok[i] > 0 ? "ok" : "off"}">${r.blok[i] > 0 ? "ON" : "OFF"}</span></div><div class="arr-v">${fmt(r.blok[i], 1)} <small>kW</small></div><div class="arr-g"><span>${n} rumah</span><span>${fmt(r.blok[i] / n, 2)} kW/rumah</span></div></div>`).join("");
      const p = r.blok[blokPilih];
      $("#resDetail").innerHTML = kartu(`Detail Blok ${C.beban.blok[blokPilih]}`, `<div class="kv-grid"><div><small>Daya</small><b>${fmt(p, 1)} kW</b></div><div><small>Rumah</small><b>${n}</b></div><div><small>Tegangan</small><b>${fmt(r.v, 0)} V</b></div><div><small>Arus</small><b>${fmt(p > 0 ? (p / 0.95 * 1000) / (Math.sqrt(3) * 400) : 0, 1)} A</b></div><div><small>Rata-rata / rumah</small><b>${fmt(p / n, 2)} kW</b></div><div><small>Energi hari ini (perkiraan)</small><b>${fmt(E.day.res * (r.p > 0 ? p / r.p : 1 / 6))} kWh</b></div></div>`);
      GRAFIK.kecil("cRes", ["res"], ["Residential load (kW)"], [GRAFIK.WARNA.res]);
    },
  };

  /* 11. ENERGY MANAGEMENT */
  let periodeE = "day";
  P.energy = {
    judul: "Energy Management", ikon: "📊",
    html: () => `${judul("Energy Management & Performance", "Neraca energi: sumber = beban + pengisian baterai + ekspor + rugi-rugi")}
      <div class="btns">${[["day", "Hari ini"], ["month", "Bulan ini"], ["year", "Tahun ini"], ["total", "Sejak operasi"]].map(([k, l]) => `<button class="btn" data-eper="${k}">${l}</button>`).join("")}</div>
      <div class="grid g3">
        ${kartu("Energy Summary", `<div id="enTbl"></div>`)}
        ${kartu("Energy Supply Mix", grafik("cMix", 260))}
        ${kartu("Energy Consumption Split", grafik("cKons", 260))}
      </div>
      ${kartu("Plant Energy Balance", '<div id="enBal"></div>')}`,
    update() {
      const E = SIM.S.E[periodeE], load = E.fac + E.res;
      $$("[data-eper]").forEach((x) => x.classList.toggle("on", x.dataset.eper === periodeE));
      const re = SIM.reDari(E);
      const ef = E.H > 0 ? (E.pv / (E.H * CONFIG.pv.array * CONFIG.pv.kWpPerArray)) * 100 : 0;
      const rows = [["1. Total Solar Generation", energi(E.pv)], ["2. Total Diesel Generation", energi(E.dg)], ["3. Total Renewable Energy", energi(E.pv)], ["4. Total Factory Consumption", energi(E.fac)], ["5. Total Residential Consumption", energi(E.res)], ["6. Battery Charging Energy", energi(E.ch)], ["7. Battery Discharging Energy", energi(E.dis)], ["8. Grid Import Energy", energi(E.imp)], ["9. Grid Export Energy", energi(E.exp)], ["10. Renewable Energy Contribution", fmt(re, 1) + " %"], ["11. Solar Generation Efficiency (PR)", fmt(ef, 1) + " %"], ["12. Solar Curtailment", energi(E.curt)]];
      $("#enTbl").innerHTML = `<table class="tbl kv">${rows.map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("")}</table>`;
      const src = E.pv + E.dg + E.dis + E.imp, sink = E.fac + E.res + E.ch + E.exp, rugi = src - sink, simpan = (E.ch * 0.95 - E.dis / 0.95);
      $("#enBal").innerHTML = `<div class="bal"><div class="bal-c"><h4>SUMBER (masuk bus)</h4>${[["Solar", E.pv, "pv"], ["Diesel", E.dg, "dg"], ["BESS discharge", E.dis, "bess"], ["Grid import", E.imp, "grid"]].map(([l, x, k]) => `<div class="bal-r"><span>${l}</span><div class="bar"><i class="bk-${k}" style="width:${src > 0 ? (x / src) * 100 : 0}%"></i></div><b>${energi(x)}</b></div>`).join("")}<div class="bal-t">Total ${energi(src)}</div></div>
        <div class="bal-eq">=</div>
        <div class="bal-c"><h4>PEMAKAIAN (keluar bus)</h4>${[["Factory", E.fac, "fac"], ["Residential", E.res, "res"], ["BESS charge", E.ch, "bess"], ["Grid export", E.exp, "grid"], ["Losses (trafo & kabel)", rugi, "loss"]].map(([l, x, k]) => `<div class="bal-r"><span>${l}</span><div class="bar"><i class="bk-${k}" style="width:${src > 0 ? (x / src) * 100 : 0}%"></i></div><b>${energi(x)}</b></div>`).join("")}<div class="bal-t">Total ${energi(sink + rugi)}</div></div></div>
        <p class="muted kecil">Perubahan energi tersimpan di baterai (setelah efisiensi 95 %): ${energi(simpan)} · Rugi-rugi ${fmt(src > 0 ? (rugi / src) * 100 : 0, 2)} % · Kurtailment PV ${energi(E.curt)} · Semua angka SIMULATION.</p>`;
      GRAFIK.donat("cMix", ["Solar", "Diesel", "BESS discharge", "Grid import"], [E.pv, E.dg, E.dis, E.imp].map((x) => Math.round(x)), ["#facc15", "#f97316", "#22d3ee", "#a78bfa"]);
      GRAFIK.donat("cKons", ["Factory", "Residential", "BESS charge", "Grid export", "Losses"], [E.fac, E.res, E.ch, E.exp, Math.max(0, rugi)].map((x) => Math.round(x)), ["#38bdf8", "#4ade80", "#14b8a6", "#34d399", "#64748b"]);
    },
  };

  /* 12. ENVIRONMENTAL */
  P.env = {
    judul: "Environmental Monitoring", ikon: "🌿",
    html: () => `${judul("Environmental & Green Energy Monitoring", "Cuaca lokal, kontribusi energi terbarukan, dan emisi CO₂ yang dihindari")}
      <div class="kpis">${kpi("e_ta", "Ambient Temperature", "°C", "🌡")}${kpi("e_g", "Solar Irradiance", "W/m²", "☀")}${kpi("e_ws", "Wind Speed", "m/s", "🌬")}${kpi("e_rain", "Rainfall Today", "mm", "🌧")}${kpi("e_re", "Renewable Contribution", "%", "🌿", "k-re")}${kpi("e_co2", "CO₂ Avoided (total)", "ton", "🌍", "k-re")}${kpi("e_mwh", "Total Renewable Energy", "MWh", "⚡")}${kpi("e_score", "Green Performance", "", "🏅")}</div>
      <div class="grid g2">
        ${kartu("CO₂ Emissions Avoided", `<div id="co2Tbl"></div><div class="baseline"><b>Baseline perhitungan (ASUMSI SIMULASI):</b> CO₂ dihindari = energi solar (kWh) × faktor emisi jaringan <b>${C.emisi.gridKgPerKWh} kg CO₂/kWh</b>. Emisi diesel dihitung terpisah: konsumsi solar (L) × <b>${C.emisi.dieselKgPerL} kg CO₂/L</b>. Ganti angka di <code>js/config.js</code> sesuai faktor emisi resmi jaringan Anda.</div>`)}
        ${kartu("Ambient Temperature & Irradiance – Today", grafik("cEnv", 280))}
      </div>
      ${kartu("Green Campus", `<div class="kv-grid" id="greenInfo"></div>`)}`,
    update() {
      const v = V(), E = SIM.S.E, k = C.emisi.gridKgPerKWh;
      set("e_ta", fmt(v.Tamb, 1)); set("e_g", fmt(v.G)); set("e_ws", fmt(v.wind, 1)); set("e_rain", fmt(v.rainDay, 1)); set("e_rain_s", v.rain > 0 ? `Hujan ${fmt(v.rain, 1)} mm/jam` : `Awan ${fmt(v.cloud * 100)} %`);
      set("e_re", fmt(v.re)); set("e_co2", fmt((E.total.pv * k) / 1000, 0)); set("e_mwh", fmt(E.total.pv / 1000, 0));
      const reD = SIM.reDari(E.day);
      const skor = reD >= 60 ? "A" : reD >= 45 ? "B" : reD >= 30 ? "C" : "D"; set("e_score", skor); set("e_score_s", `RE hari ini ${fmt(reD, 1)} %`);
      $("#co2Tbl").innerHTML = `<table class="tbl"><thead><tr><th>Periode</th><th class="num">Solar (MWh)</th><th class="num">CO₂ dihindari (t)</th><th class="num">BBM diesel (L)</th><th class="num">CO₂ diesel (t)</th><th class="num">Net (t)</th></tr></thead><tbody>
        ${[["Hari ini", E.day], ["Bulan ini", E.month], ["Tahun ini", E.year], ["Sejak operasi", E.total]].map(([l, e]) => { const a = (e.pv * k) / 1000, dsl = (e.fuel * C.emisi.dieselKgPerL) / 1000; return `<tr><td>${l}</td><td class="num">${fmt(e.pv / 1000, 2)}</td><td class="num pos">${fmt(a, 2)}</td><td class="num">${fmt(e.fuel)}</td><td class="num neg">${fmt(dsl, 2)}</td><td class="num"><b>${fmt(a - dsl, 2)}</b></td></tr>`; }).join("")}</tbody></table>`;
      $("#greenInfo").innerHTML = [["Pohon di kampus (3D)", fmt(Kampus3D.info().pohon || 0)], ["Kapasitas PV", `${fmt(v.kWp / 1000, 1)} MWp`], ["Penyimpanan baterai", `${fmt(C.bess.kWh / 1000, 1)} MWh`], ["Setara pohon menyerap CO₂ (thn ini)*", fmt((E.year.pv * k) / 22)], ["Rumah karyawan", C.beban.rumah], ["Tutupan awan", `${fmt(v.cloud * 100)} %`]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("") + '<div class="muted kecil full">* asumsi 22 kg CO₂ per pohon per tahun (ilustrasi).</div>';
      GRAFIK.kecil("cEnv", ["Tamb", "G"], ["Ambient (°C)", "Irradiance (W/m²)"], [GRAFIK.WARNA.T, GRAFIK.WARNA.G], { y1: true });
    },
  };

  /* 13. TREND */
  P.trend = {
    judul: "Trend Monitoring", ikon: "📈",
    html: () => `${judul("Trend Monitoring", "Grafik historis interaktif · arahkan kursor untuk melihat nilai")}
      <div class="toolbar">${[["rt", "Real Time"], ["1h", "Last 1 Hour"], ["24h", "Last 24 Hours"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"]].map(([k, l]) => `<button class="btn" data-filter="${k}">${l}</button>`).join("")}<span class="muted kecil" id="trendInfo"></span></div>
      <div class="grid g2">
        ${kartu("Solar · Diesel · Factory · Residential", grafik("chGen", 260))}${kartu("Battery SOC & Charge / Discharge", grafik("chBess", 260))}
        ${kartu("Fuel Consumption & Tank Level", grafik("chFuel", 260))}${kartu("Grid Import / Export", grafik("chGrid", 260))}
        <div class="card"><div class="card-h"><span id="judulChSolar">Solar</span></div><div class="card-b">${grafik("chSolar", 260)}</div></div>
        <div class="card"><div class="card-h"><span id="judulChKons">Energy</span></div><div class="card-b">${grafik("chKons", 260)}</div></div>
      </div>`,
    masuk: () => GRAFIK.trend(),
    update(n) { if (GRAFIK.isDaya() && n % 3 === 0) GRAFIK.trend(); },
  };

  /* 14. ALARM & EVENT */
  let filterAlm = "aktif";
  P.alarm = {
    judul: "Alarm & Event", ikon: "🔔",
    html: () => `${judul("Alarm & Event Management", "Hijau = normal · Kuning = warning · Merah = critical · Abu-abu = communication loss / offline")}
      <div class="kpis">${kpi("a_crit", "Critical", "", "🔴", "k-crit")}${kpi("a_warn", "Warning", "", "🟡", "k-warn")}${kpi("a_comm", "Comm Loss", "", "⚪", "k-comm")}${kpi("a_unack", "Unacknowledged", "", "🔔")}</div>
      <div class="grid g-alm">
        <div class="card"><div class="card-h"><span>Alarm List</span><span class="btns">${[["aktif", "Active"], ["CRIT", "Critical"], ["WARN", "Warning"], ["COMM", "Comm"], ["hist", "History"], ["event", "Events"]].map(([k, l]) => `<button class="btn kecil" data-afil="${k}">${l}</button>`).join("")}<button class="btn kecil g" data-ackall>✔ Ack all</button></span></div><div class="card-b" id="almTbl"></div></div>
        ${kartu("Fault Simulation (SIMULATION)", `<p class="muted kecil">Untuk latihan operator & uji alarm. Tidak memengaruhi peralatan nyata.</p><div class="fault-grid">${[["grid", "🗼 Grid Failure"], ["inverter", "🔌 Inverter Fault (INV-03)"], ["comm", "📡 Comm Failure (INV-06)"], ["dg", "⛽ Diesel Gen Failure"], ["bms", "🔋 BMS Comm Loss"], ["fac", "🏭 Factory Feeder Trip"], ["res", "🏘 Residential Feeder Trip"], ["trafo", "🌡 Transformer Overtemp"], ["fuel", "🛢 Low Fuel Level"], ["fuelP", "⛽ Low Fuel Pressure"], ["panas", "☀ Panel Overheat (heatwave)"], ["awan", "☁ Heavy Clouds (low PV)"]].map(([k, l]) => `<button class="btn" data-fault="${k}">${l}</button>`).join("")}</div>
          <div class="btns"><button class="btn g" data-pulih>✔ Clear all faults & close breakers</button></div>`)}
      </div>`,
    update() {
      const h = ALARM.hitung(); set("a_crit", h.CRIT); set("a_warn", h.WARN); set("a_comm", h.COMM); set("a_unack", h.unack);
      $$("[data-afil]").forEach((x) => x.classList.toggle("on", x.dataset.afil === filterAlm));
      let isi;
      if (filterAlm === "event") isi = `<table class="tbl"><thead><tr><th>Timestamp</th><th>Source</th><th>Event</th></tr></thead><tbody>${ALARM.event.slice(-60).reverse().map((e) => `<tr><td>${waktuStr(e.t)}</td><td class="tag">${e.tag}</td><td>${e.teks}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">Belum ada event</td></tr>'}</tbody></table>`;
      else {
        const daftarA = filterAlm === "hist" ? ALARM.riwayat.slice(-80).reverse() : ALARM.aktif.filter((a) => filterAlm === "aktif" || a.sev === filterAlm);
        isi = `<table class="tbl alm"><thead><tr><th>Timestamp</th><th>Tag</th><th>Description</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>${daftarA.map((a) => `<tr class="sev-${a.sev} ${a.state === "ACTIVE" ? "blink" : ""}"><td>${waktuStr(a.tOn)}</td><td class="tag">${a.tag}</td><td>${a.desk}</td><td><span class="st st-${a.sev === "CRIT" ? "crit" : a.sev === "WARN" ? "warn" : "off"}">${a.sev === "CRIT" ? "CRITICAL" : a.sev === "WARN" ? "WARNING" : "COMM LOSS"}</span></td><td>${a.state}${a.tOff ? `<small> ${jamStr(a.tOff)}</small>` : ""}</td><td>${a.state === "ACTIVE" ? `<button class="btn kecil" data-ack="${a.id}">Ack</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="6" class="ok-row">✓ Tidak ada alarm ${filterAlm === "hist" ? "di riwayat" : "aktif"} – semua normal</td></tr>`}</tbody></table>`;
      }
      const el = $("#almTbl"); if (el.innerHTML !== isi) el.innerHTML = isi;
    },
  };

  /* 15. HISTORICAL DATA LOGGER */
  P.log = {
    judul: "Historical Data Logger", ikon: "🗄",
    html: () => `${judul("Historical Data Logger & Reporting", "Perekaman otomatis tiap 5 menit (waktu simulasi) · disimpan di localStorage browser")}
      <div class="toolbar">${[["log", "Data Log"], ["daily", "Daily Report"], ["monthly", "Monthly Report"], ["yearly", "Yearly Report"], ["alarm", "Alarm History"], ["event", "Event Log"], ["fuel", "Fuel History"], ["dist", "Energy Distribution"]].map(([k, l]) => `<button class="btn" data-logtab="${k}">${l}</button>`).join("")}</div>
      <div class="card"><div class="card-h"><span id="logJudul">–</span><span class="btns"><button class="btn kecil" data-logpg="-1">‹</button><span class="muted kecil" id="logHal"></span><button class="btn kecil" data-logpg="1">›</button><button class="btn kecil g" data-ekspor="csv">⬇ CSV</button><button class="btn kecil g" data-ekspor="xls">⬇ Excel</button></span></div><div class="card-b scroll" id="logTabel"></div></div>
      <div class="grid g2">${kartu("Penyimpanan", `<div id="logInfo" class="kv-grid"></div>`)}${kartu("Integrasi data nyata (rencana)", `<p class="kecil">Arsitektur sudah dipisah: <code>js/datasource.js</code> menjadi pintu masuk data. Saat ini sumbernya <b>SIMULATION</b>. Nanti bisa diganti pembacaan dari gateway <b>Modbus TCP / RTU</b>, PLC, inverter, smart energy meter, dan BMS (lewat REST/WebSocket dari server XAMPP).</p><div class="btns"><button class="btn r" data-resetsim>⟲ Reset simulasi & hapus histori</button></div>`)}</div>`,
    masuk: () => LOGGER.render(),
    update(n) {
      if (n % 5 === 0) LOGGER.render();
      let ukuran = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(C.simpanKey)) ukuran += (localStorage.getItem(k) || "").length; }
      $("#logInfo").innerHTML = [["Rekaman 5 menit", fmt(SIM.log.length)], ["Laporan harian", fmt(SIM.harian.length)], ["Laporan bulanan", fmt(SIM.bulanan.length)], ["Riwayat alarm", fmt(ALARM.riwayat.length)], ["Ukuran data", `${fmt(ukuran / 1024)} KB`], ["Rekaman terakhir", SIM.log.length ? waktuStr(SIM.log[SIM.log.length - 1][0]) : "–"]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
    },
  };

  /* ---------------- DETAIL PERALATAN (dari klik 3D) ---------------- */
  function detail(k) {
    const v = V();
    if (/^(PV-A|INV-0|COMB-)/.test(k)) {
      const i = +k.replace(/\D/g, "") - 1, x = v.inv[i];
      return { judul: `PV Array A${i + 1} · ${x.id}`, hal: k.startsWith("INV") ? "inv" : "pv", baris: [["Status", x.status], ["Kapasitas DC", `${fmt(C.pv.kWpPerArray)} kWp`], ["DC power", `${fmt(x.pdc)} kW`], ["DC voltage / current", `${fmt(x.vdc)} V / ${fmt(x.idc)} A`], ["String current (avg)", `${fmt(x.strI, 2)} A`], ["AC power", `${fmt(x.pac)} kW`], ["AC voltage / current", `${fmt(x.vac)} V / ${fmt(x.iac)} A`], ["Efisiensi", `${fmt(x.eff, 1)} %`], ["Suhu inverter", `${fmt(x.temp, 1)} °C`], ["Energi hari ini", `${fmt(x.eDay)} kWh`]] };
    }
    const b = v.bess, d = v.dg;
    const M = {
      BESS: { judul: "Battery Energy Storage System", hal: "bess", baris: [["Status", b.status], ["SOC / SOH", `${fmt(b.soc, 1)} % / ${fmt(b.soh, 1)} %`], ["Daya", `${b.p >= 0 ? "Discharge" : "Charge"} ${fmt(Math.abs(b.p))} kW`], ["Tegangan / arus", `${fmt(b.v)} V / ${fmt(b.i)} A`], ["Suhu", `${fmt(b.temp, 1)} °C`], ["Energi tersisa", `${fmt(b.rem)} kWh`], ["BMS", b.comm ? "ONLINE" : "COMM LOSS"], ["Mode", b.mode]] },
      DG: { judul: "Diesel Generator DG-01", hal: "dg", baris: [["Status", d.state], ["Mode", d.mode], ["Daya", `${fmt(d.p)} kW`], ["Putaran", `${fmt(d.rpm)} rpm`], ["Konsumsi BBM", `${fmt(d.fuelLh, 1)} L/h`], ["Tekanan oli", `${fmt(d.oilP, 2)} bar`], ["Suhu coolant", `${fmt(d.coolant, 1)} °C`], ["Jam operasi", `${fmt(d.hours, 1)} h`]] },
      TANK: { judul: "Diesel Fuel Tank TK-301", hal: "fuel", baris: [["Level", `${fmt(d.pct, 1)} %`], ["Volume", `${fmt(d.fuelL)} L dari ${fmt(C.dg.tangkiL)} L`], ["Konsumsi", `${fmt(d.fuelLh, 1)} L/h`], ["Perkiraan sisa operasi", `${fmt(d.estJam, 1)} jam`], ["Status", d.pct <= C.dg.kritisPct ? "CRITICAL" : d.pct <= C.dg.rendahPct ? "LOW" : "NORMAL"]] },
      SUB: { judul: "Main Substation 20 kV", hal: "dist", baris: [["Tegangan bus", `${fmt(v.bus.v)} V`], ["Arus bus", `${fmt(v.bus.i, 1)} A`], ["Daya aktif / reaktif", `${fmt(v.bus.p)} kW / ${fmt(v.bus.q)} kVAR`], ["Frekuensi", `${fmt(v.bus.f, 2)} Hz`], ["Power factor", fmt(v.bus.pf, 3)], ...Object.keys(v.cb).map((c) => ["CB-" + c, v.cb[c]])] },
      GRID: { judul: "Utility Grid Connection (PLN 20 kV)", hal: "dist", baris: [["Status grid", v.grid.ok ? "NORMAL" : "FAILURE"], ["CB-GRID", v.cb.GRID], ["Import", `${fmt(v.grid.imp)} kW`], ["Export", `${fmt(v.grid.exp)} kW`], ["Import hari ini", energi(SIM.S.E.day.imp)], ["Export hari ini", energi(SIM.S.E.day.exp)]] },
      FAC: { judul: "Production Factory", hal: "fac", baris: [["Supply", v.fac.supply], ["Daya", `${fmt(v.fac.p)} kW`], ["Tegangan / arus", `${fmt(v.fac.v)} V / ${fmt(v.fac.i)} A`], ["Power factor", fmt(v.fac.pf, 2)], ["Loading TR-FAC", `${fmt(v.fac.tr, 1)} %`], ["Suhu TR-FAC", `${fmt(v.fac.trT, 1)} °C`], ["Energi hari ini", energi(SIM.S.E.day.fac)]] },
      RES: { judul: "Residential Housing Complex", hal: "res", baris: [["Supply", v.res.supply], ["Daya", `${fmt(v.res.p, 1)} kW`], ["Rumah tersambung", v.res.rumah], ["Tegangan", `${fmt(v.res.v)} V`], ["Loading TR-RES", `${fmt(v.res.tr, 1)} %`], ["Energi hari ini", energi(SIM.S.E.day.res)]] },
      OFFICE: { judul: "EMS Control Center", hal: "energy", baris: [["Mode EMS", v.mode === "GREEN" ? "Green priority" : "Grid backup"], ["Renewable share", `${fmt(v.re, 1)} %`], ["Alarm aktif", ALARM.aktif.length], ["Sumber data", CONFIG.sumberData]] },
      WEATHER: { judul: "Weather Station", hal: "env", baris: [["Irradiance (SI-101)", `${fmt(v.G)} W/m²`], ["Suhu ambient (TIT-102)", `${fmt(v.Tamb, 1)} °C`], ["Suhu modul (TIT-101)", `${fmt(v.Tmod, 1)} °C`], ["Angin (WST-101)", `${fmt(v.wind, 1)} m/s`], ["Hujan hari ini", `${fmt(v.rainDay, 1)} mm`], ["Tutupan awan", `${fmt(v.cloud * 100)} %`]] },
    };
    if (k.startsWith("CB-")) { const c = k.slice(3); return { judul: `Circuit Breaker ${k}`, hal: "dist", baris: [["Status", v.cb[c]], ["Bay", c]], cb: c }; }
    if (k.startsWith("RES-")) { const i = C.beban.blok.indexOf(k.slice(4)); blokPilih = Math.max(0, i); return { judul: `Housing Block ${k.slice(4)}`, hal: "res", baris: [["Daya", `${fmt(v.res.blok[i], 1)} kW`], ["Rumah", C.beban.rumah / 6], ["Tegangan", `${fmt(v.res.v)} V`], ["Supply", v.res.supply]] }; }
    return M[k] || { judul: k, hal: "overview", baris: [] };
  }

  return {
    P, detail,
    set periodeE(x) { periodeE = x; }, set filterAlm(x) { filterAlm = x; }, set blok(x) { blokPilih = x; },
  };
})();
