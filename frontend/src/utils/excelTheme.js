import ExcelJS from 'exceljs';
import { deliverFile } from '../lib/deliverFile';
import { saveAs } from 'file-saver';

// Tema centralizado pra geração de Excels bonitos, formatados pra A4.

export const XLS_THEME = {
  brand: 'TactiPlan',
  colors: {
    headerBg: 'FF1F2937',         // cinza-quase-preto (mesmo dos PDFs)
    headerText: 'FFFFFFFF',
    primary: 'FF1D4ED8',
    primaryLight: 'FFEEF2FF',
    text: 'FF0F172A',
    textMuted: 'FF64748B',
    border: 'FFE2E8F0',
    stripe: 'FFF8FAFC',
    accent: 'FF1D4ED8',
    // Cores das dimensões (mesma paleta)
    dim: {
      tatico: 'FF3B82F6',
      fisico: 'FFF59E0B',
      tecnico: 'FFA855F7',
      mental: 'FF10B981',
    },
  },
  fontFamily: 'Calibri',
};

/**
 * Cria workbook com metadata padrão.
 */
export function newWorkbook({ title, subject } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = XLS_THEME.brand;
  wb.created = new Date();
  wb.title = title || XLS_THEME.brand;
  wb.subject = subject || '';
  return wb;
}

/**
 * Helper interno: aplica formatação padrão A4 + margens + impressão.
 */
function applyPageSetup(ws, opts = {}) {
  const { orientation = 'portrait', title = '' } = opts;
  ws.pageSetup = {
    paperSize: 9,           // A4
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,         // permite múltiplas páginas verticalmente
    horizontalCentered: true,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    printArea: undefined,
  };
  ws.headerFooter = {
    oddHeader: `&L&"Calibri,Bold"&14${XLS_THEME.brand}&R&"Calibri,Regular"&10${title || ws.name}`,
    oddFooter: `&L&"Calibri,Regular"&9Gerado em &D &T&R&"Calibri,Regular"&9Página &P de &N`,
  };
  ws.views = [{ state: 'normal', showGridLines: false }];
}

/**
 * Estilo padrão pra header row.
 */
function styleHeaderRow(row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: XLS_THEME.fontFamily, bold: true, color: { argb: XLS_THEME.colors.headerText }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLS_THEME.colors.headerBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: XLS_THEME.colors.border } },
      bottom: { style: 'thin', color: { argb: XLS_THEME.colors.border } },
      left: { style: 'thin', color: { argb: XLS_THEME.colors.border } },
      right: { style: 'thin', color: { argb: XLS_THEME.colors.border } },
    };
  });
}

/**
 * Estilo padrão pra linhas do corpo, com zebra striping.
 */
function styleBodyRow(row, isStripe) {
  row.eachCell((cell) => {
    cell.font = { name: XLS_THEME.fontFamily, color: { argb: XLS_THEME.colors.text }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: XLS_THEME.colors.border } },
      bottom: { style: 'thin', color: { argb: XLS_THEME.colors.border } },
      left: { style: 'thin', color: { argb: XLS_THEME.colors.border } },
      right: { style: 'thin', color: { argb: XLS_THEME.colors.border } },
    };
    if (isStripe) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLS_THEME.colors.stripe } };
    }
  });
}

/**
 * Adiciona sheet com header + body formatados, page setup A4.
 *
 * @param {Workbook} wb
 * @param {string} name
 * @param {Array<string>} columns - títulos das colunas
 * @param {Array<Array>} rows - dados (já formatados como strings/numbers)
 * @param {Object} opts:
 *    widths?: number[] (em chars)
 *    orientation?: 'portrait' | 'landscape'
 *    title?: string (mostrado no header de impressão)
 *    freezeHeader?: boolean (default true)
 *    autoFilter?: boolean (default true)
 *    columnAlignments?: ('left'|'center'|'right')[]
 */
export function addFormattedSheet(wb, name, columns, rows, opts = {}) {
  const safeName = String(name).replace(/[*?:/\\\[\]]/g, '').slice(0, 31) || 'Sheet';
  const ws = wb.addWorksheet(safeName);
  applyPageSetup(ws, { orientation: opts.orientation, title: opts.title });

  // Colunas
  ws.columns = columns.map((header, i) => ({
    header,
    width: opts.widths?.[i] || 18,
    key: `col${i}`,
  }));

  // Header row estilo
  styleHeaderRow(ws.getRow(1));

  // Body
  rows.forEach((r, idx) => {
    const row = ws.addRow(r);
    styleBodyRow(row, idx % 2 === 1);
    if (opts.columnAlignments) {
      row.eachCell((cell, colNumber) => {
        const align = opts.columnAlignments[colNumber - 1];
        if (align) cell.alignment = { ...cell.alignment, horizontal: align };
      });
    }
  });

  // Freeze + autofilter
  if (opts.freezeHeader !== false) {
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: false }];
  }
  if (opts.autoFilter !== false && columns.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
  }

  return ws;
}

/**
 * Sheet de "Resumo" — visual destacado, sem tabela, com cabeçalho grande.
 * Usado como primeira aba de todo export.
 */
export function addSummarySheet(wb, { title, period, club, totals = [] }) {
  const ws = wb.addWorksheet('Resumo');
  applyPageSetup(ws, { orientation: 'portrait', title: title || 'Resumo' });

  // Tabela de metadados
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 40;

  // Linha 1: TactiPlan (banner)
  const banner = ws.getRow(1);
  banner.getCell(1).value = XLS_THEME.brand;
  banner.getCell(1).font = { name: XLS_THEME.fontFamily, bold: true, color: { argb: 'FFFFFFFF' }, size: 18 };
  banner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLS_THEME.colors.headerBg } };
  banner.height = 30;
  ws.mergeCells('A1:B1');

  // Linha 2: título
  if (title) {
    const t = ws.getRow(2);
    t.getCell(1).value = title;
    t.getCell(1).font = { name: XLS_THEME.fontFamily, bold: true, color: { argb: XLS_THEME.colors.text }, size: 14 };
    t.height = 24;
    ws.mergeCells('A2:B2');
  }

  // Espaço
  let currentRow = 4;
  const pushKV = (label, value, opts = {}) => {
    const row = ws.getRow(currentRow++);
    row.getCell(1).value = label;
    row.getCell(1).font = { name: XLS_THEME.fontFamily, bold: true, color: { argb: XLS_THEME.colors.textMuted }, size: 10 };
    row.getCell(2).value = value;
    row.getCell(2).font = { name: XLS_THEME.fontFamily, color: { argb: XLS_THEME.colors.text }, size: opts.big ? 12 : 11, bold: !!opts.big };
    row.height = opts.big ? 20 : 16;
  };

  if (period) pushKV('Período', period);
  if (club) pushKV('Clube', club);
  pushKV('Gerado em', new Date().toLocaleString('pt-BR'));

  if (totals.length > 0) {
    currentRow++;
    const sectionHeader = ws.getRow(currentRow++);
    sectionHeader.getCell(1).value = 'INDICADORES';
    sectionHeader.getCell(1).font = { name: XLS_THEME.fontFamily, bold: true, color: { argb: XLS_THEME.colors.primary }, size: 11 };
    sectionHeader.height = 18;
    totals.forEach(([k, v]) => pushKV(k, v, { big: true }));
  }
  return ws;
}

/**
 * Salva o workbook pra arquivo (browser). Fire-and-forget seguro.
 * Se `chartSpecs` for fornecido, injeta charts nativos antes de salvar.
 */
export function saveWorkbook(wb, filename, chartSpecs = null) {
  return wb.xlsx.writeBuffer()
    .then(async (buf) => {
      let blob;
      if (chartSpecs && chartSpecs.length > 0) {
        const { injectNativeCharts } = await import('./nativeExcelChart');
        blob = await injectNativeCharts(buf, chartSpecs);
      } else {
        blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }
      return deliverFile(blob, filename, 'Compartilhar planilha');
    })
    .catch((err) => {
      console.error('saveWorkbook error', err);
      alert('Erro ao gerar Excel: ' + (err?.message || err));
    });
}

export function formatMinutes(min) {
  if (!min) return '0min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ─── Helper de compatibilidade com a API antiga (xlsx) ───
// Alguns arquivos importam addSheet/addMetaSheet do excelTheme.
// Mantenho aliases que delegam à nova implementação formatada.

export function addSheet(wb, name, aoa, opts = {}) {
  if (!Array.isArray(aoa) || aoa.length === 0) return null;
  const [headers, ...rows] = aoa;
  const colAlign = headers.map((_, i) => {
    if (typeof rows[0]?.[i] === 'number') return 'right';
    return 'left';
  });
  return addFormattedSheet(wb, name, headers, rows, {
    widths: opts.widths,
    orientation: opts.orientation,
    title: opts.title || name,
    freezeHeader: opts.freezeHeader,
    autoFilter: opts.autoFilter,
    columnAlignments: colAlign,
  });
}

export function addMetaSheet(wb, params) {
  return addSummarySheet(wb, params);
}

export function setColumnWidths(ws, widths) {
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}
