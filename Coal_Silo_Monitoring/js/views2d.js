/* =========================================================
   VIEWS2D.JS — 2D TOPOGRAPHIC MAP · CROSS SECTION · HEATMAP
   Semua digambar di <canvas> dari grid permukaan (SIM.Z) yang sama
   dengan tampilan 3D, sehingga angka & warna selalu konsisten.
   Utara (N) = atas peta. Warna: biru (rendah) → merah (tinggi).
   ========================================================= */
const PETA2D = (() => {
  const G = CONFIG.geo, R = G.R, N = KONTUR.N;
  const off = document.createElement("canvas"); off.width = off.height = N;
  function siap(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 600, h = cv.clientHeight || 420;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); return { c, w, h };
  }
  const huruf = (c, ukuran, tebal = 600) => (c.font = `${tebal} ${ukuran}px Inter, Arial, sans-serif`);
  function kotakTeks(c, t, x, y, bg, fg = "#fff") { huruf(c, 11, 700); const w = c.measureText(t).width + 10; c.fillStyle = bg; c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - 9, w, 18, 4) : c.rect(x - w / 2, y - 9, w, 18); c.fill(); c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(t, x, y + 0.5); }

  /* ---------------- TOPOGRAPHIC ---------------- */
  function topo(cv, i, opsi = {}) {
    const Z = SIM.Z[i], st = SIM.ST[i]; if (!st) return;
    const { c, w, h } = siap(cv), sk = (Math.min(w, h) / 2 - 34) / R, cx = w / 2, cy = h / 2 + 4;
    const px = (x) => cx + x * sk, py = (y) => cy - y * sk, rg = Math.max(0.05, st.max - st.min);
    // warna isi (gambar grid kecil lalu diperbesar halus)
    const oc = off.getContext("2d"), img = oc.createImageData(N, N);
    for (let k = 0; k < N * N; k++) { const j = Math.floor(k / N), ii = k % N, kk = (N - 1 - j) * N + ii; const z = Z[k]; const col = Number.isNaN(z) ? [0, 0, 0] : KONTUR.warna((z - st.min) / rg); img.data.set([col[0], col[1], col[2], Number.isNaN(z) ? 0 : 255], kk * 4); }
    oc.putImageData(img, 0, 0);
    c.save(); c.beginPath(); c.arc(cx, cy, R * sk, 0, Math.PI * 2); c.clip();
    c.imageSmoothingEnabled = true; c.drawImage(off, cx - R * sk - (R * sk) / (N - 1), cy - R * sk - (R * sk) / (N - 1), 2 * R * sk * (N / (N - 1)), 2 * R * sk * (N / (N - 1)));
    // garis kontur
    const nLv = opsi.garis ?? 10;
    for (let q = 1; q < nLv; q++) {
      const L = st.min + (rg * q) / nLv, tebal = q % 2 === 0;
      c.strokeStyle = tebal ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.4)"; c.lineWidth = tebal ? 1.4 : 0.8; c.beginPath();
      const seg = KONTUR.isoline(Z, L); seg.forEach(([x1, y1, x2, y2]) => { c.moveTo(px(x1), py(y1)); c.lineTo(px(x2), py(y2)); }); c.stroke();
      if (tebal && seg.length > 4) { const s = seg[Math.floor(seg.length / 2)]; huruf(c, 9.5, 700); c.fillStyle = "rgba(0,0,0,.55)"; const t = fmt(L, 2); const tw = c.measureText(t).width; c.fillRect(px(s[0]) - tw / 2 - 2, py(s[1]) - 7, tw + 4, 13); c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(t, px(s[0]), py(s[1])); }
    }
    c.restore();
    // dinding silo, grid sumbu, outlet
    c.strokeStyle = "#22d3ee"; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, R * sk, 0, Math.PI * 2); c.stroke();
    c.setLineDash([3, 4]); c.strokeStyle = "rgba(148,163,184,.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - R * sk, cy); c.lineTo(cx + R * sk, cy); c.moveTo(cx, cy - R * sk); c.lineTo(cx, cy + R * sk); c.stroke();
    c.beginPath(); c.arc(cx, cy, G.r0 * sk, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    // posisi instrumen
    const ikon = (r, d, t, w2) => { const [x, y] = SIM.pol(r, d); c.fillStyle = w2; c.strokeStyle = "#0b1527"; c.lineWidth = 2; c.beginPath(); c.arc(px(x), py(y), 7, 0, 7); c.fill(); c.stroke(); huruf(c, 9, 800); c.fillStyle = "#0b1527"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(t, px(x), py(y) + 0.5); };
    if (opsi.instrumen !== false) { ikon(CONFIG.posRadar.r, CONFIG.posRadar.sudut, "R", "#93c5fd"); ikon(0.001, 0, "S", "#67e8f9"); ikon(CONFIG.posInlet.r, CONFIG.posInlet.sudut, "I", "#fde68a"); ikon(CONFIG.posTT.r, CONFIG.posTT.sudut, "T", "#fdba74"); }
    // max / min
    const tanda = (p, z, warna, t, atas) => { const x = px(p[0]), y = py(p[1]); c.fillStyle = warna; c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); if (atas) { c.moveTo(x, y - 8); c.lineTo(x - 7, y + 5); c.lineTo(x + 7, y + 5); } else { c.moveTo(x, y + 8); c.lineTo(x - 7, y - 5); c.lineTo(x + 7, y - 5); } c.closePath(); c.fill(); c.stroke(); kotakTeks(c, `${t} ${fmt(z, 2)} m`, x, y + (atas ? -19 : 19), warna); };
    tanda(st.posMax, st.max, "#dc2626", "MAX", true); tanda(st.posMin, st.min, "#2563eb", "MIN", false);
    // kompas & skala
    huruf(c, 12, 800); c.fillStyle = "#e2e8f0"; c.textAlign = "center"; c.textBaseline = "middle";
    [["N", 0, -1], ["E", 1, 0], ["S", 0, 1], ["W", -1, 0]].forEach(([t, dx, dy]) => c.fillText(t, cx + dx * (R * sk + 16), cy + dy * (R * sk + 16)));
    c.fillStyle = "#22d3ee"; c.beginPath(); c.moveTo(w - 30, 18); c.lineTo(w - 37, 38); c.lineTo(w - 30, 33); c.lineTo(w - 23, 38); c.closePath(); c.fill(); huruf(c, 10, 800); c.fillText("N", w - 30, 46);
    c.strokeStyle = "#cbd5e1"; c.lineWidth = 2; c.beginPath(); c.moveTo(14, h - 16); c.lineTo(14 + sk, h - 16); c.moveTo(14, h - 20); c.lineTo(14, h - 12); c.moveTo(14 + sk, h - 20); c.lineTo(14 + sk, h - 12); c.stroke(); huruf(c, 10, 600); c.fillStyle = "#cbd5e1"; c.textAlign = "left"; c.fillText("1 m", 20 + sk, h - 16);
    huruf(c, 10, 600); c.fillStyle = "#94a3b8"; c.textAlign = "left"; c.fillText(`Ø ${fmt(G.D, 1)} m · kontur tiap ${fmt(rg / nLv, 2)} m`, 12, 16);
  }

  /* ---------------- CROSS SECTION ---------------- */
  function potong(cv, i, sudut = 0) {
    const Z = SIM.Z[i], st = SIM.ST[i]; if (!st) return;
    const { c, w, h } = siap(cv), v = SIM.S.silo[i].v;
    const arah = SIM.pol(1, sudut), titik = []; for (let k = 0; k <= 120; k++) { const t = -R + (2 * R * k) / 120; titik.push([t, KONTUR.sampel(Z, arah[0] * t, arah[1] * t)]); }
    // ---- kiri: penampang penuh silo (skematik) ----
    const lw = Math.min(230, w * 0.3), Ht = G.Hshell + G.roof, skH = (h - 50) / Ht, skW = Math.min(skH, (lw - 40) / G.D), x0 = 20 + lw / 2, y0 = h - 22;
    const X = (x) => x0 + x * skW, Y = (z) => y0 - z * skH;
    c.fillStyle = "#18202c"; c.beginPath(); c.moveTo(X(-G.r0), Y(0)); c.lineTo(X(-R), Y(G.Hh)); c.lineTo(X(-R), Y(G.Hshell)); c.lineTo(X(0), Y(Ht)); c.lineTo(X(R), Y(G.Hshell)); c.lineTo(X(R), Y(G.Hh)); c.lineTo(X(G.r0), Y(0)); c.closePath(); c.fill();
    const grd = c.createLinearGradient(0, Y(st.max), 0, Y(0)); grd.addColorStop(0, "#3a3d45"); grd.addColorStop(1, "#141518");
    c.fillStyle = grd; c.beginPath(); c.moveTo(X(-G.r0), Y(0)); c.lineTo(X(-R), Y(G.Hh)); titik.forEach(([t, z]) => c.lineTo(X(t), Y(z))); c.lineTo(X(R), Y(G.Hh)); c.lineTo(X(G.r0), Y(0)); c.closePath(); c.fill();
    c.strokeStyle = "#22d3ee"; c.lineWidth = 2; c.beginPath(); titik.forEach(([t, z], k) => (k ? c.lineTo(X(t), Y(z)) : c.moveTo(X(t), Y(z)))); c.stroke();
    c.strokeStyle = "#94a3b8"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(-G.r0), Y(0)); c.lineTo(X(-R), Y(G.Hh)); c.lineTo(X(-R), Y(G.Hshell)); c.lineTo(X(0), Y(Ht)); c.lineTo(X(R), Y(G.Hshell)); c.lineTo(X(R), Y(G.Hh)); c.lineTo(X(G.r0), Y(0)); c.stroke();
    // garis batas level
    const garisL = (z, t, w2) => { c.setLineDash([4, 3]); c.strokeStyle = w2; c.lineWidth = 1; c.beginPath(); c.moveTo(X(-R) - 6, Y(z)); c.lineTo(X(R) + 6, Y(z)); c.stroke(); c.setLineDash([]); huruf(c, 9, 700); c.fillStyle = w2; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(t, X(R) + 9, Y(z)); };
    garisL(G.Hfill, "100 %", "#ef4444"); garisL(CONFIG.tinggiLSH, "LSH", "#c084fc"); garisL(G.Hh, "HOPPER", "#64748b"); garisL(CONFIG.tinggiLSL, "LSL", "#c084fc");
    huruf(c, 11, 800); c.fillStyle = "#e2e8f0"; c.textAlign = "center"; c.fillText(`${CONFIG.silo[i][0]} · ${fmt(v.pct, 1)} %`, x0, 14);
    // ---- kanan: profil permukaan diperbesar ----
    const ax = lw + 70, aw = w - ax - 24, ay = 30, ah = h - 74;
    const zLo = Math.floor((st.min - 0.6) * 2) / 2, zHi = Math.ceil((st.max + 0.6) * 2) / 2;
    const PX = (t) => ax + ((t + R) / (2 * R)) * aw, PY = (z) => ay + ah - ((z - zLo) / (zHi - zLo)) * ah;
    c.strokeStyle = "rgba(148,163,184,.15)"; c.lineWidth = 1; huruf(c, 10, 500); c.fillStyle = "#94a3b8"; c.textAlign = "right"; c.textBaseline = "middle";
    for (let z = zLo; z <= zHi + 1e-6; z += 0.5) { c.beginPath(); c.moveTo(ax, PY(z)); c.lineTo(ax + aw, PY(z)); c.stroke(); c.fillText(fmt(z, 1) + " m", ax - 6, PY(z)); }
    c.textAlign = "center"; c.textBaseline = "top";
    for (let t = -3; t <= 3; t++) { c.beginPath(); c.moveTo(PX(t), ay); c.lineTo(PX(t), ay + ah); c.stroke(); c.fillText(`${t > 0 ? "+" : ""}${t} m`, PX(t), ay + ah + 6); }
    const lbl = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"], da = Math.round(((sudut % 360) + 360) % 360 / 45) % 8, db = (da + 4) % 8;
    huruf(c, 11, 800); c.fillStyle = "#22d3ee"; c.fillText(`◄ ${lbl[db]} wall`, ax + 30, ay + ah + 22); c.fillText(`${lbl[da]} wall ►`, ax + aw - 30, ay + ah + 22);
    // isi dengan warna kontur per kolom
    const rg = Math.max(0.05, st.max - st.min);
    for (let k = 0; k < titik.length - 1; k++) { const [t1, z1] = titik[k], [t2, z2] = titik[k + 1]; c.fillStyle = KONTUR.css(((z1 + z2) / 2 - st.min) / rg); c.beginPath(); c.moveTo(PX(t1), PY(z1)); c.lineTo(PX(t2), PY(z2)); c.lineTo(PX(t2), ay + ah); c.lineTo(PX(t1), ay + ah); c.closePath(); c.fill(); }
    c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); titik.forEach(([t, z], k) => (k ? c.lineTo(PX(t), PY(z)) : c.moveTo(PX(t), PY(z)))); c.stroke();
    // rata-rata & ekstrem pada garis potong
    c.setLineDash([6, 4]); c.strokeStyle = "#facc15"; c.beginPath(); c.moveTo(ax, PY(st.avg)); c.lineTo(ax + aw, PY(st.avg)); c.stroke(); c.setLineDash([]);
    kotakTeks(c, `AVG ${fmt(st.avg, 2)} m`, ax + aw - 52, PY(st.avg) - 12, "#a16207");
    let kMax = 0, kMin = 0; titik.forEach(([, z], k) => { if (z > titik[kMax][1]) kMax = k; if (z < titik[kMin][1]) kMin = k; });
    kotakTeks(c, `▲ ${fmt(titik[kMax][1], 2)} m`, PX(titik[kMax][0]), PY(titik[kMax][1]) - 14, "#dc2626");
    kotakTeks(c, `▼ ${fmt(titik[kMin][1], 2)} m`, PX(titik[kMin][0]), Math.min(ay + ah - 12, PY(titik[kMin][1]) + 16), "#2563eb");
    huruf(c, 11, 700); c.fillStyle = "#e2e8f0"; c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillText(`Surface profile along ${fmt(sudut, 0)}° – ${fmt((sudut + 180) % 360, 0)}° (height from hopper outlet)`, ax, 16);
    // garis potong pada mini peta
    return { kMax: titik[kMax], kMin: titik[kMin] };
  }

  /* ---------------- HEATMAP (sel 0,5 m) ---------------- */
  function heat(cv, i) {
    const Z = SIM.Z[i], st = SIM.ST[i]; if (!st) return;
    const { c, w, h } = siap(cv), n = 14, sel = (2 * R) / n, sk = Math.min(w - 70, h - 50) / (2 * R), ox = (w - 2 * R * sk) / 2 + 10, oy = 26, rg = Math.max(0.05, st.max - st.min);
    huruf(c, 9.5, 600); c.textAlign = "center"; c.textBaseline = "middle";
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      const x = -R + (a + 0.5) * sel, y = R - (b + 0.5) * sel; if (Math.hypot(x, y) > R - 0.08) continue;
      let s = 0, m = 0; for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) { const xx = x + (u - 1) * sel * 0.33, yy = y + (v - 1) * sel * 0.33; if (Math.hypot(xx, yy) < R) { s += KONTUR.sampel(Z, xx, yy); m++; } }
      const z = s / m, t = (z - st.min) / rg, X = ox + a * sel * sk, Y = oy + b * sel * sk;
      c.fillStyle = KONTUR.css(t); c.fillRect(X + 1, Y + 1, sel * sk - 2, sel * sk - 2);
      if (sel * sk > 30) { c.fillStyle = t > 0.3 && t < 0.75 ? "#0b1527" : "#fff"; c.fillText(fmt(z, 2), X + (sel * sk) / 2, Y + (sel * sk) / 2); }
    }
    c.strokeStyle = "#22d3ee"; c.lineWidth = 2; c.beginPath(); c.arc(ox + R * sk, oy + R * sk, R * sk, 0, 7); c.stroke();
    huruf(c, 10, 700); c.fillStyle = "#94a3b8";
    for (let a = 0; a < n; a++) c.fillText(String.fromCharCode(65 + a), ox + (a + 0.5) * sel * sk, oy - 10);
    for (let b = 0; b < n; b++) c.fillText(b + 1, ox - 12, oy + (b + 0.5) * sel * sk);
    c.textAlign = "left"; c.fillText(`Sel ${fmt(sel, 2)} × ${fmt(sel, 2)} m · nilai = tinggi rata-rata sel (m)`, 10, h - 10);
    huruf(c, 12, 800); c.fillStyle = "#e2e8f0"; c.textAlign = "center"; c.fillText("N ▲", ox + R * sk, h - 26 > oy + 2 * R * sk + 20 ? oy + 2 * R * sk + 18 : h - 26);
  }

  /* ---------------- MINI TOPO (dashboard / thumbnail ringan) ---------------- */
  function mini(cv, i) { topo(cv, i, { garis: 6, instrumen: false }); }

  return { topo, potong, heat, mini };
})();
