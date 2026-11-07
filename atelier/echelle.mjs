// L'ÉCHELLE DE SORTIE (06/11/2026) : la vidéo finale sort en 1080 x 1920 (Instagram garde mieux le 1080).
// Toute la mise en page reste pensée en 720 x 1280 (coordonnées « logiques » : sous-titres, cartes, visage,
// marges, contrôles). Seuls changent :
//   - les calques dessinés par le navigateur, rendus 1,5 fois plus fins (deviceScaleFactor) : textes nets ;
//   - la vidéo de base, cadrée en 1080 x 1920 ;
//   - les pixels passés à ffmpeg (scale, crop, overlay, tailles), multipliés par ECHELLE avec px().
// MONTAGE_ECHELLE=1 dans l'environnement : l'ancienne sortie 720 x 1280, à l'identique.
export const ECHELLE = Math.max(1, +(process.env.MONTAGE_ECHELLE || 1.5) || 1.5)
export const LARG = Math.round(720 * ECHELLE / 2) * 2, HAUT = Math.round(1280 * ECHELLE / 2) * 2
export const px = v => Math.round(v * ECHELLE)                    // un pixel logique (720) → un pixel de sortie
export const pxPair = v => Math.round(v * ECHELLE / 2) * 2        // idem, arrondi pair (tailles vidéo en yuv420p)
export const CADRE = `${LARG}:${HAUT}`, TAILLE = `${LARG}x${HAUT}`
// L'encodage final : H.264 High, yuv420p, 30 i/s, débit plafonné pour Instagram (≈ 8-10 Mb/s en 1080).
export const ENCODAGE = ECHELLE > 1
  ? ['-c:v', 'libx264', '-crf', '19', '-preset', 'fast', '-profile:v', 'high', '-level', '4.1', '-maxrate', '10M', '-bufsize', '20M', '-pix_fmt', 'yuv420p']
  : ['-c:v', 'libx264', '-crf', '19', '-preset', 'fast', '-pix_fmt', 'yuv420p']
