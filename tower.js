/* =========================================================
   MODUL SMART TOWER (gedung bertingkat + meter tenant)
   ========================================================= */

const tower = {
  sistem: [
    { id: "fire", nama: "🧯 Fire Fighting", on: true, baris: [["Tekanan header", "7,5 bar"], ["Pompa jockey", "ON"], ["Sprinkler", "Normal"]], nilai: 7.5, acak: 0.05 },
    { id: "alarm", nama: "🔔 Fire Alarm", on: true, baris: [["Detektor", "412/412"], ["Zona alarm", "0"], ["MCFA", "Normal"]], nilai: 0.03, acak: 0.005 },
    { id: "cctv", nama: "📹 CCTV", on: true, baris: [["Kamera online", "47/48"], ["Rekaman", "30 hari"], ["AI deteksi", "Aktif"]], nilai: 47, acak: 0.3 },
    { id: "hvac", nama: "❄️ HVAC", on: true, baris: [["Suhu rata²", "18,7 °C"], ["Chiller", "2/3 ON"], ["AHU", "22 unit"]], nilai: 18.7, acak: 0.1 },
    { id: "light", nama: "💡 Lighting", on: true, baris: [["Beban", "306 kW"], ["Zona", "48"], ["Mode", "Jadwal"]], nilai: 306, acak: 3 },
    { id: "pump", nama: "💧 Pompa", on: true, baris: [["Tangki air", "87 %"], ["Tekanan", "3,2 bar"], ["Pompa transfer", "ON"]], nilai: 3.2, acak: 0.05 },
    { id: "genset", nama: "⚙️ Genset", on: false, baris: [["Status", "STANDBY"], ["BBM", "82 %"], ["Kapasitas", "1.250 kVA"]], nilai: 0, acak: 0 },
    { id: "dc", nama: "🖥️ Data Center", on: true, baris: [["Suhu", "21,6 °C"], ["PUE", "1,45"], ["UPS", "Normal"]], nilai: 21.6, acak: 0.1 },
  ],
  riwayat: {},
  tenant: [],
};

function acakTenant() {
  let s = 11;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  tower.tenant = TENANT.map((t) => {
    const layanan = ["kwh", "air", "flow", "gas"].map((jenis) => {
      const x = r();
      const status = x < 0.3 ? "PUTUS" : x < 0.42 ? "Belum Bayar" : "Lunas";
      return { jenis, status, tagihan: Math.round(r() * 9000000 + 150000) };
    });
    return { ...t, layanan, kw: 6 + r() * 14, air: 1800 + r() * 1400, flow: 0.3 + r() * 1.3, gas: 500 + r() * 700 };
  });
}

function buatSmartTower() {
  acakTenant();
  tower.sistem.forEach((s) => (tower.riwayat[s.id] = Array.from({ length: 30 }, () => s.nilai + rand(-s.acak, s.acak) * 3)));
  $("#mod-tower").innerHTML = `
  <div class="panel" style="margin-bottom:12px" id="towerHeroPanel">
    <div class="panel-head"><div class="panel-title">${CONFIG.namaSingkat} Smart Tower – Live Monitoring &amp; Kontrol</div>
      <div><button class="btn" id="btnUjiAlarm">🔔 Uji Alarm Gedung</button> <button class="btn" onclick="layarPenuh(document.getElementById('towerHeroPanel'))">⛶ Layar Penuh</button></div></div>
    <div class="tower-hero">${towerIllustration()}
      <div class="tower-badge"><img src="assets/logo.png" alt="">Smart Tower <span style="color:#22c55e;font-size:12px">●</span><span style="font-size:14px;font-weight:500">LIVE</span> <span id="towerClock" style="font-weight:500"></span></div>
    </div>
  </div>
  <div class="panel" style="margin-bottom:12px">
    <div class="panel-head"><div class="panel-title">Sistem Gedung</div><span class="muted">BMS · Pembaruan tiap 1 detik</span></div>
    <div class="sys-grid" id="sysGrid"></div>
  </div>
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Sensor Pembacaan Tenant – PLN · Air · Flow · Gas</div><span class="muted">Putuskan otomatis bila tagihan menunggak · Bayar untuk sambung kembali</span></div>
    <div class="sum-grid" id="tenantSum"></div>
    <div class="tenant-grid" id="tenantGrid"></div>
  </div>`;

  $("#btnUjiAlarm").onclick = () => {
    toast("🔔 Uji alarm gedung dimulai — semua zona berbunyi 10 detik");
    const hero = $(".tower-hero");
    hero.style.boxShadow = "0 0 0 3px #ef4444";
    setTimeout(() => (hero.style.boxShadow = ""), 10000);
  };
  renderSistem();
  renderTenant();
}

function renderSistem() {
  $("#sysGrid").innerHTML = tower.sistem.map((s) => `
    <div class="sys" id="sys-${s.id}">
      <div class="sys-head"><span>${s.nama}</span><span class="${s.on ? "up" : "muted"}">● ${s.on ? "ON" : s.id === "genset" ? "STANDBY" : "OFF"}</span></div>
      ${s.baris.map((b) => `<div class="sys-row"><span>${b[0]}</span><b>${b[1]}</b></div>`).join("")}
      <div class="spark"></div>
      <div class="acts" style="display:flex;gap:4px"><button class="btn green sm" onclick="setSistem('${s.id}',true)">Start</button><button class="btn red sm" onclick="setSistem('${s.id}',false)">Stop</button></div>
    </div>`).join("");
}
function setSistem(id, on) {
  const s = tower.sistem.find((x) => x.id === id);
  s.on = on;
  if (id === "genset") { s.baris[0][1] = on ? "RUN" : "STANDBY"; s.nilai = on ? 380 : 0; s.acak = on ? 2 : 0; }
  renderSistem();
  toast(`${s.nama.replace(/^\S+\s/, "")} ${on ? "dinyalakan" : "dimatikan"}`);
}

function renderTenant() {
  const ikon = { kwh: "⚡", air: "💧", flow: "🌀", gas: "🔥" };
  const namaLayanan = { kwh: "kWh Meter", air: "Water Meter", flow: "Flow Meter", gas: "Gas Meter" };
  let putusTenant = 0, tagihan = 0, totalTagihan = 0, online = { kwh: 0, air: 0, flow: 0, gas: 0 };
  $("#tenantGrid").innerHTML = tower.tenant.map((t, i) => {
    const putus = t.layanan.filter((l) => l.status === "PUTUS").length;
    if (putus) putusTenant++;
    t.layanan.forEach((l) => { if (l.status !== "Lunas") { tagihan++; totalTagihan += l.tagihan; } if (l.status !== "PUTUS") online[l.jenis]++; });
    const nilai = (l) => {
      if (l.status === "PUTUS") return `<div class="value">PUTUS</div><div class="sub2">${l.jenis === "kwh" ? "—" : "0,00"}</div>`;
      if (l.jenis === "kwh") return `<div class="value">${fmt(t.kw, 1)} kW</div><div class="sub2">${fmt(rand(396, 402))} V · ${fmt(t.kw * 1.5, 1)} A · PF 0,95</div>`;
      if (l.jenis === "air") return `<div class="value">${fmt(t.air, 1)} m³</div><div class="sub2">${fmt(t.air / 230, 1)} m³ bln ini</div>`;
      if (l.jenis === "flow") return `<div class="value">${fmt(t.flow, 2)} m³/h</div><div class="sub2">${fmt(t.flow / 7, 2)} m/s</div>`;
      return `<div class="value">${fmt(t.gas, 1)} m³</div><div class="sub2">${fmt(t.gas / 3000, 2)} m³/h · 20 mbar</div>`;
    };
    const chip = (l) => {
      const cls = l.status === "Lunas" ? "green" : l.status === "PUTUS" ? "red" : "orange";
      return `<span class="badge pill ${cls}">${ikon[l.jenis]} ${l.status} · ${rupiah(l.tagihan)}</span>`;
    };
    return `<div class="tenant ${putus ? "cut" : ""}">
      <div class="tenant-head"><b>${t.kode} · ${t.lantai}</b>${putus ? `<span class="badge red pill">⛔ ${putus} layanan putus</span>` : `<span class="badge green pill">● Normal</span>`}</div>
      <div class="sub">${t.nama} · ${t.bidang} · ${t.luas} m²</div>
      <div class="meter-grid">${t.layanan.map((l) => `<div class="meter ${l.status === "PUTUS" ? "cut" : ""}"><span class="led"></span><div class="label">${ikon[l.jenis]} ${namaLayanan[l.jenis]}</div>${nilai(l)}</div>`).join("")}</div>
      <div class="bill-chips">${t.layanan.map(chip).join("")}</div>
      <button class="btn green sm" onclick="bayarTenant(${i})">💳 Bayar</button>
    </div>`;
  }).join("");
  const sum = [
    ["⚡ kWh Meter", `${online.kwh} / 10 online`], ["💧 Water Meter", `${online.air} / 10 online`],
    ["🌀 Flow Meter", `${online.flow} / 10 online`], ["🔥 Gas Meter", `${online.gas} / 10 online`],
    ["⛔ Layanan Putus", `${putusTenant} tenant`], ["🧾 Tagihan Terbuka", `${tagihan} tagihan`],
    ["💰 Total Tunggakan", rupiah(totalTagihan)], ["✅ Terbayar Hari Ini", rupiah(tower.terbayar || 0)],
  ];
  $("#tenantSum").innerHTML = sum.map((s) => `<div class="esg"><div class="label">${s[0]}</div><div class="value" style="font-size:15px">${s[1]}</div></div>`).join("");
}
function bayarTenant(i) {
  const t = tower.tenant[i];
  let total = 0;
  t.layanan.forEach((l) => { if (l.status !== "Lunas") { total += l.tagihan; l.status = "Lunas"; } });
  tower.terbayar = (tower.terbayar || 0) + total;
  renderTenant();
  toast(total ? `${t.nama}: pembayaran ${rupiah(total)} diterima, layanan tersambung kembali` : `${t.nama}: tidak ada tagihan`);
}

function tickTower() {
  if (!$("#sysGrid")) return;
  const el = $("#towerClock"); if (el) el.textContent = jam();
  tower.sistem.forEach((s) => {
    const v = s.on ? s.nilai + rand(-s.acak, s.acak) : 0;
    tower.riwayat[s.id].push(v); tower.riwayat[s.id].shift();
    const card = $("#sys-" + s.id);
    if (card) card.querySelector(".spark").innerHTML = sparkline(tower.riwayat[s.id], s.on ? "#22d3ee" : "#64748b", 160, 30);
  });
  const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  const S = (id) => tower.sistem.find((x) => x.id === id);
  set("tt-hvac", S("hvac").on ? fmt(18.7 + rand(-0.2, 0.2), 1) + " °C" : "OFF");
  set("tt-light", S("light").on ? fmt(306 + rand(-8, 8)) + " kW" : "OFF");
  set("tt-cctv", S("cctv").on ? "47/48 online" : "OFF");
  set("tt-fire", S("fire").on ? fmt(7.5 + rand(-0.1, 0.1), 1) + " bar" : "OFF");
  set("tt-dc", `${fmt(21.6 + rand(-0.2, 0.2), 1)}°C · PUE 1,45`);
}
