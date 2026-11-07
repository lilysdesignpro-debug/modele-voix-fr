// (07/11/2026) Le rond d'une tasse vue de dessus, mesuré tout seul : le plus grand cercle plein dans l'objet
// (le bord de la tasse, ou sa soucoupe). Distance exacte au transparent. Seul outil nécessaire : ffmpeg.
// mesurerRond(fichier.png) → [x du centre, y du centre, rayon] en pixels de l'image, ou null
import { execFileSync } from 'node:child_process'
export function mesurerRond(f) {
  try {
    const [W, H] = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number)
    const a = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'alphaextract', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 28 }), INF = 1e9
    if (a.length < W * H) return null
    const d = new Float64Array(W * H); for (let i = 0; i < W * H; i++) d[i] = a[i] > 128 ? INF : 0
    const dt1 = (g, N) => { const v = new Int32Array(N), z = new Float64Array(N + 1), o = new Float64Array(N); let k = 0; z[0] = -INF; z[1] = INF
      for (let q = 1; q < N; q++) { let x; while (true) { x = ((g[q] + q * q) - (g[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); if (x <= z[k] && k > 0) k--; else break }
        if (x <= z[k]) { v[0] = q; z[0] = -INF; z[1] = INF; k = 0; continue } k++; v[k] = q; z[k] = x; z[k + 1] = INF }
      k = 0; for (let q = 0; q < N; q++) { while (z[k + 1] < q) k++; o[q] = (q - v[k]) ** 2 + g[v[k]] } return o }
    const col = new Float64Array(H); for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) col[y] = d[y * W + x]; const o = dt1(col, H); for (let y = 0; y < H; y++) d[y * W + x] = o[y] }
    const lig = new Float64Array(W); let b = 0, bx = 0, by = 0
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) lig[x] = d[y * W + x]; const o = dt1(lig, W); for (let x = 0; x < W; x++) if (o[x] > b) { b = o[x]; bx = x; by = y } }
    const r = Math.round(Math.sqrt(b)); return r >= 5 ? [bx, by, r] : null
  } catch { return null }
}
