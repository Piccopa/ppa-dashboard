/* =========================================================
   SCENES3D.JS — SEMUA MODUL 3D
   Memakai pustaka Three.js (dimuat di index.html).
   Pola setiap modul:
     1. kerangka()  → membuat tampilan panel (tombol, panel info)
     2. dunia3D()   → membuat kamera, cahaya, kontrol mouse
     3. scene_xxx() → menaruh objek 3D (gedung, tangki, pohon, …)
   ========================================================= */

const Scene3D = (() => {
  const views = {};
  let aktif = null;

  /* ---------- Bentuk-bentuk dasar ---------- */
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, flatShading: true, ...extra });
  function kotak(parent, w, h, d, color, x, y, z, extra) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color.isMaterial ? color : mat(color, extra));
    m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function tabung(parent, rt, rb, h, color, x, y, z, seg = 20) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color.isMaterial ? color : mat(color));
    m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function pohon(parent, x, z, s = 1) {
    tabung(parent, 0.3 * s, 0.4 * s, 2 * s, 0x7c5a3a, x, 0, z, 6);
    const c = new THREE.Mesh(new THREE.ConeGeometry(2 * s, 5 * s, 7), mat(0x2f8f46));
    c.position.set(x, 4.2 * s, z); c.castShadow = true; parent.add(c);
  }
  // tekstur jendela gedung (dibuat dengan kanvas)
  function teksturJendela(kol, bar, nyala = 0.55, warna = "#ffd27a", dasar = "#1b2433") {
    const cv = document.createElement("canvas"); cv.width = kol * 8; cv.height = bar * 8;
    const c = cv.getContext("2d"); c.fillStyle = dasar; c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < kol; i++) for (let j = 0; j < bar; j++) {
      c.fillStyle = Math.random() < nyala ? warna : "#2a3647";
      c.fillRect(i * 8 + 1.5, j * 8 + 2, 5, 4);
    }
    const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; return t;
  }
  function gedungKota(parent, w, h, d, x, z, nyala) {
    const t = teksturJendela(Math.round(w / 1.5), Math.round(h / 1.5), nyala);
    const m = mat(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9, flatShading: false });
    const b = kotak(parent, w, h, d, m, x, 0, z);
    return b;
  }

  /* ---------- Kerangka tampilan setiap modul ---------- */
  function kerangka(nama, o) {
    const el = document.getElementById("mod-" + nama);
    el.innerHTML = `
    <div class="panel" id="p3-${nama}">
      <div class="panel-head"><div class="panel-title">${o.judul}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${(o.tombolAtas || []).map((b, i) => `<button class="btn" data-top="${i}">${b.label}</button>`).join("")}
        <button class="btn" data-full>⛶ Layar Penuh</button></div></div>
      <div class="view3d" id="v3-${nama}">
        <div class="v3-error">Memuat 3D… Jika tidak muncul, pastikan internet aktif (Three.js dimuat dari internet).</div>
        ${o.bar ? `<div class="v3-top"><div class="t1">${o.bar.t1}<small>● ${o.bar.t1s}</small></div><div><div class="t2">${o.bar.t2}</div><div class="t3">${o.bar.t3}</div></div>
          <div class="right"><span style="color:#22c55e;font-size:11px;font-weight:600">● ${o.bar.status || "Realtime"}</span> <span data-jam></span><small>WIB</small></div></div>` : ""}
        ${o.kiri ? `<div class="v3-panel left" data-kiri>${o.kiri}</div>` : ""}
        ${o.kanan ? `<div class="v3-panel right" data-kanan>${o.kanan}</div>` : ""}
        ${o.bawah ? `<div class="v3-bottom">${o.bawah.map((b, i) => `<button class="chip ${b.bahaya ? "danger" : ""}" data-bot="${i}">${b.label}</button>`).join("")}</div>` : ""}
        <div class="v3-hint">🖱 Seret: putar · Scroll: zoom · Klik kanan / Shift+seret: geser · Klik label: Start/Stop</div>
      </div>
      ${o.bawahLuar || ""}
    </div>`;
    const v = { nama, el: document.getElementById("v3-" + nama), panel: el, labels: [], updaters: [], preset: {}, o };
    el.querySelector("[data-full]").onclick = () => layarPenuh(document.getElementById("p3-" + nama));
    el.querySelectorAll("[data-top]").forEach((b) => (b.onclick = () => o.tombolAtas[+b.dataset.top].aksi(v, b)));
    el.querySelectorAll("[data-bot]").forEach((b) => (b.onclick = () => o.bawah[+b.dataset.bot].aksi(v, b)));
    return v;
  }

  /* ---------- Kamera, cahaya, renderer, kontrol mouse ---------- */
  function dunia3D(v, langit = 0xbfe3f5) {
    const w = v.el.clientWidth, h = v.el.clientHeight;
    v.renderer = new THREE.WebGLRenderer({ antialias: true });
    v.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    v.renderer.setSize(w, h);
    v.renderer.shadowMap.enabled = true;
    v.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    v.el.prepend(v.renderer.domElement);
    v.scene = new THREE.Scene();
    v.scene.background = new THREE.Color(langit);
    v.scene.fog = new THREE.Fog(langit, 450, 1100);
    v.camera = new THREE.PerspectiveCamera(45, w / h, 0.5, 2000);
    v.hemi = new THREE.HemisphereLight(0xffffff, 0x4a5a40, 0.65);
    v.sun = new THREE.DirectionalLight(0xffffff, 0.75);
    v.sun.position.set(80, 140, 60);
    v.sun.castShadow = true;
    v.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(v.sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, far: 500 });
    v.sun.shadow.camera.updateProjectionMatrix();
    v.scene.add(v.hemi, v.sun);
    v.orbit = buatOrbit(v);
    new ResizeObserver(() => {
      const W = v.el.clientWidth, H = v.el.clientHeight;
      if (!W || !H) return;
      v.renderer.setSize(W, H); v.camera.aspect = W / H; v.camera.updateProjectionMatrix();
    }).observe(v.el);
  }

  function buatOrbit(v) {
    const o = { theta: 0.9, phi: 1.0, r: 220, target: new THREE.Vector3(), auto: false, goal: null };
    const cv = v.renderer.domElement;
    let drag = null;
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; o.goal = null; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointerup", () => (drag = null));
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (drag.pan) {
        const k = o.r / 600;
        const kanan = new THREE.Vector3(Math.sin(o.theta), 0, -Math.cos(o.theta));
        const depan = new THREE.Vector3(Math.cos(o.theta), 0, Math.sin(o.theta));
        o.target.addScaledVector(kanan, dx * k).addScaledVector(depan, -dy * k);
      } else {
        o.theta += dx * 0.006;
        o.phi = Math.max(0.15, Math.min(1.45, o.phi - dy * 0.005));
      }
    });
    cv.addEventListener("wheel", (e) => { e.preventDefault(); o.goal = null; o.r = Math.max(25, Math.min(600, o.r * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
    o.ke = (p) => (o.goal = { theta: p[0], phi: p[1], r: p[2], target: new THREE.Vector3(...p[3]) });
    o.update = () => {
      if (o.goal) {
        const g = o.goal, k = 0.07;
        o.theta += (g.theta - o.theta) * k; o.phi += (g.phi - o.phi) * k; o.r += (g.r - o.r) * k;
        o.target.lerp(g.target, k);
        if (Math.abs(g.r - o.r) < 0.5 && o.target.distanceTo(g.target) < 0.5) o.goal = null;
      }
      if (o.auto) o.theta += 0.0025;
      const c = v.camera;
      c.position.set(o.target.x + o.r * Math.sin(o.phi) * Math.cos(o.theta), o.target.y + o.r * Math.cos(o.phi), o.target.z + o.r * Math.sin(o.phi) * Math.sin(o.theta));
      c.lookAt(o.target);
    };
    return o;
  }

  /* ---------- Label melayang di atas objek ---------- */
  function label(v, judul, x, y, z, nilaiFn, klik) {
    const d = document.createElement("div");
    d.className = "v3-label";
    d.innerHTML = `<div style="font-weight:700">${judul}</div><b></b>`;
    if (klik) d.onclick = klik;
    v.el.appendChild(d);
    const L = { el: d, pos: new THREE.Vector3(x, y, z), nilaiFn, judul };
    v.labels.push(L);
    return L;
  }
  function posisiLabel(v) {
    const W = v.el.clientWidth, H = v.el.clientHeight;
    v.labels.forEach((L) => {
      const p = L.pos.clone().project(v.camera);
      const tampil = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      L.el.style.display = tampil ? "" : "none";
      if (tampil) { L.el.style.left = ((p.x + 1) / 2) * W + "px"; L.el.style.top = ((1 - p.y) / 2) * H + "px"; }
    });
  }
  function isiLabel(v) {
    v.labels.forEach((L) => {
      if (!L.nilaiFn) return;
      const r = L.nilaiFn();
      const teks = typeof r === "object" ? r.t : r;
      L.el.querySelector("b").textContent = teks;
      L.el.classList.toggle("off", typeof r === "object" && r.off);
    });
  }

  /* ---------- Siang / malam ---------- */
  function setMalam(v, malam) {
    v.malam = malam;
    const langit = malam ? (v.langitMalam || 0x0b1424) : v.langitSiang;
    v.scene.background.set(langit); v.scene.fog.color.set(langit);
    v.hemi.intensity = malam ? 0.3 : 0.65;
    v.sun.intensity = malam ? 0.15 : 0.75;
    v.scene.traverse((m) => { if (m.material && m.material.emissiveMap) m.material.emissiveIntensity = malam ? 1.2 : 0.15; });
    if (v.onMalam) v.onMalam(malam);
  }

  /* ======================================================
     MODUL A — 3D DIGITAL TWIN (kawasan pabrik + pelabuhan)
     ====================================================== */
  function scene_twin3d() {
    const alatChip = PERALATAN.map((p) => `<button class="chip" data-alat="${p.id}">● ${p.nama}</button>`).join("");
    const v = kerangka("twin3d", {
      judul: `🧊 3D Digital Twin – ${CONFIG.namaSingkat} Smart Manufacture`,
      tombolAtas: [
        ...["Overview", "Pabrik", "Utilitas", "Kantor", "Pelabuhan", "Laut", "Kawasan", "Logistik"].map((n) => ({ label: n, aksi: (v) => v.orbit.ke(v.preset[n]) })),
        { label: "🌞 Siang", aksi: (v, b) => { setMalam(v, !v.malam); b.textContent = v.malam ? "🌙 Malam" : "🌞 Siang"; } },
        { label: "🔄 Auto Orbit", aksi: (v, b) => { v.orbit.auto = !v.orbit.auto; b.classList.toggle("active", v.orbit.auto); } },
      ],
      bawahLuar: `<div class="metric-strip" data-strip></div><div class="metric-strip">${alatChip}</div>`,
    });
    dunia3D(v, 0xcfe8f7);
    v.langitSiang = 0xcfe8f7;
    const S = v.scene;
    // ---------- tanah, laut bergelombang, pantai, dermaga, gunung ----------
    kotak(S, 600, 1, 600, 0xb9c4a6, 0, -1, 0);
    const laut = Model3D.laut(300, 600);                 // laut realistis (js/model3d.js)
    laut.position.set(-230, 0.8, 0); S.add(laut);
    kotak(S, 14, 0.9, 600, 0xe8dcb5, -76, 0, 0);         // pantai
    kotak(S, 26, 1.3, 64, 0xa8adb3, -72, 0, 50);         // dermaga beton (pelabuhan)
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Mesh(new THREE.ConeGeometry(60 + Math.random() * 40, 70 + Math.random() * 50, 6), mat(0x8fbf8a));
      g.position.set(-40 + i * 50, 30, -230 - Math.random() * 40); S.add(g);
    }
    // ---------- jalan ----------
    kotak(S, 220, 0.2, 9, 0x4b5563, 30, 0, 26);
    kotak(S, 9, 0.2, 160, 0x4b5563, 74, 0, 0);
    for (let x = -75; x < 140; x += 8) kotak(S, 3, 0.25, 0.4, 0xffffff, x, 0, 26);
    // ---------- gedung-gedung nyata (js/model3d.js) ----------
    const pabrik = Model3D.pabrik({ lebar: 52, dalam: 26, tinggi: 12, pita: 0x2563eb, nama: CONFIG.namaSingkat });
    pabrik.position.set(12, 0, -10); S.add(pabrik);
    const hall2 = Model3D.pabrik({ lebar: 28, dalam: 20, tinggi: 10, pita: 0xdc2626, nama: "HALL 2" });
    hall2.position.set(54, 0, -14); S.add(hall2);
    const utilitas = Model3D.pabrik({ lebar: 22, dalam: 16, tinggi: 9, pita: 0x16a34a, nama: "UTILITAS" });
    utilitas.position.set(-26, 0, -14); S.add(utilitas);
    const gudang = Model3D.pabrik({ lebar: 36, dalam: 22, tinggi: 10, pita: 0x7c3aed, nama: "LOGISTIK" });
    gudang.position.set(100, 0, 2); S.add(gudang);
    // kantor pusat & kantor kedua di belakang pabrik (menjulang di latar)
    const kantor = Model3D.kantor({ lebar: 18, dalam: 14, tinggi: 42, nama: CONFIG.namaSingkat });
    kantor.position.set(40, 0, -54); S.add(kantor);
    const kantor2 = Model3D.kantor({ lebar: 14, dalam: 12, tinggi: 26, kaca: 0x3b7f8f, nama: CONFIG.namaSingkat });
    kantor2.position.set(62, 0, -52); S.add(kantor2);
    kotak(S, 46, 0.15, 8, 0x374151, 50, 0, -37);          // parkiran
    for (let x = 30; x <= 70; x += 4) kotak(S, 0.2, 0.18, 6, 0xffffff, x, 0, -37);
    // chiller & AHU di samping gedung utilitas
    kotak(S, 7, 3, 5, 0x60a5fa, -30, 0, 2); kotak(S, 7, 3, 5, 0xe2e8f0, -21, 0, 2);
    // tangki & cerobong
    tabung(S, 4, 4, 10, 0xf8fafc, -45, 0, -24); tabung(S, 4, 4, 10, 0xf8fafc, -45, 0, -12); tabung(S, 3, 3, 8, 0xf97316, -40, 0, 2);
    for (let i = 0; i < 6; i++) tabung(S, 1.6, 1.8, 5, i % 2 ? 0xffffff : 0xdc2626, -34, i * 5, -30, 12);
    // genset & baterai & LVMDP (di luar gedung)
    kotak(S, 8, 4, 4, 0x10b981, -8, 0, 10); kotak(S, 6, 5, 3, 0x1f2937, 2, 0, 10); kotak(S, 8, 5, 2.5, 0xe2e8f0, 12, 0, 10);
    // ---------- pelabuhan: lapangan kontainer & crane ----------
    const warnaKont = [0xb91c1c, 0x15803d, 0xd97706, 0x1d4ed8, 0x9a3412, 0x0f766e, 0xe2e8f0];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 1 + ((i + j) % 3); k++)
      kotak(S, 5.5, 2.6, 2.4, warnaKont[(i * 3 + j + k) % 7], -55 + i * 6, 1.3 + k * 2.6, 40 + j * 2.8);
    [[-66, 30], [-66, 44], [-78, 30], [-78, 44]].forEach(([x, z]) => kotak(S, 1.2, 24, 1.2, 0xeab308, x, 1.3, z));
    kotak(S, 40, 1.8, 2, 0xeab308, -82, 23, 37); kotak(S, 14, 3, 4, 0xeab308, -72, 21, 37);
    // ---------- kapal kargo: satu berlayar, satu bersandar ----------
    const kapal = Model3D.kapal();
    kapal.rotation.y = -Math.PI / 2;                    // haluan menghadap +z (arah berlayar)
    kapal.position.set(-150, 0.8, 0); S.add(kapal);
    const kapalSandar = Model3D.kapal({ tulisan: "MITMAG EXPRESS", warnaLambung: 0x7f1d1d, isi: 1 });
    kapalSandar.rotation.y = -Math.PI / 2;
    kapalSandar.position.set(-93, 0.8, 50); S.add(kapalSandar);
    const perahu = kotak(S, 4, 2, 2, 0xdc2626, -110, 0.8, -60);
    // ---------- truk realistis (bergerak di jalan, roda berputar) ----------
    const varian = [{ warnaMuatan: 0x1d4ed8 }, { jenis: "tangki", warnaKabin: 0xdc2626 }, { warnaMuatan: 0xd97706, warnaKabin: 0x1f2937 }, { warnaMuatan: 0x15803d }];
    const truk = varian.map((opsi, i) => {
      const g = Model3D.truk(opsi);
      g.scale.setScalar(0.75);
      g.userData.off = i * 55; g.userData.arah = i % 2 ? 1 : -1;
      S.add(g); return g;
    });
    // ---------- pohon (tidak di area pelabuhan & kantor) ----------
    for (let i = 0; i < 110; i++) {
      const x = -70 + Math.random() * 200, z = (Math.random() < 0.5 ? -40 - Math.random() * 90 : 34 + Math.random() * 80);
      if (x < -35 && z > 30) continue;
      if (x > 24 && x < 78 && z > -72 && z < -28) continue;
      pohon(S, x, z, 0.8 + Math.random() * 0.6);
    }
    // label peralatan (klik → start/stop, terhubung dengan modul Smart Manufacture)
    const st = state.sensor, on = state.alat;
    const L = (id, judul, x, y, z, f) => label(v, judul, x, y, z, () => (on[id] ? { t: f() } : { t: "OFF", off: true }), () => setAlat(id, !on[id]));
    L("lighting", "Lighting", 0, 19, -10, () => "Normal");
    label(v, "Lini Produksi", 18, 18, -4, () => fmt(state.produksi) + " unit");
    L("chiller", "Chiller", -30, 6, 2, () => fmt(6.1, 1) + " °C");
    L("ahu", "AHU", -21, 6, 2, () => fmt(st.suhu, 1) + " °C");
    L("hvac", "HVAC", 54, 15, -14, () => fmt(st.suhu - 0.5, 1) + " °C");
    L("boiler", "Boiler", -40, 10, 2, () => "Gas " + fmt(st.gas) + " m³");
    L("genset", "Genset", -8, 6, 10, () => fmt(st.tgenset, 1) + " bar");
    L("battery", "Battery/Aki", 2, 7, 10, () => fmt(st.aki, 1) + " V");
    L("lvmdp", "LVMDP", 12, 7, 10, () => fmt(381) + " V");
    L("valve", "Control Valve", -45, 12, -12, () => fmt(st.valve) + "% buka");
    L("power", "Power Meter", 30, 16, -2, () => fmt(st.power, 1) + " kWh");
    L("pompa", "Pompa", -45, 12, -24, () => fmt(st.tpompa, 1) + " bar");
    L("flow", "Flow Meter", 46, 12, -4, () => fmt(st.flow) + " m³/h");
    label(v, "Kantor Pusat", 40, 47, -54, () => fmt(186 + Math.round(rand(-3, 3))) + " orang");
    const lblKapal = label(v, "MV MITMAG LINE", 0, 30, 0, () => "Berlayar · 1.240 TEU");
    label(v, "MV MITMAG EXPRESS", -93, 30, 50, () => "Bongkar muat · " + fmt(612 + Math.round(rand(0, 4))) + " TEU");
    v.preset = {
      Overview: [1.15, 1.0, 190, [0, 0, 5]], Pabrik: [1.1, 0.95, 90, [12, 0, -10]], Utilitas: [0.5, 0.9, 70, [-30, 0, -8]],
      Kantor: [1.25, 0.95, 100, [50, 18, -50]], Pelabuhan: [2.3, 0.95, 120, [-80, 0, 45]], Laut: [2.6, 1.1, 200, [-140, 0, 0]],
      Kawasan: [0.9, 0.6, 330, [10, 0, 0]], Logistik: [0.3, 0.9, 90, [95, 0, 5]],
    };
    v.orbit.ke(v.preset.Overview);
    const t0 = performance.now();
    v.updaters.push((t) => {
      laut.userData.gerak(t / 1000);                                    // ombak
      kapal.position.z = ((t - t0) / 70) % 500 - 250;                   // kapal berlayar
      kapal.position.y = 0.8 + Math.sin(t / 900) * 0.25;               // naik-turun di ombak
      kapal.rotation.z = Math.sin(t / 1300) * 0.01;
      kapalSandar.position.y = 0.8 + Math.sin(t / 1100) * 0.12;
      lblKapal.pos.set(kapal.position.x, 30, kapal.position.z);
      perahu.position.x = -110 + Math.sin(t / 3000) * 20;
      truk.forEach((g) => {
        const jarak = t / 40 + g.userData.off;
        const u = ((jarak * g.userData.arah) % 220 + 220) % 220;
        g.position.set(-75 + u, 0, 26 + (g.userData.arah > 0 ? 2.2 : -2.2));
        g.rotation.y = g.userData.arah > 0 ? 0 : Math.PI;
        g.userData.roda.forEach((r) => (r.rotation.z = -jarak / 0.75 / 0.52));   // roda berputar sesuai jarak tempuh
      });
    });
    v.detik = () => {
      v.panel.querySelector("[data-strip]").innerHTML = [["Flow", fmt(st.flow) + " m³/h"], ["Daya", fmt(st.power, 1) + " kWh"], ["Tek. Pompa", fmt(st.tpompa, 1) + " bar"],
        ["Suhu", fmt(st.suhu, 1) + " °C"], ["RH", fmt(st.rh) + " %"], ["Genset", fmt(st.tgenset, 1) + " bar"], ["Aki", fmt(st.aki, 1) + " V"],
        ["OEE", fmt((state.oee.a * state.oee.p * state.oee.q) / 10000, 1) + " %"]].map((m) => `<div class="metric"><div class="label">${m[0]}</div><div class="value">${m[1]}</div></div>`).join("");
      v.panel.querySelectorAll("[data-alat]").forEach((b) => { b.style.color = on[b.dataset.alat] ? "" : "#f87171"; });
    };
    v.panel.querySelectorAll("[data-alat]").forEach((b) => (b.onclick = () => setAlat(b.dataset.alat, !on[b.dataset.alat])));
    return v;
  }

  /* ======================================================
     MODUL C — GROW PALM 3D (kebun sawit 100 hektar)
     ====================================================== */
  function scene_palm3d() {
    const baris = "ABCDEFGHIJ";
    const lapisan = { Off: null, pH: [4.5, 6.5], Kelembapan: [40, 80], NPK: [1.5, 3], "Oksigen DO": [3, 8], Kualitas: [100, 400], Debit: [10, 30], Suhu: [24, 32] };
    const data = {};
    Object.keys(lapisan).forEach((k) => (data[k] = Array.from({ length: 100 }, () => Math.random())));
    const P = { tbs: 0, cpo: 61, anomali: 1, pilih: 37, lapis: "pH", truk: 1 };
    const v = kerangka("palm3d", {
      judul: `🌴 ${CONFIG.namaSingkat} Palm Oil Monitoring – Grow Palm 3D (100 Ha)`,
      bar: { t1: "🌴 " + CONFIG.namaSingkat.toUpperCase(), t1s: "Palm Oil Monitoring", t2: `${CONFIG.namaSingkat} Palm Oil Monitoring`, t3: "Smart Plantation 100 Ha · 3D Digital Twin Kebun – Pabrik – Head Office", status: "Live" },
      kiri: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
          <div class="v3-kv" style="display:block"><span class="muted">Sensor online</span><br><b>700/700</b></div><div class="v3-kv" style="display:block"><span class="muted">Anomali CCTV AI</span><br><b data-k="anom">1</b></div>
          <div class="v3-kv" style="display:block"><span class="muted">TBS masuk PKS</span><br><b data-k="tbs">0 t</b></div><div class="v3-kv" style="display:block"><span class="muted">Stok CPO</span><br><b data-k="cpo">61 t</b></div></div>
        <h5 style="margin-top:6px">LAYER SENSOR (HEATMAP / HEKTAR)</h5>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${Object.keys(lapisan).map((k) => `<button class="btn sm" data-lap="${k}">${k}</button>`).join("")}</div>
        <div data-k="info" style="margin-top:8px"></div>`,
      kanan: `<h5>ALUR HULU → HILIR</h5><div data-k="alur"></div><div data-k="plog" style="font-size:10.5px;margin-top:6px"></div>`,
      bawah: [
        { label: "🌐 Overview 100 Ha", aksi: (v) => v.orbit.ke(v.preset.Overview) }, { label: "🌴 Kebun", aksi: (v) => v.orbit.ke(v.preset.Kebun) },
        { label: "🏭 PKS", aksi: (v) => v.orbit.ke(v.preset.PKS) }, { label: "🏢 Head Office", aksi: (v) => v.orbit.ke(v.preset.HO) },
        { label: "🔄 Auto-Rotate", aksi: (v, b) => { v.orbit.auto = !v.orbit.auto; b.classList.toggle("active", v.orbit.auto); } },
        { label: "🔥 Simulasi Asap (CCTV AI)", bahaya: true, aksi: () => { P.pilih = Math.floor(Math.random() * 100); P.anomali++; toast("CCTV AI: indikasi asap di hektar " + namaPetak(P.pilih)); tandai(); } },
      ],
    });
    dunia3D(v, 0x9fd3f2);
    v.langitSiang = 0x9fd3f2;
    const S = v.scene;
    kotak(S, 700, 1, 700, 0x6fbf3a, 0, -1, 0);
    kotak(S, 104, 0.4, 104, 0xc9a66b, 0, -0.2, 0);
    kotak(S, 18, 0.6, 400, 0x2f80c7, 72, -0.4, 0);
    const namaPetak = (i) => `${baris[Math.floor(i / 10)]}${(i % 10) + 1}`;
    // 100 petak (1 petak = 1 hektar)
    const petak = [];
    for (let i = 0; i < 100; i++) {
      const x = -45 + (i % 10) * 10, z = -45 + Math.floor(i / 10) * 10;
      petak.push(kotak(S, 9.2, 0.3, 9.2, 0x4f8f2f, x, 0, z));
    }
    // pohon sawit (InstancedMesh = ribuan objek sekaligus, ringan)
    const N = 100 * 9;
    const batang = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 2.4, 5), mat(0x6b4f2a), N);
    const daun = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 1.4, 7), mat(0x2e7d32), N);
    const dm = new THREE.Object3D(); let n = 0;
    for (let i = 0; i < 100; i++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const x = -48 + (i % 10) * 10 + a * 3 + rand(-0.4, 0.4), z = -48 + Math.floor(i / 10) * 10 + b * 3 + rand(-0.4, 0.4);
      dm.position.set(x, 1.5, z); dm.rotation.set(0, Math.random() * 6, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); batang.setMatrixAt(n, dm.matrix);
      dm.position.y = 3.1; dm.rotation.x = Math.PI; dm.updateMatrix(); daun.setMatrixAt(n, dm.matrix); n++;
    }
    batang.castShadow = daun.castShadow = true; S.add(batang, daun);
    // titik sensor
    const sensor = new THREE.InstancedMesh(new THREE.SphereGeometry(0.35, 6, 6), mat(0x67e8f9, { emissive: 0x22d3ee, emissiveIntensity: 1 }), 160);
    for (let i = 0; i < 160; i++) { dm.position.set(rand(-49, 49), 3.8, rand(-49, 49)); dm.rotation.set(0, 0, 0); dm.updateMatrix(); sensor.setMatrixAt(i, dm.matrix); }
    S.add(sensor);
    // gateway LoRa, kantor, timbangan, PKS
    kotak(S, 0.8, 16, 0.8, 0xe5e7eb, 0, 0, 0);
    kotak(S, 14, 5, 9, 0x1f2937, -40, 0, 66); kotak(S, 14.2, 0.5, 9.2, 0x22c55e, -40, 5, 66);
    kotak(S, 8, 0.6, 3, 0x94a3b8, -18, 0, 66);
    kotak(S, 18, 9, 12, 0x1e3a8a, 6, 0, 72); tabung(S, 3, 3, 10, 0xe5e7eb, 20, 0, 70); tabung(S, 3, 3, 10, 0xe5e7eb, 20, 0, 78); tabung(S, 0.8, 0.8, 18, 0x64748b, 0, 0, 78, 8);
    kotak(S, 8, 0.2, 60, 0xb08d57, -30, 0, 80); kotak(S, 120, 0.2, 5, 0xb08d57, 0, 0, 56);
    const truk = new THREE.Group(); kotak(truk, 5, 2.4, 2.4, 0xf59e0b, 0, 0.3, 0); kotak(truk, 1.8, 2, 2.4, 0x1f2937, 3.4, 0.3, 0); S.add(truk);
    // penanda hektar anomali
    const cincin = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.5, 32), new THREE.MeshBasicMaterial({ color: 0xff3b30, side: THREE.DoubleSide, transparent: true }));
    cincin.rotation.x = -Math.PI / 2; S.add(cincin);
    label(v, "LoRa Gateway", 0, 18, 0, () => "700 sensor");
    label(v, "Head Office", -40, 8, 66, () => "Control Room");
    label(v, "Timbangan", -18, 3, 66, () => P.truk + " truk");
    label(v, "PKS", 6, 12, 72, () => fmt(1.6, 1) + " t hopper");
    const lblAnom = label(v, "⚠ Anomali", 0, 6, 0, () => ({ t: namaPetak(P.pilih), off: true }));
    function tandai() {
      const x = -45 + (P.pilih % 10) * 10, z = -45 + Math.floor(P.pilih / 10) * 10;
      cincin.position.set(x, 0.6, z); lblAnom.pos.set(x, 6, z); cincin.visible = true; lblAnom.el.style.visibility = ""; infoPetak();
    }
    // warna heatmap
    const palet = (t) => new THREE.Color().setHSL(0.0 + t * 0.33, 0.75, 0.42);
    function warnai() {
      v.el.querySelectorAll("[data-lap]").forEach((b) => b.classList.toggle("active", b.dataset.lap === P.lapis));
      petak.forEach((m, i) => m.material.color.copy(P.lapis === "Off" ? new THREE.Color(0x4f8f2f) : palet(data[P.lapis][i])));
    }
    function infoPetak() {
      const i = P.pilih, val = (k, d = 1) => { const r = lapisan[k]; return fmt(r[0] + data[k][i] * (r[1] - r[0]), d); };
      v.el.querySelector('[data-k="info"]').innerHTML = `<div style="color:#f87171;font-weight:700">📍 Hektar ${namaPetak(i)} ⚠ ANOMALI</div>
        ${[["pH Tanah", val("pH", 2)], ["Kelembapan Tanah", val("Kelembapan", 0) + " %"], ["NPK Daun", `N ${val("NPK", 2)} · P 0,16 · K 1,18 %`], ["Oksigen Terlarut", val("Oksigen DO") + " mg/L"],
          ["Kualitas Air", val("Kualitas", 0) + " ppm"], ["Flow Meter", val("Debit") + " L/s"], ["Cuaca", "27,7°C · RH 82%"], ["CCTV AI", "Asap / indikasi kebakaran"]]
          .map((r) => `<div class="v3-row"><span class="muted">${r[0]}</span><b style="color:${r[0] === "CCTV AI" ? "#fbbf24" : "#fff"}">${r[1]}</b></div>`).join("")}
        <button class="btn sm" style="width:100%;margin-top:6px" data-selesai>✓ Tandai selesai</button>`;
      v.el.querySelector("[data-selesai]").onclick = () => { P.anomali = Math.max(0, P.anomali - 1); cincin.visible = false; lblAnom.el.style.visibility = "hidden"; toast("Anomali hektar " + namaPetak(i) + " ditandai selesai"); };
    }
    v.el.querySelectorAll("[data-lap]").forEach((b) => (b.onclick = () => { P.lapis = b.dataset.lap; warnai(); }));
    // klik petak untuk melihat datanya
    const ray = new THREE.Raycaster();
    v.renderer.domElement.addEventListener("dblclick", (e) => {
      const r = v.renderer.domElement.getBoundingClientRect();
      ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, v.camera);
      const hit = ray.intersectObjects(petak)[0];
      if (hit) { P.pilih = petak.indexOf(hit.object); cincin.visible = true; lblAnom.el.style.visibility = ""; tandai(); }
    });
    warnai(); tandai();
    v.preset = { Overview: [1.2, 0.85, 190, [0, 0, 10]], Kebun: [0.8, 0.7, 90, [0, 0, -10]], PKS: [1.4, 0.9, 60, [8, 0, 72]], HO: [1.9, 0.9, 50, [-40, 0, 66]] };
    v.orbit.ke(v.preset.Overview);
    v.updaters.push((t) => {
      const u = (t / 60) % 160;
      truk.position.set(u < 80 ? -60 + u * 1.2 : 36 - (u - 80) * 1.2, 0, 56);
      truk.rotation.y = u < 80 ? 0 : Math.PI;
      cincin.material.opacity = 0.5 + Math.sin(t / 200) * 0.4;
    });
    v.detik = () => {
      P.tbs += Math.random() < 0.3 ? 0.1 : 0; P.cpo += Math.random() < 0.1 ? 0.1 : 0; P.truk = Math.random() < 0.5 ? 0 : 1;
      const set = (k, h) => (v.el.querySelector(`[data-k="${k}"]`).innerHTML = h);
      set("anom", P.anomali); set("tbs", fmt(P.tbs, 1) + " t"); set("cpo", fmt(P.cpo) + " t");
      set("alur", [["🌴 Panen kebun", `${48 + Math.round(rand(-2, 2))} pekerja · ${fmt(P.tbs, 1)} t`], ["📦 TPH menunggu", fmt(16.1, 1) + " t"], ["🚚 Angkut TBS", `1/4 truk jalan`],
        ["⚖️ Timbangan", P.truk + " truk"], ["🏭 PKS hopper → press", `1,6 t · olah 4 t`], ["🛢️ Tangki CPO · kernel", `${fmt(P.cpo)} t · 14 t`], ["🚢 Kirim pelabuhan", "0 t CPO"]]
        .map((r) => `<div class="v3-row"><span class="muted">${r[0]}</span><b>${r[1]}</b></div>`).join(""));
      set("plog", `<span class="muted">${jam()} Debit irigasi stabil</span><br><span style="color:#f87171">${jam()} ⚠ CCTV AI ${namaPetak(P.pilih)} Asap / indikasi kebakaran</span>`);
    };
    return v;
  }

  /* ======================================================
     MODUL D — POWER PLANT 3D (PLTU)
     ====================================================== */
  function scene_power3d() {
    const U = { boiler: true, turbin: true, generator: true, ct: true, konveyor: true, trip: false, mw: 300 };
    const unit = [["boiler", "🔥 Boiler"], ["turbin", "🌀 Turbin"], ["generator", "⚡ Generator"], ["ct", "☁️ Cooling Tower"], ["konveyor", "⛏️ Coal Conveyor"]];
    const v = kerangka("power3d", {
      judul: `⚡ Power Plant 3D – ${CONFIG.namaSingkat} Power Plant`,
      bar: { t1: CONFIG.namaSingkat.toUpperCase(), t1s: "POWER PLANT", t2: "Digital Twin 3D – Pembangkit Listrik", t3: "Boiler · Turbin · Generator · Cooling Tower · Switchyard · CEMS" },
      kiri: `<div class="v3-kv"><span>Daya Output</span><b data-k="mw">-</b></div><div class="v3-kv"><span>Efisiensi</span><b data-k="ef">-</b></div>
        <div class="v3-kv"><span>Frekuensi</span><b data-k="hz">-</b></div><div class="v3-kv"><span>Batubara</span><b data-k="bb">-</b></div>
        <div class="v3-kv"><span>Emisi SO₂ (CEMS)</span><b data-k="so2">-</b></div><div data-k="log" class="muted" style="font-size:10.5px;margin-top:6px"></div>`,
      kanan: `<h5>▮ Kontrol Unit</h5>${unit.map(([k, n]) => `<div class="v3-row"><span>${n}</span><span class="toggle" data-tg="${k}"></span><button class="btn sm" data-sw="${k}"></button></div>`).join("")}`,
      bawah: [
        { label: "🌐 Overview", aksi: (v) => v.orbit.ke(v.preset.Overview) }, { label: "🔥 Boiler", aksi: (v) => v.orbit.ke(v.preset.Boiler) },
        { label: "🌀 Turbin", aksi: (v) => v.orbit.ke(v.preset.Turbin) }, { label: "☁️ Cooling Tower", aksi: (v) => v.orbit.ke(v.preset.CT) },
        { label: "🗼 Switchyard", aksi: (v) => v.orbit.ke(v.preset.SY) }, { label: "⛏️ Coal Yard", aksi: (v) => v.orbit.ke(v.preset.CY) },
        { label: "🔄 Auto-Rotate", aksi: (v, b) => { v.orbit.auto = !v.orbit.auto; b.classList.toggle("active", v.orbit.auto); } },
        { label: "🌙 Malam", aksi: (v, b) => { setMalam(v, !v.malam); b.innerHTML = v.malam ? "🌞 Siang" : "🌙 Malam"; } },
        { label: "⚠ Simulasi Trip Unit", bahaya: true, aksi: () => { U.trip = !U.trip; toast(U.trip ? "UNIT TRIP – proteksi generator bekerja" : "Unit sinkron kembali ke jaringan"); } },
      ],
    });
    dunia3D(v, 0xc7dfef);
    v.langitSiang = 0xc7dfef;
    const S = v.scene;
    kotak(S, 700, 1, 700, 0xa9b89a, 0, -1, 0);
    kotak(S, 200, 0.3, 150, 0xc9ccc4, 0, -0.2, 0);
    kotak(S, 300, 0.3, 40, 0x3fa7d6, 0, 0.02, -110);
    const boiler = kotak(S, 22, 42, 20, 0xe5e7eb, 0, 0, 0); kotak(S, 22.4, 3, 20.4, 0x1d4ed8, 0, 34, 0);
    for (let i = 0; i < 8; i++) tabung(S, 3, 3.2, 10, i % 2 ? 0xffffff : 0xdc2626, 22, i * 10, -14, 16);
    kotak(S, 44, 16, 18, 0xcbd5e1, -34, 0, 6); kotak(S, 44.2, 2, 18.2, 0x0ea5e9, -34, 13, 6);
    const pts = []; for (let i = 0; i <= 10; i++) { const y = i * 4.6; pts.push(new THREE.Vector2(13 - Math.sin((i / 10) * Math.PI) * 4.5 - i * 0.25, y)); }
    const ctGeo = new THREE.LatheGeometry(pts, 28);
    const ctPos = [[45, 34], [78, 34]];
    ctPos.forEach(([x, z]) => { const m = new THREE.Mesh(ctGeo, mat(0xd6d3d1, { side: THREE.DoubleSide })); m.position.set(x, 0, z); m.castShadow = true; S.add(m); });
    // uap air dari cooling tower
    const uap = [];
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      m.userData = { ct: i % 2, fase: Math.random() }; S.add(m); uap.push(m);
    }
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(10, 7, 8), mat(0x27272a)); c.position.set(-55 + i * 13, 3.5, -45); S.add(c); }
    const konv = kotak(S, 60, 1.4, 2.5, 0x52525b, -25, 0, -25); konv.rotation.z = 0.2; konv.position.y = 8;
    // switchyard & tower transmisi
    for (let i = 0; i < 3; i++) kotak(S, 5, 5, 4, 0x6b7280, -70, 0, 40 + i * 8);
    const towerT = [];
    for (let i = 0; i < 4; i++) {
      const x = -90 - i * 45, z = 48;
      const m = new THREE.Mesh(new THREE.ConeGeometry(3, 34, 4), mat(0x94a3b8)); m.position.set(x, 17, z); S.add(m);
      kotak(S, 16, 0.6, 0.6, 0x94a3b8, x, 28, z); towerT.push(new THREE.Vector3(x, 28, z));
    }
    const kabel = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-70, 5, 48), ...towerT]), new THREE.LineBasicMaterial({ color: 0x334155 }));
    S.add(kabel);
    for (let i = 0; i < 40; i++) pohon(S, rand(-150, 150), rand(80, 160), 1.2);
    label(v, "Boiler", 0, 46, 0, () => (U.boiler && !U.trip ? "540 °C · 170 bar" : { t: "OFF", off: true }));
    label(v, "Turbin", -40, 18, 6, () => (U.turbin && !U.trip ? "3.000 rpm" : { t: "STOP", off: true }));
    label(v, "Generator", -24, 18, 6, () => (U.generator && !U.trip ? fmt(U.mw, 1) + " MW" : { t: "TRIP", off: true }));
    label(v, "Cooling Tower", 61, 48, 34, () => (U.ct ? "ΔT 9,8 °C" : { t: "OFF", off: true }));
    label(v, "Chimney / CEMS", 22, 84, -14, () => "SO₂ " + fmt(rand(180, 200)) + " mg/Nm³");
    label(v, "Switchyard 150 kV", -70, 8, 48, () => (U.trip ? { t: "Open", off: true } : "Closed"));
    label(v, "Coal Yard", -30, 10, -45, () => fmt(38500) + " t");
    v.preset = { Overview: [2.0, 1.0, 250, [-10, 10, 0]], Boiler: [0.6, 1.1, 90, [0, 20, 0]], Turbin: [1.3, 1.0, 80, [-34, 6, 6]], CT: [0.9, 1.0, 120, [60, 15, 34]], SY: [1.8, 1.0, 120, [-100, 10, 48]], CY: [2.6, 0.9, 90, [-30, 0, -40]] };
    v.orbit.ke(v.preset.Overview);
    const renderKontrol = () => {
      v.el.querySelectorAll("[data-tg]").forEach((e) => { const on = U[e.dataset.tg] && !U.trip; e.textContent = on ? "ON" : "OFF"; e.classList.toggle("off", !on); });
      v.el.querySelectorAll("[data-sw]").forEach((b) => { const on = U[b.dataset.sw]; b.textContent = on ? "■ Stop" : "▶ Start"; b.className = "btn sm " + (on ? "red" : ""); });
    };
    v.el.querySelectorAll("[data-sw]").forEach((b) => (b.onclick = () => { U[b.dataset.sw] = !U[b.dataset.sw]; renderKontrol(); }));
    renderKontrol();
    v.updaters.push((t) => {
      uap.forEach((m) => {
        const f = ((t / 6000 + m.userData.fase) % 1), [x, z] = ctPos[m.userData.ct];
        m.visible = U.ct;
        m.position.set(x + f * 10, 46 + f * 40, z + Math.sin(f * 6 + m.userData.fase * 9) * 3);
        m.scale.setScalar(1 + f * 2.5); m.material.opacity = 0.55 * (1 - f);
      });
      boiler.material.emissive = new THREE.Color(U.trip && Math.sin(t / 150) > 0 ? 0x7f1d1d : 0x000000);
    });
    v.detik = () => {
      renderKontrol();
      const jalan = U.boiler && U.turbin && U.generator && !U.trip;
      U.mw = jalan ? 300 + rand(-4, 4) : Math.max(0, U.mw * 0.4);
      const set = (k, t) => (v.el.querySelector(`[data-k="${k}"]`).textContent = t);
      set("mw", fmt(U.mw, 1) + " MW"); set("ef", jalan ? fmt(38.2 + rand(-0.2, 0.2), 1) + " %" : "0 %");
      set("hz", jalan ? fmt(50 + rand(-0.03, 0.03), 2) + " Hz" : "0 Hz"); set("bb", U.konveyor && jalan ? fmt(142 + rand(-2, 2)) + " t/jam" : "0 t/jam");
      set("so2", fmt(rand(180, 200)) + " mg/Nm³"); set("log", `${jam()} ${U.trip ? "⚠ Unit trip – investigasi proteksi" : "Operasi normal · sinkron jaringan"}`);
    };
    return v;
  }

  /* ======================================================
     MODUL E — WATER TREATMENT 3D (IPA / WTP)
     ====================================================== */
  function scene_water3d() {
    const W = { intake: true, dosing: true, mixer: true, backwash: false, distribusi: true, level: 78 };
    const unit = [["intake", "💧 Pompa Intake"], ["dosing", "🧪 Dosing Koagulan"], ["mixer", "🌀 Mixer Flokulasi"], ["backwash", "🔁 Backwash Filter"], ["distribusi", "🚰 Pompa Distribusi"]];
    const v = kerangka("water3d", {
      judul: `💧 Water Treatment 3D – ${CONFIG.namaSingkat} Water Treatment Plant`,
      bar: { t1: CONFIG.namaSingkat.toUpperCase(), t1s: "WATER TREATMENT", t2: "Digital Twin 3D – Instalasi Pengolahan Air", t3: "Intake · Koagulasi · Flokulasi · Sedimentasi · Filtrasi · Reservoir · Distribusi" },
      kiri: `${["masuk", "keluar", "ntu", "ph", "klor", "level"].map((k, i) => `<div class="v3-kv"><span>${["Debit Masuk", "Debit Keluar", "Kekeruhan", "pH", "Sisa Klor", "Level Reservoir"][i]}</span><b data-k="${k}">-</b></div>`).join("")}
        <div data-k="log" class="muted" style="font-size:10.5px;margin-top:6px"></div>`,
      kanan: `<h5>▮ Kontrol Proses</h5>${unit.map(([k, n]) => `<div class="v3-row"><span>${n}</span><span class="toggle" data-tg="${k}"></span><button class="btn sm" data-sw="${k}"></button></div>`).join("")}`,
      bawah: [
        ...["Overview", "Intake", "Koagulasi", "Sedimentasi", "Filtrasi", "Reservoir"].map((n) => ({ label: n, aksi: (v) => v.orbit.ke(v.preset[n]) })),
        { label: "🔄 Auto-Rotate", aksi: (v, b) => { v.orbit.auto = !v.orbit.auto; b.classList.toggle("active", v.orbit.auto); } },
        { label: "🔁 Simulasi Backwash", bahaya: true, aksi: () => { W.backwash = !W.backwash; toast(W.backwash ? "Backwash filter berjalan" : "Backwash selesai"); } },
      ],
    });
    dunia3D(v, 0xd2e9f5);
    v.langitSiang = 0xd2e9f5;
    const S = v.scene;
    kotak(S, 700, 1, 700, 0x9cc27f, 0, -1, 0);
    kotak(S, 190, 0.3, 90, 0xd6d3d1, 0, -0.2, 0);
    kotak(S, 30, 0.6, 400, 0x6a9bb0, -115, -0.4, 0);
    const beton = 0xbfc3c7;
    const air = (w, d, warna, x, y, z) => kotak(S, w, 0.2, d, mat(warna, { metalness: 0.2, roughness: 0.3 }), x, y, z);
    const bak = (w, d, h, warna, x, z) => { kotak(S, w, h, d, beton, x, 0, z); return air(w - 1.2, d - 1.2, warna, x, h - 0.05, z); };
    kotak(S, 8, 5, 8, 0x475569, -96, 0, 0);
    bak(16, 16, 4, 0x8b6b3d, -70, 0);
    const mixer = [];
    for (let i = 0; i < 3; i++) { bak(10, 10, 4, 0x7a8a55, -50, -12 + i * 12); const m = kotak(S, 8, 0.4, 0.8, 0x1f2937, -50, 4.4, -12 + i * 12); mixer.push(m); }
    const lengan = [];
    [[-18, -15], [-18, 15]].forEach(([x, z]) => {
      tabung(S, 13, 13, 4, beton, x, 0, z, 32);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(12.3, 12.3, 0.2, 32), mat(0x5f9ea0, { metalness: 0.2, roughness: 0.3 })); a.position.set(x, 4.05, z); S.add(a);
      const g = new THREE.Group(); g.position.set(x, 4.6, z); kotak(g, 24, 0.8, 1.2, 0xf59e0b, 0, 0, 0); S.add(g); lengan.push(g);
    });
    const filter = [];
    for (let i = 0; i < 6; i++) filter.push(bak(9, 9, 4, 0x3b82f6, 12 + (i % 3) * 11, -6 + Math.floor(i / 3) * 12));
    const res = [tabung(S, 9, 9, 12, 0xe5e7eb, 62, 0, -12), tabung(S, 9, 9, 12, 0xe5e7eb, 62, 0, 12)];
    kotak(S, 12, 6, 10, 0x1e40af, 85, 0, 0);
    kotak(S, 24, 7, 12, 0xf1f5f9, 0, 0, -38); kotak(S, 24.2, 1, 12.2, 0x0ea5e9, 0, 6, -38);
    // pipa
    const pipa = (x1, z1, x2, z2) => { const p = tabung(S, 0.8, 0.8, Math.hypot(x2 - x1, z2 - z1), 0x2563eb, 0, 0, 0, 10); p.rotation.z = Math.PI / 2; p.rotation.y = -Math.atan2(z2 - z1, x2 - x1); p.position.set((x1 + x2) / 2, 1.4, (z1 + z2) / 2); };
    pipa(-96, 0, -78, 0); pipa(-62, 0, -55, 0); pipa(-45, 0, -31, 0); pipa(-5, 0, 7, 0); pipa(45, 0, 53, 0); pipa(71, 0, 79, 0);
    for (let i = 0; i < 40; i++) pohon(S, rand(-120, 140), Math.random() < 0.5 ? rand(-110, -55) : rand(50, 110), 1);
    label(v, "Intake", -96, 7, 0, () => (W.intake ? fmt(rand(118, 122)) + " L/s" : { t: "OFF", off: true }));
    label(v, "Koagulasi", -70, 6, 0, () => (W.dosing ? "PAC 28 mg/L" : { t: "Dosing OFF", off: true }));
    label(v, "Flokulasi", -50, 6, 0, () => (W.mixer ? "G 45 s⁻¹" : { t: "OFF", off: true }));
    label(v, "Sedimentasi", -18, 7, 0, () => fmt(rand(4, 5), 1) + " NTU");
    label(v, "Filtrasi", 23, 6, 0, () => (W.backwash ? { t: "Backwash", off: true } : fmt(rand(0.3, 0.5), 2) + " NTU"));
    label(v, "Reservoir", 62, 14, 0, () => fmt(W.level) + " %");
    label(v, "Pompa Distribusi", 85, 8, 0, () => (W.distribusi ? "4,2 bar" : { t: "OFF", off: true }));
    label(v, "Laboratorium", 0, 9, -38, () => "pH " + fmt(7.1, 1));
    v.preset = { Overview: [1.0, 0.95, 180, [0, 0, 0]], Intake: [2.4, 0.9, 60, [-96, 0, 0]], Koagulasi: [1.4, 0.8, 70, [-60, 0, 0]], Sedimentasi: [1.2, 0.85, 80, [-18, 0, 0]], Filtrasi: [1.0, 0.85, 70, [23, 0, 0]], Reservoir: [0.6, 0.9, 70, [70, 0, 0]] };
    v.orbit.ke(v.preset.Overview);
    const renderKontrol = () => {
      v.el.querySelectorAll("[data-tg]").forEach((e) => { const on = W[e.dataset.tg]; e.textContent = on ? "ON" : "OFF"; e.classList.toggle("off", !on); });
      v.el.querySelectorAll("[data-sw]").forEach((b) => { const on = W[b.dataset.sw]; b.textContent = on ? "■ Stop" : "▶ Start"; b.className = "btn sm " + (on ? "red" : ""); });
    };
    v.el.querySelectorAll("[data-sw]").forEach((b) => (b.onclick = () => { W[b.dataset.sw] = !W[b.dataset.sw]; renderKontrol(); }));
    renderKontrol();
    v.updaters.push((t) => {
      lengan.forEach((g) => (g.rotation.y = t / 4000));
      mixer.forEach((m, i) => (m.rotation.y = W.mixer ? t / (300 + i * 80) : m.rotation.y));
      filter.forEach((f) => f.material.color.set(W.backwash ? (Math.sin(t / 200) > 0 ? 0x8b6b3d : 0x3b82f6) : 0x3b82f6));
    });
    v.detik = () => {
      renderKontrol();
      W.level = Math.max(10, Math.min(98, W.level + (W.intake ? 0.15 : 0) - (W.distribusi ? 0.12 : 0)));
      const set = (k, t) => (v.el.querySelector(`[data-k="${k}"]`).textContent = t);
      set("masuk", W.intake ? fmt(rand(118, 122)) + " L/s" : "0 L/s"); set("keluar", W.distribusi ? fmt(rand(112, 116)) + " L/s" : "0 L/s");
      set("ntu", W.dosing ? fmt(rand(0.3, 0.5), 2) + " NTU" : fmt(rand(6, 9), 1) + " NTU"); set("ph", fmt(rand(7.0, 7.2), 2));
      set("klor", fmt(rand(0.4, 0.6), 2) + " mg/L"); set("level", fmt(W.level) + " %");
      set("log", `${jam()} ${W.dosing ? "Kualitas air memenuhi baku mutu" : "⚠ Dosing mati – kekeruhan naik"}`);
    };
    return v;
  }

  /* ======================================================
     MODUL F — SOLAR PLANT 3D (PLTS)
     ====================================================== */
  function scene_solar3d() {
    const P = { inv1: true, inv2: true, inv3: true, inv4: true, tracker: true, awan: false, kwh: 3.42 };
    const unit = [["inv1", "⚡ Inverter 1"], ["inv2", "⚡ Inverter 2"], ["inv3", "⚡ Inverter 3"], ["inv4", "⚡ Inverter 4"], ["tracker", "🧭 Solar Tracker"]];
    const v = kerangka("solar3d", {
      judul: `🌞 Solar Plant 3D – ${CONFIG.namaSingkat} Solar Plant`,
      bar: { t1: CONFIG.namaSingkat.toUpperCase(), t1s: "SOLAR PLANT", t2: "Digital Twin 3D – PLTS 2 MWp", t3: "PV Array · Inverter · Tracker · Gardu · Cuaca" },
      kiri: `${["kw", "mwh", "irr", "tpanel", "pr"].map((k, i) => `<div class="v3-kv"><span>${["Daya PV", "Energi Hari Ini", "Iradiasi", "Suhu Panel", "Performance Ratio"][i]}</span><b data-k="${k}">-</b></div>`).join("")}
        <div data-k="log" class="muted" style="font-size:10.5px;margin-top:6px"></div>`,
      kanan: `<h5>▮ Kontrol PLTS</h5>${unit.map(([k, n]) => `<div class="v3-row"><span>${n}</span><span class="toggle" data-tg="${k}"></span><button class="btn sm" data-sw="${k}"></button></div>`).join("")}`,
      bawah: [
        ...["Overview", "Array A", "Array B", "Inverter", "Gardu"].map((n) => ({ label: n, aksi: (v) => v.orbit.ke(v.preset[n]) })),
        { label: "🔄 Auto-Rotate", aksi: (v, b) => { v.orbit.auto = !v.orbit.auto; b.classList.toggle("active", v.orbit.auto); } },
        { label: "☁️ Simulasi Awan", bahaya: true, aksi: () => { P.awan = !P.awan; toast(P.awan ? "Awan tebal – iradiasi turun" : "Cerah kembali"); } },
      ],
    });
    dunia3D(v, 0xa9d4f5);
    v.langitSiang = 0xa9d4f5;
    const S = v.scene;
    kotak(S, 700, 1, 700, 0x8fbf5f, 0, -1, 0);
    kotak(S, 170, 0.3, 120, 0xb9c29a, 0, -0.2, 0);
    // panel surya: 4 array × 8 baris × 20 panel
    const N = 4 * 8 * 20;
    const panel = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, 0.15, 2), mat(0x1e3a8a, { metalness: 0.6, roughness: 0.25, flatShading: false }), N);
    const kaki = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 4), mat(0x9ca3af), N);
    panel.castShadow = true; S.add(panel, kaki);
    const posPanel = [];
    for (let a = 0; a < 4; a++) for (let r = 0; r < 8; r++) for (let c = 0; c < 20; c++) {
      posPanel.push([(a % 2 ? 8 : -72) + c * 3.4, (a < 2 ? -48 : 8) + r * 5]);
    }
    const dm = new THREE.Object3D();
    posPanel.forEach(([x, z], i) => { dm.position.set(x, 0.8, z); dm.rotation.set(0, 0, 0); dm.updateMatrix(); kaki.setMatrixAt(i, dm.matrix); });
    function aturPanel(sudut) {
      posPanel.forEach(([x, z], i) => { dm.position.set(x, 1.7, z); dm.rotation.set(-0.35, 0, sudut); dm.updateMatrix(); panel.setMatrixAt(i, dm.matrix); });
      panel.instanceMatrix.needsUpdate = true;
    }
    aturPanel(0);
    const inv = [0, 1, 2, 3].map((i) => kotak(S, 3, 3, 2, 0xe5e7eb, -10 + i * 6, 0, -4));
    kotak(S, 10, 6, 8, 0x475569, 74, 0, -2); tabung(S, 1.5, 1.5, 4, 0x94a3b8, 74, 6, -2, 8);
    kotak(S, 170, 2, 0.2, 0x6b7280, 0, 0, -62); kotak(S, 170, 2, 0.2, 0x6b7280, 0, 0, 58);
    const matahari = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
    S.add(matahari);
    const awan = new THREE.Group();
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(10 + Math.random() * 6, 10, 10), new THREE.MeshLambertMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.9 })); m.position.set(i * 12 - 30, Math.random() * 5, Math.random() * 10); awan.add(m); }
    awan.position.set(0, 70, 0); S.add(awan);
    for (let i = 0; i < 50; i++) pohon(S, rand(-150, 150), Math.random() < 0.5 ? rand(-130, -70) : rand(66, 130), 1.1);
    label(v, "Array A", -40, 6, -30, () => (P.inv1 ? fmt(kwArray(), 0) + " kW" : { t: "OFF", off: true }));
    label(v, "Array B", 40, 6, -30, () => (P.inv2 ? fmt(kwArray(), 0) + " kW" : { t: "OFF", off: true }));
    label(v, "Array C", -40, 6, 26, () => (P.inv3 ? fmt(kwArray(), 0) + " kW" : { t: "OFF", off: true }));
    label(v, "Array D", 40, 6, 26, () => (P.inv4 ? fmt(kwArray(), 0) + " kW" : { t: "OFF", off: true }));
    label(v, "Inverter", -1, 5, -4, () => [P.inv1, P.inv2, P.inv3, P.inv4].filter(Boolean).length + "/4 ON");
    label(v, "Gardu 20 kV", 74, 12, -2, () => fmt(kwTotal() / 1000, 2) + " MW");
    const irr = () => (P.awan ? 220 : 880) + rand(-15, 15);
    const kwArray = () => (irr() / 1000) * 500 * (P.tracker ? 1 : 0.86);
    const kwTotal = () => [P.inv1, P.inv2, P.inv3, P.inv4].filter(Boolean).length * kwArray();
    v.preset = { Overview: [1.0, 0.9, 200, [0, 0, 0]], "Array A": [1.2, 0.8, 70, [-40, 0, -30]], "Array B": [0.6, 0.8, 70, [40, 0, -30]], Inverter: [1.5, 0.9, 40, [-1, 0, -4]], Gardu: [0.4, 0.9, 50, [74, 0, -2]] };
    v.orbit.ke(v.preset.Overview);
    const renderKontrol = () => {
      v.el.querySelectorAll("[data-tg]").forEach((e) => { const on = P[e.dataset.tg]; e.textContent = on ? "ON" : "OFF"; e.classList.toggle("off", !on); });
      v.el.querySelectorAll("[data-sw]").forEach((b) => { const on = P[b.dataset.sw]; b.textContent = on ? "■ Stop" : "▶ Start"; b.className = "btn sm " + (on ? "red" : ""); });
      inv.forEach((m, i) => (m.material.emissive = new THREE.Color(P["inv" + (i + 1)] ? 0x14532d : 0x7f1d1d)));
    };
    v.el.querySelectorAll("[data-sw]").forEach((b) => (b.onclick = () => { P[b.dataset.sw] = !P[b.dataset.sw]; renderKontrol(); }));
    renderKontrol();
    let frame = 0;
    v.updaters.push((t) => {
      const sudut = Math.sin(t / 20000) * 0.9;
      matahari.position.set(Math.sin(sudut) * 200, Math.cos(sudut) * 170, -120);
      v.sun.position.copy(matahari.position);
      v.sun.intensity = P.awan ? 0.3 : 0.75;
      awan.position.x = ((t / 80) % 400) - 200; awan.visible = P.awan;
      if (frame++ % 10 === 0) aturPanel(P.tracker ? -sudut * 0.8 : 0);
    });
    v.detik = () => {
      renderKontrol();
      const kw = kwTotal(); P.kwh += kw / 3600 / 1000;
      const set = (k, t) => (v.el.querySelector(`[data-k="${k}"]`).textContent = t);
      set("kw", fmt(kw) + " kW"); set("mwh", fmt(P.kwh, 2) + " MWh"); set("irr", fmt(irr()) + " W/m²");
      set("tpanel", fmt(P.awan ? 34 : 47 + rand(-0.5, 0.5), 1) + " °C"); set("pr", fmt(P.tracker ? 82.4 : 78.1, 1) + " %");
      set("log", `${jam()} ${P.awan ? "⚠ Iradiasi rendah – produksi turun" : "Produksi optimal"}`);
    };
    return v;
  }

  const pembuat = { twin3d: scene_twin3d, palm3d: scene_palm3d, power3d: scene_power3d, water3d: scene_water3d, solar3d: scene_solar3d };

  /* ---------- Loop animasi (menggambar ulang ±60x per detik) ---------- */
  function loop(t) {
    const v = views[aktif];
    if (v && v.renderer) {
      v.orbit.update();
      v.updaters.forEach((f) => f(t));
      v.renderer.render(v.scene, v.camera);
      posisiLabel(v);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  setInterval(() => {
    const v = views[aktif];
    if (v && v.renderer) { isiLabel(v); if (v.detik) v.detik(); const j = v.el.querySelector("[data-jam]"); if (j) j.textContent = jam().replace(/\./g, ":"); }
  }, 1000);

  return {
    buat(nama) {
      if (typeof THREE === "undefined") {
        document.getElementById("mod-" + nama).innerHTML = `<div class="panel"><div class="panel-title">Modul 3D</div><p class="muted">Three.js belum termuat. Periksa koneksi internet, lalu muat ulang halaman (F5).</p></div>`;
        return;
      }
      try { views[nama] = pembuat[nama](); }
      catch (e) { console.error(e); toast("Gagal membuat 3D: " + e.message); }
    },
    aktifkan(nama) { aktif = nama; },
  };
})();
