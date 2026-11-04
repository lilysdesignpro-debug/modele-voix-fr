// UNE VIDÉO, TOUT LE CONTENU : à partir d'un projet déjà réglé (projets/<nom>/), fabrique d'un coup
// le reel, ses 3 hooks à tester, une story et la légende, rangés dans projets/<nom>/contenu/.
//
//   node contenu/montage/declinaisons.mjs <nom>
//
// Lit projets/<nom>/declinaisons.json, écrit par Claude après lecture de la transcription :
//   { "hooks": [ { "nom": "question", "ouverture": [début, fin], "titre": "ses mots/à la *ligne*" }, … ],
//     "story": { "duree": 12, "bandeau": "Nouvelle vidéo" },
//     "legende": "le texte de la légende" }
// Le hook n°1 est le reel tel qu'il est réglé. Les autres rejouent une de SES phrases en ouverture
// (une phrase qu'elle a vraiment dite, jamais une autre), puis la vidéo démarre normalement.
// Pour tester : publier les hooks en reels d'essai, à quelques jours d'écart, et comparer les vues à 3 s.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url)), PROJETS = join(ICI, 'projets')
const nom = process.argv[2]
const dir = join(PROJETS, nom || '')
if (!nom || !existsSync(join(dir, 'declinaisons.json'))) { console.log('node declinaisons.mjs <nom>  (il faut projets/<nom>/declinaisons.json)'); process.exit(1) }
const DC = JSON.parse(readFileSync(join(dir, 'declinaisons.json'), 'utf8'))
const sortie = join(dir, 'contenu'); mkdirSync(sortie, { recursive: true })
const lancer = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`${cmd} : ${(r.stderr || r.stdout || '').slice(-600)}`); return r.stdout + r.stderr }
const derniere = d => readdirSync(d).filter(f => /-v\d+\.mp4$/.test(f)).sort((a, b) => statSync(join(d, b)).mtimeMs - statSync(join(d, a)).mtimeMs)[0]
const monter = n => { const r = spawnSync('node', [join(ICI, 'montage.mjs'), 'monter', n], { encoding: 'utf8', maxBuffer: 1 << 28 }); const alerte = (r.stdout + r.stderr).split('\n').filter(l => /VISAGE|rror|retirée/.test(l)); alerte.forEach(l => console.log('  ' + l.trim()))
  // un titre d'ouverture sans place hors du visage (gros plan) : la phrase est à changer pour un plan plus large
  if (alerte.some(l => /VISAGE.*titre/.test(l))) console.log(`  ⚠️ ${n} : le titre touche son visage, choisis une phrase d'ouverture où elle est filmée plus large`)
  if (r.status !== 0) throw new Error(`le montage de ${n} a échoué`) }

// 1. Le reel (= hook n°1)
if (!derniere(dir)) { console.log('Montage du reel…'); monter(nom) }
copyFileSync(join(dir, derniere(dir)), join(sortie, 'reel.mp4'))
copyFileSync(join(dir, derniere(dir)), join(sortie, 'hook-1.mp4'))
console.log('✓ reel.mp4 (= hook-1.mp4)')

// 2. Les autres hooks : une copie du projet, avec une de ses phrases rejouée en ouverture
for (const [k, h] of (DC.hooks || []).entries()) {
  const nh = `${nom}-hook-${k + 2}`, dh = join(PROJETS, nh); mkdirSync(dh, { recursive: true })
  // déjà monté avec la même phrase et le même titre : on le garde, un hook ne se remonte que s'il a changé
  const avant = existsSync(join(dh, 'projet.json')) ? JSON.parse(readFileSync(join(dh, 'projet.json'), 'utf8')) : null
  if (avant && derniere(dh) && !h.retirer && JSON.stringify(avant.ouverture) === JSON.stringify(h.ouverture) && avant.titre === h.titre) {
    copyFileSync(join(dh, derniere(dh)), join(sortie, `hook-${k + 2}.mp4`)); console.log(`✓ hook-${k + 2}.mp4 (inchangé)`); continue
  }
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory() || (/\.mp4$/.test(f) && f !== 'source.mp4') || f === 'declinaisons.json') continue
    copyFileSync(p, join(dh, f))
  }
  const P = JSON.parse(readFileSync(join(dir, 'projet.json'), 'utf8'))
  // Deux façons d'avoir un autre début :
  // - « hooks filmés » (la meilleure) : elle a dit ses 3 débuts à la suite au tournage ; chaque version garde le sien
  //   et retire les deux autres (`retirer`), l'enchaînement est donc celui qu'elle a vraiment dit ;
  // - « ouverture » : une de ses phrases d'au milieu rejouée en tête. Seulement si la phrase se comprend seule et
  //   que l'enchaînement sonne naturel à la réécoute (sinon ça sonne collé, retour d'Aurélie du 02/11/2026).
  if (h.retirer) { P.retirer = [...(P.retirer || []), ...h.retirer]; delete P.ouverture } else P.ouverture = h.ouverture
  P.titre = h.titre; P.hookFin = h.hookFin ?? null
  if (!h.compteur) delete P.compteur // un compteur n'a de sens que si la phrase d'ouverture contient le chiffre
  else P.compteur = h.compteur
  writeFileSync(join(dh, 'projet.json'), JSON.stringify(P, null, 1))
  console.log(`Montage du hook ${k + 2} (${h.nom || 'variante'})…`); monter(nh)
  copyFileSync(join(dh, derniere(dh)), join(sortie, `hook-${k + 2}.mp4`))
  console.log(`✓ hook-${k + 2}.mp4`)
}

// 3. La story : le début du reel (15 s max), avec un bandeau en haut et la place libre en bas pour
//    le sticker qu'elle ajoute dans Instagram (lien, sondage, question).
const S = DC.story || {}, dureeStory = Math.min(15, S.duree || 12)
const police = [join(ICI, 'polices', 'Poppins-Bold.ttf'), 'C:/Windows/Fonts/arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'].find(existsSync).replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:')
const txt = s => s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F]/gu, '').trim().replace(/\\/g, '\\\\').replace(/'/g, '\u2019').replace(/:/g, '\\:').replace(/%/g, '\\%')
const bandeau = txt(S.bandeau || 'Nouvelle vidéo')
lancer('ffmpeg', ['-y', '-v', 'error', '-i', join(sortie, 'reel.mp4'), '-t', String(dureeStory), '-vf',
  `drawtext=fontfile='${police}':text='${bandeau.toUpperCase()}':x=(w-tw)/2:y=260:fontsize=36:fontcolor=white:box=1:boxcolor=0x800020@0.95:boxborderw=18,fade=t=out:st=${dureeStory - 0.4}:d=0.4`,
  '-af', `afade=t=out:st=${dureeStory - 0.4}:d=0.4`, '-c:v', 'libx264', '-crf', '20', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', join(sortie, 'story.mp4')])
console.log(`✓ story.mp4 (${dureeStory} s : ajoute ton sticker lien ou sondage en bas dans Instagram)`)

// 4. La légende
if (DC.legende) { writeFileSync(join(sortie, 'legende.txt'), DC.legende.trim() + '\n'); console.log('✓ legende.txt') }
console.log(`Tout est dans ${sortie}`)
