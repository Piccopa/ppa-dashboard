/* =========================================================
   SURFACE.JS — 3D MATERIAL LEVEL CONTOUR ENGINE
   Permukaan batu bara direpresentasikan sebagai grid tinggi (N×N) di dalam
   lingkaran silo. Sumber data:
     • SIMULATION  : bentuk permukaan dari model (kerucut pengisian, kawah
                     discharge funnel-flow, kemiringan, gundukan, bongkahan)
     • POINT CLOUD : hasil impor data 3D scanner (x,y,z) → interpolasi IDW
   Volume dihitung dengan integrasi kolom material di atas dinding hopper,
   sehingga level, volume, dan berat selalu konsisten.
   ========================================================= */
const KONTUR = (() => {
  const g = CONFIG.geo, N = 41, R = g.R, dx = (2 * R) / (N - 1), luas = dx * dx;
  const X = new Float32Array(N * N), Y = new Float32Array(N * N), RR = new Float32Array(N * N), F = new Float32Array(N * N), IN = new Uint8Array(N * N);
  const lantai = (r) => (r <= g.r0 ? 0 : r >= R ? g.Hh : (g.Hh * (r - g.r0)) / (R - g.r0));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, x = -R + i * dx, y = -R + j * dx, r = Math.hypot(x, y);
    X[k] = x; Y[k] = y; RR[k] = r; IN[k] = r <= R ? 1 : 0; F[k] = lantai(Math.min(r, R));
  }
  // faktor kalibrasi diskretisasi (grid vs rumus eksak) pada level penuh
  let vGrid = 0; for (let k = 0; k < N * N; k++) if (IN[k]) vGrid += (g.Hfill - F[k]) * luas;
  const kVol = g.Vkerja / vGrid;

  /* noise halus deterministik (tekstur bongkahan/gundukan kecil) */
  const noise = (x, y, s) => 0.5 * Math.sin(x * 2.7 + s) * Math.cos(y * 3.1 - s * 0.7) + 0.3 * Math.sin((x + y) * 5.3 + s * 1.9) + 0.2 * Math.cos((x - y) * 7.1 - s);

  /* bentuk relatif permukaan dari parameter model */
  function bentuk(p, x, y) {
    const di = Math.hypot(x - p.ix, y - p.iy);
    const kerucut = p.a * (1 - di / (R + p.ir));
    const r = Math.hypot(x, y), q = r / 2.4;
    const kawah = p.b * Math.max(0, 1 - q * q);
    let gund = 0;
    for (const b of p.bumps) { const ex = x - b.x, ey = y - b.y; gund += b.amp * Math.exp(-(ex * ex + ey * ey) / (2 * b.s * b.s)); }
    return kerucut - kawah + p.tx * x + p.ty * y + gund + 0.04 * noise(x, y, p.seed);
  }
  const S = new Float32Array(N * N);
  function volumeDari(Z) { let v = 0; for (let k = 0; k < N * N; k++) if (IN[k]) v += Math.max(0, Z[k] - F[k]) * luas; return v * kVol; }

  /* cari permukaan yang volumenya = vol (bisection pada tinggi dasar) */
  function hitung(p, vol, Z) {
    for (let k = 0; k < N * N; k++) S[k] = IN[k] ? bentuk(p, X[k], Y[k]) : 0;
    const top = g.Hshell;
    const f = (base) => { let v = 0; for (let k = 0; k < N * N; k++) if (IN[k]) { const h = base + S[k]; if (h > F[k]) v += Math.min(h, top) - F[k]; } return v * luas * kVol; };
    let lo = -6, hi = top + 6;
    for (let it = 0; it < 32; it++) { const m = (lo + hi) / 2; if (f(m) < vol) lo = m; else hi = m; }
    const base = (lo + hi) / 2;
    Z = Z || new Float32Array(N * N);
    for (let k = 0; k < N * N; k++) Z[k] = IN[k] ? Math.max(F[k], Math.min(top, base + S[k])) : NaN;
    return Z;
  }

  /* statistik permukaan untuk panel Contour Information */
  function statistik(Z) {
    let mx = -1e9, mn = 1e9, kx = -1, kn = -1, jum = 0, n = 0, sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
    const kuad = [0, 0, 0, 0], pita = [0, 0, 0, 0, 0, 0];
    let vol = 0, cmx = 0, cmy = 0;
    for (let k = 0; k < N * N; k++) {
      if (!IN[k]) continue;
      const kol = Z[k] - F[k];
      vol += kol; cmx += kol * X[k]; cmy += kol * Y[k];
      if (kol < 0.02 && F[k] > 0.01) continue;                // dinding hopper tanpa material di atasnya
      const z = Z[k];
      if (z > mx) { mx = z; kx = k; } if (z < mn) { mn = z; kn = k; }
      jum += z; n++;
      const x = X[k], y = Y[k];
      sx += x; sy += y; sz += z; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z;
      kuad[(y < 0 ? 2 : 0) + (x < 0 ? 1 : 0)] += kol;
    }
    if (!n) return null;
    // bidang regresi z = c + a·x + b·y → kemiringan permukaan
    const mxx = sxx / n - (sx / n) ** 2, myy = syy / n - (sy / n) ** 2, mxy = sxy / n - (sx / n) * (sy / n), mxz = sxz / n - (sx / n) * (sz / n), myz = syz / n - (sy / n) * (sz / n);
    const det = mxx * myy - mxy * mxy || 1e-9, a = (mxz * myy - myz * mxy) / det, b = (myz * mxx - mxz * mxy) / det;
    const sudut = (Math.atan(Math.hypot(a, b)) * 180) / Math.PI;
    const arah = ((Math.atan2(a, b) * 180) / Math.PI + 360) % 360;   // arah naik (0° = utara/+y)
    const rentang = Math.max(0.001, mx - mn);
    for (let k = 0; k < N * N; k++) { if (!IN[k]) continue; const kol = Z[k] - F[k]; if (kol < 0.02 && F[k] > 0.01) continue; pita[Math.min(5, Math.floor(((Z[k] - mn) / rentang) * 6))]++; }
    const totalKol = kuad.reduce((s, v) => s + v, 0) || 1;
    const avg = jum / n;
    // klasifikasi profil
    let r0 = 0, nr0 = 0, rw = 0, nrw = 0; for (let k = 0; k < N * N; k++) { if (!IN[k] || Z[k] - F[k] < 0.02) continue; if (RR[k] < 1.2) { r0 += Z[k]; nr0++; } else if (RR[k] > R - 0.8) { rw += Z[k]; nrw++; } }
    const tengah = (nr0 ? r0 / nr0 : avg) - (nrw ? rw / nrw : avg);
    let profil = "Levelled / flat surface";
    if (tengah > 0.45) profil = "Central cone – filling heap"; else if (tengah < -0.45) profil = "Central crater – funnel-flow discharge";
    if (sudut > 4 && Math.abs(tengah) < 0.8) profil = "Inclined surface (" + mataAngin(arah) + " high side)";
    if (rentang > 2.2 && Math.abs(tengah) < 0.45) profil = "Irregular / multiple heaps";
    return {
      max: mx, min: mn, avg, rentang, sudut, arah, kx, kn, posMax: [X[kx], Y[kx]], posMin: [X[kn], Y[kn]],
      vol: vol * luas * kVol, cm: [cmx / (vol || 1), cmy / (vol || 1)], pita: pita.map((v) => (v / n) * 100),
      kuadran: { NE: (kuad[0] / totalKol) * 100, NW: (kuad[1] / totalKol) * 100, SE: (kuad[2] / totalKol) * 100, SW: (kuad[3] / totalKol) * 100 }, profil, n,
    };
  }
  const mataAngin = (d) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8];

  /* ambil tinggi di titik sembarang (bilinear) */
  function sampel(Z, x, y) {
    const fi = Math.max(0, Math.min(N - 1.001, (x + R) / dx)), fj = Math.max(0, Math.min(N - 1.001, (y + R) / dx));
    const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
    const ambil = (a, b) => { const k = b * N + a; return Number.isNaN(Z[k]) ? null : Z[k]; };
    const vals = [[ambil(i, j), (1 - u) * (1 - v)], [ambil(i + 1, j), u * (1 - v)], [ambil(i, j + 1), (1 - u) * v], [ambil(i + 1, j + 1), u * v]];
    let s = 0, w = 0; for (const [z, ww] of vals) if (z !== null) { s += z * ww; w += ww; }
    if (w > 0) return s / w;
    // di luar grid lingkaran → pakai sel terdekat di dalam
    const r = Math.hypot(x, y), k = R - 0.05; return r > 0 ? sampel(Z, (x / r) * k, (y / r) * k) : 0;
  }

  /* gradasi warna kontur: biru (terendah) → cyan → hijau → kuning → oranye → merah (tertinggi) */
  const STOP = [[0, [37, 99, 235]], [0.2, [34, 211, 238]], [0.4, [34, 197, 94]], [0.6, [250, 204, 21]], [0.8, [249, 115, 22]], [1, [220, 38, 38]]];
  function warna(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < STOP.length; i++) if (t <= STOP[i][0]) { const [t0, a] = STOP[i - 1], [t1, b] = STOP[i], u = (t - t0) / (t1 - t0); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
    return STOP[STOP.length - 1][1];
  }
  const css = (t) => { const c = warna(t); return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; };

  /* impor point cloud scanner → grid (inverse distance weighting) */
  function dariPointCloud(titik) {
    const Z = new Float32Array(N * N);
    for (let k = 0; k < N * N; k++) {
      if (!IN[k]) { Z[k] = NaN; continue; }
      let s = 0, w = 0, dekat = null;
      for (const [x, y, z] of titik) { const d2 = (x - X[k]) ** 2 + (y - Y[k]) ** 2; if (d2 < 1e-6) { dekat = z; break; } const ww = 1 / (d2 * d2); s += z * ww; w += ww; }
      Z[k] = Math.max(F[k], Math.min(g.Hshell, dekat ?? s / w));
    }
    return Z;
  }
  function parseCloud(teks) {
    teks = teks.trim();
    let t = [];
    if (teks.startsWith("[") || teks.startsWith("{")) { const j = JSON.parse(teks); const arr = Array.isArray(j) ? j : j.points || []; t = arr.map((p) => (Array.isArray(p) ? p : [p.x, p.y, p.z])); }
    else t = teks.split(/\r?\n/).map((l) => l.split(/[;,\s]+/).map(Number)).filter((a) => a.length >= 3 && a.slice(0, 3).every(Number.isFinite));
    t = t.filter((p) => Math.hypot(p[0], p[1]) <= R * 1.05 && p[2] >= 0 && p[2] <= g.Hshell + 1);
    if (t.length < 12) throw new Error("Minimal 12 titik valid di dalam silo (x,y dalam radius " + R + " m, z 0–" + g.Hshell.toFixed(1) + " m)");
    if (t.length > 3000) { const lompat = Math.ceil(t.length / 3000); t = t.filter((_, i) => i % lompat === 0); }
    return t;
  }
  function contohCloud(Z) {        // buat file contoh dari permukaan saat ini (untuk uji impor)
    const out = ["x,y,z"]; for (let k = 0; k < N * N; k += 7) if (IN[k] && Z[k] - F[k] > 0.02) out.push(`${X[k].toFixed(2)},${Y[k].toFixed(2)},${(Z[k] + (Math.random() - 0.5) * 0.06).toFixed(3)}`);
    return out.join("\n");
  }


  /* garis kontur (marching squares) pada level L → segmen [x1,y1,x2,y2] dalam meter */
  function isoline(Z, L) {
    const out = [];
    const titik = (ka, kb) => { const za = Z[ka], zb = Z[kb], t = (L - za) / (zb - za || 1e-9); return [X[ka] + (X[kb] - X[ka]) * t, Y[ka] + (Y[kb] - Y[ka]) * t]; };
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      const a = j * N + i, b = a + 1, c = a + N + 1, d = a + N;
      if (!IN[a] || !IN[b] || !IN[c] || !IN[d]) continue;
      const kode = (Z[a] > L ? 8 : 0) | (Z[b] > L ? 4 : 0) | (Z[c] > L ? 2 : 0) | (Z[d] > L ? 1 : 0);
      if (kode === 0 || kode === 15) continue;
      const e = { t: () => titik(a, b), r: () => titik(b, c), b: () => titik(d, c), l: () => titik(a, d) };
      const pas = { 1: ["l", "b"], 2: ["b", "r"], 3: ["l", "r"], 4: ["t", "r"], 5: ["l", "t", "b", "r"], 6: ["t", "b"], 7: ["l", "t"], 8: ["l", "t"], 9: ["t", "b"], 10: ["l", "b", "t", "r"], 11: ["t", "r"], 12: ["l", "r"], 13: ["b", "r"], 14: ["l", "b"] }[kode];
      for (let q = 0; q < pas.length; q += 2) { const p1 = e[pas[q]](), p2 = e[pas[q + 1]](); out.push([p1[0], p1[1], p2[0], p2[1]]); }
    }
    return out;
  }

  return { isoline, N, R, dx, X, Y, RR, F, IN, lantai, hitung, statistik, sampel, warna, css, volumeDari, dariPointCloud, parseCloud, contohCloud, mataAngin, kVol };
})();
