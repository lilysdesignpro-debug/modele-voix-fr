// LES EFFETS DU 06/11/2026 (demandés par Aurélie : techniques reprises,
// look à nous). Branchés dans effets.mjs (devant elle) et dans collage.mjs (derrière elle, détourée).
//   filrouge   : un bloc-notes qui revient à chaque « numéro un, numéro deux… » et se coche au fur et à mesure,
//                avec un badge chiffre en étoile (une étape = un effet « filrouge » avec son rang k)
//   compteurs  : SES vrais chiffres (vues, abonnés…) qui s'empilent en petites cartes avec une icône
//   graphique  : SA courbe qui se trace (SES vrais chiffres), la dernière valeur dans une bulle
//   polaroids  : SES photos qui sortent d'un appareil instantané et s'empilent
//   pluie      : SES photos qui tombent d'une enveloppe et se posent autour d'elle
//   corde      : SES photos qui glissent sur une corde à linge, pincées
//   eventail   : SES photos qui s'ouvrent en éventail depuis un dossier
//   objets derrière elle (détourée) : machine (machine à écrire qui tape SON plan), panneau (panneau routier)
// ⛔ Les chiffres et les photos sont TOUJOURS les siens : jamais inventés.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mesurerRond } from './rond.mjs'
const ICI_E = dirname(fileURLToPath(import.meta.url))
// (06/11) les VRAIS objets photographiés et détourés, à la place des dessins (« trop fake ») : { src, l, h } ou null
// (07/11) LES MESURES de chaque objet, prises au pixel sur SA photo (coordonnées en pixels de l'image) :
//   fente : la fente d'un appareil instantané (y, x début, x fin, en fraction) ; bord : le bord avant d'une boîte ou le V d'une poche d'enveloppe,
//   de gauche à droite : on ne voit ce qui sort QUE au-dessus de ce bord. Objets de Canva (les siens) ET libres de droits (ceux des clientes).
export const MESURES = {
  'polaroid-1000': { fente: [0.885, 0.088, 0.928] },
  'boite-carton': { bord: [[0, 482], [60, 482], [236, 589], [250, 595], [725, 529]] },
  'coffre-bois': { bord: [[0, 221], [386, 221]] },
  'enveloppe-kraft-lettre': { bord: [[0, 365], [60, 412], [150, 487], [250, 570], [380, 640], [432, 632], [520, 616], [620, 533], [720, 454], [800, 399], [864, 350]] },
}
// (07/11) le rond des tasses vues de dessus de SON Canva (motTasse) : [x du centre, y du centre, rayon] en pixels de l'image
export const RONDS = {}
// au-dessus du bord (ce qui sort reste visible) : polygone en pixels de la page ; O = l'objet, x/y/l = où il est posé
export const dessusDuBord = (O, x, y, l) => { const B = O.mesures.bord, s = l / O.l, P = ([a, b]) => (x + a * s).toFixed(1) + 'px ' + (y + b * s).toFixed(1) + 'px'
  return 'polygon(0px 0px,720px 0px,720px ' + (y + B.at(-1)[1] * s).toFixed(1) + 'px,' + B.slice().reverse().map(P).join(',') + ',0px ' + (y + B[0][1] * s).toFixed(1) + 'px)' }
// (06/11) les VRAIS objets photographiés et détourés, à la place des dessins (« trop fake ») : { nom, src, l, h, mesures } ou null.
// (07/11) Ordre : objets-perso (SES objets à elle, importés de SON Canva par importer-objets.mjs, avec leurs mesures dans
// objets-perso/mesures.json), puis objets-canva (ceux d'Aurélie, jamais livrés), puis objets (libres de droits, livrés).
// Un contenant (boîte, enveloppe, appareil) importé SANS mesure est ignoré : sans son bord, rien ne pourrait en sortir proprement.
const lireJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return {} } }
export const objet = (...noms) => { const perso = lireJson(join(ICI_E, 'objets-perso', 'mesures.json')), livres = lireJson(join(ICI_E, 'objets', 'mesures.json'))
  for (const n of noms) for (const d of process.env.MONTAGE_SANS_CANVA ? ['objets-perso', 'objets'] : ['objets-perso', 'objets-canva', 'objets']) { const f = join(ICI_E, d, n + '.png'); if (!existsSync(f)) continue
    // un objet libre porte le même nom que l'objet Canva qu'il remplace, mais PAS la même photo : ses mesures sont dans objets/mesures.json
    const mesures = d === 'objets-perso' ? perso[n] : d === 'objets' ? livres[n] : MESURES[n]; if ((MESURES[n] || livres[n]) && !mesures) continue
    const b = readFileSync(f); return { nom: n, dossier: d, src: 'data:image/png;base64,' + b.toString('base64'), l: b.readUInt32BE(16), h: b.readUInt32BE(20), mesures } }
  return null }
// sous le bord (la face avant de l'objet, à redessiner par-dessus) : polygone en % de l'image
export const faceAvant = O => { const B = O.mesures.bord; return 'polygon(' + [...B.map(([a, b]) => (a / O.l * 100).toFixed(2) + '% ' + (b / O.h * 100).toFixed(2) + '%'), '100% 100%', '0% 100%'].join(',') + ')' }

const image = f => { if (!f || !existsSync(f)) return null; const ext = f.split('.').pop().toLowerCase(); return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${readFileSync(f).toString('base64')}` }
const OMBRE = 'box-shadow:0 10px 24px rgba(0,0,0,.28)'

// l'étoile éclatée du badge chiffre
const etoile = (n, col, taille, p) => {
  const pts = []; for (let i = 0; i < 24; i++) { const r = i % 2 ? 0.74 : 1, a = (i / 24) * Math.PI * 2; pts.push((50 + 50 * r * Math.cos(a)).toFixed(1) + ',' + (50 + 50 * r * Math.sin(a)).toFixed(1)) }
  return '<div style="position:absolute;width:' + taille + 'px;height:' + taille + 'px;transform:scale(' + p.toFixed(3) + ') rotate(' + ((1 - Math.min(1, p)) * -40).toFixed(1) + 'deg)">'
    + '<svg viewBox="0 0 100 100" width="' + taille + '" height="' + taille + '" style="position:absolute;inset:0;filter:drop-shadow(0 4px 8px rgba(0,0,0,.25))"><polygon points="' + pts.join(' ') + '" fill="' + col + '"/></svg>'
    + '<div style="position:absolute;inset:0;display:grid;place-items:center;font:900 ' + Math.round(taille * 0.46) + 'px/1 Rond,Poppins,sans-serif;color:#fff">' + n + '</div></div>'
}

export function effet2(E, { clamp, doux, rebond, esc, couleurs, dossier = '' }) {
  const chemin = f => f && (f.includes(':') || f.startsWith('/') ? f : dossier + '/' + f)
  const accent = couleurs.feutre || '#E8613C'
  const cote = E.cote === 'gauche' ? 'gauche' : 'droite'
  const photos = () => [].concat(E.images || []).slice(0, 5).map(f => image(chemin(f))).filter(Boolean)


  // ── (06/11) trois effets choisis par Aurélie dans un reel de tuto IA (techniques reprises, look à nous) ──
  // chapitre : titre de chapitre élégant sur 2 lignes, au-dessus de sa tête (capitales serif espacées + petite ligne italique)
  if (E.type === 'chapitre') {
    const t1 = String(E.titre || E.texte || '').trim(), t2 = String(E.sous || '').trim(); if (!t1) return null
    const lux = couleurs.skin === 'luxe', acc = lux ? '#E3C38A' : '#fff', duree = E.duree ?? 2.6
    return { hauteur: t2 ? 104 : 70, anim: 0.8, duree,
      dessin: (dt, y) => { const p = doux(dt / 0.6), q = doux((dt - 0.35) / 0.5), s = clamp((duree - dt) / 0.35, 0, 1)
        return '<div style="position:absolute;left:40px;right:40px;top:' + y + 'px;text-align:center;opacity:' + Math.min(p, s).toFixed(2) + ';text-shadow:0 2px 14px rgba(0,0,0,.35)">'
          + '<div style="font:500 44px/1.05 DidotT,Didot,serif;letter-spacing:' + (0.32 - 0.18 * p).toFixed(3) + 'em;color:#fff;text-transform:uppercase">' + esc(t1) + '</div>'
          + '<div style="width:' + Math.round(120 * q) + 'px;height:1px;background:' + acc + ';margin:12px auto 10px"></div>'
          + (t2 ? '<div style="font:italic 400 26px/1.1 Didot,serif;color:#fff;opacity:' + q.toFixed(2) + '">' + esc(t2) + '</div>' : '') + '</div>' },
      sons: t0 => [{ t: t0, fam: 'page', vol: 0.07 }] }
  }
  // chat : une barre de message qui se tape avec son curseur, et le bouton d'envoi qui s'allume quand c'est écrit
  if (E.type === 'chat') {
    const txt = String(E.texte || '').trim(); if (!txt) return null
    const vit = E.vitesse || 16, tFrappe = 0.35 + txt.length / vit, duree = E.duree ?? Math.max(2.6, tFrappe + 1.2), W = Math.min(620, Math.max(360, 140 + txt.length * 17))
    const lux = couleurs.skin === 'luxe', acc = lux ? '#C9A46A' : accent
    return { hauteur: 74, anim: tFrappe, duree,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.3), 0, 1.06), n = Math.max(0, Math.min(txt.length, Math.floor((dt - 0.35) * vit))), fini = n >= txt.length, cli = Math.floor(dt * 2.2) % 2 === 0
        const env = fini ? clamp(rebond((dt - tFrappe) / 0.25), 0, 1.15) : 1
        return '<div style="position:absolute;left:' + Math.round(360 - W / 2) + 'px;top:' + y + 'px;width:' + W + 'px;height:74px;box-sizing:border-box;border-radius:37px;background:rgba(255,255,255,.96);box-shadow:0 10px 30px rgba(0,0,0,.22);display:flex;align-items:center;gap:14px;padding:0 14px 0 26px;transform:scale(' + p.toFixed(3) + ')">'
          + '<span style="flex:none;font:700 26px/1 Poppins,sans-serif;color:' + acc + '">✦</span>'
          + '<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;font:600 28px/1 Poppins,sans-serif;color:#1d1d1f">' + esc(txt.slice(0, n)) + '<span style="display:inline-block;width:3px;height:30px;margin-left:2px;vertical-align:-5px;background:' + acc + ';opacity:' + (fini ? (cli ? 1 : 0) : 1) + '"></span></span>'
          + '<span style="flex:none;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:' + (fini ? acc : '#d9d9de') + ';color:#fff;font:700 26px/1 Poppins,sans-serif;transform:scale(' + env.toFixed(3) + ')">↑</span></div>' },
      sons: t0 => [{ t: t0, fam: 'pop', vol: 0.05 }, { t: t0 + 0.35, fam: 'clavier', vol: 0.05, duree: Math.max(0.3, tFrappe - 0.4) }, { t: t0 + tFrappe + 0.05, fam: 'clic', vol: 0.07 }] }
  }
  // (07/11) objet : UN vrai objet (sa banque : latte, matcha, tasse, polaroid, calculatrice…) tombe à côté d'elle quand elle en parle,
  // se pose avec un petit écrasement et son ombre de contact, flotte à peine, puis s'efface. { type: 'objet', t, nom: 'latte' } (nom ou liste de noms)
  if (E.type === 'objet') {
    const O = objet(...[].concat(E.nom || [])); if (!O) return null
    const W = 300, H = 330, duree = E.duree ?? 2.8, POSE = 0.42 // posé en bas, du côté libre, comme sur la table (jamais en l'air à hauteur de tête)
    return { hauteur: H, anim: 0.6, duree, place: E.surCote ? cote : undefined, // très gros plan : pas la place sous son visage, il se pose de côté, plus petit
      dessin: (dt, y) => { const k = E.surCote ? clamp((E.largeur || W) / W, 0.45, 1) : 1, w = W * k, h = (H - 34) * k, x = cote === 'droite' ? 720 - w - 24 : 24
        const f = Math.min(w / O.l, h / O.h), lo = O.l * f, ho = O.h * f, xo = x + (w - lo) / 2, sol = y + 6 + h
        const q = clamp(dt / POSE, 0, 1), chute = (1 - q * q) * -(sol + 40 - y), u = dt - POSE
        const ecrase = u > 0 && u < 0.28 ? Math.sin(u / 0.28 * Math.PI) * Math.exp(-u * 6) * 0.14 : 0, flotte = u > 0.3 ? Math.sin((u - 0.3) * 2.4) * 2.5 : 0
        const sortie = clamp((dt - (duree - 0.35)) / 0.35, 0, 1), rot = (1 - q) * (cote === 'droite' ? 14 : -14), proche = clamp(q * 1.2, 0, 1)
        return '<div style="position:absolute;left:' + (xo + lo * 0.12).toFixed(1) + 'px;top:' + (sol - 10).toFixed(1) + 'px;width:' + (lo * 0.76).toFixed(1) + 'px;height:20px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.38),transparent);opacity:' + (proche * (1 - sortie)).toFixed(2) + ';transform:scaleX(' + (0.6 + 0.4 * proche + ecrase).toFixed(3) + ')"></div>'
          + '<img src="' + O.src + '" style="position:absolute;left:' + xo.toFixed(1) + 'px;top:' + (sol - ho + chute + flotte).toFixed(1) + 'px;width:' + lo.toFixed(1) + 'px;transform-origin:50% 100%;transform:rotate(' + rot.toFixed(1) + 'deg) scale(' + (1 + ecrase - 0.25 * sortie).toFixed(3) + ',' + (1 - ecrase - 0.25 * sortie).toFixed(3) + ');opacity:' + (1 - sortie).toFixed(2) + ';filter:drop-shadow(0 10px 14px rgba(0,0,0,.28))">' },
      sons: t0 => [{ t: t0 + POSE - 0.02, fam: 'pop', vol: 0.06 }] }
  }
  // (07/11) motTasse : un mot en géant dont le O est une VRAIE tasse vue de dessus (« POSSIBLE », « MOINS DE SCROLL »…).
  // { type: 'motTasse', t, texte: 'possible', nom: 'matcha-latte', transition: 'pose' | 'glisse' | 'tourne' | 'zoom', lettre: 3 }
  //   pose : la tasse est posée dans le trou du mot, d'en haut (elle descend vers la table, son ombre se resserre)
  //   glisse : elle arrive de côté en tournant sur elle-même, comme poussée sur une table, et s'arrête pile
  //   tourne : le O est d'abord une lettre, qui pivote et devient la tasse
  //   zoom : la tasse remplit l'écran (vue d'au-dessus) puis rétrécit dans le mot, les lettres arrivent autour
  // Le rond de la tasse (son bord, ou sa soucoupe) est mesuré au pixel : objets/ronds.json (outil rond), sinon centre de l'image.
  if (E.type === 'motTasse') {
    const txt = String(E.texte || '').trim().toUpperCase(); if (!txt) return null
    const iO = E.lettre ?? txt.indexOf('O'); if (iO < 0 || txt[iO] !== 'O') return null // pas de O : pas de tasse
    const O = objet(...[].concat(E.nom || ['matcha-latte', 'tasse-1', 'latte'])); if (!O) return null
    const R = (O.dossier === 'objets' ? lireJson(join(ICI_E, 'objets', 'ronds.json')) : O.dossier === 'objets-perso' ? lireJson(join(ICI_E, 'objets-perso', 'ronds.json')) : RONDS)[O.nom] || mesurerRond(join(ICI_E, O.dossier, O.nom + '.png')) || [O.l / 2, O.h / 2, Math.min(O.l, O.h) * 0.47] // une tasse importée par l'élève se mesure toute seule : elle n'a rien à faire
    const mode = ['pose', 'zoom'].includes(E.transition) ? E.transition : 'pose', duree = E.duree ?? 2.8 // (07/11) Aurélie garde pose et zoom ; glisse et tourne refusées (le code reste, jamais choisi)
    const larg = [...txt].reduce((w, c) => w + (c === ' ' ? 0.28 : 'MW'.includes(c) ? 1.0 : 'IJ1'.includes(c) ? 0.38 : 'O'.includes(c) ? 0.8 : 0.74), 0), z = Math.round(Math.min(150, 600 / larg)), lux = couleurs.skin === 'luxe', col = E.couleur || (lux ? '#E3C38A' : accent) // largeur réelle des lettres (Montserrat Black) : le mot tient dans l'écran, même penché
    const D = z * 0.78, s = D / (2 * R[2]) // diamètre du rond = un O de la police (Montserrat Black : 0,78 em de large)
    const debutL = mode === 'zoom' ? 0.5 : 0, arrive = { pose: 0.32, glisse: 0.38, tourne: 0.75, zoom: 0 }[mode], fin = { pose: 0.42, glisse: 0.55, tourne: 0.35, zoom: 0.55 }[mode]
    const ressort = u => u >= 1 ? 1 : 1 - Math.exp(-6 * u) * Math.cos(u * 9.5) * (1 - u) // arrive avec un petit dépassement, puis se cale
    return { hauteur: Math.round(z * 1.1 + 24), anim: Math.max(arrive + fin, debutL + Math.max(iO, txt.length - 1 - iO) * 0.035 + 0.4) + 0.1, duree, // anim : jusqu'à la DERNIÈRE lettre posée (sinon l'image figée garde des lettres à moitié arrivées, ex. « 3 MOIS » sans le 3)
      dessin: (dt, y) => {
        const lettres = [...txt].map((c, k) => { if (k === iO) return null
          const p = clamp(rebond((dt - debutL - Math.abs(k - iO) * 0.035) / 0.28), 0, 1.1)
          return '<span style="display:inline-block;opacity:' + clamp(p * 2, 0, 1).toFixed(2) + ';transform:translateY(' + ((1 - Math.min(p, 1)) * z * 0.25).toFixed(1) + 'px) scale(' + (0.6 + 0.4 * p).toFixed(3) + ')">' + (c === ' ' ? '&nbsp;' : esc(c)) + '</span>' })
        const u = clamp((dt - arrive) / fin, 0, 1), vit = Math.max(0, dt - arrive - fin), vie = Math.sin(vit * 1.6) * 2 // vivante une fois posée : elle pivote à peine
        let tasse = '', lettreO = ''
        const lI = O.l * s, hI = O.h * s, img = (tr, op, ombre) => '<img src="' + O.src + '" style="position:absolute;left:' + (D / 2 - R[0] * s).toFixed(1) + 'px;top:' + (D / 2 - R[1] * s).toFixed(1) + 'px;width:' + lI.toFixed(1) + 'px;height:' + hI.toFixed(1) + 'px;max-width:none;transform-origin:' + (R[0] * s).toFixed(1) + 'px ' + (R[1] * s).toFixed(1) + 'px;transform:' + tr + ';opacity:' + op + ';filter:drop-shadow(' + ombre + ')">'
        if (mode === 'pose' && dt >= arrive) { const e = ressort(u), h = 1 - Math.min(1, e) // h : hauteur au-dessus de la table
          tasse = img('rotate(' + (h * 18 + vie).toFixed(2) + 'deg) scale(' + (1 + 0.55 * h - Math.max(0, e - 1) * 0.5).toFixed(3) + ')', clamp(u * 4, 0, 1).toFixed(2), (4 + 26 * h).toFixed(1) + 'px ' + (6 + 30 * h).toFixed(1) + 'px ' + (5 + 16 * h).toFixed(1) + 'px rgba(40,20,10,' + (0.32 - 0.12 * h).toFixed(2) + ')') }
        if (mode === 'glisse' && dt >= arrive) { const e = 1 - Math.pow(1 - u, 3), r = 1 - e, dir = iO < txt.length / 2 ? 1 : -1 // freinée par la table, sans rebond ; elle traverse l'écran depuis le côté le plus loin du O (sinon on ne la voit pas arriver)
          tasse = img('translateX(' + (dir * r * 760).toFixed(1) + 'px) rotate(' + (dir * r * 220 + vie).toFixed(1) + 'deg)', '1', '4px 6px 5px rgba(40,20,10,.32)') }
        if (mode === 'tourne') { const a = clamp((dt - arrive) / (fin * 0.45), 0, 1), b = clamp((dt - arrive - fin * 0.45) / (fin * 0.55), 0, 1)
          if (a < 1) lettreO = '<span style="position:absolute;inset:0;display:grid;place-items:end center;line-height:0.74;transform:perspective(600px) rotateY(' + (a * 90).toFixed(1) + 'deg);opacity:' + clamp((dt - 0.05) / 0.2, 0, 1).toFixed(2) + '">O</span>'
          else tasse = img('perspective(600px) rotateY(' + ((1 - ressort(b)) * -90).toFixed(1) + 'deg) rotate(' + vie.toFixed(2) + 'deg)', '1', '4px 6px 5px rgba(40,20,10,.32)') }
        if (mode === 'zoom') { const e = doux(clamp(dt / fin, 0, 1)), g = 1100 / D, k = g + (1 - g) * e, flou = clamp((k * D / (2 * R[2]) - 1.15) * 2.2, 0, 7) * (1 - e) // au départ, le rond fait la largeur de l'écran ; une photo plus petite que ça est floutée par le mouvement, jamais pixelisée
          tasse = img('scale(' + k.toFixed(3) + ') rotate(' + ((1 - e) * -40 + vie).toFixed(1) + 'deg)', clamp(dt / 0.12, 0, 1).toFixed(2), (4 + 30 * (1 - e)).toFixed(1) + 'px ' + (6 + 40 * (1 - e)).toFixed(1) + 'px ' + (5 + 20 * (1 - e)).toFixed(1) + 'px rgba(40,20,10,.3)) blur(' + (flou / k).toFixed(2) + 'px') }
        const trou = '<span style="display:inline-block;position:relative;width:' + (z * 0.78).toFixed(1) + 'px;height:' + (z * 0.72).toFixed(1) + 'px;margin:0 ' + (z * 0.01).toFixed(1) + 'px;vertical-align:' + (-z * 0.012).toFixed(1) + 'px">'
          + '<span style="position:absolute;left:' + ((z * 0.78 - D) / 2).toFixed(1) + 'px;top:' + ((z * 0.72 - D) / 2).toFixed(1) + 'px;width:' + D.toFixed(1) + 'px;height:' + D.toFixed(1) + 'px">' + tasse + '</span>' + lettreO + '</span>'
        return '<div style="position:absolute;left:0;right:0;top:' + y + 'px;text-align:center;white-space:nowrap;transform:rotate(-4deg)">'
          + '<div style="display:inline-block;font:900 ' + z + 'px/1 Rond,Poppins,sans-serif;color:' + col + ';-webkit-text-stroke:' + Math.round(z / 14) + 'px #fff;paint-order:stroke fill;text-shadow:0 10px 30px rgba(0,0,0,.25)">'
          + lettres.slice(0, iO).join('') + trou + lettres.slice(iO + 1).join('') + '</div></div>' },
      sons: t0 => mode === 'glisse' ? [{ t: t0 + arrive - 0.05, fam: 'whoosh', vol: 0.06 }, { t: t0 + arrive + fin * 0.6, fam: 'clic', vol: 0.06 }]
        : mode === 'zoom' ? [{ t: t0, fam: 'whoosh', vol: 0.06 }, { t: t0 + fin, fam: 'pop', vol: 0.06 }]
        : mode === 'tourne' ? [{ t: t0 + 0.05, fam: 'pop', vol: 0.05 }, { t: t0 + arrive, fam: 'whoosh', vol: 0.05 }]
        : [{ t: t0 + 0.05, fam: 'pop', vol: 0.05 }, { t: t0 + arrive + fin * 0.55, fam: 'clic', vol: 0.07 }] }
  }
  // (07/11) pincee : SES captures d'écran tenues par une vraie pince à dessin, au-dessus de sa tête. La 1re arrive d'en haut
  // et se balance une seconde sur la pince ; les suivantes remplacent la précédente (qui tombe) toutes les `pas` secondes.
  // Un petit objet de sa banque peut se poser sur le coin (café glacé, étoile…). Repris du reel de Taylor Slango, look à nous.
  // { type: 'pincee', t, images: ['captures/a.png', 'captures/b.png'], pas: 2.2 }   (objet: 'cafe-glace-1' en option, rien par défaut : la pince suffit, choix d'Aurélie 07/11)
  if (E.type === 'pincee') {
    const ims = [].concat(E.images || []).slice(0, 6).map(f => image(chemin(f))).filter(Boolean); if (!ims.length) return null
    const P = objet('pince-capture'), coin = E.objet ? objet(...[].concat(E.objet)) : null
    const ratio = E.ratio || 1.25, W = Math.round(clamp(E.largeur || 280, 170, 300)), H = Math.round(W * ratio), pas = E.pas ?? 2.2 // à côté de sa tête, du côté libre (jamais sur son visage), comme chez Taylor
    const lP = W * 0.34, hP = P ? lP * P.h / P.l : 0, mord = P ? hP * (394 / 499) : 0 // la mâchoire de la pince (mesurée au pixel) mord le haut de la capture
    const duree = E.duree ?? Math.max(2.8, ims.length * pas + 0.6), haut = Math.round(mord)
    return { hauteur: H + haut + 10, anim: 0.5, duree, place: cote,
      dessin: (dt, y) => {
        const x0 = cote === 'droite' ? 720 - W - 50 : 50, yC = y + haut, k = Math.min(ims.length - 1, Math.floor(Math.max(0, dt) / pas)), tk = dt - k * pas
        const chute = doux(clamp(dt / 0.42, 0, 1)), dy = (1 - chute) * -(yC + H + 60)
        const balance = (u, A) => u > 0 ? A * Math.exp(-3.2 * u) * Math.sin(u * 9) : 0 // le balancier qui s'amortit, autour de la pince
        const th = balance(dt - 0.3, 6) + (k > 0 ? balance(tk, 3.5) : 0) + Math.sin(dt * 1.3) * 0.35
        const carte = (src, extra) => '<div style="position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;border-radius:14px;overflow:hidden;background:#fff url(' + src + ') center/cover;box-shadow:0 18px 34px rgba(0,0,0,.32),0 2px 6px rgba(0,0,0,.18);' + extra + '"></div>'
        let cartes = ''
        if (k > 0 && tk < 0.45) { const u = doux(tk / 0.45) // l'ancienne glisse hors de la pince et tombe
          cartes += carte(ims[k - 1], 'transform-origin:50% 0;transform:translateY(' + (u * 260).toFixed(1) + 'px) rotate(' + (u * 9).toFixed(1) + 'deg);opacity:' + (1 - u).toFixed(2)) }
        const entre = k > 0 ? doux(clamp(tk / 0.3, 0, 1)) : 1 // la nouvelle se glisse dans la pince par le haut
        cartes += carte(ims[k], 'clip-path:inset(0 0 ' + ((1 - entre) * 100).toFixed(1) + '% 0 round 14px);transform:translateY(' + ((1 - entre) * -18).toFixed(1) + 'px)')
        const pince = P ? '<img src="' + P.src + '" style="position:absolute;left:' + ((W - lP) / 2).toFixed(1) + 'px;top:' + (-mord).toFixed(1) + 'px;width:' + lP.toFixed(1) + 'px;max-width:none;filter:drop-shadow(0 4px 5px rgba(0,0,0,.35))">' : ''
        let deco = ''
        if (coin) { const q = clamp(rebond((dt - 0.55) / 0.3), 0, 1.1), lo = W * 0.36, ho = lo * coin.h / coin.l
          if (dt > 0.55) deco = '<img src="' + coin.src + '" style="position:absolute;left:' + (cote === 'droite' ? Math.min(W - lo * 0.62, 720 - x0 - lo - 8) : Math.max(-lo * 0.38, 8 - x0)).toFixed(1) + 'px;top:' + (H - ho * 0.7).toFixed(1) + 'px;width:' + lo.toFixed(1) + 'px;max-width:none;transform:rotate(8deg) scale(' + q.toFixed(3) + ');transform-origin:50% 100%;filter:drop-shadow(0 8px 10px rgba(0,0,0,.3))">' }
        return '<div style="position:absolute;left:' + x0.toFixed(1) + 'px;top:' + (yC + dy).toFixed(1) + 'px;width:' + W + 'px;height:' + H + 'px;transform-origin:50% ' + (-mord * 0.5).toFixed(1) + 'px;transform:rotate(' + th.toFixed(2) + 'deg)">' + cartes + pince + deco + '</div>' },
      sons: t0 => [{ t: t0 + 0.38, fam: 'clic', vol: 0.08 }, ...ims.slice(1).map((_, i) => ({ t: t0 + (i + 1) * pas, fam: 'papier', vol: 0.07, duree: 0.4 })), ...(coin ? [{ t: t0 + 0.6, fam: 'pop', vol: 0.05 }] : [])] }
  }
  // motGeant : le mot-clé de fin en géant, en biais, contour blanc, qui claque puis respire
  if (E.type === 'motGeant') {
    const mot = String(E.texte || '').trim(); if (!mot) return null
    const duree = E.duree ?? 3.2, z = Math.round(Math.min(150, 1150 / Math.max(4, mot.length))), lux = couleurs.skin === 'luxe', col = E.couleur || (lux ? '#E3C38A' : accent)
    return { hauteur: z + 60, anim: 0.4, duree,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.32), 0, 1.12), r = 1 + 0.025 * Math.sin(dt * 4)
        return '<div style="position:absolute;left:0;right:0;top:' + y + 'px;text-align:center;transform:rotate(-8deg) scale(' + (p * (p >= 1 ? r : 1)).toFixed(3) + ')">'
          + '<div style="font:700 24px/1 Poppins,sans-serif;letter-spacing:.3em;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.4);margin-bottom:6px">' + esc((E.avant || 'COMMENTE').toUpperCase()) + '</div>'
          + '<div style="font:900 ' + z + 'px/0.95 ' + (lux ? 'DidotT,Didot,serif' : 'Rond,Poppins,sans-serif') + ';color:' + col + ';-webkit-text-stroke:' + Math.round(z / 14) + 'px #fff;paint-order:stroke fill;text-shadow:0 10px 30px rgba(0,0,0,.3);text-transform:uppercase">' + esc(mot) + '</div></div>' },
      sons: t0 => [{ t: t0, fam: 'pop', vol: 0.09 }] }
  }

  // ── LE LOOK LUXE (style « luxe », validé le 06/11) : verre fumé (flouté par ffmpeg dessous, voir « cadre »), or pâle, serif fin ──
  if (couleurs.skin === 'luxe') {
    const OR = '#E3C38A', VF = 'background:linear-gradient(160deg,rgba(60,42,30,.30),rgba(30,20,14,.38));box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 0 0 1px rgba(255,255,255,.22),0 24px 50px rgba(30,15,5,.22)', OMB = 'text-shadow:0 1px 1px rgba(0,0,0,.25),0 4px 16px rgba(0,0,0,.3)'
    const caps = (t, col = OR, z = 12) => '<span style="font:500 ' + z + 'px/1 DidotT,sans-serif;letter-spacing:.34em;color:' + col + '">' + esc(String(t).toUpperCase()) + '</span>'
    const rond = (fait, p = 1) => '<span style="flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;' + (fait ? 'background:' + OR + ';color:#3a2a14' : 'box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.8)') + ';font:600 12px/1 DidotT,sans-serif;transform:scale(' + (fait ? (0.6 + 0.4 * p).toFixed(2) : 1) + ')">' + (fait ? '✓' : '') + '</span>'
    if (E.type === 'filrouge') {
      const items = (E.items || []).slice(0, 6), k = Math.max(0, Math.min(items.length - 1, E.k || 0)); if (!items.length) return null
      const W = 280, H = 88 + items.length * 50, duree = E.duree ?? 3.4, x = cote === 'droite' ? 720 - W - 34 : 34
      return { hauteur: H, anim: 1.4, duree, place: cote, cadre: y => ({ x, y, l: W, h: H, r: 24 }),
        dessin: (dt, y) => { const p = doux(dt / 0.35), coche = clamp((dt - 1.25) / 0.3, 0, 1), ec = clamp((dt - 0.45) / 0.7, 0, 1)
          return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + W + 'px;height:' + H + 'px;box-sizing:border-box;border-radius:24px;padding:22px 24px;' + VF + ';color:#fff;opacity:' + p.toFixed(2) + '">'
            + '<div style="display:flex;justify-content:space-between">' + caps(E.titre || 'ma liste', '#fff') + caps((k + 1) + '/' + items.length) + '</div>'
            + '<div style="height:2px;border-radius:1px;background:rgba(255,255,255,.28);margin:14px 0 4px"><div style="height:100%;width:' + (100 * (k + coche) / items.length).toFixed(1) + '%;background:' + OR + '"></div></div>'
            + items.map((it, j) => { const vu = j < k ? it : j === k ? it.slice(0, Math.ceil(it.length * ec)) : it
              return '<div style="display:flex;align-items:center;gap:14px;height:50px;border-bottom:' + (j < items.length - 1 ? '1px solid rgba(255,255,255,.2)' : 'none') + ';font:italic 400 29px/1 Didot,serif;' + OMB + '">' + rond(j < k || (j === k && coche > 0), j === k ? coche : 1) + '<span style="opacity:' + (j < k ? 0.6 : j === k ? 1 : 0.85) + '">' + esc(vu) + '</span></div>' }).join('') + '</div>' },
        sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.04 }, { t: t0 + 1.25, fam: 'clic', vol: 0.07 }] }
    }
    if (E.type === 'listeLuxe') {
      const items = (E.items || []).slice(0, 5).map(String).filter(Boolean); if (!items.length) return null
      const pas = 0.6, W = 300, H = 88 + items.length * 50, duree = E.duree ?? Math.max(3.5, 1.2 + items.length * pas + 1.6), x = 360 - W / 2
      return { hauteur: H, anim: 0.4 + items.length * pas, duree, cadre: y => ({ x, y, l: W, h: H, r: 24 }),
        dessin: (dt, y) => { const p = doux(dt / 0.35), faits = items.filter((_, j) => dt > 0.5 + j * pas).length
          return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + W + 'px;height:' + H + 'px;box-sizing:border-box;border-radius:24px;padding:22px 24px;' + VF + ';color:#fff;opacity:' + p.toFixed(2) + '">'
            + '<div style="display:flex;justify-content:space-between">' + caps(E.titre || 'ma liste', '#fff') + caps(faits + '/' + items.length) + '</div>'
            + '<div style="height:2px;border-radius:1px;background:rgba(255,255,255,.28);margin:14px 0 4px"><div style="height:100%;width:' + (100 * faits / items.length).toFixed(1) + '%;background:' + OR + '"></div></div>'
            + items.map((it, j) => { const q = clamp((dt - 0.5 - j * pas) / 0.25, 0, 1)
              return '<div style="display:flex;align-items:center;gap:14px;height:50px;border-bottom:' + (j < items.length - 1 ? '1px solid rgba(255,255,255,.2)' : 'none') + ';font:italic 400 29px/1 Didot,serif;' + OMB + '">' + rond(q > 0, q) + '<span style="opacity:' + (q > 0 ? 0.62 : 1) + '">' + esc(it) + '</span></div>' }).join('') + '</div>' },
        sons: t0 => items.map((_, j) => ({ t: t0 + 0.5 + j * pas, fam: 'clic', vol: 0.06 })) }
    }
    if (E.type === 'grille') {
      const lignes = (E.lignes || []).slice(0, 5).map(l => Array.isArray(l) ? { nom: l[0], texte: l[1] } : l).filter(l => l && l.nom); if (!lignes.length) return null
      const pas = E.pas || 0.7, H = 64 + lignes.length * 62, duree = E.duree ?? Math.max(3.5, 0.4 + lignes.length * pas + 1.6)
      return { hauteur: H, anim: 0.4 + lignes.length * pas, duree, cadre: y => ({ x: 70, y, l: 580, h: H, r: 24 }),
        dessin: (dt, y) => { const p = doux(dt / 0.3)
          return '<div style="position:absolute;left:70px;width:580px;height:' + H + 'px;top:' + y + 'px;box-sizing:border-box;border-radius:24px;padding:22px 26px;' + VF + ';color:#fff;opacity:' + p.toFixed(2) + '">'
            + '<div style="margin-bottom:6px">' + caps(E.titre || 'ma formule', '#fff') + '</div>'
            + lignes.map((l, j) => { const q = clamp((dt - 0.35 - j * pas) / 0.5, 0, 1), t = String(l.texte || '')
              return '<div style="display:flex;align-items:center;gap:18px;height:62px;border-top:1px solid rgba(255,255,255,.2)"><span style="flex:none;width:120px">' + caps(l.nom) + '</span><span style="font:italic 400 28px/1.1 Didot,serif;' + OMB + '">' + esc(t.slice(0, Math.ceil(t.length * q))) + '</span></div>' }).join('') + '</div>' },
        sons: t0 => lignes.map((_, j) => ({ t: t0 + 0.35 + j * pas, fam: 'clic', vol: 0.05 })) }
    }
    if (E.type === 'progression') {
      const duree = E.duree ?? 2.6, x = cote === 'droite' ? 720 - 340 - 40 : 40
      return { hauteur: 92, anim: duree, duree, place: cote, cadre: y => ({ x, y, l: 340, h: 92, r: 20 }),
        dessin: (dt, y) => { const p = doux(dt / 0.25), r = clamp((dt - 0.3) / Math.max(0.8, duree - 1), 0, 1), fini = r >= 1
          return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:340px;height:92px;box-sizing:border-box;border-radius:20px;padding:20px 22px;' + VF + ';color:#fff;opacity:' + p.toFixed(2) + '">'
            + '<div style="display:flex;justify-content:space-between">' + caps(fini ? (E.fin || 'terminé') : (E.texte || 'en cours'), '#fff') + caps(Math.round(r * 100) + ' %') + '</div>'
            + '<div style="height:2px;border-radius:1px;background:rgba(255,255,255,.28);margin-top:18px"><div style="height:100%;width:' + (r * 100).toFixed(1) + '%;background:' + OR + '"></div></div></div>' },
        sons: t0 => [{ t: t0 + duree - 0.7, fam: 'clic', vol: 0.07 }] }
    }
    if (E.type === 'pastille') {
      const txt = String(E.texte || '').trim(); if (!txt) return null
      const duree = E.duree ?? 1.8
      return { hauteur: 56, anim: 0.4, duree,
        dessin: (dt, y) => { const p = doux(dt / 0.3)
          return '<div style="position:absolute;left:0;right:0;top:' + y + 'px;text-align:center;opacity:' + p.toFixed(2) + ';transform:translateY(' + ((1 - p) * 8).toFixed(1) + 'px)"><span style="display:inline-flex;align-items:center;gap:10px;padding:12px 22px;border-radius:999px;background:rgba(30,20,14,.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);color:#fff;font:italic 400 26px/1 Didot,serif"><i style="width:6px;height:6px;background:' + OR + ';transform:rotate(45deg)"></i>' + esc(txt) + '</span></div>' },
        sons: t0 => [{ t: t0, fam: 'clic', vol: 0.05 }] }
    }
    if (E.type === 'compteurs') {
      const items = (E.items || []).slice(0, 5).map(x => typeof x === 'object' ? x : { n: String(x) }).filter(x => x.n); if (!items.length) return null
      const pas = 0.32, W = 200, duree = E.duree ?? Math.max(3, items.length * pas + 2), x = cote === 'droite' ? 720 - W - 40 : 40
      return { hauteur: items.length * 64 + 10, anim: items.length * pas + 0.4, duree, place: cote,
        dessin: (dt, y) => items.map((it, j) => { if (dt < j * pas) return ''; const p = doux((dt - j * pas) / 0.3)
          return '<div style="position:absolute;left:' + x + 'px;top:' + (y + j * 64) + 'px;width:' + W + 'px;opacity:' + p.toFixed(2) + ';transform:translateX(' + ((1 - p) * (cote === 'droite' ? 20 : -20)).toFixed(1) + 'px);display:flex;align-items:baseline;justify-content:space-between;padding:12px 18px;box-sizing:border-box;border-radius:14px;background:rgba(30,20,14,.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)">'
            + caps(it.label || E.icone || 'vues') + '<span style="font:italic 400 32px/1 Didot,serif;color:#fff">' + esc(it.n) + '</span></div>' }).join(''),
        sons: t0 => items.map((_, j) => ({ t: t0 + j * pas, fam: 'clic', vol: 0.05 })) }
    }
  }

  if (E.type === 'filrouge') {
    const items = (E.items || []).slice(0, 6), k = Math.max(0, Math.min(items.length - 1, E.k || 0)); if (!items.length) return null
    const W = Math.round(E.largeur || 280), H = 96 + items.length * 46, duree = E.duree ?? 3.4
    // (07/11 soir) VALIDÉ par Aurélie (« beaucoup mieux ») : c'est le look PAR DÉFAUT ; "look": "carnet" redonne l'ancien bloc-notes.
    // LOOK MODERNE, dans l'esprit du luxe qu'Aurélie trouve « ultra moderne » mais à SES couleurs : verre dépoli
    // (le décor flouté DESSOUS par ffmpeg via « cadre », comme le luxe ; sans flou, le verre fumé reste lisible), barre en segments
    // façon stories, la liste à cocher gardée (« c'était bien aussi ») : pastilles rondes qui se remplissent, l'étape en cours sort du flou.
    if (E.look !== 'carnet') { const n = items.length, Wm = E.sous ? 320 : Math.round(clamp(E.largeur || 300, 220, 300)), Hm = 92 + n * 52, fsM = Math.max(18, Math.min(26, Math.floor((Wm - 84) / (0.7 * Math.max(...items.map(x => String(x).length)))))), xm = E.sous ? 360 - Wm / 2 : cote === 'droite' ? 720 - Wm - 34 : 34
      return { hauteur: Hm, anim: 1.5, duree, place: E.sous ? undefined : cote, cadre: y => ({ x: xm, y, l: Wm, h: Hm, r: 26 }),
        dessin: (dt, y) => { const p = clamp(rebond(dt / 0.4), 0, 1.04), apparait = doux(dt / 0.3), rev = doux(clamp((dt - 0.4) / 0.5, 0, 1)), rempli = doux(clamp((dt - 0.35) / 0.9, 0, 1)), coche = clamp(rebond((dt - 1.15) / 0.3), 0, 1.1)
          const seg = items.map((_, j) => '<div style="flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.25);overflow:hidden"><div style="height:100%;width:' + (j < k ? 100 : j === k ? (100 * rempli).toFixed(1) : 0) + '%;background:' + accent + ';border-radius:3px"></div></div>').join('')
          const rond = (fait, z) => '<span style="flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;' + (fait ? 'background:' + accent + ';box-shadow:0 0 14px ' + accent + '88' : 'box-shadow:inset 0 0 0 2px rgba(255,255,255,.75)') + ';transform:scale(' + z.toFixed(3) + ')">' + (fait ? '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') + '</span>'
          return '<div style="position:absolute;left:' + xm + 'px;top:' + y + 'px;width:' + Wm + 'px;height:' + Hm + 'px;box-sizing:border-box;padding:20px 22px;border-radius:26px;background:linear-gradient(155deg,rgba(255,255,255,.20),rgba(255,255,255,.05) 45%,rgba(0,0,0,.10)),rgba(22,22,28,.40);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 0 0 1px rgba(255,255,255,.22),0 20px 44px rgba(0,0,0,.25);color:#fff;opacity:' + apparait.toFixed(2) + ';transform:translateY(' + ((1 - Math.min(1, p)) * 40).toFixed(1) + 'px) scale(' + (0.94 + 0.06 * p).toFixed(3) + ')">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;font:600 13px/1 Poppins,sans-serif;letter-spacing:.18em"><span>' + esc((E.titre || 'ma liste').toUpperCase()) + '</span><span style="color:#fff;background:' + accent + ';border-radius:999px;padding:5px 9px;letter-spacing:.04em">' + (k + 1) + '/' + n + '</span></div>'
            + '<div style="display:flex;gap:5px;margin:14px 0 8px">' + seg + '</div>'
            + items.map((it, j) => { const cours = j === k
              return '<div style="display:flex;align-items:center;gap:14px;height:52px;font:600 ' + fsM + 'px/1.1 Poppins,sans-serif;text-shadow:0 1px 8px rgba(0,0,0,.25);opacity:' + (j < k ? 0.62 : cours ? rev : 0.5).toFixed(2) + (cours ? ';transform:translateY(' + ((1 - rev) * 14).toFixed(1) + 'px);filter:blur(' + ((1 - rev) * 6).toFixed(1) + 'px)' : '') + '">'
                + rond(j < k || (cours && coche > 0), j < k ? 1 : cours && coche > 0 ? 0.6 + 0.4 * coche : 1) + '<span style="min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' + (j < k ? ';text-decoration:line-through;text-decoration-color:rgba(255,255,255,.5)' : '') + '">' + esc(it) + '</span></div>' }).join('') + '</div>' },
        sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.05 }, { t: t0 + 1.15, fam: 'pop', vol: 0.08 }] }
    }
    return { hauteur: H, anim: 1.4, duree, place: cote,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.35), 0, 1.06), x = cote === 'droite' ? 720 - W - 34 : 34
        const ligne = (txt, j) => { const fait = j < k, cours = j === k, ec = cours ? clamp((dt - 0.45) / 0.7, 0, 1) : 1, coche = fait ? 1 : cours ? clamp((dt - 1.25) / 0.25, 0, 1) : 0
          const vu = j <= k, t2 = vu ? txt.slice(0, Math.ceil(txt.length * ec)) : ''
          return '<div style="display:flex;align-items:center;gap:10px;height:46px;border-bottom:1.5px solid rgba(70,110,190,.28)">'
            + '<span style="position:relative;flex:none;width:24px;height:24px;border:2.5px solid #3b3b40;border-radius:5px;background:#fff">'
            + (coche ? '<svg viewBox="0 0 24 24" width="30" height="30" style="position:absolute;left:-2px;top:-8px;overflow:visible"><path d="M4 13 L10 19 L22 3" fill="none" stroke="' + accent + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="40" stroke-dashoffset="' + (40 * (1 - coche)).toFixed(1) + '"/></svg>' : '') + '</span>'
            + '<span style="font:700 23px/1.1 Annot,cursive;color:#26262b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(t2) + '</span></div>' }
        const badge = clamp(rebond((dt - 0.2) / 0.3), 0, 1.1)
        return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + W + 'px;transform:translateY(' + ((1 - Math.min(1, p)) * 60).toFixed(1) + 'px) rotate(' + (cote === 'droite' ? 3 : -3) + 'deg);opacity:' + Math.min(1, p).toFixed(2) + '">'
          + '<div style="position:absolute;left:14px;right:-10px;top:-12px;height:40px;background:#FFE680;transform:rotate(-2deg);' + OMBRE + '"></div>'
          + '<div style="position:relative;background:#FFFDF6;' + OMBRE + ';padding:14px 18px 14px 26px;border-left:3px solid rgba(220,80,80,.35)">'
          + '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font:800 15px/1 Poppins,sans-serif;letter-spacing:.12em;color:' + accent + '">' + esc((E.titre || 'ma liste').toUpperCase()) + '</span><span style="width:16px;height:16px;border-radius:50%;background:#d6d6db"></span></div>'
          + items.map(ligne).join('') + '</div>'
          + '<div style="position:absolute;' + (cote === 'droite' ? 'left:-58px' : 'right:-58px') + ';top:-34px">' + etoile(k + 1, accent, 84, badge) + '</div></div>' },
      sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.05 }, { t: t0 + 0.2, fam: 'pop', vol: 0.1 }, { t: t0 + 0.45, fam: 'clavier', vol: 0.05, duree: 0.7 }, { t: t0 + 1.25, fam: 'clic', vol: 0.08 }] }
  }

  if (E.type === 'compteurs') {
    const items = (E.items || []).slice(0, 5).map(x => typeof x === 'object' ? x : { n: String(x) }).filter(x => x.n); if (!items.length) return null
    const ico = { vues: '<path d="M2 12 C 6 5, 18 5, 22 12 C 18 19, 6 19, 2 12 Z" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="12" r="3.4" fill="#fff"/>',
      abonnes: '<circle cx="12" cy="8" r="4" fill="#fff"/><path d="M4 21 C 4 15, 20 15, 20 21 Z" fill="#fff"/>',
      coeur: '<path d="M12 21 C 4 14, 2 10, 5 6.5 C 8 3.5, 11 5, 12 7 C 13 5, 16 3.5, 19 6.5 C 22 10, 20 14, 12 21 Z" fill="#fff"/>' }[E.icone || 'vues']
    const pas = 0.32, W = 190, H = items.length * 66 + 20, duree = E.duree ?? Math.max(3, items.length * pas + 2)
    return { hauteur: H, anim: items.length * pas + 0.4, duree, place: cote,
      dessin: (dt, y) => { const x = cote === 'droite' ? 720 - W - 40 : 40
        return items.map((it, j) => { if (dt < j * pas) return ''; const p = clamp(rebond((dt - j * pas) / 0.25), 0, 1.1)
          return '<div style="position:absolute;left:' + (x + [0, 22, 6, 28, 12][j]) + 'px;top:' + (y + j * 66) + 'px;transform:scale(' + p.toFixed(3) + ') rotate(' + [-3, 2, -1, 3, -2][j] + 'deg);display:flex;align-items:center;gap:12px;padding:10px 18px;border-radius:14px;background:rgba(28,26,30,.86);border:2px solid rgba(255,255,255,.85);' + OMBRE + '">'
            + '<svg viewBox="0 0 24 24" width="30" height="30">' + ico + '</svg><span style="font:800 30px/1 Poppins,sans-serif;color:#fff">' + esc(it.n) + '</span>'
            + (it.label ? '<span style="font:600 16px/1 Poppins,sans-serif;color:rgba(255,255,255,.75)">' + esc(it.label) + '</span>' : '') + '</div>' }).join('') },
      sons: t0 => items.map((_, j) => ({ t: t0 + j * pas, fam: 'pop', vol: 0.08 })) }
  }

  if (E.type === 'graphique') {
    const pts = (E.points || []).map(Number).filter(v => isFinite(v)); if (pts.length < 2) return null
    const W = 520, H = 300, gx = 40, gy = 70, gw = W - 80, gh = H - 120, mn = Math.min(...pts), mx = Math.max(...pts), r = mx - mn || 1
    const P = pts.map((v, i) => [gx + gw * i / (pts.length - 1), gy + gh - gh * (v - mn) / r])
    const longueur = P.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - P[i][0], q[1] - P[i][1]), 0)
    const fin = E.valeur || String(pts.at(-1)), duree = E.duree ?? 3.6
    return { hauteur: H, anim: 2, duree,
      dessin: (dt, y) => { const p = doux(dt / 0.3), tr = clamp((dt - 0.35) / 1.2, 0, 1), b = clamp(rebond((dt - 1.55) / 0.3), 0, 1.1), last = P.at(-1)
        return '<div style="position:absolute;left:' + (360 - W / 2) + 'px;top:' + y + 'px;width:' + W + 'px;height:' + H + 'px;border-radius:18px;background:#fff;' + OMBRE + ';opacity:' + p.toFixed(2) + ';transform:translateY(' + ((1 - p) * 30).toFixed(1) + 'px)">'
          + '<div style="position:absolute;left:26px;top:20px;font:800 22px/1 Poppins,sans-serif;color:#1b1b1f">' + esc(E.titre || '') + '</div>'
          + '<svg width="' + W + '" height="' + H + '" style="position:absolute;inset:0;overflow:visible">'
          + [0, 1, 2].map(i => '<line x1="' + gx + '" x2="' + (gx + gw) + '" y1="' + (gy + gh * i / 2) + '" y2="' + (gy + gh * i / 2) + '" stroke="#ececf0" stroke-width="2"/>').join('')
          + '<polyline points="' + P.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ') + '" fill="none" stroke="' + accent + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + longueur.toFixed(1) + '" stroke-dashoffset="' + (longueur * (1 - tr)).toFixed(1) + '"/>'
          + (b > 0 ? '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="' + (9 * Math.min(1, b)).toFixed(1) + '" fill="' + accent + '" stroke="#fff" stroke-width="3"/>' : '') + '</svg>'
          + (b > 0 ? '<div style="position:absolute;left:' + Math.round(last[0] - 70) + 'px;top:' + Math.round(last[1] - 74) + 'px;width:140px;text-align:center;transform:scale(' + b.toFixed(3) + ')"><span style="display:inline-block;padding:8px 14px;border-radius:12px;background:#1b1b1f;color:#fff;font:800 24px/1 Poppins,sans-serif">' + esc(fin) + '</span></div>' : '')
          + (E.legende ? '<div style="position:absolute;left:26px;bottom:16px;font:600 16px/1 Poppins,sans-serif;color:#8a8a92">' + esc(E.legende) + '</div>' : '') + '</div>' },
      sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.05 }, { t: t0 + 1.55, fam: 'pop', vol: 0.1 }] }
  }

  // la grille-formule : des étiquettes à gauche (sujet, angle, format, hook…), SES mots qui s'écrivent case par case
  if (E.type === 'grille') {
    const lignes = (E.lignes || []).slice(0, 5).map(l => Array.isArray(l) ? { nom: l[0], texte: l[1] } : l).filter(l => l && l.nom); if (!lignes.length) return null
    const pas = E.pas || 0.7, H = 70 + lignes.length * 86, duree = E.duree ?? Math.max(3.5, 0.4 + lignes.length * pas + 1.6)
    const tons = ['#F7C6D9', '#CFE3F7', '#F9E3B0', '#D5EDC9', '#E3D4F5']
    return { hauteur: H, anim: 0.4 + lignes.length * pas, duree,
      dessin: (dt, y) => { const p = doux(dt / 0.3)
        return '<div style="position:absolute;left:60px;width:600px;top:' + y + 'px;opacity:' + p.toFixed(2) + ';transform:translateY(' + ((1 - p) * 24).toFixed(1) + 'px)">'
          + (E.titre ? '<div style="font:800 26px/1 Poppins,sans-serif;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5);margin-bottom:16px;text-align:center">' + esc(E.titre) + '</div>' : '')
          + lignes.map((l, j) => { const u = dt - 0.35 - j * pas, q = clamp(u / 0.5, 0, 1), txt = String(l.texte || ''), vu = txt.slice(0, Math.ceil(txt.length * q))
            return '<div style="display:flex;gap:14px;align-items:stretch;height:72px;margin-bottom:14px">'
              + '<div style="flex:none;width:150px;display:grid;place-items:center;border-radius:12px;background:' + tons[j] + ';font:800 22px/1 Poppins,sans-serif;color:#2b2b2e;box-shadow:0 6px 14px rgba(0,0,0,.2)">' + esc(l.nom) + '</div>'
              + '<div style="flex:1;min-width:0;display:flex;align-items:center;padding:0 18px;border-radius:12px;background:rgba(255,255,255,.94);border:2px solid #fff;box-shadow:0 6px 14px rgba(0,0,0,.2);font:600 21px/1.2 Poppins,sans-serif;color:#1b1b1f">' + esc(vu) + '</div></div>' }).join('') + '</div>' },
      sons: t0 => lignes.map((_, j) => ({ t: t0 + 0.35 + j * pas, fam: 'clavier', vol: 0.05, duree: 0.45 })) }
  }

  // la feuille lignée : un bandeau à sa couleur en haut, SES exemples qui s'écrivent à la main, ligne après ligne
  if (E.type === 'feuille') {
    const lignes = (E.lignes || []).slice(0, 6).map(String).filter(Boolean); if (!lignes.length) return null
    const pas = E.pas || 0.8, H = 110 + lignes.length * 48, duree = E.duree ?? Math.max(3.5, 0.4 + lignes.length * pas + 1.5)
    return { hauteur: H, anim: 0.4 + lignes.length * pas, duree,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.35), 0, 1.05)
        return '<div style="position:absolute;left:90px;width:540px;top:' + y + 'px;transform:rotate(-2deg) translateY(' + ((1 - Math.min(1, p)) * 50).toFixed(1) + 'px);opacity:' + Math.min(1, p).toFixed(2) + '">'
          + '<div style="position:relative;background:#FFFDF4;background-image:repeating-linear-gradient(transparent 0 46px,rgba(80,120,200,.3) 46px 48px);background-position:0 62px;padding:16px 28px 22px 64px;' + OMBRE + ';clip-path:polygon(0 1%,4% 0,9% 1.2%,15% 0,22% 1%,30% 0,38% 1.3%,46% 0,55% 1%,63% 0,71% 1.2%,80% 0,88% 1%,95% 0,100% 1%,100% 100%,0 100%)">'
          + '<div style="position:absolute;left:44px;top:0;bottom:0;width:2px;background:rgba(220,80,80,.45)"></div>'
          + (E.titre ? '<div style="display:inline-block;margin:6px 0 10px -30px;padding:7px 16px;background:' + accent + ';color:#fff;font:800 19px/1 Poppins,sans-serif">' + esc(E.titre) + '</div>' : '<div style="height:20px"></div>')
          + lignes.map((l, j) => { const q = clamp((dt - 0.4 - j * pas) / 0.6, 0, 1)
            return '<div style="height:48px;font:700 27px/48px Annot,cursive;color:#2b2b2e;clip-path:inset(-10% ' + ((1 - q) * 100).toFixed(1) + '% -10% 0)">' + esc(l) + '</div>' }).join('') + '</div></div>' },
      sons: t0 => lignes.map((_, j) => ({ t: t0 + 0.4 + j * pas, fam: 'stylo', vol: 0.06, duree: Math.max(0.4, pas * 0.85) })) }
  }

  // la vidéo dans la vidéo : SON extrait (une autre prise, une B-roll, un reel qu'elle a le droit de montrer) tourne
  // dans un cadre blanc penché, du côté libre ; images préparées par collage.mjs (E._images, 15 par seconde), sans le son
  if (E.type === 'extrait') {
    const ims = E._images || []; if (!ims.length) return null
    const W = Math.round(E.largeur || 270), R = E.ratio || 16 / 9, H = Math.round(W * R), duree = E.duree ?? Math.min(6, ims.length / 15), cache = new Map()
    const img = k => { k = Math.max(0, Math.min(ims.length - 1, k)); if (!cache.has(k)) { cache.clear(); cache.set(k, image(ims[k])) } return cache.get(k) }
    return { hauteur: H + (E.etiquette ? 56 : 0), anim: duree, duree, place: cote,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.35), 0, 1.05), x = cote === 'droite' ? 720 - W - 36 : 36, src = img(Math.floor(dt * 15)), q = clamp((dt - 0.5) / 0.3, 0, 1)
        return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + W + 'px;transform:scale(' + p.toFixed(3) + ') rotate(' + (cote === 'droite' ? 4 : -4) + 'deg);opacity:' + Math.min(1, p).toFixed(2) + '">'
          + '<div style="width:' + W + 'px;height:' + H + 'px;box-sizing:border-box;border:7px solid #fff;border-radius:10px;background:#111 url(' + src + ') center/cover;' + OMBRE + '"></div>'
          + (E.etiquette ? '<div style="margin:12px auto 0;width:max-content;max-width:' + (W + 60) + 'px;padding:8px 14px;background:#fff;color:#1b1b1f;font:700 20px/1.15 Poppins,sans-serif;border-radius:8px;transform:rotate(-3deg);opacity:' + q.toFixed(2) + ';' + OMBRE + '">' + esc(E.etiquette) + '</div>' : '') + '</div>' },
      sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.07 }] }
  }

  // ── LES EFFETS « INTERFACE » (06/11 : techniques reprises, dessin à nous) ──
  const pill = (txt, fond, coul, z = 22) => '<span style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:' + fond + ';color:' + coul + ';font:700 ' + z + 'px/1 Poppins,sans-serif;' + OMBRE + '">' + txt + '</span>'
  const curseur = (x, y, clic) => '<svg width="34" height="40" viewBox="0 0 34 40" style="position:absolute;left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;transform:scale(' + (clic ? 0.86 : 1) + ');filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))"><path d="M3 2 L3 31 L11 24 L16 36 L22 33 L17 22 L28 22 Z" fill="#fff" stroke="#111" stroke-width="2.4" stroke-linejoin="round"/></svg>'

  // la boîte de dialogue de téléphone : une question et deux boutons, le curseur vient cliquer celui qu'elle choisit
  if (E.type === 'dialogue') {
    const q = String(E.question || '').trim(); if (!q) return null
    const non = E.non || 'Annuler', oui = E.oui || 'OK', clicOui = E.clic !== 'non', duree = E.duree ?? 3
    return { hauteur: 230, anim: 2, duree,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.3), 0, 1.06), c = clamp((dt - 0.6) / 0.7, 0, 1), cl = dt > 1.35 && dt < 1.55
        const bx = clicOui ? 470 : 250, cx = 600 + (bx - 600) * doux(c), cy = y + 300 + (y + 170 - (y + 300)) * doux(c)
        return '<div style="position:absolute;left:110px;width:500px;top:' + y + 'px;transform:scale(' + p.toFixed(3) + ');opacity:' + Math.min(1, p).toFixed(2) + ';border-radius:26px;background:rgba(245,245,247,.97);' + OMBRE + ';overflow:hidden;text-align:center">'
          + '<div style="padding:24px 26px 18px"><div style="font:700 25px/1.2 Poppins,sans-serif;color:#111">' + esc(q) + '</div>' + (E.detail ? '<div style="margin-top:8px;font:500 18px/1.3 Poppins,sans-serif;color:#6b6b70">' + esc(E.detail) + '</div>' : '') + '</div>'
          + '<div style="display:flex;border-top:1.5px solid #d8d8dc"><div style="flex:1;padding:16px;font:600 22px/1 Poppins,sans-serif;color:#0A64D8;border-right:1.5px solid #d8d8dc;background:' + (cl && !clicOui ? '#e2e2e6' : 'transparent') + '">' + esc(non) + '</div>'
          + '<div style="flex:1;padding:16px;font:700 22px/1 Poppins,sans-serif;color:' + (E.danger ? '#E0352B' : '#0A64D8') + ';background:' + (cl && clicOui ? '#e2e2e6' : 'transparent') + '">' + esc(oui) + '</div></div></div>'
          + (dt > 0.5 ? curseur(cx, cy, cl) : '') },
      sons: t0 => [{ t: t0, fam: 'pop', vol: 0.07 }, { t: t0 + 1.35, fam: 'clic', vol: 0.12 }] }
  }

  // les étiquettes reliées par un trait à ce qu'elles désignent autour d'elle (l'« anatomie » de sa vidéo)
  if (E.type === 'anatomie') {
    const items = (E.items || []).slice(0, 8).map(x => typeof x === 'string' ? { texte: x } : x).filter(x => x.texte); if (!items.length) return null
    const pas = 0.18, duree = E.duree ?? Math.max(3, 0.4 + items.length * pas + 1.8)
    const places = [[60, 120, 260, 260], [470, 110, 430, 250], [40, 330, 250, 380], [490, 340, 440, 390], [60, 560, 260, 520], [480, 580, 440, 530], [70, 760, 270, 700], [470, 770, 440, 710]]
    return { hauteur: 0, anim: 0.4 + items.length * pas, duree, plein: true,
      dessin: dt => items.map((it, j) => { const u = dt - 0.2 - j * pas; if (u < 0) return ''
        const [x, y, px, py] = it.x != null ? [it.x * 720, it.y * 1280, it.px * 720, it.py * 1280] : places[j], p = clamp(rebond(u / 0.25), 0, 1.08), tr = clamp((u - 0.1) / 0.3, 0, 1)
        return '<svg width="720" height="1280" style="position:absolute;inset:0;overflow:visible"><line x1="' + (x + 60) + '" y1="' + (y + 22) + '" x2="' + (x + 60 + (px - x - 60) * tr).toFixed(1) + '" y2="' + (y + 22 + (py - y - 22) * tr).toFixed(1) + '" stroke="#fff" stroke-width="2.5" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))"/>' + (tr >= 1 ? '<circle cx="' + px + '" cy="' + py + '" r="6" fill="#fff" stroke="' + accent + '" stroke-width="3"/>' : '') + '</svg>'
          + '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;transform:scale(' + p.toFixed(3) + ');transform-origin:left center">' + pill(esc(it.texte.toUpperCase()), '#fff', '#111', 17) + '</div>' }).join(''),
      sons: t0 => items.map((_, j) => ({ t: t0 + 0.2 + j * pas, fam: 'clic', vol: 0.06 })) }
  }

  // la fenêtre d'ordinateur : un titre, et SA phrase qui se tape (une consigne, une note, un message)
  if (E.type === 'fenetre') {
    const txt = String(E.texte || '').trim(); if (!txt) return null
    const vit = E.vitesse || 22, duree = E.duree ?? Math.max(3, 0.5 + txt.length / vit + 1.3)
    return { hauteur: 230, anim: 0.5 + txt.length / vit, duree,
      dessin: (dt, y) => { const p = doux(dt / 0.3), n = Math.floor(clamp((dt - 0.45) * vit, 0, txt.length)), cl = Math.floor(dt * 2.4) % 2
        return '<div style="position:absolute;left:80px;width:560px;top:' + y + 'px;opacity:' + p.toFixed(2) + ';transform:translateY(' + ((1 - p) * 30).toFixed(1) + 'px);border-radius:16px;background:#FBFAF7;' + OMBRE + ';overflow:hidden">'
          + '<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:#EFEDE8;border-bottom:1px solid #e0ddd6"><i style="width:13px;height:13px;border-radius:50%;background:#FF5F57"></i><i style="width:13px;height:13px;border-radius:50%;background:#FEBC2E"></i><i style="width:13px;height:13px;border-radius:50%;background:#28C840"></i><span style="margin-left:10px;font:600 16px/1 Poppins,sans-serif;color:#6b6b70">' + esc(E.titre || 'Mes notes') + '</span></div>'
          + '<div style="padding:22px 24px 26px;min-height:120px;font:500 23px/1.4 Mono,monospace;color:#1b1b1f">' + esc(txt.slice(0, n)) + '<span style="opacity:' + cl + '">▍</span></div>'
          + (E.bouton ? '<div style="position:absolute;right:18px;bottom:16px;width:40px;height:40px;border-radius:12px;background:' + accent + ';display:grid;place-items:center;color:#fff;font:800 22px/1 Poppins">↑</div>' : '') + '</div>' },
      sons: t0 => [{ t: t0 + 0.45, fam: 'clavier', vol: 0.07, duree: Math.min(3, txt.length / vit) }] }
  }

  // la barre de progression : « montage en cours… » qui se remplit, puis une coche
  if (E.type === 'progression') {
    const duree = E.duree ?? 2.6
    return { hauteur: 90, anim: duree, duree, place: cote,
      dessin: (dt, y) => { const p = doux(dt / 0.25), r = clamp((dt - 0.3) / Math.max(0.8, duree - 1), 0, 1), fini = r >= 1, x = cote === 'droite' ? 720 - 340 - 40 : 40
        return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:340px;opacity:' + p.toFixed(2) + ';padding:14px 18px;border-radius:14px;background:rgba(255,255,255,.96);' + OMBRE + '">'
          + '<div style="display:flex;justify-content:space-between;font:800 15px/1 Poppins,sans-serif;letter-spacing:.08em;color:#1b1b1f;margin-bottom:10px"><span>' + esc((fini ? (E.fin || 'terminé ✓') : (E.texte || 'montage en cours…')).toUpperCase()) + '</span><span style="color:' + accent + '">' + Math.round(r * 100) + ' %</span></div>'
          + '<div style="height:10px;border-radius:5px;background:#ececf0;overflow:hidden"><div style="height:100%;width:' + (r * 100).toFixed(1) + '%;background:' + accent + '"></div></div></div>' },
      sons: t0 => [{ t: t0 + duree - 0.7, fam: 'pop', vol: 0.09 }] }
  }

  // l'horloge : les aiguilles tournent vite, la lune se lève (« je suis partie en soirée et quand je suis revenue… »)
  if (E.type === 'horloge') {
    const duree = E.duree ?? 2.4
    return { hauteur: 150, anim: duree, duree, place: cote,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.3), 0, 1.06), a = dt * 720, h = dt * 60, x = cote === 'droite' ? 720 - 190 : 60, l = doux((dt - 0.4) / 0.6)
        return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:130px;height:130px;transform:scale(' + p.toFixed(3) + ')">'
          + '<div style="position:absolute;inset:0;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 5px #1b1b1f,0 10px 22px rgba(0,0,0,.3)"></div>'
          + [0, 1, 2, 3].map(k => '<i style="position:absolute;left:63px;top:10px;width:4px;height:12px;background:#1b1b1f;transform-origin:2px 55px;transform:rotate(' + k * 90 + 'deg)"></i>').join('')
          + '<i style="position:absolute;left:62px;top:28px;width:6px;height:38px;border-radius:3px;background:#1b1b1f;transform-origin:3px 37px;transform:rotate(' + h.toFixed(1) + 'deg)"></i>'
          + '<i style="position:absolute;left:63px;top:16px;width:4px;height:50px;border-radius:2px;background:' + accent + ';transform-origin:2px 49px;transform:rotate(' + a.toFixed(1) + 'deg)"></i>'
          + '<i style="position:absolute;left:58px;top:58px;width:14px;height:14px;border-radius:50%;background:#1b1b1f"></i>'
          + '<svg width="56" height="56" viewBox="0 0 24 24" style="position:absolute;right:-30px;top:' + (-10 - 20 * l).toFixed(1) + 'px;opacity:' + l.toFixed(2) + '"><path d="M20 15.5 A9 9 0 1 1 9.5 3 A7 7 0 0 0 20 15.5 Z" fill="#FFE08A" stroke="#1b1b1f" stroke-width="1.2"/></svg></div>' },
      sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.06 }] }
  }

  // l'étiquette de prix (SES vrais chiffres) : un ticket qui se balance
  if (E.type === 'prix') {
    const m = String(E.montant || '').trim(); if (!m) return null
    const duree = E.duree ?? 2.6
    return { hauteur: 170, anim: 1, duree, place: cote,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.3), 0, 1.08), sw = Math.sin(dt * 6) * 8 * Math.exp(-dt * 1.6), x = cote === 'droite' ? 720 - 220 : 60, barre = E.barre ? clamp((dt - 0.7) / 0.3, 0, 1) : 0
        return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:160px;transform-origin:80px 0;transform:rotate(' + sw.toFixed(1) + 'deg) scale(' + p.toFixed(3) + ')">'
          + '<div style="margin:0 auto;width:2px;height:26px;background:#8a7a60"></div>'
          + '<div style="position:relative;padding:18px 10px 14px;text-align:center;background:#FBF7EE;clip-path:polygon(20% 0,80% 0,100% 18%,100% 100%,0 100%,0 18%);' + OMBRE + '">'
          + '<div style="width:14px;height:14px;border-radius:50%;margin:-6px auto 6px;box-shadow:inset 0 0 0 3px #8a7a60"></div>'
          + (E.petit ? '<div style="font:700 13px/1 Poppins,sans-serif;letter-spacing:.14em;color:#6b6b70">' + esc(E.petit.toUpperCase()) + '</div>' : '')
          + '<div style="position:relative;display:inline-block;font:900 34px/1.1 Rond,Poppins,sans-serif;color:#1b1b1f">' + esc(m) + (barre ? '<i style="position:absolute;left:-4px;top:52%;height:4px;width:' + (barre * 108).toFixed(0) + '%;background:#E0352B;transform:rotate(-8deg)"></i>' : '') + '</div>'
          + (E.dessous ? '<div style="font:700 14px/1 Poppins,sans-serif;color:' + accent + '">' + esc(E.dessous) + '</div>' : '') + '</div></div>' },
      sons: t0 => [{ t: t0, fam: 'pop', vol: 0.08 }, ...(E.barre ? [{ t: t0 + 0.7, fam: 'clic', vol: 0.08 }] : [])] }
  }

  // les pastilles : SES petits mots du moment (« super simple », « franchement, c'est stylé ») en capsule blanche
  if (E.type === 'pastille') {
    const txt = String(E.texte || '').trim(); if (!txt) return null
    const duree = E.duree ?? 1.8
    return { hauteur: 60, anim: 0.4, duree,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.25), 0, 1.1)
        return '<div style="position:absolute;left:0;right:0;top:' + y + 'px;text-align:center;transform:scale(' + p.toFixed(3) + ')">' + pill(esc(txt) + (E.emoji ? ' ' + esc(E.emoji) : ''), '#fff', '#111', 24) + '</div>' },
      sons: t0 => [{ t: t0, fam: 'pop', vol: 0.07 }] }
  }

  // les touches du clavier qui s'enfoncent (⌘ V, copier-coller, entrée)
  if (E.type === 'touches') {
    const k = (E.touches || ['⌘', 'V']).slice(0, 4), duree = E.duree ?? 1.8
    return { hauteur: 110, anim: 1, duree,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.25), 0, 1.06)
        return '<div style="position:absolute;left:0;right:0;top:' + y + 'px;display:flex;justify-content:center;gap:16px;transform:scale(' + p.toFixed(3) + ')">'
          + k.map((t, j) => { const enf = dt > 0.45 + j * 0.15 && dt < 0.75 + j * 0.15 + (j === k.length - 1 ? 0.1 : 0.4)
            return '<div style="width:88px;height:88px;border-radius:18px;background:linear-gradient(#ffffff,#e6e6ea);box-shadow:0 ' + (enf ? 2 : 8) + 'px 0 #b9b9c0,0 12px 22px rgba(0,0,0,.3);transform:translateY(' + (enf ? 6 : 0) + 'px);display:grid;place-items:center;font:800 38px/1 Poppins,sans-serif;color:#1b1b1f">' + esc(t) + '</div>' }).join('') + '</div>' },
      sons: t0 => k.map((_, j) => ({ t: t0 + 0.45 + j * 0.15, fam: 'clic', vol: 0.1 })) }
  }

  // la timeline : un panneau de logiciel de montage, pistes de couleur et forme d'onde, la tête de lecture avance
  if (E.type === 'timeline') {
    const duree = E.duree ?? 2.8
    return { hauteur: 260, anim: duree, duree,
      dessin: (dt, y) => { const p = doux(dt / 0.3), tete = 40 + 520 * clamp((dt - 0.3) / (duree - 0.6), 0, 1)
        const onde = Array.from({ length: 70 }, (_, i) => { const h = 6 + Math.abs(Math.sin(i * 1.7) * 26 + Math.sin(i * 0.43) * 14); return '<i style="position:absolute;left:' + (20 + i * 8) + 'px;bottom:' + (36 - h / 2) + 'px;width:4px;height:' + h.toFixed(0) + 'px;border-radius:2px;background:#4FD18B"></i>' }).join('')
        return '<div style="position:absolute;left:60px;width:600px;top:' + y + 'px;height:250px;border-radius:16px;background:#1C1C20;' + OMBRE + ';opacity:' + p.toFixed(2) + ';overflow:hidden">'
          + (E.titre ? '<div style="padding:14px 18px;font:800 15px/1 Poppins,sans-serif;letter-spacing:.1em;color:#e8e8ec">● ' + esc(E.titre.toUpperCase()) + '</div>' : '<div style="height:20px"></div>')
          + [['#5B7CFA', [0, 120, 260, 420]], ['#F2A541', [60, 300]], ['#2FB67A', [0, 200, 380]]].map(([c, xs], r) => xs.map((x, i) => '<i style="position:absolute;left:' + (20 + x) + 'px;top:' + (54 + r * 42) + 'px;width:' + (i === xs.length - 1 ? 560 - x - 20 : xs[i + 1] - x - 6) + 'px;height:32px;border-radius:6px;background:' + c + ';opacity:.9"></i>').join('')).join('')
          + '<div style="position:absolute;left:0;right:0;bottom:0;height:72px">' + onde + '</div>'
          + '<i style="position:absolute;left:' + tete.toFixed(1) + 'px;top:44px;bottom:0;width:3px;background:#FF4D4D"></i></div>' },
      sons: t0 => [] }
  }

  // le trait doré qui se dessine en courbe (souligne, relie)
  if (E.type === 'trait') {
    const duree = E.duree ?? 1.8, coul = E.couleur || '#D9B45A'
    return { hauteur: 0, anim: 0.8, duree, plein: true,
      dessin: dt => { const p = clamp(dt / 0.7, 0, 1), L = 900
        return '<svg width="720" height="1280" style="position:absolute;inset:0;overflow:visible"><path d="' + (E.chemin || 'M 40 980 C 220 900, 420 820, 690 560') + '" fill="none" stroke="' + coul + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + L + '" stroke-dashoffset="' + (L * (1 - doux(p))).toFixed(1) + '" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))"/></svg>' },
      sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.05 }] }
  }

  // les 4 téléphones : SA vidéo en 4 looks (préparés par collage.mjs : E._images = une image d'elle à ce moment-là)
  if (E.type === 'ecrans') {
    const src = (E._images || [])[0] && image(E._images[0]); if (!src) return null
    const looks = (E.looks || [['éditorial', 'contrast(1.12) saturate(.85)'], ['noir & blanc', 'grayscale(1) contrast(1.15)'], ['rose', 'sepia(.25) saturate(1.3) hue-rotate(-18deg) brightness(1.06)'], ['épuré', 'brightness(1.12) saturate(.7)']]).slice(0, 4)
    const duree = E.duree ?? 3
    return { hauteur: 620, anim: 1.2, duree,
      dessin: (dt, y) => looks.map(([nom, f], j) => { const p = clamp(rebond((dt - j * 0.12) / 0.3), 0, 1.06); if (dt < j * 0.12) return ''
        const x = 70 + (j % 2) * 300, yy = y + Math.floor(j / 2) * 310
        return '<div style="position:absolute;left:' + x + 'px;top:' + yy + 'px;width:280px;height:296px;transform:scale(' + p.toFixed(3) + ')"><div style="position:absolute;left:50px;top:0;width:180px;height:296px;border-radius:28px;background:#111;padding:7px;box-sizing:border-box;' + OMBRE + '"><div style="width:100%;height:100%;border-radius:22px;background:url(' + src + ') center/cover;filter:' + f + '"></div></div>'
          + '<div style="position:absolute;left:0;right:0;bottom:14px;text-align:center">' + pill(esc(nom.toUpperCase()), '#fff', '#111', 14) + '</div></div>' }).join(''),
      sons: t0 => looks.map((_, j) => ({ t: t0 + j * 0.12, fam: 'pop', vol: 0.06 })) }
  }

  // l'écran coupé : la même image d'elle, en haut sans retouche (noir et blanc ou brute), en bas étalonnée
  if (E.type === 'etalonnage') {
    const src = (E._images || [])[0] && image(E._images[0]); if (!src) return null
    const duree = E.duree ?? 2.8
    return { hauteur: 560, anim: 1, duree,
      dessin: (dt, y) => [[E.avant || 'avant', E.filtreAvant || 'grayscale(1) contrast(.9) brightness(.92)'], [E.apres || 'après', 'contrast(1.08) saturate(1.12) brightness(1.04)']].map(([nom, f], j) => { const p = doux((dt - j * 0.35) / 0.3); if (p <= 0) return ''
        return '<div style="position:absolute;left:130px;top:' + (y + j * 285) + 'px;width:460px;height:270px;border-radius:16px;overflow:hidden;' + OMBRE + ';opacity:' + p.toFixed(2) + ';transform:translateX(' + ((1 - p) * (j ? 60 : -60)).toFixed(1) + 'px)"><div style="position:absolute;inset:0;background:url(' + src + ') center 30%/cover;filter:' + f + '"></div>'
          + '<div style="position:absolute;left:14px;top:14px">' + pill(esc(nom.toUpperCase()), '#fff', '#111', 15) + '</div></div>' }).join(''),
      sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.06 }, { t: t0 + 0.35, fam: 'whoosh', vol: 0.06 }] }
  }

  // ── SES photos en mouvement ──
  const carte = (src, w, h, extra, bord = 12, bas = 34) => '<div style="position:absolute;' + extra + ';width:' + w + 'px;height:' + h + 'px;background:#fff;padding:' + bord + 'px ' + bord + 'px ' + bas + 'px;box-sizing:border-box;' + OMBRE + '"><div style="width:100%;height:100%;background:url(' + src + ') center/cover"></div></div>'

  if (E.type === 'polaroids') {
    const ims = photos(); if (!ims.length) return null
    const AP0 = objet('polaroid-1000', 'appareil-instantane')
    const pas = AP0 ? 1.0 : 0.7, W = 300, H = AP0 ? 440 : 330, duree = E.duree ?? Math.max(3.2, 0.5 + ims.length * pas + 1.4)
    return { hauteur: H, anim: 0.5 + ims.length * pas, duree, place: cote,
      dessin: (dt, y) => { const x = cote === 'droite' ? 720 - W - 20 : 20, cam = doux(dt / 0.3), AP = AP0
        if (AP) {
          // (07/11) mesuré sur l'image polaroid-1000 : la fente est à 88,5 % de la hauteur, de 8,8 % à 92,8 % de la largeur.
          // Le tirage sort VRAIMENT de la fente : on ne le voit que sous la ligne de la fente, il glisse au rythme du moteur,
          // puis tombe et se pose à côté ; l'image se développe (gris-bleu → couleurs), l'appareil a un petit recul et un flash.
          const lA = 230, hA = Math.round(lA * AP.h / AP.l), xA = Math.round((W - lA) / 2), [fy, fa, fb] = (AP.mesures || {}).fente || [0.88, 0.1, 0.9], fente = Math.round(hA * fy)
          const lf = lA * (fb - fa), cw = Math.round(lf * 0.92), ch = Math.round(cw * 1.2), cx = xA + Math.round(lA * fa + (lf - cw) / 2)
          const EJ = 0.6, PO = 0.4
          let recul = 0, flash = 0
          const tirages = ims.map((src, j) => { const u = dt - 0.45 - j * pas
            if (u > -0.18 && u < 0.05) flash = Math.max(flash, 1 - Math.abs(u + 0.07) / 0.11)
            if (u > 0 && u < 0.16) recul = Math.max(recul, Math.sin(u / 0.16 * Math.PI))
            if (u < 0) return ''
            // le moteur : démarrage franc, petites saccades des rouleaux, fin qui ralentit
            const q = clamp(u / EJ, 0, 1), imp = clamp(1 - Math.pow(1 - q, 2.2) + 0.012 * Math.sin(q * 46) * (1 - q), 0, 1)
            const dev = clamp((u - 0.25) / 1.6, 0, 1), voile = '<div style="position:absolute;left:10px;top:10px;right:10px;bottom:40px;background:#2E3540;opacity:' + (0.92 * (1 - doux(dev))).toFixed(2) + '"></div>'
            const photo = (extra, ombre) => '<div style="position:absolute;' + extra + ';width:' + cw + 'px;height:' + ch + 'px;background:#fbfaf6;padding:10px 10px 40px;box-sizing:border-box;box-shadow:' + ombre + '"><div style="width:100%;height:100%;background:url(' + src + ') center/cover;filter:saturate(' + (0.3 + 0.7 * dev).toFixed(2) + ') contrast(' + (0.85 + 0.15 * dev).toFixed(2) + ')"></div>' + voile + '</div>'
            if (q < 1) // en train de sortir : masqué au-dessus de la fente, en avant de la lèvre de l'appareil
              return '<div style="position:absolute;left:0;top:' + fente + 'px;width:' + W + 'px;height:' + (H - fente + 60) + 'px;overflow:hidden">' + photo('left:' + cx + 'px;top:' + Math.round(-ch + imp * ch) + 'px', '0 4px 10px rgba(0,0,0,.25)') + '</div>'
            // sorti : il bascule, tombe un peu (gravité) et se pose de son côté, en pile
            const p = clamp((u - EJ) / PO, 0, 1), g = p * p, pose = doux(p), n = ims.length
            const dx = ((j % 2 ? -1 : 1) * 52 + (j - (n - 1) / 2) * 10) * pose, dy = (28 + j * 5) * g, rot = [-7, 6, -4, 8, -5][j] * pose + Math.sin(p * Math.PI) * (j % 2 ? -3 : 3)
            return photo('left:' + Math.round(cx + dx) + 'px;top:' + Math.round(fente + dy) + 'px;transform-origin:50% 0;transform:rotate(' + rot.toFixed(1) + 'deg)', '0 ' + Math.round(6 + 8 * pose) + 'px ' + Math.round(12 + 10 * pose) + 'px rgba(0,0,0,.3)') })
          // les tirages déjà posés passent derrière celui qui sort
          const sortants = tirages.filter(h => h.includes('overflow:hidden')), poses = tirages.filter(h => h && !h.includes('overflow:hidden'))
          const kP = clamp((E.largeur || W) / W, 0.55, 1) // (07/11) plan large : la place à côté de son visage est étroite, l'appareil se fait plus petit plutôt que de passer sur elle
          return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + W + 'px;height:' + H + 'px;opacity:' + cam.toFixed(2) + ';transform-origin:' + (cote === 'droite' ? '100%' : '0%') + ' 0;transform:translateY(' + ((1 - doux(dt / 0.35)) * -40).toFixed(1) + 'px) scale(' + kP.toFixed(3) + ')">'
            + '<div style="position:absolute;inset:0;transform:translateY(' + (-3 * recul).toFixed(1) + 'px) scale(' + (1 + 0.015 * recul).toFixed(3) + ');transform-origin:50% ' + fente + 'px">'
            + '<img src="' + AP.src + '" style="position:absolute;left:' + xA + 'px;top:0;width:' + lA + 'px;filter:drop-shadow(0 14px 22px rgba(0,0,0,.35))">'
            + (flash > 0 ? '<div style="position:absolute;left:' + Math.round(xA + lA * 0.81 - 60) + 'px;top:' + Math.round(hA * 0.15 - 60) + 'px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,250,235,.5) 35%,transparent 70%);opacity:' + flash.toFixed(2) + '"></div>' : '')
            + '</div>' + poses.join('') + sortants.join('') + '</div>' }
        const sortie = ims.map((src, j) => { const u = dt - 0.4 - j * pas; if (u < 0) return ''
          const imp = clamp(u / 0.35, 0, 1), pose = doux((u - 0.35) / 0.3), dx = (j % 2 ? -1 : 1) * 40 * pose + (j - (ims.length - 1) / 2) * 18 * pose, rot = [-6, 5, -3, 7, -5][j] * pose
          return carte(src, 150, 180, 'left:' + Math.round(75 + dx) + 'px;top:' + Math.round(88 + imp * 60 + pose * 40) + 'px;transform:rotate(' + rot.toFixed(1) + 'deg)') }).join('')
        return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + W + 'px;height:' + H + 'px;opacity:' + cam.toFixed(2) + '">' + sortie
          + '<div style="position:absolute;left:40px;top:0;width:220px;height:104px;border-radius:22px;background:linear-gradient(#fafafa,#e8e6e1);' + OMBRE + '">'
          + '<div style="position:absolute;left:78px;top:14px;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#6b7a8a,#111 60%);box-shadow:0 0 0 7px #2b2b2e"></div>'
          + '<div style="position:absolute;left:18px;top:16px;width:30px;height:20px;border-radius:5px;background:#2b2b2e"></div>'
          + '<div style="position:absolute;left:0;right:0;bottom:16px;height:8px;background:repeating-linear-gradient(90deg,#e74c3c 0 36px,#f39c12 36px 72px,#f1c40f 72px 108px,#27ae60 108px 144px,#2e86de 144px 180px,#8e44ad 180px 220px)"></div></div>'
          + '<div style="position:absolute;left:62px;top:92px;width:176px;height:10px;border-radius:5px;background:#1b1b1f"></div></div>' },
      sons: t0 => ims.map((_, j) => ({ t: t0 + 0.4 + j * pas, fam: 'tirage', vol: 0.09, duree: Math.max(0.6, pas) })) }
  }

  if (E.type === 'pluie') {
    const ims = photos(); if (!ims.length) return null
    const pas = objet('enveloppe-kraft-lettre') ? 0.4 : 0.28, duree = E.duree ?? Math.max(3.2, 0.6 + ims.length * pas + 1.8)
    // les places autour d'elle : en haut et sur les côtés, jamais au milieu (son visage)
    // les places possibles, en absolu ; on écarte toutes celles qui toucheraient son visage (E._visages : ses boîtes pendant l'effet)
    const toutes = [[30, 190, -9], [530, 210, 8], [40, 470, 6], [520, 500, -7], [150, 100, 4], [400, 90, -4], [30, 720, 5], [530, 740, -6], [280, 760, 3]]
    const touche = ([x, y]) => (E._visages || []).some(v => x < v[2] + 10 && x + 160 > v[0] - 10 && y < v[3] + 10 && y + 196 > v[1] - 10)
    const places = [...toutes.filter(p => !touche(p)), ...toutes.filter(touche)]
    return { hauteur: 470, anim: 0.6 + ims.length * pas, duree,
      dessin: (dt, y) => { const env = doux(dt / 0.25), ouvert = clamp((dt - 0.25) / 0.2, 0, 1)
        // (07/11) la VRAIE enveloppe kraft ouverte (l'ancienne « enveloppe-kraft » était en fait un vieil appareil photo) :
        // chaque photo sort de la poche (on ne la voit qu'au-dessus du V de la poche, mesuré au pixel), puis s'envole se poser
        const EL = objet('enveloppe-kraft-lettre', 'enveloppe-blanche')
        if (EL && EL.mesures?.bord) {
          const lE = 260, s = lE / EL.l, xE = cote === 'droite' ? 720 - lE - 30 : 30, yE = 90 - (1 - env) * 60
          const V = EL.mesures.bord, vMin = Math.min(...V.map(v => v[1])), vMax = Math.max(...V.map(v => v[1]))
                    const clipPoche = dessusDuBord(EL, xE, yE, lE)
          const MO = 0.32, VO = 0.6, x0 = xE + lE / 2 - 80, yBas = yE + vMax * s + 6, yHaut = yE + vMin * s - 196 - 8
          const surEnv = ([px, py]) => px < xE + lE && px + 160 > xE && py < 90 + 280
          const places2 = [...places.filter(p => !surEnv(p)), ...places.filter(surEnv)]
          const sortent = [], volent = []
          ims.forEach((src, j) => { const u = dt - 0.5 - j * pas; if (u < 0) return
            if (u < MO) { const q = u / MO, e = 1 - Math.pow(1 - q, 3)
              sortent.push(carte(src, 160, 196, 'left:' + Math.round(x0) + 'px;top:' + Math.round(yBas + (yHaut - yBas) * e) + 'px', 10, 28)); return }
            const q = clamp((u - MO) / VO, 0, 1), e = 1 - Math.pow(1 - q, 3), [px, py, rot] = places2[j]
            const xx = x0 + (px - x0) * e, yy = yHaut + (py - yHaut) * e - Math.sin(q * Math.PI) * 50, r = rot * e + Math.sin(q * Math.PI) * (j % 2 ? 22 : -22)
            volent.push(carte(src, 160, 196, 'left:' + Math.round(xx) + 'px;top:' + Math.round(yy) + 'px;transform:rotate(' + r.toFixed(1) + 'deg)', 10, 28)) })
          return '<img src="' + EL.src + '" style="position:absolute;left:' + xE + 'px;top:' + yE.toFixed(1) + 'px;width:' + lE + 'px;opacity:' + env.toFixed(2) + ';filter:drop-shadow(0 12px 20px rgba(0,0,0,.3))">'
            + '<div style="position:absolute;inset:0;clip-path:' + clipPoche + '">' + sortent.join('') + '</div>' + volent.join('') }
        const chute = ims.map((src, j) => { const u = dt - 0.5 - j * pas; if (u < 0) return ''
          const q = clamp(u / 0.55, 0, 1), e = 1 - Math.pow(1 - q, 3), [px, py, rot] = places[j], sx = cote === 'droite' ? 560 : 100, sy = -60
          const sy2 = 90, xx = sx + (px - sx) * e, yy = sy2 + (py - sy2) * e + Math.sin(q * Math.PI) * -40, r = rot * e + (1 - e) * (j % 2 ? 180 : -180)
          return carte(src, 160, 196, 'left:' + Math.round(xx) + 'px;top:' + Math.round(yy) + 'px;transform:rotate(' + r.toFixed(1) + 'deg)', 10, 28) }).join('')
        const EN = objet('enveloppe-blanche'); if (EN) return chute + '<img src="' + EN.src + '" style="position:absolute;left:' + (cote === 'droite' ? 480 : 20) + 'px;top:' + Math.round(70 - (1 - env) * 60) + 'px;width:220px;opacity:' + env.toFixed(2) + ';transform:rotate(-8deg);filter:drop-shadow(0 12px 20px rgba(0,0,0,.3))">'
        return chute + '<div style="position:absolute;left:270px;top:' + Math.round(84 - (1 - env) * 60) + 'px;width:180px;height:120px;opacity:' + env.toFixed(2) + ';transform:rotate(180deg)">'
          + '<div style="position:absolute;inset:0;background:#C9A06B;border-radius:6px;' + OMBRE + '"></div>'
          + '<div style="position:absolute;left:0;right:0;top:0;height:70px;background:#B88C57;clip-path:polygon(0 0,100% 0,50% 100%);transform-origin:top;transform:scaleY(' + (1 - 2 * ouvert).toFixed(2) + ')"></div></div>' },
      sons: t0 => { const EL = objet('enveloppe-kraft-lettre', 'enveloppe-blanche'); return EL ? [{ t: t0 + 0.05, fam: 'whoosh', vol: 0.06 }, ...ims.flatMap((_, j) => [{ t: t0 + 0.5 + j * pas, fam: 'papier', vol: 0.06, duree: 0.4 }, { t: t0 + 1.42 + j * pas, fam: 'photo', vol: 0.07 }])] : [{ t: t0 + 0.25, fam: 'whoosh', vol: 0.07 }, ...ims.map((_, j) => ({ t: t0 + 1.0 + j * pas, fam: 'photo', vol: 0.07 }))] } }
  }

  if (E.type === 'corde') {
    const ims = photos().slice(0, 4); if (!ims.length) return null
    const pas = 0.4, n = ims.length, duree = E.duree ?? Math.max(3.2, 0.4 + n * pas + 1.6), w = Math.min(150, Math.floor(620 / n) - 14)
    return { hauteur: 240, anim: 0.4 + n * pas, duree,
      dessin: (dt, y) => { const c = doux(dt / 0.3), xs = ims.map((_, j) => 50 + j * (620 / n) + (620 / n - w) / 2)
        const fil = '<svg width="720" height="60" style="position:absolute;left:0;top:' + y + 'px;overflow:visible"><path d="M-10 10 Q 360 ' + (10 + 46 * c).toFixed(1) + ' 730 10" fill="none" stroke="#8a6a48" stroke-width="3.5"/></svg>'
        const fy = x => y + 10 + 46 * c * (1 - Math.pow((x - 360) / 370, 2))
        return fil + ims.map((src, j) => { const u = dt - 0.35 - j * pas; if (u < 0) return ''
          const q = doux(u / 0.4), xx = 740 + (xs[j] - 740) * q, sw = Math.sin(clamp(u / 0.9, 0, 1) * Math.PI * 2.5) * 6 * (1 - clamp(u / 1.2, 0, 1)), yy = fy(xx + w / 2)
          return '<div style="position:absolute;left:' + Math.round(xx) + 'px;top:' + Math.round(yy - 8) + 'px;width:' + w + 'px;transform-origin:50% 0;transform:rotate(' + (sw + [-3, 2, -2, 3][j]).toFixed(1) + 'deg)">'
            + carte(src, w, Math.round(w * 1.22), 'left:0;top:10px', 9, 26)
            + '<div style="position:absolute;left:' + Math.round(w / 2 - 7) + 'px;top:-6px;width:14px;height:34px;border-radius:3px;background:#D9B98C;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div></div>' }).join('') },
      sons: t0 => ims.map((_, j) => ({ t: t0 + 0.35 + j * pas, fam: 'whoosh', vol: 0.05 })) }
  }

  if (E.type === 'eventail') {
    const ims = photos(); if (!ims.length) return null
    const n = ims.length, duree = E.duree ?? 3.4
    const O = { hauteur: 470, anim: 1.3, duree,
      dessin0: (dt, y) => { const d = doux(dt / 0.3), o = doux((dt - 0.35) / 0.55), BX0 = (b => b?.mesures?.bord ? b : null)(objet('boite-carton', 'boite-bois', 'dossier-kraft'))
        const cartes = ims.map((src, j) => { const a = (j - (n - 1) / 2) * (n > 1 ? (BX0 ? 58 : 90) / (n - 1) : 0) * o, lift = (BX0 ? 200 : 90) * o
          return carte(src, 150, 182, 'left:285px;top:' + Math.round(y + (BX0 ? 300 : 230) - lift) + 'px;transform-origin:50% 160%;transform:rotate(' + a.toFixed(1) + 'deg)', 10, 26) }).join('')
        const BX = objet('boite-carton', 'boite-bois', 'dossier-kraft'); if (BX?.mesures?.bord) { const lB = 300, hB = Math.round(lB * BX.h / BX.l)
          const imB = st => '<img src="' + BX.src + '" style="position:absolute;left:' + (360 - lB / 2) + 'px;top:' + (y + 470 - hB) + 'px;width:' + lB + 'px;' + st + '">'
          // (07/11) le bord de la boîte en perspective, mesuré au pixel sur boite-carton.png (725 × 800) :
          // tant qu'une photo est dans la boîte, on ne la voit QUE au-dessus de ce bord (jamais sous la boîte), et les faces avant la recouvrent
          const dessus = dessusDuBord(BX, 360 - lB / 2, y + 470 - hB, lB), faces = faceAvant(BX)
          return '<div style="position:absolute;inset:0;opacity:' + d.toFixed(2) + '">' + imB('filter:drop-shadow(0 14px 24px rgba(0,0,0,.3))')
            + '<div style="position:absolute;inset:0;clip-path:' + dessus + '">' + cartes + '</div>' + imB('clip-path:' + faces) + '</div>' }
        return '<div style="position:absolute;inset:0;opacity:' + d.toFixed(2) + '">'
          + '<div style="position:absolute;left:220px;top:' + (y + 150) + 'px;width:280px;height:180px;border-radius:10px;background:' + accent + ';filter:brightness(.82);' + OMBRE + '"></div>'
          + '<div style="position:absolute;left:220px;top:' + (y + 130) + 'px;width:110px;height:40px;border-radius:10px 10px 0 0;background:' + accent + ';filter:brightness(.82)"></div>'
          + cartes + '<div style="position:absolute;left:220px;top:' + (y + 190) + 'px;width:280px;height:140px;border-radius:10px;background:' + accent + ';' + OMBRE + '"></div></div>' },
      sons: t0 => [{ t: t0 + 0.05, fam: 'boite', vol: 0.09 }, { t: t0 + 0.4, fam: 'whoosh', vol: 0.06 }] }
    // (07/11) pas la place sous son visage (gros plan) : la boîte se met de côté, plus petite, au lieu de passer sur elle
    O.dessin = (dt, y) => { const cote = E.cote, kE = cote ? clamp((E.largeur || 320) / 320, 0.5, 1) : 1, dxE = cote ? (cote === 'droite' ? 720 - 10 - 160 * kE : 10 + 160 * kE) - 360 : 0
      const enveloppe = h => cote ? '<div style="position:absolute;inset:0;transform-origin:360px ' + (y + 470) + 'px;transform:translateX(' + dxE.toFixed(1) + 'px) scale(' + kE.toFixed(3) + ')">' + h + '</div>' : h
      return enveloppe(O.dessin0(dt, y)) }
    return O
  }
  return null
}

// ── LES OBJETS DERRIÈRE ELLE (détourée) : dessinés sur le calque de derrière, au-dessus de sa tête ──
// objetDerriere(D, outils) → dessin(t, v) ; v = la boîte de son visage [x0, y0, x1, y1] (ou null)
export function objetDerriere(D, { clamp, doux, esc, couleur }) {
  const a = D.a, col = D.couleur || couleur || '#E8869A'
  if (D.type === 'machine') {
    const lignes = (D.lignes || []).slice(0, 6), total = lignes.join('').length || 1, vitesse = D.vitesse || 18
    const hMax = 70 + 30 * Math.max(1, lignes.length)
    return (t, v) => { const u = t - a, mont = doux(u / 0.35)
      // pas la place au-dessus de sa tête : la machine se pose du côté libre, plus petite (sinon sa tête cache la feuille)
      const cote = v && v[1] - 90 < hMax + 60 ? (v[0] > 720 - v[2] ? 'gauche' : 'droite') : null, k = cote ? 0.66 : 1
      const cx = cote === 'gauche' ? 30 + 210 * k : cote === 'droite' ? 690 - 210 * k : Math.max(220, Math.min(500, v ? (v[0] + v[2]) / 2 : 360))
      const corps = cote ? Math.max(90 + (hMax + 40) * k, v[1] + 80) : Math.max(v ? v[1] - 20 : 420, 90 + hMax + 40)
      let reste = Math.floor(clamp((u - 0.5) * vitesse, 0, total)), dernier = 0
      const txt = lignes.map((l, i) => { const k = Math.min(l.length, reste); reste -= k; if (k) dernier = i; return '<div style="height:30px">' + esc(l.slice(0, k)) + (k > 0 && k < l.length ? '<span style="opacity:.6">|</span>' : '') + '</div>' }).join('')
      const hP = 70 + 30 * (dernier + 1)
      return '<div style="position:absolute;left:' + Math.round(cx - 210) + 'px;top:' + Math.round(corps - hP + 6 + (1 - mont) * 80) + 'px;width:420px;transform-origin:50% ' + hP + 'px;transform:scale(' + k + ');opacity:' + mont.toFixed(2) + '">'
        + '<div style="position:relative;margin:0 auto;width:250px;height:' + hP + 'px;background:#FDFCF8;box-shadow:0 4px 14px rgba(0,0,0,.18);padding:22px 24px;box-sizing:border-box;font:700 20px/1 Machine,monospace;color:#2b2b2e;letter-spacing:.04em;display:flex;flex-direction:column;justify-content:flex-end">' + txt + '</div>'
        + '<div style="position:relative;margin:-6px auto 0;width:360px;height:44px;border-radius:22px;background:linear-gradient(#3a3a3e,#1f1f22)"></div>'
        + '<div style="position:relative;margin:-8px auto 0;width:420px;height:190px;border-radius:40px 40px 22px 22px;background:' + col + ';box-shadow:inset 0 -18px 0 rgba(0,0,0,.12),0 18px 34px rgba(0,0,0,.3)">'
        + [0, 1, 2].map(r => '<div style="position:absolute;left:' + (54 + r * 14) + 'px;right:' + (54 + r * 14) + 'px;top:' + (62 + r * 36) + 'px;display:flex;justify-content:space-between">' + Array.from({ length: 10 - r }, () => '<span style="width:22px;height:22px;border-radius:50%;background:#FBF6EE;box-shadow:0 3px 0 rgba(0,0,0,.25)"></span>').join('') + '</div>').join('')
        + '</div></div>' }
  }
  if (D.type === 'panneau') {
    const titre = String(D.texte || '').trim(), petit = String(D.petit || '').trim(), dessous = String(D.dessous || '').trim()
    return (t, v) => { const u = t - a, p = clamp(1 + 2.4 * Math.pow(Math.min(1, u / 0.45) - 1, 3) + 1.4 * Math.pow(Math.min(1, u / 0.45) - 1, 2), 0, 1.06)
      const libreHaut = v ? v[1] - 90 : 400, cote = !v || libreHaut >= 200 ? null : v[0] > 720 - v[2] ? 'gauche' : 'droite'
      const W = cote ? 300 : 520, z = Math.round(clamp((W - 40) / (0.62 * Math.max(6, titre.length)), 30, 76)), cx = cote === 'gauche' ? 40 + W / 2 : cote === 'droite' ? 680 - W / 2 : v ? (v[0] + v[2]) / 2 : 360
      const top = cote ? Math.max(100, v[1] + 10) : v ? Math.max(90, v[1] - 230) : 200
      return '<div style="position:absolute;left:' + Math.round(Math.max(30, Math.min(690 - W, cx - W / 2))) + 'px;top:' + Math.round(top) + 'px;width:' + W + 'px;transform-origin:50% 100%;transform:scale(' + p.toFixed(3) + ')">'
        + '<div style="position:absolute;left:' + Math.round(W * 0.23) + 'px;top:120px;width:16px;height:900px;background:linear-gradient(90deg,#7d8188,#b7bbc2,#7d8188)"></div><div style="position:absolute;right:' + Math.round(W * 0.23) + 'px;top:120px;width:16px;height:900px;background:linear-gradient(90deg,#7d8188,#b7bbc2,#7d8188)"></div>'
        + '<div style="position:relative;border-radius:18px;background:' + (D.couleur || '#1F6B3A') + ';border:6px solid #fff;outline:3px solid ' + (D.couleur || '#1F6B3A') + ';padding:16px 24px 18px;text-align:center;color:#fff;box-shadow:0 14px 30px rgba(0,0,0,.35)">'
        + (petit ? '<div style="font:800 24px/1 Poppins,sans-serif;letter-spacing:.16em">' + esc(petit.toUpperCase()) + '</div>' : '')
        + '<div style="font:800 ' + z + 'px/1.05 Poppins,sans-serif;margin-top:6px">' + esc(titre) + '</div>'
        + (dessous ? '<div style="font:600 18px/1 Poppins,sans-serif;letter-spacing:.2em;margin-top:8px;opacity:.9">' + esc(dessous.toUpperCase()) + '</div>' : '') + '</div></div>' }
  }
  return null
}

// ── LE TABLEAU EN LIÈGE (option du fond vert : "decor": "liege") ──
export const fondLiege = '<div style="position:absolute;inset:0;background:#B98A58;background-image:radial-gradient(rgba(90,55,25,.35) 1.2px,transparent 1.6px),radial-gradient(rgba(255,230,190,.25) 1px,transparent 1.5px),radial-gradient(rgba(70,40,15,.25) 2px,transparent 2.6px);background-size:9px 9px,13px 13px,23px 23px;background-position:0 0,4px 6px,11px 3px"></div><div style="position:absolute;inset:0;box-shadow:inset 0 0 120px rgba(60,30,10,.55)"></div>'
// les photos punaisées, reliées par un fil rouge ; q = l'entrée (0 à 1)
export function photosPunaisees(srcs, q, { couleur = '#C62828' } = {}) {
  const pos = [[70, 120, -5], [400, 150, 4], [90, 520, 3], [420, 560, -4]].slice(0, srcs.length)
  const w = srcs.length === 1 ? 420 : 250, h = Math.round(w * 1.15)
  const centres = pos.map(([x, y]) => [x + w / 2, y + 14])
  return (centres.length > 1 ? '<svg width="720" height="1280" style="position:absolute;inset:0;opacity:' + Math.min(1, Math.max(0, (q - 0.22 * (srcs.length - 1)) / 0.2)).toFixed(2) + '"><path d="' + centres.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(0) + ' ' + c[1].toFixed(0)).join(' ') + '" fill="none" stroke="' + couleur + '" stroke-width="3" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"/></svg>' : '')
    + srcs.map((src, k) => { const [x, y, r] = srcs.length === 1 ? [150, 160, -3] : pos[k], p = Math.min(1, Math.max(0, (q - k * 0.22) / 0.2))
      return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;background:#fff;padding:12px 12px 40px;box-sizing:border-box;box-shadow:0 10px 22px rgba(0,0,0,.35);transform:rotate(' + r + 'deg) scale(' + (1.2 - 0.2 * p).toFixed(3) + ');opacity:' + p.toFixed(2) + '">'
        + '<div style="width:100%;height:100%;background:url(' + src + ') center/cover"></div>'
        + '<div style="position:absolute;left:50%;top:-8px;width:26px;height:26px;margin-left:-13px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8a80,' + couleur + ' 55%,#7f1010);box-shadow:0 3px 5px rgba(0,0,0,.4)"></div></div>' }).join('')
}
