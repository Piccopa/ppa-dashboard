/* =========================================================
   CONFIG.JS — PENGATURAN SILO BATU BARA (ubah angka di sini)
   Semua data = SIMULATION (data contoh, bukan data lapangan).
   ========================================================= */
const CONFIG = {
  judul: "SMART INDUSTRIAL PLANT",
  nama: "COAL SILO MONITORING",
  subjudul: "3D SOLID MATERIAL / COAL SILO MONITORING SYSTEM",
  tagline: "Advanced 3D Material Visualization, Intelligent Instrumentation & Real-Time Industrial Monitoring",
  simpanKey: "cs-",
  kecepatanAwal: 60,

  // ---------- geometri silo (sama untuk semua silo) ----------
  // Ketinggian diukur dari outlet hopper (0 m). Volume kerja = kapasitas / densitas.
  geo: {
    D: 7.0,              // diameter silinder (m)
    Hh: 4.5,             // tinggi hopper kerucut (m)
    d0: 0.8,             // diameter outlet (m)
    freeboard: 1.2,      // ruang kosong di atas level maksimum (m)
    roof: 1.6,           // tinggi atap kerucut (m)
    elevasi: 5.0,        // tinggi outlet dari tanah (m) – ruang untuk gate, rotary valve, screw conveyor
    sudutCurah: 35,      // angle of repose batu bara (°)
  },
  densitas: 0.80,        // bulk density batu bara (t/m³)
  kapasitas: 800,        // kapasitas tiap silo (ton)

  // ---------- silo ----------
  // [id, nama, massa awal (t), suhu dasar sensor 1..4 (°C)]
  silo: [
    ["SILO-01", "COAL SILO-01", 623.2, [36.8, 38.4, 40.3, 41.0]],
    ["SILO-02", "COAL SILO-02", 412.0, [35.2, 36.9, 38.1, 39.0]],
    ["SILO-03", "COAL SILO-03", 705.5, [37.4, 39.2, 41.5, 42.2]],
    ["SILO-04", "COAL SILO-04", 268.0, [34.6, 35.8, 36.9, 37.5]],
  ],
  material: "COAL",
  jenisBatubara: "Sub-bituminous, 4.200 kcal/kg (contoh)",

  // posisi sensor (m dari outlet) & posisi radar/scanner di atap
  tinggiTT: [6, 12, 18, 24],          // TT-n11 … TT-n14 (kabel suhu multi-titik)
  posTT: { r: 1.9, sudut: 200 },
  posRadar: { r: 1.6, sudut: 0 },
  posScanner: { r: 0.0, sudut: 0 },
  posInlet: { r: 0.6, sudut: 30 },
  tinggiLSH: 27.0, tinggiLSL: 3.0,     // level switch (m dari outlet)

  // ---------- laju & logika otomatis ----------
  laju: { isi: 150, keluarMin: 18, keluarMaks: 32, keluarManual: 30 },   // t/h
  auto: { mulaiIsi: 70, berhentiIsi: 88, minKeluar: 6 },                  // % level

  // ---------- batas alarm (bisa diubah di System Settings) ----------
  batas: {
    levelHH: 92, levelH: 85, levelL: 20, levelLL: 10,      // % volumetrik
    tempH: 50, tempHH: 60,                                  // °C batu bara (self-heating)
    coH: 50, coHH: 100,                                     // ppm CO di headspace
    debuH: 10, debuHH: 20,                                  // mg/m³
    dpBagH: 15,                                             // mbar ΔP bag filter
    tekananH: 5,                                            // mbar silo
    deviasiLC: 5,                                           // % deviasi load cell vs volume
  },

  // ---------- peralatan ----------
  // [tag, nama, jenis, area, daya kW]
  alat: [
    ["BFD-001", "Truck Hopper Belt Feeder", "Belt Feeder", "RECEIVING", 15],
    ["CV-001", "Coal Receiving Conveyor", "Belt Conveyor", "RECEIVING", 45],
    ["BE-001", "Bucket Elevator", "Bucket Elevator", "RECEIVING", 75],
    ["CV-002", "Silo Top Distribution Conveyor", "Belt Conveyor", "RECEIVING", 37],
    ["DC-001", "Dust Collector Fan", "Dust Collector", "DUST", 55],
    ["BF-001", "Bag Filter (pulse-jet)", "Bag Filter", "DUST", 4],
    ["CV-003", "Discharge Conveyor to Boiler", "Belt Conveyor", "DISCHARGE", 45],
  ],
  // peralatan per silo: diverter (transfer chute), discharge gate, rotary airlock valve, screw conveyor
  alatSilo: [["DV", "Transfer Chute Diverter", "Transfer Chute", 1.5], ["XV", "Discharge Gate", "Slide Gate", 1.1], ["RV", "Rotary Airlock Valve", "Rotary Valve", 5.5], ["SC", "Screw Conveyor", "Screw Conveyor", 15]],

  // ---------- komunikasi (diubah di System Settings) ----------
  komunikasi: {
    mode: "SIMULATION",                       // SIMULATION | MODBUS_TCP | MODBUS_RTU | OPC_UA | MQTT
    modbusTCP: { ip: "192.168.1.111", port: 502, unitId: 1, poll: 1000 },
    modbusRTU: { port: "COM2", baud: 19200, format: "8N2", unitId: 1, poll: 1000 },
    opcua: { endpoint: "opc.tcp://192.168.1.50:4840", nodePrefix: "ns=2;s=CoalSilo." },
    mqtt: { broker: "ws://192.168.1.60:8083/mqtt", topik: "plant/coalsilo/#", qos: 1 },
    pointCloud: { sumber: "SIMULATION", format: "CSV x,y,z (m) relatif terhadap sumbu silo; z dari outlet hopper" },
  },
};

/* ---------- turunan geometri (dihitung otomatis) ---------- */
(() => {
  const g = CONFIG.geo;
  g.R = g.D / 2; g.r0 = g.d0 / 2; g.A = Math.PI * g.R * g.R;
  g.Vh = (Math.PI * g.Hh / 3) * (g.R * g.R + g.R * g.r0 + g.r0 * g.r0);
  g.Vkerja = CONFIG.kapasitas / CONFIG.densitas;                       // m³
  g.Hc = (g.Vkerja - g.Vh) / g.A;                                       // tinggi silinder kerja
  g.Hfill = g.Hh + g.Hc;                                                // level maksimum (100 %)
  g.Hshell = g.Hfill + g.freeboard;                                     // puncak dinding silinder
  g.Hradar = g.Hshell + g.roof * 0.55;                                  // flange radar di atap
})();

/* ---------- daftar tag instrumen per silo ----------
   [akhiran tag, nama instrumen, satuan, desimal, kategori] ; tag lengkap = PREFIX-n + akhiran (n = 1..4) */
const INST = [
  ["LS-#01", "3D Level Scanner", "%", 0, "SCANNER"],
  ["LT-#02", "Radar Level Transmitter", "m", 2, "RADAR"],
  ["WT-#03", "Weight Transmitter (total)", "t", 1, "WEIGHT"],
  ["WE-#03A", "Load Cell A (45°)", "t", 1, "WEIGHT"],
  ["WE-#03B", "Load Cell B (135°)", "t", 1, "WEIGHT"],
  ["WE-#03C", "Load Cell C (225°)", "t", 1, "WEIGHT"],
  ["WE-#03D", "Load Cell D (315°)", "t", 1, "WEIGHT"],
  ["TT-#11", "Temperature Sensor 01 (6 m)", "°C", 1, "TEMP"],
  ["TT-#12", "Temperature Sensor 02 (12 m)", "°C", 1, "TEMP"],
  ["TT-#13", "Temperature Sensor 03 (18 m)", "°C", 1, "TEMP"],
  ["TT-#14", "Temperature Sensor 04 (24 m)", "°C", 1, "TEMP"],
  ["LSH-#21", "High Level Switch (27 m)", "", 0, "SWITCH"],
  ["LSL-#22", "Low Level Switch (3 m)", "", 0, "SWITCH"],
  ["PT-#31", "Silo Pressure Transmitter", "mbar", 1, "PROCESS"],
  ["AT-#41", "CO Gas Detector (headspace)", "ppm", 0, "PROCESS"],
  ["AT-#42", "Dust Monitor (silo top)", "mg/m³", 1, "PROCESS"],
];
const tagN = (pola, n) => pola.replace("#", String(n));
