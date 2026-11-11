/* =========================================================
   CONFIG — PENGATURAN & DATA
   Ini file yang paling sering Anda ubah.
   Ganti teks di antara tanda kutip "..." lalu simpan (Ctrl+S).
   ========================================================= */

const CONFIG = {
  // ---- Identitas perusahaan ----
  namaSistem: "MITMAG SMART MONITORING SYSTEM",
  subJudul: "Digital Twin Smart Manufacture 4.0 · Provide by PT MITMAG",
  namaPerusahaan: "PT MITMAG",
  namaSingkat: "MITMAG",

  // ---- Kontak di footer (GANTI dengan data asli Anda) ----
  telepon: "+62 000-0000-0000",
  email: "email@perusahaan-anda.com",
  website: "www.website-anda.com",
  namaPembuat: "Nama Anda",
};

/* ---- Daftar peralatan di "Kontrol Peralatan" ----
   id     : kode unik (huruf kecil, tanpa spasi)
   nama   : nama yang tampil
   icon   : nama gambar di js/icons.js            */
const PERALATAN = [
  { id: "hvac", nama: "HVAC", icon: "hvac" },
  { id: "chiller", nama: "Chiller", icon: "chiller" },
  { id: "ahu", nama: "AHU", icon: "ahu" },
  { id: "pompa", nama: "Pompa", icon: "pump" },
  { id: "boiler", nama: "Boiler", icon: "boiler" },
  { id: "lighting", nama: "Lighting", icon: "lamp" },
  { id: "lvmdp", nama: "LVMDP", icon: "panel" },
  { id: "flow", nama: "Flow Meter", icon: "flow" },
  { id: "valve", nama: "Control Valve", icon: "valve" },
  { id: "power", nama: "Power Meter", icon: "meter" },
  { id: "genset", nama: "Gen Set", icon: "genset" },
  { id: "battery", nama: "Battery/Aki", icon: "battery" },
];

/* ---- Sensor di "Monitoring Real-Time" ----
   nilai : nilai awal,  naik-turun acak ± acak
   batas : jika nilai melewati batas → muncul alarm di "AI – Pemicu Anomali" */
const SENSOR = [
  { id: "flow", nama: "Flow Meter", nilai: 1334, satuan: "m³/h", acak: 15, desimal: 0, batas: 1400 },
  { id: "power", nama: "Power Meter", nilai: 245.2, satuan: "kWh", acak: 3, desimal: 1, batas: 260 },
  { id: "tpompa", nama: "Tekanan Pompa", nilai: 5.5, satuan: "bar", acak: 0.2, desimal: 1, batas: 5.6 },
  { id: "tgenset", nama: "Tekanan Genset", nilai: 4.7, satuan: "bar", acak: 0.1, desimal: 1, batas: 5 },
  { id: "suhu", nama: "Suhu", nilai: 23.4, satuan: "°C", acak: 0.3, desimal: 1, batas: 26 },
  { id: "rh", nama: "Kelembapan", nilai: 54, satuan: "%RH", acak: 1, desimal: 0, batas: 55 },
  { id: "valve", nama: "Valve", nilai: 86, satuan: "% buka", acak: 2, desimal: 0, batas: 88 },
  { id: "oli", nama: "Level Tangki Oli", nilai: 63, satuan: "%", acak: 1, desimal: 0, batas: 60, bawah: true },
  { id: "toli", nama: "Tekanan Oli", nilai: 3.5, satuan: "bar", acak: 0.1, desimal: 1, batas: 4 },
  { id: "solar", nama: "Solar Level", nilai: 71, satuan: "%", acak: 1, desimal: 0, batas: 70, bawah: true },
  { id: "gas", nama: "Gas Meter", nilai: 126, satuan: "m³", acak: 2, desimal: 0, batas: 140 },
  { id: "aki", nama: "Baterai/Aki", nilai: 53.8, satuan: "V", acak: 0.4, desimal: 1, batas: 54.5 },
];

/* ---- Pintu akses kontrol & karyawan ---- */
const PINTU = ["Pintu Utama", "Pintu Kantor 1", "Lantai Pabrik", "Gudang", "Ruang Server"];
const KARYAWAN = [
  { nama: "Budi Santoso", id: "EMP-001" },
  { nama: "Sari Wulandari", id: "EMP-014" },
  { nama: "Dimas Pratama", id: "EMP-027" },
  { nama: "Rina Anggraini", id: "EMP-033" },
  { nama: "Agus Hidayat", id: "EMP-041" },
];

/* ---- Zona fire alarm ---- */
const ZONA_API = ["Lantai Dasar", "Lantai Pabrik", "Mezzanine", "Gudang", "Ruang Panel", "Ruang Genset"];

/* ---- Kamera CCTV ---- */
const KAMERA = ["Lantai Pabrik 1", "Lantai Pabrik 2", "Upper Mezzanine", "Ruang Panel LVMDP", "Ruang Genset", "Pintu Utama"];

/* ---- Tenant gedung (modul Smart Tower) ---- */
const TENANT = [
  { kode: "T-01", lantai: "Lt.2", nama: "PT Samudra Boga", bidang: "F&B", luas: 120 },
  { kode: "T-02", lantai: "Lt.3", nama: "CV Cakra Konsultan", bidang: "Konsultan", luas: 90 },
  { kode: "T-03", lantai: "Lt.4", nama: "PT Nusa Teknologi", bidang: "IT", luas: 150 },
  { kode: "T-04", lantai: "Lt.5", nama: "PT Bahari Logistik", bidang: "Logistik", luas: 180 },
  { kode: "T-05", lantai: "Lt.6", nama: "PT Citra Farma", bidang: "Farmasi", luas: 110 },
  { kode: "T-06", lantai: "Lt.7", nama: "Kantor Hukum Pratama", bidang: "Hukum", luas: 85 },
  { kode: "T-07", lantai: "Lt.8", nama: "PT Medika Prima", bidang: "Klinik", luas: 200 },
  { kode: "T-08", lantai: "Lt.9", nama: "PT Garuda Digital", bidang: "Digital", luas: 160 },
  { kode: "T-09", lantai: "Lt.10", nama: "CV Tirta Kreatif", bidang: "Kreatif", luas: 95 },
  { kode: "T-10", lantai: "Lt.11", nama: "PT Sumber Energi", bidang: "Energi", luas: 220 },
];
