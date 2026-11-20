// LE MONTEUR (17-18/11/2026) : « là où mes élèves ont du mal, c'est assembler leur montage proprement dans leur DA, avec les bons sons,
// les bonnes animations au bon moment et les bonnes coupures au bon endroit : le boulot d'un monteur vidéo » (Aurélie).
// 18/11, v2 : « le montage est chiant… je veux que le résultat soit créatif et personnalisé pour chaque élève ».
//   node montage.mjs plan <nom>
// Lit ce qu'elle DIT (sous-titres.txt, passages gardés de projet.json) et prépare un plan de montage, comme un monteur :
// il se passe quelque chose toutes les 2,5 à 5,5 s selon SON énergie (profil créatif de sa charte), jamais deux fois la
// même animation de suite, et seulement des animations qu'elle aime. Ce qu'il sait poser, toujours sur SES mots :
// le chiffre du hook derrière sa tête, ses mots forts en couleur, ses grands mots à sa charte, ses énumérations en liste,
// des pastilles émoji sur les choses concrètes qu'elle nomme (like, café, argent…), un vrai objet quand elle parle de son
// café ou de son ordi, sa phrase de relance au marqueur, un rappel en notification, des plans rapprochés et un gros plan
// sec sur sa phrase d'humeur, sa question finale en sondage. Les sons suivent tout seuls (sélection d'Aurélie, ou SES sons).
// ⛔ Il n'écrase JAMAIS un choix de l'élève : il ne remplit que ce qui est vide. Il écrit plan.txt (en clair) pour qu'on le lui montre.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const sansAcc = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, ' ').replace(/[^a-z0-9€%,?!.]+/g, ' ').trim()
const nu = w => sansAcc(w).replace(/[,?!.]/g, '')

// Son énergie décide du rythme. Réglée une fois dans sa charte (« creatif »), elle peut la changer quand elle veut.
export const PROFILS = {
  posee: { nom: 'posée', ecart: 5.5, zoomEcart: 14, grosPlans: 0, etoileEcart: 6, pastilles: 2, grandsMots: 2 },
  petillante: { nom: 'pétillante', ecart: 3.5, zoomEcart: 7, grosPlans: 1, etoileEcart: 4.5, pastilles: 4, grandsMots: 3 },
  dejantee: { nom: 'déjantée', ecart: 2.5, zoomEcart: 6, grosPlans: 2, etoileEcart: 3.5, pastilles: 6, grandsMots: 4 },
}
// Les animations que le monteur sait poser (les noms qu'on écrit dans « aime » / « jamais » de son profil)
export const ANIMATIONS = ['hook', 'etoiles', 'grandsMots', 'liste', 'pastilles', 'objets', 'relance', 'rappel', 'zooms', 'grosPlan', 'sondage']
// (18/11, Aurélie) « il faut un truc de base, et leur proposer des trucs qui peuvent venir s'ajouter à leurs vidéos sans problème ».
// LA BASE va dans toutes les vidéos, sobre et sûre. Le reste devient une OPTION numérotée dans plan.txt, posée seulement si elle dit oui
// (node montage.mjs ajouter <nom> 2 5), ou d'office si elle l'a mis dans « aime » de son profil créatif.
export const BASE = ['hook', 'etoiles', 'grandsMots', 'zooms']

// Les mots-chocs : ce qui fait réagir (émotion, interdit, surprise, action franche). Jamais un mot outil.
const CHOCS = ['explose', 'exploser', 'cash', 'bloque', 'bloquer', 'bloquez', 'bloquee', 'jamais', 'secret', 'erreur', 'arnaque', 'gratuit', 'interdit', 'stop', 'fini', 'enfin',
  'incroyable', 'fou', 'folle', 'dingue', 'zero', 'record', 'vole', 'volent', 'copie', 'copient', 'pique', 'piquent', 'menti', 'honte', 'peur', 'pleure',
  'rate', 'echec', 'vendu', 'vendus', 'double', 'triple', 'quitte', 'viree', 'vire', 'clash', 'verite', 'sublime', 'parfait', 'enorme', 'galere', 'bravo']
const NOMBRE = /(\d[\d\s.,]*\s?(?:€|euros?|k\b|%|fois|jours?|mois|ans?|abonn[ée]e?s?|ventes?|clientes?|partenaires?|vues?|likes?))/i
// Les choses concrètes qu'elle nomme → une pastille « émoji + SON mot » (émojis modernes Twemoji, polices/emoji)
const PASTILLES = [
  [/^(like|likes|j aime)$/, '❤️'], [/^(commentaire|commentaires|com|coms)$/, '💬'], [/^(abonne|abonnes|abonnee|abonnees|followers?)$/, '👥'],
  [/^(vue|vues)$/, '👀'], [/^(telephone|portable|iphone)$/, '📱'], [/^(argent|euros|salaire)$/, '💰'], [/^(vente|ventes|vendu|vendus)$/, '🛍️'],
  [/^(cafe|cafes)$/, '☕'], [/^(idee|idees)$/, '💡'], [/^(objectif|objectifs|but)$/, '🎯'], [/^(semaine|semaines|mois|calendrier|date|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)$/, '📅'],
  [/^(heure|heures|minutes|temps|reveil)$/, '⏰'], [/^(bloque|bloquer|bloquee|bloquees|interdit)$/, '🚫'], [/^(explose|exploser|feu|buzz|viral)$/, '🔥'],
  [/^(travail|boulot|job|bureau)$/, '💼'], [/^(ordi|ordinateur)$/, '💻'], [/^(message|messages|dm|mail|mails|email)$/, '✉️'], [/^(video|videos|reel|reels)$/, '🎬'],
  [/^(photo|photos)$/, '📸'], [/^(stress|stresse|peur|panique)$/, '😱'], [/^(drole|rire|mdr)$/, '😂'], [/^(fatigue|fatiguee|dormir|sommeil)$/, '😴'],
  [/^(enfant|enfants|bebe|bebes)$/, '👶'], [/^(maison)$/, '🏠'], [/^(cadeau|cadeaux|offert)$/, '🎁'], [/^(secret|secrets)$/, '🤫'], [/^(algorithme|algo|ia)$/, '🤖'],
  [/^(instagram|insta|tiktok|story|stories)$/, '📲'], [/^(liste|plan|checklist)$/, '📋'], [/^(bravo|fete|anniversaire)$/, '🎉'], [/^(cliente|clientes|client|clients)$/, '🤝'],
  [/^(succes|reussite|victoire|record)$/, '🏆'], [/^(erreur|erreurs|faux)$/, '❌'], [/^(livre|livres|formation|cours)$/, '📚'], [/^(huile|huiles)$/, '💧'],
  [/^(plante|plantes|nature)$/, '🌿'], [/^(soleil|ete)$/, '☀️'], [/^(nuit|soir)$/, '🌙'], [/^(musique|son)$/, '🎵'], [/^(voyage|vacances)$/, '✈️'],
  [/^(energie)$/, '⚡'], [/^(courbe|croissance|stats|statistiques)$/, '📈'], [/^(question|questions)$/, '🤔'], [/^(cerveau|reflechir)$/, '🧠'],
  [/^(adore|amour|coeur)$/, '😍'], [/^(force|motivation|muscle)$/, '💪'], [/^(magie|magique|paillettes)$/, '✨'], [/^(note|notes|ecrire)$/, '📝'],
]
// Les vrais objets de la bibliothèque, quand elle DIT le mot (loupe et calculatrice refusées par Aurélie le 17/11)
const OBJETS = [[/^(cafe|cafes|latte)$/, 'latte'], [/^(the)$/, 'tasse-the'], [/^(matcha)$/, 'matcha-latte-2'], [/^(ordi|ordinateur)$/, 'ordinateur'], [/^(fantomes?|silencieuses?|silencieux)$/, 'fantome']]
// Sa phrase de relance (« le problème… », « et là… ») → au marqueur au-dessus de sa tête
const RELANCE = /^(et la|le probleme|le pire|mais attention|attention|vous savez quoi|spoiler|la verite|le secret|sauf que|du coup voila|devinez|resultat)\b/

export function planMontage(dir, P, C = null) {
  const charte = C || (P.charte && existsSync(join(ICI, 'chartes', P.charte + '.json')) ? JSON.parse(readFileSync(join(ICI, 'chartes', P.charte + '.json'), 'utf8')) : {})
  const creatif = { energie: 'petillante', aime: [], jamais: [], ...(charte.creatif || {}), ...(P.creatif || {}) }
  const R = PROFILS[creatif.energie] || PROFILS.petillante
  const veut = a => !creatif.jamais.includes(a)
  const dOffice = a => BASE.includes(a) || creatif.aime.includes(a) || creatif.aime.includes('tout')
  const options = []
  const proposer = (anim, t, texte, cible, obj) => options.push({ n: options.length + 1, anim, t, texte, cible, obj })
  const fST = join(dir, 'sous-titres.txt'), brutST = readFileSync(fST, 'utf8').split(/\r?\n/)
  const lignes = brutST.map((l, i) => ({ l, i })).filter(({ l }) => /^\d/.test(l)).map(({ l, i }) => { const k = l.indexOf('|'); return { i, t: +l.slice(0, k), txt: l.slice(k + 1).replace(/#\w+/g, '').trim() } }).filter(l => l.txt)
  const retirer = P.retirer || [], garde = t => !retirer.some(([x, y]) => t >= x && t < y)
  const L = lignes.filter(l => garde(l.t))
  const ajouts = [], fait = (quoi, texte) => ajouts.push(`${quoi} : ${texte}`)
  const r0 = [...retirer].sort((a, b) => a[0] - b[0])[0]
  const hookFin = P.hookFin ?? (r0 && r0[0] < 25 ? r0[0] : Math.min(8, L.at(-1)?.t ?? 8))
  const final = t => t - retirer.filter(([x, y]) => y <= t).reduce((s, [x, y]) => s + (y - x), 0) - retirer.filter(([x, y]) => x < t && y > t).reduce((s, [x]) => s + (t - x), 0)
  const brut = l => l.txt.replace(/\*/g, ''), court = s => s.length > 48 ? s.slice(0, 46) + '…' : s
  // ce qu'elle a déjà choisi : le monteur n'y touche pas, et ne pose rien par-dessus
  const vide = k => !(Array.isArray(P[k]) ? P[k].length : P[k])
  const effets = vide('effets') ? [] : null, stickers = [...(P.stickers || [])], listes = vide('listes') ? [] : null
  const pris = [...(P.effets || []), ...stickers, ...(P.listes || [])].map(e => final(e.t))

  // 1. Le hook : son chiffre en version courte au-dessus de sa tête (« 35 000 € » → « 35K »)
  if (!P.titreDerriere && veut('hook')) {
    const h = L.filter(l => l.t < hookFin).map(brut).join(' ')
    const m = h.match(/(\d[\d\s.]*)\s?(k|000|€|euros?|%)/i)
    if (m) { const n = +m[1].replace(/[\s.]/g, ''); const c = n >= 1000 ? Math.round(n / 1000) + 'K' : (m[2] === '%' ? n + '%' : String(n))
      if (c.length <= 4) { P.titreDerriere = { texte: c, style: { top: 150, taille: 230, couleur: '#ffffff' } }; fait('Hook', `« ${c} » en énorme derrière sa tête`) } }
  }

  // 2. Les candidats, ligne par ligne (après le hook) : tout ce qu'un monteur POURRAIT poser sur ce qu'elle dit
  const cand = []
  for (let i = 0; i < L.length; i++) {
    const l = L[i]
    const b = brut(l), mots = b.split(/\s+/), n = sansAcc(b)
    // (20/11) le petit fantôme a le droit d'apparaître pendant le hook (« abonnées fantômes » se dit souvent dès le début),
    // sans son : rien d'autre ne se pose sur le hook
    if (l.t < hookFin) { if (effets && veut('objets') && mots.some(w => /^(fantomes?|silencieuses?|silencieux)$/.test(nu(w)))) cand.push({ type: 'objet', t: l.t + 0.2, duree: 1.4, poids: 6, nom: 'fantome', cle: 'fantome', hook: true }); continue }
    // une énumération (3 à 4 morceaux courts) → une liste
    if (listes && veut('liste')) {
      const bloc = [L[i], L[i + 1], L[i + 2]].filter(Boolean).map(brut).join(' ')
      const items = bloc.split(/,|\bet\b/).map(x => x.trim()).filter(x => x && x.split(/\s+/).length <= 4).slice(0, 5)
        .map(x => x.replace(/[.?!]+$/, '').replace(/^(mais|alors|donc)\s+/i, '')).filter(x => x.length >= 2).slice(0, 4)
      if (items.length >= 3) cand.push({ type: 'liste', t: l.t, duree: 4, poids: 9, items })
    }
    // un chiffre fort ou un mot-choc → un grand mot à SA charte
    if (effets && veut('grandsMots')) {
      const iChoc = mots.findIndex(w => CHOCS.includes(nu(w))), chiffre = b.match(NOMBRE)
      let grand = null, dessus = ''
      if (iChoc >= 0) { grand = mots[iChoc].replace(/[,?!.]/g, ''); const av = mots.slice(Math.max(0, iChoc - 3), iChoc).map(w => w.replace(/[,?!.]/g, ''))
        if (/^(ne|n|pas|plus|tres|trop|si|super|hyper)$/.test(nu(av.at(-1) || ''))) grand = av.pop() + ' ' + grand // la négation et l'intensité vont avec le mot
        while (av.length && /^(et|de|du|des|le|la|les|un|une|a|au|en|que|qui|mon|ma|mes)$/.test(nu(av.at(-1)))) av.pop() // jamais un mot outil en fin de ligne
        dessus = av.join(' ') }
      else if (chiffre && /\d{2,}/.test(chiffre[1].replace(/\s/g, ''))) {
        grand = chiffre[1].trim().replace(/euros?/i, '€')
        if (/^0{3}/.test(grand)) { const m = L[i - 1] && brut(L[i - 1]).match(/(\d{1,3})\s*$/); grand = m ? m[1] + ' ' + grand : null } // « les 100 » / « 000 euros »
      }
      // (18/11 : un mot géant toutes les 3-4 s) sans mot-choc ni chiffre, le mot qui porte la phrase :
      // une chose concrète, ou un mot plein de 6 lettres et plus (jamais un mot outil), avec les 2-3 mots d'avant en petit
      let poidsG = chiffre ? 8 : 7
      if (!grand) {
        const OUTILS = /^(alors|donc|parce|quand|comme|aussi|encore|toujours|vraiment|vous|nous|elles?|ils?|cette|celle|celui|leurs?|votre|notre|quelque|quelqu|beaucoup|maintenant|seulement|justement|pourquoi|comment|surtout|semaine|semaines|bienvenue|apparemment|certaines?|certains?|petite?s?|chose|choses|faire|avoir|etait|serait|fait|finit|sont|suis|est|probleme)$/
        // un nom porte mieux qu'un verbe conjugué (« bilan » plutôt que « deuxième », « société » plutôt que « regardent »)
        const verbe = x => /(ez|ent|ait|aient|ions|iez|ons|er|ir)$/.test(x) || /(ieme|iemes)$/.test(x)
        const note = w => { const x = nu(w); return !x || OUTILS.test(x) || /^\d/.test(x) ? 0 : PASTILLES.some(([re]) => re.test(x)) ? 2 + x.length / 20 : x.length >= 5 && !verbe(x) ? 1.5 + x.length / 20 : 0 }
        const notes = mots.map(note), best = Math.max(0, ...notes)
        if (best > 0) { const k = notes.indexOf(best); grand = mots[k].replace(/[,?!.]/g, ''); dessus = mots.slice(Math.max(0, k - 3), k).map(w => w.replace(/[,?!.]/g, '')).filter(Boolean)
          while (dessus.length && /^(et|de|du|des|le|la|les|un|une|a|au|en|que|qui|mon|ma|mes)$/.test(nu(dessus.at(-1)))) dessus.pop()
          dessus = dessus.join(' '); poidsG = 5 }
      }
      if (grand) cand.push({ type: 'grandMot', t: l.t, duree: 1.6, poids: poidsG, grand: grand.toLowerCase(), dessus, cle: nu(grand) })
    }
    // sa phrase de relance → au marqueur au-dessus de sa tête (3 à 8 de SES mots)
    if (effets && veut('relance') && RELANCE.test(n) && mots.length >= 3 && mots.length <= 8) cand.push({ type: 'relance', t: l.t, duree: 1.8, poids: 6, texte: b.replace(/[,.]$/, '') })
    // un rappel → une notification
    if (veut('rappel') && /\b(n oubliez pas|n oublie pas|rappel|pensez a|pense a)\b/.test(n)) cand.push({ type: 'rappel', t: l.t, duree: 2.6, poids: 6, texte: court(b) })
    // son café, son ordi → le vrai objet
    if (effets && veut('objets')) for (const w of mots) { const o = OBJETS.find(([re]) => re.test(nu(w))); if (o) { cand.push({ type: 'objet', t: l.t + 0.2, duree: 2.2, poids: 6, nom: o[1], cle: o[1] }); break } }
    // les choses concrètes qu'elle nomme → 1 ou 2 pastilles « émoji + SON mot »
    if (veut('pastilles')) {
      const vus = []; for (const w of mots) { const p = PASTILLES.find(([re]) => re.test(nu(w))); if (p && !vus.some(v => v[0] === p[1])) vus.push([p[1], w.replace(/[,?!.]/g, '').toLowerCase()]) }
      if (vus.length) cand.push({ type: 'pastilles', t: l.t, duree: 2.6, poids: 4 + vus.length, items: vus.slice(0, 2), cle: vus.map(v => v[0]).join('') })
    }
  }

  // 3. Le placement : un temps fort toutes les R.ecart secondes, le plus fort d'abord, jamais deux fois le même de suite
  const places = [], deja = new Set(), compte = {}
  const libre = (f, d) => !places.some(p => f < p.fin + 0.6 && f + d > p.f - 0.6) && !pris.some(x => Math.abs(x - f) < 3)
  const NOMS = { grandMot: 'grandsMots', pastilles: 'pastilles', liste: 'liste', relance: 'relance', rappel: 'rappel', objet: 'objets' }, aime = t => creatif.aime.includes(NOMS[t])
  const plafond = { grandMot: Math.max(R.grandsMots, Math.ceil(final(L.at(-1)?.t ?? 0) / (R.ecart + 0.5))), pastilles: R.pastilles, liste: 1, relance: 2, rappel: 1, objet: 2 }
  for (const t in plafond) if (aime(t)) plafond[t]++ // ce qu'elle aime passe devant, et revient un peu plus
  for (const c of cand) if (aime(c.type)) c.poids += 3
  let dernierType = ''
  for (const c of [...cand].sort((a, b) => b.poids - a.poids || a.t - b.t)) {
    const f = final(c.t)
    if ((compte[c.type] || 0) >= plafond[c.type] || (c.cle && deja.has(c.type + c.cle)) || !libre(f, c.duree)) continue
    if (places.some(p => Math.abs(p.f - f) < R.ecart * 0.8)) continue
    places.push({ ...c, f, fin: f + c.duree }); compte[c.type] = (compte[c.type] || 0) + 1; if (c.cle) deja.add(c.type + c.cle)
  }
  places.sort((a, b) => a.f - b.f)
  // jamais deux fois la même animation de suite : la deuxième d'une paire cède sa place s'il existe une autre idée à ce moment-là
  for (let k = 1; k < places.length; k++) if (places[k].type === places[k - 1].type && places[k].type !== 'grandMot') { // les mots géants se suivent, c'est le principe
    const autre = cand.find(c => c.type !== places[k].type && Math.abs(final(c.t) - places[k].f) < 1.5 && (compte[c.type] || 0) < plafond[c.type] && !(c.cle && deja.has(c.type + c.cle)))
    if (autre) { compte[places[k].type]--; compte[autre.type] = (compte[autre.type] || 0) + 1; if (autre.cle) deja.add(autre.type + autre.cle); places[k] = { ...autre, f: final(autre.t), fin: final(autre.t) + autre.duree } }
  }
  dernierType = ''
  let cote = 0
  for (const p of places) {
    const dit = court(brut(L.find(l => Math.abs(l.t - (p.type === 'objet' ? p.t - 0.2 : p.t)) < 0.01) || { txt: '' }))
    // la base (ou ce qu'elle aime) est posée ; le reste devient une option numérotée qu'on lui propose
    const mettre = (cible, obj, quoi, texte) => { if (dOffice(NOMS[p.type])) { ({ listes, effets, stickers })[cible].push(obj); fait(quoi, texte); p.pose = true } else proposer(NOMS[p.type], p.t, `${quoi} : ${texte}`, cible, obj) }
    if (p.type === 'liste') mettre('listes', { t: p.t, type: creatif.liste || 'etiqueteuse', items: p.items }, 'Liste', `« ${p.items.join(' / ')} » qui s'écrit quand elle les dit`)
    if (p.type === 'grandMot') mettre('effets', { t: p.t, type: 'duo', recette: 'charte', grand: p.grand, ...(p.dessus ? { dessus: p.dessus } : {}), duree: 1.5 }, 'Grand mot', `${p.dessus ? p.dessus.toUpperCase() + ' / ' : ''}« ${p.grand} » à sa charte, avec un impact doux, quand elle dit « ${/^\d/.test(p.grand) ? p.grand : dit} »`)
    if (p.type === 'relance') mettre('effets', { t: p.t, type: 'choc', texte: p.texte }, 'Relance', `« ${p.texte} » écrit au marqueur au-dessus de sa tête`)
    if (p.type === 'objet') mettre('effets', { t: p.t, type: p.nom === 'fantome' ? 'flotte' : 'objet', nom: p.nom, ...(p.nom === 'fantome' ? { duree: p.hook ? 1.4 : 2.4, ...(p.hook ? { muet: true } : {}) } : {}) }, p.nom === 'fantome' ? 'Petit fantôme' : 'Objet', p.nom === 'fantome' ? `un petit fantôme tout mignon qui flotte à côté d'elle quand elle dit « ${dit} »` : `un vrai ${p.nom.replace(/-\d$/, '').replace(/-/g, ' ')} qui se pose à côté d'elle quand elle dit « ${dit} »`)
    if (p.type === 'rappel') mettre('stickers', { t: p.t, type: 'notif', titre: 'Rappel', texte: p.texte, emoji: '⏰', x: 360, y: 0.7, duree: 2.6 }, 'Rappel', `notification « ${p.texte} »`)
    if (p.type === 'pastilles') { const xs = cote++ % 2 ? [560, 170] : [170, 560]
      mettre('stickers', { t: p.t, type: 'groupe', duree: 2.6, pas: 0.5, echelle: 1.7, items: p.items.map(([e, mot], k) => [e, xs[k], 0.3 + k * 0.06, k ? 5 : -6, mot]) },
        'Pastilles', `${p.items.map(([e, m]) => e + ' ' + m).join('  ')} qui popent quand elle dit « ${dit} »`) }
  }
  // 4. Sa question finale → un sondage
  if (veut('sondage') && !stickers.some(s => s.type === 'sondage')) {
    const q = [...L].reverse().find(l => /\?\s*$/.test(l.txt))
    if (q && q.t > hookFin) { const b = brut(q).replace(/\?\s*$/, ''), ou = b.split(/\s+ou\s+/i)
      // ses mots, à l'infinitif (« vous laissez faire ou vous la bloquez » → « Laisser faire / Bloquer »), sans espace en trop
      const choix = ou.length === 2 ? ou.map(x => x.trim().split(/\s+/).slice(-3).join(' ').replace(/^(vous|tu|je|on)\s+/i, '').replace(/^(la|le|les)\s+|^l'/i, '').replace(/^(\S+?)ez\b/i, '$1er').trim()).map(x => x.charAt(0).toUpperCase() + x.slice(1)) : ['Oui', 'Non']
      const obj = { t: q.t, type: 'sondage', question: /\bvous\b/i.test(b) ? 'Et vous ? 🤔' : 'Et toi ? 🤔', choix, x: 360, y: 0.7, duree: 2.4 }
      if (dOffice('sondage')) { stickers.push(obj); fait('Sondage', `sur sa question finale : ${choix.join(' / ')}`) }
      else proposer('sondage', q.t, `Sondage : sur sa question finale, « ${obj.question.replace(' 🤔', '')} ${choix.join(' / ')} » (invite à commenter)`, 'stickers', obj) }
  }

  // 5. Ses mots forts en couleur (*étoiles* dans sous-titres.txt) : s'il y en a trop peu, le monteur en ajoute, un toutes les R.etoileEcart s
  let etoiles = 0, grosPlans = 0
  const nbEt = L.filter(l => /\*/.test(l.txt)).length, dureeF = final(L.at(-1)?.t ?? 0)
  if (veut('etoiles') && nbEt < dureeF / (R.etoileEcart * 2)) {
    let derniere = -99; const dejaEtoile = new Set(L.flatMap(l => (l.txt.match(/\*([^*]+)\*/g) || []).map(x => nu(x.replace(/\*/g, '')))))
    for (const l of L) { const f = final(l.t); if (/\*/.test(l.txt)) { derniere = f; continue } if (f - derniere < R.etoileEcart) continue
      const mots = l.txt.split(/(\s+)/)
      // le mot qui porte : un mot-choc d'abord, puis un vrai chiffre, puis une chose concrète, puis un mot long qui n'est pas un mot outil
      const note = w => !w.trim() || /^0{3}/.test(nu(w)) ? 0 : dejaEtoile.has(nu(w)) ? 0 : CHOCS.includes(nu(w)) ? 4 : /^\d+$/.test(nu(w)) ? 3
        : PASTILLES.some(([re]) => re.test(nu(w))) && !/^(semaines?|mois|date|temps|heures?|minutes|videos?|likes?|son|nuit|soir|notes?|plan|liste)$/.test(nu(w)) ? 2 : 0 // jamais un mot banal
      const notes = mots.map(note), best = Math.max(...notes), k = best ? notes.indexOf(best) : -1
      const suite = L[L.indexOf(l) + 1] // un nombre coupé entre deux lignes (« les 100 » / « 000 euros ») : le grand mot s'en occupe
      if (k < 0 || /^\s*0{3}/.test(l.txt) || (suite && /^\s*0{3}/.test(suite.txt) && /\d\s*$/.test(l.txt))) continue
      mots[k] = mots[k].replace(/^([^\wÀ-ÿ\d]*)([\wÀ-ÿ\d'’€%.\s]+?)([,?!.]*)$/, '$1*$2*$3')
      const ligne = brutST[l.i], m = ligne.match(/^([^|]*\|)(.*?)(\s*#\w+.*)?$/)
      brutST[l.i] = m[1] + mots.join('') + (m[3] || ''); l.txt = mots.join(''); etoiles++; derniere = f; dejaEtoile.add(nu(mots[k].replace(/\*/g, ''))) }
  }
  // 6. Le gros plan sec sur LA phrase d'humeur (« ! » ou mot-choc), selon son énergie
  if (veut('grosPlan') && R.grosPlans && !brutST.some(l => /#grosplan\b/.test(l))) {
    for (const l of L) { if (grosPlans >= R.grosPlans || l.t < hookFin) continue
      const f = final(l.t); if (places.some(p => f >= p.f - 0.5 && f < p.fin + 0.5)) continue
      if (/!\s*$/.test(l.txt) || l.txt.split(/\s+/).some(w => CHOCS.includes(nu(w)))) { grosPlans++
        if (dOffice('grosPlan')) { brutST[l.i] = brutST[l.i].replace(/\s*$/, ' #grosplan'); fait('Gros plan', `coupe sèche en gros plan sur « ${court(brut(l))} »`) }
        else proposer('grosPlan', l.t, `Gros plan : coupe sèche en gros plan sur « ${court(brut(l))} »`, 'grosplan', { t: l.t }) } }
  }
  if (etoiles || brutST.some(l => /#grosplan/.test(l))) {
    if (!existsSync(join(dir, 'sous-titres.avant-plan.txt'))) copyFileSync(fST, join(dir, 'sous-titres.avant-plan.txt'))
    writeFileSync(fST, brutST.join('\n'))
    if (etoiles) fait('Mots forts', `${etoiles} mot(s) en couleur ajouté(s) dans sous-titres.txt (son texte d'avant est gardé dans sous-titres.avant-plan.txt)`)
  }

  // 7. Le rythme (en temps final) : là où rien ne bouge depuis trop longtemps, un plan rapproché sur la phrase suivante
  if (veut('zooms') && vide('rapprocher')) {
    const rap = [], moments = [...places.filter(p => p.pose).map(p => p.f), ...pris, ...L.filter(l => /#grosplan/.test(brutST[l.i])).map(l => final(l.t))].sort((a, b) => a - b)
    let dernier = final(hookFin), dernierRap = -99
    for (const l of L) { const f = final(l.t); if (f <= dernier) continue
      if (f - dernier > R.ecart * 1.3 && f - dernierRap > R.zoomEcart && !moments.some(m => m > dernier && m < f)) { rap.push([l.t, l.t + 2.5]); dernier = f; dernierRap = f; fait('Rythme', `plan rapproché sur « ${court(brut(l))} »`) }
      if (moments.some(m => Math.abs(m - f) < 0.5)) dernier = f }
    if (rap.length) P.rapprocher = rap
  }

  if (effets && effets.length) P.effets = effets.sort((a, b) => a.t - b.t)
  if (listes && listes.length) P.listes = listes
  // (18/11, Aurélie) « que ça floute l'arrière-plan mais qu'on garde son visage », et pas trop longtemps : pendant une liste,
  // le décor se floute (mode portrait, elle reste nette) 3 s au plus. Jamais tout l'écran flouté longtemps.
  if (listes && listes.length && creatif.listeFlou === true && vide('portrait')) P.portrait = listes.map(l => [l.t, l.t + 3])
  if (stickers.length) P.stickers = stickers.sort((a, b) => a.t - b.t)
  if (creatif.sons && !P.sons) P.sons = creatif.sons
  // (18/11, crash test) pas de doublon : le chiffre derrière sa tête remplace le titre sur le torse, le sondage remplace la carte de fin
  if (P.titreDerriere && !P.titre) fait('Pas de titre', `le « ${P.titreDerriere.texte} » derrière sa tête suffit : ne rajoute ni titre ni compteur par-dessus`)
  if (stickers.some(s => s.type === 'sondage')) { if (P.carteFin) fait('⚠️ Doublon', 'elle a une carte de fin ET un sondage sur la même question : demande-lui lequel garder')
    else fait('Pas de carte de fin', 'le sondage pose déjà sa question : ne rajoute pas de carteFin') }
  const nb = places.filter(p => p.pose).length + (P.titreDerriere ? 1 : 0)
  if (options.length) P.options = options.sort((a, b) => a.t - b.t).map((o, k) => ({ ...o, n: k + 1 })); else delete P.options
  const texte = [`PLAN DE MONTAGE (proposé par le monteur, à lui montrer avant de fabriquer)`,
    `Son énergie : ${R.nom} (un temps fort toutes les ${String(R.ecart).replace('.', ',')} s environ)${creatif.jamais.length ? ' · jamais : ' + creatif.jamais.join(', ') : ''}`, '',
    'LA BASE (déjà dans sa vidéo) :', ...ajouts.map(a => '- ' + a), '',
    ...(P.options ? ['OPTIONS À LUI PROPOSER (rien n\'est posé tant qu\'elle ne dit pas oui) :', ...P.options.map(o => `  ${o.n}. ${o.texte}`),
      `Pour les ajouter : node montage.mjs ajouter <nom> 2 5 (ou « tout »). Ce qu'elle choisit souvent, mets-le dans « aime » de son profil : ce sera d'office la prochaine fois.`, ''] : []),
    `${nb} temps forts de base${P.options ? ` (+ ${P.options.length} en option)` : ''} en ${Math.round(dureeF)} s de vidéo.`,
    'Les sons suivent tout seuls, doux et jamais métalliques : tension très basse sous le hook, un petit son sur un mot géant sur deux (jamais le même deux fois de suite), bloop sur les pastilles, petits clics sur les listes, whoosh aux vrais changements de plan.',
    'Elle peut tout changer avec ses mots : « enlève les pastilles », « mets une explosion quand je dis… », « plus calme », « plus fou ».'].join('\n')
  writeFileSync(join(dir, 'plan.txt'), texte + '\n')
  return { P, texte, ajouts }
}
