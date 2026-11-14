/* =========================================================
   SCENE3D.JS — 3D COAL SILO PLANT (Three.js r128)
   • 4 silo silinder + hopper kerucut, atap, platform & handrail kuning,
     tangga + cage, ring beam, kolom penyangga + load cell, ring pengaku
   • Shell TRANSPARAN / SOLID, mode CUTAWAY (clipping plane)
   • Badan batu bara mengikuti kontur hasil 3D scan (warna kontur atau
     tekstur batu bara + bongkahan), pin MAX / MIN, beam scanner + point cloud
   • Receiving: truck hopper, belt feeder, CV-001, bucket elevator,
     galeri CV-002 + diverter + transfer chute ke tiap silo
   • Dust collector + bag filter + ducting, discharge gate, rotary valve,
     screw conveyor, CV-003 ke boiler, panah aliran beranimasi
   Permukaan3D (bawah file) = tampilan 3D surface khusus halaman Contour.
   ========================================================= */
const Silo3D = (() => {
  const G = CONFIG.geo, NSILO = CONFIG.silo.length;
  const E = G.elevasi, yH = E + G.Hh, yTop = E + G.Hshell, yRoof = yTop + G.roof;
  const SX = CONFIG.silo.map((_, i) => -30 + i * 20);
  const GAL = yRoof + 1.7;                                    // lantai galeri CV-002
  let renderer, scene, camera, wadah, lapisLabel, siap = false, aktif = false, kotor = true;
  const klikables = [], labels = [], ref = { silo: [], belt: {}, lampu: {}, panah: [], shellMat: null };
  let onPilih = () => {};
  let sel = 0, transparan = true, kontur = false, cutaway = false, tampilPin = true, tampilLabel = true, tampilAliran = true;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const acak = (a, b) => a + Math.random() * (b - a);
  const pol = (r, d) => [r * Math.sin((d * Math.PI) / 180), r * Math.cos((d * Math.PI) / 180)];

  /* ---------------- helper geometri ---------------- */
  const cacheM = {};
  function M(warna, o = {}) { const k = warna + JSON.stringify(o); if (!cacheM[k]) cacheM[k] = new THREE.MeshStandardMaterial({ color: warna, roughness: 0.6, metalness: 0.35, ...o }); return cacheM[k]; }
  const asM = (m) => (m && m.isMaterial ? m : M(m));
  function kotak(p, w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), asM(m)); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; }
  function tabung(p, rt, rb, h, m, x, y, z, seg = 24, open = false) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), asM(m)); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; }
  function bola(p, r, m, x, y, z, seg = 14) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg / 2 + 2), asM(m)); o.position.set(x, y, z); p.add(o); return o; }
  function batang(p, a, b, r, m, seg = 8) {
    const d = V3().subVectors(b, a), L = d.length(); if (L < 0.01) return null;
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), asM(m));
    o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); o.castShadow = true; p.add(o); return o;
  }
  function cincin(p, r, tebal, m, y, seg = 48) { const o = new THREE.Mesh(new THREE.TorusGeometry(r, tebal, 6, seg), asM(m)); o.rotation.x = Math.PI / 2; o.position.y = y; p.add(o); return o; }
  function kanvas(w, h, gambar) { const c = document.createElement("canvas"); c.width = w; c.height = h; gambar(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
  function papan(p, teks, x, y, z, rotY = 0, lebar = 6, warna = "#0e7490", m2) {
    const tex = kanvas(512, 96, (c, w, h) => { c.fillStyle = warna; c.fillRect(0, 0, w, h); c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8); c.fillStyle = "#fff"; c.font = "bold 46px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(teks, w / 2, h / 2 + 2, w - 24); });
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, ...(m2 || {}) });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lebar, lebar * 0.1875), mat); m.position.set(x, y, z); m.rotation.y = rotY; p.add(m); return m;
  }
  function klik(obj, kunci) { if (!obj) return obj; obj.traverse((o) => { if (o.isMesh) { o.userData.kunci = kunci; klikables.push(o); } }); return obj; }
  function lampu(p, x, y, z, id, r = 0.32) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: 0x9ca3af })); m.position.set(x, y, z); p.add(m); ref.lampu[id] = m; return m; }
  function label(judul, pos, fn, kunci, kelas = "") {
    const el = document.createElement("div"); el.className = "lbl3d " + kelas; el.innerHTML = `<div class="lbl-j">${judul}</div><div class="lbl-v"></div>`;
    el.onclick = () => kunci && onPilih(kunci);
    const L = { el, pos, fn, v: el.querySelector(".lbl-v"), kelas, tampil: () => true }; labels.push(L); return L;
  }

  /* ---------------- tekstur ---------------- */
  const texBatubara = () => kanvas(256, 256, (c, w, h) => {
    c.fillStyle = "#16171a"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const g = 14 + Math.random() * 38, r = 1 + Math.random() * 5; c.fillStyle = `rgb(${g},${g},${g + 3})`; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, r, 0, 7); c.fill(); }
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(190,200,215,${0.15 + Math.random() * 0.35})`; c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  });
  const texBelt = (muatan) => kanvas(128, 32, (c, w, h) => {
    c.fillStyle = "#1f2328"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#2f353c"; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 3, h);
    if (muatan) for (let i = 0; i < 90; i++) { const g = 10 + Math.random() * 30; c.fillStyle = `rgb(${g},${g},${g})`; c.beginPath(); c.arc(Math.random() * w, 6 + Math.random() * 20, 1 + Math.random() * 3, 0, 7); c.fill(); }
  });
  const texGaris = () => kanvas(64, 64, (c, w, h) => { c.fillStyle = "#64748b"; c.fillRect(0, 0, w, h); c.fillStyle = "#334155"; for (let i = 0; i < 4; i++) c.fillRect(i * 16, 0, 7, h); });
  const texBulat = (stops) => kanvas(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 1, 32, 32, 31); stops.forEach(([o, w]) => g.addColorStop(o, w)); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });

  /* =====================================================
     GEOMETRI PERMUKAAN POLAR (dipakai badan batu bara & Permukaan3D)
     ===================================================== */
  function geoPolar(NR, NS) {
    const nv = 1 + NR * NS, pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
    for (let s = 0; s < NS; s++) idx.push(0, 1 + s, 1 + ((s + 1) % NS));
    for (let r = 0; r < NR - 1; r++) for (let s = 0; s < NS; s++) { const a = 1 + r * NS + s, b = 1 + r * NS + ((s + 1) % NS), c = 1 + (r + 1) * NS + ((s + 1) % NS), d = 1 + (r + 1) * NS + s; idx.push(a, d, b, b, d, c); }
    const geo = new THREE.BufferGeometry();
    const aPos = new THREE.BufferAttribute(pos, 3), aCol = new THREE.BufferAttribute(col, 3);
    geo.setAttribute("position", aPos); geo.setAttribute("color", aCol); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const xy = new Float32Array(nv * 2);
    for (let r = 0; r < NR; r++) for (let s = 0; s < NS; s++) { const k = 1 + r * NS + s, rr = (G.R * 0.985 * (r + 1)) / NR, [x, y] = pol(rr, (s / NS) * 360); xy[k * 2] = x; xy[k * 2 + 1] = y; }
    for (let k = 0; k < nv; k++) { uv[k * 2] = xy[k * 2] / 2.2 + 0.5; uv[k * 2 + 1] = xy[k * 2 + 1] / 2.2 + 0.5; }
    // dinding (band) di tepi: outlet → ujung hopper → permukaan
    const bv = (NS + 1) * 3, bPos = new Float32Array(bv * 3), bCol = new Float32Array(bv * 3), bIdx = [];
    for (let s = 0; s < NS; s++) { const a = s * 3, b = (s + 1) * 3; bIdx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); }
    const bGeo = new THREE.BufferGeometry(), bAP = new THREE.BufferAttribute(bPos, 3), bAC = new THREE.BufferAttribute(bCol, 3), bUV = new Float32Array(bv * 2), bAU = new THREE.BufferAttribute(bUV, 2);
    bGeo.setAttribute("position", bAP); bGeo.setAttribute("color", bAC); bGeo.setAttribute("uv", bAU); bGeo.setIndex(bIdx);
    return { NR, NS, nv, pos, col, xy, geo, aPos, aCol, bPos, bCol, bGeo, bAP, bAC, bUV, bAU };
  }
  /* isi posisi & warna dari grid tinggi Z. sk = skala vertikal, dasar = tinggi acuan (m) */
  function isiPolar(P, Z, st, sk = 1, dasar = 0, warnaKontur = true, bandBawah = true) {
    const mn = st ? st.min : 0, rg = st ? Math.max(0.05, st.max - st.min) : 1, pos = P.pos, col = P.col;
    for (let k = 0; k < P.nv; k++) {
      const x = P.xy[k * 2], y = P.xy[k * 2 + 1], z = KONTUR.sampel(Z, x, y);
      pos[k * 3] = x; pos[k * 3 + 1] = (z - dasar) * sk; pos[k * 3 + 2] = -y;
      const c = warnaKontur ? KONTUR.warna((z - mn) / rg) : [255, 255, 255];
      col[k * 3] = c[0] / 255; col[k * 3 + 1] = c[1] / 255; col[k * 3 + 2] = c[2] / 255;
    }
    const NS = P.NS, luar = 1 + (P.NR - 1) * NS;
    for (let s = 0; s <= NS; s++) {
      const kk = luar + (s % NS), x = P.xy[kk * 2], y = P.xy[kk * 2 + 1], ztop = pos[kk * 3 + 1], a = s * 3;
      const sx = x / (G.R * 0.985), sy = y / (G.R * 0.985);
      const y0 = bandBawah ? (0 - dasar) * sk : 0, y1 = bandBawah ? (G.Hh - dasar) * sk : 0;
      const pts = bandBawah ? [[sx * G.r0 * 0.97, y0, sy * G.r0 * 0.97], [x, Math.min(ztop, y1), y], [x, ztop, y]] : [[x, 0, y], [x, Math.min(ztop, 0.0001), y], [x, ztop, y]];
      pts.forEach(([px, py, pz], j) => {
        P.bPos[(a + j) * 3] = px; P.bPos[(a + j) * 3 + 1] = py; P.bPos[(a + j) * 3 + 2] = -pz; P.bUV[(a + j) * 2] = (s / NS) * 8; P.bUV[(a + j) * 2 + 1] = py / 2.6;
        const c = bandBawah ? [col[kk * 3] * 0.5, col[kk * 3 + 1] * 0.5, col[kk * 3 + 2] * 0.5] : j === 2 ? [0.2, 0.26, 0.34] : [0.09, 0.12, 0.17];
        P.bCol[(a + j) * 3] = c[0]; P.bCol[(a + j) * 3 + 1] = c[1]; P.bCol[(a + j) * 3 + 2] = c[2];
      });
    }
    P.aPos.needsUpdate = P.aCol.needsUpdate = P.bAP.needsUpdate = P.bAC.needsUpdate = P.bAU.needsUpdate = true;
    P.geo.computeVertexNormals(); P.bGeo.computeVertexNormals();
    P.geo.computeBoundingSphere(); P.bGeo.computeBoundingSphere();
  }

  /* =====================================================
     MEMBANGUN DUNIA
     ===================================================== */
  let matShell, matRing, matCoal, matKontur, matBelt = {}, clip;
  function bangun() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x081226);
    scene.fog = new THREE.Fog(0x081226, 260, 620);
    camera = new THREE.PerspectiveCamera(40, 1.6, 0.5, 2000);
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
    scene.add(new THREE.HemisphereLight(0xd6ecff, 0x1a2333, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(70, 130, 90); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 90, bottom: -90, near: 10, far: 400 }); sun.shadow.bias = -0.0006; scene.add(sun);
    const isi = new THREE.DirectionalLight(0x67e8f9, 0.25); isi.position.set(-80, 40, -60); scene.add(isi);
    clip = new THREE.Plane(V3(0, 0, -1), 0);

    matShell = new THREE.MeshStandardMaterial({ color: 0xc9d4e0, metalness: 0.55, roughness: 0.35, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    matRing = new THREE.MeshStandardMaterial({ color: 0x8796a8, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
    const tc = texBatubara(); tc.wrapS = tc.wrapT = THREE.RepeatWrapping; tc.repeat.set(3, 3);
    matCoal = new THREE.MeshStandardMaterial({ map: tc, color: 0xffffff, roughness: 0.92, metalness: 0.08, side: THREE.DoubleSide });
    matKontur = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide });
    ref.shellMat = [matShell, matRing];

    // tanah & grid digital
    const tanah = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), M(0x0b1527, { roughness: 1, metalness: 0 })); tanah.rotation.x = -Math.PI / 2; tanah.receiveShadow = true; scene.add(tanah);
    const grid = new THREE.GridHelper(400, 80, 0x1d4e6b, 0x12304a); grid.position.y = 0.02; scene.add(grid);
    kotak(scene, 150, 0.12, 40, M(0x18233a, { roughness: 0.95, metalness: 0 }), -2, 0, 2).castShadow = false;
    kotak(scene, 40, 0.1, 24, M(0x18233a, { roughness: 0.95, metalness: 0 }), -96, 0, 0).castShadow = false;
    kotak(scene, 120, 0.06, 9, M(0x1f2937, { roughness: 1, metalness: 0 }), -150, 0, 0).castShadow = false;   // jalan truk
    for (let x = -205; x < -95; x += 8) kotak(scene, 4, 0.08, 0.25, M(0xe2e8f0), x, 0, 0).castShadow = false;

    for (let i = 0; i < NSILO; i++) silo(i);
    receiving();
    const asli = scene; ref.gGal = new THREE.Group(); scene = ref.gGal; galeri(); dust(); scene = asli; scene.add(ref.gGal);
    discharge(); boiler(); panahAliran();
    siap = true;
  }

  /* ---------------- SATU SILO ---------------- */
  function silo(i) {
    const cx = SX[i], g = new THREE.Group(); g.position.set(cx, 0, 0); scene.add(g);
    const R = G.R, n = i + 1, S = { g, i, cx };
    const clipM = (m) => m; // material shell dipakai bersama → clipping diatur global
    // shell, hopper, atap
    const shell = tabung(g, R, R, G.Hshell - G.Hh, matShell, 0, yH, 0, 64, true); shell.castShadow = false;
    const hop = tabung(g, R, G.r0, G.Hh, matShell, 0, E, 0, 64, true); hop.castShadow = false;
    const atap = tabung(g, 0.35, R + 0.12, G.roof, matShell, 0, yTop, 0, 64, true); atap.castShadow = false;
    tabung(g, G.r0 + 0.08, G.r0 + 0.08, 0.6, M(0x64748b), 0, E - 0.6, 0, 16);
    // ring pengaku & ring beam
    for (let y = yH + 3; y < yTop - 0.5; y += 3.2) cincin(g, R + 0.03, 0.07, matRing, y);
    cincin(g, R + 0.03, 0.09, matRing, yTop); cincin(g, R + 0.12, 0.28, M(0x475569), yH);
    // level ring (warna status) di luar shell
    S.ringLevel = cincin(g, R + 0.11, 0.09, new THREE.MeshBasicMaterial({ color: 0x22d3ee }), yH + 5);
    // kolom penyangga + load cell (45/135/225/315°)
    const baja = M(0x3f4b5c, { metalness: 0.5 });
    S.lc = [];
    [45, 135, 225, 315].forEach((d, k) => {
      const [x, y] = pol(R + 0.35, d);
      kotak(g, 0.6, yH - 0.75, 0.6, baja, x, 0, -y);
      kotak(g, 1.1, 0.25, 1.1, M(0x94a3b8), x, 0, -y);                                   // base plate
      const lc = kotak(g, 0.75, 0.35, 0.75, new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.3, roughness: 0.5 }), x, yH - 0.75, -y);
      klik(lc, `INST:${i}:WE-${n}03${"ABCD"[k]}`); S.lc.push(lc);
      kotak(g, 0.9, 0.3, 0.9, baja, x, yH - 0.4, -y);
      const [x2, y2] = pol(R + 0.35, d + 90);
      if (d !== 135) { batang(g, V3(x, 0.4, -y), V3(x2, yH - 1.2, -y2), 0.09, baja); batang(g, V3(x2, 0.4, -y2), V3(x, yH - 1.2, -y), 0.09, baja); }
    });
    // platform atap + handrail kuning
    const kuning = M(0xfacc15, { metalness: 0.2, roughness: 0.5 });
    const plat = new THREE.Mesh(new THREE.RingGeometry(R + 0.05, R + 1.0, 64), M(0x475569, { side: THREE.DoubleSide })); plat.rotation.x = -Math.PI / 2; plat.position.y = yTop + 0.05; g.add(plat);
    cincin(g, R + 0.95, 0.045, kuning, yTop + 1.1); cincin(g, R + 0.95, 0.035, kuning, yTop + 0.6);
    for (let d = 0; d < 360; d += 15) { const [x, y] = pol(R + 0.95, d); batang(g, V3(x, yTop, -y), V3(x, yTop + 1.1, -y), 0.035, kuning, 5); }
    // tangga + cage di sisi barat (270°)
    const [lx] = pol(R + 0.55, 270), tg = new THREE.Group(); tg.position.set(lx - 0.15, 0, 0); g.add(tg);
    [-0.25, 0.25].forEach((z) => batang(tg, V3(0, 0, z), V3(0, yTop + 1.1, z), 0.04, kuning, 5));
    const nAnak = Math.floor(yTop / 0.35), anak = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), kuning, nAnak), m4 = new THREE.Matrix4(), rx = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    for (let k = 0; k < nAnak; k++) { m4.makeTranslation(0, 0.3 + k * 0.35, 0).multiply(rx); anak.setMatrixAt(k, m4); } tg.add(anak);
    const nCage = Math.floor((yTop - 3) / 1.1), cage = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.025, 4, 16, Math.PI), kuning, nCage);
    const rz = new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    for (let k = 0; k < nCage; k++) { m4.makeTranslation(-0.05, 3 + k * 1.1, 0).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)); cage.setMatrixAt(k, m4); } tg.add(cage);
    [[-0.45, 0], [0.35, 0.3], [0.35, -0.3]].forEach(([x, z]) => batang(tg, V3(x - 0.05, 3, z), V3(x - 0.05, yTop + 1.1, z), 0.02, kuning, 4));
    // instrumen di atap
    const tAtap = (r) => yTop + G.roof * (1 - r / (R + 0.12));
    const sc = new THREE.Group(); sc.position.set(0, yRoof, 0); g.add(sc);
    tabung(sc, 0.32, 0.32, 0.5, M(0xe2e8f0), 0, -0.1, 0, 16); const kubah = bola(sc, 0.32, M(0x0e7490, { metalness: 0.2 }), 0, 0.4, 0, 16); kubah.scale.y = 0.6;
    klik(sc, `INST:${i}:LS-${n}01`);
    const [rx1, ry1] = pol(CONFIG.posRadar.r, CONFIG.posRadar.sudut), rd = new THREE.Group(); rd.position.set(rx1, tAtap(CONFIG.posRadar.r), -ry1); g.add(rd);
    tabung(rd, 0.16, 0.16, 0.45, M(0x94a3b8), 0, 0, 0, 12); kotak(rd, 0.32, 0.32, 0.42, M(0x1d4ed8), 0, 0.45, 0); klik(rd, `INST:${i}:LT-${n}02`);
    const [tx, ty] = pol(CONFIG.posTT.r, CONFIG.posTT.sudut);
    batang(g, V3(tx, tAtap(CONFIG.posTT.r) + 0.3, -ty), V3(tx, E + CONFIG.tinggiTT[0] - 0.4, -ty), 0.025, M(0x94a3b8), 5);
    kotak(g, 0.3, 0.3, 0.3, M(0xf97316), tx, tAtap(CONFIG.posTT.r), -ty);
    S.tt = CONFIG.tinggiTT.map((h, k) => { const b = bola(g, 0.12, new THREE.MeshBasicMaterial({ color: 0x22c55e }), tx, E + h, -ty, 10); klik(b, `INST:${i}:TT-${n}1${k + 1}`); return b; });
    const [lsx, lsy] = pol(R + 0.18, 90); const lsh = kotak(g, 0.3, 0.3, 0.3, M(0x7c3aed), lsx, E + CONFIG.tinggiLSH, -lsy); klik(lsh, `INST:${i}:LSH-${n}21`);
    const rl = G.r0 + ((R - G.r0) * CONFIG.tinggiLSL) / G.Hh, [llx, lly] = pol(rl + 0.18, 270); const lsl = kotak(g, 0.3, 0.3, 0.3, M(0x7c3aed), llx, E + CONFIG.tinggiLSL, -lly); klik(lsl, `INST:${i}:LSL-${n}22`);
    const [px1, py1] = pol(R * 0.7, 300); kotak(g, 0.35, 0.35, 0.35, M(0x0891b2), px1, tAtap(R * 0.7), -py1);                      // PT / AT di atap
    S.lampuLS = lampu(g, 0, yRoof + 0.75, 0, `LS${i}`, 0.12);
    // papan nama
    S.papan = papan(g, CONFIG.silo[i][0], 0, yTop - 2.2, R + 0.05, 0, 5.2, "#0e7490", { clippingPlanes: [] });
    // badan batu bara
    const P = geoPolar(26, 72); S.P = P;
    S.atas = new THREE.Mesh(P.geo, matCoal); S.band = new THREE.Mesh(P.bGeo, matCoal);
    const cg = new THREE.Group(); cg.position.y = E; g.add(cg); cg.add(S.atas, S.band); S.cg = cg;
    S.atas.receiveShadow = true;
    klik(S.atas, "SILO:" + i); klik(S.band, "SILO:" + i); klik(shell, "SILO:" + i); klik(hop, "SILO:" + i); klik(atap, "SILO:" + i);
    // bongkahan batu bara
    const NB = 160; S.bongkah = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.45, metalness: 0.35, flatShading: true }), NB);
    S.bData = Array.from({ length: NB }, () => { const r = Math.sqrt(Math.random()) * R * 0.94, d = Math.random() * 360, [x, y] = pol(r, d); return { x, y, s: acak(0.5, 1.6), rx: acak(0, 6), ry: acak(0, 6) }; });
    cg.add(S.bongkah);
    // pin MAX / MIN
    S.pinMax = pin(cg, 0xef4444); S.pinMin = pin(cg, 0x3b82f6);
    // beam scanner & point cloud
    S.beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(S.beam);
    const NP = 700; S.ptPos = new Float32Array(NP * 3); S.ptXY = [];
    for (let k = 0; k < NP; k++) { const t = k / NP, r = Math.sqrt((k * 0.618034) % 1) * R * 0.95, d = t * 360 * 1 + ((k * 137.5) % 360) * 0; S.ptXY.push(pol(r, (k * 137.508) % 360).concat([((k * 137.508) % 360) / 360])); }
    S.ptXY.sort((a, b) => a[2] - b[2]);
    const pg = new THREE.BufferGeometry(); S.ptAttr = new THREE.BufferAttribute(S.ptPos, 3); pg.setAttribute("position", S.ptAttr); S.ptGeo = pg;
    S.titik = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false })); cg.add(S.titik);
    // aliran material masuk (filling stream)
    const NF = 46; S.jatuh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: 0x232428, roughness: 0.6 }), NF); S.jatuhF = Array.from({ length: NF }, () => [Math.random(), acak(-0.25, 0.25), acak(-0.25, 0.25)]);
    cg.add(S.jatuh);
    // label
    S.lbl = label(CONFIG.silo[i][1], V3(cx, yRoof + 4.2, 0), () => { const v = SIM.S.silo[i].v; return v.pct == null ? "" : `${fmt(v.pct, 1)} % · ${fmt(v.berat, 1)} t · ${fmt(v.Tmax, 1)} °C`; }, "SILO:" + i, "lbl-silo"); S.lbl.silo = i;
    S.lblMax = label("▲ MAX", V3(), () => "", null, "lbl-pin lbl-max"); S.lblMin = label("▼ MIN", V3(), () => "", null, "lbl-pin lbl-min");
    S.lblMax.tampil = S.lblMin.tampil = () => tampilPin && (i === sel || orbit.r < 90) && S.cg.visible;
    S.lblMax.fn = () => (SIM.ST[i] ? fmt(SIM.ST[i].max, 2) + " m" : ""); S.lblMin.fn = () => (SIM.ST[i] ? fmt(SIM.ST[i].min, 2) + " m" : "");
    ref.silo.push(S);
  }
  function pin(p, warna) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: warna });
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 12), m); k.rotation.x = Math.PI; k.position.y = 0.3; g.add(k);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), m); t.position.y = 1.5; g.add(t);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), m); b.position.y = 2.75; g.add(b);
    p.add(g); return g;
  }

  /* ---------------- KONVEYOR (belt bertekstur, beranimasi) ---------------- */
  function konveyor(tag, a, b, lebar = 1.2, kaki = true, tutup = false) {
    const d = V3().subVectors(b, a), L = d.length(), g = new THREE.Group(); g.position.copy(a).addScaledVector(d, 0.5);
    g.quaternion.setFromUnitVectors(V3(1, 0, 0), d.clone().normalize()); scene.add(g);
    const tex = texBelt(true); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(L / 2.4, 1);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, lebar), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); belt.position.y = 0.35; g.add(belt);
    const fr = M(0x334155, { metalness: 0.5 });
    [-1, 1].forEach((s) => { const st = new THREE.Mesh(new THREE.BoxGeometry(L, 0.32, 0.08), fr); st.position.set(0, 0.2, (s * (lebar + 0.16)) / 2); g.add(st); });
    if (tutup) { const h = new THREE.Mesh(new THREE.CylinderGeometry(lebar * 0.62, lebar * 0.62, L, 16, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); h.rotation.z = Math.PI / 2; h.rotation.y = Math.PI / 2; h.rotation.set(Math.PI / 2, 0, Math.PI / 2); h.position.y = 0.4; g.add(h); }
    if (kaki) for (let s = 2; s < L - 1; s += 4.5) { const p = V3().copy(a).addScaledVector(d.clone().normalize(), s); if (p.y > 0.8) { batang(scene, V3(p.x, 0, p.z + lebar * 0.6), V3(p.x, p.y, p.z + lebar * 0.6), 0.07, fr, 5); batang(scene, V3(p.x, 0, p.z - lebar * 0.6), V3(p.x, p.y, p.z - lebar * 0.6), 0.07, fr, 5); } }
    klik(g, "EQ:" + tag);
    ref.belt[tag] = { tex, L, arah: 1 };
    return g;
  }

  /* ---------------- RECEIVING: truck hopper, BFD-001, CV-001, BE-001 ---------------- */
  function receiving() {
    const x0 = -92;
    // truck hopper (pit) + grizzly
    const hp = new THREE.Group(); hp.position.set(x0, 0, 0); scene.add(hp);
    kotak(hp, 7.5, 0.6, 7.5, M(0x475569), 0, 0, 0);
    const corong = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 0.9, 3.0, 4, 1, true), M(0x64748b, { side: THREE.DoubleSide })); corong.rotation.y = Math.PI / 4; corong.position.y = 1.9; hp.add(corong);
    kotak(hp, 6.8, 0.1, 6.8, M(0x1f2937, { wireframe: true }), 0, 3.35, 0);
    ref.timbun = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 20), matCoal); ref.timbun.position.y = 2.3; hp.add(ref.timbun);
    papan(hp, "TRUCK HOPPER · 140 t", 0, 5.2, 3.9, 0, 6, "#155e75");
    klik(hp, "EQ:BFD-001");
    // belt feeder
    konveyor("BFD-001", V3(x0 - 1.5, 0.4, 0), V3(x0 + 4.5, 0.4, 0), 1.4, false);
    lampu(scene, x0 + 4.5, 1.5, 1.3, "BFD-001");
    // truk
    ref.truk = truk(); ref.truk.position.set(x0 - 11, 0, 0);
    // CV-001 miring ke boot bucket elevator
    konveyor("CV-001", V3(x0 + 4.5, 0.9, 0), V3(-53.6, 5.2, 0), 1.2, true, true);
    lampu(scene, -70, 4.6, 1.2, "CV-001");
    // bucket elevator
    const be = new THREE.Group(); be.position.set(-52, 0, 0); scene.add(be);
    kotak(be, 2.4, 2, 2.0, M(0x334155), 0, 0, 0);
    kotak(be, 1.6, GAL + 3.2, 0.9, M(0x0e7490, { metalness: 0.4 }), -0.45, 0, 0.0);
    const tex = texGaris(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 30);
    const rantai = new THREE.Mesh(new THREE.BoxGeometry(0.7, GAL + 2.5, 0.7), new THREE.MeshStandardMaterial({ map: tex })); rantai.position.set(0.55, (GAL + 2.5) / 2 + 0.8, 0); be.add(rantai);
    ref.belt["BE-001"] = { tex, L: 1, arah: -1, vert: true };
    kotak(be, 2.6, 2.4, 1.8, M(0x155e75, { metalness: 0.4 }), 0.2, GAL + 2.2, 0);
    for (let y = 8; y < GAL; y += 8) { kotak(be, 3.4, 0.15, 3.0, M(0x475569), 0.3, y, 0); }
    papan(be, "BE-001 BUCKET ELEVATOR", 0, GAL + 5.4, 0, 0, 7, "#155e75");
    lampu(be, 1.6, GAL + 3.6, 0.9, "BE-001");
    klik(be, "EQ:BE-001");
  }
  function truk() {
    const t = new THREE.Group(); scene.add(t);
    kotak(t, 9, 0.5, 2.5, M(0x1f2937), 0, 0.9, 0);
    kotak(t, 2.4, 2.4, 2.5, M(0xf59e0b, { metalness: 0.3 }), -3.4, 1.3, 0);
    kotak(t, 0.1, 0.9, 2.1, M(0x0f172a, { metalness: 0.8, roughness: 0.2 }), -4.62, 2.5, 0);
    const bak = new THREE.Group(); bak.position.set(4.3, 1.45, 0); t.add(bak);
    kotak(bak, 6, 1.7, 2.5, M(0xb45309, { metalness: 0.3 }), -3, 0, 0);
    kotak(bak, 5.8, 0.3, 2.3, matCoal, -3, 1.55, 0);
    [-3.4, 1.2, 2.8].forEach((x) => [-1.15, 1.15].forEach((z) => { const w = tabung(t, 0.55, 0.55, 0.45, M(0x111827), x, 0.55, z, 14); w.rotation.x = Math.PI / 2; w.position.y = 0.55; }));
    ref.bak = bak;
    return t;
  }

  /* ---------------- GALERI CV-002 + diverter + chute ---------------- */
  function galeri() {
    const x1 = -51, x2 = 42, L = x2 - x1, cx = (x1 + x2) / 2, zc = -0.52;
    const g = new THREE.Group(); g.position.set(cx, GAL, zc); scene.add(g);
    kotak(g, L, 0.2, 3.0, M(0x334155), 0, 0, 0);
    const kaca = new THREE.MeshStandardMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide, metalness: 0.2, roughness: 0.2 });
    [-1.5, 1.5].forEach((z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.5), kaca); p.position.set(0, 1.45, z); g.add(p); });
    const atap = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, 3.2), new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.25, depthWrite: false, metalness: 0.5 })); atap.position.y = 2.75; g.add(atap);
    const fr = M(0x64748b, { metalness: 0.6 });
    for (let x = -L / 2; x <= L / 2 + 0.01; x += 3.1) [-1.5, 1.5].forEach((z) => batang(g, V3(x, 0.1, z), V3(x, 2.7, z), 0.06, fr, 5));
    [0.1, 2.7].forEach((y) => [-1.5, 1.5].forEach((z) => batang(g, V3(-L / 2, y, z), V3(L / 2, y, z), 0.07, fr, 5)));
    for (let x = -L / 2; x < L / 2 - 1; x += 6.2) [-1.5, 1.5].forEach((z) => batang(g, V3(x, 0.15, z), V3(x + 3.1, 2.65, z), 0.04, fr, 4));
    papan(scene, "CV-002 SILO TOP DISTRIBUTION CONVEYOR", -40, GAL + 3.8, zc + 1.6, 0, 11, "#155e75");
    // belt di dalam galeri
    konveyor("CV-002", V3(x1 + 0.5, GAL - 0.05, zc), V3(x2 - 0.5, GAL - 0.05, zc), 1.1, false);
    lampu(scene, x1 + 3, GAL + 0.9, zc + 1.2, "CV-002");
    // kaki galeri di atap silo
    SX.forEach((sx, i) => {
      [-2.6, 2.6].forEach((dx) => [-1.3, 1.3].forEach((dz) => batang(scene, V3(sx + dx, yTop + 0.3, zc + dz), V3(sx + dx, GAL, zc + dz), 0.09, fr, 5)));
      // diverter + transfer chute ke inlet
      const [ix, iy] = pol(CONFIG.posInlet.r, CONFIG.posInlet.sudut), yIn = yTop + G.roof * (1 - CONFIG.posInlet.r / (G.R + 0.12));
      const dv = kotak(scene, 1.3, 0.9, 1.3, M(0x0e7490, { metalness: 0.4 }), sx + ix, GAL - 0.75, -iy); klik(dv, `SEQ:${i}:DV`);
      tabung(scene, 0.32, 0.32, GAL - 0.75 - yIn, M(0x94a3b8), sx + ix, yIn, -iy, 12);
      lampu(scene, sx + ix + 0.75, GAL - 0.3, -iy + 0.7, `DV${i}`, 0.18);
    });
    // menara penyangga dekat BE
    [-49, -46].forEach((x) => [-1.9, 0.9].forEach((z) => batang(scene, V3(x, 0, z), V3(x, GAL, z), 0.14, fr, 6)));
  }

  /* ---------------- DUST COLLECTOR & BAG FILTER ---------------- */
  function dust() {
    const zD = 2.4, yD = GAL + 0.8;
    const duct = M(0x9ca3af, { metalness: 0.5, roughness: 0.4 });
    SX.forEach((sx) => { const [vx, vy] = pol(2.4, 150), yv = yTop + G.roof * (1 - 2.4 / (G.R + 0.12)); batang(scene, V3(sx + vx, yv, -vy), V3(sx + vx, yD, -vy), 0.22, duct, 10); batang(scene, V3(sx + vx, yD, -vy), V3(sx + vx, yD, zD), 0.22, duct, 10); });
    batang(scene, V3(SX[0] + 1.2, yD, zD), V3(48, yD, zD), 0.32, duct, 12);
    batang(scene, V3(48, yD, zD), V3(48, 14.5, zD), 0.32, duct, 12);
    const bf = new THREE.Group(); bf.position.set(50, 0, zD); scene.add(bf);
    [-1.4, 1.4].forEach((x) => [-1.4, 1.4].forEach((z) => kotak(bf, 0.3, 7, 0.3, M(0x475569), x, 0, z)));
    const hop = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 0.4, 2.6, 4, 1), M(0x64748b)); hop.rotation.y = Math.PI / 4; hop.position.y = 8.3; bf.add(hop);
    kotak(bf, 3.2, 6, 3.2, M(0x0e7490, { metalness: 0.4 }), 0, 9.6, 0);
    kotak(bf, 3.4, 1.2, 3.4, M(0x155e75), 0, 15.6, 0);
    papan(bf, "BF-001 BAG FILTER", 0, 13, 1.65, 0, 4.8, "#0f766e");
    klik(bf, "EQ:BF-001"); lampu(bf, 1.75, 16.2, 1.75, "BF-001");
    // rotary airlock di bawah hopper bag filter → kembali ke CV-003
    tabung(bf, 0.3, 0.3, 0.7, M(0x334155), 0, 6.6, 0, 12);
    // kipas DC-001 + cerobong
    const fan = new THREE.Group(); fan.position.set(56, 0, zD); scene.add(fan);
    kotak(fan, 3.4, 0.4, 2.6, M(0x334155), 0, 0, 0);
    const vol = tabung(fan, 1.25, 1.25, 0.9, M(0x0891b2, { metalness: 0.4 }), 0, 0.4, 0, 24); vol.rotation.x = Math.PI / 2; vol.position.y = 1.7;
    kotak(fan, 1.3, 1.1, 1.0, M(0x1d4ed8), 1.8, 0.4, 0);
    tabung(fan, 0.45, 0.5, 20, M(0x9ca3af), -0.9, 0.4, 0, 16);
    batang(scene, V3(50, 17, zD), V3(52, 17.8, zD), 0.3, duct, 10); batang(scene, V3(52, 17.8, zD), V3(56, 17.8, zD), 0.3, duct, 10); batang(scene, V3(56, 17.8, zD), V3(56, 2.6, zD), 0.3, duct, 10);
    papan(fan, "DC-001 DUST COLLECTOR FAN", 0, 4.6, 1.5, 0, 5.4, "#0f766e");
    ref.kipas = vol; klik(fan, "EQ:DC-001"); lampu(fan, 1.8, 2.0, 0.6, "DC-001");
  }

  /* ---------------- DISCHARGE: gate, rotary valve, screw, CV-003 ---------------- */
  function discharge() {
    ref.rv = []; ref.screw = [];
    SX.forEach((sx, i) => {
      const xv = kotak(scene, 1.1, 0.5, 1.1, M(0x475569), sx, E - 1.1, 0); klik(xv, `SEQ:${i}:XV`);
      const lx = kotak(scene, 0.6, 0.25, 0.25, M(0xf59e0b), sx + 0.85, E - 0.95, 0); klik(lx, `SEQ:${i}:XV`);
      const tex = texGaris(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
      const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.0, 20), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.4 })); rv.rotation.z = Math.PI / 2; rv.position.set(sx, E - 1.75, 0); scene.add(rv); klik(rv, `SEQ:${i}:RV`);
      kotak(scene, 0.6, 0.55, 0.55, M(0x1d4ed8), sx - 0.85, E - 2.05, 0); ref.rv.push({ m: tex, i });
      const ts = texGaris(); ts.wrapS = ts.wrapT = THREE.RepeatWrapping; ts.repeat.set(1, 6);
      const sc = batang(scene, V3(sx, E - 2.5, 0), V3(sx, E - 2.5, 5.6), 0.38, new THREE.MeshStandardMaterial({ map: ts, metalness: 0.3, color: 0xb6c2d1 }), 16); klik(sc, `SEQ:${i}:SC`);
      kotak(scene, 0.7, 0.6, 0.7, M(0x1d4ed8), sx, E - 2.8, -0.9); ref.screw.push({ m: ts, i });
      tabung(scene, 0.3, 0.3, 0.9, M(0x94a3b8), sx, 1.6, 5.8, 10);
      lampu(scene, sx + 0.9, E - 0.6, 0.7, `XV${i}`, 0.16); lampu(scene, sx + 0.7, E - 1.3, 0.7, `RV${i}`, 0.16); lampu(scene, sx + 0.6, E - 2.1, 3, `SC${i}`, 0.16);
    });
    konveyor("CV-003", V3(-36, 1.1, 6), V3(62, 1.1, 6), 1.2, false, true);
    konveyor("CV-003", V3(62, 1.1, 6), V3(80, 9.5, 6), 1.2, true, true);
    lampu(scene, -34, 2.0, 7.2, "CV-003");
    papan(scene, "CV-003 DISCHARGE CONVEYOR → BOILER", 0, 3.2, 7.4, 0, 9, "#b45309");
  }
  function boiler() {
    const b = new THREE.Group(); b.position.set(88, 0, 6); scene.add(b);
    kotak(b, 14, 16, 14, M(0x1e293b, { metalness: 0.2 }), 0, 0, 0);
    kotak(b, 14.4, 0.6, 14.4, M(0x0e7490), 0, 16, 0);
    for (let y = 2; y < 15; y += 3.2) for (let z = -5; z <= 5; z += 2.5) kotak(b, 0.1, 1.4, 1.6, M(0x67e8f9, { emissive: 0x0e7490, emissiveIntensity: 0.4 }), -7.05, y, z);
    tabung(b, 0.9, 1.1, 30, M(0x9ca3af), 4, 16, -4, 18);
    papan(b, "BOILER COAL BUNKER", -7.1, 18, 0, -Math.PI / 2, 9, "#b45309");
  }

  /* ---------------- PANAH ALIRAN (filling / discharge / dust) ---------------- */
  const jalur = [];
  function rute(pts, warna, aktifFn, rapat = 2.2, atas = pts.some((q) => q[1] > yTop)) {
    const seg = []; let L = 0;
    for (let k = 0; k < pts.length - 1; k++) { const a = V3(...pts[k]), b = V3(...pts[k + 1]), l = a.distanceTo(b); seg.push({ a, b, s: L, L: l, q: new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3().subVectors(b, a).normalize()) }); L += l; }
    const N = Math.max(3, Math.round(L / rapat));
    const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.26, 0.7, 10), new THREE.MeshBasicMaterial({ color: warna, transparent: true, opacity: 0.95 }), N); im.frustumCulled = false; scene.add(im);
    jalur.push({ seg, L, N, im, aktifFn, atas, fase: Math.random() });
  }
  function panahAliran() {
    const S = () => SIM.S, run = (t) => S().alat[t].st === "RUN";
    const [ix, iy] = pol(CONFIG.posInlet.r, CONFIG.posInlet.sudut), yIn = yTop + G.roof * (1 - CONFIG.posInlet.r / (G.R + 0.12));
    rute([[-92, 3.2, 0], [-92, 1.4, 0], [-87.5, 1.5, 2.2 - 2.2], [-53.6, 6.6, 0], [-52.6, 6.6, 0], [-52.6, GAL + 3.5, 0], [-50, GAL + 1.1, -0.52]], 0x22d3ee, () => S().silo.some((s) => s.qin > 0));
    SX.forEach((sx, i) => {
      rute([[-50, GAL + 1.1, -0.52], [sx + ix, GAL + 1.1, -0.52], [sx + ix, GAL + 0.6, -iy], [sx + ix, yIn - 0.2, -iy]], 0x22d3ee, () => S().silo[i].qin > 0);
      rute([[sx, E - 0.2, 0.9], [sx, E - 2.5, 0.9], [sx, E - 1.7, 1.2], [sx, E - 1.7, 5.6], [sx, 2.0, 6.6]], 0xf59e0b, () => S().silo[i].qout > 0, 1.6);
      const [vx, vy] = pol(2.4, 150); rute([[sx + vx, yTop + 1.2, -vy], [sx + vx, GAL + 1.6, -vy], [sx + vx, GAL + 1.6, 3.0]], 0xa3b1c6, () => run("DC-001"), 2.4);
    });
    rute([[-35, 2.4, 6.9], [62, 2.4, 6.9], [80, 10.8, 6.9]], 0xf59e0b, () => S().silo.some((s) => s.qout > 0), 3);
    rute([[SX[0] + 1.2, GAL + 1.6, 3.1], [48, GAL + 1.6, 3.1], [48, 15.5, 3.1]], 0xa3b1c6, () => run("DC-001"), 3);
  }
  function updateAliran(dt) {
    const m = new THREE.Matrix4(), p = V3(), sk = V3(1, 1, 1);
    jalur.forEach((r) => {
      const on = tampilAliran && r.aktifFn() && (!r.atas || ref.gGal.visible); r.im.visible = on; if (!on) return;
      r.fase = (r.fase + dt * 3 / r.L) % 1;
      for (let k = 0; k < r.N; k++) {
        const s = ((k / r.N + r.fase) % 1) * r.L, sg = r.seg.find((x) => s >= x.s && s <= x.s + x.L) || r.seg[r.seg.length - 1];
        p.copy(sg.a).lerp(sg.b, (s - sg.s) / sg.L); m.compose(p, sg.q, sk); r.im.setMatrixAt(k, m);
      }
      r.im.instanceMatrix.needsUpdate = true;
    });
  }

  /* =====================================================
     UPDATE BADAN BATU BARA & INSTRUMEN
     ===================================================== */
  const dummy = () => new THREE.Object3D();
  let obj3;
  function updateSilo(S) {
    const i = S.i, s = SIM.S.silo[i], v = s.v, st = SIM.ST[i], Z = SIM.Z[i];
    if (!st) return;
    isiPolar(S.P, Z, st, 1, 0, kontur);
    S.atas.material = kontur ? matKontur : matCoal; S.band.material = matCoal;
    // bongkahan
    S.bongkah.visible = !kontur;
    if (!kontur) { obj3 = obj3 || dummy(); S.bData.forEach((b, k) => { obj3.position.set(b.x, KONTUR.sampel(Z, b.x, b.y) + 0.04, -b.y); obj3.rotation.set(b.rx, b.ry, 0); obj3.scale.setScalar(b.s); obj3.updateMatrix(); S.bongkah.setMatrixAt(k, obj3.matrix); }); S.bongkah.instanceMatrix.needsUpdate = true; }
    // pin
    S.pinMax.position.set(st.posMax[0], st.max, -st.posMax[1]); S.pinMin.position.set(st.posMin[0], st.min, -st.posMin[1]);
    S.lblMax.pos.set(SX[i] + st.posMax[0], E + st.max + 3.2, -st.posMax[1]); S.lblMin.pos.set(SX[i] + st.posMin[0], E + st.min + 3.2, -st.posMin[1]);
    // level ring
    S.ringLevel.position.y = E + Math.max(G.Hh, v.hAvg || 0);
    const sts = ALARM.statusSilo(i).w; S.ringLevel.material.color.setHex({ green: 0x22c55e, yellow: 0xfacc15, red: 0xef4444, grey: 0x9ca3af }[sts]);
    // titik scan (posisi)
    S.ptXY.forEach(([x, y], k) => { S.ptPos[k * 3] = x; S.ptPos[k * 3 + 1] = KONTUR.sampel(Z, x, y) + 0.08; S.ptPos[k * 3 + 2] = -y; }); S.ptAttr.needsUpdate = true;
  }
  const warnaSt = { RUN: 0x22c55e, STOP: 0x6b7280, FAULT: 0xef4444, MAINT: 0xf59e0b };
  function warnaTemp(t) { return t >= CONFIG.batas.tempHH ? 0xef4444 : t >= CONFIG.batas.tempH ? 0xf97316 : t >= 42 ? 0xfacc15 : 0x22c55e; }

  /* =====================================================
     KAMERA & KONTROL
     ===================================================== */
  const orbit = { theta: 1.2, phi: 1.12, r: 175, target: V3(-4, 14, 0), goal: null, auto: false };
  const pusat = () => V3(SX[sel], E + G.Hfill / 2, 0);
  const VIEW = {
    Plant: () => [1.2, 1.12, 175, V3(-4, 14, 0)], Isometric: () => [1.3, 1.0, 64, pusat()], Front: () => [Math.PI / 2, 1.5, 66, pusat()],
    Side: () => [0, 1.5, 66, pusat()], Top: () => [Math.PI / 2, 0.04, 58, pusat()], Cutaway: () => [1.25, 1.08, 56, pusat()],
    Receiving: () => [1.0, 1.05, 75, V3(-70, 12, 0)], Discharge: () => [1.35, 1.25, 70, V3(SX[sel], 3, 3)], "Dust System": () => [0.6, 1.1, 70, V3(40, 20, 2)],
  };
  let vista = "Plant";
  function ke(nama) {
    vista = nama; const p = VIEW[nama](); if (ref.gGal) ref.gGal.visible = !(nama === "Top" || nama === "Cutaway"); orbit.goal = { theta: p[0], phi: p[1], r: p[2], target: p[3] };
    setCutaway(nama === "Cutaway" ? true : cutaway && nama !== "Plant" ? cutaway : false);
  }
  function setCutaway(x) {
    cutaway = x; const pl = x ? [clip] : [];
    ref.shellMat.forEach((m) => { m.clippingPlanes = pl; m.needsUpdate = true; });
    ref.silo.forEach((S) => { S.papan.material.clippingPlanes = pl; });
  }
  function pasangKontrol(el) {
    let drag = null, px = 0, py = 0, pinch = 0, pindah = 0;
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("pointerdown", (e) => { drag = e.button === 2 || e.shiftKey ? "pan" : "rot"; px = e.clientX; py = e.clientY; pindah = 0; el.setPointerCapture(e.pointerId); orbit.goal = null; });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; pindah += Math.abs(dx) + Math.abs(dy);
      if (drag === "rot") { orbit.theta += dx * 0.006; orbit.phi = Math.max(0.03, Math.min(1.55, orbit.phi - dy * 0.005)); }
      else { const k = orbit.r * 0.0017; const ka = V3(-Math.sin(orbit.theta), 0, Math.cos(orbit.theta)); orbit.target.addScaledVector(ka, -dx * k); orbit.target.y = Math.max(0, orbit.target.y + dy * k); }
    });
    el.addEventListener("pointerup", (e) => { if (drag && pindah < 5) klikObjek(e); drag = null; });
    el.addEventListener("wheel", (e) => { e.preventDefault(); orbit.goal = null; orbit.r = Math.max(8, Math.min(420, orbit.r * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
    el.addEventListener("touchmove", (e) => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) orbit.r = Math.max(8, Math.min(420, orbit.r * (pinch / d))); pinch = d; } }, { passive: true });
    el.addEventListener("touchend", () => (pinch = 0));
  }
  const ray = new THREE.Raycaster();
  function klikObjek(e) {
    const b = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - b.left) / b.width) * 2 - 1, y: -((e.clientY - b.top) / b.height) * 2 + 1 }, camera);
    const tampak = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const hit = ray.intersectObjects(klikables.filter(tampak), false)[0];
    if (hit && hit.object.userData.kunci) onPilih(hit.object.userData.kunci);
  }

  /* =====================================================
     FRAME
     ===================================================== */
  let tLalu = performance.now(), tLabel = 0;
  SIM.dengar((e) => { if (e.jenis === "tick") kotor = true; });
  function animasiSilo(dt, now, kedip) {
    const SS = SIM.S;
    ref.silo.forEach((S) => {
      const i = S.i, s = SS.silo[i], v = s.v;
      // badan batu bara ikut transparan/solid
      S.cg.visible = transparan || cutaway;
      // beam scanner & point cloud saat SCANNING
      const scan = v.scanSt === "SCANNING", prog = (v.scanProg || 0) / 100;
      S.beam.visible = scan && S.cg.visible;
      if (S.beam.visible) { const top = yRoof + 0.2, bot = E + (v.hAvg || 10); S.beam.scale.set(G.R * 0.93, top - bot, G.R * 0.93); S.beam.position.y = (top + bot) / 2; S.beam.rotation.y = now / 500; S.beam.material.opacity = 0.06 + 0.06 * Math.abs(Math.sin(now / 180)); }
      const nPt = scan ? Math.floor(prog * S.ptXY.length) : v.scanSt === "IDLE" && SS.t - (v.scanLast || 0) < 8000 ? S.ptXY.length : 0;
      S.titik.visible = nPt > 0 && S.cg.visible; S.ptGeo.setDrawRange(0, nPt);
      S.lampuLS.material.color.setHex(v.scanSt === "COMM FAIL" ? (kedip ? 0xef4444 : 0x450a0a) : scan ? (kedip ? 0x22d3ee : 0x0e7490) : 0x22c55e);
      // aliran masuk
      S.jatuh.visible = s.qin > 0 && S.cg.visible;
      if (S.jatuh.visible) {
        obj3 = obj3 || dummy(); const [ix, iy] = pol(CONFIG.posInlet.r, CONFIG.posInlet.sudut), atas = G.Hshell + 0.8, bawah = KONTUR.sampel(SIM.Z[i], ix, iy);
        S.jatuhF.forEach((f, k) => { f[0] = (f[0] + dt * 0.9) % 1; obj3.position.set(ix + f[1] * (1 + f[0]), atas - (atas - bawah) * f[0] * f[0], -iy + f[2] * (1 + f[0])); obj3.rotation.set(f[0] * 9, f[1] * 9, 0); obj3.scale.setScalar(1); obj3.updateMatrix(); S.jatuh.setMatrixAt(k, obj3.matrix); });
        S.jatuh.instanceMatrix.needsUpdate = true;
      }
      // pin, load cell, sensor suhu
      S.pinMax.visible = S.pinMin.visible = tampilPin && S.cg.visible;
      S.lc.forEach((m, k) => m.material.color.setHex(s.f.plc ? 0x9ca3af : s.f.loadcell && k === 2 ? (kedip ? 0xef4444 : 0x450a0a) : 0x22c55e));
      (v.TT || []).forEach((t, k) => S.tt[k].material.color.setHex(s.f.plc ? 0x9ca3af : t.tutup ? warnaTemp(t.v) : 0x38bdf8));
      // lampu peralatan silo
      [["DV", "DV"], ["XV", "XV"], ["RV", "RV"], ["SC", "SC"]].forEach(([k, id]) => { const o = s.eq[k], l = ref.lampu[id + i]; if (l) l.material.color.setHex(o.st === "FAULT" ? (kedip ? 0xef4444 : 0x450a0a) : warnaSt[o.st]); });
    });
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!aktif || !siap || !wadah) return;
    const now = performance.now(), dt = Math.min(0.1, (now - tLalu) / 1000); tLalu = now;
    const SS = SIM.S; if (!SS.silo[0].v.WE) return;
    if (kotor) { kotor = false; ref.silo.forEach(updateSilo); }
    // kamera
    if (orbit.goal) { const g = orbit.goal, k = Math.min(1, dt * 3.2); orbit.theta += (g.theta - orbit.theta) * k; orbit.phi += (g.phi - orbit.phi) * k; orbit.r += (g.r - orbit.r) * k; orbit.target.lerp(g.target, k); if (Math.abs(g.r - orbit.r) < 0.2 && Math.abs(g.theta - orbit.theta) < 0.002 && Math.abs(g.phi - orbit.phi) < 0.002 && orbit.target.distanceTo(g.target) < 0.1) orbit.goal = null; }
    if (orbit.auto) orbit.theta += dt * 0.08;
    camera.position.set(orbit.target.x + orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta), orbit.target.y + orbit.r * Math.cos(orbit.phi), orbit.target.z + orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta));
    camera.lookAt(orbit.target);
    const kedip = Math.sin(now / 250) > 0;
    // belt & peralatan
    for (const t in ref.belt) { const b = ref.belt[t], o = SS.alat[t]; if (o && o.st === "RUN") { if (b.vert) b.tex.offset.y += dt * 0.5 * b.arah; else b.tex.offset.x -= (dt * 1.6) / 2.4; } }
    for (const [t] of CONFIG.alat) { const l = ref.lampu[t], o = SS.alat[t]; if (l) l.material.color.setHex(o.st === "FAULT" ? (kedip ? 0xef4444 : 0x450a0a) : warnaSt[o.st]); }
    if (ref.kipas && SS.alat["DC-001"].st === "RUN") ref.kipas.rotation.y += dt * 12;
    ref.rv.forEach((r) => { if (SS.silo[r.i].eq.RV.st === "RUN") r.m.offset.x += dt * 0.6; });
    ref.screw.forEach((r) => { if (SS.silo[r.i].eq.SC.st === "RUN") r.m.offset.y -= dt * 0.8; });
    // truk & timbunan di hopper
    const sejak = (SS.t - (SS.trukT || 0)) / 60000;
    ref.truk.visible = sejak >= 0 && sejak < 7; ref.bak.rotation.z = sejak < 4 ? Math.min(0.75, Math.sin((sejak / 4) * Math.PI) * 0.9) : 0;
    const st = Math.max(0.05, Math.min(1, SS.stok / 100)); ref.timbun.scale.set(0.4 + st * 0.6, st, 0.4 + st * 0.6); ref.timbun.position.y = 2.0 + st * 0.6;
    animasiSilo(dt, now, kedip); updateAliran(dt);
    renderer.render(scene, camera);
    // label HTML
    if (tampilLabel && now - tLabel > 120) {
      tLabel = now;
      const W = wadah.clientWidth, H = wadah.clientHeight, p = V3();
      labels.forEach((L) => {
        if (!L.tampil()) { L.el.style.display = "none"; return; }
        p.copy(L.pos).project(camera);
        const ok = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
        L.el.style.display = ok ? "" : "none"; if (!ok) return;
        L.el.style.transform = `translate(${((p.x + 1) / 2) * W}px, ${((1 - p.y) / 2) * H}px) translate(-50%, -100%)`;
        const t = L.fn(); if (L.v.textContent !== t) L.v.textContent = t;
        if (L.silo !== undefined) { L.el.dataset.st = ALARM.statusSilo(L.silo).w; L.el.classList.toggle("sel", L.silo === sel); }
      });
    }
  }
  function ukuran() { if (!wadah || !renderer) return; const w = wadah.clientWidth, h = wadah.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  /* ---------------- FOTO / THUMBNAIL silo (render-to-texture) ---------------- */
  let rtFoto = null;
  function foto(i, w = 300, h = 380) {
    siapkan(); if (!siap || typeof renderer.readRenderTargetPixels !== "function") return null;
    if (!SIM.ST[i]) return null;
    if (kotor) { kotor = false; ref.silo.forEach(updateSilo); }
    if (!rtFoto) rtFoto = new THREE.WebGLRenderTarget(w, h);
    const cam = new THREE.PerspectiveCamera(30, w / h, 1, 600); cam.position.set(SX[i] + 30, 33, 52); cam.lookAt(SX[i], 19, 0);
    const vis = ref.silo.map((S) => S.g.visible), cgv = ref.silo.map((S) => S.cg.visible), lbl = lapisLabel ? lapisLabel.style.display : "";
    ref.silo.forEach((S, k) => { S.g.visible = k === i; S.cg.visible = true; });
    const tr = transparan; if (!tr) setTransparan(true, true);
    renderer.setRenderTarget(rtFoto); renderer.render(scene, cam);
    const buf = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rtFoto, 0, 0, w, h, buf); renderer.setRenderTarget(null);
    if (!tr) setTransparan(false, true);
    ref.silo.forEach((S, k) => { S.g.visible = vis[k]; S.cg.visible = cgv[k]; }); if (lapisLabel) lapisLabel.style.display = lbl;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const ctx = c.getContext("2d"), img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0); return c.toDataURL("image/jpeg", 0.86);
  }
  function setTransparan(x, diam) {
    transparan = x; matShell.transparent = x; matShell.opacity = x ? 0.2 : 1; matShell.depthWrite = !x; matShell.color.setHex(x ? 0xc9d4e0 : 0xb8c2cf); matShell.needsUpdate = true;
    if (!diam) SIM.simpanLS("view", { transparan, kontur });
  }
  function siapkan() {
    if (siap || typeof THREE === "undefined") return;
    bangun(); lapisLabel = document.createElement("div"); lapisLabel.className = "lapis-label"; labels.forEach((L) => lapisLabel.appendChild(L.el));
    pasangKontrol(renderer.domElement); requestAnimationFrame(frame); window.addEventListener("resize", ukuran);
    const v = SIM.bacaLS("view", {}); if (v.transparan === false) setTransparan(false, true); if (v.kontur) kontur = true;
  }

  return {
    siapkan,
    pasang(el) {
      if (typeof THREE === "undefined") { el.innerHTML = '<div class="kosong3d">Three.js belum termuat – periksa koneksi internet.</div>'; return; }
      siapkan(); wadah = el; el.prepend(renderer.domElement); el.appendChild(lapisLabel); aktif = true; setTimeout(ukuran, 30); ukuran();
    },
    jeda(x) { aktif = !x; if (!x) setTimeout(ukuran, 30); },
    ke, VIEW, orbit, get vista() { return vista; },
    pilihSilo(i, gerak = true) { sel = i; kotor = true; if (gerak && vista !== "Plant" && VIEW[vista]) ke(vista); },
    get sel() { return sel; },
    setTransparan, get transparan() { return transparan; },
    setKontur(x) { kontur = x; kotor = true; SIM.simpanLS("view", { transparan, kontur }); }, get kontur() { return kontur; },
    setCutaway, get cutaway() { return cutaway; },
    setPin(x) { tampilPin = x; }, setAliran(x) { tampilAliran = x; },
    setLabel(x) { tampilLabel = x; if (lapisLabel) lapisLabel.style.display = x ? "" : "none"; },
    setPilih(f) { onPilih = f; }, foto, ukuran, geoPolar, isiPolar,
    info: () => ({ objek: klikables.length, silo: ref.silo.length, panah: jalur.length }),
  };
})();

/* =========================================================
   PERMUKAAN3D — tampilan "3D Surface" halaman Material Contour Mapping
   (renderer terpisah, skala vertikal bisa dibesarkan, garis kontur, titik scan)
   ========================================================= */
const Permukaan3D = (() => {
  const G = CONFIG.geo;
  let renderer, scene, camera, wadah, lapis, siap = false, aktif = false, P, mesh, band, garis, titik, dinding, pinA, pinB, lblA, lblB, kompas = [], skala = [];
  let sk = 3, tampilGaris = true, tampilTitik = false, idx = 0, kotor = true;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const orbit = { theta: 0.9, phi: 0.95, r: 15, target: V3(0, 1.5, 0), goal: null };
  function bangun() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1.5, 0.1, 500);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 0.75));
    const d = new THREE.DirectionalLight(0xffffff, 0.65); d.position.set(6, 14, 8); scene.add(d);
    P = Silo3D.geoPolar(36, 120);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05, side: THREE.DoubleSide });
    mesh = new THREE.Mesh(P.geo, mat); band = new THREE.Mesh(P.bGeo, mat); scene.add(mesh, band);
    const dasar = new THREE.Mesh(new THREE.CircleGeometry(G.R + 0.4, 64), new THREE.MeshStandardMaterial({ color: 0x0f1d33, side: THREE.DoubleSide })); dasar.rotation.x = -Math.PI / 2; dasar.position.y = -0.02; scene.add(dasar);
    const gr = new THREE.PolarGridHelper(G.R + 0.4, 12, 6, 64, 0x1e4b6b, 0x16324d); gr.position.y = 0; scene.add(gr);
    garis = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); scene.add(garis);
    titik = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.07 })); scene.add(titik);
    dinding = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.45 })); scene.add(dinding);
    const pin = (w) => { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: w }); const k = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 12), m); k.rotation.x = Math.PI; k.position.y = 0.18; g.add(k); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 6), m); t.position.y = 0.9; g.add(t); scene.add(g); return g; };
    pinA = pin(0xef4444); pinB = pin(0x3b82f6);
    lapis = document.createElement("div"); lapis.className = "lapis-label";
    const lb = (t, k) => { const e = document.createElement("div"); e.className = "lbl3d " + k; e.innerHTML = `<div class="lbl-j">${t}</div><div class="lbl-v"></div>`; lapis.appendChild(e); return { el: e, v: e.querySelector(".lbl-v"), pos: V3() }; };
    lblA = lb("▲ MAX", "lbl-pin lbl-max"); lblB = lb("▼ MIN", "lbl-pin lbl-min");
    kompas = ["N", "E", "S", "W"].map((n, k) => { const L = lb(n, "lbl-kompas"); const a = (k * Math.PI) / 2; L.pos.set(Math.sin(a) * (G.R + 0.9), 0.05, -Math.cos(a) * (G.R + 0.9)); return L; });
    skala = [0, 1, 2].map(() => lb("", "lbl-skala"));
    kontrol(renderer.domElement); siap = true; requestAnimationFrame(frame); window.addEventListener("resize", ukuran);
    SIM.dengar((e) => { if (e.jenis === "tick") kotor = true; });
  }
  function update() {
    const Z = SIM.Z[idx], st = SIM.ST[idx]; if (!st) return;
    const dasar = st.min - 0.5, tinggi = (st.max - dasar) * sk;
    Silo3D.isiPolar(P, Z, st, sk, dasar, true, false);
    // garis kontur pada 5 batas pita warna
    const seg = []; for (let q = 1; q < 6; q++) { const L = st.min + ((st.max - st.min) * q) / 6; KONTUR.isoline(Z, L).forEach(([x1, y1, x2, y2]) => seg.push(x1, (L - dasar) * sk + 0.015, -y1, x2, (L - dasar) * sk + 0.015, -y2)); }
    garis.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(seg), 3)); garis.visible = tampilGaris;
    const tp = []; for (let k = 0; k < KONTUR.N ** 2; k++) if (KONTUR.IN[k] && Z[k] - KONTUR.F[k] > 0.02) tp.push(KONTUR.X[k], (Z[k] - dasar) * sk + 0.03, -KONTUR.Y[k]);
    titik.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tp), 3)); titik.visible = tampilTitik;
    const dw = [], R = G.R, H = tinggi + 0.6;
    for (let k = 0; k < 96; k++) { const a = (k / 96) * Math.PI * 2, b = ((k + 1) / 96) * Math.PI * 2; [0, H].forEach((y) => dw.push(Math.sin(a) * R, y, -Math.cos(a) * R, Math.sin(b) * R, y, -Math.cos(b) * R)); }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; dw.push(Math.sin(a) * R, 0, -Math.cos(a) * R, Math.sin(a) * R, H, -Math.cos(a) * R); }
    dinding.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dw), 3));
    pinA.position.set(st.posMax[0], (st.max - dasar) * sk, -st.posMax[1]); pinB.position.set(st.posMin[0], (st.min - dasar) * sk, -st.posMin[1]);
    lblA.pos.set(st.posMax[0], (st.max - dasar) * sk + 1.25, -st.posMax[1]); lblB.pos.set(st.posMin[0], (st.min - dasar) * sk + 1.25, -st.posMin[1]);
    lblA.v.textContent = fmt(st.max, 2) + " m"; lblB.v.textContent = fmt(st.min, 2) + " m";
    [st.min, (st.min + st.max) / 2, st.max].forEach((z, k) => { const L = skala[k]; L.pos.set(-R - 0.1, (z - dasar) * sk, 0); L.el.querySelector(".lbl-j").textContent = fmt(z, 2) + " m"; });
    orbit.target.y = tinggi / 2;
  }
  function kontrol(el) {
    let drag = null, px = 0, py = 0;
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("pointerdown", (e) => { drag = e.button === 2 || e.shiftKey ? "pan" : "rot"; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); orbit.goal = null; });
    el.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; if (drag === "rot") { orbit.theta += dx * 0.008; orbit.phi = Math.max(0.02, Math.min(1.5, orbit.phi - dy * 0.006)); } else { const k = orbit.r * 0.002; orbit.target.x -= dx * k * Math.sin(orbit.theta); orbit.target.z += dx * k * Math.cos(orbit.theta); orbit.target.y += dy * k; } });
    el.addEventListener("pointerup", () => (drag = null));
    el.addEventListener("wheel", (e) => { e.preventDefault(); orbit.r = Math.max(4, Math.min(60, orbit.r * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!aktif || !wadah) return;
    if (kotor) { kotor = false; update(); }
    if (orbit.goal) { const g = orbit.goal; orbit.theta += (g[0] - orbit.theta) * 0.12; orbit.phi += (g[1] - orbit.phi) * 0.12; orbit.r += (g[2] - orbit.r) * 0.12; if (Math.abs(g[2] - orbit.r) < 0.02 && Math.abs(g[0] - orbit.theta) < 0.002 && Math.abs(g[1] - orbit.phi) < 0.002) orbit.goal = null; }
    camera.position.set(orbit.target.x + orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta), orbit.target.y + orbit.r * Math.cos(orbit.phi), orbit.target.z + orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta));
    camera.lookAt(orbit.target);
    renderer.render(scene, camera);
    const W = wadah.clientWidth, H = wadah.clientHeight, p = V3();
    [lblA, lblB, ...kompas, ...skala].forEach((L) => { p.copy(L.pos).project(camera); const ok = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1; L.el.style.display = ok ? "" : "none"; if (ok) L.el.style.transform = `translate(${((p.x + 1) / 2) * W}px, ${((1 - p.y) / 2) * H}px) translate(-50%, -50%)`; });
  }
  function ukuran() { if (!wadah || !renderer) return; const w = wadah.clientWidth, h = wadah.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  return {
    pasang(el) {
      if (typeof THREE === "undefined") { el.innerHTML = '<div class="kosong3d">Three.js belum termuat.</div>'; return; }
      if (!siap) bangun(); wadah = el; el.prepend(renderer.domElement); el.appendChild(lapis); aktif = true; kotor = true; setTimeout(ukuran, 30); ukuran();
    },
    jeda(x) { aktif = !x; if (!x) setTimeout(ukuran, 30); },
    silo(i) { idx = i; kotor = true; }, skala(k) { sk = k; kotor = true; }, garis(x) { tampilGaris = x; kotor = true; }, titik(x) { tampilTitik = x; kotor = true; },
    ke(n) { orbit.goal = { "3D": [0.9, 0.95, 15], Top: [Math.PI / 2, 0.02, 14], Front: [Math.PI / 2, 1.45, 15], Side: [0, 1.45, 15] }[n]; },
    segarkan() { kotor = true; }, ukuran,
  };
})();
