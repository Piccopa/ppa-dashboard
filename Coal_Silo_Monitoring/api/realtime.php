<?php
/* =========================================================
   CONTOH GATEWAY JSON untuk XAMPP (http://localhost/Coal_Silo_Monitoring/api/realtime.php)
   Saat ini mengembalikan DATA CONTOH (SIMULATION).
   Nanti: ganti bagian "DATA CONTOH" dengan query ke MySQL yang diisi oleh
   SCADA / Node-RED dari Haiwell PLC (Modbus TCP/RTU, OPC UA atau MQTT).
   ========================================================= */
header('Content-Type: application/json');
header('Cache-Control: no-store');

/* ---- contoh koneksi database (aktifkan bila tabel sudah ada) ----
$db = new mysqli('localhost', 'root', '', 'coal_silo');
$q  = $db->query("SELECT * FROM realtime ORDER BY ts DESC LIMIT 4");
------------------------------------------------------------------- */

// DATA CONTOH (SIMULATION) – berat 623,2 t dari kapasitas 800 t = 77,9 %
$data = [
  'timestamp' => date('c'),
  'source'    => 'SIMULATION',
  'silos'     => [
    'SILO-01' => ['LVL_PCT' => 77.9, 'WEIGHT' => 623.2, 'VOLUME' => 779.0, 'TT1' => 36.8, 'TT2' => 38.4, 'TT3' => 40.3, 'TT4' => 41.0],
    'SILO-02' => ['LVL_PCT' => 51.5, 'WEIGHT' => 412.0, 'VOLUME' => 515.0, 'TT1' => 35.2, 'TT2' => 36.9, 'TT3' => 38.1, 'TT4' => 39.0],
    'SILO-03' => ['LVL_PCT' => 88.2, 'WEIGHT' => 705.5, 'VOLUME' => 881.9, 'TT1' => 37.4, 'TT2' => 39.2, 'TT3' => 41.5, 'TT4' => 42.2],
    'SILO-04' => ['LVL_PCT' => 33.5, 'WEIGHT' => 268.0, 'VOLUME' => 335.0, 'TT1' => 34.6, 'TT2' => 35.8, 'TT3' => 36.9, 'TT4' => 37.5],
  ],
];
echo json_encode($data, JSON_PRETTY_PRINT);
