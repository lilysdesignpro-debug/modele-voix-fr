// (08/11) Les effets restent hors de ce que l'appli recouvre (zones de marges.mjs) : mesurés au pixel, puis déplacés ou un peu réduits.
// Partagé par collage.mjs et le catalogue. Renvoie { k, ox, oy, dx, dy } (k = 1 et dx = dy = 0 : rien à faire) ou null (ne tient pas : pas d'effet).
// la boîte visible de ce qui est dans #s (images, fonds, textes ; pas les calques plein écran invisibles)
const MESURE = page => page.evaluate(async () => { await Promise.all([...document.images].map(i => i.complete && i.naturalWidth ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 3000) }))) /* (08/11) une image pas encore chargée mesurait 0 px : l'objet passait sur la carte de fin */
  let L = 1e9, T = 1e9, R = -1e9, B = -1e9
    const prend = r => { if (r.width < 2 || r.height < 2 || (r.width >= 700 && r.height >= 1200)) return; L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); B = Math.max(B, r.bottom) }
    const cache = n => { for (let p = n; p && p.id !== 's'; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) < 0.05) return true } return false }
    for (const n of document.getElementById('s').querySelectorAll('*')) { if (cache(n)) continue
      const c = getComputedStyle(n), tag = n.tagName.toLowerCase()
      if (tag === 'svg' || tag === 'g' || tag === 'defs') { } else if (n instanceof SVGElement) { if (!['clippath', 'mask', 'lineargradient', 'radialgradient', 'stop', 'filter'].includes(tag)) prend(n.getBoundingClientRect()) }
      else if (tag === 'img' || (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent') || c.backgroundImage !== 'none' || parseFloat(c.borderTopWidth) > 0 || parseFloat(c.borderLeftWidth) > 0) prend(n.getBoundingClientRect())
      for (const x of n.childNodes) if (x.nodeType === 3 && x.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(x); for (const q of r.getClientRects()) prend(q) } }
    return R > L ? [L, T, R, B] : null })
// la boîte d'un dessin donné (pour les éléments fixes, qui ne bougent pas : la carte de fin…)
export async function boiteDe(page, html) { await page.evaluate(x => { document.getElementById('s').innerHTML = x }, html); return MESURE(page) }
// (08/11) obstacles : les boîtes [l, t, r, b] des autres effets à l'écran au même moment ; jamais deux effets l'un sur l'autre.
export async function placerDansZone(page, A, ZM, fc, obstacles = []) {
  const boiteEffet = () => MESURE(page)
    let L = 1e9, T = 1e9, R = -1e9, B = -1e9
    for (const dt of new Set([A.anim, (A.anim + A.duree) / 2, A.duree - 0.35].map(x => Math.max(0.05, Math.min(A.duree - 0.3, x))))) {
      await page.evaluate(x => { document.getElementById('s').innerHTML = x }, A.brut(dt)); const q = await boiteEffet(); if (!q) continue
      L = Math.min(L, q[0]); T = Math.min(T, q[1]); R = Math.max(R, q[2]); B = Math.max(B, q[3]) }
    if (R <= L) return { k: 1, ox: 0, oy: 0, dx: 0, dy: 0, boite: null }
    const x0 = ZM.cote, x1 = 720 - ZM.cote, y0 = ZM.haut, y1 = 1280 - ZM.bas, xi = 720 - ZM.droite, yi = ZM.droiteDe
    const dedans = c => c.l >= x0 - 1 && c.r <= x1 + 1 && c.t >= y0 - 1 && c.b <= y1 + 1 && !(c.r > xi + 1 && c.b > yi + 1)
    const libre = c => !obstacles.some(o => Math.min(c.r, o[2] + 24) - Math.max(c.l, o[0] - 24) > 0 && Math.min(c.b, o[3] + 24) - Math.max(c.t, o[1] - 24) > 0) // 24 px d'air entre deux effets
    if (dedans({ l: L, t: T, r: R, b: B }) && libre({ l: L, t: T, r: R, b: B })) return { k: 1, ox: 0, oy: 0, dx: 0, dy: 0, boite: [L, T, R, B] }
    const surVisage = c => fc.reduce((m, v) => Math.max(m, Math.max(0, Math.min(c.r, v[2]) - Math.max(c.l, v[0])) * Math.max(0, Math.min(c.b, v[3]) - Math.max(c.t, v[1]))), 0) / Math.max(1, (c.r - c.l) * (c.b - c.t))
    const essai = (k, ox, oy, dx, dy) => ({ k, ox, oy, dx, dy, l: ox + (L - ox) * k + dx, r: ox + (R - ox) * k + dx, t: oy + (T - oy) * k + dy, b: oy + (B - oy) * k + dy })
    const recale = c => { const ex = c.l < x0 ? x0 - c.l : c.r > x1 ? x1 - c.r : 0, ey = c.t < y0 ? y0 - c.t : c.b > y1 ? y1 - c.b : 0; return [essai(c.k, c.ox, c.oy, c.dx + ex, c.dy + ey), ...(c.r + ex > xi ? [essai(c.k, c.ox, c.oy, c.dx + ex + xi - (c.r + ex), c.dy + ey)] : []), ...(c.b + ey > yi ? [essai(c.k, c.ox, c.oy, c.dx + ex, c.dy + ey + yi - (c.b + ey))] : [])] }
    const cands = []
    for (const k of [1, 0.95, 0.9, 0.85, 0.8, 0.75]) for (const ox of [L, (L + R) / 2, R]) for (const oy of [T, (T + B) / 2, B]) { cands.push(...recale(essai(k, ox, oy, 0, 0)))
      for (const o of obstacles) { const c0 = essai(k, ox, oy, 0, 0); cands.push(...recale(essai(k, ox, oy, 0, o[1] - 30 - c0.b)), ...recale(essai(k, ox, oy, 0, o[3] + 30 - c0.t))) } }
    const centre = Math.abs((L + R) / 2 - 360) < 12
    const f0 = surVisage({ l: L, t: T, r: R, b: B }), bon = cands.filter(c => dedans(c) && libre(c) && surVisage(c) <= f0 + 0.03 && !(A.posePasEnHaut && c.dy < -20)) /* un objet posé sur la table ne remonte jamais à hauteur de tête */.map(c => ({ c, cout: (1 - c.k) * 600 + Math.hypot(c.dx, c.dy) + (centre && Math.abs((c.l + c.r) / 2 - 360) > 4 ? 150 : 0) })).sort((a, b) => a.cout - b.cout)[0]?.c /* (08/11) un effet centré reste centré : on le remonte ou on le réduit plutôt que de le décaler sur le côté */
    return bon ? { ...bon, boite: [bon.l, bon.t, bon.r, bon.b] } : null
}
