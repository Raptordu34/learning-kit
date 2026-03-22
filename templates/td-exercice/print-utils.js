/* learning-kit/templates/td-exercice/print-utils.js
   Génère une fiche récap A4 paysage imprimable à partir de l'exercice courant.
   Appelé par le bouton "⎙ Fiche" dans index.html.
*/

/* ── Entrée principale ─────────────────────────────────────────── */
function generatePrintSheet() {
    const frame = document.getElementById('content-frame');
    let doc;
    try { doc = frame.contentDocument || frame.contentWindow.document; } catch (e) { doc = null; }

    if (!doc || !doc.body || !doc.body.innerHTML.trim()) {
        alert('Chargez un exercice d\'abord avant de générer la fiche.');
        return;
    }

    const blocks  = extractBlocks(doc);
    const title   = document.querySelector('.sidebar-header h1')?.textContent?.trim() || 'Fiche récap';
    const html    = buildPrintHTML(blocks, title);
    openPrintWindow(html);
}

/* ── Extraction des blocs depuis le DOM de l'iframe ───────────── */
function extractBlocks(doc) {
    const blocks = [];

    // 1. Header (pleine largeur)
    const hdr = doc.querySelector('.exo-header');
    if (hdr) {
        blocks.push({ type: 'header', html: cleanElement(hdr) });
    }

    // 2. Contexte
    const ctx = doc.querySelector('.context-block');
    if (ctx) {
        blocks.push({ type: 'ctx', label: 'Contexte', html: cleanElement(ctx) });
    }

    // 3. Rappels de cours
    doc.querySelectorAll('.rappel-cours, .rappel-long').forEach(el => {
        const title = el.querySelector('summary, .rappel-titre, strong')?.textContent?.trim();
        blocks.push({ type: 'rappel', label: 'Rappel de cours' + (title ? ' — ' + title : ''), html: cleanElement(el) });
    });

    // 4. Exemples guidés
    doc.querySelectorAll('.exemple-guide').forEach(el => {
        blocks.push({ type: 'exemple', label: 'Exemple guidé', html: cleanElement(el) });
    });

    // 5. Questions (avec leurs solutions intégrées)
    doc.querySelectorAll('.question').forEach(el => {
        const num   = el.querySelector('.question-num')?.textContent?.trim() || '';
        const label = ['Question', num].filter(Boolean).join(' ');
        const keywords = extractKeywords(el);

        // La .solution est un FRÈRE de .question (pas un enfant) — chercher dans les siblings suivants
        let questionHtml = cleanElement(el);
        let sib = el.nextElementSibling;
        while (sib) {
            if (sib.classList.contains('solution')) {
                const inner = sib.querySelector('.solution-inner');
                if (inner) {
                    questionHtml += `<div class="pc-sol-wrap">
                        <p class="pc-sol-label">— Solution —</p>
                        ${inner.innerHTML}
                    </div>`;
                }
                break;
            }
            // Arrêter si on rencontre une autre question ou un titre de section
            if (sib.classList.contains('question') || /^H[23]$/.test(sib.tagName)) break;
            sib = sib.nextElementSibling;
        }

        const kwHtml = keywords.length
            ? `<div class="pc-keywords-row"><span class="pc-kw-label">Thèmes :</span>${keywords.map(k => `<span class="pc-kw">${escHtml(k)}</span>`).join('')}</div>`
            : '';

        blocks.push({ type: 'question', label, kwHtml, html: questionHtml });
    });

    // 6–9. Éléments hors questions (anti-duplication via .closest)
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

    // 10. Barème
    const bareme = doc.querySelector('.bareme');
    if (bareme) {
        blocks.push({ type: 'bareme', label: 'Barème', html: cleanElement(bareme) });
    }

    return blocks;
}

/* ── Nettoyage d'un élément : supprime le bruit interactif ──────── */
function cleanElement(el) {
    const clone = el.cloneNode(true);

    // Supprimer les éléments interactifs et les métadonnées non voulues
    clone.querySelectorAll('button, .reponse-zone, .hint-btn, .hint-locked, .solution-btn, .question-pts, .diff-badge').forEach(n => n.remove());

    // Supprimer les hints (pas utiles en révision rapide)
    clone.querySelectorAll('.hint').forEach(n => n.remove());

    // Dévoiler les solutions : remplacer .solution > .solution-inner par son contenu
    clone.querySelectorAll('.solution').forEach(sol => {
        const inner = sol.querySelector('.solution-inner');
        if (inner) {
            const wrap = document.createElement('div');
            wrap.className = 'pc-sol-wrap';
            wrap.innerHTML = '<p class="pc-sol-label">— Solution —</p>' + inner.innerHTML;
            sol.replaceWith(wrap);
        } else {
            sol.remove();
        }
    });

    // Supprimer les icônes animées (::before content reste, SVG inline supprimé)
    clone.querySelectorAll('svg').forEach(n => n.remove());

    return clone.innerHTML;
}

/* ── Assemblage du HTML de la fenêtre d'impression ──────────────── */
function buildPrintHTML(blocks, title) {
    const cards = blocks.map(b => {
        if (b.type === 'header') {
            return `<div class="pc pc-header">${b.html}</div>`;
        }
        return `<div class="pc pc-${b.type}">
            <p class="pc-tag">${escHtml(b.label)}</p>
            ${b.kwHtml || ''}
            ${b.html}
        </div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escHtml(title)} — Fiche récap</title>
<style>
/* ── Page ───────────────────────────────────────────────────────── */
@page { size: A4 landscape; margin: 10mm 12mm; }

* { box-sizing: border-box; }

body {
    font-family: 'Inter', Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    line-height: 1.45;
    color: #1a1a1a;
    background: #ffffff;
    margin: 0;
    padding: 0;
}

/* ── Layout colonnes ────────────────────────────────────────────── */
.print-wrap {
    columns: 3;
    column-gap: 7mm;
    column-fill: balance;
}

/* ── Carte générique ────────────────────────────────────────────── */
.pc {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 4mm;
    padding: 3mm 4mm;
    border-radius: 3px;
}

/* Header pleine largeur */
.pc-header {
    column-span: all;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 3mm;
    margin-bottom: 5mm;
}

/* Couleurs des bordures gauches */
.pc-ctx      { border-left: 2.5px solid #6b7280; }
.pc-rappel   { border-left: 2.5px solid #3b82f6; }
.pc-exemple  { border-left: 2.5px solid #6366f1; }
.pc-question { border-left: 2.5px solid #f97316; }
.pc-erreur   { border-left: 2.5px solid #f59e0b; background: #fffdf0 !important; }
.pc-tip      { border-left: 2.5px solid #8b5cf6; }
.pc-callout  { border-left: 2.5px solid #06b6d4; }
.pc-methode  { border-left: 2.5px solid #22c55e; }
.pc-bareme   { border-left: 2.5px solid #6b7280; }

/* Étiquette de type */
.pc-tag {
    font-size: 6.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #888;
    margin: 0 0 2mm 0;
}

/* Séparateur solution */
.pc-sol-wrap { margin-top: 2mm; }
.pc-sol-label {
    font-size: 7pt;
    font-weight: 700;
    color: #22c55e;
    margin: 2mm 0 1mm;
    border-top: 1px dashed #ccc;
    padding-top: 2mm;
}

/* ── Reset des effets glassmorphism ─────────────────────────────── */
.exo-header, .question, .solution-inner, .context-block,
.rappel-cours, .rappel-long, .highlight-box, .callout-info,
.erreur-freq, .methode, .bareme, .exemple-guide, .objectifs,
.sub-question, .table-glass, .terminal, .pour-aller-plus-loin,
.analogy-block, .analogie-block, .pc-sol-wrap {
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 0 1.5mm !important;
}

/* ── Contenu typographique ──────────────────────────────────────── */
h2 { font-size: 11pt; font-weight: 800; margin: 0 0 1.5mm; }
h3 { font-size: 9.5pt; font-weight: 700; margin: 2mm 0 1mm; }
h4 { font-size: 8.5pt; font-weight: 700; margin: 1.5mm 0 0.75mm; color: #d67556; }
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
    overflow-x: hidden;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 1.5mm 0 !important;
    border-left: 2px solid #e5e7eb !important;
}

/* Badges difficulté */
.diff-badge {
    border: 1px solid currentColor;
    padding: 1px 5px;
    border-radius: 10px;
    font-size: 7pt;
    font-weight: 700;
}
.diff-fondamental { color: #059669; }
.diff-moyen       { color: #d67556; }
.diff-avance      { color: #dc2626; }

/* Badges génériques */
.badge {
    border: 1px solid #ddd;
    padding: 1px 5px;
    border-radius: 10px;
    font-size: 7pt;
    font-weight: 600;
}
.badge-orange { border-color: #f97316; color: #f97316; }
.badge-blue   { border-color: #3b82f6; color: #3b82f6; }
.badge-green  { border-color: #22c55e; color: #22c55e; }
.badge-red    { border-color: #ef4444; color: #ef4444; }

/* Méta exercice */
.exo-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 3mm;
    align-items: center;
    margin-bottom: 2mm !important;
}
.exo-points, .exo-time {
    font-size: 7.5pt;
    color: #4b5563;
}
.exo-prereq { font-size: 7pt; color: #9ca3af; font-style: italic; }

/* Objectifs */
.objectifs {
    border-left: 2px solid #0d9488 !important;
    padding-left: 3mm !important;
    margin-top: 2mm !important;
}
.objectifs strong { color: #0d9488; }
.objectifs ul { margin: 0.5mm 0; }

/* Numéro de question */
.question-num  { font-weight: 800; color: #f97316; margin-right: 1.5mm; }

/* Mots-clés / thèmes associés à la question */
.pc-keywords-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5mm;
    margin-bottom: 2.5mm;
    padding: 2mm 3mm;
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
    background: #ffffff !important;
    white-space: nowrap;
}

/* Tableaux */
table { border-collapse: collapse; width: 100%; font-size: 7.5pt; margin: 1.5mm 0 !important; }
th, td { border: 1px solid #d1d5db; padding: 1px 3px; vertical-align: top; }
th { background: #f3f4f6 !important; font-weight: 700; }
tr:nth-child(even) { background: #fafafa !important; }

/* Steps (listes ordonnées custom) */
.steps { list-style: none; padding: 0; counter-reset: step-counter; margin: 1mm 0 !important; }
.steps li { counter-increment: step-counter; padding-left: 4mm; position: relative; }
.steps li::before {
    content: counter(step-counter) ".";
    position: absolute; left: 0;
    font-weight: 700; color: #f97316; font-size: 7.5pt;
}

/* Two-col dans les cards */
.two-col { columns: 2; column-gap: 3mm; }

/* Terminal (affichage simplifié) */
.terminal { background: #f3f4f6 !important; border-radius: 3px; padding: 2mm !important; margin: 1.5mm 0 !important; }
.terminal::before { content: '$ '; color: #9ca3af; font-size: 7pt; }
.terminal-lights { display: none; }

/* Barème */
.bareme { display: grid; grid-template-columns: auto 1fr auto; gap: 0.5mm 2mm; font-size: 7.5pt; }
.bareme-header { font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 1mm; margin-bottom: 1mm; }
.bareme-total { grid-column: 1 / -1; font-weight: 700; border-top: 1px solid #e5e7eb; padding-top: 1mm; text-align: right; margin-top: 1mm; }

/* Éléments à masquer complètement */
.nav-btn, .toolbar, .floating-btn,
.reponse-zone, .hint, .hint-btn, button { display: none !important; }
</style>
</head>
<body>
<div class="print-wrap">
${cards}
</div>
<script>
    // Déclencher l'impression après chargement complet
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</body>
</html>`;
}

/* ── Ouverture de la fenêtre popup ──────────────────────────────── */
function openPrintWindow(html) {
    const win = window.open('', '_blank', 'width=1200,height=860,scrollbars=yes');
    if (!win) {
        alert('La popup a été bloquée. Autorisez les popups pour ce site.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

/* ── Extraction des mots-clés d'une question ────────────────────── */
function extractKeywords(questionEl) {
    const keywords = new Set();

    // Termes <code> dans les paragraphes de la question (pas dans hints/solutions)
    questionEl.querySelectorAll('p').forEach(p => {
        // Ignorer les paragraphes imbriqués dans .hint ou .solution
        if (p.closest('.hint') || p.closest('.solution')) return;
        p.querySelectorAll('code').forEach(c => {
            const text = c.textContent.trim();
            // Garder uniquement les termes courts et significatifs
            if (text.length >= 2 && text.length <= 32 && !text.includes('\n')) {
                keywords.add(text);
            }
        });
    });

    // Badges explicites dans la question (hors hints/solutions)
    questionEl.querySelectorAll('.badge').forEach(b => {
        if (b.closest('.hint') || b.closest('.solution')) return;
        const text = b.textContent.trim();
        if (text) keywords.add(text);
    });

    // Termes <code> dans l'énoncé direct (div.question > p > code)
    // Déjà couverts ci-dessus, mais aussi chercher dans les sous-questions
    questionEl.querySelectorAll('.sub-question p code').forEach(c => {
        const text = c.textContent.trim();
        if (text.length >= 2 && text.length <= 32 && !text.includes('\n')) {
            keywords.add(text);
        }
    });

    return [...keywords].slice(0, 8); // max 8 mots-clés
}

/* ── Utilitaire : échapper le HTML dans les attributs ──────────── */
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
