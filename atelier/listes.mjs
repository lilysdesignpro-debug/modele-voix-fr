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
    // (07/11) ticket RÉALISTE : papier thermique (grain, impression grise un peu passée, légèrement floue), bord arraché irrégulier,
    // le papier ondule et se courbe en sortant de la fente (ombre qui suit), coches au stylo bille.
    ticket: (dt, y) => { const sorti = clamp(dt / (0.4 + n * pas), 0, 1), hP = 60 + (hauteur - 60) * sorti, oscille = Math.sin(dt * 7) * (1 - sorti) * 1.2 + Math.sin(dt * 1.7) * 0.4
      const lignes = [L.titre ? L.titre.toUpperCase() : 'MA LISTE', ...items.map((x, k) => (k + 1) + 'x ' + x)]
      const bord = 'polygon(0 0,100% 0,' + Array.from({ length: 27 }, (_, i) => { const xx = 100 - i * 100 / 26, j = ((i * 7919) % 13) / 13; return xx.toFixed(1) + '% calc(100% - ' + (i % 2 ? 2 + j * 4 : 9 + j * 5).toFixed(1) + 'px)' }).join(',') + ')'
      const grain = 'url(data:image/svg+xml;base64,' + Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 .4 0 0 0 0 .4 0 0 0 0 .38 0 0 0 .45 0'/></filter><rect width='240' height='240' filter='url(#g)'/></svg>").toString('base64') + ')'
      return '<div style="position:absolute;left:150px;width:420px;top:' + (y + 26) + 'px;height:' + (hP - 6) + 'px;background:rgba(25,20,15,.42);filter:blur(10px);transform:translate(12px,16px) rotate(' + (oscille * 0.8).toFixed(2) + 'deg);transform-origin:50% 0"></div>'
        + '<div style="position:absolute;left:160px;width:400px;top:' + (y + 18) + 'px;height:' + hP + 'px;transform:rotate(' + oscille.toFixed(2) + 'deg);transform-origin:50% 0;clip-path:' + bord + ';background:linear-gradient(90deg,#e9e8e2,#fbfbf6 9%,#fdfdf9 50%,#f6f5ef 88%,#e2e1da),#fbfbf6;overflow:hidden">'
        + '<div style="position:absolute;inset:0;background:' + grain + ';opacity:.35;mix-blend-mode:multiply"></div>'
        + '<div style="position:absolute;left:0;right:0;top:0;height:40px;background:linear-gradient(rgba(0,0,0,.16),rgba(0,0,0,0))"></div>'
        + '<div style="position:absolute;left:0;right:0;bottom:18px;padding:0 26px;font:700 23px/1.75 Mono,monospace;color:#2e2e31;opacity:.92;filter:blur(.3px)">'
        + lignes.map((l, k) => '<div style="display:flex;justify-content:' + (k ? 'space-between' : 'center') + ';' + (k === 1 ? 'border-top:2px dashed rgba(60,60,64,.55);padding-top:4px;margin-top:2px' : '') + '"><span>' + esc(l) + '</span>' + (k ? '<span style="font:400 30px/1 Carnet,cursive;color:#1f3d8a;opacity:' + clamp((dt - 0.6 - k * pas) / 0.2, 0, 1).toFixed(2) + ';filter:none;transform:rotate(-8deg) translateY(-2px);display:inline-block">✓</span>' : '') + '</div>').join('') + '</div></div>'
        + '<div style="position:absolute;left:120px;width:480px;top:' + y + 'px;height:38px;border-radius:14px;background:linear-gradient(#f2f2f3,#c9c9ce 55%,#a9a9b0);box-shadow:0 10px 18px rgba(0,0,0,.35),inset 0 1px 0 #fff"><div style="position:absolute;left:34px;right:34px;top:16px;height:7px;border-radius:4px;background:linear-gradient(#0d0d0f,#3a3a3f);box-shadow:0 1px 0 rgba(255,255,255,.6)"></div></div>' },
    // l'étiqueteuse : chaque bande rouge s'imprime et glisse en place
    // (07/11) version réaliste (ruban brillant, lettres en relief) REFUSÉE par Aurélie : « trop bizarre, on lit mal ». On garde celle-ci.
    etiqueteuse: (dt, y) => items.map((x, k) => { const p = clamp((dt - 0.2 - k * pas) / 0.25, 0, 1); if (!p) return ''
      const n2 = Math.ceil(x.length * clamp((dt - 0.2 - k * pas) / 0.35, 0, 1))
      return '<div style="position:absolute;left:' + (100 + (k % 2) * 30 + (1 - doux(p)) * 260) + 'px;top:' + (y + k * 74) + 'px;transform:rotate(' + ((k % 3) - 1) * 1.6 + 'deg);background:' + couleurs.etiquette + ';padding:9px 18px;border-radius:4px;box-shadow:0 4px 0 rgba(0,0,0,.25),0 8px 16px rgba(0,0,0,.25);font:700 34px/1 Mono,monospace;letter-spacing:0.05em;color:#fff;text-shadow:0 -1px 0 rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.25);white-space:nowrap">' + esc(x.toUpperCase().slice(0, n2)) + '</div>' }).join(''),
    // les post-it se collent un par un, un peu de travers
    // (07/11) postit RÉALISTE : grain du papier, bande collante à plat en haut, bas qui se soulève (ombre plus large dessous),
    // encre qui boit le papier ; il est plaqué d'en haut (grand + ombre haute), se colle, puis on le lisse d'un petit tassement.
    postit: (dt, y) => items.map((x, k) => { const t0 = 0.15 + k * pas; if (dt < t0) return ''
      const u = clamp((dt - t0) / 0.26, 0, 1), e = 1 - Math.pow(1 - u, 3), ecr = u >= 1 ? Math.exp(-(dt - t0 - 0.26) * 14) * Math.sin((dt - t0 - 0.26) * 30) * 0.025 : 0
      const col = k % 2, lig = Math.floor(k / 2), rot = [-6, 5, 3, -4, 6][k], h = 1 - e, c = [['#FFF27E', '#F4DE5C'], ['#FFC9DE', '#F3AFCB'], ['#C4E9FF', '#A9D8F2'], ['#CDF3BD', '#B3E2A1'], ['#FFDCAD', '#F5C68A']][k]
      const grain = 'url(data:image/svg+xml;base64,' + Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' seed='" + (k + 3) + "'/><feColorMatrix values='0 0 0 0 .35 0 0 0 0 .3 0 0 0 0 .2 0 0 0 .5 0'/></filter><rect width='200' height='200' filter='url(#g)'/></svg>").toString('base64') + ')'
      return '<div style="position:absolute;left:' + (n === 1 ? 260 : 120 + col * 250) + 'px;top:' + (y + lig * 205) + 'px;width:200px;height:190px;transform:rotate(' + rot + 'deg) scale(' + (1 + 0.3 * h + ecr).toFixed(3) + ',' + (1 + 0.3 * h - ecr).toFixed(3) + ');transform-origin:50% 20%;opacity:' + clamp(u * 5, 0, 1).toFixed(2) + '">'
        + '<div style="position:absolute;left:6px;right:2px;top:' + (30 + 30 * h).toFixed(1) + 'px;bottom:' + (-6 - 26 * h).toFixed(1) + 'px;background:rgba(30,20,10,' + (0.34 - 0.16 * h).toFixed(2) + ');filter:blur(' + (7 + 14 * h).toFixed(1) + 'px);transform:skewX(-2deg)"></div>'
        + '<div style="position:absolute;inset:0;transform:perspective(700px) rotateX(' + (7 + 6 * h).toFixed(1) + 'deg);transform-origin:50% 0;background:linear-gradient(172deg,' + c[0] + ' 0%,' + c[0] + ' 55%,' + c[1] + ' 100%);box-shadow:0 1px 2px rgba(0,0,0,.18);overflow:hidden">'
        + '<div style="position:absolute;inset:0;background:' + grain + ';opacity:.22;mix-blend-mode:multiply"></div>'
        + '<div style="position:absolute;left:0;right:0;top:0;height:34px;background:linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,0))"></div>'
        + '<div style="position:absolute;left:0;right:0;bottom:0;height:46px;background:linear-gradient(rgba(255,255,255,0),rgba(255,255,255,.22) 70%,rgba(0,0,0,.06))"></div>'
        + '<div style="position:absolute;inset:0;padding:30px 16px 22px;display:flex;align-items:center;justify-content:center;text-align:center;font:400 ' + Math.min(31, Math.round(300 / Math.max(...String(x).split(' ').map(m => m.length)))) + 'px/1.12 Carnet,cursive;color:#23232c;opacity:.86;mix-blend-mode:multiply">' + esc(x) + '</div></div></div>' }).join(''),
    // la liste papier, puis le tampon qui frappe
    // (07/11) tampon RÉALISTE : vrai papier (grain, fibres, bord éclairé), frappe à la machine (encre inégale, lettres qui bavent
    // un peu), et un VRAI coup de tampon : l'encre se dépose de façon irrégulière (trous, bords plus chargés), la feuille encaisse le choc.
    tampon: (dt, y) => { const tT = 0.4 + n * pas, pT = clamp((dt - tT) / 0.18, 0, 1), choc = dt > tT + 0.18 ? Math.exp(-(dt - tT - 0.18) * 16) * Math.sin((dt - tT - 0.18) * 40) * 0.012 : 0
      const svg = s => 'url(data:image/svg+xml;base64,' + Buffer.from(s).toString('base64') + ')'
      const grain = svg("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' seed='11'/><feColorMatrix values='0 0 0 0 .45 0 0 0 0 .38 0 0 0 0 .28 0 0 0 .55 0'/></filter><rect width='300' height='300' filter='url(#g)'/></svg>")
      const usure = svg("<svg xmlns='http://www.w3.org/2000/svg' width='400' height='160'><filter id='u'><feTurbulence type='fractalNoise' baseFrequency='.06 .5' numOctaves='3' seed='4'/><feComponentTransfer><feFuncA type='discrete' tableValues='0 1 1 1 1 1 0 1'/></feComponentTransfer><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.6 -.15'/></filter><rect width='400' height='160' filter='url(#u)'/></svg>")
      return '<div style="position:absolute;left:120px;width:480px;top:' + y + 'px;height:' + hauteur + 'px;transform:rotate(-1.5deg) scale(' + (1 + choc) + ',' + (1 - choc) + ')">'
        + '<div style="position:absolute;inset:0;transform:translate(6px,12px);background:rgba(30,20,10,.35);filter:blur(12px)"></div>'
        + '<div style="position:absolute;inset:0;background:linear-gradient(160deg,#FBF7EC,#F3ECDC 60%,#EBE2CE);box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),inset 0 -14px 22px -14px rgba(90,60,30,.25);overflow:hidden;padding:26px 30px;font:700 26px/1.85 Machine,monospace;color:#2B1B17">'
        + '<div style="position:absolute;inset:0;background:' + grain + ';opacity:.28;mix-blend-mode:multiply"></div>'
        + '<div style="position:relative;opacity:.9;text-shadow:0 0 .6px rgba(43,27,23,.8),.4px .3px 0 rgba(43,27,23,.35)">'
        + (L.titre ? '<div style="font-size:22px;letter-spacing:.12em;opacity:.7">' + esc(L.titre.toUpperCase()) + '</div>' : '')
        + items.map((x, k) => '<div style="opacity:' + clamp((dt - 0.2 - k * pas) / 0.2, 0, 1) + ';border-bottom:1.5px dashed rgba(43,27,23,.3)">— ' + [...esc(x)].map((c, j) => '<span style="opacity:' + (0.78 + ((j * 37 + k * 11) % 9) / 40).toFixed(2) + '">' + c + '</span>').join('') + '</div>').join('') + '</div>'
        + (dt >= tT ? '<div style="position:absolute;right:26px;bottom:22px;transform:rotate(-14deg) scale(' + (2.2 - 1.2 * pT) + ');opacity:' + (0.2 + 0.7 * pT) + ';-webkit-mask-image:' + usure + ';-webkit-mask-size:100% 100%;mask-image:' + usure + ';mask-size:100% 100%;border:6px solid ' + couleurs.tampon + ';border-radius:10px;padding:4px 16px;font:900 46px/1 Rond,sans-serif;letter-spacing:.08em;color:' + couleurs.tampon + ';mix-blend-mode:multiply;filter:blur(.4px)">' + esc((L.tampon || 'FAIT').toUpperCase()) + '</div>' : '') + '</div></div>' },
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
