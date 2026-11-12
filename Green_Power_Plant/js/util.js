/* =========================================================
   UTIL.JS — fungsi bantu kecil yang dipakai semua file
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// Format angka gaya Indonesia: 1.234,5
function fmt(n, d = 0) {
  if (n == null || !isFinite(n)) return "–";
  return Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
}
const pad = (n) => String(n).padStart(2, "0");
const jamStr = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const tglStr = (t) => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const waktuStr = (t) => `${tglStr(t)} ${jamStr(t)}`;
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Satuan energi otomatis: kWh → MWh bila besar
function energi(kwh, d = 1) { return Math.abs(kwh) >= 10000 ? `${fmt(kwh / 1000, d)} MWh` : `${fmt(kwh, 0)} kWh`; }

// Isi teks elemen berdasarkan id (aman bila elemen belum ada)
function set(id, teks, kelas) {
  const el = document.getElementById(id); if (!el) return;
  if (el.textContent !== String(teks)) el.textContent = teks;
  if (kelas !== undefined) el.className = kelas;
}

// Notifikasi singkat di pojok layar
function toast(pesan) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = pesan;
  document.body.appendChild(t); setTimeout(() => t.classList.add("on"), 10);
  setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 3200);
}

// Unduh teks sebagai file
function unduh(namaFile, isi, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([isi], { type: mime }));
  a.download = namaFile; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Ekspor tabel (header + baris) ke CSV (pemisah ; dan desimal koma → cocok Excel Indonesia)
function eksporCSV(namaFile, header, baris) {
  const sel = (v) => (typeof v === "number" ? String(Math.round(v * 1000) / 1000).replace(".", ",") : `"${String(v).replace(/"/g, '""')}"`);
  const isi = [header.map(sel).join(";"), ...baris.map((r) => r.map(sel).join(";"))].join("\r\n");
  unduh(namaFile + ".csv", "﻿" + isi, "text/csv;charset=utf-8");
}
// Ekspor ke Excel (format XML Spreadsheet 2003 – angka tetap angka, bisa dibuka Excel)
function eksporExcel(namaFile, judul, header, baris) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sel = (v) => (typeof v === "number" ? `<Cell><Data ss:Type="Number">${Math.round(v * 1000) / 1000}</Data></Cell>` : `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`);
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#166534" ss:Pattern="Solid"/></Style><Style ss:ID="t"><Font ss:Bold="1" ss:Size="13"/></Style></Styles>
<Worksheet ss:Name="${esc(judul).slice(0, 30)}"><Table>
<Row><Cell ss:StyleID="t"><Data ss:Type="String">${esc(CONFIG.nama)} – ${esc(judul)} (SIMULATION)</Data></Cell></Row>
<Row><Cell><Data ss:Type="String">Dibuat: ${esc(waktuStr(Date.now()))}</Data></Cell></Row><Row></Row>
<Row>${header.map((h) => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("")}</Row>
${baris.map((r) => `<Row>${r.map(sel).join("")}</Row>`).join("\n")}
</Table></Worksheet></Workbook>`;
  unduh(namaFile + ".xls", xml, "application/vnd.ms-excel");
}
