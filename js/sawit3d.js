/* =========================================================
   SAWIT3D.JS — MODEL 3D KEBUN & PABRIK KELAPA SAWIT
   Dipakai oleh modul "Grow Palm 3D" (js/scenes3d.js).
     Sawit3D.kebun()        → ratusan pohon sawit + tandan buah (InstancedMesh)
     Sawit3D.menaraLoRa()   → tiang antena gateway LoRa
     Sawit3D.nodeLoRa()     → titik sensor LoRa (suhu & kelembapan)
     Sawit3D.linkLoRa()     → garis putus-putus Tx/Rx beranimasi + paket data
     Sawit3D.pks()          → Pabrik Kelapa Sawit lengkap + asap cerobong
     Sawit3D.jembatanTimbang() → 2 jembatan timbang + layar berat + palang
     Sawit3D.tangkiCPO()    → tangki timbun CPO
     Sawit3D.rute()         → penggerak truk mengikuti jalur + berhenti
   ========================================================= */

const Sawit3D = (() => {
  /* ---------- Alat bantu ---------- */
  const bahan = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.05, ...o });
  function kotak(induk, w, h, d, m, x, y, z) {   // y = dasar kotak (berdiri di atas y)
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.isMaterial ? m : bahan(m));
    o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; induk.add(o); return o;
  }
  function tabung(induk, r1, r2, h, m, x, y, z, seg = 18) {   // y = dasar tabung
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m.isMaterial ? m : bahan(m));
    o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; induk.add(o); return o;
  }
  function batang(induk, a, b, r, m) {   // tabung dari titik a ke titik b
    const arah = new THREE.Vector3().subVectors(b, a), L = arah.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 6), m.isMaterial ? m : bahan(m));
    o.position.copy(a).addScaledVector(arah, 0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arah.normalize());
    induk.add(o); return o;
  }
  function kanvas(w, h, gambar) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.userData = { c, g: c.getContext("2d") };
    gambar(t.userData.g, w, h); t.needsUpdate = true; return t;
  }
  function papanNama(induk, teks, x, y, z, rotY = 0, lebar = 8) {
    const t = kanvas(512, 80, (c, w, h) => { c.fillStyle = "#0f2236"; c.fillRect(0, 0, w, h); c.strokeStyle = "#d4a24c"; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = "#fff"; c.font = "bold 34px Arial"; c.textAlign = "center"; c.fillText(teks, w / 2, 52); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lebar, lebar * 0.156), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = rotY; induk.add(m); return m;
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ======================================================
     1) POHON KELAPA SAWIT
     Satu tajuk (mahkota) = 17 pelepah. Setiap pelepah melengkung
     ke bawah karena berat, dengan anak daun di kiri-kanan yang
     panjangnya membesar di tengah lalu mengecil di ujung.
     Pelepah tua di bawah sedikit menguning.
     ====================================================== */
  function geoMahkota() {
    const pos = [], col = [];
    const cTua = new THREE.Color(0x1f4416), cMuda = new THREE.Color(0x4f8a24), cKuning = new THREE.Color(0x8a8a2e), cTulang = new THREE.Color(0x6b5a2e);
    const tri = (a, b, c, ca, cb, cc) => { pos.push(...a, ...b, ...c); col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b); };
    const N = 17, M = 11;
    for (let i = 0; i < N; i++) {
      const az = i * 2.39996;                           // sudut emas: susunan spiral seperti pohon asli
      const k = i / (N - 1);
      const elev = 1.3 - k * 1.8;                        // pelepah muda tegak, pelepah tua terkulai
      const L = (i < 2 ? 1.7 : 2.8) * (0.92 + ((i * 7) % 5) * 0.04);
      const kulai = 0.5 + k * 1.1;
      const dx = Math.cos(az), dz = Math.sin(az), sx = -dz, sz = dx;
      const P = (t) => [dx * L * t * Math.cos(elev), L * t * Math.sin(elev) - kulai * t * t, dz * L * t * Math.cos(elev)];
      const tua = k > 0.82;
      for (let j = 0; j < M; j++) {
        const t0 = j / M, t1 = (j + 1) / M, a = P(t0), b = P(t1), w = 0.045 * (1 - t0 * 0.7);
        tri([a[0] + sx * w, a[1], a[2] + sz * w], [a[0] - sx * w, a[1], a[2] - sz * w], b, cTulang, cTulang, cTulang);   // tulang daun (rachis)
        if (t0 < 0.12) continue;                                                                                      // pangkal pelepah berduri, tanpa daun
        const ll = 0.95 * Math.sin(Math.PI * Math.min(1, t0 + 0.08)) * (1 - t0 * 0.3);
        const c1 = tua ? cKuning : cTua.clone().lerp(cMuda, t0 * 0.7), c2 = tua ? cKuning : cMuda;
        const naik = j % 2 ? 0.18 : -0.12;               // anak daun bergantian naik/turun (bentuk V khas sawit)
        [1, -1].forEach((s) => {
          const ujung = [(a[0] + b[0]) / 2 + sx * s * ll + dx * ll * 0.4, (a[1] + b[1]) / 2 - ll * 0.3 + ll * naik, (a[2] + b[2]) / 2 + sz * s * ll + dz * ll * 0.4];
          tri(a, b, ujung, c1, c1, c2);
        });
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  // Tandan buah segar (TBS): bola berduri tidak rata
  function geoTandan() {
    const g = new THREE.IcosahedronGeometry(0.34, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 0.8 + ((i * 37) % 11) / 25; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 1.15, p.getZ(i) * f); }
    g.computeVertexNormals();
    return g;
  }
  // Tekstur batang: bekas pangkal pelepah berbentuk belah ketupat
  function teksturBatang() {
    const t = kanvas(64, 256, (c, w, h) => {
      c.fillStyle = "#5a4630"; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < w + 16; x += 32) {
        c.fillStyle = "#3b2c1d"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 16, y + 10); c.lineTo(x, y + 20); c.lineTo(x - 16, y + 10); c.fill();
        c.fillStyle = "#7a6343"; c.beginPath(); c.moveTo(x, y + 3); c.lineTo(x + 11, y + 10); c.lineTo(x, y + 16); c.lineTo(x - 11, y + 10); c.fill();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3);
    return t;
  }

  /* kebun(scene, daftarPosisi) → semua pohon sekaligus (InstancedMesh = ringan walau ratusan pohon) */
  function kebun(scene, titik) {
    const n = titik.length;
    const geoBatang = new THREE.CylinderGeometry(0.26, 0.36, 1, 9); geoBatang.translate(0, 0.5, 0);
    const batangM = new THREE.InstancedMesh(geoBatang, bahan(0xffffff, { map: teksturBatang(), roughness: 0.95 }), n);
    const geoPangkal = new THREE.CylinderGeometry(0.62, 0.34, 0.9, 10); geoPangkal.translate(0, 0.45, 0);
    const pangkal = new THREE.InstancedMesh(geoPangkal, bahan(0x4c5a26, { roughness: 0.9, flatShading: true }), n);
    const mahkota = new THREE.InstancedMesh(geoMahkota(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), n);
    const tandan = new THREE.InstancedMesh(geoTandan(), bahan(0xffffff, { roughness: 0.55, flatShading: true }), n * 3);
    const dm = new THREE.Object3D(), warna = new THREE.Color();
    const masak = [0xb8360c, 0xc2410c, 0x9a2a0a, 0x7f1d1d, 0x3b0d0d];   // merah-jingga (matang) sampai hitam (mentah)
    let nt = 0;
    titik.forEach((p, i) => {
      const h = 2.7 + ((i * 13) % 10) * 0.11, rot = (i * 2.7) % (Math.PI * 2), s = 0.92 + ((i * 7) % 5) * 0.04;
      dm.position.set(p.x, 0, p.z); dm.rotation.set(0, rot, 0); dm.scale.set(1, h, 1); dm.updateMatrix(); batangM.setMatrixAt(i, dm.matrix);
      dm.position.set(p.x, h - 0.1, p.z); dm.scale.set(1, 1, 1); dm.updateMatrix(); pangkal.setMatrixAt(i, dm.matrix);
      dm.position.set(p.x, h + 0.55, p.z); dm.scale.set(s, s, s); dm.updateMatrix(); mahkota.setMatrixAt(i, dm.matrix);
      const jumlah = 2 + (i % 2);
      for (let k = 0; k < jumlah; k++) {
        const a = rot + k * 2.2;
        dm.position.set(p.x + Math.cos(a) * 0.48, h + 0.2, p.z + Math.sin(a) * 0.48); dm.rotation.set(0.3, a, 0); dm.scale.setScalar(1); dm.updateMatrix();
        tandan.setMatrixAt(nt, dm.matrix); tandan.setColorAt(nt, warna.set(masak[(i + k) % masak.length])); nt++;
      }
    });
    tandan.count = nt;
    [batangM, pangkal, mahkota, tandan].forEach((m) => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
    return { batang: batangM, mahkota, tandan };
  }

  /* ======================================================
     2) LoRa: menara gateway, titik sensor, dan sinyal Tx/Rx
     ====================================================== */
  function menaraLoRa(scene, x, z, H = 22) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const baja = bahan(0xd1d5db, { metalness: 0.5, roughness: 0.4 }), merah = bahan(0xdc2626), putih = bahan(0xf8fafc);
    kotak(g, 4, 0.3, 4, 0x9ca3af, 0, 0, 0);
    const kaki = [0, 1, 2].map((i) => i * (Math.PI * 2) / 3 + 0.5);
    const titikKaki = (i, y) => { const r = 1.3 - (y / H) * 0.95; return V(Math.cos(kaki[i]) * r, y, Math.sin(kaki[i]) * r); };
    for (let i = 0; i < 3; i++) {
      for (let y = 0; y < H; y += 2) {
        const m = y > H - 6 ? (y / 2) % 2 ? merah : putih : baja;          // ujung menara belang merah-putih
        batang(g, titikKaki(i, y), titikKaki(i, y + 2), 0.07, m);         // kaki
        batang(g, titikKaki(i, y), titikKaki((i + 1) % 3, y + 2), 0.035, baja);   // silang penguat
        batang(g, titikKaki(i, y + 2), titikKaki((i + 1) % 3, y + 2), 0.035, baja);
      }
    }
    tabung(g, 0.9, 0.9, 0.12, baja, 0, H, 0, 12);                                 // bordes puncak
    [-0.45, 0.45].forEach((dx) => tabung(g, 0.06, 0.06, 3, putih, dx, H, 0.3, 8)); // antena omni LoRa
    kotak(g, 0.7, 0.9, 0.4, putih, 0, H - 3, 0.75);                                // kotak gateway LoRaWAN
    const panel = kotak(g, 1.8, 0.06, 1.1, bahan(0x1e3a8a, { metalness: 0.5, roughness: 0.25 }), 0, H - 5, -1.1); panel.rotation.x = -0.6;
    kotak(g, 1.2, 1.4, 0.8, 0xe5e7eb, 1.8, 0.3, 0);                                // kabinet bawah
    const lampu = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bahan(0xff0000, { emissive: 0xff0000, emissiveIntensity: 1 }));
    lampu.position.set(0, H + 3.2, 0.3); g.add(lampu);
    return { puncak: V(x, H + 2.7, z), lampu };
  }

  function nodeLoRa(scene, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const galv = bahan(0xa8b0b8, { metalness: 0.6, roughness: 0.35 });
    kotak(g, 0.6, 0.15, 0.6, 0x9ca3af, 0, 0, 0);
    tabung(g, 0.06, 0.07, 7, galv, 0, 0, 0, 8);                                    // tiang
    kotak(g, 0.45, 0.55, 0.25, 0xf1f5f9, 0, 1.1, 0.16);                             // kotak sensor tanah (suhu & kelembapan)
    batang(g, V(0, 1.1, 0.25), V(0.25, 0, 0.6), 0.02, 0x111827);                    // kabel ke probe tanah
    kotak(g, 0.12, 0.6, 0.12, 0x334155, 0.25, -0.5, 0.6);                           // probe di dalam tanah
    kotak(g, 0.5, 0.4, 0.3, 0xf8fafc, 0, 6.2, 0.18);                               // radio LoRa
    const panel = kotak(g, 0.9, 0.05, 0.6, bahan(0x1e3a8a, { metalness: 0.5, roughness: 0.25 }), 0, 6.75, -0.2); panel.rotation.x = -0.5;
    tabung(g, 0.025, 0.025, 1.3, 0x111827, 0.18, 6.6, 0.18, 6);                     // antena
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bahan(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 1 }));
    led.position.set(0, 6.45, 0.35); g.add(led);
    return { puncak: V(x + 0.18, 7.9, z + 0.18), led };
  }

  // Garis putus-putus yang "berjalan" + paket data. arah: "tx" (node → gateway), "rx" (gateway → node), "idle"
  function linkLoRa(scene, node, gateway) {
    const tengah = node.clone().lerp(gateway, 0.5); tengah.y += 5;
    const kurva = new THREE.QuadraticBezierCurve3(node, tengah, gateway);
    const N = 18, posisi = new Float32Array(N * 2 * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(posisi, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.3 });
    const garis = new THREE.LineSegments(geo, mat); scene.add(garis);
    const paket = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
    scene.add(paket);
    const tmp = new THREE.Vector3();
    function update(t, arah) {
      const lang = 1 / N, offset = ((t * 0.9) % 1) * lang;
      for (let k = 0; k < N; k++) {
        let u0 = k * lang + (arah === "rx" ? -offset : offset), u1 = u0 + lang * 0.5;
        u0 = ((u0 % 1) + 1) % 1; u1 = Math.min(1, u0 + lang * 0.5);
        kurva.getPoint(u0, tmp); posisi.set([tmp.x, tmp.y, tmp.z], k * 6);
        kurva.getPoint(u1, tmp); posisi.set([tmp.x, tmp.y, tmp.z], k * 6 + 3);
      }
      geo.attributes.position.needsUpdate = true;
      mat.color.set(arah === "rx" ? 0xfacc15 : 0x22d3ee);
      mat.opacity = arah === "idle" ? 0.22 : 0.95;
      paket.visible = arah !== "idle";
      if (paket.visible) {
        const p = (t * 0.8) % 1;
        kurva.getPoint(arah === "rx" ? 1 - p : p, paket.position);
        paket.material.color.set(arah === "rx" ? 0xfacc15 : 0x22d3ee);
      }
    }
    return { update, setTampil(v) { garis.visible = v; if (!v) paket.visible = false; } };
  }

  /* ======================================================
     3) TANGKI TIMBUN CPO
     ====================================================== */
  function tangkiCPO(scene, x, z, nama, R = 4.5, H = 10) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    tabung(g, R + 0.4, R + 0.5, 0.4, 0xb9bdc1, 0, 0, 0, 40);
    const tex = kanvas(512, 160, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f3f5f7"); gr.addColorStop(1, "#d6dbe0"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(90,100,110,.3)"; for (let i = 1; i < 6; i++) c.fillRect(0, (h / 6) * i, w, 1.5);
      c.fillStyle = "#7c2d12"; c.font = "bold 40px Arial"; c.textAlign = "center"; c.fillText(nama, w / 2, h * 0.45);
      c.fillStyle = "#334155"; c.font = "18px Arial"; c.fillText("CRUDE PALM OIL · " + CONFIG.namaSingkat, w / 2, h * 0.62);
    });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, false, -Math.PI, Math.PI * 2), bahan(0xffffff, { map: tex, metalness: 0.15, roughness: 0.5 }));
    shell.position.y = 0.4 + H / 2; shell.castShadow = shell.receiveShadow = true; g.add(shell);
    const atap = new THREE.Mesh(new THREE.ConeGeometry(R + 0.1, R * 0.2, 48), bahan(0xcfd5da, { metalness: 0.2 }));
    atap.position.y = 0.4 + H + R * 0.1; atap.castShadow = true; g.add(atap);
    const pagar = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1, 0.04, 6, 60), bahan(0xeab308)); pagar.rotation.x = Math.PI / 2; pagar.position.y = 0.4 + H + 1; g.add(pagar);
    // tangga lurus miring di sisi tangki
    const kuning = bahan(0xeab308), gelap = bahan(0x475569);
    for (let i = 0; i < 26; i++) { const y = 0.4 + (i / 26) * H; kotak(g, 0.9, 0.05, 0.3, gelap, R + 0.6, y, -R * 0.6 + (i / 26) * R * 1.2); }
    batang(g, V(R + 1.1, 1.4, -R * 0.6), V(R + 1.1, H + 1.4, R * 0.6), 0.04, kuning);
    // indikator level di dinding (pipa gelas penduga)
    tabung(g, 0.08, 0.08, H - 0.6, bahan(0x94a3b8), Math.sin(-0.5) * (R + 0.15), 0.7, Math.cos(-0.5) * (R + 0.15), 8);
    return { g, puncakY: 0.4 + H + R * 0.2 };
  }

  /* ======================================================
     4) PABRIK KELAPA SAWIT (PKS)
     Alur: Loading ramp & sortasi TBS → Sterilizer → Thresher →
     Press & Klarifikasi → Tangki CPO. Ampas serat & cangkang
     dibakar di Boiler (asap cerobong). Biji → Kernel plant.
     ====================================================== */
  function pks(scene) {
    const anim = [];
    const beton = bahan(0xb9bdc1, { roughness: 0.95 }), baja = bahan(0x64748b, { metalness: 0.4 }), atapSeng = bahan(0x94a3b8, { metalness: 0.3, roughness: 0.45 });

    // Lantai beton kompleks pabrik
    kotak(scene, 112, 0.1, 62, bahan(0xaab0b5, { roughness: 1 }), -14, 0, 98);

    // ---- Loading ramp & area sortasi TBS ----
    const ramp = new THREE.Group(); ramp.position.set(-20, 0, 106); scene.add(ramp);
    const lantaiRamp = kotak(ramp, 22, 0.6, 8, beton, 0, 1.4, 0); lantaiRamp.rotation.x = 0.22;      // lantai miring
    kotak(ramp, 22, 1.4, 0.4, beton, 0, 0, 4.2);                                                  // dinding bawah
    for (let x = -10; x <= 10; x += 4) [-4.2, 4.2].forEach((z) => tabung(ramp, 0.15, 0.15, 7, baja, x, 0, z, 8));  // kolom
    const atap = kotak(ramp, 24, 0.2, 10.5, atapSeng, 0, 7, 0); atap.rotation.x = -0.08;
    for (let x = -9; x <= 9; x += 3) kotak(ramp, 0.15, 1.2, 7.4, beton, x, 1.2, -0.4);              // sekat antar bay
    // Tumpukan TBS di setiap bay + area sortasi di depan
    const geoT = geoTandan(), tumpuk = new THREE.InstancedMesh(geoT, bahan(0xffffff, { flatShading: true, roughness: 0.6 }), 520);
    const dm = new THREE.Object3D(), w = new THREE.Color(); let n = 0;
    const warnaTBS = [0xb8360c, 0x9a2a0a, 0x7f1d1d, 0x3b0d0d, 0xc2410c];
    for (let bay = 0; bay < 6; bay++) for (let i = 0; i < 55; i++) {
      const r = Math.random() * 1.2, a = Math.random() * 6.28, hgt = (1.3 - r) * 1.2 * Math.random();
      dm.position.set(-20 - 7.5 + bay * 3 + Math.cos(a) * r * 0.9, 2.4 + hgt - (Math.sin(a) * r) * 0.2, 106 + Math.sin(a) * r * 2); dm.rotation.set(a, a * 2, 0); dm.scale.setScalar(1.3); dm.updateMatrix();
      tumpuk.setMatrixAt(n, dm.matrix); tumpuk.setColorAt(n, w.set(warnaTBS[n % 5])); n++;
    }
    for (let p = 0; p < 4; p++) for (let i = 0; i < 50; i++) {           // area sortasi (grading) di depan ramp
      const r = Math.random() * 1.6, a = Math.random() * 6.28;
      dm.position.set(-27 + p * 5 + Math.cos(a) * r, 0.35 + (1.6 - r) * 0.5 * Math.random(), 98.5 + Math.sin(a) * r * 0.7); dm.rotation.set(a, a, 0); dm.scale.setScalar(1.3); dm.updateMatrix();
      tumpuk.setMatrixAt(n, dm.matrix); tumpuk.setColorAt(n, w.set(warnaTBS[(n * 3) % 5])); n++;
    }
    tumpuk.count = n; tumpuk.castShadow = true; scene.add(tumpuk);
    papanNama(scene, "LOADING RAMP & SORTASI TBS", -20, 8.6, 111.4, 0, 12);
    // Lori (keranjang besi) di atas rel menuju sterilizer
    kotak(scene, 34, 0.12, 0.25, baja, -6, 0.1, 113.2); kotak(scene, 34, 0.12, 0.25, baja, -6, 0.1, 114.4);
    for (let i = 0; i < 6; i++) kotak(scene, 2.2, 1.3, 1.6, bahan(0x374151, { metalness: 0.5 }), -24 + i * 3.2, 0.25, 113.8);

    // ---- Sterilizer: 3 bejana silinder horizontal ----
    const st = new THREE.Group(); st.position.set(6, 0, 106); scene.add(st);
    [-3.5, 0, 3.5].forEach((z) => {
      const b = tabung(st, 1.35, 1.35, 13, bahan(0x9ca3af, { metalness: 0.55, roughness: 0.35 }), 0, 0, z, 24); b.rotation.z = Math.PI / 2; b.position.y = 1.8;
      const pintu = new THREE.Mesh(new THREE.SphereGeometry(1.35, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), bahan(0x6b7280, { metalness: 0.5 })); pintu.rotation.z = -Math.PI / 2; pintu.scale.set(1, 0.35, 1); pintu.position.set(6.5, 1.8, z); st.add(pintu);
      [-4, 0, 4].forEach((x) => kotak(st, 0.4, 0.6, 1.6, beton, x, 0, z));
    });
    kotak(st, 16, 0.2, 12, atapSeng, 0, 5.5, 0);                                   // atap stasiun
    [-7.5, 7.5].forEach((x) => [-5.5, 5.5].forEach((z) => tabung(st, 0.15, 0.15, 5.5, baja, x, 0, z, 8)));
    papanNama(scene, "STERILIZER", 6, 6.6, 112.2, 0, 7);

    // ---- Gedung Thresher, Press & Klarifikasi, Boiler, Kernel ----
    const g1 = Model3D.pabrik({ lebar: 16, dalam: 12, tinggi: 14, pita: 0xc2410c, nama: "THRESHER & PRESS" }); g1.position.set(24, 0, 108); scene.add(g1);
    const g2 = Model3D.pabrik({ lebar: 13, dalam: 10, tinggi: 11, pita: 0x475569, nama: "BOILER" }); g2.position.set(43, 0, 110); scene.add(g2);
    const g3 = Model3D.pabrik({ lebar: 14, dalam: 10, tinggi: 10, pita: 0x7c3aed, nama: "KERNEL PLANT" }); g3.position.set(4, 0, 124); scene.add(g3);
    // Tangki klarifikasi (CST) dan oil tank kecil
    [[33, 99], [37.5, 99]].forEach(([x, z]) => { tabung(scene, 1.9, 1.9, 6.5, bahan(0xe5e7eb, { metalness: 0.3 }), x, 0, z, 24); });
    papanNama(scene, "KLARIFIKASI", 35.2, 7.6, 101.2, 0, 6);
    // Silo kernel dengan kaki dan corong bawah
    [17, 21, 25].forEach((x) => {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => tabung(scene, 0.1, 0.1, 2.6, baja, x + a, 0, 124 + b, 6));
      const corong = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.4, 20), bahan(0xcbd5e1, { metalness: 0.4 })); corong.rotation.x = Math.PI; corong.position.set(x, 3.0, 124); scene.add(corong);
      tabung(scene, 1.6, 1.6, 6, bahan(0xe2e8f0, { metalness: 0.4 }), x, 3.7, 124, 24);
    });
    // Konveyor miring dari thresher ke boiler (serat & cangkang)
    const konv = kotak(scene, 14, 0.5, 1, baja, 34, 8, 115); konv.rotation.z = 0.25;
    // Cerobong boiler belang merah-putih
    const cx = 51, cz = 116, tinggiC = 34;
    tabung(scene, 2.2, 2.4, 1, beton, cx, 0, cz, 20);
    for (let i = 0; i < 8; i++) tabung(scene, 1.25 - i * 0.04, 1.3 - i * 0.04, tinggiC / 8, i % 2 ? 0xf8fafc : 0xdc2626, cx, 1 + (i * tinggiC) / 8, cz, 20);
    const lampuC = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), bahan(0xff0000, { emissive: 0xff0000, emissiveIntensity: 1 })); lampuC.position.set(cx, tinggiC + 1.3, cz); scene.add(lampuC);
    // ASAP: kumpulan sprite lembut yang naik, membesar, lalu memudar
    const texAsap = kanvas(64, 64, (c, w2) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, "rgba(235,235,235,1)"); gr.addColorStop(0.5, "rgba(200,200,205,.6)"); gr.addColorStop(1, "rgba(180,180,190,0)"); c.fillStyle = gr; c.fillRect(0, 0, w2, w2); });
    const asap = [];
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAsap, transparent: true, depthWrite: false, color: 0xd6d6db }));
      s.userData.fase = i / 40; scene.add(s); asap.push(s);
    }
    anim.push((t) => {
      asap.forEach((s) => {
        const u = ((t / 7000) + s.userData.fase) % 1;                  // umur 0 → 1
        s.position.set(cx + u * 16 + Math.sin(u * 9 + s.userData.fase * 20) * 1.2, tinggiC + 1.5 + u * 22, cz - u * 6);
        const ukuran = 2.2 + u * 11; s.scale.set(ukuran, ukuran, 1);
        s.material.opacity = 0.75 * (1 - u) * Math.min(1, u * 8);
      });
      lampuC.material.emissiveIntensity = Math.sin(t / 400) > 0 ? 1 : 0.1;
    });
    // Uap tipis dari atap sterilizer
    const uap = [];
    for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAsap, transparent: true, depthWrite: false, color: 0xffffff })); s.userData.fase = i / 10; scene.add(s); uap.push(s); }
    anim.push((t) => uap.forEach((s) => { const u = ((t / 4000) + s.userData.fase) % 1; s.position.set(12 + u * 2, 6 + u * 7, 106); const k = 1 + u * 4; s.scale.set(k, k, 1); s.material.opacity = 0.5 * (1 - u); }));

    // ---- Tumpukan janjang kosong (tankos) & kolam limbah (POME) ----
    const tankos = new THREE.Mesh(new THREE.ConeGeometry(5, 3, 12), bahan(0x5b4630, { flatShading: true, roughness: 1 })); tankos.position.set(-38, 1.5, 116); scene.add(tankos);
    [[-80, 100, 0x4b5320], [-80, 112, 0x3f4a1e], [-80, 124, 0x55602a]].forEach(([x, z, c]) => {
      kotak(scene, 22, 0.8, 10, bahan(0x8a7a5a, { roughness: 1 }), x, 0, z);
      kotak(scene, 20, 0.3, 8.4, bahan(c, { roughness: 0.3, metalness: 0.1 }), x, 0.6, z);
    });
    papanNama(scene, "KOLAM LIMBAH (POME)", -80, 2.6, 130, 0, 9);
    // Pagar keliling pabrik
    [[-14, 64.5, 112, 0.15], [-14, 130.5, 112, 0.15]].forEach(([x, z, L, d]) => kotak(scene, L, 1.8, d, bahan(0x94a3b8, { metalness: 0.4 }), x, 0, z));
    return { anim, cerobong: V(cx, tinggiC, cz) };
  }

  /* ======================================================
     5) JEMBATAN TIMBANG — 2 lajur (masuk & keluar)
     ====================================================== */
  function jembatanTimbang(scene, xMasuk, xKeluar, zTengah) {
    const baja = bahan(0x6b7280, { metalness: 0.5, roughness: 0.4 }), beton = bahan(0xb9bdc1, { roughness: 0.95 });
    const plat = kanvas(64, 64, (c, w, h) => { c.fillStyle = "#6b7280"; c.fillRect(0, 0, w, h); c.fillStyle = "#9ca3af"; for (let y = 4; y < h; y += 12) for (let x = (y / 12) % 2 ? 0 : 6; x < w; x += 12) c.fillRect(x, y, 6, 2); });
    plat.wrapS = plat.wrapT = THREE.RepeatWrapping; plat.repeat.set(2, 8);
    [xMasuk, xKeluar].forEach((x) => {
      kotak(scene, 2.6, 0.1, 10, beton, x, 0, zTengah);                                        // pondasi
      kotak(scene, 2.1, 0.06, 9, bahan(0xffffff, { map: plat, metalness: 0.4 }), x, 0.08, zTengah);   // plat timbang (rata dengan jalan)
      [-1, 1].forEach((s) => kotak(scene, 0.12, 0.25, 9, bahan(0xfacc15), x + s * 1.15, 0.1, zTengah));   // pembatas kuning
    });
    // Rumah timbang + papan nama
    const rumah = Model3D.kantor({ lebar: 5, dalam: 4, tinggi: 7, kaca: 0x2f6ea8, nama: "WB" });
    rumah.position.set(xMasuk - 5.5, 0, zTengah); rumah.rotation.y = Math.PI / 2; scene.add(rumah);
    papanNama(scene, "JEMBATAN TIMBANG", xMasuk - 5.5, 8.6, zTengah, Math.PI / 2, 8);
    // Layar berat (digital) di samping tiap lajur
    const layar = [xMasuk - 1.9, xKeluar + 1.9].map((x, i) => {
      tabung(scene, 0.08, 0.08, 2.4, baja, x, 0, zTengah - 4.8, 6);
      const tex = kanvas(256, 96, () => {});
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      m.position.set(x, 2.9, zTengah - 4.8); scene.add(m);
      return { tex, nama: i ? "WB-02 KELUAR" : "WB-01 MASUK" };
    });
    function tulis(i, baris1, baris2, warna = "#22c55e") {
      const L = layar[i], c = L.tex.userData.g;
      c.fillStyle = "#020617"; c.fillRect(0, 0, 256, 96); c.strokeStyle = "#334155"; c.lineWidth = 4; c.strokeRect(2, 2, 252, 92);
      c.fillStyle = "#94a3b8"; c.font = "bold 16px Arial"; c.fillText(L.nama + " · " + baris2, 12, 24);
      c.fillStyle = warna; c.font = "bold 44px Consolas, monospace"; c.fillText(baris1, 12, 76);
      L.tex.needsUpdate = true;
    }
    tulis(0, "0 kg", "SIAP"); tulis(1, "0 kg", "SIAP");
    // Palang pintu (boom gate) setelah jembatan timbang
    const palang = [[xMasuk, zTengah + 5.6, -1], [xKeluar, zTengah - 5.6, 1]].map(([x, z, s]) => {
      kotak(scene, 0.4, 1.1, 0.4, bahan(0xf8fafc), x - s * 1.6, 0, z);
      const poros = new THREE.Group(); poros.position.set(x - s * 1.6, 1.0, z); scene.add(poros);
      const lengan = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.12), bahan(0xdc2626)); lengan.position.x = s * 1.6; poros.add(lengan);
      return poros;
    });
    return { tulis, palang };
  }

  /* ======================================================
     6) PENGGERAK RUTE: kendaraan mengikuti titik-titik jalan,
        bisa berhenti di titik tertentu (timbang, isi muatan)
     ====================================================== */
  function rute(kendaraan, titik, kecepatan, berhenti = {}) {
    const seg = [];
    let total = 0;
    for (let i = 0; i < titik.length - 1; i++) { const L = titik[i].distanceTo(titik[i + 1]); seg.push({ a: titik[i], b: titik[i + 1], s0: total, L }); total += L; }
    const st = { s: 0, tunggu: 0, indeksBerhenti: -1, sudut: null };
    const titikS = titik.map((_, i) => (i === 0 ? 0 : seg[i - 1].s0 + seg[i - 1].L));
    function update(dt, onBerhenti) {
      if (st.tunggu > 0) { st.tunggu -= dt; if (st.tunggu <= 0 && onBerhenti) onBerhenti(st.indeksBerhenti, "jalan"); return; }
      const sLama = st.s;
      st.s += kecepatan * dt;
      // cek titik berhenti yang terlewati
      Object.keys(berhenti).forEach((k) => {
        const i = +k, sT = titikS[i];
        if (sLama < sT && st.s >= sT) { st.s = sT; st.tunggu = berhenti[k]; st.indeksBerhenti = i; if (onBerhenti) onBerhenti(i, "berhenti"); }
      });
      if (st.s >= total) { st.s = 0; if (onBerhenti) onBerhenti(-1, "ulang"); }
      const sg = seg.find((x) => st.s <= x.s0 + x.L) || seg[seg.length - 1];
      const u = (st.s - sg.s0) / sg.L;
      kendaraan.position.lerpVectors(sg.a, sg.b, u);
      const target = Math.atan2(-(sg.b.z - sg.a.z), sg.b.x - sg.a.x);
      if (st.sudut === null) st.sudut = target;
      let d = target - st.sudut; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      st.sudut += d * Math.min(1, dt * 5);                          // belok halus
      kendaraan.rotation.y = st.sudut;
      if (kendaraan.userData.roda) kendaraan.userData.roda.forEach((r) => (r.rotation.z = -st.s / 0.52 / (kendaraan.scale.x || 1)));
    }
    return { update, st };
  }

  return { kebun, menaraLoRa, nodeLoRa, linkLoRa, tangkiCPO, pks, jembatanTimbang, rute, papanNama, kotak, tabung, bahan };
})();
