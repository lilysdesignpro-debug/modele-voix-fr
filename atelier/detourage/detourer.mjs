// Détoure la personne image par image (MediaPipe, sur l'ordinateur, rien ne part en ligne).
// Sert à faire passer un titre DERRIÈRE la tête,.
//   node contenu/montage/detourage/detourer.mjs <video.mp4> <debut> <fin> <dossier-sortie>
// Sortie : masque-0001.png… (blanc = la personne, noir = le fond), 30 images par seconde, en 720x1280.
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ICI = dirname(fileURLToPath(import.meta.url))
const [video, debut, fin, sortie] = process.argv.slice(2)
// (08/11) sans le modèle (téléchargé à l'installation), on s'arrête tout de suite : avant, l'outil attendait 2 minutes pour rien
import { existsSync as existe0 } from 'node:fs'
if (!existe0(join(ICI, 'selfie_multiclass.tflite'))) { mkdirSync(sortie, { recursive: true }) /* le dossier vide dit « pas de masques » au montage, qui continue */; console.error('(détourage indisponible : le modèle n\'est pas installé ; relance l\'installation de l\'atelier pour le titre derrière la tête)'); process.exit(2) }
mkdirSync(sortie, { recursive: true })
const images = join(sortie, 'images'); mkdirSync(images, { recursive: true })
spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', debut, '-to', fin, '-i', video, '-vf', 'fps=30,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280', join(images, 'i-%04d.jpg')], { stdio: 'inherit' })
const liste = readdirSync(images).filter(f => f.endsWith('.jpg')).sort()

const types = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.tflite': 'application/octet-stream', '.jpg': 'image/jpeg', '.html': 'text/html' }
const serveur = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0])
  const f = u.startsWith('/images/') ? join(images, u.slice(8)) : join(ICI, u)
  let corps
  try { corps = readFileSync(f) } catch { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': types[extname(f)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' }); res.end(corps)
}).listen(0)
const port = serveur.address().port
writeFileSync(join(ICI, 'page.html'), `<!doctype html><meta charset=utf-8><body><script type="module">
import { FilesetResolver, ImageSegmenter } from '/vision_bundle.mjs'
const fs = await FilesetResolver.forVisionTasks('/wasm')
window.seg = await ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: '/selfie_multiclass.tflite' }, runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true })
window.masque = async (url) => {
  const img = new Image(); img.src = url; await img.decode()
  const r = window.seg.segment(img)
  const fond = r.confidenceMasks[0].getAsFloat32Array(), w = r.confidenceMasks[0].width, h = r.confidenceMasks[0].height
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const d = g.createImageData(w, h)
  for (let i = 0; i < fond.length; i++) { const v = Math.round(255 * Math.min(1, Math.max(0, (1 - fond[i] - 0.15) / 0.7))); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255 }
  g.putImageData(d, 0, 0); r.close?.()
  const o = document.createElement('canvas'); o.width = 720; o.height = 1280; const og = o.getContext('2d'); og.imageSmoothingQuality = 'high'; og.filter = 'blur(1.5px)'; og.drawImage(c, 0, 0, 720, 1280)
  return o.toDataURL('image/png')
}
window.pret = true
</script>`)

// puppeteer sur l'ordinateur ; dans Claude (pas de puppeteer), le Playwright déjà installé
async function navigateur() {
  const existe = f => { try { readFileSync(f); return true } catch { return false } }
  try {
    const pup = (await import('puppeteer')).default
    const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existe)
    return await pup.launch({ ...(chrome ? { executablePath: chrome } : {}), args: ['--enable-unsafe-swiftshader'] })
  } catch {
    const { createRequire } = await import('node:module')
    const racine = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout.trim()
    const { chromium } = createRequire(join(racine, 'x.js'))('playwright')
    return chromium.launch({ executablePath: ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existe), args: ['--enable-unsafe-swiftshader'] })
  }
}
const nav = await navigateur()
const page = await nav.newPage()
await page.goto(`http://127.0.0.1:${port}/page.html`); await page.waitForFunction('window.pret === true', { timeout: 120000 })
for (const [k, f] of liste.entries()) {
  const png = await page.evaluate(u => window.masque(u), `/images/${f}`)
  writeFileSync(join(sortie, `masque-${String(k + 1).padStart(4, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'))
}
await nav.close(); serveur.close()
rmSync(images, { recursive: true, force: true })
console.log(`${liste.length} masques dans ${sortie}`)
