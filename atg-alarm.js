/* =========================================================
   ATG-ALARM.JS — LOGIKA ALARM
   Tahap 1: mengevaluasi kondisi alarm & status tiap tangki.
   Tahap 2 nanti: halaman Alarm (riwayat, acknowledge, prioritas).
   ========================================================= */

const ATG_ALARM = {
  /* Kembalikan daftar alarm yang sedang aktif.
     prioritas: "CRITICAL" (merah) atau "WARNING" (kuning) */
  evaluasi() {
    const daftar = [], b = ATG_CONFIG.batas;
    const tambah = (tangki, kode, pesan, prioritas, nilai) => daftar.push({ id: `${tangki}.${kode}`, tangki, kode, pesan, prioritas, nilai });

    ATG_TANGKI.forEach((t) => {
      const s = ATG.data.tangki[t.id], sw = ATG.saklarLevel(t.id), suhuMaks = Math.max(...s.suhu);
      if (sw.LSHH) tambah(t.id, "LSHH", "High-High Level", "CRITICAL", s.level.toFixed(1) + " %");
      else if (sw.LSH) tambah(t.id, "LSH", "High Level", "WARNING", s.level.toFixed(1) + " %");
      if (sw.LSLL) tambah(t.id, "LSLL", "Low-Low Level", "CRITICAL", s.level.toFixed(1) + " %");
      else if (sw.LSL) tambah(t.id, "LSL", "Low Level", "WARNING", s.level.toFixed(1) + " %");
      if (suhuMaks >= b.TAHH) tambah(t.id, "TAHH", "High-High Temperature", "CRITICAL", suhuMaks.toFixed(1) + " °C");
      else if (suhuMaks >= b.TAH) tambah(t.id, "TAH", "High Temperature", "WARNING", suhuMaks.toFixed(1) + " °C");
      if (s.tekanan >= b.PAH) tambah(t.id, "PAH", "High Pressure", "WARNING", s.tekanan.toFixed(2) + " barG");
    });

    const k = ATG.data.tk101;
    if (k.gas >= b.GAS_ALARM) tambah("TK-101", "GD-101", "Gas Detector Alarm", "CRITICAL", k.gas.toFixed(1) + " %LEL");
    else if (k.gas >= b.GAS_WARN) tambah("TK-101", "GD-101", "Gas Detector Warning", "WARNING", k.gas.toFixed(1) + " %LEL");
    if (k.pompa.fault) tambah("TK-101", "P-101", "Pump Motor Fault", "CRITICAL", "FAULT");
    Object.entries(k.valve).forEach(([tag, v]) => v.fault && tambah("TK-101", tag, "Valve Fault", "CRITICAL", "FAULT"));
    return daftar;
  },

  // Status terburuk sebuah tangki: "ok" | "warn" | "crit"
  statusTangki(id, daftar) {
    const milik = daftar.filter((a) => a.tangki === id);
    if (milik.some((a) => a.prioritas === "CRITICAL")) return "crit";
    if (milik.length) return "warn";
    return "ok";
  },
};
