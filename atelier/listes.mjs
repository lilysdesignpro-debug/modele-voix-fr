// LES LISTES ANIMÉES (validées par Aurélie le 04/11/2026) : ticket de caisse, étiqueteuse, post-it, tampon.
// Partagées par les deux moteurs (montage.mjs pour classique et prof, collage.mjs pour les autres styles).
//   liste({ type, titre, items, tampon, duree }, outils) → { hauteur, duree, anim, dessin(dt, y), sons(t0) }
// `dt` = le temps depuis le début de la liste ; `y` = le haut de la liste dans l'image (720 × 1280).
// Toujours SES mots : la liste ne fait que mettre en scène ce qu'elle dit.
export const POLICES_LISTES = [['SpaceMono-700.woff2', 'Mono', 700], ['GloriaHallelujah-400.woff2', 'Carnet', 400], ['CourierPrime-700.woff2', 'Machine', 700], ['Montserrat-900.woff2', 'Rond', 900]]

export function liste(L, { clamp, doux, rebond, esc, couleurs }) {
  const items = (L.items || []).slice(0, 5), n = items.length
  if (!n || !['ticket', 'etiqueteuse', 'postit', 'tampon', 'notes'].includes(L.type)) return null
  const pas = L.type === 'ticket' ? 0.45 : 0.6
  const hauteur = { ticket: 130 + n * 44, etiqueteuse: 40 + n * 74, postit: n > 3 ? 420 : 220, tampon: 150 + n * 50, notes: 130 + n * 62 }[L.type]
  const anim = (L.type === 'notes' ? 0.7 : 0.4) + n * pas + 0.4 // le temps que tout soit posé
  const duree = L.duree ?? Math.max(3.5, 1.2 + n * pas + 1.6)
  const looksNotes = { // looksNotes
    // sombre : widget noir façon mode nuit, coches lumineuses à SA couleur
    sombre: (dt, y) => { const p = clamp(rebond(dt / 0.42), 0, 1.06), q = Math.min(1, p), coul = couleurs.coche || '#F25C9A', faits = items.filter((_, k) => dt >= 0.8 + k * pas + 0.18).length
      return '<div style="position:absolute;left:130px;width:460px;top:' + y + 'px;transform:translateY(' + ((1 - q) * 120).toFixed(1) + 'px) scale(' + (0.88 + 0.12 * p).toFixed(3) + ');opacity:' + Math.min(1, dt / 0.15).toFixed(2) + ';background:linear-gradient(160deg,#2a2a2e,#141416);border-radius:34px;box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 26px 60px rgba(0,0,0,.45);padding:26px 30px 16px;color:#fff">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div style="font:800 34px/1.1 Poppins,sans-serif">' + esc(L.titre || 'To do') + '</div><div style="font:700 22px/1 Poppins,sans-serif;color:' + coul + '">' + faits + '/' + n + '</div></div>'
        + items.map((x, k) => { const t0 = 0.8 + k * pas, c = clamp((dt - t0) / 0.18, 0, 1), r = clamp(rebond((dt - t0) / 0.22), 0, 1.15)
          return '<div style="display:flex;align-items:center;gap:18px;height:62px"><span style="position:relative;flex:none;width:32px;height:32px;border-radius:10px;box-shadow:inset 0 0 0 2.5px ' + (c > 0 ? coul : '#4a4a50') + ';' + (c > 0 ? 'background:' + coul + ';box-shadow:0 0 18px ' + coul + '99;transform:scale(' + r.toFixed(2) + ')' : '') + ';display:grid;place-items:center;font:900 20px/1 Poppins;color:#111">' + (c > 0 ? '✓' : '') + '</span><span style="font:600 28px/1.1 Poppins,sans-serif;color:' + (c >= 1 ? '#7d7d85' : '#f2f2f7') + '">' + esc(x) + '</span></div>' }).join('') + '</div>' },
    // pastilles : pas de carte, chaque ligne est une capsule qui pope, se coche et glisse un peu
    pastilles: (dt, y) => items.map((x, k) => { const t0 = 0.25 + k * 0.18, p = clamp(rebond((dt - t0) / 0.3), 0, 1.08); if (dt < t0) return ''
      const tc = 0.8 + k * pas, c = clamp((dt - tc) / 0.18, 0, 1), coul = couleurs.coche || '#F25C9A', dec = [0, 34, 12, 46, 20][k % 5]
      return '<div style="position:absolute;left:' + (110 + dec) + 'px;top:' + (y + k * 74) + 'px;display:flex;align-items:center;gap:14px;padding:12px 26px 12px 14px;border-radius:999px;background:' + (c >= 1 ? coul : '#fff') + ';box-shadow:0 12px 28px rgba(0,0,0,.22);transform:scale(' + p.toFixed(3) + ') translateX(' + (c * 14).toFixed(1) + 'px);transform-origin:left center">'
        + '<span style="flex:none;width:34px;height:34px;border-radius:50%;background:' + (c >= 1 ? '#fff' : '#f0f0f3') + ';display:grid;place-items:center;font:900 20px/1 Poppins;color:' + coul + '">' + (c > 0 ? '✓' : '') + '</span><span style="font:700 28px/1 Poppins,sans-serif;color:' + (c >= 1 ? '#fff' : '#1c1c1e') + '">' + esc(x) + '</span></div>' }).join(''),
    // anneau : l'anneau de progression d'une appli de suivi, le pourcentage au centre, la liste à côté
    anneau: (dt, y) => { const p = clamp(rebond(dt / 0.42), 0, 1.06), q = Math.min(1, p), coul = couleurs.coche || '#F25C9A'
      const faitsF = items.reduce((s2, _, k) => s2 + clamp((dt - 0.8 - k * pas) / 0.35, 0, 1), 0), R2 = 70, L2 = 2 * Math.PI * R2
      return '<div style="position:absolute;left:70px;width:580px;top:' + y + 'px;transform:translateY(' + ((1 - q) * 100).toFixed(1) + 'px) scale(' + (0.9 + 0.1 * p).toFixed(3) + ');opacity:' + Math.min(1, dt / 0.15).toFixed(2) + ';display:flex;gap:26px;align-items:center;background:rgba(255,255,255,.95);border-radius:36px;padding:24px 28px;box-shadow:0 24px 60px rgba(0,0,0,.26)">'
        + '<div style="position:relative;flex:none;width:170px;height:170px"><svg width="170" height="170" viewBox="0 0 170 170" style="transform:rotate(-90deg)"><circle cx="85" cy="85" r="' + R2 + '" fill="none" stroke="#ececf0" stroke-width="16"/><circle cx="85" cy="85" r="' + R2 + '" fill="none" stroke="' + coul + '" stroke-width="16" stroke-linecap="round" stroke-dasharray="' + L2.toFixed(1) + '" stroke-dashoffset="' + (L2 * (1 - faitsF / n)).toFixed(1) + '"/></svg><div style="position:absolute;inset:0;display:grid;place-items:center;font:800 40px/1 Poppins,sans-serif;color:#111">' + Math.round(100 * faitsF / n) + '%</div></div>'
        + '<div style="flex:1;min-width:0"><div style="font:800 30px/1.1 Poppins,sans-serif;color:#111;margin-bottom:10px">' + esc(L.titre || 'To do') + '</div>' + items.map((x, k) => { const c = clamp((dt - 0.8 - k * pas) / 0.18, 0, 1)
          return '<div style="display:flex;align-items:center;gap:10px;height:44px;font:600 24px/1.1 Poppins,sans-serif;color:' + (c >= 1 ? '#a1a1a8' : '#1c1c1e') + '"><span style="flex:none;width:12px;height:12px;border-radius:50%;background:' + (c > 0 ? coul : '#d1d1d6') + '"></span>' + esc(x) + '</div>' }).join('') + '</div></div>' },
  }
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
    // la carte Notes jaillit de son geste, puis chaque ligne se coche
    notes: (dt, y) => { if (L.look && looksNotes[L.look]) return looksNotes[L.look](dt, y) // notesModerne
      const p = clamp(rebond(dt / 0.42), 0, 1.06), q = Math.min(1, p), coul = couleurs.coche || '#F25C9A', faits = items.filter((_, k) => dt >= 0.8 + k * pas + 0.18).length
      const fin = 0.8 + (n - 1) * pas + 0.3, eclat = clamp((dt - fin) / 0.5, 0, 1)
      const tete = '<div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:14px"><div><div style="font:600 17px/1 Poppins,sans-serif;letter-spacing:.14em;color:#8e8e93">AUJOURD’HUI</div><div style="font:800 36px/1.15 Poppins,sans-serif;color:#111;margin-top:6px">' + esc(L.titre || 'To do') + '</div></div>'
        + '<div style="font:700 22px/1 Poppins,sans-serif;color:' + coul + ';background:' + coul + '1f;padding:8px 14px;border-radius:999px">' + faits + '/' + n + '</div></div>'
        + '<div style="height:8px;border-radius:4px;background:#ececf0;overflow:hidden;margin-bottom:10px"><div style="height:100%;width:' + (100 * faits / n).toFixed(1) + '%;border-radius:4px;background:' + coul + ';transition:none"></div></div>'
      const lignes = items.map((x, k) => { const t0 = 0.8 + k * pas, c = clamp((dt - t0) / 0.18, 0, 1), r = clamp(rebond((dt - t0) / 0.22), 0, 1.15), tr = clamp((dt - t0 - 0.08) / 0.22, 0, 1)
        const coche = '<svg style="position:absolute;inset:0" viewBox="0 0 34 34"><path d="M9.5 17.5 L15 23 L25 11.5" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="26" stroke-dashoffset="' + (26 * (1 - tr)).toFixed(1) + '"/></svg>'
        return '<div style="display:flex;align-items:center;gap:18px;height:64px;border-top:' + (k ? '1px solid #f0f0f3' : 'none') + '">'
          + '<span style="position:relative;flex:none;width:34px;height:34px;border-radius:50%;box-shadow:inset 0 0 0 2.5px ' + (c > 0 ? coul : '#d1d1d6') + '">' + (c > 0 ? '<span style="position:absolute;inset:0;border-radius:50%;background:' + coul + ';transform:scale(' + r.toFixed(2) + ')"></span>' + coche : '') + '</span>'
          + '<span style="font:600 28px/1.1 Poppins,sans-serif;color:' + (c >= 1 ? '#a1a1a8' : '#1c1c1e') + ';transform:translateX(' + (c >= 1 ? 4 : 0) + 'px)">' + esc(x) + '</span></div>' }).join('')
      const points = eclat > 0 && eclat < 1 ? Array.from({ length: 10 }, (_, k) => { const a = k / 10 * 6.283 + 0.3, d = 40 + 120 * doux(eclat); return '<span style="position:absolute;right:' + (40 - Math.cos(a) * d).toFixed(0) + 'px;top:' + (30 + Math.sin(a) * d).toFixed(0) + 'px;width:10px;height:10px;border-radius:50%;background:' + (k % 2 ? coul : '#FFD166') + ';opacity:' + (1 - eclat).toFixed(2) + '"></span>' }).join('') : ''
      return '<div style="position:absolute;left:130px;width:460px;top:' + y + 'px;perspective:900px"><div style="position:relative;transform:translateY(' + ((1 - q) * 140).toFixed(1) + 'px) rotateX(' + ((1 - q) * 28).toFixed(1) + 'deg) scale(' + (0.86 + 0.14 * p).toFixed(3) + ');opacity:' + Math.min(1, dt / 0.15).toFixed(2) + ';background:rgba(255,255,255,.94);border-radius:34px;box-shadow:0 2px 0 rgba(255,255,255,.7) inset,0 24px 60px rgba(0,0,0,.28),0 4px 14px rgba(0,0,0,.12);padding:26px 30px 14px">' + tete + lignes + points + '</div></div>' },
  }[L.type]
  const sons = t0 => L.type === 'ticket' ? [{ t: t0 + 0.1, fam: 'clavier', vol: 0.07, duree: 0.4 + n * pas }]
    : L.type === 'tampon' ? [...items.map((_, k) => ({ t: t0 + 0.2 + k * pas, fam: 'clic', vol: 0.07 })), { t: t0 + 0.4 + n * pas, fam: 'pop', vol: 0.14 }]
    : L.type === 'notes' ? [{ t: t0, fam: 'whoosh', vol: 0.08 }, ...items.map((_, k) => ({ t: t0 + 0.7 + k * pas, fam: 'clic', vol: 0.09 }))]
    : items.map((_, k) => ({ t: t0 + 0.15 + k * pas, fam: L.type === 'postit' ? 'pop' : 'clic', vol: 0.1 }))
  return { hauteur, duree, anim, dessin, sons }
}
