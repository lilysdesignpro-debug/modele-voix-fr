// LES BANDES NOIRES (05/11/2026, Aurélie : « les bandes noires c'est dommage », « des bandes + du texte coupé ») :
// quand sa vidéo montre une image plus petite que l'écran (photo, tableau, capture posée sur du noir, souvent avec
// une légende tapée dans la bande), l'outil le voit tout seul, garde SEULEMENT l'image (sans la bande ni la légende
// coupée), l'agrandit au mieux et remplit l'écran avec la même image floutée. Aucune bande noire, aucun texte coupé.
//   const r = remplirBandes(base, sortie, { lancer, FPS })  →  { segments: [{ a, b, box }] }  (box en pixels de la vidéo de sortie, LARG x HAUT)
import { spawnSync } from 'node:child_process'
import { LARG, HAUT, px } from './echelle.mjs'
import { existsSync, renameSync, rmSync } from 'node:fs'

const W = 180, H = 320, IPS = 30 // l'analyse se fait sur une image réduite, CHAQUE image (en sautant des images, un éclair de bande passait entre deux tableaux)
export function analyserBandes(video) {
  const o = spawnSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=${IPS}:round=down,scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 28 }).stdout
  const n = o ? Math.floor(o.length / (W * H)) : 0, boites = []
  for (let k = 0; k < n; k++) {
    const px = (x, y) => o[k * W * H + y * W + x]
    // chaque ligne : « barre » (noire), « image » (moins de 40 % de noir), sinon une ligne de légende ou de bord
    // n : part de noir, c : part de blanc pur, m : clarté moyenne, r : rugosité (une bande unie ou en dégradé est lisse, une image a du grain)
    const stat = y => { let n = 0, c = 0, m = 0, r = 0; for (let x = 0; x < W; x++) { const v = px(x, y); m += v; if (x) r += Math.abs(v - px(x - 1, y)); if (v < 18) n++; else if (v > 200) c++ } return [n / W, c / W, m / W, r / (W - 1)] }
    // une légende en gros caractères : la ligne n'est faite QUE de noir et de blanc pur (pas de demi-teintes)
    const S = Array.from({ length: H }, (_, y) => stat(y)), noirPur = y => S[y][0] >= 0.99 && S[y][2] < 2
    const g = S.map(([n, c, m, r]) => {
      return (n >= 0.96 && m < 4) || (r < 1.5 && m < 125) ? 'barre' : n >= 0.4 || (n >= 0.25 && n + c >= 0.9) ? 'texte' : 'image' })
    // le plus grand bloc d'image (de petits trous tolérés : une ligne sombre DANS le tableau)
    let best = null, d0 = -1, trou = 0
    for (let y = 0; y <= H; y++) { const ok = y < H && g[y] === 'image'
      if (ok) { if (d0 < 0) d0 = y; trou = 0 } else if (d0 >= 0) { trou++; if (trou > H * 0.03 || y === H) { const fin = y - trou + 1; if (!best || fin - d0 > best[1] - best[0]) best = [d0, fin]; d0 = -1; trou = 0 } } }
    if (!best || best[1] - best[0] < 20) { boites.push(null); continue }
    const [y0, y1] = best, haut = g.slice(0, y0), bas = g.slice(y1)
    // une image posée sur une bande (noire, grise ou en dégradé, une ligne toute unie) : au-dessus, en dessous, ou des deux côtés
    // d'un seul côté, seulement une vraie bande d'un noir pur (un t-shirt noir n'en est pas une)
    let np = 0; for (let y = 0; y < y0; y++) if (noirPur(y)) np++; for (let y = y1; y < H; y++) if (noirPur(y)) np++
    if (!(haut.includes('barre') && bas.includes('barre')) && np < H * 0.03) { boites.push([0, 0, W, H]); continue }
    const col = x => { let c = 0; for (let y = y0; y < y1; y++) if (px(x, y) > 22) c++; return c / (y1 - y0) }
    let x0 = 0, x1 = W; while (x0 < W / 3 && col(x0) < 0.3) x0++; while (x1 > W * 2 / 3 && col(x1 - 1) < 0.3) x1--
    boites.push([x0, y0, x1, y1])
  }
  return boites
}
export function remplirBandes(base, { lancer, FPS = 30 }) {
  const boites = analyserBandes(base)
  // une image « posée sur du noir » : elle laisse au moins 9 % de l'écran en bandes
  const petite = b => b && ((b[3] - b[1]) / H < 0.97 || (b[2] - b[0]) / W < 0.97)
  const segs = []
  for (let k = 0; k < boites.length; k++) {
    const b = boites[k]; if (!petite(b)) continue
    const s = segs.at(-1)
    if (s && s.fin === k - 1 && Math.abs(s.b[1] - b[1]) <= 30 && Math.abs(s.b[3] - b[3]) <= 30 && Math.abs(s.b[0] - b[0]) <= 30 && Math.abs(s.b[2] - b[2]) <= 30) { s.fin = k; s.b = [Math.max(s.b[0], b[0]), Math.max(s.b[1], b[1]), Math.min(s.b[2], b[2]), Math.min(s.b[3], b[3])] }
    else segs.push({ debut: k, fin: k, b: [...b] })
  }
  const garder = segs.filter(s => s.fin - s.debut >= 0).map(s => {
    const sx = LARG / W, sy = HAUT / H, m = 4 // on rentre de 2 px d'analyse : pas de liseré noir
    const x = Math.round((s.b[0] + (s.b[0] ? m : 0)) * sx), y = Math.round((s.b[1] + m) * sy), w = Math.round((s.b[2] - (s.b[2] < W ? m : 0)) * sx) - x, h = Math.round((s.b[3] - m) * sy) - y
    return { a: s.debut / IPS, b: (s.fin + 1) / IPS, box: [x, y, Math.max(16, w - w % 2), Math.max(16, h - h % 2)] }
  }).filter(s => s.box[2] > px(60) && s.box[3] > px(60))
  // deux passages qui se suivent à moins de 0,3 s : on comble le trou (pas un seul éclair de bande entre deux images)
  for (let k = 1; k < garder.length; k++) if (garder[k].a - garder[k - 1].b < 0.2) { const aire = g => g.box[2] * g.box[3]; if (aire(garder[k]) <= aire(garder[k - 1])) garder[k].a = garder[k - 1].b; else garder[k - 1].b = garder[k].a } // le trou prend le cadre le plus serré
  if (!garder.length) return { segments: [] }
  // le graphe : pour chaque passage, l'image seule, agrandie au mieux, sur elle-même floutée
  let g = '[0:v]split=' + (garder.length + 1) + '[v0]' + garder.map((_, k) => '[s' + k + ']').join('') + ';', cur = 'v0'
  garder.forEach((s, k) => {
    const [x, y, w, h] = s.box, ar = w / h, fw = ar > LARG / HAUT ? LARG : Math.round(HAUT * ar / 2) * 2, fh = ar > LARG / HAUT ? Math.round(LARG / ar / 2) * 2 : HAUT
    g += `[s${k}]crop=${w}:${h}:${x}:${y},split=2[c${k}][d${k}];[d${k}]scale=${LARG}:${HAUT}:force_original_aspect_ratio=increase,crop=${LARG}:${HAUT},gblur=sigma=${px(28)},eq=brightness=-0.06[f${k}];[c${k}]scale=${fw}:${fh}:flags=lanczos[i${k}];[f${k}][i${k}]overlay=(W-w)/2:(H-h)/2[r${k}];`
      + `[${cur}][r${k}]overlay=0:0:enable='between(t,${(s.a - 0.004).toFixed(3)},${(s.b - 0.004).toFixed(3)})'[w${k}];`
    cur = 'w' + k
  })
  g = g.replace(/;$/, '').replace(new RegExp('\\[' + cur + '\\]$'), '[o]')
  const brut = base.replace(/\.mp4$/, '-avec-bandes.mp4'); rmSync(brut, { force: true }); renameSync(base, brut) // toujours la base TOUTE NEUVE : garder l'ancienne faisait remonter un vieux montage
  lancer('ffmpeg', ['-y', '-v', 'error', '-i', brut, '-filter_complex', g, '-map', '[o]', '-map', '0:a?', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', base])
  return { segments: garder }
}
