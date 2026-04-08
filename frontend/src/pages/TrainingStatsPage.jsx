import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/common/Card';
import { useTheme } from '../contexts/ThemeContext';
import { useClub } from '../contexts/ClubContext';
import { trainingService } from '../services/trainingService';
import { gameStatsService } from '../services/gameStatsService';
import { WeekSelector } from '../components/stats/WeekSelector';
import { ClubSelector } from '../components/club/ClubSelector';
import { Clock, TrendingUp, Calendar, Target, PieChart, X, ChevronLeft, ChevronRight, Maximize2, List, Trophy, Goal, Shield, AlertTriangle } from 'lucide-react';

export function TrainingStatsPage() {
  const { colors } = useTheme();
  const { selectedClub } = useClub();
  const [activeTab, setActiveTab] = useState('training'); // 'training' ou 'game'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [gameStats, setGameStats] = useState(null);
  const [filterType, setFilterType] = useState('1-micro'); // '1-micro', '4-micros', 'semester', '1-year', 'custom'
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Initialize with current week
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayNum = d.getDay() || 7;
    const thursday = new Date(d);
    thursday.setDate(d.getDate() + (4 - dayNum));
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);
    return `${thursday.getFullYear()}-${String(weekNo).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedChart, setExpandedChart] = useState(null);
  const [showFullRankingModal, setShowFullRankingModal] = useState(false);
  const [rankingPage, setRankingPage] = useState(1);
  const itemsPerPage = 10;

  // Helper function to parse week identifier and get date range
  function getWeekDateRange(weekIdentifier) {
    const [year, week] = weekIdentifier.split('-').map(Number);
    const startDate = getDateOfISOWeek(week, year);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
  }

  function getDateOfISOWeek(week, year) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  }

  // Clear stats and reload when club changes
  useEffect(() => {
    if (selectedClub?.id) {
      console.log('Club changed in stats, clearing and reloading:', selectedClub.id);
      setStats(null); // Clear current stats immediately
      setGameStats(null);
      setLoading(true);
      // Reload stats if not custom/semester/1-year
      if (filterType !== 'custom' && filterType !== 'semester' && filterType !== '1-year') {
        if (activeTab === 'training') {
          loadStats();
        } else {
          loadGameStats();
        }
      } else {
        setLoading(false);
      }
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    // Don't auto-load for custom, semester, and 1-year - wait for user to click search button
    // Also require a club to be selected
    if (selectedClub?.id && filterType !== 'custom' && filterType !== 'semester' && filterType !== '1-year') {
      if (activeTab === 'training') {
        loadStats();
      } else {
        loadGameStats();
      }
    }
  }, [filterType, selectedWeek, activeTab]);

  // Helper function to count weeks in a year
  function getWeeksInYearCount(year) {
    // Check if year has 53 weeks by checking if week 53 belongs to that year
    const lastWeek = new Date(year, 11, 31); // Dec 31
    const thursday = new Date(lastWeek);
    const dayOfWeek = lastWeek.getDay() || 7;
    thursday.setDate(lastWeek.getDate() + (4 - dayOfWeek));
    return thursday.getFullYear() === year ? 53 : 52;
  }

  // Calculate selected week range for visual feedback in calendar (only for 4-micros)
  function getSelectedWeekRange() {
    if (filterType !== '4-micros') {
      return []; // Only show range for 4 microcycles
    }

    const [year, weekNum] = selectedWeek.split('-').map(Number);
    const weekCount = 4;

    const range = [];
    for (let i = 0; i < weekCount; i++) {
      let currentWeek = weekNum + i;
      let currentYear = year;

      // Handle year overflow - check if current year has 53 weeks
      let weeksInYear = getWeeksInYearCount(currentYear);
      while (currentWeek > weeksInYear) {
        currentWeek -= weeksInYear;
        currentYear++;
        weeksInYear = getWeeksInYearCount(currentYear);
      }

      range.push(`${currentYear}-${String(currentWeek).padStart(2, '0')}`);
    }

    console.log('Selected week range for 4-micros:', range);
    return range;
  }

  // Recalculate end date when filter type changes
  useEffect(() => {
    if (filterType === 'semester' && startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 6);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (filterType === '1-year' && startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [filterType, startDate]);

  function getDateRangeParams() {
    let start_date, end_date;

    if (filterType === 'custom' || filterType === 'semester' || filterType === '1-year') {
      if (!startDate || !endDate) return null;
      start_date = startDate;
      end_date = endDate;
    } else if (filterType === '1-micro') {
      const range = getWeekDateRange(selectedWeek);
      start_date = range.start;
      end_date = range.end;
    } else if (filterType === '4-micros') {
      const range = getWeekDateRange(selectedWeek);
      start_date = range.start;
      const endDateObj = new Date(range.start);
      endDateObj.setDate(endDateObj.getDate() + (4 * 7) - 1);
      end_date = endDateObj.toISOString().split('T')[0];
    }

    return { start_date, end_date };
  }

  async function loadStats() {
    setLoading(true);
    try {
      const dateRange = getDateRangeParams();
      if (!dateRange) return;

      const params = {
        period: 'custom',
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        clubId: selectedClub?.id,
      };

      console.log('Loading stats with params:', params);

      const response = await trainingService.getStats(params);
      const data = response?.data || response;
      console.log('Stats loaded:', data);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadGameStats() {
    setLoading(true);
    try {
      const dateRange = getDateRangeParams();
      if (!dateRange) return;

      const params = {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        clubId: selectedClub?.id,
      };

      console.log('Loading game stats with params:', params);

      const data = await gameStatsService.getStats(params);
      console.log('Game stats loaded:', data);
      setGameStats(data);
    } catch (error) {
      console.error('Error loading game stats:', error);
      setGameStats(null);
    } finally {
      setLoading(false);
    }
  }

  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    padding: '0.75rem 1rem',
    gap: '0.5rem',
  };

  const headerStyle = {
    flexShrink: 0,
  };

  const titleStyle = {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: colors.text,
    marginBottom: '0',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '0.75rem',
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
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
    overflow: 'visible', // Mudado de hidden para visible
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

  // Usar apenas dados reais do Supabase - sem mock data
  const displayStats = stats || {
    totalSessions: 0,
    totalMinutes: 0,
    avgMinutesPerSession: 0,
    utilizationRate: 0,
    contentDistribution: [],
    durationByDay: [],
    topTitles: [],
    groupDistribution: [],
  };

  const totalMinutesInContent = displayStats.contentDistribution?.reduce((sum, c) => sum + c.value, 0) || 0;
  const totalPages = Math.ceil((displayStats.topTitles?.length || 0) / itemsPerPage);
  const paginatedTitles = (displayStats.topTitles || []).slice(
    (rankingPage - 1) * itemsPerPage,
    rankingPage * itemsPerPage
  );

  // Tab button style
  const tabStyle = (isActive) => ({
    padding: '0.4rem 0.75rem',
    border: 'none',
    borderBottom: `2px solid ${isActive ? colors.primary : 'transparent'}`,
    backgroundColor: 'transparent',
    color: isActive ? colors.primary : colors.textSecondary,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  });

  return (
    <div style={pageStyle}>
      {/* Header compacto com tabs e seletor de clube */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ ...titleStyle, marginBottom: 0 }}>Estatísticas</h1>
          {/* Tabs inline */}
          <div style={{
            display: 'flex',
            gap: '0',
            borderBottom: `1px solid ${colors.border}`,
          }}>
            <button
              style={tabStyle(activeTab === 'training')}
              onClick={() => setActiveTab('training')}
            >
              <Calendar size={16} />
              Treino
            </button>
            <button
              style={tabStyle(activeTab === 'game')}
              onClick={() => setActiveTab('game')}
            >
              <Trophy size={16} />
              Jogos
            </button>
          </div>
        </div>
        <ClubSelector />
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <button style={filterButtonStyle(filterType === '1-micro')} onClick={() => setFilterType('1-micro')}>
          1 Microciclo
        </button>
        <button style={filterButtonStyle(filterType === '4-micros')} onClick={() => setFilterType('4-micros')}>
          4 Microciclos
        </button>
        <button style={filterButtonStyle(filterType === 'semester')} onClick={() => setFilterType('semester')}>
          Semestre
        </button>
        <button style={filterButtonStyle(filterType === '1-year')} onClick={() => setFilterType('1-year')}>
          1 Ano
        </button>
        <button style={filterButtonStyle(filterType === 'custom')} onClick={() => setFilterType('custom')}>
          Personalizado
        </button>
      </div>

      {/* Week Selector or Date Inputs */}
      {filterType === '1-micro' || filterType === '4-micros' ? (
        <WeekSelector
          value={selectedWeek}
          onChange={setSelectedWeek}
          selectedRange={getSelectedWeekRange()}
          rangeCount={filterType === '4-micros' ? 4 : 1}
          label={
            filterType === '1-micro' ? 'Semana' : 'Primeira semana'
          }
        />
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: colors.textSecondary, fontWeight: '500' }}>
            {filterType === 'semester' ? 'Data inicial:' : filterType === '1-year' ? 'Data inicial:' : 'Período:'}
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              // Auto-calculate end date for semester and year
              if (e.target.value) {
                const start = new Date(e.target.value);
                const end = new Date(start);
                if (filterType === 'semester') {
                  end.setMonth(end.getMonth() + 6);
                } else if (filterType === '1-year') {
                  end.setFullYear(end.getFullYear() + 1);
                }
                setEndDate(end.toISOString().split('T')[0]);
              }
            }}
            style={inputStyle}
          />
          {(filterType === 'semester' || filterType === '1-year') && startDate && (
            <>
              <span style={{ color: colors.textSecondary, fontSize: '0.8rem' }}>até</span>
              <span style={{ fontSize: '0.875rem', color: colors.text, fontWeight: '500' }}>
                {new Date(endDate).toLocaleDateString('pt-BR')}
              </span>
            </>
          )}
          {filterType === 'custom' && (
            <>
              <span style={{ color: colors.textSecondary, fontSize: '0.8rem' }}>até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </>
          )}
          <button
            onClick={() => activeTab === 'training' ? loadStats() : loadGameStats()}
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
        </div>
      )}

      {/* Content Area */}
      <div style={contentStyle}>
        {/* Conteúdo de JOGOS */}
        {activeTab === 'game' && (
          <GameStatsContent
            gameStats={gameStats}
            loading={loading}
            colors={colors}
            statsGridStyle={statsGridStyle}
            statCardStyle={statCardStyle}
            statIconStyle={statIconStyle}
            statContentStyle={statContentStyle}
            statLabelStyle={statLabelStyle}
            statValueStyle={statValueStyle}
            chartsGridStyle={chartsGridStyle}
            chartCardStyle={chartCardStyle}
            chartTitleStyle={chartTitleStyle}
            chartContentStyle={chartContentStyle}
          />
        )}

        {/* Conteúdo de TREINO */}
        {activeTab === 'training' && displayStats.totalSessions === 0 && !loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            color: colors.textSecondary,
            textAlign: 'center',
            gap: '0.5rem',
          }}>
            <PieChart size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: colors.text }}>Nenhum dado encontrado</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Não há treinos registrados no período selecionado.
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Selecione outro período ou adicione treinos na página de Planejamento.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        {activeTab === 'training' && displayStats.totalSessions > 0 && (
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
        )}

        {/* Charts Grid - 3 columns */}
        {activeTab === 'training' && displayStats.totalSessions > 0 && (
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
        )}
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
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

  // If total is 0 or data is empty, show empty state
  if (!data || data.length === 0 || total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: colors.textSecondary, fontSize: '0.75rem' }}>
        {!data || data.length === 0 ? 'Carregando...' : 'Sem dados'}
      </div>
    );
  }

  function handleMouseEnter(e, item) {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      content: `${item.name}: ${item.value} min`,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function handleMouseLeave() {
    setTooltip({ show: false, content: '', x: 0, y: 0 });
  }

  function handleMouseMove(e) {
    if (tooltip.show) {
      setTooltip(prev => ({
        ...prev,
        x: e.clientX,
        y: e.clientY,
      }));
    }
  }

  // Use tamanho fixo que funciona bem em qualquer resolução
  const size = 160;
  const center = size / 2;
  const radius = (size / 2) * 0.9;

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
      {/* Pizza centralizada */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size}>
          {segments.map((seg) => (
            seg.isCircle ? (
              <circle
                key={seg.index}
                cx={seg.cx}
                cy={seg.cy}
                r={seg.r}
                fill={seg.color}
                opacity={0.9}
                onMouseEnter={(e) => handleMouseEnter(e, seg.item)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0.9'}
              />
            ) : (
              <path
                key={seg.index}
                d={seg.path}
                fill={seg.color}
                opacity={0.9}
                onMouseEnter={(e) => handleMouseEnter(e, seg.item)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0.9'}
              />
            )
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
            backgroundColor: colors.surface,
            color: colors.text,
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: `1px solid ${colors.border}`,
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Legenda */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem 0.75rem',
        fontSize: '0.7rem',
        width: '100%',
        paddingTop: '0.5rem',
      }}>
        {data.filter(item => item.value > 0).map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: item.color,
              flexShrink: 0,
              marginTop: '0.1rem'
            }} />
            <span style={{
              color: colors.text,
              fontWeight: '500',
              fontSize: '0.75rem',
              lineHeight: '1.3',
              flex: 1,
            }}>
              {item.name}
            </span>
          </div>
        ))}
      </div>
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
  }, [data]); // Recalcular quando data mudar

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
  }, [data]); // Recalcular quando data mudar

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

// Game Stats Content Component
function GameStatsContent({
  gameStats,
  loading,
  colors,
  statsGridStyle,
  statCardStyle,
  statIconStyle,
  statContentStyle,
  statLabelStyle,
  statValueStyle,
  chartsGridStyle,
  chartCardStyle,
  chartTitleStyle,
  chartContentStyle,
}) {
  const [showScoredModal, setShowScoredModal] = useState(false);
  const [showConcededModal, setShowConcededModal] = useState(false);
  const [chartViewMode, setChartViewMode] = useState('type'); // 'type' ou 'minute'

  const displayStats = gameStats || {
    totalMatches: 0,
    totalGoalsScored: 0,
    totalGoalsConceded: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsScoredByType: [],
    goalsConcededByType: [],
    goalsScoredByMinute: [],
    goalsConcededByMinute: [],
    redCards: 0,
    avgGoalsScored: 0,
    avgGoalsConceded: 0,
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: colors.textSecondary }}>
        Carregando estatísticas de jogos...
      </div>
    );
  }

  if (displayStats.totalMatches === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        color: colors.textSecondary,
        textAlign: 'center',
        gap: '0.5rem',
      }}>
        <Trophy size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: colors.text }}>Nenhum jogo encontrado</h3>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          Não há jogos registrados no período selecionado.
        </p>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          Selecione outro período ou adicione jogos na página de Planejamento.
        </p>
      </div>
    );
  }

  const totalGoals = displayStats.goalsScoredByType.reduce((sum, g) => sum + g.value, 0);
  const totalConceded = displayStats.goalsConcededByType.reduce((sum, g) => sum + g.value, 0);

  // Style compacto para stat cards de jogos
  const compactStatCardStyle = {
    padding: '0.5rem 0.75rem',
    backgroundColor: colors.surface,
    borderRadius: '0.375rem',
    border: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: 0,
  };

  const compactStatIconStyle = {
    width: '28px',
    height: '28px',
    borderRadius: '0.375rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const compactStatValueStyle = {
    fontSize: '1rem',
    fontWeight: '700',
    color: colors.text,
    lineHeight: 1,
  };

  const compactStatLabelStyle = {
    fontSize: '0.65rem',
    color: colors.textSecondary,
    whiteSpace: 'nowrap',
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
    padding: '1.5rem',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
  };

  return (
    <>
      {/* Stats Cards - 5 cards ocupando todo o espaço */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexShrink: 0,
        alignItems: 'stretch',
        width: '100%',
      }}>
        <div style={{ ...compactStatCardStyle, flex: 1 }}>
          <div style={{ ...compactStatIconStyle, backgroundColor: `${colors.primary}15` }}>
            <Trophy size={16} strokeWidth={1.5} style={{ color: colors.primary }} />
          </div>
          <div>
            <div style={compactStatLabelStyle}>Jogos</div>
            <div style={compactStatValueStyle}>{displayStats.totalMatches}</div>
          </div>
        </div>

        <div style={{ ...compactStatCardStyle, flex: 1 }}>
          <div style={{ ...compactStatIconStyle, backgroundColor: '#22c55e15' }}>
            <Goal size={16} strokeWidth={1.5} style={{ color: '#22c55e' }} />
          </div>
          <div>
            <div style={compactStatLabelStyle}>Gols Feitos</div>
            <div style={{ ...compactStatValueStyle, color: '#22c55e' }}>{displayStats.totalGoalsScored}</div>
          </div>
        </div>

        <div style={{ ...compactStatCardStyle, flex: 1 }}>
          <div style={{ ...compactStatIconStyle, backgroundColor: '#ef444415' }}>
            <Shield size={16} strokeWidth={1.5} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <div style={compactStatLabelStyle}>Gols Tomados</div>
            <div style={{ ...compactStatValueStyle, color: '#ef4444' }}>{displayStats.totalGoalsConceded}</div>
          </div>
        </div>

        <div style={{ ...compactStatCardStyle, flex: 1 }}>
          <div style={{ ...compactStatIconStyle, backgroundColor: '#f59e0b15' }}>
            <AlertTriangle size={16} strokeWidth={1.5} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <div style={compactStatLabelStyle}>Expulsões</div>
            <div style={{ ...compactStatValueStyle, color: '#f59e0b' }}>{displayStats.redCards}</div>
          </div>
        </div>

        <div style={{ ...compactStatCardStyle, flex: 1 }}>
          <div style={{ ...compactStatIconStyle, backgroundColor: `${colors.primary}15` }}>
            <TrendingUp size={16} strokeWidth={1.5} style={{ color: colors.primary }} />
          </div>
          <div>
            <div style={compactStatLabelStyle}>Gols/Jogo</div>
            <div style={compactStatValueStyle}>{displayStats.avgGoalsScored}</div>
          </div>
        </div>
      </div>

      {/* Toggle + V/E/D alinhados à esquerda */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
      }}>
        {/* Toggle para alternar entre Tipo e Minuto */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          padding: '0.25rem',
          backgroundColor: colors.surface,
          borderRadius: '0.5rem',
          border: `1px solid ${colors.border}`,
        }}>
        <button
          onClick={() => setChartViewMode('type')}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: chartViewMode === 'type' ? colors.primary : 'transparent',
            color: chartViewMode === 'type' ? '#fff' : colors.textSecondary,
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Target size={14} />
          Tipo de Gol
        </button>
        <button
          onClick={() => setChartViewMode('minute')}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: chartViewMode === 'minute' ? colors.primary : 'transparent',
            color: chartViewMode === 'minute' ? '#fff' : colors.textSecondary,
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Clock size={14} />
          Minuto do Gol
        </button>
        </div>

        {/* V/E/D ao lado do toggle */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          padding: '0.35rem 0.75rem',
          backgroundColor: colors.surface,
          borderRadius: '0.375rem',
          border: `1px solid ${colors.border}`,
          alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#22c55e' }}>{displayStats.wins}</div>
            <div style={{ fontSize: '0.55rem', color: colors.textSecondary }}>Vitórias</div>
          </div>
          <div style={{ width: '1px', height: '20px', backgroundColor: colors.border }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f59e0b' }}>{displayStats.draws}</div>
            <div style={{ fontSize: '0.55rem', color: colors.textSecondary }}>Empates</div>
          </div>
          <div style={{ width: '1px', height: '20px', backgroundColor: colors.border }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444' }}>{displayStats.losses}</div>
            <div style={{ fontSize: '0.55rem', color: colors.textSecondary }}>Derrotas</div>
          </div>
        </div>
      </div>

      {/* Charts Grid - 2 columns responsivo */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '0.75rem',
        flex: 1,
        minHeight: '280px',
        alignItems: 'stretch',
      }}>
        {/* Gols Feitos */}
        <Card style={{ ...chartCardStyle, height: '100%' }}>
          <div style={chartTitleStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Goal size={16} strokeWidth={1.5} style={{ color: '#22c55e' }} />
              <span>Gols Feitos {chartViewMode === 'minute' ? '(por Minuto)' : '(por Tipo)'}</span>
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'visible', minHeight: 0 }}>
            {chartViewMode === 'type' ? (
              displayStats.goalsScoredByType.length > 0 ? (
                <GoalsPieWithList
                  data={displayStats.goalsScoredByType}
                  total={totalGoals}
                  colors={colors}
                  accentColor="#22c55e"
                  onExpand={() => setShowScoredModal(true)}
                />
              ) : (
                <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '2rem', width: '100%' }}>
                  Nenhum gol registrado
                </div>
              )
            ) : (
              displayStats.goalsScoredByMinute?.some(g => g.value > 0) ? (
                <GoalsPieWithList
                  data={displayStats.goalsScoredByMinute.filter(g => g.value > 0)}
                  total={totalGoals}
                  colors={colors}
                  accentColor="#22c55e"
                  onExpand={() => setShowScoredModal(true)}
                  maxItems={6}
                />
              ) : (
                <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '2rem', width: '100%' }}>
                  Nenhum gol registrado
                </div>
              )
            )}
          </div>
        </Card>

        {/* Gols Tomados */}
        <Card style={{ ...chartCardStyle, height: '100%' }}>
          <div style={chartTitleStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Shield size={16} strokeWidth={1.5} style={{ color: '#ef4444' }} />
              <span>Gols Tomados {chartViewMode === 'minute' ? '(por Minuto)' : '(por Tipo)'}</span>
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'visible', minHeight: 0 }}>
            {chartViewMode === 'type' ? (
              displayStats.goalsConcededByType.length > 0 ? (
                <GoalsPieWithList
                  data={displayStats.goalsConcededByType}
                  total={totalConceded}
                  colors={colors}
                  accentColor="#ef4444"
                  onExpand={() => setShowConcededModal(true)}
                />
              ) : (
                <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '2rem', width: '100%' }}>
                  Nenhum gol tomado registrado
                </div>
              )
            ) : (
              displayStats.goalsConcededByMinute?.some(g => g.value > 0) ? (
                <GoalsPieWithList
                  data={displayStats.goalsConcededByMinute.filter(g => g.value > 0)}
                  total={totalConceded}
                  colors={colors}
                  accentColor="#ef4444"
                  onExpand={() => setShowConcededModal(true)}
                  maxItems={6}
                />
              ) : (
                <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '2rem', width: '100%' }}>
                  Nenhum gol tomado registrado
                </div>
              )
            )}
          </div>
        </Card>
      </div>

      {/* Modal Gols Feitos */}
      {showScoredModal && (
        <div style={modalOverlayStyle} onClick={() => setShowScoredModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowScoredModal(false)}
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
              <X size={20} strokeWidth={1.5} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: colors.text, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Goal size={20} style={{ color: '#22c55e' }} />
              Gols Feitos - {chartViewMode === 'minute' ? 'Por Minuto' : 'Por Tipo'}
            </h3>
            <GoalsFullList
              data={chartViewMode === 'type' ? displayStats.goalsScoredByType : displayStats.goalsScoredByMinute?.filter(g => g.value > 0) || []}
              total={totalGoals}
              colors={colors}
              accentColor="#22c55e"
            />
          </div>
        </div>
      )}

      {/* Modal Gols Tomados */}
      {showConcededModal && (
        <div style={modalOverlayStyle} onClick={() => setShowConcededModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowConcededModal(false)}
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
              <X size={20} strokeWidth={1.5} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: colors.text, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} style={{ color: '#ef4444' }} />
              Gols Tomados - {chartViewMode === 'minute' ? 'Por Minuto' : 'Por Tipo'}
            </h3>
            <GoalsFullList
              data={chartViewMode === 'type' ? displayStats.goalsConcededByType : displayStats.goalsConcededByMinute?.filter(g => g.value > 0) || []}
              total={totalConceded}
              colors={colors}
              accentColor="#ef4444"
            />
          </div>
        </div>
      )}
    </>
  );
}

// Pizza + Tabela lado a lado (50% cada)
function GoalsPieWithList({ data, total, colors, accentColor, onExpand, maxItems = 5 }) {
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const displayData = sortedData.slice(0, maxItems);
  const hasMore = sortedData.length > maxItems;

  // Medir o tamanho do container para pizza proporcional
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };

    updateSize();
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Pizza proporcional ao container (50% da largura, usa a menor dimensão disponível)
  const availableWidth = containerSize.width * 0.5;
  const availableHeight = containerSize.height;
  const size = Math.max(120, Math.min(availableWidth * 0.9, availableHeight * 0.9, 220));
  const center = size / 2;
  const radius = (size / 2) * 0.92;

  let currentAngle = -90;
  const segments = data
    .filter(item => item.value > 0)
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
    <div ref={containerRef} style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* Pizza à esquerda - 50% */}
      <div style={{
        flex: '0 0 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width={size} height={size}>
          {segments.map((seg) => (
            seg.isCircle ? (
              <circle
                key={seg.index}
                cx={seg.cx}
                cy={seg.cy}
                r={seg.r}
                fill={seg.color}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => setTooltip({ show: true, content: `${seg.item.name}: ${seg.item.value}`, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip({ show: false, content: '', x: 0, y: 0 })}
              />
            ) : (
              <path
                key={seg.index}
                d={seg.path}
                fill={seg.color}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => setTooltip({ show: true, content: `${seg.item.name}: ${seg.item.value}`, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip({ show: false, content: '', x: 0, y: 0 })}
              />
            )
          ))}
        </svg>

        {tooltip.show && (
          <div style={{
            position: 'fixed',
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
            backgroundColor: colors.surface,
            color: colors.text,
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: `1px solid ${colors.border}`,
            zIndex: 9999,
          }}>
            {tooltip.content}
          </div>
        )}
      </div>

      {/* Tabela à direita - 50% */}
      <div style={{
        flex: '0 0 50%',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        paddingRight: '0.5rem',
      }}>
        {/* Cabeçalho da tabela */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.65rem',
          fontWeight: '600',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: '0.35rem',
          marginBottom: '0.35rem',
        }}>
          <span style={{ width: '14px' }}></span>
          <span style={{ flex: 1 }}>Tipo</span>
          <span style={{ width: '35px', textAlign: 'right' }}>%</span>
          <span style={{ width: '30px', textAlign: 'right' }}>Qtd</span>
        </div>

        {/* Linhas da tabela */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {displayData.map((item, i) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: item.color,
                  flexShrink: 0,
                }} />
                <span style={{
                  flex: 1,
                  color: colors.text,
                  fontWeight: '500',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.name}
                </span>
                <span style={{
                  width: '35px',
                  textAlign: 'right',
                  color: colors.textSecondary,
                  fontSize: '0.7rem',
                }}>
                  {percentage}%
                </span>
                <span style={{
                  width: '30px',
                  textAlign: 'right',
                  fontWeight: '700',
                  color: accentColor,
                }}>
                  {item.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mostrar "ver mais" se houver mais itens */}
        {hasMore && onExpand && (
          <button
            onClick={onExpand}
            style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.7rem',
              color: colors.primary,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            +{sortedData.length - maxItems} mais...
          </button>
        )}
      </div>
    </div>
  );
}

// Lista completa para modal
function GoalsFullList({ data, total, colors, accentColor }) {
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sortedData.map((item, i) => {
        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: colors.background,
              borderRadius: '0.375rem',
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: '600',
              marginRight: '0.75rem',
              flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: colors.text }}>{item.name}</div>
              <div style={{
                height: '4px',
                backgroundColor: colors.border,
                borderRadius: '2px',
                marginTop: '0.35rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: accentColor,
                  borderRadius: '2px',
                }} />
              </div>
            </div>
            <div style={{ marginLeft: '1rem', textAlign: 'right' }}>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: accentColor }}>{item.value}</div>
              <div style={{ fontSize: '0.7rem', color: colors.textSecondary }}>{percentage}%</div>
            </div>
          </div>
        );
      })}
      <div style={{
        marginTop: '0.5rem',
        padding: '0.75rem',
        backgroundColor: `${accentColor}10`,
        borderRadius: '0.375rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.text }}>Total</span>
        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: accentColor }}>{total}</span>
      </div>
    </div>
  );
}

