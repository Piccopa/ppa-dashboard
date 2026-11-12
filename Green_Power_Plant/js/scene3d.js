/* =========================================================
   SCENE3D.JS — KAMPUS HIJAU 3D (Three.js r128)
   PV field · inverter station · BESS · genset + tangki solar ·
   gardu induk 20 kV · pabrik · kantor EMS · perumahan karyawan ·
   taman + danau · ribuan pohon rindang · aliran daya animasi.
   ========================================================= */
const Kampus3D = (() => {
  let renderer, scene, camera, wadah, lapisLabel, sun, hemi, langit, siap = false, aktif = false;
  const klikables = [], labels = [], anim = [], ref = { lampuJendela: [], lampuJalan: [] };
  let onPilih = () => {};
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const acak = (a, b) => a + Math.random() * (b - a);

  /* ---------------- MATERIAL & BENTUK DASAR ---------------- */
  const cacheM = {};
  function M(warna, o = {}) {
    const k = warna + JSON.stringify(o);
    if (!cacheM[k]) cacheM[k] = new THREE.MeshStandardMaterial({ color: warna, roughness: 0.8, metalness: 0.05, ...o });
    return cacheM[k];
  }
  const asM = (m) => (m && m.isMaterial ? m : M(m));
  function kotak(p, w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), asM(m)); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; }
  function tabung(p, rt, rb, h, m, x, y, z, seg = 20) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), asM(m)); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; }
  function kanvas(w, h, gambar) { const c = document.createElement("canvas"); c.width = w; c.height = h; gambar(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
  function papan(p, teks, x, y, z, rotY = 0, lebar = 6, warna = "#166534") {
    const tex = kanvas(512, 96, (c, w, h) => { c.fillStyle = warna; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.font = "bold 46px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(teks, w / 2, h / 2 + 2); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lebar, lebar * 0.1875), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z); m.rotation.y = rotY; p.add(m); return m;
  }
  function daftarKlik(obj, kunci) { obj.traverse((o) => { if (o.isMesh) { o.userData.equip = kunci; klikables.push(o); } }); }
  function lampu(p, x, y, z, r = 0.45) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e })); m.position.set(x, y, z); p.add(m); return m; }
  function label(judul, pos, fn, kunci) {
    const el = document.createElement("div"); el.className = "lbl3d"; el.innerHTML = `<div class="lbl-j">${judul}</div><div class="lbl-v"></div>`;
    el.onclick = () => kunci && onPilih(kunci);
    const L = { el, pos, fn, v: el.querySelector(".lbl-v") }; labels.push(L); return L;
  }

  /* ---------------- TEKSTUR ---------------- */
  const texRumput = () => kanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#5a9442"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 3500; i++) { c.fillStyle = `hsl(${92 + Math.random() * 22},${38 + Math.random() * 20}%,${24 + Math.random() * 16}%)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  const texPanel = () => kanvas(256, 128, (c, w, h) => {
    c.fillStyle = "#0b2a5b"; c.fillRect(0, 0, w, h);
    for (let x = 0; x < 12; x++) for (let y = 0; y < 6; y++) { c.fillStyle = (x + y) % 2 ? "#14397a" : "#123370"; c.fillRect(4 + x * 20.6, 4 + y * 20, 19, 18.5); }
    c.strokeStyle = "#c0c7d0"; c.lineWidth = 4; c.strokeRect(1, 1, w - 2, h - 2);
  });
  const texJendela = (dasar, kaca, baris, kolom) => kanvas(256, 256, (c, w, h) => {
    c.fillStyle = dasar; c.fillRect(0, 0, w, h);
    for (let y = 0; y < baris; y++) for (let x = 0; x < kolom; x++) { c.fillStyle = kaca; c.fillRect(8 + x * (w - 8) / kolom, 10 + y * (h - 10) / baris, (w - 8) / kolom - 8, (h - 10) / baris - 14); }
  });
  const texLampuMalam = (baris, kolom) => kanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    for (let y = 0; y < baris; y++) for (let x = 0; x < kolom; x++) if (Math.random() < 0.7) { c.fillStyle = "#ffd88a"; c.fillRect(8 + x * (w - 8) / kolom, 10 + y * (h - 10) / baris, (w - 8) / kolom - 8, (h - 10) / baris - 14); }
  });

  /* ======================================================
     MEMBANGUN DUNIA
     ====================================================== */
  function bangun() {
    scene = new THREE.Scene();
    langit = new THREE.Color(0x9fd2f5);
    scene.background = langit.clone();
    scene.fog = new THREE.Fog(0xb9dcf2, 650, 1700);
    camera = new THREE.PerspectiveCamera(42, 1, 1, 4000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    hemi = new THREE.HemisphereLight(0xeaf6ff, 0x4f6b3a, 0.72); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff4dd, 0.85); sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 1600 });
    sun.shadow.bias = -0.0004;
    scene.add(sun, sun.target);

    // ---------- tanah & bukit ----------
    const tr = texRumput(); tr.wrapS = tr.wrapT = THREE.RepeatWrapping; tr.repeat.set(90, 90);
    const tanah = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: tr, roughness: 1 }));
    tanah.rotation.x = -Math.PI / 2; tanah.receiveShadow = true; scene.add(tanah);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, r = acak(950, 1300);
      const b = new THREE.Mesh(new THREE.SphereGeometry(acak(160, 280), 24, 12), M(i % 2 ? 0x5b8f45 : 0x4f8540, { flatShading: true }));
      b.scale.y = acak(0.18, 0.32); b.position.set(Math.cos(a) * r, -10, Math.sin(a) * r); scene.add(b);
    }

    jalan(); pvField(); stasiunCuaca(); gardu(); bess(); diesel(); kantor(); pabrik(); perumahan(); taman(); pohonPohon(); aliranDaya(); awan(); mobil();
    siap = true;
  }

  /* ---------------- JALAN & TROTOAR ---------------- */
  function jalan() {
    const aspal = M(0x3d434b, { roughness: 0.95 }), trotoar = M(0xd6d3c9), garis = M(0xf8fafc);
    const ruas = [[-330, -62, 330, -62], [0, -62, 0, 300], [-330, 118, 330, 118], [-330, -62, -330, 300], [330, -62, 330, 300], [-90, 118, -90, 300], [210, -62, 210, 118]];
    ruas.forEach(([x1, z1, x2, z2]) => {
      const hor = z1 === z2, L = hor ? Math.abs(x2 - x1) : Math.abs(z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
      kotak(scene, hor ? L + 9 : 9, 0.08, hor ? 9 : L + 9, aspal, cx, 0, cz).castShadow = false;
      kotak(scene, hor ? L + 13 : 2, 0.12, hor ? 2 : L + 13, trotoar, cx + (hor ? 0 : 5.5), 0, cz + (hor ? 5.5 : 0)).castShadow = false;
      kotak(scene, hor ? L + 13 : 2, 0.12, hor ? 2 : L + 13, trotoar, cx - (hor ? 0 : 5.5), 0, cz - (hor ? 5.5 : 0)).castShadow = false;
      for (let s = -L / 2; s < L / 2; s += 10) kotak(scene, hor ? 4 : 0.25, 0.1, hor ? 0.25 : 4, garis, hor ? cx + s : cx, 0, hor ? cz : cz + s).castShadow = false;
      // lampu jalan
      for (let s = -L / 2 + 10; s < L / 2; s += 40) {
        const x = hor ? cx + s : cx + 6.5, z = hor ? cz + 6.5 : cz + s;
        tabung(scene, 0.15, 0.2, 8, M(0x475569), x, 0, z, 6);
        const kepala = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0x777777 }));
        kepala.position.set(x, 8.2, z); scene.add(kepala); ref.lampuJalan.push(kepala.material);
      }
    });
    // gerbang & papan nama kampus
    kotak(scene, 1.2, 7, 1.2, M(0x14532d), -12, 0, 300); kotak(scene, 1.2, 7, 1.2, M(0x14532d), 12, 0, 300); kotak(scene, 25, 1.6, 1.4, M(0x14532d), 0, 7, 300);
    papan(scene, "GREEN ENERGY CAMPUS", 0, 7.8, 300.75, 0, 22, "#15803d");
  }

  /* ---------------- PV FIELD (6 ARRAY) ---------------- */
  const ARRAY = [[-190, -265], [0, -265], [190, -265], [-190, -150], [0, -150], [190, -150]];
  function pvField() {
    const nBaris = 7, nMeja = 24, lebarMeja = 4.8, tilt = 0.21;
    const total = ARRAY.length * nBaris * nMeja;
    const geo = new THREE.BoxGeometry(lebarMeja, 0.12, 2.6);
    const matPanel = new THREE.MeshStandardMaterial({ map: texPanel(), roughness: 0.28, metalness: 0.45, color: 0xffffff });
    const panel = new THREE.InstancedMesh(geo, matPanel, total);
    const kaki = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 1, 0.15), M(0x9ca3af, { metalness: 0.4 }), total * 2);
    panel.castShadow = true; panel.receiveShadow = true; kaki.castShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler(tilt, 0, 0);
    let k = 0, kk = 0;
    ARRAY.forEach(([cx, cz], ai) => {
      for (let b = 0; b < nBaris; b++) for (let j = 0; j < nMeja; j++) {
        const x = cx - (nMeja * lebarMeja) / 2 + j * lebarMeja + lebarMeja / 2, z = cz - 33 + b * 11;
        q.setFromEuler(e); m.compose(V3(x, 1.75, z), q, s); panel.setMatrixAt(k++, m);
        [[-1.0, 1.25], [1.0, 2.25]].forEach(([dz, h]) => { m.compose(V3(x, h / 2, z + dz), new THREE.Quaternion(), V3(1, h, 1)); kaki.setMatrixAt(kk++, m); });
      }
      // kotak combiner di ujung tiap baris
      for (let b = 0; b < nBaris; b++) { const cb = kotak(scene, 0.9, 1.2, 0.5, M(0xd1d5db), cx + (nMeja * lebarMeja) / 2 + 2, 0.4, cz - 33 + b * 11); daftarKlik(cb, "COMB-" + (ai + 1)); }
      // area kerikil + pagar rendah
      kotak(scene, nMeja * lebarMeja + 10, 0.05, 86, M(0x8a9a6a, { roughness: 1 }), cx, 0, cz).receiveShadow = true;
      // INVERTER STATION
      const g = new THREE.Group(); g.position.set(cx, 0, cz + 48); scene.add(g);
      kotak(g, 14, 0.5, 6, M(0xbfbfbf), 0, 0, 0);
      kotak(g, 7, 2.9, 2.6, M(0xf1f5f9), -3, 0.5, 0);
      for (let i = 0; i < 6; i++) kotak(g, 0.5, 1.6, 0.05, M(0x94a3b8), -5.6 + i * 1.1, 1.1, 1.33);
      kotak(g, 7.05, 0.35, 2.65, M(0x15803d), -3, 3.05, 0);
      kotak(g, 3, 2.2, 2.2, M(0x6b7280, { metalness: 0.4 }), 3.6, 0.5, 0);           // trafo step-up 0,8/20 kV
      for (let i = 0; i < 5; i++) kotak(g, 0.08, 1.8, 0.9, M(0x7b8590), 2.3 + i * 0.65, 0.7, 1.55);
      papan(g, "INV-0" + (ai + 1), -3, 2.5, 1.33, 0, 3.4, "#166534");
      const l = lampu(g, -0.2, 3.7, 0); ref["lampuINV" + ai] = l;
      daftarKlik(g, "INV-0" + (ai + 1));
      ref["arr" + ai] = { pos: V3(cx, 0, cz), inv: V3(cx, 0, cz + 48) };
      label("PV-A" + (ai + 1), V3(cx, 9, cz - 10), () => { const v = SIM.V.inv[ai]; return `${fmt(v.pac)} kW · ${v.status}`; }, "PV-A" + (ai + 1));
    });
    panel.instanceMatrix.needsUpdate = kaki.instanceMatrix.needsUpdate = true;
    scene.add(panel, kaki);
    panel.userData.equipFn = (id) => "PV-A" + (Math.floor(id / (nBaris * nMeja)) + 1); klikables.push(panel);
    // pagar keliling PV field
    const pagarM = M(0x9ca3af, { metalness: 0.3 });
    [[-300, -318, 300, -318], [-300, -318, -300, -100], [300, -318, 300, -100], [-300, -100, -20, -100], [20, -100, 300, -100]].forEach(([x1, z1, x2, z2]) => {
      const hor = z1 === z2, L = hor ? x2 - x1 : z2 - z1;
      kotak(scene, hor ? L : 0.1, 2, hor ? 0.1 : L, M(0xa3b18a, { transparent: true, opacity: 0.35 }), (x1 + x2) / 2, 0, (z1 + z2) / 2).castShadow = false;
      for (let t = 0; t <= L; t += 8) kotak(scene, 0.15, 2.2, 0.15, pagarM, hor ? x1 + t : x1, 0, hor ? z1 : z1 + t);
    });
  }
  function stasiunCuaca() {
    const g = new THREE.Group(); g.position.set(-30, 0, -95); scene.add(g);
    tabung(g, 0.12, 0.12, 6, M(0x9ca3af, { metalness: 0.5 }), 0, 0, 0, 8);
    kotak(g, 1.2, 0.8, 0.6, M(0xf8fafc), 0, 2, 0.3);
    const pyr = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xe0f2fe, { transparent: true, opacity: 0.8 })); pyr.position.set(0.8, 5.2, 0); g.add(pyr);
    kotak(g, 1.4, 0.1, 0.2, M(0x9ca3af), 0.4, 5.1, 0);
    const ang = new THREE.Group(); ang.position.set(0, 6.2, 0); g.add(ang);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const c = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), M(0x111827)); c.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); ang.add(c); }
    ref.anemo = ang;
    daftarKlik(g, "WEATHER");
    label("Weather Station", V3(-30, 9, -95), () => `${fmt(SIM.V.G)} W/m² · ${fmt(SIM.V.wind, 1)} m/s`, "WEATHER");
  }

  /* ---------------- GARDU INDUK 20 kV (MAIN POWER DISTRIBUTION) ---------------- */
  const BAY = { DG: 32, BESS: 42, PV: 52, RES: 62, FAC: 72, GRID: 84 };
  function gardu() {
    kotak(scene, 72, 0.06, 42, M(0xb6b1a6, { roughness: 1 }), 58, 0, -22);
    const sg = kotak(scene, 40, 6, 8, M(0xe5e7eb), 58, 0, -36); daftarKlik(sg, "SUB");
    kotak(scene, 40.4, 0.6, 8.4, M(0x15803d), 58, 6, -36);
    papan(scene, "MV SWITCHGEAR 20 kV", 58, 4.2, -31.9, 0, 12, "#15803d");
    const busM = M(0xcbd5e1, { metalness: 0.6, roughness: 0.3 });
    [26, 90].forEach((x) => kotak(scene, 0.6, 9, 0.6, M(0x94a3b8), x, 0, -12));
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 64, 8), busM); b.rotation.z = Math.PI / 2; b.position.set(58, 8.4 - i * 0.6, -12 + (i - 1) * 0.8); scene.add(b); }
    for (const k in BAY) {
      const x = BAY[k];
      kotak(scene, 2.2, 0.3, 2, M(0x9ca3af), x, 0, -6);
      kotak(scene, 1.8, 2.4, 1.2, M(0x64748b, { metalness: 0.3 }), x, 0.3, -6);
      for (let i = 0; i < 3; i++) tabung(scene, 0.12, 0.12, 2.4, M(0xa8a29e), x - 0.6 + i * 0.6, 2.7, -6, 8);
      for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.2, 4), busM); c.position.set(x - 0.6 + i * 0.6, 7.2, -9); c.rotation.x = 0.5; scene.add(c); }
      ref["cb" + k] = lampu(scene, x + 1.2, 2.2, -5.3, 0.35);
      papan(scene, "CB-" + k, x, 1.2, -5.38, 0, 2.2, "#334155");
      const kl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.5, 2.4), new THREE.MeshBasicMaterial({ visible: false })); kl.position.set(x, 2.7, -6); scene.add(kl); kl.userData.equip = "CB-" + k; klikables.push(kl);
    }
    // pagar gardu
    pagarKotak(22, 94, -43, -1);
    // menara transmisi ke grid PLN (arah timur)
    const titikMenara = [[110, -20], [180, -20], [260, -20], [345, -20], [440, -20]];
    let sebelum = [V3(88, 9, -13), V3(88, 9, -12), V3(88, 9, -11)];
    ref.kabelGrid = [];
    titikMenara.forEach(([x, z]) => {
      const t = menara(x, z, 26);
      sebelum.forEach((a, i) => ref.kabelGrid.push(kabel(a, t[i], 1.8)));
      sebelum = t;
    });
    daftarKlik(kotak(scene, 3, 0.1, 3, M(0x9ca3af), 110, 0, -20), "GRID");
    label("Main Substation 20 kV", V3(58, 14, -24), () => `${fmt(SIM.V.bus.v / 1000, 2)} kV · ${fmt(SIM.V.bus.f, 2)} Hz`, "SUB");
    label("Utility Grid (PLN)", V3(180, 30, -20), () => { const g = SIM.V.grid; return !g.ok ? "GRID FAILURE" : g.imp > 1 ? `Import ${fmt(g.imp)} kW` : g.exp > 1 ? `Export ${fmt(g.exp)} kW` : "Standby"; }, "GRID");
  }
  function pagarKotak(x1, x2, z1, z2) {
    const m = M(0x94a3b8, { transparent: true, opacity: 0.4 });
    [[x1, z1, x2, z1], [x1, z2, x2, z2], [x1, z1, x1, z2], [x2, z1, x2, z2]].forEach(([a, b, c, d]) => {
      const hor = b === d, L = hor ? Math.abs(c - a) : Math.abs(d - b);
      kotak(scene, hor ? L : 0.1, 2.2, hor ? 0.1 : L, m, (a + c) / 2, 0, (b + d) / 2).castShadow = false;
    });
  }
  function menara(x, z, H) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const m = M(0xb8bec6, { metalness: 0.2 });
    const batang = (a, b, r) => { const d = V3().subVectors(b, a), L = d.length(); const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 4), m); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); g.add(o); };
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => batang(V3(sx * 2.6, 0, sz * 2.6), V3(sx * 0.7, H * 0.75, sz * 0.7), 0.12));
    for (let k = 0; k < 4; k++) { const y0 = (H * 0.75 * k) / 4, y1 = (H * 0.75 * (k + 1)) / 4, w0 = 2.6 - 0.475 * k, w1 = 2.6 - 0.475 * (k + 1); batang(V3(-w0, y0, -w0), V3(w1, y1, -w1), 0.05); batang(V3(-w0, y0, w0), V3(w1, y1, w1), 0.05); }
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => batang(V3(sx * 0.7, H * 0.75, sz * 0.7), V3(sx * 0.25, H, sz * 0.25), 0.08));
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 12), m); arm.position.y = H * 0.78; g.add(arm);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 })); l.position.y = H + 0.4; g.add(l); (ref.lampuMenara = ref.lampuMenara || []).push(l);
    return [-5, 0, 5].map((dz) => V3(x, H * 0.78 - 0.6, z + dz));
  }
  function kabel(a, b, kendur) {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, p = a.clone().lerp(b, t); p.y -= kendur * 4 * t * (1 - t); pts.push(p); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x334155 })));
    return pts;
  }

  /* ---------------- BESS ---------------- */
  function bess() {
    kotak(scene, 62, 0.06, 34, M(0xb6b1a6, { roughness: 1 }), -80, 0, -25);
    pagarKotak(-111, -49, -42, -8);
    const tex = kanvas(512, 128, (c, w, h) => { c.fillStyle = "#f8fafc"; c.fillRect(0, 0, w, h); c.fillStyle = "#0e7490"; c.fillRect(0, h - 26, w, 14); c.fillStyle = "#0f172a"; c.font = "bold 36px Arial"; c.fillText("BESS CONTAINER", 200, 62); for (let i = 0; i < w; i += 18) { c.fillStyle = "rgba(0,0,0,.06)"; c.fillRect(i, 0, 2, h); } });
    ref.bessStrip = [];
    [[-96, -32], [-74, -32], [-96, -18], [-74, -18]].forEach(([x, z], i) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
      kotak(g, 13, 0.4, 3.6, M(0x9ca3af), 0, 0, 0);
      kotak(g, 12.2, 2.9, 2.6, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), 0, 0.4, 0);
      kotak(g, 1.2, 1.6, 0.6, M(0xe5e7eb), 6.7, 0.9, 0);                             // HVAC
      const strip = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.18, 2.66), new THREE.MeshBasicMaterial({ color: 0x22c55e })); strip.position.y = 3.35; g.add(strip); ref.bessStrip.push(strip.material);
      papan(g, "BESS-0" + (i + 1), -3.5, 2.3, 1.32, 0, 3, "#0e7490");
      daftarKlik(g, "BESS");
    });
    const pcs = new THREE.Group(); pcs.position.set(-58, 0, -25); scene.add(pcs);
    kotak(pcs, 6, 0.4, 10, M(0x9ca3af), 0, 0, 0); kotak(pcs, 3, 2.6, 8, M(0xf1f5f9), -1, 0.4, 0); kotak(pcs, 2.2, 2.4, 2.4, M(0x6b7280, { metalness: 0.4 }), 1.8, 0.4, 2.5);
    papan(pcs, "PCS 3 MW", -2.52, 2.2, 0, -Math.PI / 2, 3, "#0e7490");
    daftarKlik(pcs, "BESS");
    label("BESS 8 MWh", V3(-85, 10, -25), () => { const b = SIM.V.bess; return `SOC ${fmt(b.soc, 1)}% · ${b.status === "CHARGING" ? "▼ " + fmt(b.pch) : b.status === "DISCHARGING" ? "▲ " + fmt(b.pdis) : b.status} kW`; }, "BESS");
  }

  /* ---------------- GENSET DIESEL + TANGKI SOLAR ---------------- */
  function diesel() {
    kotak(scene, 80, 0.06, 40, M(0xb6b1a6, { roughness: 1 }), -205, 0, -22);
    const g = new THREE.Group(); g.position.set(-190, 0, -20); scene.add(g);
    const tex = texJendela("#e7e5e4", "#94a3b8", 1, 6);
    kotak(g, 26, 9, 12, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), 0, 0, 0);
    kotak(g, 26.6, 0.8, 12.6, M(0xb45309), 0, 9, 0);
    for (let i = 0; i < 3; i++) kotak(g, 3.6, 7, 0.1, M(0x57534e), -8 + i * 8, 0, 6.05);                // pintu louver
    papan(g, "DIESEL GENERATOR DG-01 · 2000 kVA", 0, 7.6, 6.08, 0, 16, "#b45309");
    [-6, 6].forEach((x) => { tabung(g, 0.6, 0.6, 9, M(0x52525b, { metalness: 0.5 }), x, 9.8, -3, 14); });
    for (let i = 0; i < 2; i++) { const kipas = new THREE.Group(); kipas.position.set(-3 + i * 6, 10.1, 2.5); g.add(kipas); tabung(kipas, 2, 2, 0.4, M(0x334155), 0, -0.2, 0, 20); for (let j = 0; j < 4; j++) { const b = kotak(kipas, 3.4, 0.08, 0.5, M(0x94a3b8), 0, 0.25, 0); b.rotation.y = (j * Math.PI) / 4; } (ref.kipasDG = ref.kipasDG || []).push(kipas); }
    ref.lampuDG = lampu(g, 12.6, 9.6, 6.2);
    daftarKlik(g, "DG");
    ref.asapDG = [-6, 6].map((x) => asap(V3(-190 + x, 19, -23)));
    // tangki solar (HSD) vertikal + indikator level
    const t = new THREE.Group(); t.position.set(-232, 0, -22); scene.add(t);
    kotak(t, 20, 1, 20, M(0xa8a29e), 0, 0, 0); kotak(t, 18, 1.2, 18, M(0xb6b1a6), 0, 0.01, 0);
    const texT = kanvas(512, 256, (c, w, h) => { c.fillStyle = "#f1f5f9"; c.fillRect(0, 0, w, h); c.fillStyle = "#b45309"; c.fillRect(0, 30, w, 16); c.fillStyle = "#0f172a"; c.font = "bold 40px Arial"; c.textAlign = "center"; c.fillText("DIESEL FUEL TK-301", w / 4, 120); c.fillText("50.000 L", w / 4, 170); });
    tabung(t, 6, 6, 10, new THREE.MeshStandardMaterial({ map: texT, roughness: 0.5 }), 0, 1, 0, 32);
    const atap = new THREE.Mesh(new THREE.ConeGeometry(6.1, 1.4, 32), M(0xcbd5e1)); atap.position.y = 11.7; t.add(atap);
    // tabung kaca indikator level di depan tangki
    tabung(t, 0.45, 0.45, 9.6, M(0xe0f2fe, { transparent: true, opacity: 0.35 }), 0, 1.2, 6.4, 12);
    const isi = tabung(t, 0.36, 0.36, 1, new THREE.MeshBasicMaterial({ color: 0x22c55e }), 0, 1.2, 6.4, 12);
    ref.levelTangki = isi;
    for (let i = 0; i <= 4; i++) kotak(t, 0.8, 0.06, 0.1, M(0x0f172a), 0.8, 1.2 + i * 2.4, 6.45);
    daftarKlik(t, "TANK");
    // pipa tangki → genset
    const pipaM = M(0x92400e);
    [[-226, -22, -203, -22]].forEach(([x1, z1, x2]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, x2 - x1, 8), pipaM); p.rotation.z = Math.PI / 2; p.position.set((x1 + x2) / 2, 1.5, z1); scene.add(p); });
    // truk BBM parkir
    truk(-232, -2, Math.PI / 2);
    label("Diesel Generator DG-01", V3(-190, 22, -20), () => { const d = SIM.V.dg; return d.state === "RUN" ? `RUN · ${fmt(d.p)} kW · ${fmt(d.fuelLh)} L/h` : d.state; }, "DG");
    label("Fuel Tank TK-301", V3(-232, 16, -22), () => `${fmt(SIM.V.dg.pct, 1)} % · ${fmt(SIM.V.dg.fuelL)} L`, "TANK");
  }
  function truk(x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    kotak(g, 3, 2.6, 2.4, M(0xf59e0b), 4.5, 0.6, 0); kotak(g, 1.1, 1, 2.42, M(0x1e293b), 5.6, 1.9, 0);
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 7, 16), M(0xe5e7eb, { metalness: 0.5, roughness: 0.3 })); tk.rotation.z = Math.PI / 2; tk.position.set(-0.6, 2, 0); g.add(tk);
    [-3, -1, 4.5].forEach((xx) => [-1.1, 1.1].forEach((zz) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), M(0x111827)); r.rotation.x = Math.PI / 2; r.position.set(xx, 0.5, zz); g.add(r); }));
    return g;
  }
  function asap(pos) {
    const tex = kanvas(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, "rgba(90,90,90,.85)"); g.addColorStop(1, "rgba(90,90,90,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
    const sp = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.userData.f = i / 14; scene.add(s); return s; });
    return (t, nyala, kuat) => sp.forEach((s) => {
      s.visible = nyala; if (!nyala) return;
      const u = (t / 5000 + s.userData.f) % 1;
      s.position.set(pos.x + u * 14, pos.y + u * 16, pos.z - u * 4);
      const k = 2 + u * 9; s.scale.set(k, k, 1); s.material.opacity = (1 - u) * 0.55 * kuat;
    });
  }

  /* ---------------- KANTOR EMS / CONTROL ROOM ---------------- */
  function kantor() {
    const tex = texJendela("#e2e8f0", "#5b8db8", 4, 8), malam = texLampuMalam(4, 8);
    const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: malam, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.5 }); ref.lampuJendela.push(m);
    const g = new THREE.Group(); g.position.set(-45, 0, 45); scene.add(g);
    kotak(g, 34, 14, 16, m, 0, 0, 0); kotak(g, 34.6, 0.8, 16.6, M(0x15803d), 0, 14, 0);
    // panel surya di atap kantor
    for (let i = 0; i < 6; i++) { const p = kotak(g, 4.4, 0.12, 2.4, new THREE.MeshStandardMaterial({ map: texPanel(), roughness: 0.3, metalness: 0.4 }), -12 + i * 4.8, 15, 0); p.rotation.x = 0.2; }
    kotak(g, 10, 4, 4, M(0xd6d3d1), 0, 0, 9.5); papan(g, "EMS CONTROL CENTER", 0, 12, 8.05, 0, 16, "#15803d");
    daftarKlik(g, "OFFICE");
    // parkir + mobil
    kotak(scene, 40, 0.07, 18, M(0x52525b), -45, 0, 75).castShadow = false;
    for (let i = 0; i < 10; i++) { const w = [0xffffff, 0x1f2937, 0xdc2626, 0x9ca3af, 0x2563eb][i % 5]; mobilParkir(-62 + i * 3.8, 72 + (i % 2) * 7, w); }
    label("EMS Control Center", V3(-45, 19, 45), () => `RE ${fmt(SIM.V.re)} % · ${SIM.V.mode === "GREEN" ? "Green priority" : "Grid backup"}`, "OFFICE");
  }
  function mobilParkir(x, z, w) { kotak(scene, 1.8, 1, 4, M(w, { metalness: 0.4, roughness: 0.4 }), x, 0.3, z); kotak(scene, 1.6, 0.7, 2.2, M(0x1e293b, { metalness: 0.3 }), x, 1.3, z - 0.2); }

  /* ---------------- PABRIK ---------------- */
  function pabrik() {
    const g = new THREE.Group(); g.position.set(140, 0, 60); scene.add(g);
    const tex = texJendela("#e5e7eb", "#64748b", 2, 14), malam = texLampuMalam(2, 14);
    const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: malam, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.6 }); ref.lampuJendela.push(m); ref.lampuPabrik = m;
    kotak(g, 110, 14, 60, m, 0, 0, 0);
    kotak(g, 110.6, 1.2, 60.6, M(0x166534), 0, 12, 0);
    // atap gigi gergaji (sawtooth) dengan panel surya
    const segitiga = new THREE.Shape(); segitiga.moveTo(0, 0); segitiga.lineTo(9, 0); segitiga.lineTo(9, 4.5); segitiga.lineTo(0, 0);
    const geoGigi = new THREE.ExtrudeGeometry(segitiga, { depth: 108, bevelEnabled: false });
    for (let i = 0; i < 6; i++) {
      const gg = new THREE.Mesh(geoGigi, M(0xcbd5e1, { metalness: 0.3 })); gg.rotation.y = Math.PI / 2; gg.position.set(-54, 14, -27 + i * 9 + 9); gg.castShadow = true; g.add(gg);
      const kaca = new THREE.Mesh(new THREE.PlaneGeometry(108, 4.4), M(0x7dd3fc, { metalness: 0.3, roughness: 0.2, side: THREE.DoubleSide })); kaca.position.set(0, 16.25, -27 + i * 9 - 0.06); g.add(kaca);
    }
    for (let i = 0; i < 6; i++) { const k = new THREE.Group(); k.position.set(-40 + i * 16, 18.8, 22); g.add(k); tabung(k, 1, 1, 1.2, M(0x94a3b8), 0, 0, 0, 12); (ref.kipasPabrik = ref.kipasPabrik || []).push(k); }
    for (let i = 0; i < 5; i++) kotak(g, 6, 7, 0.3, M(0x475569), -40 + i * 20, 0, 30.1);                        // pintu loading dock
    papan(g, "PRODUCTION FACTORY", 0, 10, 30.2, 0, 26, "#166534");
    kotak(g, 26, 10, 16, new THREE.MeshStandardMaterial({ map: texJendela("#f1f5f9", "#5b8db8", 3, 6), roughness: 0.5 }), -68, 0, -18);     // kantor pabrik
    daftarKlik(g, "FAC");
    // trafo pabrik TR-FAC
    const t = new THREE.Group(); t.position.set(78, 0, 22); scene.add(t);
    kotak(t, 7, 0.4, 6, M(0x9ca3af), 0, 0, 0); kotak(t, 3.4, 3, 2.6, M(0x6b7280, { metalness: 0.4 }), 0, 0.4, 0);
    for (let i = 0; i < 6; i++) [-1, 1].forEach((s) => kotak(t, 0.08, 2.4, 0.8, M(0x7b8590), -1.5 + i * 0.6, 0.7, s * 1.75));
    [-0.9, 0, 0.9].forEach((x) => tabung(t, 0.12, 0.15, 1.4, M(0xa8a29e), x, 3.4, 0, 8));
    ref.lampuTRFAC = lampu(t, 2.2, 3.4, 0, 0.35); daftarKlik(t, "FAC");
    papan(t, "TR-FAC 4 MVA", 0, 2, 1.32, 0, 3.2, "#166534");
    // truk & parkir pabrik
    kotak(scene, 70, 0.07, 16, M(0x52525b), 140, 0, 104).castShadow = false;
    for (let i = 0; i < 16; i++) mobilParkir(110 + i * 3.8, 100 + (i % 2) * 7, [0xffffff, 0x1f2937, 0x9ca3af, 0xdc2626][i % 4]);
    label("Production Factory", V3(140, 26, 60), () => { const f = SIM.V.fac; return f.supply === "ENERGIZED" ? `${fmt(f.p)} kW · PF ${fmt(f.pf, 2)}` : "DE-ENERGIZED"; }, "FAC");
  }

  /* ---------------- PERUMAHAN KARYAWAN ---------------- */
  const BLOK = [[-270, 165], [-200, 165], [-130, 165], [-270, 245], [-200, 245], [-130, 245]];
  function perumahan() {
    const n = BLOK.length * 16;
    const dinding = new THREE.InstancedMesh(new THREE.BoxGeometry(8, 4.2, 9), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), n);
    const segitiga = new THREE.Shape(); segitiga.moveTo(-4.8, 0); segitiga.lineTo(4.8, 0); segitiga.lineTo(0, 3); segitiga.lineTo(-4.8, 0);
    const geoAtap = new THREE.ExtrudeGeometry(segitiga, { depth: 10, bevelEnabled: false }); geoAtap.translate(0, 0, -5);
    const atap = new THREE.InstancedMesh(geoAtap, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), n);
    const tex = kanvas(64, 64, (c) => { c.fillStyle = "#000"; c.fillRect(0, 0, 64, 64); c.fillStyle = "#ffd88a"; c.fillRect(10, 22, 16, 16); c.fillRect(38, 22, 16, 16); });
    const jendela = new THREE.InstancedMesh(new THREE.PlaneGeometry(6, 2.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, color: 0xffffff }), n);
    ref.jendelaRumah = jendela.material;
    dinding.castShadow = dinding.receiveShadow = atap.castShadow = true;
    const warnaDinding = [0xfef3c7, 0xf5f5f4, 0xfde68a, 0xe0f2fe, 0xfce7f3, 0xecfccb], warnaAtap = [0xb91c1c, 0x9a3412, 0x475569, 0x7c2d12];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    let k = 0;
    BLOK.forEach(([bx, bz], bi) => {
      kotak(scene, 62, 0.06, 62, M(0x4d8a34, { roughness: 1 }), bx, 0.01, bz).castShadow = false;
      kotak(scene, 62, 0.08, 6, M(0x52525b), bx, 0.02, bz).castShadow = false;                                // jalan lingkungan
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x = bx - 22 + i * 14.5, z = bz + (j < 2 ? -24 + j * 11 : 13 + (j - 2) * 11);
        const hadap = j < 2 ? 0 : Math.PI;
        q.setFromAxisAngle(V3(0, 1, 0), hadap + Math.PI / 2);
        m.compose(V3(x, 2.1, z), q, V3(1, 1, 1)); dinding.setMatrixAt(k, m); dinding.setColorAt(k, c.setHex(warnaDinding[(k * 7) % warnaDinding.length]));
        m.compose(V3(x, 4.2, z), q, V3(1, 1, 1)); atap.setMatrixAt(k, m); atap.setColorAt(k, c.setHex(warnaAtap[(k * 5) % warnaAtap.length]));
        const dz = j < 2 ? 4.04 : -4.04;
        m.compose(V3(x, 2.2, z + dz), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), j < 2 ? 0 : Math.PI), V3(1, 1, 1)); jendela.setMatrixAt(k, m);
        k++;
      }
      const kl = new THREE.Mesh(new THREE.BoxGeometry(60, 9, 60), new THREE.MeshBasicMaterial({ visible: false })); kl.position.set(bx, 4.5, bz); scene.add(kl); kl.userData.equip = "RES-" + CONFIG.beban.blok[bi]; klikables.push(kl);
      papan(scene, "BLOK " + CONFIG.beban.blok[bi], bx - 26, 2.2, bz + 3.1, 0, 7, "#15803d");
      label("Blok " + CONFIG.beban.blok[bi], V3(bx, 12, bz), () => `${fmt(SIM.V.res.blok[bi], 1)} kW`, "RES-" + CONFIG.beban.blok[bi]);
    });
    dinding.instanceMatrix.needsUpdate = atap.instanceMatrix.needsUpdate = true;
    scene.add(dinding, atap, jendela);
    // trafo distribusi perumahan + tiang listrik
    const t = new THREE.Group(); t.position.set(-90, 0, 135); scene.add(t);
    kotak(t, 5, 0.3, 4, M(0x9ca3af), 0, 0, 0); kotak(t, 2.6, 2.4, 2, M(0x6b7280, { metalness: 0.4 }), 0, 0.3, 0);
    ref.lampuTRRES = lampu(t, 1.8, 2.8, 0, 0.3); papan(t, "TR-RES 630 kVA", 0, 1.6, 1.02, 0, 2.6, "#166534"); daftarKlik(t, "RES");
    const tiang = []; for (let x = -95; x >= -300; x -= 25) tiang.push([x, 124]);
    let a = null;
    tiang.forEach(([x, z]) => { tabung(scene, 0.18, 0.25, 10, M(0x78716c), x, 0, z, 6); kotak(scene, 3, 0.2, 0.2, M(0x57534e), x, 9.4, z); const b = V3(x, 9.5, z); if (a) kabel(a, b, 0.6); a = b; });
    label("Residential Housing (96 houses)", V3(-200, 22, 205), () => { const r = SIM.V.res; return r.supply === "ENERGIZED" ? `${fmt(r.p)} kW · ${r.rumah} houses` : "DE-ENERGIZED"; }, "RES");
  }

  /* ---------------- TAMAN, DANAU, LAPANGAN ---------------- */
  function taman() {
    // danau
    const danau = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: 0x3b9fd1, roughness: 0.15, metalness: 0.3 }));
    danau.rotation.x = -Math.PI / 2; danau.scale.set(48, 30, 1); danau.position.set(70, 0.12, 215); scene.add(danau); ref.danau = danau;
    const tepi = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 48), M(0xd6d3c9)); tepi.rotation.x = -Math.PI / 2; tepi.scale.set(48, 30, 1); tepi.position.set(70, 0.13, 215); scene.add(tepi);
    const jalur = new THREE.Mesh(new THREE.RingGeometry(1.22, 1.3, 64), M(0xe7d8b1)); jalur.rotation.x = -Math.PI / 2; jalur.scale.set(48, 30, 1); jalur.position.set(70, 0.13, 215); scene.add(jalur);
    // air mancur
    const mancur = new THREE.Group(); mancur.position.set(70, 0, 215); scene.add(mancur);
    tabung(mancur, 2.5, 2.8, 0.8, M(0xe7e5e4), 0, 0, 0, 20);
    ref.mancur = Array.from({ length: 24 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.8 })); d.userData.f = i / 24; mancur.add(d); return d; });
    // gazebo
    const gz = new THREE.Group(); gz.position.set(18, 0, 238); scene.add(gz);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; tabung(gz, 0.25, 0.25, 3.5, M(0x92400e), Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5, 8); }
    const atapG = new THREE.Mesh(new THREE.ConeGeometry(5, 2.4, 6), M(0x166534)); atapG.position.y = 4.7; gz.add(atapG); tabung(gz, 4, 4, 0.3, M(0xd6d3d1), 0, 0, 0, 6);
    // petak bunga warna-warni
    const warna = [0xef4444, 0xf59e0b, 0xec4899, 0xfacc15, 0xa855f7, 0xf97316];
    const bunga = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), 900);
    const mm = new THREE.Matrix4(), cc = new THREE.Color();
    const petak = [[10, 175, 18, 6], [130, 175, 18, 6], [-20, 260, 14, 6], [140, 262, 16, 6], [-45, 20, 30, 3], [-45, 70, 30, 2], [140, 140, 70, 3], [0, 280, 30, 3]];
    let b = 0;
    petak.forEach(([x, z, w, d], pi) => {
      kotak(scene, w + 1, 0.4, d + 1, M(0x6b4f35), x, 0, z).castShadow = false;
      for (let i = 0; i < Math.floor((w * d) / 1.1) && b < 900; i++) { mm.makeTranslation(x + acak(-w / 2, w / 2), 0.6, z + acak(-d / 2, d / 2)); bunga.setMatrixAt(b, mm); bunga.setColorAt(b, cc.setHex(warna[(b + pi) % warna.length])); b++; }
    });
    bunga.count = b; bunga.instanceMatrix.needsUpdate = true; scene.add(bunga);
    // lapangan olahraga
    kotak(scene, 64, 0.08, 38, M(0x4d9a3a, { roughness: 1 }), 150, 0.02, 200).castShadow = false;
    const garis = M(0xffffff);
    [[0, -18.5, 62, 0.4], [0, 18.5, 62, 0.4], [-31, 0, 0.4, 37], [31, 0, 0.4, 37], [0, 0, 0.4, 37]].forEach(([dx, dz, w, d]) => kotak(scene, w, 0.1, d, garis, 150 + dx, 0.03, 200 + dz).castShadow = false);
    [-31, 31].forEach((dx) => { kotak(scene, 0.2, 2.4, 7, M(0xffffff), 150 + dx, 0, 200); });
    // bangku taman
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; kotak(scene, 2.4, 0.5, 0.8, M(0x92400e), 70 + Math.cos(a) * 64, 0.4, 215 + Math.sin(a) * 41); }
    // jalur pejalan kaki kampus
    [[-45, 105, 120, 3], [70, 160, 3, 60], [-60, 200, 150, 3]].forEach(([x, z, w, d]) => kotak(scene, w, 0.06, d, M(0xe7d8b1), x, 0.02, z).castShadow = false);
  }

  /* ---------------- RIBUAN POHON RINDANG (InstancedMesh) ---------------- */
  function pohonPohon() {
    const titik = [];
    const tambah = (x, z, s = 1) => titik.push([x + acak(-1.5, 1.5), z + acak(-1.5, 1.5), s * acak(0.8, 1.25)]);
    const area = (x, z) =>
      (Math.abs(x) < 305 && z > -325 && z < -95) ||                      // PV field
      (x > 18 && x < 98 && z > -46 && z < 4) ||                         // gardu
      (x > -114 && x < -46 && z > -45 && z < -5) ||                     // BESS
      (x > -248 && x < -162 && z > -45 && z < 2) ||                     // diesel
      (x > 68 && x < 212 && z > 15 && z < 122) ||                       // pabrik + parkir
      (x > -68 && x < -20 && z > 30 && z < 86) ||                       // kantor
      (Math.abs(x - 70) < 70 && Math.abs(z - 215) < 47) ||              // danau
      (Math.abs(x - 150) < 36 && Math.abs(z - 200) < 23) ||             // lapangan
      BLOK.some(([bx, bz]) => Math.abs(x - bx) < 33 && Math.abs(z - bz) < 33);
    const jalanan = (x, z) =>
      Math.abs(z + 62) < 10 || Math.abs(z - 118) < 10 || (Math.abs(x) < 10 && z > -62) || (Math.abs(x + 90) < 10 && z > 118) ||
      (Math.abs(x - 210) < 10 && z > -62 && z < 118) || Math.abs(Math.abs(x) - 330) < 10 || Math.abs(z - 124) < 4 && x < -90;
    // tajuk pohon ±5 m: periksa 4 titik tepi agar daun tidak menembus area peralatan
    const areaPad = (x, z) => area(x, z) || area(x + 6, z) || area(x - 6, z) || area(x, z + 6) || area(x, z - 6);
    const kosong = (x, z) => areaPad(x, z) || jalanan(x, z);
    // sabuk hijau keliling kampus (3 lapis)
    for (let lap = 0; lap < 4; lap++) {
      const r = 345 + lap * 11;
      for (let x = -r; x <= r; x += 10) { tambah(x, -r - 10, 1.2); tambah(x, r - 25, 1.2); }
      for (let z = -r - 10; z <= r - 25; z += 10) { tambah(-r, z, 1.2); tambah(r, z, 1.2); }
    }
    // pohon peneduh di sepanjang jalan
    const tepi = (x, z) => { if (!areaPad(x, z)) tambah(x, z, 1); };
    for (let x = -320; x <= 320; x += 16) { tepi(x, -50); tepi(x, -74); tepi(x, 130); tepi(x, 106); }
    for (let z = -50; z <= 290; z += 16) { tepi(-12, z); tepi(12, z); }
    // pengisi ruang hijau di dalam kampus
    for (let i = 0; i < 2600; i++) { const x = acak(-335, 335), z = acak(-90, 300); if (!kosong(x, z)) tambah(x, z, acak(0.8, 1.2)); }
    // pohon di dalam blok perumahan
    BLOK.forEach(([bx, bz]) => { for (let i = 0; i < 4; i++) { tambah(bx - 22 + i * 14.5, bz - 6, 0.6); tambah(bx - 22 + i * 14.5, bz + 30, 0.6); } });
    // hutan di luar kampus
    for (let i = 0; i < 1500; i++) { const a = Math.random() * Math.PI * 2, r = acak(400, 900); tambah(Math.cos(a) * r * 1.1, Math.sin(a) * r, acak(1.1, 1.8)); }

    const n = titik.length;
    const batang = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.42, 1, 6), M(0x6b4423), n);
    const daun1 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), n);
    const daun2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    const hijau = [0x2f7d32, 0x3a8f3c, 0x2b6e2f, 0x4c9a2a, 0x356e28, 0x5aa33a, 0x1f6b3a];
    titik.forEach(([x, z, s], i) => {
      const tinggi = 4.5 * s;
      m.compose(V3(x, tinggi / 2, z), q, V3(s, tinggi, s)); batang.setMatrixAt(i, m);
      const r = 3.6 * s;
      q.setFromEuler(new THREE.Euler(acak(0, 1), acak(0, 3), 0));
      m.compose(V3(x, tinggi + r * 0.55, z), q, V3(r * 1.1, r * 0.85, r * 1.1)); daun1.setMatrixAt(i, m);
      m.compose(V3(x + acak(-1.5, 1.5) * s, tinggi + r * 1.15, z + acak(-1.5, 1.5) * s), q, V3(r * 0.75, r * 0.65, r * 0.75)); daun2.setMatrixAt(i, m);
      const h = hijau[i % hijau.length]; daun1.setColorAt(i, c.setHex(h)); daun2.setColorAt(i, c.setHex(h).offsetHSL(0, 0, 0.05));
      q.identity();
    });
    [batang, daun1, daun2].forEach((o) => { o.castShadow = true; o.receiveShadow = true; o.instanceMatrix.needsUpdate = true; scene.add(o); });
    ref.jumlahPohon = n;
  }

  /* ---------------- ALIRAN DAYA (partikel bergerak di jalur kabel) ---------------- */
  const jalurDaya = [];
  function rute(titik, warna, fn) {
    const pts = titik.map(([x, z, y = 0.6]) => V3(x, y, z));
    const seg = []; let L = 0;
    for (let i = 0; i < pts.length - 1; i++) { const d = pts[i].distanceTo(pts[i + 1]); seg.push({ a: pts[i], b: pts[i + 1], L: d, s: L }); L += d; }
    const garis = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: warna, transparent: true, opacity: 0.35 }));
    scene.add(garis);
    const N = Math.max(4, Math.round(L / 9));
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.75, 8, 6), new THREE.MeshBasicMaterial({ color: warna }), N);
    scene.add(im);
    const r = { seg, L, N, im, fn, fase: 0, garis };
    jalurDaya.push(r); return r;
  }
  function aliranDaya() {
    ARRAY.forEach(([cx, cz], i) => rute([[cx, cz + 52], [cx, -55], [BAY.PV, -55], [BAY.PV, -9]], 0xfacc15, () => SIM.V.inv[i].pac / CONFIG.pv.inverterKW));
    rute([[-58, -19], [-58, -2], [BAY.BESS, -2], [BAY.BESS, -6]], 0x22d3ee, () => SIM.V.bess.p / CONFIG.bess.pcsKW);
    rute([[-177, -20], [-177, 2], [BAY.DG, 2], [BAY.DG, -6]], 0xf97316, () => SIM.V.pDG / CONFIG.dg.kW);
    rute([[BAY.FAC, -4], [BAY.FAC, 22], [78, 22]], 0x38bdf8, () => SIM.V.fac.p / 3000);
    rute([[78, 25], [90, 25], [90, 40]], 0x38bdf8, () => SIM.V.fac.p / 3000);
    rute([[BAY.RES, -4], [BAY.RES, 8], [-20, 8], [-20, 100], [-90, 100], [-90, 133]], 0x4ade80, () => SIM.V.res.p / 400);
    rute([[-95, 124, 9.5], [-300, 124, 9.5]], 0x4ade80, () => SIM.V.res.p / 400);
    ref.ruteGrid = (ref.kabelGrid || []).map((pts) => rute(pts.slice().reverse().map((p) => [p.x, p.z, p.y]), 0xa78bfa, () => (SIM.V.grid.imp - SIM.V.grid.exp) / 2000));
  }
  function updateAliran(dt) {
    const m = new THREE.Matrix4(), p = V3();
    jalurDaya.forEach((r) => {
      const v = r.fn() || 0, besar = Math.min(1.6, Math.abs(v));
      r.im.visible = besar > 0.01 && tampilAliran;
      r.garis.visible = tampilAliran;
      if (!r.im.visible) return;
      r.fase = (r.fase + Math.sign(v) * dt * (0.04 + 0.12 * besar) * (60 / r.L) * 6) % 1;
      if (r.fase < 0) r.fase += 1;
      for (let i = 0; i < r.N; i++) {
        const s = ((i / r.N + r.fase) % 1) * r.L;
        const sg = r.seg.find((x) => s >= x.s && s <= x.s + x.L) || r.seg[r.seg.length - 1];
        p.copy(sg.a).lerp(sg.b, (s - sg.s) / sg.L);
        const k = 0.5 + besar * 0.6; m.makeScale(k, k, k); m.setPosition(p); r.im.setMatrixAt(i, m);
      }
      r.im.instanceMatrix.needsUpdate = true;
    });
  }

  /* ---------------- AWAN & MOBIL ---------------- */
  function awan() {
    const tex = kanvas(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 6, 64, 64, 62); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
    ref.awan = Array.from({ length: 16 }, (_, i) => {
      const g = new THREE.Group(); g.position.set(acak(-900, 900), acak(180, 260), acak(-700, 500)); scene.add(g);
      for (let j = 0; j < 6; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })); s.position.set(acak(-60, 60), acak(-8, 8), acak(-25, 25)); const k = acak(60, 110); s.scale.set(k, k * 0.55, 1); g.add(s); }
      g.userData.i = i; return g;
    });
  }
  function mobil() {
    ref.mobil = Array.from({ length: 7 }, (_, i) => {
      const g = new THREE.Group(); scene.add(g);
      kotak(g, 4, 1.2, 1.9, M([0xdc2626, 0xffffff, 0x2563eb, 0x16a34a, 0xf59e0b, 0x111827, 0x9ca3af][i], { metalness: 0.4, roughness: 0.4 }), 0, 0.35, 0);
      kotak(g, 2.2, 0.8, 1.7, M(0x1e293b), -0.2, 1.5, 0);
      g.userData = { u: i / 7, jalur: i % 3 };
      return g;
    });
  }
  const loopJalan = [[[-320, -59], [320, -59], [320, -65], [-320, -65]], [[-3, -55], [-3, 295], [3, 295], [3, -55]], [[-320, 121], [320, 121], [320, 115], [-320, 115]]];
  function updateMobil(dt) {
    ref.mobil.forEach((g) => {
      const d = g.userData; d.u = (d.u + dt * 0.012) % 1;
      const pts = loopJalan[d.jalur], seg = d.u < 0.5 ? [pts[0], pts[1]] : [pts[2], pts[3]];
      const u = (d.u % 0.5) * 2;
      g.position.set(seg[0][0] + (seg[1][0] - seg[0][0]) * u, 0, seg[0][1] + (seg[1][1] - seg[0][1]) * u);
      g.rotation.y = Math.atan2(-(seg[1][1] - seg[0][1]), seg[1][0] - seg[0][0]);
    });
  }

  /* ======================================================
     KAMERA & KONTROL (putar, geser, zoom, klik)
     ====================================================== */
  const orbit = { theta: 1.15, phi: 0.95, r: 720, target: V3(-10, 0, 0), goal: null, auto: false };
  const PRESET = {
    Overview: [1.15, 0.95, 720, [-10, 0, 0]], "PV Field": [1.35, 0.85, 330, [0, 0, -205]], Inverters: [1.45, 0.55, 140, [0, 3, -125]],
    BESS: [1.3, 0.8, 95, [-80, 3, -25]], "Diesel & Fuel": [1.2, 0.85, 120, [-210, 5, -20]], Substation: [1.4, 0.8, 110, [58, 4, -20]],
    Factory: [1.0, 0.85, 220, [140, 8, 60]], Housing: [1.35, 0.85, 240, [-200, 4, 205]], Park: [1.5, 0.8, 200, [70, 4, 215]],
  };
  function ke(nama) { const p = PRESET[nama] || nama; orbit.goal = { theta: p[0], phi: p[1], r: p[2], target: V3(...p[3]) }; }
  function pasangKontrol(el) {
    let drag = null, px = 0, py = 0, pinch = 0, pindah = 0;
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("pointerdown", (e) => { drag = e.button === 2 || e.shiftKey ? "pan" : "rot"; px = e.clientX; py = e.clientY; pindah = 0; el.setPointerCapture(e.pointerId); orbit.goal = null; });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; pindah += Math.abs(dx) + Math.abs(dy);
      if (drag === "rot") { orbit.theta += dx * 0.005; orbit.phi = Math.max(0.12, Math.min(1.45, orbit.phi - dy * 0.004)); }
      else { const k = orbit.r * 0.0016; const ar = V3(Math.sin(orbit.theta), 0, -Math.cos(orbit.theta)); const kn = V3(Math.cos(orbit.theta), 0, Math.sin(orbit.theta)); orbit.target.addScaledVector(ar, dx * k).addScaledVector(kn, -dy * k); }
    });
    el.addEventListener("pointerup", (e) => { if (drag && pindah < 5) klik(e); drag = null; });
    el.addEventListener("wheel", (e) => { e.preventDefault(); orbit.goal = null; orbit.r = Math.max(25, Math.min(1500, orbit.r * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
    el.addEventListener("touchmove", (e) => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) orbit.r = Math.max(25, Math.min(1500, orbit.r * (pinch / d))); pinch = d; } }, { passive: true });
    el.addEventListener("touchend", () => (pinch = 0));
  }
  const ray = new THREE.Raycaster();
  function klik(e) {
    const b = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - b.left) / b.width) * 2 - 1, y: -((e.clientY - b.top) / b.height) * 2 + 1 }, camera);
    const hit = ray.intersectObjects(klikables, false)[0];
    if (!hit) return;
    const o = hit.object;
    const kunci = o.userData.equipFn ? o.userData.equipFn(hit.instanceId) : o.userData.equip;
    if (kunci) onPilih(kunci);
  }

  /* ======================================================
     UPDATE TIAP FRAME
     ====================================================== */
  let tampilLabel = true, tampilAliran = true, tLalu = performance.now(), tLabel = 0;
  const warnaStatus = { RUNNING: 0x22c55e, STANDBY: 0xfacc15, STOP: 0xf59e0b, FAULT: 0xef4444, "COMM LOSS": 0x9ca3af };
  function frame() {
    requestAnimationFrame(frame);
    if (!aktif || !siap || !wadah) return;
    const now = performance.now(), dt = Math.min(0.1, (now - tLalu) / 1000); tLalu = now;
    const V = SIM.V; if (!V.inv) return;
    // kamera
    if (orbit.goal) { const g = orbit.goal, k = Math.min(1, dt * 3); orbit.theta += (g.theta - orbit.theta) * k; orbit.phi += (g.phi - orbit.phi) * k; orbit.r += (g.r - orbit.r) * k; orbit.target.lerp(g.target, k); if (Math.abs(g.r - orbit.r) < 0.5 && Math.abs(g.theta - orbit.theta) < 0.002 && Math.abs(g.phi - orbit.phi) < 0.002 && orbit.target.distanceTo(g.target) < 0.3) orbit.goal = null; }
    if (orbit.auto) orbit.theta += dt * 0.06;
    camera.position.set(orbit.target.x + orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta), orbit.target.y + orbit.r * Math.cos(orbit.phi), orbit.target.z + orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta));
    camera.lookAt(orbit.target);
    // matahari & langit mengikuti jam simulasi
    const el = V.sun.elev, siang = Math.max(0, el);
    sun.position.set(Math.cos(V.sun.a) * 700, Math.max(60, el * 800), -250);
    sun.intensity = 0.15 + 0.8 * Math.min(1, siang * 1.6) * (1 - 0.45 * V.cloud);
    hemi.intensity = 0.28 + 0.5 * Math.min(1, siang * 2);
    const senja = Math.max(0, 1 - Math.abs(el) * 5);
    const cSiang = new THREE.Color(0x9fd2f5).lerp(new THREE.Color(0xb8c4cc), V.cloud * 0.6), cMalam = new THREE.Color(0x0b1730), cSenja = new THREE.Color(0xf4a261);
    const cl = el > 0 ? cSiang.clone().lerp(cSenja, senja * 0.6) : cMalam.clone().lerp(cSenja, senja * 0.5);
    scene.background.copy(cl); scene.fog.color.copy(cl);
    const malam = el < 0.08;
    ref.lampuJendela.forEach((m) => (m.emissiveIntensity = malam ? (m === ref.lampuPabrik && V.fac.supply !== "ENERGIZED" ? 0 : 0.9) : 0));
    ref.jendelaRumah.opacity = malam && V.res.supply === "ENERGIZED" ? 0.95 : 0;
    const adaListrik = V.bus.v > 0;
    ref.lampuJalan.forEach((m) => m.color.setHex(malam && adaListrik ? 0xfff2b3 : 0x777777));
    // status peralatan
    V.inv.forEach((u, i) => ref["lampuINV" + i].material.color.setHex(warnaStatus[u.status] || 0x9ca3af));
    const kedip = Math.sin(now / 250) > 0;
    for (const k in BAY) { const s = V.cb[k]; ref["cb" + k].material.color.setHex(s === "CLOSED" ? 0x22c55e : s === "TRIP" ? (kedip ? 0xef4444 : 0x450a0a) : 0xef4444); }
    const b = V.bess, wb = b.status === "CHARGING" ? 0x22c55e : b.status === "DISCHARGING" ? 0xf97316 : b.status === "OFFLINE" ? 0x6b7280 : b.status === "FAULT" ? 0xef4444 : 0x60a5fa;
    ref.bessStrip.forEach((m, i) => m.color.setHex(b.status === "CHARGING" || b.status === "DISCHARGING" ? (Math.sin(now / 300 + i) > -0.3 ? wb : 0x0f172a) : wb));
    const d = V.dg, jalan = d.state !== "STOP" && d.state !== "FAULT";
    ref.lampuDG.material.color.setHex(d.state === "RUN" ? 0x22c55e : d.state === "FAULT" ? (kedip ? 0xef4444 : 0x450a0a) : jalan ? 0xfacc15 : 0x9ca3af);
    ref.asapDG.forEach((f) => f(now, jalan, d.state === "RUN" ? 0.6 + d.p / 3000 : 0.35));
    ref.kipasDG.forEach((k) => (k.rotation.y += jalan ? dt * 18 : 0));
    const pct = d.pct; ref.levelTangki.scale.y = Math.max(0.02, (pct / 100) * 9.6); ref.levelTangki.position.y = 1.2 + ref.levelTangki.scale.y / 2;
    ref.levelTangki.material.color.setHex(pct <= CONFIG.dg.kritisPct ? 0xef4444 : pct <= CONFIG.dg.rendahPct ? 0xfacc15 : 0x22c55e);
    ref.lampuTRFAC.material.color.setHex(V.fac.trT > 90 ? (kedip ? 0xef4444 : 0x450a0a) : V.fac.supply === "ENERGIZED" ? 0x22c55e : 0x9ca3af);
    ref.lampuTRRES.material.color.setHex(V.res.supply === "ENERGIZED" ? 0x22c55e : 0x9ca3af);
    (ref.kipasPabrik || []).forEach((k) => (k.rotation.y += V.fac.p > 0 ? dt * 6 : 0));
    ref.anemo.rotation.y += dt * V.wind * 1.6;
    ref.mancur.forEach((t) => { const u = (now / 1600 + t.userData.f) % 1, a = t.userData.f * Math.PI * 2; t.position.set(Math.cos(a) * u * 3, 1 + Math.sin(u * Math.PI) * 6, Math.sin(a) * u * 3); });
    (ref.lampuMenara || []).forEach((l) => (l.visible = kedip));
    // awan: jumlah yang tampak mengikuti tutupan awan
    ref.awan.forEach((g, i) => { g.visible = i < Math.round(V.cloud * 16) + 2; g.position.x += dt * (4 + V.wind * 2); if (g.position.x > 1000) g.position.x = -1000; });
    updateAliran(dt); updateMobil(dt);
    renderer.render(scene, camera);
    // label HTML
    if (tampilLabel && now - tLabel > 120) {
      tLabel = now;
      const W = wadah.clientWidth, H = wadah.clientHeight, p = V3();
      labels.forEach((L) => {
        p.copy(L.pos).project(camera);
        const ok = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
        L.el.style.display = ok ? "" : "none"; if (!ok) return;
        L.el.style.transform = `translate(${((p.x + 1) / 2) * W}px, ${((1 - p.y) / 2) * H}px) translate(-50%, -100%)`;
        L.v.textContent = L.fn();
      });
    }
  }
  function ukuran() {
    if (!wadah || !renderer) return;
    const w = wadah.clientWidth, h = wadah.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  /* ---------------- API ---------------- */
  return {
    pasang(el) {                                                   // pindahkan kanvas 3D ke kontainer halaman aktif
      if (typeof THREE === "undefined") { el.innerHTML = '<div class="kosong3d">Three.js belum termuat – periksa koneksi internet.</div>'; return; }
      if (!siap) { bangun(); lapisLabel = document.createElement("div"); lapisLabel.className = "lapis-label"; labels.forEach((L) => lapisLabel.appendChild(L.el)); pasangKontrol(renderer.domElement); requestAnimationFrame(frame); window.addEventListener("resize", ukuran); }
      wadah = el; el.prepend(renderer.domElement); el.appendChild(lapisLabel);
      aktif = true; setTimeout(ukuran, 30); ukuran();
    },
    jeda(x) { aktif = !x; if (!x) setTimeout(ukuran, 30); },
    ke, PRESET, orbit,
    setLabel(x) { tampilLabel = x; if (lapisLabel) lapisLabel.style.display = x ? "" : "none"; },
    setAliran(x) { tampilAliran = x; },
    setPilih(f) { onPilih = f; },
    info: () => ({ pohon: ref.jumlahPohon }),
    ukuran,
  };
})();
