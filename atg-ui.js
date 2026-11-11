/* =========================================================
   ATG-UI.JS — TAMPILAN HALAMAN (panel, tabel, tombol)
   Menghubungkan data (atg-data.js) dengan tampilan 3D (atg-3d.js)
   dan panel di layar. Tidak menyimpan angka sendiri.
   ========================================================= */

const ATG_UI = (() => {
  let dibuat = false, aktif = false, tab = "overview", pilihTangki = "TK-101", pilihInst = "LT-101";
  const el = (id) => document.getElementById(id);
  const f1 = (n, d = 1) => fmt(n, d);

  /* ---------- Info tiap instrumen (untuk panel detail) ---------- */
  const INFO = {
    "LT-101": { nama: "Radar Level Transmitter", param: "Tank Level", unit: "%", range: "0 – 100 %", lokasi: "Nozzle atap, ±2,5 m dari dinding (jauh dari aliran masuk)" },
    "TT-101A": { nama: "Multipoint Temperature – Top", param: "Temperature Top", unit: "°C", range: "0 – 100 °C", lokasi: "Thermowell vertikal, 85 % tinggi tangki" },
    "TT-101B": { nama: "Multipoint Temperature – Middle", param: "Temperature Middle", unit: "°C", range: "0 – 100 °C", lokasi: "Thermowell vertikal, 50 % tinggi tangki" },
    "TT-101C": { nama: "Multipoint Temperature – Bottom", param: "Temperature Bottom", unit: "°C", range: "0 – 100 °C", lokasi: "Thermowell vertikal, 15 % tinggi tangki" },
    "PT-101": { nama: "Pressure Transmitter", param: "Tank Pressure (vapour space)", unit: "barG", range: "-0,05 – 0,5 barG", lokasi: "Nozzle atap, ruang uap" },
    LSHH: { nama: "Level Switch High-High", param: "Overfill protection", unit: "ON/OFF", range: "Trip ≥ 95 %", lokasi: "Dinding, 95 % tinggi" },
    LSH: { nama: "Level Switch High", param: "High level", unit: "ON/OFF", range: "≥ 90 %", lokasi: "Dinding, 90 % tinggi" },
    LSL: { nama: "Level Switch Low", param: "Low level", unit: "ON/OFF", range: "≤ 10 %", lokasi: "Dinding, 10 % tinggi" },
    LSLL: { nama: "Level Switch Low-Low", param: "Dry-run protection", unit: "ON/OFF", range: "Trip ≤ 5 %", lokasi: "Dinding, 5 % tinggi" },
    "FIT-101": { nama: "Coriolis Flowmeter – Inlet", param: "Flowrate / Totalizer", unit: "T/h · Ton", range: "0 – 40 T/h", lokasi: "Jalur inlet, sebelum nozzle tangki" },
    "FIT-102": { nama: "Coriolis Flowmeter – Outlet", param: "Flowrate / Totalizer", unit: "T/h · Ton", range: "0 – 25 T/h", lokasi: "Jalur discharge pompa P-101" },
    "GD-101": { nama: "Gas Detector (catalytic)", param: "Gas Concentration", unit: "%LEL", range: "0 – 100 %LEL · W 20 · A 40", lokasi: "Dekat pompa & valve, 0,6 m dari tanah" },
    "XV-101A": { nama: "Motorized Valve – Inlet", param: "Valve Position", unit: "%", range: "0 – 100 %", lokasi: "Jalur inlet, luar tanggul" },
    "XV-101B": { nama: "Motorized Valve – Outlet", param: "Valve Position", unit: "%", range: "0 – 100 %", lokasi: "Nozzle outlet, sisi hisap pompa" },
    "P-101": { nama: "Transfer Pump", param: "Pump Status", unit: "RUN/STOP", range: "11 kW · 2900 rpm", lokasi: "Pump pad luar tanggul" },
  };

  /* Nilai + status satu instrumen → { teks, status: ok|warn|crit|off } */
  function nilai(tag) {
    const D = ATG.data, s = D.tangki["TK-101"], k = D.tk101, b = ATG_CONFIG.batas;
    if (tag === "LT-101") return { teks: f1(s.level) + " %", status: s.level >= b.LSHH || s.level <= b.LSLL ? "crit" : s.level >= b.LSH || s.level <= b.LSL ? "warn" : "ok" };
    if (tag.startsWith("TT-101")) { const v = s.suhu["ABC".indexOf(tag.slice(-1))]; return { teks: f1(v) + " °C", status: v >= b.TAHH ? "crit" : v >= b.TAH ? "warn" : "ok" }; }
    if (tag === "PT-101") return { teks: fmt(s.tekanan, 2) + " barG", status: s.tekanan >= b.PAH ? "warn" : "ok" };
    if (["LSHH", "LSH", "LSL", "LSLL"].includes(tag)) { const on = ATG.saklarLevel("TK-101")[tag]; return { teks: on ? "ON" : "OFF", status: !on ? "ok" : tag === "LSH" || tag === "LSL" ? "warn" : "crit" }; }
    if (tag === "FIT-101") return { teks: f1(s.masuk) + " T/h", sub: "Σ " + fmt(s.totalMasuk, 0) + " Ton", status: s.masuk > 0.3 ? "ok" : "off" };
    if (tag === "FIT-102") return { teks: f1(s.keluar) + " T/h", sub: "Σ " + fmt(s.totalKeluar, 0) + " Ton", status: s.keluar > 0.3 ? "ok" : "off" };
    if (tag === "GD-101") return { teks: f1(k.gas) + " %LEL", status: k.gas >= b.GAS_ALARM ? "crit" : k.gas >= b.GAS_WARN ? "warn" : "ok", sub: k.gas >= b.GAS_ALARM ? "ALARM" : k.gas >= b.GAS_WARN ? "WARNING" : "NORMAL" };
    if (tag.startsWith("XV-")) { const v = k.valve[tag]; return { teks: v.status, sub: fmt(v.posisi, 0) + " %", status: { OPEN: "ok", CLOSE: "off", MOVING: "warn", FAULT: "crit" }[v.status] }; }
    if (tag === "P-101") { const p = k.pompa; return { teks: p.status === "FAULT" ? "MOTOR FAULT" : p.status, status: { RUN: "ok", STOP: "off", FAULT: "crit" }[p.status] }; }
    return { teks: "-", status: "off" };
  }

  /* ---------- Membuat kerangka halaman (sekali) ---------- */
  function bangun() {
    el("mod-atg3d").innerHTML = `
    <div class="atg">
      <div class="atg-head">
        <div class="atg-title">3D AUTOMATIC TANK GAUGE<small>CPO &amp; FATTY ACID STORAGE MONITORING SYSTEM · ${CONFIG.namaSingkat}</small></div>
        <div class="atg-tabs">
          <button data-atgtab="overview" class="active">▦ Tank Farm Overview</button>
          <button data-atgtab="detail">◉ 3D Tank Detail</button>
        </div>
        <div class="atg-mode">Mode: <b id="atgModeTeks">SIMULASI</b> · kecepatan <span id="atgKec">×${ATG_CONFIG.kecepatan}</span><br><span class="digital" id="atgJam"></span></div>
      </div>
      <div class="atg-summary" id="atgSummary"></div>
      <div class="atg-body">
        <div class="atg-view" id="atgView">
          <div class="atg-toolbar" id="atgToolbar">
            <button data-cam="overview">⌂ Overview</button><button data-cam="pilih">◎ Tangki terpilih</button>
            <button data-cam="atap">Atap (LT/PT)</button><button data-cam="inlet">Inlet</button><button data-cam="pompa">Pompa</button>
            <button data-opt="label" class="on">Label</button><button data-opt="cutaway">Isi Tangki</button>
            <button data-opt="pipa" class="on">Pipa</button><button data-opt="aliran" class="on">Aliran</button>
            <button data-opt="auto">Auto Rotate</button><button id="atgFull">⛶</button>
          </div>
          <div class="atg-legend"><span><i style="background:#22c55e"></i>Normal</span><span><i style="background:#facc15"></i>Warning</span><span><i style="background:#ef4444"></i>Critical</span></div>
          <div class="atg-hint">Seret: putar · Scroll: zoom · Klik kanan/Shift+seret: geser · Klik tangki/instrumen untuk memilih</div>
        </div>
        <aside class="atg-side" id="atgSide"></aside>
      </div>
      <div class="atg-sim" id="atgSim"></div>
    </div>`;

    // Tab
    document.querySelectorAll("[data-atgtab]").forEach((b) => (b.onclick = () => gantiTab(b.dataset.atgtab)));
    // Toolbar kamera & opsi tampilan
    document.querySelectorAll("#atgToolbar [data-cam]").forEach((b) => (b.onclick = () => ATG_3D.kamera(b.dataset.cam === "pilih" ? pilihTangki : b.dataset.cam)));
    document.querySelectorAll("#atgToolbar [data-opt]").forEach((b) => (b.onclick = () => {
      const o = b.dataset.opt;
      if (o === "auto") { ATG_3D.orbit.auto = !ATG_3D.orbit.auto; b.classList.toggle("on", ATG_3D.orbit.auto); return; }
      ATG_3D.setOpsi(o, !ATG_3D.opsi[o]); b.classList.toggle("on", ATG_3D.opsi[o]);
    }));
    el("atgFull").onclick = () => layarPenuh(el("atgView"));

    // 3D
    const ok = ATG_3D.init(el("atgView"), { tangki: (id) => pilih(id, false), inst: (tag) => pilihInstrumen(tag) });
    if (!ok) el("atgView").insertAdjacentHTML("beforeend", `<div class="atg-hint" style="top:50%;bottom:auto">Three.js belum termuat — periksa internet lalu tekan F5.</div>`);
    bangunSim();
    dibuat = true;
    gantiTab("overview");
  }

  /* ---------- Panel simulasi (tanpa PLC fisik) ---------- */
  function bangunSim() {
    el("atgSim").innerHTML = `
      <div class="atg-sim-head"><h4>Simulation Control Panel · TK-101</h4>
        <span class="muted" style="font-size:11px">Uji sistem tanpa PLC. Semua perubahan langsung tampil di 3D, panel instrumen & overview.</span>
        <span style="margin-left:auto;font-size:11.5px">Kecepatan proses
          <select class="btn" id="atgSpeed"><option value="1">×1 (nyata)</option><option value="60">×60</option><option value="120" selected>×120</option><option value="600">×600</option></select></span>
      </div>
      <div class="atg-sim-grid">
        <div class="atg-simbox"><div class="t">INLET · XV-101A → FIT-101</div><div class="b"><button class="g" data-s="inlet1">START</button><button class="r" data-s="inlet0">STOP</button></div><div class="now" id="simInlet"></div></div>
        <div class="atg-simbox"><div class="t">OUTLET · XV-101B → P-101 → FIT-102</div><div class="b"><button class="g" data-s="outlet1">START</button><button class="r" data-s="outlet0">STOP</button></div><div class="now" id="simOutlet"></div></div>
        <div class="atg-simbox"><div class="t">POMPA P-101</div><div class="b"><button class="g" data-s="pump1">ON</button><button class="r" data-s="pump0">OFF</button><button class="y" data-s="pumpF">FAULT</button></div><div class="now" id="simPump"></div></div>
        <div class="atg-simbox"><div class="t">VALVE XV-101A / XV-101B</div>
          <div class="b"><button class="g" data-s="vA1">A OPEN</button><button data-s="vA0">A CLOSE</button><button class="y" data-s="vAF">A FLT</button></div>
          <div class="b" style="margin-top:4px"><button class="g" data-s="vB1">B OPEN</button><button data-s="vB0">B CLOSE</button><button class="y" data-s="vBF">B FLT</button></div></div>
        <div class="atg-simbox"><div class="t">LEVEL & TEMPERATURE</div>
          <div class="b"><button data-s="lv-">Level −5%</button><button data-s="lv+">Level +5%</button></div>
          <div class="b" style="margin-top:4px"><button data-s="t-">Suhu −1°C</button><button data-s="t+">Suhu +1°C</button></div></div>
        <div class="atg-simbox"><div class="t">PRESSURE · GAS · TEST</div>
          <div class="b"><button data-s="p-">P −0,05</button><button data-s="p+">P +0,05</button></div>
          <div class="b" style="margin-top:4px"><button class="g" data-s="gN">GAS N</button><button class="y" data-s="gW">GAS W</button><button class="r" data-s="gA">GAS A</button></div>
          <div class="b" style="margin-top:4px"><button class="y" data-s="test">ALARM TEST</button><button data-s="reset">RESET</button></div></div>
      </div>
      <div class="atg-log" id="atgLog"></div>`;
    const aksi = {
      inlet1: () => ATG.inlet(true), inlet0: () => ATG.inlet(false), outlet1: () => ATG.outlet(true), outlet0: () => ATG.outlet(false),
      pump1: () => ATG.perintahPompa(true), pump0: () => ATG.perintahPompa(false), pumpF: () => ATG.toggleFault("pompa"),
      vA1: () => ATG.perintahValve("XV-101A", true), vA0: () => ATG.perintahValve("XV-101A", false), vAF: () => ATG.toggleFault("valve", "XV-101A"),
      vB1: () => ATG.perintahValve("XV-101B", true), vB0: () => ATG.perintahValve("XV-101B", false), vBF: () => ATG.toggleFault("valve", "XV-101B"),
      "lv-": () => ATG.ubahLevel(-5), "lv+": () => ATG.ubahLevel(5), "t-": () => ATG.ubahSuhu(-1), "t+": () => ATG.ubahSuhu(1),
      "p-": () => ATG.ubahTekanan(-0.05), "p+": () => ATG.ubahTekanan(0.05),
      gN: () => ATG.setGas("NORMAL"), gW: () => ATG.setGas("WARNING"), gA: () => ATG.setGas("ALARM"),
      test: () => ATG.alarmTest(), reset: () => ATG.reset(),
    };
    el("atgSim").querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => { aksi[b.dataset.s](); ATG.langkah(0); perbarui(); }));
    el("atgSpeed").onchange = (e) => { ATG_CONFIG.kecepatan = +e.target.value; el("atgKec").textContent = "×" + ATG_CONFIG.kecepatan; };
  }

  /* ---------- Navigasi ---------- */
  function gantiTab(nama) {
    tab = nama;
    document.querySelectorAll("[data-atgtab]").forEach((b) => b.classList.toggle("active", b.dataset.atgtab === nama));
    el("atgSummary").style.display = nama === "overview" ? "" : "none";
    el("atgSim").style.display = nama === "detail" ? "" : "none";
    ATG_3D.setOpsi("mode", nama);
    ATG_3D.kamera(nama === "overview" ? "overview" : pilihTangki);
    perbarui();
  }
  function pilih(id, keDetail) {
    pilihTangki = id; ATG_3D.setOpsi("pilih", id);
    if (keDetail || tab === "detail") { if (tab !== "detail") gantiTab("detail"); else ATG_3D.kamera(id); }
    perbarui();
  }
  function pilihInstrumen(tag) {
    if (pilihTangki !== "TK-101") pilih("TK-101", true);
    pilihInst = tag; perbarui();
  }

  /* ---------- Isi panel (dipanggil tiap 1 detik) ---------- */
  function perbarui() {
    if (!dibuat) return;
    const D = ATG.data, H = ATG.hasil, alarm = ATG_ALARM.evaluasi();
    ATG_UI_ALARM_CACHE.daftar = alarm;
    el("atgJam").textContent = new Date().toLocaleString("id-ID", { hour12: false });

    // Kartu ringkasan
    const kap = ATG_TANGKI.reduce((a, t) => a + H[t.id].kapasitas, 0);
    const inv = ATG_TANGKI.reduce((a, t) => a + H[t.id].gov, 0);
    const ton = ATG_TANGKI.reduce((a, t) => a + H[t.id].massa, 0);
    const rata = ATG_TANGKI.reduce((a, t) => a + D.tangki[t.id].level, 0) / ATG_TANGKI.length;
    el("atgSummary").innerHTML = [
      ["Total Tanks", ATG_TANGKI.length, "unit"], ["Total Storage Capacity", fmt(kap, 0), "m³"],
      ["Current Inventory", fmt(inv, 0), `m³ · ${fmt(ton, 0)} Ton`], ["Average Tank Level", f1(rata), "%"],
      ["Active Alarms", alarm.length, alarm.filter((a) => a.prioritas === "CRITICAL").length + " critical"],
    ].map(([k, v, u], i) => `<div class="atg-card ${i === 4 && alarm.length ? "alarm" : ""}"><div class="k">${k}</div><div class="v digital">${v} <small>${u}</small></div></div>`).join("");

    // Label 3D: tangki
    ATG_TANGKI.forEach((t) => {
      const L = ATG_3D.label.tangki[t.id]; if (!L) return;
      const s = D.tangki[t.id], st = ATG_ALARM.statusTangki(t.id, alarm);
      L.el.className = `atg-tlabel ${st} ${t.id === pilihTangki ? "sel" : ""}`;
      L.el.innerHTML = `<span class="id">${t.id}</span> · ${t.produk}<div class="bar"><i style="width:${s.level}%"></i></div><span class="digital">${f1(s.level)} % · ${f1(H[t.id].suhu)} °C</span><br><span class="digital">${fmt(H[t.id].gov, 0)} m³</span> · ${s.mode}`;
    });
    // Label 3D: instrumen TK-101
    Object.entries(ATG_3D.label.inst).forEach(([tag, L]) => {
      const n = nilai(tag);
      L.el.className = `atg-ilabel ${n.status} ${tag === pilihInst ? "sel" : ""}`;
      L.el.innerHTML = `${tag} <b>${n.teks}</b>${n.sub ? " · " + n.sub : ""}`;
    });

    // Panel samping
    el("atgSide").innerHTML = tab === "overview" ? panelOverview(alarm) : panelDetail(alarm);
    el("atgSide").querySelectorAll("[data-tk]").forEach((r) => { r.onclick = () => pilih(r.dataset.tk, false); r.ondblclick = () => pilih(r.dataset.tk, true); });
    el("atgSide").querySelectorAll("[data-inst]").forEach((r) => (r.onclick = () => pilihInstrumen(r.dataset.inst)));
    const tbl = el("atgBukaDetail"); if (tbl) tbl.onclick = () => pilih(pilihTangki, true);

    // Panel simulasi
    if (tab === "detail") {
      const s = D.tangki["TK-101"], k = D.tk101;
      el("simInlet").innerHTML = `${k.inletAktif ? "<span class=up>AKTIF</span>" : "berhenti"} · <span class="digital">${f1(s.masuk)} T/h</span>`;
      el("simOutlet").innerHTML = `${k.outletAktif ? "<span class=up>AKTIF</span>" : "berhenti"} · <span class="digital">${f1(s.keluar)} T/h</span>`;
      el("simPump").innerHTML = `P-101: <b>${k.pompa.status}</b>`;
      el("atgLog").innerHTML = D.log.slice(0, 6).map((l) => (/INTERLOCK|FAULT|ALARM/.test(l) ? `<b>${l}</b>` : l)).join("<br>");
    }
  }

  function panelOverview(alarm) {
    const D = ATG.data, H = ATG.hasil;
    return `<h4>Tank Farm · ${ATG_TANGKI.length} tangki</h4>
      <table class="atg-table"><thead><tr><th>Tank</th><th>Level</th><th>Temp</th><th>Volume / Kap.</th><th>Status</th></tr></thead><tbody>
      ${ATG_TANGKI.map((t) => {
        const s = D.tangki[t.id], h = H[t.id], st = ATG_ALARM.statusTangki(t.id, alarm);
        const a = alarm.find((x) => x.tangki === t.id);
        return `<tr data-tk="${t.id}" class="${t.id === pilihTangki ? "sel" : ""}">
          <td><b>${t.id}</b><br><span class="muted">${t.produk === "CPO" ? "CPO" : "Fatty Acid"}</span></td>
          <td class="digital">${f1(s.level)}%<div class="atg-mini"><i style="width:${s.level}%"></i></div></td>
          <td class="digital">${f1(h.suhu)}°C</td>
          <td class="digital">${fmt(h.gov, 0)}<br><span class="muted">/ ${fmt(h.kapasitas, 0)} m³</span></td>
          <td><span class="atg-dot ${st}"></span>${a ? a.kode : s.mode}</td></tr>`;
      }).join("")}</tbody></table>
      <button class="atg-btn full" id="atgBukaDetail">◉ Buka 3D Tank Detail — ${pilihTangki}</button>
      <p class="muted" style="font-size:11px;margin-top:8px">Klik baris/tangki untuk memilih · klik dua kali untuk membuka detail.<br>Volume = Gross Observed Volume dari tabel kalibrasi (simulasi).</p>`;
  }

  function panelDetail(alarm) {
    const t = ATG_TANGKI.find((x) => x.id === pilihTangki), s = ATG.data.tangki[t.id], h = ATG.hasil[t.id];
    const st = ATG_ALARM.statusTangki(t.id, alarm);
    const kepala = `<div class="atg-tankhead"><div><div class="id">${t.id}</div><div class="pr">${ATG_CONFIG.produk[t.produk].nama}</div>
        <span class="atg-st ${st}">${st === "ok" ? "NORMAL" : st === "warn" ? "WARNING" : "CRITICAL"}</span> <span class="atg-st off">${s.mode}</span></div>
        <div class="atg-big"><div class="v digital">${f1(s.level)}<small style="font-size:14px">%</small></div><div class="k">LEVEL · ${fmt(h.levelMm, 0)} mm</div></div></div>`;
    const baris = (tag, judul, teks, sub, status) => `<div class="atg-row ${tag === pilihInst ? "sel" : ""}" ${tag ? `data-inst="${tag}"` : ""}><div class="tag">${judul}<small>${sub || ""}</small></div><div class="val digital">${teks} <span class="atg-dot ${status || "ok"}"></span></div></div>`;
    const hitung = `<div class="atg-grp"><div class="gt">Perhitungan (tabel kalibrasi)</div>
        ${baris("", "Gross Observed Volume", fmt(h.gov, 1) + " m³", "kapasitas " + fmt(h.kapasitas, 0) + " m³")}
        ${baris("", "Net Standard Volume", fmt(h.nsv, 1) + " m³", `@ ${ATG_CONFIG.suhuReferensi} °C · VCF ${fmt(h.vcf, 4)}`)}
        ${baris("", "Mass", fmt(h.massa, 1) + " Ton", "densitas " + fmt(h.densitasAktual, 4) + " t/m³")}
        ${baris("", "Ullage", fmt(h.ullageMm, 0) + " mm", "suhu rata-rata " + f1(h.suhu) + " °C")}</div>`;

    if (t.id !== "TK-101") {
      return kepala + `<div class="atg-grp"><div class="gt">Instrumen</div>
        ${baris("", "Level (radar)", f1(s.level) + " %")}
        ${baris("", "Temp Top / Mid / Bottom", s.suhu.map((v) => f1(v)).join(" / ") + " °C")}
        ${baris("", "Pressure", fmt(s.tekanan, 2) + " barG")}
        ${baris("", "Inlet / Outlet", f1(s.masuk) + " / " + f1(s.keluar) + " T/h")}</div>${hitung}
        <p class="muted" style="font-size:11px">Instrumen lengkap (valve, pompa, coriolis, gas detector) tersedia di TK-101.</p>
        <button class="atg-btn full" data-tk="TK-101">Pilih TK-101</button>`;
    }

    const n = (tag) => nilai(tag), info = INFO[pilihInst], ni = n(pilihInst);
    const sw = ["LSHH", "LSH", "LSL", "LSLL"].map((tag) => { const v = n(tag); return `<div class="atg-chip ${v.status === "ok" ? "" : v.status}" data-inst="${tag}">${tag}<small>${v.teks}</small></div>`; }).join("");
    return kepala + `
      <div class="atg-grp"><div class="gt">Level & Temperature</div>
        ${baris("LT-101", "LT-101", n("LT-101").teks, "Radar level", n("LT-101").status)}
        ${baris("TT-101A", "TT-101A", n("TT-101A").teks, "Top", n("TT-101A").status)}
        ${baris("TT-101B", "TT-101B", n("TT-101B").teks, "Middle", n("TT-101B").status)}
        ${baris("TT-101C", "TT-101C", n("TT-101C").teks, "Bottom", n("TT-101C").status)}
        ${baris("PT-101", "PT-101", n("PT-101").teks, "Tank pressure", n("PT-101").status)}</div>
      <div class="atg-grp"><div class="gt">Level Switch</div><div class="atg-chips">${sw}</div></div>
      <div class="atg-grp"><div class="gt">Flow, Valve & Pump</div>
        ${baris("FIT-101", "FIT-101 Inlet", n("FIT-101").teks, n("FIT-101").sub, n("FIT-101").status)}
        ${baris("FIT-102", "FIT-102 Outlet", n("FIT-102").teks, n("FIT-102").sub, n("FIT-102").status)}
        ${baris("XV-101A", "XV-101A Inlet", n("XV-101A").teks, "posisi " + n("XV-101A").sub, n("XV-101A").status)}
        ${baris("XV-101B", "XV-101B Outlet", n("XV-101B").teks, "posisi " + n("XV-101B").sub, n("XV-101B").status)}
        ${baris("P-101", "P-101 Pump", n("P-101").teks, "transfer pump", n("P-101").status)}
        ${baris("GD-101", "GD-101 Gas", n("GD-101").teks, n("GD-101").sub, n("GD-101").status)}</div>
      <div class="atg-detail"><b style="color:var(--atg-gold)">◆ ${pilihInst} — ${info.nama}</b>
        <table><tr><td>Tag number</td><td>${pilihInst}</td></tr><tr><td>Parameter</td><td>${info.param}</td></tr>
        <tr><td>Nilai</td><td class="digital">${ni.teks}${ni.sub ? " · " + ni.sub : ""}</td></tr><tr><td>Unit</td><td>${info.unit}</td></tr>
        <tr><td>Status</td><td><span class="atg-st ${ni.status}">${{ ok: "NORMAL", warn: "WARNING", crit: "CRITICAL", off: "OFF / IDLE" }[ni.status]}</span></td></tr>
        <tr><td>Range</td><td>${info.range}</td></tr><tr><td>Lokasi</td><td>${info.lokasi}</td></tr></table></div>
      ${hitung}`;
  }

  /* ---------- Loop ---------- */
  function loop(t) { if (aktif && ATG_3D.siap()) ATG_3D.frame(t); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  // Simulasi berjalan terus (juga saat halaman lain dibuka), tampilan diperbarui saat aktif
  ATG.muat(); ATG.langkah(0);
  let detik = 0;
  setInterval(() => { ATG.langkah(0.25); }, 250);
  setInterval(() => {
    detik++; ATG.rekam();
    if (detik % 5 === 0) ATG.simpan();
    if (aktif) perbarui();
  }, 1000);

  return {
    buka() { if (!dibuat) bangun(); aktif = true; perbarui(); },
    setAktif(a) { aktif = a; },
  };
})();
