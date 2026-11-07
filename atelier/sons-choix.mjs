// Le choix des sons (06/11) : chaque élève peut choisir SES sons dans projet.json, clé "sons".
//
//   "sons": { "pack": "doux" }                    tous les sons d'un pack (doux, pop, luxe)
//   "sons": { "pop": "pop-c" }                     cette famille prend toujours ce son-là
//   "sons": { "whoosh": ["whoosh-a", "soyeux-2"] } ces sons-là, à tour de rôle
//   "sons": { "glitch": "aucun" }                  plus jamais de son de cette famille
//
// Ordre : un son fixé pour la famille > le pack > la rotation d'avant (tous les sons de la famille).
// Le style « luxe » prend le pack luxe s'il n'en choisit pas d'autre.
// Un nom absent de sons/ est ignoré : on retombe sur l'étape suivante, jamais d'erreur.

// Les packs. Seuls les sons présents dans sons/ comptent : tant qu'un son choisi par Aurélie n'y est pas,
// le pack retombe sur la rotation habituelle. À compléter quand elle aura choisi dans la page d'écoute.
// (06/11) remplis avec les sons qu'Aurélie a gardés à l'oreille.
export const PACKS = {
  doux: { pop: ['pop-c', 'pop-a'], clic: ['clic-a'], whoosh: ['whoosh-d', 'whoosh-doux'], cloche: ['cloche-b'], kaching: ['cloche-b'], glitch: [], photo: ['photo-c'], clavier: ['clavier-d'] },
  pop: { pop: ['pop-c', 'pop-a', 'pop-b'], whoosh: ['whoosh-c', 'whoosh-a'], kaching: ['kaching-e', 'kaching-a'], photo: ['photo-c', 'photo-d'] },
  luxe: { pop: ['clic-a'], whoosh: ['whoosh-d', 'whoosh-doux'], cloche: ['cloche-b'], kaching: ['cloche-b'], glitch: [], magie: ['magie-a'], photo: ['photo-d'], page: ['page-b'] },
}

// Les familles d'objets (06/11) : si aucun son de la famille n'est dans sons/, on prend celui de la famille proche.
export const REPLI = { coffre: 'clic', boite: 'whoosh', papier: 'clic', punaise: 'clic', tirage: 'photo', tampon: 'pop', page: 'whoosh', stylo: 'clic', enveloppe: 'whoosh' }

const AUCUN = new Set(['aucun', 'non', 'rien', 'off'])

// SONS : les noms (sans .wav) présents dans sons/ ; prefs : P.sons ; theme : le style du montage.
// Renvoie son(fam) -> nom du son, ou null si la famille est coupée ou vide.
export function sonneur(SONS, prefs, theme) {
  const P = prefs && typeof prefs === 'object' ? prefs : {}
  const pack = PACKS[P.pack] || (theme === 'luxe' ? PACKS.luxe : null) || {}
  const tours = {}
  const famille = fam => SONS.filter(x => x.startsWith(fam + '-') || x === fam || (fam === 'clavier' && x.startsWith('clavier')))
  const garde = v => [].concat(v ?? []).map(String).filter(x => SONS.includes(x))
  const son = fam => {
    const fixe = P[fam]
    if (fixe === false || (typeof fixe === 'string' && AUCUN.has(fixe.toLowerCase()))) return null
    let l = garde(fixe)
    if (!l.length && fam in pack) { l = garde(pack[fam]); if (!l.length && Array.isArray(pack[fam]) && !pack[fam].length) return null } // [] dans un pack = famille coupée
    if (!l.length) l = famille(fam)
    if (!l.length && REPLI[fam] && P[fam] == null) return son(REPLI[fam])
    if (!l.length) return null
    tours[fam] = (tours[fam] ?? -1) + 1
    return l[tours[fam] % l.length]
  }
  return son
}
