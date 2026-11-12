/* =========================================================
   SCENE3D.JS — KILANG MINYAK 3D (Three.js r128)
   Crude receiving & tank farm · CDU · VDU · HDT · Reformer · FCC · SRU ·
   Hydrogen plant · pipe rack berwarna · boiler · cooling tower · WTP · WWTP ·
   instrument air · nitrogen · gardu listrik · control room · lab & workshop ·
   tangki produk · bola LPG · terminal loading · firewater · flare.
   ANIMASI: api flare (bergoyang, partikel, cahaya) · asap di semua cerobong
   lain (furnace, boiler, FCC, SRU, SMR) mengikuti arah angin simulasi.
   ========================================================= */
const Kilang3D = (() => {
  let renderer, scene, camera, wadah, lapisLabel, sun, hemi, siap = false, aktif = false;
  const klikables = [], labels = [], ref = { lampu: {}, cerobong: [], kipas: [], atap: [], strip: [], jendelaApi: [], lampuMerah: [], truk: [], label: {} };
  let onPilih = () => {};
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const acak = (a, b) => a + Math.random() * (b - a);
  const nilai = (t) => SIM.nilai(t);

  /* ---------------- MATERIAL & BENTUK DASAR ---------------- */
  const cacheM = {};
  function M(warna, o = {}) { const k = warna + JSON.stringify(o); if (!cacheM[k]) cacheM[k] = new THREE.MeshStandardMaterial({ color: warna, roughness: 0.75, metalness: 0.15, ...o }); return cacheM[k]; }
  const asM = (m) => (m && m.isMaterial ? m : M(m));
  function kotak(p, w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), asM(m)); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; }
  function tabung(p, rt, rb, h, m, x, y, z, seg = 20) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), asM(m)); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; }
  function bola(p, r, m, x, y, z, seg = 18) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg / 2 + 2), asM(m)); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; }
  function batang(p, a, b, r, m, seg = 10) {
    const d = V3().subVectors(b, a), L = d.length(); if (L < 0.01) return null;
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), asM(m));
    o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); o.castShadow = true; p.add(o); return o;
  }
  function kanvas(w, h, gambar) { const c = document.createElement("canvas"); c.width = w; c.height = h; gambar(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
  function papan(p, teks, x, y, z, rotY = 0, lebar = 8, warna = "#9a3412") {
    const tex = kanvas(512, 96, (c, w, h) => { c.fillStyle = warna; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.font = "bold 44px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(teks, w / 2, h / 2 + 2, w - 20); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lebar, lebar * 0.1875), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = rotY; p.add(m); return m;
  }
  function klik(obj, kunci) { obj.traverse((o) => { if (o.isMesh) { o.userData.equip = kunci; klikables.push(o); } }); return obj; }
  function grup(x = 0, z = 0, y = 0) { const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g); return g; }
  function lampu(p, x, y, z, id, r = 0.7) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e })); m.position.set(x, y, z); p.add(m); if (id) ref.lampu[id] = m; return m; }
  function label(judul, pos, fn, kunci, kelas = "") {
    const el = document.createElement("div"); el.className = "lbl3d " + kelas; el.innerHTML = `<div class="lbl-j">${judul}</div><div class="lbl-v"></div>`;
    el.onclick = () => kunci && onPilih(kunci);
    const L = { el, pos, fn, v: el.querySelector(".lbl-v"), kelas }; labels.push(L); return L;
  }

  /* ---------------- TEKSTUR ---------------- */
  const texRumput = () => kanvas(256, 256, (c, w, h) => { c.fillStyle = "#5b8a3c"; c.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { c.fillStyle = `hsl(${88 + Math.random() * 25},${35 + Math.random() * 20}%,${24 + Math.random() * 16}%)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  const texKerikil = () => kanvas(256, 256, (c, w, h) => { c.fillStyle = "#7d786d"; c.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const g = 95 + Math.random() * 60; c.fillStyle = `rgb(${g},${g - 4},${g - 12})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  const texJendela = (dasar, kaca, baris, kolom) => kanvas(256, 256, (c, w, h) => { c.fillStyle = dasar; c.fillRect(0, 0, w, h); for (let y = 0; y < baris; y++) for (let x = 0; x < kolom; x++) { c.fillStyle = kaca; c.fillRect(8 + (x * (w - 8)) / kolom, 10 + (y * (h - 10)) / baris, (w - 8) / kolom - 8, (h - 10) / baris - 14); } });
  const texBulat = (stops) => kanvas(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 62); stops.forEach(([o, w]) => g.addColorStop(o, w)); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });

  /* ---------------- WARNA PIPA (bisa diubah dari legenda) ---------------- */
  const matPipa = {};
  function warnaPipa() { const simpan = SIM.bacaLS("pipa", {}); const w = {}; for (const k in CONFIG.pipa) w[k] = simpan[k] || CONFIG.pipa[k][1]; return w; }
  function pipa(svc, pts, r = 0.35) {
    const m = matPipa[svc];
    for (let i = 0; i < pts.length - 1; i++) { batang(scene, V3(...pts[i]), V3(...pts[i + 1]), r, m, 8); if (i > 0) bola(scene, r * 1.15, m, ...pts[i], 8); }
  }

  /* =====================================================
     MEMBANGUN DUNIA
     ===================================================== */
  function bangun() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa9cdea);
    scene.fog = new THREE.Fog(0xbcd6ea, 900, 2300);
    camera = new THREE.PerspectiveCamera(42, 1, 1, 5000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    hemi = new THREE.HemisphereLight(0xeaf3ff, 0x55603f, 0.7); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1dc, 0.9); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -560, right: 560, top: 560, bottom: -560, near: 10, far: 2200 }); sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);
    const w = warnaPipa(); for (const k in CONFIG.pipa) matPipa[k] = new THREE.MeshStandardMaterial({ color: w[k], roughness: 0.45, metalness: 0.35 });

    // tanah: rumput di luar, kerikil di dalam pagar kilang
    const tr = texRumput(); tr.wrapS = tr.wrapT = THREE.RepeatWrapping; tr.repeat.set(120, 120);
    const tanah = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({ map: tr, roughness: 1 })); tanah.rotation.x = -Math.PI / 2; tanah.receiveShadow = true; scene.add(tanah);
    const tk = texKerikil(); tk.wrapS = tk.wrapT = THREE.RepeatWrapping; tk.repeat.set(60, 45);
    const dalam = new THREE.Mesh(new THREE.PlaneGeometry(950, 720), new THREE.MeshStandardMaterial({ map: tk, roughness: 1 })); dalam.rotation.x = -Math.PI / 2; dalam.position.set(0, 0.03, -20); dalam.receiveShadow = true; scene.add(dalam);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = acak(1300, 1700); const b = new THREE.Mesh(new THREE.SphereGeometry(acak(200, 340), 20, 10), M(i % 2 ? 0x5f8a49 : 0x4f7c40, { flatShading: true })); b.scale.y = acak(0.15, 0.3); b.position.set(Math.cos(a) * r, -12, Math.sin(a) * r); scene.add(b); }

    jalanPagar(); pipeRack();
    crudeArea(); cdu(); vdu(); hdt(); reformer(); fcc(); sru(); smr();
    tangkiProduk(); lpg(); loading(); utilitas(); gedungKontrol(); flare(); pohon(); aliran(); awan();
    siap = true;
  }

  /* ---------------- JALAN, PAGAR, PAD BETON ---------------- */
  function jalanPagar() {
    const aspal = M(0x3b4048, { roughness: 0.95 }), garis = M(0xf1f5f9);
    const ruas = [[-455, -355, 455, -355], [-455, 315, 455, 315], [-455, -355, -455, 315], [455, -355, 455, 315], [-455, -140, 160, -140], [-235, 20, 455, 20], [-235, 150, 455, 150], [160, -355, 160, 315], [-235, -355, -235, 315], [0, 150, 0, 345]];
    ruas.forEach(([x1, z1, x2, z2]) => {
      const hor = z1 === z2, L = hor ? Math.abs(x2 - x1) : Math.abs(z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
      kotak(scene, hor ? L + 10 : 10, 0.08, hor ? 10 : L + 10, aspal, cx, 0.02, cz).castShadow = false;
      for (let s = -L / 2; s < L / 2; s += 12) kotak(scene, hor ? 5 : 0.3, 0.1, hor ? 0.3 : 5, garis, hor ? cx + s : cx, 0.03, hor ? cz : cz + s).castShadow = false;
    });
    // pagar keliling
    const pg = M(0x94a3b8, { transparent: true, opacity: 0.45 });
    [[-470, -370, 470, -370], [-470, 330, -20, 330], [20, 330, 470, 330], [-470, -370, -470, 330], [470, -370, 470, 330]].forEach(([a, b, c, d]) => {
      const hor = b === d, L = hor ? Math.abs(c - a) : Math.abs(d - b);
      kotak(scene, hor ? L : 0.15, 2.6, hor ? 0.15 : L, pg, (a + c) / 2, 0, (b + d) / 2).castShadow = false;
    });
    // pos jaga & gerbang
    kotak(scene, 8, 4, 6, M(0xf8fafc), 28, 0, 336); kotak(scene, 9, 0.5, 7, M(0xb45309), 28, 4, 336);
    papan(scene, "MAIN GATE · SAFETY FIRST", 0, 7, 348, 0, 22, "#b91c1c"); kotak(scene, 0.6, 7, 0.6, M(0x475569), -12, 0, 348); kotak(scene, 0.6, 7, 0.6, M(0x475569), 12, 0, 348);
    // pad beton tiap unit proses
    const pad = M(0x8c887f, { roughness: 1 });
    [[-168, -92, 100, 125], [-68, -92, 78, 125], [-172, 82, 92, 104], [-72, 82, 92, 104], [50, -105, 150, 140], [55, 82, 96, 100], [138, 85, 44, 100], [-338, 95, 200, 110]]
      .forEach(([x, z, w, d]) => (kotak(scene, w, 0.12, d, pad, x, 0.02, z).castShadow = false));
  }

  /* ---------------- PIPE RACK UTAMA ---------------- */
  const RACK = [["crude", 6.4, -3.6, 0.45], ["produk", 6.4, -2.2, 0.35], ["berat", 6.4, -0.8, 0.4], ["gas", 6.4, 0.6, 0.35], ["h2", 6.4, 1.9, 0.3], ["lpg", 6.4, 3.2, 0.3], ["uap", 10.4, -3.4, 0.45], ["cw", 10.4, -1.4, 0.7], ["air", 10.4, 0.6, 0.35], ["n2", 10.4, 1.9, 0.25], ["flare", 10.4, 3.4, 0.8]];
  function rackLurus(x1, z1, x2, z2) {
    const hor = z1 === z2, L = hor ? Math.abs(x2 - x1) : Math.abs(z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const n = Math.floor(L / 8) + 1, baja = M(0x4b5563, { metalness: 0.4 });
    const kol = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 11.5, 0.5), baja, n * 2), bal = new THREE.InstancedMesh(new THREE.BoxGeometry(hor ? 0.45 : 10, 0.45, hor ? 10 : 0.45), baja, n * 2);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const s = -L / 2 + i * 8, x = hor ? cx + s : cx, z = hor ? cz : cz + s;
      [-4.6, 4.6].forEach((o, j) => { m4.makeTranslation(hor ? x : x + o, 5.75, hor ? z + o : z); kol.setMatrixAt(i * 2 + j, m4); });
      [6, 10].forEach((y, j) => { m4.makeTranslation(x, y, z); bal.setMatrixAt(i * 2 + j, m4); });
    }
    kol.castShadow = bal.castShadow = true; scene.add(kol, bal);
    RACK.forEach(([svc, y, o, r]) => { const a = hor ? [x1, y, z1 + o] : [x1 + o, y, z1], b = hor ? [x2, y, z2 + o] : [x2 + o, y, z2]; const p = batang(scene, V3(...a), V3(...b), r, matPipa[svc], 10); if (p) p.castShadow = false; });
  }
  function pipeRack() {
    rackLurus(-345, 0, 300, 0);          // rak utama timur-barat
    rackLurus(170, -300, 170, -6);       // ke tangki produk
    rackLurus(170, 6, 170, 140);         // ke terminal loading
    rackLurus(-230, 6, -230, 150);       // ke utilitas
    papan(scene, "MAIN PIPE RACK", -60, 13.5, 0, 0, 16, "#334155");
  }

  /* ---------------- PERALATAN GENERIK ---------------- */
  const BAJA = 0xa8b0ba, PUTIH = 0xe8ebee, ISOLASI = 0xc7ccd1;
  function kolom(p, x, z, r, H, warna = ISOLASI, y0 = 0) {
    const g = new THREE.Group(); g.position.set(x, y0, z); p.add(g);
    tabung(g, r * 1.05, r * 1.15, 4, M(0x8b8f94), 0, 0, 0);                                  // skirt
    tabung(g, r, r, H, M(warna, { metalness: 0.35, roughness: 0.45 }), 0, 4, 0, 24);
    const k = bola(g, r, M(warna, { metalness: 0.35, roughness: 0.45 }), 0, 4 + H, 0, 24); k.scale.y = 0.55;
    const plat = M(0x6b7280, { metalness: 0.4 }), rel = M(0xfacc15);
    for (let y = 10; y < H; y += 9) { tabung(g, r + 1.0, r + 1.0, 0.2, plat, 0, 4 + y, 0, 24).castShadow = false; const t = new THREE.Mesh(new THREE.TorusGeometry(r + 1.0, 0.06, 4, 28), rel); t.rotation.x = Math.PI / 2; t.position.y = 5.1 + y; g.add(t); }
    kotak(g, 0.7, H + 2, 0.25, M(0x6b7280), r + 0.5, 2, 0);                                    // tangga
    return g;
  }
  function vesselH(p, x, y, z, r, L, rotY = 0, warna = PUTIH) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; p.add(g);
    const m = M(warna, { metalness: 0.3, roughness: 0.5 });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 22), m); c.rotation.z = Math.PI / 2; c.castShadow = true; g.add(c);
    [-1, 1].forEach((s) => { const h = bola(g, r, m, (s * L) / 2, 0, 0, 18); h.scale.x = 0.5; });
    if (y - r * 0.6 > 0.2) [-0.3, 0.3].forEach((s) => kotak(g, 0.8, y - r * 0.6, r * 1.4, M(0x78716c), s * L, -y, 0));
    return g;
  }
  function vesselV(p, x, z, r, H, warna = PUTIH, y0 = 0) {
    const g = new THREE.Group(); g.position.set(x, y0, z); p.add(g);
    const m = M(warna, { metalness: 0.3, roughness: 0.5 });
    tabung(g, r * 0.95, r * 1.05, 2, M(0x78716c), 0, 0, 0);
    tabung(g, r, r, H, m, 0, 2, 0, 20);
    const a = bola(g, r, m, 0, 2 + H, 0, 18); a.scale.y = 0.5;
    return g;
  }
  function furnace(p, x, z, w, d, h, stackR, stackH, id) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    [[-w / 2 + 1, -d / 2 + 1], [w / 2 - 1, -d / 2 + 1], [-w / 2 + 1, d / 2 - 1], [w / 2 - 1, d / 2 - 1]].forEach(([a, b]) => kotak(g, 1, 3, 1, M(0x57534e), a, 0, b));
    kotak(g, w, h, d, M(0x9a3412, { roughness: 0.9 }), 0, 3, 0);                              // radiant section (bata tahan api, cat merah bata)
    kotak(g, w + 0.4, 0.6, d + 0.4, M(0x44403c), 0, 3 + h, 0);
    kotak(g, w * 0.6, h * 0.45, d * 0.7, M(0x78716c), 0, 3.6 + h, 0);                         // convection section
    // jendela intip (menyala oranye saat menyala)
    const kaca = new THREE.MeshBasicMaterial({ color: 0xff7a1a }); ref.jendelaApi.push({ m: kaca, id });
    for (let i = -1; i <= 1; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), kaca); pl.position.set(i * w * 0.28, 5, d / 2 + 0.02); g.add(pl); const pl2 = pl.clone(); pl2.position.z = -d / 2 - 0.02; pl2.rotation.y = Math.PI; g.add(pl2); }
    const y0 = 3.6 + h + h * 0.45;
    tabung(g, stackR, stackR * 1.15, stackH - y0, M(0x6b7280, { metalness: 0.4 }), 0, y0, 0, 18);
    tabung(g, stackR * 1.12, stackR * 1.12, 1.2, M(0xdc2626), 0, stackH - 6, 0, 18); tabung(g, stackR * 1.12, stackR * 1.12, 1.2, M(0xf8fafc), 0, stackH - 4.6, 0, 18);
    tabung(g, stackR + 1.2, stackR + 1.2, 0.25, M(0xd97706), 0, stackH - 12, 0, 20);          // platform CEMS
    cerobong(V3(x, stackH, z), stackR, id, "furnace");
    return g;
  }
  function pompa(p, x, z, id, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; p.add(g);
    kotak(g, 4.4, 0.4, 1.4, M(0x475569), 0, 0, 0);
    const mot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2, 14), M(0x1d4ed8, { metalness: 0.4 })); mot.rotation.z = Math.PI / 2; mot.position.set(-1, 1, 0); g.add(mot);
    const cas = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 14), M(0x0f766e, { metalness: 0.4 })); cas.rotation.z = Math.PI / 2; cas.position.set(1.1, 0.95, 0); g.add(cas);
    batang(g, V3(1.1, 1.4, 0), V3(1.1, 3.2, 0), 0.18, M(0x94a3b8));
    lampu(g, 0, 2.4, 0, id, 0.38);
    klik(g, id); return g;
  }
  function kompresor(p, x, z, id, panjang = 7) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    kotak(g, panjang + 2, 0.8, 3.4, M(0x475569), 0, 0, 0);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, panjang * 0.5, 18), M(0x0e7490, { metalness: 0.45 })); c.rotation.z = Math.PI / 2; c.position.set(panjang * 0.2, 2.1, 0); g.add(c);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, panjang * 0.35, 16), M(0x1e40af, { metalness: 0.4 })); m.rotation.z = Math.PI / 2; m.position.set(-panjang * 0.3, 1.9, 0); g.add(m);
    lampu(g, 0, 4, 0, id, 0.5); klik(g, id); return g;
  }
  function shelter(p, x, z, w, d, h, teks) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => kotak(g, 0.5, h, 0.5, M(0x6b7280), (a * w) / 2, 0, (b * d) / 2));
    kotak(g, w + 1, 0.5, d + 1, M(0x94a3b8, { metalness: 0.3 }), 0, h, 0);
    if (teks) papan(g, teks, 0, h - 1.2, d / 2 + 0.6, 0, Math.min(w * 0.8, 16));
    return g;
  }
  function finFan(p, x, z, w, d, y, n) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => kotak(g, 0.5, y, 0.5, M(0x4b5563), (a * w) / 2.2, 0, (b * d) / 2.2));
    kotak(g, w, 1.4, d, M(0x9ca3af, { metalness: 0.4 }), 0, y, 0);
    for (let i = 0; i < n; i++) {
      const fx = -w / 2 + (w / n) * (i + 0.5);
      tabung(g, d * 0.32, d * 0.32, 1.2, M(0x64748b), fx, y + 1.4, 0, 18);
      const fan = new THREE.Group(); fan.position.set(fx, y + 2.7, 0); g.add(fan);
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(d * 0.6, 0.06, 0.5), M(0x1f2937)); b.rotation.y = (k * Math.PI) / 3; fan.add(b); }
      ref.kipas.push({ o: fan, id: "AC" });
    }
    return g;
  }
  function exchanger(p, x, z, n, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; p.add(g);
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 7, 14), M(j ? 0xcbd5e1 : 0xd6dade, { metalness: 0.4 })); c.rotation.z = Math.PI / 2; c.position.set(0, 1.6 + j * 1.8, i * 2.6); c.castShadow = true; g.add(c);
      const kep = bola(g, 0.78, M(0x9ca3af), 3.6, 1.6 + j * 1.8, i * 2.6, 10); kep.scale.x = 0.5;
    }
    kotak(g, 8, 0.6, n * 2.6, M(0x6b7280), 0, 0, (n - 1) * 1.3);
    return g;
  }
  function gedung(p, x, z, w, d, h, warna, teks, id, jendela = true) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    const mat = jendela ? new THREE.MeshStandardMaterial({ map: texJendela(warna, "#4b6f91", Math.max(1, Math.round(h / 4)), Math.max(2, Math.round(w / 4))), roughness: 0.7 }) : M(warna);
    kotak(g, w, h, d, mat, 0, 0, 0); kotak(g, w + 0.6, 0.6, d + 0.6, M(0x475569), 0, h, 0);
    if (teks) papan(g, teks, 0, h - 1.4, d / 2 + 0.05, 0, Math.min(w * 0.75, 22));
    if (id) klik(g, id);
    return g;
  }

  /* ---------------- ASAP CEROBONG & API FLARE ---------------- */
  let texAsap, texApi;
  function cerobong(pos, r, id, jenis) {                       // asap dari setiap cerobong (kecuali flare)
    texAsap = texAsap || texBulat([[0, "rgba(255,255,255,.95)"], [0.45, "rgba(235,235,235,.55)"], [1, "rgba(255,255,255,0)"]]);
    const warna = jenis === "boiler" ? 0xbdbdbd : jenis === "fcc" ? 0x7f776d : jenis === "uap" ? 0xffffff : 0x77726c;
    const n = jenis === "uap" ? 12 : 28, ps = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAsap, color: warna, transparent: true, opacity: 0, depthWrite: false }));
      s.userData = { umur: i / n, hid: i, ox: acak(-0.5, 0.5) * r, oz: acak(-0.5, 0.5) * r, v: acak(0.85, 1.2) }; scene.add(s); ps.push(s);
    }
    ref.cerobong.push({ pos, r, id, jenis, ps, umurMaks: jenis === "uap" ? 5 : 11, kekuatan: 1 });
    // lampu penerbangan merah di cerobong tinggi
    if (pos.y > 40) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 })); l.position.copy(pos); l.position.y += 0.6; l.userData.id = id; scene.add(l); ref.lampuMerah.push(l); }
  }
  function updateAsap(dt, V, angin) {
    ref.cerobong.forEach((c) => {
      const k = kekuatanAsap(c.id, V);
      c.kekuatan += (k - c.kekuatan) * Math.min(1, dt * 0.5);
      c.ps.forEach((s, i) => {
        const d = s.userData; d.umur += dt / c.umurMaks;
        if (d.umur >= 1) { d.umur -= 1; d.ox = acak(-0.5, 0.5) * c.r; d.oz = acak(-0.5, 0.5) * c.r; d.v = acak(0.85, 1.2); }
        const u = d.umur, naik = (c.jenis === "uap" ? 9 : 19) * u * d.v;
        const hanyut = angin.s * c.umurMaks * u * u * 0.9;
        s.position.set(c.pos.x + (d.ox || 0) + angin.x * hanyut, c.pos.y + 1 + naik, c.pos.z + (d.oz || 0) + angin.z * hanyut);
        const ukuran = (c.r * 2.2 + u * (c.jenis === "uap" ? 16 : 40)) * (0.6 + 0.4 * c.kekuatan);
        s.scale.set(ukuran, ukuran, 1);
        s.material.opacity = Math.min(0.95, c.kekuatan * (c.jenis === "uap" ? 0.3 : c.jenis === "boiler" ? 0.85 : 0.9) * Math.min(1, u * 5) * Math.pow(1 - u, 0.8));
        s.material.rotation = d.hid + u * 0.8;
      });
    });
  }
  function kekuatanAsap(id, V) {
    const x = (t) => nilai(t);
    switch (id) {
      case "H-101": return x("FT-103") > 200 ? 0.6 + Math.min(0.6, x("FT-103") / 8000) : 0.05;
      case "H-201": return x("FT-201") > 20 ? 0.8 : 0.05;
      case "H-301": return x("FT-301") > 10 ? 0.6 : 0.05;
      case "H-801": return x("FT-803") > 100 ? 0.9 : 0.05;
      case "STK-871": return V.fccOn ? 1 : 0;
      case "SRU": return x("FT-1061") > 0.2 ? 0.7 : 0;
      case "H2": return V.smr > 100 ? 0.8 : 0.1;
      case "B-601A": return V.blrOn[0] ? 0.5 + V.muatB / 160 : 0;
      case "B-601B": return V.blrOn[1] ? 0.5 + V.muatB / 160 : 0;
      case "CT": return V.kipas >= 3 ? 1 : 0.6;
      default: return 0.6;
    }
  }
  const FL = { x: 40, z: -330, h: 110 };
  function flare() {
    const g = grup(FL.x, FL.z);
    // zona aman (sterile area) – lingkaran merah di tanah
    const zona = new THREE.Mesh(new THREE.RingGeometry(84, 88, 72), new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); zona.rotation.x = -Math.PI / 2; zona.position.y = 0.15; g.add(zona);
    const isi = new THREE.Mesh(new THREE.CircleGeometry(84, 72), new THREE.MeshStandardMaterial({ color: 0x8f8a7c, roughness: 1 })); isi.rotation.x = -Math.PI / 2; isi.position.y = 0.06; g.add(isi);
    papan(g, "FLARE SAFETY ZONE – NO ENTRY", 0, 3, 70, 0, 26, "#b91c1c");
    // derrick (menara rangka) + stack
    const baja = M(0xb91c1c, { metalness: 0.3 }), putih = M(0xf1f5f9, { metalness: 0.3 });
    const kaki = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    kaki.forEach(([a, b]) => batang(g, V3(a * 9, 0, b * 9), V3(a * 2.2, FL.h - 6, b * 2.2), 0.35, baja, 6));
    for (let k = 0; k < 9; k++) {
      const y0 = (k * (FL.h - 6)) / 9, y1 = ((k + 1) * (FL.h - 6)) / 9, w0 = 9 - (6.8 * k) / 9, w1 = 9 - (6.8 * (k + 1)) / 9;
      for (let s = 0; s < 4; s++) { const [a, b] = kaki[s], [c, d] = kaki[(s + 1) % 4]; batang(g, V3(a * w0, y0, b * w0), V3(c * w1, y1, d * w1), 0.12, k % 2 ? putih : baja, 4); }
    }
    tabung(g, 1.1, 1.3, FL.h, M(0x9ca3af, { metalness: 0.5 }), 0, 0, 0, 16);
    tabung(g, 1.5, 1.5, 3, M(0x374151, { metalness: 0.5 }), 0, FL.h - 1, 0, 16);       // flare tip
    [0, 2.1, 4.2].forEach((a) => tabung(g, 0.12, 0.12, 2.6, M(0x6b7280), Math.cos(a) * 1.7, FL.h, Math.sin(a) * 1.7, 6)); // pipa pilot
    klik(g, "FL-901");
    // KO drum & seal drum
    const ko = vesselH(scene, FL.x, 3.2, FL.z + 42, 2.6, 15, 0, 0xd6d3d1); klik(ko, "V-901");
    const seal = vesselV(scene, FL.x + 16, FL.z + 30, 1.7, 7, 0xd6d3d1); klik(seal, "V-901");
    pipa("flare", [[-25, 10.4, 3.4], [-25, 10.4, -250], [-25, 3.2, -288], [FL.x - 9, 3.2, FL.z + 42]], 0.8);
    pipa("flare", [[FL.x + 8, 3.2, FL.z + 42], [FL.x + 16, 3.2, FL.z + 34], [FL.x + 16, 9, FL.z + 30], [FL.x + 1.4, 9, FL.z + 1.4], [FL.x + 1.4, 20, FL.z + 1.4]], 0.7);
    label("Flare Stack FL-901", V3(FL.x, FL.h + 30, FL.z), () => `${fmt(nilai("FT-901"))} Nm³/h`, "FL-901", "lbl-api");

    // ---------- API FLARE ----------
    texApi = texBulat([[0, "rgba(255,255,235,1)"], [0.25, "rgba(255,214,102,.95)"], [0.55, "rgba(255,120,20,.55)"], [1, "rgba(200,40,0,0)"]]);
    const api = new THREE.Group(); api.position.set(FL.x, FL.h + 1.5, FL.z); scene.add(api);
    const add = (warna, op) => new THREE.MeshBasicMaterial({ color: warna, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const lapis = [[1.8, 10, 0xfff4c2, 0.95], [3.0, 17, 0xffa31a, 0.6], [4.0, 22, 0xff5a00, 0.35], [4.8, 26, 0xd62a00, 0.18]].map(([r, h, w, o], i) => {
      const geo = new THREE.ConeGeometry(r, h, 18, 6, true); geo.translate(0, h / 2, 0);
      // ujung api sedikit bergelombang
      const pos = geo.attributes.position; for (let j = 0; j < pos.count; j++) { const yy = pos.getY(j) / h; pos.setX(j, pos.getX(j) * (1 + 0.25 * Math.sin(yy * 9 + i))); }
      const m = new THREE.Mesh(geo, add(w, o)); api.add(m); return m;
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: texApi, color: 0xffb347, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.y = 8; api.add(glow);
    const partikel = Array.from({ length: 46 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texApi, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); s.userData = { u: i / 46, ox: 0, oz: 0, v: 1 }; scene.add(s); return s; });
    const pilot = [0, 2.1, 4.2].map((a) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texApi, color: 0x93c5fd, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.set(FL.x + Math.cos(a) * 1.7, FL.h + 2.8, FL.z + Math.sin(a) * 1.7); s.scale.set(2, 3, 1); scene.add(s); return s; });
    const cahaya = new THREE.PointLight(0xff8a2a, 1, 520, 1.4); cahaya.position.set(FL.x, FL.h + 10, FL.z); scene.add(cahaya);
    ref.api = { api, lapis, glow, partikel, pilot, cahaya, k: 0.8 };
  }
  function updateApi(dt, now, V, angin, malam) {
    const A = ref.api; if (!A) return;
    const q = Math.min(V.flare || 0, 60000);
    const target = 0.75 + 1.45 * Math.sqrt(q / 20000);
    A.k += (target - A.k) * Math.min(1, dt * 1.5);
    const k = A.k, t = now / 1000;
    const kedip = 1 + 0.13 * Math.sin(t * 17.3) + 0.08 * Math.sin(t * 29.1 + 1.7) + 0.06 * (Math.random() - 0.5);
    A.lapis.forEach((m, i) => { const f = 1 + 0.1 * Math.sin(t * (11 + i * 4) + i); m.scale.set(k * (0.92 + 0.08 * f), k * kedip * f * (1 + i * 0.04), k * (0.92 + 0.08 * f)); m.rotation.y += dt * (0.8 + i * 0.5); });
    // condong mengikuti angin
    const lean = Math.min(0.45, angin.s * 0.045);
    A.api.rotation.set(angin.z * lean, 0, -angin.x * lean);
    A.glow.scale.set(30 * k * kedip, 34 * k * kedip, 1); A.glow.position.y = 10 * k;
    // partikel api naik, mengecil, berubah kuning → oranye → merah
    const dasar = A.api.position, c = new THREE.Color();
    A.partikel.forEach((s) => {
      const d = s.userData; d.u += dt * (1.1 + 0.4 * Math.random()) / 1.6;
      if (d.u >= 1) { d.u -= 1; d.ox = acak(-1, 1) * k; d.oz = acak(-1, 1) * k; d.v = acak(0.8, 1.25); }
      const u = d.u, naik = (10 + 18 * u) * u * k * d.v;
      s.position.set(dasar.x + (d.ox || 0) * (1 - u) + angin.x * naik * lean * 1.2, dasar.y + 2 + naik, dasar.z + (d.oz || 0) * (1 - u) + angin.z * naik * lean * 1.2);
      const ukuran = (7 - 5 * u) * k; s.scale.set(ukuran, ukuran * 1.35, 1);
      c.setHSL(0.13 - 0.12 * u, 1, 0.6 - 0.15 * u); s.material.color.copy(c);
      s.material.opacity = Math.min(1, u * 8) * (1 - u) * 0.9;
    });
    const pilotOk = nilai("TE-901B") > 200;
    A.pilot.forEach((p, i) => { p.visible = i !== 1 || pilotOk; p.scale.set(1.6 + 0.4 * Math.sin(t * 20 + i), 2.6 + 0.6 * Math.sin(t * 23 + i), 1); });
    A.cahaya.intensity = (malam ? 1.3 : 0.4) * Math.min(1.8, k) * kedip;
    A.cahaya.distance = 300 + 120 * k;
  }

  /* ---------------- CRUDE RECEIVING & TANGKI ---------------- */
  function tangki(i) {
    const k = CONFIG.tangki[i], [id, , , , D, H, atap, x, z] = k, r = D / 2;
    const g = grup(x, z);
    if (atap === "SPH") {
      const m = M(0xf4f4f5, { metalness: 0.35, roughness: 0.4 });
      bola(g, r, m, 0, r + 6, 0, 32);
      for (let j = 0; j < 8; j++) { const a = (j / 8) * Math.PI * 2; tabung(g, 0.5, 0.5, r + 6, M(0x9ca3af), Math.cos(a) * r * 0.85, 0, Math.sin(a) * r * 0.85, 8); }
      const t = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.18, 6, 40), matPipa.api); t.rotation.x = Math.PI / 2; t.position.y = r * 1.62 + 6; g.add(t);  // cincin deluge
      batang(g, V3(r * 0.9, 0, 0), V3(r * 0.3, r * 2 + 5, 0), 0.25, M(0x6b7280));                                   // tangga
    } else {
      const m = M(k[2] === "crude" ? 0xd1d5db : k[2] === "fueloil" ? 0x52525b : 0xf1f5f9, { metalness: 0.25, roughness: 0.55 });
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 48, 1, atap === "EFR"), m); shell.position.y = H / 2; shell.castShadow = shell.receiveShadow = true; if (atap === "EFR") shell.material = M(k[2] === "crude" ? 0xd1d5db : 0xf1f5f9, { metalness: 0.25, roughness: 0.55, side: THREE.DoubleSide }); g.add(shell);
      // cincin penguat & tangga spiral sederhana
      const cin = new THREE.Mesh(new THREE.TorusGeometry(r + 0.3, 0.3, 6, 48), M(0x94a3b8)); cin.rotation.x = Math.PI / 2; cin.position.y = H - 0.5; g.add(cin);
      for (let s = 0; s < 14; s++) { const a = -0.3 + s * 0.06, y = (s / 14) * H; kotak(g, 1.2, 0.2, 1.2, M(0xd97706), Math.cos(a) * (r + 0.8), y, Math.sin(a) * (r + 0.8)); }
      if (atap === "EFR") {
        const roof = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.6, r - 0.6, 0.8, 48), M(0x9ca3af, { metalness: 0.5, roughness: 0.4 })); g.add(roof);
        const pont = new THREE.Mesh(new THREE.TorusGeometry(r - 1.5, 0.7, 6, 48), M(0x6b7280)); pont.rotation.x = Math.PI / 2; roof.add(pont);
        ref.atap.push({ i, roof, H });
      } else {
        const kerucut = new THREE.Mesh(new THREE.ConeGeometry(r + 0.2, r * 0.18, 48), m); kerucut.position.y = H + r * 0.09; kerucut.castShadow = true; g.add(kerucut);
        tabung(g, 0.5, 0.5, 1.2, M(0x6b7280), r * 0.5, H + r * 0.06, 0, 8);                                               // vent
      }
    }
    // indikator level (strip vertikal di sisi tangki) – animasi ketinggian cairan
    const tinggi = atap === "SPH" ? r * 2 : H, ox = atap === "SPH" ? 0 : 0, oz = atap === "SPH" ? r + 4 : r + 0.6;
    const bingkai = new THREE.Mesh(new THREE.BoxGeometry(2.4, tinggi, 0.3), new THREE.MeshBasicMaterial({ color: 0x0f172a })); bingkai.position.set(ox, (atap === "SPH" ? 6 : 0) + tinggi / 2, oz); g.add(bingkai);
    const isi = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 0.36), new THREE.MeshBasicMaterial({ color: 0x22c55e })); isi.position.set(ox, 0, oz + 0.04); g.add(isi);
    ref.strip.push({ i, isi, y0: atap === "SPH" ? 6 : 0, tinggi });
    // bund wall (tanggul)
    if (atap !== "SPH") { const b = M(0xa8a29e); const s = D * 0.5 + 6; [[0, -s, 2 * s, 1], [0, s, 2 * s, 1], [-s, 0, 1, 2 * s], [s, 0, 1, 2 * s]].forEach(([a, c, w, d]) => (kotak(g, w, 1.6, d, b, a, 0, c).castShadow = false)); }
    papan(g, id, atap === "SPH" ? -5 : -7, atap === "SPH" ? 3.5 : Math.min(8, H * 0.45), atap === "SPH" ? r * 0.7 : Math.sqrt(r * r - 49) + 0.3, 0, atap === "SPH" ? 7 : 9, k[2] === "crude" ? "#78350f" : k[2] === "lpg" ? "#be123c" : "#1e3a8a");
    klik(g, id);
    ref.label["t" + i] = label(id, V3(x, (atap === "SPH" ? r * 2 + 8 : H) + 6, z), () => { const n = 401 + i * 10; return `${fmt(nilai("LT-" + n), 1)} % · ${SIM.S.tangki[i].mode}`; }, id, "lbl-tk");
  }
  function crudeArea() {
    for (let i = 0; i < 4; i++) tangki(i);
    // manifold penerimaan, metering skid, pig receiver
    const g = grup(-440, -120);
    kotak(g, 22, 0.4, 14, M(0x9ca3af), 0, 0, 0);
    vesselH(g, -2, 2, -4, 0.9, 10, 0, 0x16a34a);                                     // pig receiver
    for (let i = 0; i < 4; i++) tabung(g, 0.5, 0.5, 2.4, M(0x1e3a8a), -6 + i * 4, 0.4, 3, 10);  // meter run
    shelter(g, 0, 3, 18, 7, 5, "CRUDE METERING");
    klik(g, "CRUDE-RCV");
    papan(scene, "CRUDE PIPELINE FROM MARINE TERMINAL ›", -470, 4, -122, Math.PI / 2, 22, "#78350f");
    pipa("crude", [[-490, 1.5, -116], [-452, 1.5, -116]], 0.6);
    pipa("crude", [[-428, 1.5, -116], [-352, 1.5, -116], [-352, 1.5, -160], [-352, 3, -232], [-372, 3, -232]], 0.55);
    pipa("crude", [[-352, 1.5, -116], [-345, 6.4, -3.6]], 0.45);
    label("Crude Tank Farm", V3(-352, 42, -232), () => { const V = SIM.V; return `${fmt(V.inv ? V.inv.crude : 0)} m³ · feed ${fmt(V.F)} m³/h`; }, "TK-01");
    label("Crude Receiving", V3(-440, 14, -120), () => (SIM.S.terimaCrude ? "RECEIVING 3.000 m³/h" : "IDLE"), "CRUDE-RCV");
  }

  /* ---------------- CDU ---------------- */
  function cdu() {
    const g = scene;
    klik(kolom(g, -160, -100, 3.6, 50), "C-101");
    [-1, 0, 1].forEach((i) => klik(kolom(g, -147, -114 + i * 6, 1.1, 18, ISOLASI), "C-101"));
    klik(furnace(g, -198, -95, 18, 14, 16, 2.0, 60, "H-101"), "H-101");
    klik(vesselH(g, -168, 3.2, -48, 2.4, 22, 0, 0xe2e8f0), "D-102");
    klik(exchanger(g, -125, -62, 5, 0), "E-101");
    klik(finFan(g, -140, -132, 18, 10, 14, 4), "E-102");
    klik(vesselH(g, -140, 8, -132, 1.4, 8, 0, 0xe5e7eb), "D-101");
    pompa(g, -205, -26, "P-101A"); pompa(g, -198, -26, "P-101B");
    pompa(g, -150, -26, "P-102A"); pompa(g, -143, -26, "P-102B");
    pompa(g, -132, -26, "P-103A"); pompa(g, -125, -26, "P-103B");
    pipa("crude", [[-205, 6.4, -3.6], [-205, 3.2, -24], [-200, 1.2, -24]], 0.35);
    pipa("crude", [[-198, 1.2, -28], [-198, 2.5, -40], [-180, 3.2, -48]], 0.35);
    pipa("crude", [[-156, 3.2, -48], [-130, 3, -55], [-125, 3, -70], [-198, 3, -84]], 0.35);
    pipa("gas", [[-198, 22, -95], [-160, 22, -97]], 0.6);
    pipa("produk", [[-160, 54, -100], [-160, 58, -114], [-140, 17, -128]], 0.4);
    pipa("produk", [[-132, 1.2, -24], [-132, 6.4, -2.2]], 0.3);
    papan(g, "CRUDE DISTILLATION UNIT (CDU)", -168, 1.5, -33, 0, 28, "#9a3412");
    ref.label.cdu = label("CDU · C-101", V3(-160, 66, -100), () => `${fmt(nilai("FT-101"))} m³/h · COT ${fmt(nilai("TT-103"), 1)} °C`, "C-101");
  }
  /* ---------------- VDU ---------------- */
  function vdu() {
    const g = grup(-65, -100);
    tabung(g, 3.4, 3.6, 4, M(0x8b8f94), 0, 0, 0);
    tabung(g, 3.2, 3.2, 12, M(ISOLASI, { metalness: 0.35, roughness: 0.45 }), 0, 4, 0, 24);
    tabung(g, 5.2, 3.2, 4, M(ISOLASI, { metalness: 0.35, roughness: 0.45 }), 0, 16, 0, 24);
    tabung(g, 5.2, 5.2, 18, M(ISOLASI, { metalness: 0.35, roughness: 0.45 }), 0, 20, 0, 28);
    tabung(g, 1.6, 5.2, 5, M(ISOLASI, { metalness: 0.35, roughness: 0.45 }), 0, 38, 0, 24);
    for (let y = 12; y < 40; y += 9) tabung(g, 6.2, 6.2, 0.2, M(0x6b7280, { metalness: 0.4 }), 0, y, 0, 24).castShadow = false;
    [0, 1, 2].forEach((i) => { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 7, 12), M(0xe5e7eb, { metalness: 0.4 })); e.rotation.z = Math.PI / 2; e.position.set(4, 44 + i * 1.6, -2 + i * 2); g.add(e); });
    vesselH(g, 8, 36, 0, 1.3, 7, Math.PI / 2, 0xe5e7eb);
    klik(g, "C-201");
    klik(furnace(scene, -92, -132, 14, 12, 14, 1.6, 50, "H-201"), "H-201");
    pompa(scene, -72, -26, "P-201A"); pompa(scene, -65, -26, "P-201B");
    klik(exchanger(scene, -45, -62, 4, 0), "E-201");
    pipa("berat", [[-160, 2, -100], [-120, 2, -112], [-92, 3, -120]], 0.4);
    pipa("berat", [[-72, 1.2, -24], [-72, 6.4, -0.8]], 0.35);
    papan(scene, "VACUUM DISTILLATION UNIT (VDU)", -65, 1.5, -33, 0, 26, "#9a3412");
    papan(scene, "HEAT EXCHANGER AREA", -88, 1.5, -48, 0, 16, "#334155");
    label("VDU · C-201", V3(-65, 54, -100), () => `${fmt(nilai("PT-201"), 1)} mbar(a) · ${fmt(nilai("FT-201"))} m³/h`, "C-201");
  }
  /* ---------------- HDT ---------------- */
  function hdt() {
    const R = vesselV(scene, -195, 72, 2.6, 22, 0xd6d3d1); klik(R, "R-301");
    klik(vesselV(scene, -168, 108, 1.7, 10, 0xe5e7eb), "V-301");
    klik(kolom(scene, -150, 66, 1.8, 30), "C-302");
    klik(furnace(scene, -205, 112, 10, 8, 10, 1.2, 38, "H-301"), "H-301");
    [0, 1].forEach((i) => klik(vesselV(scene, -178, 52 + i * 6, 1.0, 14, 0xcbd5e1), "E-301"));
    const sh = shelter(scene, -140, 112, 26, 14, 10, "COMPRESSOR STATION K-301 / K-302");
    kompresor(sh, -6, 0, "K-301", 7); kompresor(sh, 7, 0, "K-302", 8);
    pompa(scene, -200, 26, "P-301A"); pompa(scene, -193, 26, "P-301B");
    pipa("h2", [[-140, 3, 104], [-140, 6.4, 40], [-140, 6.4, 1.9]], 0.3);
    pipa("produk", [[-200, 1.2, 24], [-200, 6.4, 2]], 0.3);
    pipa("gas", [[-195, 26, 72], [-195, 28, 90], [-168, 16, 108]], 0.4);
    papan(scene, "HYDROTREATING UNIT (HDT)", -172, 1.5, 33, 0, 24, "#9a3412");
    label("HDT · R-301", V3(-195, 38, 72), () => `${fmt(nilai("FT-301"))} m³/h · ${fmt(nilai("TT-304"), 1)} °C · S ${fmt(nilai("AT-301"), 1)} ppm`, "R-301");
  }
  /* ---------------- REFORMER ---------------- */
  function reformer() {
    ["R-801", "R-802", "R-803"].forEach((id, i) => klik(vesselV(scene, -105 + i * 14, 68, 2.3, 15, 0xd6d3d1), id));
    klik(furnace(scene, -88, 104, 38, 10, 14, 2.0, 55, "H-801"), "H-801");
    klik(vesselV(scene, -45, 70, 1.4, 9, 0xe5e7eb), "V-801");
    klik(kolom(scene, -40, 50, 1.5, 32), "C-802");
    const sh = shelter(scene, -48, 118, 16, 10, 9); kompresor(sh, 0, 0, "K-801", 7);
    pompa(scene, -100, 26, "P-801A"); pompa(scene, -93, 26, "P-801B");
    pipa("gas", [[-105, 18, 68], [-105, 20, 92], [-80, 20, 92], [-80, 18, 68], [-68, 18, 68]], 0.45);
    pipa("produk", [[-100, 1.2, 24], [-100, 6.4, -2]], 0.3);
    papan(scene, "CATALYTIC REFORMING UNIT", -72, 1.5, 33, 0, 24, "#9a3412");
    label("Reformer", V3(-91, 34, 68), () => `R-801 in ${fmt(nilai("TT-801"), 1)} °C · RON ${fmt(nilai("AT-801"), 1)}`, "R-801");
  }
  /* ---------------- FCC ---------------- */
  function fcc() {
    const g = grup(0, 0); ref.fcc = g;
    // regenerator
    const rg = new THREE.Group(); rg.position.set(18, 0, -112); g.add(rg);
    tabung(rg, 7.4, 7.6, 3, M(0x8b8f94), 0, 0, 0); tabung(rg, 7, 7, 26, M(0xb8bcc2, { metalness: 0.4 }), 0, 3, 0, 28); const kp = bola(rg, 7, M(0xb8bcc2, { metalness: 0.4 }), 0, 29, 0, 28); kp.scale.y = 0.5;
    for (let y = 9; y < 29; y += 9) tabung(rg, 8.0, 8.0, 0.2, M(0x6b7280, { metalness: 0.4 }), 0, y, 0, 28).castShadow = false;
    klik(rg, "RG-871");
    // reaktor terangkat di atas struktur
    const rx = new THREE.Group(); rx.position.set(46, 0, -112); g.add(rx);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => kotak(rx, 0.8, 30, 0.8, M(0x4b5563), a * 4.5, 0, b * 4.5));
    [10, 20, 30].forEach((y) => kotak(rx, 11, 0.4, 11, M(0x6b7280, { metalness: 0.4 }), 0, y, 0));
    tabung(rx, 3.6, 3.6, 18, M(0xb8bcc2, { metalness: 0.4 }), 0, 30, 0, 22); bola(rx, 3.6, M(0xb8bcc2, { metalness: 0.4 }), 0, 48, 0, 20).scale.y = 0.6;
    tabung(rx, 1.4, 3.6, 4, M(0xb8bcc2, { metalness: 0.4 }), 0, 26, 0, 18);
    klik(rx, "R-871");
    // riser & standpipe
    batang(g, V3(30, 2, -112), V3(43, 40, -112), 1.0, M(0x9ca3af, { metalness: 0.4 }));
    batang(g, V3(28, 4, -112), V3(30, 2, -112), 1.0, M(0x9ca3af));
    batang(g, V3(18, 22, -108), V3(44, 26, -108), 0.7, M(0x9ca3af));
    batang(g, V3(18, 14, -116), V3(46, 28, -116), 0.7, M(0x9ca3af));
    // main fractionator
    klik(kolom(g, 86, -100, 3.6, 46), "C-873");
    // CO boiler / ESP + cerobong FCC (tertinggi selain flare)
    const esp = kotak(g, 12, 13, 10, M(0x78716c), 0, 0, -142); klik(esp, "RG-871");
    kotak(g, 10, 18, 8, M(0x9ca3af), 18, 0, -146);
    const st = tabung(g, 2.3, 2.8, 76, M(0x6b7280, { metalness: 0.4 }), 4, 0, -158, 18); klik(st, "STK-871");
    tabung(g, 2.6, 2.6, 1.4, M(0xdc2626), 4, 68, -158, 18); tabung(g, 2.6, 2.6, 1.4, M(0xf8fafc), 4, 70, -158, 18);
    tabung(g, 3.6, 3.6, 0.3, M(0xd97706), 4, 60, -158, 18);
    cerobong(V3(4, 76, -158), 2.3, "STK-871", "fcc");
    batang(g, V3(18, 31, -112), V3(18, 34, -130), 1.1, M(0x9ca3af)); batang(g, V3(18, 34, -130), V3(4, 10, -150), 1.1, M(0x9ca3af));
    // blower & wet gas compressor
    const bl = gedung(g, -2, -70, 18, 12, 10, "#d6d3d1", "MAIN AIR BLOWER K-872", null, false); kompresor(bl, 0, 0, "K-872", 9); klik(bl, "K-872");
    const sh = shelter(g, 106, -62, 16, 10, 9, "WET GAS COMP."); kompresor(sh, 0, 0, "K-871", 8);
    pompa(g, 60, -26, "P-871A"); pompa(g, 67, -26, "P-871B");
    pipa("berat", [[60, 1.2, -24], [60, 6.4, -0.8]], 0.35);
    papan(g, "FLUID CATALYTIC CRACKING (FCC)", 50, 1.5, -40, 0, 28, "#9a3412");
    ref.label.fcc = label("FCC · R-871 / RG-871", V3(32, 62, -112), () => (SIM.S.fcc ? `Rx ${fmt(nilai("TT-871"))} °C · Regen ${fmt(nilai("TT-872"))} °C` : "NOT INSTALLED / DISABLED"), "R-871");
    ref.fccKosong = papan(scene, "FCC – NOT INSTALLED (CONFIGURABLE)", 50, 3, -105, 0, 40, "#475569"); ref.fccKosong.rotation.x = -Math.PI / 2; ref.fccKosong.position.y = 0.3;
  }
  /* ---------------- SRU ---------------- */
  function sru() {
    const g = grup(0, 0);
    vesselH(g, 30, 3.5, 66, 2.2, 14, 0, 0xd6d3d1); vesselH(g, 30, 2.6, 54, 1.5, 10, 0, 0xcbd5e1);
    [0, 1, 2].forEach((i) => vesselH(g, 58, 3, 54 + i * 12, 1.9, 8, Math.PI / 2, 0xe7e5e4));
    kolom(g, 78, 56, 1.4, 22);
    kotak(g, 16, 2, 10, M(0x44403c), 40, 0, 100); kotak(g, 14, 0.4, 8, M(0xfacc15, { roughness: 0.9 }), 40, 2, 100);
    const pil = new THREE.Mesh(new THREE.ConeGeometry(9, 6, 24), M(0xfde047, { roughness: 1 })); pil.position.set(66, 3, 112); g.add(pil);
    vesselV(g, 86, 94, 2.4, 10, 0xa8a29e);
    tabung(g, 1.5, 1.8, 62, M(0x78716c, { metalness: 0.4 }), 86, 0, 94, 16); tabung(g, 1.75, 1.75, 1.2, M(0xdc2626), 86, 56, 94, 16);
    cerobong(V3(86, 62, 94), 1.5, "SRU", "furnace");
    klik(g, "SRU");
    papan(scene, "SULFUR RECOVERY UNIT (SRU)", 55, 1.5, 35, 0, 24, "#9a3412");
    label("SRU", V3(60, 30, 80), () => (SIM.S.sru ? `${fmt(nilai("FT-1061") * 24, 1)} t/d sulfur · ${fmt(nilai("AT-1061"), 2)} %` : "OUT OF SERVICE"), "SRU");
  }
  /* ---------------- HYDROGEN PLANT (SMR) ---------------- */
  function smr() {
    const g = grup(0, 0);
    kotak(g, 30, 16, 14, M(0x9a3412, { roughness: 0.9 }), 132, 0, 82); kotak(g, 31, 0.6, 15, M(0x44403c), 132, 16, 82);
    for (let i = 0; i < 10; i++) tabung(g, 0.3, 0.3, 6, M(0x9ca3af), 119 + i * 2.8, 16, 82, 8);
    kotak(g, 10, 12, 8, M(0x78716c), 152, 0, 100);
    tabung(g, 1.8, 2.1, 48, M(0x6b7280, { metalness: 0.4 }), 152, 0, 112, 16); tabung(g, 2, 2, 1.2, M(0xdc2626), 152, 42, 112, 16);
    cerobong(V3(152, 48, 112), 1.8, "H2", "boiler");
    for (let i = 0; i < 8; i++) vesselV(g, 118 + (i % 4) * 6, 50 + Math.floor(i / 4) * 7, 1.0, 8, 0xe5e7eb);
    klik(g, "H2");
    papan(scene, "HYDROGEN PLANT (SMR + PSA)", 136, 1.5, 35, 0, 22, "#9a3412");
    label("Hydrogen Plant", V3(135, 30, 82), () => `${fmt(SIM.V.smr || 0)} Nm³/h H₂`, "H2");
  }

  /* ---------------- TANGKI PRODUK, LPG, LOADING ---------------- */
  function tangkiProduk() {
    for (let i = 4; i < 12; i++) tangki(i);
    papan(scene, "PRODUCT TANK FARM", 300, 1.5, -165, 0, 24, "#1e3a8a");
    const ps = grup(176, -120); kotak(ps, 14, 0.4, 30, M(0x9ca3af), 0, 0, 0); shelter(ps, 0, 0, 13, 28, 6, "PRODUCT PUMP STATION");
    pompa(ps, -3, -9, "P-901A", Math.PI / 2); pompa(ps, 3, -9, "P-901B", Math.PI / 2);
    for (let i = 0; i < 4; i++) pompa(ps, (i % 2 ? 3 : -3), 0 + Math.floor(i / 2) * 7, null, Math.PI / 2);
    klik(ps, "PUMPST");
    label("Product Tank Farm", V3(300, 40, -240), () => { const V = SIM.V; return V.inv ? `${fmt(V.inv.produkT)} t inventory` : ""; }, "TK-05");
    pipa("produk", [[170, 6.4, -150], [190, 2, -170], [190, 2, -248], [205, 2, -258]], 0.35);
    pipa("produk", [[176, 2, -150], [176, 2, -248], [330, 2, -252]], 0.3);
  }
  function lpg() {
    for (let i = 12; i < 15; i++) tangki(i);
    papan(scene, "LPG STORAGE SPHERES", 375, 1.5, 13.5, 0, 22, "#be123c");
    pipa("lpg", [[300, 6.4, 3.2], [318, 2, 9], [418, 2, 9]], 0.3);
  }
  function loading() {
    const g = grup(245, 100);
    [[-36, -10], [36, -10], [-36, 10], [36, 10], [-12, -10], [12, -10], [-12, 10], [12, 10]].forEach(([a, b]) => kotak(g, 0.8, 9, 0.8, M(0x4b5563), a, 0, b));
    kotak(g, 76, 0.8, 24, M(0xe2e8f0, { metalness: 0.3 }), 0, 9, 0);
    for (let i = 0; i < 6; i++) { kotak(g, 1.2, 0.5, 18, M(0x0f766e), -30 + i * 12, 6.5, 0); batang(g, V3(-30 + i * 12, 6.5, 0), V3(-30 + i * 12 + 1.5, 4, 0), 0.15, M(0x94a3b8)); }
    papan(g, "TRUCK LOADING TERMINAL", 0, 7.6, 12.2, 0, 26, "#0f766e");
    klik(g, "LOAD");
    // jalur & truk tangki (bergerak keluar-masuk gantry)
    const warna = [0xf8fafc, 0xfacc15, 0xf8fafc, 0xef4444, 0xf8fafc, 0x16a34a];
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Group(); scene.add(t);
      kotak(t, 2.6, 2.6, 2.4, M(warna[i]), 5.6, 0.8, 0);
      const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 8.5, 16), M(0xe5e7eb, { metalness: 0.6, roughness: 0.3 })); tk.rotation.z = Math.PI / 2; tk.position.set(-0.8, 2.3, 0); t.add(tk);
      kotak(t, 12, 0.5, 2.2, M(0x1f2937), 0, 0.5, 0);
      ref.truk.push(t); (ref.trukData = ref.trukData || []).push({ u: i / 6 });
    }
    label("Loading Terminal", V3(245, 20, 100), () => { const V = SIM.V; const g2 = V.PV ? V.PV["P-901A"].q + V.PV["P-901B"].q : 0; return g2 > 1 ? `Loading ${fmt(g2)} m³/h` : "Idle (night)"; }, "LOAD");
    papan(scene, "› TO MARINE EXPORT TERMINAL", 470, 4, -150, -Math.PI / 2, 22, "#1e3a8a");
    pipa("berat", [[420, 1.5, -200], [480, 1.5, -200]], 0.5);
  }
  function jalurTruk(i) {                                   // loop: jalan selatan → bay gantry → jalan utara → kembali lewat jalan x=165
    const lx = 215 + i * 12;
    return [[lx, 150], [lx, 100], [lx, 26], [166, 26], [166, 144], [lx, 144], [lx, 150]];
  }
  function updateTruk(dt, V) {
    const aktifMuat = V.PV && (V.PV["P-901A"].q + V.PV["P-901B"].q) > 1;
    ref.truk.forEach((t, i) => {
      const d = ref.trukData[i];
      if (!d.pts) { d.pts = jalurTruk(i); d.seg = []; let L = 0; for (let k = 0; k < d.pts.length - 1; k++) { const [a, b] = [d.pts[k], d.pts[k + 1]], l = Math.hypot(b[0] - a[0], b[1] - a[1]); d.seg.push([a, b, L, l]); L += l; } d.L = L; d.s = d.u * L; d.tunggu = 0; d.sStop = 50; }
      if (d.tunggu > 0) d.tunggu -= dt * (aktifMuat ? 1 : 0.2);
      else {
        const sLama = d.s; d.s = (d.s + dt * 9) % d.L;
        if (sLama < d.sStop && d.s >= d.sStop) d.tunggu = aktifMuat ? 14 : 4;
      }
      const sg = d.seg.find((x) => d.s >= x[2] && d.s <= x[2] + x[3]) || d.seg[0];
      const [a, b, s0, l] = sg, u = (d.s - s0) / l;
      t.position.set(a[0] + (b[0] - a[0]) * u, 0, a[1] + (b[1] - a[1]) * u);
      t.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    });
  }

  /* ---------------- UTILITAS ---------------- */
  function utilitas() {
    // Boiler A & B + steam drum + cerobong (asap putih)
    ["A", "B"].forEach((s, i) => {
      const x = -300 + i * 34, g = grup(x, 62);
      kotak(g, 22, 22, 16, M(0xd6d3d1), 0, 0, 0); kotak(g, 22.6, 0.6, 16.6, M(0x475569), 0, 22, 0);
      const dr = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 14, 16), M(0xe5e7eb, { metalness: 0.4 })); dr.rotation.z = Math.PI / 2; dr.position.set(0, 24.4, 0); g.add(dr);
      kotak(g, 8, 10, 6, M(0x78716c), 0, 0, 12);
      tabung(g, 2.0, 2.4, 56, M(0x6b7280, { metalness: 0.4 }), 0, 0, 20, 18); tabung(g, 2.2, 2.2, 1.2, M(0xdc2626), 0, 50, 20, 18); tabung(g, 2.2, 2.2, 1.2, M(0xf8fafc), 0, 51.4, 20, 18);
      papan(g, "BOILER B-601" + s, 0, 18, 8.05, 0, 14, "#475569");
      cerobong(V3(x, 56, 82), 2.0, "B-601" + s, "boiler");
      klik(g, "B-601" + s);
    });
    pipa("uap", [[-283, 24.4, 62], [-283, 10.4, 30], [-283, 10.4, -3.4]], 0.45);
    gedung(scene, -335, 112, 26, 14, 14, "#e7e5e4", "STEAM TURBINE GENERATOR STG-01", "STG-01");
    papan(scene, "BOILER & STEAM SYSTEM", -285, 1.5, 98, 0, 20, "#475569");
    label("Boilers B-601A/B", V3(-283, 62, 62), () => `${fmt(nilai("FT-601"), 1)} t/h · ${fmt(nilai("PT-601"), 1)} bar`, "B-601A");
    // Cooling tower 4 sel + kipas + uap air tipis
    const ct = grup(-390, 62);
    for (let i = 0; i < 4; i++) {
      const x = -21 + i * 14;
      kotak(ct, 13.4, 12, 14, M(0x9ca3af, { roughness: 0.9 }), x, 0, 0);
      for (let k = 0; k < 6; k++) kotak(ct, 13.5, 0.3, 0.2, M(0x6b7280), x, 1 + k * 1.6, 7.05);
      tabung(ct, 4.8, 5.2, 3.6, M(0x64748b), x, 12, 0, 22);
      const fan = new THREE.Group(); fan.position.set(x, 15.2, 0); ct.add(fan);
      for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.1, 0.9), M(0x1f2937)); b.rotation.y = (k * Math.PI) / 4; fan.add(b); }
      ref.kipas.push({ o: fan, id: "CT" + i });
      cerobong(V3(-390 + x, 16, 62), 4.2, "CT", "uap");
    }
    kotak(ct, 58, 1.2, 18, M(0x0e7490), 0, 0, 0);
    klik(ct, "CT-701");
    [0, 1, 2].forEach((i) => pompa(scene, -405 + i * 8, 80, "P-701" + "ABC"[i]));
    pompa(scene, -268, 38, "P-601A"); pompa(scene, -261, 38, "P-601B");
    pipa("cw", [[-390, 1.5, 82], [-390, 1.5, 90], [-235, 6, 90], [-230, 10.4, 60], [-230, 10.4, -1.4]], 0.7);
    papan(scene, "COOLING TOWER CT-701", -390, 1.5, 76, 0, 18, "#0e7490");
    label("Cooling Tower CT-701", V3(-390, 26, 62), () => `${fmt(nilai("FT-701"))} m³/h · ${fmt(nilai("TT-701"), 1)} °C`, "CT-701");
    // WTP
    const w = grup(-410, 175);
    tabung(w, 12, 12, 4, M(0xa8a29e), -10, 0, 0, 40); const air = tabung(w, 11.4, 11.4, 0.2, M(0x0284c7, { roughness: 0.2, metalness: 0.3 }), -10, 3.7, 0, 40); air.castShadow = false;
    const jembatan = kotak(w, 23, 0.8, 1.2, M(0xfacc15), -10, 4.4, 0); ref.jembatanWTP = jembatan;
    kotak(w, 20, 4, 12, M(0xa8a29e), 18, 0, -6); for (let i = 0; i < 4; i++) kotak(w, 4.2, 0.2, 10.4, M(0x0369a1), 10.5 + i * 5, 3.9, -6);
    tabung(w, 8, 8, 12, M(0xe2e8f0), 18, 0, 18, 32);
    for (let i = 0; i < 4; i++) vesselV(w, 30 + (i % 2) * 4, -6 + Math.floor(i / 2) * 5, 1.3, 5, 0x1d4ed8);
    klik(w, "WTP");
    papan(scene, "WATER TREATMENT PLANT", -405, 1.5, 158, 0, 20, "#0369a1");
    label("WTP", V3(-410, 20, 175), () => `${fmt(nilai("FT-1001"))} m³/h raw · ${fmt(nilai("AIT-1002"), 2)} NTU`, "WTP");
    // WWTP
    const ww = grup(-405, 268);
    [[-16, -8], [-16, 8]].forEach(([a, b]) => { kotak(ww, 30, 3, 8, M(0xa8a29e), a, 0, b); kotak(ww, 28.6, 0.2, 6.6, M(0x57534e, { roughness: 0.3 }), a, 2.8, b); });
    tabung(ww, 7, 7, 3, M(0xa8a29e), 16, 0, -10, 30); tabung(ww, 6.6, 6.6, 0.2, M(0x6b8e23, { roughness: 0.3 }), 16, 2.9, -10, 30);
    kotak(ww, 26, 3, 20, M(0xa8a29e), 22, 0, 16); kotak(ww, 25, 0.2, 19, M(0x3f6212, { roughness: 0.3 }), 22, 2.9, 16);
    ref.gelembung = []; for (let i = 0; i < 30; i++) { const b = bola(ww, 0.5, M(0xf8fafc), 22 + acak(-11, 11), 3.1, 16 + acak(-8, 8), 6); ref.gelembung.push(b); }
    klik(ww, "WWTP");
    papan(scene, "WASTEWATER TREATMENT PLANT", -400, 1.5, 248, 0, 22, "#3f6212");
    label("WWTP", V3(-405, 16, 268), () => `${fmt(nilai("FT-1011"))} m³/h · oil ${fmt(nilai("AIT-1012"), 1)} mg/L`, "WWTP");
    // Instrument air & nitrogen
    const ia = gedung(scene, -318, 178, 22, 12, 8, "#e5e7eb", "INSTRUMENT AIR COMPRESSOR HOUSE", "IA");
    kompresor(ia, -5, -9, "K-1021A", 5); kompresor(ia, 5, -9, "K-1021B", 5);
    [0, 1].forEach((i) => klik(vesselV(scene, -300 + i * 5, 168, 1.2, 6, 0xf1f5f9), "IA"));
    const n2 = grup(-318, 222);
    klik(vesselV(n2, 0, 0, 2.4, 16, 0xf8fafc), "N2"); for (let i = 0; i < 3; i++) kotak(n2, 2, 7, 2, M(0xcbd5e1, { metalness: 0.5 }), 8 + i * 3.2, 0, 0); kotak(n2, 10, 3, 5, M(0x0369a1), -11, 0, 0);
    klik(n2, "N2"); papan(scene, "NITROGEN GENERATION & STORAGE", -312, 1.5, 236, 0, 22, "#0369a1");
    label("Instrument Air / N₂", V3(-318, 22, 196), () => `IA ${fmt(nilai("PT-1021"), 2)} barg · N₂ ${fmt(nilai("AT-1031"), 2)} %`, "IA");
    // Gardu listrik
    const sb = grup(-330, 285);
    kotak(sb, 70, 0.3, 36, M(0x9ca3af), 0, 0, 0);
    gedung(sb, -16, 10, 34, 12, 8, "#e5e7eb", "MAIN SUBSTATION 150/20 kV", "SUB", false);
    ["TR-01", "TR-02"].forEach((id, i) => { const t = grup(-330 + 10 + i * 16, 270); kotak(t, 6, 5, 4.5, M(0x6b7280, { metalness: 0.4 }), 0, 0.3, 0); for (let k = 0; k < 6; k++) kotak(t, 0.15, 4, 3.6, M(0x4b5563), 3.3 + k * 0.42, 0.3, 0); [0, 1, 2].forEach((k) => tabung(t, 0.25, 0.35, 2, M(0x92400e), -1.6 + k * 1.6, 5.3, 0, 8)); lampu(t, 0, 8, 0, id, 0.45); klik(t, id); });
    for (let i = 0; i < 3; i++) { const t = grup(-330 + 28 - i * 0, 262 + i * 10); kotak(t, 0.6, 14, 0.6, M(0x9ca3af), -2, 0, 0); kotak(t, 0.6, 14, 0.6, M(0x9ca3af), 2, 0, 0); kotak(t, 5, 0.5, 0.5, M(0x9ca3af), 0, 13, 0); }
    const kabel = M(0x334155); [[-302, 14, 262], [-480, 26, 262]].reduce((a, b) => { batang(scene, V3(...a), V3(...b), 0.08, kabel, 4); return b; });
    [-400, -480].forEach((x) => { const t = grup(x, 262); for (let k = 0; k < 4; k++) batang(t, V3((k % 2 ? 1 : -1) * 3, 0, (k < 2 ? 1 : -1) * 3), V3(0, 30, 0), 0.18, M(0xb8bec6), 4); kotak(t, 0.4, 0.4, 12, M(0xb8bec6), 0, 26, 0); });
    papan(scene, "150 kV GRID INCOMING ›", -470, 4, 300, Math.PI / 2, 16, "#475569");
    label("Substation 150/20 kV", V3(-330, 24, 285), () => `${fmt(nilai("JI-1201") / 1000, 1)} MW load · ${fmt(nilai("SI-1201"), 2)} Hz`, "SUB");
    // Firewater pump house, tangki firewater, pos pemadam
    const fw = grup(100, 172);
    gedung(fw, 0, 0, 22, 12, 8, "#dc2626", "FIREWATER PUMP HOUSE", "FW", false);
    pompa(fw, -5, -9, "P-1171A"); pompa(fw, 5, -9, "P-1171B");
    [[-34, 0], [-58, 0]].forEach(([a, b]) => { const t = tabung(fw, 10, 10, 13, M(0xf1f5f9), a, 0, b, 36); tabung(fw, 10.05, 10.05, 1.6, M(0xdc2626), a, 9, b, 36); klik(t, "FW"); });
    const pos = gedung(scene, 132, 196, 26, 14, 8, "#f8fafc", "FIRE STATION", "FW", false);
    [-6, 6].forEach((x) => { kotak(pos, 4, 3.2, 9, M(0xdc2626), x, 0, 14); kotak(pos, 3.6, 1.2, 3, M(0x1f2937), x, 2, 18); });
    for (let i = 0; i < 18; i++) { const x = -420 + (i % 9) * 100, z = i < 9 ? 26 : -150; tabung(scene, 0.35, 0.4, 1.4, M(0xdc2626), x, 0, z, 8); }
    pipa("api", [[-440, 0.8, 145], [440, 0.8, 145]], 0.25); pipa("api", [[-440, 0.8, -150], [150, 0.8, -150]], 0.25);
    label("Firewater System", V3(70, 22, 172), () => `${fmt(nilai("PT-1171"), 1)} barg · tank ${fmt(nilai("LT-1171"))} %`, "FW");
  }
  /* ---------------- GEDUNG: CONTROL ROOM, LAB, WORKSHOP, ADMIN ---------------- */
  function pohon() {
    const titik = [];
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * Math.PI * 2, r = acak(560, 1050);
      titik.push([Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.85]);
    }
    for (let x = -460; x <= 460; x += 13) { titik.push([x, 352]); titik.push([x, -385]); }
    for (let z = -380; z <= 345; z += 13) { titik.push([-488, z]); titik.push([488, z]); }
    [[-170, 270], [-90, 270], [-30, 205], [60, 280], [100, 300], [-60, 300]].forEach(([x, z]) => { for (let k = 0; k < 6; k++) titik.push([x + acak(-14, 14), z + acak(-8, 8)]); });
    const n = titik.length;
    const bt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 1, 6), M(0x6b4423), n);
    const dn = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), hijau = [0x2f7d32, 0x3a8f3c, 0x2b6e2f, 0x4c9a2a, 0x356e28];
    titik.forEach(([x, z], i) => {
      const s = acak(0.9, 1.5), t = 5 * s;
      m4.compose(V3(x, t / 2, z), q, V3(s, t, s)); bt.setMatrixAt(i, m4);
      m4.compose(V3(x, t + 2.6 * s, z), q, V3(4 * s, 3.4 * s, 4 * s)); dn.setMatrixAt(i, m4);
      dn.setColorAt(i, c.setHex(hijau[i % hijau.length]));
    });
    bt.castShadow = dn.castShadow = true; scene.add(bt, dn);
  }
  function gedungKontrol() {
    const ccr = gedung(scene, -140, 228, 54, 30, 9, "#cbd5e1", "MAIN CONTROL ROOM (CCR) – BLAST RESISTANT", "CCR", false);
    kotak(ccr, 1, 16, 1, M(0x94a3b8), 22, 9, -8); bola(ccr, 1.2, M(0xf8fafc), 22, 26, -8, 10);
    gedung(scene, -62, 228, 32, 18, 11, "#f1f5f9", "LABORATORY", "LAB");
    const ws = gedung(scene, 10, 238, 44, 24, 12, "#d6d3d1", "MAINTENANCE WORKSHOP", "LAB", false);
    for (let i = 0; i < 4; i++) kotak(ws, 11, 2.4, 24.4, M(0x94a3b8, { metalness: 0.4 }), -16.5 + i * 11, 12, 0);
    gedung(scene, -10, 296, 46, 18, 13, "#f8fafc", "ADMINISTRATION BUILDING", "CCR");
    const pk = grup(60, 296); kotak(pk, 40, 0.1, 22, M(0x52525b), 0, 0, 0);
    for (let i = 0; i < 12; i++) kotak(pk, 2, 1.4, 4.2, M([0xdc2626, 0xf8fafc, 0x2563eb, 0x111827, 0x9ca3af][i % 5], { metalness: 0.4 }), -17 + (i % 6) * 6.8, 0.1, i < 6 ? -6 : 6);
    label("Main Control Room", V3(-140, 22, 228), () => { const h = ALARM.hitung(); return `${h.total} active alarm · ${h.CRIT} critical`; }, "CCR");
    papan(scene, "METEO", -100, 9, 160, 0, 4, "#334155"); kotak(scene, 0.3, 8, 0.3, M(0x94a3b8), -100, 0, 162);
    const an = new THREE.Group(); an.position.set(-100, 8.4, 162); scene.add(an); for (let k = 0; k < 3; k++) { const c = bola(an, 0.35, M(0xf8fafc), Math.cos(k * 2.1) * 1.2, 0, Math.sin(k * 2.1) * 1.2, 8); } ref.anemo = an;
    klik(an, "MET");
  }

  /* ---------------- ALIRAN ANIMASI DI PIPA ---------------- */
  const jalur = [];
  function rute(pts, warna, fn) {
    const seg = []; let L = 0;
    for (let i = 0; i < pts.length - 1; i++) { const a = V3(...pts[i]), b = V3(...pts[i + 1]), l = a.distanceTo(b); seg.push({ a, b, s: L, L: l }); L += l; }
    const N = Math.max(5, Math.round(L / 10));
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: warna }), N); scene.add(im);
    jalur.push({ seg, L, N, im, fn, fase: 0 });
  }
  function aliran() {
    const v = (t, d) => () => nilai(t) / d;
    rute([[-352, 2.4, -116], [-345, 7.6, -3.6], [-205, 7.6, -3.6], [-205, 4, -24]], 0xd97706, v("FT-101", 600));
    rute([[-132, 2.4, -24], [-132, 7.6, -2.2], [170, 7.6, -2.2], [170, 7.6, -150], [190, 3, -170], [190, 3, -248]], 0xfde047, () => SIM.V.prodT / 480);
    rute([[300, 7.6, 3.2], [318, 3, 9], [418, 3, 9]], 0xfb7185, () => (SIM.V.prod ? SIM.V.prod.lpg / 45 : 0));
    rute([[-283, 24.4, 66], [-283, 11.6, 30], [-283, 11.6, -3.4], [150, 11.6, -3.4]], 0xffffff, v("FT-601", 150));
    rute([[-25, 11.8, 3.4], [-25, 11.8, -250], [-25, 4.4, -288], [FL.x - 9, 4.4, FL.z + 42]], 0xffb347, () => Math.min(2, nilai("FT-901") / 2500));
    rute([[-390, 2.6, 90], [-235, 7, 90], [-230, 11.6, 60], [-230, 11.6, -1.4], [100, 11.6, -1.4]], 0x4ade80, v("FT-701", 14000));
  }
  let tampilAliran = true;
  function updateAliran(dt) {
    const m = new THREE.Matrix4(), p = V3();
    jalur.forEach((r) => {
      const v = r.fn() || 0, besar = Math.min(1.6, Math.abs(v));
      r.im.visible = besar > 0.02 && tampilAliran; if (!r.im.visible) return;
      r.fase = (r.fase + dt * (0.05 + 0.12 * besar) * (60 / r.L) * 6) % 1;
      for (let i = 0; i < r.N; i++) {
        const s = ((i / r.N + r.fase) % 1) * r.L;
        const sg = r.seg.find((x) => s >= x.s && s <= x.s + x.L) || r.seg[r.seg.length - 1];
        p.copy(sg.a).lerp(sg.b, (s - sg.s) / sg.L); const k = 0.55 + besar * 0.4; m.makeScale(k, k, k); m.setPosition(p); r.im.setMatrixAt(i, m);
      }
      r.im.instanceMatrix.needsUpdate = true;
    });
  }
  function awan() {
    const tex = texBulat([[0, "rgba(255,255,255,.95)"], [1, "rgba(255,255,255,0)"]]);
    ref.awan = Array.from({ length: 12 }, () => {
      const g = new THREE.Group(); g.position.set(acak(-1200, 1200), acak(260, 360), acak(-900, 700)); scene.add(g);
      for (let j = 0; j < 6; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })); s.position.set(acak(-80, 80), acak(-10, 10), acak(-30, 30)); const k = acak(80, 140); s.scale.set(k, k * 0.5, 1); g.add(s); }
      return g;
    });
  }

  /* =====================================================
     KAMERA & KONTROL
     ===================================================== */
  const orbit = { theta: 1.05, phi: 0.92, r: 1050, target: V3(0, 0, -20), goal: null, auto: false };
  const PRESET = {
    Overview: [1.05, 0.92, 1050, [0, 0, -20]], "Crude Receiving": [1.25, 0.8, 300, [-360, 10, -200]], "CDU / VDU": [1.35, 0.78, 260, [-115, 20, -90]],
    "HDT & Reformer": [1.55, 0.8, 250, [-125, 12, 80]], FCC: [1.25, 0.8, 260, [45, 25, -105]], "SRU & H₂ Plant": [1.6, 0.8, 220, [90, 10, 80]],
    "Tank Farm": [1.3, 0.82, 360, [300, 5, -240]], "LPG & Loading": [1.55, 0.8, 330, [300, 5, 60]], Utilities: [1.55, 0.85, 380, [-350, 10, 160]],
    Flare: [1.4, 1.05, 330, [40, 70, -330]], "Control Room": [1.45, 0.75, 230, [-80, 5, 240]],
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
    el.addEventListener("pointerup", (e) => { if (drag && pindah < 5) klikObjek(e); drag = null; });
    el.addEventListener("wheel", (e) => { e.preventDefault(); orbit.goal = null; orbit.r = Math.max(30, Math.min(2200, orbit.r * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
    el.addEventListener("touchmove", (e) => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) orbit.r = Math.max(30, Math.min(2200, orbit.r * (pinch / d))); pinch = d; } }, { passive: true });
    el.addEventListener("touchend", () => (pinch = 0));
  }
  const ray = new THREE.Raycaster();
  function klikObjek(e) {
    const b = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - b.left) / b.width) * 2 - 1, y: -((e.clientY - b.top) / b.height) * 2 + 1 }, camera);
    const hit = ray.intersectObjects(klikables.filter((o) => o.visible && (!ref.fcc || ref.fcc.visible || !isAnak(o, ref.fcc))), false)[0];
    if (hit && hit.object.userData.equip) onPilih(hit.object.userData.equip);
  }
  const isAnak = (o, g) => { while (o) { if (o === g) return true; o = o.parent; } return false; };

  /* =====================================================
     UPDATE TIAP FRAME
     ===================================================== */
  let tampilLabel = true, tampilTangki = true, tLalu = performance.now(), tLabel = 0;
  const warnaSt = { RUN: 0x22c55e, STBY: 0x38bdf8, STOP: 0x9ca3af, TRIP: 0xef4444, OFF: 0x6b7280 };
  function frame() {
    requestAnimationFrame(frame);
    if (!aktif || !siap || !wadah) return;
    const now = performance.now(), dt = Math.min(0.1, (now - tLalu) / 1000); tLalu = now;
    const V = SIM.V; if (!V.units) return;
    // kamera
    if (orbit.goal) { const g = orbit.goal, k = Math.min(1, dt * 3); orbit.theta += (g.theta - orbit.theta) * k; orbit.phi += (g.phi - orbit.phi) * k; orbit.r += (g.r - orbit.r) * k; orbit.target.lerp(g.target, k); if (Math.abs(g.r - orbit.r) < 0.5 && Math.abs(g.theta - orbit.theta) < 0.002 && Math.abs(g.phi - orbit.phi) < 0.002 && orbit.target.distanceTo(g.target) < 0.3) orbit.goal = null; }
    if (orbit.auto) orbit.theta += dt * 0.05;
    camera.position.set(orbit.target.x + orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta), orbit.target.y + orbit.r * Math.cos(orbit.phi), orbit.target.z + orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta));
    camera.lookAt(orbit.target);
    // matahari & langit mengikuti jam simulasi
    const h = V.h, el = Math.sin(((h - 6) / 12) * Math.PI), siang = Math.max(0, el), malam = el < 0.06;
    sun.position.set(Math.cos(((h - 6) / 12) * Math.PI) * 900, Math.max(80, el * 1000), -300); sun.intensity = 0.12 + 0.85 * Math.min(1, siang * 1.6);
    hemi.intensity = 0.22 + 0.55 * Math.min(1, siang * 2);
    const senja = Math.max(0, 1 - Math.abs(el) * 5);
    const cl = el > 0 ? new THREE.Color(0xa9cdea).lerp(new THREE.Color(0xf4a261), senja * 0.55) : new THREE.Color(0x0b1328).lerp(new THREE.Color(0xf4a261), senja * 0.45);
    scene.background.copy(cl); scene.fog.color.copy(cl);
    // angin: arah "dari" (WD) → asap bergerak ke arah sebaliknya
    const wd = (nilai("WD-1161") * Math.PI) / 180, ws = nilai("WS-1161") || 3;
    const angin = { x: -Math.sin(wd), z: Math.cos(wd), s: ws };
    // lampu status pompa & kompresor
    const kedip = Math.sin(now / 250) > 0;
    for (const id in ref.lampu) {
      const p = (V.PV && V.PV[id]) || (V.KV && V.KV[id]); const m = ref.lampu[id].material;
      if (p) m.color.setHex(p.st === "TRIP" ? (kedip ? 0xef4444 : 0x450a0a) : warnaSt[p.st] || 0x9ca3af);
      else if (id === "TR-02") m.color.setHex(V.tr02 ? 0x22c55e : kedip ? 0xef4444 : 0x450a0a);
    }
    // jendela api furnace
    ref.jendelaApi.forEach((j) => { const k = kekuatanAsap(j.id, V); j.m.color.setHex(k > 0.2 ? (Math.random() > 0.08 ? 0xff7a1a : 0xffb347) : 0x1c1917); });
    // atap apung & strip level tangki
    ref.atap.forEach((a) => { const lv = SIM.pct(a.i) / 100; a.roof.position.y = Math.max(1, lv * a.H); });
    ref.strip.forEach((s) => {
      const lv = Math.max(0.01, SIM.pct(s.i) / 100), n = 401 + s.i * 10, sv = ALARM.sevTag("LT-" + n);
      s.isi.scale.y = lv * s.tinggi; s.isi.position.y = s.y0 + (lv * s.tinggi) / 2;
      s.isi.material.color.setHex(sv === "crit" ? (kedip ? 0xef4444 : 0x7f1d1d) : sv === "warn" ? 0xfacc15 : sv === "off" ? 0x9ca3af : 0x22c55e);
    });
    // kipas
    ref.kipas.forEach((k, i) => { const jalan = k.id === "AC" ? V.cduOn : Number(k.id.slice(2)) < V.kipas; k.o.rotation.y += jalan ? dt * (k.id === "AC" ? 10 : 5) : 0; });
    if (ref.jembatanWTP) ref.jembatanWTP.rotation.y += dt * 0.05;
    (ref.gelembung || []).forEach((b, i) => { b.position.y = 3.1 + ((now / 900 + i * 0.37) % 1) * 0.6; });
    if (ref.anemo) ref.anemo.rotation.y += dt * ws * 1.4;
    ref.lampuMerah.forEach((l) => (l.visible = (l.userData.id !== "STK-871" || !!SIM.S.fcc) && (malam ? kedip : true)));
    // FCC terpasang / tidak
    if (ref.fcc) { ref.fcc.visible = !!SIM.S.fcc; ref.fccKosong.visible = !SIM.S.fcc; }
    // awan
    ref.awan.forEach((g) => { g.position.x += angin.x * dt * ws * 1.5; g.position.z += angin.z * dt * ws * 1.5; if (Math.abs(g.position.x) > 1400) g.position.x *= -0.95; if (Math.abs(g.position.z) > 1100) g.position.z *= -0.95; });
    updateAsap(dt, V, angin); updateApi(dt, now, V, angin, malam); updateAliran(dt); updateTruk(dt, V);
    renderer.render(scene, camera);
    // label HTML
    if (tampilLabel && now - tLabel > 150) {
      tLabel = now;
      const W = wadah.clientWidth, H = wadah.clientHeight, p = V3();
      labels.forEach((L) => {
        if (L.kelas === "lbl-tk" && (!tampilTangki || orbit.r > 700)) { L.el.style.display = "none"; return; }
        p.copy(L.pos).project(camera);
        const ok = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
        L.el.style.display = ok ? "" : "none"; if (!ok) return;
        L.el.style.transform = `translate(${((p.x + 1) / 2) * W}px, ${((1 - p.y) / 2) * H}px) translate(-50%, -100%)`;
        const t = L.fn(); if (L.v.textContent !== t) L.v.textContent = t;
      });
    }
  }
  function ukuran() { if (!wadah || !renderer) return; const w = wadah.clientWidth, h = wadah.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  return {
    pasang(el) {
      if (typeof THREE === "undefined") { el.innerHTML = '<div class="kosong3d">Three.js belum termuat – periksa koneksi internet.</div>'; return; }
      if (!siap) { bangun(); lapisLabel = document.createElement("div"); lapisLabel.className = "lapis-label"; labels.forEach((L) => lapisLabel.appendChild(L.el)); pasangKontrol(renderer.domElement); requestAnimationFrame(frame); window.addEventListener("resize", ukuran); }
      wadah = el; el.prepend(renderer.domElement); el.appendChild(lapisLabel); aktif = true; setTimeout(ukuran, 30); ukuran();
    },
    jeda(x) { aktif = !x; if (!x) setTimeout(ukuran, 30); },
    ke, PRESET, orbit,
    setLabel(x) { tampilLabel = x; if (lapisLabel) lapisLabel.style.display = x ? "" : "none"; },
    setTangki(x) { tampilTangki = x; }, setAliran(x) { tampilAliran = x; },
    setPilih(f) { onPilih = f; },
    warnaPipa(svc, hex) { if (matPipa[svc]) matPipa[svc].color.set(hex); const s = SIM.bacaLS("pipa", {}); s[svc] = hex; SIM.simpanLS("pipa", s); },
    resetWarnaPipa() { SIM.simpanLS("pipa", {}); for (const k in CONFIG.pipa) if (matPipa[k]) matPipa[k].color.set(CONFIG.pipa[k][1]); },
    get warna() { return warnaPipa(); },
    info: () => ({ objek: klikables.length, asap: ref.cerobong.length, api: !!ref.api }),
    ukuran,
  };
})();
