/* =========================================================
   CONFIG.JS — PENGATURAN KILANG (ubah angka di sini)
   Semua data di aplikasi ini adalah SIMULASI (SIMULATION).
   ========================================================= */
const CONFIG = {
  nama: "Oil Refinery Plant",
  judul: "3D OIL REFINERY PLANT MONITORING SYSTEM",
  subjudul: "INDUSTRIAL SCADA / DCS PROCESS MONITORING",
  sumberData: "SIMULATION",
  simpanKey: "rf-",
  kecepatanAwal: 60,

  // ---------- kapasitas & umpan ----------
  kapasitasBPD: 100000,              // kapasitas desain (barrel per hari)
  feedAwal: 600,                     // setpoint umpan crude awal (m³/h)
  crude: { densitas: 865, sulfurPct: 1.2, api: 32 },

  // ---------- unit proses opsional ----------
  unit: { fcc: true, sru: true },     // FCC & SRU bisa dimatikan (juga dari halaman FCC)

  // ---------- yield (fraksi volume) ----------
  yieldCDU: { lpg: 0.02, lnap: 0.08, hnap: 0.12, kero: 0.12, diesel: 0.24, ar: 0.42 },
  yieldVDU: { lvgo: 0.12, hvgo: 0.43, vr: 0.45 },
  yieldREF: { reformate: 0.82, lpg: 0.06, h2Nm3PerM3: 200 },
  yieldFCC: { gasoline: 0.55, lco: 0.18, lpg: 0.22, slurry: 0.07, cokeWt: 0.05 },
  h2: { hdtNm3PerM3: 90, lainNm3h: 4500, smrMaks: 22000 },

  // ---------- densitas produk (kg/m³) ----------
  rho: { crude: 865, gasoline: 740, diesel: 840, kero: 800, naphtha: 700, fueloil: 980, inter: 850, lpg: 540 },

  // ---------- tangki (id, layanan, produk, kapasitas m³, diameter, tinggi, atap, posisi 3D x,z, suhu °C, analyzer) ----------
  // atap: EFR = external floating roof · CR = cone roof · SPH = bola LPG
  tangki: [
    ["TK-01", "Crude Oil A", "crude", 65000, 60, 24, "EFR", -395, -275, 35, null],
    ["TK-02", "Crude Oil B", "crude", 65000, 60, 24, "EFR", -310, -275, 35, null],
    ["TK-03", "Crude Oil C", "crude", 65000, 60, 24, "EFR", -395, -190, 35, null],
    ["TK-04", "Crude Oil D", "crude", 65000, 60, 24, "EFR", -310, -190, 35, null],
    ["TK-05", "Gasoline A", "gasoline", 25000, 44, 17, "EFR", 205, -280, 36, ["RON", "RON", 92, 1]],
    ["TK-06", "Gasoline B", "gasoline", 25000, 44, 17, "EFR", 265, -280, 36, ["RON", "RON", 92, 1]],
    ["TK-07", "Diesel A", "diesel", 30000, 46, 18, "CR", 330, -280, 40, ["Sulfur", "ppm", 8, 0]],
    ["TK-08", "Diesel B", "diesel", 30000, 46, 18, "CR", 390, -280, 40, ["Sulfur", "ppm", 8, 0]],
    ["TK-09", "Kerosene / Avtur", "kero", 18000, 38, 16, "CR", 205, -200, 38, ["Flash point", "°C", 42, 1]],
    ["TK-10", "Naphtha", "naphtha", 15000, 34, 16, "EFR", 265, -200, 34, null],
    ["TK-11", "Fuel Oil", "fueloil", 25000, 44, 16, "CR", 330, -200, 70, ["Viscosity", "cSt", 180, 0]],
    ["TK-12", "Intermediate / Slop", "inter", 10000, 28, 16, "CR", 390, -200, 45, null],
    ["SP-13", "LPG Sphere A", "lpg", 3000, 18, 18, "SPH", 335, -10, 30, null],
    ["SP-14", "LPG Sphere B", "lpg", 3000, 18, 18, "SPH", 375, -10, 30, null],
    ["SP-15", "LPG Sphere C", "lpg", 3000, 18, 18, "SPH", 415, -10, 30, null],
  ],
  levelBatas: { LL: 5, L: 10, H: 90, HH: 95 },

  // ---------- pompa: id, layanan, area, laju desain m³/h, daya kW, tegangan V, P hisap/buang bar ----------
  pompa: [
    ["P-101A", "Crude charge pump", "CDU", 700, 900, 6600, 3.5, 22], ["P-101B", "Crude charge pump (standby)", "CDU", 700, 900, 6600, 3.5, 22],
    ["P-102A", "CDU reflux pump", "CDU", 260, 160, 400, 1.6, 9], ["P-102B", "CDU reflux pump (standby)", "CDU", 260, 160, 400, 1.6, 9],
    ["P-103A", "Diesel product pump", "CDU", 180, 132, 400, 1.8, 11], ["P-103B", "Diesel product pump (standby)", "CDU", 180, 132, 400, 1.8, 11],
    ["P-201A", "Vacuum residue pump", "VDU", 150, 200, 6600, 0.6, 14], ["P-201B", "Vacuum residue pump (standby)", "VDU", 150, 200, 6600, 0.6, 14],
    ["P-301A", "HDT feed pump", "HDT", 170, 1200, 6600, 3, 72], ["P-301B", "HDT feed pump (standby)", "HDT", 170, 1200, 6600, 3, 72],
    ["P-801A", "Reformer feed pump", "REF", 90, 250, 6600, 2.5, 18], ["P-801B", "Reformer feed pump (standby)", "REF", 90, 250, 6600, 2.5, 18],
    ["P-871A", "FCC feed pump", "FCC", 170, 315, 6600, 2, 16], ["P-871B", "FCC feed pump (standby)", "FCC", 170, 315, 6600, 2, 16],
    ["P-601A", "Boiler feedwater pump", "BLR", 220, 630, 6600, 2.5, 55], ["P-601B", "Boiler feedwater pump (standby)", "BLR", 220, 630, 6600, 2.5, 55],
    ["P-701A", "Cooling water pump", "CW", 6000, 900, 6600, 0.4, 4.6], ["P-701B", "Cooling water pump", "CW", 6000, 900, 6600, 0.4, 4.6], ["P-701C", "Cooling water pump (standby)", "CW", 6000, 900, 6600, 0.4, 4.6],
    ["P-901A", "Product loading pump (gasoline)", "TANK", 400, 160, 400, 1.2, 8], ["P-901B", "Product loading pump (diesel)", "TANK", 400, 160, 400, 1.2, 8],
    ["P-1171A", "Firewater pump (electric)", "ENV", 1200, 450, 6600, 0.8, 11], ["P-1171B", "Firewater pump (diesel)", "ENV", 1200, 450, 0, 0.8, 11],
  ],
  // ---------- kompresor: id, layanan, area, tipe, rpm, laju desain Nm³/h, daya kW, P hisap/buang bar ----------
  kompresor: [
    ["K-301", "HDT recycle gas compressor", "HDT", "Centrifugal", 11200, 60000, 2800, 58, 68],
    ["K-302", "Hydrogen make-up compressor", "HDT", "Reciprocating", 375, 16000, 2200, 19, 70],
    ["K-801", "Reformer net gas compressor", "REF", "Centrifugal", 9600, 22000, 1800, 7, 22],
    ["K-871", "FCC wet gas compressor", "FCC", "Centrifugal", 7200, 30000, 6500, 0.6, 15],
    ["K-872", "FCC main air blower", "FCC", "Axial", 4800, 75000, 9000, 0, 2.6],
    ["K-1021A", "Instrument air compressor A", "UTIL", "Screw", 2980, 3000, 315, 0, 8],
    ["K-1021B", "Instrument air compressor B (standby)", "UTIL", "Screw", 2980, 3000, 315, 0, 8],
  ],

  // ---------- emisi & batas lingkungan (contoh, bisa diubah sesuai izin) ----------
  emisiBatas: { so2: 1200, nox: 1000, co: 1000, pm: 100 },     // mg/Nm³ (contoh – sesuaikan dengan izin lingkungan)
  efisiensiBoiler: 0.89,
  lhvFuelGas: 36.0,                   // MJ/Nm³

  // ---------- warna pipa (legenda bisa diubah di halaman 3D) ----------
  pipa: {
    crude: ["Crude oil", "#6b4226"], produk: ["Light products", "#eab308"], berat: ["Heavy oil / residue", "#27272a"],
    gas: ["Fuel gas / process gas", "#f97316"], h2: ["Hydrogen", "#d946ef"], lpg: ["LPG", "#fb7185"],
    uap: ["Steam", "#e5e7eb"], cw: ["Cooling water", "#16a34a"], air: ["Raw / treated water", "#0ea5e9"],
    n2: ["Nitrogen / instrument air", "#7dd3fc"], flare: ["Flare header", "#a8a29e"], api: ["Firewater", "#dc2626"],
  },
};

/* =========================================================
   DAFTAR TAG INSTRUMEN
   [tag, area, peralatan, deskripsi, satuan, desimal, LL, L, H, HH]
   Batas alarm: LL/HH = CRITICAL (merah) · L/H = WARNING (kuning)
   ========================================================= */
const TAGS = [];
(() => {
  const T = (...a) => TAGS.push(a), _ = null;
  // ---- CDU ----
  T("FT-101", "CDU", "P-101A", "Crude feed flow", "m³/h", 0, 250, 400, _, _);
  T("FQI-101", "CDU", "P-101A", "Total crude feed (totalizer)", "m³", 0, _, _, _, _);
  T("PT-101", "CDU", "P-101A", "Crude feed pressure", "bar", 1, 8, 12, _, _);
  T("TT-101", "CDU", "P-101A", "Crude feed temperature", "°C", 1, _, _, 45, 50);
  T("LT-102", "CDU", "D-102", "Desalter interface level", "%", 1, 20, 30, 65, 75);
  T("PT-102", "CDU", "D-102", "Desalter operating pressure", "bar", 1, _, _, 11, 12);
  T("TT-102", "CDU", "D-102", "Desalter operating temperature", "°C", 1, _, 115, 145, _);
  T("DPT-102", "CDU", "D-102", "Desalter differential pressure", "kPa", 1, _, _, 60, 75);
  T("AIT-102", "CDU", "D-102", "Desalter brine oil-in-water", "ppm", 0, _, _, 150, 300);
  T("FT-103", "CDU", "H-101", "Furnace fuel gas flow", "Nm³/h", 0, _, _, _, _);
  T("PT-103", "CDU", "H-101", "Furnace fuel gas pressure", "bar", 2, 1.0, 1.5, _, _);
  T("TT-103", "CDU", "H-101", "Furnace outlet temperature (COT)", "°C", 1, 330, 350, 370, 380);
  T("PT-104", "CDU", "H-101", "Furnace draft pressure", "Pa", 1, _, _, -5, 0);
  T("BMS-103", "CDU", "H-101", "Burner management status", "state", 0, _, _, _, _);
  T("PT-105", "CDU", "C-101", "Column top pressure", "barg", 2, _, _, 1.6, 1.9);
  T("PT-106", "CDU", "C-101", "Column bottom pressure", "barg", 2, _, _, _, _);
  T("DPT-105", "CDU", "C-101", "Column differential pressure", "kPa", 1, _, _, 28, 34);
  [["TT-105", "Column top"], ["TT-106", "Tray 6 – naphtha draw"], ["TT-107", "Tray 12 – kerosene draw"], ["TT-108", "Tray 18"], ["TT-109", "Tray 24 – diesel draw"], ["TT-110", "Tray 30"], ["TT-111", "Flash zone"], ["TT-112", "Column bottom"]]
    .forEach(([t, d], i) => T(t, "CDU", "C-101", "Temperature – " + d, "°C", 1, _, _, i === 0 ? 135 : i === 7 ? 358 : _, i === 0 ? 145 : i === 7 ? 365 : _));
  T("LT-105", "CDU", "D-101", "Reflux drum level", "%", 1, 15, 25, 75, 85);
  T("FT-105", "CDU", "P-102A", "Reflux flow", "m³/h", 0, _, 120, _, _);
  T("FT-106", "CDU", "P-103A", "Diesel product draw flow", "m³/h", 0, _, _, _, _);
  // ---- VDU ----
  T("PT-201", "VDU", "C-201", "Column top pressure (vacuum)", "mbar(a)", 1, _, _, 50, 70);
  T("TT-201", "VDU", "H-201", "Vacuum furnace outlet temperature", "°C", 1, _, 380, 415, 425);
  T("TT-202", "VDU", "C-201", "Column top temperature", "°C", 1, _, _, 90, 100);
  T("TT-203", "VDU", "C-201", "Column bottom temperature", "°C", 1, _, _, 372, 380);
  T("LT-201", "VDU", "C-201", "Column bottom level", "%", 1, 15, 25, 75, 85);
  T("FT-201", "VDU", "H-201", "VDU feed flow (atm. residue)", "m³/h", 0, _, _, _, _);
  T("FT-202", "VDU", "EJ-201", "Vacuum off-gas flow", "Nm³/h", 0, _, _, 600, 900);
  T("DPT-201", "VDU", "C-201", "Column differential pressure", "kPa", 2, _, _, 2.5, 3.2);
  T("VT-201", "VDU", "P-201A", "Residue pump vibration", "mm/s", 2, _, _, 7.1, 11);
  // ---- HYDROTREATER ----
  T("PT-301", "HDT", "R-301", "Reactor inlet pressure", "barg", 1, 50, 55, 66, 70);
  T("PT-302", "HDT", "R-301", "Reactor outlet pressure", "barg", 1, _, _, _, _);
  T("TT-301", "HDT", "R-301", "Reactor inlet temperature", "°C", 1, _, 320, 360, 370);
  T("TT-302", "HDT", "R-301", "Bed 1 outlet temperature", "°C", 1, _, _, 385, 395);
  T("TT-303", "HDT", "R-301", "Bed 2 inlet (after quench)", "°C", 1, _, _, 375, 385);
  T("TT-304", "HDT", "R-301", "Reactor outlet temperature", "°C", 1, _, _, 390, 400);
  T("DPT-301", "HDT", "R-301", "Reactor differential pressure", "kPa", 0, _, _, 400, 500);
  T("FT-301", "HDT", "P-301A", "Feed flow", "m³/h", 0, _, _, _, _);
  T("FT-302", "HDT", "K-302", "Make-up hydrogen flow", "Nm³/h", 0, _, _, _, _);
  T("FT-303", "HDT", "K-301", "Recycle gas flow", "Nm³/h", 0, 30000, 42000, _, _);
  T("LT-301", "HDT", "V-301", "HP separator level", "%", 1, 15, 25, 75, 85);
  T("AT-301", "HDT", "R-301", "Product sulfur (online analyzer)", "ppm", 1, _, _, 10, 15);
  T("VT-301", "HDT", "K-301", "Recycle compressor vibration", "mm/s", 2, _, _, 7.1, 11);
  // ---- CATALYTIC REFORMING ----
  T("FT-801", "REF", "P-801A", "Reformer feed flow", "m³/h", 0, _, _, _, _);
  [["TT-801", "R-801 inlet", 495, 515], ["TT-802", "R-801 outlet", _, _], ["TT-803", "R-802 inlet", 495, 515], ["TT-804", "R-802 outlet", _, _], ["TT-805", "R-803 inlet", 495, 515], ["TT-806", "R-803 outlet", _, _]]
    .forEach(([t, d, l, h]) => T(t, "REF", "R-" + d.slice(2, 5), "Temperature – " + d, "°C", 1, _, l, h, h ? h + 10 : _));
  T("PT-801", "REF", "R-801", "Reactor pressure", "barg", 2, _, _, 9.5, 10.5);
  T("DPT-801", "REF", "R-801", "Reactor train differential pressure", "kPa", 0, _, _, 120, 150);
  T("FT-802", "REF", "K-801", "Net hydrogen flow", "Nm³/h", 0, _, _, _, _);
  T("PT-802", "REF", "K-801", "Compressor discharge pressure", "barg", 1, 18, 20, 24, 25);
  T("LT-801", "REF", "V-801", "Separator level", "%", 1, 15, 25, 75, 85);
  T("AT-801", "REF", "V-801", "Reformate octane analyzer", "RON", 1, 95, 96, _, _);
  T("FT-803", "REF", "H-801", "Reformer furnace fuel gas", "Nm³/h", 0, _, _, _, _);
  // ---- FCC ----
  T("FT-874", "FCC", "P-871A", "FCC feed flow (VGO)", "m³/h", 0, _, _, _, _);
  T("TT-871", "FCC", "R-871", "Reactor (riser outlet) temperature", "°C", 1, 500, 510, 540, 550);
  T("TT-872", "FCC", "RG-871", "Regenerator dense bed temperature", "°C", 1, _, _, 730, 760);
  T("PT-871", "FCC", "R-871", "Reactor pressure", "barg", 2, _, _, 2.1, 2.3);
  T("PT-872", "FCC", "RG-871", "Regenerator pressure", "barg", 2, _, _, 2.5, 2.7);
  T("DPT-871", "FCC", "R-871", "Regen slide valve ΔP", "kPa", 1, 10, 20, _, _);
  T("FT-871", "FCC", "R-871", "Catalyst circulation rate", "t/min", 1, _, _, _, _);
  T("FT-872", "FCC", "K-872", "Regenerator air flow", "Nm³/h", 0, _, _, _, _);
  T("FT-873", "FCC", "RG-871", "Flue gas flow", "Nm³/h", 0, _, _, _, _);
  T("AT-871", "FCC", "RG-871", "Flue gas oxygen", "%", 2, 0.5, 1.0, 4, _);
  T("AT-872", "FCC", "RG-871", "Flue gas CO", "ppm", 0, _, _, 200, 500);
  T("VT-871", "FCC", "K-871", "Wet gas compressor vibration", "mm/s", 2, _, _, 7.1, 11);
  T("LT-873", "FCC", "C-873", "Main fractionator bottom level", "%", 1, 15, 25, 75, 85);
  T("TT-873", "FCC", "C-873", "Main fractionator bottom temperature", "°C", 1, _, _, 360, 370);
  // ---- BOILER & STEAM ----
  T("PT-601", "BLR", "SH-601", "Steam header pressure", "bar", 1, 36, 38, 45, 47);
  T("TT-601", "BLR", "SH-601", "Steam temperature", "°C", 1, _, 380, 420, 430);
  T("FT-601", "BLR", "SH-601", "Total steam flow", "t/h", 1, _, _, _, _);
  T("LT-601A", "BLR", "B-601A", "Boiler A steam drum level", "%", 1, 20, 35, 65, 80);
  T("LT-601B", "BLR", "B-601B", "Boiler B steam drum level", "%", 1, 20, 35, 65, 80);
  T("FT-602", "BLR", "P-601A", "Feedwater flow", "m³/h", 0, _, _, _, _);
  T("FT-603A", "BLR", "B-601A", "Boiler A fuel gas flow", "Nm³/h", 0, _, _, _, _);
  T("FT-603B", "BLR", "B-601B", "Boiler B fuel gas flow", "Nm³/h", 0, _, _, _, _);
  T("PT-602", "BLR", "P-601A", "Feedwater pressure", "bar", 1, 48, 50, _, _);
  T("TT-602", "BLR", "P-601A", "Feedwater temperature", "°C", 1, _, 120, _, _);
  T("AT-601", "BLR", "B-601A", "Boiler water conductivity", "µS/cm", 0, _, _, 150, 250);
  T("AT-602A", "BLR", "B-601A", "Boiler A flue gas O₂", "%", 2, 1.0, 1.8, 5, 6);
  T("AT-602B", "BLR", "B-601B", "Boiler B flue gas O₂", "%", 2, 1.0, 1.8, 5, 6);
  T("TT-603A", "BLR", "B-601A", "Boiler A stack temperature", "°C", 0, _, _, 200, 230);
  T("TT-603B", "BLR", "B-601B", "Boiler B stack temperature", "°C", 0, _, _, 200, 230);
  // ---- COOLING WATER ----
  T("FT-701", "CW", "P-701A", "Cooling water flow", "m³/h", 0, 6000, 8000, _, _);
  T("PT-701", "CW", "P-701A", "Pump discharge pressure", "bar", 2, 3.2, 3.8, _, _);
  T("TT-701", "CW", "CT-701", "Cooling water supply temperature", "°C", 1, _, _, 33, 35);
  T("TT-702", "CW", "CT-701", "Cooling water return temperature", "°C", 1, _, _, 45, 48);
  T("LT-701", "CW", "CT-701", "Cooling tower basin level", "%", 1, 50, 60, 90, _);
  T("AIT-701", "CW", "CT-701", "Circulating water conductivity", "µS/cm", 0, _, _, 2500, 3000);
  T("AIT-702", "CW", "CT-701", "Circulating water pH", "pH", 2, 6.8, 7.2, 8.6, 9);
  T("AIT-703", "CW", "CT-701", "Free chlorine residual", "ppm", 2, _, 0.2, 1.0, _);
  T("FT-703", "CW", "CT-701", "Make-up water flow", "m³/h", 0, _, _, _, _);
  T("FT-704", "CW", "CT-701", "Blowdown flow", "m³/h", 0, _, _, _, _);
  // ---- UTILITIES ----
  T("FT-1001", "UTIL", "WTP", "Raw water intake flow", "m³/h", 0, _, _, _, _);
  T("AIT-1001", "UTIL", "WTP", "Raw water turbidity", "NTU", 1, _, _, 80, 150);
  T("AIT-1002", "UTIL", "WTP", "Treated water turbidity", "NTU", 2, _, _, 1, 2);
  T("LT-1001", "UTIL", "WTP", "Treated water tank level", "%", 1, 20, 30, _, _);
  T("AIT-1003", "UTIL", "WTP", "Demin water conductivity", "µS/cm", 2, _, _, 1, 5);
  T("FT-1002", "UTIL", "WTP", "Demin water production", "m³/h", 0, _, _, _, _);
  T("FT-1011", "UTIL", "WWTP", "WWTP inflow", "m³/h", 0, _, _, 260, 320);
  T("LT-1011", "UTIL", "WWTP", "Equalization basin level", "%", 1, _, _, 80, 90);
  T("AIT-1011", "UTIL", "WWTP", "API separator outlet oil-in-water", "ppm", 0, _, _, 100, 200);
  T("AIT-1012", "UTIL", "WWTP", "Effluent oil & grease", "mg/L", 1, _, _, 15, 25);
  T("AIT-1013", "UTIL", "WWTP", "Effluent COD", "mg/L", 0, _, _, 120, 160);
  T("AIT-1014", "UTIL", "WWTP", "Effluent pH", "pH", 2, 6, 6.5, 8.5, 9);
  T("AIT-1015", "UTIL", "WWTP", "Effluent TSS", "mg/L", 0, _, _, 60, 80);
  T("PT-1021", "UTIL", "IA", "Instrument air header pressure", "barg", 2, 5, 6, _, _);
  T("AT-1021", "UTIL", "IA", "Instrument air dew point", "°C", 1, _, _, -30, -20);
  T("AT-1031", "UTIL", "N2", "Nitrogen purity", "%", 2, 99, 99.5, _, _);
  T("FT-1031", "UTIL", "N2", "Nitrogen flow", "Nm³/h", 0, _, _, _, _);
  T("PT-1031", "UTIL", "N2", "Nitrogen header pressure", "barg", 2, 5, 6, _, _);
  T("LT-1031", "UTIL", "N2", "Liquid nitrogen storage level", "%", 1, 15, 30, _, _);
  T("PT-1041", "UTIL", "FG", "Fuel gas header pressure", "barg", 2, 3, 3.5, 5.5, 6);
  T("FT-1041", "UTIL", "FG", "Total fuel gas consumption", "Nm³/h", 0, _, _, _, _);
  T("AT-1041", "UTIL", "FG", "Fuel gas H₂S content", "ppm", 0, _, _, 100, 160);
  T("PT-1051", "UTIL", "H2", "Hydrogen header pressure", "barg", 1, 16, 18, _, _);
  T("FT-1051", "UTIL", "H2", "SMR hydrogen production", "Nm³/h", 0, _, _, _, _);
  T("FT-1052", "UTIL", "H2", "Total hydrogen consumption", "Nm³/h", 0, _, _, _, _);
  T("AT-1051", "UTIL", "H2", "Hydrogen purity", "%", 2, 98.5, 99, _, _);
  T("FT-1061", "UTIL", "SRU", "SRU sulfur production", "t/h", 2, _, _, _, _);
  T("AT-1061", "UTIL", "SRU", "Sulfur recovery efficiency", "%", 2, 98.5, 99, _, _);
  // ---- FLARE ----
  T("FT-901", "FLR", "FL-901", "Flare gas flow", "Nm³/h", 0, _, _, 10000, 30000);
  T("PT-901", "FLR", "FL-901", "Flare header pressure", "barg", 2, _, _, 0.5, 1.0);
  T("LT-901", "FLR", "V-901", "Flare KO drum level", "%", 1, _, _, 50, 70);
  T("FT-902", "FLR", "FL-901", "Smokeless steam to flare", "t/h", 1, _, _, _, _);
  T("TE-901A", "FLR", "FL-901", "Pilot A flame temperature", "°C", 0, 200, 350, _, _);
  T("TE-901B", "FLR", "FL-901", "Pilot B flame temperature", "°C", 0, 200, 350, _, _);
  T("TE-901C", "FLR", "FL-901", "Pilot C flame temperature", "°C", 0, 200, 350, _, _);
  // ---- ENVIRONMENT & SAFETY ----
  const B = CONFIG.emisiBatas;
  [["FCC", "RG-871"], ["SRU", "SRU"], ["BLR", "B-601A"], ["CDU", "H-101"]].forEach(([s, eq], k) => {
    const n = 1101 + k * 10;
    T(`AT-${n}`, "ENV", eq, `CEMS ${s} stack – SO₂`, "mg/Nm³", 0, _, _, B.so2 * 0.85, B.so2);
    T(`AT-${n + 1}`, "ENV", eq, `CEMS ${s} stack – NOx`, "mg/Nm³", 0, _, _, B.nox * 0.85, B.nox);
    T(`AT-${n + 2}`, "ENV", eq, `CEMS ${s} stack – CO`, "mg/Nm³", 0, _, _, B.co * 0.85, B.co);
    T(`AT-${n + 3}`, "ENV", eq, `CEMS ${s} stack – particulate`, "mg/Nm³", 1, _, _, B.pm * 0.85, B.pm);
  });
  ["CDU", "VDU", "HDT", "REF", "FCC", "SRU", "TANK", "LOAD"].forEach((a, i) => T(`GD-${1141 + i}`, "ENV", "GD-" + a, `H₂S gas detector – ${a} area`, "ppm", 1, _, _, 10, 15));
  ["CDU", "FCC", "TANK", "LPG", "LOAD", "COMP"].forEach((a, i) => T(`GD-${1151 + i}`, "ENV", "GD-" + a, `Combustible gas detector – ${a} area`, "%LEL", 1, _, _, 20, 40));
  T("WS-1161", "ENV", "MET", "Wind speed", "m/s", 1, _, _, 15, 20);
  T("WD-1161", "ENV", "MET", "Wind direction (from)", "°", 0, _, _, _, _);
  T("TT-1161", "ENV", "MET", "Ambient temperature", "°C", 1, _, _, _, _);
  T("MT-1161", "ENV", "MET", "Relative humidity", "%", 0, _, _, _, _);
  T("PT-1171", "ENV", "FW", "Firewater ring main pressure", "barg", 1, 7, 8, _, _);
  T("LT-1171", "ENV", "FW", "Firewater tank level", "%", 1, 70, 80, _, _);
  // ---- ELECTRICAL ----
  T("EI-1201", "ELEC", "SUB", "Incoming grid voltage", "kV", 1, 135, 142, 158, 165);
  T("EI-1202", "ELEC", "SUB", "20 kV main bus voltage", "kV", 2, 18, 19, 21, 22);
  T("SI-1201", "ELEC", "SUB", "System frequency", "Hz", 2, 49.0, 49.5, 50.5, 51);
  T("JI-1201", "ELEC", "SUB", "Total refinery electrical load", "kW", 0, _, _, _, _);
  T("JI-1202", "ELEC", "STG-01", "Steam turbine generator output", "kW", 0, _, _, _, _);
  T("JI-1205", "ELEC", "SUB", "Grid import", "kW", 0, _, _, _, _);
  T("PF-1201", "ELEC", "SUB", "Power factor", "", 3, 0.8, 0.85, _, _);
  T("JI-1203", "ELEC", "TR-01", "Transformer TR-01 loading", "%", 1, _, _, 90, 110);
  T("JI-1204", "ELEC", "TR-02", "Transformer TR-02 loading", "%", 1, _, _, 90, 110);
  T("TT-1201", "ELEC", "TR-01", "TR-01 winding temperature", "°C", 1, _, _, 105, 120);
  T("TT-1202", "ELEC", "TR-02", "TR-02 winding temperature", "°C", 1, _, _, 105, 120);
  // ---- TANGKI (per tangki: LT, LIT, TT, PT, DPT, FIT in, FIT out, FQI, DT, AT) ----
  CONFIG.tangki.forEach((k, i) => {
    const n = 401 + i * 10, id = k[0], L = CONFIG.levelBatas, sph = k[6] === "SPH";
    T(`LT-${n}`, "TANK", id, `${id} radar level`, "%", 1, L.LL, L.L, L.H, L.HH);
    T(`LIT-${n}`, "TANK", id, `${id} level indication`, "m", 2, _, _, _, _);
    T(`TT-${n}`, "TANK", id, `${id} product temperature`, "°C", 1, _, _, k[9] + 15, k[9] + 25);
    T(`PT-${n}`, "TANK", id, `${id} tank pressure`, sph ? "barg" : "mbar", sph ? 2 : 1, _, _, sph ? 12 : 18, sph ? 14 : 22);
    if (k[6] === "CR") T(`DPT-${n}`, "TANK", id, `${id} level DP transmitter`, "kPa", 1, _, _, _, _);
    T(`FIT-${n}`, "TANK", id, `${id} inlet flow`, "m³/h", 0, _, _, _, _);
    T(`FIT-${n + 1}`, "TANK", id, `${id} outlet flow`, "m³/h", 0, _, _, _, _);
    T(`FQI-${n}`, "TANK", id, `${id} totalized transfer volume`, "m³", 0, _, _, _, _);
    if (k[2] !== "lpg") T(`DT-${n}`, "TANK", id, `${id} product density`, "kg/m³", 1, _, _, _, _);
    if (k[10]) T(`AT-${n}`, "TANK", id, `${id} quality analyzer – ${k[10][0]}`, k[10][1], k[10][3], _, _, _, _);
  });
})();
const TAG = {}; TAGS.forEach((t, i) => (TAG[t[0]] = { i, tag: t[0], area: t[1], eq: t[2], desk: t[3], unit: t[4], dec: t[5], LL: t[6], L: t[7], H: t[8], HH: t[9] }));

/* Nama area untuk tampilan */
const AREA = {
  CDU: "Crude Distillation Unit", VDU: "Vacuum Distillation Unit", HDT: "Hydrotreating Unit", REF: "Catalytic Reforming Unit", FCC: "Fluid Catalytic Cracking",
  SRU: "Sulfur Recovery Unit", H2: "Hydrogen Plant (SMR)", TANK: "Tank Farm & Terminal", BLR: "Boiler & Steam", CW: "Cooling Water", UTIL: "Utilities",
  FLR: "Flare System", ENV: "Environment & Safety", ELEC: "Electrical", ROT: "Pumps & Compressors",
};
