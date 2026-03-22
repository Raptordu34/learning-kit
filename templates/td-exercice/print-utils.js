/* learning-kit/templates/td-exercice/print-utils.js
   Génère une fiche récap A4 paysage imprimable couvrant TOUTES les sections du TD.
   Appelé par le bouton "⎙ Fiche" (id="fiche-btn") dans index.html.
*/

const PRINT_FILTER_KEYS = ['objectifs','ctx','rappel','exemple','question','solution','erreur','tip','callout','methode'];

/* ── Entrée principale (async — fetch de toutes les sections) ──── */
async function generatePrintSheet(filters = {}) {
    // Normaliser : si filters vide (appel direct sans panel), tout inclure
    const f = Object.keys(filters).length
        ? filters
        : Object.fromEntries(PRINT_FILTER_KEYS.map(k => [k, true]));

    const btn = document.getElementById('fiche-btn');

    // Feedback visuel pendant le chargement
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
            const blocks = extractBlocks(doc);
            if (blocks.length) allSections.push({ title, blocks });
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
    openPrintWindow(buildPrintHTML(allSections, title, subtitle, f));
}

/* ── Extraction des blocs depuis le DOM d'une section ─────────── */
function extractBlocks(doc) {
    const blocks = [];

    // Objectifs (extraits séparément — affichés pleine largeur sous le titre de section)
    const hdr = doc.querySelector('.exo-header');
    if (hdr) {
        const objEl = hdr.querySelector('.objectifs');
        if (objEl) {
            const clone = objEl.cloneNode(true);
            clone.querySelectorAll('button, svg').forEach(n => n.remove());
            blocks.push({ type: 'objectifs', html: clone.innerHTML });
        }
    }

    // Contexte
    const ctx = doc.querySelector('.context-block');
    if (ctx) {
        blocks.push({ type: 'ctx', label: 'Contexte', html: cleanElement(ctx) });
    }

    // Rappels de cours
    doc.querySelectorAll('.rappel-cours, .rappel-long').forEach(el => {
        const t = el.querySelector('summary, .rappel-titre, strong')?.textContent?.trim();
        blocks.push({ type: 'rappel', label: t ? 'Rappel — ' + t : 'Rappel de cours', html: cleanElement(el) });
    });

    // Exemples guidés
    doc.querySelectorAll('.exemple-guide').forEach(el => {
        blocks.push({ type: 'exemple', label: 'Exemple guidé', html: cleanElement(el) });
    });

    // Questions (avec leur solution sibling)
    doc.querySelectorAll('.question').forEach(el => {
        const num      = el.querySelector('.question-num')?.textContent?.trim() || '';
        const label    = ['Question', num].filter(Boolean).join(' ');
        const keywords = extractKeywords(el);

        // Nettoyer l'énoncé
        let questionHtml = cleanElement(el);

        // La .solution est un FRÈRE de .question — chercher dans les siblings suivants
        let sib = el.nextElementSibling;
        while (sib) {
            if (sib.classList.contains('solution')) {
                const inner = sib.querySelector('.solution-inner');
                if (inner) {
                    questionHtml += `<div class="pc-sol-wrap">
                        <div class="pc-sol-header">✓ Solution</div>
                        ${inner.innerHTML}
                    </div>`;
                }
                break;
            }
            if (sib.classList.contains('question') || /^H[23]$/.test(sib.tagName)) break;
            sib = sib.nextElementSibling;
        }

        const kwHtml = keywords.length
            ? `<div class="pc-keywords-row"><span class="pc-kw-label">Thèmes :</span>${keywords.map(k => `<span class="pc-kw">${escHtml(k)}</span>`).join('')}</div>`
            : '';

        blocks.push({ type: 'question', label, kwHtml, html: questionHtml });
    });

    // Éléments hors questions (anti-duplication via .closest)
    doc.querySelectorAll('.erreur-freq').forEach(el => {
        if (el.closest('.question')) return;
        blocks.push({ type: 'erreur', label: 'Erreur fréquente', html: cleanElement(el) });
    });
    doc.querySelectorAll('.highlight-box').forEach(el => {
        if (el.closest('.question')) return;
        blocks.push({ type: 'tip', label: 'Point clé', html: cleanElement(el) });
    });
    doc.querySelectorAll('.callout-info').forEach(el => {
        if (el.closest('.question')) return;
        blocks.push({ type: 'callout', label: 'Info', html: cleanElement(el) });
    });
    doc.querySelectorAll('.methode').forEach(el => {
        if (el.closest('.question')) return;
        blocks.push({ type: 'methode', label: 'Méthode', html: cleanElement(el) });
    });
    doc.querySelectorAll('.analogie-block').forEach(el => {
        if (el.closest('.question')) return;
        blocks.push({ type: 'callout', label: 'Analogie', html: cleanElement(el) });
    });

    return blocks;
}

/* ── Nettoyage d'un élément : supprime le bruit interactif ──────── */
function cleanElement(el) {
    const clone = el.cloneNode(true);

    // Supprimer les éléments interactifs et métadonnées non pertinentes
    clone.querySelectorAll([
        'button', '.reponse-zone', '.hint-btn', '.hint-locked',
        '.solution-btn', '.question-pts', '.diff-badge',
        '.exo-prereq', 'svg'
    ].join(',')).forEach(n => n.remove());

    // Supprimer les hints (indices — pas utiles en révision)
    clone.querySelectorAll('.hint').forEach(n => n.remove());

    // Les .solution imbriquées (cas peu fréquent) — unwrap
    clone.querySelectorAll('.solution').forEach(sol => {
        const inner = sol.querySelector('.solution-inner');
        if (inner) {
            const wrap = document.createElement('div');
            wrap.className = 'pc-sol-wrap';
            wrap.innerHTML = '<div class="pc-sol-header">✓ Solution</div>' + inner.innerHTML;
            sol.replaceWith(wrap);
        } else {
            sol.remove();
        }
    });

    return clone.innerHTML;
}

/* ── Assemblage du HTML de la fenêtre d'impression ──────────────── */
function buildPrintHTML(allSections, title, subtitle, f = {}) {
    const today = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const sectionsHtml = allSections.map(section => {
        const objBlock = section.blocks.find(b => b.type === 'objectifs');

        const otherBlocks = section.blocks
            .filter(b => b.type !== 'objectifs')
            .filter(b => {
                if (b.type === 'question') return f.question !== false;
                return f[b.type] !== false;
            })
            .map(b => {
                if (b.type === 'question' && f.solution === false) {
                    const tmp = document.createElement('div');
                    tmp.innerHTML = b.html;
                    tmp.querySelectorAll('.pc-sol-wrap').forEach(n => n.remove());
                    return { ...b, html: tmp.innerHTML };
                }
                return b;
            });

        const objHtml = (objBlock && f.objectifs !== false)
            ? `<div class="pc-objectifs-strip"><strong>Objectifs —</strong> ${objBlock.html}</div>`
            : '';

        const cardsHtml = otherBlocks.map(b =>
            `<div class="pc pc-${b.type}">
                <p class="pc-tag">${escHtml(b.label)}</p>
                ${b.kwHtml || ''}
                ${b.html}
            </div>`
        ).join('\n');

        return `<div class="pc-section-break">▶ ${escHtml(section.title)}</div>
${objHtml}
${cardsHtml}`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escHtml(title)} — Fiche récap</title>
<style>
/* ── Page ───────────────────────────────────────────────────── */
@page { size: A4 portrait; margin: 10mm 12mm; }
* { box-sizing: border-box; }

body {
    font-family: 'Inter', Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    line-height: 1.45;
    color: #1a1a1a;
    background: #fff;
    margin: 0; padding: 0;
}

/* ── En-tête global (hors colonnes) ───────────────────────── */
.ph {
    column-span: all;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 2.5px solid #1a1a1a;
    padding-bottom: 3mm;
    margin-bottom: 0;
}
.ph-left h1 { font-size: 13pt; font-weight: 800; margin: 0 0 0.5mm; }
.ph-left p  { font-size: 8pt; color: #555; margin: 0; }
.ph-date    { font-size: 7pt; color: #999; white-space: nowrap; }

/* ── Zone 3 colonnes ───────────────────────────────────────── */
.print-wrap {
    columns: 2;
    column-gap: 8mm;
    column-fill: balance;
}

/* ── Séparateur de section (pleine largeur) ─────────────────── */
.pc-section-break {
    column-span: all;
    background: #fff5ee !important;
    border-left: 4px solid #f97316;
    border-radius: 3px;
    padding: 2mm 4mm;
    margin: 5mm 0 1.5mm;
    font-size: 9pt;
    font-weight: 700;
    color: #c2440c;
    break-inside: avoid;
}

/* ── Objectifs pleine largeur (compact) ─────────────────────── */
.pc-objectifs-strip {
    column-span: all;
    font-size: 7.5pt;
    color: #374151;
    border-left: 2.5px solid #0d9488;
    padding: 1.5mm 3mm;
    margin-bottom: 3mm;
    background: #f0fdfb !important;
    border-radius: 0 3px 3px 0;
    break-inside: avoid;
    page-break-inside: avoid;
}
.pc-objectifs-strip strong { color: #0d9488; margin-right: 2mm; }
.pc-objectifs-strip ul { margin: 1mm 0 0; padding-left: 4mm; }
.pc-objectifs-strip li { margin-bottom: 0.3mm; }

/* ── Carte générique ────────────────────────────────────────── */
.pc {
    break-inside: avoid;
    page-break-inside: avoid;
    -webkit-column-break-inside: avoid;
    margin-bottom: 3.5mm;
    padding: 2.5mm 3.5mm;
    border-radius: 3px;
}

/* Bordures colorées par type */
.pc-ctx      { border-left: 2.5px solid #6b7280; }
.pc-rappel   { border-left: 2.5px solid #3b82f6; background: #f8fbff !important; }
.pc-exemple  { border-left: 2.5px solid #6366f1; }
.pc-question { border-left: 3px solid #f97316; }
.pc-erreur   { border-left: 2.5px solid #f59e0b; background: #fffdf0 !important; }
.pc-tip      { border-left: 2.5px solid #8b5cf6; }
.pc-callout  { border-left: 2.5px solid #06b6d4; }
.pc-methode  { border-left: 2.5px solid #22c55e; background: #f6fef8 !important; }

/* Étiquette de type */
.pc-tag {
    font-size: 6.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #9ca3af;
    margin: 0 0 1.5mm;
}

/* ── Solution ───────────────────────────────────────────────── */
.pc-sol-wrap {
    margin-top: 3mm;
    border-top: 1px solid #e5e7eb;
    padding-top: 2mm;
}
.pc-sol-header {
    display: inline-block;
    font-size: 7pt;
    font-weight: 700;
    color: #fff;
    background: #22c55e !important;
    padding: 1px 7px;
    border-radius: 8px;
    margin-bottom: 2mm;
    letter-spacing: 0.5px;
}

/* ── Mots-clés / thèmes ─────────────────────────────────────── */
.pc-keywords-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5mm;
    margin-bottom: 2.5mm;
    padding: 1.5mm 2.5mm;
    background: #fff8f3 !important;
    border-radius: 3px;
    border: 1px solid #fde8d8;
}
.pc-kw-label {
    font-size: 7pt;
    font-weight: 700;
    color: #c2622a;
    margin-right: 1mm;
    white-space: nowrap;
}
.pc-kw {
    font-size: 7.5pt;
    font-family: 'Courier New', monospace;
    font-weight: 600;
    padding: 1px 5px;
    border: 1px solid #f4a778;
    border-radius: 8px;
    color: #b85c24;
    background: #fff !important;
    white-space: nowrap;
}

/* ── Reset glassmorphism ────────────────────────────────────── */
.exo-header, .question, .solution-inner, .context-block,
.rappel-cours, .rappel-long, .highlight-box, .callout-info,
.erreur-freq, .methode, .exemple-guide, .objectifs,
.sub-question, .table-glass, .terminal, .pour-aller-plus-loin,
.analogie-block, .pc-sol-wrap {
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 0 1.5mm !important;
}

/* ── Typographie ────────────────────────────────────────────── */
h2 { font-size: 10pt; font-weight: 800; margin: 0 0 1.5mm; }
h3 { font-size: 9pt;  font-weight: 700; margin: 2mm 0 1mm; }
h4 { font-size: 8pt;  font-weight: 700; margin: 1.5mm 0 0.75mm; color: #b85c24; }
p  { margin: 0 0 1mm; }
ul, ol { margin: 1mm 0; padding-left: 4mm; }
li { margin-bottom: 0.5mm; }
strong { font-weight: 700; }
em { font-style: italic; }

pre, code {
    font-family: 'Courier New', monospace;
    font-size: 7.5pt;
    background: #f3f4f6 !important;
    border-radius: 2px;
    padding: 1px 3px !important;
}
pre {
    display: block;
    padding: 2mm !important;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 1.5mm 0 !important;
    border-left: 2px solid #e5e7eb !important;
}

.question-num { font-weight: 800; color: #f97316; margin-right: 1.5mm; }

.badge { border: 1px solid #ddd; padding: 1px 4px; border-radius: 8px; font-size: 7pt; font-weight: 600; }
.badge-orange { border-color: #f97316; color: #f97316; }
.badge-blue   { border-color: #3b82f6; color: #3b82f6; }
.badge-green  { border-color: #22c55e; color: #22c55e; }
.badge-red    { border-color: #ef4444; color: #ef4444; }

.exo-meta { display: flex; flex-wrap: wrap; gap: 3mm; align-items: center; margin-bottom: 2mm !important; }

table { border-collapse: collapse; width: 100%; font-size: 7.5pt; margin: 1.5mm 0 !important; }
th, td { border: 1px solid #d1d5db; padding: 1px 3px; vertical-align: top; }
th { background: #f3f4f6 !important; font-weight: 700; }
tr:nth-child(even) { background: #fafafa !important; }

.steps { list-style: none; padding: 0; counter-reset: sc; margin: 1mm 0 !important; }
.steps li { counter-increment: sc; padding-left: 4mm; position: relative; }
.steps li::before { content: counter(sc) "."; position: absolute; left: 0; font-weight: 700; color: #f97316; }

.two-col { columns: 2; column-gap: 3mm; }

.terminal { background: #f3f4f6 !important; border-radius: 3px; padding: 2mm !important; margin: 1.5mm 0 !important; overflow-x: hidden; }
.terminal-lights { display: none; }
.prompt { color: #9ca3af; }
.comment { color: #6b7280; font-style: italic; }

.inline-note { font-size: 7.5pt; color: #6b7280; font-style: italic; border-left: 2px solid #e5e7eb !important; padding-left: 2mm !important; margin: 1mm 0 !important; }

/* Masquer les éléments interactifs du TD (hors bouton d'impression) */
button:not(.print-btn), .reponse-zone, .hint, .hint-btn, .nav-btn,
.diff-badge, .question-pts, .exo-prereq, .pour-aller-plus-loin { display: none !important; }

/* ── Mode écran : simuler la page A4 portrait ───────────────── */
@media screen {
    html {
        background: #6b7280;
        padding: 20px 16px;
        min-height: 100vh;
        box-sizing: border-box;
    }
    body {
        width: 186mm;
        margin: 0 auto;
        padding: 10mm 12mm;
        background: #fff;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    .print-controls {
        width: 186mm;
        margin: 0 auto 12px;
        display: flex;
        justify-content: flex-end;
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

/* ── Mode impression ───────────────────────────────────────── */
@media print {
    .print-controls { display: none; }
    .print-wrap { column-fill: auto; }
}
</style>
</head>
<body>

<div class="print-controls">
    <button class="print-btn" onclick="window.print()">⎙ Imprimer / Enregistrer en PDF</button>
</div>

<div class="print-wrap">
<header class="ph">
    <div class="ph-left">
        <h1>${escHtml(title)}</h1>
        ${subtitle ? `<p>${escHtml(subtitle)}</p>` : ''}
    </div>
    <span class="ph-date">Fiche récap · ${today}</span>
</header>
${sectionsHtml}
</div>

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

/* ── Extraction des mots-clés d'une question ────────────────────── */
function extractKeywords(questionEl) {
    const keywords = new Set();

    // Termes <code> dans les paragraphes de l'énoncé (hors hints/solutions)
    questionEl.querySelectorAll('p, .sub-question p').forEach(p => {
        if (p.closest('.hint') || p.closest('.solution')) return;
        p.querySelectorAll('code').forEach(c => {
            const text = c.textContent.trim();
            if (text.length >= 2 && text.length <= 32 && !text.includes('\n')) keywords.add(text);
        });
    });

    // Badges explicites dans l'énoncé (hors hints/solutions)
    questionEl.querySelectorAll('.badge').forEach(b => {
        if (b.closest('.hint') || b.closest('.solution')) return;
        const text = b.textContent.trim();
        if (text) keywords.add(text);
    });

    return [...keywords].slice(0, 8);
}

/* ── Utilitaire : échapper le HTML ──────────────────────────────── */
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
