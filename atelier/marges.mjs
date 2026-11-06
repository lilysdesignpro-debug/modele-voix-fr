// LES MARGES DE SÉCURITÉ des réseaux (05/11/2026), dans l'image de la vidéo (720 x 1280).
// Ce que l'appli pose PAR-DESSUS la vidéo : le haut (onglets, « Suggestions »), le bas (nom, légende, son),
// la colonne d'icônes à droite (j'aime, commentaires, partage) qui ne commence qu'à mi-hauteur, et les côtés
// que les téléphones allongés rognent (la vidéo 9:16 est agrandie pour remplir un écran 19,5:9).
// Instagram : MESURÉ sur un vrai reel (interface téléphone, écran 390 x 844, 05/11/2026).
// TikTok : le modèle officiel de TikTok (pubs In-Feed, dessiné en 720 x 1280). Facebook : les marges officielles de Meta
// pour les Reels (14 % en haut, 35 % en bas, 6 % sur les côtés). Ces deux-là sont faits pour les publicités : plus prudents.
export const ZONES = {
  instagram: { haut: 80, bas: 185, droite: 133, droiteDe: 740, cote: 64, mesure: true },
  tiktok:    { haut: 160, bas: 440, droite: 200, droiteDe: 560, cote: 80, mesure: false },
  facebook:  { haut: 179, bas: 448, droite: 133, droiteDe: 740, cote: 43, mesure: false },
}
// "plateforme" dans projet.json : "instagram", "tiktok", "facebook", ou "toutes" = les trois à la fois ; rien = Instagram
export function zones(p) {
  const k = String(p || 'instagram').toLowerCase(), l = ZONES[k] ? [ZONES[k]] : Object.values(ZONES)
  return { haut: Math.max(...l.map(z => z.haut)), bas: Math.max(...l.map(z => z.bas)), droite: Math.max(...l.map(z => z.droite)),
    droiteDe: Math.min(...l.map(z => z.droiteDe)), cote: Math.max(...l.map(z => z.cote)), nom: l.length > 1 ? 'Instagram, TikTok et Facebook' : ({ instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook' })[k] }
}
// le calque rouge des zones, pour la planche de contrôle (filtre ffmpeg sur une image 720 x 1280)
// (06/11) dessinées en RVB : sur l'image vidéo (YUV) le rouge transparent sortait opaque et cachait la vidéo
export const dessinZones = Z => 'format=rgb24,' + [
  `drawbox=x=0:y=0:w=720:h=${Z.haut}:color=red@0.30:t=fill`,
  `drawbox=x=0:y=${1280 - Z.bas}:w=720:h=${Z.bas}:color=red@0.30:t=fill`,
  `drawbox=x=${720 - Z.droite}:y=${Z.droiteDe}:w=${Z.droite}:h=${1280 - Z.bas - Z.droiteDe}:color=red@0.30:t=fill`,
  `drawbox=x=0:y=${Z.haut}:w=${Z.cote}:h=${1280 - Z.haut - Z.bas}:color=orange@0.30:t=fill`,
  `drawbox=x=${720 - Z.cote}:y=${Z.haut}:w=${Z.cote}:h=${Z.droiteDe - Z.haut}:color=orange@0.30:t=fill`,
].join(',')
