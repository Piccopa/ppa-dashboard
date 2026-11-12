/* =========================================================
   PAGES.JS — ISI 17 HALAMAN SCADA KILANG
   Tiap halaman: html() → dibuat sekali, update(n) → tiap detik.
   ========================================================= */
const HAL = (() => {
  const C = CONFIG, V = () => SIM.V, x = (t) => SIM.nilai(t);

  /* ---------------- KOMPONEN KECIL ---------------- */
  const kpi = (id, label, unit, ikon = "", kelas = "") => `<div class="kpi ${kelas}"><div class="kpi-l">${ikon} ${label}</div><div class="kpi-v"><b id="${id}">–</b><span>${unit}</span></div><div class="kpi-s" id="${id}_s">&nbsp;</div></div>`;
  const kartu = (judul, isi, kelas = "", ekstra = "") => `<div class="card ${kelas}"><div class="card-h"><span>${judul}</span>${ekstra}</div><div class="card-b">${isi}</div></div>`;
  const grafik = (id, tinggi = 230) => `<div class="chart" style="height:${tinggi}px"><canvas id="${id}"></canvas></div>`;
  const simTag = `<span class="simtag">SIMULATION</span>`;
  const chip = (area) => `<span class="ust u-RUNNING" id="us_${area}" data-area="${area}">RUNNING</span>`;
  const judul = (j, sub, area) => `<div class="pg-h"><div><h2>${j} ${area ? chip(area) : ""}</h2><p>${sub}</p></div>${simTag}</div>`;
  const STKELAS = { RUNNING: "RUNNING", STANDBY: "STANDBY", STOPPED: "STOPPED", OFF: "OFF", WARNING: "WARNING", ALARM: "ALARM", "COMMUNICATION FAILURE": "COMM" };
  function isiChip(el) { const s = ALARM.statusArea(el.dataset.area); el.className = "ust u-" + (STKELAS[s] || "STOPPED"); const t = s === "OFF" ? "NOT INSTALLED" : s; if (el.textContent !== t) el.textContent = t; }
  function semuaChip() { $$(".ust[data-area]").forEach(isiChip); }
  function status(id, tingkat, teks) { const el = document.getElementById(id); if (!el) return; const k = "st st-" + tingkat; if (el.className !== k) el.className = k; if (teks !== undefined && el.textContent !== teks) el.textContent = teks; }
  const fmtTag = (t) => { const d = TAG[t]; if (!d) return "–"; const v = x(t); if (d.unit === "state") return v > 1.5 ? "FIRING" : v > 0.5 ? "PURGE" : "TRIPPED"; return fmt(v, d.dec); };
  const lim = (d) => [d.LL, d.L, d.H, d.HH].map((v) => (v == null ? "–" : fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0))).join(" / ");

  /* tabel instrumen generik: Tag · Deskripsi · Nilai · Satuan · LL/L/H/HH · Status */
  function tabelTag(tags) {
    return `<table class="tbl inst"><thead><tr><th>Tag</th><th>Description</th><th class="num">Value</th><th>Unit</th><th>LL / L / H / HH</th><th>Status</th></tr></thead><tbody>${tags.filter((t) => TAG[t]).map((t) => { const d = TAG[t]; return `<tr><td class="tag">${t}</td><td>${d.desk}</td><td class="num"><b id="v_${t}">–</b></td><td>${d.unit === "state" ? "" : d.unit}</td><td class="lim">${lim(d)}</td><td><span class="st" id="s_${t}">OK</span></td></tr>`; }).join("")}</tbody></table>`;
  }
  const grup = (judul, tags) => `<div class="grp-h">${judul}</div>${tabelTag(tags)}`;
  const STT = { ok: ["ok", "NORMAL"], warn: ["warn", "WARNING"], crit: ["crit", "ALARM"], off: ["off", "COMM FAIL"], sup: ["sup", "SUPPRESSED"] };
  function isiTag(tags) {
    tags.forEach((t) => {
      const el = document.getElementById("v_" + t); if (!el) return;
      const sv = ALARM.sevTag(t), d = TAG[t]; let s = STT[sv] || STT.ok;
      if (sv === "warn" || sv === "crit") { const v = x(t); s = [s[0], (v >= (d.H ?? Infinity) ? (v >= (d.HH ?? Infinity) ? "HH" : "H") : v <= (d.LL ?? -Infinity) ? "LL" : "L") + " ALARM"]; }
      const teks = fmtTag(t); if (el.textContent !== teks) el.textContent = teks;
      el.classList.toggle("q-bad", sv === "off");
      status("s_" + t, s[0], s[1]);
    });
  }
  const tagsArea = (area, filter = () => true) => TAGS.filter((t) => t[1] === area && filter(t)).map((t) => t[0]);
  const tagsAlat = (eq) => TAGS.filter((t) => t[2] === eq).map((t) => t[0]);

  /* daftar peralatan (untuk modal klik 3D / PFD) */
  const EQ = {
    "C-101": ["Atmospheric distillation column", "cdu"], "H-101": ["CDU crude furnace", "cdu"], "D-102": ["Desalter", "cdu"], "D-101": ["Overhead reflux drum", "cdu"], "E-101": ["Crude preheat exchanger train", "cdu"], "E-102": ["Overhead air condenser (fin-fan)", "cdu"],
    "C-201": ["Vacuum distillation column", "vdu"], "H-201": ["Vacuum furnace", "vdu"], "EJ-201": ["Vacuum ejector & condenser", "vdu"], "E-201": ["VDU heat exchangers", "vdu"],
    "R-301": ["HDT reactor", "hdt"], "V-301": ["HP separator", "hdt"], "C-302": ["Product stripper", "hdt"], "H-301": ["Reactor charge heater", "hdt"], "E-301": ["Feed / effluent exchangers", "hdt"],
    "R-801": ["Reformer reactor 1", "ref"], "R-802": ["Reformer reactor 2", "ref"], "R-803": ["Reformer reactor 3", "ref"], "H-801": ["Reformer furnace (multi-cell)", "ref"], "V-801": ["Reformer separator", "ref"], "C-802": ["Stabilizer column", "ref"],
    "R-871": ["FCC reactor / riser", "fcc"], "RG-871": ["FCC regenerator", "fcc"], "C-873": ["FCC main fractionator", "fcc"], "STK-871": ["FCC flue gas stack (CEMS)", "env"],
    SRU: ["Sulfur recovery unit (Claus + TGTU)", "util"], H2: ["Hydrogen plant (SMR + PSA)", "util"], FG: ["Fuel gas system", "util"],
    "B-601A": ["Boiler A", "boil"], "B-601B": ["Boiler B", "boil"], "SH-601": ["HP steam header", "boil"], "STG-01": ["Steam turbine generator", "elec"],
    "CT-701": ["Cooling tower (4 cells)", "cw"], WTP: ["Water treatment plant", "util"], WWTP: ["Wastewater treatment plant", "util"], IA: ["Instrument air system", "util"], N2: ["Nitrogen generation & storage", "util"],
    SUB: ["Main substation 150/20 kV", "elec"], "TR-01": ["Power transformer TR-01 (40 MVA)", "elec"], "TR-02": ["Power transformer TR-02 (40 MVA)", "elec"],
    FW: ["Firewater pump house & storage", "env"], CCR: ["Main control room (CCR)", "overview"], LAB: ["Laboratory & maintenance workshop", "overview"], MET: ["Meteorological station", "env"],
    "FL-901": ["Flare stack", "env"], "V-901": ["Flare knock-out drum", "env"], "CRUDE-RCV": ["Crude receiving & metering", "tank"], LOAD: ["Truck loading terminal", "tank"], PUMPST: ["Product pump station", "rot"],
  };
  C.tangki.forEach((k) => (EQ[k[0]] = [k[1] + " tank", "tank"]));
  C.pompa.forEach((p) => (EQ[p[0]] = [p[1], "rot"]));
  C.kompresor.forEach((k) => (EQ[k[0]] = [k[1], "rot"]));
  const TREN_POMPA = { "P-101": ["FT-101"], "P-102": ["FT-105"], "P-103": ["FT-106"], "P-201": ["VT-201"], "P-301": ["FT-301"], "P-801": ["FT-801"], "P-871": ["FT-874"], "P-601": ["FT-602"], "P-701": ["FT-701"], "P-1171": ["PT-1171"], "P-901": ["FIT-452"] };
  const TREN_KOMP = { "K-301": ["FT-303", "VT-301"], "K-302": ["FT-302"], "K-801": ["FT-802", "PT-802"], "K-871": ["VT-871"], "K-872": ["FT-872"], "K-1021A": ["PT-1021"], "K-1021B": ["PT-1021"] };
  const TAG_KHUSUS = { SRU: ["FT-1061", "AT-1061", "AT-1111", "AT-1112", "AT-1113", "AT-1114", "GD-1146"], H2: ["FT-1051", "FT-1052", "PT-1051", "AT-1051"], "STK-871": ["AT-1101", "AT-1102", "AT-1103", "AT-1104"], "FL-901": ["FT-901", "PT-901", "FT-902", "TE-901A", "TE-901B", "TE-901C", "LT-901"], "V-901": ["LT-901", "PT-901"], "CT-701": ["TT-701", "TT-702", "FT-701", "LT-701", "AIT-701", "AIT-702", "AIT-703", "FT-703", "FT-704"], "STG-01": ["JI-1202", "FT-601", "PT-601"], CCR: [], LAB: [], LOAD: [], "CRUDE-RCV": [], PUMPST: [], "EJ-201": ["PT-201", "FT-202"], "E-101": ["TT-102", "FT-101"], "E-102": ["TT-105", "PT-105"], "E-201": ["FT-201", "TT-203"], "E-301": ["TT-301", "FT-301"], "R-802": ["TT-803", "TT-804"], "R-803": ["TT-805", "TT-806"], "H-801": ["FT-803", "TT-801", "TT-803", "TT-805"], SUB: ["EI-1201", "EI-1202", "SI-1201", "JI-1201", "JI-1205", "PF-1201"] };

  /* ---------------- DIAGRAM ALIR SEDERHANA (SVG) ---------------- */
  function pfd(vb, nodes, lines, judulTeks) {
    return `<svg viewBox="${vb}" class="pfd">${judulTeks ? `<text x="10" y="16" class="sm" style="text-anchor:start">${judulTeks}</text>` : ""}
      ${lines.map(([id, d, w]) => `<path id="ln_${id}" class="ln" d="${d}" style="stroke:${w}"/>`).join("")}
      ${nodes.map(([id, x0, y0, w, h, teks, vid, eq]) => `<g ${eq ? `data-buka="${eq}"` : ""}><rect id="nd_${id}" class="eqb" x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6"/><text x="${x0 + w / 2}" y="${y0 + (vid ? h / 2 - 2 : h / 2 + 4)}">${teks}</text>${vid ? `<text x="${x0 + w / 2}" y="${y0 + h / 2 + 13}" class="pv" id="${vid}">–</text>` : ""}</g>`).join("")}</svg>`;
  }
  function garis(id, on, kecepatan = 1) { const el = document.getElementById("ln_" + id); if (!el) return; el.classList.toggle("off", !on); el.style.animationDuration = on ? `${Math.max(0.5, 2.2 / Math.max(0.2, kecepatan))}s` : ""; }
  function node(id, kelas) { const el = document.getElementById("nd_" + id); if (el) el.setAttribute("class", "eqb " + kelas); }
  const stPompa = (g) => { const a = V().PV[g + "A"], b = V().PV[g + "B"]; return (a && a.st === "RUN") || (b && b.st === "RUN") ? "on" : (a && a.trip) || (b && b.trip) ? "trip" : ""; };

  const P = {};

  /* =========================================================
     1. REFINERY OVERVIEW
     ========================================================= */
  const UNIT_LIST = [["CDU", "cdu"], ["VDU", "vdu"], ["HDT", "hdt"], ["REF", "ref"], ["FCC", "fcc"], ["SRU", "util"], ["H2", "util"], ["TANK", "tank"], ["BLR", "boil"], ["CW", "cw"], ["UTIL", "util"], ["FLR", "env"], ["ENV", "env"], ["ELEC", "elec"]];
  P.overview = {
    judul: "Refinery Overview", ikon: "🏭",
    html: () => `${judul("Refinery Plant Overview", "Ringkasan operasi kilang dari ruang kontrol pusat – throughput, produk, utilitas, alarm")}
      <div class="kpis">
        ${kpi("o_bpd", "Total throughput", "BPD", "🛢", "k-feed")}${kpi("o_feed", "Crude feed rate", "m³/h", "⛽", "k-feed")}${kpi("o_crt", "Crude processed today", "ton", "📦", "k-feed")}
        ${kpi("o_cap", "Operating capacity", "%", "📊", "k-feed")}${kpi("o_prod", "Product production", "t/day", "⚗", "k-prod")}${kpi("o_inv", "Product inventory", "ton", "🛢", "k-inv")}
        ${kpi("o_fg", "Fuel gas consumption", "Nm³/h", "🔥", "k-fg")}${kpi("o_st", "Steam consumption", "t/h", "♨", "k-steam")}${kpi("o_kw", "Electricity consumption", "kW", "⚡", "k-pow")}
        ${kpi("o_wt", "Water consumption", "m³/h", "💧", "k-water")}${kpi("o_fl", "Flare gas flow", "Nm³/h", "🔥", "k-flare")}${kpi("o_av", "Equipment availability", "%", "✅", "k-av")}
        ${kpi("o_al", "Active alarms", "", "🔔", "k-warn")}${kpi("o_cr", "Critical alarms", "", "🔴", "k-crit")}
        <div class="kpi" id="o_stbox"><div class="kpi-l">🏷 Refinery operating status</div><div class="big-st" id="o_status">–</div></div>
      </div>
      <div class="grid g-ov">
        <div class="col">
          <div class="card c3d"><div class="card-h"><span>3D Refinery Plant</span><span class="muted kecil">Seret: putar · Klik kanan/Shift: geser · Scroll: zoom · Klik peralatan: detail</span></div><div class="h3d" id="h3d_ov"></div></div>
          ${kartu("Process Block Flow (live)", blokDiagram())}
        </div>
        <div class="col">
          ${kartu("Process Unit Status", `<div class="status-grid">${UNIT_LIST.map(([a, pg]) => `<div class="sg" data-page="${pg}"><span>${AREA[a] || a}</span>${chip(a)}</div>`).join("")}</div>
            <div class="legend-st">${["RUNNING", "STANDBY", "STOPPED", "WARNING", "ALARM", "COMM"].map((s) => `<span class="ust u-${s}">${s === "COMM" ? "COMMUNICATION FAILURE" : s}</span>`).join("")}</div>`)}
          ${kartu("Product Rundown", `<table class="tbl" id="o_prodtbl"></table>`)}
          ${kartu("Active Alarms", `<div class="alm-mini" id="o_alm"></div>`, "", `<span class="lnk" data-page="alarm">Semua ›</span>`)}
        </div>
      </div>`,
    masuk() { Kilang3D.pasang($("#h3d_ov")); },
    update() {
      const v = V(), h = ALARM.hitung(), E = SIM.S.E.day;
      set("o_bpd", fmt(v.bpd)); set("o_bpd_s", `${fmt(v.F * 24)} m³/day · desain ${fmt(C.kapasitasBPD)} BPD`);
      set("o_feed", fmt(v.F)); set("o_feed_s", `setpoint ${fmt(v.Fsp)} m³/h`);
      set("o_crt", fmt(E.crudeT)); set("o_crt_s", `${fmt(E.crudeM3)} m³ sejak 00:00`);
      set("o_cap", fmt(v.kapasitas, 1)); set("o_cap_s", `dari ${fmt(v.desain)} m³/h desain`);
      set("o_prod", fmt(v.prodT * 24)); set("o_prod_s", `hari ini ${fmt(E.prodT)} t · ${fmt(v.prodT, 1)} t/h`);
      set("o_inv", fmt(v.inv.produkT)); set("o_inv_s", `crude ${fmt(v.inv.crude)} m³`);
      set("o_fg", fmt(v.fgTot)); set("o_fg_s", `${fmt((v.fgTot * C.lhvFuelGas) / 3600, 1)} MW thermal`);
      set("o_st", fmt(v.steamPakai + v.stgUap, 1)); set("o_st_s", `produksi ${fmt(v.steamTot, 1)} t/h`);
      set("o_kw", fmt(v.loadKW)); set("o_kw_s", `STG ${fmt(v.stg)} kW · grid ${fmt(v.imp)} kW`);
      set("o_wt", fmt(v.raw)); set("o_wt_s", `CW make-up ${fmt(x("FT-703"))} m³/h`);
      set("o_fl", fmt(v.flare)); set("o_fl_s", v.flare > 10000 ? "⚠ flaring event" : "purge & sweep gas");
      set("o_av", fmt(v.availability, 1)); set("o_av_s", "peralatan wajib yang beroperasi");
      set("o_al", h.total); set("o_al_s", `${h.unack} belum di-acknowledge`); set("o_cr", h.CRIT); set("o_cr_s", `${h.WARN} warning · ${h.COMM} comm`);
      const st = !v.cduOn ? ["SHUTDOWN", "u-STOPPED"] : h.CRIT ? ["UPSET – ALARM ACTIVE", "u-ALARM"] : v.kapasitas < 0.8 * (v.Fsp / v.desain) * 100 ? ["REDUCED THROUGHPUT", "u-WARNING"] : h.WARN ? ["NORMAL – WARNING", "u-WARNING"] : ["NORMAL OPERATION", "u-RUNNING"];
      set("o_status", st[0], "big-st " + st[1]);
      const pr = v.prod, r = (p) => `<tr><td>${GRAFIK.NAMA[p]}</td><td class="num"><b>${fmt(pr[p], 1)}</b> m³/h</td><td class="num">${fmt((pr[p] * C.rho[p] * 24) / 1000)} t/d</td></tr>`;
      const html = `<thead><tr><th>Product</th><th class="num">Rate</th><th class="num">Daily</th></tr></thead><tbody>${["gasoline", "diesel", "kero", "naphtha", "lpg", "fueloil", "inter"].map(r).join("")}</tbody>`;
      if ($("#o_prodtbl").innerHTML !== html) $("#o_prodtbl").innerHTML = html;
      miniAlarm("#o_alm"); isiBlok(); semuaChip();
    },
  };
  function miniAlarm(sel, filter = () => true) {
    const a = ALARM.aktif.filter(filter).slice(0, 8);
    const html = a.length ? a.map((x) => `<div class="am sev-${x.sev}"><b>${x.tag}</b> ${x.desk}<small>${jamStr(x.tOn)}</small></div>`).join("") : `<div class="am ok">✓ Tidak ada alarm aktif</div>`;
    const el = $(sel); if (el && el.innerHTML !== html) el.innerHTML = html;
  }
  function blokDiagram() {
    return pfd("0 0 860 250", [
      ["tk", 10, 95, 90, 50, "CRUDE TANKS", "b_tk", "TK-01"], ["cdu", 140, 95, 100, 50, "CDU", "b_cdu", "C-101"], ["vdu", 290, 175, 100, 46, "VDU", "b_vdu", "C-201"],
      ["hdt", 290, 95, 100, 46, "HDT", "b_hdt", "R-301"], ["ref", 290, 20, 100, 46, "REFORMER", "b_ref", "R-801"], ["fcc", 440, 175, 100, 46, "FCC", "b_fcc", "R-871"],
      ["pt", 600, 70, 110, 110, "PRODUCT TANKS", "b_pt", "TK-05"], ["ld", 750, 95, 100, 50, "LOADING", "b_ld", "LOAD"],
    ], [["c", "M100 120 H140", "#d97706"], ["ar", "M240 132 V198 H290", "#a8a29e"], ["ds", "M240 120 H290", "#f97316"], ["nap", "M240 108 V43 H290", "#c4b5fd"],
      ["vgo", "M390 198 H440", "#78716c"], ["p1", "M390 43 H560 V90 H600", "#eab308"], ["p2", "M390 118 H600", "#f97316"], ["p3", "M540 198 H570 V160 H600", "#eab308"], ["ld", "M710 120 H750", "#22d3ee"]],
      "BLOCK FLOW – crude → products (m³/h)");
  }
  function isiBlok() {
    const v = V(), p = v.prod; if (!$("#b_tk")) return;
    set("b_tk", `${fmt(v.F)} out`); set("b_cdu", `${fmt(v.F)}`); set("b_vdu", `${fmt(x("FT-201"))}`); set("b_hdt", `${fmt(x("FT-301"))}`); set("b_ref", `${fmt(x("FT-801"))}`);
    set("b_fcc", SIM.S.fcc ? `${fmt(x("FT-874"))}` : "N/A"); set("b_pt", `${fmt(Object.values(p).reduce((a, b) => a + b, 0))} in`);
    const ld = v.PV["P-901A"].q + v.PV["P-901B"].q; set("b_ld", `${fmt(ld)}`);
    garis("c", v.F > 5, v.F / 600); garis("ar", x("FT-201") > 5); garis("ds", x("FT-301") > 5); garis("nap", x("FT-801") > 5); garis("vgo", v.fccOn); garis("p1", x("FT-801") > 5); garis("p2", x("FT-301") > 5); garis("p3", v.fccOn); garis("ld", ld > 1);
    [["cdu", "CDU"], ["vdu", "VDU"], ["hdt", "HDT"], ["ref", "REF"], ["fcc", "FCC"]].forEach(([n, a]) => { const s = ALARM.statusArea(a); node(n, s === "RUNNING" ? "on" : s === "ALARM" ? "trip" : ""); });
  }

  /* =========================================================
     2. 3D PLANT VISUALIZATION
     ========================================================= */
  P.viz = {
    judul: "3D Plant Visualization", ikon: "🧊",
    html: () => `${judul("3D Plant Visualization", "Kilang lengkap: 27 area · pipa berwarna per layanan · api flare & asap cerobong animasi · klik peralatan untuk detail")}
      <div class="toolbar">${Object.keys(Kilang3D.PRESET).map((k) => `<button class="btn" data-cam="${k}">${k}</button>`).join("")}<span class="sep"></span>
        <button class="btn on" data-tog="label">🏷 Labels</button><button class="btn on" data-tog="tank">🛢 Tank labels</button><button class="btn on" data-tog="aliran">➰ Flow</button><button class="btn" data-tog="rotate">🔄 Auto-rotate</button></div>
      <div class="card c3d tinggi"><div class="h3d" id="h3d_viz"></div></div>
      ${kartu("Pipe Service Colour Legend (configurable)", `<div class="legend">${Object.keys(C.pipa).map((k) => `<label><input type="color" data-pipa="${k}" value="${Kilang3D.warna ? Kilang3D.warna[k] : C.pipa[k][1]}"> ${C.pipa[k][0]}</label>`).join("")}</div>
        <div class="btns"><button class="btn kecil" data-pipareset>↺ Reset warna default</button><span class="muted kecil">Warna tidak mengikuti satu standar universal – sesuaikan dengan standar perusahaan Anda. Tersimpan di browser.</span></div>`)}`,
    masuk() { Kilang3D.pasang($("#h3d_viz")); $$("[data-pipa]").forEach((el) => (el.value = Kilang3D.warna[el.dataset.pipa])); },
    update() { semuaChip(); },
  };

  /* =========================================================
     3. CDU
     ========================================================= */
  const CDU_FEED = ["FT-101", "FQI-101", "PT-101", "TT-101"], CDU_DES = ["LT-102", "PT-102", "TT-102", "DPT-102", "AIT-102"], CDU_FUR = ["FT-103", "PT-103", "TT-103", "PT-104", "BMS-103"];
  const CDU_COL = ["PT-105", "PT-106", "DPT-105", "LT-105", "FT-105", "FT-106"], PROF = ["TT-105", "TT-106", "TT-107", "TT-108", "TT-109", "TT-110", "TT-111", "TT-112"];
  P.cdu = {
    judul: "CDU – Atmospheric", ikon: "🔥",
    html: () => `${judul("Crude Distillation Unit (CDU)", "Feed pump · preheat train · desalter · furnace · atmospheric column · overhead · side strippers", "CDU")}
      <div class="toolbar feedctl"><b>Crude feed setpoint FIC-101:</b><button class="btn" data-feed="-25">−25</button><input id="feedSP" type="number" min="0" max="700" step="5"><button class="btn" data-feed="25">+25</button><button class="btn g" data-feed="set">Set</button><span class="muted kecil">m³/h · desain ${fmt((C.kapasitasBPD * 0.158987) / 24)} m³/h (${fmt(C.kapasitasBPD)} BPD)</span></div>
      ${kartu("Process Flow – CDU", pfd("0 0 980 300", [
        ["tk", 10, 120, 80, 50, "CRUDE TK", "c_tk", "TK-01"], ["p101", 120, 125, 76, 40, "P-101A/B", "c_p101", "P-101A"], ["e101", 225, 120, 90, 50, "E-101", "c_e101", "E-101"],
        ["d102", 345, 120, 96, 50, "D-102 DESALT.", "c_d102", "D-102"], ["h101", 470, 110, 100, 70, "H-101 FURNACE", "c_h101", "H-101"], ["c101", 610, 20, 80, 260, "C-101", "c_c101", "C-101"],
        ["d101", 740, 20, 100, 40, "D-101 REFLUX", "c_d101", "D-101"], ["lpg", 870, 20, 100, 30, "LPG / NAPHTHA", "c_nap"], ["ker", 870, 90, 100, 30, "KEROSENE", "c_ker"], ["dsl", 870, 150, 100, 30, "DIESEL→HDT", "c_dsl"], ["ar", 870, 230, 100, 30, "AR → VDU", "c_ar"]],
        [["f1", "M90 145 H120", "#d97706"], ["f2", "M196 145 H225", "#d97706"], ["f3", "M315 145 H345", "#d97706"], ["f4", "M441 145 H470", "#d97706"], ["f5", "M570 145 H610", "#ef4444"], ["ov", "M650 20 V12 H790 V20", "#94a3b8"], ["rf", "M740 50 H690", "#38bdf8"],
          ["lp", "M840 35 H870", "#c4b5fd"], ["ke", "M690 105 H870", "#93c5fd"], ["ds", "M690 165 H870", "#f97316"], ["ar", "M690 245 H870", "#78716c"]]))}
      <div class="grid g-unit">
        <div class="card"><div class="card-h"><span>Instrumentation</span></div><div class="card-b">${grup("Crude feed", CDU_FEED)}${grup("Desalter D-102", CDU_DES)}${grup("Crude furnace H-101", CDU_FUR)}${grup("Distillation column C-101", CDU_COL)}</div></div>
        <div class="col">
          ${kartu("Column Temperature Profile TT-105 … TT-112", `<div id="cduProf"></div>`)}
          ${kartu("Product Streams", `<table class="tbl" id="cduProd"></table>`)}
          ${kartu("Equipment", `<div class="eq-grid" id="cduEq"></div>`)}
          ${kartu("Trend – feed & COT (4 h, 1-min)", grafik("chCdu", 200))}
        </div>
      </div>`,
    masuk() { $("#feedSP").value = SIM.S.feedSP; },
    update(n) {
      const v = V(), y = C.yieldCDU, F = x("FT-101"), on = F > 5;
      isiTag([...CDU_FEED, ...CDU_DES, ...CDU_FUR, ...CDU_COL]);
      set("c_tk", SIM.S.tangki.find((t) => t.mode === "FEED") ? C.tangki[SIM.S.tangki.findIndex((t) => t.mode === "FEED")][0] : "–"); set("c_p101", `${fmt(F)} m³/h`); set("c_e101", `${fmt(x("TT-102"))} °C`); set("c_d102", `${fmt(x("LT-102"), 0)} % lvl`);
      set("c_h101", `COT ${fmt(x("TT-103"), 1)} °C`); set("c_c101", `${fmt(x("PT-105"), 2)} barg`); set("c_d101", `${fmt(x("LT-105"))} %`);
      set("c_nap", `${fmt(F * (y.lpg + y.lnap + y.hnap))} m³/h`); set("c_ker", `${fmt(F * y.kero)} m³/h`); set("c_dsl", `${fmt(x("FT-106"))} m³/h`); set("c_ar", `${fmt(F * y.ar)} m³/h`);
      ["f1", "f2", "f3", "f4", "f5", "ov", "rf", "lp", "ke", "ds", "ar"].forEach((id) => garis(id, on, F / 600));
      node("p101", stPompa("P-101")); node("h101", x("BMS-103") > 1.5 ? "hot" : "trip"); node("c101", on ? "on" : "");
      // profil suhu
      const pr = PROF.map((t, i) => `<div class="prof-r"><span class="tag">${t}</span><div class="bar"><i style="width:${Math.max(2, ((x(t) - 60) / 320) * 100)}%"></i></div><b>${fmt(x(t), 1)} °C</b></div>`).join("");
      $("#cduProf").innerHTML = pr;
      const pd = [["LPG", y.lpg, "lpg"], ["Light naphtha", y.lnap, "naphtha"], ["Heavy naphtha → Reformer", y.hnap, "naphtha"], ["Kerosene", y.kero, "kero"], ["Diesel → HDT", y.diesel, "diesel"], ["Atmospheric residue → VDU", y.ar, "fueloil"]];
      const html = `<thead><tr><th>Stream</th><th class="num">Yield</th><th class="num">m³/h</th></tr></thead><tbody>${pd.map(([a, b]) => `<tr><td>${a}</td><td class="num">${fmt(b * 100)} %</td><td class="num"><b>${fmt(on ? F * b : 0, 1)}</b></td></tr>`).join("")}</tbody>`;
      if ($("#cduProd").innerHTML !== html) $("#cduProd").innerHTML = html;
      eqGrid("#cduEq", ["P-101A", "P-101B", "P-102A", "P-102B", "P-103A", "P-103B"], ["H-101"]);
      if (n % 3 === 0) GRAFIK.tagTren("chCdu", ["FT-101", "TT-103"]);
      semuaChip();
    },
  };
  function eqGrid(sel, ids, furnace = []) {
    const v = V(), m = { RUN: "ok", STBY: "warn", STOP: "off", TRIP: "crit", OFF: "off" }, t = { RUN: "RUNNING", STBY: "STANDBY", STOP: "STOPPED", TRIP: "TRIP", OFF: "OFF" };
    const html = ids.map((id) => { const p = v.PV[id] || v.KV[id]; return `<div class="eq st-${m[p.st]}" data-buka="${id}"><i></i><b>${id}</b><small>${t[p.st]}${p.st === "RUN" ? " · " + fmt(p.kw) + " kW" : ""}</small></div>`; }).join("") +
      furnace.map((f) => { const ok = f === "H-101" ? x("BMS-103") > 1.5 : true; return `<div class="eq st-${ok ? "ok" : "crit"}" data-buka="${f}"><i></i><b>${f}</b><small>${ok ? "FIRING" : "BMS TRIP"}</small></div>`; }).join("");
    const el = $(sel); if (el && el.innerHTML !== html) el.innerHTML = html;
  }

  /* =========================================================
     4. VDU
     ========================================================= */
  const VDU_T = ["FT-201", "TT-201", "PT-201", "TT-202", "TT-203", "LT-201", "FT-202", "DPT-201", "VT-201"];
  P.vdu = {
    judul: "VDU – Vacuum", ikon: "🌀",
    html: () => `${judul("Vacuum Distillation Unit (VDU)", "Vacuum furnace · vacuum column · ejector & condenser · residue transfer pumps", "VDU")}
      ${kartu("Process Flow – VDU", pfd("0 0 900 230", [["ar", 10, 90, 110, 46, "ATM RESIDUE", "v_ar", "C-101"], ["h201", 160, 80, 110, 66, "H-201 VAC FURNACE", "v_h", "H-201"], ["c201", 320, 20, 90, 200, "C-201", "v_c", "C-201"],
        ["ej", 460, 10, 120, 40, "EJ-201 EJECTORS", "v_ej", "EJ-201"], ["lv", 640, 60, 120, 32, "LVGO", "v_lv"], ["hv", 640, 110, 120, 32, "HVGO", "v_hv"], ["vr", 640, 175, 120, 40, "VAC RESIDUE", "v_vr", "P-201A"], ["dst", 790, 120, 100, 40, "FCC / FUEL OIL", "v_dst"]],
        [["a1", "M120 113 H160", "#78716c"], ["a2", "M270 113 H320", "#ef4444"], ["a3", "M365 20 V12 H460", "#94a3b8"], ["a4", "M410 76 H640", "#a8a29e"], ["a5", "M410 126 H640", "#78716c"], ["a6", "M410 195 H640", "#27272a"], ["a7", "M760 101 H775 V140 H790", "#78716c"]]))}
      <div class="grid g-unit">${kartu("Instrumentation", tabelTag(VDU_T))}
        <div class="col">${kartu("Vacuum Operating Condition", `<div class="det" id="vduDet"></div>`)}${kartu("Residue Transfer", `<div class="eq-grid" id="vduEq"></div><div class="det" id="vduRes" style="margin-top:8px"></div>`)}${kartu("Trend – vacuum & bottom temp (4 h)", grafik("chVdu", 200))}</div></div>`,
    update(n) {
      isiTag(VDU_T);
      const F = x("FT-201"), on = F > 5, yv = C.yieldVDU, vac = x("PT-201");
      set("v_ar", `${fmt(F)} m³/h`); set("v_h", `${fmt(x("TT-201"), 1)} °C`); set("v_c", `${fmt(vac, 1)} mbar a`); set("v_ej", `${fmt(x("FT-202"))} Nm³/h`);
      set("v_lv", `${fmt(F * yv.lvgo, 1)} m³/h`); set("v_hv", `${fmt(F * yv.hvgo, 1)} m³/h`); set("v_vr", `${fmt(F * yv.vr, 1)} m³/h`); set("v_dst", SIM.S.fcc ? "VGO → FCC" : "VGO → fuel oil");
      ["a1", "a2", "a3", "a4", "a5", "a6", "a7"].forEach((g) => garis(g, on, F / 250)); node("c201", on ? "on" : ""); node("h201", on ? "hot" : "");
      const kond = vac < 50 ? "DEEP VACUUM – NORMAL" : vac < 70 ? "VACUUM DEGRADED" : "VACUUM LOST";
      $("#vduDet").innerHTML = [["Column top pressure", `${fmt(vac, 1)} mbar(a)`], ["Equivalent", `${fmt(vac * 0.75, 1)} mmHg abs`], ["Condition", kond], ["Furnace outlet", `${fmt(x("TT-201"), 1)} °C`], ["Bottom temperature", `${fmt(x("TT-203"), 1)} °C`], ["Column ΔP", `${fmt(x("DPT-201"), 2)} kPa`]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      eqGrid("#vduEq", ["P-201A", "P-201B"]);
      const pr = V().PV["P-201A"].st === "RUN" ? V().PV["P-201A"] : V().PV["P-201B"];
      $("#vduRes").innerHTML = [["Residue to fuel oil tank", `${fmt(F * yv.vr, 1)} m³/h`], ["Transfer pump", pr.id + " " + pr.st], ["Pump vibration", `${fmt(pr.vib, 2)} mm/s`], ["Bearing temp", `${fmt(pr.bt, 1)} °C`]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      if (n % 3 === 0) GRAFIK.tagTren("chVdu", ["PT-201", "TT-203"]);
      semuaChip();
    },
  };

  /* =========================================================
     5. HYDROTREATER
     ========================================================= */
  const HDT_T = ["FT-301", "PT-301", "PT-302", "DPT-301", "TT-301", "TT-302", "TT-303", "TT-304", "FT-302", "FT-303", "LT-301", "AT-301", "VT-301"];
  P.hdt = {
    judul: "Hydrotreating", ikon: "🧪",
    html: () => `${judul("Hydrotreating Unit (Diesel HDT)", "Feed pump · feed/effluent exchanger · charge heater · reactor · HP separator · recycle gas compressor · stripper", "HDT")}
      <div class="grid g-unit">${kartu("Instrumentation", tabelTag(HDT_T))}
        <div class="col">${kartu("Reactor Temperature Profile", `<div id="hdtProf"></div>`)}${kartu("Hydrogen & Product Quality", `<div class="det" id="hdtDet"></div>`)}
          ${kartu("Equipment", `<div class="eq-grid" id="hdtEq"></div>`)}${kartu("Trend – reactor outlet & sulfur (4 h)", grafik("chHdt", 200))}</div></div>`,
    update(n) {
      isiTag(HDT_T);
      $("#hdtProf").innerHTML = [["TT-301", "Inlet"], ["TT-302", "Bed 1 out"], ["TT-303", "Bed 2 in (quench)"], ["TT-304", "Outlet"]].map(([t, l]) => `<div class="prof-r"><span class="tag">${t}</span><div class="bar"><i style="width:${Math.max(2, ((x(t) - 200) / 220) * 100)}%"></i></div><b>${fmt(x(t), 1)} °C</b></div><div class="muted kecil" style="margin:-3px 0 4px 68px">${l}</div>`).join("");
      const f = x("FT-301"), h2 = x("FT-302");
      $("#hdtDet").innerHTML = [["H₂ consumption", `${fmt(h2)} Nm³/h`], ["Specific H₂", `${fmt(f > 1 ? h2 / f : 0)} Nm³/m³`], ["Recycle gas", `${fmt(x("FT-303"))} Nm³/h`], ["Reactor WABT", `${fmt((x("TT-301") + x("TT-302") + x("TT-303") + x("TT-304")) / 4, 1)} °C`], ["Product sulfur AT-301", `${fmt(x("AT-301"), 1)} ppm`], ["Spec (Euro 5)", x("AT-301") <= 10 ? "≤ 10 ppm ✓ ON SPEC" : "OFF SPEC"]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      eqGrid("#hdtEq", ["P-301A", "P-301B", "K-301", "K-302"]);
      if (n % 3 === 0) GRAFIK.tagTren("chHdt", ["TT-304", "AT-301"]);
      semuaChip();
    },
  };

  /* =========================================================
     6. CATALYTIC REFORMING
     ========================================================= */
  const REF_T = ["FT-801", "TT-801", "TT-802", "TT-803", "TT-804", "TT-805", "TT-806", "PT-801", "DPT-801", "FT-802", "PT-802", "LT-801", "AT-801", "FT-803"];
  P.ref = {
    judul: "Catalytic Reforming", ikon: "⚗",
    html: () => `${judul("Catalytic Reforming Unit", "Feed pump · 3 reactors in series with inter-heaters · net gas compressor · separator · stabilizer", "REF")}
      <div class="grid g-unit">${kartu("Instrumentation", tabelTag(REF_T))}
        <div class="col">${kartu("Reactor Inlet / Outlet (endothermic ΔT)", `<div id="refProf"></div>`)}${kartu("Production & Quality", `<div class="det" id="refDet"></div>`)}
          ${kartu("Equipment", `<div class="eq-grid" id="refEq"></div>`)}${kartu("Trend – R-801 inlet & RON (4 h)", grafik("chRef", 200))}</div></div>`,
    update(n) {
      isiTag(REF_T);
      $("#refProf").innerHTML = [["R-801", "TT-801", "TT-802"], ["R-802", "TT-803", "TT-804"], ["R-803", "TT-805", "TT-806"]].map(([r, a, b]) => `<div class="prof-r"><span class="tag">${r} in</span><div class="bar"><i style="width:${Math.max(2, ((x(a) - 250) / 290) * 100)}%"></i></div><b>${fmt(x(a), 1)} °C</b></div><div class="prof-r"><span class="tag">${r} out</span><div class="bar"><i style="width:${Math.max(2, ((x(b) - 250) / 290) * 100)}%"></i></div><b>${fmt(x(b), 1)} °C</b></div><div class="muted kecil" style="margin:-2px 0 6px 68px">ΔT ${fmt(x(a) - x(b), 1)} °C</div>`).join("");
      const f = x("FT-801");
      $("#refDet").innerHTML = [["Reformate", `${fmt(f * C.yieldREF.reformate, 1)} m³/h`], ["Net H₂", `${fmt(x("FT-802"))} Nm³/h`], ["RON AT-801", fmt(x("AT-801"), 1)], ["Compressor disch.", `${fmt(x("PT-802"), 1)} barg`], ["Furnace fuel gas", `${fmt(x("FT-803"))} Nm³/h`], ["K-801 surge", V().KV["K-801"].surge]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      eqGrid("#refEq", ["P-801A", "P-801B", "K-801"]);
      if (n % 3 === 0) GRAFIK.tagTren("chRef", ["TT-801", "AT-801"]);
      semuaChip();
    },
  };

  /* =========================================================
     7. FCC (opsional)
     ========================================================= */
  const FCC_T = ["FT-874", "TT-871", "TT-872", "PT-871", "PT-872", "DPT-871", "FT-871", "FT-872", "FT-873", "AT-871", "AT-872", "VT-871", "LT-873", "TT-873"];
  P.fcc = {
    judul: "FCC Unit", ikon: "♻",
    html: () => `${judul("Fluid Catalytic Cracking (FCC)", "Unit opsional & dapat dikonfigurasi · reactor/riser · regenerator · main fractionator · air blower · wet gas compressor", "FCC")}
      <div class="toolbar"><b>Konfigurasi:</b><button class="btn" data-fcc="1">✔ FCC installed / in service</button><button class="btn" data-fcc="0">✖ FCC not installed (VGO → fuel oil)</button></div>
      <div id="fccOff" class="card" style="display:none"><div class="card-b"><b>FCC dinonaktifkan.</b> <span class="muted">Unit tidak tampil di 3D, alarm FCC ditekan, dan VGO dari VDU dialirkan ke tangki fuel oil. Aktifkan kembali dengan tombol di atas.</span></div></div>
      <div class="grid g-unit" id="fccOn">${kartu("Instrumentation", tabelTag(FCC_T))}
        <div class="col">${kartu("Reactor – Regenerator Balance", `<div class="det" id="fccDet"></div>`)}${kartu("Equipment", `<div class="eq-grid" id="fccEq"></div>`)}${kartu("Trend – reactor & regenerator (4 h)", grafik("chFcc", 200))}</div></div>`,
    update(n) {
      const on = SIM.S.fcc; $("#fccOff").style.display = on ? "none" : ""; $("#fccOn").style.display = on ? "" : "none";
      $$("[data-fcc]").forEach((b) => b.classList.toggle("on", (b.dataset.fcc === "1") === on));
      semuaChip(); if (!on) return;
      isiTag(FCC_T);
      const f = x("FT-874"), yf = C.yieldFCC;
      $("#fccDet").innerHTML = [["Feed (VGO)", `${fmt(f)} m³/h`], ["Cat/oil ratio", fmt(f > 1 ? (x("FT-871") * 60) / (f * 0.91) : 0, 1)], ["Coke burn", `${fmt(f * 0.91 * yf.cokeWt, 2)} t/h`], ["Regen − reactor ΔT", `${fmt(x("TT-872") - x("TT-871"))} °C`], ["Gasoline", `${fmt(f * yf.gasoline, 1)} m³/h`], ["LPG", `${fmt(f * yf.lpg, 1)} m³/h`], ["LCO + slurry", `${fmt(f * (yf.lco + yf.slurry), 1)} m³/h`], ["Flue gas O₂ / CO", `${fmt(x("AT-871"), 2)} % / ${fmt(x("AT-872"))} ppm`]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      eqGrid("#fccEq", ["P-871A", "P-871B", "K-871", "K-872"]);
      if (n % 3 === 0) GRAFIK.tagTren("chFcc", ["TT-871", "TT-872"]);
    },
  };

  /* =========================================================
     8. TANK FARM
     ========================================================= */
  const LIQ = { crude: "#4a3424", gasoline: "#facc15", diesel: "#f59e0b", kero: "#93c5fd", naphtha: "#c4b5fd", fueloil: "#3f3a36", inter: "#94a3b8", lpg: "#fda4af" };
  let tkPilih = 0;
  function svgTangki(i) {
    const k = C.tangki[i], sph = k[6] === "SPH", c = LIQ[k[2]];
    const sh = sph ? `<circle cx="60" cy="60" r="48" class="tk-sh"/>` : `<rect x="22" y="10" width="76" height="100" rx="4" class="tk-sh"/>`;
    const clip = sph ? `<circle cx="60" cy="60" r="46"/>` : `<rect x="24" y="12" width="72" height="96" rx="3"/>`;
    return `<svg viewBox="0 0 120 120"><defs><clipPath id="cp${i}">${clip}</clipPath></defs>${sh}<g clip-path="url(#cp${i})"><rect id="tl${i}" class="tk-liq" x="0" y="60" width="120" height="60" fill="${c}"/><path id="tw${i}" class="tk-wave" d="M-10 0 Q5 -3 20 0 T50 0 T80 0 T110 0 T140 0 V6 H-10Z" fill="${c}" opacity=".7"/></g>
      ${[10, 90].map((p) => { const y = 12 + 96 * (1 - p / 100); return `<line x1="${sph ? 10 : 98}" x2="${sph ? 18 : 106}" y1="${y}" y2="${y}" class="tk-mk"/><text x="${sph ? 2 : 108}" y="${y + 3}" class="tk-mt">${p === 90 ? "H" : "L"}</text>`; }).join("")}<text x="60" y="66" class="tk-big" id="tp${i}">–</text></svg>`;
  }
  P.tank = {
    judul: "Storage Tank Farm", ikon: "🛢",
    html: () => `${judul("Storage Tank Farm & Terminal", "Crude · gasoline · diesel · kerosene · naphtha · fuel oil · intermediate · LPG spheres · radar level & instrumentasi tiap tangki", "TANK")}
      <div class="kpis">${kpi("t_crude", "Crude inventory", "m³", "🛢", "k-feed")}${kpi("t_prod", "Product inventory", "ton", "📦", "k-inv")}${kpi("t_in", "Receipts today", "ton", "⬇", "k-prod")}${kpi("t_out", "Dispatched today", "ton", "⬆", "k-pow")}${kpi("t_rcv", "Crude receiving", "", "🚢", "k-feed")}</div>
      <div class="toolbar"><b>Tank auto-switching:</b><button class="btn" data-tkauto="1">AUTO</button><button class="btn" data-tkauto="0">MANUAL</button><span class="muted kecil">AUTO: rundown/feed dipindah otomatis saat level &gt; 87–88 % atau &lt; 12 %. Klik kartu tangki untuk detail & ubah mode.</span></div>
      <div class="grid g-tank">
        <div class="card"><div class="card-h"><span>Tanks – live level</span><span class="muted kecil">hijau normal · kuning H/L · merah HH/LL · abu-abu comm fail</span></div><div class="card-b"><div class="tk-grid">${C.tangki.map((k, i) => `<div class="tkc" data-tkpilih="${i}" id="tkc${i}"><div class="tkc-h"><span>${k[0]}</span><span class="mode" id="tm${i}">–</span></div><small class="muted">${k[1]} · ${fmt(k[3])} m³</small>${svgTangki(i)}<div class="tkc-g" id="tg${i}"></div></div>`).join("")}</div></div></div>
        <div class="col">
          <div class="card"><div class="card-h"><span id="tkJudul">Tank detail</span><span class="btns">${["RECV", "DISP", "FEED", "STBY"].map((m) => `<button class="btn kecil" data-tkmode="${m}">${m}</button>`).join("")}</span></div><div class="card-b"><div class="det" id="tkDet"></div><div id="tkTag"></div>${grafik("chTk", 170)}</div></div>
          ${kartu("Daily Inventory Movement (today)", `<table class="tbl" id="tkMove"></table>`)}
        </div>
      </div>`,
    masuk() { tkPilih = tkPilih || 0; },
    update(n) {
      const v = V(), E = SIM.S.E.day, S = SIM.S;
      set("t_crude", fmt(v.inv.crude)); set("t_crude_s", `${fmt((v.inv.crude / C.tangki.filter((k) => k[2] === "crude").reduce((s, k) => s + k[3], 0)) * 100, 1)} % kapasitas`);
      set("t_prod", fmt(v.inv.produkT)); set("t_prod_s", `${fmt(v.inv.produk)} m³ (excl. crude)`);
      set("t_in", fmt(E.prodT)); set("t_in_s", "rundown dari unit proses"); set("t_out", fmt(E.dispT)); set("t_out_s", "truck / marine / pipeline");
      set("t_rcv", S.terimaCrude ? "RECEIVING" : "IDLE"); set("t_rcv_s", S.terimaCrude ? "3.000 m³/h dari terminal laut" : "menunggu batch berikutnya");
      $$("[data-tkauto]").forEach((b) => b.classList.toggle("on", (b.dataset.tkauto === "1") === S.auto));
      C.tangki.forEach((k, i) => {
        const nn = 401 + i * 10, lv = x("LT-" + nn), tk = S.tangki[i], sv = ALARM.sevTag("LT-" + nn), cap = k[3], vol = (lv / 100) * cap;
        const y = 12 + 96 * (1 - Math.max(0, Math.min(100, lv)) / 100);
        const r = $("#tl" + i); if (r) { r.setAttribute("y", y); r.setAttribute("height", 120 - y); }
        const w = $("#tw" + i); if (w) w.setAttribute("transform", `translate(0 ${y - 3})`);
        set("tp" + i, fmt(lv, 1) + "%"); set("tm" + i, tk.mode, "mode mode-" + tk.mode);
        $("#tkc" + i).style.borderColor = sv === "crit" ? "#ef4444" : sv === "warn" ? "#facc15" : sv === "off" ? "#64748b" : "";
        $("#tkc" + i).classList.toggle("pilih", i === tkPilih);
        $("#tg" + i).innerHTML = `<span>Vol</span><b>${fmt(vol)} m³</b><span>Free</span><b>${fmt(cap - vol)} m³</b><span>Inv</span><b>${fmt((vol * C.rho[k[2]]) / 1000)} t</b><span>In/Out</span><b>${fmt(x("FIT-" + nn))}/${fmt(x("FIT-" + (nn + 1)))}</b><span>Temp</span><b>${fmt(x("TT-" + nn), 1)} °C</b>`;
      });
      // detail tangki terpilih
      const i = tkPilih, k = C.tangki[i], nn = 401 + i * 10, tk = S.tangki[i], lv = x("LT-" + nn), vol = (lv / 100) * k[3];
      set("tkJudul", `${k[0]} · ${k[1]} (${k[6] === "EFR" ? "external floating roof" : k[6] === "CR" ? "cone roof" : "pressurized sphere"})`);
      $$("[data-tkmode]").forEach((b) => b.classList.toggle("on", b.dataset.tkmode === tk.mode));
      $("#tkDet").innerHTML = [["Level", `${fmt(lv, 1)} %`], ["Product volume", `${fmt(vol)} m³`], ["Remaining capacity", `${fmt(k[3] - vol)} m³`], ["Inventory", `${fmt((vol * C.rho[k[2]]) / 1000)} t`], ["Inlet / outlet", `${fmt(tk.din)} / ${fmt(tk.dout)} m³/h`], ["Status", tk.mode + (lv >= 90 ? " · HIGH" : lv <= 10 ? " · LOW" : " · NORMAL")]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      const tg = tagsAlat(k[0]);
      if ($("#tkTag").dataset.i !== String(i)) { $("#tkTag").innerHTML = tabelTag(tg); $("#tkTag").dataset.i = i; GRAFIK.bersih("chTk"); }
      isiTag(tg);
      if (n % 3 === 0 || !$("#chTk").dataset.ok) { GRAFIK.tagTren("chTk", ["LT-" + nn, "TT-" + nn]); $("#chTk").dataset.ok = 1; }
      const mv = ["crude", "gasoline", "diesel", "kero", "naphtha", "fueloil", "lpg", "inter"].map((p) => { const ix = SIM.idxProduk(p); const din = ix.reduce((s, j) => s + S.tangki[j].din, 0), dout = ix.reduce((s, j) => s + S.tangki[j].dout, 0); return `<tr><td>${p === "crude" ? "Crude oil" : GRAFIK.NAMA[p]}</td><td class="num">${fmt(din)} m³/h</td><td class="num">${fmt(dout)} m³/h</td><td class="num"><b>${p === "crude" ? fmt(-E.crudeM3) + " m³" : fmt(E[p] || 0) + " t"}</b></td></tr>`; }).join("");
      const html = `<thead><tr><th>Product</th><th class="num">In now</th><th class="num">Out now</th><th class="num">Produced / used today</th></tr></thead><tbody>${mv}</tbody>`;
      if ($("#tkMove").innerHTML !== html) $("#tkMove").innerHTML = html;
      semuaChip();
    },
  };

  /* =========================================================
     9. PUMPS & COMPRESSORS
     ========================================================= */
  const ST_T = { RUN: ["ok", "RUNNING"], STBY: ["warn", "STANDBY"], STOP: ["off", "STOPPED"], TRIP: ["crit", "TRIP"], OFF: ["off", "OFF"] };
  const aksi = (attr, id, st) => `<span class="btns" style="margin:0">${st === "TRIP" ? `<button class="btn kecil r" ${attr}="${id}" data-aksi="reset">Reset</button>` : ""}${st !== "RUN" ? `<button class="btn kecil g" ${attr}="${id}" data-aksi="start">Start</button>` : `<button class="btn kecil" ${attr}="${id}" data-aksi="stop">Stop</button>`}${st !== "STBY" && st !== "RUN" && st !== "TRIP" ? `<button class="btn kecil" ${attr}="${id}" data-aksi="stby">Stby</button>` : ""}</span>`;
  P.rot = {
    judul: "Pumps & Compressors", ikon: "⚙",
    html: () => `${judul("Pump & Compressor Monitoring", "RUNNING · STOPPED · STANDBY · WARNING · TRIP – standby pump auto-start 10 s setelah pompa duty trip")}
      <div class="kpis">${kpi("r_run", "Pumps running", "", "▶", "k-av")}${kpi("r_sb", "Standby", "", "⏸", "k-pow")}${kpi("r_trip", "Tripped", "", "⛔", "k-crit")}${kpi("r_warn", "Warning (vib / temp / surge)", "", "⚠", "k-warn")}${kpi("r_kw", "Motor power total", "kW", "⚡", "k-pow")}</div>
      ${kartu("Pumps", `<div class="card-b scroll" style="padding:0" id="rotP"></div>`)}
      ${kartu("Compressors", `<div class="card-b scroll" style="padding:0" id="rotK"></div>`)}`,
    update() {
      const v = V(); let run = 0, sb = 0, tr = 0, wr = 0, kw = 0;
      const rp = Object.values(v.PV).map((p) => {
        const s = ST_T[p.st], warn = p.st === "RUN" && (p.vib > 7.1 || p.bt > 85);
        if (p.st === "RUN") run++; if (p.st === "STBY") sb++; if (p.trip) tr++; if (warn) wr++; kw += p.kw;
        const info = C.pompa.find((q) => q[0] === p.id);
        return `<tr><td class="tag" data-buka="${p.id}" style="cursor:pointer">${p.id}</td><td>${info[1]}</td><td><span class="st st-${warn ? "warn" : s[0]}">${warn ? "WARNING" : s[1]}</span></td><td class="num">${fmt(p.ps, 1)}</td><td class="num">${fmt(p.pd, 1)}</td><td class="num"><b>${fmt(p.q)}</b></td><td class="num">${fmt(p.a)}</td><td class="num">${p.diesel ? "diesel" : fmt(p.v)}</td><td class="num">${fmt(p.kw)}</td><td class="num">${fmt(p.hz, 2)}</td><td class="num ${p.bt > 85 ? "neg" : ""}">${fmt(p.bt, 1)}</td><td class="num ${p.vib > 7.1 ? "neg" : ""}">${fmt(p.vib, 2)}</td><td class="num">${fmt(p.h)}</td><td>${p.trip ? '<span class="st st-crit">TRIP</span>' : "–"}</td><td>${aksi("data-pompa", p.id, p.st)}</td></tr>`;
      }).join("");
      const hp = `<table class="tbl"><thead><tr><th>Tag</th><th>Service</th><th>Status</th><th class="num">Suction bar</th><th class="num">Disch. bar</th><th class="num">Flow m³/h</th><th class="num">Current A</th><th class="num">Voltage V</th><th class="num">Power kW</th><th class="num">Freq Hz</th><th class="num">Bearing °C</th><th class="num">Vib mm/s</th><th class="num">Run hours</th><th>Trip</th><th>Command</th></tr></thead><tbody>${rp}</tbody></table>`;
      if ($("#rotP").innerHTML !== hp) $("#rotP").innerHTML = hp;
      const rk = Object.values(v.KV).map((k) => {
        const s = ST_T[k.st], warn = k.st === "RUN" && (k.vib > 7.1 || k.margin < 10); if (warn) wr++; if (k.trip) tr++; kw += k.kw;
        const info = C.kompresor.find((q) => q[0] === k.id);
        return `<tr><td class="tag" data-buka="${k.id}" style="cursor:pointer">${k.id}</td><td>${info[1]}<br><small class="muted">${k.tipe}</small></td><td><span class="st st-${warn ? "warn" : s[0]}">${warn ? "WARNING" : s[1]}</span></td><td class="num">${fmt(k.ps, 1)}</td><td class="num">${fmt(k.pd, 1)}</td><td class="num">${fmt(k.ts, 1)}</td><td class="num">${fmt(k.td, 1)}</td><td class="num"><b>${fmt(k.q)}</b></td><td class="num">${fmt(k.rpm)}</td><td class="num ${k.vib > 7.1 ? "neg" : ""}">${fmt(k.vib, 2)}</td><td class="num">${fmt(k.bt, 1)}</td><td class="num">${fmt(k.lop, 2)}</td><td class="num">${fmt(k.lot, 1)}</td><td>${k.surge === "ANTI-SURGE ACTIVE" ? '<span class="st st-warn">ASC ACTIVE</span>' : k.surge}<br><small class="muted">margin ${fmt(k.margin)} %</small></td><td class="num">${fmt(k.h)}</td><td>${aksi("data-komp", k.id, k.st)}</td></tr>`;
      }).join("");
      const hk = `<table class="tbl"><thead><tr><th>Tag</th><th>Service</th><th>Status</th><th class="num">Ps barg</th><th class="num">Pd barg</th><th class="num">Ts °C</th><th class="num">Td °C</th><th class="num">Flow Nm³/h</th><th class="num">RPM</th><th class="num">Vib mm/s</th><th class="num">Bearing °C</th><th class="num">Lube oil bar</th><th class="num">Lube oil °C</th><th>Surge protection</th><th class="num">Run hours</th><th>Command</th></tr></thead><tbody>${rk}</tbody></table>`;
      if ($("#rotK").innerHTML !== hk) $("#rotK").innerHTML = hk;
      set("r_run", run); set("r_sb", sb); set("r_trip", tr); set("r_warn", wr); set("r_kw", fmt(kw));
    },
  };

  /* =========================================================
     10. BOILER & STEAM
     ========================================================= */
  const BLR_T = ["PT-601", "TT-601", "FT-601", "LT-601A", "LT-601B", "FT-602", "FT-603A", "FT-603B", "PT-602", "TT-602", "AT-601", "AT-602A", "AT-602B", "TT-603A", "TT-603B"];
  P.boil = {
    judul: "Boiler & Steam", ikon: "♨",
    html: () => `${judul("Boiler & Steam System", "2 boiler gas-fired · steam drum · economizer · superheater · HP steam header 42 bar · steam turbine generator · condensate return", "BLR")}
      <div class="grid g2">${["A", "B"].map((s, i) => kartu(`Boiler B-601${s}`, `<div class="det" id="blr${s}"></div><div class="btns"><button class="btn g kecil" data-blr="${i}" data-on="1">🔥 Light-off / in service</button><button class="btn r kecil" data-blr="${i}" data-on="0">■ Shut down</button></div>`, "", `<span class="st" id="blrS${s}">–</span>`)).join("")}</div>
      <div class="grid g-unit">${kartu("Instrumentation", tabelTag(BLR_T))}
        <div class="col">${kartu("Steam Balance", `<div class="det" id="stmBal"></div>`)}
          ${kartu("Boiler Efficiency – calculation basis", `<div class="det" id="blrEff"></div><div class="baseline kecil">Metode langsung (input–output): <b>η = ṁ<sub>steam</sub> × (h<sub>steam</sub> − h<sub>fw</sub>) ÷ (Q<sub>fuel</sub> × LHV)</b><br>h<sub>steam</sub> = 3.214 kJ/kg (42 bar, 400 °C) · h<sub>fw</sub> = 546 kJ/kg (128 °C) · LHV fuel gas = ${fmt(C.lhvFuelGas, 1)} MJ/Nm³ (asumsi, dapat diubah di config.js). Nilai = SIMULATION.</div>`)}
          ${kartu("Trend – header pressure & steam flow (4 h)", grafik("chBlr", 190))}</div></div>`,
    update(n) {
      const v = V(); isiTag(BLR_T);
      ["A", "B"].forEach((s, i) => {
        const on = v.blrOn[i];
        status("blrS" + s, on ? "ok" : SIM.S.f.boiler && i === 0 ? "crit" : "off", on ? "RUNNING" : SIM.S.f.boiler && i === 0 ? "TRIP" : "STOPPED");
        $("#blr" + s).innerHTML = [["Steam output", `${fmt(on ? v.muatB : 0, 1)} t/h`], ["Drum level", `${fmt(x("LT-601" + s), 1)} %`], ["Fuel gas", `${fmt(x("FT-603" + s))} Nm³/h`], ["Flue gas O₂", `${fmt(x("AT-602" + s), 2)} %`], ["Stack temperature", `${fmt(x("TT-603" + s))} °C`], ["Load", `${fmt(on ? v.muatB : 0)} % MCR`]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      });
      $("#stmBal").innerHTML = [["Boiler production", `${fmt(v.steamTot - (x("FT-874") * 0.2 + v.smr * 0.0008), 1)} t/h`], ["Waste heat (FCC/SMR)", `${fmt(x("FT-874") * 0.2 + v.smr * 0.0008, 1)} t/h`], ["Total production", `${fmt(v.steamTot, 1)} t/h`], ["Process consumption", `${fmt(v.steamPakai, 1)} t/h`], ["Steam turbine STG-01", `${fmt(v.stgUap, 1)} t/h → ${fmt(v.stg)} kW`], ["Header pressure", `${fmt(x("PT-601"), 1)} bar`], ["Deficit", v.kurangUap > 0.5 ? `${fmt(v.kurangUap, 1)} t/h` : "none"]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      const fuel = x("FT-603A") + x("FT-603B"), prodB = v.steamTot - (x("FT-874") * 0.2 + v.smr * 0.0008);
      const eff = fuel > 10 ? (prodB * 1000 * (3214 - 546)) / (fuel * C.lhvFuelGas * 1000) * 100 : 0;
      $("#blrEff").innerHTML = [["Efficiency (direct)", `${fmt(eff, 1)} %`], ["Fuel consumption", `${fmt(fuel)} Nm³/h`], ["Heat input", `${fmt((fuel * C.lhvFuelGas) / 3600, 1)} MW`], ["Heat to steam", `${fmt((prodB * (3214 - 546)) / 3600, 1)} MW`]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      if (n % 3 === 0) GRAFIK.tagTren("chBlr", ["PT-601", "FT-601"]);
      semuaChip();
    },
  };

  /* =========================================================
     11. COOLING WATER
     ========================================================= */
  const CW_T = ["FT-701", "PT-701", "TT-701", "TT-702", "LT-701", "AIT-701", "AIT-702", "AIT-703", "FT-703", "FT-704"];
  P.cw = {
    judul: "Cooling Water", ikon: "💧",
    html: () => `${judul("Cooling Water System", "Cooling tower 4 sel (induced draft) · basin · pompa CW · header distribusi · jaringan heat exchanger", "CW")}
      <div class="grid g-unit">${kartu("Instrumentation", tabelTag(CW_T))}
        <div class="col">${kartu("Cooling Tower Cells & Pumps", `<div class="eq-grid" id="cwEq"></div>`)}${kartu("Performance", `<div class="det" id="cwDet"></div>`)}${kartu("Trend – supply & return (4 h)", grafik("chCw", 200))}</div></div>`,
    update(n) {
      const v = V(); isiTag(CW_T);
      const sel = [0, 1, 2, 3].map((i) => `<div class="eq st-${i < v.kipas ? "ok" : "crit"}" data-buka="CT-701"><i></i><b>CT cell ${i + 1}</b><small>${i < v.kipas ? "FAN RUNNING" : "FAN FAILED"}</small></div>`).join("");
      const html = sel + ["P-701A", "P-701B", "P-701C"].map((id) => { const p = v.PV[id]; return `<div class="eq st-${{ RUN: "ok", STBY: "warn", STOP: "off", TRIP: "crit" }[p.st]}" data-buka="${id}"><i></i><b>${id}</b><small>${p.st} · ${fmt(p.q)} m³/h</small></div>`; }).join("");
      if ($("#cwEq").innerHTML !== html) $("#cwEq").innerHTML = html;
      const wb = x("TT-1161") - 4, sup = x("TT-701"), ret = x("TT-702"), q = x("FT-701");
      $("#cwDet").innerHTML = [["Range (return − supply)", `${fmt(ret - sup, 1)} °C`], ["Approach (supply − wet bulb)", `${fmt(sup - wb, 1)} °C`], ["Heat rejected", `${fmt((q * 1000 * 4.18 * (ret - sup)) / 3.6e6, 1)} MW`], ["Cycles of concentration", fmt((x("FT-703") / Math.max(1, x("FT-704"))), 1)], ["Evaporation", `${fmt(x("FT-703") - x("FT-704"))} m³/h`], ["Wet bulb (est.)", `${fmt(wb, 1)} °C`]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      if (n % 3 === 0) GRAFIK.tagTren("chCw", ["TT-701", "TT-702"]);
      semuaChip();
    },
  };

  /* =========================================================
     12. UTILITIES
     ========================================================= */
  const U = { wtp: ["FT-1001", "AIT-1001", "AIT-1002", "LT-1001", "AIT-1003", "FT-1002"], ww: ["FT-1011", "LT-1011", "AIT-1011", "AIT-1012", "AIT-1013", "AIT-1014", "AIT-1015"], ia: ["PT-1021", "AT-1021"], n2: ["AT-1031", "FT-1031", "PT-1031", "LT-1031"], fg: ["PT-1041", "FT-1041", "AT-1041"], h2: ["PT-1051", "FT-1051", "FT-1052", "AT-1051"], sru: ["FT-1061", "AT-1061"] };
  P.util = {
    judul: "Utilities", ikon: "🏗",
    html: () => `${judul("Utilities", "Water treatment · wastewater treatment · instrument air · nitrogen · fuel gas · hydrogen · sulfur recovery", "UTIL")}
      <div class="toolbar"><b>SRU:</b><button class="btn" data-sru="1">In service</button><button class="btn" data-sru="0">Out of service (acid gas → flare)</button><span class="sep"></span><b>H₂ plant:</b><button class="btn" data-unit="H2" data-on="1">Run</button><button class="btn" data-unit="H2" data-on="0">Shutdown</button></div>
      <div class="grid g2">${kartu("Water Treatment Plant (WTP)", tabelTag(U.wtp))}${kartu("Wastewater Treatment Plant (WWTP)", tabelTag(U.ww))}
        ${kartu("Instrument Air & Nitrogen", tabelTag([...U.ia, ...U.n2]) + `<div class="eq-grid" id="iaEq" style="margin-top:8px"></div>`)}${kartu("Fuel Gas & Hydrogen", tabelTag([...U.fg, ...U.h2]) + `<div class="det" id="h2Bal" style="margin-top:8px"></div>`)}
        ${kartu("Sulfur Recovery Unit (SRU)", tabelTag(U.sru) + `<div class="det" id="sruDet" style="margin-top:8px"></div>`, "", chip("SRU"))}${kartu("Hydrogen Plant (SMR)", `<div class="det" id="smrDet"></div>`, "", chip("H2"))}</div>`,
    update() {
      const v = V(); isiTag(Object.values(U).flat());
      $$("[data-sru]").forEach((b) => b.classList.toggle("on", (b.dataset.sru === "1") === SIM.S.sru));
      eqGrid("#iaEq", ["K-1021A", "K-1021B"]);
      $("#h2Bal").innerHTML = [["H₂ demand", `${fmt(v.h2Perlu)} Nm³/h`], ["Reformer net H₂", `${fmt(v.refH2)} Nm³/h`], ["SMR production", `${fmt(v.smr)} Nm³/h`], ["Deficit", v.defisit > 1 ? `${fmt(v.defisit)} Nm³/h` : "none"]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      $("#sruDet").innerHTML = [["Sulfur production", `${fmt(x("FT-1061") * 24, 1)} t/d`], ["Recovery efficiency", `${fmt(x("AT-1061"), 2)} %`], ["Incinerator SO₂", `${fmt(x("AT-1111"))} mg/Nm³`], ["Status", SIM.S.sru ? "IN SERVICE" : "OUT OF SERVICE"]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      $("#smrDet").innerHTML = [["H₂ production FT-1051", `${fmt(v.smr)} Nm³/h`], ["Capacity used", `${fmt((v.smr / C.h2.smrMaks) * 100, 1)} %`], ["Header pressure", `${fmt(x("PT-1051"), 1)} barg`], ["Purity (PSA)", `${fmt(x("AT-1051"), 2)} %`], ["Fuel gas (est.)", `${fmt(v.smr ? 320 + v.smr * 0.13 : 0)} Nm³/h`], ["Status", SIM.S.unitOff.H2 ? "SHUTDOWN" : "RUNNING"]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      semuaChip();
    },
  };

  /* =========================================================
     13. ELECTRICAL
     ========================================================= */
  const EL_T = ["EI-1201", "EI-1202", "SI-1201", "JI-1201", "JI-1202", "JI-1205", "PF-1201", "JI-1203", "JI-1204", "TT-1201", "TT-1202"];
  P.elec = {
    judul: "Electrical", ikon: "⚡",
    html: () => `${judul("Electrical Substation & Distribution", "Grid 150 kV → 2 × 40 MVA transformer → bus 20 kV · steam turbine generator · feeder unit proses", "ELEC")}
      ${kartu("Single Line Diagram (simplified)", pfd("0 0 980 300", [["grid", 380, 10, 220, 40, "UTILITY GRID 150 kV", "e_grid", "SUB"], ["tr1", 300, 80, 150, 44, "TR-01 150/20 kV", "e_tr1", "TR-01"], ["tr2", 530, 80, 150, 44, "TR-02 150/20 kV", "e_tr2", "TR-02"], ["stg", 760, 80, 170, 44, "STG-01 STEAM TURBINE", "e_stg", "STG-01"],
        ["bus", 60, 160, 860, 26, "MAIN BUS 20 kV", "e_bus", "SUB"], ["f1", 40, 230, 130, 50, "CDU / VDU", "e_f1", "C-101"], ["f2", 190, 230, 130, 50, "HDT / REF", "e_f2", "R-301"], ["f3", 340, 230, 130, 50, "FCC / SRU / H₂", "e_f3", "R-871"], ["f4", 490, 230, 130, 50, "UTILITIES / CW", "e_f4", "CT-701"], ["f5", 640, 230, 130, 50, "TANK FARM", "e_f5", "TK-05"], ["f6", 790, 230, 150, 50, "BUILDINGS / MISC", "e_f6", "CCR"]],
        [["g1", "M490 50 V65 H375 V80", "#a78bfa"], ["g2", "M490 50 V65 H605 V80", "#a78bfa"], ["t1", "M375 124 V160", "#22d3ee"], ["t2", "M605 124 V160", "#22d3ee"], ["s1", "M845 124 V160", "#22c55e"],
          ...[105, 255, 405, 555, 705, 865].map((xx, i) => ["d" + i, `M${xx} 186 V230`, "#facc15"])]))}
      <div class="grid g-unit">${kartu("Instrumentation", tabelTag(EL_T))}<div class="col">${kartu("Power Balance", `<div class="det" id="elDet"></div>`)}${kartu("Trend – load & STG (4 h)", grafik("chEl", 200))}</div></div>`,
    update(n) {
      const v = V(); isiTag(EL_T);
      const pk = v.PV, kw = (ids) => ids.reduce((s, id) => s + ((pk[id] || v.KV[id] || { kw: 0 }).kw || 0), 0);
      const f = [kw(["P-101A", "P-101B", "P-102A", "P-102B", "P-103A", "P-103B", "P-201A", "P-201B"]) + 700, kw(["P-301A", "P-301B", "P-801A", "P-801B", "K-301", "K-302", "K-801"]) + 400, kw(["P-871A", "P-871B", "K-871", "K-872"]) + 900, kw(["P-601A", "P-601B", "P-701A", "P-701B", "P-701C", "K-1021A", "K-1021B"]) + v.kipas * 185, kw(["P-901A", "P-901B"]) + 300, 0];
      f[5] = Math.max(0, v.loadKW - f.slice(0, 5).reduce((a, b) => a + b, 0));
      set("e_grid", `${fmt(x("EI-1201"), 1)} kV · import ${fmt(v.imp / 1000, 1)} MW`); set("e_tr1", `${fmt(x("JI-1203"), 1)} % · ${fmt(x("TT-1201"))} °C`); set("e_tr2", v.tr02 ? `${fmt(x("JI-1204"), 1)} % · ${fmt(x("TT-1202"))} °C` : "TRIPPED");
      set("e_stg", `${fmt(v.stg / 1000, 2)} MW`); set("e_bus", `${fmt(x("EI-1202"), 2)} kV · ${fmt(x("SI-1201"), 2)} Hz · ${fmt(v.loadKW / 1000, 1)} MW`);
      f.forEach((p, i) => set("e_f" + (i + 1), `${fmt(p / 1000, 2)} MW`));
      node("tr2", v.tr02 ? "on" : "trip"); node("tr1", "on"); node("stg", v.stg > 100 ? "on" : ""); garis("t2", v.tr02); garis("g2", v.tr02); garis("s1", v.stg > 100);
      $("#elDet").innerHTML = [["Total load", `${fmt(v.loadKW)} kW`], ["STG generation", `${fmt(v.stg)} kW`], ["Grid import", `${fmt(v.imp)} kW`], ["Self-generation share", `${fmt((v.stg / Math.max(1, v.loadKW)) * 100, 1)} %`], ["Energy today", `${fmt(SIM.S.E.day.power / 1000, 1)} MWh`], ["Specific power", `${fmt(v.F > 1 ? v.loadKW / v.F : 0, 1)} kWh/m³ crude`]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
      if (n % 3 === 0) GRAFIK.tagTren("chEl", ["JI-1201", "JI-1202"]);
      semuaChip();
    },
  };

  /* =========================================================
     14. FLARE, ENVIRONMENT & SAFETY
     ========================================================= */
  const FL_T = ["FT-901", "PT-901", "LT-901", "FT-902", "TE-901A", "TE-901B", "TE-901C"];
  const CEMS = [["FCC regenerator stack", 1101], ["SRU incinerator stack", 1111], ["Boiler stack", 1121], ["CDU furnace stack", 1131]];
  P.env = {
    judul: "Flare, Environment & Safety", ikon: "🌿",
    html: () => `${judul("Flare System, Environmental & Safety Monitoring", "Flare stack & pilot · CEMS cerobong · detektor gas H₂S / LEL · cuaca · firewater", "ENV")}
      <div class="kpis">${kpi("e_fl", "Flare gas flow", "Nm³/h", "🔥", "k-flare")}${kpi("e_flt", "Flared today", "Nm³", "📈", "k-flare")}${kpi("e_pil", "Pilots lit", "/ 3", "🕯", "k-av")}${kpi("e_ws", "Wind", "m/s", "🌬", "k-pow")}${kpi("e_fw", "Firewater pressure", "barg", "🚒", "k-crit")}</div>
      <div class="grid g-unit">${kartu("Flare System FL-901", tabelTag(FL_T), "", chip("FLR"))}
        <div class="col">${kartu("Trend – flare flow (4 h)", grafik("chFl", 190))}${kartu("Weather & Firewater", tabelTag(["WS-1161", "WD-1161", "TT-1161", "MT-1161", "PT-1171", "LT-1171"]) + `<div class="eq-grid" id="fwEq" style="margin-top:8px"></div>`)}</div></div>
      ${kartu("Continuous Emission Monitoring (CEMS) – batas contoh, sesuaikan dengan izin lingkungan", `<table class="tbl" id="cemsTbl"></table>`)}
      <div class="grid g2">${kartu("H₂S Gas Detectors (ppm)", tabelTag(Array.from({ length: 8 }, (_, i) => "GD-" + (1141 + i))))}${kartu("Combustible Gas Detectors (%LEL)", tabelTag(Array.from({ length: 6 }, (_, i) => "GD-" + (1151 + i))))}</div>`,
    update(n) {
      const v = V(); isiTag([...FL_T, "WS-1161", "WD-1161", "TT-1161", "MT-1161", "PT-1171", "LT-1171", ...Array.from({ length: 8 }, (_, i) => "GD-" + (1141 + i)), ...Array.from({ length: 6 }, (_, i) => "GD-" + (1151 + i))]);
      set("e_fl", fmt(x("FT-901"))); set("e_fl_s", x("FT-901") > 10000 ? "⚠ FLARING EVENT" : "normal purge"); set("e_flt", fmt(SIM.S.E.day.flare)); set("e_flt_s", `steam ${fmt(x("FT-902"), 1)} t/h (smokeless)`);
      const pil = ["A", "B", "C"].filter((s) => x("TE-901" + s) > 200).length; set("e_pil", pil); set("e_pil_s", pil < 3 ? "⚠ pilot flame-out" : "all pilots proven");
      const arah = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(x("WD-1161") / 45) % 8];
      set("e_ws", fmt(x("WS-1161"), 1)); set("e_ws_s", `dari ${arah} (${fmt(x("WD-1161"))}°)`); set("e_fw", fmt(x("PT-1171"), 1)); set("e_fw_s", v.deluge ? "🚨 DELUGE ACTIVE" : "jockey pump – standby");
      const B = C.emisiBatas;
      const html = `<thead><tr><th>Stack</th>${["SO₂", "NOx", "CO", "Particulate"].map((p) => `<th class="num">${p} mg/Nm³</th>`).join("")}<th>Status</th></tr></thead><tbody>${CEMS.map(([nm, b]) => { const vals = [0, 1, 2, 3].map((k) => x("AT-" + (b + k))), lims = [B.so2, B.nox, B.co, B.pm]; const worst = Math.max(...vals.map((q, k) => q / lims[k])); return `<tr><td>${nm}</td>${vals.map((q, k) => `<td class="num"><b>${fmt(q, k === 3 ? 1 : 0)}</b><div class="bar" style="margin-top:3px"><i class="${q / lims[k] > 1 ? "c" : q / lims[k] > 0.85 ? "w" : ""}" style="width:${Math.min(100, (q / lims[k]) * 100)}%"></i></div><small class="muted">limit ${fmt(lims[k])}</small></td>`).join("")}<td><span class="st st-${worst > 1 ? "crit" : worst > 0.85 ? "warn" : vals[0] + vals[1] > 0 ? "ok" : "off"}">${worst > 1 ? "EXCEEDED" : worst > 0.85 ? "NEAR LIMIT" : vals[0] + vals[1] > 0 ? "COMPLIANT" : "OFFLINE"}</span></td></tr>`; }).join("")}</tbody>`;
      if ($("#cemsTbl").innerHTML !== html) $("#cemsTbl").innerHTML = html;
      eqGrid("#fwEq", ["P-1171A", "P-1171B"]);
      if (n % 3 === 0) GRAFIK.tagTren("chFl", ["FT-901", "LT-901"]);
      semuaChip();
    },
  };

  /* =========================================================
     15. TREND
     ========================================================= */
  P.trend = {
    judul: "Trend Monitoring", ikon: "📈",
    html: () => `${judul("Trend Monitoring", "Real time (1 menit) · 1 jam · 24 jam (5 menit) · harian · mingguan · bulanan · tahunan")}
      <div class="toolbar">${[["rt", "Real Time"], ["1h", "1 Hour"], ["24h", "24 Hours"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"]].map(([k, l]) => `<button class="btn" data-filter="${k}">${l}</button>`).join("")}<span class="muted kecil" id="trendInfo"></span></div>
      <div class="grid g2">${kartu("Crude Feed & Capacity", grafik("chA", 250))}${kartu("Process Temperatures / Production", grafik("chB", 250))}${kartu("Utilities – steam · power · fuel gas · water", grafik("chC", 250))}${kartu("Flare & Emissions", grafik("chD", 250))}
        <div class="card"><div class="card-h"><span id="jdlE">–</span></div><div class="card-b">${grafik("chE", 250)}</div></div><div class="card"><div class="card-h"><span id="jdlF">–</span></div><div class="card-b">${grafik("chF", 250)}</div></div></div>`,
    masuk: () => GRAFIK.trend(),
    update(n) { if (GRAFIK.isRT() && n % 3 === 0) GRAFIK.trend(); },
  };

  /* =========================================================
     16. ALARM & EVENT
     ========================================================= */
  let filterAlm = "aktif";
  const FAULTS = [["p101", "⛽ Crude charge pump P-101A trip"], ["bms", "🔥 CDU furnace BMS trip"], ["k301", "🌀 HDT recycle compressor trip"], ["surge", "📉 Reformer compressor surge"], ["pvib", "📳 P-201A rising vibration"], ["ctfan", "💨 Cooling tower fan failure"], ["boiler", "♨ Boiler A trip"], ["pilot", "🕯 Flare pilot flame-out"], ["flare", "🔥 PSV relief → flaring"], ["h2s", "☠ H₂S release at SRU"], ["lel", "💥 LPG leak + deluge"], ["commCDU", "📡 DCS CDU comm failure"], ["commTANK", "📡 Tank gauging comm failure"], ["tr02", "⚡ Transformer TR-02 trip"], ["ia", "🌬 Instrument air comp. trip"], ["overfill", "🛢 TK-05 overfill (auto-switch fail)"]];
  P.alarm = {
    judul: "Alarm & Event", ikon: "🔔",
    html: () => `${judul("Alarm & Event Management", "Hijau = normal · Kuning = warning · Merah = alarm/critical · Abu-abu = communication failure · alarm unit yang shutdown ditekan (ISA-18.2)")}
      <div class="kpis">${kpi("a_crit", "Critical", "", "🔴", "k-crit")}${kpi("a_warn", "Warning", "", "🟡", "k-warn")}${kpi("a_comm", "Comm failure", "", "⚪", "k-comm")}${kpi("a_unack", "Unacknowledged", "", "🔔")}</div>
      <div class="grid g-alm">
        <div class="card"><div class="card-h"><span>Alarm List</span><span class="btns">${[["aktif", "Active"], ["CRIT", "Critical"], ["WARN", "Warning"], ["COMM", "Comm"], ["hist", "History"], ["event", "Events"]].map(([k, l]) => `<button class="btn kecil" data-afil="${k}">${l}</button>`).join("")}<button class="btn kecil g" data-ackall>✔ Ack all</button></span></div><div class="card-b scroll" id="almTbl"></div></div>
        ${kartu("Fault Simulation (SIMULATION)", `<p class="muted kecil">Untuk latihan operator & uji alarm. Tidak memengaruhi peralatan nyata.</p><div class="fault-grid">${FAULTS.map(([k, l]) => `<button class="btn" data-fault="${k}">${l}</button>`).join("")}</div><div class="btns"><button class="btn g" data-pulih>✔ Clear all faults & reset equipment</button></div>`)}
      </div>`,
    update() {
      const h = ALARM.hitung(); set("a_crit", h.CRIT); set("a_warn", h.WARN); set("a_comm", h.COMM); set("a_unack", h.unack);
      $$("[data-afil]").forEach((b) => b.classList.toggle("on", b.dataset.afil === filterAlm));
      let isi;
      if (filterAlm === "event") isi = `<table class="tbl"><thead><tr><th>Timestamp</th><th>Source</th><th>Event</th></tr></thead><tbody>${ALARM.event.slice(-80).reverse().map((e) => `<tr><td>${waktuStr(e.t)}</td><td class="tag">${e.tag}</td><td>${e.teks}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">Belum ada event</td></tr>'}</tbody></table>`;
      else {
        const d = filterAlm === "hist" ? ALARM.riwayat.slice(-100).reverse() : ALARM.aktif.filter((a) => filterAlm === "aktif" || a.sev === filterAlm);
        isi = `<table class="tbl alm"><thead><tr><th>Timestamp</th><th>Tag</th><th>Area</th><th>Description</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>${d.map((a) => `<tr class="sev-${a.sev} ${a.state === "ACTIVE" ? "blink" : ""}"><td>${waktuStr(a.tOn)}</td><td class="tag">${a.tag}</td><td>${a.area}</td><td>${a.desk}</td><td><span class="st st-${a.sev === "CRIT" ? "crit" : a.sev === "WARN" ? "warn" : "off"}">${a.sev === "CRIT" ? "CRITICAL" : a.sev === "WARN" ? "WARNING" : "COMM FAIL"}</span></td><td>${a.state}${a.tOff ? `<small> ${jamStr(a.tOff)}</small>` : ""}</td><td>${a.state === "ACTIVE" ? `<button class="btn kecil" data-ack="${a.id}">Ack</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7" class="ok-row">✓ Tidak ada alarm ${filterAlm === "hist" ? "di riwayat" : "aktif"} – semua normal</td></tr>`}</tbody></table>`;
      }
      const el = $("#almTbl"); if (el.innerHTML !== isi) el.innerHTML = isi;
    },
  };

  /* =========================================================
     17. HISTORICAL DATA LOGGER
     ========================================================= */
  P.log = {
    judul: "Historical Data Logger", ikon: "🗄",
    html: () => `${judul("Historical Data Logger & Reporting", "Rekaman otomatis tiap 5 menit (waktu simulasi) · disimpan di localStorage browser · ekspor CSV / Excel")}
      <div class="toolbar">${[["log", "Process Log"], ["daily", "Daily Report"], ["monthly", "Monthly Report"], ["yearly", "Yearly Report"], ["tank", "Tank Inventory"], ["rot", "Rotating Equipment"], ["alarm", "Alarm History"], ["event", "Event Log"]].map(([k, l]) => `<button class="btn" data-logtab="${k}">${l}</button>`).join("")}</div>
      <div class="card"><div class="card-h"><span id="logJudul">–</span><span class="btns"><button class="btn kecil" data-logpg="-1">‹</button><span class="muted kecil" id="logHal"></span><button class="btn kecil" data-logpg="1">›</button><button class="btn kecil g" data-ekspor="csv">⬇ CSV</button><button class="btn kecil g" data-ekspor="xls">⬇ Excel</button></span></div><div class="card-b scroll" id="logTabel"></div></div>
      <div class="grid g2">${kartu("Penyimpanan", `<div id="logInfo" class="kv-grid"></div>`)}${kartu("Integrasi data nyata (rencana)", `<p class="kecil">Arsitektur sudah dipisah: <code>js/datasource.js</code> adalah pintu masuk data. Saat ini sumbernya <b>SIMULATION</b>. Nanti bisa diganti pembacaan dari gateway <b>Modbus TCP/RTU</b>, OPC UA, DCS/PLC, tank gauging system, analyzer & CEMS (lewat REST/WebSocket dari server XAMPP).</p><div class="btns"><button class="btn r" data-resetsim>⟲ Reset simulasi & hapus histori</button></div>`)}</div>`,
    masuk: () => LOGGER.render(),
    update(n) {
      if (n % 5 === 0) LOGGER.render();
      let uk = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(C.simpanKey)) uk += (localStorage.getItem(k) || "").length; }
      $("#logInfo").innerHTML = [["Rekaman 5 menit", fmt(SIM.log.length)], ["Laporan harian", fmt(SIM.harian.length)], ["Laporan bulanan", fmt(SIM.bulanan.length)], ["Riwayat alarm", fmt(ALARM.riwayat.length)], ["Ukuran data", `${fmt(uk / 1024)} KB`], ["Rekaman terakhir", SIM.log.length ? waktuStr(SIM.log[SIM.log.length - 1][0]) : "–"]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join("");
    },
  };

  /* ---------------- DETAIL PERALATAN (modal) ---------------- */
  function detail(id) {
    const v = V(), info = EQ[id] || [id, "overview"];
    const out = { judul: `${id} · ${info[0]}`, hal: info[1], baris: [], tags: [], tren: [], tombol: "", status: "" };
    const p = v.PV[id], k = v.KV[id];
    if (p) {
      const s = ST_T[p.st]; out.status = `<span class="st st-${s[0]}">${s[1]}</span>`;
      out.baris = [["Service", info[0]], ["Flow", `${fmt(p.q)} m³/h`], ["Suction / discharge", `${fmt(p.ps, 1)} / ${fmt(p.pd, 1)} bar`], ["Motor current", `${fmt(p.a)} A`], ["Motor voltage", p.diesel ? "diesel driver" : `${fmt(p.v)} V`], ["Motor power", `${fmt(p.kw)} kW`], ["Frequency", `${fmt(p.hz, 2)} Hz`], ["Bearing temperature", `${fmt(p.bt, 1)} °C`], ["Vibration", `${fmt(p.vib, 2)} mm/s`], ["Running hours", fmt(p.h)], ["Trip status", p.trip ? "TRIPPED" : "healthy"]];
      out.tren = TREN_POMPA[id.replace(/[A-C]$/, "")] || []; out.tombol = aksi("data-pompa", id, p.st);
    } else if (k) {
      const s = ST_T[k.st]; out.status = `<span class="st st-${s[0]}">${s[1]}</span>`;
      out.baris = [["Type", k.tipe], ["Suction / discharge P", `${fmt(k.ps, 1)} / ${fmt(k.pd, 1)} barg`], ["Suction / discharge T", `${fmt(k.ts, 1)} / ${fmt(k.td, 1)} °C`], ["Gas flow", `${fmt(k.q)} Nm³/h`], ["Speed", `${fmt(k.rpm)} rpm`], ["Vibration", `${fmt(k.vib, 2)} mm/s`], ["Bearing temperature", `${fmt(k.bt, 1)} °C`], ["Lube oil pressure / temp", `${fmt(k.lop, 2)} bar / ${fmt(k.lot, 1)} °C`], ["Surge protection", `${k.surge} (margin ${fmt(k.margin)} %)`], ["Power", `${fmt(k.kw)} kW`], ["Running hours", fmt(k.h)]];
      out.tren = TREN_KOMP[id] || []; out.tombol = aksi("data-komp", id, k.st);
    } else {
      const ti = C.tangki.findIndex((q) => q[0] === id);
      if (ti >= 0) {
        const tk = SIM.S.tangki[ti], kk = C.tangki[ti], nn = 401 + ti * 10, lv = x("LT-" + nn), vol = (lv / 100) * kk[3];
        out.status = `<span class="mode mode-${tk.mode}">${tk.mode}</span>`;
        out.baris = [["Service", kk[1]], ["Capacity", `${fmt(kk[3])} m³`], ["Product volume", `${fmt(vol)} m³`], ["Remaining capacity", `${fmt(kk[3] - vol)} m³`], ["Inventory", `${fmt((vol * C.rho[kk[2]]) / 1000)} t`]];
        out.tombol = `<span class="btns" style="margin:0">${["RECV", "DISP", "FEED", "STBY"].map((m) => `<button class="btn kecil ${m === tk.mode ? "on" : ""}" data-tk="${ti}" data-mode="${m}">${m}</button>`).join("")}</span>`;
        tkPilih = ti;
      } else if (id === "CRUDE-RCV") out.baris = [["Receiving status", SIM.S.terimaCrude ? "RECEIVING 3.000 m³/h" : "IDLE"], ["Crude inventory", `${fmt(v.inv.crude)} m³`], ["Source", "Pipeline from marine terminal"]];
      else if (id === "LOAD") out.baris = [["Gasoline loading (P-901A)", `${fmt(v.PV["P-901A"].q)} m³/h`], ["Diesel loading (P-901B)", `${fmt(v.PV["P-901B"].q)} m³/h`], ["Dispatched today", `${fmt(SIM.S.E.day.dispT)} t`], ["Operating hours", "05:00 – 22:00"]];
      else if (id === "CCR" || id === "LAB") { const h = ALARM.hitung(); out.baris = [["Active alarms", h.total], ["Critical", h.CRIT], ["Refinery throughput", `${fmt(v.bpd)} BPD`], ["Data source", C.sumberData]]; }
      else if (/^B-601/.test(id)) { const i = id.endsWith("A") ? 0 : 1; out.status = `<span class="st st-${v.blrOn[i] ? "ok" : "off"}">${v.blrOn[i] ? "RUNNING" : "STOPPED"}</span>`; out.tombol = `<span class="btns" style="margin:0"><button class="btn kecil g" data-blr="${i}" data-on="1">Light-off</button><button class="btn kecil r" data-blr="${i}" data-on="0">Shutdown</button></span>`; }
      out.tags = TAG_KHUSUS[id] || tagsAlat(id);
      if (!out.tren.length) out.tren = out.tags.filter((t) => TAG[t] && TAG[t].unit !== "state" && !/^FQI/.test(t)).slice(0, 2);
    }
    if (!out.tags.length && !p && !k) out.tags = tagsAlat(id);
    if (!out.tren.length) out.tren = out.tags.filter((t) => TAG[t] && TAG[t].unit !== "state" && !/^FQI/.test(t)).slice(0, 2);
    const al = ALARM.untukAlat(id);
    out.alarm = al.length ? al.map((a) => `<div class="am sev-${a.sev}"><b>${a.tag}</b> ${a.desk}<small>${jamStr(a.tOn)}</small></div>`).join("") : `<div class="am ok">✓ Tidak ada alarm aktif untuk peralatan ini</div>`;
    return out;
  }

  return { P, detail, tabelTag, isiTag, set filterAlm(v) { filterAlm = v; }, set tkPilih(v) { tkPilih = v; }, get tkPilih() { return tkPilih; }, semuaChip };
})();
