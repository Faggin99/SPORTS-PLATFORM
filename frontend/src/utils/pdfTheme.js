// Tema centralizado para todos os PDFs do TactiPlan.
// Inspirado no relatório do C.I.U / Uberlândia E.C. — Série D 2026:
//   - Headers em "pill" verde com texto branco bold
//   - Title strip horizontal: pill da seção à esquerda + nome do clube à direita
//   - Footer bar verde com brand
//   - KPI panels grandes em duas colunas (label + número)
//   - Tabelas com header verde, alternância sutil de linhas
//   - Tudo em LANDSCAPE pra aproveitar espaço

// PALETA DOS PDFs.
// `primary` por padrão segue a cor do site (#1d4ed8 = primaryHover do tema).
// No futuro será sobrescrita por clube (clubs.primary_color). Pra isso cada
// gerador aceita opts.primaryColor e atualiza esse map antes de desenhar.
export const PDF_THEME = {
  colors: {
    primary:      '#1d4ed8',         // azul TactiPlan
    primaryDark:  '#1e3a8a',         // hover/borda
    accent:       '#dbeafe',         // azul claro pra contrastes em fundo escuro (footer/cover)
    text:         '#0f172a',
    textMuted:    '#475569',
    border:       '#cbd5e1',
    surface:      '#f1f5f9',
    surfaceAlt:   '#e2e8f0',
    panelGray:    '#e8e8e8',
    light:        '#ffffff',
    headerBg:     '#1d4ed8',
    headerText:   '#ffffff',
    win:          '#22c55e',
    draw:         '#f59e0b',
    loss:         '#ef4444',
  },
  fonts: {
    family: 'helvetica',
  },
  sizes: {
    titleBig:    20,
    title:       16,
    sectionTitle:13,
    subtitle:    11,
    body:        10,
    small:       8.5,
    tiny:        7,
    kpiNumber:   28,
  },
  // Em LANDSCAPE (A4 297×210) damos margens maiores horizontalmente
  margins: {
    top:    10,
    right:  12,
    bottom: 14,
    left:   12,
  },
  brand:       'TactiPlan',
  pageFormat:  'a4',
  orientation: 'landscape',
};

// Sobrescreve a cor primária do tema (e derivadas) por uma cor de clube.
// Chamar no início de cada gerador de PDF — passar `null` pra resetar pro
// padrão. Salva a cor original e devolve um reset() pra restaurar.
//
//   const reset = applyClubPrimaryColor('#e11d48');  // exemplo: vermelho-Inter
//   ... gera o PDF ...
//   reset();
//
// Como apenas um PDF é gerado por vez no mesmo tab, mutar o tema global é
// aceitável e bem mais simples que threadar uma config por toda chamada.
let defaultPrimary = null;
let defaultPrimaryDark = null;
let defaultHeaderBg = null;
let defaultAccent = null;

export function applyClubPrimaryColor(hex) {
  if (!defaultPrimary) {
    defaultPrimary = PDF_THEME.colors.primary;
    defaultPrimaryDark = PDF_THEME.colors.primaryDark;
    defaultHeaderBg = PDF_THEME.colors.headerBg;
    defaultAccent = PDF_THEME.colors.accent;
  }
  if (!hex) {
    PDF_THEME.colors.primary = defaultPrimary;
    PDF_THEME.colors.primaryDark = defaultPrimaryDark;
    PDF_THEME.colors.headerBg = defaultHeaderBg;
    PDF_THEME.colors.accent = defaultAccent;
    return () => {};
  }
  PDF_THEME.colors.primary = hex;
  PDF_THEME.colors.headerBg = hex;
  PDF_THEME.colors.primaryDark = darkenHex(hex, 0.25);
  PDF_THEME.colors.accent = lightenHex(hex, 0.6);
  return () => {
    PDF_THEME.colors.primary = defaultPrimary;
    PDF_THEME.colors.primaryDark = defaultPrimaryDark;
    PDF_THEME.colors.headerBg = defaultHeaderBg;
    PDF_THEME.colors.accent = defaultAccent;
  };
}

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function darkenHex(hex, ratio) {
  const [r, g, b] = hexToRgb(hex);
  return '#' + [r * (1 - ratio), g * (1 - ratio), b * (1 - ratio)]
    .map((x) => clamp(x).toString(16).padStart(2, '0')).join('');
}
function lightenHex(hex, ratio) {
  const [r, g, b] = hexToRgb(hex);
  return '#' + [r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio]
    .map((x) => clamp(x).toString(16).padStart(2, '0')).join('');
}

// ----- conversões / setters de cor (HEX → jsPDF) ------
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
export function setFillHex(doc, hex) { const [r, g, b] = hexToRgb(hex); doc.setFillColor(r, g, b); }
export function setTextHex(doc, hex) { const [r, g, b] = hexToRgb(hex); doc.setTextColor(r, g, b); }
export function setDrawHex(doc, hex) { const [r, g, b] = hexToRgb(hex); doc.setDrawColor(r, g, b); }

// ----- PRIMITIVAS VISUAIS -----

/**
 * Pill verde com texto branco bold dentro. Usado pros títulos de seção
 * grandes ("DESEMPENHO SÉRIE D", "GOLS PRÓ E CONTRA", etc).
 */
export function drawPill(doc, { x, y, w, h, text, bg, fg, align = 'center', fontSize = 13 }) {
  setFillHex(doc, bg || PDF_THEME.colors.primary);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(fontSize);
  setTextHex(doc, fg || PDF_THEME.colors.light);
  const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - 4 : x + 4;
  const ty = y + h / 2 + fontSize / 4;
  doc.text((text || '').toUpperCase(), tx, ty, { align });
}

/**
 * Title strip do topo da página: pill verde grande (esquerda) + pill cinza com
 * nome do clube (direita). É o "cabeçalho" reconhecível do estilo U.E.C.
 *   ┌──────────────────┐ ┌──────────────────┐
 *   │ DESEMPENHO SÉRIE D│ │   Uberlândia E.C  │
 *   └──────────────────┘ └──────────────────┘
 */
export function addTitleStrip(doc, { section, clubName }) {
  const pageW = doc.internal.pageSize.getWidth();
  const M = PDF_THEME.margins;
  const stripY = M.top;
  const stripH = 13;
  const gap = 3;
  const totalW = pageW - M.left - M.right;
  const leftW  = totalW * 0.5 - gap / 2;
  const rightW = totalW * 0.5 - gap / 2;

  // Pill esquerda: seção (verde)
  drawPill(doc, {
    x: M.left, y: stripY, w: leftW, h: stripH,
    text: section,
    fontSize: 14,
  });

  // Pill direita: nome do clube (fundo branco, borda verde, texto verde)
  setFillHex(doc, PDF_THEME.colors.light);
  setDrawHex(doc, PDF_THEME.colors.primary);
  doc.setLineWidth(0.6);
  doc.roundedRect(M.left + leftW + gap, stripY, rightW, stripH, 1.5, 1.5, 'FD');
  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(14);
  setTextHex(doc, PDF_THEME.colors.primary);
  doc.text((clubName || '').toString(), M.left + leftW + gap + rightW / 2, stripY + stripH / 2 + 3, { align: 'center' });

  return stripY + stripH + 5;
}

/**
 * Footer bar verde no rodapé da página: brand à esquerda, página à direita.
 */
export function addFooterBar(doc, { pageNum, totalPages, brand } = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = PDF_THEME.margins;
  const barH = 7;
  const barY = pageH - M.bottom + 2;

  setFillHex(doc, PDF_THEME.colors.primary);
  doc.rect(M.left, barY, pageW - M.left - M.right, barH, 'F');

  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(8);
  setTextHex(doc, PDF_THEME.colors.light);
  doc.text((brand || PDF_THEME.brand).toUpperCase(), M.left + 4, barY + 4.5);

  doc.setFont(PDF_THEME.fonts.family, 'normal');
  doc.setFontSize(7.5);
  setTextHex(doc, PDF_THEME.colors.accent);
  const now = new Date();
  const stamp = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const right = pageNum && totalPages
    ? `pg ${pageNum}/${totalPages}  ·  ${stamp}`
    : stamp;
  doc.text(right, pageW - M.right - 4, barY + 4.5, { align: 'right' });
}

/**
 * Aplica o footer em todas as páginas (chamar antes de save).
 */
export function paginate(doc) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooterBar(doc, { pageNum: i, totalPages: total });
  }
}

/**
 * Header sub-seção: pill verde menor, alinhado à esquerda, sem fundo na parte
 * direita. Usar como "label" de uma subsection (ex.: "ÚLTIMOS JOGOS DISPUTADOS").
 */
export function addSubsectionPill(doc, text, y, { width } = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  const M = PDF_THEME.margins;
  const w = width || (pageW - M.left - M.right);
  drawPill(doc, {
    x: M.left, y, w, h: 9,
    text,
    fontSize: 11,
  });
  return y + 12;
}

/**
 * KPI panel grande no estilo U.E.C.:
 *   ┌────────────────┬──────┐
 *   │ PONTOS GANHOS  │  18  │
 *   │                │      │
 *   └────────────────┴──────┘
 * Label em cinza claro à esquerda, número grande à direita.
 */
export function drawKpiPanel(doc, { x, y, w, h, label, value, valueColor }) {
  const labelW = w * 0.62;
  const valueW = w - labelW;

  // Coluna do label (cinza claro)
  setFillHex(doc, PDF_THEME.colors.panelGray);
  setDrawHex(doc, PDF_THEME.colors.primary);
  doc.setLineWidth(0.4);
  doc.rect(x, y, labelW, h, 'FD');

  // Coluna do valor (fundo branco com borda verde)
  setFillHex(doc, PDF_THEME.colors.light);
  doc.rect(x + labelW, y, valueW, h, 'FD');

  // Label (uppercase, multilinha se precisar)
  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(9);
  setTextHex(doc, PDF_THEME.colors.primary);
  const lines = String(label || '').toUpperCase().split('\n');
  const labelLineH = 4;
  const labelStartY = y + h / 2 - ((lines.length - 1) * labelLineH) / 2 + 1;
  lines.forEach((ln, i) => {
    doc.text(ln, x + 3, labelStartY + i * labelLineH);
  });

  // Valor
  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(Math.max(14, Math.min(h * 0.6, 22)));
  setTextHex(doc, valueColor || PDF_THEME.colors.text);
  const valTxt = String(value);
  const tw = doc.getTextWidth(valTxt);
  doc.text(valTxt, x + labelW + (valueW - tw) / 2, y + h / 2 + h * 0.16);
}

/**
 * Mini-KPI quadrado: um único bloco com label em cima e número grande embaixo.
 * Usar pra dashboards mais densos.
 */
export function drawMiniKpi(doc, { x, y, w, h, label, value, valueColor, bg }) {
  setFillHex(doc, bg || PDF_THEME.colors.surface);
  setDrawHex(doc, PDF_THEME.colors.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 1.2, 1.2, 'FD');
  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(7);
  setTextHex(doc, PDF_THEME.colors.textMuted);
  doc.text(String(label || '').toUpperCase(), x + 3, y + 5);
  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(Math.max(12, Math.min(h * 0.55, 18)));
  setTextHex(doc, valueColor || PDF_THEME.colors.text);
  doc.text(String(value), x + 3, y + h - 3);
}

/**
 * Capa: title grande centralizado, espaço pra subtítulo, footer bar.
 */
export function drawCover(doc, { title, subtitle, clubName, periodLabel }) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Faixa verde superior cheia (estilo banner)
  setFillHex(doc, PDF_THEME.colors.primary);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(22);
  setTextHex(doc, PDF_THEME.colors.accent);
  doc.text((title || '').toUpperCase(), pageW / 2, 19, { align: 'center' });

  // Centro: nome do clube grande
  doc.setFont(PDF_THEME.fonts.family, 'bold');
  doc.setFontSize(38);
  setTextHex(doc, PDF_THEME.colors.primary);
  doc.text(clubName || '', pageW / 2, pageH / 2 - 6, { align: 'center' });

  if (subtitle) {
    doc.setFont(PDF_THEME.fonts.family, 'normal');
    doc.setFontSize(14);
    setTextHex(doc, PDF_THEME.colors.textMuted);
    doc.text(subtitle, pageW / 2, pageH / 2 + 6, { align: 'center' });
  }

  if (periodLabel) {
    doc.setFont(PDF_THEME.fonts.family, 'bold');
    doc.setFontSize(11);
    setTextHex(doc, PDF_THEME.colors.primary);
    doc.text(periodLabel, pageW / 2, pageH / 2 + 18, { align: 'center' });
  }
}

// ----- Defaults pra autoTable -----
export const AUTOTABLE_DEFAULTS = {
  theme: 'plain',
  headStyles: {
    fillColor: hexToRgb(PDF_THEME.colors.headerBg),
    textColor: 255,
    fontStyle: 'bold',
    fontSize: 10,
    halign: 'left',
    cellPadding: 2.5,
  },
  bodyStyles: {
    fontSize: 9.5,
    textColor: hexToRgb(PDF_THEME.colors.text),
    cellPadding: 2.2,
  },
  alternateRowStyles: {
    fillColor: hexToRgb(PDF_THEME.colors.surface),
  },
  styles: {
    lineColor: hexToRgb(PDF_THEME.colors.border),
    lineWidth: 0.05,
  },
  margin: { left: PDF_THEME.margins.left, right: PDF_THEME.margins.right },
};

// ----- Compat retrocompatível com PDFs antigos enquanto migramos -----
// Mantemos os símbolos legados (addPdfHeader / addSectionTitle) apontando pras
// novas primitivas pra não quebrar imports espalhados pelo código.
export function addPdfHeader(doc, { title, subtitle = '', meta = '' } = {}) {
  // Versão legada → usa title strip com título à esquerda e meta à direita
  return addTitleStrip(doc, { section: title, clubName: subtitle || meta });
}

export function addSectionTitle(doc, text, y) {
  return addSubsectionPill(doc, text, y);
}
