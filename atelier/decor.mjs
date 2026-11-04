// LA CONSTELLATION (validée par Aurélie le 04/11/2026, réf. visuelle : les titres « hyper modernes » d'Instagram) :
// autour du titre du hook, des étoiles gonflées en 3D et brillantes, des étoiles au trait (double contour), de petites
// étoiles blanches et des nuages en volume. Tout est dessiné ici en SVG, aux couleurs de sa charte : aucune image
// d'internet, aucun droit à vérifier.
//   etoileGonflee(couleur, taille, rot) · etoileTrait(couleur, taille, rot) · etoileBlanche(taille, rot) · nuage(taille)
//   PLACES_CONSTELLATION : les emplacements (en pixels sur 720 × 1280), à filtrer selon son visage et le titre
const pts = (n, r1, r2, cx = 50, cy = 50) => Array.from({ length: n * 2 }, (_, k) => { const a = k * Math.PI / n - Math.PI / 2, r = k % 2 ? r2 : r1; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] })
const poly = p => p.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ')
// une étoile aux pointes arrondies : c'est ce qui donne l'effet « gonflé »
const etoileRonde = (r1, r2) => { const p = pts(5, r1, r2), m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d0 = m(p.at(-1), p[0])
  return 'M' + d0.map(v => v.toFixed(1)).join(' ') + p.map((q, k) => { const s = m(q, p[(k + 1) % p.length]); return ' Q' + q.map(v => v.toFixed(1)).join(' ') + ' ' + s.map(v => v.toFixed(1)).join(' ') }).join('') + 'Z' }
let n = 0
export const etoileGonflee = (couleur, taille, rot = 0) => { const k = n++
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 100 100" style="transform:rotate(${rot}deg);overflow:visible;filter:drop-shadow(0 8px 10px rgba(0,0,0,.28))"><defs><radialGradient id="eg${k}" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".18" stop-color="${couleur}" stop-opacity=".55"/><stop offset=".55" stop-color="${couleur}"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient><linearGradient id="eh${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="${etoileRonde(48, 24)}" fill="${couleur}"/><path d="${etoileRonde(48, 24)}" fill="url(#eg${k})"/><ellipse cx="38" cy="30" rx="12" ry="6" fill="url(#eh${k})" transform="rotate(-30 38 30)"/><ellipse cx="66" cy="68" rx="5" ry="2.5" fill="#fff" opacity=".5" transform="rotate(30 66 68)"/></svg>` }
export const etoileTrait = (couleur, taille, rot = 0) => `<svg width="${taille}" height="${taille}" viewBox="0 0 100 100" style="transform:rotate(${rot}deg);overflow:visible"><polygon points="${poly(pts(5, 46, 20))}" fill="none" stroke="${couleur}" stroke-width="3.2" stroke-linejoin="round"/><polygon points="${poly(pts(5, 40, 17, 52, 53))}" fill="none" stroke="${couleur}" stroke-width="1.6" stroke-linejoin="round" opacity=".8"/></svg>`
export const etoileBlanche = (taille, rot = 0) => `<svg width="${taille}" height="${taille}" viewBox="0 0 100 100" style="transform:rotate(${rot}deg);overflow:visible;filter:drop-shadow(0 2px 4px rgba(0,0,0,.15))"><polygon points="${poly(pts(5, 48, 22))}" fill="#fff"/></svg>`
export const nuage = taille => { const k = n++
  return `<svg width="${taille}" height="${Math.round(taille * 0.62)}" viewBox="0 0 160 100" style="overflow:visible;filter:drop-shadow(0 8px 10px rgba(0,0,0,.18))"><defs><radialGradient id="nu${k}" cx="45%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f1f2f5"/><stop offset="1" stop-color="#b9bdc6"/></radialGradient></defs><g fill="url(#nu${k})">${[[46, 62, 30], [78, 46, 36], [112, 58, 30], [130, 72, 20], [26, 76, 20], [80, 74, 32]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></svg>` }
// [type, x, y, taille, rotation] : une couronne autour du haut de l'image ; les places qui touchent son visage ou le
// texte du titre sont retirées au montage (dans le doute, on en met moins)
export const PLACES_CONSTELLATION = [
  ['nuage', 50, 60, 150, 0], ['blanche', 228, 110, 40, 12], ['trait', 500, 60, 120, 8], ['trait', 612, 160, 64, -10],
  ['gonflee', 60, 230, 110, -12], ['trait', 24, 340, 96, -14], ['trait', 84, 450, 58, 10], ['nuage', 520, 300, 110, 0],
  ['gonflee', 566, 420, 130, 10], ['blanche', 470, 470, 52, -8], ['blanche', 640, 560, 30, 0], ['blanche', 30, 540, 34, 16],
]
