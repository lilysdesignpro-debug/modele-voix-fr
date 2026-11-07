// SES OBJETS À ELLE (07/11/2026) : la cliente exporte une page de SON Canva (PNG, arrière-plan transparent),
// et ses objets deviennent les siens dans ses montages (rangés dans objets-perso/, qui passe AVANT les objets livrés).
// Chacune utilise SES éléments avec SA licence Canva : rien n'est redistribué.
// Seul outil nécessaire : ffmpeg.
//   node importer-objets.mjs decouper <page.png>           → objets-perso/import-01.png, -02… + objets-perso/planche.png
//   node importer-objets.mjs nommer <import-03> <nom>      → le renomme (ex. coffre-bois, appareil-instantane, etoile)
//   node importer-objets.mjs grille <nom>                  → objets-perso/<nom>-grille.png (quadrillage tous les 50 px)
//   node importer-objets.mjs bord <nom> x,y x,y …          → le bord avant d'une boîte / le V d'une enveloppe (de gauche à droite)
//   node importer-objets.mjs fente <nom> y x0 x1           → la fente d'un appareil instantané (en pixels)
//   node importer-objets.mjs rond <nom> [cx cy r]          → le rond d'une tasse vue de dessus (mot-tasse) : trouvé tout seul, ou donné en pixels
//   node importer-objets.mjs liste                         → ce qu'elle a déjà
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { mesurerRond } from './rond.mjs'

const ICI = dirname(fileURLToPath(import.meta.url)), PERSO = join(ICI, 'objets-perso'), FM = join(PERSO, 'mesures.json')
mkdirSync(PERSO, { recursive: true })
const ff = a => execFileSync('ffmpeg', ['-y', '-v', 'error', ...a])
const taille = f => execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim().split(',').map(Number)
const FR = join(PERSO, 'ronds.json'), ronds = () => existsSync(FR) ? JSON.parse(readFileSync(FR, 'utf8')) : {}
const mesures = () => existsSync(FM) ? JSON.parse(readFileSync(FM, 'utf8')) : {}
const fichier = n => { const f = join(PERSO, n.replace(/\.png$/, '') + '.png'); if (!existsSync(f)) throw new Error('objet introuvable : ' + n); return f }
const [cmd, ...args] = process.argv.slice(2)

if (cmd === 'decouper') {
  const page = args[0]; if (!page || !existsSync(page)) throw new Error('page introuvable')
  const [W, H] = taille(page), raw = join(tmpdir(), 'page-objets.raw')
  ff(['-i', page, '-pix_fmt', 'rgba', '-f', 'rawvideo', raw])
  const b = readFileSync(raw); rmSync(raw, { force: true })
  // le fond doit être transparent : sinon, tout est un seul bloc
  let opaques = 0; for (let i = 3; i < b.length; i += 4) if (b[i] > 20) opaques++
  if (opaques > W * H * 0.9) { console.log('PAS_TRANSPARENT : la page a un fond. Il faut cocher « Arrière-plan transparent » au téléchargement.'); process.exit(2) }
  // les taches d'objets (sur une image réduite de moitié, assez précis et rapide)
  const p = 2, w = Math.ceil(W / p), h = Math.ceil(H / p), m = new Uint8Array(w * h), lab = new Int32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = b[((y * p) * W + x * p) * 4 + 3] > 20 ? 1 : 0
  // les morceaux d'un même objet (ombre, reflet, trait) à moins de 6 px se touchent : on épaissit un peu avant de compter
  const r = 3, t1 = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r && !v; d++) { const X = x + d; if (X >= 0 && X < w && m[y * w + X]) v = 1 } t1[y * w + x] = v }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r && !v; d++) { const Y = y + d; if (Y >= 0 && Y < h && t1[Y * w + x]) v = 1 } m[y * w + x] = v }
  const boites = []; let n = 0
  for (let i = 0; i < w * h; i++) { if (!m[i] || lab[i]) continue
    n++; const pile = [i]; lab[i] = n; let x0 = w, y0 = h, x1 = 0, y1 = 0, aire = 0
    while (pile.length) { const k = pile.pop(), x = k % w, y = (k / w) | 0; aire++
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy
        if (X >= 0 && Y >= 0 && X < w && Y < h) { const j = Y * w + X; if (m[j] && !lab[j]) { lab[j] = n; pile.push(j) } } } }
    boites.push({ x0, y0, x1, y1, aire }) }
  const garde = boites.filter(B => B.aire > w * h * 0.0015).sort((A, C) => (A.y0 - C.y0) || (A.x0 - C.x0))
  const deja = readdirSync(PERSO).filter(f => /^import-\d+\.png$/.test(f)).map(f => +f.match(/\d+/)[0]), debut = deja.length ? Math.max(...deja) + 1 : 1
  const noms = garde.map((B, k) => { const nom = 'import-' + String(debut + k).padStart(2, '0'), x = Math.max(0, B.x0 * p - 2), y = Math.max(0, B.y0 * p - 2)
    const cw = Math.min(W - x, (B.x1 - B.x0 + 1) * p + 4), ch = Math.min(H - y, (B.y1 - B.y0 + 1) * p + 4)
    ff(['-i', page, '-vf', `crop=${cw}:${ch}:${x}:${y}`, '-pix_fmt', 'rgba', join(PERSO, nom + '.png')]); return nom })
  if (!noms.length) { console.log('AUCUN_OBJET : la page est vide.'); process.exit(2) }
  // la planche : tous les objets découpés, dans l'ordre des numéros, sur un fond clair
  const ins = noms.flatMap(nm => ['-i', join(PERSO, nm + '.png')]), col = Math.min(4, noms.length)
  const f = noms.map((_, k) => `color=c=0xEDE6DD:s=240x240[f${k}];[${k}]scale=220:220:force_original_aspect_ratio=decrease[o${k}];[f${k}][o${k}]overlay=(W-w)/2:(H-h)/2:format=auto[a${k}]`).join(';')
  const L = noms.map((_, k) => `${(k % col) * 240}_${Math.floor(k / col) * 240}`).join('|')
  ff([...ins, '-filter_complex', f + ';' + noms.map((_, k) => `[a${k}]`).join('') + (noms.length > 1 ? `xstack=inputs=${noms.length}:layout=${L}:fill=0xEDE6DD` : 'null'), '-frames:v', '1', join(PERSO, 'planche.png')])
  console.log(`OK ${noms.length} objet(s) : ${noms.join(', ')}  (planche : objets-perso/planche.png, de gauche à droite puis ligne suivante)`)
  if (garde.some(B => B.aire > w * h * 0.5)) console.log('ATTENTION : un objet couvre presque toute la page. Ses objets se touchent peut-être : il faut les écarter dans Canva.')
}
else if (cmd === 'nommer') {
  const [ancien, nouveau] = args, src = fichier(ancien), dst = join(PERSO, nouveau.replace(/\.png$/, '') + '.png')
  if (!/^[a-z0-9-]+$/.test(nouveau.replace(/\.png$/, ''))) throw new Error('nom : minuscules, chiffres et tirets seulement')
  renameSync(src, dst); console.log('OK', ancien, '→', nouveau)
}
else if (cmd === 'grille') {
  const f = fichier(args[0]), out = join(PERSO, args[0] + '-grille.png')
  const [GW, GH] = taille(f)
  ff(['-f', 'lavfi', '-i', `color=c=white:s=${GW}x${GH}`, '-i', f, '-filter_complex', '[0][1]overlay=format=auto,drawgrid=w=50:h=50:t=1:c=0x3399ff@0.6,drawgrid=w=100:h=100:t=2:c=0xff3366@0.9', '-frames:v', '1', out])
  const [W, H] = taille(f); console.log(`OK ${out}  (${W} × ${H} px ; lignes bleues tous les 50 px, rouges tous les 100 px, origine en haut à gauche)`)
}
else if (cmd === 'bord' || cmd === 'fente') {
  const nom = args[0], f = fichier(nom), [W, H] = taille(f), M = mesures()
  if (cmd === 'bord') { const pts = args.slice(1).map(s => s.split(',').map(Number)); if (pts.length < 2 || pts.some(q => q.length !== 2 || q.some(isNaN))) throw new Error('il faut au moins 2 points x,y')
    pts.sort((a, c) => a[0] - c[0]); if (pts[0][0] > 0) pts.unshift([0, pts[0][1]]); if (pts.at(-1)[0] < W) pts.push([W, pts.at(-1)[1]])
    M[nom] = { bord: pts } }
  else { const [y, x0, x1] = args.slice(1).map(Number); if ([y, x0, x1].some(isNaN)) throw new Error('fente : y x0 x1')
    M[nom] = { fente: [y / H, x0 / W, x1 / W] } }
  writeFileSync(FM, JSON.stringify(M, null, 1))
  // l'image de contrôle : la ligne mesurée en rouge, à vérifier à l'œil
  const pts = M[nom].bord || [[M[nom].fente[1] * W, M[nom].fente[0] * H], [M[nom].fente[2] * W, M[nom].fente[0] * H]]
  const boites = pts.slice(0, -1).flatMap((a, k) => { const c = pts[k + 1], N = Math.max(2, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 6))
    return Array.from({ length: N }, (_, i) => { const t = i / N; return `drawbox=x=${Math.round(a[0] + (c[0] - a[0]) * t) - 2}:y=${Math.round(a[1] + (c[1] - a[1]) * t) - 2}:w=5:h=5:color=red:t=fill` }) })
  ff(['-i', f, '-vf', boites.join(','), join(PERSO, nom + '-controle.png')])
  console.log(`OK mesure enregistrée. Vérifie objets-perso/${nom}-controle.png : la ligne rouge doit suivre ${cmd === 'bord' ? 'le bord avant (tout ce qui est au-dessus reste visible)' : 'la fente'}.`)
}
else if (cmd === 'rond') {
  // le plus grand cercle plein dans l'objet : le bord de la tasse, ou sa soucoupe (distance exacte au transparent)
  const nom = args[0], f = fichier(nom), [W, H] = taille(f), R = ronds(); let rond
  if (args.length >= 4) rond = args.slice(1, 4).map(Number)
  else { rond = mesurerRond(f); if (!rond) throw new Error('PAS_TRANSPARENT') }
  if (rond.some(isNaN) || rond[2] < 5) throw new Error('rond : cx cy r (en pixels)')
  R[nom] = rond; writeFileSync(FR, JSON.stringify(R, null, 1))
  const [cx, cy, r] = rond, N = Math.max(24, Math.round(r / 3))
  ff(['-i', f, '-vf', Array.from({ length: N }, (_, i) => `drawbox=x=${Math.round(cx + r * Math.cos(i / N * 2 * Math.PI)) - 2}:y=${Math.round(cy + r * Math.sin(i / N * 2 * Math.PI)) - 2}:w=5:h=5:color=red:t=fill`).join(','), join(PERSO, nom + '-controle.png')])
  console.log(`OK rond enregistré [${rond.join(', ')}]. Vérifie objets-perso/${nom}-controle.png : le cercle rouge doit suivre le bord de la tasse (ou de sa soucoupe). Sinon : node importer-objets.mjs grille ${nom}, puis rond ${nom} cx cy r.`)
}
else if (cmd === 'liste') {
  const M = mesures(); for (const f of readdirSync(PERSO).filter(f => f.endsWith('.png') && !/(-grille|-controle|^planche)\.png$|^planche/.test(f))) console.log(f.replace('.png', ''), M[f.replace('.png', '')] || ronds()[f.replace('.png', '')] ? '(mesuré)' : '')
}
else console.log('commandes : decouper <page.png> | nommer <import-NN> <nom> | grille <nom> | bord <nom> x,y … | fente <nom> y x0 x1 | rond <nom> [cx cy r] | liste')
