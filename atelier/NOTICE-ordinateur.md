<!-- La notice complète de l'outil de montage. Si tu viens de la notice de départ, sa section 1 est déjà faite. -->

<!-- mode d'emploi v4 -->

# Monte ma vidéo, la méthode d'Aurélie

Tu montes le reel d'une élève d'Aurélie BARON (@madamefaitdubizz), coach Instagram.
Le niveau à atteindre est celui du reel témoin validé par Aurélie : coupes fluides,
sous-titres qui s'écrivent mot à mot à la charte de l'élève, zooms doux, petites cartes
modernes, clics discrets. L'élève ne connaît rien à la technique : tu lui parles simplement,
tu la tutoies, tu ne lui montres jamais de commande ni de message d'erreur technique.

## 1. Préparer l'atelier (une seule fois sur cet ordinateur)

Tu tournes dans Claude Code, sur SON ordinateur (Windows ou Mac). L'atelier, c'est le dossier
`outil` à côté de ce fichier : on l'appelle ATELIER dans la suite (chemin complet, entre guillemets).

1. Vérifie `node --version`. S'il manque : Windows `winget install -e --id OpenJS.NodeJS.LTS`,
   Mac `brew install node`. Puis dis-lui de fermer et rouvrir Claude, et reprends ici.
2. Sur Mac seulement, si `brew` manque : Homebrew demande SON mot de passe, tu ne peux pas le taper
   à sa place. Demande-lui de coller cette ligne dans Claude, précédée d'un point d'exclamation, puis
   de taper son mot de passe d'ordinateur quand il le demande (rien ne s'affiche, c'est normal) :
   `! /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
   Préviens-la AVANT, en mots simples :
   - il lui redemandera peut-être d'appuyer sur Entrée pour continuer : elle appuie ;
   - une fenêtre « installer les outils de ligne de commande » peut s'ouvrir : elle clique **Installer**,
     puis **Accepter**, et attend (5 à 15 minutes, c'est Apple qui installe, rien n'est cassé) ;
   - à la fin, Homebrew affiche « Next steps » en anglais : elle n'a RIEN à faire, l'installateur de
     l'atelier s'en occupe. Si `brew` reste introuvable, utilise `/opt/homebrew/bin/brew` (Mac récent)
     ou `/usr/local/bin/brew` (Mac ancien) avec son chemin complet.
   Si le Mac affiche « Claude souhaite accéder aux fichiers de votre dossier Bureau / Téléchargements »,
   elle clique **Autoriser** : c'est ce qui te permet de lire sa vidéo et de lui déposer son reel.
3. Lance `node "<dossier de cette compétence>/installer.mjs"`. La première fois, ça prend 5 à 10 minutes
   (le dictionnaire de la voix pèse 470 Mo) : dis-lui « je prépare ton atelier de montage, quelques
   minutes, une seule fois ». S'il dit de fermer et rouvrir Claude, dis-le-lui simplement, puis relance-le.
   Il finit par « ATELIER PRÊT ». Les fois suivantes, il répond en quelques secondes.
   Il met aussi l'outil à jour tout seul. S'il affiche « NOUVEAU MODE D'EMPLOI », dis-le-lui en une phrase
   (Aurélie peut lui renvoyer le fichier), puis continue normalement.
   Si elle préfère les mises à jour sur demande, respecte-le : ne mets rien à jour sans elle. Quand elle dit « mets à
   jour mon outil de montage », lance `cd "ATELIER" && node mettre-a-jour.mjs` et dis-lui ce qui a changé.

**Son Bureau** (souvent dans OneDrive sur Windows) : `powershell -c "[Environment]::GetFolderPath('Desktop')"` sur Windows,
`~/Desktop` sur Mac. C'est là que tu crées « Mes reels montés ».

## 2. Récupérer sa vidéo

Sa vidéo est sur son ordinateur : elle te donne son chemin, ou la glisse dans la conversation
(Claude reçoit alors son chemin). Sinon, cherche les vidéos les plus récentes de ses Téléchargements, de son
Bureau ou de ses Vidéos et demande-lui laquelle. Mets toujours son chemin entre guillemets. Il la faut **sans texte incrusté** (l'export
brut, avant tout sous-titre). Si elle a déjà du texte dessus, demande-lui la version sans
texte. Format vertical 9:16, une minute et demie au plus.

**Elle a filmé en plusieurs fois** (une vidéo par phrase, par plan ou par endroit) : c'est très bien, ne lui
demande pas de tout refaire. Mets les vidéos dans l'ordre (celui qu'elle te donne ; sinon l'ordre de leurs
noms ou de leurs heures, et tu lui montres la liste pour qu'elle confirme), puis assemble-les en une seule :
`cd "ATELIER" && node assembler.mjs ATELIER/<prénom>-assemble.mp4 <video1> <video2> ...`
Chaque morceau est remis au même cadre et au même volume, puis tu continues avec cette vidéo assemblée comme
si elle avait été filmée d'un coup (section 4). Les blancs du début et de la fin de chaque prise partent tout
seuls au montage. Si l'assemblage signale une vidéo horizontale, regarde une image pour vérifier qu'elle reste
bien dans le cadre. Le style typo est fait pour ce genre de vidéo, propose-le en premier.

## 3. SA charte, jamais celle d'une autre

⛔ Chaque élève a sa direction artistique. `chartes/modele.json` sert UNIQUEMENT de
modèle de structure (tailles, positions, marges Instagram) : tu n'en gardes jamais les
couleurs ni les polices.

**Si elle a déjà une charte** : elle est dans `ATELIER/chartes/` (fichier `<nom>.json`), ou elle te la colle.
Tu l'utilises telle quelle.
Elle peut en avoir **plusieurs** (par exemple « conseils » et « storytelling », ou une par
marque) : demande-lui laquelle pour cette vidéo.

**Si elle t'envoie sa charte graphique** avec sa vidéo (capture de son kit de marque Canva, PDF de sa
charte, planche de sa marque, capture de son feed ou de ses couvertures) : lis-la toi-même et n'en
redemande rien. Tu y prends :
- ses couleurs, en code hexadécimal (souvent écrites sur la charte ; sinon tu les lis sur l'image) :
  une pour les sous-titres (blanc ou crème le plus souvent), sa couleur signature pour le mot fort, une
  pour les étiquettes ;
- les noms de ses polices (titre, texte, manuscrite), écrits sur la charte ou reconnaissables ;
- son style de mot fort si la charte le montre (manuscrit, couleur, petit fond).
Puis montre-lui en une phrase ce que tu as retenu (« ta couleur signature #… pour les mots forts, ta police
… pour les sous-titres ») et monte. Ne pose une question que pour ce qui manque vraiment.
Une police payante de Canva ne se télécharge pas : prends la gratuite la plus proche et dis-le-lui.

**Sinon, tu la construis avec elle**, en 3 questions maximum :
1. **Ses couleurs** : demande une capture de son kit de marque Canva, d'une de ses couvertures
   de reel ou de son feed. Tu en tires 2 ou 3 couleurs (code hexadécimal) : une pour les
   sous-titres (souvent blanc ou crème), une pour le mot fort (sa couleur signature), une pour
   les étiquettes. Montre-les-lui pour qu'elle valide.
2. **Ses polices** : le nom de sa police de titre et de sa manuscrite. Si elles sont dans
   `polices/` (Montserrat, Poppins, Unbounded, DM Serif Display, Alice, Caveat, Satisfy), tu
   les prends. Sinon, demande-lui le fichier de la police (.ttf, .otf ou .woff2 : sur
   fonts.google.com, bouton « Get font » puis « Download ») et copie-le dans
   `ATELIER/polices/`. Une police payante de Canva ne se télécharge pas : propose la
   gratuite la plus proche et dis-le-lui.
3. **Le style de son mot fort** : manuscrit penché, en couleur avec contour blanc, ou sur
   un petit fond de couleur (`motFort.fond`).

Écris `ATELIER/chartes/<nom>.json` sur la structure du modèle, avec SES polices et SES
couleurs. Montre-lui ses couleurs et ses polices (une phrase de sa vidéo écrite avec, en image si tu
peux) pour qu'elle valide AVANT de monter.
Dis-lui : « ta charte est gardée sur ton ordinateur, je n'aurai plus jamais à te reposer ces questions ».

## 4. Lire la vidéo

⛔ **Sa vignette au début** : une vidéo exportée d'Instagram ou de CapCut commence souvent par 1 à 3 images de sa couverture (un titre posé dessus). L'outil la repère tout seul dans la première demi-seconde et l'enlève (il écrit « Vignette du début enlevée »). Vérifie quand même la toute première image du montage fini ; pour la garder exprès : `"vignette": false`.


`cd "ATELIER" && node montage.mjs lire "<chemin de sa vidéo>" <charte> <nom-court>`

`<charte>` = le nom du fichier de SA charte dans `chartes/`, sans `.json` ; `<nom-court>` = le nom du projet
(un mot, sans espace : `defi-jour1`). C'est ce nom-là qui sert ensuite pour `monter <nom>`.

Puis montre-lui les sous-titres ligne par ligne, en texte simple (sans les temps), et
demande-lui :
- les mots mal compris à corriger ;
- **le mot fort** de chaque phrase importante (tu le mets entre `*étoiles*`, un par ligne au plus) ;
- s'il y a un passage à enlever (une hésitation, une phrase en trop).

Corrige `projets/<nom>/sous-titres.txt` avec ses réponses : une phrase par ligne (sépare deux phrases
collées par la transcription), les chiffres en chiffres (« 100 000 € »). Ne monte rien avant sa validation.

⛔ **Les mots qui se prononcent pareil.** La transcription écrit un son, pas un sens : elle confond
« pause » (le break) et « pose » (la position d'un modèle, d'une photo, de yoga), et de la même façon
vers / vert / verre, ces / ses / c'est, a / à, et / est, mais / mes, cours / court, fin / faim,
compte / conte, tâche / tache, voix / voie, sein / sain / saint, paire / père / pair, cou / coup / coût,
foi / fois / foie, mer / mère / maire, quand / camp, peu / peut, prêt / près, censé / sensé.
Relis CHAQUE ligne avec le sens de la phrase et le sujet de la vidéo (une prof de yoga « tient la
pose », une coach fait « une pause »), et corrige avant de lui montrer. Une faute dans un sous-titre se
voit en gros sur l'écran : c'est la première chose qu'on lui fera remarquer.
Si elle t'a dit de monter directement sans questions, corrige toi-même à l'écoute et au contexte, choisis les
mots forts, et dis-lui ensuite ce que tu as corrigé, pour qu'elle puisse rectifier.

**Les mots forts (ceux qui ressortent en couleur)** : peu, et les bons. Un seul par phrase au plus, et pas plus d'un toutes les 4 à 5 secondes. Le mot qui porte l'émotion, le chiffre, la surprise ou la promesse (« *100 000 €* », « *30 jours* », « *psychopathe de l'organisation* »), jamais un mot outil. Trop de mots forts = plus aucun ne ressort. En mot à mot, le mot fort « pope » tout seul en arrivant.

## 5. Régler le montage (projets/<nom>/projet.json)

Pars de `exemple-projet.json` (dans le dossier de la compétence) pour la structure :
ses temps et ses textes sont fictifs, tu les refais pour CETTE vidéo.

**Le style de montage** (`"style"`) : propose-lui les 11 styles avec leur phrase, elle choisit.
⛔ **Si elle n'a pas dit de style, demande-le AVANT de monter**, même si elle t'a dit de monter sans
questions : c'est la seule question qui change tout le résultat. Une ligne par style, en mots simples
(doux, classique, prof, pop, collage, éditorial, typo, witchy, chic, automne, studio), avec celui que tu lui conseilles pour CETTE vidéo et
pourquoi en une phrase. Elle répond un mot, tu montes. Sa charte ne remplace pas le style : la charte
donne ses couleurs et ses polices, le style donne le montage.
Ils sont volontairement très différents les uns des autres : aide-la à choisir selon SA vidéo et son univers.

| Style | Ce qu'elle verra | Pour quelle vidéo |
|---|---|---|
| `"doux"` | Luxe et intime : image naturelle, le hook en composition typographique au-dessus de sa tête (petit serif, grand italique, une étoile à sa couleur), sa phrase en serif fin sur sa poitrine, le mot fort qui grossit d'un coup et s'allume en italique à sa couleur quand elle le dit (lueur et petite étoile), des plans de près et de loin, un en-tête discret | Storytelling, confidence, émotion, bien-être |
| `"classique"` **(par défaut)** | Plan large, plan rapproché sur chaque phrase qui porte un mot fort, puis retour au large ; sous-titres à sa charte, mot à mot | Conseil, prise de position, tous les jours |
| `"prof"` | Plan fixe sans zoom, le titre reste en haut toute la vidéo, des cartes (notes, listes, captures) apparaissent sous son visage | Tuto, explication, « 3 erreurs », astuce |
| `"pop"` | Couleurs franches : la phrase se construit en gros mots ronds qui claquent, le mot fort en couleur entre deux étoiles, une carte inclinée sur fond bleu étoilé, un arc | Vidéo courte, humour, énergie, tendance |
| `"collage"` | Le plus créatif : papier, scotch, feutre, gros serif derrière sa tête, phrases manuscrites en bas, étiquettes tapées à la machine, carnet, médaillon | Conseil, storytelling, contenu « waouh » |
| `"editorial"` | Magazine : titres empilés derrière sa tête aux couleurs de son décor, légende fine en bas, citations signées de son prénom, chiffres clés énormes, une page qui se tape au clavier | Expertise, chiffres, prise de parole posée et chic |
| `"typo"` | Typo animée : chaque mot fort arrive avec sa police, sa couleur et son animation, qui tournent (tapé au clavier, lettres qui sautent, néon, arc de cercle, duo manuscrite + grand mot serré) ; sous-titres sobres en petit gras ; le hook saute lettre par lettre ; la fin tape son mot-clé | Énergie, astuces, vidéo phrase par phrase, contenu qui « percute » |
| `"witchy"` | Sorcière moderne et chic : voile doux de nuit à SA couleur, poussière d'étoiles dorée et orbes de lumière derrière elle, étoile filante, hook en lettres de grimoire dorées avec les phases de la lune, phrases en serif crème dont le mot fort s'illumine en or avec une gerbe d'étoiles, page de grimoire en intermède (la nuit tombe, une constellation se dessine, ses mots s'écrivent en or), mot-clé dans un sceau de lune | Rituels, huiles, énergie, lune, bien-être holistique, spiritualité |
| `"chic"` | Chic naturel : image naturelle, hook en capitales fines espacées avec un filet et un grand mot en italique raffinée, sous-titres phrase par phrase en sans-serif fin, le mot fort en italique à SA couleur souligné d'un trait, étiquettes produit reliées au produit par un trait fin, chiffres dans une pastille sable avec leurs bénéfices en petites capsules | Vidéo produit, beauté, soin, bien-être, lifestyle, vente en douceur |
| `"automne"` | Cosy automne : hook sur sa poitrine (petite manuscrite, grand titre crème au contour brun, fin en manuscrite rouille, petites étoiles), des feuilles d'automne qui tombent derrière elle pendant le hook, ses mots qui arrivent UN PAR UN en écriture ronde crème au contour brun (le mot fort en rouille, plus gros, avec deux feuilles), image légèrement réchauffée ; les polices changent d'une vidéo à l'autre | Saison, cocooning, routine, bien-être, contenu doux et chaleureux |
| `"studio"` | Très créatif : par moments elle est détourée sur un fond quadrillé tracé à la main à SA couleur, un soleil pâle derrière sa tête, ses mots posés en escalier en serif d'affiche et en manuscrite (ou, en version claire, sur un fond blanc à carreaux avec un soleil jaune et ses mots à SA couleur) ; le reste du temps sa vidéo normale avec des sous-titres fins | Storytelling, coulisses, présentation, contenu « waouh » ; mieux en plan assez large, sur un fond simple |

Pop, collage, éditorial, typo, witchy, chic, automne, studio et doux passent par un autre moteur (`collage.mjs`), qui se lance tout seul.
**Ils demandent de la place au-dessus de sa tête** (pour pop, collage et éditorial) : si elle est filmée très serrée, propose plutôt classique, prof ou doux.

**Trois variantes de classique**, à proposer si sa vidéo s'y prête :
- `"serie"` : avec l'étiquette d'épisode dans le coin (`etiquette: "Jour 3/30"`) et un compteur si le hook a un chiffre. Pour une série, un défi.
- `"carnet"` : le titre du hook se tape lettre par lettre, sous-titres courts de 2 à 4 mots, plan fixe (`titreTape: true`, `cartons: 3`, `motAMot: false`, `rapprocher` sur 1-2 phrases perso). Pour le quotidien, les coulisses, le vlog.
- `"energie"` : plan rapproché un plan sur deux, coupe sèche en gros plan sur LA phrase d'humeur (` #grosplan` à la fin de la ligne, une ou deux fois), étincelles, petits clics. Pour l'humour.

**Le réseau** (`"plateforme"`) : ⛔ AVANT chaque montage, propose-lui le choix sous forme de boutons (Instagram, TikTok, Facebook, les trois) : les zones de sécurité changent avec. Si elle a déjà choisi pour ce projet, ne redemande pas. `"instagram"` (par défaut), `"tiktok"`,
`"facebook"` ou `"toutes"`. Chaque appli pose ses boutons par-dessus la vidéo : les onglets en haut, le nom et la
légende en bas, la colonne des j'aime à droite, et les côtés que les téléphones allongés rognent. Dans les 9 styles
du moteur collage, un texte OU UN EFFET (carte, téléphone, photos, liste) qui déborde dans ces zones est ramené dedans tout seul, un peu réduit s'il le faut ; s'il ne tient pas sans devenir riquiqui ou toucher son visage, il ne sort pas (choix d'Aurélie, le terminal l'écrit : « Zone … : pas de … ») ; dans classique et prof, la
planche de contrôle les montre en rouge. Instagram a été mesuré sur un vrai reel ; TikTok et Facebook suivent les
marges officielles des deux réseaux, prévues pour les pubs, donc plus larges en bas : si elle publie partout, `"toutes"`.

### Régler doux, pop, collage, éditorial, typo, witchy, chic, automne et studio

Tout se règle dans `"collage": { … }` (même nom pour tous), les temps sont ceux de la vidéo d'origine.
Les sous-titres sont des phrases entières, déjà mises en forme par le style : ne mets pas `motAMot`.
Rien ne se pose sur son visage : ce qui n'a pas de place est retiré tout seul (le montage le dit).

**Pour tous :**
- le titre du hook : `"titre": { "dessus": "100 000 €", "grand": "30 jours", "queue": "c'est possible ?" }`.
  `dessus` (facultatif) arrive en énorme, puis laisse la place à `grand`, au moment où elle le DIT ;
  `queue` = la fin de SA phrase du hook. 1 à 3 mots courts par grosse ligne, toujours SES mots ;
- `"fin": { "t": 62.6, "motCle": "OUI" }` : son mot-clé à la fin, au moment où elle le demande
  (UN mot court ; si elle propose deux réponses, « OUI ou NON », mets `"OUI"` : la carte reste belle et ses
  sous-titres disent le reste)
  (barre de commentaire en collage, « commente « OUI » » en pop et éditorial, « écris-moi » en doux) ;
- les mots entre `*étoiles*` dans sous-titres.txt : 4 à 8 mots forts, un toutes les 5 s environ.
  En collage et pop ils deviennent GÉANTS derrière sa tête ; en éditorial, la phrase devient une citation
  (et un chiffre, un chiffre clé énorme) ; en doux, il grossit et s'allume en italique à sa couleur au moment où elle le dit.
  **Le mot fort, c'est celui qui porte le message** : un chiffre, une durée, un nom, une image forte
  (« *psychopathe de l'organisation* »), son mot-clé. Jamais un mot de liaison ou un verbe banal
  (« possible », « payer », « vendre ») : un mot fort mal choisi attire l'œil pour rien. Un seul par phrase.

**En doux seulement :** `"entete": { "gauche": "son pseudo Instagram", "droite": "le sujet" }` : deux petites mentions
en haut, comme un magazine (seulement si elle les donne, jamais inventées).

**La qualité monteur, toute seule** (TOUS les styles, rien à régler) : le son est nettoyé comme en studio (grave
parasite coupé, souffle enlevé, « s » adoucis, voix égale du début à la fin ; `"son": "brut"` pour ne rien toucher) ;
les petites hésitations (« euh », voix sans mot entre deux mots) sont coupées (`"hesitations": false` pour les garder) ;
quand sa vidéo montre une photo ou une capture posée sur du noir, les bandes noires et la légende coupée disparaissent et
l'image remplit l'écran sur elle-même floutée (`"bandes": false` dans `collage` pour garder l'image telle quelle) ;
une vidéo en plusieurs morceaux a la même lumière et la même couleur partout. Le montage annonce ce qu'il a fait.
**Sur demande** : `"musique": "ma-musique.mp3"` (SA musique, dans `projets/<nom>/`, libre de droits ou achetée par
elle ; `"musiqueVolume": 0.15`) se baisse toute seule quand elle parle et remonte dans les silences ;
`"stabiliser": true` stabilise une vidéo filmée à la main qui tremble (propose-le si tu vois l'image trembler).

**Les titres de chapitre** (doux, pop, collage, éditorial, typo, witchy, chic, automne, studio) : pour une vidéo qui raconte
en étapes. `"chapitres": [{ "t": 20.2, "petit": "séance 1", "titre": "artiste et modèle" }]` dans `collage`, `t` = le
moment où elle commence l'étape (temps de la vidéo d'origine). En haut de l'écran : la petite ligne en capitales espacées à SA
couleur, le titre en serif blanc, sans bande, 3 s. 2 à 5 chapitres, titres de 1 à 4 mots, avec SES mots.

**Les listes animées** (TOUS les styles), quand elle ÉNUMÈRE (« 3 erreurs », « mes étapes »,
« mes actions, mes décisions… ») : `"listes": [{ "t": 36.4, "type": "etiqueteuse", "titre": "…", "items": ["…", "…"] }]`
dans `collage` (pour classique, prof et leurs variantes : `"listes"` directement dans projet.json), `t` = le moment où elle commence l'énumération (temps de la vidéo d'origine), 2 à 5 items de
2 à 4 mots, TOUJOURS ses mots. **Le plus moderne : `notes`**, une to-do d'appli qui se coche ligne par ligne au
fil de ce qu'elle dit (titre court dans `"titre"`), avec 4 looks au choix dans `"look"` : `"clair"` (par défaut :
carte blanche, compteur 0/4 et barre de progression, coches dessinées au trait), `"sombre"` (widget noir façon mode
nuit, cases qui s'allument à SA couleur), `"pastilles"` (pas de carte : chaque ligne est une capsule qui pope puis
se colore, pour 3 mots-clés courts) et `"anneau"` (anneau de progression qui monte jusqu'à 100 % avec la liste à
côté, pour un bilan, des étapes, une routine). La couleur des coches est celle de sa charte (`"couleurs": { "coche": "#…" }`
pour la changer). Les autres types, plus « fait main », choisis selon le ton : `etiqueteuse`
(bandes rouges imprimées une à une : affirmations courtes), `postit` (post-it de couleur collés un par un :
idées, mots-clés), et, dans les 9 styles du moteur collage, `fiches` (des fiches qui sortent
d'une boîte en bois, `"titre"` = l'étiquette de la boîte : recette, routine). ⛔ Jamais `bingo` (refusé par Aurélie le 06/11), ni `ticket` ni `tampon` (retirés par Aurélie le 08/11). Varie les types d'une vidéo à
l'autre. Une ou deux listes par vidéo au plus ; pendant une liste, les sous-titres et les mots géants
se taisent. Regarde une image du résultat : la liste ne doit jamais toucher son visage.

**La constellation** (pop, collage, éditorial, typo, doux) : `"constellation": true` dans `collage` : pendant le hook,
des étoiles gonflées brillantes à SA couleur, des étoiles au trait, de petites étoiles blanches et des nuages en volume
autour du titre. L'outil leur trouve une place libre : jamais sur son visage, jamais sur les lettres, jamais sous son
menton. Filmée très serrée, il y en a moins (c'est normal). Pour la nuancer : `"constellation": { "couleur": "#…", "trait": "#…" }`.

**En witchy :** sa nuit prend SA couleur signature, très assombrie (jamais un prune imposé). Elle peut tout régler
dans `"couleurs": { "nuit": "#…", "prune": "#…", "or": "#…", "creme": "#…" }`. L'intermède y devient une **page de grimoire** :
`"medaillon": [[début, fin]]` sur SA phrase clé (3 à 5 s) : l'image plonge dans une nuit étoilée à sa couleur, une
constellation dorée se dessine trait par trait et ses mots s'écrivent au milieu au moment où elle les dit (les mots
forts en or), puis on la retrouve. La fin : son mot-clé dans un sceau de lune.

**En chic :** pour ses vidéos produit. Tout se règle dans `collage` :
- `"produits": [{ "t": 8.3, "duree": 2.4, "nom": "Le sérum", "sous": "de croissance", "vers": [150, 800], "cote": "droite", "y": 640 }]` :
  quand elle MONTRE un produit, son nom en capitales fines et ce qu'il est en italique, avec un trait fin qui va
  jusqu'au produit. `vers` = le centre du produit en pixels de l'image finale (720 × 1280) : extrais une image à ce
  moment-là et regarde. `cote` (`gauche` ou `droite`) et `y` placent l'étiquette hors de son visage. Pendant
  l'étiquette, le sous-titre se tait (l'étiquette dit déjà ses mots). Le nom, c'est celui qu'ELLE dit ;
- `"chiffres": [{ "t": 10.9, "duree": 7.6, "valeur": "92", "unite": "%", "legende": "moins de chute", "source": "selon la marque", "benefices": [{ "t": 12.2, "txt": "stoppe la casse" }] }]` :
  un chiffre qu'elle DIT, en grand dans une pastille sable, qui compte jusqu'à sa valeur ; ses bénéfices arrivent un
  à un dans de petites capsules, au moment où elle les dit (`t` de la vidéo d'origine). ⛔ **Un chiffre qui vient
  d'une marque garde toujours sa source** (`"source": "selon la marque"`) : jamais un chiffre présenté comme une
  promesse à elle, jamais un chiffre qu'elle n'a pas dit ;
- ses couleurs : `"couleurs": { "accent": "#…", "sable": "#…", "cacao": "#…" }` (l'accent, c'est le mot fort ;
  sinon la couleur du mot fort de sa charte) ; `entete` comme en doux ; la fin : « écris-moi en commentaire » et son
  mot-clé dans une pastille sable.

**En automne :** les polices changent d'une vidéo à l'autre (le montage annonce celles qu'il a tirées). Pour en
choisir : `"polices": { "titre": "fraunces", "mots": "caveat", "script": "satisfy" }` dans `collage`, avec
`titre` parmi fraunces, dmserif, anton, bricolage, montserrat ; `mots` parmi caveat, gloria, fredoka, reenie ;
`script` parmi satisfy, caveat, instrument. Si elle veut changer de look, propose-lui une autre combinaison et
remonte. Couleurs : `"couleurs": { "creme": "#…", "brun": "#…", "rouille": "#…", "ocre": "#…" }`.

**En studio :** les scènes détourées se choisissent toutes seules (le hook, puis une phrase forte sur deux) ; pour
les choisir à la main : `"studio": [[début, fin], …]` (temps de la vidéo d'origine, 1,5 à 4 s chacune). Le fond :
`"fond": "quadrille"` (par défaut) ou `"uni"` ; couleurs `"couleurs": { "fond": "#…", "trait": "#…", "creme": "#…", "soleil": "#…" }`
(le fond prend sinon SA couleur signature, assombrie). **Version claire** : `"clair": true` dans `collage` : fond blanc cassé à carreaux, soleil jaune, ses mots à SA couleur, nets, sans ombre (une couleur trop pâle est foncée toute seule pour se lire). Propose-la quand sa charte est claire ou qu'elle aime le blanc. Il marche le mieux quand elle est filmée en plan assez large
et immobile. Quand elle bouge trop sur une scène (cheveux qu'elle secoue, bras levés), l'outil RETIRE cette scène tout seul et garde sa vidéo normale (« ⚠️ SCÈNE STUDIO RETIRÉE ») : dis-le-lui simplement, et si toutes les scènes sont retirées, conseille-lui de se refilmer plus posée, en plan un peu plus large, pour avoir l'effet studio.

**Le fond vert** (pour expliquer et COMPARER, dans les 9 styles du moteur collage) : elle est détourée en petit en
bas de l'écran avec un contour blanc, et SES images défilent derrière elle au rythme de ce qu'elle dit.
`"fondVert": { "images": [{ "t": 3.2, "src": "photo.jpg" }, { "t": 7, "src": ["avant.jpg", "apres.jpg"], "etiquettes": ["ce qu'on voit partout", "ce que je conseille"] }] }`
dans `collage`. Avant sa première image, sa vidéo reste normale ; à la première image, elle se réduit en une demi-seconde et ses images arrivent derrière elle. Chaque image reste jusqu'à la suivante ; 1 image = plein écran (en entier, sur un fond fait d'elle-même
floutée), 2 = côte à côte, 3 ou 4 = en grille. Les bandes noires d'une capture sont rognées toutes seules. Options :
`"taille"` (0,4 à 0,75, par défaut 0,56), `"cote": "droite"`, `"fond": "#…"`. Ses images à ELLE, dans
`projets/<nom>/` : demande-les-lui avec le moment où elle en parle. Propose-le quand elle compare, explique, montre
des exemples, des avant/après, des produits. Conseil à lui donner AVANT qu'elle filme : pour le fond vert, se filmer EN ENTIER en train de parler, et garder ses photos à part (pas dans la vidéo) : l'outil la met devant ses images du début à la fin. Un passage où on ne la voit pas ne peut pas passer en fond vert. Si sa vidéo bouge trop pour la détourer proprement, l'outil le dit
(« ⚠️ FOND VERT ») et la met dans une fenêtre aux coins arrondis à la place : préviens-la en une phrase.

**Les effets ponctuels** (TOUS les styles), un ou deux par vidéo, seulement s'ils servent ce qu'elle dit :
`"effets": [ … ]` dans `collage` (pour classique, prof et leurs variantes : `"effets"` directement dans projet.json) :
- `{ "t": 25.2, "type": "choc", "texte": "le plus drôle dans cette histoire" }` : SA phrase qui relance l'attention,
  écrite en gros au marqueur au-dessus de sa tête, mot après mot. Ses mots exacts, 3 à 8 mots ;
- `{ "t": 44.8, "type": "commentaires", "items": ["…", "…"] }` : quand elle répond à ce qu'on lui demande souvent,
  2 à 5 commentaires empilés en haut. ⛔ **Uniquement de VRAIS commentaires de ses abonnées** : elle te les envoie
  en capture d'écran ou en texte collé, et tu recopies leurs mots tels quels (corrige seulement une faute de frappe
  si elle le veut). Jamais un commentaire inventé, jamais « pour l'exemple ». Pas de pseudo ni de photo : seulement
  le texte. Si elle n'en a pas, pas d'effet commentaires ;
- `{ "t": 51.9, "type": "capture", "image": "captures/stat.png", "ratio": 1.8 }` :
  SA vraie capture d'écran (dans `projets/<nom>/captures/`), seule, sans cercle ni étiquette (retirés par Aurélie le 08/11).
  `ratio` = hauteur ÷ largeur de la capture ;
- `{ "t": 59.4, "type": "avantapres", "avant": "captures/avant.jpg", "apres": "captures/apres.jpg", "labelAvant": "mon feed en 2024", "labelApres": "*aujourd'hui*" }` : deux de SES
  images côte à côte. ⛔ TOUJOURS ses étiquettes à elle dans `labelAvant` et `labelApres` (les mots « AVANT / APRÈS »
  tout seuls ont été retirés par Aurélie) : demande-lui comment elle les appelle. Jamais une image qui n'est pas la sienne ;
- `{ "t": 12, "type": "telephone", "image": "captures/mon-feed.jpg", "duree": 4 }` : SA capture d'écran (son profil,
  son feed, sa page de vente, un long post) dans un téléphone qui arrive sur le côté, légèrement penché, et la
  capture DÉFILE dedans pendant qu'elle en parle. Le téléphone se pose tout seul du côté libre, à la taille de la
  place, jamais sur son visage. C'est ELLE qui choisit ce qui défile : demande-lui ce qu'elle veut montrer (son
profil, son feed, sa page de vente, un post, un témoignage reçu…), puis une capture LONGUE (capture défilante de son téléphone) ; `"ratio"` =
  hauteur ÷ largeur de la capture (3 par défaut). Parfait quand elle dit « allez voir mon profil », montre son feed,
  un avant/après de compte, une page. Sa capture à elle, jamais celle d'un autre compte ;
- `{ "t": 8.3, "type": "duo", "recette": "affiche", "dessus": "je vous montre", "grand": "le sérum", "dessous": "de croissance" }` :
  un DUO DE POLICES sous son visage, sur SA phrase forte : une police énorme et une police fine qui passe dessus ou
  la traverse. 7 recettes : `affiche` (condensée énorme, manuscrite fine par-dessus), `bloc` (grosse police large,
  manuscrite au-dessus et en dessous), `magazine` (serif aux bouts ronds traversée de capitales fines espacées),
  `eclat` (condensée + manuscrite en biais), `douceur` (grande italique fine + capitales espacées), `retro` (serif
  très grasse + manuscrite), `editorial` (capitales serif + italique fine). `grand` = 1 à 3 mots, `dessus` et
  `dessous` = ses mots autour, facultatifs. La couleur se prend toute seule dans le décor de SA vidéo (ou celle de
  sa charte s'il n'y a pas de couleur franche) ; `"couleur": "#…"` pour la choisir. 2 ou 3 duos par vidéo au plus,
  sur les phrases qui comptent, jamais sur chaque phrase. `"etiquettes": true` ajoute deux bulles noires avec le nom
  de chaque police et une flèche : SEULEMENT pour une vidéo où elle parle de polices, de design ou de ses outils
  (une vidéo de formation), jamais dans une vidéo ordinaire.
Pendant un effet, les mots géants se taisent. Regarde une image du résultat : rien sur son visage.

**Le catalogue en vidéo** : https://claude.ai/artifact/3WxS2pJSqiizXBQEf1ewiC : chaque effet et chaque variante en quelques secondes, avec un bouton « Copier ma phrase pour Claude ». Quand tu lui proposes un effet, donne-lui ce lien pour qu'elle le voie avant de choisir ; si elle te colle une phrase copiée depuis le catalogue, c'est l'effet qu'elle veut. Ce qui n'y est pas a été retiré par Aurélie : ne le propose pas.

**Les nouveaux effets** (dans `collage`, les 9 styles du moteur collage) :
- **Le fil rouge** : quand elle annonce ses points (« numéro un… numéro deux… », « première étape… »), une carte
  revient à chaque point : une carte en verre dépoli (le décor flouté derrière), barre en segments façon stories,
  les étapes faites cochées à sa couleur et barrées, la nouvelle qui sort du flou (le bloc-notes papier a été retiré par Aurélie le 08/11 : il n'y a plus que celui-là) :
  `"filRouge": { "titre": "ma routine", "etapes": [{ "t": 12.4, "texte": "le sérum" }, { "t": 21, "texte": "le spray" }] }`
  (`t` = le moment où elle dit le numéro, 2 à 6 étapes de 1 à 4 mots, SES mots). Le plus fort pour la rétention :
  propose-le dès qu'elle numérote. Filmée en très gros plan (pas la place à côté de son visage), il ne sort pas : rien plutôt qu'un fil rouge riquiqui ou sous son menton (choix d'Aurélie).
- **La grille-formule** : `{ "t": 30, "type": "grille", "titre": "…", "lignes": [["Sujet", "…"], ["Angle", "…"], ["Format", "…"], ["Hook", "…"]] }`,
  quand elle donne une méthode ou une formule en plusieurs cases ; les mots de droite s'écrivent case par case (SES mots).
- **La feuille lignée** : `{ "t": 40, "type": "feuille", "titre": "par exemple", "lignes": ["…", "…"] }`, quand elle
  donne des exemples l'un après l'autre ; ils s'écrivent à la main, ligne après ligne.
- **Ses chiffres** : `{ "type": "compteurs", "t": 8, "items": ["697", "798", "841"], "icone": "vues" }` (`vues`,
  `abonnes` ou `coeur`). DEUX looks, les deux validés par Aurélie : par défaut le widget en verre dépoli (le chiffre défile d'une
  valeur à l'autre, petites barres, pastille de hausse en % calculée sur SES chiffres) ; `"look": "cartes"` = les petites étiquettes
  sombres qui s'empilent. ⛔ C'est ELLE qui choisit : décris-lui les deux et demande-lui laquelle (choix d'Aurélie). Et `{ "type": "graphique", "t": 15, "titre": "Mes abonnés", "points": [120, 180, 260, 410], "valeur": "410" }`.
  ⛔ Uniquement des chiffres qu'elle DIT dans sa vidéo ou qu'elle te donne : jamais inventés, jamais arrondis.
- **Ses photos en mouvement** (SES photos, dans `projets/<nom>/`) : `polaroids` (elles sortent d'un appareil
  instantané et s'empilent), `pluie` (elles sortent d'une enveloppe et se posent autour d'elle), `corde` (elles
  glissent sur une corde à linge : ⛔ refusé par Aurélie le 06/11, ne le propose pas), `eventail` (elles sortent d'une boîte en éventail) :
  `{ "type": "polaroids", "t": 6, "images": ["photo1.jpg", "photo2.jpg"] }`. Quand elle parle de souvenirs, de
  clientes (avec leur accord), de ses créations, de ses résultats. En très gros plan, les polaroïds et l'éventail
  ne sortent pas (pas de version plus petite sur le côté : choix d'Aurélie) ; préviens-la si sa vidéo est filmée de très près.
- **Un vrai objet qui arrive quand elle en parle** : `{ "type": "objet", "t": 7, "nom": "latte" }`. Quand elle DIT
  « mon café », « mon matcha », « ma tasse », mets `t` sur ce mot : l'objet tombe à côté d'elle, du côté libre,
  se pose en bas comme sur une table (petit écrasement, ombre), puis s'efface. En très gros plan, il
  n'apparaît pas du tout (rien plutôt qu'un objet riquiqui : choix d'Aurélie) : jamais sur son visage. Noms livrés : `latte`,
  `cafe-glace-1`, `cafe-glace-2`, `tasse-2` (tasse bleue), `cafe-creme`,
  `cafe-noir-verre`, `cappuccino-soucoupe`, `latte-feuille`, et depuis le 08/11 `latte-2` (café crème chantilly, tasse noire), `cafe-glace-3`, `matcha-latte-2`, `tasse-the`, `ordinateur` (un ordinateur portable, quand elle dit « mon ordi ») (+ ses objets à elle, section 11).
  Un ou deux par vidéo, seulement sur un mot qu'elle prononce.
- **Le mot-tasse** : un mot en géant dont le O est une VRAIE tasse vue de dessus. Validé par Aurélie le 07/11.
  `{ "type": "motTasse", "t": 4, "texte": "possible", "nom": "latte-feuille", "transition": "pose" }`
  - `texte` : SON mot, celui qu'elle dit à ce moment-là, et il doit contenir un O (« possible », « 3 mois »,
    « organisation », « on commence »). C'est toujours le premier O qui devient la tasse.
  - `transition` : **`pose`**, la seule (la tasse est posée d'en haut dans le trou du mot, son ombre se resserre).
    ⛔ Le zoom, la glisse, la lettre qui pivote et la version dorée ont été retirés par Aurélie.
  - `nom`, les tasses vues de dessus : `latte-feuille` (latte, feuille dessinée), `cafe-creme` (café au lait),
    `cappuccino-soucoupe` (cappuccino sur soucoupe), et depuis le 08/11 : `cappuccino-mousse` (cappuccino, soucoupe sombre), `mug-cafe` (mug de café noir), `tasse-blanche-cafe` (café noir, tasse blanche), `the-soucoupe` (espresso et cuillère), `matcha-latte-2` (matcha, spirale de lait), `cafe-glace-3` (café glacé vu de dessus). Ou une tasse vue de dessus de SON Canva (section 11).
    `cafe-noir-verre` se lit mal comme un O (verre invisible sur fond clair), `tasse-the` non plus (la tasse est décalée sur sa soucoupe) : garde-les pour l'effet `objet`.
  - Le rond de chaque tasse est déjà mesuré au pixel : elle s'emboîte toute seule à la taille des lettres,
    et la taille du mot s'adapte pour qu'il tienne dans l'écran. Tu n'as rien à régler.
  - Un ou deux par vidéo, sur un mot fort, de préférence quand il est question de café, de pause, de routine.
- **La capture pincée** : SES captures d'écran (son site, un message de cliente avec son accord, ses stats, son
  Canva…) tenues par une vraie pince à dessin, à côté de sa tête. Validée par Aurélie le 07/11.
  `{ "type": "pincee", "t": 8, "images": ["captures/a.png", "captures/b.png"], "pas": 2.2 }`
  - Les captures vont dans `projets/<nom>/` (un sous-dossier `captures/` est pratique). De 1 à 6 ; elles se
    remplacent toutes les `pas` secondes (l'ancienne glisse de la pince et tombe, la nouvelle s'y glisse).
  - Elle se place toute seule du côté libre, à côté de la tête, jamais sur le visage ni au bord de l'écran.
    Tu n'as rien à régler.
  - Pour une capture de téléphone (très haute), ajoute `"ratio": 1.8` ; par défaut 1,25.
  - Rien sur le coin : la pince suffit (l'objet sur le coin a été retiré par Aurélie le 08/11).
  - Quand elle dit « regarde », « mon site », « ce message », « mes chiffres ». ⛔ Jamais pendant le hook.
- ⛔ **Jamais d'objet dessiné derrière elle** (machine à écrire, panneau routier) : refusés par Aurélie le 06/11 (« trop fake »).
- **La vidéo dans la vidéo** : `{ "type": "extrait", "t": 14, "video": "autre-prise.mp4", "debut": 3, "duree": 4, "etiquette": "ma routine en vrai" }` :
  SON extrait (une 2e prise, une B-roll de son produit ou de ses mains, ou un reel qu'elle a le droit de montrer : le sien,
  ou celui d'une personne d'accord, en citant la source) tourne sans le son dans un cadre blanc penché, du côté libre,
  6 secondes au plus. Parfait pour décortiquer un reel ou montrer « en vrai » ce qu'elle explique.
- **Les effets « interface »** (dans `effets`), pour une vidéo moderne et rythmée, un ou deux par vidéo, SES mots :
  `dialogue` (une boîte de dialogue de téléphone et le curseur qui clique : `"question": "Publier sans hook ?", "detail": "Tes vues risquent de chuter", "non": "Non", "oui": "Publier", "clic": "non"`, pour un hook qui intrigue ; la version rouge « danger » a été retirée),
  `anatomie` (des étiquettes reliées par un trait autour d'elle : `"items": ["grain", "titre", "zoom"]`, quand elle énumère ce qu'on voit),
  `fenetre` (une fenêtre d'ordinateur où SA phrase se tape, avec son bouton d'envoi : `"titre": "…", "texte": "…", "bouton": "Valider"`),
  `progression` (« montage en cours… » qui se remplit : `"texte"`, `"fin"`), `horloge` (les aiguilles filent et la lune se lève : le temps qui passe),
  `prix` (une étiquette de prix, SON vrai chiffre : `"montant": "1 500 €", "petit": "avant", "dessous": "/ mois", "barre": true` pour le barrer),
  `pastille` (SON petit mot du moment en capsule blanche : `"texte": "super simple", "emoji": "🙌"`), `touches` (`"touches": ["Ctrl", "C"]`),
  `ecrans` (4 téléphones avec SA vidéo en 4 looks, ⛔ toujours des looks choisis pour elle, jamais ceux par défaut :
  `"looks": [["brut", "none"], ["doux", "brightness(1.1) saturate(.8)"], ["chaud", "sepia(.3) saturate(1.2)"], ["n&b", "grayscale(1)"]]`) et `etalonnage` (la même image d'elle, sans puis avec retouche : `"avant": "sans", "apres": "avec"`).
  ⛔ Jamais `timeline` ni `trait` (retirés par Aurélie le 08/11).
- **Le tableau en liège** : le fond vert avec `"decor": "liege"` : derrière elle, un tableau en liège où SES photos
  sont punaisées et reliées par un fil rouge, au rythme de ce qu'elle dit.

**Les couleurs d'une photo qu'elle aime** (TOUS les styles) : `"reference": "ma-photo.jpg"` dans projet.json (copie
la photo dans son projet) et `"intensiteReference": 0.6` (de 0 à 1) : sa vidéo prend doucement les couleurs de cette
photo (une image de film, une photo Pinterest, son feed). Commence à 0.5 ou 0.6 et montre-lui une image.

**L'intermède** `"medaillon": [[43.9, 48.6]]`, sur LA question ou LA phrase clé, 3 à 5 s, une fois par vidéo :
en collage elle rétrécit dans un médaillon sur papier quadrillé, en pop c'est une carte inclinée sur fond bleu
étoilé, en éditorial une page de magazine où ses mots se tapent au clavier, en witchy une page de grimoire. Pas en doux, typo, chic, automne ni studio.

**En collage seulement :**
- `"etiquettes": [{ "t": 7.2, "texte": "marketing de réseau" }]` : une bande de papier tapée à la machine (2 ou 3 mots, 1 ou 2 par vidéo) ;
- `"barres": [{ "t": 14.9, "texte": "laissé au hasard", "puis": "tout est prévu" }]` : tapé, barré au feutre rouge,
  puis la correction écrite à la main. Pour « ce n'est pas X, c'est Y », « on croit que… ». Une fois par vidéo ;
- `"carnet": { "t": 28.1, "titre": "le plan", "items": ["…", "…", "…"], "duree": 6 }` : une page de carnet scotchée
  tombe et la liste s'écrit. 3 lignes courtes maximum, avec SES mots.

**Les couleurs.** Ces styles ont leur propre palette (l'éditorial prend même les siennes dans son décor).
Pour les accorder à SA charte, ajoute `"couleurs": { … }` dans `collage` : `beurre` (mot fort et titre en collage),
`tomate` (feutre), `mot` et `etoile` (pop), `rose` et `peche` (éditorial), `mot` (doux : la couleur du mot
fort et de l'étoile ; sinon c'est la couleur du mot fort de sa charte). En doux, seules ses couleurs comptent :
les polices du style sont fixes, c'est ce qui fait son allure. Montre-lui une image avant de tout monter.


**L'image.** Une correction légère s'applique d'office à tous les styles (un peu de lumière, moins
de grain, un peu de netteté) : elle améliore sans se voir. Si elle trouve sa vidéo sombre, granuleuse
ou floue, ajoute ce qu'elle demande : `"image": ["lumineux"]`, `["grain"]`, `["net"]`, `["chaud"]` ou
`["froid"]`, à combiner (`["lumineux", "grain"]`). `"image": "aucun"` garde l'image telle quelle.
Jamais de filtre qui abîme : pas de grain ajouté, pas de vignette, pas de noir et blanc.

**L'ambiance**, seulement si elle la demande, par-dessus la correction : `"ambiance": "cocooning"`
(lumière de lampe le soir, ambrée et feutrée) ou `"ambiance": "matin lumineux"` (clair, aéré, baigné
de soleil). Il n'en existe pas d'autre : si elle en veut une autre, dis-lui que ce sont les deux proposées.

Le hook n'est jamais rapproché. Un plan rapproché ou un gros plan à un endroit précis, quel
que soit le style : `"rapprocher": [[début, fin]]` ou ` #grosplan` sur la ligne.
Jamais deux zooms empilés, jamais de zoom/dézoom à chaque phrase sauf en « energie ».

D'office, pour classique, prof et leurs variantes (pas pour doux, pop, collage, éditorial, typo, witchy, chic, automne, studio) :
- `"motAMot": true` : les sous-titres s'écrivent mot par mot au rythme de sa voix ;
- `titre` : SES mots du hook (les premiers mots de sa vidéo), `/` pour aller à la ligne ;
- `etincelles: true` ; `compteur` seulement si son hook contient un chiffre ;
- `retirer` : les passages qu'elle veut enlever, coupés dans un blanc ;
- 1 à 3 `stickers` maximum, PETITS, sous son visage, jamais dessus : `notif` (un rappel),
  `notes` avec `"progressif": true` (une liste qui s'écrit ligne par ligne), `groupe`
  (pastilles « émoji + mot »), `sondage` (OUI/NON). Uniquement avec SES mots : jamais un
  faux message de quelqu'un ;
- `carteFin` avec `"style": "leger"`, une question ou un pari. **Jamais « abonne-toi ».**

**Les effets « waouh »**, un ou deux par vidéo au maximum, et seulement s'ils servent ce qu'elle dit.
Propose-les-lui, elle choisit :
- **Titre derrière elle** : `"titreDerriere": { "texte": "100K", "style": { "top": 100, "taille": 250, "couleur": "#ffffff" } }`.
  Un mot ou un chiffre court de SON hook, énorme, qui passe derrière sa tête. Seulement si elle est
  filmée en plan assez large (sa tête ne touche pas le haut de l'image) et s'il y a du décor derrière elle.
- **Mode portrait** : `"portrait": [[début, fin]]`, sur LA phrase forte (2 à 4 s) : le décor se floute,
  elle reste nette. Une seule fois par vidéo.
- **Carnet vivant** : `{ "type": "annotation", "t": 6.2, "duree": 1.8, "texte": "mon agenda", "vers": [x, y] }`.
  Quand elle MONTRE un objet (son agenda, son téléphone, un produit) : un mot au feutre et une flèche
  tracée vers l'objet. Pour trouver `vers`, regarde une image du montage à ce moment-là (extrais-la
  avec ffmpeg) et donne le centre de l'objet en pixels de l'image finale (720 de large, 1280 de haut).
  Le mot se place tout seul hors de son visage.
- **Capture réaliste** : `{ "type": "capture", "t": 26.2, "duree": 2.2, "image": "captures/message.png" }`.
  Quand elle parle d'un message de cliente, d'une statistique, d'un avis : SA vraie capture d'écran,
  qu'elle t'envoie (copie-la dans `projets/<nom>/captures/`). Jamais une capture inventée ou
  fabriquée : si elle n'en a pas, pas de capture. Cache ce qui est privé (nom, photo d'une cliente)
  si elle te le demande, en recadrant l'image avant.
- Sons : seulement des petits clics discrets (`clicsMotsForts: 0.1`) et un whoosh doux
  quand elle change de plan. Rien sur le hook, rien de fort à la fin.

### Ses sons à elle (clé `"sons"`)

Elle peut choisir ses sons. Elle te le dit avec ses mots, et tu traduis :

| Elle te dit | Tu écris dans projet.json |
|---|---|
| « je veux des sons plus doux » | `"sons": { "pack": "doux" }` |
| « des sons plus pétillants » | `"sons": { "pack": "pop" }` |
| « des sons chics, discrets » | `"sons": { "pack": "luxe" }` (déjà le cas en style luxe) |
| « garde toujours ce pop-là » | `"sons": { "pop": "pop-a" }` (un son fixe pour la famille) |
| « alterne ces deux whoosh » | `"sons": { "whoosh": ["whoosh-a", "whoosh-doux"] }` |
| « plus de glitch » | `"sons": { "glitch": "aucun" }` (la famille ne sonne plus) |

Les familles : pop, clic, whoosh, cloche, kaching, photo, magie, glitch, clavier, et celles des objets :
coffre (le coffre à fiches), boite (l'éventail), papier (une fiche qui sort), punaise (le liège), tirage
(le Polaroid), tampon, page (le carnet, le titre de chapitre), stylo (la feuille écrite). Une famille
d'objet sans son retombe sur une famille proche. Les noms sont ceux
des fichiers de `sons/` sans `.wav` (liste-les si elle demande ce qui existe). Un nom qui n'existe pas
est ignoré : tu retombes sur les sons habituels, il n'y a jamais d'erreur. Ordre : un son fixé pour
une famille passe avant le pack, et le pack passe avant la rotation habituelle. Tu peux combiner :
`"sons": { "pack": "doux", "kaching": "cloche-a" }`.

### Les bruitages posés à la main (clé `"bruitages"`, banque choisie par Aurélie le 08/11)

Pour un bruitage qui RACONTE ce qu'elle dit, au moment précis : `"bruitages": [{ "t": 12.4, "son": "ciseaux" }, { "t": 31, "son": "applaudissements" }]`
(`t` = temps de la vidéo d'origine ; `son` = une famille, ou un son précis comme `"boing-b"` ; `"vol"` facultatif). Les familles :
`ciseaux` (elle coupe, elle tranche), `scotch` (elle colle, elle répare), `machine` (machine à écrire), `cassette` (retour en arrière,
souvenir), `cles` (« la clé », « déverrouiller »), `ticket` (un total, une addition), `agrafeuse` (« c'est réglé »), `zip` (« bouche cousue »,
fermer), `bulle` (une idée qui pope, doux), `goutte` (look doux), `roulement` (tambour avant une révélation), `stop` (arrêt net, comique),
`boing` (ressort comique), `message` (notification de message), `swipe` (doigt qui glisse sur l'écran), `craie` (tableau, leçon),
`applaudissements` (une victoire), `riser` (montée avant LA révélation), `soyeux` (transition luxe). ⛔ Deux ou trois par vidéo au plus,
seulement sur un mot qu'elle prononce, jamais pendant le hook, jamais deux à moins de 3 secondes. Les comiques (boing, stop) seulement
si le ton de la vidéo est drôle.

## 6. Monter et vérifier

⛔ **D'abord la planche avant fabrication** (styles doux, pop, collage, éditorial, typo, witchy, chic, automne,
studio) : `cd "ATELIER" && node montage.mjs apercu <nom>`. En une minute environ, sans rien fabriquer, elle sort
`<nom>-apercu.jpg` : 8 images de SON futur montage, textes, effets, duos, fond vert et téléphone en place, avec en
rouge ce que l'appli recouvre. Montre-la-lui, dis-lui à quels moments correspondent les images (le script les
donne), et demande : « ça te va, ou on change quelque chose avant que je fabrique ? ». Corrige `projet.json`, refais
la planche si besoin, et SEULEMENT quand elle dit oui, fabrique. Elle n'attend jamais 10 minutes pour découvrir un
texte mal placé.

`cd "ATELIER" && node montage.mjs monter <nom>`

Le script réécoute toute la vidéo : s'il affiche ⚠️, corrige avant de lui montrer.

⛔ **Son visage d'abord.** Le script repère son visage image par image et descend (ou monte)
tout seul les sous-titres, le titre et les cartes pour ne jamais le toucher ; le plan
rapproché se cadre sur son visage et s'arrête avant que son menton n'atteigne les
sous-titres. S'il affiche « ⚠️ VISAGE », il n'a pas trouvé de place libre à ces moments-là :
regarde ces images une par une. Solutions, dans l'ordre : déplacer la carte (`x`, `y`),
la raccourcir ou la retirer, couper le passage, et si elle est trop près de la caméra pour
laisser de la place au texte, le lui dire gentiment pour sa prochaine vidéo (« recule ton
téléphone d'un pas, qu'on voie tes épaules »). Tu ne lui montres JAMAIS une vidéo avec du
texte sur son visage.
**Le contrôle de fin de montage.** Il tourne tout seul. Dans doux, pop, collage, éditorial, typo,
witchy, chic, automne et studio, il mesure chaque texte à l'écran deux fois par seconde. Il signale par « ⚠️ CONTRÔLE » :
- un texte sur son visage, ou un titre caché derrière sa tête ;
- le même mot deux fois à l'écran en même temps ;
- un texte coupé au bord, ou sous les boutons de l'appli (légende en bas, onglets en haut, icônes à droite), selon
  `plateforme` ;
- un texte illisible parce qu'il a la même clarté que le fond.

Dans tous les styles, il fabrique aussi une **planche de contrôle** de 12 images (`…-planche.jpg`), avec en rouge
ce que l'appli recouvre :
ouvre-la et regarde-la. **Chaque « ⚠️ CONTRÔLE » se corrige avant de lui montrer la vidéo.** Par exemple :
- déplacer ou raccourcir un texte ;
- retirer un mot fort de trop ;
- changer la couleur d'un mot sur un fond clair (`couleurs`).

Puis remonte. Si un avertissement reste sans solution, dis-le-lui en une phrase. Un avertissement sur
un instant très court peut être sans conséquence : regarde l'image à ce moment-là pour en juger.
Regarde aussi 4 ou 5 images de la vidéo finale (`ffmpeg -ss <t> -frames:v 1`) : son visage
dégagé, rien coupé par les bords, texte lisible sur un téléphone.

Copie la vidéo finale dans le dossier « Mes reels montés » de son Bureau (crée-le s'il n'existe pas) avec un nom clair
(« <Prénom> - reel monté.mp4 ») et donne-lui le lien.

Ouvre-lui le dossier (Windows `start "" "<dossier>"`, Mac `open "<dossier>"`) pour qu'elle trouve son reel.

## 7. Les retouches

Elle peut demander : un mot fort différent, un passage à enlever, une carte en plus ou en
moins, moins de sons. Tu modifies `sous-titres.txt` ou `projet.json` et tu remontes : chaque
montage crée une nouvelle version, l'ancienne reste.

## 8. Le coach facecam (quand elle veut un retour sur sa façon de parler, ou AVANT de monter)

Elle peut te demander « dis-moi ce que tu penses de ma vidéo », « comment je m'améliore face
caméra », ou tu le lui proposes avant un montage. Tu regardes et écoutes sa vidéo, puis tu lui
rends un retour bienveillant, chiffré, avec UN exercice.

1. `cd "ATELIER" && node coach.mjs analyser "<chemin de sa vidéo>" <prenom>` : sort `coach/<prenom>/analyse.json`
   (regard vers l'objectif, tics de langage, débit, démarrage, énergie seconde par seconde,
   cadrage, lumière, sourire, phrases redites) et `transcription.txt` (ses phrases minutées).
2. Tu LIS la transcription en entier, puis tu écris `ATELIER/coach/<prenom>/relecture.json` :
   - `prenom`, `titre` (une phrase qui résume, positive et vraie), `mot` (3 à 4 phrases
     chaleureuses : ce qui marche d'abord, puis ce qui la freine, sans jugement) ;
   - `decrochage` : les moments où on risque de partir, `[{ "quand": "0:17", "quoi": "…" }]`.
     Ce qu'on cherche : une idée déjà dite, une phrase redite, une phrase trop longue d'un seul
     souffle, une liste qui ralentit, l'énergie qui retombe (les `baisses` de l'analyse), plusieurs
     appels à l'action à la suite. Cite ses mots entre guillemets ;
   - `versionCourte` : `{ "avant": <s>, "apres": <s>, "texte": [ses phrases gardées] }`. Si sa vidéo
     peut être dite en deux fois moins de temps, la version courte gagne : tu gardes le hook, une
     preuve ou une histoire, la question, UN appel. Jamais un mot qu'elle n'a pas dit ;
   - `garder` : les passages gardés, en secondes de la vidéo d'origine, pris dans la transcription.
   - Tu peux remplacer les listes automatiques par les tiennes : `forts`, `travail` (3 maximum),
     `exercice` (`{ "titre", "faire" }`). Sinon l'outil les choisit à partir des chiffres.
3. `node coach.mjs couper <prenom>` fabrique `version-courte.mp4` (les coupes se calent
   dans ses blancs). Tu la réécoutes (transcription) : si une phrase est coupée, tu corriges
   `garder` et tu recommences.
4. `node coach.mjs page <prenom>` fabrique `retour.html`. Copie `retour.html` et
   `version-courte.mp4` dans le dossier « Mes reels montés » de son Bureau (crée-le s'il n'existe pas) (même dossier : la page affiche la vidéo),
   et dis-lui de télécharger les deux puis d'ouvrir la page.

Le ton : celui d'Aurélie. Toujours commencer par ce qui marche, une seule priorité à la fois,
des chiffres précis plutôt que des adjectifs (« 12 « euh » en 40 s », pas « beaucoup de euh »).
« Tournée vers l'objectif » veut dire que sa tête est face à l'objectif : ne dis jamais que tu
vois où vont ses yeux. Jamais de remarque sur son physique, sa voix ou son accent.

## 9. Le défi « 1 texte, 6 tons »

Elle a filmé le même texte sur plusieurs tons (2 à 6) et veut en faire un reel. Demande-lui ses
prises et le ton de chacune, dans l'ordre où elle veut les montrer, puis :

`cd "ATELIER" && node defi.mjs "<Bureau>/Mes reels montés/defi-<prenom>.mp4" "<prise 1>" "enthousiaste" "<prise 2>" "chuchoté" ...`

Chaque prise passe à son tour (blancs coupés), avec « 1/6 » et le ton écrits en bas, sous son
visage. À la fin, toutes les prises jouent ensemble en mosaïque avec « Lequel tu préfères ? Le
numéro en commentaire » (autre phrase : `DEFI_QUESTION="…"` devant la commande). Tu vérifies une
image par prise : si une étiquette touche son visage (gros plan), dis-le-lui et propose de
refilmer cette prise un peu plus loin. Puis tu lui rends la vidéo.

## 10. Une vidéo, tout le contenu (reel, 3 hooks à tester, story, légende)

**Les 3 débuts se préparent AU TOURNAGE.** Avant qu'elle filme, propose-lui 3 phrases d'accroche
différentes pour la même vidéo (une question, un chiffre ou un résultat, une confidence), et
demande-lui de les dire à la suite au début de sa vidéo, en marquant une pause entre chacune, puis
d'enchaîner sur le reste. Chaque version garde son début et enlève les deux autres : l'enchaînement
est naturel, puisqu'elle l'a vraiment dit. Une phrase prise au milieu de la vidéo et recollée
au début sonne souvent collée : ne le fais que si elle n'a pas filmé ses 3 débuts, que la phrase
se comprend seule, et que tu as réécouté le passage entre la phrase et la suite.

Une fois son reel réglé (étape 5), tu relis `sous-titres.txt` et `mots.json`, puis tu écris
`ATELIER/projets/<nom>/declinaisons.json` :
- `hooks` : les 2 autres débuts, en temps de la vidéo d'origine (pris dans `mots.json`) :
  - débuts filmés (le cas normal) : le reel principal garde le début n°1 et retire les 2 autres
    (dans son `projet.json`, `retirer`) ; chaque autre version :
    `{ "nom": "la confidence", "retirer": [[les 2 débuts qu'elle ne garde pas]], "titre": "ses mots" }` ;
  - à défaut : `{ "nom": "le secret", "ouverture": [début, fin], "titre": "ses mots" }`.
  Le titre reprend EXACTEMENT ses mots. En gros plan, le titre n'a pas de place hors de son visage :
  préfère un début filmé en plan large ;
- `story` : `{ "duree": 12, "bandeau": "quelques mots" }` (15 s maximum) ;
- `legende` : sa légende, dans ses mots : l'accroche de la vidéo, l'histoire en 2 ou 3 phrases,
  une question ou un pari en appel (jamais « abonne-toi »), 3 à 5 hashtags. Pas de tiret cadratin.

Puis `cd "ATELIER" && node declinaisons.mjs <nom>` range tout dans `projets/<nom>/contenu/` : `reel.mp4`
(= hook 1), `hook-2.mp4`, `hook-3.mp4`, `story.mp4`, `legende.txt`. Tu vérifies le début de
chaque hook (une image toutes les 0,4 s), puis tu lui expliques comment tester : publier les
hooks en reels d'essai à quelques jours d'écart, et comparer la part de vues qui dépasse 3 s.
Copie les fichiers de `contenu/` dans le dossier « Mes reels montés » de son Bureau (crée-le s'il n'existe pas) (préfixés de son prénom) pour
qu'elle les télécharge, et donne-lui la légende directement dans ta réponse, prête à copier.

## 11. Ses objets à elle (importés de SON Canva)

Quand elle t'envoie une image PNG à fond transparent en disant « importe mes objets Canva » (ou quelque chose
d'approchant), ses objets deviennent les siens dans ses montages : ils passent AVANT les objets livrés.
Elle utilise SES éléments avec SA licence Canva : tu ne lui proposes jamais de prendre ceux de quelqu'un d'autre.

1. Trouve le fichier (pièce jointe en ligne, ou le chemin qu'elle te donne sur l'ordinateur), puis
   `cd "ATELIER" && node importer-objets.mjs decouper <le fichier>`.
   - `PAS_TRANSPARENT` : dis-lui simplement de retélécharger sa page dans Canva en cochant
     « Arrière-plan transparent » (option de Canva Pro). Rien d'autre.
   - `ATTENTION … se touchent` : dis-lui d'écarter un peu ses objets sur la page Canva et de te la renvoyer.
2. Regarde `objets-perso/planche.png` (les objets dans l'ordre des numéros : de gauche à droite, puis
   la ligne suivante) et donne à chacun un nom simple avec `node importer-objets.mjs nommer import-03 <nom>`.
   Les noms que les effets reconnaissent, à utiliser quand l'objet correspond :
   `appareil-instantane` (polaroid), `coffre-bois` (coffre), `boite-bois` (boîte ou caisse ouverte),
   `boite-carton` (carton ouvert), `enveloppe-kraft-lettre` (enveloppe ouverte), `postit-jaune` (post-it).
   Pour les autres, un nom libre en minuscules avec des tirets (`etoile-jaune`, `fleche-rose`…).
   **Ses tasses vues de dessus** (pour le mot-tasse) : un nom libre (`ma-tasse-rose`, `mon-chai`…), et c'est tout :
   leur rond se mesure tout seul au montage. Si une tasse se cale mal dans le O (le cercle ne suit pas son bord),
   `node importer-objets.mjs rond <nom>` puis regarde `objets-perso/<nom>-controle.png` ; pour corriger à la main :
   `node importer-objets.mjs grille <nom>`, puis `node importer-objets.mjs rond <nom> cx cy r` (centre et rayon en pixels).
   Seules les tasses vraiment vues de dessus font un beau O : une tasse de profil, propose-la plutôt pour l'effet `objet`.
3. Un CONTENANT (appareil, coffre, boîte, enveloppe) doit être MESURÉ, sinon il est ignoré (sans son bord,
   rien ne peut en sortir proprement) :
   - `node importer-objets.mjs grille <nom>` puis regarde `objets-perso/<nom>-grille.png` (traits bleus tous
     les 50 px, rouges tous les 100 px, origine en haut à gauche) ;
   - boîte, coffre ou enveloppe : `node importer-objets.mjs bord <nom> x,y x,y …`, les points du BORD AVANT de
     gauche à droite (pour une enveloppe : le V de la poche ; pour une boîte en perspective : le coin avant
     gauche, le coin avant droit, puis le coin arrière droit) ;
   - appareil : `node importer-objets.mjs fente <nom> y x0 x1` (la ligne de la fente et ses deux bouts) ;
   - regarde `objets-perso/<nom>-controle.png` : la ligne rouge doit suivre le bord exactement. Sinon, refais.
4. Dis-lui en une phrase ce que tu as rangé (« ton coffre, ton polaroid et 4 décorations ») et qu'ils
   serviront dans ses prochains montages. Ne lui montre ni commande, ni nom de fichier technique.
   Sur Claude en ligne, l'atelier repart de zéro à chaque conversation : dis-lui de garder son image et de
   la renvoyer avec sa vidéo la prochaine fois (sur l'ordinateur, ses objets restent rangés pour toujours).

## Ce que tu ne fais jamais

- Un son sur le hook, un bruitage long ou fort, un son qui couvre sa voix.
- Des zooms qui entrent et sortent à chaque phrase. Le noir et blanc (sauf le court arc du style pop).
- Du texte ou une carte sur son visage.
- « Abonne-toi » en fin de vidéo, un faux témoignage, un faux chiffre.
- Lui montrer une vidéo que tu n'as pas vérifiée.
- Citer le nom d'une autre élève ou d'une créatrice dont s'inspirent les styles : les styles
  s'appellent doux, classique, prof, pop, collage, éditorial, typo, witchy, chic, automne, studio (et les variantes serie, carnet, energie), et c'est tout ce que l'élève voit.
