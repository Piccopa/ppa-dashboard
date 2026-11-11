/* =========================================================
   ATG-DATA.JS — SATU SUMBER DATA + SIMULASI INSTRUMEN
   Semua halaman ATG (3D, panel, overview, nanti alarm/trend/
   inventory) membaca dari objek ATG.data di file ini.
   Nanti saat tersambung PLC: isi nilai lewat ATG.tulisTag().
   ========================================================= */

/* ---------- 1. PENGATURAN (ubah sesuai plant Anda) ---------- */
const ATG_CONFIG = {
  kecepatan: 120,          // 1 detik nyata = 120 detik proses (agar level terlihat bergerak)
  suhuReferensi: 50,       // °C, suhu acuan untuk Net Standard Volume
  alfa: 0.00068,           // koefisien muai minyak sawit per °C (simulasi)
  batas: {                 // batas alarm
    LSHH: 95, LSH: 90, LSL: 10, LSLL: 5,      // % level
    TAH: 65, TAHH: 70,                         // °C
    PAH: 0.25,                                 // barG
    GAS_WARN: 20, GAS_ALARM: 40,               // %LEL
  },
  produk: {
    CPO: { nama: "CPO (Crude Palm Oil)", densitas: 0.891, warna: 0xb4400f },   // t/m³ @ suhu referensi
    FA: { nama: "Fatty Acid (PFAD)", densitas: 0.870, warna: 0xe2b33c },
  },
  aliran: { masuk: 25.5, keluar: 10.2 },       // T/h normal TK-101
  langkahValve: 4,                             // detik untuk membuka/menutup penuh
};

/* ---------- 2. DAFTAR TANGKI ---------- */
const ATG_TANGKI = [
  { id: "TK-101", produk: "CPO", diameter: 11, tinggi: 10.5, x: -18, z: 6, detail: true },
  { id: "TK-102", produk: "CPO", diameter: 11, tinggi: 10.5, x: 0, z: 6 },
  { id: "TK-103", produk: "CPO", diameter: 13, tinggi: 11.5, x: 19, z: 6 },
  { id: "TK-201", produk: "FA", diameter: 8, tinggi: 10, x: -18, z: -15 },
  { id: "TK-202", produk: "FA", diameter: 8, tinggi: 10, x: -3, z: -15 },
  { id: "TK-203", produk: "FA", diameter: 9, tinggi: 10, x: 13, z: -15 },
];
ATG_TANGKI.forEach((t) => (t.tabel = ATG_CALC.buatTabelKalibrasi(t)));
const POSISI_TT = [85, 50, 15];   // posisi sensor suhu atas/tengah/bawah (% tinggi tangki)

/* ---------- 3. DATA AWAL ---------- */
function dataAwal() {
  const awalLevel = [65.5, 48.2, 72.4, 38.6, 81.3, 22.7];
  const tangki = {};
  ATG_TANGKI.forEach((t, i) => {
    tangki[t.id] = {
      level: awalLevel[i],
      suhu: t.produk === "CPO" ? [58.5, 56.2, 54.8] : [62.1, 60.4, 59.0],
      tekanan: 0.15,
      masuk: 0, keluar: 0,                 // T/h
      totalMasuk: 1250 + i * 310,          // Ton
      totalKeluar: 850 + i * 270,
      mode: "IDLE",                        // FILLING / DISCHARGING / IDLE
      sisaMode: 30 + i * 25,               // tangki selain TK-101 berganti mode otomatis
    };
  });
  return {
    tangki,
    // Instrumen & peralatan khusus TK-101
    tk101: {
      inletAktif: false, outletAktif: false,
      valve: {
        "XV-101A": { posisi: 0, perintah: "CLOSE", status: "CLOSE", fault: false },   // inlet
        "XV-101B": { posisi: 0, perintah: "CLOSE", status: "CLOSE", fault: false },   // outlet
      },
      pompa: { status: "STOP", fault: false, perintah: "STOP" },
      gas: 2.0,                // %LEL
      offsetSuhu: 0, offsetTekanan: 0, offsetGas: 0,
      alarmTestSampai: 0,
    },
    log: [],
  };
}

/* ---------- 4. OBJEK UTAMA ATG ---------- */
const ATG = {
  data: dataAwal(),
  modePLC: false,             // true = nilai TK-101 datang dari PLC, simulasi proses dimatikan
  hasil: {},                  // hasil perhitungan per tangki (volume, massa, dst.)
  riwayat: [],                // rekaman tiap detik (dipakai Trend & Inventory di tahap berikutnya)

  catat(teks) {
    const jam = new Date().toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":");
    this.data.log.unshift(`${jam} — ${teks}`);
    this.data.log = this.data.log.slice(0, 50);
  },

  /* ----- Status saklar level (LSHH, LSH, LSL, LSLL) ----- */
  saklarLevel(id) {
    const L = this.data.tangki[id].level, b = ATG_CONFIG.batas;
    const tes = id === "TK-101" && Date.now() < this.data.tk101.alarmTestSampai;
    return { LSHH: tes || L >= b.LSHH, LSH: tes || L >= b.LSH, LSL: tes || L <= b.LSL, LSLL: tes || L <= b.LSLL };
  },

  /* ----- PERINTAH DARI PANEL SIMULASI ----- */
  perintahValve(tag, buka) {
    const v = this.data.tk101.valve[tag];
    if (v.fault) return this.catat(`${tag} FAULT — perintah ditolak`);
    v.perintah = buka ? "OPEN" : "CLOSE";
    this.catat(`${tag} perintah ${v.perintah}`);
  },
  perintahPompa(jalan) {
    const p = this.data.tk101.pompa;
    if (jalan && p.fault) return this.catat("P-101 MOTOR FAULT — tidak bisa start");
    if (jalan && this.saklarLevel("TK-101").LSLL) return this.catat("P-101 diblok interlock LSLL (level terlalu rendah)");
    p.perintah = jalan ? "RUN" : "STOP";
    this.catat(`P-101 ${p.perintah}`);
  },
  inlet(mulai) {
    const k = this.data.tk101;
    if (mulai && this.saklarLevel("TK-101").LSHH) return this.catat("Inlet diblok interlock LSHH (tangki hampir penuh)");
    k.inletAktif = mulai;
    this.perintahValve("XV-101A", mulai);
    this.catat(mulai ? "INLET START" : "INLET STOP");
  },
  outlet(mulai) {
    const k = this.data.tk101;
    k.outletAktif = mulai;
    this.perintahValve("XV-101B", mulai);
    if (!mulai) this.perintahPompa(false);     // pompa start otomatis setelah valve terbuka penuh
    this.catat(mulai ? "OUTLET START (valve dibuka, pompa menunggu)" : "OUTLET STOP");
  },
  ubahLevel(delta) { const t = this.data.tangki["TK-101"]; t.level = Math.max(0, Math.min(100, t.level + delta)); this.catat(`Simulasi level ${delta > 0 ? "+" : ""}${delta}%`); },
  ubahSuhu(delta) { this.data.tk101.offsetSuhu += delta; this.catat(`Simulasi suhu ${delta > 0 ? "+" : ""}${delta} °C`); },
  ubahTekanan(delta) { this.data.tk101.offsetTekanan = Math.round((this.data.tk101.offsetTekanan + delta) * 100) / 100; this.catat(`Simulasi tekanan ${delta > 0 ? "+" : ""}${delta} barG`); },
  setGas(mode) { this.data.tk101.offsetGas = { NORMAL: 0, WARNING: 24, ALARM: 46 }[mode]; this.catat(`Simulasi gas: ${mode}`); },
  toggleFault(jenis, tag) {
    const k = this.data.tk101;
    if (jenis === "pompa") { k.pompa.fault = !k.pompa.fault; if (k.pompa.fault) k.pompa.perintah = "STOP"; this.catat(`P-101 MOTOR FAULT ${k.pompa.fault ? "AKTIF" : "direset"}`); }
    else { const v = k.valve[tag]; v.fault = !v.fault; this.catat(`${tag} FAULT ${v.fault ? "AKTIF" : "direset"}`); }
  },
  alarmTest() { this.data.tk101.alarmTestSampai = Date.now() + 6000; this.catat("ALARM TEST 6 detik"); },
  reset() { this.data = dataAwal(); try { localStorage.removeItem("mitmag-atg"); } catch (e) {} this.catat("Simulasi direset"); },

  /* ----- 5. LANGKAH SIMULASI (dipanggil tiap 0,25 detik) ----- */
  langkah(dtNyata) {
    const D = this.data, k = D.tk101, dt = dtNyata * ATG_CONFIG.kecepatan;   // detik proses
    const acak = (a) => (Math.random() - 0.5) * a;

    // Valve bergerak menuju perintah (waktu nyata, supaya animasi terlihat)
    Object.entries(k.valve).forEach(([tag, v]) => {
      if (v.fault) { v.status = "FAULT"; return; }
      const target = v.perintah === "OPEN" ? 100 : 0;
      const langkah = (100 / ATG_CONFIG.langkahValve) * dtNyata;
      if (Math.abs(v.posisi - target) <= langkah) { v.posisi = target; v.status = v.perintah; }
      else { v.posisi += Math.sign(target - v.posisi) * langkah; v.status = "MOVING"; }
    });

    // Pompa: start otomatis jika outlet aktif & valve outlet sudah OPEN
    const p = k.pompa;
    if (k.outletAktif && k.valve["XV-101B"].status === "OPEN" && p.perintah !== "RUN" && !p.fault) this.perintahPompa(true);
    p.status = p.fault ? "FAULT" : p.perintah;

    if (!this.modePLC) {
      ATG_TANGKI.forEach((t) => {
        const s = D.tangki[t.id];
        if (t.id === "TK-101") {
          s.masuk = k.inletAktif ? (ATG_CONFIG.aliran.masuk + acak(0.6)) * (k.valve["XV-101A"].posisi / 100) : 0;
          const bisaKeluar = p.status === "RUN" && k.valve["XV-101B"].posisi > 5;
          s.keluar = bisaKeluar ? (ATG_CONFIG.aliran.keluar + acak(0.4)) * (k.valve["XV-101B"].posisi / 100) : 0;
          s.mode = s.masuk > 0.5 ? "FILLING" : s.keluar > 0.5 ? "DISCHARGING" : "IDLE";
        } else {
          // Tangki lain: berganti mode otomatis supaya plant terlihat hidup
          s.sisaMode -= dtNyata;
          if (s.sisaMode <= 0) {
            s.mode = s.level > 85 ? "DISCHARGING" : s.level < 20 ? "FILLING" : ["FILLING", "DISCHARGING", "IDLE"][Math.floor(Math.random() * 3)];
            s.sisaMode = 40 + Math.random() * 60;
          }
          s.masuk = s.mode === "FILLING" ? 18 + acak(1) : 0;
          s.keluar = s.mode === "DISCHARGING" ? 14 + acak(1) : 0;
        }
        // Ubah massa → volume → level memakai tabel kalibrasi
        const h = ATG_CALC.hitung(t, s, ATG_CONFIG);
        const dTon = ((s.masuk - s.keluar) * dt) / 3600;
        const volBaru = Math.max(0, h.gov + dTon / h.densitasAktual);
        s.level = Math.min(100, (ATG_CALC.levelDariVolume(t.tabel, volBaru) / (t.tinggi * 1000)) * 100);
        s.totalMasuk += (s.masuk * dt) / 3600;
        s.totalKeluar += (s.keluar * dt) / 3600;

        // Suhu: lapisan atas sedikit lebih panas, minyak masuk (±60 °C) menaikkan suhu
        const dasar = t.produk === "CPO" ? [58.5, 56.2, 54.8] : [62.1, 60.4, 59.0];
        const off = t.id === "TK-101" ? k.offsetSuhu : 0;
        s.suhu = s.suhu.map((v, i) => v + (dasar[i] + off + (s.masuk > 0 ? 0.6 : 0) - v) * 0.05 + acak(0.05));
        // Tekanan ruang uap: naik sedikit saat pengisian (uap terdesak)
        const offP = t.id === "TK-101" ? k.offsetTekanan : 0;
        s.tekanan += (0.15 + (s.masuk > 0 ? 0.03 : 0) - (s.keluar > 0 ? 0.02 : 0) + offP - s.tekanan) * 0.1 + acak(0.003);
      });
      k.gas += (2 + k.offsetGas - k.gas) * 0.15 + acak(0.2);
      k.gas = Math.max(0, k.gas);
    }

    // INTERLOCK keselamatan TK-101
    const sw = this.saklarLevel("TK-101");
    if (Date.now() > k.alarmTestSampai) {
      if (sw.LSHH && k.inletAktif) { k.inletAktif = false; this.perintahValve("XV-101A", false); this.catat("INTERLOCK LSHH: inlet ditutup otomatis (cegah overfill)"); }
      if (sw.LSLL && p.perintah === "RUN") { p.perintah = "STOP"; k.outletAktif = false; this.perintahValve("XV-101B", false); this.catat("INTERLOCK LSLL: pompa berhenti (cegah dry-run)"); }
    }

    // Hitung ulang semua angka
    ATG_TANGKI.forEach((t) => (this.hasil[t.id] = ATG_CALC.hitung(t, D.tangki[t.id], ATG_CONFIG)));
  },

  /* ----- 6. REKAM RIWAYAT (tiap 1 detik) ----- */
  rekam() {
    const s = this.data.tangki["TK-101"], h = this.hasil["TK-101"];
    this.riwayat.push({ t: Date.now(), level: s.level, tTop: s.suhu[0], tMid: s.suhu[1], tBot: s.suhu[2], masuk: s.masuk, keluar: s.keluar, volume: h.gov, tekanan: s.tekanan });
    if (this.riwayat.length > 3600) this.riwayat.shift();
  },

  /* ----- 7. SIMPAN & MUAT (localStorage) ----- */
  simpan() { try { localStorage.setItem("mitmag-atg", JSON.stringify(this.data)); } catch (e) {} },
  muat() {
    try {
      const s = JSON.parse(localStorage.getItem("mitmag-atg") || "null");
      if (s && s.tangki && s.tk101) { this.data = s; this.data.tk101.alarmTestSampai = 0; this.catat("Data simulasi terakhir dimuat"); }
    } catch (e) {}
  },

  /* ----- 8. JEMBATAN KE PLC (untuk pengembangan nanti) -----
     Contoh: data dari PLC/Modbus/MQTT diterima → ATG.tulisTag("LT-101", 65.5)
     Setiap tag menunjuk ke satu nilai di ATG.data. */
  tag: {
    "LT-101": ["tangki", "TK-101", "level"],
    "TT-101A": ["tangki", "TK-101", "suhu", 0],
    "TT-101B": ["tangki", "TK-101", "suhu", 1],
    "TT-101C": ["tangki", "TK-101", "suhu", 2],
    "PT-101": ["tangki", "TK-101", "tekanan"],
    "FIT-101": ["tangki", "TK-101", "masuk"],
    "FIT-101.TOT": ["tangki", "TK-101", "totalMasuk"],
    "FIT-102": ["tangki", "TK-101", "keluar"],
    "FIT-102.TOT": ["tangki", "TK-101", "totalKeluar"],
    "GD-101": ["tk101", "gas"],
    "XV-101A.POS": ["tk101", "valve", "XV-101A", "posisi"],
    "XV-101B.POS": ["tk101", "valve", "XV-101B", "posisi"],
  },
  bacaTag(tag) { return this.tag[tag].reduce((o, k) => o[k], this.data); },
  tulisTag(tag, nilai) {
    const jalur = this.tag[tag], akhir = jalur[jalur.length - 1];
    jalur.slice(0, -1).reduce((o, k) => o[k], this.data)[akhir] = nilai;
  },
};
ATG.langkah(0);
