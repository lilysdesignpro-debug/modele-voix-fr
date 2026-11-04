// Met l'atelier à jour depuis le GitHub d'Aurélie, à chaque préparation de l'atelier (en ligne comme sur l'ordinateur).
//   node mettre-a-jour.mjs            (lancé depuis le dossier de l'outil)
// Ne télécharge que les fichiers qui ont changé. Ne touche jamais à SES projets ni à SES chartes.
// Sans réseau, ou si GitHub ne répond pas : l'atelier garde la version qu'il a, rien ne casse.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const DEPOT = 'https://raw.githubusercontent.com/lilysdesignpro-debug/modele-voix-fr/main/atelier/'
const empreinte = f => existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex') : ''
const lire = async (chemin, octets = false) => {
  const r = await fetch(DEPOT + chemin.split('/').map(encodeURIComponent).join('/'), { signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`${r.status}`)
  return octets ? Buffer.from(await r.arrayBuffer()) : r.text()
}

try {
  const distant = JSON.parse(await lire('version.json'))
  let n = 0
  for (const [f, sha] of Object.entries(distant.fichiers)) {
    if (/^(projets|chartes\/(?!modele\.json)|node_modules)/.test(f)) continue // jamais SES fichiers
    const local = join(ICI, f)
    if (empreinte(local) === sha) continue
    const contenu = await lire(f, true)
    if (createHash('sha256').update(contenu).digest('hex') !== sha) throw new Error(`fichier abîmé : ${f}`)
    mkdirSync(dirname(local), { recursive: true }); writeFileSync(local, contenu); n++
  }
  writeFileSync(join(ICI, 'version.txt'), String(distant.version))
  console.log(n ? `MISE À JOUR : ${n} fichier(s) de l'outil mis à jour (version ${distant.version})` : `Outil à jour (version ${distant.version})`)
  // Le mode d'emploi (SKILL.md) ne se met pas à jour tout seul : on prévient s'il en existe un plus récent
  const modeEmploi = process.env.MODE_EMPLOI || join(ICI, '..', 'SKILL.md')
  const v = (existsSync(modeEmploi) ? readFileSync(modeEmploi, 'utf8') : '').match(/mode d'emploi v(\d+)/)?.[1]
  if (v && +distant.modeEmploi > +v) console.log(`NOUVEAU MODE D'EMPLOI : dis-lui qu'une nouvelle version de l'outil existe et qu'Aurélie peut lui renvoyer le fichier (elle a la v${v}, la dernière est la v${distant.modeEmploi}). Ça ne l'empêche pas de monter aujourd'hui.`)
} catch (e) {
  console.log(`(mise à jour impossible pour l'instant : ${e.message.slice(0, 80)} ; l'outil garde sa version)`)
}
