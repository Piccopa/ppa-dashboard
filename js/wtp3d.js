/* =========================================================
   WTP3D.JS — MODEL 3D WATER TREATMENT PLANT (untuk Power Plant)
   Dipakai oleh modul "Water Treatment 3D" (js/scenes3d.js).
   Isinya "cetakan" peralatan yang bisa dipakai berulang:
     Wtp3D.pipa()          → pipa + elbow + tiang penyangga
     Wtp3D.aliran()        → animasi aliran (cincin bercahaya bergerak di pipa)
     Wtp3D.pompa()         → pompa sentrifugal horizontal + motor + lampu status
     Wtp3D.pompaVertikal() → pompa intake vertikal (vertical turbine)
     Wtp3D.bejana()        → bejana tekan vertikal (MMF, Mixed Bed, cartridge)
     Wtp3D.bak()           → bak beton persegi berisi air (flash mixer, flokulator)
     Wtp3D.clarifier()     → clarifier bundar + jembatan scraper berputar
     Wtp3D.rakRO()         → rak membran Reverse Osmosis
     Wtp3D.degasser()      → menara degasser + blower
     Wtp3D.tangkiBesar()   → tangki air demin besar + indikator level
     Wtp3D.tangkiKimia()   → tangki kimia PE tembus pandang + isi cairan
     Wtp3D.instrumen()     → transmitter FIT/PIT/LIT/TIT/AIT/PDIT + lampu status
     Wtp3D.shelter()       → bangunan atap terbuka
     Wtp3D.menaraPendingin(), Wtp3D.cerobong(), Wtp3D.kepulan(), Wtp3D.sungai()
   ========================================================= */

const Wtp3D = (() => {
  /* ---------- Alat bantu ---------- */
  const cache = {};
  const bahan = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1, ...o });
  const bersama = (k, c, o) => cache[k] || (cache[k] = bahan(c, o));       // material dipakai bersama (hemat memori)
  const M = (m) => (m && m.isMaterial ? m : bahan(m));
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const beton = () => bersama("beton", 0xc4c8cc, { roughness: 0.9 });
  const baja = () => bersama("baja", 0x7b8794, { metalness: 0.55, roughness: 0.4 });
  const galv = () => bersama("galv", 0xb6bec6, { metalness: 0.6, roughness: 0.35 });
  const kuning = () => bersama("kuning", 0xfacc15, { roughness: 0.5 });

  function kotak(induk, w, h, d, m, x, y, z) {          // y = dasar kotak
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(m));
    o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; induk.add(o); return o;
  }
  function tabung(induk, r1, r2, h, m, x, y, z, seg = 20) {   // y = dasar tabung
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), M(m));
    o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; induk.add(o); return o;
  }
  function poros(induk, r, L, m, x, y, z, sumbu = "x", seg = 18) {   // tabung mendatar, pusat (x,y,z)
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), M(m));
    if (sumbu === "x") o.rotation.z = Math.PI / 2; else o.rotation.x = Math.PI / 2;
    o.position.set(x, y, z); o.castShadow = true; induk.add(o); return o;
  }
  function batang(induk, a, b, r, m, seg = 10) {        // tabung dari titik a ke titik b
    const arah = V().subVectors(b, a), L = arah.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), M(m));
    o.position.copy(a).addScaledVector(arah, 0.5);
    o.quaternion.setFromUnitVectors(V(0, 1, 0), arah.normalize());
    o.castShadow = true; induk.add(o); return o;
  }
  function kanvas(w, h, gambar) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    gambar(c.getContext("2d"), w, h); t.needsUpdate = true; return t;
  }
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  function papanNama(induk, teks, x, y, z, rotY = 0, lebar = 8, warna = "#0ea5e9") {
    const t = kanvas(512, 80, (c, w, h) => {
      c.fillStyle = "#0f2236"; c.fillRect(0, 0, w, h); c.fillStyle = warna; c.fillRect(0, 0, 14, h);
      c.fillStyle = "#fff"; c.font = "bold 34px Arial"; c.textAlign = "center"; c.fillText(teks, w / 2 + 7, 52);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lebar, lebar * 0.156), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = rotY; induk.add(m); return m;
  }
  // Pagar pengaman kuning sepanjang garis (titik di ketinggian lantai)
  function pagar(induk, titik, h = 1.05) {
    for (let i = 0; i < titik.length - 1; i++) {
      const a = titik[i], b = titik[i + 1], L = a.distanceTo(b), n = Math.max(1, Math.round(L / 1.8));
      for (let k = 0; k <= n; k++) { const p = a.clone().lerp(b, k / n); tabung(induk, 0.04, 0.04, h, kuning(), p.x, p.y, p.z, 5); }
      batang(induk, V(a.x, a.y + h, a.z), V(b.x, b.y + h, b.z), 0.045, kuning(), 5);
      batang(induk, V(a.x, a.y + h / 2, a.z), V(b.x, b.y + h / 2, b.z), 0.035, kuning(), 5);
    }
  }

  /* ======================================================
     1) PIPA + ANIMASI ALIRAN
     ====================================================== */
  function tiangPipa(induk, x, yAtas, z) {
    kotak(induk, 0.6, 0.12, 0.6, beton(), x, 0, z);
    kotak(induk, 0.2, yAtas, 0.2, baja(), x, 0, z);
    kotak(induk, 0.9, 0.12, 0.9, baja(), x, yAtas - 0.12, z);
  }
  function pipa(induk, titik, r, warna, opsi = {}) {
    const m = warna && warna.isMaterial ? warna : bersama("pipa" + warna, warna, { metalness: 0.35, roughness: 0.45 });
    for (let i = 0; i < titik.length - 1; i++) {
      const a = titik[i], b = titik[i + 1];
      batang(induk, a, b, r, m, 12);
      if (opsi.tiang !== false && Math.abs(a.y - b.y) < 0.01 && a.y > 1.6) {      // pipa layang → beri tiang
        const L = a.distanceTo(b), n = Math.floor(L / 6.5);
        for (let k = 1; k <= n; k++) { const p = a.clone().lerp(b, k / (n + 1)); tiangPipa(induk, p.x, p.y - r, p.z); }
      }
    }
    for (let i = 1; i < titik.length - 1; i++) {                                  // elbow / sambungan
      const s = new THREE.Mesh(new THREE.SphereGeometry(r * 1.12, 12, 8), m); s.position.copy(titik[i]); induk.add(s);
    }
    if (opsi.flens !== false) [titik[0], titik[titik.length - 1]].forEach((p, i) => {   // flens di ujung
      const j = i === 0 ? titik[1] : titik[titik.length - 2];
      const arah = V().subVectors(p, j).normalize();
      batang(induk, p.clone().addScaledVector(arah, -0.08), p.clone().addScaledVector(arah, 0.08), r * 1.45, m, 12);
    });
  }

  // Aliran: cincin-cincin bercahaya yang bergerak di sepanjang pipa
  function aliran(induk, titik, warna, r) {
    const seg = []; let L = 0;
    for (let i = 0; i < titik.length - 1; i++) {
      const a = titik[i], b = titik[i + 1], len = a.distanceTo(b);
      if (len < 1e-4) continue;
      seg.push({ a, len, s0: L, arah: V().subVectors(b, a).normalize() }); L += len;
    }
    if (!seg.length) return { update() {}, mat: null, panjang: 0 };
    const N = Math.max(3, Math.round(L / 2.2));
    const mat = new THREE.MeshBasicMaterial({ color: warna, transparent: true, opacity: 0.95 });
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(r * 1.2, r * 1.2, 0.75, 10), mat, N);
    im.frustumCulled = false; induk.add(im);
    const dm = new THREE.Object3D(), atas = V(0, 1, 0);
    let fase = Math.random();
    function update(dt, kecepatan) {           // kecepatan 0..1 (0 = tidak mengalir)
      im.visible = kecepatan > 0.02;
      if (!im.visible) return;
      fase = (fase + (dt * kecepatan * 5.5) / L) % 1;
      for (let k = 0; k < N; k++) {
        const s = ((k / N + fase) % 1) * L;
        let g = seg[seg.length - 1];
        for (let i = 0; i < seg.length; i++) if (s <= seg[i].s0 + seg[i].len) { g = seg[i]; break; }
        dm.position.copy(g.a).addScaledVector(g.arah, s - g.s0);
        dm.quaternion.setFromUnitVectors(atas, g.arah);
        dm.updateMatrix(); im.setMatrixAt(k, dm.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }
    update(0.001, 1);
    return { update, mat, panjang: L };
  }

  /* ======================================================
     2) POMPA
     ====================================================== */
  function lampuStatus(induk, x, y, z) {
    tabung(induk, 0.03, 0.03, 0.5, baja(), x, y, z, 6);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), bahan(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 1 }));
    l.position.set(x, y + 0.6, z); induk.add(l);
    return l;
  }
  function setLampu(l, status) {    // "run" hijau, "stop" merah, "standby" kuning
    const c = status === "run" ? 0x22c55e : status === "standby" ? 0xf59e0b : 0xef4444;
    l.material.color.setHex(c); l.material.emissive.setHex(c);
  }
  // Pompa sentrifugal horizontal. Arah hisap (suction) = sumbu +x lokal; buang (discharge) ke atas.
  function pompa(induk, x, z, rotY = 0, warna = 0x1d4ed8, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; g.scale.setScalar(s); induk.add(g);
    const cat = bahan(warna, { metalness: 0.3, roughness: 0.45 });
    const gelap = bersama("pompaGelap", 0x334155, { metalness: 0.5, roughness: 0.4 });
    kotak(g, 4, 0.2, 1.6, beton(), 0, 0, 0);                         // pondasi
    kotak(g, 3.6, 0.22, 1.2, bersama("skid", 0x1f2937, { metalness: 0.4 }), 0, 0.2, 0);   // skid baja
    kotak(g, 1.1, 0.32, 0.85, gelap, -0.75, 0.42, 0);                // kaki motor
    poros(g, 0.48, 1.7, cat, -0.75, 0.98, 0, "x", 22);               // motor listrik
    for (let i = 0; i < 6; i++) poros(g, 0.53, 0.06, cat, -1.45 + i * 0.27, 0.98, 0, "x", 22);   // sirip pendingin
    poros(g, 0.45, 0.32, gelap, -1.75, 0.98, 0, "x", 18);            // tutup kipas
    kotak(g, 0.36, 0.3, 0.36, cat, -0.75, 1.44, 0);                  // kotak terminal
    kotak(g, 0.5, 0.5, 0.56, kuning(), 0.32, 0.7, 0);                // pelindung kopling
    kotak(g, 0.42, 0.34, 0.42, gelap, 0.75, 0.62, 0);                // rumah bantalan
    poros(g, 0.62, 0.55, bersama("volute", 0x475569, { metalness: 0.5, roughness: 0.35 }), 1.15, 0.98, 0, "x", 22);  // rumah keong (volute)
    poros(g, 0.22, 0.65, gelap, 1.72, 0.98, 0, "x", 14);             // nosel hisap
    poros(g, 0.33, 0.08, gelap, 2.04, 0.98, 0, "x", 14);             // flens hisap
    tabung(g, 0.19, 0.19, 0.6, gelap, 1.15, 1.5, 0, 14);             // nosel buang
    tabung(g, 0.3, 0.3, 0.08, gelap, 1.15, 2.08, 0, 14);             // flens buang
    const lampu = lampuStatus(g, -1.6, 0.2, 0.62);
    g.updateMatrixWorld(true);
    return { g, lampu, masuk: g.localToWorld(V(2.08, 0.98, 0)), keluar: g.localToWorld(V(1.15, 2.16, 0)), set: (st) => setLampu(lampu, st) };
  }
  // Pompa vertical turbine di atas dek intake. Buang ke arah +x lokal.
  function pompaVertikal(induk, x, y, z, warna = 0x1d4ed8) {
    const g = new THREE.Group(); g.position.set(x, y, z); induk.add(g);
    const cat = bahan(warna, { metalness: 0.3, roughness: 0.45 });
    kotak(g, 1.8, 0.18, 1.8, baja(), 0, 0, 0);                       // pelat dasar
    kotak(g, 1.0, 1.0, 1.0, bersama("volute", 0x475569, { metalness: 0.5, roughness: 0.35 }), 0, 0.18, 0);   // kepala buang
    poros(g, 0.26, 0.9, bersama("pompaGelap", 0x334155), 0.85, 0.68, 0, "x", 14);
    tabung(g, 0.42, 0.42, 0.4, bersama("pompaGelap", 0x334155), 0, 1.18, 0, 16);   // dudukan motor
    tabung(g, 0.6, 0.6, 1.6, cat, 0, 1.58, 0, 22);                   // motor tegak
    for (let i = 0; i < 5; i++) tabung(g, 0.65, 0.65, 0.06, cat, 0, 1.75 + i * 0.3, 0, 22);
    tabung(g, 0.5, 0.6, 0.3, bersama("pompaGelap", 0x334155), 0, 3.18, 0, 18);
    const lampu = lampuStatus(g, -0.8, 0.18, 0.8);
    g.updateMatrixWorld(true);
    return { g, lampu, keluar: g.localToWorld(V(1.3, 0.68, 0)), set: (st) => setLampu(lampu, st) };
  }

  /* ======================================================
     3) BEJANA TEKAN VERTIKAL (MMF / Mixed Bed / Cartridge)
     ====================================================== */
  function bejana(induk, x, z, R, H, warna, opsi = {}) {
    const kaki = opsi.kaki ?? 0.8;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = opsi.rotY || 0; induk.add(g);
    const tex = opsi.nama ? kanvas(512, 256, (c, w, h) => {
      c.fillStyle = hex(warna); c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(0, h * 0.08, w, 3); c.fillRect(0, h * 0.92, w, 3);
      c.fillStyle = opsi.warnaTeks || "#ffffff"; c.font = "bold 46px Arial"; c.textAlign = "center"; c.fillText(opsi.nama, w / 2, h * 0.42);
      if (opsi.sub) { c.font = "22px Arial"; c.fillText(opsi.sub, w / 2, h * 0.58); }
    }) : null;
    const mat = bahan(tex ? 0xffffff : warna, { map: tex, metalness: 0.35, roughness: 0.4 });
    for (let i = 0; i < 4; i++) {                                    // kaki penyangga
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      kotak(g, 0.18, kaki + R * 0.3, 0.18, baja(), Math.cos(a) * R * 0.78, 0, Math.sin(a) * R * 0.78);
      kotak(g, 0.45, 0.06, 0.45, baja(), Math.cos(a) * R * 0.78, 0, Math.sin(a) * R * 0.78);
    }
    const bawah = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat);
    bawah.scale.y = 0.5; bawah.position.y = kaki + R * 0.02; bawah.castShadow = true; g.add(bawah);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 32, 1, false, -Math.PI, Math.PI * 2), mat);
    shell.position.y = kaki + H / 2; shell.castShadow = shell.receiveShadow = true; g.add(shell);
    const atas = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    atas.scale.y = 0.5; atas.position.y = kaki + H; atas.castShadow = true; g.add(atas);
    tabung(g, R * 0.12, R * 0.12, R * 0.5 + 0.5, bersama("nosel", 0x64748b, { metalness: 0.5 }), 0, kaki + H, 0, 12);   // nosel atas
    poros(g, R * 0.2, 0.35, bersama("nosel", 0x64748b), 0, kaki + H * 0.3, R + 0.12, "z", 16);                          // manhole
    poros(g, R * 0.25, 0.08, bersama("nosel", 0x64748b), 0, kaki + H * 0.3, R + 0.3, "z", 16);
    if (opsi.kacaIntip) kotak(g, 0.14, H * 0.5, 0.06, bahan(0x7dd3fc, { emissive: 0x0e7490, emissiveIntensity: 0.5 }), R * 0.35, kaki + H * 0.25, R * 0.94);
    return { g, shell, mat, puncakY: kaki + H + R * 0.5 };
  }

  /* ======================================================
     4) BAK BETON & CLARIFIER
     ====================================================== */
  const bahanAir = (warna) => bahan(warna, { roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.86 });
  function bak(induk, x, z, w, d, h, warnaAir, opsi = {}) {
    const t = 0.4, tanpa = opsi.tanpa || [];
    kotak(induk, w, 0.3, d, beton(), x, 0, z);
    if (!tanpa.includes("utara")) kotak(induk, w, h, t, beton(), x, 0, z - d / 2 + t / 2);
    if (!tanpa.includes("selatan")) kotak(induk, w, h, t, beton(), x, 0, z + d / 2 - t / 2);
    if (!tanpa.includes("barat")) kotak(induk, t, h, d, beton(), x - w / 2 + t / 2, 0, z);
    if (!tanpa.includes("timur")) kotak(induk, t, h, d, beton(), x + w / 2 - t / 2, 0, z);
    const air = kotak(induk, w - 2 * t, 0.1, d - 2 * t, bahanAir(warnaAir), x, h - 0.55, z);
    if (opsi.pagar !== false) {
      const y = h, a = x - w / 2 + 0.2, b = x + w / 2 - 0.2, c = z - d / 2 + 0.2, e = z + d / 2 - 0.2;
      pagar(induk, [V(a, y, c), V(b, y, c), V(b, y, e), V(a, y, e), V(a, y, c)]);
    }
    return { air };
  }
  function clarifier(induk, x, z, R = 12, h = 4.2) {
    const dinding = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.45, R + 0.45, h, 56), beton());
    dinding.position.set(x, h / 2, z); dinding.castShadow = dinding.receiveShadow = true; induk.add(dinding);
    const air = new THREE.Mesh(new THREE.CircleGeometry(R, 56), bahanAir(0x4f9d97));
    air.rotation.x = -Math.PI / 2; air.position.set(x, h + 0.02, z); induk.add(air);
    const launder = new THREE.Mesh(new THREE.TorusGeometry(R - 0.9, 0.3, 6, 56), bersama("launder", 0x9ca3af, { roughness: 0.8 }));
    launder.rotation.x = Math.PI / 2; launder.position.set(x, h + 0.05, z); induk.add(launder);
    const sumur = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.2, 28, 1, true), bersama("sumur", 0xb0b6bc, { side: THREE.DoubleSide }));
    sumur.position.set(x, h + 0.3, z); induk.add(sumur);                                // sumur pusat (feed well)
    tabung(induk, 0.8, 0.9, 1.6, beton(), x, h, z, 16);                                  // pilar penggerak
    kotak(induk, 1.7, 0.9, 1.7, bersama("drive", 0x1e40af, { metalness: 0.3 }), x, h + 1.6, z);   // unit penggerak
    // Jembatan scraper yang berputar mengelilingi clarifier
    const jembatan = new THREE.Group(); jembatan.position.set(x, 0, z); induk.add(jembatan);
    kotak(jembatan, R + 0.4, 0.28, 1.5, bersama("jembatan", 0x64748b, { metalness: 0.5 }), R / 2 + 0.3, h + 1.15, 0);
    kotak(jembatan, R + 0.4, 0.06, 1.3, bersama("grating", 0x94a3b8, { metalness: 0.5 }), R / 2 + 0.3, h + 1.43, 0);
    pagar(jembatan, [V(0.9, h + 1.43, -0.7), V(R + 0.4, h + 1.43, -0.7)]);
    pagar(jembatan, [V(0.9, h + 1.43, 0.7), V(R + 0.4, h + 1.43, 0.7)]);
    kotak(jembatan, 1.3, 1.1, 1.8, bersama("drive", 0x1e40af), R + 0.3, h, 0);          // kereta ujung + roda
    kotak(jembatan, R - 2.4, 0.12, 0.35, bersama("skimmer", 0x1f2937), R / 2 + 0.6, h - 0.05, 0.9);   // lengan skimmer
    return { jembatan, air };
  }

  /* ======================================================
     5) RAK MEMBRAN REVERSE OSMOSIS
     ====================================================== */
  function rakRO(induk, x0, z0, panjang = 12, tingkat = [1.2, 2.1, 3.0, 3.9], kolom = [0.8, 1.9, 3.0, 4.1, 5.2]) {
    const g = new THREE.Group(); induk.add(g);
    const rangka = bersama("rangkaRO", 0x1e3a8a, { metalness: 0.4, roughness: 0.4 });
    const zMax = kolom[kolom.length - 1] + 0.6, yMax = tingkat[tingkat.length - 1] + 0.7;
    [0, panjang * 0.33, panjang * 0.66, panjang].forEach((dx) => [0, zMax].forEach((dz) => kotak(g, 0.18, yMax, 0.18, rangka, x0 + dx, 0, z0 + dz)));
    tingkat.forEach((y) => [0, zMax].forEach((dz) => kotak(g, panjang, 0.12, 0.12, rangka, x0 + panjang / 2, y - 0.5, z0 + dz)));
    [0, panjang].forEach((dx) => kotak(g, 0.12, 0.12, zMax, rangka, x0 + dx, yMax - 0.1, z0 + zMax / 2));
    // Pressure vessel putih (InstancedMesh supaya ringan)
    const n = tingkat.length * kolom.length;
    const pv = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.36, 0.36, panjang - 0.6, 18), bahan(0xf1f5f9, { roughness: 0.35, metalness: 0.1 }), n);
    const tutup = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 18), bahan(0x1d4ed8, { roughness: 0.4 }), n * 2);
    pv.castShadow = true; g.add(pv, tutup);
    const dm = new THREE.Object3D(); let i = 0, j = 0;
    tingkat.forEach((y) => kolom.forEach((z) => {
      dm.position.set(x0 + panjang / 2, y, z0 + z); dm.rotation.set(0, 0, Math.PI / 2); dm.updateMatrix(); pv.setMatrixAt(i++, dm.matrix);
      [0.3, panjang - 0.3].forEach((dx) => { dm.position.set(x0 + dx, y, z0 + z); dm.updateMatrix(); tutup.setMatrixAt(j++, dm.matrix); });
    }));
    return { g, zMax, yMax };
  }

  /* ======================================================
     6) DEGASSER (menara pembuang CO₂)
     ====================================================== */
  function degasser(induk, x, z) {
    const frp = bersama("frp", 0xe2e8f0, { roughness: 0.5 });
    kotak(induk, 5, 2.5, 3.6, frp, x, 0, z);                                            // bak penampung
    const tex = kanvas(256, 512, (c, w, h) => { c.fillStyle = "#e7ecf1"; c.fillRect(0, 0, w, h); c.fillStyle = "#0e7490"; c.fillRect(0, h * 0.1, w, 10); c.save(); c.translate(w * 0.5 + 12, h * 0.55); c.rotate(-Math.PI / 2); c.font = "bold 34px Arial"; c.textAlign = "center"; c.fillText("DEGASSER", 0, 0); c.restore(); });
    const menara = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 9, 28, 1, false, -Math.PI, Math.PI * 2), bahan(0xffffff, { map: tex, roughness: 0.5 }));
    menara.position.set(x, 2.5 + 4.5, z); menara.castShadow = true; induk.add(menara);
    tabung(induk, 0.5, 1.3, 0.8, frp, x, 11.5, z, 24);
    tabung(induk, 0.25, 0.25, 0.8, frp, x, 12.3, z, 12);                                 // ventilasi CO₂
    for (let i = 0; i < 9; i++) kotak(induk, 0.06, 0.06, 0.6, baja(), x, 2.8 + i, z + 1.55);   // anak tangga
    [-0.3, 0.3].forEach((dx) => kotak(induk, 0.07, 9.4, 0.07, baja(), x + dx, 2.5, z + 1.6));
    // Blower di samping bak
    kotak(induk, 1.2, 0.8, 1.0, bersama("pompaGelap", 0x334155), x - 3.2, 0, z);
    poros(induk, 0.7, 0.5, bersama("blower", 0x0e7490, { metalness: 0.3 }), x - 3.2, 1.55, z, "z", 22);
    const kipas = new THREE.Group(); kipas.position.set(x - 3.2, 1.55, z + 0.3); induk.add(kipas);
    for (let i = 0; i < 4; i++) { const b = kotak(kipas, 0.12, 0.6, 0.04, bersama("bilah", 0xe2e8f0), 0, -0.3, 0); b.rotation.z = (i * Math.PI) / 2; b.position.set(Math.sin((i * Math.PI) / 2) * 0.3, Math.cos((i * Math.PI) / 2) * 0.3, 0); }
    return { kipas };
  }

  /* ======================================================
     7) TANGKI BESAR (air demin) + indikator level
     ====================================================== */
  function tangkiBesar(induk, x, z, R, H, nama, sub) {
    const g = new THREE.Group(); g.position.set(x, 0, z); induk.add(g);
    tabung(g, R + 0.5, R + 0.6, 0.4, beton(), 0, 0, 0, 48);
    const tex = kanvas(1024, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f8fafc"); gr.addColorStop(1, "#dbe2e8"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(90,100,110,.25)"; for (let i = 1; i < 7; i++) c.fillRect(0, (h / 7) * i, w, 1.5);
      c.fillStyle = "#0369a1"; c.fillRect(0, h * 0.86, w, h * 0.05);
      c.fillStyle = "#0c4a6e"; c.font = "bold 40px Arial"; c.textAlign = "center"; c.fillText(nama, w / 2, h * 0.42);
      c.fillStyle = "#334155"; c.font = "22px Arial"; c.fillText(sub, w / 2, h * 0.58);
    });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 56, 1, false, -Math.PI, Math.PI * 2), bahan(0xffffff, { map: tex, metalness: 0.15, roughness: 0.45 }));
    shell.position.y = 0.4 + H / 2; shell.castShadow = shell.receiveShadow = true; g.add(shell);
    const atap = new THREE.Mesh(new THREE.ConeGeometry(R + 0.15, R * 0.2, 56), bahan(0xd5dbe0, { metalness: 0.25 }));
    atap.position.y = 0.4 + H + R * 0.1; atap.castShadow = true; g.add(atap);
    const pg = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; pg.push(V(Math.sin(a) * (R - 0.2), 0.4 + H, Math.cos(a) * (R - 0.2))); }
    pagar(g, pg, 0.9);
    // Tangga melingkar
    for (let i = 0; i < 30; i++) {
      const a = 1.2 + i * 0.075, y = 0.4 + (i / 30) * H;
      const s = kotak(g, 1.1, 0.1, 0.55, baja(), Math.sin(a) * (R + 0.6), y, Math.cos(a) * (R + 0.6)); s.rotation.y = a;
    }
    // Indikator level (tabung kaca + isi biru) di sisi depan
    const th = -0.45, rx = Math.sin(th) * (R + 0.35), rz = Math.cos(th) * (R + 0.35);
    tabung(g, 0.22, 0.22, H, bahan(0xe0f2fe, { transparent: true, opacity: 0.35 }), rx, 0.4, rz, 12);
    const isi = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 12), bahan(0x0284c7, { emissive: 0x0369a1, emissiveIntensity: 0.6 }));
    isi.position.set(rx, 0, rz); g.add(isi);
    const skala = kanvas(64, 512, (c, w, h) => { c.fillStyle = "#0f172a"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.font = "18px Arial"; for (let i = 0; i <= 10; i++) { const y = h - (h * i) / 10; c.fillRect(0, y - 1, i % 5 ? 14 : 24, 2); if (i % 5 === 0 && i) c.fillText(i * 10, 26, y + 6); } });
    const papan = new THREE.Mesh(new THREE.PlaneGeometry(0.8, H), new THREE.MeshBasicMaterial({ map: skala }));
    papan.position.set(Math.sin(th - 0.06) * (R + 0.08), 0.4 + H / 2, Math.cos(th - 0.06) * (R + 0.08)); papan.rotation.y = th - 0.06; g.add(papan);
    function setLevel(p) { const k = Math.max(0.01, Math.min(1, p / 100)); isi.scale.y = H * k; isi.position.y = 0.4 + (H * k) / 2; }
    setLevel(60);
    return { g, setLevel, atapY: 0.4 + H + R * 0.2 };
  }

  /* ======================================================
     8) TANGKI KIMIA PE (tembus pandang, isi cairan terlihat)
     ====================================================== */
  function tangkiKimia(induk, x, z, nama, warnaCairan, R = 1.4, H = 3.2, bahaya = "#facc15") {
    const g = new THREE.Group(); g.position.set(x, 0, z); induk.add(g);
    kotak(g, R * 2 + 0.6, 0.25, R * 2 + 0.6, beton(), 0, 0, 0);
    const cair = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.1, R - 0.1, 1, 24), bahan(warnaCairan, { roughness: 0.25, emissive: warnaCairan, emissiveIntensity: 0.15 }));
    g.add(cair);
    const kulit = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 28, 1, true), bahan(0xf8fafc, { transparent: true, opacity: 0.42, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    kulit.position.y = 0.25 + H / 2; g.add(kulit);
    const kubah = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), bahan(0xf1f5f9, { roughness: 0.4 }));
    kubah.scale.y = 0.35; kubah.position.y = 0.25 + H; kubah.castShadow = true; g.add(kubah);
    const label = kanvas(256, 160, (c, w, h) => {
      c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h); c.fillStyle = bahaya; c.fillRect(0, 0, w, 26);
      c.fillStyle = "#0f172a"; c.font = "bold 46px Arial"; c.textAlign = "center";
      const ukuran = Math.min(46, Math.floor((46 * 230) / c.measureText(nama).width));   // kecilkan huruf jika nama panjang
      c.font = `bold ${ukuran}px Arial`; c.fillText(nama, w / 2, 70 + ukuran * 0.4);
      c.font = "18px Arial"; c.fillText("CHEMICAL TANK", w / 2, 128);
    });
    const papan = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.1, R * 0.69), new THREE.MeshBasicMaterial({ map: label }));
    papan.position.set(0, 0.25 + H * 0.62, R + 0.04); g.add(papan);
    function setLevel(p) { const k = Math.max(0.02, Math.min(1, p / 100)); cair.scale.y = (H - 0.15) * k; cair.position.y = 0.3 + ((H - 0.15) * k) / 2; }
    setLevel(60);
    return { g, setLevel, puncakY: 0.25 + H + R * 0.35 };
  }

  /* ======================================================
     9) INSTRUMEN — warna menurut jenis:
        F=Flow(hijau) P=Pressure(biru) L=Level(ungu) T=Temperature(oranye)
        A=Analyzer(toska) D=Differential pressure(cyan) S=Status pompa
     ====================================================== */
  const WARNA_INST = { F: 0x16a34a, P: 0x2563eb, L: 0x7c3aed, T: 0xea580c, A: 0x0d9488, D: 0x0891b2, S: 0x22c55e };
  let texHalo = null;
  function instrumen(induk, tipe, x, y, z, opsi = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = opsi.rotY || 0; induk.add(g);
    const warna = bersama("inst" + tipe, WARNA_INST[tipe] || 0x64748b, { metalness: 0.3, roughness: 0.4 });
    const abu = bersama("instAbu", 0xd1d5db, { metalness: 0.4, roughness: 0.4 });
    const layar = bersama("instLayar", 0x0f172a, { emissive: 0x22d3ee, emissiveIntensity: 0.35 });
    let tinggiLabel = 1.4;
    if (tipe === "A") {                                              // panel analyzer pada tiang
      if (opsi.tiang !== false) kotak(g, 0.12, y, 0.12, galv(), 0, -y, 0);
      kotak(g, 0.95, 1.1, 0.28, bersama("panelA", 0xf8fafc, { roughness: 0.5 }), 0, -0.55, 0);
      kotak(g, 0.95, 0.14, 0.3, warna, 0, 0.42, 0);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), layar); l.position.set(0, 0.12, 0.145); g.add(l);
      kotak(g, 1.25, 0.06, 0.75, bersama("atapA", 0xe5e7eb), 0, 0.6, 0.12);
      tinggiLabel = 1.0;
    } else if (tipe === "L") {                                       // radar level di atap tangki
      const corong = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 14), abu); corong.rotation.x = Math.PI; corong.position.y = -0.12; g.add(corong);
      tabung(g, 0.3, 0.3, 0.08, abu, 0, 0.1, 0, 14);
      tabung(g, 0.2, 0.2, 0.32, warna, 0, 0.18, 0, 14);
      tabung(g, 0.22, 0.22, 0.06, abu, 0, 0.5, 0, 14);
      tinggiLabel = 1.1;
    } else if (tipe === "S") {                                       // lampu menara (stack light)
      kotak(g, 0.1, 2.2, 0.1, galv(), 0, 0, 0);
      const lampu = [0x22c55e, 0xf59e0b, 0xef4444].map((c, i) => { const m = tabung(g, 0.14, 0.14, 0.22, bahan(c, { emissive: c, emissiveIntensity: 0.2, transparent: true, opacity: 0.9 }), 0, 2.2 + i * 0.23, 0, 14); return m; });
      g.userData.lampu = lampu;
      tinggiLabel = 3.4;
    } else {                                                         // transmitter di pipa (F, P, T, D)
      const r = opsi.r || 0.38;
      if (opsi.tiang) kotak(g, 0.1, y, 0.1, galv(), 0, -y, 0);
      if (tipe === "F") {                                            // badan flowmeter (spool) pada pipa
        poros(g, r * 1.45, 0.75, bersama("spool", 0x1f2937, { metalness: 0.5 }), 0, 0, 0, opsi.sumbu || "x", 18);
        poros(g, r * 1.5, 0.12, warna, 0, 0, 0, opsi.sumbu || "x", 18);
      }
      if (tipe === "T") tabung(g, 0.05, 0.05, 0.4, abu, 0, r, 0, 8);
      if (tipe === "D") { batang(g, V(-0.25, 0.3, 0), V(-0.45, -0.4, 0), 0.03, abu, 6); batang(g, V(0.25, 0.3, 0), V(0.45, -0.4, 0), 0.03, abu, 6); }
      tabung(g, 0.05, 0.05, 0.4, abu, 0, r, 0, 8);                   // tangkai
      poros(g, 0.2, 0.36, warna, 0, r + 0.55, 0, "z", 16);           // rumah transmitter
      poros(g, 0.21, 0.05, abu, 0, r + 0.55, 0.2, "z", 16);
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), layar); l.position.set(0, r + 0.55, 0.23); g.add(l);
      if (tipe === "P") { const m = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), bahan(0xffffff)); m.position.set(0, r + 0.55, -0.2); m.rotation.y = Math.PI; g.add(m); }
      tinggiLabel = r + 1.25;
    }
    // Lingkaran merah berkedip saat alarm
    if (!texHalo) texHalo = kanvas(128, 128, (c, w) => { c.strokeStyle = "rgba(239,68,68,1)"; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 8, 0, Math.PI * 2); c.stroke(); c.strokeStyle = "rgba(239,68,68,.35)"; c.lineWidth = 22; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 22, 0, Math.PI * 2); c.stroke(); });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, transparent: true, depthTest: false }));
    halo.scale.set(2.2, 2.2, 1); halo.position.y = tipe === "S" ? 2.5 : 0.4; halo.visible = false; halo.renderOrder = 5; g.add(halo);
    return { g, halo, titik: V(x, y + tinggiLabel, z) };
  }
  function setStackLight(inst, status) {     // "run" | "standby" | "stop"
    const l = inst.g.userData.lampu; if (!l) return;
    l[0].material.emissiveIntensity = status === "run" ? 1.4 : 0.1;
    l[1].material.emissiveIntensity = status === "standby" ? 1.4 : 0.1;
    l[2].material.emissiveIntensity = status === "stop" ? 1.4 : 0.1;
  }

  /* ======================================================
     10) BANGUNAN ATAP TERBUKA (shelter)
     ====================================================== */
  function shelter(induk, x, z, w, d, h, opsi = {}) {
    const g = new THREE.Group(); induk.add(g);
    kotak(g, w, 0.3, d, bersama("lantai", 0xa8b0b8, { roughness: 0.85 }), x, 0, z);
    const kolom = bersama("kolom", 0x334155, { metalness: 0.4 });
    const n = Math.max(1, Math.round(w / 7));
    for (let i = 0; i <= n; i++) [-1, 1].forEach((s) => kotak(g, 0.35, h, 0.35, kolom, x - w / 2 + (w * i) / n, 0, z + s * (d / 2 - 0.2)));
    const atap = opsi.tembus
      ? bahan(0xcbd5e1, { transparent: true, opacity: 0.32, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide })
      : bersama("atap", 0x94a3b8, { metalness: 0.35, roughness: 0.5 });
    const a = kotak(g, w + 1, 0.2, d + 1, atap, x, h, z); a.castShadow = !opsi.tembus;
    [-1, 1].forEach((s) => kotak(g, w + 1.1, 0.55, 0.15, bahan(opsi.pita || 0x0ea5e9), x, h - 0.2, z + s * (d / 2 + 0.5)));
    for (let i = 0; i <= n; i++) kotak(g, 0.2, 0.25, d, kolom, x - w / 2 + (w * i) / n, h - 0.25, z);
    if (opsi.dindingBelakang) kotak(g, w, h, 0.2, bersama("dinding", 0xe2e8f0, { roughness: 0.8 }), x, 0, z - d / 2 + 0.1);
    if (opsi.nama) papanNama(g, opsi.nama, x, h + 0.75, z + d / 2 + 0.6, 0, Math.min(w * 0.4, 9), opsi.warnaNama);
    return g;
  }

  /* ======================================================
     11) ASAP / UAP, MENARA PENDINGIN, CEROBONG, SUNGAI
     ====================================================== */
  let texAsap = null;
  function kepulan(induk, sumber, o = {}) {
    const n = o.n || 16, durasi = o.durasi || 7000, naik = o.naik || 20, u0 = o.ukuran0 || 2, u1 = o.ukuran1 || 10;
    const angin = o.angin || V(10, 0, 3), sebar = o.sebar || 0.5, op = o.opasitas ?? 0.7;
    if (!texAsap) texAsap = kanvas(64, 64, (c, w) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, "rgba(245,245,245,1)"); gr.addColorStop(0.5, "rgba(215,215,220,.6)"); gr.addColorStop(1, "rgba(200,200,210,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const sp = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAsap, transparent: true, depthWrite: false, color: o.warna || 0xdedee3 }));
      s.userData = { fase: i / n, dx: (Math.random() - 0.5) * sebar * 2, dz: (Math.random() - 0.5) * sebar * 2 }; induk.add(s); sp.push(s);
    }
    return (t) => sp.forEach((s) => {
      const u = (t / durasi + s.userData.fase) % 1;
      s.position.set(sumber.x + s.userData.dx + angin.x * u, sumber.y + naik * u, sumber.z + s.userData.dz + angin.z * u);
      const k = u0 + (u1 - u0) * u; s.scale.set(k, k, 1);
      s.material.opacity = op * (1 - u) * Math.min(1, u * 6);
    });
  }
  function menaraPendingin(induk, x, z, R = 15, H = 32) {
    const rt = R * 0.62, yt = H * 0.78, pts = [];
    for (let i = 0; i <= 18; i++) {
      const y = (H * i) / 18;
      const r = y < yt ? rt + (R - rt) * Math.pow((yt - y) / yt, 2) : rt + (R * 0.7 - rt) * Math.pow((y - yt) / (H - yt), 2);
      pts.push(new THREE.Vector2(r, y));
    }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 44), bahan(0xd9dcdf, { side: THREE.DoubleSide, roughness: 0.95 }));
    m.position.set(x, 1.3, z); m.castShadow = true; induk.add(m);
    tabung(induk, R + 1.2, R + 1.2, 0.3, beton(), x, 0, z, 44);
    for (let i = 0; i < 28; i++) {                                   // kolom miring (celah udara masuk)
      const a = (i / 28) * Math.PI * 2;
      batang(induk, V(x + Math.cos(a) * R, 0.3, z + Math.sin(a) * R), V(x + Math.cos(a + 0.12) * R, 1.35, z + Math.sin(a + 0.12) * R), 0.2, beton(), 6);
    }
    return kepulan(induk, V(x, H + 1.5, z), { n: 22, warna: 0xffffff, durasi: 9000, naik: 26, ukuran0: R * 1.1, ukuran1: R * 2.4, angin: V(16, 0, 5), opasitas: 0.5, sebar: R * 0.35 });
  }
  function cerobong(induk, x, z, H = 55) {
    tabung(induk, 3, 3.3, 1.2, beton(), x, 0, z, 24);
    for (let i = 0; i < 10; i++) tabung(induk, 1.9 - i * 0.05, 2 - i * 0.05, H / 10, bahan(i % 2 ? 0xf8fafc : 0xdc2626), x, 1.2 + (i * H) / 10, z, 24);
    [0.45, 0.8].forEach((k) => { const r = new THREE.Mesh(new THREE.TorusGeometry(2.3 - k * 0.4, 0.15, 6, 24), baja()); r.rotation.x = Math.PI / 2; r.position.set(x, 1.2 + H * k, z); induk.add(r); });
    return kepulan(induk, V(x, H + 2, z), { n: 26, warna: 0xcfd1d6, durasi: 8000, naik: 24, ukuran0: 3, ukuran1: 15, angin: V(20, 0, -6), opasitas: 0.6, sebar: 0.6 });
  }
  function sungai(induk, x, lebar, panjang) {
    const tex = kanvas(128, 256, (c, w, h) => {
      c.fillStyle = "#3b82b8"; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 30, 2); }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(lebar / 20, panjang / 40);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lebar, panjang), bahan(0xffffff, { map: tex, roughness: 0.15, metalness: 0.2 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.position.set(x, -0.25, 0); m.receiveShadow = true; induk.add(m);
    kotak(induk, lebar + 6, 0.5, panjang, bersama("tebing", 0x8b7a5a, { roughness: 1 }), x, -0.85, 0);
    return (t) => { tex.offset.x = (t / 16000) % 1; };
  }

  return {
    kotak, tabung, poros, batang, kanvas, papanNama, pagar, bahan, bersama, beton, baja,
    pipa, aliran, pompa, pompaVertikal, setLampu, bejana, bak, clarifier, rakRO, degasser,
    tangkiBesar, tangkiKimia, instrumen, setStackLight, shelter, kepulan, menaraPendingin, cerobong, sungai,
  };
})();
