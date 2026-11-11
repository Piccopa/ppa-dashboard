/* =========================================================
   ATG-CALC.JS — LOGIKA PERHITUNGAN
   - Tabel kalibrasi tangki (strapping table): tinggi cairan (mm) → volume (m³)
   - Volume, ullage, suhu rata-rata, koreksi suhu (VCF), densitas, massa
   CATATAN: tabel kalibrasi & angka densitas di sini adalah SIMULASI.
   Untuk pemakaian nyata, ganti dengan tabel kalibrasi resmi tangki
   dan densitas hasil laboratorium.
   ========================================================= */

const ATG_CALC = (() => {
  /* --- Membuat tabel kalibrasi simulasi untuk satu tangki ---
     Setiap 10 mm dihitung volumenya. Agar mirip tangki asli:
     • diameter tiap "course" (cincin plat) sedikit berbeda (±0,15%)
     • 150 mm pertama dikurangi karena dasar tangki miring/sump
     • ada "deadwood" (koil pemanas di dalam) di ketinggian 200–600 mm */
  function buatTabelKalibrasi(t) {
    const tinggiMm = Math.round(t.tinggi * 1000);
    const tabel = [[0, 0]];
    let vol = 0;
    for (let mm = 10; mm <= tinggiMm; mm += 10) {
      const course = Math.floor(mm / 1500);                          // plat dinding setinggi 1,5 m
      const d = t.diameter * (1 + Math.sin(course * 1.7 + t.diameter) * 0.0015);
      let luas = Math.PI * (d / 2) ** 2;                               // m²
      if (mm <= 150) luas *= 0.55 + 0.45 * (mm / 150);                // dasar miring
      if (mm > 200 && mm <= 600) luas -= 0.35;                         // koil pemanas
      vol += luas * 0.01;                                              // 10 mm = 0,01 m
      tabel.push([mm, vol]);
    }
    return tabel;
  }

  // Cari volume dari tinggi cairan (interpolasi linear di antara dua baris tabel)
  function volumeDariLevel(tabel, mm) {
    if (mm <= 0) return 0;
    const i = Math.min(tabel.length - 2, Math.floor(mm / 10));
    const [m0, v0] = tabel[i], [m1, v1] = tabel[i + 1];
    return v0 + (v1 - v0) * ((mm - m0) / (m1 - m0));
  }
  // Kebalikannya: dari volume → tinggi cairan (mm)
  function levelDariVolume(tabel, v) {
    if (v <= 0) return 0;
    let lo = 0, hi = tabel.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tabel[mid][1] < v) lo = mid; else hi = mid; }
    const [m0, v0] = tabel[lo], [m1, v1] = tabel[hi];
    return m0 + (m1 - m0) * ((v - v0) / (v1 - v0 || 1));
  }

  // Suhu rata-rata cairan: hanya sensor yang TERENDAM yang dihitung (praktik ATG)
  // posisiSensor = tinggi sensor dalam % (atas, tengah, bawah)
  function suhuRata(suhu, levelPersen, posisiSensor = [85, 50, 15]) {
    const terendam = suhu.filter((_, i) => posisiSensor[i] < levelPersen);
    const pakai = terendam.length ? terendam : [suhu[suhu.length - 1]];
    return pakai.reduce((a, b) => a + b, 0) / pakai.length;
  }

  // Volume Correction Factor: menyetarakan volume ke suhu referensi
  // VCF = 1 − α × (T − Tref)   (pendekatan linear, α = koefisien muai)
  function vcf(suhu, cfg) { return 1 - cfg.alfa * (suhu - cfg.suhuReferensi); }

  /* Hitung semua angka penting satu tangki dari level & suhu */
  function hitung(t, data, cfg) {
    const produk = cfg.produk[t.produk];
    const levelMm = (data.level / 100) * t.tinggi * 1000;
    const gov = volumeDariLevel(t.tabel, levelMm);                   // Gross Observed Volume (m³)
    const suhu = suhuRata(data.suhu, data.level);
    const f = vcf(suhu, cfg);
    const nsv = gov * f;                                               // Net Standard Volume (m³) @ suhu referensi
    const massa = nsv * produk.densitas;                               // ton = m³ × t/m³
    const kapasitas = t.tabel[t.tabel.length - 1][1];
    return {
      levelMm, gov, nsv, massa, suhu, vcf: f, kapasitas,
      ullageMm: t.tinggi * 1000 - levelMm,                             // ruang kosong di atas cairan
      densitasAktual: produk.densitas * f,                             // densitas pada suhu aktual
    };
  }

  return { buatTabelKalibrasi, volumeDariLevel, levelDariVolume, suhuRata, vcf, hitung };
})();
