/* =========================================================
   CONFIG.JS — PENGATURAN UTAMA PLANT
   Ubah angka di sini untuk menyesuaikan kapasitas plant Anda.
   ========================================================= */
const CONFIG = {
  nama: "GREEN ENERGY SOLAR POWER PLANT MONITORING SYSTEM",
  sub: "3D RENEWABLE ENERGY GENERATION & DISTRIBUTION MANAGEMENT",
  singkat: "GREEN POWER",

  // Sumber data. Saat ini "SIMULATION".
  // Nanti bisa diganti, misalnya "GATEWAY" → data dibaca dari gateway Modbus TCP/RTU,
  // PLC, inverter, smart meter, dan BMS (lihat js/datasource.js).
  sumberData: "SIMULATION",

  pv: {
    array: 6,                 // jumlah PV array (masing-masing punya 1 inverter station)
    kWpPerArray: 1000,        // kapasitas DC tiap array (kWp)
    inverterKW: 850,          // kapasitas AC tiap inverter (kW)
    modulWp: 550,             // daya per modul (Wp)
    modulPerString: 28,
    vMpp: 1100,               // tegangan DC kerja (V)
    vAC: 800,                 // tegangan AC keluaran inverter (V)
  },
  bess: { kWh: 8000, pcsKW: 3000, container: 4, socMin: 15, socMax: 95, socStartDG: 25, vNom: 1150 },
  dg: { kVA: 2000, kW: 1600, rpm: 1500, tangkiL: 50000, rendahPct: 25, kritisPct: 10 },
  beban: { pabrikMaks: 2800, rumah: 96, blok: ["A", "B", "C", "D", "E", "F"] },
  grid: { kV: 20, imporMaks: 4500, eksporMaks: 2000 },
  trafo: { FAC: 4000, RES: 630, PV: 6000, DG: 2000 },   // kVA

  // Baseline emisi (ASUMSI SIMULASI — ganti sesuai faktor emisi resmi jaringan Anda)
  emisi: { gridKgPerKWh: 0.85, dieselKgPerL: 2.68 },

  kecepatanAwal: 60,          // 1 detik nyata = 60 detik simulasi
  simpanKey: "gp-",           // awalan kunci localStorage
};
