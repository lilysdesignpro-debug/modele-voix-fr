// MONTER UN REEL DYNAMIQUE ET FLUIDE, A LA CHARTE DE LA PERSONNE QUI PARLE.
//
// La méthode d'Aurélie BARON (@madamefaitdubizz), réglée vidéo après vidéo.
//
//   node contenu/montage/montage.mjs lire   video.mp4 <charte> [nom]
//       copie la vidéo dans projets/<nom>/, la transcrit mot à mot, repère les
//       blancs et les changements de plan, et écrit un brouillon de sous-titres
//       (sous-titres.txt) à faire relire AVANT de monter.
//
//   node contenu/montage/montage.mjs monter <nom>
//       monte la vidéo, puis la réécoute en entier et dit si un mot manque.
//
// Les chartes vivent dans chartes/<nom>.json, les sons dans sons/, les polices
// dans polices/. Tout se passe sur l'ordinateur : la vidéo ne part nulle part.
import { spawnSync } from 'node:child_process'
import { zones as zonesPlateforme, dessinZones } from './marges.mjs'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { habillage } from './habillages.mjs'
import { liste as listeAnimee, POLICES_LISTES } from './listes.mjs'
import { effet as effetPonctuel, POLICES_EFFETS, couleurDecor } from './effets.mjs'
import { ECHELLE, CADRE, px, ENCODAGE } from './echelle.mjs'
import { sonneur } from './sons-choix.mjs'

const ICI = dirname(fileURLToPath(import.meta.url))
const PROJETS = join(ICI, 'projets')
// L'outil est personnel : le nom de l'élève à qui Aurélie l'a offert s'affiche à chaque montage (proprietaire.json, jamais mis à jour ni publié).
try { const PR = JSON.parse(readFileSync(join(ICI, 'proprietaire.json'), 'utf8')); console.log(`Outil personnel de ${PR.nom} (n° ${PR.cle}), offert par Aurélie BARON @madamefaitdubizz. Merci de ne pas le partager.`) } catch {}

// ── Réglages validés. Chaque valeur vient d'une correction d'Aurélie. ─────────
const BLANC_MIN = 0.3      // on ne coupe que les vrais blancs
const AVANT = 0.1          // air gardé avant la reprise de parole
const APRES = 0.18         // air gardé après le dernier mot (« palier Saphir » était avalé à 0,1)
const ZOOM_LENT = 0.08     // zoom continu sur un plan long, sur toute sa durée
const PLAN_LONG = 8        // un plan de plus de 8 s reçoit le zoom lent
const EMBARQUE = 0.22      // le zoom qui « embarque » vers elle sur un passage fort
const RAPPROCHE = 1.22     // le plan rapproché des styles « rythme » et « energique »
const GROS_PLAN = 1.45     // la coupe sèche en gros plan sur une phrase d'humeur (#grosplan)
const VOL_SON = 0.22       // les sons restent doux : « molo, c'est subtil »
const VOL_CLAVIER = 0.1
const SOUS_TITRE_MIN = 0.6  // un sous-titre plus court que ça est collé au précédent : on doit avoir le temps de le LIRE (personnes sourdes, vidéo sans le son)

// L'oreille (whisper-cli) : dans le PATH, sinon là où l'installateur de l'atelier la pose (Windows, Mac)
const WHISPER = process.env.WHISPER_CLI || [join(homedir(), 'AppData', 'Local', 'whisper-cpp', 'Release', 'whisper-cli.exe'), '/opt/homebrew/bin/whisper-cli', '/usr/local/bin/whisper-cli'].find(existsSync) || 'whisper-cli'
const lancer = (cmd, args, { sortie = false } = {}) => {
  if (cmd === 'whisper-cli') cmd = WHISPER
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 })
  if (r.error) throw new Error(`${cmd} est introuvable`)
  if (!sortie && r.status !== 0) {
    // la commande complète est gardée pour pouvoir la rejouer et comprendre (ffmpeg échoue parfois sans un mot)
    try { writeFileSync(join(PROJETS, 'derniere-erreur.json'), JSON.stringify({ cmd, args, statut: r.status, signal: r.signal, stderr: r.stderr }, null, 1)) } catch {}
    throw new Error(`${cmd} a échoué (code ${r.status ?? r.signal}) : ${(r.stderr || '').slice(-600)}`)
  }
  return (r.stdout || '') + (r.stderr || '')
}
const duree = f => +lancer('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim()

// Le navigateur qui dessine les sous-titres et les cartes : puppeteer sur l'ordinateur,
// Playwright + Google Chrome dans Claude en ligne (puppeteer n'y est pas installable).
async function ouvrirNavigateur() {
  try {
    const pup = (await import('puppeteer')).default
    const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
    const nav = await pup.launch(chrome ? { executablePath: chrome } : {})
    // la mise en page reste en 720 x 1280 (pixels CSS) ; chaque capture sort à l'échelle de sortie, nette (echelle.mjs)
    const nouvelle = nav.newPage.bind(nav)
    nav.newPage = async (...a) => { const p = await nouvelle(...a), sv = p.setViewport.bind(p); p.setViewport = v => sv({ ...v, deviceScaleFactor: ECHELLE }); return p }
    return nav
  } catch {
    const { createRequire } = await import('node:module')
    const racine = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout.trim()
    const { chromium } = createRequire(join(racine, 'x.js'))('playwright')
    const nav = await chromium.launch({ executablePath: ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync) })
    return { newPage: async () => { const p = await nav.newPage({ deviceScaleFactor: ECHELLE }); p.setViewport = v => p.setViewportSize({ width: v.width, height: v.height }); return p }, close: () => nav.close() }
  }
}

function modeleWhisper() {
  const dir = join(homedir(), '.cache', 'whisper')
  const pref = ['ggml-large-v3-turbo.bin', 'ggml-large-v3.bin', 'ggml-medium.bin', 'ggml-small.bin', 'ggml-base.bin']
  const la = existsSync(dir) ? readdirSync(dir) : []
  const m = pref.find(p => la.includes(p))
  if (!m) throw new Error('aucun modèle whisper dans ~/.cache/whisper (lance une fois : node contenu/reel.mjs lire une-video.mp4)')
  return join(dir, m)
}

function transcrireMots(wav, sortieSansExt) {
  lancer('whisper-cli', ['-m', modeleWhisper(), '-f', wav, '-l', 'fr', '-t', '8', '-ml', '1', '-sow', '-oj', '-of', sortieSansExt, '-np'])
  const j = JSON.parse(readFileSync(sortieSansExt + '.json', 'utf8'))
  const mots = []
  for (const s of j.transcription) {
    const m = { t: s.offsets.from / 1000, fin: s.offsets.to / 1000, txt: s.text.trim() }
    if (!m.txt) continue
    // whisper sort parfois « ? » tout seul : on le recolle au mot d'avant
    if (/^[?.!,;:…]+$/.test(m.txt) && mots.length) { mots.at(-1).txt += (m.txt === '?' || m.txt === '!' ? ' ' : '') + m.txt; mots.at(-1).fin = m.fin; continue }
    mots.push(m)
  }
  return mots
}

function silences(fichier, D) {
  const log = lancer('ffmpeg', ['-hide_banner', '-nostats', '-i', fichier, '-af', `silencedetect=n=-32dB:d=${BLANC_MIN}`, '-f', 'null', '-'], { sortie: true })
  const v = [...log.matchAll(/silence_(start|end): ([0-9.]+)/g)].map(m => +m[2])
  const paires = []; for (let i = 0; i < v.length; i += 2) paires.push([v[i], v[i + 1] ?? D])
  return paires
}

function plans(fichier) {
  const log = lancer('ffmpeg', ['-hide_banner', '-nostats', '-i', fichier, '-vf', "select='gt(scene,0.25)',showinfo", '-an', '-f', 'null', '-'], { sortie: true })
  return [...log.matchAll(/pts_time:([0-9.]+)/g)].map(m => +m[1])
}

// ── lire ──────────────────────────────────────────────────────────────────────
function lire(video, charte, nom) {
  if (!existsSync(video)) throw new Error(`vidéo introuvable : ${video}`)
  if (!existsSync(join(ICI, 'chartes', charte + '.json'))) throw new Error(`charte inconnue : ${charte} (chartes disponibles : ${readdirSync(join(ICI, 'chartes')).map(f => f.replace('.json', '')).join(', ')})`)
  nom = (nom || basename(video).replace(/\.[^.]+$/, '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  const dir = join(PROJETS, nom); mkdirSync(dir, { recursive: true })
  const source = join(dir, 'source.mp4'); copyFileSync(video, source)
  const D = duree(source)
  lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', join(dir, 'audio.wav')])
  const mots = transcrireMots(join(dir, 'audio.wav'), join(dir, 'mots'))
  writeFileSync(join(dir, 'blancs.json'), JSON.stringify(silences(source, D)))
  writeFileSync(join(dir, 'plans.json'), JSON.stringify(plans(source)))
  // Brouillon : une petite phrase à la fois, coupée sur la ponctuation.
  const lignes = []; let cur = null
  for (const m of mots) {
    if (!cur) cur = { t: m.t, txt: '' }
    cur.txt += (cur.txt ? ' ' : '') + m.txt
    if (/[.?!,]$/.test(m.txt) && cur.txt.length >= 10 || cur.txt.length >= 30) { lignes.push(cur); cur = null }
  }
  if (cur) lignes.push(cur)
  const entete = [
    '# Sous-titres : « début en secondes | texte ». Corrige les mots, mets le mot fort entre *étoiles*.',
    '# Attention aux mots qui se prononcent pareil (pause/pose, vers/vert/verre, ces/ses, a/à, et/est…) : choisis selon le sens de la phrase.',
    '# Étiquettes en fin de ligne : #ding (petit ding APRÈS la phrase), #montee (whoosh qui monte avant), #rien (pas de pop).',
    '# La dernière ligne « fin| » marque la fin du dernier sous-titre.',
  ]
  writeFileSync(join(dir, 'sous-titres.txt'), [...entete, ...lignes.map(l => `${l.t.toFixed(2)}|${l.txt}`), `${(mots.at(-1)?.fin ?? D).toFixed(2)}|`].join('\n') + '\n')
  const projet = { charte, duree: D, titre: '', etiquette: '', hookFin: null, garder: [], embarquer: [], etirer: [], clavier: [],
    _aide: 'titre : texte du hook, / pour aller à la ligne, *mot* en manuscrite. garder : [[début, fin]] où ne rien couper. embarquer : [[début, fin]] zoom qui avance vers elle. etirer : [[début, fin, facteur]] pour allonger un blanc. clavier : [secondes] bruit de clavier 2 s. Tous les temps sont ceux de la vidéo d\'origine.' }
  if (!existsSync(join(dir, 'projet.json'))) writeFileSync(join(dir, 'projet.json'), JSON.stringify(projet, null, 2))
  console.log(lignes.map(l => `${l.t.toFixed(2).padStart(6)}  ${l.txt}`).join('\n'))
  console.log(`\nProjet « ${nom} » prêt : ${dir}\nÀ relire avec elle : sous-titres.txt et projet.json, puis, depuis le dossier de l'outil : node montage.mjs monter ${nom}`)
}

// ── monter ────────────────────────────────────────────────────────────────────
async function monter(nom) {
  const dir = join(PROJETS, nom)
  const P = JSON.parse(readFileSync(join(dir, 'projet.json'), 'utf8'))
  const C = JSON.parse(readFileSync(join(ICI, 'chartes', P.charte + '.json'), 'utf8'))
  let source = join(dir, 'source.mp4')
  if (P.stabiliser) { const stab = join(dir, 'source-stable.mp4'), trf = join(dir, 'stab.trf').replace(/\\/g, '/').replace(':', '\\:'); if (!existsSync(stab)) { console.log('Stabilisation de la vidéo…'); lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-vf', "vidstabdetect=shakiness=6:accuracy=12:result='" + trf + "'", '-f', 'null', '-']); lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-vf', "vidstabtransform=input='" + trf + "':smoothing=18:zoom=4,unsharp=5:5:0.6", '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-c:a', 'copy', stab]) } source = stab }
  const D = duree(source)
  const blancs = JSON.parse(readFileSync(join(dir, 'blancs.json'), 'utf8'))
  const coupes = JSON.parse(readFileSync(join(dir, 'plans.json'), 'utf8'))
  // Le visage, repéré toutes les 0,25 s : RIEN ne se pose dessus (règle d'Aurélie, pour toutes les élèves).
  if (!existsSync(join(dir, 'visages.json'))) spawnSync('node', [join(ICI, 'detourage', 'visages.mjs'), source, join(dir, 'visages.json')], { stdio: 'inherit' })
  const VIS = existsSync(join(dir, 'visages.json')) ? JSON.parse(readFileSync(join(dir, 'visages.json'), 'utf8')) : []
  // Le détecteur rate souvent les premières images d'un plan (flou de mouvement) : sans visage repéré,
  // on prend le plus proche (jusqu’à 0,75 s après, 0,5 s avant), pour qu'aucune carte ne se pose sur elle au moment de la coupe.
  const visageOrig = tt => {
    const i = Math.max(0, Math.min(VIS.length - 1, Math.round(tt / 0.25)))
    for (const d of [0, 1, -1, 2, -2, 3]) { const b = VIS[i + d]?.b; if (b) return b }
    return null
  }
  const alertesVisage = []

  // 1. Les morceaux gardés
  const segs = []; let cur = 0
  for (const [st, en] of blancs) {
    if (P.garder.some(([x, y]) => st > x && st < y)) continue
    if (st + APRES > cur + 0.05) segs.push([cur, Math.min(D, st + APRES)])
    cur = Math.max(0, Math.min(D, en) - AVANT)
  }
  if (D - cur > 0.1) segs.push([cur, D])
  segs[segs.length - 1][1] = D // la fin garde tout son souffle
  // Passages retirés (version courte) : à couper dans un blanc, jamais au milieu d'un mot.
  const HESITATIONS = (() => { if (P.hesitations === false || !existsSync(join(dir, 'mots.json'))) return []
    const ms = (JSON.parse(readFileSync(join(dir, 'mots.json'), 'utf8')).transcription || []).filter(w => /\p{L}|\d/u.test(w.text || '')).map(w => [w.offsets.from / 1000, w.offsets.to / 1000])
    const out = []
    for (let i = 1; i < ms.length; i++) { const a = ms[i - 1][1] + 0.06, b = ms[i][0] - 0.06; if (b - a < 0.45 || b - a > 1.6) continue
      if (P.garder.some(([x, y]) => a < y && b > x)) continue
      const silence = blancs.filter(([s, e]) => s < b && e > a).reduce((t, [s, e]) => t + Math.min(b, e) - Math.max(a, s), 0)
      if (silence < (b - a) * 0.5) out.push([+a.toFixed(3), +b.toFixed(3)]) }
    if (out.length) console.log('Hésitations coupées : ' + out.length + ' (' + out.reduce((t, [a, b]) => t + b - a, 0).toFixed(1) + ' s)')
    return out })()
  const VIGNETTE = (() => { if (P.vignette === false) return []
    const o = spawnSync('ffmpeg', ['-v', 'info', '-t', '0.5', '-i', join(dir, 'source.mp4'), '-vf', "select='gt(scene,0.3)',showinfo", '-f', 'null', '-'], { encoding: 'utf8' }).stderr || ''
    const cuts = [...o.matchAll(/pts_time:([0-9.]+)/g)].map(m => +m[1]).filter(t => t > 0.05 && t < 0.45)
    if (!cuts.length) return []
    console.log('Vignette du début enlevée (' + Math.max(...cuts).toFixed(2) + ' s)'); return [[0, +Math.max(...cuts).toFixed(3)]] })()
  const RETIRER = [...(P.retirer || []), ...VIGNETTE, ...HESITATIONS]
  for (const [x, y] of RETIRER) {
    const garde = []
    for (const [a, b, k] of segs) {
      if (b <= x || a >= y) { garde.push([a, b, k]); continue }
      if (a < x) garde.push([a, x])
      if (b > y) garde.push([y, b])
    }
    segs.splice(0, segs.length, ...garde)
  }
  for (const [x, y, k] of P.etirer) {
    const i = segs.findIndex(([a, b]) => a < x && b > y); if (i < 0) continue
    const [a, b] = segs[i]; segs.splice(i, 1, [a, x], [x, y, k], [y, b])
  }
  // Ouverture (reel d'essai) : un extrait de plus loin, joué en premier comme hook, puis la vidéo entière.
  const OUV = P.ouverture || null
  if (OUV) segs.unshift([OUV[0], OUV[1]])
  let o = 0; const map = segs.map(([a, b, k = 1], i) => { const r = [a, b, o, k, !!OUV && i === 0]; o += (b - a) * k; return r }); const TOT = o
  const nt = t => { for (const [a, b, s, k, ouv] of map) { if (ouv) continue; if (t < a) return s; if (t <= b) return s + (t - a) * k } return TOT }

  // 2. Image : zoom lent sur les plans longs, zoom qui embarque sur le passage fort.
  // Calculé sur une image 4 fois plus grande puis réduite : sans ça, le zoom avance
  // par à-coups d'un pixel (« saccadé »). PAS de zoompan : il a fait disparaître la voix.
  const bornes = [0, ...coupes, D]
  const longs = bornes.slice(0, -1).map((a, i) => [a, bornes[i + 1]]).filter(([a, b]) => b - a >= PLAN_LONG)
  // Style de montage (P.style) :
  //  « doux »   : zoom lent sur les plans longs + le zoom qui embarque ;
  //  « rythme » : en plus, un plan RAPPROCHÉ (RAPPROCHE) à chaque phrase qui porte un *mot fort*,
  //               puis retour au plan large : la façon d'Aurélie dans ses propres reels ;
  //  « energique » : plan rapproché sur un plan sur deux, sauf le hook (pour les vidéos très rythmées).
  // P.rapprocher : [[début, fin]] pour forcer un plan rapproché à la main, quel que soit le style.
  const lignesST = readFileSync(join(dir, 'sous-titres.txt'), 'utf8').split(/\r?\n/).filter(l => /^\d/.test(l))
  const lignesFortes = lignesST.map(l => [+l.split('|')[0], /\*[^*]+\*/.test(l)])
  const lignesGrosPlan = lignesST.filter(l => /#grosplan\b/.test(l)).map(l => +l.split('|')[0])
  const finHook = P.hookFin ?? (lignesST[1] ? +lignesST[1].split('|')[0] : 0)
  const style = ({ confidence: 'doux', energie: 'energique', serie: 'rythme', classique: 'rythme', pop: 'energique', editorial: 'doux', collage: 'doux', aurelie: 'rythme', typo: 'rythme', witchy: 'doux', chic: 'doux', automne: 'rythme', cosy: 'rythme', studio: 'rythme' })[P.style] || P.style || 'doux'
  const rapproche = (a, b, i) => {
    if (lignesGrosPlan.some(t => t >= a - 0.05 && t < b)) return GROS_PLAN
    if ((P.rapprocher || []).some(([x, y]) => b > x && a < y)) return RAPPROCHE
    if (a >= finHook && (P.style === 'doux' || P.style === 'confidence' || P.style === 'witchy' || P.style === 'chic' || P.style === 'luxe')) return i % 2 ? RAPPROCHE : 1 // doux : de près, de loin, on s'assoit en face d'elle
    if (a < finHook || style === 'prof' || style === 'doux' || style === 'carnet') return 1
    if (style === 'rythme') return lignesFortes.some(([t, fort]) => fort && t >= a - 0.05 && t < b) ? RAPPROCHE : 1
    if (style === 'energique') return i % 2 ? RAPPROCHE : 1
    return 1
  }
  // Pour chaque morceau : son zoom, et le centre du visage (le plan rapproché se cadre SUR le visage).
  const infos = segs.map(([a, b, k], i) => {
    const L = style === 'prof' || style === 'carnet' || P.fixe ? null : longs.find(([x, y]) => a >= x - 0.05 && a < y)
    const E = style === 'prof' || style === 'carnet' || P.fixe ? null : P.embarquer.find(([x, y]) => b > x && a < y)
    const R = E || P.fixe ? 1 : rapproche(a, b, i) // jamais deux zooms empilés ; « fixe » (les clones) : le cadre ne bouge jamais
    const bs = []; for (let u = a; u < b; u += 0.25) { const v = visageOrig(u); if (v) bs.push(v) }
    const med = q => { const l = bs.map(q).sort((x, y) => x - y); return l.length ? l[l.length >> 1] : null }
    const cx = med(v => (v[0] + v[2]) / 2), cy = med(v => (v[1] + v[3]) / 2), bas = med(v => v[3])
    // le plan rapproché s'arrête avant que le menton n'atteigne la ligne des sous-titres
    const limite = 1280 * C.sousTitres.y - C.sousTitres.taille - 30
    const Rmax = cy != null && bas > cy ? (limite - 0.36 * 1280) / (bas - cy) : R
    return { a, b, k, o: map[i][2], ouv: map[i][4], L, E, R: R > 1 ? Math.max(1, Math.min(R, Rmax)) : R, cx, cy }
  })
  // facteur de zoom et décalage du cadre à l'instant tt (temps d'origine) d'un morceau
  const cadrage = (g, tt) => {
    const lent = g.L ? ZOOM_LENT / (g.L[1] - g.L[0]) * (tt - g.L[0]) : 0
    let emb = 0; if (g.E) { const u = (tt - g.E[0]) / (g.E[1] - g.E[0]); emb = u < 0 || u > 1 ? 0 : EMBARQUE * u * u * (3 - 2 * u) }
    const zf = g.R * (1 + lent + emb)
    const surVisage = g.R > 1 && g.cx != null
    const offX = surVisage ? Math.max(0, Math.min(720 * zf - 720, g.cx * zf - 360)) : (720 * zf - 720) / 2
    const offY = surVisage ? Math.max(0, Math.min(1280 * zf - 1280, g.cy * zf - 0.36 * 1280)) : (1280 * zf - 1280) * 0.35
    return { zf, offX, offY }
  }
  // le visage tel qu'on le voit dans la vidéo FINALE à l'instant T
  const visageFinal = T => {
    const g = infos.find(x => T >= x.o - 1e-6 && T < x.o + (x.b - x.a) * (x.k || 1)); if (!g) return null
    const tt = g.a + (T - g.o) / (g.k || 1), v = visageOrig(tt); if (!v) return null
    const { zf, offX, offY } = cadrage(g, tt)
    return [v[0] * zf - offX, v[1] * zf - offY, v[2] * zf - offX, v[3] * zf - offY]
  }
  // Zone sûre COMMUNE à Instagram et TikTok (sur 720x1280) : rien au-dessus de 170 (pseudo, onglets),
  // rien sous 980 (légende, musique), rien à moins de 48 px à gauche ni dans les 96 px de droite (boutons).
  const ZONE = { haut: 170, bas: 980, gauche: 48, droite: 720 - 96 }
  const BAS_MAX = ZONE.bas, HAUT_MIN = ZONE.haut
  // Pose un élément (centre y, hauteur h, largeur w autour de x) entre T0 et T1 sans toucher le visage
  // ni ce qui est déjà posé. sousVisage : il se cherche SOUS le visage (sous-titres, cartes) ;
  // essai : on regarde seulement s'il tient (renvoie null sinon, sans rien réserver).
  const poses = [] // ce qui est déjà posé : { x0, x1, y0, y1, T0, T1, quoi }
  const placer = (quoi, yc, h, T0, T1, x = 360, w = 720, yStable = null, { sousVisage = quoi === 'sous-titre', essai = false, yMin = -1e9, yMax = 1e9 } = {}) => {
    const obst = []
    for (let T = T0; T <= T1 + 1e-6; T += 0.125) { const v = visageFinal(T); if (v && v[2] > x - w / 2 && v[0] < x + w / 2) obst.push([v[1] - 14, v[3] + 14, true]) }
    for (const p of poses) if (p.T1 > T0 + 0.05 && p.T0 < T1 - 0.05 && p.x1 > x - w / 2 && p.x0 < x + w / 2) obst.push([p.y0 - 10, p.y1 + 10, false])
    const basVisage = Math.max(-1, ...obst.filter(o => o[2]).map(o => o[1]))
    const libre = y => y - h / 2 >= HAUT_MIN && y + h / 2 <= BAS_MAX && obst.every(([a, b]) => y + h / 2 < a || y - h / 2 > b) && (!sousVisage || basVisage < 0 || y - h / 2 > basVisage) && y - h / 2 >= yMin && y + h / 2 <= yMax
    let y = yStable != null && libre(yStable) ? yStable : yc
    if (!libre(y)) {
      // les places possibles : juste sous ou juste au-dessus de chaque obstacle, les bords de la zone ; la plus proche gagne
      const cand = [...obst.flatMap(([a, b]) => [b + h / 2, a - h / 2]), BAS_MAX - h / 2, HAUT_MIN + h / 2, 640].filter(libre).sort((p, q) => Math.abs(p - yc) - Math.abs(q - yc))
      if (cand.length) y = cand[0]
      else if (essai) return null
      else { if (obst.some(o => o[2] && !(yc + h / 2 < o[0] || yc - h / 2 > o[1]))) { alertesVisage.push(`${quoi} à ${T0.toFixed(1)} s`); y = quoi === 'sous-titre' ? BAS_MAX - h / 2 : yc } else y = Math.max(HAUT_MIN + h / 2, Math.min(BAS_MAX - h / 2, yc)) }
    } else if (essai) { /* tient tel quel */ }
    poses.push({ x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2, T0, T1, quoi })
    return Math.round(y)
  }
  // L'image : une correction légère d'office (un peu de lumière, moins de grain, un peu de netteté), qui améliore
  // sans se voir ; puis les options qu'elle demande. JAMAIS de grain, de vignette ou de teinte qui abîme une vidéo
  // de téléphone. "image": "aucun" pour garder l'image telle quelle.
  const FILTRES = { auto: 'hqdn3d=3:2:4:3,eq=gamma=1.13:contrast=1.04:saturation=1.04,unsharp=5:5:0.45', lumineux: 'eq=brightness=0.05:gamma=1.18:contrast=1.03', grain: 'hqdn3d=5:4:7:5', net: 'unsharp=5:5:0.9', chaud: 'colorbalance=rs=.05:gs=.01:bs=-.05:rm=.03:bm=-.03,eq=saturation=1.06', froid: 'colorbalance=rs=-.04:bs=.05:rm=-.02:bm=.03' }
  const IMAGE0 = P.image === 'aucun' ? '' : ['auto', ...[].concat(P.image || []).filter(x => x !== 'auto')].map(n => FILTRES[n]).filter(Boolean).map(x => ',' + x).join('')
  // COLOR MATCH : les couleurs d'une photo qu'elle aime, posées sur sa vidéo (après la correction de base)
  let MATCH = ''
  if (P.reference) {
    const ref = /^[a-z]:|^[\\/]/i.test(P.reference) ? P.reference : join(dir, P.reference)
    const pixels = (f, t) => spawnSync('ffmpeg', ['-v', 'error', ...(t != null ? ['-ss', String(t)] : []), '-i', f, '-frames:v', '1', '-vf', 'scale=64:64:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 24 }).stdout || Buffer.alloc(0)
    const stats = b => { const n = b.length / 3 || 1, mo = [0, 0, 0], e = [0, 0, 0]; for (let q = 0; q < b.length; q += 3) for (let c = 0; c < 3; c++) mo[c] += b[q + c]; mo.forEach((v, c) => mo[c] = v / n); for (let q = 0; q < b.length; q += 3) for (let c = 0; c < 3; c++) e[c] += (b[q + c] - mo[c]) ** 2; return { mo, e: e.map(v => Math.sqrt(v / n) || 1) } }
    if (existsSync(ref)) {
      const Dv = duree(join(dir, 'source.mp4')), r = stats(pixels(ref)), v = stats(Buffer.concat([0.15, 0.35, 0.55, 0.75, 0.9].map(x => pixels(join(dir, 'source.mp4'), (x * Dv).toFixed(2)))))
      const k = Math.max(0, Math.min(1, P.intensiteReference ?? 0.6))
      const expr = c => { const R = Math.max(0.6, Math.min(1.6, r.e[c] / v.e[c])); return 'clip(val+' + k.toFixed(2) + '*((val-' + v.mo[c].toFixed(1) + ')*' + R.toFixed(3) + '+' + r.mo[c].toFixed(1) + '-val),0,255)' }
      MATCH = ",format=rgb24,lutrgb=r='" + expr(0) + "':g='" + expr(1) + "':b='" + expr(2) + "',format=yuv420p"
      console.log('Couleurs de la photo de référence appliquées (dose ' + Math.round(k * 100) + ' %)')
    } else console.log('(photo de référence introuvable : ' + ref + ', couleurs inchangées)')
  }
  const IMAGE = IMAGE0 + MATCH
  // Les ambiances, par-dessus la correction, seulement si elle en demande une (validées par Aurélie le 04/11/2026 :
  // cocooning et matin lumineux ; les autres ont été refusées). Un léger halo lumineux adoucit l'ensemble.
  const AMBIANCES = { cocooning: ["curves=r='0/0.08 0.5/0.55 1/0.95':g='0/0.05 0.5/0.44 1/0.88':b='0/0.03 0.5/0.33 1/0.72',eq=saturation=0.95:gamma=0.92", 0.2], matin: ['eq=brightness=0.1:gamma=1.3:contrast=0.86:saturation=0.75,colortemperature=temperature=7500:mix=0.4', 0.28] }
  const amb = AMBIANCES[String(P.ambiance || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[\s-]+/)[0]]
  const IMG = i => IMAGE + (amb ? `,format=rgb24,${amb[0]},format=gbrp,split[ha${i}][hb${i}];[hb${i}]gblur=sigma=${px(24)}[hc${i}];[ha${i}][hc${i}]blend=all_mode=screen:all_opacity=${amb[1]},format=yuv420p` : '')
  let f = ''
  segs.forEach(([a, b, k], i) => {
    const { L, E, R, cx, cy } = infos[i]
    let z = ''
    if (L || E || R !== 1) {
      const lent = L ? `${ZOOM_LENT / (L[1] - L[0])}*(t+${(a - L[0]).toFixed(3)})` : '0'
      let emb = '0'
      if (E) { const u = `((${a.toFixed(3)}+t-${E[0]})/${(E[1] - E[0]).toFixed(3)})`; emb = `${EMBARQUE}*if(lt(${u},0),0,if(gt(${u},1),0,${u}*${u}*(3-2*${u})))` }
      z = `,scale=w='2*trunc(1440*${R}*(1+${lent}+${emb}))':h=-2:eval=frame:flags=bicubic,crop=2880:5120:${R > 1 && cx != null ? `'max(0,min(iw-2880,${(cx * 4).toFixed(1)}*iw/2880-1440))':'max(0,min(ih-5120,${(cy * 4).toFixed(1)}*ih/5120-${(0.36 * 5120).toFixed(0)}))'` : '(iw-2880)/2:(ih-5120)*0.35'},scale=${CADRE}:flags=bicubic`
    }
    const cadre = `,scale=${CADRE}:force_original_aspect_ratio=increase${ECHELLE > 1 ? ':flags=lanczos' : ''},crop=${CADRE}` + IMG(i)
    if (k) { f += `[0:v]trim=${a}:${b},setpts=${k}*(PTS-STARTPTS)${cadre}${z},setsar=1,fps=30[v${i}];anullsrc=r=44100:cl=stereo,atrim=0:${((b - a) * k).toFixed(3)}[a${i}];`; return }
    f += `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS${cadre}${z},setsar=1,fps=30[v${i}];[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo,afade=t=in:d=0.015,afade=t=out:st=${Math.max(0, b - a - 0.015).toFixed(3)}:d=0.015[a${i}];`
  })
  f += segs.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${segs.length}:v=1:a=1[cvb][voix0];`
  f += '[cvb]null[cv];'
  f += P.son === 'brut' ? '[voix0]anull[vp];' : "[voix0]highpass=f=70,afftdn=nf=-28:tn=1,deesser=i=0.3:m=0.5,acompressor=threshold=0.09:ratio=2.5:attack=8:release=160:makeup=1.5[vp];"
  const musique = P.musique && existsSync(join(dir, P.musique)) ? join(dir, P.musique).replace(/\\/g, '/').replace(':', '\\:') : null
  f += musique ? `amovie='${musique}':loop=0,aresample=44100,aformat=channel_layouts=stereo,volume=${P.musiqueVolume ?? 0.15}[mus];[vp]asplit=2[vp1][vp2];[mus][vp2]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=450[md];[vp1][md]amix=inputs=2:duration=first:normalize=0[voix];` : '[vp]anull[voix];'
  const fSegments = f // le découpage seul : le détourage travaille sur la vidéo déjà cadrée

  // 3. Sous-titres
  const tout = readFileSync(join(dir, 'sous-titres.txt'), 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => { const [t, ...r] = l.split('|'); return { t: +t, txt: r.join('|') } })
  // Les sous-titres d'un passage retiré disparaissent avec lui (sauf pour l'ouverture, qui le rejoue).
  const brut = tout.filter((l, i) => i === tout.length - 1 || !RETIRER.some(([x, y]) => l.t >= x && l.t < y))
  let subs = brut.slice(0, -1).map((l, i) => {
    const tags = (l.txt.match(/#(ding|montee|rien|pop|grosplan)\b/g) || []).map(x => x.slice(1))
    return { o: l.t, a: nt(l.t), b: nt(brut[i + 1].t), txt: l.txt.replace(/#(ding|montee|rien|pop|grosplan)\b/g, '').trim(), tags }
  })
  if (OUV) subs.unshift(...tout.slice(0, -1).map((l, i) => ({ l, n: tout[i + 1] })).filter(({ l, n }) => l.t < OUV[1] && n.t > OUV[0])
    .map(({ l, n }) => ({ o: l.t, a: Math.max(0, l.t - OUV[0]), b: Math.min(n.t, OUV[1]) - OUV[0], txt: l.txt.replace(/#(ding|montee|rien|pop|grosplan)\b/g, '').trim(), tags: [] })))
  // un sous-titre qui répète mot pour mot le titre écrit ne s'affiche pas en même temps que lui
  const net = t => t.replace(/[*/]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase()
  if (P.titre) subs = subs.filter((s, i) => !(i < 3 && net(P.titre).startsWith(net(s.txt))))
  const finHookF = nt(finHook)
  for (let i = subs.length - 1; i > 0; i--) if (subs[i].b - subs[i].a < SOUS_TITRE_MIN && !(subs[i - 1].a < finHookF - 0.05 && subs[i].a >= finHookF - 0.05) && (subs[i - 1].txt + ' ' + subs[i].txt).replace(/\*/g, '').length <= 44) { subs[i - 1].txt += ' ' + subs[i].txt; subs[i - 1].b = subs[i].b; subs[i - 1].tags.push(...subs[i].tags); subs.splice(i, 1) }

  // Recalage : les temps de whisper sur la vidéo d'origine dérivent (jusqu'à 0,8 s, « les sous-titres
  // correspondent pas »). On réécoute la voix DÉJÀ coupée et on cale chaque sous-titre sur son premier mot.
  let motsEntendus = [] // mots entendus dans la voix coupée, avec leur temps (sert aux sous-titres mot à mot)
  if (!OUV) {
    let fa = ''
    segs.forEach(([a, b, k], i) => { fa += k ? `anullsrc=r=16000:cl=mono,atrim=0:${((b - a) * k).toFixed(3)}[x${i}];` : `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,aresample=16000,aformat=channel_layouts=mono[x${i}];` })
    fa += segs.map((_, i) => `[x${i}]`).join('') + `concat=n=${segs.length}:v=0:a=1[o]`
    lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-filter_complex', fa, '-map', '[o]', '-ar', '16000', '-ac', '1', join(dir, 'voix-coupee.wav')])
    const sans = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
    const entendus = motsEntendus = transcrireMots(join(dir, 'voix-coupee.wav'), join(dir, 'voix-coupee')).flatMap(m => sans(m.txt).split(' ').filter(Boolean).map(x => ({ t: m.t, m: x })))
    const pareil = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4))
    let j = 0, recales = 0, decalage = 0
    for (const s of subs) {
      const mots = sans(s.txt.replace(/\*/g, '')).split(' ').filter(Boolean)
      let trouve = -1
      // on cherche les 2 premiers mots à la suite ; si le premier est trop court pour être sûr, les 2 suivants
      for (const d of [0, 1]) {
        if (!mots[d] || trouve >= 0) continue
        for (let k = j; k < Math.min(entendus.length, j + 40); k++) {
          if (!pareil(entendus[k].m, mots[d])) continue
          if (mots[d + 1] && entendus[k + 1] && !pareil(entendus[k + 1].m, mots[d + 1])) continue
          if (Math.abs(entendus[k].t - s.a) > 2.5) continue
          trouve = d === 0 ? k : Math.max(j, k - 1); break
        }
      }
      if (trouve >= 0) { const t = Math.max(0, entendus[trouve].t - 0.05); decalage = t - s.a; s.a = t; j = trouve + 1; recales++ }
      else s.a = Math.max(0, s.a + decalage) // pas trouvé : même décalage que le sous-titre d'avant
    }
    for (let i = 1; i < subs.length; i++) if (subs[i].a < subs[i - 1].a + 0.25) subs[i].a = subs[i - 1].a + 0.25
    for (let i = 0; i < subs.length - 1; i++) subs[i].b = Math.max(subs[i].a + 0.2, subs[i + 1].a)
    console.log(`Sous-titres recalés sur la voix : ${recales}/${subs.length}`)
  }
  // Le hook = la première phrase complète (jusqu'au premier « ? », « . » ou « ! »).
  const iFin = brut.findIndex((l, i) => i < brut.length - 1 && /[?.!]\s*(#\w+\s*)*$/.test(l.txt))
  const hookOrig = P.hookFin ?? (iFin >= 0 ? brut[iFin + 1].t : bornes[1])
  const HOOK = OUV ? OUV[1] - OUV[0] : nt(hookOrig)

  // Style « collage » : un autre moteur (collage.mjs) habille la vidéo. On lui passe la vidéo coupée et cadrée
  // (avec sa voix), les phrases relues, chaque mot entendu avec son temps, le visage, et la table des temps.
  if (['collage', 'pop', 'editorial', 'doux', 'confidence', 'aurelie', 'typo', 'witchy', 'chic', 'luxe', 'automne', 'cosy', 'studio'].includes(P.style)) {
    const st = join(dir, 'rendu'); mkdirSync(st, { recursive: true })
    lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-filter_complex', fSegments.replace(/;$/, ''), '-map', '[cv]', '-map', '[voix]', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', join(st, 'base-av.mp4')])
    const visages = []; for (let T = 0; T < TOT; T += 0.1) visages.push(visageFinal(T)?.map(Math.round) ?? null)
    const temps = []; for (let t = 0; t <= D; t += 0.05) temps.push(+nt(t).toFixed(3))
    writeFileSync(join(st, 'collage-entree.json'), JSON.stringify({ TOT, HOOK, phrases: brut.map(l => ({ a: +nt(l.t).toFixed(3), txt: l.txt })), mots: motsEntendus, visages, temps }))
    const { monterCollage } = await import('./collage.mjs')
    return monterCollage({ nom, dir, P, C, ouvrirNavigateur, lancer, verifier, ICI })
  }

  const nav = await ouvrirNavigateur()
  const page = await nav.newPage(); await page.setViewport({ width: 720, height: 1280 })
  const face = (p) => `@font-face{font-family:'${p.famille}';font-weight:${p.poids};src:url(data:font/${p.fichier.split('.').pop().toLowerCase()};base64,${readFileSync(join(ICI, 'polices', p.fichier)).toString('base64')})}`
  const S = C.sousTitres, F = C.motFort, T = C.titre, E = C.etiquette
  const css = `${face(C.polices.texte)}${face(C.polices.fort)}${face(C.polices.titre)}${face({ fichier: 'Caveat-700.woff2', famille: 'Main', poids: 700 })}${face({ fichier: 'DMSerifDisplay-400.woff2', famille: 'Serif', poids: 400 })}${POLICES_LISTES.map(([fichier, famille, poids]) => face({ fichier, famille, poids })).join('')}${POLICES_EFFETS.filter(([, f]) => f !== 'Carnet').map(([fichier, famille, poids, style]) => face({ fichier, famille, poids, style })).join('')}
html,body{margin:0;width:720px;height:1280px;background:transparent}
.fort{font-family:'${C.polices.fort.famille}',cursive;font-weight:${C.polices.fort.poids};color:${F.couleur};letter-spacing:${F.espacement};text-transform:${F.majuscules ? 'uppercase' : 'none'};${F.contour ? `-webkit-text-stroke:${F.contourEpaisseur}px ${F.contour};paint-order:stroke fill;` : ''}${F.fond ? `background:${F.fond};padding:0 14px 2px;border-radius:3px;` : ''}display:inline-block;transform:rotate(${F.rotation}deg);text-shadow:none;line-height:1}
.st{position:absolute;left:${Math.max(S.marge, 48)}px;right:${Math.max(S.marge, 96)}px;transform:translateY(-50%);text-align:center;font-family:'${C.polices.texte.famille}',sans-serif;font-weight:${C.polices.texte.poids};font-size:${S.taille}px;line-height:1.22;color:${S.couleur};letter-spacing:${S.espacement};text-transform:${S.majuscules ? 'uppercase' : 'none'};text-shadow:${S.ombre}${S.couleur && /^#f|^#e|^#d|white|#fff/i.test(S.couleur) ? ', 0 0 1px rgba(0,0,0,.9), 1px 1px 0 rgba(0,0,0,.35), -1px -1px 0 rgba(0,0,0,.35)' : ''}}
.st .fort{font-size:${F.taille}px;margin:0 4px}
.tag{display:inline-block;text-transform:none;letter-spacing:0;background:${E.fond};color:${E.couleur};font-family:'${C.polices.texte.famille}',sans-serif;font-weight:${C.polices.texte.poids};padding:3px 10px;border-radius:4px}
.ti{position:absolute;left:${T.x}px;top:${T.y}px;right:${S.marge}px;font-family:'${C.polices.titre.famille}',sans-serif;font-weight:${C.polices.titre.poids};color:${T.couleur};font-size:${T.taille}px;line-height:1.04;letter-spacing:${T.espacement || '-0.5px'};text-transform:${T.majuscules ? 'uppercase' : 'none'};text-shadow:0 2px 10px rgba(0,0,0,.45)}
.ti .fort{font-size:${T.tailleFort}px}`
  const fort = t => t.replace(/\*([^*]+)\*/g, '<span class="fort">$1</span>')
  // La dernière ligne de pixels reste transparente : une image pleine (page de chapitre) sortirait sinon sans couche alpha,
  // et ffmpeg se fige sans message quand le format change au milieu de la piste d’images.
  const png = async (corps, fichier) => { await page.setContent(`<html><head><style>${css}</style></head><body style="clip-path:inset(0 0 1px 0)">${corps}</body></html>`, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: fichier, omitBackground: true }) }
  const st = join(dir, 'rendu'); mkdirSync(st, { recursive: true })
  await png('', join(st, 'vide.png'))
  const tag = (taille) => P.etiquette ? `<div class="tag" style="font-size:${taille}px;margin-bottom:6px">${P.etiquette}</div>` : ''
  // étincelles ✦ autour du titre du hook
  const etincelles = P.etincelles ? ['left:70px;top:598px;font-size:30px', 'left:350px;top:650px;font-size:22px', 'left:320px;top:860px;font-size:34px'].map(p => `<div style="position:absolute;${p};color:#fff;text-shadow:0 0 8px rgba(255,255,255,.85)">✦</div>`).join('') : ''
  const lignesTitre = (P.titre || '').split('/').reduce((n, l) => n + Math.max(1, Math.ceil(l.replace(/\*/g, '').length / Math.max(6, (650 - T.x) / (T.taille * 0.62)))), 0), hTitre = lignesTitre * T.taille * 1.06 + (P.etiquette ? 34 : 0)
  let echTitre = 1
  if (P.titre && P.titreFixe) {
    let ok = null
    for (const e of [1, 0.85, 0.72, 0.6]) { ok = placer('titre', ZONE.haut + hTitre * e / 2, hTitre * e, 0, TOT - 2.5, 360, 720, null, { essai: true, yMax: 470 }); if (ok != null) { echTitre = e; break } }
    if (ok == null) P.titreFixe = false // pas de place au-dessus de sa tête : le titre ne reste que pendant le hook
  }
  const hautTitre0 = P.titreFixe ? ZONE.haut : T.y
  const hautTitre = P.titre ? (P.titreFixe ? Math.round(poses.at(-1).y0) : Math.round(placer('titre', hautTitre0 + hTitre / 2, hTitre, 0, HOOK) - hTitre / 2)) : hautTitre0
  await png(P.titre && !P.titreTape ? `<div class="ti" style="top:${hautTitre}px;transform:scale(${echTitre});transform-origin:left top">${tag(E.taille)}<div>${fort(P.titre.replace(/\//g, '<br>'))}</div></div>${P.titreFixe ? '' : etincelles}` : '', join(st, 'titre.png'))
  const titreTape = []
  if (P.titre && P.titreTape) {
    // chaque lettre apparaît, les suivantes sont là mais invisibles (rien ne bouge) ; un curseur fin clignote au bout
    const morceaux = P.titre.replace(/\//g, '\n').match(/\*[^*]+\*|[^*]/g) || []
    const lettres = morceaux.flatMap(m => m.startsWith('*') ? [...m.slice(1, -1)].map(c => ({ c, fort: true })) : [{ c: m, fort: false }])
    const duree = Math.min(1.6, HOOK * 0.6), pas = duree / Math.max(1, lettres.length)
    const rendu = (n, curseur) => lettres.map((l, q) => l.c === '\n' ? '<br>' : `<span style="visibility:${q < n ? 'visible' : 'hidden'}"${l.fort ? ' class="fort"' : ''}>${l.c === ' ' ? '&nbsp;' : l.c}</span>`).join('') + (curseur ? '<span style="display:inline-block;width:4px;height:0.9em;background:currentColor;margin-left:3px;vertical-align:-0.1em"></span>' : '')
    for (let n = 1; n <= lettres.length; n += 2) {
      const fichier = join(st, `titre-tape-${n}.png`)
      await png(`<div class="ti" style="top:${hautTitre}px">${tag(E.taille)}<div>${rendu(n, true)}</div></div>`, fichier)
      titreTape.push({ a: (n - 1) * pas, b: Math.min(n + 1, lettres.length) * pas, fichier })
    }
    const fin = join(st, 'titre-tape-fin.png'); await png(`<div class="ti" style="top:${hautTitre}px">${tag(E.taille)}<div>${rendu(lettres.length, false)}</div></div>${etincelles}`, fin)
    titreTape.push({ a: titreTape.at(-1).b, b: HOOK, fichier: fin })
  }
  await png(P.etiquette ? `<div style="position:absolute;left:${Math.max(E.xApres, 48)}px;top:${Math.max(E.yApres, 172)}px">${tag(E.tailleApres)}</div>` : '', join(st, 'etiquette.png'))
  let liste = '', t0 = 0
  // Mot à mot (`motAMot: true`) : la phrase se construit au rythme de
  // la voix ; les mots pas encore dits sont là mais invisibles, pour que rien ne bouge quand ils apparaissent.
  const sansAcc = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  let jm = 0
  let yPrecedent = null
  // pendant une liste animée, les sous-titres se taisent : la liste dit déjà ses mots
  const fenetresEffets = (P.effets || []).map(E => [nt(E.t), nt(E.t) + (E.duree ?? 3)])
  const fenetresListes = (P.listes || []).map(L => { const n = Math.min(5, (L.items || []).length), pas = L.type === 'ticket' ? 0.45 : 0.6; return [nt(L.t), nt(L.t) + (L.duree ?? Math.max(3.5, 1.2 + n * pas + 1.6))] })
  for (let i = 0; i < subs.length; i++) {
    const s = subs[i]
    if (P.titre && s.b <= HOOK + 0.3) continue // le titre du hook = ses mots : il remplace le sous-titre
    if ([...fenetresListes, ...fenetresEffets].some(([a, b]) => s.a < b && s.b > a + 0.05)) continue
    // une phrase à cheval sur la fin du hook n'apparaît qu'une fois le titre parti : sinon les deux se superposent
    if (P.titre && !P.titreFixe && s.a < HOOK) s.a = HOOK
    // En cartons, on ne voit jamais que quelques mots à la fois : c'est le plus long paquet qui compte, pas la phrase
    const mots = s.txt.replace(/\*/g, '').split(/\s+/), n = P.cartons && !P.motAMot ? P.cartons : mots.length
    const visible = Math.max(...Array.from({ length: Math.ceil(mots.length / n) }, (_, k) => mots.slice(k * n, k * n + n).join(' ').length))
    const nbLignes = Math.ceil(visible / Math.max(8, (720 - Math.max(S.marge, 48) - Math.max(S.marge, 96)) / (S.taille * 0.6)))
    const hauteur = nbLignes * S.taille * 1.22 + (s.txt.includes('*') ? F.taille - S.taille : 0)
    const haut = placer('sous-titre', Math.round(1280 * (s.a < HOOK ? S.yHook : S.y)), hauteur, s.a, s.b, 360, 720, s.a >= HOOK ? yPrecedent : null)
    if (s.a >= HOOK) yPrecedent = haut
    const blocs = s.txt.match(/\*[^*]+\*|\S+/g) || []
    const tempsMots = blocs.map((bl, k) => {
      if (!(P.motAMot || P.cartons) || k === 0) return s.a
      const m = sansAcc(bl.replace(/\*/g, '')).split(' ')[0]
      for (let q = jm; q < Math.min(motsEntendus.length, jm + 12); q++) {
        const e = motsEntendus[q]
        if (m && e.t >= s.a - 0.1 && e.t < s.b && (e.m === m || (m.length >= 4 && e.m.slice(0, 4) === m.slice(0, 4)))) { jm = q + 1; return e.t }
      }
      return s.a + (s.b - s.a) * k / blocs.length * 0.85
    })
    for (let k = 1; k < tempsMots.length; k++) tempsMots[k] = Math.min(Math.max(tempsMots[k], tempsMots[k - 1] + 0.06), s.b - 0.05)
    const kFort = blocs.findIndex(bl => bl.startsWith('*')); s.tFort = kFort >= 0 && P.motAMot ? tempsMots[kFort] : s.a
    // cartons : on découpe la phrase en paquets de P.cartons mots (un mot fort reste avec ses voisins)
    const paquets = []; if (P.cartons && !P.motAMot) for (let q = 0; q < blocs.length; q += P.cartons) paquets.push([q, Math.min(blocs.length, q + P.cartons)])
    const etapes = P.motAMot ? blocs.length : paquets.length || 1
    for (let k = 1; k <= etapes; k++) {
      const motFortArrive = P.motAMot && blocs[k - 1]?.startsWith('*')
      const html = (ech = 1) => P.motAMot ? blocs.map((bl, q) => `<span style="visibility:${q < k ? 'visible' : 'hidden'}">${q === k - 1 && ech !== 1 ? fort(bl).replace('class="fort"', `class="fort" style="transform:rotate(${F.rotation}deg) scale(${ech})"`) : fort(bl)}</span>`).join(' ') : paquets.length ? blocs.slice(...paquets[k - 1]).map(fort).join(' ') : fort(s.txt)
      await png(`<div class="st" style="top:${haut}px">${html()}</div>`, join(st, `${i}-${k}.png`))
      const a = P.motAMot ? tempsMots[k - 1] : paquets.length ? (k === 1 ? s.a : tempsMots[paquets[k - 1][0]]) : s.a
      const b = P.motAMot ? (k < etapes ? tempsMots[k] : s.b) : paquets.length ? (k < etapes ? tempsMots[paquets[k][0]] : s.b) : s.b
      if (a > t0 + 0.001) liste += `file 'vide.png'\nduration ${(a - t0).toFixed(3)}\n`
      let debut = Math.max(a, t0)
      if (motFortArrive && b - debut > 0.25) for (const [n, ech] of [[1, 1.35], [2, 1.15]]) {
        await png(`<div class="st" style="top:${haut}px">${html(ech)}</div>`, join(st, `${i}-${k}-pop${n}.png`))
        liste += `file '${i}-${k}-pop${n}.png'\nduration 0.067\n`; debut += 0.067
      }
      liste += `file '${i}-${k}.png'\nduration ${Math.max(0.04, b - debut).toFixed(3)}\n`; t0 = Math.max(t0, b)
    }
  }
  liste += `file 'vide.png'\nduration ${Math.max(0.1, TOT - t0 + 0.5).toFixed(3)}\nfile 'vide.png'\n`
  writeFileSync(join(st, 'liste.txt'), liste)

  // Les petits plus (facultatifs) : compteur pendant le hook, émojis qui popent, carte de fin.
  // Ils vivent sur une seule piste transparente, donc ils ne doivent jamais se chevaucher.
  const plus = [...titreTape]
  const ombre = 'filter:drop-shadow(0 4px 10px rgba(0,0,0,.45))'
  if (P.compteur) {
    const { de = 0, a: jusqua, suffixe = '' } = P.compteur
    const fin = Math.min(HOOK, P.compteur.duree || HOOK * 0.75), n = Math.max(10, Math.round(fin / 0.08))
    let hautCompteur = null, echC = 1
    for (const e of [1, 0.8, 0.65]) { const y = placer('compteur', ZONE.haut + 50 * e, 100 * e, 0, HOOK, 360, 420, null, { essai: true, yMax: 420 }); if (y != null) { hautCompteur = Math.round(y - 50 * e); echC = e; break } }
    if (hautCompteur == null) console.log('Compteur retiré : pas de place au-dessus de sa tête (il aurait touché le visage).')
    else for (let i = 0; i <= n; i++) {
      const v = i === n ? jusqua : Math.round((de + (jusqua - de) * (1 - Math.pow(1 - i / n, 3))) / 100) * 100
      const fichier = join(st, `compteur-${i}.png`)
      await png(`<div style="position:absolute;left:0;right:0;top:${hautCompteur}px;text-align:center"><span class="fort" style="font-family:'${C.polices.titre.famille}',sans-serif;font-weight:${C.polices.titre.poids};font-size:${Math.round((i === n ? 92 : 84) * echC)}px;transform:rotate(-3deg);${ombre}">${v.toLocaleString('fr-FR').replace(/ /g, ' ')}${suffixe}</span></div>`, fichier)
      plus.push({ a: i * fin / n, b: i === n ? HOOK : (i + 1) * fin / n, fichier })
    }
  }
  // Les cartes « modernes » façon téléphone : notification, calendrier, liste cochée. Sinon un émoji seul.
  const sys = `font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif`
  // L'habillage : chaque style a ses goodies (habillages.mjs), dessinés avec la couleur d'accent de l'élève.
  const accent = F.couleur && !/^#?f{3}(f{3})?$/i.test(F.couleur.replace('#', '')) ? F.couleur : (F.contour && !/^#f/i.test(F.contour) ? F.contour : (E.fond || '#e3202a'))
  const HABN = P.habillage || ({ carnet: 'carnet', prof: 'tableau', energie: 'pop', energique: 'pop', confidence: 'doux', doux: 'doux' })[P.style] || null
  const HB = HABN ? habillage(HABN, { accent, sys, emojiImg: (e, n) => emojiImg(e, n), fort }) : null
  const carte = s => {
    // Capture d'écran réaliste (un message de cliente, une stat) : SA vraie capture, jamais une inventée.
    // `{ type: 'capture', t, image: 'captures/dm.png', duree }` (chemin depuis le dossier du projet)
    if (s.type === 'capture') {
      const f = existsSync(join(dir, s.image)) ? join(dir, s.image) : s.image
      const mime = /\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg'
      return `<div style="width:${s.largeur || 430}px;border-radius:26px;overflow:hidden;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.35);transform:rotate(${s.rotation ?? -2}deg);border:6px solid #fff"><img src="data:${mime};base64,${readFileSync(f).toString('base64')}" style="display:block;width:100%;max-height:${s.hauteurMax || 380}px;object-fit:cover;object-position:top"></div>`
    }
    if (HB) { const h = HB.carte(s); if (h) return h }
    if (s.type === 'bulle') return `<div style="${sys};width:520px;background:rgba(255,255,255,.96);border-radius:26px;padding:18px 22px;display:flex;gap:16px;align-items:center">
      <div style="width:58px;height:58px;border-radius:14px;background:${F.couleur};display:flex;align-items:center;justify-content:center;font-size:34px;flex:none">${s.emoji || '💬'}</div>
      <div style="min-width:0"><div style="font-size:21px;font-weight:700;color:#111">${s.titre || C.nom} <span style="font-weight:400;color:#8a8a8a;font-size:18px">· maintenant</span></div>
      <div style="font-size:25px;color:#222;line-height:1.25">${s.texte}</div></div></div>`
    if (s.type === 'calendrier') return `<div style="${sys};width:250px;background:#fff;border-radius:30px;overflow:hidden;text-align:center">
      <div style="background:#ff3b30;color:#fff;font-size:30px;font-weight:700;padding:12px 0;letter-spacing:1px">${s.mois}</div>
      <div style="font-size:120px;font-weight:300;color:#111;line-height:1.05">${s.jour}</div>
      <div style="font-size:21px;color:#666;padding:0 14px 18px">${s.sous || ''}</div></div>`
    if (s.type === 'checklist') return `<div style="${sys};width:430px;background:#fffdf2;border-radius:24px;padding:22px 26px">
      <div style="font-size:28px;font-weight:800;color:#111;margin-bottom:10px">${s.titre}</div>
      ${s.items.map(x => `<div style="font-size:26px;color:#222;padding:5px 0;display:flex;gap:12px;align-items:center"><span style="width:30px;height:30px;border-radius:50%;background:#34c759;color:#fff;font-size:20px;display:inline-flex;align-items:center;justify-content:center">✓</span>${x}</div>`).join('')}</div>`
    // Cartes « capture d'écran » : réalistes, petites, posées sous le visage (jamais dessus).
    if (s.type === 'agenda') {
      const [an, mois] = [s.annee || 2026, s.moisIndex ?? 6]
      const premier = (new Date(an, mois, 1).getDay() + 6) % 7, nb = new Date(an, mois + 1, 0).getDate()
      const cases = [...Array(premier).fill(''), ...Array.from({ length: nb }, (_, i) => i + 1)]
      return `<div style="${sys};width:360px;background:#fff;border-radius:22px;padding:16px 18px 14px">
        <div style="font-size:27px;font-weight:800;color:#ff3b30">${s.mois} <span style="color:#999;font-weight:500">${an}</span></div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:13px;color:#999;margin:8px 0 2px">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<div>${x}</div>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:17px;color:#222;row-gap:3px">${cases.map(j => `<div style="position:relative;height:30px;line-height:28px">${j === (s.debut || 1) ? `<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:#ff3b30;color:#fff;font-weight:700">${j}</span>` : j}${(s.jours || []).includes(j) ? '<span style="position:absolute;left:50%;bottom:-1px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#ff9500"></span>' : ''}</div>`).join('')}</div>
        ${s.evenement ? `<div style="margin-top:10px;border-left:4px solid #ff9500;background:#fff4e5;border-radius:8px;padding:7px 10px;font-size:17px;color:#222">${s.evenement}</div>` : ''}</div>`
    }
    if (s.type === 'notes') return `<div style="${sys};width:360px;background:#fff;border-radius:22px;padding:14px 20px 16px">
      <div style="font-size:16px;color:#e0a800;font-weight:600">‹ Notes</div>
      <div style="font-size:26px;font-weight:800;color:#111;margin:6px 0 8px">${s.titre}</div>
      ${s.items.map((x, n) => `<div style="visibility:${n < (s._vus ?? s.items.length) ? 'visible' : 'hidden'};font-size:20px;color:#222;padding:5px 0;display:flex;gap:10px;align-items:center"><span style="width:24px;height:24px;border-radius:50%;background:#e0a800;color:#fff;font-size:15px;display:inline-flex;align-items:center;justify-content:center;flex:none">✓</span>${x}</div>`).join('')}</div>`
    if (s.type === 'notif') return `<div style="${sys};width:420px;background:rgba(245,245,245,.92);border-radius:22px;padding:12px 16px;display:flex;gap:12px;align-items:center">
      <div style="width:40px;height:40px;border-radius:10px;background:${s.couleur || '#ff9500'};display:flex;align-items:center;justify-content:center;font-size:24px;flex:none">${s.emoji || '⏰'}</div>
      <div style="min-width:0;flex:1"><div style="display:flex;justify-content:space-between;font-size:15px;color:#555"><b style="color:#111">${s.titre}</b><span>maintenant</span></div>
      <div style="font-size:19px;color:#222;line-height:1.25">${s.texte}</div></div></div>`
    // le sticker « sondage » d'Instagram (OUI / NON), pour le pari
    if (s.type === 'sondage') return `<div style="${sys};width:380px;background:#fff;border-radius:22px;padding:18px 18px 16px;text-align:center">
      <div style="font-size:26px;font-weight:800;color:#111;margin-bottom:12px">${s.question}</div>
      ${(s.choix || ['OUI', 'NON']).map((c, n) => `<div style="margin-top:${n ? 8 : 0}px;border-radius:14px;background:#f1f1f1;padding:12px;font-size:24px;font-weight:800;background:${n ? '#f1f1f1' : 'linear-gradient(90deg,#ff7a59,#ff3d7f)'};color:${n ? '#111' : '#fff'}">${c}</div>`).join('')}</div>`
    return `<div style="font-size:110px">${s.emoji}</div>`
  }
  // Un « groupe » : des petits émojis qui popent un par un autour de la personne (jamais sur le visage),
  // chacun avec un clic discret — la touche de créativité.
  // Émojis « modernes » : les dessins Twemoji (polices/emoji/<code>.svg) au lieu de ceux de Windows, jugés « moches ».
  const emojiImg = (e, taille) => {
    const code = [...e].map(c => c.codePointAt(0).toString(16)).filter(c => c !== 'fe0f').join('-')
    const f = join(ICI, 'polices', 'emoji', code + '.svg')
    return existsSync(f) ? `<img src="data:image/svg+xml;base64,${readFileSync(f).toString('base64')}" style="width:${taille}px;height:${taille}px;vertical-align:middle">` : e
  }
  // Avant de dessiner les cartes : chacune est descendue (ou montée) hors du visage, pour toute sa durée.
  const tailleCarte = s => (HB ? [k => k, ([w, h]) => [w + 30, h + 50]][1] : x => x)(({ notif: [420, 90], bulle: [520, 110], agenda: [360, 340], calendrier: [250, 240], sondage: [380, 200], notes: [360, 80 + 36 * (s.items || []).length], checklist: [430, 80 + 42 * (s.items || []).length] })[s.type] || [130, 130])
  const ZONE_X0 = ZONE.gauche, ZONE_X1 = ZONE.droite
  const dansZone = (x, w) => Math.max(ZONE_X0 + w / 2, Math.min(ZONE_X1 - w / 2, x))
  for (const s of P.stickers || []) {
    if (s.type === 'chapitre' || s.type === 'annotation') continue
    // Pastilles : jamais sur le texte ni sur le visage. Sans place à l'endroit prévu, on essaie à côté, puis de l'autre
    // côté ; toujours pas de place ? la pastille saute plutôt que de cacher un mot.
    if (s.type === 'groupe') {
      const hP = HB ? 64 : 52
      s.items = s.items.map((it, k) => {
        const [e, x0, y, ...r] = it, T0 = nt(s.t) + k * (s.pas || 0.45) // chacune n'occupe sa place qu'à partir de son apparition
        for (const xe of [x0, x0 + 90, x0 - 90, 720 - x0, 140, 580]) {
          const x = dansZone(xe, 190), yy = placer('pastille', Math.round(1280 * y), hP, T0, nt(s.t) + (s.duree || 3), x, 190, null, { essai: true })
          if (yy != null) return [e, x, yy / 1280, ...r]
        }
        console.log(`  (pastille « ${r[1] || e} » retirée : pas de place sans toucher le texte ou le visage)`)
        return null
      }).filter(Boolean)
      continue
    }
    // La vraie taille de la carte, mesurée dans le navigateur (rotation et scotch compris) : une estimation
    // trop grande la chassait du dessous des sous-titres, trop petite la faisait déborder sur un mot.
    let [w, h] = tailleCarte(s)
    try {
      await page.setContent(`<html><head><style>${css}</style></head><body><div id="m" style="position:absolute;left:0;top:0;display:inline-block">${carte(s)}</div></body></html>`, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      const r = await page.evaluate(() => { const b = document.getElementById('m').getBoundingClientRect(); let x0 = b.left, y0 = b.top, x1 = b.right, y1 = b.bottom; for (const e of document.querySelectorAll('#m *')) { const q = e.getBoundingClientRect(); if (!q.width || !q.height) continue; x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top); x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom) } return [x1 - x0, y1 - y0] })
      if (r[0] > 20 && r[1] > 20) [w, h] = [Math.ceil(r[0]) + 8, Math.ceil(r[1]) + 8]
    } catch { /* on garde l'estimation */ }
    const T0 = nt(s.t), T1 = T0 + (s.duree || 1.4)
    const st0 = poses.filter(p => p.quoi === 'sous-titre' && p.T1 > T0 && p.T0 < T1).reduce((m, p) => Math.max(m, p.y1), 1280 * S.y + S.taille)
    let pose = null
    // une capture trop réduite ne se lit plus : elle garde au moins 72 % de sa taille, ou cherche une autre place
    const ECH = s.type === 'capture' ? [1, 0.85, 0.72] : [1, 0.85, 0.72, 0.6, 0.5, 0.42]
    for (const ech of ECH) {
      const xx = dansZone(s.x ?? 360, w * ech), yy = placer(`carte ${s.type || s.emoji}`, Math.round(st0 + 24 + h * ech / 2), h * ech, T0, T1, xx, w * ech, null, { sousVisage: true, essai: true, yMin: st0 + 8 })
      if (yy != null) { pose = { x: xx, y: yy, ech }; break }
    }
    // Une carte posée sur un plan sans visage (l'ordi, les mains) qui déborde sur le plan suivant, où elle apparaît :
    // elle s'arrête à la coupe, pour garder sa place sous le texte.
    if (!pose && !visageFinal(T0)) {
      let Tc = null
      for (let T = T0 + 0.7; T <= T1 + 0.13; T += 0.0625) if (visageFinal(T)) { Tc = T; break }
      // sous le texte si possible ; sinon au-dessus : sur ce plan il n'y a pas de visage à protéger
      if (Tc) for (const sous of [true, false]) { for (const ech of ECH) {
        const xx = dansZone(s.x ?? 360, w * ech), yy = placer(`carte ${s.type || s.emoji}`, sous ? Math.round(st0 + 24 + h * ech / 2) : 520, h * ech, T0, Tc - 0.2, xx, w * ech, null, sous ? { sousVisage: true, essai: true, yMin: st0 + 8 } : { essai: true })
        if (yy != null) { pose = { x: xx, y: yy, ech }; s.duree = Tc - 0.2 - T0; break }
      } if (pose) break }
    }
    // Pas de place sous le texte : on cherche ailleurs (au-dessus, sur le côté), toujours sans toucher ni texte ni visage.
    // Toujours rien ? la carte saute : une carte qui cache un mot ou un visage fait plus de tort que pas de carte.
    if (!pose) for (const ech of [0.85, 0.72, 0.6]) {
      const xx = dansZone(s.x ?? 360, w * ech), yy = placer(`carte ${s.type || s.emoji}`, Math.round(1280 * (s.y ?? 0.6)), h * ech, T0, T1, xx, w * ech, null, { essai: true })
      if (yy != null) { pose = { x: xx, y: yy, ech }; break }
    }
    if (!pose) { s._saute = true; console.log(`  (carte « ${s.titre || s.question || s.type} » retirée : pas de place sans cacher le texte ou le visage)`); continue }
    s.x = pose.x; s.y = pose.y / 1280; s.echelle = pose.ech
    // Effet givré : une carte sur un plan sans visage (l'ordi, les mains, un objet) floute l'action derrière elle.
    // `flou: false` dans le projet pour l'empêcher.
    if (s.flou === undefined && !visageFinal(T0) && !visageFinal(T0 + Math.min(1, (s.duree || 1.4) / 2))) s.flou = true
  }
  if (process.env.MONTAGE_SEGS) { for (const g of infos) console.log(g.o.toFixed(2), g.a.toFixed(2), g.b.toFixed(2), g.k ?? 1); process.exit(0) }
  if (process.env.MONTAGE_VISAGES) { for (let T = 0; T < TOT; T += 0.5) console.log(T.toFixed(1), JSON.stringify(visageFinal(T)?.map(Math.round) ?? null)); process.exit(0) }
  if (process.env.MONTAGE_POSES) { console.log(JSON.stringify(poses.map(p => [p.quoi, ...[p.T0, p.T1].map(v => +v.toFixed(2)), ...[p.x0, p.x1, p.y0, p.y1].map(Math.round)]))); process.exit(0) } // pour vérifier les places sans tout monter
  for (const [i, s] of (P.stickers || []).entries()) {
    if (s.type !== 'groupe') continue
    const debut = nt(s.t), fin = debut + (s.duree || 3), pas = s.pas || 0.45
    // [émoji, x, y, rotation, étiquette] : avec une étiquette, une petite pastille blanche « émoji + mot »
    const pastille = ([e, x, y, r = -6, mot], dernier) => `<div style="position:absolute;left:${x}px;top:${Math.round(1280 * y)}px;transform:translate(-50%,-50%) rotate(${r}deg) scale(${dernier ? 1.06 : 1});${ombre}">${HB ? HB.pastille([e, mot]) : mot
      ? `<div style="${sys};display:flex;gap:8px;align-items:center;background:#fff;border-radius:999px;padding:8px 16px 8px 10px;font-size:21px;font-weight:700;color:#222;white-space:nowrap">${emojiImg(e, 34)}${mot}</div>`
      : emojiImg(e, 70)}</div>`
    for (let n = 1; n <= s.items.length; n++) {
      const fichier = join(st, `groupe-${i}-${n}.png`)
      await png(s.items.slice(0, n).map((it, k) => pastille(it, k === n - 1)).join(''), fichier)
      const a = debut + (n - 1) * pas
      plus.push({ a, b: n === s.items.length ? fin : a + pas, fichier, son: s.son || 'pop', leger: true })
    }
  }
  // Page de chapitre (« 1. », « étape 2 ») : plein écran 1,2 s, animée selon le style (habillages.mjs)
  for (const [i, s] of (P.stickers || []).entries()) {
    if (s.type !== 'chapitre') continue
    const hb = HB || habillage('carnet', { accent, sys, emojiImg: (e, n) => emojiImg(e, n), fort })
    const t = nt(s.t), duree = s.duree || 1.2
    // une vraie animation : l'entrée en 0,5 s à 15 images/s, puis la page continue de vivre jusqu'à la fin
    const ENTREE = Math.min(0.5, duree * 0.45), pas = 1 / 15, n1 = Math.round(ENTREE / pas), n2 = Math.max(1, Math.round((duree - ENTREE) / pas))
    for (let j = 0; j < n1 + n2; j++) {
      const part = j < n1 ? (j + 1) / n1 : 1 + (j - n1 + 1) / n2, fichier = join(st, `chapitre-${i}-${j}.png`)
      await png(hb.chapitre(s.numero ?? i + 1, s.titre || '', part), fichier)
      plus.push({ a: t + j * pas, b: j < n1 + n2 - 1 ? t + (j + 1) * pas : t + duree, fichier, son: j === 0 && (s.son || 'photo') })
    }
  }
  for (const [i, s] of (P.stickers || []).entries()) {
    if (s.type === 'groupe' || s.type === 'chapitre' || s.type === 'annotation' || s._saute) continue
    const t = nt(s.t), duree = s.duree || 1.4
    const rebond = s.type ? [[0.88, 0.04], [1.03, 0.05], [1, duree - 0.09]] : [[0.5, 0.05], [1.2, 0.07], [1, duree - 0.12]] // une capture « se pose », un émoji « pope »
    for (const [j, [ech, dt]] of rebond.entries()) {
      const fichier = join(st, `sticker-${i}-${j}.png`)
      await png(`<div style="position:absolute;left:${s.x ?? 520}px;top:${Math.round(1280 * (s.y ?? 0.4))}px;transform:translate(-50%,-50%) scale(${ech * (s.echelle || 1)}) rotate(${s.rotation ?? (s.type ? 0 : -8)}deg);${ombre}">${carte(s.progressif ? { ...s, _vus: 0 } : s)}</div>`, fichier)
      const a = j === 0 ? t : plus.at(-1).b
      plus.push({ a, b: a + dt, fichier, son: j === 0 && (s.son || { notif: 'cloche', bulle: 'cloche', agenda: 'photo', calendrier: 'photo', notes: 'photo', checklist: 'photo', capture: 'photo' }[s.type] || 'pop') })
    }
  }
  // Le carnet vivant : un mot écrit au feutre et une flèche tracée à la main vers ce qu'elle montre (son agenda,
  // son classeur). `{ type: 'annotation', t, duree, texte, vers: [x, y] }`, la cible en pixels de l'image finale
  // (720x1280). Le mot se pose à côté de la cible, jamais sur son visage ni sur un sous-titre ; la flèche se dessine.
  for (const [i, s] of (P.stickers || []).entries()) {
    if (s.type !== 'annotation' || !s.vers) continue
    const t = nt(s.t), duree = s.duree || 1.8, [cx, cy] = s.vers
    const w = Math.min(460, 40 + s.texte.length * 30), h = 84
    let pos = null
    for (const [dx, dy] of [[-190, -170], [190, -170], [-190, 170], [190, 170], [0, -210], [0, 210], [-230, 0], [230, 0]]) {
      const x = Math.max(ZONE.gauche + w / 2, Math.min(ZONE.droite - w / 2, cx + dx)), y = cy + dy
      const r = placer('annotation', y, h, t, t + duree, x, w, null, { essai: true })
      // si le mot a dû glisser jusque sur la cible, la flèche ne montre plus rien : place suivante
      // (un essai réussi réserve déjà la place : on la garde telle quelle, ou on la rend)
      if (r != null && Math.abs(r - y) < 50 && Math.hypot(x - cx, r - cy) > 130) { pos = [x, r]; break }
      if (r != null) poses.pop()
    }
    if (!pos) { console.log(`  (annotation « ${s.texte} » retirée : pas de place sans toucher le texte ou le visage)`); continue }
    const [bx, by] = pos; if (process.env.MONTAGE_ANNOT) console.log('annotation', s.texte, pos, s.vers)
    // départ de la flèche : le bord du mot côté cible ; arrivée : 22 px avant la cible ; une courbe à main levée
    const sx = bx + Math.sign(cx - bx) * Math.min(w / 2, Math.abs(cx - bx)) * 0.8, sy = by + Math.sign(cy - by) * h / 2
    const ang = Math.atan2(cy - sy, cx - sx), ex = cx - 22 * Math.cos(ang), ey = cy - 22 * Math.sin(ang)
    const mx = (sx + ex) / 2 + 40 * Math.sin(ang), my = (sy + ey) / 2 - 40 * Math.cos(ang)
    const pointe = a => `M${(ex - 26 * Math.cos(ang - a)).toFixed(1)} ${(ey - 26 * Math.sin(ang - a)).toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${(ex - 26 * Math.cos(ang + a)).toFixed(1)} ${(ey - 26 * Math.sin(ang + a)).toFixed(1)}`
    const trait = `stroke="${accent}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"`
    for (const [j, part] of [0.3, 0.65, 1].entries()) {
      const fichier = join(st, `annotation-${i}-${j}.png`)
      await png(`<svg width="720" height="1280" style="position:absolute;inset:0;overflow:visible;filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 2px #fff)"><path d="M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${(100 * (1 - part)).toFixed(1)}" ${trait}/>${part >= 1 ? `<path d="${pointe(0.45)}" ${trait}/>` : ''}</svg>
        <div style="position:absolute;left:${bx}px;top:${by}px;transform:translate(-50%,-50%) rotate(-4deg);font-family:'Main',cursive;font-weight:700;font-size:66px;color:${accent};white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 4px #fff,0 2px 8px rgba(0,0,0,.25)">${s.texte}</div>`, fichier)
      plus.push({ a: t + j * 0.08, b: j < 2 ? t + (j + 1) * 0.08 : t + duree, fichier, son: j === 0 && (s.son || 'clic') })
    }
  }
  // Une liste qui s'écrit ligne par ligne, avec un petit clic à chaque ligne.
  for (const [i, s] of (P.stickers || []).entries()) {
    if (!(s.type === 'notes' || s.type === 'checklist') || !s.progressif || s._saute) continue
    const debut = nt(s.t), fin = debut + (s.duree || 2.4)
    const dernier = plus.filter(p => p.a >= debut - 0.01 && p.a < fin).at(-1)
    const pas = Math.min(0.4, (fin - debut - 0.3) / (s.items.length + 1))
    dernier.b = debut + 0.3
    for (let n = 1; n <= s.items.length; n++) {
      const fichier = join(st, `sticker-${i}-ligne-${n}.png`)
      await png(`<div style="position:absolute;left:${s.x ?? 520}px;top:${Math.round(1280 * (s.y ?? 0.4))}px;transform:translate(-50%,-50%) scale(${s.echelle || 1});${ombre}">${carte({ ...s, _vus: n })}</div>`, fichier)
      const a = debut + 0.3 + (n - 1) * pas
      plus.push({ a, b: n === s.items.length ? fin : a + pas, fichier, son: 'clic', leger: true })
    }
  }
  // Les listes animées (listes.mjs) quand elle énumère : posées là où il y a de la place, jamais sur son visage ;
  // dessinées à 15 images par seconde le temps de l'animation, puis la dernière image reste.
  const sonsListes = []
  for (const [k, L] of (P.listes || []).entries()) {
    const borne = (x, a, b) => Math.max(a, Math.min(b, x)), dx = x => 1 - Math.pow(1 - borne(x, 0, 1), 3)
    const rb = x => { x = borne(x, 0, 1); const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
    const Lm = listeAnimee(L, { clamp: borne, doux: dx, rebond: rb, esc: x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'), couleurs: { accent, coche: accent, etiquette: '#D62B2B', tampon: accent, ...(P.couleursListe || {}) } })
    if (!Lm) continue
    const t0 = nt(L.t), fin = Math.min(TOT, t0 + Lm.duree), y = Math.round(placer('liste', 760, Lm.hauteur, t0, fin) - Lm.hauteur / 2)
    const IPS = 15, nImg = Math.ceil(Lm.anim * IPS)
    for (let j = 0; j <= nImg; j++) {
      const fichier = join(st, `liste-${k}-${j}.png`); await png(Lm.dessin(j / IPS, y), fichier)
      plus.push({ a: t0 + j / IPS, b: j < nImg ? t0 + (j + 1) / IPS : fin, fichier })
    }
    for (const x of Lm.sons(t0)) if (x.fam === 'clavier') for (let u = 0; u < x.duree; u += 0.16) sonsListes.push(['clic', x.t + u]); else sonsListes.push([x.fam, x.t])
  }
  // Les effets ponctuels (effets.mjs) : choc et commentaires en haut, capture et avant/après plus bas, jamais sur son visage
  for (const [k, E] of (P.effets || []).entries()) {
    const borne = (x, a, b) => Math.max(a, Math.min(b, x)), dx = x => 1 - Math.pow(1 - borne(x, 0, 1), 3)
    const rb = x => { x = borne(x, 0, 1); const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
    const decor = E.type === 'duo' && (!E.couleur || E.couleur === 'auto') ? couleurDecor(spawnSync('ffmpeg', ['-v', 'error', '-ss', String(E.t), '-i', join(dir, 'source.mp4'), '-frames:v', '1', '-vf', 'scale=36:64', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']).stdout, null) : null
    const Em = effetPonctuel(E, { clamp: borne, doux: dx, rebond: rb, esc: x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;'), dossier: dir, couleurs: { marqueur: E.couleur || '#FFE14D', contour: '#2b2416', feutre: accent, decor } })
    if (!Em) continue
    const t0 = nt(E.t), fin = Math.min(TOT, t0 + Em.duree), haut = E.type === 'choc' || E.type === 'commentaires'
    const y = Math.round(placer('effet', haut ? 260 : 780, Em.hauteur, t0, fin) - Em.hauteur / 2)
    const IPS = 15, nImg = Math.ceil(Em.anim * IPS)
    for (let j = 0; j <= nImg; j++) { const fichier = join(st, `effet-${k}-${j}.png`); await png(Em.dessin(j / IPS, y), fichier); plus.push({ a: t0 + j / IPS, b: j < nImg ? t0 + (j + 1) / IPS : fin, fichier }) }
    for (const x of Em.sons(t0)) sonsListes.push([x.fam, x.t])
  }
  if (P.carteFin) {
    const fichier = join(st, 'carte-fin.png')
    // « léger » : juste du texte avec une ombre douce et deux étincelles, pas de gros bandeau (« disgracieux »)
    await png(HB ? `<div style="position:absolute;left:48px;right:96px;top:${Math.round(placer('carte de fin', 230, 70, TOT - (P.carteFin.duree || 2.5), TOT) - 35)}px">${HB.carteFin(P.carteFin.texte)}</div>` : P.carteFin.style === 'leger'
      ? `<div style="position:absolute;left:0;right:0;top:${Math.round(placer('carte de fin', 215, 56, TOT - (P.carteFin.duree || 2.5), TOT) - 28)}px;text-align:center;font-family:'${C.polices.titre.famille}',sans-serif;font-weight:${C.polices.titre.poids};font-size:38px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5);letter-spacing:-0.3px"><span style="font-size:24px">✦</span> ${fort(P.carteFin.texte)} <span style="font-size:24px">✦</span></div>`
      : `<div style="position:absolute;left:0;right:0;top:200px;text-align:center"><span class="tag" style="font-size:50px;padding:12px 26px;border-radius:10px;${ombre}">${fort(P.carteFin.texte)}</span></div>`, fichier)
    plus.push({ a: TOT - (P.carteFin.duree || 2.5), b: TOT + 0.5, fichier, son: P.carteFin.son || 'magie' })
  }
  plus.sort((x, y) => x.a - y.a)
  // Deux pistes calculées image par image (30/s). Ce qui se chevauche (titre tapé + compteur) va sur la seconde,
  // pour être vu en même temps. Avant, une seule piste : chaque chevauchement ajoutait un bout de durée, les images
  // prenaient jusqu'à 0,7 s de retard sur les sons, et une carte restait affichée sur le visage après la coupe.
  const NB = Math.ceil((TOT + 0.5) * 30), pistes = [new Array(NB).fill('vide.png'), new Array(NB).fill('vide.png')]
  for (const p of plus) {
    const f0 = Math.max(0, Math.round(p.a * 30)), f1 = Math.min(NB, Math.max(f0 + 1, Math.round(p.b * 30)))
    const libre = pistes.find(im => im.slice(f0, f1).every(x => x === 'vide.png')) || pistes[0]
    for (let f = f0; f < f1; f++) libre[f] = basename(p.fichier)
  }
  pistes.forEach((image, n) => {
    let lp = ''
    for (let f = 0; f < NB;) { let g = f; while (g < NB && image[g] === image[f]) g++; lp += `file '${image[f]}'\nduration ${((g - f) / 30).toFixed(4)}\n`; f = g }
    writeFileSync(join(st, n ? 'plus-2.txt' : 'plus.txt'), lp + `file 'vide.png'\n`)
  })
  await nav.close()
  // 4. Sons : la banque choisie par Aurélie (sons/), rangée par familles ; chaque famille tourne pour varier.
  const SONS = readdirSync(join(ICI, 'sons')).filter(x => x.endsWith('.wav')).map(x => x.slice(0, -4))
  const son = sonneur(SONS, P.sons, P.style) // (06/11) ses sons à elle : "sons" dans projet.json (pack, ou un son par famille) ; null = famille coupée
  const iPlus = 4 + SONS.length // la piste des petits plus vient après tous les sons
  const flous = (P.stickers || []).filter(s => s.flou).map(s => `between(t,${nt(s.t).toFixed(2)},${(nt(s.t) + (s.duree || 2)).toFixed(2)})`)
  if (process.env.MONTAGE_FLOUS) { console.log(flous); process.exit(0) }
  // givré : flou + un voile clair, pour que la carte se détache comme posée sur une vitre dépolie
  if (flous.length) f += `[cv]boxblur=${px(14)}:2:enable='${flous.join('+')}',eq=brightness=0.07:saturation=0.8:enable='${flous.join('+')}'[cvf];`
  // Passage en noir et blanc sur une phrase : `noirEtBlanc: [[début, fin]]` en temps d'origine.
  const nb = (P.noirEtBlanc || []).map(([x, y]) => `between(t,${nt(x).toFixed(2)},${nt(y).toFixed(2)})`)
  let base = flous.length ? 'cvf' : 'cv'
  if (nb.length) { f += `[${base}]hue=s=0:enable='${nb.join('+')}',eq=contrast=1.08:enable='${nb.join('+')}'[cvn];`; base = 'cvn' }
  // Titre DERRIÈRE la personne : on détoure la personne image par image sur la fenêtre
  // du titre, on pose le titre sur l'image, puis on remet la personne par-dessus.
  // Mode portrait (`portrait: [[début, fin]]`, temps d'origine) : sur LA phrase forte, le décor se floute et elle
  // reste nette, comme une photo portrait d'iPhone. Il partage le détourage du titre derrière la tête.
  const TD = P.titreDerriere
  let entreesTD = []
  const fenetres = [] // [début, fin] en temps final, là où il faut détourer la personne
  let W = 0
  if (TD) {
    // le titre s'arrête au premier changement de plan (sinon il « traîne » sur le plan suivant)
    const coupe1 = coupes.map(nt).filter(t => t > 0.5).sort((x, y) => x - y)[0] ?? HOOK
    W = TD.fin != null ? nt(TD.fin) : Math.min(HOOK, coupe1 - 0.04)
    fenetres.push([0, W])
  }
  const PORTRAIT = (P.portrait || []).map(([x, y]) => [nt(x), nt(y)]).filter(([x, y]) => y - x > 0.3)
  fenetres.push(...PORTRAIT)
  if (fenetres.length) {
    // Le détourage se fait sur la vidéo DÉJÀ cadrée (zooms compris) : sinon la silhouette ne tombe pas pile sur elle.
    const base = join(st, 'base.mp4')
    lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-filter_complex', fSegments + '[voix]anullsink', '-map', '[cv]', '-c:v', 'libx264', '-crf', '16', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', base])
    const dt = join(st, 'detour'); rmSync(dt, { recursive: true, force: true }); mkdirSync(dt, { recursive: true })
    const NBm = Math.ceil(TOT * 30) + 2, piste = new Array(NBm).fill(null)
    for (const [k, [x, y]] of fenetres.entries()) {
      const d = join(dt, `f${k}`)
      spawnSync('node', [join(ICI, 'detourage', 'detourer.mjs'), base, x.toFixed(3), y.toFixed(3), d], { stdio: 'inherit' })
      readdirSync(d).filter(z => z.startsWith('masque-')).sort().forEach((m, j) => { const fr = Math.round(x * 30) + j; if (fr < NBm) piste[fr] = join(d, m) })
    }
    // hors des fenêtres : un masque noir (personne de détourée), image par image comme la piste des petits plus
    lancer('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=720x1280', '-frames:v', '1', '-pix_fmt', 'gray', join(st, 'masque-noir.png')])
    let lm = ''
    for (let i = 0; i < NBm;) { let j = i; while (j < NBm && piste[j] === piste[i]) j++; lm += `file '${(piste[i] || join(st, 'masque-noir.png')).replace(/\\/g, '/')}'\nduration ${((j - i) / 30).toFixed(4)}\n`; i = j }
    writeFileSync(join(st, 'masques.txt'), lm + `file '${join(st, 'masque-noir.png').replace(/\\/g, '/')}'\n`)
  }
  if (TD) {
    const s = TD.style || {}
    await (async () => {
      const nav2 = await ouvrirNavigateur(); const pg = await nav2.newPage(); await pg.setViewport({ width: 720, height: 1280 })
      await pg.setContent(`<html><head><style>${css}</style></head><body><div style="position:absolute;left:0;right:0;top:${s.top ?? 70}px;text-align:center;font-family:'${C.polices.titre.famille}',sans-serif;font-weight:${C.polices.titre.poids};font-size:${s.taille ?? 260}px;line-height:.86;letter-spacing:${s.espacement ?? '-8px'};color:${s.couleur || T.couleur};text-shadow:0 6px 24px rgba(0,0,0,.18)">${fort(TD.texte.replace(/\//g, '<br>'))}</div></body></html>`, { waitUntil: 'load' })
      await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: join(st, 'derriere.png'), omitBackground: true }); await nav2.close()
    })()
  }
  if (fenetres.length) {
    // une seule piste de masques pour tout : derrière elle le titre (ou le flou), puis elle, nette, par-dessus
    // Passe à part : mêlé au grand montage, le split + alphamerge bloquait ffmpeg sans un mot (9 h figé). Seul, 11 s.
    const flouP = PORTRAIT.map(([x, y]) => `between(t,${x.toFixed(2)},${y.toFixed(2)})`).join('+')
    let g = '[0:v]split=2[dx][dy];', fondD = 'dx'
    if (flouP) { g += `[dx]boxblur=${px(16)}:2:enable='${flouP}',eq=brightness=-0.04:enable='${flouP}'[dfl];`; fondD = 'dfl' }
    if (TD) { g += `[${fondD}][2:v]overlay=0:0:enable='lt(t,${W.toFixed(3)})':shortest=1[dti];`; fondD = 'dti' }
    g += `[1:v]fps=30,format=gray,scale=${CADRE}[dm];[dy][dm]alphamerge[dp];[${fondD}][dp]overlay=0:0:eof_action=pass[dto]`
    const detoure = join(st, 'detoure.mp4')
    lancer('ffmpeg', ['-y', '-v', 'error', '-i', join(st, 'base.mp4'), '-f', 'concat', '-safe', '0', '-i', join(st, 'masques.txt'), ...(TD ? ['-loop', '1', '-i', join(st, 'derriere.png')] : []),
      '-filter_complex', g, '-map', '[dto]', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', detoure])
    entreesTD = ['-i', detoure]
    f += `[${base}]nullsink;[${iPlus + 1}:v]fps=30[dto];`
    base = 'dto'
  }
  f += `[1:v]fps=30,format=rgba[st];[${base}][st]overlay=0:0[c1];[c1][2:v]overlay=0:0:enable='lt(t,${(P.titreFixe ? (P.carteFin ? TOT - (P.carteFin.duree || 2.5) : TOT + 1) : HOOK).toFixed(3)})'[c2];[c2][3:v]overlay=0:0:enable='${P.titreFixe ? 'lt(t,0)' : `gte(t,${HOOK.toFixed(3)})`}'[c3];[${iPlus}:v]fps=30,format=rgba[pl];[c3][pl]overlay=0:0[c4];[${iPlus + 1 + entreesTD.filter(x => x === '-i').length}:v]fps=30,format=rgba[pl2];[c4][pl2]overlay=0:0[vo];`

  // Chaque son accompagne ce qu'on voit, rien pendant le hook, jamais sur un mot fort.
  const ev = []
  if (OUV) ev.push([son('whoosh'), HOOK - 0.2, VOL_SON]) // passage de l'ouverture au début de la vidéo
  coupes.map(nt).filter(t => t > HOOK + 0.3).forEach(t => ev.push([son('whoosh'), t - 0.2, VOL_SON]))
  let k = 0, d = 0
  subs.forEach((s, i) => {
    if (s.a < HOOK) return
    if (s.tags.includes('montee')) ev.push([son('whoosh'), s.a - 0.5, VOL_SON])
    if (s.tags.includes('ding')) ev.push([son('kaching'), s.b, VOL_SON])
    else if (s.tags.includes('pop') && !plus.some(p => p.son && Math.abs(p.a - s.a) < 0.4)) ev.push([son('pop'), s.a, VOL_SON]) // pop seulement là où on l'a demandé (#pop) : « y en a trop »
  })
  P.clavier.forEach(t => ev.push(['clavier-court', nt(t), VOL_CLAVIER]))
  // chaque arrivée d'une carte a son son (photo, cloche, magie…), pile à l'image où elle apparaît (et pas de pop en même temps)
  plus.filter(p => p.son).forEach(p => ev.push([son(p.son), p.son === (P.carteFin?.son || 'magie') && p.a > TOT - 4 ? Math.max(p.a, TOT - 0.8) : p.a, 0.35])) // la carte de fin sonne APRÈS le dernier mot
  sonsListes.forEach(([fam, t]) => ev.push([son(fam), t, P.volLegers ?? 0.12]))
  if (P.compteur) ev.push([son('kaching'), HOOK + 0.05, VOL_SON]) // le « ka-ching » APRÈS la question du hook, jamais dessus
  // Placement choisi à la main (avec jugeote) : il remplace tout le placement automatique.
  if (P.sonsChoisis) {
    ev.splice(0, ev.length, ...P.sonsChoisis.map(([t, n, v = 0.3]) => [n, t, v]))
    // les petits pops/clics des émojis et des lignes qui s'écrivent restent, très légers
    plus.filter(p => p.leger).forEach(p => ev.push([son(p.son), p.a, P.volLegers ?? 0.12]))
  }
  // « un petit clic à défi » : un clic de souris très discret à l'arrivée de chaque mot rouge (après le hook)
  // le clic tombe quand le mot rouge APPARAÎT (en mot à mot, c'est au milieu de la phrase, pas à son début)
  if (P.clicsMotsForts) subs.filter(s => s.a >= HOOK && s.txt.includes('*') && !plus.some(p => p.son && Math.abs(p.a - (s.tFort ?? s.a)) < 0.4)).forEach(s => ev.push([son('clic'), s.tFort ?? s.a, P.clicsMotsForts]))
  writeFileSync(join(dir, 'sons-places.txt'), ev.slice().sort((x, y) => x[1] - y[1]).map(([n, t]) => `${t.toFixed(1).padStart(5)} s  ${n}`).join(String.fromCharCode(10)) + String.fromCharCode(10))
  ev.splice(0, ev.length, ...ev.filter(([n]) => n && SONS.includes(n))) // une famille coupée ou vide ne sonne pas
  ev.forEach(([n, t, v], j) => { const ms = Math.max(0, Math.round(t * 1000)); f += `[${4 + SONS.indexOf(n)}:a]adelay=${ms}|${ms},volume=${v}[s${j}];` })
  f += `[voix]${ev.map((_, j) => `[s${j}]`).join('')}amix=inputs=${ev.length + 1}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[ao]`

  // 5. Rendu
  const n = readdirSync(dir).filter(x => /-v\d+\.mp4$/.test(x)).length + 1
  const sortie = join(dir, `${nom}-v${n}.mp4`)
  if (alertesVisage.length) console.log(`⚠️ VISAGE : pas de place libre pour ${alertesVisage.join(', ')} → à déplacer à la main (x / y dans projet.json) ou à raccourcir`)
  else if (VIS.length) console.log('Visage : rien ne le touche (sous-titres, titre, cartes vérifiés image par image).')
  console.log(`${segs.length} morceaux · ${TOT.toFixed(1)} s (origine ${D.toFixed(1)} s) · ${subs.length} sous-titres · hook jusqu'à ${HOOK.toFixed(1)} s · ${ev.length} sons`)
  lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-f', 'concat', '-safe', '0', '-i', join(st, 'liste.txt'), '-loop', '1', '-i', join(st, 'titre.png'), '-loop', '1', '-i', join(st, 'etiquette.png'),
    ...SONS.flatMap(s => ['-i', join(ICI, 'sons', s + '.wav')]), '-f', 'concat', '-safe', '0', '-i', join(st, 'plus.txt'), ...entreesTD, '-f', 'concat', '-safe', '0', '-i', join(st, 'plus-2.txt'), '-filter_complex', f, '-map', '[vo]', '-map', '[ao]', '-t', TOT.toFixed(3),
    ...ENCODAGE, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', sortie])
  verifier(sortie, dir, RETIRER.length > 0)
  console.log(`\nVidéo : ${sortie}`)
}

// ── verifier : on réécoute TOUT avant de la montrer ───────────────────────────
function verifier(video, dir, raccourci = false) {
  const flux = lancer('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,duration', '-of', 'csv=p=0', video]).trim().split(/\r?\n/)
  const [dv, da] = ['video', 'audio'].map(t => +(flux.find(l => l.startsWith(t)) || ',0').split(',')[1])
  const wav = join(dir, 'controle.wav')
  lancer('ffmpeg', ['-y', '-v', 'error', '-i', video, '-ar', '16000', '-ac', '1', wav])
  const mots = transcrireMots(wav, join(dir, 'controle'))
  const avant = JSON.parse(readFileSync(join(dir, 'mots.json'), 'utf8')).transcription.filter(s => /\w/.test(s.text)).length
  const fin = mots.filter(m => m.t > dv - 4).map(m => m.txt).join(' ')
  const trous = mots.slice(1).map((m, i) => [mots[i].fin, m.t]).filter(([a, b]) => b - a > 3)
  console.log(`\nContrôle : image ${dv.toFixed(2)} s / son ${da.toFixed(2)} s · ${mots.length} mots entendus sur ${avant} à l'origine`)
  console.log(`Fin entendue : « …${fin} »`)
  const planche = video.replace(/\.mp4$/, '-planche.jpg')
  let plat; try { plat = JSON.parse(readFileSync(join(dir, 'projet.json'), 'utf8')).plateforme } catch {}
  lancer('ffmpeg', ['-y', '-v', 'error', '-i', video, '-vf', `fps=12/${Math.max(1, dv).toFixed(2)},scale=720:1280,${dessinZones(zonesPlateforme(plat))},scale=180:-1,tile=6x2`, '-frames:v', '1', planche])
  if (existsSync(planche)) console.log(`Planche de contrôle : ${planche} (12 images, en rouge ce que l'appli recouvre : à regarder avant de la montrer)`)
  if (Math.abs(dv - da) > 0.15) console.log('⚠️  image et son n\'ont pas la même durée : synchro à vérifier')
  // l'œil du monteur : une image trop sombre, un son qui sature, une fin qui coupe le dernier mot
  const lum = (lancer('ffmpeg', ['-v', 'error', '-i', video, '-vf', 'fps=2,scale=72:128,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { sortie: true }) || '').match(/YAVG=([\d.]+)/g) || []
  const sombres = lum.map((x, k) => [k / 2, +x.split('=')[1]]).filter(([, v]) => v < 38)
  if (sombres.length >= 3) console.log('⚠️  image très sombre à ' + [...new Set(sombres.map(([t]) => Math.floor(t)))].slice(0, 6).join(', ') + ' s : propose-lui l\'option "image": ["lumineux"]')
  const pic = (lancer('ffmpeg', ['-v', 'info', '-i', video, '-af', 'astats=metadata=0', '-f', 'null', '-'], { sortie: true }) || '').match(/Peak level dB:\s*(-?[\d.]+)/)
  if (pic && +pic[1] > -0.3) console.log('⚠️  le son sature par moments (pic à ' + pic[1] + ' dB)')
  const dernier = mots.at(-1); if (dernier && dernier.fin > dv - 0.08) console.log('⚠️  la vidéo s\'arrête juste sur le dernier mot : vérifie qu\'il n\'est pas coupé')
  if (!raccourci && mots.length < avant * 0.9) console.log('⚠️  il manque des mots : écouter avant de montrer')
  if (trous.length) console.log('⚠️  silence de plus de 3 s à ' + trous.map(([a]) => a.toFixed(1) + ' s').join(', '))
}

const [cmd, ...args] = process.argv.slice(2)
if (cmd === 'lire') lire(...args)
else if (cmd === 'monter') await monter(args[0])
else if (cmd === 'apercu') { process.env.APERCU = '1'; await monter(args[0]) }
else if (cmd === 'verifier') verifier(args[0], dirname(args[0]))
else console.log('Usage :\n  node contenu/montage/montage.mjs lire <video> <charte> [nom]\n  node contenu/montage/montage.mjs monter <nom>')
