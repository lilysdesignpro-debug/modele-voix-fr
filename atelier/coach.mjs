// LE COACH FACECAM ET LE DÉTECTEUR DE DÉCROCHAGE.
// L'élève dépose une vidéo face caméra ; l'outil la regarde et l'écoute, puis rend un retour bienveillant :
// ses chiffres (regard, tics, débit, énergie, cadrage, lumière), ses points forts, UN point à travailler avec
// son exercice, et la relecture « décrochage » (idées répétées, phrases redites, énergie qui retombe,
// version divisée par deux). Tout se passe sur l'ordinateur : la vidéo ne part nulle part.
//
//   node contenu/montage/coach.mjs analyser <video.mp4> [nom]
//       → coach/<nom>/analyse.json (les chiffres) et transcription.txt (les phrases minutées, à relire)
//   node contenu/montage/coach.mjs page <nom>
//       → coach/<nom>/retour.html ; reprend relecture.json s'il existe (écrit par Claude après lecture
//         de la transcription : idées répétées, version courte, mot d'encouragement)
//   node contenu/montage/coach.mjs couper <nom>
//       → coach/<nom>/version-courte.mp4, en gardant les passages « garder » de relecture.json
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const COACH = join(ICI, 'coach')

// L'oreille (whisper-cli) : dans le PATH, sinon là où l'installateur de l'atelier la pose (Windows, Mac)
const WHISPER = process.env.WHISPER_CLI || [join(homedir(), 'AppData', 'Local', 'whisper-cpp', 'Release', 'whisper-cli.exe'), '/opt/homebrew/bin/whisper-cli', '/usr/local/bin/whisper-cli'].find(existsSync) || 'whisper-cli'
const lancer = (cmd, args, { sortie = false } = {}) => {
  if (cmd === 'whisper-cli') cmd = WHISPER
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 })
  if (r.error) throw new Error(`${cmd} est introuvable`)
  if (!sortie && r.status !== 0) throw new Error(`${cmd} a échoué : ${(r.stderr || '').slice(-600)}`)
  return (r.stdout || '') + (r.stderr || '')
}
const modeleWhisper = () => {
  const dir = join(homedir(), '.cache', 'whisper'), la = existsSync(dir) ? readdirSync(dir) : []
  const m = ['ggml-large-v3-turbo.bin', 'ggml-large-v3.bin', 'ggml-medium.bin', 'ggml-small.bin', 'ggml-base.bin'].find(p => la.includes(p))
  if (!m) throw new Error('aucun modèle whisper dans ~/.cache/whisper')
  return join(dir, m)
}
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// Les tics de langage qu'on compte (seuls ou en groupe). « quoi » ne compte qu'en fin de phrase.
const TICS = ['euh', 'heu', 'hum', 'hmm', 'bah', 'ben', 'bref', 'genre', 'voila', 'du coup', 'en fait', 'tu vois', 'tu sais', 'enfin bref']
const VIDES = new Set('le la les un une des de du d l et a au aux en est c ce ca je j tu il elle on nous vous ils elles que qui qu ne n pas plus pour par sur dans avec mais ou donc or ni car se s sa son ses ma mon mes ta ton tes y me m te t lui leur leurs cette cet ces tout tous toute toutes tres bien fait faire etre avoir ai as avait suis es sont va vais'.split(' '))

// Les exercices, un par point à travailler. Courts, faisables tout de suite, comme ceux de la Promo 0.
const EXERCICES = {
  demarrage: { titre: 'Le démarrage à froid', faire: "Filme 5 fois la même première phrase, en commençant à parler AVANT d'avoir fini d'appuyer sur « enregistrer » (tu couperas le début). Garde la prise où ton premier mot arrive dans la première seconde." },
  tics: { titre: 'Le silence qui remplace le « euh »', faire: "Raconte ta journée en 30 s face caméra. Chaque fois qu'un « euh » arrive, tais-toi une demi-seconde à la place. Réécoute : les silences passent inaperçus, les « euh » non. Recommence jusqu'à 2 « euh » maximum." },
  regard: { titre: "Le petit point sur l'objectif", faire: "Colle une gommette (ou un post-it découpé avec un smiley) juste à côté de l'objectif de ton téléphone. Fais 3 prises de 20 s en parlant AU smiley, comme à une amie. Pas d'écran retour : retourne le téléphone ou cache l'écran." },
  energie: { titre: 'Les 6 tons', faire: "Le défi de la Promo 0 : un même texte de 3 phrases, dit sur 6 tons (enthousiaste, chuchoté, en colère, en confidence, présentatrice télé, fou rire). Ça élargit ta palette : ta version « normale » d'après sera plus vivante." },
  debitLent: { titre: 'Le chrono', faire: "Prends ton texte, lis-le une fois chronométrée, puis redis-le en 20 % de temps en moins sans couper de mot. Sur Instagram, le rythme tient l'attention." },
  debitRapide: { titre: 'La respiration en fin de phrase', faire: "Redis ton texte en marquant un vrai point à chaque fin de phrase : tu poses, tu respires, tu repars. On te comprendra mieux, surtout sans le son." },
  sourire: { titre: 'Le sourire des 3 premières secondes', faire: "Avant d'appuyer, pense à quelque chose qui te fait rire. Démarre ta vidéo en souriant sur ta première phrase. Compare avec une prise sans : c'est celle qui sourit qui donne envie de rester." },
  cadrage: { titre: 'Le cadrage en 3 repères', faire: "Téléphone à hauteur des yeux (une pile de livres suffit), tes yeux au tiers haut de l'écran, une main d'espace au-dessus de ta tête. Prends une photo de toi dans ce cadre et garde-la comme modèle." },
  lumiere: { titre: 'La fenêtre en face', faire: "Mets-toi FACE à une fenêtre (jamais dos à elle), en journée. Fais une prise de 10 s, puis une prise dos à la fenêtre : regarde la différence sur ton visage. Garde ce coin-là pour tes vidéos." },
}

async function analyser(video, nom) {
  nom = nom || basename(video, extname(video)).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const dir = join(COACH, nom); mkdirSync(dir, { recursive: true })
  const source = join(dir, 'video' + extname(video).toLowerCase()); if (video !== source) copyFileSync(video, source)
  const D = +lancer('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', source]).trim()
  const wav = join(dir, 'voix.wav'); lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-ac', '1', '-ar', '16000', wav])

  // 1. Les mots, avec les « euh » : whisper les efface d'habitude, une amorce pleine d'hésitations les garde
  lancer('whisper-cli', ['-m', modeleWhisper(), '-f', wav, '-l', 'fr', '-t', '8', '-ml', '1', '-sow', '-oj', '-of', join(dir, 'mots'), '-np', '--prompt', 'Euh, alors, euh… bah du coup, hum, en fait, voilà, euh.'])
  const mots = []
  for (const s of JSON.parse(readFileSync(join(dir, 'mots.json'), 'utf8')).transcription) {
    const txt = s.text.trim(); if (!txt) continue
    if (/^[?.!,;:…]+$/.test(txt) && mots.length) { mots.at(-1).txt += txt; mots.at(-1).fin = s.offsets.to / 1000; continue }
    mots.push({ t: s.offsets.from / 1000, fin: s.offsets.to / 1000, txt })
  }
  if (!mots.length) throw new Error("je n'entends aucune parole dans cette vidéo")
  // les phrases : une ponctuation forte, ou un blanc de plus de 0,7 s
  const phrases = []
  for (const [i, m] of mots.entries()) {
    if (!phrases.length || /[.!?…]$/.test(mots[i - 1].txt) || m.t - mots[i - 1].fin > 0.7) phrases.push({ a: m.t, b: m.fin, txt: m.txt })
    else { const p = phrases.at(-1); p.b = m.fin; p.txt += ' ' + m.txt }
  }
  // 2. Les tics
  const suite = mots.map(m => norm(m.txt))
  const tics = []
  for (let i = 0; i < suite.length; i++) {
    const deux = suite[i] + ' ' + (suite[i + 1] || '')
    const t2 = TICS.find(x => x.includes(' ') && deux.startsWith(x))
    if (t2) { tics.push({ t: mots[i].t, mot: t2 }); i++; continue }
    if (TICS.includes(suite[i])) tics.push({ t: mots[i].t, mot: suite[i] })
    else if (suite[i] === 'quoi' && /[.!?,]$/.test(mots[i].txt)) tics.push({ t: mots[i].t, mot: 'quoi' })
  }
  // 3. Rythme. Le démarrage : whisper colle souvent le premier mot à 0 s ; on prend la fin du premier silence
  const sil = [...lancer('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'silencedetect=n=-35dB:d=0.25', '-f', 'null', '-'], { sortie: true }).matchAll(/silence_(start|end): ([0-9.]+)/g)].map(m => [m[1], +m[2]])
  const demarrage = sil[0]?.[0] === 'start' && sil[0][1] < 0.05 && sil[1] ? sil[1][1] : mots[0].t
  const parole = phrases.reduce((s, p) => s + (p.b - p.a), 0)
  const nbMots = mots.filter(m => !TICS.includes(norm(m.txt))).length
  const debit = Math.round(nbMots / (parole / 60))
  const pauses = []
  for (let i = 1; i < mots.length; i++) if (mots[i].t - mots[i - 1].fin > 1.0) pauses.push({ t: mots[i - 1].fin, duree: +(mots[i].t - mots[i - 1].fin).toFixed(1) })
  // 4. L'énergie : le volume de la voix, seconde par seconde, là où elle parle
  const log = lancer('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128=metadata=1,ametadata=print:key=lavfi.r128.M', '-f', 'null', '-'], { sortie: true })
  const M = [...log.matchAll(/pts_time:([0-9.]+)[\s\S]*?lavfi\.r128\.M=(-?[0-9.]+|-inf)/g)].map(m => [+m[1], m[2] === '-inf' ? -70 : +m[2]])
  const parle = t => phrases.some(p => t >= p.a && t <= p.b)
  const energie = []
  for (let s = 0; s < Math.ceil(D); s++) {
    const v = M.filter(([t, l]) => t >= s && t < s + 1 && parle(t) && l > -50).map(x => x[1]).sort((x, y) => x - y)
    energie.push(v.length >= 3 ? +v[v.length >> 1].toFixed(1) : null)
  }
  const vals = energie.filter(x => x != null), med = a => a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null
  const reference = med(vals.slice(0, Math.max(3, Math.round(vals.length / 3))))
  const baisses = []
  for (let s = 5; s + 3 <= energie.length; s++) {
    const f = energie.slice(s, s + 3).filter(x => x != null); if (f.length < 2) continue
    const moy = f.reduce((x, y) => x + y, 0) / f.length
    if (reference != null && moy < reference - 4 && !baisses.some(b => s - b.t < 4)) baisses.push({ t: s, ecart: +(reference - moy).toFixed(1) })
  }
  const variation = vals.length ? +Math.sqrt(vals.reduce((s, x) => s + (x - vals.reduce((a, b) => a + b, 0) / vals.length) ** 2, 0) / vals.length).toFixed(1) : 0
  // 5. Les redites : un même groupe de 3 mots « pleins » qui revient à plus de 3 s d'écart
  const pleins = mots.map((m, i) => ({ i, t: m.t, w: norm(m.txt) })).filter(x => x.w && !VIDES.has(x.w) && !TICS.includes(x.w))
  const vus = {}, redites = []
  for (let k = 0; k + 2 < pleins.length; k++) {
    const cle = pleins.slice(k, k + 3).map(x => x.w).join(' ')
    if (vus[cle] != null && pleins[k].t - vus[cle] > 3 && !redites.some(r => r.cle === cle)) redites.push({ cle, t1: vus[cle], t2: pleins[k].t })
    vus[cle] ??= pleins[k].t
  }
  const fusion = []
  for (const r of redites) { const p = fusion.at(-1); if (p && Math.abs((r.t2 - r.t1) - (p.t2 - p.t1)) < 0.6 && r.t1 - p.fin1 < 1.2) { p.cle += ' ' + r.cle.split(' ').at(-1); p.fin1 = r.t1 } else fusion.push({ ...r, fin1: r.t1 }) }
  redites.splice(0, redites.length, ...fusion.map(({ fin1, ...r }) => r))
  // 6. Le regard, le cadrage, la lumière, le sourire
  const fr = join(dir, 'regard.json')
  if (!existsSync(fr)) spawnSync('node', [join(ICI, 'detourage', 'regard.mjs'), source, fr], { stdio: 'inherit' })
  const R = existsSync(fr) ? JSON.parse(readFileSync(fr, 'utf8')) : []
  const pendant = R.filter(r => parle(r.t)), vu = pendant.filter(r => r.v), pc = (a, b) => b.length ? Math.round(100 * a.length / b.length) : null
  const visage = {
    vu: pc(vu, pendant),
    camera: pc(vu.filter(r => r.camera), pendant),
    sourire: pc(vu.filter(r => r.sourire > 0.35), vu),
    sourireDebut: vu.filter(r => r.t < 3).some(r => r.sourire > 0.35),
    centre: Math.round(med(vu.map(r => (r.b[0] + r.b[2]) / 2)) ?? 360),
    teteCoupee: pc(vu.filter(r => r.b[1] < 10), vu),
    taille: +((med(vu.map(r => (r.b[3] - r.b[1]) / 1280)) ?? 0).toFixed(2)),
    yeux: +((med(vu.map(r => r.yeux / 1280)) ?? 0).toFixed(2)),
    lumiere: +((med(vu.map(r => r.lumVisage).filter(x => x != null)) ?? 0).toFixed(2)),
    contreJour: +((med(vu.map(r => (r.lumFond ?? 0) - (r.lumVisage ?? 0))) ?? 0).toFixed(2)),
  }
  const analyse = {
    nom, duree: +D.toFixed(1), parole: +parole.toFixed(1), demarrage: +demarrage.toFixed(2), fin: +(D - mots.at(-1).fin).toFixed(1),
    debit, nbMots, tics, ticsParMinute: +(tics.length / (parole / 60)).toFixed(1), pauses, energie, reference, baisses, variation, redites, visage,
    phrases: phrases.map(p => ({ a: +p.a.toFixed(2), b: +p.b.toFixed(2), txt: p.txt })),
  }
  writeFileSync(join(dir, 'analyse.json'), JSON.stringify(analyse, null, 1))
  writeFileSync(join(dir, 'transcription.txt'), phrases.map((p, i) => `${String(i + 1).padStart(2)}. [${p.a.toFixed(1)}-${p.b.toFixed(1)}] ${p.txt}`).join('\n') + '\n')
  console.log(`Analyse prête : ${join(dir, 'analyse.json')}`)
  console.log(`Regard vers l'objectif ${visage.camera} % · ${tics.length} tic(s) en ${Math.round(parole)} s · ${debit} mots/min · démarrage à ${analyse.demarrage} s · ${baisses.length} baisse(s) d'énergie · ${redites.length} redite(s)`)
  return analyse
}

// Le retour, à partir des chiffres : des points forts sincères, et UN seul point à travailler (le plus utile)
function verdict(A) {
  const forts = [], travail = [], V = A.visage
  if (A.demarrage <= 1) forts.push(`Tu démarres au quart de tour : ton premier mot arrive à ${A.demarrage.toFixed(1)} s. C'est exactement ce qu'il faut pour accrocher.`)
  else travail.push({ cle: 'demarrage', poids: 3, dit: `Ton premier mot arrive à ${A.demarrage.toFixed(1)} s. Sur Instagram, on décide de rester ou de partir dans la première seconde : démarre directement sur ta phrase d'accroche.` })
  if (V.camera != null) {
    if (V.camera >= 80) forts.push(`Tu es tournée vers l'objectif ${V.camera} % du temps : on a vraiment l'impression que tu nous parles.`)
    else travail.push({ cle: 'regard', poids: V.camera < 60 ? 3 : 2, dit: `Tu es tournée vers l'objectif ${V.camera} % du temps. Le reste, ta tête part sur le côté : on a l'impression que tu parles à quelqu'un d'autre.` })
  }
  const nb = A.tics.length, sec = Math.round(A.parole), lesquels = [...new Set(A.tics.map(t => `« ${t.mot.replace('voila', 'voilà')} »`))].slice(0, 3).join(', ')
  if (A.ticsParMinute <= 4) forts.push(nb ? `Très peu de tics de langage (${nb} en ${sec} s) : ta parole est nette.` : `Aucun tic de langage en ${sec} s : ta parole est nette.`)
  else travail.push({ cle: 'tics', poids: A.ticsParMinute > 10 ? 3 : 2, dit: `${nb} tics de langage en ${sec} s (${lesquels}). Un silence d'une demi-seconde fait le même travail, et lui ne s'entend pas.` })
  if (A.debit < 135) travail.push({ cle: 'debitLent', poids: 1, dit: `Ton débit est de ${A.debit} mots par minute : c'est posé, mais un peu lent pour un reel. Vise 160 à 190.` })
  else if (A.debit > 235) travail.push({ cle: 'debitRapide', poids: 2, dit: `Ton débit est de ${A.debit} mots par minute : ça file très vite. Une vraie pause en fin de phrase aidera à te suivre.` })
  else forts.push(`Ton rythme est très bon : ${A.debit} mots par minute, ni trop lent ni trop rapide.`)
  if (A.baisses.length) travail.push({ cle: 'energie', poids: 2, dit: `Ton énergie baisse à ${A.baisses.map(b => mmss(b.t)).join(', ')}. C'est souvent là que les gens décrochent : relance avec une question, une preuve, ou un changement de plan.` })
  else if (A.variation >= 3) forts.push('Ton énergie tient du début à la fin, et ta voix varie : on ne s\'ennuie pas.')
  if (V.sourire != null && V.sourire < 8 && !V.sourireDebut) travail.push({ cle: 'sourire', poids: 1, dit: 'On te voit peu sourire, surtout au début. Un sourire sur la première phrase donne envie de rester avec toi.' })
  else if (V.sourireDebut) forts.push('Tu souris dès le début : on a tout de suite envie de t\'écouter.')
  const cadre = []
  if (V.teteCoupee > 30) cadre.push('le haut de ta tête est coupé')
  if (Math.abs(V.centre - 360) > 110) cadre.push(`tu es décalée sur ${V.centre < 360 ? 'la gauche' : 'la droite'}`)
  if (V.yeux > 0.5) cadre.push('tes yeux sont bas dans l\'image (le téléphone est sûrement trop haut ou trop loin)')
  if (V.taille && V.taille < 0.13) cadre.push('tu es loin de l\'objectif : on voit mal tes expressions')
  if (cadre.length) travail.push({ cle: 'cadrage', poids: 1, dit: `Côté cadrage : ${cadre.join(', ')}.` })
  else if (V.vu > 80) forts.push('Ton cadrage est propre : bien centrée, à la bonne distance.')
  if (V.lumiere && V.lumiere < 0.3) travail.push({ cle: 'lumiere', poids: 1, dit: 'Ton visage est un peu sombre : on perd tes expressions.' })
  else if (V.contreJour > 0.15) travail.push({ cle: 'lumiere', poids: 1, dit: 'Tu es un peu à contre-jour : le fond est plus lumineux que ton visage.' })
  travail.sort((a, b) => b.poids - a.poids)
  return { forts: forts.slice(0, 3), travail, exercice: travail[0] ? EXERCICES[travail[0].cle] : EXERCICES.energie }
}

function page(nom) {
  const dir = join(COACH, nom), A = JSON.parse(readFileSync(join(dir, 'analyse.json'), 'utf8'))
  const RL = existsSync(join(dir, 'relecture.json')) ? JSON.parse(readFileSync(join(dir, 'relecture.json'), 'utf8')) : {}
  const Vd = verdict(A), V = A.visage
  const e = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  // courbe d'énergie
  const W = 640, H = 120, vals = A.energie, lo = Math.min(...vals.filter(x => x != null)) - 2, hi = Math.max(...vals.filter(x => x != null)) + 2
  const X = s => (s / Math.max(1, vals.length - 1)) * W, Y = v => H - ((v - lo) / (hi - lo)) * H
  let chemin = '', dedans = false
  vals.forEach((v, s) => { if (v == null) { dedans = false; return } chemin += `${dedans ? 'L' : 'M'}${X(s).toFixed(1)} ${Y(v).toFixed(1)} `; dedans = true })
  const marques = A.baisses.map(b => `<rect x="${X(b.t).toFixed(1)}" y="0" width="${(X(3) - X(0)).toFixed(1)}" height="${H}" class="baisse"/><text x="${(X(b.t) + 4).toFixed(1)}" y="14" class="lbl">${mmss(b.t)}</text>`).join('')
  const tuile = (gros, petit, ok) => `<div class="tuile ${ok ? 'ok' : 'aw'}"><b>${gros}</b><span>${petit}</span></div>`
  const html = `<title>Ton retour facecam</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--fond:#FBF7F2;--carte:#fff;--encre:#2B2420;--doux:#7A6E66;--accent:${RL.accent || '#C2410C'};--ok:#2F7D5B;--aw:#B45309;--ligne:#EADFD3}
@media (prefers-color-scheme:dark){:root{--fond:#1E1A17;--carte:#2A2420;--encre:#F4ECE4;--doux:#B9AA9C;--ligne:#3B332D}}
*{box-sizing:border-box}body{margin:0;background:var(--fond);color:var(--encre);font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;padding:28px max(16px,env(safe-area-inset-left)) 60px}
main{max-width:720px;margin:auto;display:flex;flex-direction:column;gap:22px}h1{font-size:28px;line-height:1.2;margin:0;text-wrap:balance}h2{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--doux);margin:0 0 10px}
.carte{background:var(--carte);border:1px solid var(--ligne);border-radius:16px;padding:18px 20px}.mot{font-size:18px}
.tuiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.tuile{border-radius:12px;padding:12px 14px;background:var(--carte);border:1px solid var(--ligne);display:flex;flex-direction:column}
.tuile b{font-size:24px}.tuile span{color:var(--doux);font-size:13px}.tuile.ok b{color:var(--ok)}.tuile.aw b{color:var(--aw)}
ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px}.exo{border-left:4px solid var(--accent)}.exo h3{margin:0 0 6px;font-size:19px}
svg{width:100%;height:auto;display:block}.courbe{fill:none;stroke:var(--accent);stroke-width:2.5}.baisse{fill:var(--aw);opacity:.15}.lbl{fill:var(--aw);font-size:12px}
.court p{margin:0 0 8px}.barre{text-decoration:line-through;color:var(--doux)}small{color:var(--doux)}
</style>
<main>
<div><small>${e(RL.prenom ? 'Pour ' + RL.prenom : 'Ton retour')} · vidéo de ${Math.round(A.duree)} s</small><h1>${e(RL.titre || 'Ce que ta vidéo dit de toi face caméra')}</h1></div>
${RL.mot ? `<div class="carte mot">${e(RL.mot)}</div>` : ''}
<section><h2>Tes chiffres</h2><div class="tuiles">
${tuile(`${V.camera ?? '–'} %`, "tournée vers l'objectif", (V.camera ?? 0) >= 80)}
${tuile(`${A.tics.length}`, `tics en ${Math.round(A.parole)} s`, A.ticsParMinute <= 4)}
${tuile(`${A.debit}`, 'mots par minute', A.debit >= 135 && A.debit <= 235)}
${tuile(`${A.demarrage.toFixed(1)} s`, 'avant ton premier mot', A.demarrage <= 1)}
${tuile(A.baisses.length ? mmss(A.baisses[0].t) : 'stable', A.baisses.length ? "première baisse d'énergie" : 'énergie', !A.baisses.length)}
</div></section>
<section class="carte"><h2>Tes points forts</h2><ul>${(RL.forts || Vd.forts).map(f => `<li>${e(f)}</li>`).join('')}</ul></section>
<section class="carte"><h2>À travailler</h2><ul>${(RL.travail || Vd.travail.slice(0, 3).map(t => t.dit)).map(f => `<li>${e(f)}</li>`).join('')}</ul></section>
<section class="carte exo"><h2>Ton exercice de la semaine</h2><h3>${e((RL.exercice || Vd.exercice).titre)}</h3><p style="margin:0">${e((RL.exercice || Vd.exercice).faire)}</p></section>
<section class="carte"><h2>Ton énergie, seconde par seconde</h2><svg viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Volume de la voix au fil de la vidéo">${marques}<path class="courbe" d="${chemin}"/>${[0, Math.round(vals.length / 2), vals.length - 1].map(s => `<text x="${Math.min(W - 24, X(s)).toFixed(1)}" y="${H + 15}" class="lbl" style="fill:var(--doux)">${mmss(s)}</text>`).join('')}</svg>
<small>${A.baisses.length ? "Les zones orange : ta voix retombe nettement par rapport au début. C'est là qu'on risque de perdre les gens." : "Ta voix tient la distance, pas de chute nette."}</small></section>
${RL.decrochage ? `<section class="carte"><h2>Là où on risque de décrocher</h2><ul>${RL.decrochage.map(d => `<li><b>${e(d.quand)}</b> · ${e(d.quoi)}</li>`).join('')}</ul></section>` : A.redites.length ? `<section class="carte"><h2>Ce qui revient deux fois</h2><ul>${A.redites.slice(0, 5).map(r => `<li>« ${e(r.cle)} » à ${mmss(r.t1)} puis à ${mmss(r.t2)}</li>`).join('')}</ul></section>` : ''}
${RL.versionCourte ? `<section class="carte court"><h2>Ta version divisée par deux</h2><p><small>Si une vidéo peut être dite en deux fois moins de temps, c'est la version courte qui gagne. ${e(RL.versionCourte.avant)} s → ${e(RL.versionCourte.apres)} s.</small></p>${existsSync(join(dir, 'version-courte.mp4')) ? '<video src="version-courte.mp4" controls playsinline style="width:100%;max-width:300px;border-radius:12px;display:block;margin:0 auto 12px"></video>' : ''}${RL.versionCourte.texte.map(p => `<p>${e(p)}</p>`).join('')}</section>` : ''}
</main>`
  writeFileSync(join(dir, 'retour.html'), html)
  console.log(`Retour prêt : ${join(dir, 'retour.html')}`)
}

function couper(nom) {
  const dir = join(COACH, nom), RL = JSON.parse(readFileSync(join(dir, 'relecture.json'), 'utf8'))
  const garder = RL.garder || []; if (!garder.length) throw new Error('relecture.json : aucun passage « garder »')
  const source = readdirSync(dir).find(f => f.startsWith('video.'))
  // Les temps de whisper glissent (jusqu'à 1 s d'avance en début de phrase) : chaque coupe se cale dans le vrai blanc
  // le plus proche, entre deux phrases (blanc de 0,2 s au moins), jamais au milieu d’un mot. Réglé sur une vraie vidéo d’élève.
  const sil = [...lancer('ffmpeg', ['-hide_banner', '-nostats', '-i', join(dir, 'voix.wav'), '-af', 'silencedetect=n=-35dB:d=0.2', '-f', 'null', '-'], { sortie: true }).matchAll(/silence_(start|end): ([0-9.]+)/g)].map(m => +m[2])
  const blancs = []; for (let i = 0; i + 1 < sil.length; i += 2) blancs.push([sil[i], sil[i + 1]])
  const proche = (t, cle, avant, apres) => blancs.map(b => b[cle]).filter(x => x >= t - avant && x <= t + apres).sort((p, q) => Math.abs(p - t) - Math.abs(q - t))[0]
  for (let i = garder.length - 1; i > 0; i--) if (garder[i][0] - garder[i - 1][1] < 0.3) { garder[i - 1][1] = garder[i][1]; garder.splice(i, 1) } // passages qui se suivent : un seul
  for (const g of garder) {
    const a = proche(g[0], 1, 0.6, 1.5), b = proche(g[1], 0, 0.6, 1.0)
    g[0] = +(a != null ? Math.max(0, a - 0.08) : g[0]).toFixed(3); g[1] = +(b != null ? b + 0.15 : g[1]).toFixed(3)
  }
  const f = garder.map(([a, b], i) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${(b - a - 0.03).toFixed(3)}:d=0.03[a${i}];`).join('') + garder.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${garder.length}:v=1:a=1[v][a]`
  lancer('ffmpeg', ['-y', '-v', 'error', '-i', join(dir, source), '-filter_complex', f, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '20', '-preset', 'fast', '-c:a', 'aac', join(dir, 'version-courte.mp4')])
  console.log(`Version courte : ${join(dir, 'version-courte.mp4')} (${garder.reduce((s, [a, b]) => s + b - a, 0).toFixed(1)} s)`)
}

const [cmd, ...args] = process.argv.slice(2)
if (cmd === 'analyser') await analyser(args[0], args[1])
else if (cmd === 'page') page(args[0])
else if (cmd === 'couper') couper(args[0])
else console.log('node coach.mjs analyser <video> [nom] | page <nom> | couper <nom>')
