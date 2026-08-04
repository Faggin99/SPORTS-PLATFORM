// Renderiza gráficos das estatísticas em canvas off-screen e retorna PNG dataURL.
// Compartilhado entre o PDF e o Excel.

export const DIM_LABELS = { tatico: 'Tático', tecnico: 'Técnico', fisico: 'Físico', mental: 'Mental' };
export const DIM_ORDER = ['tatico', 'fisico', 'tecnico', 'mental'];
export const DIM_CHART_COLORS = { tatico: '#3b82f6', fisico: '#f59e0b', tecnico: '#a855f7', mental: '#10b981' };
// Paleta variada — cores distintas pra cada submomento ficar legível.
export const SUBMOMENT_PALETTE = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

export function renderDonutPNG(data, { size = 360, totalLabel = '', showCenterTotal = false, showSliceLabels = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.42;
  const innerR = outerR * 0.62;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  // Desenha as fatias
  let angle = -Math.PI / 2;
  const slices = data.map((d) => {
    const a = (d.value / total) * Math.PI * 2;
    const startA = angle;
    const midA = angle + a / 2;
    angle += a;
    return { ...d, startA, midA, sweepA: a, pct: Math.round((d.value / total) * 100) };
  });
  slices.forEach((s) => {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, s.startA, s.startA + s.sweepA);
    ctx.arc(cx, cy, innerR, s.startA + s.sweepA, s.startA, true);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
  });
  // % dentro de cada fatia (só se for grande o bastante)
  if (showSliceLabels) {
    const midR = (outerR + innerR) / 2;
    const labelFont = Math.max(10, Math.floor(size * 0.05));
    ctx.font = `bold ${labelFont}px Helvetica, Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    slices.forEach((s) => {
      if (s.sweepA < (Math.PI / 10)) return; // < ~18° (5%) fica ilegível
      const x = cx + midR * Math.cos(s.midA);
      const y = cy + midR * Math.sin(s.midA);
      // sombra leve pra legibilidade
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillText(`${s.pct}%`, x + 0.6, y + 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${s.pct}%`, x, y);
    });
  }
  // Total centro (opcional)
  if (showCenterTotal) {
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(size * 0.11)}px Helvetica, Arial`;
    ctx.fillText(String(total), cx, cy - 6);
    if (totalLabel) {
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.floor(size * 0.05)}px Helvetica, Arial`;
      ctx.fillText(totalLabel, cx, cy + size * 0.07);
    }
  }
  return canvas.toDataURL('image/png');
}

export function renderTrendBarsPNG(trend, { width = 800, height = 280 } = {}) {
  if (!trend?.length) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  const padding = { top: 30, right: 20, bottom: 36, left: 30 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...trend.map((b) => b.total), 1);
  const barGap = 14;
  const barW = (innerW - barGap * (trend.length - 1)) / trend.length;
  trend.forEach((b, i) => {
    const x = padding.left + i * (barW + barGap);
    const totalH = (b.total / max) * innerH;
    let yTop = padding.top + innerH;
    DIM_ORDER.forEach((dim) => {
      const cnt = b.byDimension?.[dim] || 0;
      if (cnt === 0 || b.total === 0) return;
      const h = (cnt / b.total) * totalH;
      ctx.fillStyle = DIM_CHART_COLORS[dim];
      ctx.fillRect(x, yTop - h, barW, h);
      yTop -= h;
    });
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Helvetica, Arial';
    ctx.fillText(String(b.total), x + barW / 2, padding.top + innerH - totalH - 6);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Helvetica, Arial';
    ctx.fillText(b.period, x + barW / 2, padding.top + innerH + 14);
  });
  ctx.font = '11px Helvetica, Arial';
  let lx = padding.left;
  DIM_ORDER.forEach((dim) => {
    ctx.fillStyle = DIM_CHART_COLORS[dim];
    ctx.fillRect(lx, height - 14, 9, 9);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(DIM_LABELS[dim], lx + 12, height - 7);
    lx += ctx.measureText(DIM_LABELS[dim]).width + 28;
  });
  return canvas.toDataURL('image/png');
}

export function renderSubmomentDonutPNG(subs, { size = 360 } = {}) {
  if (!subs?.length) return null;
  const data = [...subs]
    .sort((a, b) => b.count - a.count)
    .map((s, i) => ({ label: s.name, value: s.count, color: SUBMOMENT_PALETTE[i % SUBMOMENT_PALETTE.length] }));
  return renderDonutPNG(data, { size, totalLabel: 'aparições' });
}
