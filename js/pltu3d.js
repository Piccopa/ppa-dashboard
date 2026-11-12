/* =========================================================
   PLTU3D.JS — MODEL 3D PERALATAN PEMBANGKIT (PLTU batubara)
   Dipakai oleh modul "Power Plant 3D" (js/pltu-scene.js).
   Memakai alat dasar dari js/wtp3d.js (Wtp3D.kotak, tabung, pipa, dst).
   Isinya "cetakan" peralatan:
     Pltu3D.tumpukan()      → tumpukan batubara memanjang (windrow)
     Pltu3D.stackerReclaimer() → mesin penumpuk/pengambil batubara
     Pltu3D.galeri()        → galeri konveyor (rangka + atap)
     Pltu3D.bunker(), mill(), weighFeeder()
     Pltu3D.boiler()        → gedung boiler + steam drum + jendela api
     Pltu3D.saluran()       → saluran gas buang (duct) persegi
     Pltu3D.esp(), idFan(), absorber(), cerobong()
     Pltu3D.turbinGenerator() → turbin HP/IP/LP + generator + exciter
     Pltu3D.trafo(), gantry(), pmt(), menara(), kabel()
   ========================================================= */

const Pltu3D = (() => {
  const W = Wtp3D;
  const { kotak, tabung, poros, batang, kanvas, papanNama, pagar, bahan, bersama, beton, baja } = W;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const kuning = () => bersama("kuningSR", 0xf59e0b, { roughness: 0.5, metalness: 0.2 });
  const gelap = () => bersama("pompaGelap", 0x334155, { metalness: 0.5, roughness: 0.4 });

  /* ======================================================
     1) TUMPUKAN BATUBARA (bentuk punggung memanjang)
     ====================================================== */
  function tumpukan(induk, x, z, L, Wd, H) {
    const e = Math.min(Wd * 0.75, L * 0.45);
    const b1 = [-L / 2, 0, -Wd / 2], b2 = [L / 2, 0, -Wd / 2], b3 = [L / 2, 0, Wd / 2], b4 = [-L / 2, 0, Wd / 2];
    const r1 = [-L / 2 + e, H, 0], r2 = [L / 2 - e, H, 0];
    const seg = 10, tri = [];
    // sisi panjang dibagi beberapa potong supaya bisa diberi tekstur "bergelombang"
    const titik = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg, t1 = (i + 1) / seg;
      [[b1, b2, r1, r2], [b4, b3, r1, r2]].forEach(([ba, bb, ra, rb]) => {
        const p0 = titik(ba, bb, t0), p1 = titik(ba, bb, t1), q0 = titik(ra, rb, t0), q1 = titik(ra, rb, t1);
        tri.push(p0, p1, q1, p0, q1, q0);
      });
    }
    tri.push(b2, b3, r2, b4, b1, r1);
    const pos = new Float32Array(tri.length * 3);
    tri.forEach((p, i) => {
      const goyang = p[1] > 0.01 && p[1] < H - 0.01 ? 0 : p[1] >= H - 0.01 ? (Math.random() - 0.5) * H * 0.12 : 0;
      pos.set([p[0], p[1] + goyang, p[2]], i * 3);
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, bersama("batubara", 0x34363a, { roughness: 1, metalness: 0, flatShading: true, side: THREE.DoubleSide }));
    m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; induk.add(m);
    return m;
  }

  /* ======================================================
     2) STACKER RECLAIMER (berjalan di rel, lengan bisa berputar)
     ====================================================== */
  function stackerReclaimer(induk, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); induk.add(g);
    [-2.2, 2.2].forEach((dx) => [-2.2, 2.2].forEach((dz) => kotak(g, 1.6, 0.9, 1.0, gelap(), dx, 0.2, dz)));   // bogie roda
    kotak(g, 6, 1.2, 6, kuning(), 0, 1.1, 0);                        // rangka dasar
    kotak(g, 3, 6, 3, kuning(), 0, 2.3, 0);                          // menara
    const slew = new THREE.Group(); slew.position.y = 8.3; g.add(slew);
    tabung(slew, 2.2, 2.2, 0.6, gelap(), 0, 0, 0, 20);                // meja putar
    kotak(slew, 2.6, 2.2, 2.4, bersama("kabinSR", 0xf8fafc), -1.2, 0.6, 2.4);   // kabin operator
    const boom = new THREE.Group(); boom.position.y = 1.2; boom.rotation.z = -0.13; slew.add(boom);
    kotak(boom, 26, 1.2, 1.6, kuning(), 13, -0.6, 0);                // lengan (boom)
    kotak(boom, 26, 0.2, 1.1, bersama("sabuk", 0x111827), 13, 0.6, 0);   // sabuk konveyor di boom
    kotak(slew, 11, 1, 1.4, kuning(), -5.5, 1.0, 0);                  // lengan pemberat
    kotak(slew, 3, 3, 3, beton(), -10.5, 0, 0);                       // pemberat (counterweight)
    kotak(slew, 0.8, 7, 0.8, kuning(), 0, 1.5, 0);                    // tiang mast
    batang(slew, V(0, 8.5, 0), V(25.5, -1.6, 0), 0.08, baja(), 6);   // kabel penahan
    batang(slew, V(0, 8.5, 0), V(-10.5, 3, 0), 0.08, baja(), 6);
    const roda = new THREE.Group(); roda.position.set(26.5, -0.2, 0); boom.add(roda);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.3, 8, 24), kuning()); roda.add(torus);
    for (let i = 0; i < 10; i++) {                                    // bucket (ember)
      const a = (i / 10) * Math.PI * 2;
      const b = kotak(roda, 0.9, 0.9, 1.2, gelap(), Math.cos(a) * 2.6, Math.sin(a) * 2.6 - 0.45, 0); b.rotation.z = a;
    }
    return { g, slew, roda };
  }

  /* ======================================================
     3) GALERI KONVEYOR lurus dari titik a ke b
     ====================================================== */
  function galeri(induk, a, b, opsi = {}) {
    const d = V().subVectors(b, a), L = d.length();
    const g = new THREE.Group(); g.position.copy(a); induk.add(g);
    g.rotation.order = "YZX";
    g.rotation.y = Math.atan2(-d.z, d.x);
    g.rotation.z = Math.asin(d.y / L);
    const lebar = opsi.lebar || 2.8, tinggi = opsi.tinggi || 2.4;
    kotak(g, L, 0.3, 1.5, bersama("sabukBed", 0x111827), L / 2, -0.15, 0);                 // sabuk
    const rangka = bersama("rangkaGaleri", 0x64748b, { metalness: 0.4 });
    [-lebar / 2, lebar / 2].forEach((zz) => {
      kotak(g, L, 0.18, 0.18, rangka, L / 2, -0.4, zz);
      kotak(g, L, 0.18, 0.18, rangka, L / 2, tinggi, zz);
      const n = Math.max(2, Math.round(L / 4));
      for (let i = 0; i <= n; i++) kotak(g, 0.15, tinggi + 0.4, 0.15, rangka, (L * i) / n, -0.4, zz);
      for (let i = 0; i < n; i++) batang(g, V((L * i) / n, -0.3, zz), V((L * (i + 1)) / n, tinggi, zz), 0.06, rangka, 4);
    });
    kotak(g, L, 0.12, lebar + 0.8, bersama("atapGaleri", 0x94a3b8, { metalness: 0.3 }), L / 2, tinggi + 0.15, 0);
    // tiang penyangga ke tanah (koordinat dunia)
    if (opsi.tiang !== false) {
      const n = Math.max(1, Math.floor(L / 11));
      for (let i = 1; i <= n; i++) {
        const p = a.clone().lerp(b, i / (n + 1));
        if (p.y < 1.5) continue;
        kotak(induk, 0.5, p.y - 0.5, 0.5, baja(), p.x, 0, p.z + 1.1);
        kotak(induk, 0.5, p.y - 0.5, 0.5, baja(), p.x, 0, p.z - 1.1);
        kotak(induk, 0.4, 0.4, 2.8, baja(), p.x, p.y - 0.9, p.z);
      }
    }
    return { g, panjang: L };
  }
  const geoBongkah = () => new THREE.DodecahedronGeometry(0.32, 0);

  /* ======================================================
     4) BUNKER BATUBARA, COAL MILL, WEIGH FEEDER
     ====================================================== */
  function bunker(induk, x, z, R, yAtas, yBawah, nama) {
    const h = yAtas - yBawah - R * 1.3;
    const tex = kanvas(256, 256, (c, w) => { c.fillStyle = "#7c8a96"; c.fillRect(0, 0, w, w); c.fillStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < 8; i++) c.fillRect(0, i * 32, w, 2); c.fillStyle = "#fff"; c.font = "bold 40px Arial"; c.textAlign = "center"; c.fillText(nama, w / 2, w / 2 + 14); });
    const silinder = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, 24), bahan(0xffffff, { map: tex, metalness: 0.3, roughness: 0.5 }));
    silinder.position.set(x, yBawah + R * 1.3 + h / 2, z); silinder.castShadow = true; induk.add(silinder);
    const corong = new THREE.Mesh(new THREE.ConeGeometry(R, R * 1.3, 24), bersama("corongBunker", 0x6b7887, { metalness: 0.3 }));
    corong.rotation.x = Math.PI; corong.position.set(x, yBawah + R * 0.65, z); induk.add(corong);
    return { atas: V(x, yAtas, z), bawah: V(x, yBawah, z) };
  }
  function mill(induk, x, z) {
    kotak(induk, 5, 0.4, 5, beton(), x, 0, z);
    tabung(induk, 2.1, 2.3, 3.4, bersama("mill", 0x475569, { metalness: 0.4 }), x, 0.4, z, 20);
    const k = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.2, 20), bersama("mill", 0x475569)); k.position.set(x, 4.9, z); induk.add(k);
    tabung(induk, 0.7, 0.7, 1.2, gelap(), x, 5.8, z, 14);
    kotak(induk, 1.6, 1.4, 1.8, bersama("gearbox", 0x1d4ed8, { metalness: 0.3 }), x + 2.8, 0.4, z);   // motor + gearbox
    return V(x, 7, z);
  }
  function weighFeeder(induk, x, y, z) {
    kotak(induk, 3.6, 1.3, 1.4, bersama("feeder", 0x0f766e, { metalness: 0.3 }), x, y, z);
    poros(induk, 0.35, 0.9, gelap(), x + 2.1, y + 0.65, z, "x", 12);
    return V(x, y + 0.65, z);
  }

  /* ======================================================
     5) GEDUNG BOILER + STEAM DRUM + JENDELA API
     ====================================================== */
  function boiler(induk, x, z, w, d, h) {
    const g = new THREE.Group(); g.position.set(x, 0, z); induk.add(g);
    const hc = h * 0.8;
    const tex = kanvas(512, 512, (c, s) => {
      c.fillStyle = "#e6e9ec"; c.fillRect(0, 0, s, s);
      for (let i = 0; i < s; i += 12) { c.fillStyle = "rgba(0,0,0,.06)"; c.fillRect(i, 0, 3, s); }
      c.fillStyle = "#1d4ed8"; c.fillRect(0, 26, s, 22);
      for (let j = 1; j < 6; j++) { c.fillStyle = "rgba(30,41,59,.25)"; c.fillRect(0, 60 + j * 78, s, 4); }
    });
    kotak(g, w, hc, d, bahan(0xffffff, { map: tex, roughness: 0.7 }), 0, 0, 0);
    const kolom = bersama("kolomBoiler", 0x334155, { metalness: 0.5 });
    // rangka baja terbuka di bagian atas
    for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) {
      if (i > 0 && i < 3 && j > 0 && j < 3) continue;
      kotak(g, 0.9, h - hc, 0.9, kolom, -w / 2 + (w * i) / 3, hc, -d / 2 + (d * j) / 3);
    }
    [hc + (h - hc) * 0.5, h].forEach((y) => {
      kotak(g, w, 0.6, 0.6, kolom, 0, y - 0.6, -d / 2); kotak(g, w, 0.6, 0.6, kolom, 0, y - 0.6, d / 2);
      kotak(g, 0.6, 0.6, d, kolom, -w / 2, y - 0.6, 0); kotak(g, 0.6, 0.6, d, kolom, w / 2, y - 0.6, 0);
    });
    kotak(g, w + 1.5, 0.5, d + 1.5, bersama("atapBoiler", 0x94a3b8, { metalness: 0.3 }), 0, h, 0);
    // kolom luar di sisi depan & samping
    for (let i = 0; i <= 4; i++) {
      kotak(g, 0.8, hc, 0.6, kolom, -w / 2 + (w * i) / 4, 0, d / 2 + 0.3);
      kotak(g, 0.6, hc, 0.8, kolom, -w / 2 - 0.3, 0, -d / 2 + (d * i) / 4);
    }
    // steam drum + downcomer + safety valve
    const yDrum = hc + 2.4;
    for (const dx of [-w * 0.3, 0, w * 0.3]) kotak(g, 1.2, 1.2, 2.2, kolom, dx, hc, 0);
    poros(g, 1.4, w * 0.75, bersama("drum", 0xc7ccd1, { metalness: 0.6, roughness: 0.35 }), 0, yDrum, 0, "x", 24);
    [-1, 1].forEach((s) => { const t = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), bersama("drum", 0xc7ccd1)); t.rotation.z = (-s * Math.PI) / 2; t.position.set((s * w * 0.75) / 2, yDrum, 0); g.add(t); });
    for (let i = 0; i < 4; i++) { tabung(g, 0.18, 0.18, 1.2, bersama("sv", 0xdc2626), -6 + i * 4, yDrum + 1.2, 0, 10); tabung(g, 0.45, 0.45, 2.6, bersama("silencer", 0x9ca3af, { metalness: 0.4 }), -6 + i * 4, h + 0.5, 1.5, 14); }
    for (const dx of [-w * 0.25, w * 0.25]) tabung(g, 0.4, 0.4, 3, bersama("drum", 0xc7ccd1), dx, hc - 0.5, -1, 12);
    // jendela api (berpendar oranye) di sisi depan
    const nyala = new THREE.MeshBasicMaterial({ color: 0xff8a1f });
    [8, 12.5].forEach((y) => [-9, -3, 3, 9].forEach((dx) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), nyala); m.position.set(dx * (w / 30), y, d / 2 + 0.62); g.add(m);
      kotak(g, 2.8, 0.25, 0.5, kolom, dx * (w / 30), y - 0.95, d / 2 + 0.5);
    }));
    // tangga & lift
    kotak(g, 3.2, h - 2, 3.2, bersama("tangga", 0x475569), w / 2 + 1.8, 0, d / 2 - 2.5);
    for (let y = 3; y < h - 2; y += 3.5) kotak(g, 3.25, 0.5, 3.25, bersama("tanggaJendela", 0x93c5fd, { emissive: 0x1e3a8a, emissiveIntensity: 0.3 }), w / 2 + 1.8, y, d / 2 - 2.5);
    papanNama(g, "BOILER UNIT 1", 0, hc - 4.2, d / 2 + 0.75, 0, 12, "#1d4ed8");
    return { g, nyala, drumY: yDrum, hc };
  }

  /* ======================================================
     6) SALURAN GAS BUANG (DUCT) — segmen lurus sejajar sumbu
     ====================================================== */
  function saluran(induk, titik, w, h, warna = 0x9aa3ad) {
    const m = bersama("duct" + warna, warna, { metalness: 0.3, roughness: 0.6 });
    for (let i = 0; i < titik.length - 1; i++) {
      const a = titik[i], b = titik[i + 1], d = V().subVectors(b, a), L = d.length();
      const ax = Math.abs(d.x) > 1e-3 ? "x" : Math.abs(d.y) > 1e-3 ? "y" : "z";
      const dim = ax === "x" ? [L + w, h, w] : ax === "y" ? [w, L + h, w] : [w, h, L + w];
      const o = new THREE.Mesh(new THREE.BoxGeometry(...dim), m);
      o.position.copy(a).addScaledVector(d, 0.5); o.castShadow = o.receiveShadow = true; induk.add(o);
      // rusuk penguat
      const n = Math.floor(L / 3);
      for (let k = 1; k < n; k++) {
        const p = a.clone().lerp(b, k / n);
        const dr = ax === "x" ? [0.2, h + 0.2, w + 0.2] : ax === "y" ? [w + 0.2, 0.2, w + 0.2] : [w + 0.2, h + 0.2, 0.2];
        const r = new THREE.Mesh(new THREE.BoxGeometry(...dr), bersama("rusuk" + warna, new THREE.Color(warna).multiplyScalar(0.8).getHex(), { metalness: 0.3 }));
        r.position.copy(p); induk.add(r);
      }
    }
  }

  /* ======================================================
     7) ESP, ID FAN, FGD ABSORBER, CEROBONG + CEMS
     ====================================================== */
  function esp(induk, x, z, w, d, h) {
    const kaki = 6;
    for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) kotak(induk, 0.7, kaki, 0.7, baja(), x - w / 2 + (w * i) / 3, 0, z - d / 2 + (d * j) / 2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry((w / 3) * 0.68, 3.6, 4), bersama("hopper", 0x7b8794, { metalness: 0.4 }));
      c.rotation.x = Math.PI; c.rotation.y = Math.PI / 4; c.position.set(x - w / 2 + (w / 3) * (i + 0.5), kaki - 1.6 + 0.2, z - d / 2 + (d / 2) * (j + 0.5)); induk.add(c);
    }
    const tex = kanvas(512, 256, (c, s, t) => { c.fillStyle = "#b8c0c8"; c.fillRect(0, 0, s, t); for (let i = 0; i < s; i += 16) { c.fillStyle = "rgba(0,0,0,.12)"; c.fillRect(i, 0, 4, t); } c.fillStyle = "#0f172a"; c.font = "bold 40px Arial"; c.textAlign = "center"; c.fillText("ELECTROSTATIC", s / 2, t * 0.45); c.fillText("PRECIPITATOR", s / 2, t * 0.65); });
    kotak(induk, w, h, d, bahan(0xffffff, { map: tex, metalness: 0.3, roughness: 0.55 }), x, kaki, z);
    kotak(induk, w + 0.6, 0.4, d + 0.6, bersama("atapESP", 0x8b95a0), x, kaki + h, z);
    for (let i = 0; i < 6; i++) kotak(induk, 1.4, 1.4, 1.6, bersama("trset", 0x1d4ed8, { metalness: 0.3 }), x - w / 2 + 2 + i * ((w - 4) / 5), kaki + h + 0.4, z);   // trafo-rectifier
    pagar(induk, [V(x - w / 2, kaki + h + 0.4, z - d / 2), V(x + w / 2, kaki + h + 0.4, z - d / 2), V(x + w / 2, kaki + h + 0.4, z + d / 2), V(x - w / 2, kaki + h + 0.4, z + d / 2), V(x - w / 2, kaki + h + 0.4, z - d / 2)]);
    return { masuk: V(x - w / 2, kaki + h / 2, z), keluar: V(x + w / 2, kaki + h / 2, z) };
  }
  function idFan(induk, x, z) {
    kotak(induk, 7, 0.5, 4.5, beton(), x, 0, z);
    poros(induk, 2.4, 1.8, bersama("fan", 0x0e7490, { metalness: 0.3 }), x, 3.1, z, "z", 28);
    kotak(induk, 2.4, 2.2, 1.8, bersama("fan", 0x0e7490), x, 5.0, z);            // saluran keluar (ke atas)
    poros(induk, 0.9, 2.4, bersama("motorFan", 0x1d4ed8, { metalness: 0.3 }), x + 2.6, 1.6, z, "x", 18);
    kotak(induk, 1.2, 1, 1.4, gelap(), x + 2.6, 0.5, z);
    return { pusat: V(x, 3.1, z) };
  }
  function absorber(induk, x, z, R = 6, H = 28) {
    const tex = kanvas(512, 512, (c, s) => {
      c.fillStyle = "#dfe5ea"; c.fillRect(0, 0, s, s); c.fillStyle = "rgba(0,0,0,.08)"; for (let i = 0; i < s; i += 40) c.fillRect(0, i, s, 2);
      c.fillStyle = "#0f766e"; c.fillRect(0, s * 0.12, s, 14);
      c.fillStyle = "#0f172a"; c.font = "bold 42px Arial"; c.textAlign = "center"; c.fillText("FGD ABSORBER", s / 2, s * 0.5);
    });
    tabung(induk, R + 0.6, R + 0.6, 0.4, beton(), x, 0, z, 36);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 40), bahan(0xffffff, { map: tex, roughness: 0.55 })); m.position.set(x, 0.4 + H / 2, z); m.castShadow = true; induk.add(m);
    const atap = new THREE.Mesh(new THREE.ConeGeometry(R, 2.5, 40), bersama("atapFGD", 0xc0c8cf)); atap.position.set(x, 0.4 + H + 1.25, z); induk.add(atap);
    [0.55, 0.65, 0.75].forEach((k) => { const r = new THREE.Mesh(new THREE.TorusGeometry(R + 0.25, 0.22, 6, 40), bersama("spray", 0x0f766e)); r.rotation.x = Math.PI / 2; r.position.set(x, 0.4 + H * k, z); induk.add(r); });
    for (let i = 0; i < 3; i++) W.pompa(induk, x - R - 3.5, z - 4 + i * 4, 0, 0x0f766e, 0.6);
    tabung(induk, 2.6, 2.6, 12, bersama("silo", 0xe5e7eb), x + R + 5, 4, z + 6, 24);       // silo batu kapur
    const kc = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3, 24), bersama("silo", 0xe5e7eb)); kc.rotation.x = Math.PI; kc.position.set(x + R + 5, 2.5, z + 6); induk.add(kc);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => kotak(induk, 0.3, 4, 0.3, baja(), x + R + 5 + sx * 1.8, 0, z + 6 + sz * 1.8)));
    return { puncakY: 0.4 + H };
  }
  function cerobong(induk, x, z, H = 80) {
    const g = new THREE.Group(); g.position.set(x, 0, z); induk.add(g);
    tabung(g, 5, 5.4, 1.2, beton(), 0, 0, 0, 32);
    const badan = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.9, H * 0.75, 32), bersama("stack", 0xd6d3d1, { roughness: 0.9 }));
    badan.position.y = 1.2 + (H * 0.75) / 2; badan.castShadow = true; g.add(badan);
    const sisa = H - 1.2 - H * 0.75, n = 6;
    for (let i = 0; i < n; i++) {
      const r0 = 2.8 - (0.2 * i) / n, r1 = 2.8 - (0.2 * (i + 1)) / n;
      tabung(g, r1, r0, sisa / n, bahan(i % 2 ? 0xf8fafc : 0xdc2626), 0, 1.2 + H * 0.75 + (i * sisa) / n, 0, 32);
    }
    const yP = H * 0.5;                                               // platform CEMS
    const lantai = new THREE.Mesh(new THREE.RingGeometry(3.3, 6, 32), bersama("grating", 0x94a3b8, { metalness: 0.5, side: THREE.DoubleSide }));
    lantai.rotation.x = -Math.PI / 2; lantai.position.y = yP; g.add(lantai);
    const pg = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; pg.push(V(Math.cos(a) * 5.9, yP, Math.sin(a) * 5.9)); }
    pagar(g, pg, 1.1);
    kotak(g, 2.6, 2.4, 2.4, bersama("cemsShelter", 0xf8fafc), 0, yP, 4.4);
    kotak(g, 2.7, 0.3, 2.5, bersama("cemsAtap", 0x0ea5e9), 0, yP + 2.4, 4.4);
    papanNama(g, "CEMS", 0, yP + 1.5, 5.65, 0, 2.2, "#0ea5e9");
    for (let y = 1.5; y < yP; y += 0.8) kotak(g, 0.8, 0.06, 0.06, baja(), 0, y, -3.6 - (y / H) * 0.6);      // tangga monyet
    const lampu = [H, yP + 6].map((y) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); l.position.set(2.3, y, 0); g.add(l); return l; });
    return { g, lampu, puncak: V(x, H + 1, z), platform: V(x, yP, z) };
  }

  /* ======================================================
     8) TURBIN UAP + GENERATOR (poros sejajar sumbu x)
     ====================================================== */
  function selubung(induk, xc, L, r1, r2, y, z, m) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, L, 32), m);
    c.rotation.z = Math.PI / 2; c.position.set(xc, y, z); c.castShadow = true; induk.add(c); return c;
  }
  function turbinGenerator(induk, x0, y0, z0) {
    const g = new THREE.Group(); g.position.set(x0, y0, z0); induk.add(g);
    const casing = bersama("casingTurbin", 0x38bdf8, { metalness: 0.35, roughness: 0.4 });
    const casingTua = bersama("casingTurbinTua", 0x0284c7, { metalness: 0.35, roughness: 0.4 });
    const genM = bersama("generator", 0x15803d, { metalness: 0.35, roughness: 0.45 });
    poros(g, 0.35, 50, bersama("poros", 0x9ca3af, { metalness: 0.8, roughness: 0.25 }), 9, 2.5, 0, "x", 12);
    selubung(g, -9, 6, 2.3, 1.5, 2.5, 0, casing);                    // HP
    poros(g, 1.9, 0.5, casingTua, -9, 2.5, 0, "x", 28);
    selubung(g, -2, 5.5, 2.0, 2.8, 2.5, 0, casing);                  // IP
    poros(g, 2.6, 0.5, casingTua, -2, 2.5, 0, "x", 28);
    kotak(g, 11, 3.6, 8, casingTua, 9, 0.2, 0);                       // LP (bagian bawah)
    const geoLP = new THREE.CylinderGeometry(4, 4, 11, 32, 1, false, 0, Math.PI); geoLP.rotateZ(Math.PI / 2);   // setengah tabung, kubah ke atas
    const lpAtas = new THREE.Mesh(geoLP, casing); lpAtas.position.set(9, 3.8, 0); lpAtas.castShadow = true; g.add(lpAtas);
    poros(g, 2.5, 10, genM, 23.5, 2.5, 0, "x", 32);                  // generator
    [18.3, 28.7].forEach((xx) => poros(g, 2.7, 0.5, bersama("genUjung", 0x166534, { metalness: 0.4 }), xx, 2.5, 0, "x", 32));
    kotak(g, 9, 0.5, 5.6, bersama("genKaki", 0x14532d), 23.5, 0, 0);
    poros(g, 1.2, 3, bersama("exciter", 0x0f766e, { metalness: 0.4 }), 31.5, 2.5, 0, "x", 24);   // exciter
    papanNama(g, "STEAM TURBINE", 1, 6.4, 0, 0, 7, "#0284c7");
    papanNama(g, "GENERATOR 300 MW", 23.5, 6.2, 0, 0, 7, "#15803d");
    // bantalan (bearing pedestal)
    [-12.6, -5.6, 1.6, 15.4, 17.8, 29.4, 33.4].forEach((xx) => kotak(g, 1.2, 2.4, 2.6, gelap(), xx, 0, 0));
    // kopling yang berputar (tanda kotak kuning supaya putaran terlihat)
    const kopling = [-5.6, 1.6, 15.9, 30.2].map((xx) => {
      const k = new THREE.Group(); k.position.set(xx, 2.5, 0); g.add(k);
      poros(k, 0.85, 0.35, bersama("kopling", 0x475569, { metalness: 0.7 }), 0, 0, 0, "x", 18);
      kotak(k, 0.4, 0.3, 0.3, bersama("tandaKopling", 0xfacc15), 0, 0.7, 0);
      return k;
    });
    g.updateMatrixWorld(true);
    const L = (x, y, z) => g.localToWorld(V(x, y, z));
    return { g, kopling, hp: L(-9, 5, 0), ip: L(-2, 5.2, 0), lp: L(9, 7.9, 0), gen: L(23.5, 5.2, 0), exc: L(31.5, 4, 0), bantalan: L(-5.6, 3.8, 1.4) };
  }

  /* ======================================================
     9) TRAFO, GANTRY GARDU INDUK, PMT, MENARA TRANSMISI, KABEL
     ====================================================== */
  function trafo(induk, x, z, rotY = 0, s = 1, nama = "GSU") {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; g.scale.setScalar(s); induk.add(g);
    kotak(g, 8, 0.5, 6, beton(), 0, 0, 0);
    const tangki = bersama("tangkiTrafo", 0x6b7280, { metalness: 0.45, roughness: 0.45 });
    kotak(g, 5.6, 4.2, 3.4, tangki, 0, 0.5, 0);
    for (let i = 0; i < 9; i++) [-1, 1].forEach((sz) => kotak(g, 0.1, 3.4, 1.1, bersama("radiator", 0x7b8590, { metalness: 0.5 }), -2.4 + i * 0.6, 0.9, sz * 2.3));
    [-1, 1].forEach((sz) => kotak(g, 5.4, 0.15, 0.15, tangki, 0, 4.3, sz * 2.3));
    poros(g, 0.55, 3.4, tangki, -1.2, 6.1, -1.2, "x", 16);            // konservator
    [-2.6, 0.2].forEach((xx) => kotak(g, 0.15, 1.5, 0.15, tangki, xx, 4.7, -1.2));
    const hv = [];
    [-1.6, 0, 1.6].forEach((xx) => {
      tabung(g, 0.16, 0.22, 2.8, bersama("bushing", 0xa8a29e, { roughness: 0.4 }), xx, 4.7, 0.6, 10);
      for (let k = 0; k < 6; k++) tabung(g, 0.38, 0.38, 0.12, bersama("bushingSirip", 0x8b8580), xx, 5 + k * 0.4, 0.6, 12);
      tabung(g, 0.25, 0.25, 0.3, bersama("bushingKepala", 0xd1d5db, { metalness: 0.7 }), xx, 7.5, 0.6, 10);
      hv.push([xx, 7.8, 0.6]);
    });
    [-1.2, 0, 1.2].forEach((xx) => tabung(g, 0.14, 0.14, 1.0, bersama("bushing", 0xa8a29e), xx, 4.7, -1.4 + 0.5, 8));
    papanNama(g, nama, 0, 2.6, 1.75, 0, 3.2, "#f59e0b");
    g.updateMatrixWorld(true);
    return { g, hv: hv.map(([a, b, c]) => g.localToWorld(V(a, b, c))) };
  }
  function gantry(induk, x, z, lebar, tinggi, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; induk.add(g);
    const m = bersama("gantry", 0xb8bec6, { metalness: 0.15, roughness: 0.55 });
    [-lebar / 2, lebar / 2].forEach((dx) => {
      kotak(g, 0.9, tinggi, 0.9, m, dx, 0, 0);
      for (let y = 1.5; y < tinggi - 1; y += 2.2) { batang(g, V(dx - 0.45, y, 0.45), V(dx + 0.45, y + 2.2, 0.45), 0.05, m, 4); batang(g, V(dx - 0.45, y, -0.45), V(dx + 0.45, y + 2.2, -0.45), 0.05, m, 4); }
    });
    kotak(g, lebar + 0.9, 0.9, 0.9, m, 0, tinggi - 0.9, 0);
    g.updateMatrixWorld(true);
    return { g, titik: [-lebar / 4, 0, lebar / 4].map((dx) => g.localToWorld(V(dx, tinggi - 1.6, 0))) };
  }
  function pmt(induk, x, z, rotY = 0) {              // pemutus tenaga (circuit breaker SF6) 3 fasa
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; induk.add(g);
    kotak(g, 5, 0.3, 1.6, beton(), 0, 0, 0);
    kotak(g, 4.6, 2.2, 0.5, bersama("rangkaPMT", 0xb8bec6, { metalness: 0.15 }), 0, 0.3, 0);
    kotak(g, 1.2, 1.4, 0.9, bersama("mekanismePMT", 0x475569), -2.3, 0.3, 0.6);
    [-1.5, 0, 1.5].forEach((dx) => {
      tabung(g, 0.22, 0.22, 2.6, bersama("bushing", 0xa8a29e), dx, 2.5, 0, 10);
      for (let k = 0; k < 5; k++) tabung(g, 0.42, 0.42, 0.1, bersama("bushingSirip", 0x8b8580), dx, 2.8 + k * 0.45, 0, 12);
      tabung(g, 0.4, 0.4, 0.6, bersama("kepalaPMT", 0xd1d5db, { metalness: 0.7 }), dx, 5.1, 0, 12);
    });
    return { g };
  }
  function menara(induk, x, z, H = 32, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; induk.add(g);
    const m = bersama("menaraT", 0xb8bec6, { metalness: 0.15, roughness: 0.55 });
    const b = 3.2, t = 0.9, yT = H * 0.72;
    const kaki = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    kaki.forEach(([sx, sz]) => { batang(g, V(sx * b, 0, sz * b), V(sx * t, yT, sz * t), 0.13, m, 5); kotak(g, 1.2, 0.4, 1.2, beton(), sx * b, 0, sz * b); });
    for (let k = 0; k < 4; k++) {                                       // bresing silang
      const y0 = (yT * k) / 4, y1 = (yT * (k + 1)) / 4, w0 = b - ((b - t) * k) / 4, w1 = b - ((b - t) * (k + 1)) / 4;
      [[-1, 1], [1, -1]].forEach(([s1, s2]) => {
        batang(g, V(s1 * w0, y0, -w0), V(s2 * w1, y1, -w1), 0.05, m, 4); batang(g, V(s1 * w0, y0, w0), V(s2 * w1, y1, w1), 0.05, m, 4);
        batang(g, V(-w0, y0, s1 * w0), V(-w1, y1, s2 * w1), 0.05, m, 4); batang(g, V(w0, y0, s1 * w0), V(w1, y1, s2 * w1), 0.05, m, 4);
      });
    }
    kaki.forEach(([sx, sz]) => batang(g, V(sx * t, yT, sz * t), V(sx * 0.4, H, sz * 0.4), 0.1, m, 5));
    kotak(g, 14, 0.5, 1, m, 0, yT, 0);                                 // lengan bawah
    kotak(g, 9, 0.5, 1, m, 0, H * 0.86, 0);                            // lengan atas
    const isolator = (xx, yy) => { tabung(g, 0.12, 0.12, 1.6, bersama("isolatorKaca", 0x93c5fd, { transparent: true, opacity: 0.85 }), xx, yy - 1.6, 0, 8); };
    const ujung = [[-6.5, yT], [6.5, yT], [-4.2, H * 0.86], [4.2, H * 0.86]];
    ujung.forEach(([xx, yy]) => isolator(xx, yy));
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); l.position.y = H + 0.3; g.add(l);
    g.updateMatrixWorld(true);
    return { g, lampu: l, titik: ujung.map(([xx, yy]) => g.localToWorld(V(xx, yy - 1.6, 0))) };
  }
  function kabel(induk, a, b, kendur = 2, warna = 0x1f2937) {
    const pts = [];
    for (let i = 0; i <= 18; i++) { const t = i / 18; const p = a.clone().lerp(b, t); p.y -= kendur * 4 * t * (1 - t); pts.push(p); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: warna }));
    induk.add(l);
    return pts;
  }

  return { tumpukan, stackerReclaimer, galeri, geoBongkah, bunker, mill, weighFeeder, boiler, saluran, esp, idFan, absorber, cerobong, turbinGenerator, trafo, gantry, pmt, menara, kabel };
})();
