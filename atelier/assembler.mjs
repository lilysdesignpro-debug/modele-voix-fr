// ASSEMBLER PLUSIEURS VIDÉOS EN UNE : pour celles qui filment phrase par phrase, plan par plan, à plusieurs endroits.
//   node assembler.mjs <sortie.mp4> <video1> <video2> ...      (dans l'ordre de la vidéo finale)
// Chaque morceau est remis au même format (vertical 1080×1920 : la taille de sortie d'echelle.mjs, 30 images/s), son son mis au même volume que les
// autres, et collé au suivant. La vidéo obtenue se monte ensuite comme une vidéo filmée d'un coup
// (node montage.mjs lire <sortie.mp4> …) : les blancs du début et de la fin de chaque prise partent au montage.
// Écrit aussi <sortie>.plans.json : où commence chaque morceau, pour savoir où sont les changements de plan.
import { spawnSync } from 'node:child_process'
import { writeFileSync, existsSync } from 'node:fs'
import { CADRE } from './echelle.mjs'

const [sortie, ...videos] = process.argv.slice(2)
if (!sortie || videos.length < 1) { console.log('Usage : node assembler.mjs <sortie.mp4> <video1> <video2> ...'); process.exit(1) }
for (const v of videos) if (!existsSync(v)) { console.log(`Vidéo introuvable : ${v}`); process.exit(1) }

const sonde = f => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height:stream_side_data=rotation', '-of', 'json', f], { encoding: 'utf8' })
  const j = JSON.parse(r.stdout || '{}'), vid = (j.streams || []).find(s => s.codec_type === 'video') || {}
  const rot = Math.abs(+(vid.side_data_list?.[0]?.rotation || 0)) % 180 === 90
  return { duree: +j.format?.duration || 0, son: (j.streams || []).some(s => s.codec_type === 'audio'), l: rot ? vid.height : vid.width, h: rot ? vid.width : vid.height }
}
const infos = videos.map(sonde)
const horizontales = infos.map((x, k) => x.l > x.h ? k + 1 : 0).filter(Boolean)

// la lumière et la couleur de chaque morceau, pour les égaliser (egaliser) : on vise la moyenne des morceaux
const stats = videos.map(v => { const o = spawnSync('ffmpeg', ['-v', 'error', '-i', v, '-vf', 'fps=1,scale=64:-2,signalstats,metadata=print:file=-', '-f', 'null', '-'], { encoding: 'utf8' }).stdout || ''
  const moy = k => { const l = [...o.matchAll(new RegExp('lavfi.signalstats.' + k + '=([\\d.]+)', 'g'))].map(x => +x[1]); return l.length ? l.reduce((s, x) => s + x, 0) / l.length : null }
  return { y: moy('YAVG'), u: moy('UAVG'), v: moy('VAVG') } })
const med = k => { const l = stats.map(s => s[k]).filter(x => x != null).sort((x, y) => x - y); return l.length ? l[l.length >> 1] : null }
const cible = { y: med('y'), u: med('u'), v: med('v') }
const egaliser = k => { const s = stats[k]; if (videos.length < 2 || !s || s.y == null || cible.y == null) return ''
  const by = Math.max(-0.12, Math.min(0.12, (cible.y - s.y) / 255)), du = Math.round(Math.max(-8, Math.min(8, cible.u - s.u))), dv = Math.round(Math.max(-8, Math.min(8, cible.v - s.v)))
  return `,eq=brightness=${by.toFixed(3)},lutyuv=u=val${du >= 0 ? '+' : ''}${du}:v=val${dv >= 0 ? '+' : ''}${dv}` }
// chaque morceau : recadré en vertical (sans bandes noires), 30 i/s, son stéréo 48 kHz au même volume
let f = '', debut = 0; const plans = []
infos.forEach((x, k) => {
  f += `[${k}:v]scale=${CADRE}:force_original_aspect_ratio=increase:flags=lanczos,crop=${CADRE},setsar=1,fps=30,format=yuv420p${egaliser(k)}[v${k}];`
  f += x.son ? `[${k}:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a${k}];`
    : `anullsrc=r=48000:cl=stereo,atrim=0:${x.duree.toFixed(3)}[a${k}];`
  plans.push({ video: videos[k], debut: +debut.toFixed(3), duree: +x.duree.toFixed(3) }); debut += x.duree
})
f += infos.map((_, k) => `[v${k}][a${k}]`).join('') + `concat=n=${infos.length}:v=1:a=1[v][a]`
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...videos.flatMap(v => ['-i', v]), '-filter_complex', f, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '17', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', sortie], { encoding: 'utf8', maxBuffer: 1 << 26 })
if (r.status !== 0) { console.log(`L'assemblage a échoué : ${(r.stderr || '').slice(-400)}`); process.exit(1) }
writeFileSync(sortie.replace(/\.mp4$/i, '') + '.plans.json', JSON.stringify(plans, null, 1))
console.log(`ASSEMBLÉ : ${videos.length} morceaux, ${debut.toFixed(1)} s → ${sortie}`)
if (horizontales.length) console.log(`ATTENTION : le(s) morceau(x) ${horizontales.join(', ')} étai(en)t filmé(s) à l'horizontale : recadré(s) au centre en vertical. Regarde une image pour vérifier qu'elle est bien dans le cadre.`)
if (debut > 95) console.log(`ATTENTION : ${debut.toFixed(0)} s au total, au-delà d'une minute et demie. Propose-lui de garder les meilleurs morceaux.`)
