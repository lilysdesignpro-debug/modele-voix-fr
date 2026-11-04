// LE DÉFI « 1 TEXTE, 6 TONS » (Promo 0) : l'élève filme le même texte sur 6 tons, l'outil en fait UN reel.
// Chaque prise passe à son tour avec son ton affiché, puis les 6 se retrouvent ensemble en mosaïque,
// avec une question qui fait parler (« lequel tu préfères ? »). Blancs du début et de la fin coupés.
//
//   node contenu/montage/defi.mjs <sortie.mp4> <prise1> <ton1> <prise2> <ton2> ... (2 à 6 prises)
//   ex. node defi.mjs defi.mp4 a.mp4 "enthousiaste" b.mp4 "chuchoté" c.mp4 "en colère" ...
// Option : DEFI_QUESTION="Lequel tu préfères ? Dis-moi le numéro en commentaire" pour changer la phrase de fin.
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const [sortie, ...reste] = process.argv.slice(2)
const prises = []; for (let i = 0; i + 1 < reste.length; i += 2) prises.push({ f: reste[i], ton: reste[i + 1] })
if (!sortie || prises.length < 2 || prises.length > 6) { console.log('node defi.mjs <sortie.mp4> <prise1> <ton1> <prise2> <ton2> ... (2 à 6 prises)'); process.exit(1) }
const QUESTION = process.env.DEFI_QUESTION || 'Lequel tu préfères ? Le numéro en commentaire'
const lancer = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`${cmd} : ${(r.stderr || '').slice(-500)}`); return r.stdout + r.stderr }
// une police livrée avec l'outil, au format que drawtext sait lire (chemin protégé pour ffmpeg, même sous Windows)
const police = [join(ICI, 'polices', 'Poppins-Bold.ttf'), 'C:/Windows/Fonts/arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf']
  .find(existsSync).replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:')
const txt = s => s.replace(/\\/g, '\\\\').replace(/'/g, '\u2019').replace(/:/g, '\\:').replace(/%/g, '\\%')

// où commence et finit vraiment la voix de chaque prise (on garde 0,15 s d'air)
for (const p of prises) {
  const D = +lancer('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p.f]).trim()
  const s = [...lancer('ffmpeg', ['-hide_banner', '-nostats', '-i', p.f, '-af', 'silencedetect=n=-35dB:d=0.3', '-f', 'null', '-']).matchAll(/silence_(start|end): ([0-9.]+)/g)].map(m => [m[1], +m[2]])
  p.a = s[0]?.[0] === 'start' && s[0][1] < 0.05 && s[1] ? Math.max(0, s[1][1] - 0.15) : 0
  const der = s.at(-1); p.b = der?.[0] === 'start' && der[1] > p.a + 1 ? Math.min(D, der[1] + 0.2) : D
}
const MOS = Math.min(4, ...prises.map(p => p.b - p.a)) // la mosaïque finale dure le temps de la plus courte prise (4 s max)
const n = prises.length, colonnes = n <= 2 ? 1 : 2, lignes = Math.ceil(n / colonnes)
const W = 720 / colonnes, H = Math.floor(1280 / lignes / 2) * 2
let f = ''
prises.forEach((p, i) => {
  // le ton s'affiche EN BAS, sous le visage, dans la zone qu'Instagram et TikTok laissent visible ;
  // la taille s'adapte pour que « présentatrice télé » tienne sur la largeur sûre (48 à 624 px)
  const taille = Math.min(60, Math.floor(540 / (p.ton.length * 0.68)))
  const etiquette = `drawtext=fontfile='${police}':text='${i + 1}/${n}':x=48+(576-tw)/2:y=850:fontsize=34:fontcolor=white:box=1:boxcolor=0x800020@0.92:boxborderw=12,drawtext=fontfile='${police}':text='${txt(p.ton.toUpperCase())}':x=48+(576-tw)/2:y=${910 + Math.round((60 - taille) / 2)}:fontsize=${taille}:fontcolor=white:borderw=6:bordercolor=black@0.85`
  f += `[${i}:v]trim=${p.a}:${p.b},setpts=PTS-STARTPTS,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,fps=30,split=2[s${i}][m${i}];`
  f += `[s${i}]${etiquette}[v${i}];[${i}:a]atrim=${p.a}:${p.b},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo,afade=t=in:d=0.03,afade=t=out:st=${(p.b - p.a - 0.06).toFixed(3)}:d=0.06[a${i}];`
  f += `[m${i}]trim=0:${MOS.toFixed(3)},setpts=PTS-STARTPTS,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},drawtext=fontfile='${police}':text='${i + 1}':x=14:y=10:fontsize=44:fontcolor=white:borderw=4:bordercolor=black@0.8[t${i}];`
})
// la mosaïque : les prises côte à côte, la question au milieu, sur fond sombre si la grille ne remplit pas tout
const cases = prises.map((_, i) => `[t${i}]`).join('')
const pos = prises.map((_, i) => `${(i % colonnes) * W}_${Math.floor(i / colonnes) * H}`).join('|')
// la question, coupée en deux lignes au mot le plus proche du milieu, au centre de la mosaïque
const mots = QUESTION.split(' '), coupe = mots.reduce((m, _, k) => Math.abs(mots.slice(0, k).join(' ').length - QUESTION.length / 2) < Math.abs(mots.slice(0, m).join(' ').length - QUESTION.length / 2) ? k : m, 1)
const q = QUESTION.indexOf('?') // une question suivie d'une consigne : la coupure naturelle est juste après le « ? »
const lignesQ = (q > 0 && q < QUESTION.length - 2 ? [QUESTION.slice(0, q + 1), QUESTION.slice(q + 1).trim()] : [mots.slice(0, coupe).join(' '), mots.slice(coupe).join(' ')]).filter(Boolean)
const tq = Math.min(40, Math.floor(560 / (Math.max(...lignesQ.map(l => l.length)) * 0.6)))
const question = lignesQ.map((l, k) => `drawtext=fontfile='${police}':text='${txt(l)}':x=48+(576-tw)/2:y=${560 + k * (tq + 22)}:fontsize=${tq}:fontcolor=white:box=1:boxcolor=0x800020@0.95:boxborderw=14`).join(',')
f += `${cases}xstack=inputs=${n}:layout=${pos}:fill=black,pad=720:1280:0:(1280-ih)/2:black,${question}[mos];`
f += `anullsrc=r=44100:cl=stereo,atrim=0:${MOS.toFixed(3)}[am];`
f += prises.map((_, i) => `[v${i}][a${i}]`).join('') + `[mos][am]concat=n=${n + 1}:v=1:a=1[v][a]`
lancer('ffmpeg', ['-y', '-v', 'error', ...prises.flatMap(p => ['-i', p.f]), '-filter_complex', f, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '20', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', sortie])
const total = prises.reduce((s, p) => s + p.b - p.a, 0) + MOS
console.log(`Défi monté : ${sortie} (${total.toFixed(1)} s, ${n} tons + la mosaïque)`)
