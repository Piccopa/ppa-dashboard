/* =========================================================
   DATASOURCE.JS — PINTU MASUK DATA (persiapan integrasi nyata)
   Saat ini: CONFIG.sumberData = "SIMULATION" → semua nilai dari js/sim.js.

   Rencana integrasi (contoh arsitektur):
     Transmitter lapangan / analyzer / CEMS / tank gauging (radar)
        ── HART / 4-20 mA ──► DCS / PLC / RTU
        ── Modbus TCP / OPC UA ──► Gateway / historian / Node-RED
        ── REST API atau WebSocket (JSON) ──► server XAMPP (PHP) / Node
        ── fetch() dari browser ──► DataSource.baca()
   Nilai nyata cukup dipetakan ke tag yang sama (lihat daftar TAGS di config.js),
   misalnya { "FT-101": 598.2, "TT-103": 359.8, ... } lalu ditulis ke SIM.S.x.
   ========================================================= */
const DataSource = {
  mode: CONFIG.sumberData,
  // Contoh peta tag → sumber (ISI SESUAI SISTEM ANDA; belum dipakai)
  peta: {
    "FT-101": { sistem: "DCS CDU (OPC UA)", node: "ns=2;s=CDU.FT101.PV", satuan: "m³/h" },
    "TT-103": { sistem: "DCS CDU (OPC UA)", node: "ns=2;s=CDU.TT103.PV", satuan: "°C" },
    "LT-401": { sistem: "Tank gauging (Modbus TCP)", fungsi: 3, register: 40001, skala: 0.01, satuan: "%" },
    "AT-1101": { sistem: "CEMS FCC stack (Modbus TCP)", fungsi: 4, register: 30010, skala: 1, satuan: "mg/Nm³" },
  },
  async baca() {
    if (this.mode === "SIMULATION") return SIM.V;
    // Contoh nanti:  const r = await fetch("api/realtime.php"); const d = await r.json();
    //                for (const t in d) if (TAG[t]) SIM.S.x[TAG[t].i] = d[t];
    throw new Error("Sumber data " + this.mode + " belum dikonfigurasi");
  },
};
