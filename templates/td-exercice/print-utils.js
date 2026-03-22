/* learning-kit/templates/td-exercice/print-utils.js
   Génère un document A4 portrait imprimable couvrant TOUTES les sections du TD.
   Conserve la présentation complète de chaque section.
   Trois modes couleur : neutre (gris), sobre (couleurs atténuées), couleur (couleurs d'origine).
   Appelé par le bouton "⎙ Fiche" (id="fiche-btn") dans index.html.
*/

const PRINT_FILTER_KEYS = ['objectifs','ctx','rappel','exemple','question','solution','erreur','tip','callout','methode'];

/* ── Entrée principale ─────────────────────────────────────────── */
async function generatePrintSheet(filters = {}, colorMode = 'neutre') {
    const f = Object.keys(filters).length
        ? filters
        : Object.fromEntries(PRINT_FILTER_KEYS.map(k => [k, true]));

    const btn = document.getElementById('fiche-btn');
    if (btn) { btn.textContent = '⏳ Chargement…'; btn.disabled = true; }

    const urls = [...document.querySelectorAll('.nav-btn')]
        .map(b => b.getAttribute('onclick')?.match(/'([^']+)'/)?.[1])
        .filter(Boolean);

    if (!urls.length) {
        alert('Aucune section trouvée dans la navigation.');
        if (btn) { btn.textContent = '⎙ Fiche'; btn.disabled = false; }
        return;
    }

    const allSections = [];
    for (const url of urls) {
        try {
            const html  = await fetch(url).then(r => r.text());
            const doc   = new DOMParser().parseFromString(html, 'text/html');
            const title = doc.querySelector('h2')?.textContent?.trim() || url;
            const bodyHtml = cleanSectionForPrint(doc, f);
            if (bodyHtml.trim()) allSections.push({ title, html: bodyHtml });
        } catch (e) {
            console.warn('Section ignorée :', url, e);
        }
    }

    if (btn) { btn.textContent = '⎙ Fiche'; btn.disabled = false; }

    if (!allSections.length) {
        alert('Impossible de charger les sections. Vérifiez que les fichiers sont accessibles.');
        return;
    }

    const title    = document.querySelector('.sidebar-header h1')?.textContent?.trim() || 'Fiche récap';
    const subtitle = document.querySelector('.sidebar-header p')?.textContent?.trim()  || '';
    openPrintWindow(buildPrintHTML(allSections, title, subtitle, colorMode));
}

/* ── Nettoyage d'une section complète pour l'impression ──────────── */
function cleanSectionForPrint(doc, f) {
    const body = doc.querySelector('body');
    if (!body) return '';
    const clone = body.cloneNode(true);

    // 1. Traiter les hint-btn / hint : distinguer rappels vs indices
    clone.querySelectorAll('.hint-btn').forEach(btn => {
        const label   = (btn.getAttribute('data-label') || '').toLowerCase();
        const hintId  = btn.getAttribute('data-hint');
        const hintEl  = hintId ? clone.querySelector('#' + CSS.escape(hintId)) : null;

        if (label.includes('rappel')) {
            // C'est un rappel de cours → garder le contenu si filtre actif
            if (f.rappel === false) {
                if (hintEl) hintEl.remove();
            } else if (hintEl) {
                // Rendre visible et ajouter un titre
                hintEl.style.display = 'block';
                hintEl.classList.add('rappel-print');
                const titleEl = document.createElement('p');
                titleEl.className = 'rappel-print-title';
                titleEl.innerHTML = '<strong>' + escHtml(btn.getAttribute('data-label') || 'Rappel de cours') + '</strong>';
                hintEl.insertBefore(titleEl, hintEl.firstChild);
            }
            btn.remove();
        } else {
            // C'est un indice classique → toujours supprimer
            if (hintEl) hintEl.remove();
            btn.remove();
        }
    });

    // 2. Supprimer les éléments interactifs (toujours)
    clone.querySelectorAll([
        'script', '.reponse-zone', '.hint-locked',
        '.solution-btn', '.diff-badge', '.question-pts',
        '.exo-prereq', '.pour-aller-plus-loin', '.bareme',
        '.terminal-lights', 'svg'
    ].join(',')).forEach(n => n.remove());

    // Supprimer les .hint restants (indices non traités)
    clone.querySelectorAll('.hint:not(.rappel-print)').forEach(n => n.remove());

    // 3. Filtrage conditionnel
    if (f.objectifs === false)
        clone.querySelectorAll('.objectifs').forEach(n => n.remove());
    if (f.ctx === false)
        clone.querySelectorAll('.context-block').forEach(n => n.remove());
    if (f.rappel === false) {
        clone.querySelectorAll('.rappel-cours, .rappel-long').forEach(n => n.remove());
    }
    if (f.exemple === false)
        clone.querySelectorAll('.exemple-guide').forEach(n => n.remove());
    if (f.question === false) {
        clone.querySelectorAll('.question').forEach(n => n.remove());
        clone.querySelectorAll('.solution').forEach(n => n.remove());
    }
    if (f.solution === false)
        clone.querySelectorAll('.solution').forEach(n => n.remove());
    if (f.erreur === false)
        clone.querySelectorAll('.erreur-freq').forEach(n => n.remove());
    if (f.tip === false)
        clone.querySelectorAll('.highlight-box').forEach(n => n.remove());
    if (f.callout === false)
        clone.querySelectorAll('.callout-info, .analogie-block').forEach(n => n.remove());
    if (f.methode === false)
        clone.querySelectorAll('.methode').forEach(n => n.remove());

    // 4. Rendre les solutions visibles
    clone.querySelectorAll('.solution').forEach(sol => {
        sol.style.display = 'block';
        sol.style.maxHeight = 'none';
        sol.style.opacity = '1';
    });

    // 5. Supprimer les boutons restants
    clone.querySelectorAll('button').forEach(n => n.remove());

    return clone.innerHTML;
}

/* ── Palettes de couleurs ──────────────────────────────────────── */
const COLOR_THEMES = {
    neutre: {
        sectionBar:     { bg: '#f5f5f5', border: '#555', color: '#333' },
        exoHeader:      { border: '#888', bg: 'transparent' },
        question:       { border: '#888' },
        solution:       { border: '#888', bg: '#fafafa' },
        erreur:         { border: '#999' },
        highlight:      { border: '#aaa' },
        callout:        { border: '#aaa' },
        methode:        { border: '#aaa' },
        exemple:        { border: '#aaa' },
        rappel:         { border: '#aaa' },
        rappelPrint:    { border: '#aaa', bg: '#fafafa' },
        context:        { border: '#ccc' },
        questionNum:    '#333',
        badge:          { border: '#bbb', color: '#555' },
        stepsNum:       '#555',
        h4:             '#444',
        terminal:       { bg: '#f5f5f5', border: '#ddd' },
        code:           { bg: '#f5f5f5', border: '#ccc' },
    },
    sobre: {
        sectionBar:     { bg: '#faf7f5', border: '#c08050', color: '#7a4a28' },
        exoHeader:      { border: '#c08050', bg: 'transparent' },
        question:       { border: '#d4956a' },
        solution:       { border: '#7aaa7a', bg: '#f8fcf8' },
        erreur:         { border: '#d4a44a' },
        highlight:      { border: '#9a8abf' },
        callout:        { border: '#6aa8b8' },
        methode:        { border: '#6aaa6a' },
        exemple:        { border: '#8a8abf' },
        rappel:         { border: '#6a9ac0' },
        rappelPrint:    { border: '#6a9ac0', bg: '#f5f9fc' },
        context:        { border: '#aab8c8' },
        questionNum:    '#a06030',
        badge:          { border: '#bba888', color: '#6a5540' },
        stepsNum:       '#a06030',
        h4:             '#7a4a28',
        terminal:       { bg: '#f5f5f5', border: '#ddd' },
        code:           { bg: '#f5f5f5', border: '#d5c8bb' },
    },
    couleur: {
        sectionBar:     { bg: '#fff5ee', border: '#f97316', color: '#c2440c' },
        exoHeader:      { border: '#f97316', bg: 'transparent' },
        question:       { border: '#f97316' },
        solution:       { border: '#22c55e', bg: '#f0fdf4' },
        erreur:         { border: '#f59e0b' },
        highlight:      { border: '#8b5cf6' },
        callout:        { border: '#06b6d4' },
        methode:        { border: '#22c55e' },
        exemple:        { border: '#6366f1' },
        rappel:         { border: '#3b82f6' },
        rappelPrint:    { border: '#3b82f6', bg: '#f0f7ff' },
        context:        { border: '#94a3b8' },
        questionNum:    '#f97316',
        badge:          { border: '#f97316', color: '#ea580c' },
        stepsNum:       '#f97316',
        h4:             '#c2440c',
        terminal:       { bg: '#f3f4f6', border: '#e5e7eb' },
        code:           { bg: '#f3f4f6', border: '#d1d5db' },
    }
};

/* ── Assemblage du HTML de la fenêtre d'impression ──────────────── */
function buildPrintHTML(allSections, title, subtitle, colorMode = 'neutre') {
    const today = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    const t = COLOR_THEMES[colorMode] || COLOR_THEMES.neutre;

    const sectionsHtml = allSections.map((section, i) =>
        `<div class="print-section${i > 0 ? ' new-page' : ''}">
            <div class="section-title-bar">▶ ${escHtml(section.title)}</div>
            ${section.html}
        </div>`
    ).join('\n');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escHtml(title)} — Fiche récap</title>
<style>
/* ── Page A4 portrait ────────────────────────────────────────── */
@page {
    size: A4 portrait;
    margin: 15mm 14mm 14mm 14mm;
    @top-right {
        content: "Page " counter(page) " / " counter(pages);
        font-size: 7pt;
        font-family: 'Inter', Arial, sans-serif;
        color: #999;
    }
    @bottom-center {
        content: "${escHtml(title)}";
        font-size: 6.5pt;
        font-family: 'Inter', Arial, sans-serif;
        color: #bbb;
    }
}
@page :first {
    @top-right { content: none; }
    @bottom-center { content: none; }
}
* { box-sizing: border-box; }

body {
    font-family: 'Inter', Arial, Helvetica, sans-serif;
    font-size: 9.5pt;
    line-height: 1.45;
    color: #1a1a1a;
    background: #fff;
    margin: 0; padding: 0;
    orphans: 3;
    widows: 3;
}

/* ── En-tête global ──────────────────────────────────────────── */
.ph {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 2px solid #333;
    padding-bottom: 4mm;
    margin-bottom: 5mm;
}
.ph-left h1 { font-size: 14pt; font-weight: 800; margin: 0 0 1mm; color: #111; }
.ph-left p  { font-size: 9pt; color: #666; margin: 0; }
.ph-date    { font-size: 7.5pt; color: #999; white-space: nowrap; }

/* ── Sections — saut de page ─────────────────────────────────── */
.print-section { break-inside: auto; }
.print-section.new-page {
    break-before: page;
    page-break-before: always;
}
.section-title-bar {
    background: ${t.sectionBar.bg};
    border-left: 4px solid ${t.sectionBar.border};
    border-radius: 2px;
    padding: 2.5mm 4mm;
    margin-bottom: 4mm;
    font-size: 11pt;
    font-weight: 700;
    color: ${t.sectionBar.color};
}

/* ── Reset glassmorphism ─────────────────────────────────────── */
.exo-header, .question, .solution, .solution-inner, .context-block,
.rappel-cours, .rappel-long, .highlight-box, .callout-info,
.erreur-freq, .methode, .exemple-guide, .objectifs,
.sub-question, .table-glass, .terminal, .analogie-block {
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
}

/* ── Exo header ──────────────────────────────────────────────── */
.exo-header {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.exoHeader.border} !important;
    border-radius: 4px;
    padding: 3mm 4mm !important;
    margin-bottom: 4mm !important;
}
.exo-meta {
    display: flex; flex-wrap: wrap; gap: 2mm;
    align-items: center; margin-bottom: 2mm;
}
.exo-points, .exo-time {
    font-size: 8pt; color: #555;
    border: 1px solid #ccc; border-radius: 10px;
    padding: 1px 8px; background: transparent !important;
}
.objectifs { margin-top: 2mm; padding: 0 !important; }
.objectifs strong { color: #333; }
.objectifs ul { margin: 1mm 0 0; padding-left: 5mm; }
.objectifs li { margin-bottom: 0.5mm; }

/* ── Contexte ────────────────────────────────────────────────── */
.context-block {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.context.border} !important;
    border-radius: 4px;
    padding: 3mm 4mm !important;
    margin-bottom: 4mm !important;
}
.context-block h3 { margin-top: 0 !important; color: #333; }

/* ── Questions ───────────────────────────────────────────────── */
.question {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.question.border} !important;
    border-radius: 4px;
    padding: 3mm 4mm !important;
    margin-bottom: 3mm !important;
    break-inside: avoid;
    page-break-inside: avoid;
}
.question-header {
    display: flex; align-items: center; gap: 2mm; margin-bottom: 2mm;
}
.question-num {
    font-weight: 800; color: ${t.questionNum}; font-size: 10pt;
}

/* ── Solutions ───────────────────────────────────────────────── */
.solution {
    border: 1px solid #ccc !important;
    border-left: 3px solid ${t.solution.border} !important;
    border-radius: 4px;
    padding: 3mm 4mm !important;
    margin-bottom: 4mm !important;
    background: ${t.solution.bg} !important;
}
.solution-inner {
    padding: 0 !important; margin: 0 !important; border: none !important;
}
.solution-inner h4 { color: ${t.h4}; margin-top: 0; }

/* ── Erreur fréquente ────────────────────────────────────────── */
.erreur-freq {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.erreur.border} !important;
    border-radius: 4px;
    padding: 2.5mm 4mm !important;
    margin-bottom: 3mm !important;
    font-size: 9pt;
    break-inside: avoid;
}

/* ── Highlight box / Point clé ───────────────────────────────── */
.highlight-box {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.highlight.border} !important;
    border-radius: 4px;
    padding: 2.5mm 4mm !important;
    margin-bottom: 3mm !important;
    break-inside: avoid;
}

/* ── Callout info ────────────────────────────────────────────── */
.callout-info, .analogie-block {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.callout.border} !important;
    border-radius: 4px;
    padding: 2.5mm 4mm !important;
    margin-bottom: 3mm !important;
    break-inside: avoid;
}

/* ── Méthode ─────────────────────────────────────────────────── */
.methode {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.methode.border} !important;
    border-radius: 4px;
    padding: 2.5mm 4mm !important;
    margin-bottom: 3mm !important;
    break-inside: avoid;
}

/* ── Exemple guidé ───────────────────────────────────────────── */
.exemple-guide {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.exemple.border} !important;
    border-radius: 4px;
    padding: 2.5mm 4mm !important;
    margin-bottom: 3mm !important;
    break-inside: avoid;
}

/* ── Rappel de cours (classes .rappel-cours, .rappel-long) ───── */
.rappel-cours, .rappel-long {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.rappel.border} !important;
    border-radius: 4px;
    padding: 2.5mm 4mm !important;
    margin-bottom: 3mm !important;
    break-inside: avoid;
}

/* ── Rappel de cours (depuis les hints transformés) ──────────── */
.rappel-print {
    border: 1px solid #ddd !important;
    border-left: 3px solid ${t.rappelPrint.border} !important;
    background: ${t.rappelPrint.bg} !important;
    border-radius: 4px;
    padding: 2.5mm 4mm !important;
    margin-bottom: 3mm !important;
    break-inside: avoid;
}
.rappel-print-title {
    margin: 0 0 1.5mm !important;
    font-size: 9pt;
    color: ${t.rappelPrint.border};
}

/* ── Deux colonnes ───────────────────────────────────────────── */
.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3mm;
    margin-bottom: 3mm;
}

/* ── Typographie ─────────────────────────────────────────────── */
h2 { font-size: 12pt; font-weight: 800; margin: 0 0 2mm; color: #222; break-after: avoid; page-break-after: avoid; }
h3 { font-size: 10.5pt; font-weight: 700; margin: 3mm 0 2mm; color: #333; break-after: avoid; page-break-after: avoid; }
h4 { font-size: 9.5pt; font-weight: 700; margin: 2mm 0 1mm; color: ${t.h4}; break-after: avoid; page-break-after: avoid; }
p  { margin: 0 0 1.5mm; }
ul, ol { margin: 1mm 0 2mm; padding-left: 5mm; }
li { margin-bottom: 0.5mm; }
strong { font-weight: 700; }
em { font-style: italic; }

/* ── Code ────────────────────────────────────────────────────── */
pre, code {
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    background: ${t.code.bg} !important;
    border-radius: 2px;
    padding: 1px 3px !important;
    color: #1a1a1a;
}
pre {
    display: block;
    padding: 2.5mm 3mm !important;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-wrap: break-word;
    margin: 1.5mm 0 !important;
    border: 1px solid ${t.code.border} !important;
    border-left: 3px solid ${t.code.border} !important;
    border-radius: 3px;
    break-inside: avoid;
    page-break-inside: avoid;
    max-height: 150mm;
    overflow: hidden;
}

/* ── Badges ──────────────────────────────────────────────────── */
.badge {
    border: 1px solid ${t.badge.border};
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 7.5pt;
    font-weight: 600;
    color: ${t.badge.color};
}
.badge-orange, .badge-blue, .badge-green, .badge-red {
    border-color: ${t.badge.border};
    color: ${t.badge.color};
}

/* ── Tableaux ────────────────────────────────────────────────── */
.table-glass {
    border: none !important;
    padding: 0 !important;
    margin: 2mm 0 !important;
}
table {
    border-collapse: collapse; width: 100%;
    font-size: 8.5pt; margin: 1.5mm 0 !important;
    break-inside: avoid; page-break-inside: avoid;
}
th, td { border: 1px solid #ccc; padding: 2px 5px; vertical-align: top; }
th { background: #f0f0f0 !important; font-weight: 700; color: #333; }
tr:nth-child(even) { background: #fafafa !important; }

/* ── Listes numérotées (steps) ───────────────────────────────── */
.steps { list-style: none; padding: 0; counter-reset: sc; margin: 1.5mm 0 !important; }
.steps li { counter-increment: sc; padding-left: 5mm; position: relative; margin-bottom: 1mm; }
.steps li::before { content: counter(sc) "."; position: absolute; left: 0; font-weight: 700; color: ${t.stepsNum}; }

/* ── Terminal ────────────────────────────────────────────────── */
.terminal {
    background: ${t.terminal.bg} !important;
    border: 1px solid ${t.terminal.border} !important;
    border-radius: 3px;
    padding: 2.5mm 3mm !important;
    margin: 1.5mm 0 !important;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
}
.prompt { color: #888; }
.comment { color: #777; font-style: italic; }

/* ── Notes inline ────────────────────────────────────────────── */
.inline-note {
    font-size: 8.5pt; color: #666; font-style: italic;
    border-left: 2px solid #ddd !important;
    padding-left: 3mm !important;
    margin: 1.5mm 0 !important;
}

/* ── Sub-question ────────────────────────────────────────────── */
.sub-question {
    padding: 0 !important;
    margin: 1.5mm 0 !important;
    border: none !important;
}

/* ── Masquer les éléments interactifs restants ────────────────── */
button:not(.print-btn), .reponse-zone, .hint:not(.rappel-print), .hint-btn, .nav-btn,
.diff-badge, .question-pts, .exo-prereq,
.pour-aller-plus-loin, .bareme { display: none !important; }

/* ── Mode écran : simuler la page A4 portrait ────────────────── */
@media screen {
    html {
        background: #6b7280;
        padding: 20px 16px;
        min-height: 100vh;
    }
    body {
        width: 182mm;
        margin: 0 auto;
        padding: 15mm 14mm 14mm 14mm;
        background: #fff;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    .print-controls {
        width: 182mm;
        margin: 0 auto 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .print-hint {
        font-size: 0.75rem;
        color: #999;
        font-style: italic;
    }
    .print-btn {
        padding: 8px 18px;
        font-size: 0.85rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        border-radius: 8px;
        background: #1a1a1a;
        color: #fff;
        border: none;
        transition: background 0.15s;
    }
    .print-btn:hover { background: #333; }
}

/* ── Mode impression ─────────────────────────────────────────── */
@media print {
    .print-controls { display: none; }
}
</style>
</head>
<body>

<div class="print-controls">
    <span class="print-hint">Aperçu — Format A4 portrait</span>
    <button class="print-btn" onclick="window.print()">⎙ Imprimer / Enregistrer en PDF</button>
</div>

<header class="ph">
    <div class="ph-left">
        <h1>${escHtml(title)}</h1>
        ${subtitle ? `<p>${escHtml(subtitle)}</p>` : ''}
    </div>
    <span class="ph-date">${today}</span>
</header>

${sectionsHtml}

</body>
</html>`;
}

/* ── Ouverture de la fenêtre popup ──────────────────────────────── */
function openPrintWindow(html) {
    const win = window.open('', '_blank', 'width=780,height=960,scrollbars=yes');
    if (!win) {
        alert('La popup a été bloquée. Autorisez les popups pour ce site puis réessayez.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

/* ── Utilitaire : échapper le HTML ──────────────────────────────── */
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
