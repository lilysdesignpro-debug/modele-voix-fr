// Regarde la personne dans toute la vidéo (MediaPipe, sur l'ordinateur ou dans Claude, rien ne part en ligne) :
// visage, regard vers l'objectif, tête tournée, sourire, lumière sur le visage. Sert au coach facecam.
//   node contenu/montage/detourage/regard.mjs <video.mp4> <sortie.json>
// Sortie : [{ t, v: false } | { t, v: true, b: [x0, y0, x1, y1], yeux, camera, tourne, sourire, lumVisage, lumFond }]
// toutes les 0,25 s, boîte en pixels du cadre 720x1280, lumières entre 0 et 1.
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ICI = dirname(fileURLToPath(import.meta.url))
const [video, sortie] = process.argv.slice(2)
const PAS = 0.25
const images = join(dirname(sortie), 'regard-images'); rmSync(images, { recursive: true, force: true }); mkdirSync(images, { recursive: true })
spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-vf', `fps=${1 / PAS},scale=360:640:force_original_aspect_ratio=increase,crop=360:640`, join(images, 'i-%05d.jpg')], { stdio: 'inherit' })
const liste = readdirSync(images).filter(f => f.endsWith('.jpg')).sort()

const types = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.task': 'application/octet-stream', '.jpg': 'image/jpeg', '.html': 'text/html' }
const serveur = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0])
  const f = u.startsWith('/images/') ? join(images, u.slice(8)) : join(ICI, u)
  let corps
  try { corps = readFileSync(f) } catch { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': types[extname(f)] || 'application/octet-stream' }); res.end(corps)
}).listen(0)
writeFileSync(join(ICI, 'page-regard.html'), `<!doctype html><meta charset=utf-8><body><canvas id=c width=360 height=640></canvas><script type="module">
import { FilesetResolver, FaceLandmarker } from '/vision_bundle.mjs'
const fs = await FilesetResolver.forVisionTasks('/wasm')
const lm = await FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: '/face_landmarker.task' }, runningMode: 'IMAGE', numFaces: 1, outputFaceBlendshapes: true })
const ctx = document.getElementById('c').getContext('2d', { willReadFrequently: true })
// luminosité moyenne d'un rectangle (0 à 1)
const lum = (x0, y0, x1, y1) => {
  x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(360, x1 | 0); y1 = Math.min(640, y1 | 0)
  if (x1 - x0 < 4 || y1 - y0 < 4) return null
  const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data; let s = 0
  for (let i = 0; i < d.length; i += 16) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
  return s / (d.length / 16) / 255
}
window.regarde = async (url) => {
  const img = new Image(); img.src = url; await img.decode()
  ctx.drawImage(img, 0, 0)
  const r = lm.detect(img)
  if (!r.faceLandmarks.length) return { v: false, lumFond: lum(0, 0, 360, 640) }
  const p = r.faceLandmarks[0], bs = Object.fromEntries(r.faceBlendshapes[0].categories.map(c => [c.categoryName, c.score]))
  const xs = p.map(q => q.x * 360), ys = p.map(q => q.y * 640)
  const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  // tête tournée : le bout du nez (1) par rapport au milieu des deux joues (234, 454)
  const largeur = p[454].x - p[234].x, lacet = largeur ? ((p[1].x - (p[234].x + p[454].x) / 2) / largeur) : 0
  // regard : les yeux qui partent sur le côté, en haut ou en bas (scores 0 à 1 de MediaPipe)
  const cote = Math.max((bs.eyeLookOutLeft + bs.eyeLookInRight) / 2, (bs.eyeLookInLeft + bs.eyeLookOutRight) / 2)
  const haut = (bs.eyeLookUpLeft + bs.eyeLookUpRight) / 2, bas = (bs.eyeLookDownLeft + bs.eyeLookDownRight) / 2
  const fermes = (bs.eyeBlinkLeft + bs.eyeBlinkRight) / 2 > 0.5
  // Réglé sur une vraie vidéo (02/11/2026) : les scores des yeux se trompent avec des lunettes et quand l'objectif
  // est bas (on le regarde « vers le bas » en le fixant). Seule la tête franchement tournée est un signe fiable.
  const tourne = Math.abs(lacet) > 0.4
  const camera = !tourne && !fermes
  const yeux = (p[159].y + p[386].y) / 2 * 640
  const lumVisage = lum(b[0] + (b[2] - b[0]) * 0.2, b[1] + (b[3] - b[1]) * 0.25, b[2] - (b[2] - b[0]) * 0.2, b[3] - (b[3] - b[1]) * 0.15)
  return { v: true, b: b.map(x => Math.round(x * 2)), yeux: Math.round(yeux * 2), camera, tourne, fermes, brut: [lacet, cote, haut, bas].map(x => +x.toFixed(2)), sourire: (bs.mouthSmileLeft + bs.mouthSmileRight) / 2, lumVisage, lumFond: lum(0, 0, 360, 640) }
}
window.pret = true
</script>`)

async function navigateur() {
  try {
    const pup = (await import('puppeteer')).default
    const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
    return await pup.launch({ ...(chrome ? { executablePath: chrome } : {}), args: ['--enable-unsafe-swiftshader'] })
  } catch {
    const { createRequire } = await import('node:module')
    const racine = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout.trim()
    const { chromium } = createRequire(join(racine, 'x.js'))('playwright')
    return chromium.launch({ executablePath: ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync), args: ['--enable-unsafe-swiftshader'] })
  }
}
const nav = await navigateur()
const page = await nav.newPage()
await page.goto(`http://127.0.0.1:${serveur.address().port}/page-regard.html`); await page.waitForFunction('window.pret === true', { timeout: 120000 })
const res = []
for (const [k, f] of liste.entries()) res.push({ t: +(k * PAS).toFixed(2), ...(await page.evaluate(u => window.regarde(u), `/images/${f}`)) })
await nav.close(); serveur.close()
rmSync(images, { recursive: true, force: true })
writeFileSync(sortie, JSON.stringify(res))
console.log(`visage vu sur ${res.filter(r => r.v).length}/${res.length} images → ${sortie}`)
