import { useEffect, useState } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { themeService } from '../../services/themeService';

// Card de aderência ao tema do mês — aparece em /training-stats quando:
//  - usuário tem plano com `monthly_theme`
//  - preferência `pref_monthly_theme` está ativada
//  - clube tem tema definido pro mês atual
export function MonthlyThemeAdherenceCard({ clubId, month }) {
  const { colors } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!clubId || !month) { setData(null); setLoading(false); return; }
    setLoading(true);
    themeService.getAdherence(month, clubId)
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [clubId, month]);

  if (loading) return null;
  if (!data || !data.hasTheme) return null;

  const pct = data.adherencePercent || 0;
  const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const monthLabel = (() => {
    if (!data.month) return '';
    const [y, m] = String(data.month).split('-').map(Number);
    if (!y || !m) return data.month;
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${names[m - 1]}/${y}`;
  })();

  return (
    <div style={{
      padding: '1rem 1.25rem',
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '0.5rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Target size={18} color={colors.primary} />
          <div>
            <div style={{ fontSize: '0.8rem', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Aderência ao Tema do Mês — {monthLabel}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: colors.text, marginTop: 2 }}>
              {data.theme?.name}
              {data.secondaryTheme && (
                <span style={{ fontSize: '0.85rem', color: colors.textSecondary, fontWeight: 500 }}>
                  {' '}+ {data.secondaryTheme.name}
                </span>
              )}
            </div>
            {data.description && (
              <div style={{ fontSize: '0.78rem', color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>{data.description}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: barColor, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: '0.7rem', color: colors.textSecondary, marginTop: 2 }}>
            {data.themedActivities}/{data.totalActivities} atividades
          </div>
        </div>
      </div>

      <div style={{
        height: 8, borderRadius: 999, backgroundColor: colors.background,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: barColor,
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{ fontSize: '0.72rem', color: colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
        <TrendingUp size={11} />
        {pct >= 70 ? 'Excelente — treinos bem alinhados ao tema.'
          : pct >= 40 ? 'Bom — equilibrado, mas dá pra puxar mais o tema.'
          : 'Tema pouco presente — considere ajustar a programação do mês.'}
      </div>
    </div>
  );
}
