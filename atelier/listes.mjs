// LES LISTES ANIMÉES (validées par Aurélie le 04/11/2026) : ticket de caisse, étiqueteuse, post-it, tampon.
// Partagées par les deux moteurs (montage.mjs pour classique et prof, collage.mjs pour les autres styles).
//   liste({ type, titre, items, tampon, duree }, outils) → { hauteur, duree, anim, dessin(dt, y), sons(t0) }
// `dt` = le temps depuis le début de la liste ; `y` = le haut de la liste dans l'image (720 × 1280).
// Toujours SES mots : la liste ne fait que mettre en scène ce qu'elle dit.
export const POLICES_LISTES = [['SpaceMono-700.woff2', 'Mono', 700], ['GloriaHallelujah-400.woff2', 'Carnet', 400], ['CourierPrime-700.woff2', 'Machine', 700], ['Montserrat-900.woff2', 'Rond', 900]]

export function liste(L, { clamp, doux, rebond, esc, couleurs }) {
  const items = (L.items || []).slice(0, 5), n = items.length
  if (!n || !['ticket', 'etiqueteuse', 'postit', 'tampon'].includes(L.type)) return null
  const pas = L.type === 'ticket' ? 0.45 : 0.6
  const hauteur = { ticket: 130 + n * 44, etiqueteuse: 40 + n * 74, postit: n > 3 ? 420 : 220, tampon: 150 + n * 50 }[L.type]
  const anim = 0.4 + n * pas + 0.4 // le temps que tout soit posé
  const duree = L.duree ?? Math.max(3.5, 1.2 + n * pas + 1.6)
  const dessin = {
    // le ticket sort de l'imprimante, ligne après ligne
    ticket: (dt, y) => { const sorti = clamp(dt / (0.4 + n * pas), 0, 1), hP = 60 + (hauteur - 60) * sorti
      const lignes = [L.titre ? '** ' + L.titre.toUpperCase() + ' **' : '** MA LISTE **', ...items.map((x, k) => (k + 1) + 'x ' + x)]
      return '<div style="position:absolute;left:130px;width:460px;top:' + y + 'px;height:34px;border-radius:12px;background:linear-gradient(#e9e9ea,#bdbdc2);box-shadow:0 6px 16px rgba(0,0,0,.3)"><div style="position:absolute;left:30px;right:30px;top:15px;height:6px;border-radius:3px;background:#2b2b2e"></div></div>'
        + '<div style="position:absolute;left:160px;width:400px;top:' + (y + 18) + 'px;height:' + hP + 'px;overflow:hidden;background:#fbfbf7;box-shadow:0 8px 18px rgba(0,0,0,.25);clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),' + Array.from({ length: 20 }, (_, i) => (100 - (i + 0.5) * 5) + '% ' + (i % 2 ? 'calc(100% - 10px)' : '100%')).join(',') + ',0 calc(100% - 10px))">'
        + '<div style="position:absolute;left:0;right:0;bottom:16px;padding:0 26px;font:700 24px/1.8 Mono,monospace;color:#2b2b2e">' + lignes.map((l, k) => '<div style="display:flex;justify-content:' + (k ? 'space-between' : 'center') + '"><span>' + esc(l) + '</span>' + (k ? '<span style="color:' + couleurs.accent + '">✓</span>' : '') + '</div>').join('') + '</div></div>' },
    // l'étiqueteuse : chaque bande rouge s'imprime et glisse en place
    etiqueteuse: (dt, y) => items.map((x, k) => { const p = clamp((dt - 0.2 - k * pas) / 0.25, 0, 1); if (!p) return ''
      const n2 = Math.ceil(x.length * clamp((dt - 0.2 - k * pas) / 0.35, 0, 1))
      return '<div style="position:absolute;left:' + (100 + (k % 2) * 30 + (1 - doux(p)) * 260) + 'px;top:' + (y + k * 74) + 'px;transform:rotate(' + ((k % 3) - 1) * 1.6 + 'deg);background:' + couleurs.etiquette + ';padding:9px 18px;border-radius:4px;box-shadow:0 4px 0 rgba(0,0,0,.25),0 8px 16px rgba(0,0,0,.25);font:700 34px/1 Mono,monospace;letter-spacing:0.05em;color:#fff;text-shadow:0 -1px 0 rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.25);white-space:nowrap">' + esc(x.toUpperCase().slice(0, n2)) + '</div>' }).join(''),
    // les post-it se collent un par un, un peu de travers
    postit: (dt, y) => items.map((x, k) => { const p = rebond((dt - 0.15 - k * pas) / 0.22); if (dt < 0.15 + k * pas) return ''
      const col = k % 2, lig = Math.floor(k / 2), rot = [-6, 5, 3, -4, 6][k]
      return '<div style="position:absolute;left:' + (n === 1 ? 260 : 120 + col * 250) + 'px;top:' + (y + lig * 205) + 'px;width:200px;height:190px;transform:rotate(' + rot + 'deg) scale(' + (1.35 - 0.35 * clamp(p, 0, 1.1)) + ');background:' + ['#FFF07A', '#FFC7DD', '#BFE8FF', '#C9F2B9', '#FFD9A8'][k] + ';box-shadow:0 10px 18px rgba(0,0,0,.25);padding:22px 16px;font:400 31px/1.12 Carnet,cursive;color:#2a2a2a;display:flex;align-items:center;justify-content:center;text-align:center">' + esc(x) + '</div>' }).join(''),
    // la liste papier, puis le tampon qui frappe
    tampon: (dt, y) => { const tT = 0.4 + n * pas, pT = clamp((dt - tT) / 0.18, 0, 1)
      return '<div style="position:absolute;left:120px;width:480px;top:' + y + 'px;height:' + hauteur + 'px;background:#F6F1E6;box-shadow:0 10px 22px rgba(0,0,0,.25);transform:rotate(-1.5deg);padding:26px 30px;font:700 26px/1.85 Machine,monospace;color:#2B1B17">'
        + (L.titre ? '<div style="font-size:22px;letter-spacing:.12em;opacity:.7">' + esc(L.titre.toUpperCase()) + '</div>' : '')
        + items.map((x, k) => '<div style="opacity:' + clamp((dt - 0.2 - k * pas) / 0.2, 0, 1) + ';border-bottom:1.5px dashed rgba(43,27,23,.3)">— ' + esc(x) + '</div>').join('')
        + (dt >= tT ? '<div style="position:absolute;right:26px;bottom:22px;transform:rotate(-14deg) scale(' + (2.2 - 1.2 * pT) + ');opacity:' + (0.25 + 0.65 * pT) + ';border:6px solid ' + couleurs.tampon + ';border-radius:10px;padding:4px 16px;font:900 46px/1 Rond,sans-serif;letter-spacing:.08em;color:' + couleurs.tampon + ';mix-blend-mode:multiply">' + esc((L.tampon || 'FAIT').toUpperCase()) + '</div>' : '') + '</div>' },
  }[L.type]
  const sons = t0 => L.type === 'ticket' ? [{ t: t0 + 0.1, fam: 'clavier', vol: 0.07, duree: 0.4 + n * pas }]
    : L.type === 'tampon' ? [...items.map((_, k) => ({ t: t0 + 0.2 + k * pas, fam: 'clic', vol: 0.07 })), { t: t0 + 0.4 + n * pas, fam: 'pop', vol: 0.14 }]
    : items.map((_, k) => ({ t: t0 + 0.15 + k * pas, fam: L.type === 'postit' ? 'pop' : 'clic', vol: 0.1 }))
  return { hauteur, duree, anim, dessin, sons }
}
