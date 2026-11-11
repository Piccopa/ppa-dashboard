/* =========================================================
   ATG-3D.JS — VISUALISASI 3D TANK FARM (Three.js)
   Hanya urusan GAMBAR. Angka diambil dari ATG.data (atg-data.js).
   Isi:
     1. Alat bantu (bahan, kotak, tabung, pipa)
     2. Pembuat tangki (dinding, atap, tangga spiral, cairan)
     3. Instrumen TK-101 (radar, suhu, tekanan, saklar level)
     4. Pipa, valve, flowmeter coriolis, pompa, gas detector
     5. Kamera (putar, zoom, geser), klik objek, label
     6. Update tiap frame (level cairan, animasi, warna status)
   ========================================================= */

const ATG_3D = (() => {
  let ren, scene, cam, wadah, siap = false;
  const tangki3D = {};            // id → { grup, shell, atap, cair, matShell, ... }
  const alat = {};                // objek instrumen TK-101
  const pipa = [];                // semua jalur pipa
  const bisaDiklik = [];          // mesh yang bisa dipilih dengan klik
  const label = { tangki: {}, inst: {} };
  const opsi = { cutaway: false, label: true, pipa: true, aliran: true, mode: "overview", pilih: "TK-101", sorot: null };
  let cb = { tangki: () => {}, inst: () => {} };

  /* ---------- 1. ALAT BANTU ---------- */
  const bahan = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15, ...o });
  const M = {
    baja: bahan(0xb8c2cc, { metalness: 0.45, roughness: 0.35 }),
    bajaGelap: bahan(0x5b6673, { metalness: 0.4 }),
    kuning: bahan(0xeab308, { roughness: 0.5 }),
    beton: bahan(0xb9bdc1, { roughness: 0.95, metalness: 0 }),
    hitam: bahan(0x1f2937),
    pipa: bahan(0x9aa6b2, { metalness: 0.5, roughness: 0.35 }),
  };
  function kotak(induk, w, h, d, m, x, y, z) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true; induk.add(o); return o;
  }
  function tabung(induk, r1, r2, h, m, x, y, z, seg = 16) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true; induk.add(o); return o;
  }
  function kanvas(w, h, gambar) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; gambar(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  // Tabung dari titik A ke titik B (dipakai untuk pipa & batang)
  function batang(induk, a, b, r, m) {
    const arah = new THREE.Vector3().subVectors(b, a), panjang = arah.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, panjang, 14, 1, true), m);
    o.position.copy(a).addScaledVector(arah, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arah.normalize());
    o.castShadow = true; induk.add(o); return o;
  }

  /* ---------- 2. TANGKI ---------- */
  function teksturDinding(t) {
    return kanvas(1024, 320, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#f1f4f6"); g.addColorStop(1, "#d9dee3");
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(90,100,110,.35)";
      const course = 7;
      for (let i = 1; i < course; i++) c.fillRect(0, (h / course) * i, w, 2);                 // sambungan las horizontal
      for (let i = 0; i < course; i++) for (let k = 0; k < 8; k++) c.fillRect(((k + (i % 2) * 0.5) * w) / 8, (h / course) * i, 2, h / course); // las vertikal
      c.fillStyle = "rgba(120,90,60,.10)"; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, h * 0.55 + Math.random() * h * 0.45, 2, 20 + Math.random() * 40); // noda karat tipis
      c.fillStyle = "#16314f"; c.textAlign = "center";
      c.font = "bold 76px Arial"; c.fillText(t.id, w / 2, h * 0.42);
      c.font = "bold 30px Arial"; c.fillStyle = "#b45309"; c.fillText(ATG_CONFIG.produk[t.produk].nama.toUpperCase(), w / 2, h * 0.56);
      c.font = "20px Arial"; c.fillStyle = "#334155"; c.fillText(`KAPASITAS ${Math.round(t.tabel[t.tabel.length - 1][1]).toLocaleString("id-ID")} m³ · ${CONFIG.namaSingkat}`, w / 2, h * 0.66);
    });
  }

  function buatTangki(t) {
    const R = t.diameter / 2, H = t.tinggi, g = new THREE.Group();
    g.position.set(t.x, 0, t.z); scene.add(g);
    // Pondasi beton (ring wall)
    tabung(g, R + 0.45, R + 0.6, 0.4, M.beton, 0, 0.2, 0, 48);
    // Dinding tangki: silinder terbuka, tekstur menghadap ke depan (+z)
    const matShell = bahan(0xffffff, { map: teksturDinding(t), roughness: 0.6, metalness: 0.1, transparent: true, side: THREE.DoubleSide });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true, -Math.PI, Math.PI * 2), matShell);
    shell.position.y = 0.4 + H / 2; shell.castShadow = shell.receiveShadow = true; shell.userData.tangki = t.id; g.add(shell); bisaDiklik.push(shell);
    // Dasar tangki
    const dasar = tabung(g, R, R, 0.05, M.bajaGelap, 0, 0.42, 0, 48);
    // Atap kerucut landai
    const tA = R * 0.18;
    const matAtap = bahan(0xd3d8dc, { metalness: 0.25, transparent: true });
    const atap = new THREE.Mesh(new THREE.ConeGeometry(R + 0.12, tA, 64), matAtap);
    atap.position.y = 0.4 + H + tA / 2; atap.castShadow = true; atap.userData.tangki = t.id; g.add(atap); bisaDiklik.push(atap);
    // Pagar keliling atap: cincin + tiang
    const yAtas = 0.4 + H;
    const cincin = new THREE.Mesh(new THREE.TorusGeometry(R - 0.15, 0.035, 6, 72), M.kuning); cincin.rotation.x = Math.PI / 2; cincin.position.y = yAtas + 1.05; g.add(cincin);
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; tabung(g, 0.025, 0.025, 1.05, M.kuning, Math.sin(a) * (R - 0.15), yAtas + 0.52, Math.cos(a) * (R - 0.15), 5); }
    // Tangga spiral mengelilingi dinding (anak tangga + pegangan)
    const a0 = Math.PI * 0.42, sapuan = Math.PI * 0.55, n = Math.round(H / 0.26), rT = R + 0.55;
    const rel = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * sapuan, y = 0.4 + (i / n) * H;
      const s = kotak(g, 0.85, 0.05, 0.3, M.bajaGelap, Math.sin(a) * rT, y, Math.cos(a) * rT); s.rotation.y = a - Math.PI / 2;
      rel.push(new THREE.Vector3(Math.sin(a) * (rT + 0.45), y + 1.0, Math.cos(a) * (rT + 0.45)));
    }
    const pegangan = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rel), 80, 0.035, 6), M.kuning); g.add(pegangan);
    const aA = a0 + sapuan;
    kotak(g, 1.4, 0.08, 1.4, M.bajaGelap, Math.sin(aA) * (R - 0.2), yAtas + 0.1, Math.cos(aA) * (R - 0.2));   // bordes atas
    // Cairan di dalam tangki (skala tinggi = level)
    const geoCair = new THREE.CylinderGeometry(R - 0.07, R - 0.07, 1, 64); geoCair.translate(0, 0.5, 0);
    const matCair = bahan(ATG_CONFIG.produk[t.produk].warna, { roughness: 0.25, metalness: 0.05, emissive: ATG_CONFIG.produk[t.produk].warna, emissiveIntensity: 0.12 });
    const cair = new THREE.Mesh(geoCair, matCair); cair.position.y = 0.45; g.add(cair);
    // Pipa pendek & valve manual untuk tangki selain TK-101 (dekorasi)
    if (!t.detail) {
      batang(g, new THREE.Vector3(0, 0.9, R), new THREE.Vector3(0, 0.9, R + 2.6), 0.13, M.pipa);
      batang(g, new THREE.Vector3(0, 0.9, R + 2.6), new THREE.Vector3(0, -0.2, R + 2.6), 0.13, M.pipa);
      tabung(g, 0.2, 0.2, 0.35, bahan(0x1d4ed8), 0, 0.9, R + 1.3).rotation.x = Math.PI / 2;
      const roda = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 20), M.hitam); roda.rotation.x = Math.PI / 2; roda.position.set(0, 1.5, R + 1.3); g.add(roda);
      // radar sederhana di atap
      tabung(g, 0.12, 0.12, 0.4, M.baja, R * 0.45, yAtas + tA * 0.55 + 0.2, R * 0.2);
      tabung(g, 0.16, 0.16, 0.3, bahan(0x1e3a8a), R * 0.45, yAtas + tA * 0.55 + 0.55, R * 0.2);
    }
    tangki3D[t.id] = { t, R, H, grup: g, shell, atap, matShell, matAtap, cair, matCair, dasar };
  }

  /* ---------- 3. INSTRUMEN TK-101 ---------- */
  function buatInstrumen() {
    const T = tangki3D["TK-101"], g = T.grup, R = T.R, H = T.H, yAtas = 0.4 + H, tA = R * 0.18;
    const yAtap = (r) => yAtas + tA * (1 - r / R);                       // tinggi atap pada jarak r dari pusat
    const tandai = (o, tag) => { o.traverse((m) => { if (m.isMesh) { m.userData.tag = tag; bisaDiklik.push(m); } }); return o; };

    // LT-101 Radar level transmitter di atap
    const lt = new THREE.Group(); lt.position.set(1.8, yAtap(2.55), 1.8); g.add(lt);
    tabung(lt, 0.14, 0.14, 0.45, M.baja, 0, 0.22, 0); tabung(lt, 0.24, 0.24, 0.06, M.baja, 0, 0.47, 0);
    tabung(lt, 0.2, 0.2, 0.36, bahan(0x1e40af), 0, 0.7, 0); kotak(lt, 0.22, 0.2, 0.08, bahan(0x0f172a), 0, 0.72, 0.2);
    tandai(lt, "LT-101");
    // Sinar radar: kerucut tembus pandang dari antena ke permukaan cairan
    const geoSinar = new THREE.CylinderGeometry(0.06, 0.7, 1, 24, 1, true); geoSinar.translate(0, -0.5, 0);
    alat.sinar = new THREE.Mesh(geoSinar, new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    alat.sinar.position.set(1.8, yAtap(2.55), 1.8); g.add(alat.sinar);

    // TT-101 Multipoint temperature: batang thermowell + 3 sensor
    const ttX = -2.2, ttZ = 1.4;
    tabung(g, 0.12, 0.12, 0.4, M.baja, ttX, yAtap(2.6) + 0.2, ttZ); kotak(g, 0.3, 0.25, 0.3, bahan(0x334155), ttX, yAtap(2.6) + 0.5, ttZ);
    alat.thermowell = batang(g, new THREE.Vector3(ttX, yAtap(2.6), ttZ), new THREE.Vector3(ttX, 0.6, ttZ), 0.045, M.baja);
    alat.tt = POSISI_TT.map((p, i) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), bahan(0xf97316, { emissive: 0xf97316, emissiveIntensity: 0.6 }));
      s.position.set(ttX, 0.4 + (H * p) / 100, ttZ); g.add(s); tandai(s, ["TT-101A", "TT-101B", "TT-101C"][i]); return s;
    });

    // PT-101 Pressure transmitter di nozzle atap (ruang uap)
    const pt = new THREE.Group(); pt.position.set(0.6, yAtap(2.7), -2.6); g.add(pt);
    tabung(pt, 0.1, 0.1, 0.35, M.baja, 0, 0.17, 0); tabung(pt, 0.18, 0.18, 0.05, M.baja, 0, 0.36, 0);
    batang(pt, new THREE.Vector3(0, 0.38, 0), new THREE.Vector3(0.35, 0.6, 0), 0.025, M.baja);
    kotak(pt, 0.22, 0.28, 0.18, bahan(0x0369a1), 0.42, 0.75, 0); tabung(pt, 0.11, 0.11, 0.08, bahan(0xe5e7eb), 0.42, 0.75, 0.12).rotation.x = Math.PI / 2;
    tandai(pt, "PT-101");

    // Saklar level LSHH/LSH/LSL/LSLL di dinding luar (sisi kanan depan)
    const aSw = Math.PI * 0.2;
    alat.led = {};
    [["LSHH", 95], ["LSH", 90], ["LSL", 10], ["LSLL", 5]].forEach(([tag, p], i) => {
      const y = 0.4 + (H * p) / 100, x = Math.sin(aSw + i * 0.035) * (R + 0.2), z = Math.cos(aSw + i * 0.035) * (R + 0.2);
      const sw = new THREE.Group(); sw.position.set(x, y, z); sw.rotation.y = aSw; g.add(sw);
      tabung(sw, 0.07, 0.07, 0.3, M.baja, 0, 0, -0.05).rotation.x = Math.PI / 2;
      kotak(sw, 0.26, 0.26, 0.2, bahan(0x475569), 0, 0, 0.18);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), bahan(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 1 }));
      led.position.set(0, 0.06, 0.3); sw.add(led); alat.led[tag] = led;
      tandai(sw, tag);
    });

    // ---------- 4. PIPA, VALVE, FLOWMETER, POMPA ----------
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    alat.jalurMasuk = buatPipa([V(-62, 4.5, 6), V(-38, 4.5, 6), V(-38, 1.5, 6), V(-23.5, 1.5, 6)], "masuk");
    alat.jalurHisap = buatPipa([V(-18, 0.8, 11.5), V(-18, 0.8, 20.6)], "keluar");
    alat.jalurBuang = buatPipa([V(-18, 1.25, 21.0), V(-18, 2.2, 21.0), V(-14, 2.2, 21.0), V(-14, 2.2, 27), V(12, 2.2, 27), V(12, 4.5, 27), V(62, 4.5, 27)], "keluar");
    alat.valve = { "XV-101A": buatValve(V(-34, 1.5, 6), "x", "XV-101A"), "XV-101B": buatValve(V(-18, 0.8, 14.5), "z", "XV-101B") };
    buatCoriolis(V(-27, 1.5, 6), "x", "FIT-101");
    buatCoriolis(V(-6, 2.2, 27), "x", "FIT-102");
    alat.pompa = buatPompa(V(-18, 0, 21.0));
    // Gas detector GD-101: dekat pompa & valve (sumber bocoran), dipasang rendah
    const gd = new THREE.Group(); gd.position.set(-20.4, 0, 20.4); scene.add(gd);
    tabung(gd, 0.04, 0.04, 0.9, M.bajaGelap, 0, 0.45, 0); kotak(gd, 0.25, 0.2, 0.08, M.bajaGelap, 0, 0.75, 0.05);
    tabung(gd, 0.11, 0.11, 0.26, bahan(0xfacc15), 0, 0.62, 0.15);
    alat.ledGas = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), bahan(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 1 }));
    alat.ledGas.position.set(0, 0.82, 0.18); gd.add(alat.ledGas);
    tandai(gd, "GD-101");
    // Rak pipa (pipe rack) baja di jalur masuk & keluar
    for (let x = -60; x <= -40; x += 6) portal(V(x, 0, 6), "z");
    for (let x = 16; x <= 58; x += 7) portal(V(x, 0, 27), "z");
    papan("DARI PROSES / PKS", V(-60, 6.3, 6), 0);
    papan("KE REFINERY / LOADING", V(58, 6.3, 27), 0);
  }

  // Pipa: segmen-segmen tabung + siku (bola) + tekstur panah untuk animasi aliran
  function buatPipa(titik, jenis) {
    const warna = ATG_CONFIG.produk.CPO.warna;
    const panah = kanvas(64, 64, (c, w, h) => {
      c.fillStyle = "#" + warna.toString(16).padStart(6, "0"); c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(255,230,180,.85)"; c.beginPath(); c.moveTo(0, 40); c.lineTo(w / 2, 14); c.lineTo(w, 40); c.lineTo(w, 52); c.lineTo(w / 2, 26); c.lineTo(0, 52); c.fill();
    });
    panah.wrapS = panah.wrapT = THREE.RepeatWrapping;
    const jalur = { segmen: [], jenis };
    for (let i = 0; i < titik.length - 1; i++) {
      const a = titik[i], b = titik[i + 1], L = a.distanceTo(b);
      const tex = panah.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, L / 1.2);
      const matAlir = bahan(0xffffff, { map: tex, emissive: warna, emissiveIntensity: 0.25, roughness: 0.4 });
      const m = batang(scene, a, b, 0.16, M.pipa);
      jalur.segmen.push({ m, tex, matAlir });
      if (i > 0) { const siku = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), M.pipa); siku.position.copy(a); scene.add(siku); jalur.segmen.push({ m: siku }); }
      // flens tiap ujung segmen
      [a, b].forEach((p) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), M.bajaGelap); f.position.copy(p).lerp(p === a ? b : a, 0.4 / L); f.quaternion.copy(m.quaternion); scene.add(f); jalur.segmen.push({ m: f }); });
    }
    pipa.push(jalur);
    return jalur;
  }
  function portal(p, sumbu) {
    const lebar = 2.8, tinggi = 4.3;
    const off = (d) => (sumbu === "z" ? new THREE.Vector3(p.x, 0, p.z + d) : new THREE.Vector3(p.x + d, 0, p.z));
    [-lebar / 2, lebar / 2].forEach((d) => { const q = off(d); kotak(scene, 0.25, tinggi, 0.25, M.bajaGelap, q.x, tinggi / 2, q.z); });
    const balok = sumbu === "z" ? kotak(scene, 0.3, 0.25, lebar + 0.3, M.bajaGelap, p.x, tinggi, p.z) : kotak(scene, lebar + 0.3, 0.25, 0.3, M.bajaGelap, p.x, tinggi, p.z);
    return balok;
  }
  function papan(teks, p, rotY) {
    const tex = kanvas(512, 96, (c, w, h) => { c.fillStyle = "#0f2236"; c.fillRect(0, 0, w, h); c.strokeStyle = "#d4a24c"; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = "#fff"; c.font = "bold 40px Arial"; c.textAlign = "center"; c.fillText(teks, w / 2, 62); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.position.copy(p); m.rotation.y = rotY; scene.add(m);
    tabung(scene, 0.05, 0.05, p.y - 0.5, M.bajaGelap, p.x, (p.y - 0.5) / 2, p.z, 6);
  }
  // Valve bermotor: badan + flens + aktuator (warna status) + penunjuk posisi + roda tangan
  function buatValve(p, sumbu, tag) {
    const g = new THREE.Group(); g.position.copy(p); if (sumbu === "z") g.rotation.y = Math.PI / 2; scene.add(g);
    tabung(g, 0.27, 0.27, 0.55, bahan(0x1d4ed8), 0, 0, 0).rotation.z = Math.PI / 2;
    [-0.32, 0.32].forEach((x) => (tabung(g, 0.3, 0.3, 0.07, M.bajaGelap, x, 0, 0).rotation.z = Math.PI / 2));
    tabung(g, 0.06, 0.06, 0.4, M.baja, 0, 0.42, 0);
    const matAkt = bahan(0x94a3b8);
    kotak(g, 0.5, 0.42, 0.5, matAkt, 0, 0.82, 0);
    const roda = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 20), M.hitam); roda.position.set(0, 0.82, 0.32); g.add(roda);
    const penunjuk = kotak(g, 0.55, 0.05, 0.1, bahan(0xfacc15, { emissive: 0xfacc15, emissiveIntensity: 0.4 }), 0, 1.07, 0);
    g.traverse((m) => { if (m.isMesh) { m.userData.tag = tag; bisaDiklik.push(m); } });
    return { g, matAkt, penunjuk, roda };
  }
  // Coriolis flowmeter: dua pipa U + kepala transmitter
  function buatCoriolis(p, sumbu, tag) {
    const g = new THREE.Group(); g.position.copy(p); if (sumbu === "z") g.rotation.y = Math.PI / 2; scene.add(g);
    [-0.5, 0.5].forEach((x) => (tabung(g, 0.3, 0.3, 0.07, M.bajaGelap, x, 0, 0).rotation.z = Math.PI / 2));
    tabung(g, 0.2, 0.2, 1.0, M.baja, 0, 0, 0).rotation.z = Math.PI / 2;
    [-0.09, 0.09].forEach((z) => { const u = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.055, 8, 24, Math.PI), M.baja); u.rotation.z = Math.PI; u.position.set(0, -0.12, z); g.add(u); });
    kotak(g, 0.85, 0.1, 0.32, M.baja, 0, -0.12, 0);
    tabung(g, 0.07, 0.07, 0.3, M.baja, 0, 0.3, 0);
    kotak(g, 0.42, 0.32, 0.3, bahan(0x1e3a8a), 0, 0.58, 0);
    kotak(g, 0.3, 0.2, 0.02, bahan(0x0f172a, { emissive: 0x22d3ee, emissiveIntensity: 0.25 }), 0, 0.58, 0.16);
    g.traverse((m) => { if (m.isMesh) { m.userData.tag = tag; bisaDiklik.push(m); } });
    return g;
  }
  // Pompa sentrifugal end-suction + motor listrik di atas skid
  function buatPompa(p) {
    const g = new THREE.Group(); g.position.copy(p); scene.add(g);
    kotak(g, 1.1, 0.25, 3.4, M.kuning, 0, 0.12, 1.4);                                          // skid/base
    tabung(g, 0.48, 0.48, 0.42, bahan(0x1e40af), 0, 0.8, 0.05).rotation.x = Math.PI / 2;       // rumah pompa (volute)
    tabung(g, 0.2, 0.2, 0.75, bahan(0x1e40af), 0, 0.8, 0.6).rotation.x = Math.PI / 2;          // rumah bantalan
    kotak(g, 0.3, 0.55, 0.3, bahan(0x1e40af), 0, 0.42, 0.3);
    const kopling = new THREE.Group(); kopling.position.set(0, 0.8, 1.15); g.add(kopling);     // kopling berputar
    const pelindung = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.38, 12, 1, true), bahan(0xf59e0b, { side: THREE.DoubleSide, wireframe: false, transparent: true, opacity: 0.55 }));
    pelindung.rotation.x = Math.PI / 2; g.add(pelindung); pelindung.position.set(0, 0.8, 1.15);
    for (let i = 0; i < 4; i++) { const s = kotak(kopling, 0.4, 0.06, 0.06, M.hitam, 0, 0, 0); s.rotation.z = (i * Math.PI) / 4; }
    tabung(kopling, 0.12, 0.12, 0.3, M.baja, 0, 0, 0).rotation.x = Math.PI / 2;
    const motor = tabung(g, 0.42, 0.42, 1.2, bahan(0x15803d, { roughness: 0.45 }), 0, 0.85, 2.0); motor.rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) { const s = kotak(g, 0.04, 0.88, 1.1, bahan(0x166534), 0, 0.85, 2.0); s.rotation.z = (i * Math.PI) / 10; }   // sirip pendingin
    tabung(g, 0.4, 0.4, 0.28, M.baja, 0, 0.85, 2.72).rotation.x = Math.PI / 2;               // tutup kipas
    kotak(g, 0.3, 0.25, 0.35, bahan(0x14532d), 0, 1.35, 1.8);                                // terminal box
    // Lampu status pompa di tiang
    tabung(g, 0.04, 0.04, 1.6, M.bajaGelap, 0.9, 0.8, 0.4, 6);
    const lampu = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), bahan(0x64748b, { emissive: 0x000000 })); lampu.position.set(0.9, 1.7, 0.4); g.add(lampu);
    kotak(g, 0.3, 0.45, 0.15, bahan(0x334155), 0.9, 1.1, 0.4);                              // panel lokal start/stop
    g.traverse((m) => { if (m.isMesh) { m.userData.tag = "P-101"; bisaDiklik.push(m); } });
    return { g, kopling, lampu };
  }

  /* ---------- LINGKUNGAN PLANT ---------- */
  function buatLingkungan() {
    kotak(scene, 400, 1, 400, bahan(0x8c9a7a, { roughness: 1, metalness: 0 }), 0, -0.5, 0);           // tanah
    kotak(scene, 66, 0.12, 46, bahan(0xaeb3b7, { roughness: 1 }), 1, 0.06, -4.5);                        // lantai beton bund
    // Tanggul (bund wall) penahan tumpahan
    kotak(scene, 66, 1.0, 0.4, M.beton, 1, 0.5, -27.5); kotak(scene, 66, 1.0, 0.4, M.beton, 1, 0.5, 18.5);
    kotak(scene, 0.4, 1.0, 46, M.beton, -32, 0.5, -4.5); kotak(scene, 0.4, 1.0, 46, M.beton, 34, 0.5, -4.5);
    // Jalan & area pompa
    kotak(scene, 160, 0.1, 8, bahan(0x3f4652, { roughness: 1 }), 0, 0.05, 34);
    kotak(scene, 8, 0.1, 120, bahan(0x3f4652, { roughness: 1 }), -48, 0.05, 0);
    kotak(scene, 10, 0.15, 10, bahan(0xbfc4c8, { roughness: 1 }), -18, 0.08, 23);
    for (let x = -76; x < 80; x += 8) kotak(scene, 3, 0.12, 0.3, bahan(0xffffff), x, 0.06, 34);
    // Ruang kontrol ATG
    if (typeof Model3D !== "undefined") { const rk = Model3D.pabrik({ lebar: 16, dalam: 9, tinggi: 5, pita: 0xc8913f, nama: "ATG CONTROL ROOM" }); rk.position.set(40, 0, 44); scene.add(rk); }
    // Tiang lampu penerangan
    [[-36, -31], [38, -31], [-36, 23], [38, 23]].forEach(([x, z]) => { tabung(scene, 0.08, 0.12, 9, M.bajaGelap, x, 4.5, z, 8); kotak(scene, 0.8, 0.2, 0.4, bahan(0xf8fafc, { emissive: 0xfff7d6, emissiveIntensity: 0.5 }), x, 9, z); });
    // Pohon di luar plant
    for (let i = 0; i < 70; i++) {
      const x = -110 + Math.random() * 220, z = -110 + Math.random() * 220;
      if (x > -56 && x < 66 && z > -36 && z < 52) continue;
      tabung(scene, 0.3, 0.4, 2, bahan(0x7c5a3a), x, 1, z, 6);
      const d = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5.5, 7), bahan(0x2f7d3e, { flatShading: true })); d.position.set(x, 4.6, z); d.castShadow = true; scene.add(d);
    }
    // Penanda tangki terpilih: cincin emas di tanah
    alat.cincinPilih = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 64), new THREE.MeshBasicMaterial({ color: 0xd4a24c, transparent: true, side: THREE.DoubleSide }));
    alat.cincinPilih.rotation.x = -Math.PI / 2; alat.cincinPilih.position.y = 0.2; scene.add(alat.cincinPilih);
  }

  /* ---------- 5. KAMERA (putar, zoom, geser) ---------- */
  const orbit = { sudut: 1.15, tinggi: 0.95, jarak: 100, target: new THREE.Vector3(0, 3, 0), tujuan: null, auto: false };
  function kendaliMouse(cv) {
    let seret = null, gerak = 0;
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("pointerdown", (e) => { seret = { x: e.clientX, y: e.clientY, geser: e.button === 2 || e.shiftKey }; gerak = 0; orbit.tujuan = null; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => {
      if (!seret) return;
      const dx = e.clientX - seret.x, dy = e.clientY - seret.y; gerak += Math.abs(dx) + Math.abs(dy); seret.x = e.clientX; seret.y = e.clientY;
      if (seret.geser) {
        const k = orbit.jarak / 700;
        const kanan = new THREE.Vector3(Math.sin(orbit.sudut), 0, -Math.cos(orbit.sudut)), depan = new THREE.Vector3(Math.cos(orbit.sudut), 0, Math.sin(orbit.sudut));
        orbit.target.addScaledVector(kanan, dx * k).addScaledVector(depan, -dy * k);
      } else { orbit.sudut += dx * 0.006; orbit.tinggi = Math.max(0.12, Math.min(1.48, orbit.tinggi - dy * 0.005)); }
    });
    cv.addEventListener("pointerup", (e) => { if (seret && gerak < 5) klik(e); seret = null; });
    cv.addEventListener("wheel", (e) => { e.preventDefault(); orbit.tujuan = null; orbit.jarak = Math.max(4, Math.min(260, orbit.jarak * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  }
  const PRESET = {
    overview: [1.15, 0.95, 108, [2, 3, 2]],
    "TK-101": [1.25, 1.02, 40, [-18, 5.5, 9]],
    pompa: [0.55, 1.0, 13, [-18, 1, 22]],
    atap: [1.0, 0.62, 16, [-18, 11, 6]],
    inlet: [1.1, 1.0, 16, [-30, 1.5, 6]],
  };
  function kamera(nama) {
    let p = PRESET[nama];
    if (!p && tangki3D[nama]) { const T = tangki3D[nama]; p = [1.2, 1.02, T.R * 6.5, [T.t.x, T.H / 2, T.t.z + 2]]; }
    if (p) orbit.tujuan = { sudut: p[0], tinggi: p[1], jarak: p[2], target: new THREE.Vector3(...p[3]) };
  }
  function aturKamera() {
    const o = orbit;
    if (o.tujuan) {
      const g = o.tujuan, k = 0.08;
      o.sudut += (g.sudut - o.sudut) * k; o.tinggi += (g.tinggi - o.tinggi) * k; o.jarak += (g.jarak - o.jarak) * k; o.target.lerp(g.target, k);
      if (Math.abs(g.jarak - o.jarak) < 0.05 && o.target.distanceTo(g.target) < 0.05) o.tujuan = null;
    }
    if (o.auto) o.sudut += 0.002;
    cam.position.set(o.target.x + o.jarak * Math.sin(o.tinggi) * Math.cos(o.sudut), o.target.y + o.jarak * Math.cos(o.tinggi), o.target.z + o.jarak * Math.sin(o.tinggi) * Math.sin(o.sudut));
    cam.lookAt(o.target);
  }
  // Klik objek: tangki atau instrumen
  const ray = new THREE.Raycaster();
  function klik(e) {
    const r = ren.domElement.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, cam);
    const kena = ray.intersectObjects(bisaDiklik.filter((m) => m.visible && !(m.material.transparent && m.material.opacity < 0.5)), false)[0];
    if (!kena) return;
    const u = kena.object.userData;
    if (u.tag && opsi.mode === "detail") cb.inst(u.tag);
    else if (u.tag) cb.tangki("TK-101");
    else if (u.tangki) cb.tangki(u.tangki);
  }

  /* ---------- LABEL HTML ---------- */
  function buatLabel() {
    ATG_TANGKI.forEach((t) => {
      const d = document.createElement("div"); d.className = "atg-tlabel"; d.onclick = () => cb.tangki(t.id);
      wadah.appendChild(d); label.tangki[t.id] = { el: d, pos: new THREE.Vector3(t.x, 0.4 + t.tinggi + t.diameter * 0.09 + 1.6, t.z) };
    });
    const T = tangki3D["TK-101"], g = T.grup, H = T.H, w = (v) => g.localToWorld(v.clone());
    g.updateMatrixWorld(true);
    const posisi = {
      "LT-101": w(new THREE.Vector3(1.8, 0.4 + H + 2.2, 1.8)),
      "TT-101A": w(new THREE.Vector3(-2.2, 0.4 + H * 0.85, 1.4)), "TT-101B": w(new THREE.Vector3(-2.2, 0.4 + H * 0.5, 1.4)), "TT-101C": w(new THREE.Vector3(-2.2, 0.4 + H * 0.15, 1.4)),
      "PT-101": w(new THREE.Vector3(1.0, 0.4 + H + 2.0, -2.6)),
      LSHH: w(new THREE.Vector3(Math.sin(Math.PI * 0.2) * (T.R + 1.6), 0.4 + H * 0.95 + 0.3, Math.cos(Math.PI * 0.2) * (T.R + 1.6))),
      LSH: w(new THREE.Vector3(Math.sin(Math.PI * 0.2) * (T.R + 1.6), 0.4 + H * 0.9 - 0.2, Math.cos(Math.PI * 0.2) * (T.R + 1.6))),
      LSL: w(new THREE.Vector3(Math.sin(Math.PI * 0.2) * (T.R + 1.6), 0.4 + H * 0.1 + 0.6, Math.cos(Math.PI * 0.2) * (T.R + 1.6))),
      LSLL: w(new THREE.Vector3(Math.sin(Math.PI * 0.2) * (T.R + 1.6), 0.4 + H * 0.05 + 0.1, Math.cos(Math.PI * 0.2) * (T.R + 1.6))),
      "FIT-101": new THREE.Vector3(-27, 2.6, 6), "FIT-102": new THREE.Vector3(-6, 3.3, 27),
      "XV-101A": new THREE.Vector3(-34, 2.9, 6), "XV-101B": new THREE.Vector3(-18, 2.2, 14.5),
      "P-101": new THREE.Vector3(-18, 2.4, 23), "GD-101": new THREE.Vector3(-20.4, 1.4, 20.4),
    };
    Object.entries(posisi).forEach(([tag, pos]) => {
      const d = document.createElement("div"); d.className = "atg-ilabel"; d.onclick = () => cb.inst(tag);
      wadah.appendChild(d); label.inst[tag] = { el: d, pos };
    });
  }
  function posisiLabel() {
    const W = wadah.clientWidth, Hh = wadah.clientHeight;
    const taruh = (L, tampil) => {
      if (!tampil) { L.el.style.display = "none"; return; }
      const p = L.pos.clone().project(cam);
      const ok = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
      L.el.style.display = ok ? "" : "none";
      if (ok) { L.el.style.left = ((p.x + 1) / 2) * W + "px"; L.el.style.top = ((1 - p.y) / 2) * Hh + "px"; }
    };
    Object.values(label.tangki).forEach((L) => taruh(L, opsi.label && opsi.mode === "overview"));
    Object.values(label.inst).forEach((L) => taruh(L, opsi.label && opsi.mode === "detail" && opsi.pilih === "TK-101"));
  }

  /* ---------- 6. UPDATE TIAP FRAME ---------- */
  const warnaSuhu = (c) => new THREE.Color().setHSL(Math.max(0, Math.min(0.62, 0.62 - ((c - 40) / 30) * 0.62)), 0.9, 0.5);
  let waktuLalu = 0;
  function frame(t) {
    const dt = Math.min(0.1, (t - waktuLalu) / 1000); waktuLalu = t;
    const D = ATG.data, k = D.tk101, alarm = ATG_UI_ALARM_CACHE.daftar, kedip = Math.sin(t / 180) > 0;

    ATG_TANGKI.forEach((tk) => {
      const T = tangki3D[tk.id], s = D.tangki[tk.id];
      T.cair.scale.y = Math.max(0.01, (s.level / 100) * T.H);
      const tembus = opsi.cutaway || (opsi.mode === "detail" && opsi.pilih === tk.id);
      T.matShell.opacity = tembus ? 0.22 : 1; T.matShell.depthWrite = !tembus;
      T.matAtap.opacity = tembus ? 0.25 : 1; T.matAtap.depthWrite = !tembus;
      T.matCair.transparent = tembus; T.matCair.opacity = tembus ? 0.8 : 1;   // cairan sedikit tembus agar sensor suhu terlihat
      const st = ATG_ALARM.statusTangki(tk.id, alarm);
      T.matShell.emissive.set(st === "crit" ? (kedip ? 0x7f1d1d : 0x2a0a0a) : st === "warn" ? 0x3a2e05 : 0x000000);
    });

    // Radar: panjang sinar = jarak antena ke permukaan cairan
    const T = tangki3D["TK-101"], s = D.tangki["TK-101"];
    const yAntena = 0.4 + T.H + T.R * 0.18 * (1 - 2.55 / T.R), yCair = 0.45 + (s.level / 100) * T.H;
    alat.sinar.scale.y = Math.max(0.1, yAntena - yCair);
    alat.sinar.material.opacity = 0.18 + Math.abs(Math.sin(t / 300)) * 0.2;
    const dalam = opsi.cutaway || (opsi.mode === "detail" && opsi.pilih === "TK-101");
    alat.sinar.visible = dalam; alat.thermowell.visible = dalam; alat.tt.forEach((b) => (b.visible = dalam));
    alat.tt.forEach((b, i) => { const c = warnaSuhu(s.suhu[i]); b.material.color.copy(c); b.material.emissive.copy(c); });

    // LED saklar level
    const sw = ATG.saklarLevel("TK-101");
    Object.entries(alat.led).forEach(([tag, led]) => {
      const aktif = sw[tag], warna = !aktif ? 0x22c55e : tag === "LSH" || tag === "LSL" ? 0xfacc15 : kedip ? 0xef4444 : 0x450a0a;
      led.material.color.set(warna); led.material.emissive.set(warna);
    });

    // Valve: warna aktuator & posisi penunjuk (0° tertutup → 90° terbuka)
    Object.entries(alat.valve).forEach(([tag, v3]) => {
      const v = k.valve[tag];
      const warna = { OPEN: 0x22c55e, CLOSE: 0x94a3b8, MOVING: 0xfacc15, FAULT: kedip ? 0xef4444 : 0x7f1d1d }[v.status];
      v3.matAkt.color.set(warna); v3.matAkt.emissive.set(v.status === "CLOSE" ? 0x000000 : warna); v3.matAkt.emissiveIntensity = 0.3;
      v3.penunjuk.rotation.y = (Math.PI / 2) * (1 - v.posisi / 100);
      if (v.status === "MOVING") v3.roda.rotation.z += dt * 4;
    });

    // Pompa berputar saat RUN
    const p = k.pompa;
    if (p.status === "RUN") alat.pompa.kopling.rotation.z += dt * 25;
    const lampu = p.status === "RUN" ? 0x22c55e : p.status === "FAULT" ? (kedip ? 0xef4444 : 0x450a0a) : 0x64748b;
    alat.pompa.lampu.material.color.set(lampu); alat.pompa.lampu.material.emissive.set(p.status === "STOP" ? 0x000000 : lampu);

    // Gas detector LED
    const gas = k.gas, b = ATG_CONFIG.batas;
    const wg = gas >= b.GAS_ALARM ? (kedip ? 0xef4444 : 0x450a0a) : gas >= b.GAS_WARN ? 0xfacc15 : 0x22c55e;
    alat.ledGas.material.color.set(wg); alat.ledGas.material.emissive.set(wg);

    // Pipa: tampil/sembunyi + animasi panah aliran
    const alirMasuk = s.masuk > 0.3, alirKeluar = s.keluar > 0.3;
    pipa.forEach((j) => {
      const mengalir = opsi.aliran && (j.jenis === "masuk" ? alirMasuk : alirKeluar);
      const kec = j.jenis === "masuk" ? s.masuk : s.keluar;
      j.segmen.forEach((sg) => {
        sg.m.visible = opsi.pipa;
        if (!sg.tex) return;
        sg.m.material = mengalir ? sg.matAlir : M.pipa;
        if (mengalir) sg.tex.offset.y -= dt * kec * 0.08;
      });
    });

    // Cincin tangki terpilih
    const P = tangki3D[opsi.pilih];
    if (P) { alat.cincinPilih.position.x = P.t.x; alat.cincinPilih.position.z = P.t.z; const r = P.R + 1.1; alat.cincinPilih.scale.set(r, r, 1); alat.cincinPilih.material.opacity = 0.55 + Math.sin(t / 250) * 0.35; }

    aturKamera();
    ren.render(scene, cam);
    posisiLabel();
  }

  /* ---------- PEMBUATAN AWAL ---------- */
  function init(elWadah, callback) {
    if (siap) return true;
    if (typeof THREE === "undefined") return false;
    wadah = elWadah; cb = callback;
    ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.setSize(wadah.clientWidth, wadah.clientHeight);
    ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;
    wadah.prepend(ren.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc4de);
    scene.fog = new THREE.Fog(0x9fc4de, 160, 420);
    cam = new THREE.PerspectiveCamera(42, wadah.clientWidth / wadah.clientHeight, 0.2, 1200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a5a40, 0.62));
    const mtr = new THREE.DirectionalLight(0xffffff, 0.8); mtr.position.set(60, 90, 50); mtr.castShadow = true;
    mtr.shadow.mapSize.set(2048, 2048); Object.assign(mtr.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, far: 260 }); mtr.shadow.camera.updateProjectionMatrix();
    scene.add(mtr);
    buatLingkungan();
    ATG_TANGKI.forEach(buatTangki);
    buatInstrumen();
    buatLabel();
    kendaliMouse(ren.domElement);
    new ResizeObserver(() => {
      const W = wadah.clientWidth, H = wadah.clientHeight; if (!W || !H) return;
      ren.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix();
    }).observe(wadah);
    siap = true;
    return true;
  }

  return {
    init, frame, kamera, label, opsi, orbit,
    setOpsi(nama, nilai) { opsi[nama] = nilai; },
    siap: () => siap,
  };
})();

// Penyimpan daftar alarm terakhir (diisi oleh atg-ui.js tiap detik) agar frame 3D tidak menghitung ulang
const ATG_UI_ALARM_CACHE = { daftar: [] };
