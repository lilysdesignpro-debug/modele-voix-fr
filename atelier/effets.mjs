// LES EFFETS PONCTUELS (idées d'Aurélie, 04/11/2026), partagés par les deux moteurs, comme les listes animées :
//   choc          : SA phrase qui relance l'attention, en gros au marqueur au-dessus de sa tête, mot après mot
//   commentaires  : de VRAIS commentaires de ses abonnées, empilés en haut (jamais inventés)
//   capture       : SA capture d'écran, avec un cercle au feutre autour de ce dont elle parle et une étiquette
//   avantapres    : deux de SES images empilées, « avant » et « après »
// effet(E, outils) → { hauteur, duree, anim, dessin(dt, y), sons(t0) } ; `y` = le haut de l'effet dans l'image.
import { readFileSync, existsSync } from 'node:fs'
export const POLICES_EFFETS = [['GloriaHallelujah-400.woff2', 'Carnet', 400], ['Poppins-600.woff2', 'Poppins', 600], ['Caveat-700.woff2', 'Annot', 700]]

const image = f => { if (!f || !existsSync(f)) return null; const ext = f.split('.').pop().toLowerCase(); return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${readFileSync(f).toString('base64')}` }

export function effet(E, { clamp, doux, rebond, esc, couleurs, dossier = '' }) {
  const chemin = f => f && (f.includes(':') || f.startsWith('/') ? f : dossier + '/' + f)
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
  return null
}
