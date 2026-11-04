// Repère le visage dans toute la vidéo (MediaPipe, sur l'ordinateur ou dans Claude, rien ne part en ligne).
// Sert à ne JAMAIS poser un sous-titre, une carte ou un titre sur un visage.
//   node contenu/montage/detourage/visages.mjs <video.mp4> <sortie.json>
// Sortie : [{ t, b: [x0, y0, x1, y1] | null }] toutes les 0,25 s, en pixels du cadre 720x1280
// (même recadrage que le montage). La boîte est agrandie : front et cheveux au-dessus, menton en dessous.
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ICI = dirname(fileURLToPath(import.meta.url))
const [video, sortie] = process.argv.slice(2)
const PAS = 0.25
const images = join(dirname(sortie), 'visages-images'); rmSync(images, { recursive: true, force: true }); mkdirSync(images, { recursive: true })
spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-vf', `fps=${1 / PAS},scale=360:640:force_original_aspect_ratio=increase,crop=360:640`, join(images, 'i-%05d.jpg')], { stdio: 'inherit' })
const liste = readdirSync(images).filter(f => f.endsWith('.jpg')).sort()

const types = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.tflite': 'application/octet-stream', '.jpg': 'image/jpeg', '.html': 'text/html' }
const serveur = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0])
  const f = u.startsWith('/images/') ? join(images, u.slice(8)) : join(ICI, u)
  let corps
  try { corps = readFileSync(f) } catch { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': types[extname(f)] || 'application/octet-stream' }); res.end(corps)
}).listen(0)
writeFileSync(join(ICI, 'page-visages.html'), `<!doctype html><meta charset=utf-8><body><script type="module">
import { FilesetResolver, FaceDetector } from '/vision_bundle.mjs'
const fs = await FilesetResolver.forVisionTasks('/wasm')
window.det = await FaceDetector.createFromOptions(fs, { baseOptions: { modelAssetPath: '/blaze_face_short_range.tflite' }, runningMode: 'IMAGE', minDetectionConfidence: 0.6 })
window.visage = async (url) => {
  const img = new Image(); img.src = url; await img.decode()
  const r = window.det.detect(img).detections
  if (!r.length) return null
  const d = r.sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height)[0].boundingBox
  return [d.originX, d.originY, d.originX + d.width, d.originY + d.height]
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
await page.goto(`http://127.0.0.1:${serveur.address().port}/page-visages.html`); await page.waitForFunction('window.pret === true', { timeout: 120000 })
const res = []
for (const [k, f] of liste.entries()) {
  const b = await page.evaluate(u => window.visage(u), `/images/${f}`)
  // en pixels 720x1280, agrandie : cheveux (+15 % au-dessus), le bas de la boîte de MediaPipe descend sous le menton : on le remonte de 12 %
  res.push({ t: +(k * PAS).toFixed(2), b: b && (() => { const [x0, y0, x1, y1] = b.map(v => v * 2), w = x1 - x0, h = y1 - y0; return [x0 - 0.05 * w, y0 - 0.15 * h, x1 + 0.05 * w, y1 - 0.12 * h].map(Math.round) })() })
}
await nav.close(); serveur.close()
// Lissage : une détection isolée (fausse alerte) saute ; chaque boîte = médiane de ses voisines (±0,5 s).
const lisse = res.map((r, i) => {
  const v = res.slice(Math.max(0, i - 2), i + 3).map(x => x.b).filter(Boolean)
  if (!r.b && v.length < 3) return { t: r.t, b: null }
  if (v.length < 2) return { t: r.t, b: null }
  const med = k => v.map(b => b[k]).sort((x, y) => x - y)[v.length >> 1]
  return { t: r.t, b: [0, 1, 2, 3].map(med) }
})
res.splice(0, res.length, ...lisse)
rmSync(images, { recursive: true, force: true })
writeFileSync(sortie, JSON.stringify(res))
console.log(`visage repéré sur ${res.filter(r => r.b).length}/${res.length} images → ${sortie}`)
