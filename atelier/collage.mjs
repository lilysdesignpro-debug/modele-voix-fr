// LE STYLE « COLLAGE » : des mots qui s'animent au rythme de la voix, du papier, du fait main.
// Appelé par montage.mjs quand projet.json dit "style": "collage". Il reçoit la vidéo déjà coupée et
// cadrée (rendu/base-av.mp4) et rendu/collage-entree.json (phrases, mots entendus, visage, table des temps).
//
// Ce que la vidéo reçoit :
//  - sous-titres minuscules, un mot à la fois, écrits à la main, calés à gauche à hauteur d'épaule ;
//  - le titre du hook en trois voix (petit italique / énorme serif / fin manuscrite), DERRIÈRE sa tête ;
//  - les mots forts (*mot*) en géant, derrière sa tête, au moment où elle les dit ;
//  - collage.etiquettes : [{ t, texte }]            une bande de papier tapée à la machine ;
//  - collage.barres     : [{ t, texte, puis }]      tapée, barrée au feutre rouge, puis la correction ;
//  - collage.carnet     : { t, titre, items, duree } une page de carnet qui tombe, la liste s'écrit ;
//  - collage.medaillon  : [[début, fin]]            elle rétrécit dans un médaillon sur papier, ses mots en escalier ;
//  - collage.fin        : { t, motCle }             le mot-clé se tape dans une barre de commentaire.
// Tous les temps sont ceux de la vidéo d'origine, comme le reste de projet.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { remplirBandes } from './bandes.mjs'
import { ECHELLE, LARG, HAUT, CADRE, TAILLE, px as pxV, pxPair as pxP, ENCODAGE } from './echelle.mjs'
import { zones as zonesPlateforme } from './marges.mjs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { liste as listeNotes } from './listes.mjs'
import { objetDerriere, fondLiege, photosPunaisees, objet, MESURES, dessusDuBord, faceAvant } from './effets2.mjs'
import { sonneur } from './sons-choix.mjs'
import { effet, POLICES_EFFETS, couleurDecor } from './effets.mjs'
import { etoileGonflee, etoileTrait, etoileBlanche, nuage } from './decor.mjs'

const FPS = 30
const COUL = { beurre: '#F4EC9C', tomate: '#D9473A', bordeaux: '#3B1424', papier: '#F6F1E6', encre: '#2B1B17', kraft: '#C69C6D' }

export async function monterCollage({ nom, dir, P, C, ouvrirNavigateur, lancer, verifier, ICI }) {
  const st = join(dir, 'rendu'), E = JSON.parse(readFileSync(join(st, 'collage-entree.json'), 'utf8'))
  const { TOT, HOOK } = E, K = P.collage || {}
  const HOOK_ST = (K.titre?.grand || String(P.titre || '').replace(/[*/s]/g, '')) ? HOOK : 0 // sans hook, pas de silence au début
  if (K.bandes !== false) { const rb = remplirBandes(join(st, 'base-av.mp4'), { lancer }); if (rb.segments.length) console.log('Bandes noires remplies : ' + rb.segments.length + ' passage(s), sans les légendes coupées') }
  const coul = { ...COUL, ...(K.couleurs || {}) }
  const tf = t => E.temps[Math.min(E.temps.length - 1, Math.max(0, Math.round(t / 0.05)))] // temps d'origine → temps final
  const FV = K.fondVert && (K.fondVert.images || []).length ? K.fondVert : null, kFV = FV ? Math.min(0.75, Math.max(0.4, FV.taille || 0.56)) : 1
  const wFV = Math.round(720 * kFV / 2) * 2, hFV = Math.round(1280 * kFV / 2) * 2, xFV = FV?.cote === 'droite' ? 720 - wFV - 20 : Math.round((720 - wFV) / 2), yFV = 1280 - hFV
  const visBrut = t => E.visages[Math.min(E.visages.length - 1, Math.max(0, Math.round(t * 10)))]
  const A0FV = FV ? tf(Math.min(...FV.images.map(I => I.t))) : 0, TRFV = 0.5
  const FINFV = FV && FV.fin != null ? tf(FV.fin) : 1e9
  const kFVat = t => !FV || t < A0FV || t >= FINFV ? 1 : t >= A0FV + TRFV ? kFV : 1 - (1 - kFV) * (1 - Math.pow(1 - (t - A0FV) / TRFV, 3))
  const vis = t => { const v = visBrut(t); if (!v || !FV) return v; const k = kFVat(t), f = kFV < 1 ? (1 - k) / (1 - kFV) : 0, x = xFV * f, y = yFV * f; return [v[0] * k + x, v[1] * k + y, v[2] * k + x, v[3] * k + y] }
  const visages = (a, b) => { const l = []; for (let t = a; t <= b; t += 0.1) { const v = vis(t); if (v) l.push(v) } return l }
  const hautTete = (a, b) => Math.min(...visages(a, b).map(v => v[1]), 1280)
  const basVisage = (a, b) => Math.max(...visages(a, b).map(v => v[3]), 0)
  const N = Math.ceil(TOT * FPS)
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
  const doux = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3)
  const rebond = x => { x = clamp(x, 0, 1); const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

  // ── Les mots, chacun avec son temps : le texte relu des sous-titres, calé sur les mots entendus ──
  const sans = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  const pareil = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4))
  const phrases = E.phrases.slice(0, -1).map((p, i) => ({ ...p, b: E.phrases[i + 1].a, txt: p.txt.replace(/#\w+/g, '').trim() })).filter(p => p.b > p.a + 0.05 && p.txt)
  const mots = []; let j = 0
  for (const [ip, p] of phrases.entries()) {
    const brut = p.txt.split(/\s+/).filter(Boolean); let fort = false
    const ici = brut.map(w => { const debut = w.startsWith('*'), finF = /\*[,.;:!?»]*$/.test(w); if (debut) fort = true; const m = { w: w.replace(/\*/g, ''), fort, ip, t: null }; if (finF) fort = false; return m })
    for (const m of ici) {
      const s = sans(m.w); if (!s) continue
      for (let k = j; k < Math.min(E.mots.length, j + 12); k++) if (pareil(E.mots[k].m, s.split(' ')[0]) && E.mots[k].t >= p.a - 0.8 && E.mots[k].t <= p.b + 0.5) { m.t = E.mots[k].t; j = k + 1; break }
    }
    // les mots non retrouvés : répartis entre leurs voisins
    ici.forEach((m, k) => { if (m.t == null) { const av = ici.slice(0, k).reverse().find(x => x.t != null)?.t ?? p.a; const ap = ici.slice(k + 1).find(x => x.t != null)?.t ?? p.b; const n = ici.slice(k + 1).findIndex(x => x.t != null); m.t = av + (ap - av) / ((n < 0 ? ici.length - k : n + 1) + 1) } })
    ici.forEach((m, k) => { m.t = Math.max(p.a, m.t); if (k && m.t <= ici[k - 1].t) m.t = ici[k - 1].t + 0.06 })
    mots.push(...ici)
  }
  mots.forEach((m, k) => { m.fin = Math.min(mots[k + 1]?.t ?? TOT, m.t + 0.9) })

  // ── Les éléments : chacun a sa fenêtre, son calque (derrière elle ou devant), son dessin à l'instant t ──
  const el = [], sons = [], GEANTS_POP = [] // pop : les fenêtres des mots géants (le sous-titre s'y tait)
  const MED = (K.medaillon || []).map(([a, b]) => [tf(a), tf(b)])
  const dansMed = t => MED.some(([a, b]) => t >= a && t < b)

  // Trois styles partagent ce moteur, chacun avec SA typographie et SES animations :
  //  « collage »   : papier, scotch, feutre, gros serif beurre, phrases manuscrites en bas ;
  //  « pop »       : couleurs franches, gros mots ronds qui claquent, étoiles, carte inclinée sur fond bleu, arc, noir et blanc ;
  //  « editorial » : magazine, une seule famille serrée en minuscules + un mot en italique, titres rose poudré derrière
  //                  la tête, entrées en flou vers net, étalonnage chaud, presque aucun son.
  const THEME = ({ pop: 'pop', editorial: 'editorial', doux: 'doux', confidence: 'doux', aurelie: 'aurelie', typo: 'typo', witchy: 'witchy', chic: 'chic', luxe: 'luxe', automne: 'automne', cosy: 'automne', studio: 'studio' })[P.style] || 'collage'
  // luxe (06/11, validé par Aurélie) : le chic en plus premium : serif italique fin, or pâle, verre dépoli, étalonnage chaud et grain
  const LUXE = THEME === 'luxe', CHIC = THEME === 'chic' || LUXE, OR = '#E3C38A'
  // le verre dépoli : le navigateur ne voit pas la vidéo, donc ffmpeg floute la vidéo elle-même sous chaque carte (x, y, l, h en 720, a et b en secondes)
  const VERRES = []
  const VERRE = 'background:linear-gradient(160deg,rgba(60,42,30,.30),rgba(30,20,14,.38));backdrop-filter:blur(26px) saturate(1.5) brightness(1.04);-webkit-backdrop-filter:blur(26px) saturate(1.5) brightness(1.04);box-shadow:inset 0 1px 0 rgba(255,255,255,.75),inset 0 0 0 1px rgba(255,255,255,.28),0 24px 50px rgba(30,15,5,.22)'
  const PALETTE = { pop: { fond: '#7DB3E8', mot: '#6FA3DE', marine: '#2B3F6B', etoile: '#F2C94C', rose: '#F4A6C4' }, editorial: { rose: '#F2B8AE', bordeaux: '#6B1E24', peche: '#F6C7A8', nuit: '#2A0306' } }[THEME] || {}
  // typo : sa couleur signature + quatre couleurs vives qui tournent d'un mot fort à l'autre (surchargeables)
  if (THEME === 'typo') Object.assign(PALETTE, { mot: coul.mot || C?.motFort?.couleur || '#F4E04D', jaune: '#F4E04D', lilas: '#C9B8FF', cyan: '#8FE3EA', rose: '#FFB8D6' }, K.couleurs || {})
  const PALETTE_LISTE = { accent: coul.mot || C?.motFort?.couleur || '#2E9E5B', etiquette: '#D62B2B', tampon: coul.mot || C?.motFort?.couleur || '#C62828', ...(K.couleursListe || {}) }
  if (THEME === 'witchy') { const sig = coul.mot || C?.motFort?.couleur || '#6B2F7A', v = parseInt(sig.replace('#', '').slice(0, 6), 16) || 0x6B2F7A, mix = (f, b) => '#' + [v >> 16, (v >> 8) & 255, v & 255].map(c => Math.round(c * f + b).toString(16).padStart(2, '0')).join('')
    Object.assign(PALETTE, { or: '#E9C77B', prune: mix(0.32, 4), nuit: mix(0.5, 8), creme: '#F6E7C8' }, K.couleurs || {}) } // witchy : la nuit prend SA couleur signature, assombrie ; tout se surcharge avec collage.couleurs
  if (CHIC) Object.assign(PALETTE, { sable: '#EFE6DA', cacao: '#3B2A22', accent: LUXE ? OR : coul.mot || C?.motFort?.couleur || '#B98B6E' }, K.couleurs || {}) // chic : SA couleur signature pour le mot fort
  const OMBRE = 'text-shadow:0 1px 2px rgba(0,0,0,.6),0 2px 18px rgba(0,0,0,.5)' // chic : ombre douce, lisible sur un mur clair
  if (THEME === 'automne') Object.assign(PALETTE, { creme: '#FFF3DF', brun: '#4A2412', rouille: '#B4481C', ocre: '#E3A03A' }, K.couleurs || {}) // automne : crème, brun, rouille, ocre
  if (THEME === 'studio') { const sig = coul.mot || C?.motFort?.couleur || '#5A0E1A', v = parseInt(sig.replace('#', '').slice(0, 6), 16) || 0x5A0E1A, mix = f => '#' + [v >> 16, (v >> 8) & 255, v & 255].map(c => Math.round(c * f).toString(16).padStart(2, '0')).join('')
    const studioClair = K.clair === true
    // sur le blanc, une couleur pâle ne se lit pas : on la fonce jusqu'à ce qu'elle tienne (clarté < 45 %)
    let encreC = v; for (let k = 0; k < 12; k++) { const L = (0.2126 * (encreC >> 16) + 0.7152 * ((encreC >> 8) & 255) + 0.0722 * (encreC & 255)) / 255; if (L < 0.35) break; encreC = [encreC >> 16, (encreC >> 8) & 255, encreC & 255].map(c => Math.round(c * 0.85)).reduce((x, c) => x * 256 + c, 0) }
    const encreS = '#' + encreC.toString(16).padStart(6, '0')
    Object.assign(PALETTE, studioClair ? { fond: '#F3F1ED', trait: '#2a2a2a22', creme: '#F7EAD9', encre: encreS, soleil: '#FFC400' } : { fond: mix(0.45), trait: mix(1.0) + '55', creme: '#F7EAD9', soleil: '#F3D58C' }, K.couleurs || {})
    PALETTE.encre = PALETTE.encre || PALETTE.creme; PALETTE.ombreS = studioClair ? 'none' : null } // studio : le fond prend SA couleur, assombrie
  if (THEME === 'pop') Object.assign(PALETTE, K.couleurs || {}) // pop : ses couleurs à elle si sa charte le demande
  if (THEME === 'editorial') {
    // les couleurs viennent de la vidéo : la teinte moyenne du décor, déclinée en pâle (titres), soutenu et nuit (fond)
    let R = 0, G = 0, B = 0, n = 0
    for (const x of [0.12, 0.3, 0.48, 0.66, 0.84]) { const o = spawnSync('ffmpeg', ['-v', 'error', '-ss', (x * TOT).toFixed(2), '-i', join(st, 'base-av.mp4'), '-frames:v', '1', '-vf', 'scale=1:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']); if (o.stdout?.length >= 3) { R += o.stdout[0]; G += o.stdout[1]; B += o.stdout[2]; n++ } }
    const [r0, g0, b0] = n ? [R / n / 255, G / n / 255, B / n / 255] : [0.6, 0.45, 0.4], mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0)
    let h = 0; if (mx !== mn) { const d = mx - mn; h = mx === r0 ? ((g0 - b0) / d) % 6 : mx === g0 ? (b0 - r0) / d + 2 : (r0 - g0) / d + 4; h = (h * 60 + 360) % 360 }
    const hsl = (s, l) => `hsl(${Math.round(h)} ${s}% ${l}%)`
    Object.assign(PALETTE, { rose: hsl(72, 76), peche: hsl(80, 68), fonce: hsl(58, 36), bordeaux: hsl(52, 30), nuit: hsl(55, 9) }, K.couleurs || {})
    // un titre regarde ce qu'il y a SOUS lui à ce moment-là : fond clair → la teinte foncée, sinon la pâle
    PALETTE.sous = (t, y0, y1) => { const y = Math.max(0, Math.round(y0)), h = Math.max(20, Math.min(1280 - y, Math.round(y1 - y0)))
      const o = spawnSync('ffmpeg', ['-v', 'error', '-ss', Math.max(0, t).toFixed(2), '-i', join(st, 'base-av.mp4'), '-frames:v', '1', '-vf', `crop=iw:${Math.min(HAUT - pxV(y), pxV(h))}:0:${pxV(y)},scale=1:1:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
      const l = o.stdout?.length >= 3 ? (0.2126 * o.stdout[0] + 0.7152 * o.stdout[1] + 0.0722 * o.stdout[2]) / 255 : 0
      return l > 0.42 ? PALETTE.fonce : PALETTE.rose }
  }
  const etoile = (taille, couleur, extra = '') => `<svg width="${taille}" height="${taille}" viewBox="0 0 100 100" style="${extra}"><path d="M50 4 61 37 96 38 68 59 78 94 50 73 22 94 32 59 4 38 39 37Z" fill="${couleur}"/></svg>`

  const WI = {
    etoile4: (x, y, z, o = 1) => '<svg style="position:absolute;left:' + x + 'px;top:' + y + 'px;opacity:' + o + ';filter:drop-shadow(0 0 6px ' + PALETTE.or + ')" width="' + z + '" height="' + z + '" viewBox="0 0 100 100"><path d="M50 2 C53 40 60 47 98 50 C60 53 53 60 50 98 C47 60 40 53 2 50 C40 47 47 40 50 2Z" fill="' + PALETTE.or + '"/></svg>',
    croissant: (x, y, z) => '<svg style="position:absolute;left:' + x + 'px;top:' + y + 'px;filter:drop-shadow(0 0 10px ' + PALETTE.or + 'aa)" width="' + z + '" height="' + z + '" viewBox="0 0 100 100"><path d="M62 8 A44 44 0 1 0 92 70 A36 36 0 1 1 62 8Z" fill="none" stroke="' + PALETTE.or + '" stroke-width="3"/></svg>',
    lunes: (y, cache = 1) => '<div style="position:absolute;left:0;right:0;top:' + y + 'px;display:flex;justify-content:center;gap:22px;opacity:' + cache + '">' + [0, 0.25, 0.5, 0.75, 1].map((f, k) => '<svg width="38" height="38" viewBox="0 0 40 40" style="filter:drop-shadow(0 0 6px ' + PALETTE.or + '88)"><circle cx="20" cy="20" r="16" fill="none" stroke="' + PALETTE.or + '" stroke-width="1.6"/>' + (k === 4 ? '<circle cx="20" cy="20" r="16" fill="' + PALETTE.or + '"/>' : k === 0 ? '' : '<path d="M20 4 A16 16 0 0 1 20 36 A' + (16 * Math.abs(1 - 2 * f)) + ' 16 0 0 ' + (f < 0.5 ? 0 : 1) + ' 20 4Z" fill="' + PALETTE.or + '"/>') + '</svg>').join('') + '</div>',
    constellation: (x, y) => '<svg style="position:absolute;left:' + x + 'px;top:' + y + 'px" width="200" height="180" viewBox="0 0 220 200"><g stroke="' + PALETTE.or + '" stroke-width="1.6" fill="none" opacity=".85"><path d="M20 40 L80 20 L130 70 L190 50 M130 70 L110 150 L170 180"/></g>' + [[20, 40], [80, 20], [130, 70], [190, 50], [110, 150], [170, 180]].map(([a, b]) => '<circle cx="' + a + '" cy="' + b + '" r="4.5" fill="' + PALETTE.or + '"/>').join('') + '</svg>',
  }
  // witchy : un voile prune très léger, plus sombre en haut et sur les bords, comme une pièce à la bougie
  if (THEME === 'witchy') el.push({ a: 0, b: TOT, calque: 'devant', dessin: () => '<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 45%,' + PALETTE.prune + '00,' + PALETTE.prune + '6b 78%)"></div><div style="position:absolute;inset:0;background:linear-gradient(' + PALETTE.prune + '73,' + PALETTE.prune + '00 30%)"></div>' })

  if (THEME === 'witchy') {
    // POUSSIÈRE D'ÉTOILES et orbes de lumière, sur le calque de derrière : elles passent derrière elle
    const hasard = k => { const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }
    const grains = Array.from({ length: 46 }, (_, k) => ({ x: hasard(k) * 720, y0: hasard(k + 99) * 1280, v: 14 + hasard(k + 7) * 26, z: 3 + hasard(k + 3) * 7, ph: hasard(k + 5) * 6.28, etoile: k % 4 === 0 }))
    const orbes = Array.from({ length: 7 }, (_, k) => ({ x: hasard(k + 200) * 640, y: 120 + hasard(k + 300) * 900, r: 40 + hasard(k + 400) * 70, ph: hasard(k + 500) * 6.28 }))
    el.push({ a: 0, b: TOT, calque: 'derriere', dessin: t => orbes.map(o => '<div style="position:absolute;left:' + (o.x + Math.sin(t * 0.3 + o.ph) * 30).toFixed(1) + 'px;top:' + (o.y + Math.cos(t * 0.25 + o.ph) * 24).toFixed(1) + 'px;width:' + o.r * 2 + 'px;height:' + o.r * 2 + 'px;border-radius:50%;background:radial-gradient(circle,rgba(246,226,170,.30),rgba(233,199,123,.10) 45%,rgba(233,199,123,0) 70%);opacity:' + (0.55 + 0.45 * Math.sin(t * 0.8 + o.ph)).toFixed(2) + '"></div>').join('')
      + grains.map(g => { const y = ((g.y0 - g.v * t) % 1280 + 1280) % 1280, sc = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + g.ph)), x = g.x + Math.sin(t * 0.7 + g.ph) * 12
        return g.etoile ? WI.etoile4(x.toFixed(1), y.toFixed(1), Math.round(g.z * 3.2), sc.toFixed(2))
          : '<div style="position:absolute;left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;width:' + g.z.toFixed(1) + 'px;height:' + g.z.toFixed(1) + 'px;border-radius:50%;background:#FFF3D1;opacity:' + sc.toFixed(2) + ';box-shadow:0 0 ' + (g.z * 2).toFixed(0) + 'px ' + PALETTE.or + '"></div>' }).join('') })
    // l'étoile filante du hook, tout en haut de l'image
    el.push({ a: 0.6, b: 2.2, calque: 'devant', dessin: t => { const p = clamp((t - 0.6) / 1.2, 0, 1), x = 700 - 760 * p, y = 40 + 90 * p, o = Math.sin(p * Math.PI)
      return '<div style="position:absolute;left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;width:220px;height:3px;transform:rotate(-7deg);transform-origin:0 50%;background:linear-gradient(90deg,#fff,' + PALETTE.or + ' 30%,rgba(233,199,123,0));opacity:' + o.toFixed(2) + ';box-shadow:0 0 10px ' + PALETTE.or + '"></div>' + WI.etoile4((x - 14).toFixed(1), (y - 14).toFixed(1), 30, o.toFixed(2)) } })
    sons.push({ t: 0.6, fam: 'magie', vol: 0.05 })
  }

  // 1. Sous-titres
  if (THEME === 'collage') {
  // la phrase entière, écrite à la main, en bas (le mot à mot ne se lisait pas, dit Aurélie)
  // Le bas (880 à 980) leur est réservé : rien d'autre ne s'y pose. Le *mot fort* prend la couleur beurre.
  el.push({ a: 0, b: TOT, calque: 'devant', dessin: t => {
    if (t < HOOK_ST || el.some(e => e.parle && t >= e.a && t < e.b) || dansMed(t)) return ''
    const p = phrases.find(p => t >= p.a && t < p.b); if (!p) return ''
    const html = esc(p.txt).replace(/\*([^*]+)\*/g, `<span style="display:inline-block;font:900 54px/1 Gros,serif;letter-spacing:-0.02em;color:${coul.beurre};-webkit-text-stroke:0;transform:rotate(-3deg) translateY(-4px);margin:0 4px">$1</span>`)
    const enBas = basVisage(p.a, p.b) < 870
    return `<div style="position:absolute;left:60px;right:104px;${enBas ? 'bottom:300px' : 'top:180px'};text-align:center;font:500 66px/0.95 Main,cursive;color:#fff;-webkit-text-stroke:1.2px #fff;text-shadow:0 2px 6px rgba(0,0,0,.7),0 0 2px rgba(0,0,0,.6)">${html}</div>`
  } })
  }
  if (THEME === 'typo') {
  // typo : les sous-titres restent sobres (la phrase entière, en petit gras), c'est le mot fort qui fait le spectacle
  el.push({ a: 0, b: TOT, calque: 'devant', dessin: t => {
    if (t < HOOK_ST || el.some(e => e.parle && t >= e.a && t < e.b) || el.some(e => e.zone === 'geant' && t >= e.a && t < e.b)) return ''
    const p = phrases.find(p => t >= p.a && t < p.b); if (!p) return ''
    const html = esc(p.txt).replace(/\*([^*]+)\*/g, `<span style="color:${PALETTE.mot}">$1</span>`)
    const enBas = basVisage(p.a, p.b) < 870
    return `<div style="position:absolute;left:70px;right:110px;${enBas ? 'bottom:300px' : 'top:180px'};text-align:center;text-wrap:balance;font:600 36px/1.2 Poppins,sans-serif;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6),0 0 2px rgba(0,0,0,.6)">${html}</div>`
  } })
  }
  if (THEME === 'pop') {
  // la phrase se construit mot à mot en échelle (petits mots en serif fin, mots pleins en gros rond) et RESTE
  // affichée jusqu'à la suivante : on la lit en entier. Le *mot fort* en bleu, plus gros, entre deux étoiles jaunes.
  const OUTILS = /^(le|la|les|l'|un|une|des|de|du|d'|et|ou|à|au|aux|en|dans|sur|pour|par|que|qui|qu'|ce|c'|ça|je|j'|tu|il|elle|on|nous|vous|ils|elles|me|m'|te|t'|se|s'|ne|n'|pas|mon|ma|mes|ton|ta|tes|son|sa|ses|est|a|y)$/i
  el.push({ a: 0, b: TOT, calque: 'devant', dessin: t => {
    if (t < HOOK_ST || el.some(e => e.parle && t >= e.a && t < e.b) || dansMed(t) || GEANTS_POP.some(([a, b]) => t >= a && t < b)) return ''
    const p = phrases.find(p => t >= p.a && t < p.b); if (!p) return ''
    const ici = mots.filter(m => m.ip === phrases.indexOf(p)), dits = ici.filter(m => t >= m.t)
    if (!dits.length) return ''
    const dernierPlein = [...dits].reverse().find(m => !OUTILS.test(m.w.replace(/[,.;:!?]/g, '')))
    const html = ici.map(m => { const vu = t >= m.t, w = esc(m.w), petit = OUTILS.test(m.w.replace(/[,.;:!?]/g, ''))
      const pv = rebond((t - m.t) / 0.12), style = `display:inline-block;opacity:${vu ? 1 : 0};transform:scale(${vu ? 0.88 + 0.12 * pv : 1});margin:0 7px`
      if (m.fort) return `<span style="${style};position:relative;font:900 74px/1.05 Rond,sans-serif;color:${PALETTE.mot};-webkit-text-stroke:2px #fff;paint-order:stroke fill">${etoile(30, PALETTE.etoile, 'position:absolute;left:-26px;bottom:2px;transform:rotate(-12deg)')}${w}${etoile(26, PALETTE.etoile, 'position:absolute;right:-22px;top:-6px;transform:rotate(14deg)')}</span>`
      if (petit) return `<span style="${style};font:italic 400 34px/1.05 Ital,serif;color:#EAF2FB">${w}</span>`
      return `<span style="${style};font:900 54px/1.05 Rond,sans-serif;color:${m === dernierPlein ? '#fff' : '#E4E7EC'}">${w}</span>`
    }).join(' ')
    const enBas = basVisage(p.a, p.b) < 830
    return `<div style="position:absolute;left:56px;right:100px;${enBas ? 'bottom:300px' : 'top:180px'};text-align:center;text-transform:lowercase;letter-spacing:-0.02em;filter:drop-shadow(0 0 1.5px #2B3F6B) drop-shadow(0 0 1.5px #2B3F6B) drop-shadow(0 3px 8px rgba(0,0,0,.3));">${html}</div>`
  } })
  }
  if (THEME === 'editorial') {
  // la légende de magazine : un filet fin, puis la phrase en Didone (Bodoni), le *mot fort* en italique.
  // TOUJOURS en bas (zone réservée) : plus rien ne peut s'y chevaucher. Elle se tait quand une citation la dit déjà.
  el.push({ a: 0, b: TOT, calque: 'devant', dessin: t => {
    if (t < HOOK_ST || el.some(e => e.parle && t >= e.a && t < e.b) || dansMed(t) || el.some(e => e.zone === 'citation' && t >= e.a && t < e.b)) return ''
    const p = phrases.find(p => t >= p.a && t < p.b); if (!p) return ''
    const pv = doux((t - p.a) / 0.2)
    const html = esc(p.txt).replace(/\*([^*]+)\*/g, `<span style="font:italic 400 48px/1 Didot,serif;color:${PALETTE.rose}">$1</span>`)
    return `<div style="position:absolute;left:70px;right:110px;bottom:300px;text-align:center;opacity:${pv}">
      <div style="width:${70 * pv}px;height:1.5px;background:#fff;margin:0 auto 14px"></div>
      <div style="font:500 38px/1.15 DidotT,sans-serif;letter-spacing:-0.01em;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.45)">${html}</div></div>`
  } })
  }

  if (THEME === 'doux' || THEME === 'witchy') {
  // « doux » (luxe, intime) : l'image reste naturelle, un seul mot à la fois au centre de la poitrine, en serif fin,
  // comme si elle parlait à l'oreille ; le mot fort passe en italique, à la couleur de sa charte.
  const accent = THEME === 'witchy' ? PALETTE.or : coul.mot || C?.motFort?.couleur || '#E8B4A0'
  const finCarte = K.fin?.motCle ? tf(K.fin.t ?? TOT - 3.5) : TOT
  el.push({ a: 0, b: TOT, calque: 'devant', dessin: t => {
    if (t < HOOK_ST || el.some(e => e.parle && t >= e.a && t < e.b) || el.some(e => e.duo && t >= e.a && t < e.b)) return ''
    const p = phrases.find(p => t >= p.a && t < p.b); if (!p) return ''
    // pendant la carte « écris-moi », ses dernières phrases restent sous-titrées, juste sous la carte
    if (THEME === 'witchy' && dansMed(t)) return '' // la carte de tarot porte la phrase
    if (THEME === 'witchy' && t >= finCarte) return '' // witchy : le sceau de lune prend la place
    const sousCarte = t >= finCarte ? clamp(basVisage(finCarte, TOT) + 30, 560, 760) + 175 : null
    const q = Math.min(doux((t - p.a) / 0.3), 1 - clamp((t - (p.b - 0.15)) / 0.15, 0, 1)), y = sousCarte ?? clamp(basVisage(p.a, p.b) + 130, 620, 900)
    // le mot fort s'allume au moment où elle le DIT (italique, couleur de sa charte, fin contour blanc)
    const forts = mots.filter(m => m.fort && m.t >= p.a - 0.05 && m.t < p.b), dit = forts.length && t >= forts[0].t - 0.05
    // le mot fort : quand elle le DIT, il grossit d'un coup avec un petit rebond, s'allume à sa couleur, une lueur
    // passe et une étoile scintille à côté (luxe, mais « waouh »)
    const pw = forts.length ? (t - forts[0].t + 0.05) / 0.45 : 0, r = clamp(rebond(pw), 0, 1.2), lueur = Math.max(0, 1 - Math.abs(pw - 0.6) / 0.6), pe = clamp((t - forts[0]?.t) / 0.9, 0, 1)
    const etoileFort = `<svg width="34" height="34" viewBox="0 0 100 100" style="position:absolute;right:-30px;top:-14px;opacity:${Math.sin(pe * Math.PI).toFixed(3)};transform:scale(${(0.4 + 0.8 * Math.sin(pe * Math.PI)).toFixed(3)}) rotate(${(pe * 90).toFixed(1)}deg)"><path d="M50 0 C54 38 62 46 100 50 C62 54 54 62 50 100 C46 62 38 54 0 50 C38 46 46 38 50 0Z" fill="#fff"/></svg>`
    const html = esc(p.txt).replace(/\*([^*]+)\*/g, (_, w) => dit
      ? `<span style="position:relative;display:inline-block;margin:0 6px;font:italic 500 ${Math.round(46 + 40 * Math.min(1, r))}px/1 DouxI,serif;color:${accent};${THEME === 'witchy' ? '' : '-webkit-text-stroke:5px #fff;paint-order:stroke fill;'}transform:scale(${(0.85 + 0.15 * r).toFixed(3)});text-shadow:0 0 ${Math.round(THEME === 'witchy' ? 14 + 20 * lueur : 28 * lueur)}px ${accent},0 2px 18px rgba(0,0,0,.35)">${w}${etoileFort}</span>`
      : `<span style="font:italic 500 46px/1 DouxI,serif">${w}</span>`)
    const gerbe = THEME === 'witchy' && dit && pe < 1 ? Array.from({ length: 9 }, (_, k) => { const a = k / 9 * 6.28 + 0.4, d = 30 + 90 * doux(pe), o = Math.sin(pe * Math.PI)
      return WI.etoile4((360 + Math.cos(a) * d * 1.8 - 8).toFixed(1), (y + 20 + Math.sin(a) * d * 0.7 - 8).toFixed(1), 12 + (k % 3) * 5, (o * 0.9).toFixed(2)) }).join('') : ''
    return `<div style="position:absolute;left:70px;right:110px;top:${y}px;text-align:center;text-wrap:balance;font:600 44px/1.18 Doux,serif;letter-spacing:0.01em;color:${THEME === 'witchy' ? PALETTE.creme : '#fff'};opacity:${q};transform:translateY(${(1 - q) * 6}px);text-shadow:0 1px 3px rgba(0,0,0,.7),0 2px 20px rgba(0,0,0,.65)">${html}</div>` + gerbe
  } })
  // l'en-tête discret, comme un magazine : son @ à gauche, le sujet à droite (seulement si elle les donne)
  if (K.entete) el.push({ a: HOOK, b: TOT, calque: 'devant', dessin: t => {
    const q = doux((t - HOOK) / 0.6)
    return `<div style="position:absolute;left:46px;right:110px;top:84px;display:flex;justify-content:space-between;font:500 19px/1 Poppins,sans-serif;letter-spacing:0.16em;color:#fff;opacity:${0.85 * q};text-shadow:0 1px 8px rgba(0,0,0,.5)"><span>${esc(K.entete.gauche || '')}</span><span>${esc(K.entete.droite || '')}</span></div>`
  } })
  }

  if (CHIC) {
  // sous-titres phrase par phrase sous son visage, sans-serif fin ; le mot fort s'écrit en italique à SA couleur,
  // un fin trait se dessine dessous au moment où elle le dit
  const finChic = K.fin?.motCle ? tf(K.fin.t ?? TOT - 3.5) : TOT
  el.push({ a: HOOK, b: finChic, calque: 'devant', dessin: t => {
    if ((K.produits || []).some(pr => t >= tf(pr.t) && t < tf(pr.t + (pr.duree || 3.2)))) return '' // l'étiquette produit porte déjà ses mots
    if (el.some(e => e.parle && t >= e.a && t < e.b)) return '' // (06/11) pendant une liste, une grille, un duo… ses mots sont déjà à l'écran
    const p = phrases.find(p => t >= p.a && t < p.b); if (!p) return ''
    const q = Math.min(doux((t - p.a) / 0.3), 1 - clamp((t - (p.b - 0.15)) / 0.15, 0, 1)), y = clamp(basVisage(p.a, p.b) + 120, 640, 960)
    const forts = mots.filter(m => m.fort && m.t >= p.a - 0.05 && m.t < p.b), pw = forts.length ? clamp((t - forts[0].t + 0.05) / 0.5, 0, 1) : 0
    if (LUXE) return '<div style="position:absolute;left:60px;right:100px;top:' + y + 'px;text-align:center;text-wrap:balance;font:italic 400 42px/1.12 Didot,serif;color:#fff;opacity:' + q + ';transform:translateY(' + ((1 - q) * 6).toFixed(1) + 'px);text-shadow:0 1px 1px rgba(0,0,0,.25),0 6px 24px rgba(0,0,0,.3)">' + esc(p.txt).replace(/\*([^*]+)\*/g, (_, w) => '<span style="color:' + (pw > 0 ? OR : '#fff') + '">' + w + '</span>') + '</div>'
    const html = esc(p.txt).replace(/\*([^*]+)\*/g, (_, w) => '<span style="position:relative;display:inline-block;margin:0 4px;font:italic 500 ' + Math.round(48 + 8 * doux(pw)) + 'px/1 DouxI,serif;color:' + (pw > 0 ? PALETTE.accent : '#fff') + ';' + OMBRE + '">' + w
      + '<span style="position:absolute;left:4%;bottom:-6px;height:1.5px;width:' + (92 * doux(pw)).toFixed(1) + '%;background:' + PALETTE.accent + ';box-shadow:0 1px 4px rgba(0,0,0,.3)"></span></span>')
    return '<div style="position:absolute;left:70px;right:110px;top:' + y + 'px;text-align:center;text-wrap:balance;font:500 31px/1.35 ChicS,sans-serif;color:#fff;opacity:' + q + ';transform:translateY(' + ((1 - q) * 6).toFixed(1) + 'px);' + OMBRE + '">' + html + '</div>'
  } })
  if (K.entete) el.push({ a: HOOK, b: TOT, calque: 'devant', dessin: t => '<div style="position:absolute;left:46px;right:110px;top:84px;display:flex;justify-content:space-between;font:500 17px/1 ChicS,sans-serif;letter-spacing:0.28em;color:#fff;opacity:' + (0.85 * doux((t - HOOK) / 0.6)) + ';' + OMBRE + '"><span>' + esc(K.entete.gauche || '') + '</span><span>' + esc(K.entete.droite || '') + '</span></div>' })
  }

  // la feuille d'automne (érable), dessinée une fois ; teinte au choix
  const feuille = (x, y, z, rot, couleur, o = 1) => '<svg style="position:absolute;left:' + x + 'px;top:' + y + 'px;opacity:' + o + ';transform:rotate(' + rot + 'deg);filter:drop-shadow(0 3px 6px rgba(60,20,0,.35))" width="' + z + '" height="' + z + '" viewBox="0 0 100 100"><path d="M50 4 L58 26 L74 16 L70 38 L92 34 L80 50 L96 60 L72 64 L78 84 L58 72 L52 96 L48 96 L42 72 L22 84 L28 64 L4 60 L20 50 L8 34 L30 38 L26 16 L42 26 Z" fill="' + couleur + '"/><path d="M50 30 L50 96" stroke="rgba(0,0,0,.25)" stroke-width="2"/></svg>'
  // automne : les polices changent d'une vidéo à l'autre (tirées de son nom de projet), ou celles qu'elle choisit (collage.polices)
  const POLICES_AUTOMNE = { titre: { fraunces: [900, 'Gros,serif', 1, , 0.8], dmserif: [400, 'Display,serif', 0.95, , 0.45], anton: [400, 'Anton,sans-serif', 1.25, , 0.6], bricolage: [800, 'DidotG,sans-serif', 1, , 0.7], montserrat: [900, 'Rond,sans-serif', 0.95, , 0.75] }, mots: { caveat: [700, 'Annot,cursive', 1, , 0.55], gloria: [400, 'Carnet,cursive', 0.8, , 0.6], fredoka: [700, 'Fred,sans-serif', 0.85, , 0.8], reenie: [500, 'Main,cursive', 1.15, , 0.6] }, script: { satisfy: [400, 'Script,cursive', 1, , 0.6], caveat: [700, 'Annot,cursive', 1.1, , 0.55], instrument: [400, 'Didot,serif', 1.05, 'italic', 0.55] } }
  const traitA = (p, px) => Math.max(2, Math.round(px * (p[4] ?? 1))) // contour proportionné : fin sur une police fine
  const hNom = [...String(nom || P.titre || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const choixA = (g, i) => { const l = Object.keys(POLICES_AUTOMNE[g]), v = String(K.polices?.[g] || '').toLowerCase(); return POLICES_AUTOMNE[g][l.includes(v) ? v : l[(hNom >>> (i * 4)) % l.length]] }
  const PT = choixA('titre', 0), PM = choixA('mots', 1), PS = choixA('script', 2)
  const fA = (p, z) => (p[3] || 'normal') + ' ' + p[0] + ' ' + Math.round(z * p[2]) + 'px/1 ' + p[1]
  if (THEME === 'automne') console.log('Polices automne : titre ' + Object.keys(POLICES_AUTOMNE.titre).find(k => POLICES_AUTOMNE.titre[k] === PT) + ', mots ' + Object.keys(POLICES_AUTOMNE.mots).find(k => POLICES_AUTOMNE.mots[k] === PM) + ', manuscrite ' + Object.keys(POLICES_AUTOMNE.script).find(k => POLICES_AUTOMNE.script[k] === PS))
  if (THEME === 'automne') {
    // SOUS-TITRES MOT À MOT : un mot à la fois sur sa poitrine, écriture ronde crème au contour brun
    const finA = K.fin?.motCle ? tf(K.fin.t ?? TOT - 3.5) : TOT
    el.push({ a: HOOK, b: finA, calque: 'devant', dessin: t => {
      const k = mots.findIndex((m, i) => t >= m.t && t < (mots[i + 1]?.t ?? m.fin)); if (k < 0) return ''
      const w = mots[k]; if (t > w.fin + 0.25) return '' // muet
      if (el.some(e => e.zone === 'geant' && t >= e.a && t < e.b)) return ''
      const p = phrases[w.ip], y = clamp(basVisage(p.a, p.b) + 110, 640, 960), q0A = clamp((t - w.t) / 0.08, 0, 1), r = 0.72 + 0.28 * clamp(rebond((t - w.t) / 0.18), 0, 1.15)
      const z = w.fort ? 108 : 84, txt = esc(w.w.replace(/[,.;:!?»]+$/, ''))
      return '<div style="position:absolute;left:40px;right:80px;top:' + (y - z / 2) + 'px;text-align:center;white-space:nowrap;font:' + fA(PM, z) + ';color:' + (w.fort ? PALETTE.rouille : PALETTE.creme) + ';-webkit-text-stroke:' + traitA(PM, w.fort ? 10 : 8) + 'px ' + (w.fort ? PALETTE.creme : PALETTE.brun) + ';paint-order:stroke fill;opacity:' + q0A.toFixed(2) + ';transform:scale(' + r.toFixed(3) + ');text-shadow:0 4px 12px rgba(60,20,0,.35)">' + txt + '</div>'
    } })
    // une ou deux feuilles qui tombent près du mot fort
    for (const w of mots.filter(m => m.fort && m.t > HOOK && m.t < finA)) {
      const a = w.t, y0 = clamp(basVisage(a, a + 1) + 60, 600, 900)
      el.push({ a, b: Math.min(TOT, a + 1.6), calque: 'devant', dessin: t => { const q = (t - a) / 1.6
        return feuille(Math.round(150 + 40 * Math.sin(q * 5)), Math.round(y0 - 80 + 140 * q), 46, Math.round(-30 + 160 * q), PALETTE.ocre, Math.sin(q * Math.PI).toFixed(2))
          + feuille(Math.round(520 + 30 * Math.sin(q * 4 + 1)), Math.round(y0 - 110 + 120 * q), 36, Math.round(20 - 140 * q), PALETTE.rouille, Math.sin(q * Math.PI).toFixed(2)) } })
    }
  }

  if (THEME === 'studio') {
    const finS = K.fin?.motCle ? tf(K.fin.t ?? TOT - 3.5) : TOT
    // les scènes studio : le hook, puis une phrase forte sur deux (au moins 6 s d'écart), ou celles qu'elle choisit
    let scenes = (K.studio || []).map(([a, b]) => [tf(a), tf(b)])
    if (!K.studio) { scenes = [[0, HOOK]]; let d = HOOK, k = 0
      for (const [ip, p] of phrases.entries()) { if (p.a < HOOK + 1 || p.b > finS - 0.3 || p.a - d < 6 || p.b - p.a < 1.2 || !mots.some(m => m.ip === ip && m.fort)) continue
        if (k++ % 2 === 0) { scenes.push([p.a - 0.05, p.b + 0.1]); d = p.b } } }
    K._scenesStudio = scenes
    const dansScene = t => scenes.some(([a, b]) => t >= a && t < b)
    const hasard = k => { const x = Math.sin(k * 5.17 + 1.3) * 43758.5453; return x - Math.floor(x) }
    // le fond : sa couleur, un quadrillage tracé à la main (lignes un peu tremblées), ou uni
    const grille = K.fond === 'uni' ? '' : '<svg style="position:absolute;inset:0" width="720" height="1280">' + Array.from({ length: 13 }, (_, k) => '<path d="M' + (k * 60 + 10) + ' 0 Q ' + (k * 60 + 10 + (hasard(k) - 0.5) * 10) + ' 640 ' + (k * 60 + 10 + (hasard(k + 40) - 0.5) * 8) + ' 1280" stroke="' + PALETTE.trait + '" stroke-width="2" fill="none"/>').join('') + Array.from({ length: 22 }, (_, k) => '<path d="M0 ' + (k * 60 + 20) + ' Q 360 ' + (k * 60 + 20 + (hasard(k + 80) - 0.5) * 10) + ' 720 ' + (k * 60 + 20 + (hasard(k + 120) - 0.5) * 8) + '" stroke="' + PALETTE.trait + '" stroke-width="2" fill="none"/>').join('') + '</svg>'
    const soleil = (cx, cy, r, rot) => '<svg style="position:absolute;left:' + (cx - r) + 'px;top:' + (cy - r) + 'px;transform:rotate(' + rot + 'deg)" width="' + 2 * r + '" height="' + 2 * r + '" viewBox="-100 -100 200 200"><path d="' + Array.from({ length: 24 }, (_, k) => { const a = k / 24 * Math.PI * 2, rr = k % 2 ? 62 : 100; return (k ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(1) + ' ' + (Math.sin(a) * rr).toFixed(1) }).join(' ') + 'Z" fill="' + PALETTE.soleil + '"/></svg>'
    for (const [ks, [a, b]] of scenes.entries()) {
      el.push({ a, b, scene: ks, calque: 'derriere', dessin: t => { const v = vis(t), q = doux((t - a) / 0.2)
        return '<div style="position:absolute;inset:0;background:' + PALETTE.fond + '"></div>' + grille + (v ? soleil(Math.round((v[0] + v[2]) / 2), Math.round((v[1] + v[3]) / 2), Math.round((v[2] - v[0]) * 1.15 * (0.85 + 0.15 * q)), Math.round(t * 12)) : '') } })
      sons.push({ t: a, fam: 'whoosh', vol: 0.07 })
    }
    // les mots en escalier, pendant les scènes (hors hook) : chaque mot à sa ligne, gauche puis droite ; le mot fort en manuscrite
    for (const [ks0, [a, b]] of scenes.slice(1).entries()) { const ks = ks0 + 1
      const ici = mots.filter(m => m.t >= a - 0.02 && m.t < b).slice(0, 9); if (!ici.length) continue
      const v0 = vis((a + b) / 2), haut = v0 ? v0[1] : 300, bas = v0 ? v0[3] : 700
      const gx = v0 ? v0[0] : 220, dx = v0 ? v0[2] : 500, largeur = m => m.w.length * (m.fort ? 34 : 23) + 10
      const cotes = ici.map((m, k) => { const L = gx - 40 - largeur(m), Rr = 690 - (dx + 40) - largeur(m); return k % 2 ? (Rr >= 0 ? dx + 40 : L >= 24 ? L : null) : (L >= 24 ? L : Rr >= 0 ? dx + 40 : null) })
      const surCote = cotes.every(x => x != null), yDeb = surCote ? clamp(haut + 30, 260, 1050 - ici.length * 58) : clamp(bas + 30, 420, 1050 - ici.length * 58)
      el.push({ a, b, scene: ks, calque: 'devant', dessin: t => '<div style="position:absolute;inset:0">' + ici.map((m, k) => { const q = doux((t - m.t + 0.03) / 0.2); if (q <= 0) return ''
        const x = surCote ? Math.round(cotes[k]) : (k % 2 ? 380 : 90), w = esc(m.w.replace(/[*]/g, ''))
        return m.fort ? '<div style="position:absolute;left:' + (x - 40) + 'px;top:' + (yDeb + k * 58 - 14) + 'px;font:400 70px/1 Script,cursive;color:' + PALETTE.encre + ';opacity:' + q + ';transform:translateY(' + ((1 - q) * 10).toFixed(1) + 'px);text-shadow:' + (PALETTE.ombreS || '0 0 3px rgba(0,0,0,.7),0 2px 12px rgba(0,0,0,.45)') + '">' + w + '</div>'
          : '<div style="position:absolute;left:' + x + 'px;top:' + (yDeb + k * 58) + 'px;font:400 44px/1 Display,serif;color:' + PALETTE.encre + ';opacity:' + q + ';transform:translateY(' + ((1 - q) * 10).toFixed(1) + 'px);text-shadow:' + (PALETTE.ombreS || '0 0 3px rgba(0,0,0,.7),0 2px 10px rgba(0,0,0,.45)') + '">' + w + '</div>' }).join('') + '</div>' })
    }
    // hors scènes : sa phrase en serif fin crème, sous son visage
    el.push({ a: HOOK, b: finS, calque: 'devant', dessin: t => { if (dansScene(t)) return ''
      const p = phrases.find(p => t >= p.a && t < p.b); if (!p) return ''
      const q = Math.min(doux((t - p.a) / 0.25), 1 - clamp((t - (p.b - 0.12)) / 0.12, 0, 1)), y = clamp(basVisage(p.a, p.b) + 110, 640, 960)
      const html = esc(p.txt).replace(/\*([^*]+)\*/g, (_, w) => '<span style="font:400 54px/1 Script,cursive">' + w + '</span>')
      return '<div style="position:absolute;left:70px;right:110px;top:' + y + 'px;text-align:center;text-wrap:balance;font:400 40px/1.2 Display,serif;color:' + PALETTE.creme + ';opacity:' + q + ';text-shadow:0 0 3px rgba(0,0,0,.75),0 1px 3px rgba(0,0,0,.6),0 2px 16px rgba(0,0,0,.5)">' + html + '</div>' } })
  }

  // un texte qui suit son visage : il reste où on l'a mis tant qu'elle n'y vient pas, sinon il glisse au-dessus ou en dessous
  const suiveur = h => { let y = null
    return (t, voulu) => { const v = vis(t); let c = voulu
      if (v && voulu - h / 2 < v[3] + 24 && voulu + h / 2 > v[1] - 24) {
        const dessus = v[1] - 24 - h / 2, dessous = v[3] + 24 + h / 2
        c = dessus >= 120 + h / 2 ? dessus : dessous <= 980 - h / 2 ? dessous : dessus > 1280 - dessous ? Math.max(80 + h / 2, dessus) : Math.min(990 - h / 2, dessous)
      }
      y = y == null ? c : y + (c - y) * 0.35; return Math.round(y) } }

  // 2. Le titre du hook en trois voix, derrière sa tête
  const lignes = (P.titre || '').split('/').map(s => s.trim()).filter(Boolean)
  const iG = Math.max(0, lignes.findIndex(l => l.includes('*')))
  const T = K.titre || { petit: lignes.slice(0, iG).join(' '), grand: (lignes[iG] || '').replace(/\*/g, ''), queue: lignes.slice(iG + 1).join(' ') }
  // Deux grosses lignes possibles : « dessus » (ex. 100 000 €, en blanc) puis « grand » (ex. 30 jours, en beurre),
  // chacune arrive quand elle la DIT ; puis la fin manuscrite. Tout passe derrière sa tête, sauf la fin manuscrite.
  const quand = (txt, defaut) => { const w = sans(txt || '').split(' ')[0]; return mots.find(m => m.t < HOOK && w && pareil(sans(m.w).split(' ')[0] || '', w))?.t ?? defaut }
  const fit = (txt, max) => Math.round(clamp(600 / (0.5 * Math.max(3, txt.length)), 80, max))
  const H = (() => {
    const haut = hautTete(0, HOOK), tG = fit(T.grand || '', 190), tD = T.dessus ? fit(T.dessus, 200) : 0
    const yG = clamp(haut + tG * 0.05, 250, 560), yD = clamp(haut + tD * 0.05, 250, 560)
    return { haut, tG, tD, yG, yD, aD: quand(T.dessus, 0.05), aG: quand(T.grand, T.dessus ? 0.9 : 0.3), aQ: quand(T.queue, 0.75) }
  })()
  // Éditorial : les gros mots s'EMPILENT, un par ligne, calés à gauche, chacun à sa taille pour remplir la largeur,
  // et glissent depuis le bord gauche l'un après l'autre (le titre d'un magazine qui se compose)
  const pile = (ls, y, couleur, p) => {
    const tailles = ls.map(w => Math.round(clamp(600 / (0.56 * Math.max(2, w.length)), 90, 230)))
    const hTot = tailles.reduce((s, x) => s + x * 0.84, 0)
    return `<div style="position:absolute;left:52px;top:${y - hTot / 2}px">${ls.map((w, k) => { const q = doux((p * 0.3 - k * 0.08) / 0.22)
      return `<div style="font:800 ${tailles[k]}px/0.84 Edito,sans-serif;letter-spacing:-0.055em;text-transform:lowercase;color:${couleur};text-shadow:0 10px 28px rgba(0,0,0,.3);clip-path:inset(-20% ${100 - 100 * q}% -20% -5%);transform:translateX(${(1 - q) * -40}px)">${esc(w)}</div>` }).join('')}</div>`
  }
  const quandMot = (txt, defaut) => { const w = sans(txt || '').split(' ')[0]; return mots.find(m => m.t < HOOK + 1 && w && pareil(sans(m.w).split(' ')[0] || '', w) && m.t > 0.4)?.t ?? defaut }
  const coupeLignes = (txt, max) => { const out = []; let cur = ''; for (const w of txt.split(/s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w } if (cur) out.push(cur); return out }
  // ── « aurelie » : LA SIGNATURE D'AURÉLIE (sa DA de visuels Instagram) ──
  // bordeaux #800020, olive, ivoire ; titres énormes en capitales serrées (Anton) + UN mot en italique éditorial
  // (Instrument Serif) ; elle détourée avec un contour blanc façon sticker quand un titre passe derrière elle ;
  // sous-titres sous son visage (comme dans CapCut), mots importants en italique bordeaux plus gros ;
  // ses photos d'enfance en polaroïds scotchés sur fond ivoire, chacune entrant autrement ; étalonnage « cinéma ».
  const AUR = { bordeaux: '#800020', olive: '#7F8000', ivoire: '#FFF7F1' }
  const PHOTOS = THEME === 'aurelie' ? (K.photos || []).map((ph, k, l) => ({ ...ph, a: tf(ph.t), b: ph.duree ? tf(ph.t) + ph.duree : (l[k + 1] ? tf(l[k + 1].t) : tf(ph.t) + 2) })) : []
  const dansPhoto = t => PHOTOS.some(ph => t >= ph.a && t < ph.b)
  if (THEME === 'aurelie') {
    el.push({ a: 0, b: TOT, calque: 'devant', dessin: t => {
      if (t < HOOK_ST || el.some(e => e.parle && t >= e.a && t < e.b) || dansPhoto(t) || el.some(e => e.zone === 'geant' && t >= e.a && t < e.b)) return '' // le titre géant sur la poitrine dit déjà la phrase
      const p = phrases.find(p => t >= p.a && t < p.b); if (!p) return ''
      const html = esc(p.txt).replace(/\*([^*]+)\*/g, `<span style="font:italic 400 1.5em/0.85 Didot,serif;letter-spacing:0;color:${AUR.bordeaux};-webkit-text-stroke:7px #fff;paint-order:stroke fill;text-shadow:none">$1</span>`)
      const y = clamp(basVisage(p.a, p.b) + 26, 560, 860)
      return `<div style="position:absolute;left:60px;right:104px;top:${y}px;text-align:center;font:600 40px/1 Poppins,sans-serif;letter-spacing:-1px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.6)">${html}</div>`
    } })
    // le hook : « ELLE A DIT QUE C'ÉTAIT » énorme, en capitales ivoire, derrière elle, puis « un torchon » en italique bordeaux
    const TA = K.titre || {}
    if (TA.haut) {
      const aM = quandMot(TA.mot, 1.2), lignesH = coupeLignes(TA.haut.toUpperCase(), 13), tH = Math.round(clamp(620 / (0.5 * Math.max(...lignesH.map(l => l.length))), 70, 160))
      const haut = hautTete(0, HOOK), hBloc = lignesH.length * tH * 0.9 + tH * 1.05, place = haut - 175 >= hBloc * 0.7
      const yH = place ? clamp(haut - hBloc * 0.7, 180, 420) : clamp(basVisage(0, HOOK) + 20, 520, 980 - hBloc) // pas de place au-dessus de sa tête : devant, sous le menton
      el.push({ a: 0, b: HOOK, calque: place ? 'derriere' : 'devant', dessin: t => {
        const sortie = 1 - clamp((t - (HOOK - 0.2)) / 0.2, 0, 1)
        const l = lignesH.map((x, k) => { const p = rebond((t - 0.05 - k * 0.12) / 0.2); return `<div style="transform:scale(${p > 0 ? 0.85 + 0.15 * p : 0});font:400 ${tH}px/0.9 Anton,sans-serif;color:${AUR.ivoire};letter-spacing:-0.01em;text-shadow:0 6px 24px rgba(0,0,0,.25)">${esc(x)}</div>` }).join('')
        const pm = rebond((t - aM) / 0.25)
        return `<div style="position:absolute;left:0;right:0;top:${yH}px;text-align:center;opacity:${sortie}">${l}${t >= aM ? `<div style="font:italic 400 ${Math.round(tH * 1.15)}px/0.9 Didot,serif;color:${AUR.bordeaux};-webkit-text-stroke:8px #fff;paint-order:stroke fill;transform:rotate(-3deg) scale(${0.7 + 0.3 * pm});margin-top:-${Math.round(tH * 0.12)}px">${esc(TA.mot || '')}</div>` : ''}</div>`
      } })
    }
    // les photos d'enfance : fond ivoire, deux bandes de couleur inclinées, le polaroïd scotché avec sa légende manuscrite
    const entrees = [
      p => `translate(0,${(1 - p) * -900}px) rotate(${-14 + 10 * p}deg)`, p => `translate(${(1 - p) * -800}px,0) rotate(3deg)`,
      p => `scale(${0.3 + 0.7 * p}) rotate(-2deg)`, p => `rotate(${25 - 30 * p}deg) scale(${0.8 + 0.2 * p})`, p => `translate(0,${(1 - p) * 1000}px) rotate(-6deg)`]
    PHOTOS.forEach((ph, k) => {
      const src = existsSync(join(dir, ph.image)) ? join(dir, ph.image) : ph.image, img = `data:image/jpeg;base64,${readFileSync(src).toString('base64')}`
      el.push({ a: ph.a, b: ph.b, calque: 'devant', dessin: t => {
        const p = rebond((t - ph.a) / 0.35)
        return `<div style="position:absolute;inset:0;background:${AUR.ivoire}"></div>
          <div style="position:absolute;left:-60px;right:-60px;top:${180 + (k % 2) * 760}px;height:90px;background:${k % 2 ? AUR.olive : AUR.bordeaux};transform:rotate(${k % 2 ? 6 : -5}deg);opacity:.92"></div>
          <div style="position:absolute;left:70px;top:210px;width:540px;padding:22px 22px 100px;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.25);transform:${entrees[k % entrees.length](clamp(p, 0, 1.2))}">
            <div style="position:absolute;left:50%;top:-18px;width:150px;height:40px;margin-left:-75px;background:rgba(214,190,146,.85);transform:rotate(${k % 2 ? 4 : -5}deg)"></div>
            <div style="width:496px;height:600px;background:url(${img}) center 30%/cover"></div>
            <div style="position:absolute;left:0;right:0;bottom:22px;text-align:center;font:700 54px/1 Annot,cursive;color:${AUR.bordeaux}">${esc(ph.legende || '')}</div></div>`
      } })
    })
  }

  if (T.grand && THEME === 'witchy') {
    const { haut, aD, aG, aQ } = H, vis = visages(0, HOOK)
    const tG = Math.round(clamp(600 / (0.68 * Math.max(4, T.grand.length)), 70, 110)), y0B = clamp(haut - tG - 90, 110, 420), suiviW = suiveur(tG + 60), y0 = y0B
    const libre = (x, y, w, h) => !vis.some(v => x < v[2] + 20 && x + w > v[0] - 20 && y < v[3] + 20 && y + h > v[1] - 20)
    const deco = [[30, y0 - 120, 'croissant', 96], [470, y0 - 120, 'constellation'], [150, y0 + tG + 70, 'etoile4', 30], [600, y0 + tG + 90, 'etoile4', 22], [80, y0 + tG + 190, 'etoile4', 18]].filter(([x, y, ty, z]) => y > 0 && libre(x, y, ty === 'constellation' ? 200 : z, ty === 'constellation' ? 180 : z))
    el.push({ a: 0, b: HOOK, calque: 'devant', dessin: t => { const y0 = suiviW(t, y0B + tG / 2 - 10) - tG / 2 + 10
      const sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1), pD = doux((t - aD) / 0.5), pG = doux((t - aG) / 0.6)
      return '<div style="position:absolute;inset:0;opacity:' + sortie + '">' + (y0 > 100 ? WI.lunes(y0 - 90, doux(t / 0.6)) : '')
        + deco.map(([x, y, ty, z], k) => { const p = doux((t - aG - 0.1 - k * 0.12) / 0.4); if (p <= 0) return ''; const f = Math.sin((t + k) * 1.8) * 3
          return '<div style="position:absolute;left:0;top:' + f + 'px;opacity:' + p + '">' + (ty === 'constellation' ? WI.constellation(x, y) : WI[ty](x, y, z)) + '</div>' }).join('')
        + (T.dessus ? '<div style="position:absolute;left:0;right:0;top:' + (y0 - 40) + 'px;text-align:center;font:italic 500 38px/1 DouxI,serif;color:' + PALETTE.creme + ';opacity:' + pD + ';text-shadow:0 0 12px ' + PALETTE.prune + '">' + esc(T.dessus) + '</div>' : '')
        + '<div style="position:absolute;left:0;right:0;top:' + y0 + 'px;text-align:center;white-space:nowrap;font:700 ' + tG + 'px/1 Cinzel,serif;text-transform:uppercase;color:' + PALETTE.or + ';opacity:' + pG + ';filter:blur(' + ((1 - pG) * 5).toFixed(1) + 'px);text-shadow:0 0 18px rgba(233,199,123,.55),0 4px 18px ' + PALETTE.prune + '">' + esc(T.grand) + '</div></div>'
    } })
    if (T.queue) el.push({ a: 0, b: HOOK, calque: 'devant', dessin: t => { const pQ = doux((t - aQ) / 0.5), sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1)
      return '<div style="position:absolute;left:0;right:0;top:' + clamp(basVisage(0, HOOK) + 150, 640, 930) + 'px;text-align:center;font:italic 500 54px/1 DouxI,serif;color:' + PALETTE.creme + ';opacity:' + (pQ * sortie) + ';text-shadow:0 0 14px ' + PALETTE.or + '88,0 2px 14px rgba(0,0,0,.5)">' + esc(T.queue) + '</div>' } })
    sons.push({ t: Math.max(0.05, aG), fam: 'magie', vol: 0.06 })
  }

  if (T.grand && CHIC) {
    // une ligne fine en capitales espacées, un filet qui se trace, puis le grand mot en italique qui sort du flou
    const { haut, aD, aG, aQ } = H, petite = T.dessus || T.petit || ''
    const tG = Math.round(clamp(600 / (0.4 * Math.max(5, T.grand.length)), 70, 104))
    const coupe = (txt, max) => { const out = []; let cur = ''; for (const w of txt.split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w } if (cur) out.push(cur); return out }
    const lp = petite ? coupe(petite.toUpperCase(), 30) : [], hBloc = lp.length * 30 + 38 + tG
    const yB = clamp(haut - hBloc - 40, 130, 420), suivi = suiveur(hBloc)
    el.push({ a: 0, b: HOOK, calque: 'devant', dessin: t => { const y0 = suivi(t, yB + hBloc / 2) - hBloc / 2
      const sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1), pD = doux((t - aD) / 0.5), pF = doux((t - aD - 0.25) / 0.6), pG = doux((t - aG) / 0.6)
      return '<div style="position:absolute;left:0;right:0;top:' + y0 + 'px;text-align:center;opacity:' + sortie + '">'
        + lp.map(l => '<div style="font:500 21px/30px ChicS,sans-serif;letter-spacing:0.3em;color:#fff;opacity:' + pD + ';' + OMBRE + '">' + esc(l) + '</div>').join('')
        + (LUXE ? '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:14px auto 18px;opacity:' + pF.toFixed(2) + '"><i style="width:' + Math.round(44 * pF) + 'px;height:1px;background:' + OR + '"></i><i style="width:6px;height:6px;background:' + OR + ';transform:rotate(45deg)"></i><i style="width:' + Math.round(44 * pF) + 'px;height:1px;background:' + OR + '"></i></div>' : '<div style="width:' + Math.round(64 * pF) + 'px;height:1.5px;background:#fff;margin:16px auto 20px;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>')
        + '<div style="white-space:nowrap;font:italic ' + (LUXE ? '400 ' + tG + 'px/.95 Didot' : '500 ' + tG + 'px/1 DouxI') + ',serif;color:#fff;opacity:' + pG + ';filter:blur(' + ((1 - pG) * 5).toFixed(1) + 'px);letter-spacing:' + (0.04 - 0.04 * pG).toFixed(3) + 'em;text-shadow:0 2px 20px rgba(0,0,0,.35)">' + esc(T.grand) + '</div></div>'
    } })
    if (T.queue) el.push({ a: 0, b: HOOK, calque: 'devant', dessin: t => { const pQ = doux((t - aQ) / 0.5), sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1)
      return '<div style="position:absolute;left:70px;right:110px;top:' + clamp(basVisage(0, HOOK) + 140, 640, 960) + 'px;text-align:center;font:500 31px/1.3 ChicS,sans-serif;color:#fff;opacity:' + (pQ * sortie) + ';' + OMBRE + '">' + esc(T.queue) + '</div>' } })
    sons.push({ t: Math.max(0.05, aG), fam: 'whoosh', vol: 0.05 })
  }

  if (CHIC) {
    // la place libre d'un côté de son visage, à une hauteur donnée
    const cote = (a, b, y, h) => { const vs = visages(a, b), g = Math.min(...vs.map(v => v[0]), 720), d = Math.max(...vs.map(v => v[2]), 0)
      return (720 - d) >= g ? 'droite' : 'gauche' }
    // ÉTIQUETTES PRODUIT : { t, duree, nom, sous, vers: [x, y] (où est le produit, en 720×1280), cote: 'gauche'|'droite' }
    for (const pr of K.produits || []) {
      const a = tf(pr.t), b = Math.min(TOT, pr.duree ? tf(pr.t + pr.duree) : a + 3.2)
      const c = pr.cote || cote(a, b), yL = pr.y ?? 560, xL = c === 'droite' ? 430 : 50
      const hV = 54 + (pr.sous ? 44 : 0) + (pr.detail ? 46 : 0); if (LUXE) VERRES.push({ x: xL, y: yL, l: 250, h: hV, r: 22, a, b })
      // (06/11) le trait pointe vers le VRAI produit, repéré dans l'image (flacon, tasse, téléphone…), jamais vers sa bouche ;
      // pas de produit repéré, ou repéré sur son visage : pas de trait
      if (pr.vers == null || pr.vers === 'auto') { pr.vers = null
        const o = spawnSync('node', [join(ICI, 'detourage', 'objets.mjs'), join(st, 'base-av.mp4'), a.toFixed(2), b.toFixed(2)], { encoding: 'utf8' }).stdout || ''
        let r = null; try { r = JSON.parse(o.trim().split('\n').pop()) } catch {}
        const v = vis((a + b) / 2), surVisage = r && v && r.x > v[0] && r.x < v[2] && r.y > v[1] && r.y < v[3]
        if (r && !surVisage) { pr.vers = [r.x, r.y]; console.log('Produit repéré pour « ' + (pr.nom || pr.sous) + ' » : ' + r.classe + ' en ' + r.x + ', ' + r.y) }
        else console.log('⚠️ Produit « ' + (pr.nom || pr.sous) + ' » pas repéré dans l\'image : étiquette sans trait') }
      el.push({ a, b, calque: 'devant', dessin: t => {
        const q = doux((t - a) / 0.4) * (1 - doux((t - (b - 0.35)) / 0.35)), pt = doux((t - a) / 0.7), pn = doux((t - a - 0.3) / 0.5), ps = doux((t - a - 0.55) / 0.5)
        let trait = ''
        if (pr.vers) { const [vx, vy] = pr.vers, x1 = c === 'droite' ? xL - 10 : xL + 250, y1 = yL + 30, coude = [x1 + (c === 'droite' ? -40 : 40), y1]
          trait = '<svg style="position:absolute;left:0;top:0;filter:drop-shadow(0 1px 3px rgba(0,0,0,.35))" width="720" height="1280"><path d="M' + x1 + ' ' + y1 + ' L' + coude.join(' ') + ' L' + vx + ' ' + vy + '" fill="none" stroke="#fff" stroke-width="1.6" pathLength="100" stroke-dasharray="100" stroke-dashoffset="' + (100 * (1 - pt)).toFixed(1) + '"/>' + (pt > 0.95 ? '<circle cx="' + vx + '" cy="' + vy + '" r="6" fill="#fff"/>' : '') + '</svg>' }
        if (LUXE) return '<div style="position:absolute;inset:0;opacity:' + q.toFixed(3) + '">' + trait + '<div style="position:absolute;left:' + xL + 'px;top:' + yL + 'px;width:250px;height:' + hV + 'px;box-sizing:border-box;border-radius:22px;padding:18px 20px;' + VERRE + ';color:#fff">'
          + '<div style="font:500 11px/1.3 DidotT,sans-serif;letter-spacing:.34em;color:' + OR + '">' + esc((pr.nom || '').toUpperCase()) + '</div>'
          + (pr.sous ? '<div style="font:italic 400 34px/1.05 Didot,serif;margin-top:8px;opacity:' + ps + ';' + OMBRE + '">' + esc(pr.sous) + '</div>' : '')
          + (pr.detail ? '<div style="font:500 13px/1.4 DidotT,sans-serif;margin-top:6px;opacity:' + (0.92 * ps).toFixed(2) + '">' + esc(pr.detail) + '</div>' : '') + '</div></div>'
        return '<div style="position:absolute;inset:0;opacity:' + q.toFixed(3) + '">' + trait + '<div style="position:absolute;left:' + xL + 'px;top:' + yL + 'px;width:250px;text-align:' + (c === 'droite' ? 'left' : 'right') + '">'
          + '<div style="font:500 16px/1.3 ChicS,sans-serif;letter-spacing:0.3em;color:#fff;opacity:' + pn + ';' + OMBRE + '">' + esc((pr.nom || '').toUpperCase()) + '</div>'
          + (pr.sous ? '<div style="font:italic 500 40px/1.05 DouxI,serif;color:#fff;margin-top:8px;opacity:' + ps + ';transform:translateY(' + ((1 - ps) * 8).toFixed(1) + 'px);' + OMBRE + '">' + esc(pr.sous) + '</div>' : '') + '</div></div>'
      } })
      sons.push({ t: a, fam: 'whoosh', vol: 0.05 })
    }
    // CHIFFRES : { t, duree, valeur: "92", unite: "%", legende, source: "selon la marque", benefices: ["…" ou { t, txt }] }
    // la source s'affiche toujours : un chiffre de marque n'est jamais présenté comme une promesse personnelle
    for (const ch of K.chiffres || []) {
      const a = tf(ch.t), b = Math.min(TOT, ch.duree ? tf(ch.t + ch.duree) : a + 4.5), c = ch.cote || cote(a, b), x0 = c === 'droite' ? 380 : 50, y0 = ch.y ?? 170
      const bens = (ch.benefices || []).map((x, k) => typeof x === 'string' ? { txt: x, a: a + 0.9 + k * 0.6 } : { txt: x.txt, a: tf(x.t) })
      el.push({ a, b, calque: 'devant', dessin: t => {
        const q = doux((t - a) / 0.45) * (1 - doux((t - (b - 0.35)) / 0.35)), z = 0.9 + 0.1 * doux((t - a) / 0.6)
        const n = parseFloat(String(ch.valeur).replace(',', '.')), compte = isFinite(n) ? String(Math.round(n * doux((t - a - 0.1) / 0.9))) : esc(String(ch.valeur))
        if (LUXE) return '<div style="position:absolute;inset:0;opacity:' + q.toFixed(3) + '"><div style="position:absolute;left:' + x0 + 'px;top:' + y0 + 'px;width:290px;text-align:center;color:#fff;transform:scale(' + z.toFixed(3) + ');text-shadow:0 1px 1px rgba(0,0,0,.25),0 6px 24px rgba(0,0,0,.3)">'
          + '<div style="font:italic 400 128px/0.95 Didot,serif">' + compte + '<span style="font-size:64px">' + esc(ch.unite || '') + '</span></div>'
          + (ch.legende ? '<div style="font:500 13px/1.35 DidotT,sans-serif;letter-spacing:.34em;color:' + OR + ';margin-top:8px">' + esc(ch.legende.toUpperCase()) + (ch.source ? '*' : '') + '</div>' : '')
          + '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px"><i style="width:30px;height:1px;background:' + OR + '"></i><i style="width:5px;height:5px;background:' + OR + ';transform:rotate(45deg)"></i><i style="width:30px;height:1px;background:' + OR + '"></i></div>'
          + bens.map(be => { const v = doux((t - be.a) / 0.4); return v <= 0 ? '' : '<div style="font:italic 400 30px/1.2 Didot,serif;margin-top:10px;opacity:' + v + '">' + esc(be.txt) + '</div>' }).join('')
          + (ch.source ? '<div style="font:500 13px/1.3 DidotT,sans-serif;margin-top:12px;opacity:.85">*' + esc(ch.source) + '</div>' : '') + '</div></div>'
        return '<div style="position:absolute;inset:0;opacity:' + q.toFixed(3) + '"><div style="position:absolute;left:' + x0 + 'px;top:' + y0 + 'px;width:290px;height:290px;border-radius:50%;background:' + PALETTE.sable + 'eb;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.14);transform:scale(' + z.toFixed(3) + ')">'
          + '<div style="text-align:center;color:' + PALETTE.cacao + '"><div style="font:600 108px/0.9 Doux,serif">' + compte + '<span style="font-size:58px">' + esc(ch.unite || '') + '</span></div>'
          + (ch.legende ? '<div style="font:500 14px/1.35 ChicS,sans-serif;letter-spacing:0.22em;margin-top:6px;padding:0 30px">' + esc(ch.legende.toUpperCase()) + (ch.source ? '*' : '') + '</div>' : '') + '</div></div>'
          + '<div style="position:absolute;left:' + x0 + 'px;top:' + (y0 + 312) + 'px;display:flex;flex-direction:column;align-items:' + (c === 'droite' ? 'flex-end' : 'flex-start') + ';width:290px;gap:11px">'
          + bens.map(be => { const v = doux((t - be.a) / 0.4); return v <= 0 ? '' : '<div style="background:#ffffffdb;color:' + PALETTE.cacao + ';font:500 21px/1 ChicS,sans-serif;padding:11px 18px;border-radius:30px;opacity:' + v + ';transform:translateY(' + ((1 - v) * 10).toFixed(1) + 'px)">' + esc(be.txt) + '</div>' }).join('')
          + (ch.source ? '<div style="font:500 14px/1.3 ChicS,sans-serif;color:#fff;opacity:.85;' + OMBRE + '">*' + esc(ch.source) + '</div>' : '') + '</div></div>'
      } })
      sons.push({ t: a, fam: 'pop', vol: 0.05 }); bens.forEach(be => sons.push({ t: be.a, fam: 'clic', vol: 0.05 }))
    }
    // LA FIN : « écris-moi » en capitales fines, le mot-clé en italique, sur une fine pastille sable
    if (K.fin?.motCle && !K.fin.geant) {
      const t0 = tf(K.fin.t ?? TOT - 3.5), mot = K.fin.motCle, y = clamp(basVisage(t0, TOT) + 40, 600, 860)
      el.push({ a: t0, b: TOT, calque: 'devant', zone: 'poitrine', dessin: t => { const p = doux((t - t0) / 0.5), pf = doux((t - t0 - 0.2) / 0.6)
        return '<div style="position:absolute;left:60px;right:104px;top:' + y + 'px;text-align:center;opacity:' + p + '"><div style="font:500 19px/1 ChicS,sans-serif;letter-spacing:0.32em;color:#fff;' + OMBRE + '">ÉCRIS-MOI EN COMMENTAIRE</div>'
          + '<div style="width:' + Math.round(60 * pf) + 'px;height:1.5px;background:#fff;margin:16px auto"></div>'
          + '<div style="display:inline-block;background:' + PALETTE.sable + 'eb;color:' + PALETTE.cacao + ';font:italic 500 ' + Math.round(Math.min(78, 520 / (mot.length * 0.5))) + 'px/1.1 DouxI,serif;padding:10px 34px 14px;border-radius:60px;box-shadow:0 10px 30px rgba(0,0,0,.14)">' + esc(mot) + '</div></div>' } })
      sons.push({ t: t0 + 0.2, fam: 'cloche', vol: 0.05 })
    }
  }

  if (T.grand && THEME === 'automne') {
    // hook sur la poitrine : petite manuscrite crème, grand serif très gras crème au contour brun, fin en manuscrite rouille
    const { aD, aG, aQ } = H, petite = T.dessus || T.petit || ''
    const tG = Math.round(clamp(600 / (0.62 * Math.max(5, T.grand.length)), 64, 104)), hBloc = (petite ? 54 : 0) + tG + (T.queue ? 70 : 0)
    const yB = clamp(basVisage(0, HOOK) + 40, 560, 980 - hBloc), suivi = suiveur(hBloc)
    const hasard = k => { const x = Math.sin(k * 9.7 + 3.3) * 43758.5453; return x - Math.floor(x) }
    const chute = Array.from({ length: 9 }, (_, k) => ({ x: hasard(k) * 660, y0: -80 - hasard(k + 30) * 500, v: 160 + hasard(k + 60) * 120, z: 54 + hasard(k + 90) * 40, c: [PALETTE.rouille, PALETTE.ocre, '#C96A2B'][k % 3], ph: hasard(k + 7) * 6 }))
    el.push({ a: 0, b: HOOK + 0.6, calque: 'derriere', dessin: t => chute.map(f => feuille(Math.round(f.x + 30 * Math.sin(t * 1.3 + f.ph)), Math.round(f.y0 + f.v * t), Math.round(f.z), Math.round(f.ph * 40 + t * 70), f.c, (1 - clamp((t - HOOK) / 0.6, 0, 1)).toFixed(2))).join('') })
    el.push({ a: 0, b: HOOK, calque: 'devant', dessin: t => { const y0 = suivi(t, yB + hBloc / 2) - hBloc / 2
      const sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1), pD = doux((t - aD) / 0.4), pG = clamp(rebond((t - aG) / 0.3), 0, 1.12), pQ = doux((t - aQ) / 0.45)
      const etoile = (x, y, n) => '<svg style="position:absolute;left:' + x + 'px;top:' + y + 'px;opacity:' + Math.min(1, pG) + '" width="' + n + '" height="' + n + '" viewBox="0 0 24 24"><path d="M12 1.5l3 7.2 7.6.6-5.8 5 1.8 7.4L12 17.8 5.4 21.7l1.8-7.4-5.8-5 7.6-.6z" fill="#fff"/></svg>'
      return '<div style="position:absolute;left:0;right:0;top:' + y0 + 'px;text-align:center;opacity:' + sortie + '">'
        + (petite ? '<div style="font:' + fA(PS, 44) + ';line-height:54px;color:' + PALETTE.creme + ';-webkit-text-stroke:' + traitA(PS, 5) + 'px ' + PALETTE.brun + ';paint-order:stroke fill;opacity:' + pD + ';text-shadow:0 2px 10px rgba(60,20,0,.6)">' + esc(petite) + '</div>' : '')
        + '<div style="white-space:nowrap;font:' + fA(PT, tG) + ';text-transform:uppercase;letter-spacing:-0.01em;color:' + PALETTE.creme + ';-webkit-text-stroke:' + traitA(PT, 9) + 'px ' + PALETTE.brun + ';paint-order:stroke fill;transform:scale(' + pG.toFixed(3) + ');text-shadow:0 6px 16px rgba(60,20,0,.4)">' + esc(T.grand) + '</div>'
        + (T.queue ? '<div style="font:' + fA(PS, 58) + ';line-height:70px;color:' + PALETTE.rouille + ';-webkit-text-stroke:' + traitA(PS, 6) + 'px ' + PALETTE.creme + ';paint-order:stroke fill;opacity:' + pQ + ';text-shadow:0 2px 10px rgba(60,20,0,.45)">' + esc(T.queue) + '</div>' : '')
        + etoile(90, petite ? 30 : -10, 26) + etoile(600, (petite ? 54 : 0) + tG * 0.7, 20) + etoile(120, hBloc - 20, 16) + '</div>'
    } })
    sons.push({ t: Math.max(0.05, aG), fam: 'pop', vol: 0.08 })
  }
  if (K.fin?.motCle && !K.fin.geant && THEME === 'automne') {
    const t0 = tf(K.fin.t ?? TOT - 3.5), mot = K.fin.motCle, y = clamp(basVisage(t0, TOT) + 40, 600, 860)
    el.push({ a: t0, b: TOT, calque: 'devant', zone: 'poitrine', dessin: t => { const p = doux((t - t0) / 0.5), r = clamp(rebond((t - t0 - 0.2) / 0.3), 0, 1.1)
      return '<div style="position:absolute;left:60px;right:104px;top:' + y + 'px;text-align:center;opacity:' + p + '"><div style="font:' + fA(PS, 50) + ';color:' + PALETTE.creme + ';-webkit-text-stroke:' + traitA(PS, 5) + 'px ' + PALETTE.brun + ';paint-order:stroke fill;text-shadow:0 2px 10px rgba(60,20,0,.6)">écris-moi</div>'
        + '<div style="display:inline-block;margin-top:10px;background:' + PALETTE.rouille + ';color:' + PALETTE.creme + ';font:' + fA(PT, Math.round(Math.min(84, 520 / (mot.length * 0.62)))) + ';line-height:1.1;text-transform:uppercase;padding:12px 30px 16px;border-radius:14px;transform:rotate(-2deg) scale(' + r.toFixed(3) + ');box-shadow:0 10px 24px rgba(60,20,0,.35)">' + esc(mot) + '</div></div>' } })
    sons.push({ t: t0 + 0.2, fam: 'pop', vol: 0.08 })
  }

  if (T.grand && THEME === 'studio') {
    // hook : petite phrase en serif, le grand mot en manuscrite, au-dessus de sa tête, sur le fond studio
    const { haut, aD, aG, aQ } = H, petite = T.dessus || T.petit || ''
    const tG = Math.round(clamp(600 / (0.42 * Math.max(4, T.grand.length)), 70, 130)), yB = clamp(haut - tG - 110, 90, 420)
    el.push({ a: 0, b: HOOK, calque: 'devant', dessin: t => { const sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1), pD = doux((t - aD) / 0.35), pG = doux((t - aG) / 0.45), pQ = doux((t - aQ) / 0.4)
      return '<div style="position:absolute;left:0;right:0;top:' + yB + 'px;text-align:center;opacity:' + sortie + ';text-shadow:' + (PALETTE.ombreS || '0 2px 12px rgba(0,0,0,.35)') + '">'
        + (petite ? '<div style="font:400 44px/1.1 Display,serif;color:' + PALETTE.encre + ';opacity:' + pD + '">' + esc(petite) + '</div>' : '')
        + '<div style="white-space:nowrap;font:400 ' + tG + 'px/1.1 Script,cursive;color:' + PALETTE.encre + ';opacity:' + pG + ';transform:translateY(' + ((1 - pG) * 12).toFixed(1) + 'px)">' + esc(T.grand) + '</div>'
        + (T.queue ? '<div style="font:400 40px/1.1 Display,serif;color:' + PALETTE.encre + ';opacity:' + pQ + '">' + esc(T.queue) + '</div>' : '') + '</div>' } })
  }
  if (K.fin?.motCle && !K.fin.geant && THEME === 'studio') {
    const t0 = tf(K.fin.t ?? TOT - 3.5), mot = K.fin.motCle, y = clamp(basVisage(t0, TOT) + 40, 600, 880)
    el.push({ a: t0, b: TOT, calque: 'devant', zone: 'poitrine', dessin: t => { const p = doux((t - t0) / 0.4)
      return '<div style="position:absolute;left:60px;right:104px;top:' + y + 'px;text-align:center;opacity:' + p + ';color:' + PALETTE.creme + ';text-shadow:0 2px 12px rgba(0,0,0,.45)"><div style="font:400 40px/1 Display,serif">Écris-moi</div><div style="font:400 84px/1.2 Script,cursive">« ' + esc(mot) + ' »</div></div>' } })
  }

  if (T.grand && THEME === 'doux') {
    const { haut, aD, aG, aQ } = H, accent = coul.mot || C?.motFort?.couleur || '#E8B4A0'
    const tG = Math.round(clamp(560 / (0.42 * Math.max(4, T.grand.length)), 90, 170)), placeHaut = haut - tG * 0.9 - 70 >= 150 // titreDouxPlace
    const y0B = placeHaut ? clamp(haut - tG * 0.9 - 70, 150, 420) : clamp(basVisage(0, HOOK) + 30, 520, 1280 - 300 - tG - 150), suiviC = suiveur(tG + 60)
    el.push({ a: 0, b: HOOK, calque: placeHaut ? 'derriere' : 'devant', dessin: t => { const y0 = suiviC(t, y0B + 20 + tG / 2) - 20 - tG / 2
      const sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1), pD = doux((t - aD) / 0.5), pG = doux((t - aG) / 0.6), pQ = doux((t - aQ) / 0.5), pO = rebond((t - aG - 0.25) / 0.45)
      const etoile = `<svg width="78" height="78" viewBox="0 0 100 100" style="position:absolute;right:92px;top:${y0 - 30}px;transform:scale(${clamp(pO, 0, 1.3)}) rotate(${(1 - clamp(pO, 0, 1)) * -40}deg);opacity:${clamp(pO, 0, 1)}"><path d="M50 0 C54 38 62 46 100 50 C62 54 54 62 50 100 C46 62 38 54 0 50 C38 46 46 38 50 0Z" fill="${accent}"/></svg>`
      return `<div style="position:absolute;inset:0;opacity:${sortie};text-shadow:0 4px 24px rgba(0,0,0,.3)">
        ${T.dessus ? `<div style="position:absolute;left:0;right:0;top:${y0}px;text-align:center;font:400 44px/1 Display,serif;letter-spacing:0.08em;color:#fff;opacity:${pD};transform:translateY(${(1 - pD) * 10}px)">${esc(T.dessus)}</div>` : ''}
        <div style="position:absolute;left:0;right:0;top:${y0 + 40}px;text-align:center;font:italic 500 ${tG}px/1 DouxI,serif;letter-spacing:${(0.06 - 0.08 * pG).toFixed(3)}em;color:#fff;opacity:${pG};filter:blur(${(1 - pG) * 6}px)">${esc(T.grand)}</div>
        ${etoile}</div>`
    } })
    if (T.queue) el.push({ a: 0, b: HOOK, calque: 'devant', dessin: t => { const pQ = doux((t - aQ) / 0.5), sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1)
      return `<div style="position:absolute;left:0;right:0;top:${placeHaut ? clamp(basVisage(0, HOOK) + 150, 640, 930) : y0B + 60 + tG}px;text-align:center;font:400 66px/1 Script,cursive;color:${accent};-webkit-text-stroke:5px #fff;paint-order:stroke fill;opacity:${pQ * sortie};text-shadow:0 2px 14px rgba(0,0,0,.3)">${esc(T.queue)}</div>` } })
  }

  if (T.grand && THEME !== 'aurelie' && THEME !== 'doux' && THEME !== 'witchy' && !CHIC && THEME !== 'automne' && THEME !== 'studio') {
    const fin = HOOK, { tG, tD, yG, yD, aD, aG } = H
    // chaque style a sa grosse lettre : serif beurre qui rebondit (collage), rond très gras qui claque (pop),
    // minuscules serrées rose poudré qui sortent du flou (éditorial)
    const ligne = (txt, taille, y, couleur, p) => THEME === 'editorial'
      // éditorial : le titre de couverture, en Didone très gras et en capitales, qui se pose en douceur
      ? `<div style="position:absolute;left:0;right:0;top:${y}px;transform:translateY(-50%) scale(${1.04 - 0.04 * doux(p)});opacity:${clamp(p * 1.4, 0, 1)};text-align:center;font:800 ${Math.round(taille * 0.92)}px/0.85 DidotG,sans-serif;letter-spacing:-0.035em;text-transform:lowercase;color:${couleur};text-shadow:0 6px 22px rgba(0,0,0,.25)">${esc(txt)}</div>`
      : THEME === 'doux' // doux : un titre fin qui se resserre lentement en apparaissant
      ? `<div style="position:absolute;left:0;right:0;top:${y}px;transform:translateY(-50%);opacity:${doux(p / 2)};text-align:center;font:600 ${Math.round(taille * 0.9)}px/0.9 Doux,serif;letter-spacing:${(0.12 - 0.12 * doux(p / 3)).toFixed(3)}em;color:${couleur};text-shadow:0 4px 22px rgba(0,0,0,.35)">${esc(txt)}</div>`
      : THEME === 'typo' // typo : chaque lettre saute à son tour
      ? `<div style="position:absolute;left:0;right:0;top:${y}px;transform:translateY(-50%);text-align:center;white-space:nowrap;font:900 ${Math.round(Math.min(taille, 590 / (Math.max(1, [...txt].length) * 0.8)))}px/0.9 Rond,sans-serif;letter-spacing:-0.02em;text-transform:uppercase;color:${couleur};-webkit-text-stroke:6px #1d1a24;paint-order:stroke fill;text-shadow:0 6px 24px rgba(0,0,0,.25)">${[...txt].map((l, k) => `<span style="display:inline-block;transform:scale(${clamp(rebond(p * 2.2 - k * 0.12), 0, 1.2)})">${l === ' ' ? '&nbsp;' : esc(l)}</span>`).join('')}</div>`
      : THEME === 'pop'
      ? `<div style="position:absolute;left:0;right:0;top:${y}px;transform:translateY(-50%) scale(${1.18 - 0.18 * rebond(p / 0.6)});opacity:${p > 0 ? 1 : 0};text-align:center;font:900 ${taille}px/0.9 Rond,sans-serif;letter-spacing:-0.03em;text-transform:lowercase;color:${couleur};filter:drop-shadow(0 0 1.5px #2B3F6B) drop-shadow(0 0 1.5px #2B3F6B) drop-shadow(0 3px 8px rgba(0,0,0,.3));">${esc(txt)}</div>`
      : `<div style="position:absolute;left:0;right:0;top:${y}px;transform:translateY(-50%) scale(${0.82 + 0.18 * rebond(p)});opacity:${p > 0 ? 1 : 0};text-align:center;font:900 ${taille}px/0.9 Gros,serif;letter-spacing:-0.03em;color:${couleur};text-shadow:0 4px 18px rgba(0,0,0,.2)">${esc(txt)}</div>`
    const couleurGrand = T.couleur || ({ typo: PALETTE.jaune, pop: '#fff', doux: '#fff', editorial: THEME === 'editorial' ? PALETTE.sous((aG + fin) / 2, yG - tG * 0.45, yG + tG * 0.45) : '' })[THEME] || coul.beurre
    const couleurDessus = T.couleurDessus || ({ pop: PALETTE.mot })[THEME] || '#fff'
    const suiviD = suiveur(tD * 1.1), suiviG = suiveur(tG * 1.1)
    el.push({ a: 0, b: fin, calque: THEME === 'typo' || THEME === 'pop' ? 'devant' : 'derriere', dessin: t => {
      const sortie = 1 - clamp((t - (fin - 0.2)) / 0.2, 0, 1)
      return `<div style="position:absolute;inset:0;opacity:${sortie}">${T.dessus && t < aG ? ligne(T.dessus, tD, suiviD(t, yD), couleurDessus, (t - aD) / 0.22) : ''}${t >= aG ? ligne(T.grand, tG, suiviG(t, yG), couleurGrand, (t - aG) / (THEME === 'editorial' ? 0.3 : 0.22)) : ''}</div>`
    } })
  }

  if (T.grand && T.queue && THEME !== 'aurelie' && THEME !== 'doux' && THEME !== 'witchy' && !CHIC && THEME !== 'automne' && THEME !== 'studio') {
    const fin = HOOK, { tG, yG, aQ } = H
    const larg = Math.min(540, T.queue.length * 30 + 20), hQ = Math.ceil((T.queue.length * 30 + 20) / 540) * 72, v = visages(0, fin), touche = (x0, y0) => v.some(f => x0 < f[2] + 16 && x0 + larg > f[0] - 16 && y0 < f[3] + 16 && y0 + hQ > f[1] - 16)
    let x = 720 - 110 - larg, y = yG + tG * 0.5 + 6
    if (touche(x, y)) x = 60
    if (touche(x, y)) { x = 60; y = clamp(basVisage(0, fin) + 30, 560, 900) }
    el.push({ a: 0, b: fin, calque: 'devant', dessin: t => { const pQ = doux((t - aQ) / 0.25), sortie = 1 - clamp((t - (fin - 0.2)) / 0.2, 0, 1)
      const police = ({ typo: `font:400 62px/1 Script,cursive;color:${PALETTE.mot};-webkit-text-stroke:5px #fff;paint-order:stroke fill;transform:rotate(-4deg) scale(${0.8 + 0.2 * rebond(pQ)})`, pop: `font:700 52px/1 Fred,sans-serif;color:#fff;-webkit-text-stroke:5px ${PALETTE.marine};paint-order:stroke fill;transform:rotate(-4deg) scale(${0.7 + 0.3 * rebond(pQ)})`, editorial: `font:italic 400 56px/1 Didot,serif;color:#fff;filter:blur(${(1 - pQ) * 6}px)`, doux: `font:italic 500 58px/1 DouxI,serif;color:#fff` })[THEME] || `font:500 76px/0.95 Main,cursive;color:#fff;-webkit-text-stroke:1.2px #fff;transform:rotate(-4deg) translateX(${(1 - pQ) * 20}px)`
      return `<div style="position:absolute;left:${x}px;top:${y}px;${police};width:${larg}px;opacity:${pQ * sortie};text-shadow:0 2px 8px rgba(0,0,0,.45)">${esc(T.queue)}</div>` } })
  }

  // 3 bis. LA CONSTELLATION (collage.constellation : true, ou { "couleur": "#…", "trait": "#…" }) : pendant le hook,
  //        étoiles gonflées, étoiles au trait, petites étoiles blanches et nuages autour du titre. Une place qui touche
  //        son visage (repéré image par image) ou le texte du titre est retirée.
  if (K.constellation && T.grand && THEME !== 'aurelie') {
    const opt = K.constellation === true ? {} : K.constellation, cG = opt.couleur || coul.mot || C?.motFort?.couleur || '#5E8FE8'
    const fonce = h => { const v = parseInt(h.slice(1), 16), f = x => Math.round(x * 0.42).toString(16).padStart(2, '0'); return '#' + f(v >> 16) + f((v >> 8) & 255) + f(v & 255) }
    const cT = opt.trait || fonce(cG), vis = visages(0, HOOK), a0 = Math.max(0.05, H.aG - 0.1)
    const touche = (x, y, w, h, [x0, y0, x1, y1], m) => x < x1 + m && x + w > x0 - m && y < y1 + m && y + h > y0 - m
    const haut = H.yG - H.tG * 0.62 - (T.dessus ? 80 : 0), boiteTitre = [120, haut, 600, H.yG + H.tG * 0.5]
    // on cherche une place libre pour chaque élément, au plus près du titre : jamais sur son visage, jamais sur les
    // lettres, sans se chevaucher entre eux
    const LISTE = [['gonflee', 160], ['trait', 140], ['nuage', 190], ['blanche', 56], ['trait', 90], ['gonflee', 120], ['blanche', 40], ['trait', 110], ['nuage', 140], ['blanche', 62], ['trait', 74], ['blanche', 36]]
    const cx = 360, cy = (boiteTitre[1] + boiteTitre[3]) / 2, cand = []
    for (let y = 20; y <= 760; y += 34) for (let x = 6; x <= 650; x += 34) cand.push([x, y, Math.hypot(x + 40 - cx, (y + 40 - cy) * 1.25) + ((x * 7 + y * 13) % 53)])
    cand.sort((p, q) => p[2] - q[2])
    const basV = Math.max(420, ...vis.map(v => v[3])) // rien sous son menton : la poitrine est aux sous-titres
    const poses = [], places = []
    for (const [k, [ty, z]] of LISTE.entries()) {
      const h = ty === 'nuage' ? z * 0.62 : z
      const c = cand.find(([x, y]) => x + z <= 714 && y + h <= basV && !vis.some(v => touche(x, y, z, h, v, 26)) && !touche(x, y, z, h, boiteTitre, 6) && !poses.some(q => touche(x, y, z, h, q, 12)))
      if (!c) continue
      poses.push([c[0], c[1], c[0] + z, c[1] + h]); places.push([ty, c[0], c[1], z, ((k * 37) % 30) - 15])
    }
    const dessins = places.map(([ty, , , z, r]) => ({ gonflee: etoileGonflee(cG, z, r), trait: etoileTrait(cT, z, r), blanche: etoileBlanche(z, r), nuage: nuage(z) })[ty])
    if (places.length) {
      el.push({ a: a0, b: HOOK, calque: 'devant', dessin: t => { const sortie = 1 - clamp((t - (HOOK - 0.3)) / 0.3, 0, 1)
        return '<div style="position:absolute;inset:0;opacity:' + sortie + '">' + places.map(([ty, x, y], k) => { const tk = a0 + k * 0.07; if (t < tk) return ''
          const p = clamp(rebond((t - tk) / 0.3), 0, 1.2), f = Math.sin((t - tk) * 2 + k * 1.7) * (ty === 'nuage' ? 3 : 5)
          return '<div style="position:absolute;left:' + x + 'px;top:' + (y + f) + 'px;transform:scale(' + p + ')">' + dessins[k] + '</div>' }).join('') + '</div>' } })
      sons.push({ t: a0, fam: 'magie', vol: 0.07 })
    }
  }

  // 4. Étiquettes tapées à la machine, et 5. barrées au feutre (deux passages, aller puis retour) puis corrigées à la main.
  //    Elles se posent AVANT les mots géants : un mot géant ne vient jamais sur une étiquette.
  const etiquette = (s, barre) => {
    const t0 = tf(s.t), duree = s.duree || (barre ? 3 : 2.4), fin = Math.min(TOT, t0 + duree)
    const tape = s.texte.length / 16, tBarre = t0 + tape + 0.25
    const y = clamp(basVisage(t0, fin) + 130, 640, 760)
    el.push({ a: t0, b: fin, calque: 'devant', zone: 'poitrine', dessin: t => {
      const n = Math.min(s.texte.length, Math.floor((t - t0) * 16) + 1), pB = clamp((t - tBarre) / 0.4, 0, 1), pP = doux((t - tBarre - 0.5) / 0.25)
      return `<div style="position:absolute;left:56px;top:${y}px;transform:rotate(-3deg);transform-origin:left center">
        <div style="position:relative;display:inline-block;background:${coul.papier};padding:10px 18px 8px;box-shadow:0 3px 10px rgba(0,0,0,.25);font:700 32px/1.1 Machine,monospace;color:${coul.encre};white-space:nowrap">${esc(s.texte.slice(0, n))}<span style="opacity:0">${esc(s.texte.slice(n))}</span>
          ${barre && pB > 0 ? `<div style="position:absolute;left:-8px;right:-8px;top:46%;height:7px;border-radius:4px;background:${coul.tomate};transform:rotate(-1.5deg);clip-path:inset(0 ${100 - 100 * clamp(pB * 1.6, 0, 1)}% 0 0)"></div><div style="position:absolute;left:-4px;right:-10px;top:60%;height:5px;border-radius:3px;background:${coul.tomate};opacity:.9;transform:rotate(1.2deg);clip-path:inset(0 0 0 ${100 - 100 * clamp((pB - 0.55) * 2.3, 0, 1)}%)"></div>` : ''}
        </div>
        ${barre && s.puis && pP > 0 ? `<div style="margin:6px 0 0 30px;font:400 42px/1.1 Carnet,cursive;color:${coul.tomate};opacity:${pP};transform:translateY(${(1 - pP) * 10}px) rotate(-2deg);-webkit-text-stroke:7px #fff;paint-order:stroke fill">${esc(s.puis)}</div>` : ''}
      </div>`
    } })
    sons.push({ t: t0, fam: 'clavier', vol: 0.09, duree: Math.min(1.2, tape + 0.1) })
    if (barre) sons.push({ t: tBarre, fam: 'clic', vol: 0.12 })
  }
  for (const s of K.etiquettes || []) etiquette(s, false)
  for (const s of K.barres || []) etiquette(s, true)

  // 6. La page de carnet : elle tombe, le titre est en rouge, chaque ligne s'écrit. Jamais sur le visage :
  //    cinq places essayées (en haut d'un côté, de l'autre, plus petite, sur la poitrine), sinon pas de carnet.
  if (K.carnet) {
    const c = K.carnet, t0 = tf(c.t), fin = Math.min(TOT, t0 + (c.duree || 5)), items = c.items || []
    const pas = (fin - t0 - 0.9) / Math.max(1, items.length), larg = 400, haut = 110 + items.length * 50
    const v = visages(t0, fin), cx = v.length ? v.reduce((s, x) => s + (x[0] + x[2]) / 2, 0) / v.length : 360
    const touche = (x0, y0, e) => v.some(f => x0 - 20 < f[2] + 16 && x0 + larg * e + 20 > f[0] - 16 && y0 - 30 < f[3] + 16 && y0 + haut * e + 20 > f[1] - 16)
    const cote = cx > 360 ? 52 : 720 - 96 - larg, autre = cx > 360 ? 720 - 96 - larg : 52, bas = clamp(basVisage(t0, fin) + 30, 560, 870 - haut * 0.8)
    const place = [[cote, 180, 1], [cote, 180, 0.8], [autre, 180, 0.8], [cote, bas, 0.8], [autre, bas, 0.8]].find(([x0, y0, e]) => !touche(x0 + (cx > 360 ? 0 : larg * (1 - e)), y0, e))
    if (!place) console.log('  (carnet retiré : pas de place sans toucher le visage)')
    const [x, y, ech] = place || [0, 0, 0]
    if (place) el.push({ a: t0, b: fin, calque: 'devant', zone: 'poitrine', dessin: t => {
      const pT = doux((t - t0) / 0.3), sortie = 1 - clamp((t - (fin - 0.2)) / 0.2, 0, 1)
      const lignesC = items.map((it, k) => { const a = t0 + 0.6 + k * pas, n = Math.floor((t - a) * 18); return n > 0 ? `<div style="height:50px;line-height:50px">${esc(it.slice(0, n))}</div>` : '<div style="height:50px"></div>' }).join('')
      return `<div style="position:absolute;left:${x}px;top:${y - (1 - pT) * 120}px;width:${larg}px;height:${haut}px;opacity:${sortie};transform:scale(${ech}) rotate(${-8 + 5 * pT}deg);transform-origin:${cx > 360 ? 'left' : 'right'} top;background:#FFFDF6 repeating-linear-gradient(transparent 0 49px,#c7d6ee 49px 50px);background-position:0 10px;box-shadow:0 8px 22px rgba(0,0,0,.25);border-left:3px solid #e7a1a1">
        <div style="position:absolute;left:50%;top:-14px;width:120px;height:30px;margin-left:-60px;background:rgba(214,190,146,.8);transform:rotate(-4deg)"></div>
        <div style="padding:14px 18px 0 30px;font:400 34px/1.1 Carnet,cursive;color:${coul.tomate}">${esc(c.titre || '')}</div>
        <div style="padding:6px 18px 0 30px;font:400 26px/50px Carnet,cursive;color:${coul.encre};white-space:nowrap">${lignesC}</div>
      </div>`
    } })
    if (place) { sons.push({ t: t0, fam: 'page', vol: 0.12 }); items.forEach((_, k) => sons.push({ t: t0 + 0.6 + k * pas, fam: 'clic', vol: 0.08 })) }
  }

  // 3. Les mots forts en géant, derrière sa tête (un toutes les 4 s au plus, jamais pendant le hook ni un médaillon)
  let dernierG = -9, ARC = null; const TYPO = [] // typo : l'ordre des mots forts, pour faire tourner les animations
  const tient = (txt, voulu, largeurLettre, max = 590) => Math.round(Math.min(voulu, max / (Math.max(1, [...txt].length) * largeurLettre))) // taille qui tient sur UNE ligne
  for (const [ip, p] of phrases.entries()) {
    if (THEME === 'doux' || THEME === 'witchy' || CHIC || THEME === 'automne' || THEME === 'studio') break // doux et witchy : pas de mots géants, l'italique des sous-titres suffit
    const forts = mots.filter(m => m.ip === ip && m.fort); if (!forts.length) continue
    const t0 = forts[0].t; if (t0 < HOOK + 0.3 || t0 - dernierG < 4 || dansMed(t0) || t0 > TOT - 1.2) continue
    if ([...(K.listes || []), ...(K.effets || [])].some(L => { const a = tf(L.t); return t0 < a + 6 && t0 > a - 1.8 })) continue // pas de mot géant pendant une liste ou un effet
    const prochainMed = MED.map(([a]) => a).filter(a => a > t0)[0] ?? TOT
    const fin = Math.min(TOT - 0.1, forts.at(-1).t + 1.7, prochainMed - 0.05), mot = forts.map(m => m.w).join(' ').replace(/[,.;:!?]+$/, '')
    if (fin - t0 < 0.8) continue // trop court pour être lu (un médaillon arrive)
    if (THEME === 'aurelie' && PHOTOS.some(ph => ph.a < fin + 0.2 && ph.b > t0 - 0.2)) continue // les photos d'enfance prennent l'écran
    // Éditorial : pas de mot géant mais une CITATION de magazine — grand guillemet, la phrase en Didone italique,
    // signée de son prénom en petites capitales ; un chiffre devient un « chiffre clé » énorme. Elle prend la place
    // de la légende du bas (jamais les deux), au-dessus de la tête ou sous le menton, sinon elle saute.
    if (THEME === 'editorial') {
      const a = Math.max(p.a, HOOK + 0.1), b = Math.min(p.b + 0.3, prochainMed - 0.05, TOT - 0.1, K.fin?.motCle ? tf(K.fin.t ?? TOT - 3.5) - 0.05 : TOT); if (b - a < 1) continue // jamais en même temps que la fin
      const chiffre = mot.match(/^(\d[\d\s.,]*)\s*(.*)$/), texte = p.txt.replace(/\*/g, '')
      const lignesC = Math.ceil(texte.length * 25 / 520), h = chiffre ? 260 : 96 + lignesC * 58 + 44
      const haut = hautTete(a, b), bas = basVisage(a, b)
      const y = haut - 24 - h >= 180 ? 180 + (haut - 24 - h - 180) / 2 : bas + 24 + h <= 860 ? bas + 24 : null
      if (y == null) continue
      dernierG = t0
      const nom = (C.nom || '').toUpperCase(), html = esc(p.txt).replace(/\*([^*]+)\*/g, `<span style="color:${PALETTE.rose}">$1</span>`)
      const teinteC = PALETTE.sous((a + b) / 2, y, y + (chiffre ? 200 : 80))
      el.push({ a, b, calque: 'devant', zone: 'citation', dessin: t => {
        const q = doux((t - a) / 0.35), sortie = 1 - clamp((t - (b - 0.2)) / 0.2, 0, 1)
        if (chiffre) return `<div style="position:absolute;left:70px;right:110px;top:${y}px;text-align:center;opacity:${q * sortie}">
          <div style="font:800 ${Math.round(clamp(540 / (0.62 * chiffre[1].trim().length), 90, 230))}px/0.85 DidotG,serif;white-space:nowrap;color:${teinteC};letter-spacing:-0.03em;transform:translateY(${(1 - q) * 20}px)">${esc(chiffre[1].trim())}</div>
          <div style="font:italic 400 52px/1 Didot,serif;color:#fff;margin-top:6px;text-shadow:0 2px 12px rgba(0,0,0,.4)">${esc(chiffre[2].trim())}</div></div>`
        return `<div style="position:absolute;left:70px;right:110px;top:${y}px;text-align:center;opacity:${q * sortie};text-shadow:0 2px 14px rgba(0,0,0,.45)">
          <div style="font:800 130px/0.6 DidotG,serif;color:${teinteC};height:70px">«</div>
          <div style="font:italic 400 52px/1.1 Didot,serif;color:#fff;transform:translateY(${(1 - q) * 12}px)">${html}</div>
          <div style="font:500 17px/1 Poppins,sans-serif;letter-spacing:0.32em;color:#fff;margin-top:22px">— ${esc(nom)}</div></div>`
      } })
      sons.push({ t: a, fam: 'whoosh', vol: 0.05 }); continue
    }
    // Pop : UNE fois par vidéo, le mot fort court s'écrit en arc au-dessus de sa tête, lettre par lettre, et l'image
    // passe en noir et blanc le temps du mot (le texte reste en couleur : c'est lui qu'on voit)
    if (THEME === 'pop' && !ARC && mot.length <= 9 && t0 > TOT * 0.3) {
      const v = visages(t0, fin); if (v.length) {
        const cx = v.reduce((s, x) => s + (x[0] + x[2]) / 2, 0) / v.length, fw = v.reduce((s, x) => s + x[2] - x[0], 0) / v.length
        const R = clamp(fw * 1.5, 200, 330), centreY = hautTete(t0, fin) - 30 + R, lettres = [...mot]
        if (centreY - R - 40 > 170) {
          ARC = [t0, fin]; dernierG = t0
          el.push({ a: t0, b: fin, calque: 'devant', dessin: t => lettres.map((l, k) => {
            const th = (-70 + 140 * (lettres.length === 1 ? 0.5 : k / (lettres.length - 1))) * Math.PI / 180, p = clamp((t - t0 - k * 0.035) / 0.08, 0, 1)
            return `<div style="position:absolute;left:${cx + R * Math.sin(th)}px;top:${centreY - R * Math.cos(th)}px;transform:translate(-50%,-50%) rotate(${th}rad) scale(${p});font:900 76px/1 Rond,sans-serif;text-transform:lowercase;color:${PALETTE.mot};-webkit-text-stroke:6px #fff;paint-order:stroke fill">${esc(l)}</div>`
          }).join('') + etoile(44, PALETTE.etoile, `position:absolute;left:${cx - R * 1.02 - 22}px;top:${centreY - R * 0.3 - 22}px`) + etoile(44, PALETTE.etoile, `position:absolute;left:${cx + R * 1.02 - 22}px;top:${centreY - R * 0.3 - 22}px`) })
          sons.push({ t: t0, fam: 'magie', vol: 0.1 }); continue
        }
      }
    }
    const avant = mots.filter(m => m.ip === ip && !m.fort && m.t < t0).slice(-3)
    let taille = Math.round(clamp(620 / (0.56 * mot.length), 80, 200))
    const ht = hautTete(t0, fin), place = ht - 170 - 44 // sous les onglets, et la ligne du petit texte au-dessus
    let yG, calque = THEME === 'typo' || THEME === 'pop' ? 'devant' : 'derriere' // typo : devant (CONTOUR_TYPO), jamais mangé par le découpage
    if (THEME !== 'aurelie' && place >= taille * 0.72) yG = ht - taille * 0.3 // signature : cadrée serré, ses titres vont sur la poitrine
    else if (THEME !== 'aurelie' && place >= 80 * 0.72) { taille = Math.floor(place / 0.72); yG = ht - taille * 0.3 }
    else if (el.some(e => e.zone === 'poitrine' && e.a < fin && e.b > t0)) continue
    else if (K.fin?.motCle && fin > tf(K.fin.t ?? TOT - 3.5)) continue // la barre de commentaire de la fin prend la poitrine // la poitrine est déjà prise par une étiquette
    else { calque = 'devant'; taille = Math.min(taille, 150); yG = clamp(basVisage(t0, fin) + taille * 0.55 + 40, 520, 870 - taille * 0.5) } // pas de place au-dessus : sur la poitrine
    dernierG = t0; if (THEME === 'typo') TYPO.push(t0)
    const suivi = suiveur(taille * 1.2), yG0 = yG
    if (THEME === 'pop') GEANTS_POP.push([avant[0]?.t ?? t0, fin])
    el.push({ a: avant[0]?.t ?? t0, b: fin, calque, zone: calque === 'devant' ? 'geant' : null, dessin: t => { const yG = suivi(t, yG0) // le mot suit son visage
      const sortie = 1 - clamp((t - (fin - 0.2)) / 0.2, 0, 1), pG = rebond((t - t0) / 0.25)
      const petit = avant.filter(m => t >= m.t).map(m => esc(m.w)).join(' ')
      if (THEME === 'editorial') {
        // flou vers net, sans rebond ; un chiffre devient énorme couleur pêche, le reste en italique à côté
        const p = doux((t - t0) / 0.3), chiffre = mot.match(/^(\d[\d\s.,]*)(.*)$/)
        const gros = chiffre ? `<span style="font:800 ${Math.round(taille * 1.5)}px/0.8 Edito,sans-serif;letter-spacing:-0.05em;color:${PALETTE.peche}">${esc(chiffre[1].trim())}</span><span style="font:italic 400 ${Math.round(taille * 0.42)}px/1 Ital,serif;color:#fff;vertical-align:top;margin-left:10px">${esc(chiffre[2].trim())}</span>` : esc(mot)
        const mots2 = mot.split(/\s+/), hPile = mots2.reduce((s, w) => s + clamp(600 / (0.56 * Math.max(2, w.length)), 90, 230) * 0.84, 0)
        if (!chiffre) return `<div style="position:absolute;inset:0;opacity:${sortie}">
          ${petit ? `<div style="position:absolute;left:56px;right:104px;top:${yG - hPile / 2 - 52}px;font:italic 400 46px/1 Ital,serif;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.35)">${petit}</div>` : ''}
          ${t >= t0 ? pile(mots2, yG, PALETTE.rose, (t - t0) / 0.3) : ''}</div>`
        return `<div style="position:absolute;inset:0;opacity:${sortie}">
          ${petit ? `<div style="position:absolute;left:0;right:0;top:${yG - taille * 0.5 - 40}px;text-align:center;font:italic 400 44px/1 Ital,serif;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.35)">${petit}</div>` : ''}
          ${t >= t0 ? `<div style="position:absolute;left:0;right:0;top:${yG}px;transform:translateY(-50%) scale(${1.06 - 0.06 * p});opacity:${clamp(p * 1.5, 0, 1)};filter:blur(${(1 - p) * 12}px);text-align:center;font:800 ${taille}px/0.82 Edito,sans-serif;letter-spacing:-0.05em;text-transform:lowercase;color:${PALETTE.rose};text-shadow:0 10px 28px rgba(0,0,0,.35)">${gros}</div>` : ''}
        </div>`
      }
      if (THEME === 'aurelie') {
        // ses titres : capitales Anton serrées, ivoire, le dernier mot en bordeaux ; les petits mots avant, en italique
        const p = rebond((t - t0) / 0.22), ws = mot.toUpperCase().split(/\s+/)
        const corps = ws.map((w, k) => `<span style="color:${k === ws.length - 1 && ws.length > 1 ? AUR.bordeaux : AUR.ivoire}">${esc(w)}</span>`).join(' ')
        return `<div style="position:absolute;inset:0;opacity:${sortie}">
          ${petit ? `<div style="position:absolute;left:0;right:0;top:${yG - taille * 0.55 - 40}px;text-align:center;font:italic 400 52px/1 Didot,serif;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.35)">${petit}</div>` : ''}
          ${t >= t0 ? `<div style="position:absolute;left:0;right:0;top:${yG}px;transform:translateY(-50%) scale(${0.85 + 0.15 * p});text-align:center;font:400 ${Math.round(taille * 1.05)}px/0.9 Anton,sans-serif;letter-spacing:-0.01em;text-shadow:0 6px 24px rgba(0,0,0,.25)">${corps}</div>` : ''}
        </div>`
      }
      if (THEME === 'typo') {
        const k = TYPO.indexOf(t0) % 5, coulT = [PALETTE.jaune, PALETTE.lilas, PALETTE.mot, PALETTE.cyan, PALETTE.rose][k], dt = t - t0
        const haut = petit ? `<div style="position:absolute;left:0;right:0;top:${yG - taille * 0.55 - 40}px;text-align:center;font:600 30px/1 Poppins,sans-serif;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.5)">${petit}</div>` : ''
        if (t < t0) return `<div style="position:absolute;inset:0;opacity:${sortie}">${haut}</div>`
        const lettres = [...mot.toUpperCase()]
        const corps = [
          // 0. tapé au clavier, avec son curseur
          () => { const n = clamp(Math.floor(dt * 14) + 1, 0, mot.length), cur = n < mot.length || Math.floor(t * 2.5) % 2 ? `<span style="color:#fff">|</span>` : ''
            return `<div style="position:absolute;left:0;right:0;top:${yG}px;transform:translateY(-50%);text-align:center;white-space:nowrap;font:700 ${tient(mot + '|', taille * 0.8, 0.58)}px/1 Mono,monospace;letter-spacing:-0.04em;color:${coulT};-webkit-text-stroke:6px #1d1a24;paint-order:stroke fill;text-shadow:0 4px 18px rgba(0,0,0,.3)">${esc(mot.slice(0, n))}${cur}</div>` },
          // 1. les lettres sautent une à une
          () => `<div style="position:absolute;left:0;right:0;top:${yG}px;transform:translateY(-50%);text-align:center;white-space:nowrap;font:900 ${tient(mot, taille, 0.84)}px/0.9 Rond,sans-serif;letter-spacing:0.02em;color:${coulT};-webkit-text-stroke:6px #1d1a24;paint-order:stroke fill;text-shadow:0 6px 22px rgba(0,0,0,.25)">${lettres.map((l, j) => `<span style="display:inline-block;transform:translateY(${(1 - clamp(rebond((dt - j * 0.06) / 0.22), 0, 1.2)) * 60}px) scale(${clamp(rebond((dt - j * 0.06) / 0.22), 0, 1.2)})">${l === ' ' ? '&nbsp;' : esc(l)}</span>`).join('')}</div>`,
          // 2. néon qui s'allume (deux petits clignements)
          () => { const on = dt < 0.08 || (dt > 0.16 && dt < 0.22) || dt > 0.3 ? 1 : 0.25
            return `<div style="position:absolute;left:0;right:0;top:${yG}px;transform:translateY(-50%);text-align:center;white-space:nowrap;font:700 ${tient(mot, taille, 0.6)}px/0.95 Fred,sans-serif;letter-spacing:0.01em;color:#fff;-webkit-text-stroke:3px ${coulT};paint-order:stroke fill;opacity:${on};text-shadow:0 0 4px rgba(0,0,0,.55),0 0 14px ${coulT},0 0 34px ${coulT},0 3px 10px rgba(0,0,0,.45)">${esc(mot.toLowerCase())}</div>` },
          // 3. en arc de cercle, qui se déroule
          () => { const R = 420, w = Math.min(640, mot.length * taille * 0.55), q = doux(dt / 0.45)
            return `<svg style="position:absolute;left:0;top:${yG - taille * 0.9}px;overflow:visible" width="720" height="${taille * 2}" viewBox="0 0 720 ${taille * 2}"><defs><path id="arc${k}" d="M ${360 - w / 2} ${taille * 1.2} Q 360 ${taille * 1.2 - w * 0.32} ${360 + w / 2} ${taille * 1.2}"/></defs><text font-family="Fred" font-weight="700" font-size="${tient(mot, taille * 0.85, 0.66, Math.min(640, mot.length * taille * 0.55))}" fill="${coulT}" stroke="#1d1a24" stroke-width="8" paint-order="stroke" text-anchor="middle" letter-spacing="2"><textPath href="#arc${k}" startOffset="50%">${esc(mot.toLowerCase().slice(0, Math.max(1, Math.round(mot.length * q))))}</textPath></text></svg>` },
          // 4. le duo de polices : un petit mot manuscrit qui chevauche un grand mot serré
          () => { const q = rebond(dt / 0.3), grand = mot, fin = avant.length ? avant.at(-1).w.replace(/[,.;:!?]+$/, '') : '' // le petit mot dit juste avant, en manuscrite
            return `<div style="position:absolute;left:0;right:0;top:${yG}px;transform:translateY(-50%) scale(${0.8 + 0.2 * clamp(q, 0, 1.15)});text-align:center">
              ${fin ? `<div style="font:400 ${Math.round(taille * 0.5)}px/1 Script,cursive;color:#fff;margin-bottom:-${Math.round(taille * 0.18)}px;position:relative;z-index:1;text-shadow:0 2px 10px rgba(0,0,0,.4)">${esc(fin)}</div>` : ''}
              <div style="white-space:nowrap;font:400 ${tient(grand, taille * 1.1, 0.5)}px/0.9 Anton,sans-serif;text-transform:uppercase;letter-spacing:0.01em;color:${coulT};-webkit-text-stroke:6px #1d1a24;paint-order:stroke fill;text-shadow:0 6px 24px rgba(0,0,0,.3)">${esc(grand)}</div></div>` },
        ][k]()
        return `<div style="position:absolute;inset:0;opacity:${sortie}">${k === 4 ? '' : haut}${corps}</div>` // le duo porte déjà le petit mot d'avant
      }
      if (THEME === 'pop') {
        // ça claque : ×1,18 → 1 en un éclair, blanc, deux étoiles jaunes
        const p = rebond((t - t0) / 0.14)
        return `<div style="position:absolute;inset:0;opacity:${sortie}">
          ${petit ? `<div style="position:absolute;left:0;right:0;top:${yG - taille * 0.55 - 36}px;text-align:center;font:italic 400 40px/1 Ital,serif;color:#EAF2FB;text-shadow:0 2px 10px rgba(0,0,0,.3)">${petit}</div>` : ''}
          ${t >= t0 ? `<div style="position:absolute;left:0;right:0;top:${yG}px;transform:translateY(-50%) scale(${1.18 - 0.18 * p});text-align:center;font:900 ${taille}px/0.9 Rond,sans-serif;letter-spacing:-0.03em;text-transform:lowercase;color:#fff;filter:drop-shadow(0 0 1.5px #2B3F6B) drop-shadow(0 0 1.5px #2B3F6B) drop-shadow(0 3px 8px rgba(0,0,0,.3));">${etoile(46, PALETTE.etoile, 'vertical-align:top;margin-right:6px;transform:rotate(-14deg)')}${esc(mot)}${etoile(38, PALETTE.etoile, 'vertical-align:bottom;margin-left:6px;transform:rotate(12deg)')}</div>` : ''}
        </div>`
      }
      return `<div style="position:absolute;inset:0;opacity:${sortie}">
        ${petit ? `<div style="position:absolute;left:0;right:0;top:${yG - taille * 0.55 - 34}px;text-align:center;font:500 60px/1 Main,cursive;color:#fff;-webkit-text-stroke:1px #fff;text-shadow:0 2px 10px rgba(0,0,0,.3)">${petit}</div>` : ''}
        ${t >= t0 ? `<div style="position:absolute;left:0;right:0;top:${yG}px;transform:translateY(-50%) scale(${0.75 + 0.25 * pG});text-align:center;font:900 ${taille}px/0.9 Gros,serif;letter-spacing:-0.03em;color:${coul.beurre};text-shadow:0 4px 18px rgba(0,0,0,.18)">${esc(mot)}</div>` : ''}
      </div>`
    } })
    if (THEME === 'typo') { const k = (TYPO.length - 1) % 5; sons.push(k === 0 ? { t: t0, fam: 'clavier', vol: 0.09, duree: mot.length / 14 + 0.1 } : k === 2 ? { t: t0, fam: 'magie', vol: 0.08 } : { t: t0, fam: k === 3 ? 'whoosh' : 'pop', vol: 0.1 }) }
    else sons.push(THEME === 'editorial' ? { t: t0, fam: 'whoosh', vol: 0.06 } : { t: t0, fam: 'pop', vol: 0.12 })
  }

  // 7. L'intermède (`collage.medaillon`), un par style. La vidéo réduite se fait au rendu ; ici, le cadre et les mots.
  //    collage : médaillon sur papier quadrillé, mots en machine à écrire rouge en escalier ;
  //    pop : carte inclinée sur fond bleu ciel semé d'étoiles, la phrase qui claque en dessous ;
  //    éditorial : la vidéo rétrécit en carte sur fond bordeaux nuit, la phrase en chapeau.
  const CARTE = { pop: { l: 432, h: 768, cy: 560, rot: -3 } }[THEME]
  for (const [a, b] of MED) {
    if (THEME === 'doux' || THEME === 'typo' || CHIC || THEME === 'automne' || THEME === 'studio') continue // doux et typo : pas d'intermède
    if (THEME === 'witchy') { // PAGE DE GRIMOIRE
      const ps = phrases.filter(p => p.b > a + 0.05 && p.a < b - 0.05)
      const hasard = k => { const x = Math.sin(k * 7.13 + a * 3.1) * 43758.5453; return x - Math.floor(x) }
      const pts = Array.from({ length: 6 }, (_, k) => [110 + k * 100 + hasard(k) * 40, 240 + hasard(k + 9) * 160])
      el.push({ a, b, calque: 'devant', zone: 'page', dessin: t => {
        const q = doux((t - a) / 0.45) * (1 - doux((t - (b - 0.4)) / 0.4)), tr = clamp((t - a - 0.3) / 1.6, 0, 1)
        const etoiles = Array.from({ length: 34 }, (_, k) => WI.etoile4(Math.round(hasard(k + 20) * 700), Math.round(hasard(k + 70) * 1260), 6 + (k % 4) * 4, (q * (0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + k)))).toFixed(2))).join('')
        const ligne = '<svg style="position:absolute;left:0;top:0;opacity:' + q.toFixed(2) + '" width="720" height="1280"><path d="M' + pts.map(p => p.map(v => v.toFixed(0)).join(' ')).join(' L') + '" fill="none" stroke="' + PALETTE.or + '" stroke-width="1.8" pathLength="100" stroke-dasharray="100" stroke-dashoffset="' + (100 * (1 - tr)).toFixed(1) + '"/>' + pts.map(([x, y], k) => tr * pts.length > k ? '<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="5" fill="' + PALETTE.or + '"/>' : '').join('') + '</svg>'
        const texte = ps.map((p, k) => { const v = doux((t - Math.max(a, p.a)) / 0.5); if (v <= 0) return ''
          const html = esc(p.txt).replace(/\*([^*]+)\*/g, (_, w) => '<span style="color:' + PALETTE.or + ';text-shadow:0 0 14px ' + PALETTE.or + '">' + w + '</span>')
          return '<div style="font:italic 500 ' + (k === ps.length - 1 ? 60 : 48) + 'px/1.25 DouxI,serif;color:' + PALETTE.creme + ';opacity:' + v.toFixed(2) + ';filter:blur(' + ((1 - v) * 6).toFixed(1) + 'px);text-shadow:0 0 14px ' + PALETTE.or + '55">' + html + '</div>' }).join('')
        return '<div style="position:absolute;inset:0;background:radial-gradient(90% 70% at 50% 45%,' + PALETTE.nuit + 'f4,#0d0a0cfc);opacity:' + q.toFixed(2) + '"></div>' + etoiles + ligne
          + '<div style="position:absolute;left:70px;right:70px;top:540px;text-align:center;text-wrap:balance;opacity:' + q.toFixed(2) + '">' + texte + '</div>'
      } })
      sons.push({ t: a, fam: 'magie', vol: 0.06 })
      continue
    }
    if (THEME === 'editorial') {
      // la « page de titre » (choix d'Aurélie, B) : un aplat couleur décor couvre l'écran, sa voix continue, et ses mots
      // se TAPENT comme au clavier, avec le bruit des touches. La 1re phrase en gros titre, la suite en texte, puis sa signature.
      const ps = phrases.filter(p => p.b > a + 0.05 && p.a < b - 0.05), nom = (C.nom || '').toUpperCase(), VIT = 17 // caractères par seconde
      const fond = PALETTE.sous((a + b) / 2, 0, 1280) === PALETTE.fonce ? PALETTE.fonce : PALETTE.bordeaux
      el.push({ a, b, calque: 'devant', zone: 'page', dessin: t => {
        const pf = doux((t - a) / 0.18)
        // chaque phrase se tape au rythme où elle est DITE (17 caractères/s au moins) et a fini avant la suivante
        const tape = (p, k) => { const s = p.txt.replace(/\*/g, ''), v = Math.max(VIT, s.length / Math.max(0.3, (Math.min(p.b, b) - Math.max(a, p.a)) * 0.85)), n = clamp(Math.floor((t - Math.max(a, p.a)) * v), 0, s.length); return { s, n, html: esc(s.slice(0, n)).replace(/(\S+)$/, m => m) + (n > 0 && n < s.length ? '<span style="opacity:.8">|</span>' : '') } }
        const [titre, ...suite] = ps.map(tape)
        return `<div style="position:absolute;inset:0;background:${fond};opacity:${pf}"></div>
          <div style="position:absolute;left:60px;right:104px;top:250px;opacity:${pf}">
            <div style="font:800 76px/0.92 DidotG,sans-serif;letter-spacing:-0.045em;text-transform:lowercase;color:#fff">${titre ? titre.html : ''}</div>
            <div style="margin-top:40px;font:500 34px/1.3 DidotT,sans-serif;color:#fff">${suite.map(x => x.html).join(' ')}</div>
            ${t > b - 0.9 ? `<div style="margin-top:46px;font:500 17px/1 Poppins,sans-serif;letter-spacing:0.32em;color:#fff;opacity:${doux((t - b + 0.9) / 0.3)}">— ${esc(nom)}</div>` : ''}
          </div>`
      } })
      ps.forEach(p => { const d = (Math.min(p.b, b) - Math.max(a, p.a)) * 0.85; if (d > 0.15) sons.push({ t: Math.max(a, p.a), fam: 'clavier', vol: 0.12, duree: d }) })
      continue
    }
    sons.push({ t: a, fam: 'whoosh', vol: THEME === 'editorial' ? 0.08 : 0.14 })
    if (CARTE) { el.push({ a, b, calque: 'devant', dessin: t => {
      const pR = doux((t - a) / 0.2), p = phrases.find(p => t >= p.a && t < p.b)
      const ici = p ? mots.filter(m => m.ip === phrases.indexOf(p) && t >= m.t) : []
      if (THEME === 'witchy') return '<div style="position:absolute;left:60px;right:104px;top:1046px;text-align:center;font:italic 500 40px/1.2 DouxI,serif;color:' + PALETTE.creme + ';opacity:' + pR + '">' + ici.map(m => m.fort ? '<span style="color:' + PALETTE.or + ';text-shadow:0 0 12px ' + PALETTE.or + '">' + esc(m.w) + '</span>' : esc(m.w)).join(' ') + '</div>'
      const texte = THEME === 'pop'
        ? ici.map(m => `<span style="display:inline-block;margin:0 6px;${m.fort ? `font:900 70px/1 Rond,sans-serif;color:${PALETTE.etoile}` : 'font:900 46px/1.1 Rond,sans-serif;color:#fff'};-webkit-text-stroke:4px ${PALETTE.marine};paint-order:stroke fill">${esc(m.w)}</span>`).join(' ')
        : ici.map(m => m.fort ? `<span style="font:italic 400 52px/1 Ital,serif;color:${PALETTE.rose}">${esc(m.w)}</span>` : esc(m.w)).join(' ')
      return `<div style="position:absolute;left:${360 - CARTE.l / 2 - 8}px;top:${CARTE.cy - CARTE.h / 2 - 8}px;width:${CARTE.l + 16}px;height:${CARTE.h + 16}px;box-sizing:border-box;border:8px solid ${THEME === 'pop' ? '#fff' : 'rgba(255,255,255,.0)'};border-radius:${THEME === 'pop' ? 30 : 4}px;transform:rotate(${CARTE.rot}deg);opacity:${pR}"></div>
        ${THEME === 'pop' ? `${etoile(70, PALETTE.marine, `position:absolute;left:${360 - CARTE.l / 2 - 40}px;top:${CARTE.cy - CARTE.h / 2 - 34}px;transform:rotate(-14deg) scale(${rebond((t - a - 0.15) / 0.22)})`)}${etoile(36, PALETTE.etoile, `position:absolute;right:120px;top:${CARTE.cy - CARTE.h / 2 + 30}px;transform:rotate(12deg)`)}` : ''}
        <div style="position:absolute;left:60px;right:104px;bottom:${THEME === 'pop' ? 290 : 320}px;text-align:center;${THEME === 'pop' ? 'text-transform:lowercase' : `font:700 38px/1 Edito,sans-serif;letter-spacing:-0.03em;text-transform:lowercase;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.5)`}">${texte}</div>`
    } }); continue }
    el.push({ a, b, calque: 'devant', dessin: t => {
      const pR = doux((t - a) / 0.3)
      const ici = mots.filter(m => m.t >= a - 0.05 && m.t < b && t >= m.t)
      const ip = ici.at(-1)?.ip, visibles = ici.filter(m => m.ip === ip || (ici.length < 8 && m.ip !== ip))
      const motsH = visibles.slice(-7).map((m, k) => `<span style="display:inline-block;margin:0 12px 6px 0;transform:translateY(${(k % 2) * 10}px);${m.fort ? `font:900 70px/1 Gros,serif;color:${coul.tomate}` : `font:700 38px/1 Mono,monospace;color:${coul.tomate}`}">${esc(m.w)}</span>`).join('')
      return `<div style="position:absolute;left:${360 - 270}px;top:${500 - 270}px;width:540px;height:540px;border-radius:50%;border:12px solid #fff;box-sizing:border-box;box-shadow:0 10px 30px rgba(0,0,0,.18);opacity:${pR};transform:scale(${0.9 + 0.1 * pR})"></div>
        <div style="position:absolute;left:70px;right:110px;top:810px;line-height:1.1">${motsH}</div>`
    } })
  }

  // 7 bis. LISTES ANIMÉES : quand elle énumère (« 3 erreurs », « mes étapes »), au lieu d'une liste à cocher
  for (const L of LUXE ? [] : K.listes || []) { // en luxe, les listes passent par effets2 (listeLuxe)
    if (L.type === 'notes') { // la to-do d'appli et ses 4 looks, dessinées par listes.mjs
      const Lm = listeNotes(L, { clamp, doux, rebond, esc, couleurs: { coche: (K.couleurs || {}).coche || coul.mot || C?.motFort?.couleur || '#F25C9A' } }); if (!Lm) continue
      const t0 = tf(L.t), b = Math.min(TOT - 0.1, t0 + Lm.duree), y = FV ? clamp(hautTete(t0, b) - Lm.hauteur - 30, 110, 1280 - 290 - Lm.hauteur) : clamp(basVisage(t0, b) + 50, 430, 1280 - 290 - Lm.hauteur)
      el.push({ a: t0, b, calque: 'devant', zone: 'geant', parle: true, dessin: t => '<div style="position:absolute;inset:0;opacity:' + (1 - clamp((t - (b - 0.25)) / 0.25, 0, 1)).toFixed(2) + '">' + Lm.dessin(t - t0, Math.round(y)) + '</div>' })
      sons.push(...Lm.sons(t0).map(x => ({ ...x, vol: Math.min(x.vol, 0.09) }))); continue
    }
    const t0 = tf(L.t), items = (L.items || []).slice(0, 5), n = items.length; if (!n) continue
    const pas = L.type === 'ticket' ? 0.45 : 0.6, b = Math.min(TOT - 0.1, t0 + (L.duree ?? Math.max(3.5, 1.2 + n * pas + 1.6)))
    const hauteur = { ticket: 130 + n * 44, etiqueteuse: 40 + n * 74, postit: n > 3 ? 420 : 220, tampon: 150 + n * 50, fiches: 200 + n * 58, bingo: 120 + Math.ceil(n / 3) * 150 }[L.type] || 300
    const y = clamp(basVisage(t0, b) + 60, 430, 1280 - 290 - hauteur), COFFRE = L.type === 'fiches' ? (o => o?.mesures?.bord ? o : null)(objet('coffre-bois', 'boite-bois')) : null
    const dessin = {
      // le ticket sort de l'imprimante, ligne après ligne
      ticket: t => { const dt = t - t0, sorti = clamp(dt / (0.4 + n * pas), 0, 1), hP = 60 + (hauteur - 60) * sorti
        const lignes = [L.titre ? '** ' + L.titre.toUpperCase() + ' **' : '** MA LISTE **', ...items.map((x, k) => (k + 1) + 'x ' + x)]
        return '<div style="position:absolute;left:130px;width:460px;top:' + y + 'px;height:34px;border-radius:12px;background:linear-gradient(#e9e9ea,#bdbdc2);box-shadow:0 6px 16px rgba(0,0,0,.3)"><div style="position:absolute;left:30px;right:30px;top:15px;height:6px;border-radius:3px;background:#2b2b2e"></div></div>'
          + '<div style="position:absolute;left:160px;width:400px;top:' + (y + 18) + 'px;height:' + hP + 'px;overflow:hidden;background:#fbfbf7;box-shadow:0 8px 18px rgba(0,0,0,.25);clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),' + Array.from({ length: 20 }, (_, i) => (100 - (i + 0.5) * 5) + '% ' + (i % 2 ? 'calc(100% - 10px)' : '100%')).join(',') + ',0 calc(100% - 10px))">'
          + '<div style="position:absolute;left:0;right:0;bottom:16px;padding:0 26px;font:700 24px/1.8 Mono,monospace;color:#2b2b2e">' + lignes.map((l, k) => '<div style="display:flex;justify-content:' + (k ? 'space-between' : 'center') + '"><span>' + esc(l) + '</span>' + (k ? '<span style="color:' + PALETTE_LISTE.accent + '">✓</span>' : '') + '</div>').join('') + '</div></div>' },
      // l'étiqueteuse : chaque bande rouge s'imprime et glisse en place
      etiqueteuse: t => items.map((x, k) => { const p = clamp((t - t0 - 0.2 - k * pas) / 0.25, 0, 1); if (!p) return ''
        const n2 = Math.ceil(x.length * clamp((t - t0 - 0.2 - k * pas) / 0.35, 0, 1))
        return '<div style="position:absolute;left:' + (100 + (k % 2) * 30 + (1 - doux(p)) * 260) + 'px;top:' + (y + k * 74) + 'px;transform:rotate(' + ((k % 3) - 1) * 1.6 + 'deg);background:' + PALETTE_LISTE.etiquette + ';padding:9px 18px;border-radius:4px;box-shadow:0 4px 0 rgba(0,0,0,.25),0 8px 16px rgba(0,0,0,.25);font:700 34px/1 Mono,monospace;letter-spacing:0.05em;color:#fff;text-shadow:0 -1px 0 rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.25);white-space:nowrap">' + esc(x.toUpperCase().slice(0, n2)) + '</div>' }).join(''),
      // les post-it se collent un par un, un peu de travers
      postit: t => items.map((x, k) => { const p = rebond((t - t0 - 0.15 - k * pas) / 0.22); if (t < t0 + 0.15 + k * pas) return ''
        const col = k % 2, lig = Math.floor(k / 2), rot = [-6, 5, 3, -4, 6][k]
        return '<div style="position:absolute;left:' + (n === 1 ? 260 : 120 + col * 250) + 'px;top:' + (y + lig * 205) + 'px;width:200px;height:190px;transform:rotate(' + rot + 'deg) scale(' + (1.35 - 0.35 * clamp(p, 0, 1.1)) + ');background:' + ['#FFF07A', '#FFC7DD', '#BFE8FF', '#C9F2B9', '#FFD9A8'][k] + ';box-shadow:0 10px 18px rgba(0,0,0,.25);padding:22px 16px;font:400 31px/1.12 Carnet,cursive;color:#2a2a2a;display:flex;align-items:center;justify-content:center;text-align:center">' + esc(x) + '</div>' }).join(''),
      // (06/11) la boîte à fiches : une boîte en bois, les fiches en sortent une à une et s'empilent au-dessus
      fiches: t => { const dt = t - t0, boite = doux(dt / 0.3), hB = 150, yB = y + hauteur - hB
        // (07/11) le coffre mesuré : bord avant à 55,2 % de sa hauteur, ouverture de 8 % à 93 % de sa largeur.
        // Chaque fiche, PLUS ÉTROITE que l'ouverture, part du fond du coffre, monte tout droit (masquée par la paroi avant),
        // dépasse un peu, puis s'envole se ranger en pile en prenant son petit angle ; le coffre tressaute à chaque sortie.
        const lC = 340, xC = 190, hC = COFFRE ? Math.round(lC * COFFRE.h / COFFRE.l) : 0, topC = yB + 293 - hC, sC = COFFRE ? lC / COFFRE.l : 1
        const bordY = COFFRE ? COFFRE.mesures.bord.map(b => topC + b[1] * sC) : [0], bordAvant = Math.max(...bordY), bordHaut = Math.min(...bordY)
        const wF = Math.round(lC * 0.85 * 0.9), xF = xC + Math.round(lC * 0.08 + (lC * 0.85 - wF) / 2), hF = 62
        let tressaut = 0
        const cartes = items.map((x, k) => { const u = dt - 0.35 - k * pas; if (u < 0) return ''
          const fs = Math.max(20, Math.min(30, Math.floor((wF - 40) / (0.5 * Math.max(1, x.length)))))
          const fiche = (gauche, haut, rot, ombre) => '<div style="position:absolute;left:' + Math.round(gauche) + 'px;width:' + (COFFRE ? wF : 360) + 'px;box-sizing:border-box;top:' + haut.toFixed(1) + 'px;transform:rotate(' + rot.toFixed(2) + 'deg);background:#FFF8E7;background-image:repeating-linear-gradient(transparent 0 37px,rgba(80,120,200,.25) 37px 39px);border-top:5px solid #E25C5C;box-shadow:' + ombre + ';padding:10px 22px 14px;font:700 ' + (COFFRE ? fs : 30) + 'px/1.3 Annot,cursive;color:#2b2b2e;white-space:nowrap;overflow:hidden">' + esc(x) + '</div>'
          if (!COFFRE) { const p = clamp(u / 0.3, 0, 1); return fiche(180 + (k % 2) * 14, yB + 20 - doux(p) * (60 + (n - k) * 58), [-3, 2, -1.5, 3, -2][k], '0 6px 14px rgba(0,0,0,.22)') }
          if (u < 0.1) tressaut = Math.max(tressaut, Math.sin(u / 0.1 * Math.PI))
          // 1) elle monte du fond, tout droit, avec un léger dépassement
          const MO = 0.32, VO = 0.42, depart = bordAvant + 14, sortie = bordHaut - hF - 26
          if (u < MO) { const q = u / MO, e = 1 - Math.pow(1 - q, 3) + 0.08 * Math.sin(q * Math.PI)
            return { av: true, h: fiche(xF, depart + (sortie - depart) * e, 0, '0 2px 6px rgba(0,0,0,.18)') } }
          // 2) elle s'envole vers sa place dans la pile, en arc, et prend son angle
          const p = clamp((u - MO) / VO, 0, 1), e = doux(p), cible = yB + 40 - (n - 1 - k) * 58, dxF = (k % 2) * 14 - 7
          return fiche(xF + dxF * e, sortie + (cible - sortie) * e - Math.sin(p * Math.PI) * 18, [-3, 2, -1.5, 3, -2][k] * e, '0 ' + Math.round(4 + 6 * e) + 'px ' + Math.round(8 + 8 * e) + 'px rgba(0,0,0,.24)') })
        const montantes = cartes.filter(c => c && c.av).map(c => c.h).join(''), posees = cartes.filter(c => typeof c === 'string').join('')
        const imC = st => '<img src="' + COFFRE.src + '" style="position:absolute;left:' + xC + 'px;top:' + (topC - 4 * tressaut).toFixed(1) + 'px;width:' + lC + 'px;' + st + '">'
        return '<div style="position:absolute;inset:0;opacity:' + boite.toFixed(2) + '">' + (COFFRE ? imC('filter:drop-shadow(0 14px 24px rgba(0,0,0,.35))') + posees + '<div style="position:absolute;inset:0;clip-path:' + dessusDuBord(COFFRE, xC, topC - 4 * tressaut, lC) + '">' + montantes + '</div>' + imC('clip-path:' + faceAvant(COFFRE)) : posees)
          + (COFFRE ? '<div style="position:absolute;left:300px;top:' + Math.round((bordAvant + yB + 293) / 2 - 18) + 'px;width:120px;height:36px;border-radius:5px;background:#F3E7CC;box-shadow:inset 0 0 0 2px #B8925A,0 2px 5px rgba(0,0,0,.3);display:grid;place-items:center;font:700 14px/1 Poppins,sans-serif;letter-spacing:.12em;color:#6E4524">' + esc((L.titre || 'Recettes').toUpperCase().slice(0, 12)) + '</div></div>' : '')
          + (COFFRE ? '' : '<div style="position:absolute;left:150px;width:420px;top:' + yB + 'px;height:' + hB + 'px;border-radius:10px;background:linear-gradient(#9A6A3E,#6E4524);box-shadow:inset 0 6px 0 rgba(255,255,255,.18),0 12px 24px rgba(0,0,0,.3)">'
          + '<div style="position:absolute;left:150px;top:46px;width:120px;height:44px;border-radius:6px;background:#E9D9B6;box-shadow:inset 0 0 0 3px #B8925A;display:grid;place-items:center;font:700 16px/1 Poppins,sans-serif;letter-spacing:.12em;color:#6E4524">' + esc((L.titre || 'Recettes').toUpperCase().slice(0, 12)) + '</div></div></div>') },
      // (06/11) la carte de bingo : la grille se pose, chaque case se fait tamponner d'une pastille à sa couleur
      bingo: t => { const dt = t - t0, p0 = rebond(dt / 0.3), col = Math.min(3, n), lig = Math.ceil(n / 3), w = 500, cw = w / col
        const cases = items.map((x, k) => { const tk = 0.45 + k * pas, pt = clamp((dt - tk) / 0.16, 0, 1)
          return '<div style="position:absolute;left:' + ((k % 3) * cw) + 'px;top:' + (84 + Math.floor(k / 3) * 150) + 'px;width:' + cw + 'px;height:150px;box-sizing:border-box;box-shadow:inset 0 0 0 1.5px #2b2b2e;display:grid;place-items:center;text-align:center;padding:12px;overflow:hidden;font:600 22px/1.2 Poppins,sans-serif;color:#2b2b2e">'
            + (dt >= tk ? '<div style="position:absolute;left:50%;top:50%;width:112px;height:112px;margin:-56px;border-radius:50%;background:' + PALETTE_LISTE.accent + ';opacity:' + (0.85 * pt).toFixed(2) + ';transform:scale(' + (1.6 - 0.6 * pt).toFixed(3) + ')"></div>' : '')
            + '<span style="position:relative;color:' + (pt > 0.5 ? '#fff' : '#2b2b2e') + '">' + esc(x) + '</span></div>' }).join('')
        return '<div style="position:absolute;left:' + ((720 - w) / 2) + 'px;width:' + w + 'px;top:' + y + 'px;height:' + (84 + lig * 150) + 'px;background:#FBF7EE;box-shadow:0 12px 26px rgba(0,0,0,.25);transform:rotate(-1.5deg) scale(' + (0.85 + 0.15 * clamp(p0, 0, 1.1)).toFixed(3) + ')">'
          + '<div style="display:flex;justify-content:space-around;height:84px;align-items:center;font:900 52px/1 Rond,Poppins,sans-serif;color:#2b2b2e">' + (L.titre ? '<span style="font-size:34px">' + esc(L.titre.toUpperCase().slice(0, 16)) + '</span>' : 'BINGO'.split('').map(c => '<span>' + c + '</span>').join('')) + '</div>' + cases + '</div>' },
      // la liste papier, puis le tampon qui frappe
      tampon: t => { const dt = t - t0, tT = 0.4 + n * pas, pT = clamp((dt - tT) / 0.18, 0, 1)
        return '<div style="position:absolute;left:120px;width:480px;top:' + y + 'px;height:' + hauteur + 'px;background:#F6F1E6;box-shadow:0 10px 22px rgba(0,0,0,.25);transform:rotate(-1.5deg);padding:26px 30px;font:700 26px/1.85 Machine,monospace;color:#2B1B17">'
          + (L.titre ? '<div style="font-size:22px;letter-spacing:.12em;opacity:.7">' + esc(L.titre.toUpperCase()) + '</div>' : '')
          + items.map((x, k) => '<div style="opacity:' + clamp((dt - 0.2 - k * pas) / 0.2, 0, 1) + ';border-bottom:1.5px dashed rgba(43,27,23,.3)">— ' + esc(x) + '</div>').join('')
          + (dt >= tT ? '<div style="position:absolute;right:26px;bottom:22px;transform:rotate(-14deg) scale(' + (2.2 - 1.2 * pT) + ');opacity:' + (0.25 + 0.65 * pT) + ';border:6px solid ' + PALETTE_LISTE.tampon + ';border-radius:10px;padding:4px 16px;font:900 46px/1 Rond,sans-serif;letter-spacing:.08em;color:' + PALETTE_LISTE.tampon + ';mix-blend-mode:multiply">' + esc((L.tampon || 'FAIT').toUpperCase()) + '</div>' : '') + '</div>' },
    }[L.type]
    if (!dessin) continue
    el.push({ a: t0, b, calque: 'devant', zone: 'geant', parle: true, dessin: t => '<div style="position:absolute;inset:0;opacity:' + (1 - clamp((t - (b - 0.25)) / 0.25, 0, 1)) + '">' + dessin(t) + '</div>' })
    if (L.type === 'ticket') sons.push({ t: t0 + 0.1, fam: 'clavier', vol: 0.07, duree: 0.4 + n * pas })
    else if (L.type === 'bingo') { items.forEach((_, k) => sons.push({ t: t0 + 0.45 + k * pas, fam: 'pop', vol: 0.11 })) }
    else if (L.type === 'fiches') { sons.push({ t: t0 + 0.05, fam: 'coffre', vol: 0.09, duree: 1.2 }); items.forEach((_, k) => sons.push({ t: t0 + 0.35 + k * pas, fam: 'papier', vol: 0.08, duree: 0.6 })) }
    else if (L.type === 'tampon') { items.forEach((_, k) => sons.push({ t: t0 + 0.2 + k * pas, fam: 'clic', vol: 0.07 })); sons.push({ t: t0 + 0.4 + n * pas, fam: 'tampon', vol: 0.14 }) }
    else items.forEach((_, k) => sons.push({ t: t0 + 0.15 + k * pas, fam: L.type === 'postit' ? 'pop' : 'clic', vol: 0.1 }))
  }

  // 7 ter. Les effets ponctuels (effets.mjs) : la phrase-choc et les commentaires vont au-dessus de sa tête, la
  //         capture et l'avant/après sous son visage ; jamais sur son visage.
  const filR = K.filRouge && (K.filRouge.etapes || []).length ? K.filRouge.etapes.map((x, k, l) => ({ type: 'filrouge', t: x.t, k, items: l.map(y => y.texte), titre: K.filRouge.titre, duree: x.duree || K.filRouge.duree })) : []
  const GEANT = K.fin?.geant && K.fin?.motCle ? [{ type: 'motGeant', t: K.fin.t ?? (TOT - 3.5), texte: K.fin.motCle, avant: K.fin.avant, duree: 60 }] : []
  for (let E of [...(K.effets || []), ...filR, ...GEANT, ...(LUXE ? (K.listes || []).map(L => ({ ...L, type: 'listeLuxe' })) : [])]) {
    if (E.type === 'extrait') { // la vidéo dans la vidéo : ses images, 15 par seconde, préparées ici
      const f = E.video && (E.video.includes(':') || E.video.startsWith('/') ? E.video : join(dir, E.video)), dE = join(st, 'extrait-' + Math.round(tf(E.t) * 100)); rmSync(dE, { recursive: true, force: true }); mkdirSync(dE, { recursive: true })
      if (f && existsSync(f)) spawnSync('ffmpeg', ['-v', 'error', '-ss', String(E.debut || 0), '-t', String(Math.min(8, E.duree || 5)), '-i', f, '-vf', 'fps=15,scale=450:-2', '-q:v', '4', join(dE, 'i%04d.jpg')])
      const ims = readdirSync(dE).filter(x => x.endsWith('.jpg')).sort().map(x => join(dE, x)); if (!ims.length) { console.log('⚠️ EXTRAIT introuvable : ' + E.video); continue }
      const dim = (spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', ims[0]], { encoding: 'utf8' }).stdout || '').trim().split(',').map(Number)
      E = { ...E, _images: ims, ratio: E.ratio || (dim[0] ? dim[1] / dim[0] : 16 / 9), duree: E.duree || ims.length / 15 } }
    if (E.type === 'pluie') { const a0 = tf(E.t), b0 = a0 + (E.duree || 3.4), vs = []; let trou = false // un visage pas repéré (plan large, trop petit) : on protège le centre par prudence
      for (let t = a0; t <= b0; t += 0.1) { const v = vis(t); if (v) vs.push(v); else trou = true }
      if (trou) vs.push([180, 120, 540, 760]); E = { ...E, _visages: vs } }
    if (['ecrans', 'etalonnage'].includes(E.type) && !E._images) { // une image d'elle à ce moment-là, pour ses 4 looks ou l'avant/après d'étalonnage
      const fI = join(st, 'look-' + Math.round(tf(E.t) * 100) + '.jpg'); spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', (tf(E.t) + 0.3).toFixed(2), '-i', join(st, 'base-av.mp4'), '-frames:v', '1', '-q:v', '3', fI]); E = { ...E, _images: existsSync(fI) ? [fI] : [] } }
    if (['telephone', 'filrouge', 'compteurs', 'polaroids', 'extrait', 'progression', 'horloge', 'prix', 'pluie', 'objet'].includes(E.type)) { const vs = visages(tf(E.t), tf(E.t) + (E.duree || 4)), g = vs.length ? Math.min(...vs.map(v => v[0])) : 230, d = vs.length ? 720 - Math.max(...vs.map(v => v[2])) : 230 // placeTel : du côté libre
      const cote = E.cote || (g > d ? 'gauche' : 'droite'), libre = cote === 'gauche' ? g : d; E = { ...E, cote, largeur: E.largeur || (E.type === 'telephone' ? Math.max(170, Math.min(250, libre - 30)) : E.type === 'polaroids' ? libre - 20 : undefined) } }
    if (E.type === 'objet' && basVisage(tf(E.t), tf(E.t) + (E.duree || 2.8)) + 50 > 1280 - 290 - 330) E = { ...E, surCote: true, largeur: E.largeur || (vs => vs.length ? (E.cote === 'gauche' ? Math.min(...vs.map(v => v[0])) : 720 - Math.max(...vs.map(v => v[2]))) - 20 : 200)(visages(tf(E.t), tf(E.t) + 3)) }
    // (07/11) la boîte de l'éventail va sous son visage ; en gros plan il n'y a pas la place : elle passe de côté, plus petite
    if (E.type === 'eventail' && !E.cote && basVisage(tf(E.t), tf(E.t) + (E.duree || 3.4)) + 50 > 1280 - 290 - 470) { const vs = visages(tf(E.t), tf(E.t) + (E.duree || 3.4)), g = vs.length ? Math.min(...vs.map(v => v[0])) : 230, d = vs.length ? 720 - Math.max(...vs.map(v => v[2])) : 230
      E = { ...E, cote: g > d ? 'gauche' : 'droite', largeur: E.largeur || Math.max(g, d) - 20 } }
    const decor = E.type === 'duo' && (!E.couleur || E.couleur === 'auto') ? couleurDecor(spawnSync('ffmpeg', ['-v', 'error', '-ss', tf(E.t).toFixed(2), '-i', join(st, 'base-av.mp4'), '-frames:v', '1', '-vf', 'scale=36:64', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']).stdout, vis(tf(E.t))) : null
    if (decor) console.log('Couleur du décor pour « ' + E.grand + ' » : ' + decor)
    const Em = effet(E, { clamp, doux, rebond, esc, dossier: dir, couleurs: { skin: LUXE ? 'luxe' : null, marqueur: E.couleur || '#FFE14D', contour: '#2b2416', feutre: coul.mot || C?.motFort?.couleur || '#E8613C', decor } })
    if (!Em) continue
    const t0 = tf(E.t), b = Math.min(TOT - 0.1, t0 + Em.duree), haut = ['choc', 'commentaires', 'chapitre', 'chat'].includes(E.type)
    const yHaut = hautTete(t0, b) - Em.hauteur - 24, y = (haut || FV) && yHaut >= 110 ? yHaut : clamp(basVisage(t0, b) + 50, 430, 1280 - 290 - Em.hauteur)
    const yP = Em.place ? clamp(FV ? hautTete(t0, b) - Em.hauteur - 20 : hautTete(t0, b) + 40, FV ? 110 : 200, 1280 - 300 - Em.hauteur) : null
    el.push({ a: t0, b, calque: 'devant', zone: 'geant', duo: E.type === 'duo', parle: ['duo', 'choc', 'grille', 'feuille', 'listeLuxe', 'chat', 'motGeant', 'chapitre', 'fenetre', 'ecrans', 'etalonnage', 'timeline', 'dialogue'].includes(E.type), dessin: t => '<div class="' + (['filrouge', 'compteurs', 'graphique'].includes(E.type) ? 'libre' : '') + '" style="position:absolute;inset:0;opacity:' + (1 - clamp((t - (b - 0.25)) / 0.25, 0, 1)).toFixed(2) + '">' + Em.dessin(t - t0, Math.round(yP ?? y)) + '</div>' })
    if (Em.cadre) { const R = Em.cadre(Math.round(yP ?? y)); VERRES.push({ ...R, a: t0, b }) }
    sons.push(...Em.sons(t0))
  }

  // 7 sexies. Les effets détourés : son décor change, elle devient papier, un trait de feutre la dessine, une spirale l'aspire
  const detourTient = (a, b) => { // la silhouette est-elle assez stable pour un effet détouré ?
    const d = join(st, 'garde-' + a.toFixed(2)); rmSync(d, { recursive: true, force: true })
    spawnSync('node', [join(ICI, 'detourage', 'detourer.mjs'), join(st, 'base-av.mp4'), a.toFixed(3), b.toFixed(3), d], { stdio: 'ignore' })
    const o = spawnSync('ffmpeg', ['-v', 'error', '-i', join(d, 'masque-%04d.png'), '-vf', 'scale=36:64', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 }).stdout
    const n = o ? Math.floor(o.length / 2304) : 0; if (n < 10) return { ok: false, pourquoi: 'détourage impossible' }
    const im = k => { const r = []; for (let i = 0; i < 2304; i++) r.push(o[k * 2304 + i] > 128); return r }
    let prec = im(0), ious = [], aires = []
    let bords = 0
    for (let k = 1; k < n; k++) { const c = im(k); let I = 0, U = 0, A = 0; for (let i = 0; i < 2304; i++) { if (c[i] && prec[i]) I++; if (c[i] || prec[i]) U++; if (c[i]) A++ } ious.push(U ? I / U : 0); aires.push(A / 2304); prec = c
      for (let y = 0; y < 30; y++) for (const x of [0, 1, 2, 33, 34, 35]) if (c[y * 36 + x]) bords++ } // le haut du corps touche le bord : coupée, ou bout de décor pris pour elle
    bords /= n - 1
    ious.sort((x, y) => x - y); const med = ious[Math.floor(ious.length / 2)], bas = ious[Math.floor(ious.length * 0.1)], aire = aires.reduce((x, y) => x + y, 0) / aires.length
    if (aire < 0.06) return { ok: false, pourquoi: 'on la voit à peine à ce moment-là' }
    if (med < 0.975 || bas < 0.92) return { ok: false, pourquoi: 'elle bouge trop à ce moment-là (stabilité ' + Math.round(med * 100) + ' %)' }
    if (bords > 6) return { ok: false, pourquoi: 'sa silhouette touche le bord de l’image (bras levés, ou un bout de décor pris pour elle)' }
    return { ok: true }
  }
  // les scènes studio où le détourage ne tient pas : retirées (la vidéo normale et ses sous-titres restent)
  if (THEME === 'studio' && K._scenesStudio && !K.forcer) for (let ks = K._scenesStudio.length - 1; ks >= 0; ks--) {
    const [a, b] = K._scenesStudio[ks], r = detourTient(a, b); if (r.ok) continue
    console.log('⚠️ SCÈNE STUDIO RETIRÉE à ' + a.toFixed(1) + ' s, ' + r.pourquoi + ' : image normale gardée')
    for (let j = el.length - 1; j >= 0; j--) if (el[j].scene === ks) el.splice(j, 1)
    K._scenesStudio.splice(ks, 1)
  }

  const DET = (K.detours || []).map(D => { const a = tf(D.t), b = Math.min(TOT - 0.1, a + (D.duree || 2.5)); return { ...D, a, b, ...(['machine', 'panneau'].includes(D.type) && D.contour == null ? { contour: false } : {}) } })
    .filter(D => { const g = D.forcer ? { ok: true } : detourTient(D.a, D.b); if (!g.ok && ['machine', 'panneau'].includes(D.type) && /touche le bord/.test(g.pourquoi)) g.ok = true // un objet au-dessus de sa tête : les bords du bas ne gênent pas
      if (!g.ok) console.log('⚠️ EFFET RETIRÉ : « ' + D.type + ' » à ' + D.t + ' s, ' + g.pourquoi + ' : image normale gardée'); return g.ok })
  const sigD = coul.mot || C?.motFort?.couleur || '#C0182B'
  const imgD = f => { const p = f && (f.includes(':') || f.startsWith('/') ? f : join(dir, f)); if (!p || !existsSync(p)) return null; return 'data:image/' + (p.toLowerCase().endsWith('png') ? 'png' : 'jpeg') + ';base64,' + readFileSync(p).toString('base64') }
  for (const D of DET) {
    const { a, b } = D, c1 = D.couleur || sigD, src = D.type === 'fond' ? imgD(D.image) : null
    const ent = t => doux((t - a) / 0.18) * (1 - doux((t - (b - 0.18)) / 0.18))
    if (D.type === 'fond') el.push({ a, b, calque: 'derriere', dessin: t => '<div style="position:absolute;inset:0;opacity:' + ent(t).toFixed(2) + ';background:' + (src ? 'url(' + src + ') center/cover' : 'radial-gradient(circle at 50% 38%,' + c1 + ' 0%,' + c1 + 'cc 45%,#1b1416 100%)') + '"></div>' })
    if (D.type === 'papier') {
      el.push({ a, b, calque: 'derriere', dessin: t => '<div style="position:absolute;inset:0;opacity:' + ent(t).toFixed(2) + ';background:#C9A27A"><svg width="720" height="1280" style="position:absolute;inset:0"><filter id="kr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .45 0"/></filter><rect width="720" height="1280" filter="url(#kr)"/></svg></div>' })
      el.push({ a, b, calque: 'devant', dessin: t => { const v = vis(t); if (!v) return ''; const o = ent(t).toFixed(2), y = Math.round(v[3] + 120)
        const sc = (x, r) => '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:130px;height:40px;background:rgba(245,236,214,.82);transform:rotate(' + r + 'deg);box-shadow:0 2px 6px rgba(0,0,0,.18);opacity:' + o + '"></div>'
        return sc(Math.round(v[0] - 150), -24) + sc(Math.round(v[2] + 20), 22) } })
    }
    if (D.type === 'machine' || D.type === 'panneau') { const f = objetDerriere(D, { clamp, doux, esc, couleur: sigD }); if (f) el.push({ a, b, calque: 'derriere', dessin: t => '<div style="position:absolute;inset:0;opacity:' + ent(t).toFixed(2) + '">' + f(t, vis(t)) + '</div>' }) }
    if (D.type === 'dessin') el.push({ a, b, calque: 'derriere', dessin: () => '<i></i>' }) // rien derrière : juste de quoi la détourer
    if (D.type === 'vertige') el.push({ a, b, calque: 'derriere', dessin: t => { const u = t - a, v = vis(t), cx = v ? Math.round((v[0] + v[2]) / 2) : 360, cy = v ? Math.round((v[1] + v[3]) / 2) : 520
      return '<div style="position:absolute;inset:0;opacity:' + ent(t).toFixed(2) + ';background:#15101a;overflow:hidden"><div style="position:absolute;left:' + (cx - 1100) + 'px;top:' + (cy - 1100) + 'px;width:2200px;height:2200px;border-radius:50%;transform:rotate(' + Math.round(u * 140) + 'deg) scale(' + (1 + u * 0.35).toFixed(3) + ');background:repeating-conic-gradient(from 0deg,' + c1 + ' 0deg 15deg,#FBF3EA 15deg 30deg);-webkit-mask:radial-gradient(circle,transparent 0,#000 3%)"></div>'
        + '<div style="position:absolute;inset:0;background:radial-gradient(circle at ' + cx + 'px ' + cy + 'px,rgba(21,16,26,0) 0,rgba(21,16,26,.15) 35%,rgba(21,16,26,.85) 75%)"></div></div>' } })
    sons.push({ t: a, fam: 'whoosh', vol: 0.07 })
  }

  // 7 septies. Le fond vert : ses images derrière elle
  let FVok = false
  if (FV) {
    let nFV = 0
    const ARFV = new Map(), ajusteFV = (u, w, h, n) => { if (n === 1) return 'contain'; const r = (ARFV.get(u) || w / h) / (w / h); return r > 1.45 || r < 0.69 ? 'contain' : 'cover' }
    const imgF = f => { const p = f && (f.includes(':') || f.startsWith('/') ? f : join(dir, f)); if (!p || !existsSync(p)) return null
      const cd = spawnSync('ffmpeg', ['-v', 'info', '-i', p, '-vf', 'cropdetect=limit=28:round=2:skip=0', '-frames:v', '3', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '', m = [...cd.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop()
      const sortieI = join(st, 'fv-' + (nFV++) + '.jpg'); spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', p, '-vf', (m ? 'crop=' + m.slice(1).join(':') + ',' : '') + "scale='min(1080,iw)':-2", '-q:v', '3', sortieI])
      if (!existsSync(sortieI)) return null
      const dim = (spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', sortieI], { encoding: 'utf8' }).stdout || '').trim().split(',').map(Number)
      const u = 'data:image/jpeg;base64,' + readFileSync(sortieI).toString('base64'); if (dim[0] && dim[1]) ARFV.set(u, dim[0] / dim[1]); return u }
    const fondFV = FV.fond || '#d9d4cf', segs = FV.images.map((I, k, l) => ({ ...I, a: tf(I.t), b: Math.min(FINFV, l[k + 1] ? tf(l[k + 1].t) : TOT), srcs: [].concat(I.src || []).map(imgF).filter(Boolean) })).filter(I => I.srcs.length)
    const grille = n => n === 1 ? [[0, 0, 720, 1280]] : n === 2 ? [[0, 0, 360, 1280], [360, 0, 360, 1280]] : n === 3 ? [[0, 0, 720, 640], [0, 640, 360, 640], [360, 640, 360, 640]] : [[0, 0, 360, 640], [360, 0, 360, 640], [0, 640, 360, 640], [360, 640, 360, 640]]
    const pre = []
    const flou = src => '<div style="position:absolute;inset:-60px;background:url(' + src + ') center/cover;filter:blur(34px) brightness(.82) saturate(1.1)"></div>'
    pre.push({ a: A0FV, b: Math.min(TOT, FINFV), calque: 'derriere', dessin: () => '<div style="position:absolute;inset:0;overflow:hidden;background:' + fondFV + '">' + (FV.decor === 'liege' ? fondLiege : FV.fond || !segs[0] ? '' : flou(segs[0].srcs[0])) + '</div>' })
    for (const I of segs) {
      const cases = grille(Math.min(4, I.srcs.length))
      if (FV.decor === 'liege') { pre.push({ a: I.a, b: I.b, calque: 'derriere', dessin: t => photosPunaisees(I.srcs.slice(0, 4), clamp((t - I.a) / 2.3, 0, 1), { couleur: sigD }) }); I.srcs.slice(0, 4).forEach((_, k) => sons.push({ t: I.a + 2.3 * (k * 0.22 + 0.2), fam: 'punaise', vol: 0.09 })); continue }
      pre.push({ a: I.a, b: I.b, calque: 'derriere', dessin: t => { const q = doux((t - I.a) / 0.12)
        return cases.map(([x, y, w, h], k) => '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;overflow:hidden;opacity:' + q.toFixed(2) + ';box-shadow:inset 0 0 0 2px #fff">' + flou(I.srcs[k]) + '<div style="position:absolute;inset:0;background:url(' + I.srcs[k] + ') center/' + ajusteFV(I.srcs[k], w, h, cases.length) + ' no-repeat;transform:translateY(' + ((1 - q) * 24).toFixed(1) + 'px) scale(' + (1.02 + 0.06 * clamp((t - I.a) / Math.max(1, I.b - I.a), 0, 1)).toFixed(4) + ')"></div></div>').join('') } })
      if ((I.etiquettes || []).length) el.push({ a: I.a, b: I.b, calque: 'devant', dessin: t => { const q = clamp(rebond((t - I.a - 0.15) / 0.3), 0, 1.08)
        return cases.map(([x, y, w], k) => I.etiquettes[k] ? '<div style="position:absolute;left:' + (x + 18) + 'px;top:' + (y + (y ? 18 : 110)) + 'px;max-width:' + (w - 36) + 'px;padding:9px 16px;border-radius:12px;background:#fff;color:#151515;font:700 26px/1.15 Poppins,sans-serif;box-shadow:0 6px 16px rgba(0,0,0,.3);transform:scale(' + q.toFixed(3) + ');transform-origin:left top">' + esc(I.etiquettes[k]) + '</div>' : '').join('') } })
      sons.push({ t: I.a, fam: 'clic', vol: 0.06 })
    }
    el.unshift(...pre)
    const finE = Math.min(TOT, FINFV), ech = [0.15, 0.5, 0.85].map(f => A0FV + (finE - A0FV) * f).map(a => [Math.max(0.2, Math.min(a, finE - 2.1)), Math.min(finE - 0.1, Math.max(a, finE - 2.1) + 2)])
    const g = FV.forcer ? { ok: true } : ech.map(([a, b]) => detourTient(a, b)).find(r => !r.ok) || { ok: true }
    FVok = g.ok; if (!FVok) console.log('⚠️ FOND VERT : détourage trop fragile (' + g.pourquoi + ') : elle passe dans une fenêtre aux coins arrondis')
  }

  // 7 nonies. Les titres de chapitre
  const tonChap = (K.couleurs || {}).chapitre || coul.mot || C?.motFort?.couleur || '#F3C9B4'
  for (const Ch of K.chapitres || []) {
    const a = tf(Ch.t), b = Math.min(TOT, a + (Ch.duree || 2.8)), y = Ch.y ?? 150
    el.push({ a, b, calque: 'devant', dessin: t => { const o = Math.min(clamp((t - a) / 0.3, 0, 1), 1 - clamp((t - (b - 0.3)) / 0.3, 0, 1)), p = doux((t - a) / 0.6)
      return '<div style="position:absolute;left:40px;right:40px;top:' + y + 'px;text-align:center;color:#fff;opacity:' + o.toFixed(2) + ';transform:translateY(' + ((1 - p) * 18).toFixed(1) + 'px);text-shadow:0 0 2px rgba(0,0,0,.6),0 2px 18px rgba(0,0,0,.55)">'
        + (Ch.petit ? '<div style="font:300 22px/1 DuoJost,sans-serif;letter-spacing:.42em;padding-left:.42em;text-transform:uppercase;color:' + tonChap + ';filter:brightness(1.35)">' + esc(Ch.petit) + '</div>' : '')
        + '<div style="font:400 58px/1.05 Display,serif;margin-top:10px">' + esc(Ch.titre || '') + '</div></div>' } })
    sons.push({ t: a, fam: 'whoosh', vol: 0.05 })
  }

  // 8. La fin. Pop : « commente » et le mot-clé qui respire, en rond gonflé. Éditorial : « commente » en italique et
  //    le mot-clé entre guillemets, en flou vers net. Collage : le mot-clé se tape dans une barre de commentaire.
  if (K.fin?.motCle && !K.fin.geant && THEME === 'doux') {
    const t0 = tf(K.fin.t ?? TOT - 3.5), mot = K.fin.motCle, y = clamp(basVisage(t0, TOT) + 30, 560, 760)
    el.push({ a: t0, b: TOT, calque: 'devant', zone: 'poitrine', dessin: t => { const p = doux((t - t0) / 0.5)
      return `<div style="position:absolute;left:60px;right:104px;top:${y}px;text-align:center;opacity:${p};text-shadow:0 2px 16px rgba(0,0,0,.5)"><div style="font:italic 500 44px/1 DouxI,serif;color:#fff">écris-moi</div><div style="font:600 96px/1.05 Doux,serif;color:#fff">« ${esc(mot)} »</div></div>` } })
  }
  if (K.fin?.motCle && !K.fin.geant && THEME === 'witchy') {
    const t0 = tf(K.fin.t ?? TOT - 3.5), mot = K.fin.motCle, y = clamp(basVisage(t0, TOT) + 30, 540, 720)
    el.push({ a: t0, b: TOT, calque: 'devant', zone: 'poitrine', dessin: t => { const p = doux((t - t0) / 0.5), z = Math.round(Math.min(66, 230 / (mot.length * 0.75)))
      return '<div style="position:absolute;left:210px;top:' + y + 'px;width:300px;height:300px;border-radius:50%;border:2px solid ' + PALETTE.or + ';box-shadow:0 0 30px rgba(233,199,123,.4) inset,0 0 30px rgba(233,199,123,.3);display:grid;place-items:center;background:' + PALETTE.prune + '8c;opacity:' + p + ';transform:scale(' + (0.92 + 0.08 * p) + ')"><div style="text-align:center"><div style="font:italic 500 32px/1 DouxI,serif;color:' + PALETTE.creme + '">écris-moi</div><div style="white-space:nowrap;font:700 ' + z + 'px/1.1 Cinzel,serif;text-transform:uppercase;color:' + PALETTE.or + ';text-shadow:0 0 16px rgba(233,199,123,.6)">' + esc(mot) + '</div></div></div>' + WI.lunes(y + 330, p) } })
    sons.push({ t: t0 + 0.2, fam: 'cloche', vol: 0.05 })
  }
  if (K.fin?.motCle && !K.fin.geant && THEME !== 'collage' && THEME !== 'doux' && THEME !== 'witchy' && !CHIC && THEME !== 'automne' && THEME !== 'studio') {
    const t0 = tf(K.fin.t ?? TOT - 3.5), mot = K.fin.motCle, y = clamp(basVisage(t0, TOT) + 30, 560, 760)
    el.push({ a: t0, b: TOT, calque: 'devant', zone: 'poitrine', dessin: t => {
      if (THEME === 'typo') { const n = clamp(Math.floor((t - t0 - 0.35) * 10) + 1, 0, mot.length)
        return `<div style="position:absolute;left:60px;right:104px;top:${y}px;text-align:center">
          <div style="font:600 32px/1 Poppins,sans-serif;color:#fff;opacity:${clamp((t - t0) / 0.2, 0, 1)};text-shadow:0 2px 8px rgba(0,0,0,.5)">écris-moi</div>
          <div style="white-space:nowrap;font:700 ${Math.round(Math.min(100, 540 / ((mot.length + 1) * 0.58)))}px/1.05 Mono,monospace;letter-spacing:-0.04em;color:${PALETTE.mot};-webkit-text-stroke:4px #fff;paint-order:stroke fill">${esc(mot.slice(0, n))}<span style="color:#fff;-webkit-text-stroke:0">${n < mot.length || Math.floor(t * 2.5) % 2 ? '|' : ''}</span></div></div>` }
      if (THEME === 'pop') { const p = rebond((t - t0 - 0.3) / 0.25), souffle = 1 + 0.03 * Math.sin((t - t0) * 5.2)
        return `<div style="position:absolute;left:60px;right:104px;top:${y}px;text-align:center">
          <div style="font:700 40px/1 Fred,sans-serif;color:#F4F1A6;-webkit-text-stroke:5px #2B2B10;paint-order:stroke fill;opacity:${clamp((t - t0) / 0.15, 0, 1)}">commente</div>
          <div style="font:700 92px/1.05 Fred,sans-serif;color:${PALETTE.rose};-webkit-text-stroke:7px ${PALETTE.marine};paint-order:stroke fill;transform:rotate(-4deg) scale(${t > t0 + 0.3 ? (0.6 + 0.4 * p) * souffle : 0})">« ${esc(mot)} »</div></div>` }
      const p = doux((t - t0) / 0.3)
      return `<div style="position:absolute;left:60px;right:104px;top:${y}px;text-align:center;opacity:${p};filter:blur(${(1 - p) * 10}px)">
        <div style="font:500 18px/1 Poppins,sans-serif;letter-spacing:0.34em;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.4)">COMMENTE</div>
        <div style="font:italic 400 110px/1.05 Didot,serif;color:${PALETTE.rose};text-shadow:0 8px 24px rgba(0,0,0,.35)">« ${esc(mot)} »</div></div>`
    } })
    sons.push(THEME === 'typo' ? { t: t0 + 0.35, fam: 'clavier', vol: 0.09, duree: mot.length / 10 + 0.1 } : { t: t0 + 0.3, fam: THEME === 'pop' ? 'pop' : 'cloche', vol: THEME === 'pop' ? 0.12 : 0.06 })
  }
  if (K.fin?.motCle && !K.fin.geant && THEME === 'collage') {
    const t0 = tf(K.fin.t ?? TOT - 3.5), mot = K.fin.motCle, tT = t0 + 0.5
    const yBarre = clamp(basVisage(t0, TOT) + 30, 560, 730) // sous le menton, au-dessus des sous-titres (qui commencent vers 850)
    el.push({ a: t0, b: TOT, calque: 'devant', dessin: t => {
      const p = doux((t - t0) / 0.3), n = clamp(Math.floor((t - tT) * 8) + 1, 0, mot.length), coeur = t > tT + mot.length / 8 + 0.2
      return `<div style="position:absolute;left:72px;right:116px;top:${yBarre + (1 - p) * 30}px;opacity:${p};height:84px;border-radius:42px;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);display:flex;align-items:center;gap:16px;padding:0 22px;font:600 30px Poppins,sans-serif;color:#222">
        <div style="width:48px;height:48px;border-radius:50%;background:${C.motFort?.couleur || coul.tomate}"></div>
        <div style="flex:1">${n ? esc(mot.slice(0, n)) + (n < mot.length || Math.floor(t * 2) % 2 ? '<span style="color:#888">|</span>' : '') : '<span style="color:#9a9a9a;font-weight:400">Ajouter un commentaire…</span>'}</div>
        <div style="font-size:40px;color:${coeur ? '#ff3040' : '#bbb'};transform:scale(${coeur ? 1 + 0.25 * Math.max(0, 1 - (t - tT - mot.length / 8 - 0.2) / 0.3) : 1})">${coeur ? '♥' : '♡'}</div>
      </div>`
    } })
    sons.push({ t: tT, fam: 'clavier', vol: 0.09, duree: mot.length / 8 + 0.1 }, { t: tT + mot.length / 8 + 0.2, fam: 'pop', vol: 0.12 })
  }

  // ── Rendu des deux calques, image par image (une image identique n'est dessinée qu'une fois) ──
  const b64 = f => readFileSync(join(ICI, 'polices', f)).toString('base64')
  const face = (f, fam, w = 400, s = 'normal') => `@font-face{font-family:'${fam}';font-weight:${w};font-style:${s};src:url(data:font/woff2;base64,${b64(f)})}`
  const css = POLICES_EFFETS.map(([f, fam, w, st]) => face(f, fam, w, st || 'normal')).join('') + face('Fraunces-900.woff2', 'Gros', 900) + face('ReenieBeanie-400.woff2', 'Main', 500) + face('CourierPrime-700.woff2', 'Machine', 700)
    + face('GloriaHallelujah-400.woff2', 'Carnet', 400) + face('SpaceMono-700.woff2', 'Mono', 700) + face('Poppins-600.woff2', 'Poppins', 600)
    + face('Montserrat-900.woff2', 'Rond', 900) + face('Fraunces-italique.woff2', 'Ital', 400, 'italic') + face('Poppins-800.woff2', 'Edito', 800) + face('Fredoka-700.woff2', 'Fred', 700)
    + face('Anton-400.woff2', 'Anton', 400) + face('Caveat-700.woff2', 'Annot', 700) + face('Cormorant-600.woff2', 'Doux', 600) + face('Cormorant-italique.woff2', 'DouxI', 500, 'italic') + face('Inter-500.woff2', 'DidotT', 400) + face('InstrumentSerif-italique.woff2', 'Didot', 400, 'italic') + face('Bricolage-800.woff2', 'DidotG', 800) + face('DMSerifDisplay-400.woff2', 'Display', 400) + face('Satisfy-400.woff2', 'Script', 400) + face('CinzelDecorative-700.woff2', 'Cinzel', 700) + face('Poppins-500.woff2', 'ChicS', 500)
  const nav = await ouvrirNavigateur(), page = await nav.newPage(); await page.setViewport({ width: 720, height: 1280 })
  await page.setContent(`<html><head><style>${css} html,body{margin:0;width:720px;height:1280px;background:transparent;overflow:hidden}</style></head><body style="clip-path:inset(0 0 1px 0)"><div id="s"></div></body></html>`)
  await page.evaluate(() => document.fonts.ready)
  const cache = new Map(), pistes = { derriere: [], devant: [] }
  const vide = join(st, 'collage-vide.png')
  await page.evaluate(() => { document.getElementById('s').innerHTML = '' }); await page.screenshot({ path: vide, omitBackground: true })
  mkdirSync(join(st, 'collage'), { recursive: true })
  // MARGES : les zones que l'appli recouvre ; un texte qui y déborde est ramené dedans avant d'être dessiné
  const ZM = zonesPlateforme(P.plateforme)
  // (06/11) un texte trop LARGE pour la zone visible rétrécit (il ne déborde plus jamais dans les bords que les téléphones
  // rognent) ; les titres de derrière (calque "derriere") ne sont que tenus entre les bords, ils peuvent rester sous les icônes.
  const ranger = (derriere = false) => page.evaluate((Z, derriere) => { for (const c of document.getElementById('s').children) {
    const boite = () => { const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, L = 1e9, T = 1e9, R = -1e9, B = -1e9
      while ((n = w.nextNode())) { if (!n.textContent.trim() || n.parentElement.closest('svg')) continue
        const r = document.createRange(); r.selectNodeContents(n); for (const q of r.getClientRects()) { if (q.width < 3 || q.height < 3) continue; L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); B = Math.max(B, q.bottom) } }
      return [L, T, R, B] }
    let [L, T, R, B] = boite()
    if (R < 0) continue
    const larg = 720 - 2 * Z.cote
    if (R - L > larg) { const e = c.getBoundingClientRect(), k = larg / (R - L)
      c.style.transformOrigin = Math.round((L + R) / 2 - e.left) + 'px ' + Math.round((T + B) / 2 - e.top) + 'px'
      c.style.scale = String(Math.round(k * 1000) / 1000); [L, T, R, B] = boite() }
    let dx = 0, dy = 0
    if (!derriere && B - T <= 1280 - Z.haut - Z.bas) { if (B > 1280 - Z.bas) dy = 1280 - Z.bas - B; else if (T < Z.haut) dy = Z.haut - T }
    if (!derriere && R > 720 - Z.droite && B + dy > Z.droiteDe && R - L <= 720 - Z.droite - Z.cote) dx = 720 - Z.droite - R
    else if (R - L <= larg + 1) { if (L < Z.cote) dx = Z.cote - L; else if (R > 720 - Z.cote) dx = 720 - Z.cote - R }
    if (dx || dy) c.style.translate = Math.round(dx) + 'px ' + Math.round(dy) + 'px' } }, ZM, derriere)
  // CONTROLE_VISUEL : ce que chaque texte devient à l'écran, mesuré dans le navigateur
  const alertes = new Map(), alerte = (cle, msg, t) => { const a = alertes.get(cle); if (a) a.n++; else alertes.set(cle, { msg, t, n: 1 }) }
  const lum = c => { const v = (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(x => +x / 255); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
  const fondA = t => { const o = spawnSync('ffmpeg', ['-v', 'error', '-ss', t.toFixed(2), '-i', join(st, 'base-av.mp4'), '-frames:v', '1', '-vf', 'scale=72:128', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']); return o.stdout?.length >= 72 * 128 ? o.stdout : null }
  const mesurer = () => page.evaluate(() => { const out = [], w = document.createTreeWalker(document.getElementById('s'), NodeFilter.SHOW_TEXT); let n
    while ((n = w.nextNode())) { const txt = n.textContent.trim(); if (!txt) continue; const e = n.parentElement; if (e.closest('.libre')) continue; let o = 1, a = e
      while (a && a.id !== 's') { o *= +getComputedStyle(a).opacity; a = a.parentElement } if (o < 0.6) continue
      const r = document.createRange(); r.selectNodeContents(n); const q = r.getBoundingClientRect(); if (q.width < 3 || q.height < 3) continue
      const cs = getComputedStyle(e), z = parseFloat(cs.fontSize) || +e.getAttribute('font-size') || 0
      let deco = (parseFloat(cs.webkitTextStrokeWidth) || 0) >= 2.5; a = e; while (!deco && a && a.id !== 's') { if (getComputedStyle(a).filter.includes('drop-shadow') || a.tagName === 'text' || a.closest?.('svg')) deco = true; a = a.parentElement }
      out.push({ txt, x: q.x, y: q.y, w: q.width, h: q.height, z, c: cs.color, deco }) } return out })
  if (process.env.APERCU) { // ── LA PLANCHE AVANT FABRICATION ──
    const debuts = el.filter(e => e.calque === 'devant' && e.b - e.a < 8 && e.a > HOOK + 0.3).map(e => Math.min(e.b - 0.1, e.a + Math.min(0.9, (e.b - e.a) / 2))).sort((x, y) => x - y)
    let instants = [Math.min(HOOK - 0.1, Math.max(0.6, HOOK * 0.7))]
    for (const t of debuts) if (t < TOT - 0.3 && instants.every(u => Math.abs(u - t) > 1.8)) instants.push(t)
    for (let k = 1; instants.length < 8 && k < 40; k++) { const t = TOT * k / 40; if (instants.every(u => Math.abs(u - t) > 1.8)) instants.push(t) }
    instants = instants.sort((x, y) => x - y); while (instants.length > 8) { let mi = 1, md = 1e9; for (let i = 1; i < instants.length; i++) { const d = instants[i] - instants[i - 1]; if (d < md) { md = d; mi = i } } instants.splice(mi, 1) }
    const ap = join(st, 'apercu'); rmSync(ap, { recursive: true, force: true }); mkdirSync(ap, { recursive: true })
    const images = []
    for (const [k, t] of instants.entries()) {
      const html = c => el.filter(e => e.calque === c && t >= e.a && t < e.b).map(e => e.dessin(t)).join('')
      const fD = join(ap, 'd' + k + '.png'), fV = join(ap, 'v' + k + '.png'), fI = join(ap, 'i' + k + '.png'), fM = join(ap, 'm' + k), sortieK = join(ap, 'a' + k + '.jpg')
      await page.evaluate(x => { document.getElementById('s').innerHTML = x }, html('derriere')); await page.screenshot({ path: fD, omitBackground: true })
      await page.evaluate(x => { document.getElementById('s').innerHTML = x }, html('devant')); await ranger(); await page.screenshot({ path: fV, omitBackground: true })
      lancer('ffmpeg', ['-y', '-v', 'error', '-ss', t.toFixed(3), '-i', join(st, 'base-av.mp4'), '-frames:v', '1', fI])
      const avecDerriere = html('derriere').length > 0
      if (avecDerriere) spawnSync('node', [join(ICI, 'detourage', 'detourer.mjs'), join(st, 'base-av.mp4'), t.toFixed(3), (t + 0.04).toFixed(3), fM], { stdio: 'ignore' })
      const masque = join(fM, 'masque-0001.png'), detour = avecDerriere && existsSync(masque)
      const g = !avecDerriere ? '[0][2]overlay=0:0[o]'
        : !detour ? '[0][1]overlay=0:0[x];[x][2]overlay=0:0[o]'
        : FV ? '[3]format=gray,scale=720:1280,split=2[m0][m2];[m0]scale=' + CADRE + '[m];[m2]' + Array(11).fill('dilation').join(',') + ',scale=' + CADRE + '[md];color=c=white:s=' + TAILLE + ',format=rgba[w];[w][md]alphamerge,scale=' + pxP(wFV) + ':' + pxP(hFV) + '[ct];[0]format=rgba[b];[b][m]alphamerge,scale=' + pxP(wFV) + ':' + pxP(hFV) + '[p];[0][1]overlay=0:0[x];[x][ct]overlay=' + pxV(xFV) + ':' + pxV(yFV) + ':shortest=1[x2];[x2][p]overlay=' + pxV(xFV) + ':' + pxV(yFV) + '[x3];[x3][2]overlay=0:0[o]'
        : '[3]format=gray,scale=' + CADRE + '[m];[0]format=rgba[b];[b][m]alphamerge[p];[0][1]overlay=0:0[x];[x][p]overlay=0:0[x2];[x2][2]overlay=0:0[o]'
      lancer('ffmpeg', ['-y', '-v', 'error', '-i', fI, '-i', fD, '-i', fV, ...(detour ? ['-i', masque] : []), '-filter_complex', g, '-map', '[o]', '-frames:v', '1', '-q:v', '3', sortieK])
      if (existsSync(sortieK)) images.push(sortieK)
    }
    await nav.close()
    const { zones: zonesP, dessinZones: dz } = await import('./marges.mjs')
    const planche = join(dir, nom + '-apercu.jpg')
    lancer('ffmpeg', ['-y', '-v', 'error', ...images.flatMap(f => ['-i', f]), '-filter_complex', images.map((_, k) => '[' + k + ']scale=720:1280,' + dz(zonesP(P.plateforme)) + ',scale=270:480[t' + k + ']').join(';') + ';' + images.map((_, k) => '[t' + k + ']').join('') + 'xstack=inputs=' + images.length + ':layout=' + images.map((_, k) => (k % 4) * 270 + '_' + Math.floor(k / 4) * 480).join('|') + ':fill=white[o]', '-map', '[o]', '-frames:v', '1', '-q:v', '3', planche])
    console.log('Planche avant fabrication : ' + planche + '\nInstants (dans l\'ordre, de gauche à droite puis en dessous) : ' + instants.map(t => t.toFixed(1) + ' s').join(', ') + '\nRien n\'est encore fabriqué : montre-la-lui, corrige, puis « node montage.mjs monter ' + nom + ' ».')
    return
  }
  const sans2 = w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  for (let f = 0; f < N; f++) {
    const t = f / FPS
    if (f % Math.round(FPS / 2) === 0 && t > 0.3 && t < TOT - 0.2) { // une image toutes les 0,5 s
      const boites = []
      for (const calque of ['derriere', 'devant']) { const html = el.filter(e => e.calque === calque && t >= e.a && t < e.b).map(e => e.dessin(t)).join(''); if (!html) continue
        await page.evaluate(x => { document.getElementById('s').innerHTML = x }, html); await ranger(calque === 'derriere'); for (const b of await mesurer()) boites.push({ ...b, calque }) }
      const v = vis(t), fond = boites.some(b => b.z >= 28 && !b.deco) ? fondA(t) : null, ts = t.toFixed(1) + ' s'
      const vus = new Map()
      for (const b of boites) {
        const mot = b.txt.slice(0, 24), aire = b.w * b.h
        if (v && b.z >= 20) { const ix = Math.max(0, Math.min(b.x + b.w, v[2] - (v[2] - v[0]) * 0.1) - Math.max(b.x, v[0] + (v[2] - v[0]) * 0.1)), iy = Math.max(0, Math.min(b.y + b.h, v[3]) - Math.max(b.y, v[1] + (v[3] - v[1]) * 0.1)), part = ix * iy / aire
          if (b.calque === 'devant' && part > 0.25) alerte('visage:' + mot, 'texte sur son visage (« ' + mot + ' »)', ts)
          if (b.calque === 'derriere' && part > 0.6) alerte('cache:' + mot, 'titre caché derrière sa tête (« ' + mot + ' »)', ts) }
        if (b.z >= 20 && (b.x < 6 || b.x + b.w > 714)) alerte('bord:' + mot, 'texte coupé au bord de l\'image (« ' + mot + ' »)', ts)
        else if (b.z >= 20 && (b.x < ZM.cote - 4 || b.x + b.w > 720 - ZM.cote + 4)) alerte('cote:' + mot, 'texte dans les bords que certains téléphones coupent (« ' + mot + ' »)', ts)
        if (b.calque === 'devant' && b.z >= 22) {
          if (b.y + b.h > 1280 - ZM.bas + 4) alerte('legende:' + mot, 'texte sous la légende et le nom (' + ZM.nom + '), en bas (« ' + mot + ' »)', ts)
          else if (b.y < ZM.haut - 4) alerte('haut:' + mot, 'texte sous les onglets du haut (' + ZM.nom + ') (« ' + mot + ' »)', ts)
          else if (b.x + b.w > 720 - ZM.droite + 4 && b.y + b.h > ZM.droiteDe) alerte('icones:' + mot, 'texte sous les icônes de droite (' + ZM.nom + ') (« ' + mot + ' »)', ts) }
        if (fond && b.z >= 28 && !b.deco) { let S = 0, k = 0
          for (let yy = Math.max(0, Math.floor(b.y / 10)); yy < Math.min(128, Math.ceil((b.y + b.h) / 10)); yy++) for (let xx = Math.max(0, Math.floor(b.x / 10)); xx < Math.min(72, Math.ceil((b.x + b.w) / 10)); xx++) { S += fond[yy * 72 + xx]; k++ }
          if (k && Math.abs(lum(b.c) - S / k / 255) < 0.22) alerte('contraste:' + mot, 'texte peu lisible, de la même clarté que le fond (« ' + mot + ' »)', ts) }
        for (const w of b.txt.split(/\s+/)) { const c = sans2(w); if (c.length >= 5) { if (vus.has(c) && vus.get(c) !== b) alerte('double:' + c, 'le même mot deux fois à l\'écran (« ' + w + ' »)', ts); vus.set(c, b) } }
      }
    }
    for (const calque of ['derriere', 'devant']) {
      const html = el.filter(e => e.calque === calque && t >= e.a && t < e.b).map(e => e.dessin(t)).join('')
      if (!html) { pistes[calque].push(vide); continue }
      const h = createHash('md5').update(html).digest('hex').slice(0, 16)
      if (!cache.has(h)) {
        const fichier = join(st, 'collage', `${h}.png`)
        await page.evaluate(x => { document.getElementById('s').innerHTML = x }, html)
        await ranger(calque === 'derriere')
        await page.screenshot({ path: fichier, omitBackground: true }); cache.set(h, fichier)
      }
      pistes[calque].push(cache.get(h))
    }
  }
  // le papier quadrillé froissé du médaillon
  const papier = join(st, 'collage-papier.png')
  await page.evaluate(c => { document.getElementById('s').innerHTML = `<div style="position:absolute;inset:0;background:${c};"></div><div style="position:absolute;inset:0;background-image:linear-gradient(#c9d4e6 1px,transparent 1px),linear-gradient(90deg,#c9d4e6 1px,transparent 1px);background-size:36px 36px;opacity:.7"></div><svg style="position:absolute;inset:0" width="720" height="1280"><filter id="f"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="4" seed="7"/><feDiffuseLighting lighting-color="#fff" surfaceScale="2.2"><feDistantLight azimuth="45" elevation="58"/></feDiffuseLighting></filter><rect width="720" height="1280" filter="url(#f)" opacity=".38" style="mix-blend-mode:multiply"/></svg>` }, coul.papier)
  await page.screenshot({ path: papier })
  const fondInter = join(st, 'collage-fond-intermede.png')
  if (THEME !== 'collage') {
    const nomCarte = (K.tarot?.nom || (mots.find(m => m.fort && MED[0] && m.t >= MED[0][0] - 0.05 && m.t < MED[0][1])?.w) || 'ta carte').replace(/[,.;:!?]+$/, '').toUpperCase()
    const fondWitchy = '<div style="position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 40%,' + PALETTE.nuit + ',' + PALETTE.prune + ' 70%,#0d0a0c)"></div>' + Array.from({ length: 26 }, (_, k) => WI.etoile4((k * 137) % 700, (k * 251) % 1260, 6 + (k % 4) * 4, 0.35 + (k % 3) * 0.2)).join('')
      + '<div style="position:absolute;left:150px;top:170px;width:420px;height:850px;border-radius:22px;background:#F3E6C9;box-shadow:0 0 40px rgba(233,199,123,.35),0 20px 50px rgba(0,0,0,.6)"><div style="position:absolute;inset:16px;border:2px solid ' + PALETTE.or + ';border-radius:14px"></div><div style="position:absolute;inset:24px;border:1px solid ' + PALETTE.or + ';border-radius:10px"></div>'
      + '<div style="position:absolute;left:0;right:0;top:30px;text-align:center;font:700 32px/1 Cinzel,serif;color:#7a5a1e">' + (K.tarot?.numero || 'III') + '</div>'
      + '<div style="position:absolute;left:36px;top:84px;width:348px;height:612px;border-radius:174px 174px 8px 8px;border:2px solid ' + PALETTE.or + '"></div>'
      + '<div style="position:absolute;left:0;right:0;bottom:44px;text-align:center;white-space:nowrap;font:700 ' + Math.round(Math.min(40, 360 / (nomCarte.length * 0.72))) + 'px/1 Cinzel,serif;color:#4a2a10;letter-spacing:2px">' + esc(nomCarte) + '</div></div>'
    const htmlFond = THEME === 'witchy' ? fondWitchy : THEME === 'pop' ? `<div style="position:absolute;inset:0;background:#7DB3E8"></div>${[[90, 210, 40, -10], [610, 330, 30, 14], [70, 1050, 34, 8], [600, 1090, 46, -16], [640, 760, 24, 0]].map(([x, y, z, r]) => etoile(z, '#F2C94C', `position:absolute;left:${x}px;top:${y}px;transform:rotate(${r}deg)`)).join('')}` : '<div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%,#3a0a10,#2A0306 70%)"></div>'
    await page.evaluate(h => { document.body.style.background = 'transparent'; document.getElementById('s').innerHTML = h }, htmlFond)
    await page.screenshot({ path: fondInter })
  }
  const coins = join(st, 'collage-coins.png')
  if (CARTE) { await page.evaluate((l, h, r) => { document.body.style.background = '#000'; document.getElementById('s').innerHTML = `<div style="position:absolute;left:0;top:0;width:${l}px;height:${h}px;border-radius:${typeof r === 'number' ? r + 'px' : r};background:#fff"></div>` }, CARTE.l, CARTE.h, THEME === 'pop' ? 24 : THEME === 'witchy' ? '170px 170px 6px 6px' : 2); await page.screenshot({ path: coins, clip: { x: 0, y: 0, width: CARTE.l, height: CARTE.h } }); await page.evaluate(() => { document.body.style.background = 'transparent' }) }
  const cercle = join(st, 'collage-cercle.png')
  await page.evaluate(() => { document.getElementById('s').innerHTML = '<div style="position:absolute;left:0;top:0;width:420px;height:420px;border-radius:50%;background:#fff"></div><div style="position:absolute;left:420px;top:0;right:0;bottom:0;background:#000"></div><div style="position:absolute;left:0;top:420px;width:420px;bottom:0;background:#000"></div>'; document.body.style.background = '#000' })
  await page.screenshot({ path: cercle, clip: { x: 0, y: 0, width: 420, height: 420 } })
  await nav.close()
  const rle = (liste, nomF) => { let s = ''; for (let i = 0; i < liste.length;) { let k = i; while (k < liste.length && liste[k] === liste[i]) k++; s += `file '${liste[i].replace(/\\/g, '/')}'\nduration ${((k - i) / FPS).toFixed(4)}\n`; i = k } writeFileSync(join(st, nomF), s + `file '${liste.at(-1).replace(/\\/g, '/')}'\n`) }
  rle(pistes.derriere, 'collage-derriere.txt'); rle(pistes.devant, 'collage-devant.txt')
  console.log(`Collage : ${el.length} éléments, ${cache.size} images dessinées`)

  // ── Le détourage : seulement là où quelque chose passe derrière elle ──
  const base = join(st, 'base-av.mp4')
  const fen = el.filter(e => e.calque === 'derriere').map(e => [Math.max(0, e.a - 0.1), Math.min(TOT, e.b + 0.1)]).sort((x, y) => x[0] - y[0])
  const unies = []; for (const w of fen) { const d = unies.at(-1); if (d && w[0] <= d[1] + 0.5) d[1] = Math.max(d[1], w[1]); else unies.push([...w]) }
  let fond = base
  if (unies.length) {
    const dt = join(st, 'collage-detour'); rmSync(dt, { recursive: true, force: true }); mkdirSync(dt, { recursive: true })
    const piste = new Array(N + 2).fill(null)
    for (const [k, [x, y]] of (FV && !FVok ? [] : unies.entries())) {
      const d = join(dt, `f${k}`)
      spawnSync('node', [join(ICI, 'detourage', 'detourer.mjs'), base, x.toFixed(3), y.toFixed(3), d], { stdio: 'inherit' })
      readdirSync(d).filter(z => z.startsWith('masque-')).sort().forEach((m, i) => { const fr = Math.round(x * FPS) + i; if (fr < piste.length) piste[fr] = join(d, m) })
    }
    const noir = join(st, 'masque-noir.png'); lancer('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=720x1280', '-frames:v', '1', '-pix_fmt', 'gray', noir])
    rle(piste.slice(0, N).map(m => m || noir), 'collage-masques.txt')
    const dansD = (f, types) => DET.some(D => types.includes(D.type) && D.contour !== false && f / FPS >= D.a && f / FPS < D.b)
    const avecB = DET.some(D => D.type !== 'dessin' && D.contour !== false), avecC = DET.some(D => D.type === 'dessin')
    if (avecB) rle(piste.slice(0, N).map((m, f) => (dansD(f, ['fond', 'papier', 'vertige']) && m) || noir), 'collage-contour-blanc.txt')
    if (avecC) rle(piste.slice(0, N).map((m, f) => (dansD(f, ['dessin']) && m) || noir), 'collage-contour-trait.txt')
    const colTrait = (DET.find(D => D.type === 'dessin')?.couleur || sigD).replace('#', '0x')
    fond = join(st, 'collage-fond.mp4')
    const plusD = [...(avecB ? ['-f', 'concat', '-safe', '0', '-i', join(st, 'collage-contour-blanc.txt')] : []), ...(avecC ? ['-f', 'concat', '-safe', '0', '-i', join(st, 'collage-contour-trait.txt')] : [])]
    const dil = n => Array(n).fill('dilation').join(',')
    const grapheD = '[0:v]split=2[a][b];[1:v]fps=30,format=rgba[d];[a][d]overlay=0:0:eof_action=pass[ad0];[2:v]fps=30,format=gray,scale=' + CADRE + '[m];'
      + (THEME === 'aurelie' || THEME === 'studio' ? '' : '')
      + (avecB ? '[3:v]fps=30,format=gray,scale=720:1280,' + dil(9) + ',scale=' + CADRE + '[mb];color=c=white:s=' + TAILLE + ':r=30,format=rgba[wb];[wb][mb]alphamerge[cb];[ad0][cb]overlay=0:0:shortest=1[ad1];' : '[ad0]null[ad1];')
      + (avecC ? '[' + (avecB ? 4 : 3) + ':v]fps=30,format=gray,scale=720:1280,split=2[t1][t2];[t1]' + dil(15) + ',scale=' + CADRE + '[e1];[t2]' + dil(8) + ',scale=' + CADRE + '[e2];color=c=' + colTrait + ':s=' + TAILLE + ':r=30,format=rgba[wc];[wc][e1]alphamerge[c1];[ad1]split=2[ad1a][ad1b];[ad1a][c1]overlay=0:0:shortest=1[x1];[ad1b]format=rgba[ad1r];[ad1r][e2]alphamerge[inner];[x1][inner]overlay=0:0:shortest=1[ad2];' : '[ad1]null[ad2];')
      + '[b][m]alphamerge[p];'
      + '[ad2][p]overlay=0:0:eof_action=pass[o]'
    lancer('ffmpeg', ['-y', '-v', 'error', '-i', base, '-f', 'concat', '-safe', '0', '-i', join(st, 'collage-derriere.txt'), '-f', 'concat', '-safe', '0', '-i', join(st, 'collage-masques.txt'), ...(DET.length ? plusD : []),
      '-filter_complex', FV ? (FVok
        ? '[0:v]split=3[a][b][bg];[1:v]fps=30,format=rgba[d];[a][d]overlay=0:0:eof_action=pass[ad0];[2:v]fps=30,format=gray,scale=720:1280,' + "tmix=frames=3:weights='1 2 1',gblur=sigma=1.4,lut=c0='clip((val-96)*2.1,0,255)'[mg];nullsrc=s=720x1280:r=30,geq=lum='255*min(1,min(X,W-X)/90)':cb=128:cr=128,format=gray[gf];[mg][gf]blend=all_mode=multiply:shortest=1" + ',split=3[m0][m2][m30];[m0]scale=' + CADRE + '[m];[m30]scale=' + CADRE + '[m3];[bg][m3]alphamerge[pg];[m2]' + Array(11).fill('dilation').join(',') + ',scale=' + CADRE + '[md];color=c=white:s=' + TAILLE + ':r=30,format=rgba[w];[w][md]alphamerge,scale=' + pxP(wFV) + ':' + pxP(hFV) + '[ct];[b][m]alphamerge,scale=' + pxP(wFV) + ':' + pxP(hFV) + '[p];[ad0][pg]overlay=0:0:eof_action=pass:enable=not(between(t\\,' + A0FV.toFixed(3) + '\\,' + Math.min(TOT, FINFV).toFixed(3) + '))[ad1];[ad1][ct]overlay=' + pxV(xFV) + ':' + pxV(yFV) + ':shortest=1:enable=' + (FV.contour ? 'between(t\\,' + A0FV.toFixed(3) + '\\,' + Math.min(TOT, FINFV).toFixed(3) + ')' : '0') + '[x];[x][p]overlay=' + pxV(xFV) + ':' + pxV(yFV) + ':eof_action=pass:enable=between(t\\,' + A0FV.toFixed(3) + '\\,' + Math.min(TOT, FINFV).toFixed(3) + ')[o]'
        : '[0:v]split=2[a][b];[1:v]fps=30,format=rgba[d];[a][d]overlay=0:0:eof_action=pass[ad0];[b]scale=' + pxP(wFV - 40) + ':' + pxP(hFV - 70) + ',format=rgba,geq=r=\'r(X,Y)\':g=\'g(X,Y)\':b=\'b(X,Y)\':a=\'if(gt(hypot(max(abs(X-W/2)-(W/2-' + pxV(34) + '),0),max(abs(Y-H/2)-(H/2-' + pxV(34) + '),0)),' + pxV(34) + '),0,255)\'[pip];color=c=white:s=' + pxP(wFV - 28) + 'x' + pxP(hFV - 58) + ':r=30,format=rgba,geq=r=255:g=255:b=255:a=\'if(gt(hypot(max(abs(X-W/2)-(W/2-' + pxV(40) + '),0),max(abs(Y-H/2)-(H/2-' + pxV(40) + '),0)),' + pxV(40) + '),0,255)\'[cad];[ad0][cad]overlay=' + pxV(xFV + 14) + ':' + pxV(yFV + 20) + ':shortest=1[x];[x][pip]overlay=' + pxV(xFV + 20) + ':' + pxV(yFV + 26) + ':eof_action=pass[o]')
      : DET.length && THEME !== 'aurelie' && THEME !== 'studio' ? grapheD : THEME === 'aurelie' || (THEME === 'studio' && K.contour)
        ? '[0:v]split=2[a][b];[1:v]fps=30,format=rgba[d];[a][d]overlay=0:0:eof_action=pass[ad];[2:v]fps=30,format=gray,scale=720:1280,split=2[m0][m2];[m0]scale=' + CADRE + '[m];[m2]dilation,dilation,dilation,dilation,dilation,dilation,dilation,dilation,dilation,scale=' + CADRE + '[md];color=c=white:s=' + TAILLE + ':r=30,format=rgba[w];[w][md]alphamerge[ct];[ad][ct]overlay=0:0:shortest=1[adc];[b][m]alphamerge[p];[adc][p]overlay=0:0:eof_action=pass[o]'
        : '[0:v]split=2[a][b];[1:v]fps=30,format=rgba[d];[a][d]overlay=0:0:eof_action=pass[ad];[2:v]fps=30,format=gray,scale=' + CADRE + '[m];[b][m]alphamerge[p];[ad][p]overlay=0:0:eof_action=pass[o]',
      '-map', '[o]', '-map', '0:a', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-t', TOT.toFixed(3), fond])
    if (FV && FVok) { // la transition : elle se réduit pendant que ses images arrivent
      const tr = join(st, 'fv-transition'); rmSync(tr, { recursive: true, force: true }); mkdirSync(tr, { recursive: true })
      const f0 = Math.round(A0FV * FPS), nT = Math.round(TRFV * FPS), liste = []
      for (let i = 0; i < nT; i++) { const f = f0 + i, t = f / FPS, k = kFVat(t), fr = (kFV < 1 ? (1 - k) / (1 - kFV) : 0), w = Math.round(LARG * k / 2) * 2, h = Math.round(HAUT * k / 2) * 2, x = Math.round(xFV * ECHELLE * fr), y = Math.round(yFV * ECHELLE * fr)
        const im = join(tr, 'b' + i + '.png'), out = join(tr, 't' + String(i).padStart(3, '0') + '.png'), m = piste[f] || noir, d = pistes.derriere[f] || vide
        lancer('ffmpeg', ['-y', '-v', 'error', '-ss', t.toFixed(3), '-i', base, '-frames:v', '1', im])
        lancer('ffmpeg', ['-y', '-v', 'error', '-i', im, '-i', d, '-i', m, '-filter_complex', '[0]format=rgba,split=2[b0][b1];[2]format=gray,scale=720:1280[mg];color=c=black:s=720x1280:d=0.04,format=gray,geq=lum=' + "'255*min(1,min(X,W-X)/90)'" + '[gf];[mg][gf]blend=all_mode=multiply:shortest=1,split=2[m0][m2];[m0]scale=' + CADRE + '[m];[m2]' + Array(11).fill('dilation').join(',') + ',scale=' + CADRE + '[md];color=c=white:s=' + TAILLE + ':d=0.04,format=rgba[w];[w][md]alphamerge,scale=' + w + ':' + h + '[ct];[b1][m]alphamerge,scale=' + w + ':' + h + '[p];[b0][1]overlay=0:0[x];' + (FV.contour ? '[x][ct]overlay=' + x + ':' + y + ':shortest=1[x2]' : '[ct]nullsink;[x]null[x2]') + ';[x2][p]overlay=' + x + ':' + y + '[o]', '-map', '[o]', '-frames:v', '1', out])
        liste.push(out) }
      const avecTr = join(st, 'collage-fond-tr.mp4')
      lancer('ffmpeg', ['-y', '-v', 'error', '-i', fond, '-framerate', String(FPS), '-i', join(tr, 't%03d.png'), '-filter_complex', '[1:v]setpts=PTS-STARTPTS+' + (f0 / FPS).toFixed(4) + '/TB[tr];[0:v][tr]overlay=0:0:eof_action=pass[o]', '-map', '[o]', '-map', '0:a', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', avecTr])
      if (existsSync(avecTr)) fond = avecTr
    }
  }

  // ── Le médaillon : sa vidéo recadrée sur le visage, dans un cercle, sur le papier ──
  const meds = (THEME === 'editorial' || THEME === 'doux' || THEME === 'typo' || THEME === 'witchy' || CHIC || THEME === 'automne' || THEME === 'studio' ? [] : MED).map(([a, b], k) => {
    if (CARTE) { // pop / éditorial : toute l'image réduite en carte (inclinée en pop), sur son fond
      const f = join(st, `collage-medaillon-${k}.mp4`), rot = (CARTE.rot * Math.PI / 180).toFixed(4)
      lancer('ffmpeg', ['-y', '-v', 'error', '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', base, '-loop', '1', '-i', fondInter, '-loop', '1', '-i', coins,
        '-filter_complex', `[0:v]scale=${pxP(CARTE.l)}:${pxP(CARTE.h)},format=rgba[v];[2:v]format=gray,scale=${pxP(CARTE.l)}:${pxP(CARTE.h)}[m];[v][m]alphamerge[c];[c]rotate=${rot}:c=none:ow=rotw(${rot}):oh=roth(${rot})[cr];[1:v]format=rgba[fd];[fd][cr]overlay=(main_w-overlay_w)/2:${pxV(CARTE.cy)}-overlay_h/2:shortest=1,format=yuv420p[o]`,
        '-map', '[o]', '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-t', (b - a).toFixed(3), f])
      return { a, b, f }
    }
    const v = visages(a, b), cx = v.length ? v.reduce((s, x) => s + (x[0] + x[2]) / 2, 0) / v.length : 360, cy = v.length ? v.reduce((s, x) => s + (x[1] + x[3]) / 2, 0) / v.length : 500
    const w = v.length ? v.reduce((s, x) => s + x[2] - x[0], 0) / v.length : 300, c = Math.round(clamp(w * 3.2, 360, 720))
    const x0 = Math.round(clamp(cx - c / 2, 0, 720 - c)), y0 = Math.round(clamp(cy - c / 2 + c * 0.08, 0, 1280 - c))
    const f = join(st, `collage-medaillon-${k}.mp4`)
    lancer('ffmpeg', ['-y', '-v', 'error', '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', base, '-loop', '1', '-i', papier, '-loop', '1', '-i', cercle,
      '-filter_complex', `[0:v]crop=${pxP(c)}:${pxP(c)}:${Math.min(LARG - pxP(c), pxV(x0))}:${Math.min(HAUT - pxP(c), pxV(y0))},scale=${pxV(520)}:${pxV(520)},format=rgba[v];[2:v]format=gray,scale=${pxV(520)}:${pxV(520)}[m];[v][m]alphamerge[c];[1:v][c]overlay=${pxV(100)}:${pxV(240)}:shortest=1,format=yuva420p[o]`,
      '-map', '[o]', '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-t', (b - a).toFixed(3), f])
    return { a, b, f }
  })

  // ── Les sons, puis le rendu final ──
  const SONS = readdirSync(join(ICI, 'sons')).filter(x => x.endsWith('.wav')).map(x => x.slice(0, -4))
  const son = sonneur(SONS, P.sons, THEME) // (06/11) ses sons à elle : "sons" dans projet.json (pack, ou un son par famille), voir sons-choix.mjs
  const ev = THEME === 'aurelie' ? [] : sons.map(s => ({ ...s, n: son(s.fam) })).filter(s => s.n) // signature : ses bruitages, elle les fait elle-même
  const n = readdirSync(dir).filter(x => /-v\d+\.mp4$/.test(x)).length + 1, sortie = join(dir, `${nom}-v${n}.mp4`)
  const entrees = ['-i', fond, '-f', 'concat', '-safe', '0', '-i', join(st, 'collage-devant.txt'), ...meds.flatMap(m => ['-i', m.f]), ...ev.flatMap(s => ['-i', join(ICI, 'sons', s.n + '.wav')])]
  const lut = join(ICI, 'luts', 'cinema.cube').replace(/\\/g, '/').replace(':', '\\:')
  const traitement = THEME === 'aurelie' && existsSync(join(ICI, 'luts', 'cinema.cube')) ? `lut3d=file='${lut}'`
    : THEME === 'automne' ? 'colorbalance=rs=.025:gs=.008:bs=-.03:rm=.02:bm=-.025,eq=saturation=1.05'
    : LUXE ? 'eq=saturation=0.9:contrast=1.05:brightness=0.01,colorbalance=rs=.03:gs=.012:bs=-.03:rm=.02:bm=-.02,vignette=angle=PI/5,noise=alls=5:allf=t'
    : THEME === 'doux' || THEME === 'witchy' || CHIC || THEME === 'studio' ? 'null'
    : THEME === 'editorial' ? `eq=saturation=1.02:contrast=1.04,colorbalance=rh=.015:bh=-.015,noise=alls=2:allf=t`
    : THEME === 'pop' && ARC ? `hue=s=0:enable='between(t,${ARC[0].toFixed(3)},${ARC[1].toFixed(3)})'` : 'null'
  let g = `[0:v]${traitement}[v0];`, cur = 'v0'
  meds.forEach((m, k) => { g += `[${2 + k}:v]format=rgba,fade=t=in:st=0:d=0.25:alpha=1,setpts=PTS-STARTPTS+${m.a.toFixed(3)}/TB[m${k}];[${cur}][m${k}]overlay=0:0:eof_action=pass:enable='between(t,${m.a.toFixed(3)},${m.b.toFixed(3)})'[w${k}];`; cur = `w${k}` })
  VERRES.forEach((V, k) => { const X = pxV(V.x), Y = pxV(V.y), W = pxP(V.l), H = pxP(V.h), R = pxV(V.r), a = V.a, b = V.b
    g += `[${cur}]split=2[vv${k}][vw${k}];[vw${k}]crop=${W}:${H}:${X}:${Y},gblur=sigma=${pxV(14)},eq=brightness=0.02:saturation=1.15,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(hypot(max(abs(X-W/2)-(W/2-${R}),0),max(abs(Y-H/2)-(H/2-${R}),0)),${R}),0,255*clip(min((T-${a.toFixed(3)})/0.4,(${b.toFixed(3)}-T)/0.35),0,1))'[vb${k}];[vv${k}][vb${k}]overlay=${X}:${Y}:enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'[vx${k}];`; cur = `vx${k}` })
  g += `[1:v]fps=30,format=rgba[dv];[${cur}][dv]overlay=0:0:eof_action=pass[vo];`
  const i0 = 2 + meds.length
  ev.forEach((s, k) => { const ms = Math.round(s.t * 1000); g += `[${i0 + k}:a]${s.duree ? `atrim=0:${s.duree.toFixed(2)},afade=t=out:st=${Math.max(0, s.duree - 0.15).toFixed(2)}:d=0.15,` : ''}adelay=${ms}|${ms},volume=${s.vol}[s${k}];` })
  g += `[0:a]${ev.map((_, k) => `[s${k}]`).join('')}amix=inputs=${ev.length + 1}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[ao]`
  writeFileSync(join(dir, 'sons-places.txt'), ev.map(s => `${s.t.toFixed(1).padStart(5)} s  ${s.n}`).join('\n') + '\n')
  lancer('ffmpeg', ['-y', '-v', 'error', ...entrees, '-filter_complex', g, '-map', '[vo]', '-map', '[ao]', '-t', TOT.toFixed(3), ...ENCODAGE, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', sortie])
  const rapport = [...alertes.values()].map(a => '⚠️ CONTRÔLE : ' + a.msg + ' à ' + a.t + (a.n > 1 ? ' (et ' + (a.n - 1) + ' autre' + (a.n > 2 ? 's' : '') + ' fois)' : ''))
  writeFileSync(join(st, 'controle-visuel.txt'), rapport.join('\n') || 'rien à signaler')
  if (rapport.length) console.log(rapport.join('\n')); else console.log('Contrôle visuel : rien à signaler (visage, doublons, bords, lisibilité)')
  console.log(`Collage · ${TOT.toFixed(1)} s · hook jusqu'à ${HOOK.toFixed(1)} s · ${ev.length} sons\nVidéo : ${sortie}`)
  verifier(sortie, dir, true)
}
