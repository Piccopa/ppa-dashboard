/* =========================================================
   MODEL3D.JS — PEMBUAT MODEL 3D YANG LEBIH NYATA
   Berisi 4 "pabrik model":
     Model3D.truk(...)      → truk trailer kontainer / truk tangki
     Model3D.kapal(...)     → kapal kargo penuh kontainer
     Model3D.kantor(...)    → gedung kantor kaca bertingkat
     Model3D.pabrik(...)    → gedung pabrik dinding seng + atap pelana
     Model3D.laut(...)      → permukaan laut yang bergelombang
   Rahasianya: bentuk dasar (kotak, tabung) + TEKSTUR yang digambar
   dengan kanvas (garis jendela, rusuk seng, tulisan logo).
   ========================================================= */

const Model3D = (() => {
  /* ---------- Alat bantu ---------- */
  // Bahan (material) standar: warna + kekasaran + kilau logam
  const bahan = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...o });

  // Kotak berpusat di (x, y, z) — dipakai untuk detail kecil
  function kotak(induk, w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    induk.add(m);
    return m;
  }
  // Tabung berpusat di (x, y, z)
  function tabung(induk, rt, rb, h, mat, x, y, z, seg = 18) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    induk.add(m);
    return m;
  }
  // Membuat tekstur dari gambar kanvas: gambar(ctx, lebar, tinggi)
  function tekstur(w, h, gambar, ulangX = 1, ulangY = 1) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    gambar(cv.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(ulangX, ulangY);
    t.anisotropy = 4;
    return t;
  }
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");

  /* ======================================================
     1) TRUK — kepala truk + trailer kontainer (atau tangki)
     Panjang ±16 m, depan menghadap +x. Pakai skala untuk mengecilkan.
     opsi: { warnaKabin, warnaMuatan, jenis: "kontainer" | "tangki", tulisan }
     ====================================================== */
  function truk(opsi = {}) {
    const o = { warnaKabin: 0xf8fafc, warnaMuatan: 0x1d4ed8, jenis: "kontainer", tulisan: "MITMAG", ...opsi };
    const g = new THREE.Group();
    const cat = bahan(o.warnaKabin, { roughness: 0.35, metalness: 0.3 });
    const kaca = bahan(0x334155, { roughness: 0.1, metalness: 0.5 });
    const krom = bahan(0xe5e7eb, { roughness: 0.3, metalness: 0.35 });
    const hitam = bahan(0x1f2937, { roughness: 0.8 });

    // Sasis (rangka bawah)
    kotak(g, 15, 0.35, 1.1, hitam, 0, 1.0, 0);
    // Kabin sopir
    kotak(g, 2.3, 2.6, 2.45, cat, 5.9, 2.75, 0);
    const spoiler = kotak(g, 2.0, 0.9, 2.3, cat, 5.6, 4.45, 0);
    spoiler.rotation.z = -0.25;
    kotak(g, 1.0, 1.25, 2.3, cat, 7.5, 1.85, 0);                    // kap mesin
    // Gril depan: tekstur garis-garis krom
    const gril = tekstur(64, 64, (c, w, h) => {
      c.fillStyle = "#111827"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#cbd5e1"; for (let y = 4; y < h; y += 10) c.fillRect(2, y, w - 4, 4);
    });
    kotak(g, 0.06, 1.0, 1.6, bahan(0xffffff, { map: gril, metalness: 0.6, roughness: 0.3 }), 8.03, 1.9, 0);
    kotak(g, 0.3, 0.4, 2.5, krom, 8.0, 1.05, 0);                    // bumper
    [-0.95, 0.95].forEach((z) => kotak(g, 0.08, 0.28, 0.45, bahan(0xfffbeb, { emissive: 0xfff3c4, emissiveIntensity: 0.9 }), 8.05, 1.45, z)); // lampu depan
    kotak(g, 0.06, 1.1, 2.2, kaca, 7.07, 3.35, 0);                  // kaca depan
    [-1.24, 1.24].forEach((z) => {
      kotak(g, 1.2, 0.9, 0.04, kaca, 6.3, 3.35, z);                // kaca samping
      kotak(g, 0.1, 0.55, 0.1, hitam, 7.1, 3.2, z * 1.18);          // spion
      kotak(g, 0.6, 0.12, 0.5, hitam, 6.8, 1.35, z * 0.9);           // tangga
    });
    // Tangki solar & knalpot tegak
    [-1, 1].forEach((s) => {
      const tk = tabung(g, 0.35, 0.35, 1.3, krom, 4.3, 1.05, s * 0.95);
      tk.rotation.z = Math.PI / 2;
    });
    tabung(g, 0.08, 0.08, 2.4, krom, 4.65, 3.4, 1.12, 10);

    // Muatan
    if (o.jenis === "tangki") {
      const tg = tabung(g, 1.2, 1.2, 11, bahan(0xf1f5f9, { roughness: 0.3, metalness: 0.2 }), -1.4, 2.55, 0, 24);
      tg.rotation.z = Math.PI / 2;
      [-6.9, 4.1].forEach((x) => { const t = tabung(g, 1.25, 1.25, 0.15, krom, x, 2.55, 0, 24); t.rotation.z = Math.PI / 2; });
      kotak(g, 10, 0.08, 0.6, hitam, -1.4, 3.8, 0);                 // jalur pijakan di atas tangki
      kotak(g, 11.6, 0.3, 1.6, hitam, -1.4, 1.35, 0);
    } else {
      // Kontainer: sisi panjang diberi rusuk + tulisan logo, belakang diberi pintu
      const warna = hex(o.warnaMuatan);
      const sisi = tekstur(512, 128, (c, w, h) => {
        c.fillStyle = warna; c.fillRect(0, 0, w, h);
        c.fillStyle = "rgba(0,0,0,.18)"; for (let x = 0; x < w; x += 9) c.fillRect(x, 0, 3, h);
        c.fillStyle = "rgba(255,255,255,.12)"; for (let x = 4; x < w; x += 9) c.fillRect(x, 0, 1, h);
        c.fillStyle = "#fff"; c.font = "bold 56px Arial"; c.textAlign = "center"; c.fillText(o.tulisan, w / 2, 78);
        c.font = "18px Arial"; c.fillText("LOGISTICS · CARGO", w / 2, 104);
        c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, 0, w, 4); c.fillRect(0, h - 4, w, 4);
      });
      const ujung = tekstur(128, 128, (c, w, h) => {
        c.fillStyle = warna; c.fillRect(0, 0, w, h);
        c.fillStyle = "rgba(0,0,0,.2)"; for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 2);
        c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(w / 2 - 1, 0, 2, h);
        c.fillStyle = "#9ca3af"; [w * 0.3, w * 0.42, w * 0.58, w * 0.7].forEach((x) => c.fillRect(x, 10, 3, h - 20));
      });
      const mSisi = bahan(0xffffff, { map: sisi, roughness: 0.55 }), mUjung = bahan(0xffffff, { map: ujung, roughness: 0.55 }), mAtas = bahan(o.warnaMuatan, { roughness: 0.7 });
      const kont = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.7, 2.45), [mUjung, mUjung, mAtas, hitam, mSisi, mSisi]);
      kont.position.set(-1.4, 2.65, 0); kont.castShadow = kont.receiveShadow = true; g.add(kont);
    }
    // Lampu belakang merah & bumper belakang
    [-1, 1].forEach((s) => kotak(g, 0.06, 0.2, 0.35, bahan(0xef4444, { emissive: 0xdc2626, emissiveIntensity: 0.8 }), -7.55, 1.45, s * 1.0));
    kotak(g, 0.12, 0.15, 2.3, hitam, -7.4, 0.95, 0);
    kotak(g, 0.15, 1.0, 0.15, hitam, 2.4, 0.8, 0.8); kotak(g, 0.15, 1.0, 0.15, hitam, 2.4, 0.8, -0.8);   // kaki trailer

    // Roda: ban hitam + velg perak. Dibungkus Group agar mudah diputar saat berjalan.
    const roda = [];
    const ban = bahan(0x111111, { roughness: 0.95 }), velg = bahan(0xd1d5db, { metalness: 0.4, roughness: 0.4 });
    [6.6, 3.9, 2.6, -4.6, -5.9, -7.0].forEach((x) => [-1.0, 1.0].forEach((z) => {
      const poros = new THREE.Group(); poros.position.set(x, 0.52, z); g.add(poros);
      const b = tabung(poros, 0.52, 0.52, 0.42, ban, 0, 0, 0, 20); b.rotation.x = Math.PI / 2;
      const v = tabung(poros, 0.28, 0.28, 0.44, velg, 0, 0, 0, 12); v.rotation.x = Math.PI / 2;
      roda.push(poros);
    }));
    g.userData.roda = roda;   // dipakai untuk animasi putar roda
    return g;
  }

  /* ======================================================
     2) KAPAL KARGO — lambung, kontainer bertumpuk, anjungan
     Panjang ±82 m, haluan (depan) menghadap +x.
     ====================================================== */
  function kapal(opsi = {}) {
    const o = { tulisan: "MITMAG LINE", warnaLambung: 0x1e3a5f, isi: 0.85, ...opsi };
    const g = new THREE.Group();
    // Bentuk lambung dilihat dari atas: belakang lurus, depan meruncing
    const bentuk = new THREE.Shape();
    bentuk.moveTo(-40, -6.5);
    bentuk.lineTo(26, -6.5);
    bentuk.bezierCurveTo(34, -6.5, 40, -3.5, 42, 0);
    bentuk.bezierCurveTo(40, 3.5, 34, 6.5, 26, 6.5);
    bentuk.lineTo(-40, 6.5);
    bentuk.lineTo(-40, -6.5);
    // ExtrudeGeometry = "mencetak" bentuk 2D menjadi 3D setebal depth (seperti cetakan kue)
    const lapis = (dari, tebal, mats, skala = 1) => {
      const geo = new THREE.ExtrudeGeometry(bentuk, { depth: tebal, bevelEnabled: false });
      const m = new THREE.Mesh(geo, mats);
      m.rotation.x = -Math.PI / 2;               // putar agar tebalnya mengarah ke atas
      m.position.y = dari;
      m.scale.set(skala, skala, 1);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const merah = bahan(0x9f1d1d, { roughness: 0.7 });
    lapis(-2.5, 3.0, [merah, merah]);                                          // lambung bawah (merah anti-karat)
    lapis(0.5, 0.3, [bahan(0xffffff), bahan(0xf8fafc)], 1.004);               // garis putih batas air
    lapis(0.8, 5.2, [bahan(0x6b7280, { roughness: 0.9 }), bahan(o.warnaLambung, { roughness: 0.45, metalness: 0.2 })]); // lambung atas + dek
    // Tulisan nama kapal di kedua sisi lambung
    const nama = tekstur(512, 64, (c, w, h) => { c.fillStyle = "#fff"; c.font = "bold 44px Arial"; c.textAlign = "center"; c.fillText(o.tulisan, w / 2, 48); });
    [-1, 1].forEach((s) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.2), new THREE.MeshBasicMaterial({ map: nama, transparent: true }));
      p.position.set(12, 3.6, s * 6.53); p.rotation.y = s > 0 ? 0 : Math.PI; g.add(p);
    });

    // Kontainer bertumpuk: InstancedMesh = ratusan kotak sekaligus tetapi ringan
    const rusuk = tekstur(64, 32, (c, w, h) => {
      c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#c7c7c7"; for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 2, h);
      c.fillStyle = "#9a9a9a"; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2);
    });
    const palet = [0x9f1239, 0x1d4ed8, 0x15803d, 0xd97706, 0x64748b, 0x0f766e, 0x9a3412, 0xe2e8f0, 0x7c3aed, 0xb91c1c];
    const posisi = [];
    let s = 7;
    const acak = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let bay = 0; bay < 9; bay++) for (let row = -2; row <= 2; row++) {
      const tinggi = 2 + Math.floor(acak() * 4 * o.isi);
      for (let t = 0; t < tinggi; t++) posisi.push([-25 + bay * 6.4, 6 + 1.3 + t * 2.6, row * 2.5, palet[Math.floor(acak() * palet.length)]]);
    }
    const kont = new THREE.InstancedMesh(new THREE.BoxGeometry(6.1, 2.55, 2.42), bahan(0xffffff, { map: rusuk, roughness: 0.6 }), posisi.length);
    const dm = new THREE.Object3D(), warna = new THREE.Color();
    posisi.forEach(([x, y, z, c], i) => {
      dm.position.set(x, y, z); dm.updateMatrix(); kont.setMatrixAt(i, dm.matrix);
      kont.setColorAt(i, warna.set(c));
    });
    kont.castShadow = kont.receiveShadow = true;
    g.add(kont);

    // Anjungan (bangunan di belakang kapal) dengan deretan jendela
    const jendela = tekstur(128, 128, (c, w, h) => {
      c.fillStyle = "#f1f5f9"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#1e293b"; for (let y = 10; y < h; y += 26) for (let x = 6; x < w; x += 16) c.fillRect(x, y, 10, 9);
    }, 1, 1);
    const putih = bahan(0xffffff, { map: jendela, roughness: 0.5 });
    kotak(g, 9, 13, 12.6, [putih, putih, bahan(0xe5e7eb), bahan(0xe5e7eb), putih, putih], -33.5, 6 + 6.5, 0);
    const anjungan = tekstur(128, 32, (c, w, h) => { c.fillStyle = "#f8fafc"; c.fillRect(0, 0, w, h); c.fillStyle = "#0f172a"; c.fillRect(0, 8, w, 14); });
    const mA = bahan(0xffffff, { map: anjungan });
    kotak(g, 6.5, 2.2, 15.5, [mA, mA, bahan(0xe5e7eb), mA, mA, mA], -32.5, 6 + 14.1, 0);       // ruang kemudi + sayap
    // Cerobong dengan pita warna perusahaan
    kotak(g, 4.2, 6, 3.6, bahan(0xf8fafc), -38, 6 + 13 + 3, 0);
    kotak(g, 4.3, 1.4, 3.7, bahan(0xc8913f), -38, 6 + 13 + 3.4, 0);
    kotak(g, 4.3, 0.9, 3.7, bahan(0x111827), -38, 6 + 13 + 5.6, 0);
    tabung(g, 0.15, 0.15, 6, bahan(0xe5e7eb), -32, 6 + 18, 0, 8);                           // tiang radar
    kotak(g, 2.4, 0.2, 0.4, bahan(0x111827), -32, 6 + 20.5, 0);
    [-1, 1].forEach((s) => { const sk = tabung(g, 1, 1, 6, bahan(0xf97316), -33, 6 + 4, s * 7.2, 12); sk.rotation.z = Math.PI / 2; }); // sekoci oranye
    // Haluan: dek depan yang lebih tinggi + tiang
    kotak(g, 8, 1.6, 9, bahan(0x6b7280), 31, 6.8, 0);
    tabung(g, 0.15, 0.15, 7, bahan(0xe5e7eb), 36, 11, 0, 8);
    // Ombak putih di sekitar lambung
    const buih = new THREE.Mesh(new THREE.RingGeometry(1, 1.25, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    buih.rotation.x = -Math.PI / 2; buih.scale.set(36, 7.5, 1); buih.position.set(1, 0.15, 0); g.add(buih);
    return g;
  }

  /* ======================================================
     3) GEDUNG KANTOR — dinding kaca, lobi, kanopi, papan nama
     opsi: { lebar, dalam, tinggi, kaca, nama }
     ====================================================== */
  function teksturKaca(kolom, lantai, kaca) {
    const W = kolom * 16, H = lantai * 24;
    const peta = tekstur(W, H, (c) => {
      for (let f = 0; f < lantai; f++) for (let k = 0; k < kolom; k++) {
        const gr = c.createLinearGradient(0, f * 24, 0, f * 24 + 24);
        const terang = 0.85 + Math.sin(k * 0.7 + f * 0.3) * 0.15;      // pantulan langit yang berbeda-beda
        gr.addColorStop(0, `rgba(${(kaca >> 16) * terang | 0},${((kaca >> 8) & 255) * terang | 0},${(kaca & 255) * terang | 0},1)`);
        gr.addColorStop(1, "#c9dcec");
        c.fillStyle = gr; c.fillRect(k * 16, f * 24, 16, 24);
      }
      c.fillStyle = "#cbd5e1"; for (let k = 0; k <= kolom; k++) c.fillRect(k * 16 - 1, 0, 2, H);          // tiang kaca (mullion)
      c.fillStyle = "#475569"; for (let f = 0; f <= lantai; f++) c.fillRect(0, f * 24 - 2, W, 4);           // pelat lantai
    });
    const nyala = tekstur(W, H, (c) => {
      c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
      for (let f = 0; f < lantai; f++) for (let k = 0; k < kolom; k++) if (Math.random() < 0.45) { c.fillStyle = "#ffdca0"; c.fillRect(k * 16 + 2, f * 24 + 4, 12, 16); }
    });
    return bahan(0xffffff, { map: peta, emissive: 0xffffff, emissiveMap: nyala, emissiveIntensity: 0.12, roughness: 0.2, metalness: 0.15 });
  }
  function kantor(opsi = {}) {
    const o = { lebar: 18, dalam: 14, tinggi: 42, kaca: 0x2f6ea8, nama: "MITMAG", ...opsi };
    const g = new THREE.Group();
    const lantai = Math.max(2, Math.round((o.tinggi - 5) / 3.6));
    const mDepan = teksturKaca(Math.round(o.lebar / 1.6), lantai, o.kaca);
    const mSamping = teksturKaca(Math.round(o.dalam / 1.6), lantai, o.kaca);
    const atap = bahan(0x9ca3af, { roughness: 0.9 });
    // Menara kaca (mulai di atas lobi setinggi 5 m)
    kotak(g, o.lebar, o.tinggi - 5, o.dalam, [mSamping, mSamping, atap, atap, mDepan, mDepan], 0, 5 + (o.tinggi - 5) / 2, 0);
    // Lobi: kaca gelap sedikit masuk ke dalam + kolom beton
    kotak(g, o.lebar - 1.2, 5, o.dalam - 1.2, bahan(0x1e293b, { roughness: 0.15, metalness: 0.5 }), 0, 2.5, 0);
    const beton = bahan(0xe5e7eb, { roughness: 0.8 });
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => kotak(g, 0.9, 5, 0.9, beton, sx * (o.lebar / 2 - 0.45), 2.5, sz * (o.dalam / 2 - 0.45))));
    kotak(g, o.lebar * 0.55, 0.35, 4, beton, 0, 4.6, o.dalam / 2 + 1.6);                                    // kanopi pintu masuk
    // Pagar atap (parapet) + mesin AC + tangki air di atap
    const y = o.tinggi + 0.6;
    kotak(g, o.lebar + 0.4, 1.2, 0.4, beton, 0, y, o.dalam / 2); kotak(g, o.lebar + 0.4, 1.2, 0.4, beton, 0, y, -o.dalam / 2);
    kotak(g, 0.4, 1.2, o.dalam, beton, o.lebar / 2, y, 0); kotak(g, 0.4, 1.2, o.dalam, beton, -o.lebar / 2, y, 0);
    kotak(g, 3, 1.6, 2, bahan(0xd1d5db), -o.lebar / 4, o.tinggi + 0.8, -o.dalam / 5);
    kotak(g, 3, 1.6, 2, bahan(0xd1d5db), o.lebar / 4, o.tinggi + 0.8, -o.dalam / 5);
    tabung(g, 1.2, 1.2, 2.4, bahan(0x93c5fd), 0, o.tinggi + 1.2, o.dalam / 5);
    // Papan nama menyala di puncak depan
    const papan = tekstur(256, 64, (c, w, h) => {
      c.fillStyle = "#0f172a"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#e0b45e"; c.font = "bold 44px Arial"; c.textAlign = "center"; c.fillText(o.nama, w / 2, 48);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(o.lebar * 0.7, o.lebar * 0.175), new THREE.MeshStandardMaterial({ map: papan, emissive: 0xffffff, emissiveMap: papan, emissiveIntensity: 0.6 }));
    p.position.set(0, o.tinggi - 2, o.dalam / 2 + 0.05); g.add(p);
    return g;
  }

  /* ======================================================
     4) GEDUNG PABRIK — dinding seng berusuk, pita warna,
        pintu gulung, jendela atas, atap pelana
     opsi: { lebar, dalam, tinggi, pita, nama }
     ====================================================== */
  function pabrik(opsi = {}) {
    const o = { lebar: 52, dalam: 26, tinggi: 12, pita: 0x2563eb, nama: "", ...opsi };
    const g = new THREE.Group();
    const dinding = (lebarM, pintu) => {
      const W = 1024, H = 256;
      const t = tekstur(W, H, (c) => {
        c.fillStyle = "#e7eaee"; c.fillRect(0, 0, W, H);
        c.fillStyle = "#cfd5dc"; for (let x = 0; x < W; x += 8) c.fillRect(x, 0, 3, H);               // rusuk seng
        c.fillStyle = hex(o.pita); c.fillRect(0, H * 0.18, W, H * 0.1);                                   // pita warna perusahaan
        c.fillStyle = "#7aa7c7"; for (let x = 20; x < W - 40; x += 70) c.fillRect(x, H * 0.04, 46, H * 0.1); // jendela atas
        c.fillStyle = "#9ca3af"; c.fillRect(0, H - 14, W, 14);                                           // plint beton
        if (pintu) {
          const n = Math.max(1, Math.floor(lebarM / 13));
          for (let i = 0; i < n; i++) {
            const x = (W / n) * (i + 0.5) - 55;
            c.fillStyle = "#6b7280"; c.fillRect(x, H * 0.45, 110, H * 0.55);                              // pintu gulung
            c.fillStyle = "#4b5563"; for (let y = H * 0.45; y < H; y += 7) c.fillRect(x, y, 110, 2);
            c.fillStyle = "#facc15"; c.fillRect(x - 6, H * 0.45, 6, H * 0.55); c.fillRect(x + 110, H * 0.45, 6, H * 0.55);
          }
        }
        if (pintu && o.nama) { c.fillStyle = "#111827"; c.font = "bold 30px Arial"; c.fillText(o.nama, 24, H * 0.4); }
      });
      return bahan(0xffffff, { map: t, roughness: 0.7 });
    };
    const mDepan = dinding(o.lebar, true), mBelakang = dinding(o.lebar, false), mSamping = dinding(o.dalam, false);
    kotak(g, o.lebar, o.tinggi, o.dalam, [mSamping, mSamping, bahan(0x9ca3af), bahan(0x9ca3af), mDepan, mBelakang], 0, o.tinggi / 2, 0);
    // Atap pelana: bentuk segitiga dicetak (extrude) sepanjang gedung
    const tA = o.dalam * 0.16;
    const segitiga = new THREE.Shape();
    segitiga.moveTo(-o.dalam / 2 - 0.6, 0); segitiga.lineTo(o.dalam / 2 + 0.6, 0); segitiga.lineTo(0, tA); segitiga.lineTo(-o.dalam / 2 - 0.6, 0);
    const geo = new THREE.ExtrudeGeometry(segitiga, { depth: o.lebar + 1.2, bevelEnabled: false });
    geo.translate(0, 0, -(o.lebar + 1.2) / 2);
    const seng = tekstur(64, 64, (c, w, h) => { c.fillStyle = "#a7b4c2"; c.fillRect(0, 0, w, h); c.fillStyle = "#8795a5"; for (let x = 0; x < w; x += 8) c.fillRect(x, 0, 3, h); }, 0.3, 0.3);
    const atap = new THREE.Mesh(geo, bahan(0xffffff, { map: seng, roughness: 0.5, metalness: 0.3 }));
    atap.rotation.y = Math.PI / 2; atap.position.y = o.tinggi; atap.castShadow = atap.receiveShadow = true; g.add(atap);
    // Lampu atap (skylight) & ventilasi di bubungan
    kotak(g, o.lebar * 0.9, 0.5, 1.2, bahan(0xbfdbfe, { roughness: 0.1, metalness: 0.3 }), 0, o.tinggi + tA - 0.1, 0);
    for (let x = -o.lebar / 2 + 6; x < o.lebar / 2 - 4; x += 10) tabung(g, 0.7, 0.9, 1.2, bahan(0xd1d5db, { metalness: 0.6 }), x, o.tinggi + tA + 0.6, 0, 12);
    // Kanopi bongkar muat di depan
    kotak(g, o.lebar * 0.8, 0.3, 4, bahan(0x9ca3af), 0, o.tinggi * 0.62, o.dalam / 2 + 2);
    return g;
  }

  /* ======================================================
     5) LAUT BERGELOMBANG — bidang datar yang titik-titiknya
        dinaik-turunkan dengan rumus sinus setiap frame
     ====================================================== */
  function laut(lebar, panjang) {
    const geo = new THREE.PlaneGeometry(lebar, panjang, Math.round(lebar / 6), Math.round(panjang / 6));
    const m = new THREE.Mesh(geo, bahan(0x1f6fa5, { roughness: 0.3, metalness: 0.25 }));
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    const pos = geo.attributes.position;
    m.userData.gerak = (t) => {
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        pos.setZ(i, Math.sin(x * 0.08 + t * 1.2) * 0.35 + Math.cos(y * 0.06 + t * 0.9) * 0.3);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };
    return m;
  }

  return { truk, kapal, kantor, pabrik, laut };
})();
