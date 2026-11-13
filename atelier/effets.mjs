// LES EFFETS PONCTUELS (idées d'Aurélie, 04/11/2026), partagés par les deux moteurs, comme les listes animées :
//   choc          : SA phrase qui relance l'attention, en gros au marqueur au-dessus de sa tête, mot après mot
//   commentaires  : de VRAIS commentaires de ses abonnées, empilés en haut (jamais inventés)
//   capture       : SA capture d'écran, avec un cercle au feutre autour de ce dont elle parle et une étiquette
//   avantapres    : deux de SES images empilées, « avant » et « après »
// effet(E, outils) → { hauteur, duree, anim, dessin(dt, y), sons(t0) } ; `y` = le haut de l'effet dans l'image.
import { readFileSync, existsSync } from 'node:fs'
import { effet2 } from './effets2.mjs'
export const POLICES_EFFETS = [['Sacramento-400.woff2', 'DuoSac', 400], ['Jost-300.woff2', 'DuoJost', 300], ['BebasNeue-400.woff2', 'DuoBebas', 400], ['Gloock-400.woff2', 'DuoGloock', 400], ['ArchivoBlack-400.woff2', 'DuoArchivo', 400], ['Anton-400.woff2', 'Anton', 400], ['Satisfy-400.woff2', 'Script', 400], ['Cormorant-italique.woff2', 'DouxI', 500, 'italic'], ['Fraunces-900.woff2', 'Gros', 900], ['Caveat-700.woff2', 'Annot', 700], ['InstrumentSerif-italique.woff2', 'Didot', 400, 'italic'], ['GloriaHallelujah-400.woff2', 'Carnet', 400], ['Poppins-600.woff2', 'Poppins', 600], ['Caveat-700.woff2', 'Annot', 700]]

const image = f => { if (!f || !existsSync(f)) return null; const ext = f.split('.').pop().toLowerCase(); return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${readFileSync(f).toString('base64')}` }

// LES RECETTES DE DUOS : g = la grosse (famille, graisse, taille pour 10 lettres, interligne, casse, nom réel),
// f = la fine, et comment elle se pose : « dessus » chevauche le haut et le bas, « traverse » passe au milieu,
// « autour » au-dessus et en dessous, « biais » en travers.
export const DUOS = {
  affiche:  { g: ['DuoBebas', 400, 190, 0.8, 'upper', 'Bebas Neue', 0.4], f: ['DuoSac', 400, 78, 'none', 'Sacramento'], pose: 'dessus' },
  bloc:     { g: ['DuoArchivo', 400, 100, 1, 'upper', 'Archivo Black', 0.78], f: ['DuoSac', 400, 68, 'none', 'Sacramento'], pose: 'autour' },
  magazine: { g: ['DuoGloock', 400, 150, 1, 'lower', 'Gloock', 0.52], f: ['DuoJost', 300, 32, 'upper', 'Jost'], pose: 'traverse' },
  eclat:    { g: ['Anton', 400, 170, 0.86, 'upper', 'Anton', 0.47], f: ['Script', 400, 80, 'none', 'Satisfy'], pose: 'biais' },
  douceur:  { g: ['DouxI', 500, 150, 0.9, 'lower', 'Cormorant italique', 0.4], f: ['DuoJost', 300, 30, 'upper', 'Jost'], pose: 'autour' },
  retro:    { g: ['Gros', 900, 130, 0.9, 'lower', 'Fraunces', 0.58], f: ['Annot', 700, 62, 'none', 'Caveat'], pose: 'dessus' },
  editorial:{ g: ['DuoGloock', 400, 130, 0.95, 'upper', 'Gloock', 0.72], f: ['Didot', 400, 62, 'none', 'Instrument italique'], pose: 'autour' },
}
// La couleur du décor : l'image en 36 x 64 (rgb), le cadre du visage à exclure (peau, cheveux) ; on garde les couleurs
// franches mais pas criardes, on prend la teinte la plus présente, et on la règle pour qu'elle se lise.
export function couleurDecor(rgb, visage) {
  if (!rgb || rgb.length < 36 * 64 * 3) return null
  const seaux = new Map()
  for (let y = 0; y < 64; y++) for (let x = 0; x < 36; x++) {
    if (visage && x * 20 > visage[0] - 60 && x * 20 < visage[2] + 60 && y * 20 > visage[1] - 80 && y * 20 < visage[3] + 260) continue
    const i = (y * 36 + x) * 3, r = rgb[i] / 255, g = rgb[i + 1] / 255, b = rgb[i + 2] / 255
    const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m; if (d < 0.12) continue
    const s = d / (1 - Math.abs(2 * l - 1)); if (s < 0.32 || l < 0.22 || l > 0.8) continue
    let h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360
    if (h >= 8 && h <= 50 && s < 0.62) continue
    const k = Math.round(h / 24) % 15, o = seaux.get(k) || { n: 0, h: 0, s: 0 }; o.n++; o.h += h; o.s += s; seaux.set(k, o)
  }
  const top = [...seaux.values()].sort((a, b) => b.n - a.n)[0]; if (!top || top.n < 12) return null
  const h = top.h / top.n, s = Math.min(0.72, Math.max(0.45, top.s / top.n)), l = 0.5
  const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))) }
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function effet(E, { clamp, doux, rebond, esc, couleurs, dossier = '' }) {
  const chemin = f => f && (f.includes(':') || f.startsWith('/') ? f : dossier + '/' + f)
  /* (08/11) tri d'Aurélie dans le catalogue : ce qu'elle a retiré ne sort plus, même demandé */
  if (['timeline', 'trait'].includes(E.type)) return null
  if (E.type === 'capture') E = { ...E, cercle: null, etiquette: '' }
  if (E.type === 'pincee') E = { ...E, objet: null }
  if (E.type === 'dialogue') E = { ...E, danger: false }
  if (E.type === 'fenetre') E = { ...E, bouton: E.bouton || 'OK' }
  if (E.type === 'motTasse') E = { ...E, transition: 'pose', lettre: undefined }
  if (E.type === 'filrouge') E = { ...E, look: undefined }
  if (E.type === 'objet') E = { ...E, surCote: false }
  if (E.type === 'eventail') E = { ...E, cote: undefined, largeur: undefined }
  if (E.type === 'choc') {
    const mots = String(E.texte || '').trim().split(/\s+/).filter(Boolean); if (!mots.length) return null
    const lignes = []; let l = ''
    for (const m of mots) { if ((l + ' ' + m).trim().length > 16 && l) { lignes.push(l); l = m } else l = (l + ' ' + m).trim() }
    lignes.push(l)
    const z = Math.round(clamp(560 / (0.62 * Math.max(...lignes.map(x => x.length))), 44, 84)), hauteur = Math.round(lignes.length * z * 1.05 + 20)
    const pas = Math.min(0.22, 1.1 / mots.length)
    return { hauteur, anim: mots.length * pas + 0.4, duree: E.duree ?? Math.max(2.2, mots.length * pas + 1.6),
      dessin: (dt, y) => { let k = -1
        return '<div style="position:absolute;left:40px;right:80px;top:' + y + 'px;text-align:center;font:400 ' + z + 'px/1.05 Carnet,cursive;text-transform:uppercase;color:' + couleurs.marqueur + ';-webkit-text-stroke:6px ' + couleurs.contour + ';paint-order:stroke fill;transform:rotate(-2deg);text-shadow:0 4px 12px rgba(0,0,0,.25)">'
          + lignes.map(li => li.split(' ').map(w => { k++; const p = clamp(rebond((dt - k * pas) / 0.2), 0, 1.15); return '<span style="display:inline-block;margin:0 .12em;transform:scale(' + p.toFixed(2) + ');opacity:' + Math.min(1, p).toFixed(2) + '">' + esc(w) + '</span>' }).join('')).join('<br>') + '</div>' },
      sons: t0 => mots.map((_, k) => ({ t: t0 + k * pas, fam: 'clic', vol: 0.06 })) }
  }
  if (E.type === 'commentaires') {
    const items = (E.items || []).slice(0, 5).filter(x => (x.texte || x).length); if (!items.length) return null
    const pas = 0.45, hauteur = items.length * 62 + 10
    return { hauteur, anim: items.length * pas + 0.3, duree: E.duree ?? Math.max(3, items.length * pas + 2),
      dessin: (dt, y) => items.map((x, k) => { const p = clamp(rebond((dt - k * pas) / 0.25), 0, 1.1); if (dt < k * pas) return ''
        const txt = typeof x === 'string' ? x : x.texte, dec = [0, 60, 20, 90, 40][k]
        return '<div style="position:absolute;left:' + (40 + dec) + 'px;top:' + (y + k * 62) + 'px;max-width:560px;transform:scale(' + p.toFixed(2) + ');transform-origin:left center;background:#fff;color:#111;padding:10px 16px;border-radius:6px;box-shadow:0 6px 16px rgba(0,0,0,.25);font:600 24px/1.25 Poppins,sans-serif">' + esc(txt) + '</div>' }).join(''),
      sons: t0 => items.map((_, k) => ({ t: t0 + k * pas, fam: 'pop', vol: 0.06 })) }
  }
  if (E.type === 'capture') {
    const src = image(chemin(E.image)); if (!src) return null
    const H = Math.min(420, Math.round(460 * (E.ratio || 1.25))), W = Math.round(H / (E.ratio || 1.25)), c = E.cercle || null, et = E.etiquette || ''
    return { hauteur: H + (et ? 60 : 0), anim: 1.4, duree: E.duree ?? 3.2,
      dessin: (dt, y) => { const p = doux(dt / 0.3), q = clamp((dt - 0.45) / 0.6, 0, 1)
        const cercle = c ? '<svg style="position:absolute;left:0;top:0;overflow:visible" width="' + W + '" height="' + H + '"><ellipse cx="' + (c.x * W) + '" cy="' + (c.y * H) + '" rx="' + (c.r * W) + '" ry="' + (c.r * W * 0.62) + '" fill="none" stroke="' + couleurs.feutre + '" stroke-width="7" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="' + (100 * (1 - q)).toFixed(1) + '" transform="rotate(-6 ' + (c.x * W) + ' ' + (c.y * H) + ')" style="filter:drop-shadow(0 0 2px #fff)"/></svg>' : ''
        return '<div style="position:absolute;left:' + (360 - W / 2) + 'px;top:' + y + 'px;width:' + W + 'px;opacity:' + p + ';transform:scale(' + (0.94 + 0.06 * p) + ')">'
          + '<div style="position:relative;width:' + W + 'px;height:' + H + 'px;border-radius:18px;overflow:hidden;box-shadow:0 14px 30px rgba(0,0,0,.35);background:url(' + src + ') center/cover"></div>' + '<div style="position:absolute;left:0;top:0">' + cercle + '</div>'
          + (et ? '<div style="margin-top:12px;text-align:center;font:400 40px/1 Carnet,cursive;text-transform:uppercase;color:' + couleurs.marqueur + ';-webkit-text-stroke:5px ' + couleurs.contour + ';paint-order:stroke fill;opacity:' + q + '">' + esc(et) + '</div>' : '') + '</div>' },
      sons: t0 => [{ t: t0, fam: 'photo', vol: 0.08 }, ...(c ? [{ t: t0 + 0.45, fam: 'clic', vol: 0.06 }] : [])] }
  }
  if (E.type === 'avantapres') {
    const av = image(chemin(E.avant)), ap = image(chemin(E.apres)); if (!av || !ap) return null
    const W = 300, H = 380
    return { hauteur: H, anim: 1.2, duree: E.duree ?? 3.5,
      dessin: (dt, y) => [[av, E.labelAvant || 'AVANT', 0], [ap, E.labelApres || '*APRÈS*', 1]].map(([src, lab, k]) => { const p = doux((dt - k * 0.5) / 0.3); if (p <= 0) return ''
        return '<div style="position:absolute;left:' + (360 - W - 10 + k * (W + 20)) + 'px;top:' + y + 'px;width:' + W + 'px;height:' + H + 'px;border-radius:14px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.35);opacity:' + p + ';transform:translateY(' + ((1 - p) * 20).toFixed(0) + 'px);background:url(' + src + ') center/cover"><div style="position:absolute;left:12px;top:10px;font:400 30px/1 Carnet,cursive;text-transform:uppercase;color:' + couleurs.marqueur + ';-webkit-text-stroke:5px ' + couleurs.contour + ';paint-order:stroke fill">' + esc(lab) + '</div></div>' }).join(''),
      sons: t0 => [{ t: t0, fam: 'photo', vol: 0.08 }, { t: t0 + 0.5, fam: 'photo', vol: 0.08 }] }
  }
  if (E.type === 'duo') {
    const R = DUOS[E.recette] || DUOS.affiche, grand = String(E.grand || '').trim(); if (!grand) return null
    const casse = (t, c) => c === 'upper' ? t.toUpperCase() : c === 'lower' ? t.toLowerCase() : t
    const taille = ls => Math.min(R.g[2], 540 / (R.g[6] * Math.max(...ls.map(l => [...l].length))))
    let lignesG = E.lignes || [grand]
    if (!E.lignes && grand.includes(' ') && taille([grand]) < R.g[2] * 0.62) { const m = grand.split(/\s+/); let best = null
      for (let k = 1; k < m.length; k++) { const c = [m.slice(0, k).join(' '), m.slice(k).join(' ')]; if (!best || taille(c) > taille(best)) best = c } lignesG = best }
    lignesG = lignesG.map(l => casse(l, R.g[4]))
    const zG = Math.round(clamp(taille(lignesG), 56, R.g[2]))
    const hG = Math.round(zG * R.g[3] * lignesG.length), zF = R.f[2], col = E.couleur && E.couleur !== 'auto' ? E.couleur : (couleurs.decor || couleurs.feutre)
    const fine = E.fine || '#FBF3EA', halo = 'text-shadow:0 0 2px rgba(30,10,15,.85),0 0 10px rgba(30,10,15,.5)'
    const dessus = E.dessus ? casse(E.dessus, R.f[3]) : '', dessous = E.dessous ? casse(E.dessous, R.f[3]) : ''
    // (13/11/2026) « autour » : le petit mot au-dessus et celui du dessous mordaient sur le grand (« soit c'est du /
    // DÉMARCHAGE / appelons un chat, un chat ») ; on laisse un vrai espace, accents des capitales compris.
    const autour = R.pose === 'autour', ecartH = zF * 1.02 + (R.g[4] === 'upper' ? zG * 0.1 : 0), ecartB = zG * 0.06
    const hauteur = hG + (autour ? (dessus ? ecartH : 0) + (dessous ? ecartB + zF * 1.1 : 0) : zF * 0.5) + 20
    // une petite ligne trop longue sortait de l'écran : elle rapetisse pour tenir dans la largeur
    const tient = (t, z) => Math.min(z, Math.floor(600 / Math.max(1, [...t].length * (R.f[3] === 'upper' ? 1.15 : 0.47))))
    const ecr = (t, dt, d0, z0, extra) => { const q = clamp((dt - d0) / 0.55, 0, 1), z = tient(t, z0) // la fine s'écrit de gauche à droite
      return '<div style="font:' + R.f[1] + ' ' + z + 'px/1 ' + R.f[0] + ';color:' + fine + ';' + (R.f[3] === 'upper' ? 'letter-spacing:.5em;padding-left:.5em;' : '') + halo + ';clip-path:inset(-20% ' + ((1 - q) * 100).toFixed(1) + '% -20% -5%);' + (extra || '') + '">' + esc(t) + '</div>' }
    return { hauteur: Math.round(hauteur), anim: 1.6, duree: E.duree ?? 3.2,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.35), 0, 1.08), yG = autour && dessus ? ecartH : 0
        let h = '<div style="position:absolute;left:0;right:0;top:' + y + 'px;text-align:center">'
        h += '<div style="position:absolute;left:0;right:0;top:' + yG + 'px;font:' + R.g[1] + ' ' + zG + 'px/' + R.g[3] + ' ' + R.g[0] + ';color:' + col + ';letter-spacing:-.02em;transform:scale(' + p.toFixed(3) + ');filter:drop-shadow(0 6px 14px rgba(0,0,0,.25))">' + lignesG.map(esc).join('<br>') + '</div>'
        const pos = (top, txt, d0, extra) => txt ? '<div style="position:absolute;left:0;right:0;top:' + Math.round(top) + 'px">' + ecr(txt, dt, d0, txt === dessous && R.pose !== 'traverse' ? Math.round(zF * 1.1) : zF, extra) + '</div>' : ''
        if (R.pose === 'dessus') h += pos(-zF * 0.45, dessus, 0.25) + pos(hG - zF * 0.55, dessous, 0.6)
        else if (R.pose === 'traverse') h += pos(hG / 2 - zF / 2, dessus || dessous, 0.3)
        else if (R.pose === 'biais') h += pos(hG / 2 - zF * 0.6, dessus || dessous, 0.3, 'transform:rotate(-7deg)')
        else h += pos(0, dessus, 0.2) + pos(yG + hG + ecartB, dessous, 0.55)
        if (E.etiquettes) { const q = clamp((dt - 0.9) / 0.3, 0, 1), chip = (x, yy, t) => '<div style="position:absolute;left:' + x + 'px;top:' + Math.round(yy) + 'px;padding:11px 24px;border-radius:14px;background:#1d1b1e;border:3px solid #fff;color:#fff;font:600 25px/1 Poppins,sans-serif;box-shadow:0 6px 16px rgba(0,0,0,.35);opacity:' + q + ';transform:scale(' + (0.8 + 0.2 * q).toFixed(2) + ')">' + esc(t) + '</div>'
          const fl = d => '<svg style="position:absolute;left:0;top:0;overflow:visible;opacity:' + q + '" width="720" height="10"><path d="' + d + '" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))"/></svg>'
          h += chip(60, -100, R.g[5]) + fl('M150 -44 Q 120 -10 150 ' + Math.round(yG + 10)) + chip(420, hauteur + 10, R.f[4]) + fl('M500 ' + Math.round(hauteur + 8) + ' Q 530 ' + Math.round(hauteur - 30) + ' 505 ' + Math.round(hauteur - 50)) }
        return h + '</div>' },
      sons: t0 => [{ t: t0, fam: 'pop', vol: 0.07 }, ...(E.etiquettes ? [{ t: t0 + 0.9, fam: 'clic', vol: 0.06 }] : [])] }
  }
  if (E.type === 'telephone') {
    const src = image(chemin(E.image)); if (!src) return null
    const W = Math.round(E.largeur || 250), H = Math.round(W * 2.08), R = E.ratio || 3, cote = E.cote === 'gauche' ? 'gauche' : 'droite', duree = E.duree ?? 4
    return { hauteur: H, anim: duree, duree, place: cote,
      dessin: (dt, y) => { const p = clamp(rebond(dt / 0.45), 0, 1.06), sortie = 1 - clamp((dt - (duree - 0.3)) / 0.3, 0, 1)
        const defile = clamp((dt - 0.6) / Math.max(0.5, duree - 1.1), 0, 1), haut = (W - 20) * R - (H - 24), dy = -haut * (defile < 0.5 ? 2 * defile * defile : 1 - Math.pow(-2 * defile + 2, 2) / 2)
        const x = cote === 'droite' ? 720 - W - 52 : 52, rot = cote === 'droite' ? 5 : -5
        return '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + W + 'px;height:' + H + 'px;opacity:' + sortie.toFixed(2) + ';transform:translateY(' + ((1 - Math.min(1, p)) * 160).toFixed(1) + 'px) rotate(' + rot + 'deg) scale(' + (0.9 + 0.1 * Math.min(1, p)).toFixed(3) + ')">'
          + '<div style="position:absolute;inset:0;border-radius:40px;background:#111;box-shadow:0 24px 50px rgba(0,0,0,.45),inset 0 0 0 2px #3a3a3a"></div>'
          + '<div style="position:absolute;left:10px;top:12px;right:10px;bottom:12px;border-radius:31px;overflow:hidden;background:#fff"><div style="position:absolute;left:0;top:' + dy.toFixed(1) + 'px;width:100%;height:' + Math.round((W - 20) * R) + 'px;background:url(' + src + ') top center/100% auto no-repeat"></div></div>'
          + '<div style="position:absolute;left:50%;top:20px;width:70px;height:20px;margin-left:-35px;border-radius:12px;background:#111"></div>'
          + '<div style="position:absolute;right:-4px;top:110px;width:4px;height:56px;border-radius:2px;background:#2a2a2a"></div></div>' },
      sons: t0 => [{ t: t0, fam: 'whoosh', vol: 0.07 }] }
  }
  return effet2(E, arguments[1]) // les effets du 06/11 (effets2.mjs)
}
