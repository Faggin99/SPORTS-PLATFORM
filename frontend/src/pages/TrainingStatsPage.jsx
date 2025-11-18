import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/common/Card';
import { useTheme } from '../contexts/ThemeContext';
import { trainingService } from '../services/trainingService';
import { Clock, TrendingUp, Calendar, Target, PieChart, X, ChevronLeft, ChevronRight, Maximize2, List } from 'lucide-react';

export function TrainingStatsPage() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedChart, setExpandedChart] = useState(null);
  const [showFullRankingModal, setShowFullRankingModal] = useState(false);
  const [rankingPage, setRankingPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Don't auto-load for custom period - wait for user to click search button
    if (period !== 'custom') {
      loadStats();
    }
  }, [period]);

  async function loadStats() {
    setLoading(true);
    try {
      const params = { period };
      if (period === 'custom' && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const data = await trainingService.getStats(params);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    padding: '1rem',
    gap: '0.75rem',
  };

  const headerStyle = {
    flexShrink: 0,
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: colors.text,
    marginBottom: '0.25rem',
  };

  const subtitleStyle = {
    fontSize: '0.875rem',
    color: colors.textSecondary,
  };

  const filtersStyle = {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    alignItems: 'center',
    flexShrink: 0,
  };

  const filterButtonStyle = (isActive) => ({
    padding: '0.4rem 0.75rem',
    border: `1px solid ${isActive ? colors.primary : colors.border}`,
    borderRadius: '0.375rem',
    backgroundColor: isActive ? colors.primary : colors.background,
    color: isActive ? '#ffffff' : colors.text,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'all 0.2s',
  });

  const contentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    minHeight: 0,
    overflow: 'hidden',
  };

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    flexShrink: 0,
  };

  const statCardStyle = {
    padding: '0.75rem',
    backgroundColor: colors.surface,
    borderRadius: '0.5rem',
    border: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const statIconStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}15`,
    color: colors.primary,
    flexShrink: 0,
  };

  const statContentStyle = {
    flex: 1,
    minWidth: 0,
  };

  const statLabelStyle = {
    fontSize: '0.7rem',
    color: colors.textSecondary,
    marginBottom: '0.15rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const statValueStyle = {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: colors.text,
    lineHeight: 1,
  };

  const chartsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    flex: 1,
    minHeight: 0,
  };

  const chartCardStyle = {
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    position: 'relative',
  };

  const chartTitleStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  };

  const chartContentStyle = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const expandButtonStyle = {
    padding: '0.25rem',
    background: 'transparent',
    border: 'none',
    color: colors.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.25rem',
    transition: 'all 0.2s',
  };

  const inputStyle = {
    padding: '0.4rem 0.6rem',
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: '0.8rem',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '2rem',
  };

  const modalContentStyle = {
    backgroundColor: colors.surface,
    borderRadius: '0.75rem',
    padding: '2rem',
    maxWidth: expandedChart === 'ranking' ? '700px' : '900px',
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    position: 'relative',
  };

  if (loading && !stats) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', padding: '3rem', color: colors.textSecondary }}>
          Carregando estatísticas...
        </div>
      </div>
    );
  }

  // Use real stats if available, otherwise use mock data
  const displayStats = stats || {
    totalSessions: 24,
    totalMinutes: 2160,
    avgMinutesPerSession: 90,
    utilizationRate: 85.5,
    contentDistribution: [
      { name: 'Organização Ofensiva', abbr: 'Org Of', value: 450, color: '#3b82f6' },
      { name: 'Organização Defensiva', abbr: 'Org Def', value: 380, color: '#ef4444' },
      { name: 'Transição Ofensiva', abbr: 'Trans Of', value: 320, color: '#10b981' },
      { name: 'Transição Defensiva', abbr: 'Trans Def', value: 290, color: '#f59e0b' },
      { name: 'Bola Parada Ofensiva', abbr: 'BP Of', value: 380, color: '#8b5cf6' },
      { name: 'Bola Parada Defensiva', abbr: 'BP Def', value: 340, color: '#ec4899' },
    ],
    durationByDay: [
      { day: 'Segunda', minutes: 120 },
      { day: 'Terça', minutes: 90 },
      { day: 'Quarta', minutes: 75 },
      { day: 'Quinta', minutes: 90 },
      { day: 'Sexta', minutes: 105 },
      { day: 'Sábado', minutes: 60 },
      { day: 'Domingo', minutes: 0 },
    ],
    topTitles: [
      { title: 'Posse de Bola 4x4+2', count: 8 },
      { title: 'Jogo Posicional', count: 6 },
      { title: 'Transições em Espaço Reduzido', count: 5 },
      { title: 'Jogo de Posição', count: 4 },
      { title: 'Escanteios Ofensivos', count: 4 },
      { title: 'Finalização', count: 3 },
      { title: 'Construção pelo Corredor Central', count: 3 },
      { title: 'Pressing Alto', count: 3 },
      { title: 'Saída de Bola', count: 2 },
      { title: 'Amplitude Ofensiva', count: 2 },
      { title: 'Coberturas Defensivas', count: 2 },
      { title: 'Cruzamentos', count: 2 },
      { title: 'Bola Parada Defensiva - Escanteio', count: 1 },
      { title: 'Contra-Ataque', count: 1 },
    ],
    groupDistribution: [
      { group: 'Grupo 1', minutes: 580 },
      { group: 'Grupo 2', minutes: 620 },
      { group: 'Grupo 3', minutes: 490 },
      { group: 'Transição', minutes: 380 },
      { group: 'DM', minutes: 90 },
    ],
  };

  const totalMinutesInContent = displayStats.contentDistribution.reduce((sum, c) => sum + c.value, 0);
  const totalPages = Math.ceil(displayStats.topTitles.length / itemsPerPage);
  const paginatedTitles = displayStats.topTitles.slice(
    (rankingPage - 1) * itemsPerPage,
    rankingPage * itemsPerPage
  );

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Estatísticas de Treino</h1>
        <p style={subtitleStyle}>Análise detalhada do volume e distribuição</p>
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <button style={filterButtonStyle(period === 'week')} onClick={() => setPeriod('week')}>
          Semana
        </button>
        <button style={filterButtonStyle(period === 'month')} onClick={() => setPeriod('month')}>
          Mês
        </button>
        <button style={filterButtonStyle(period === '3months')} onClick={() => setPeriod('3months')}>
          3 Meses
        </button>
        <button style={filterButtonStyle(period === 'custom')} onClick={() => setPeriod('custom')}>
          Personalizado
        </button>

        {period === 'custom' && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
            <span style={{ color: colors.textSecondary, fontSize: '0.8rem' }}>até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
            <button
              onClick={loadStats}
              disabled={!startDate || !endDate}
              style={{
                padding: '0.4rem 0.75rem',
                border: `1px solid ${colors.primary}`,
                borderRadius: '0.375rem',
                backgroundColor: (!startDate || !endDate) ? colors.background : colors.primary,
                color: (!startDate || !endDate) ? colors.textSecondary : '#ffffff',
                cursor: (!startDate || !endDate) ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                opacity: (!startDate || !endDate) ? 0.5 : 1,
              }}
            >
              Buscar
            </button>
          </>
        )}
      </div>

      {/* Content Area */}
      <div style={contentStyle}>
        {/* Stats Cards */}
        <div style={statsGridStyle}>
          <div style={statCardStyle}>
            <div style={statIconStyle}>
              <Calendar size={18} strokeWidth={1.5} />
            </div>
            <div style={statContentStyle}>
              <div style={statLabelStyle}>Treinos</div>
              <div style={statValueStyle}>{displayStats.totalSessions}</div>
            </div>
          </div>

          <div style={statCardStyle}>
            <div style={statIconStyle}>
              <Clock size={18} strokeWidth={1.5} />
            </div>
            <div style={statContentStyle}>
              <div style={statLabelStyle}>Horas</div>
              <div style={statValueStyle}>
                {(() => {
                  const hours = Math.floor(displayStats.totalMinutes / 60);
                  const minutes = displayStats.totalMinutes % 60;
                  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
                })()}
              </div>
            </div>
          </div>

          <div style={statCardStyle}>
            <div style={statIconStyle}>
              <TrendingUp size={18} strokeWidth={1.5} />
            </div>
            <div style={statContentStyle}>
              <div style={statLabelStyle}>Média/Sessão</div>
              <div style={statValueStyle}>{displayStats.avgMinutesPerSession}m</div>
            </div>
          </div>
        </div>

        {/* Charts Grid - 3 columns */}
        <div style={chartsGridStyle}>
          {/* Pie Chart */}
          <Card style={chartCardStyle}>
            <div style={chartTitleStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <PieChart size={16} strokeWidth={1.5} />
                <span>Conteúdos</span>
              </span>
              <button
                style={expandButtonStyle}
                onClick={() => setExpandedChart('pie')}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.primary}15`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Maximize2 size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div style={chartContentStyle}>
              <CompactPieChart data={displayStats.contentDistribution} total={totalMinutesInContent} colors={colors} />
            </div>
          </Card>

          {/* Top Titles */}
          <Card style={chartCardStyle}>
            <div style={chartTitleStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <List size={16} strokeWidth={1.5} />
                <span>Top Temas</span>
              </span>
              <button
                style={expandButtonStyle}
                onClick={() => setShowFullRankingModal(true)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.primary}15`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Maximize2 size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div style={chartContentStyle}>
              <CompactTopList data={displayStats.topTitles.slice(0, 5)} colors={colors} />
            </div>
            <div style={{ padding: '0 0.5rem 0.5rem 0.5rem' }}>
              <button
                onClick={() => setShowFullRankingModal(true)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.375rem',
                  backgroundColor: colors.background,
                  color: colors.primary,
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.primary}10`;
                  e.currentTarget.style.borderColor = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.background;
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                Ver toda a lista
              </button>
            </div>
          </Card>

          {/* Group Distribution */}
          <Card style={chartCardStyle}>
            <div style={chartTitleStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Target size={16} strokeWidth={1.5} />
                <span>Grupos</span>
              </span>
              <button
                style={expandButtonStyle}
                onClick={() => setExpandedChart('groups')}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.primary}15`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Maximize2 size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div style={chartContentStyle}>
              <CompactGroupChart data={displayStats.groupDistribution} colors={colors} />
            </div>
          </Card>
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && expandedChart !== 'ranking' && (
        <div style={modalOverlayStyle} onClick={() => setExpandedChart(null)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExpandedChart(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: colors.text,
                cursor: 'pointer',
                padding: '0.5rem',
              }}
            >
              <X size={24} strokeWidth={1.5} />
            </button>

            {expandedChart === 'pie' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.text, marginBottom: '2rem' }}>
                  Distribuição de Conteúdos
                </h2>
                <ImprovedPieChartComponent data={displayStats.contentDistribution} total={totalMinutesInContent} colors={colors} />
              </>
            )}

            {expandedChart === 'groups' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.text, marginBottom: '2rem' }}>
                  Volume por Grupo
                </h2>
                <GroupDistributionComponent data={displayStats.groupDistribution} colors={colors} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Full Ranking Modal */}
      {showFullRankingModal && (
        <div style={modalOverlayStyle} onClick={() => setShowFullRankingModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFullRankingModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: colors.text,
                cursor: 'pointer',
                padding: '0.5rem',
              }}
            >
              <X size={24} strokeWidth={1.5} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.text, marginBottom: '1.5rem' }}>
              Ranking Completo de Temas
            </h2>

            <div>
              {paginatedTitles.map((item, i) => {
                const globalIndex = (rankingPage - 1) * itemsPerPage + i + 1;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: `${colors.primary}15`,
                          color: colors.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          marginRight: '0.75rem',
                        }}
                      >
                        {globalIndex}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: colors.text, fontWeight: '500' }}>
                        {item.title}
                      </div>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: colors.text }}>
                      {item.count}x
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '1.5rem',
              }}>
                <button
                  onClick={() => setRankingPage(Math.max(1, rankingPage - 1))}
                  disabled={rankingPage === 1}
                  style={{
                    padding: '0.5rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: colors.background,
                    color: colors.text,
                    cursor: rankingPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: rankingPage === 1 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </button>
                <span style={{ color: colors.text, fontSize: '0.875rem' }}>
                  Página {rankingPage} de {totalPages}
                </span>
                <button
                  onClick={() => setRankingPage(Math.min(totalPages, rankingPage + 1))}
                  disabled={rankingPage === totalPages}
                  style={{
                    padding: '0.5rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: colors.background,
                    color: colors.text,
                    cursor: rankingPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: rankingPage === totalPages ? 0.5 : 1,
                  }}
                >
                  <ChevronRight size={20} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact Pie Chart
function CompactPieChart({ data, total, colors }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    };

    // Initial update with slight delay to ensure DOM is ready
    const timer = setTimeout(updateDimensions, 50);
    updateDimensions();

    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Calculate size based on container - maximize the pie chart
  const legendHeight = 22; // Fixed height for legend at bottom
  const availableHeight = dimensions.height - legendHeight; // Space for pie minus legend
  const availableWidth = dimensions.width;
  const size = dimensions.width > 0 && dimensions.height > 0 ? Math.min(availableHeight * 0.85, availableWidth * 0.85) : 0;
  const center = size / 2;
  const radius = (size / 2) * 0.95;

  // If total is 0, show empty state
  if (total === 0) {
    return (
      <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: colors.textSecondary, fontSize: '0.75rem' }}>
        Sem dados
      </div>
    );
  }

  let currentAngle = -90;
  const segments = data
    .filter(item => item.value > 0) // Only render segments with values
    .map((item, index) => {
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (currentAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      // If angle is 360 (full circle), draw as a circle element instead of path
      if (angle >= 359.99) {
        return {
          isCircle: true,
          color: item.color,
          item,
          index,
          cx: center,
          cy: center,
          r: radius
        };
      }

      const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return { path, color: item.color, item, index, isCircle: false };
    });

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}>
      {size > 0 && (
        <>
          {/* Pizza centralizada no espaço disponível */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
          }}>
            <svg width={size} height={size} style={{ flexShrink: 0 }}>
              {segments.map((seg) => (
                seg.isCircle ? (
                  <circle key={seg.index} cx={seg.cx} cy={seg.cy} r={seg.r} fill={seg.color} opacity={0.9} />
                ) : (
                  <path key={seg.index} d={seg.path} fill={seg.color} opacity={0.9} />
                )
              ))}
            </svg>
          </div>

          {/* Legenda fixada na parte inferior */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.15rem',
            fontSize: '0.6rem',
            width: '100%',
            paddingTop: '0.25rem',
            flexShrink: 0,
          }}>
            {data.filter(item => item.value > 0).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '1.5px', backgroundColor: item.color, flexShrink: 0 }} />
                <span style={{ color: colors.text, fontWeight: '500' }}>{item.abbr}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Compact Top List
function CompactTopList({ data, colors }) {
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const { height } = containerRef.current.getBoundingClientRect();
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    };

    const timer = setTimeout(updateHeight, 50);
    updateHeight();

    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Calculate item height and padding based on available space
  const itemHeight = containerHeight > 0 ? Math.max(24, Math.min(36, containerHeight / data.length - 6)) : 32;
  const itemPadding = itemHeight > 30 ? '0.5rem' : '0.35rem';
  const fontSize = itemHeight > 30 ? '0.75rem' : '0.7rem';
  const badgeSize = itemHeight > 30 ? '22px' : '18px';

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', height: '100%', overflow: 'hidden', justifyContent: 'space-around' }}>
      {data.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: itemPadding,
            backgroundColor: colors.background,
            borderRadius: '0.25rem',
            minHeight: `${itemHeight}px`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            <div style={{
              width: badgeSize,
              height: badgeSize,
              borderRadius: '50%',
              backgroundColor: `${colors.primary}15`,
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: fontSize,
              fontWeight: '600',
              flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{
              fontSize: fontSize,
              color: colors.text,
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.title}
            </div>
          </div>
          <div style={{ fontSize: fontSize, fontWeight: '700', color: colors.text, marginLeft: '0.5rem' }}>
            {item.count}x
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact Group Chart
function CompactGroupChart({ data, colors }) {
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const totalMinutes = data.reduce((sum, g) => sum + g.minutes, 0);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const { height } = containerRef.current.getBoundingClientRect();
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    };

    const timer = setTimeout(updateHeight, 50);
    updateHeight();

    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Calculate bar height based on available space
  const barHeight = containerHeight > 0 ? Math.max(6, Math.min(12, (containerHeight / data.length) * 0.3)) : 8;
  const fontSize = barHeight > 8 ? '0.75rem' : '0.7rem';

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', height: '100%', justifyContent: 'space-around', padding: '0.25rem 0' }}>
      {data.map((item, i) => {
        const percentage = totalMinutes > 0 ? (item.minutes / totalMinutes) * 100 : 0;
        return (
          <div key={i}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.25rem',
            }}>
              <span style={{ fontSize: fontSize, fontWeight: '600', color: colors.text }}>
                {item.group}
              </span>
              <span style={{ fontSize: fontSize, color: colors.textSecondary }}>
                {item.minutes}m
              </span>
            </div>
            <div style={{
              height: `${barHeight}px`,
              backgroundColor: colors.background,
              borderRadius: '999px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${percentage}%`,
                backgroundColor: colors.primary,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Full-size charts for modals (reusing previous improved versions)
function ImprovedPieChartComponent({ data, total, colors }) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 40;

  let currentAngle = -90;
  const segments = data
    .filter(item => item.value > 0)
    .map((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      const midAngle = startAngle + angle / 2;

      currentAngle += angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      let path;
      let isCircle = false;
      let cx, cy, r;

      // If angle is 360 (full circle), draw as a circle element instead of path
      if (angle >= 359.99) {
        isCircle = true;
        cx = center;
        cy = center;
        r = radius;
      } else {
        path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }

      const labelRadius = radius * 0.7;
      const midRad = (midAngle * Math.PI) / 180;
      const labelX = center + labelRadius * Math.cos(midRad);
      const labelY = center + labelRadius * Math.sin(midRad);

      return { path, color: item.color, percentage: percentage.toFixed(1), item, labelX, labelY, index, isCircle, cx, cy, r };
    });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
      <svg width={size} height={size}>
        {segments.map((seg) => (
          <g
            key={seg.index}
            onMouseEnter={() => setHoveredSegment(seg.index)}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{ cursor: 'pointer' }}
          >
            {seg.isCircle ? (
              <circle
                cx={seg.cx}
                cy={seg.cy}
                r={seg.r}
                fill={seg.color}
                opacity={hoveredSegment === null || hoveredSegment === seg.index ? 0.9 : 0.3}
                style={{ transition: 'opacity 0.2s' }}
              />
            ) : (
              <path
                d={seg.path}
                fill={seg.color}
                opacity={hoveredSegment === null || hoveredSegment === seg.index ? 0.9 : 0.3}
                style={{ transition: 'opacity 0.2s' }}
              />
            )}
            {seg.percentage > 8 && (
              <>
                <text x={seg.labelX} y={seg.labelY - 5} textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700" style={{ pointerEvents: 'none' }}>
                  {seg.item.abbr}
                </text>
                <text x={seg.labelX} y={seg.labelY + 12} textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="500" style={{ pointerEvents: 'none' }}>
                  {seg.percentage}%
                </text>
              </>
            )}
          </g>
        ))}
      </svg>

      {hoveredSegment !== null && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: colors.surface,
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: `2px solid ${segments[hoveredSegment].color}`,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.text }}>
            {segments[hoveredSegment].item.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
            {segments[hoveredSegment].item.value} minutos ({segments[hoveredSegment].percentage}%)
          </div>
        </div>
      )}
    </div>
  );
}

function GroupDistributionComponent({ data, colors }) {
  const totalMinutes = data.reduce((sum, g) => sum + g.minutes, 0);

  return (
    <div>
      {data.map((item, i) => {
        const percentage = totalMinutes > 0 ? (item.minutes / totalMinutes) * 100 : 0;
        return (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.text }}>{item.group}</span>
              <span style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                {item.minutes} min ({percentage.toFixed(0)}%)
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: colors.background, borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: colors.primary, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
