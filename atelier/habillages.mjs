// LES HABILLAGES : chaque style de montage a ses propres « goodies » (cartes, pastilles, carte de fin,
// page de chapitre), toujours aux COULEURS DE L'ÉLÈVE (sa couleur d'accent = celle de son mot fort).
//   moderne    : cartes façon iPhone → rythme, série
//   carnet     : papier ligné, scotch kraft, écriture à la main, entourages au feutre → carnet
//   tableau    : étapes numérotées, encadrés nets, flèches → prof
//   pop        : contour noir épais, ombre décalée pleine couleur, gros émojis → énergie
//   doux       : crème, coins très ronds, serif fine, filets → confidence
// Chaque fonction renvoie du HTML (ou null : on garde la carte « moderne » de montage.mjs).

const echap = t => String(t ?? '')
// Animation des pages de chapitre : p va de 0 à 1 pendant l'entrée, de 1 à 2 pendant qu'elle reste à l'écran.
const cl = x => Math.max(0, Math.min(1, x))
const doux = x => 1 - Math.pow(1 - x, 3)
const rebond = (x, s = 1.7) => x <= 0 ? 0 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)
// les n premières lettres d'un titre, sans casser le *mot fort*
const coupe = (titre, n) => { let r = '', k = 0, dedans = false; for (const c of titre) { if (k >= n) break; if (c === '*') { r += c; dedans = !dedans; continue } r += c; k++ } return dedans ? (r.endsWith('*') ? r.slice(0, -1) : r + '*') : r }

// Un trait « fait main » en SVG : un cercle imparfait, un soulignement, une flèche, une coche.
const entourage = (w, h, c, ep = 5) => `<svg width="${w}" height="${h}" viewBox="0 0 100 60" preserveAspectRatio="none" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-4deg);overflow:visible"><path d="M8 32 C 6 10, 60 2, 88 14 C 104 22, 96 50, 58 55 C 26 59, 4 48, 12 26 C 16 16, 30 9, 44 8" fill="none" stroke="${c}" stroke-width="${ep / 2}" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`
const souligne = (c, w = 160) => `<svg width="${w}" height="14" viewBox="0 0 160 14" style="display:block;margin-top:-4px"><path d="M2 9 C 40 3, 90 13, 158 5" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/></svg>`
const coche = c => `<svg width="30" height="26" viewBox="0 0 30 26" style="flex:none"><path d="M3 14 L11 22 L27 3" fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const fleche = c => `<svg width="70" height="40" viewBox="0 0 70 40" style="vertical-align:middle"><path d="M4 30 C 20 6, 44 4, 62 18 M50 8 L63 18 L49 26" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const scotch = (rot = -6, l = 120) => `<div style="position:absolute;left:50%;top:-16px;width:${l}px;height:34px;margin-left:-${l / 2}px;background:rgba(214,190,146,.82);transform:rotate(${rot}deg);box-shadow:0 1px 2px rgba(0,0,0,.12)"></div>`
const papier = (largeur, contenu, rot = -2, pad = '30px 30px 26px 66px') => `<div style="position:relative;width:${largeur}px;padding:${pad};background:#FBF8F1 repeating-linear-gradient(#FBF8F1 0 33px,#c9d8f2 33px 35px);border-radius:4px;transform:rotate(${rot}deg);box-shadow:0 10px 24px rgba(0,0,0,.25)"><div style="position:absolute;left:46px;top:0;bottom:0;width:2px;background:rgba(220,80,80,.45)"></div>${scotch()}${contenu}</div>`

export function habillage(nom, ctx) {
  const { accent, encre = '#222', main = "'Main',cursive", serif = "'Serif',serif", sys, emojiImg, fort } = ctx
  const M = `font-family:${main};font-weight:700`
  const H = {
    carnet: {
      carte(s) {
        if (s.type === 'notes' || s.type === 'checklist') return papier(380, `<div style="${M};font-size:38px;color:${accent};line-height:1">${echap(s.titre)}</div>${souligne(accent, 170)}${(s.items || []).map((x, n) => `<div style="visibility:${n < (s._vus ?? s.items.length) ? 'visible' : 'hidden'};${M};font-size:31px;color:${encre};line-height:35px;display:flex;gap:10px;align-items:center">${coche(accent)}${x}</div>`).join('')}`)
        if (s.type === 'notif' || s.type === 'bulle') return `<div style="position:relative;width:430px;padding:22px 26px 18px;background:#e2cfa9;border-radius:6px;transform:rotate(-2deg);box-shadow:0 8px 18px rgba(0,0,0,.22)">${scotch(4, 100)}<div style="display:flex;gap:14px;align-items:center">${emojiImg(s.emoji || '📌', 40)}<div style="${M};font-size:32px;color:#3b2b17;line-height:1.1">${echap(s.texte)}</div></div></div>`
        if (s.type === 'agenda' || s.type === 'calendrier') return papier(330, `<div style="${M};font-size:44px;color:${encre};line-height:1">${echap(s.mois)} ${s.annee || ''}</div>${souligne(accent, 150)}<div style="position:relative;display:inline-block;margin:14px 0 4px 10px;${M};font-size:84px;color:${accent};line-height:1">${s.debut || s.jour || 1}${entourage(150, 110, accent, 6)}</div><div style="${M};font-size:28px;color:${encre};line-height:35px">${echap(s.evenement || s.sous)}</div>`, 2)
        if (s.type === 'sondage') return papier(380, `<div style="${M};font-size:36px;color:${encre};line-height:35px">${echap(s.question)}</div>${(s.choix || ['OUI', 'NON']).map((c, n) => `<div style="display:flex;gap:12px;align-items:center;${M};font-size:32px;color:${encre};line-height:35px"><span style="position:relative;display:inline-block;width:26px;height:26px;border:3px solid ${encre};border-radius:3px;flex:none">${n ? '' : `<span style="position:absolute;left:-4px;top:-10px">${coche(accent)}</span>`}</span>${c}</div>`).join('')}`, -1.5)
        return null
      },
      pastille: ([e, mot]) => `<div style="position:relative;display:flex;gap:8px;align-items:center;background:#FBF8F1;border:1px solid #e3d8c3;padding:6px 16px 4px 10px;${M};font-size:28px;color:${encre};white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.18)">${scotch(-8, 54)}${emojiImg(e, 30)}${mot || ''}</div>`,
      carteFin: texte => `<div style="text-align:center;${M};font-size:52px;color:#fff;-webkit-text-stroke:7px ${accent};paint-order:stroke fill;line-height:1">${fort(texte)} ${fleche('#fff')}</div>`,
      // le chiffre s'écrit au feutre (tracé puis rempli), le cercle se dessine autour, le titre s'écrit lettre à lettre
      chapitre: (num, titre, p = 1) => {
        const e1 = cl(p / 0.5), plein = cl((p - 0.4) / 0.25), e2 = cl((p - 0.5) / 0.3), lettres = Math.round(titre.replace(/\*/g, '').length * cl((p - 0.6) / 0.35)), t = Math.max(0, p - 1)
        return `<div style="position:absolute;inset:0;background:#FBF8F1 repeating-linear-gradient(#FBF8F1 0 46px,#c9d8f2 46px 48px)"><div style="position:absolute;left:92px;top:0;bottom:0;width:3px;background:rgba(220,80,80,.45)"></div>
        <svg width="720" height="460" viewBox="0 0 720 460" style="position:absolute;left:0;top:250px;overflow:visible;transform:rotate(${(-2 + Math.sin(t * 6) * 1.2).toFixed(2)}deg) scale(${(1 + 0.04 * t).toFixed(3)});transform-origin:360px 230px">
          <text x="360" y="345" text-anchor="middle" style="font-family:${main};font-weight:700;font-size:330px" fill="${accent}" fill-opacity="${plein}" stroke="${accent}" stroke-width="7" stroke-linejoin="round" stroke-dasharray="2600" stroke-dashoffset="${Math.round(2600 * (1 - e1))}">${num}</text>
          <path d="M210 250 C 200 110, 450 70, 540 160 C 600 230, 540 360, 380 380 C 240 395, 170 320, 205 210 C 225 160, 300 120, 360 118" pathLength="100" fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="${(100 * (1 - e2)).toFixed(1)}"/>
        </svg>
        <div style="position:absolute;left:110px;right:96px;top:760px;text-align:center;${M};font-size:66px;color:${encre};line-height:1.1">${fort(coupe(titre, lettres))}</div></div>`
      },
    },
    tableau: {
      carte(s) {
        const etape = n => `<span style="width:40px;height:40px;border-radius:50%;background:${accent};color:#fff;font:800 22px ${sys.split(':')[1]};display:inline-flex;align-items:center;justify-content:center;flex:none">${n}</span>`
        if (s.type === 'notes' || s.type === 'checklist') return `<div style="${sys};width:420px;background:#fff;border-radius:16px;border-left:10px solid ${accent};padding:18px 22px;box-shadow:0 10px 24px rgba(0,0,0,.22)"><div style="font-size:27px;font-weight:800;color:#111;margin-bottom:10px">${echap(s.titre)}</div>${(s.items || []).map((x, n) => `<div style="visibility:${n < (s._vus ?? s.items.length) ? 'visible' : 'hidden'};display:flex;gap:12px;align-items:center;font-size:23px;color:#222;padding:5px 0">${etape(n + 1)}${x}</div>`).join('')}</div>`
        if (s.type === 'notif' || s.type === 'bulle') return `<div style="${sys};width:440px;background:#fff;border-radius:16px;border:3px solid ${accent};padding:14px 18px;display:flex;gap:14px;align-items:center;box-shadow:0 10px 24px rgba(0,0,0,.22)">${etape('!')}<div style="font-size:22px;color:#222;line-height:1.25"><b style="color:${accent}">${echap(s.titre)}</b><br>${echap(s.texte)}</div></div>`
        if (s.type === 'sondage') return `<div style="${sys};width:400px;background:#fff;border-radius:16px;padding:18px;box-shadow:0 10px 24px rgba(0,0,0,.22)"><div style="font-size:25px;font-weight:800;color:#111;margin-bottom:12px">${echap(s.question)}</div>${(s.choix || ['OUI', 'NON']).map((c, n) => `<div style="display:flex;gap:12px;align-items:center;margin-top:8px;padding:10px 12px;border-radius:12px;border:3px solid ${n ? '#ddd' : accent};font-size:22px;font-weight:700;color:#222">${etape(String.fromCharCode(65 + n))}${c}</div>`).join('')}</div>`
        return null
      },
      pastille: ([e, mot]) => `<div style="${sys};display:flex;gap:8px;align-items:center;background:${accent};color:#fff;border-radius:10px;padding:8px 14px;font-size:21px;font-weight:800;white-space:nowrap">${emojiImg(e, 28)}${mot || ''}</div>`,
      carteFin: texte => `<div style="text-align:center"><span style="${sys};display:inline-block;background:${accent};color:#fff;font-size:34px;font-weight:800;padding:12px 24px;border-radius:12px">${fort(texte)}</span></div>`,
      // « ÉTAPE » glisse depuis la gauche, un trait blanc se trace, le chiffre arrive avec un rebond, le titre monte
      chapitre: (num, titre, p = 1) => { const e = cl(p / 0.6), b = rebond(cl((p - 0.15) / 0.55)), ti = cl((p - 0.5) / 0.4), t = Math.max(0, p - 1); return `<div style="position:absolute;inset:0;background:${accent}"><div style="position:absolute;left:0;right:0;top:400px;text-align:center;${sys};color:#fff"><div style="font-size:42px;font-weight:800;letter-spacing:6px;transform:translateX(${Math.round(-500 * (1 - doux(e)))}px)">ÉTAPE</div><div style="height:6px;width:${Math.round(150 * doux(e))}px;background:#fff;margin:12px auto 0;border-radius:3px"></div><div style="font-size:240px;font-weight:900;line-height:1.05;transform:scale(${(b * (1 + 0.03 * t)).toFixed(3)})">${num}</div><div style="margin:6px 110px 0 70px;font-size:52px;font-weight:800;line-height:1.1;opacity:${ti};transform:translateY(${Math.round(40 * (1 - ti))}px)">${fort(titre)}</div></div></div>` },
    },
    pop: {
      carte(s) {
        const boite = (w, inner) => `<div style="${sys};width:${w}px;background:#fff;border:4px solid #111;border-radius:18px;box-shadow:9px 9px 0 ${accent};padding:16px 20px">${inner}</div>`
        if (s.type === 'notes' || s.type === 'checklist') return boite(390, `<div style="font-size:30px;font-weight:900;color:#111;margin-bottom:8px">${echap(s.titre)}</div>${(s.items || []).map((x, n) => `<div style="visibility:${n < (s._vus ?? s.items.length) ? 'visible' : 'hidden'};font-size:24px;font-weight:700;color:#111;padding:4px 0">⚡ ${x}</div>`).join('')}`)
        if (s.type === 'notif' || s.type === 'bulle') return boite(430, `<div style="display:flex;gap:12px;align-items:center">${emojiImg(s.emoji || '🔥', 44)}<div style="font-size:24px;font-weight:800;color:#111;line-height:1.2">${echap(s.texte)}</div></div>`)
        if (s.type === 'sondage') return boite(390, `<div style="font-size:28px;font-weight:900;color:#111;margin-bottom:10px;text-align:center">${echap(s.question)}</div>${(s.choix || ['OUI', 'NON']).map((c, n) => `<div style="margin-top:8px;border:3px solid #111;border-radius:12px;padding:10px;text-align:center;font-size:24px;font-weight:900;background:${n ? '#fff' : accent};color:${n ? '#111' : '#fff'}">${c}</div>`).join('')}`)
        return null
      },
      pastille: ([e, mot]) => `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:${mot ? 'auto' : '110px'};height:110px"><svg width="120" height="120" viewBox="0 0 100 100" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)"><polygon points="50,2 61,32 95,25 70,50 95,75 61,68 50,98 39,68 5,75 30,50 5,25 39,32" fill="${accent}" stroke="#111" stroke-width="3"/></svg><span style="position:relative">${emojiImg(e, 58)}</span>${mot ? `<span style="position:relative;${sys};font-size:22px;font-weight:900;color:#111;background:#fff;border:3px solid #111;border-radius:8px;padding:2px 8px;margin-left:-8px">${mot}</span>` : ''}</div>`,
      carteFin: texte => `<div style="text-align:center"><span style="${sys};display:inline-block;background:#fff;color:#111;border:4px solid #111;box-shadow:8px 8px 0 ${accent};font-size:36px;font-weight:900;padding:10px 22px;border-radius:14px;transform:rotate(-3deg)">${fort(texte)}</span></div>`,
      // le chiffre explose sur une étoile qui tourne, déborde, revient ; le titre claque juste après
      chapitre: (num, titre, p = 1) => { const b = rebond(cl(p / 0.55), 2.6), ti = rebond(cl((p - 0.45) / 0.4)), t = Math.max(0, p - 1); return `<div style="position:absolute;inset:0;background:${accent}"><svg width="900" height="900" viewBox="0 0 100 100" style="position:absolute;left:-90px;top:120px;transform:rotate(${Math.round(p * 40)}deg) scale(${(0.2 + 0.8 * cl(p / 0.4)).toFixed(3)})"><polygon points="50,2 58,30 86,14 70,40 98,50 70,60 86,86 58,70 50,98 42,70 14,86 30,60 2,50 30,40 14,14 42,30" fill="#fff" fill-opacity=".18"/></svg><div style="position:absolute;left:0;right:0;top:400px;text-align:center;${sys}"><div style="display:inline-block;font-size:300px;font-weight:900;color:#fff;-webkit-text-stroke:10px #111;paint-order:stroke fill;line-height:1;transform:rotate(${(-14 * (1 - b) - 4 + Math.sin(t * 9) * 2).toFixed(2)}deg) scale(${(b * (1 + 0.05 * Math.abs(Math.sin(t * 7)))).toFixed(3)})">${num}</div><div style="margin:20px 110px 0 70px;font-size:56px;font-weight:900;color:#111;line-height:1.05;transform:scale(${ti.toFixed(3)})">${fort(titre)}</div></div></div>` },
    },
    doux: {
      carte(s) {
        const boite = (w, inner) => `<div style="width:${w}px;background:rgba(251,248,241,.94);border-radius:30px;padding:22px 26px;box-shadow:0 12px 30px rgba(0,0,0,.18)">${inner}</div>`
        const T = `font-family:${serif};color:${encre}`
        if (s.type === 'notes' || s.type === 'checklist') return boite(380, `<div style="${T};font-size:32px;margin-bottom:6px">${echap(s.titre)}</div><div style="height:2px;width:60px;background:${accent};margin-bottom:10px"></div>${(s.items || []).map((x, n) => `<div style="visibility:${n < (s._vus ?? s.items.length) ? 'visible' : 'hidden'};${sys};font-size:22px;color:#444;padding:5px 0">◦ ${x}</div>`).join('')}`)
        if (s.type === 'notif' || s.type === 'bulle') return boite(420, `<div style="${T};font-size:27px;line-height:1.3;font-style:italic">« ${echap(s.texte)} »</div>`)
        if (s.type === 'sondage') return boite(380, `<div style="${T};font-size:30px;text-align:center;margin-bottom:12px">${echap(s.question)}</div>${(s.choix || ['OUI', 'NON']).map((c, n) => `<div style="margin-top:8px;border-radius:999px;padding:10px;text-align:center;${sys};font-size:22px;background:${n ? 'transparent' : accent};color:${n ? '#444' : '#fff'};border:2px solid ${accent}">${c}</div>`).join('')}`)
        return null
      },
      pastille: ([e, mot]) => `<div style="display:flex;gap:8px;align-items:center;background:rgba(251,248,241,.94);border-radius:999px;padding:7px 16px 7px 10px;font-family:${serif};font-size:24px;color:${encre};white-space:nowrap;box-shadow:0 6px 14px rgba(0,0,0,.15)">${emojiImg(e, 28)}${mot || ''}</div>`,
      carteFin: texte => `<div style="text-align:center;font-family:${serif};font-size:44px;color:#fff;font-style:italic;text-shadow:0 2px 12px rgba(0,0,0,.45)"><span style="display:inline-block;width:40px;height:2px;background:#fff;vertical-align:middle;margin-right:14px"></span>${fort(texte)}<span style="display:inline-block;width:40px;height:2px;background:#fff;vertical-align:middle;margin-left:14px"></span></div>`,
      // le chiffre monte doucement en fondu, le filet se tire, le titre apparaît ; puis un lent zoom
      chapitre: (num, titre, p = 1) => { const e = doux(cl(p / 0.6)), f = doux(cl((p - 0.3) / 0.4)), ti = cl((p - 0.5) / 0.45), t = Math.max(0, p - 1); return `<div style="position:absolute;inset:0;background:#F6F1E8"><div style="position:absolute;left:0;right:0;top:430px;text-align:center;font-family:${serif};color:${encre};transform:scale(${(1 + 0.035 * t).toFixed(3)})"><div style="font-size:210px;line-height:1;color:${accent};opacity:${e};transform:translateY(${Math.round(60 * (1 - e))}px)">${num}</div><div style="height:2px;width:${Math.round(110 * f)}px;background:${accent};margin:18px auto"></div><div style="margin:0 110px 0 70px;font-size:54px;line-height:1.15;font-style:italic;opacity:${ti};letter-spacing:${(4 * (1 - ti)).toFixed(1)}px">${fort(titre)}</div></div></div>` },
    },
  }
  return H[nom] || null
}
