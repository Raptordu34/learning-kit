# Changelog

Ce fichier décrit les changements entre versions de chaque template.
Format: `## templateName` (H2), `### vX.Y.Z` (H3), bullet points describing changes.

---

## compte-rendu

### v1.0.0
- Version initiale

## presentation

### v1.0.0
- Version initiale

## cheat-sheet

### v1.0.0
- Version initiale

## comparatif

### v1.0.0
- Version initiale

## fiche-revision

### v1.0.0
- Version initiale

## one-pager

### v1.0.0
- Version initiale

## rapport-projet

### v1.0.0
- Version initiale

## synthese-article

### v1.0.0
- Version initiale

## td-exercice

### v1.6.0
Fichiers modifiés : `templates/td-exercice/print-utils.js`

#### Qualité d'impression et rendu PDF
- **Numérotation des pages** via `@page` margin boxes (Chrome 131+, Firefox 131+, Safari 18.2+) : "Page X / Y" en haut à droite, titre du document en bas au centre, masqués sur la première page
- **Marge top** de la page augmentée à 14mm pour laisser de la place au header de page
- **Densité typographique optimisée** : police 8.5pt → 8pt, line-height 1.45 → 1.3, marges réduites sur paragraphes/listes/cards/tags/solutions
- **Column gap** réduit de 8mm → 6mm pour maximiser la surface utile
- **Padding des cards** réduit de 2.5mm/3.5mm → 2mm/3mm
- Ajout de `orphans: 3; widows: 3` pour éviter les lignes isolées en haut/bas de page

#### Contrôle des sauts de page
- `break-after: avoid` sur les séparateurs de section (`.pc-section-break`) et les objectifs (`.pc-objectifs-strip`) : empêche les headers orphelins en bas de page
- `break-after: avoid` sur h2/h3/h4 : un titre n'apparaît jamais seul en bas de page
- `break-inside: avoid` sur `<pre>`, `<table>`, `.terminal` : blocs de code et tableaux ne sont plus coupés entre deux pages
- `break-before: avoid` sur `.pc-sol-wrap` : la solution reste rattachée à sa question

#### Gestion du débordement
- Police code et tableaux réduite de 7.5pt → 7pt pour les colonnes étroites
- `overflow-wrap: break-word` sur `<pre>` pour les longues lignes de code
- `max-height: 120mm` + `overflow: hidden` sur `<pre>` comme soupape de sécurité
- `table-layout: fixed` + `word-wrap: break-word` sur les tableaux larges

#### Aperçu écran
- Lignes rouges approximatives tous les ~297mm simulant les sauts de page dans la preview
- Message informatif "Les lignes rouges indiquent les sauts de page approximatifs" au-dessus du bouton d'impression

#### Impression
- `print-color-adjust: exact` pour forcer l'impression des couleurs de fond (badges, backgrounds de rappels/méthodes/erreurs)

### v1.5.0
Fichiers modifiés : `templates/td-exercice/print-utils.js`

- Format d'impression passé de **A4 paysage** à **A4 portrait** (`@page { size: A4 portrait; margin: 10mm 12mm }`)
- Mise en page passée de 3 colonnes à **2 colonnes** (gap 8mm, ~89mm par colonne — densité comparable)
- Suppression de l'auto-déclenchement de `window.print()` : la fiche s'ouvre d'abord en preview, un bouton "⎙ Imprimer / Enregistrer en PDF" permet de lancer l'impression manuellement
- Preview écran fidèle au rendu imprimé : popup contrainte à `186mm` (largeur contenu A4 portrait), centrée sur fond gris
- Correction du saut de page parasite après les objectifs : suppression de `break-after: avoid` sur les éléments `column-span: all`, passage à `column-fill: balance` en mode écran et `column-fill: auto` en mode impression via `@media print`
- En-tête (`.ph`) déplacé à l'intérieur de `.print-wrap` avec `column-span: all` pour que Chrome calcule correctement la hauteur disponible des colonnes
- Ajout de `-webkit-column-break-inside: avoid` sur `.pc` pour Chrome

### v1.4.0
Fichiers modifiés : `templates/td-exercice/index.html`, `templates/td-exercice/print-utils.js`

#### Panneau de filtres fiche récap
- Nouveau **panneau de filtres** glassmorphism pour la fiche récap (⎙ Fiche ouvre un panneau au lieu de déclencher directement l'impression)
- 3 presets rapides : **Tout**, **Révision** (objectifs + questions + solutions + erreurs + tips), **Entraînement** (sans solutions ni erreurs ni tips)
- 10 cases à cocher indépendantes : objectifs, contexte, rappels, exemples guidés, énoncés, solutions, erreurs fréquentes, points clés, infos/analogies, méthodes
- Fermeture automatique du panneau au clic en dehors
- Persistance des filtres via `localStorage` (`td_fiche_filters`)
- Filtrage dans `generatePrintSheet(filters)` : blocs exclus selon les filtres, `.pc-sol-wrap` supprimé si solutions désactivées
- Responsive : panneau pleine largeur sous le toolbar sur mobile (≤ 768px)

#### Style du panneau (`.fiche-panel` dans `index.html`)
- Positionnement absolu sous le toolbar (`top: 56px; right: 24px`), `z-index: 300`, largeur fixe 270px
- Style glassmorphism : hérite de `.glass-panel` (backdrop-filter blur, fond semi-transparent, bordure translucide)
- `border-radius: 16px`, padding `1rem 1.1rem 1.1rem`, flex column avec `gap: 0.5rem`
- Toggle visibilité par classe `.visible` (`display: none` → `display: flex`)
- Header avec titre "⎙ Fiche récap" + bouton fermer ✕ (hover: fond blanc 8% opacité)
- Labels de section en uppercase 0.7rem avec `letter-spacing: 1.5px`, couleur `--text-secondary`
- Boutons preset : fond blanc 7% opacité, bordure blanc 12%, `border-radius: 8px`, état `.active` orange 20% opacité avec bordure orange 40%
- Checkboxes : `accent-color: var(--accent)` (orange), labels 0.82rem avec hover vers `--text-primary`
- Séparateur `.fiche-divider` : bordure top blanc 8% opacité
- Bouton "Générer la fiche" : fond orange dégradé, `border-radius: 10px`, pleine largeur, hover plus lumineux
- Responsive ≤ 768px : `position: static`, pleine largeur, `border-radius: 0 0 12px 12px`

### v1.3.0
Fichiers modifiés : `templates/td-exercice/print-utils.js`, `templates/td-exercice/index.html`

- Fiche récap : couverture de **toutes les sections** du TD (fetch async + DOMParser, plus limité à l'iframe courante)
- Feedback visuel pendant le chargement : bouton passe en "⏳ Chargement…" puis revient à "⎙ Fiche"
- Nouveau layout : en-tête global (titre + date), bandeau orange par section, strip teal pour les objectifs, 3 colonnes pour le reste
- Solution marquée d'un badge vert "✓ Solution" (remplace le tiret dashed)
- Barème, points, niveau de difficulté et prérequis supprimés de la fiche
- Rappels avec fond bleu clair, méthodes avec fond vert clair pour distinction visuelle
- Système de filtres par type de bloc (préparé pour future UI de configuration)

### v1.2.0
Fichiers modifiés : `templates/td-exercice/index.html`, `templates/td-exercice/print-utils.js` (nouveau)

- Nouveau bouton **⎙ Fiche** dans le toolbar : génère une fiche récap A4 paysage imprimable
- Extraction automatique des éléments pédagogiques : objectifs, contexte, rappels de cours, exemples guidés, questions+solutions, erreurs fréquentes, tips, méthodes, barème
- Mise en page 3 colonnes CSS auto-flow, économe en encre (zéro glassmorphism, fond blanc)
- Solutions dépliées automatiquement dans la fiche (résolution du pattern sibling `.solution`)
- Mots-clés/thèmes extraits automatiquement des `<code>` de l'énoncé, affichés sous chaque question
- Points et niveau de difficulté exclus de la fiche (non pertinents pour la relecture)
- Impression déclenchée automatiquement à l'ouverture de la popup

### v1.1.0
Fichiers modifiés : `layouts/sidebar-iframe.css`, `templates/td-exercice/index.html`, `templates/td-exercice/components.css`

- Responsive mobile : layout bottom nav bar (sidebar → barre fixe en bas, scroll horizontal)
- Toolbar transformé en strip horizontal en haut du contenu sur mobile (≤ 768px)
- Texte du bouton "Révéler les solutions" raccourci sur mobile ("▶ Solutions")
- Composants responsive : `.two-col` → 1 colonne, `.bareme` → empilé, `.exo-meta` → flex-wrap
- Tableaux, terminal, blocs `<pre>` → scroll horizontal sur mobile
- Paddings et tailles de police réduits sur mobile
- `.reponse-zone` min-height augmenté pour confort tactile
- Curseur halo désactivé sur mobile (inutile sur tactile)

### v1.0.0
- Version initiale
