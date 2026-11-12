/* =========================================================
   DATASOURCE.JS — PINTU MASUK DATA (persiapan integrasi nyata)
   Saat ini: CONFIG.sumberData = "SIMULATION" → semua nilai dari js/sim.js.

   Rencana integrasi (contoh arsitektur):
     Peralatan lapangan (inverter, smart meter, BMS, genset controller, PLC)
        ── Modbus RTU (RS-485) / Modbus TCP ──► Gateway / PLC / Node-RED
        ── REST API atau WebSocket (JSON) ───► server XAMPP (PHP) / Node
        ── fetch() dari browser ─────────────► DataSource.baca()
   Lalu nilai nyata dipetakan ke struktur yang sama dengan SIM.V (pvAC, bess.soc, dg.p, ...).
   ========================================================= */
const DataSource = {
  mode: CONFIG.sumberData,
  // Contoh peta tag → register Modbus (ISI SESUAI PERALATAN ANDA; belum dipakai)
  petaModbus: {
    "SI-101": { alat: "Weather station", fungsi: 4, register: 30001, skala: 1, satuan: "W/m²" },
    "INV-01.P": { alat: "Inverter 1 (SunSpec)", fungsi: 3, register: 40084, skala: 0.1, satuan: "kW" },
    "BESS.SOC": { alat: "BMS", fungsi: 3, register: 40100, skala: 0.1, satuan: "%" },
    "LIT-301": { alat: "Genset controller / PLC", fungsi: 3, register: 40200, skala: 0.1, satuan: "%" },
  },
  // Dipanggil oleh aplikasi; untuk sekarang hanya mengembalikan data simulasi.
  async baca() {
    if (this.mode === "SIMULATION") return SIM.V;
    // Contoh nanti:  const r = await fetch("api/realtime.php"); return await r.json();
    throw new Error("Sumber data " + this.mode + " belum dikonfigurasi");
  },
};
