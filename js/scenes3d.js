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
    const KAP_TANGKI = 560;                                                   // kapasitas tiap tangki CPO (ton, simulasi)
    const P = { tbs: 46, anomali: 1, pilih: 37, lapis: "pH", lora: true, tangki: [78, 64, 52, 35], timbang: "Siap", muat: "Menunggu truk", tara: 0, isi: 0 };
    const v = kerangka("palm3d", {
      judul: `🌴 ${CONFIG.namaSingkat} Palm Oil Monitoring – Grow Palm 3D (100 Ha)`,
      bar: { t1: "🌴 " + CONFIG.namaSingkat.toUpperCase(), t1s: "Palm Oil Monitoring", t2: `${CONFIG.namaSingkat} Palm Oil Monitoring`, t3: "Smart Plantation 100 Ha · LoRa IoT · PKS · Jembatan Timbang · Tangki CPO", status: "Live" },
      kiri: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
          <div class="v3-kv" style="display:block"><span class="muted">Node LoRa online</span><br><b data-k="lora">12/12</b></div><div class="v3-kv" style="display:block"><span class="muted">Anomali CCTV AI</span><br><b data-k="anom">1</b></div>
          <div class="v3-kv" style="display:block"><span class="muted">TBS masuk PKS</span><br><b data-k="tbs">0 t</b></div><div class="v3-kv" style="display:block"><span class="muted">Stok CPO</span><br><b data-k="cpo">0 t</b></div></div>
        <h5 style="margin-top:6px">LAYER SENSOR (HEATMAP / HEKTAR)</h5>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${Object.keys(lapisan).map((k) => `<button class="btn sm" data-lap="${k}">${k}</button>`).join("")}</div>
        <div data-k="info" style="margin-top:8px"></div>`,
      kanan: `<h5>ALUR HULU → HILIR</h5><div data-k="alur"></div><div data-k="plog" style="font-size:10.5px;margin-top:6px"></div>`,
      bawah: [
        { label: "🌐 Overview", aksi: (v) => v.orbit.ke(v.preset.Overview) }, { label: "🌴 Kebun", aksi: (v) => v.orbit.ke(v.preset.Kebun) },
        { label: "🏭 PKS", aksi: (v) => v.orbit.ke(v.preset.PKS) }, { label: "⚖️ Jembatan Timbang", aksi: (v) => v.orbit.ke(v.preset.Timbang) },
        { label: "🛢️ Tangki CPO", aksi: (v) => v.orbit.ke(v.preset.Tangki) },
        { label: "📡 LoRa", aksi: (v, b) => { P.lora = !P.lora; b.classList.toggle("active", P.lora); links.forEach((l) => l.setTampil(P.lora)); lblNode.forEach((L) => (L.el.style.visibility = P.lora ? "" : "hidden")); if (P.lora) v.orbit.ke(v.preset.LoRa); } },
        { label: "🏢 Head Office", aksi: (v) => v.orbit.ke(v.preset.HO) },
        { label: "🔄 Auto-Rotate", aksi: (v, b) => { v.orbit.auto = !v.orbit.auto; b.classList.toggle("active", v.orbit.auto); } },
        { label: "🔥 Simulasi Asap (CCTV AI)", bahaya: true, aksi: () => { P.pilih = Math.floor(Math.random() * 100); P.anomali++; toast("CCTV AI: indikasi asap di hektar " + namaPetak(P.pilih)); tandai(); } },
      ],
    });
    dunia3D(v, 0x9fd3f2);
    v.langitSiang = 0x9fd3f2;
    const S = v.scene;

    // ---------- Tanah, blok kebun 100 Ha, sungai ----------
    kotak(S, 700, 1, 700, 0x6aa84f, 0, -1, 0);
    kotak(S, 104, 0.4, 104, 0xb08d57, 0, -0.2, 0);                           // jalan tanah antar blok
    kotak(S, 18, 0.6, 400, 0x2f80c7, 72, -0.4, 0);                            // sungai
    const namaPetak = (i) => `${baris[Math.floor(i / 10)]}${(i % 10) + 1}`;
    const petak = [];
    for (let i = 0; i < 100; i++) {
      const x = -45 + (i % 10) * 10, z = -45 + Math.floor(i / 10) * 10;
      petak.push(kotak(S, 9.2, 0.3, 9.2, 0x4f8f2f, x, 0, z));                // 1 petak = 1 hektar (warna = heatmap)
    }

    // ---------- 1. Pohon kelapa sawit + tandan buah (js/sawit3d.js) ----------
    const titikPohon = [];
    for (let i = 0; i < 100; i++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      titikPohon.push({ x: -48 + (i % 10) * 10 + a * 3 + (b % 2) * 0.8 + rand(-0.3, 0.3), z: -48 + Math.floor(i / 10) * 10 + b * 3 + rand(-0.3, 0.3) });
    }
    Sawit3D.kebun(S, titikPohon);

    // ---------- 2. LoRa: menara gateway di tengah kebun + 12 titik sensor ----------
    const gateway = Sawit3D.menaraLoRa(S, 0, 0, 22);
    const posNode = [[-40, -40], [-10, -40], [20, -40], [40, -10], [-30, -20], [10, -20], [-40, 10], [-20, 20], [20, 10], [40, 30], [-10, 40], [20, 40]];
    const nodes = posNode.map(([x, z], i) => ({ ...Sawit3D.nodeLoRa(S, x, z), id: "LN-" + String(i + 1).padStart(2, "0"), suhu: 27 + rand(-1.5, 1.5), rh: 72 + rand(-8, 8), fase: i * 0.55 }));
    const links = nodes.map((n) => Sawit3D.linkLoRa(S, n.puncak, gateway.puncak));

    // ---------- Jalan raya + jembatan sungai ----------
    kotak(S, 440, 0.12, 5.4, 0x374151, 0, 0, 60);
    for (let x = -215; x < 215; x += 6) kotak(S, 2.5, 0.14, 0.15, 0xffffff, x, 0, 60);                 // marka tengah
    [57.45, 62.55].forEach((z) => kotak(S, 440, 0.14, 0.12, 0xfacc15, 0, 0, z));                       // marka tepi
    kotak(S, 22, 0.3, 6.4, 0x6b7280, 72, 0.1, 60);                                                     // jembatan sungai
    [56.9, 63.1].forEach((z) => kotak(S, 22, 0.9, 0.2, 0xcbd5e1, 72, 0.4, z));
    // Jalan akses pabrik (2 lajur) dan jalan dalam pabrik
    kotak(S, 5.4, 0.12, 33, 0x3f4652, -41, 0.01, 78.5);
    kotak(S, 88, 0.12, 5.4, 0x3f4652, 0.2, 0.01, 92);
    tabung(S, 4.2, 4.2, 0.12, 0x3f4652, 44.2, 0.01, 92, 28);                                         // putaran balik truk

    // ---------- 4. Pabrik Kelapa Sawit (sortasi, sterilizer, press, boiler, kernel, POME) ----------
    const pks = Sawit3D.pks(S);

    // ---------- 6. Tangki timbun CPO (4 unit) + tanggul + loading ----------
    const tangki = [-2, 10, 22, 34].map((x, i) => Sawit3D.tangkiCPO(S, x, 78, "CPO-" + (i + 1)));
    [[16, 71.5, 50, 0.4], [16, 84.5, 50, 0.4]].forEach(([x, z, L, d]) => kotak(S, L, 1, d, 0xb9bdc1, x, 0, z));
    [[-9, 78], [41, 78]].forEach(([x, z]) => kotak(S, 0.4, 1, 13, 0xb9bdc1, x, 0, z));
    // Gantry pengisian (loading arm) di tepi jalan
    [[23.6, 87.4], [28.4, 87.4]].forEach(([x, z]) => kotak(S, 0.3, 5, 0.3, 0x475569, x, 0, z));
    kotak(S, 5.4, 0.3, 2.2, 0x475569, 26, 5, 88.2); kotak(S, 0.25, 0.25, 3.4, 0xeab308, 26, 5.3, 89.6);
    const pipaIsi = kotak(S, 0.25, 2.4, 0.25, 0xeab308, 26, 2.9, 90.7);
    kotak(S, 0.4, 0.4, 7.5, 0x94a3b8, 22, 0.6, 83.3);                                                  // pipa dari tangki CPO-3

    // ---------- 5. Jembatan timbang (lajur masuk x=-42,3, keluar x=-39,7) ----------
    const wb = Sawit3D.jembatanTimbang(S, -42.3, -39.7, 78);

    // ---------- Head office ----------
    const ho = Model3D.kantor({ lebar: 12, dalam: 9, tinggi: 15, nama: CONFIG.namaSingkat }); ho.position.set(-58, 0, 76); S.add(ho);
    kotak(S, 14, 0.1, 6, 0x374151, -58, 0.02, 84);

    // ---------- 3. Truk tangki: lalu lintas jalan raya + truk yang menimbang & mengisi CPO ----------
    const V3 = (x, z, y = 0.12) => new THREE.Vector3(x, y, z);
    const varian = [{ jenis: "tangki", warnaKabin: 0xdc2626 }, { jenis: "tangki", warnaKabin: 0x1d4ed8 }, { jenis: "tangki", warnaKabin: 0xf8fafc }, { jenis: "tangki", warnaKabin: 0x15803d }];
    const lalin = varian.map((o, i) => {
      const t = Model3D.truk(o); t.scale.setScalar(0.4); S.add(t);
      const timur = i % 2 === 0;
      const r = Sawit3D.rute(t, timur ? [V3(-215, 58.7), V3(215, 58.7)] : [V3(215, 61.3), V3(-215, 61.3)], 9 + i);
      r.st.s = (i * 110) % 430;
      return r;
    });
    const trukPKS = Model3D.truk({ jenis: "tangki", warnaKabin: 0xc8913f }); trukPKS.scale.setScalar(0.4); S.add(trukPKS);
    const jalurPKS = [V3(-215, 58.7), V3(-47, 58.7), V3(-42.3, 64.5), V3(-42.3, 78), V3(-42.3, 87.5), V3(-38.5, 90.7), V3(26, 90.7), V3(40, 90.7), V3(44.8, 92), V3(40, 93.3),
      V3(-35.5, 93.3), V3(-39.7, 89), V3(-39.7, 78), V3(-39.7, 64.5), V3(-44, 61.3), V3(-215, 61.3)];
    const rutePKS = Sawit3D.rute(trukPKS, jalurPKS, 7, { 3: 6, 6: 8, 12: 6 });     // berhenti: timbang tara 6 s, isi CPO 8 s, timbang bruto 6 s
    rutePKS.st.s = 150;
    let fase = { kode: -1, mulai: 0 };
    const kg = (n) => fmt(Math.round(n / 10) * 10) + " kg";
    function saatBerhenti(i, jenis) {
      fase = { kode: jenis === "berhenti" ? i : -1, mulai: performance.now() };
      if (jenis === "berhenti" && i === 3) { P.tara = 14200 + Math.round(rand(0, 400)); P.timbang = "Menimbang tara"; }
      if (jenis === "berhenti" && i === 6) { P.isi = 30000 + Math.round(rand(-800, 800)); P.muat = "Mengisi CPO…"; }
      if (jenis === "berhenti" && i === 12) P.timbang = "Menimbang bruto";
      if (jenis === "jalan" && i === 3) { P.timbang = "Tara " + kg(P.tara); setTimeout(() => wb.tulis(0, "0 kg", "SIAP"), 6000); }
      if (jenis === "jalan" && i === 6) { P.muat = "Selesai · " + fmt(P.isi / 1000, 1) + " t"; P.tangki[2] = Math.max(8, P.tangki[2] - (P.isi / 1000 / KAP_TANGKI) * 100); }
      if (jenis === "jalan" && i === 12) { P.timbang = "Bruto " + kg(P.tara + P.isi); setTimeout(() => { wb.tulis(1, "0 kg", "SIAP"); P.muat = "Menunggu truk"; }, 6000); }
    }

    // ---------- Penanda hektar anomali ----------
    const cincin = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.5, 32), new THREE.MeshBasicMaterial({ color: 0xff3b30, side: THREE.DoubleSide, transparent: true }));
    cincin.rotation.x = -Math.PI / 2; S.add(cincin);

    // ---------- Label ----------
    label(v, "📡 LoRa Gateway", 0, 27.5, 0, () => `${nodes.length} node · −97 dBm`);
    const lblNode = nodes.map((n) => label(v, n.id, n.puncak.x, n.puncak.y + 1, n.puncak.z, () => `${fmt(n.suhu, 1)}°C · ${fmt(n.rh)}%RH`));
    label(v, "⚖️ Jembatan Timbang", -41, 9.5, 78, () => P.timbang);
    label(v, "Loading Ramp & Sortasi TBS", -20, 10, 106, () => `TBS ${fmt(P.tbs, 1)} t · Grade A 91%`);
    label(v, "Sterilizer", 6, 8, 106, () => "3 unit · " + fmt(2.8 + rand(-0.1, 0.1), 1) + " bar");
    label(v, "Thresher & Press", 24, 18, 108, () => "Olah " + fmt(45 + rand(-1, 1), 1) + " t TBS/jam");
    label(v, "Boiler", 43, 15, 110, () => "Uap " + fmt(20 + rand(-0.5, 0.5), 1) + " t/jam");
    label(v, "Cerobong", pks.cerobong.x, pks.cerobong.y + 3, pks.cerobong.z, () => "Opasitas " + fmt(18 + rand(-2, 2)) + " %");
    label(v, "Kernel Plant", 4, 13, 124, () => "Kernel " + fmt(14 + rand(-0.3, 0.3), 1) + " t");
    tangki.forEach((tk, i) => label(v, "Tangki CPO-" + (i + 1), [-2, 10, 22, 34][i], tk.puncakY + 2, 78, () => `${fmt(P.tangki[i], 1)} % · ${fmt((P.tangki[i] / 100) * KAP_TANGKI)} t`));
    label(v, "Loading CPO", 26, 7, 88, () => P.muat);
    label(v, "Head Office", -58, 17, 76, () => "Control Room");
    const lblAnom = label(v, "⚠ Anomali", 0, 8, 0, () => ({ t: namaPetak(P.pilih), off: true }));

    function tandai() {
      const x = -45 + (P.pilih % 10) * 10, z = -45 + Math.floor(P.pilih / 10) * 10;
      cincin.position.set(x, 0.6, z); lblAnom.pos.set(x, 9, z); cincin.visible = true; lblAnom.el.style.visibility = ""; infoPetak();
    }
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
    v.el.querySelectorAll("[data-bot]").forEach((b) => { if (b.textContent.includes("LoRa")) b.classList.add("active"); });
    const ray = new THREE.Raycaster();
    v.renderer.domElement.addEventListener("dblclick", (e) => {
      const r = v.renderer.domElement.getBoundingClientRect();
      ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, v.camera);
      const hit = ray.intersectObjects(petak)[0];
      if (hit) { P.pilih = petak.indexOf(hit.object); tandai(); }
    });
    warnai(); tandai();

    v.preset = {
      Overview: [1.25, 0.9, 225, [0, 0, 45]], Kebun: [3.6, 1.22, 24, [-42, 3, -46]], PKS: [1.45, 0.88, 110, [18, 4, 108]],
      Timbang: [0.55, 0.95, 30, [-41, 0, 80]], Tangki: [1.3, 0.9, 62, [16, 4, 82]], LoRa: [1.0, 0.8, 80, [0, 8, 0]], HO: [1.9, 0.9, 48, [-58, 5, 76]],
    };
    v.orbit.ke(v.preset.Overview);

    // ---------- Animasi tiap frame ----------
    let tLalu = 0;
    v.updaters.push((t) => {
      const dt = Math.min(0.1, (t - tLalu) / 1000); tLalu = t;
      const dtk = t / 1000;
      // LoRa: tiap node mengirim (Tx) setiap 7 detik, lalu gateway membalas (Rx)
      nodes.forEach((n, i) => {
        const u = (dtk + n.fase) % 7, arah = u < 1.8 ? "tx" : u < 2.8 ? "rx" : "idle";
        if (P.lora) links[i].update(dtk, arah);
        n.led.material.emissive.set(arah === "tx" ? 0x22d3ee : arah === "rx" ? 0xfacc15 : 0x22c55e);
        n.led.material.color.copy(n.led.material.emissive);
      });
      gateway.lampu.material.emissiveIntensity = Math.sin(t / 350) > 0 ? 1 : 0.1;
      pks.anim.forEach((f) => f(t));
      lalin.forEach((r) => r.update(dt));
      rutePKS.update(dt, saatBerhenti);
      // Layar timbangan: angka bergulir lalu stabil
      const lama = (performance.now() - fase.mulai) / 1000;
      if (fase.kode === 3) wb.tulis(0, lama < 2 ? kg(P.tara * (0.6 + Math.random() * 0.4)) : kg(P.tara), lama < 2 ? "MENIMBANG…" : "TARA ✓", lama < 2 ? "#facc15" : "#22c55e");
      if (fase.kode === 12) wb.tulis(1, lama < 2 ? kg((P.tara + P.isi) * (0.7 + Math.random() * 0.3)) : kg(P.tara + P.isi), lama < 2 ? "MENIMBANG…" : `BRUTO ✓ NETO ${fmt(P.isi)}`, lama < 2 ? "#facc15" : "#22c55e");
      // Pipa pengisian turun saat truk diisi
      pipaIsi.scale.y = fase.kode === 6 ? 1.6 : 1;
      // Palang pintu naik saat truk lewat
      [[wb.palang[0], -42.3, 83.6], [wb.palang[1], -39.7, 72.4]].forEach(([p, x, z]) => {
        const dekat = Math.hypot(trukPKS.position.x - x, trukPKS.position.z - z) < 7 && rutePKS.st.tunggu <= 0.5;
        p.rotation.z += ((dekat ? (x < -41 ? -1.3 : 1.3) : 0) - p.rotation.z) * Math.min(1, dt * 4);
      });
      cincin.material.opacity = 0.5 + Math.sin(t / 200) * 0.4;
    });

    v.detik = () => {
      P.tbs += Math.random() < 0.4 ? 0.1 : 0;
      P.tangki = P.tangki.map((l, i) => Math.min(96, l + (i === 0 || i === 1 ? 0.02 : 0)));      // produksi CPO mengisi tangki 1 & 2
      nodes.forEach((n) => { n.suhu += rand(-0.05, 0.05); n.rh += rand(-0.3, 0.3); });
      const stok = P.tangki.reduce((a, l) => a + (l / 100) * KAP_TANGKI, 0);
      const set = (k, h) => (v.el.querySelector(`[data-k="${k}"]`).innerHTML = h);
      set("anom", P.anomali); set("tbs", fmt(P.tbs, 1) + " t"); set("cpo", fmt(stok) + " t"); set("lora", nodes.length + "/" + nodes.length);
      set("alur", [["🌴 Panen kebun", `${48 + Math.round(rand(-2, 2))} pekerja`], ["📡 LoRa sensor", `${nodes.length} node · Tx/Rx OK`], ["🚚 TBS masuk ramp", `${fmt(P.tbs, 1)} t`],
        ["🏭 Olah PKS", "45 t TBS/jam"], ["🛢️ Stok CPO (4 tangki)", `${fmt(stok)} t`], ["⚖️ Jembatan timbang", P.timbang], ["🚛 Loading CPO", P.muat]]
        .map((r) => `<div class="v3-row"><span class="muted">${r[0]}</span><b>${r[1]}</b></div>`).join(""));
      set("plog", `<span class="muted">${jam()} ${P.timbang} · ${P.muat}</span><br><span style="color:#f87171">${jam()} ⚠ CCTV AI ${namaPetak(P.pilih)} Asap / indikasi kebakaran</span>`);
    };
    return v;
  }


  /* ======================================================
     MODUL D — POWER PLANT 3D
     Sekarang ada di file sendiri: js/pltu-scene.js (+ model di js/pltu3d.js)
     ====================================================== */

  /* ======================================================
     MODUL E — WATER TREATMENT 3D
     Sekarang ada di file sendiri: js/wtp-scene.js (+ model di js/wtp3d.js)
     File itu mendaftarkan diri lewat Scene3D.daftar("water3d", ...).
     ====================================================== */

  /* ======================================================
     MODUL F — SOLAR PLANT 3D
     Sekarang memakai aplikasi lengkap di folder Green_Power_Plant/
     (dibuka lewat iframe oleh js/app.js), jadi tidak dibuat di sini.
     ====================================================== */

  const pembuat = { twin3d: scene_twin3d, palm3d: scene_palm3d };

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
      if (!pembuat[nama]) { toast("Modul 3D '" + nama + "' belum termuat – periksa tag <script> di index.html"); return; }
      try { views[nama] = pembuat[nama](); }
      catch (e) { console.error(e); toast("Gagal membuat 3D: " + e.message); }
    },
    aktifkan(nama) { aktif = nama; },
    // Alat bantu untuk modul 3D yang ditulis di file terpisah (mis. js/wtp-scene.js)
    alat: { kerangka, dunia3D, label, setMalam, kotak, tabung, pohon, mat },
    daftar(nama, fungsi) { pembuat[nama] = fungsi; },
  };
})();
