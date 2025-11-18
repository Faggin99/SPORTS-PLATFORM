import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Moon, Trophy } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { Tooltip } from '../components/common/Tooltip';
import { UnifiedTrainingModal } from '../components/training/UnifiedTrainingModal';
import { TrainingSummaryModal } from '../components/training/TrainingSummaryModal';
import { CreateTitleModal } from '../components/training/CreateTitleModal';
import { SessionTypeModal } from '../components/training/SessionTypeModal';
import { WeekCalendar } from '../components/training/WeekCalendar';
import { trainingService } from '../services/trainingService';

export function TrainingPage() {
  const { colors } = useTheme();
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Try to load saved week from localStorage
    const savedWeek = localStorage.getItem('selectedTrainingWeek');
    if (savedWeek) {
      try {
        const { startDate } = JSON.parse(savedWeek);
        return getWeekInfo(new Date(startDate));
      } catch (e) {
        // If parsing fails, fall back to current week
        return getWeekInfo(new Date());
      }
    }
    return getWeekInfo(new Date());
  });
  const [microcycle, setMicrocycle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [initialModalTab, setInitialModalTab] = useState(0);
  const [showCreateTitle, setShowCreateTitle] = useState(false);
  const [showWeekCalendar, setShowWeekCalendar] = useState(false);
  const [showSessionTypeModal, setShowSessionTypeModal] = useState(false);
  const [microcycleCache, setMicrocycleCache] = useState({});

  useEffect(() => {
    loadMicrocycle();
  }, [currentWeek]);

  // Save selected week to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedTrainingWeek', JSON.stringify({
      identifier: currentWeek.identifier,
      startDate: currentWeek.startDate.toISOString(),
    }));
  }, [currentWeek]);

  async function loadMicrocycle() {
    // Check cache first
    const cacheKey = currentWeek.identifier;
    if (microcycleCache[cacheKey]) {
      setMicrocycle(microcycleCache[cacheKey]);
      setInitialLoad(false);
      return;
    }

    setLoading(true);
    try {
      const data = await trainingService.getMicrocycle(currentWeek.identifier);
      setMicrocycle(data);
      // Cache the result
      setMicrocycleCache(prev => ({
        ...prev,
        [cacheKey]: data,
      }));
    } catch (error) {
      console.error('Error loading microcycle:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }

  function getWeekInfo(date) {
    // Use local date (Brazil timezone) for week calculation
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayNum = d.getDay() || 7; // Get day of week (1=Mon, 7=Sun)

    // Adjust to Thursday of current week for ISO week calculation
    const thursday = new Date(d);
    thursday.setDate(d.getDate() + (4 - dayNum));

    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);

    return {
      year: thursday.getFullYear(),
      week: weekNo,
      identifier: `${thursday.getFullYear()}-${String(weekNo).padStart(2, '0')}`,
      startDate: getMonday(date),
    };
  }

  function getMonday(d) {
    // Get Monday of the week in local timezone (Brazil)
    const date = new Date(d);
    const day = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0); // Set to start of day
    return monday;
  }

  function navigateWeek(direction) {
    const newDate = new Date(currentWeek.startDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeek(getWeekInfo(newDate));
  }

  function isToday(dateString) {
    const today = new Date();
    const sessionDate = new Date(dateString);
    return today.toDateString() === sessionDate.toDateString();
  }

  function abbreviateContent(contentName) {
    const abbreviations = {
      'Bola Parada Ofensiva': 'BP Of',
      'Bola Parada Defensiva': 'BP Def',
      'Transição Ofensiva': 'Trans Of',
      'Transição Defensiva': 'Trans Def',
      'Organização Ofensiva': 'Org Of',
      'Organização Defensiva': 'Org Def',
    };
    return abbreviations[contentName] || contentName;
  }

  function getDayContentsSummary(session) {
    if (!session?.blocks) return [];

    // Count occurrences of each content
    const contentCounts = {};
    session.blocks.forEach(block => {
      if (block.activity?.contents) {
        block.activity.contents.forEach(content => {
          // Ignore "Físico" and "Todos"
          if (content.name !== 'Físico' && content.name !== 'Todos') {
            contentCounts[content.name] = (contentCounts[content.name] || 0) + 1;
          }
        });
      }
    });

    // Sort by frequency (descending) and return objects with abbreviation and full name
    return Object.entries(contentCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => ({
        abbreviated: abbreviateContent(name),
        full: name
      }));
  }

  function getTotalDuration(session) {
    if (!session?.blocks) return 0;

    return session.blocks.reduce((total, block) => {
      const duration = block.activity?.duration_minutes || 0;
      return total + parseInt(duration);
    }, 0);
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  };

  const weekNavStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const weekTitleStyle = {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: colors.text,
  };

  const calendarStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridAutoRows: '1fr',
    gap: '0.5rem',
    height: '100%',
    overflow: 'auto',
  };

  const dayColumnStyle = {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr auto', // header, summary, blocks area, duration
    gap: '0.3rem',
    minHeight: 0,
    height: '100%',
  };

  const dayHeaderStyle = (isCurrentDay = false) => ({
    padding: '0.5rem',
    backgroundColor: isCurrentDay ? '#10b981' : colors.primary,
    color: '#ffffff',
    borderRadius: '0.375rem',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '0.875rem',
    boxShadow: isCurrentDay ? '0 0 0 2px rgba(16, 185, 129, 0.5)' : 'none',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  });

  const blockStyle = {
    padding: '0.4rem',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    flex: '1 1 0',
    minHeight: '0',
  };

  const blockNameStyle = {
    fontSize: '0.65rem',
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: '0.2rem',
  };

  const blockContentStyle = {
    fontSize: '0.7rem',
    color: colors.textMuted,
  };

  const contentsSummaryStyle = {
    padding: '0.4rem 0.5rem',
    backgroundColor: `${colors.primary}10`,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '0.3rem',
    overflow: 'hidden',
    cursor: 'default',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  };

  const durationBadgeStyle = {
    padding: '0.4rem 0.5rem',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    fontSize: '0.8rem',
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    flexShrink: 0,
  };

  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  // Show initial loading without content
  if (initialLoad && loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: colors.text }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Loading overlay - only shows when reloading with existing data */}
      <LoadingOverlay isLoading={loading && !initialLoad} message="Atualizando..." />
      <div style={headerStyle}>
        <div style={weekNavStyle}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateWeek(-1)}
            icon={<ChevronLeft size={24} strokeWidth={1.5} />}
          />
          <div style={{ position: 'relative' }}>
            <h1
              style={{ ...weekTitleStyle, cursor: 'pointer' }}
              onClick={() => setShowWeekCalendar(!showWeekCalendar)}
            >
              Microciclo {currentWeek.week}/{currentWeek.year}
            </h1>
            {showWeekCalendar && (
              <WeekCalendar
                currentWeek={currentWeek}
                onWeekSelect={(week) => {
                  setCurrentWeek(week);
                  setShowWeekCalendar(false);
                }}
                onClose={() => setShowWeekCalendar(false)}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateWeek(1)}
            icon={<ChevronRight size={24} strokeWidth={1.5} />}
          />
        </div>

        <Button icon={<Plus size={22} strokeWidth={1.5} />} onClick={() => setShowCreateTitle(true)}>
          Cadastrar Novo Tema
        </Button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={calendarStyle}>
          {microcycle?.sessions?.map((session, dayIndex) => {
            const currentDay = isToday(session.date);
            return (
              <div key={session.id} style={dayColumnStyle}>
                <div
                  style={dayHeaderStyle(currentDay)}
                  onClick={() => {
                    setSelectedSession(session);
                    setShowSummaryModal(true);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedSession(session);
                    setShowSessionTypeModal(true);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = currentDay
                      ? '0 4px 12px rgba(16, 185, 129, 0.4)'
                      : `0 4px 12px ${colors.primary}60`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = currentDay
                      ? '0 0 0 2px rgba(16, 185, 129, 0.5)'
                      : 'none';
                  }}
                  title="Clique esquerdo: Ver resumo | Clique direito: Tipo de sessão"
                >
                  {session.day_name}
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.25rem' }}>
                    {new Date(session.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>

                {/* Contents Summary - Always visible for alignment */}
                <Tooltip
                  content={
                    getDayContentsSummary(session).length > 0
                      ? getDayContentsSummary(session).map(c => c.full).join(' | ')
                      : null
                  }
                  position="bottom"
                  delay={400}
                  maxWidth={200}
                >
                  <div
                    style={contentsSummaryStyle}
                    onMouseEnter={(e) => {
                      if (getDayContentsSummary(session).length > 0) {
                        e.currentTarget.style.backgroundColor = `${colors.primary}20`;
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = `0 2px 8px ${colors.primary}40`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${colors.primary}10`;
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {getDayContentsSummary(session).map(c => c.abbreviated).join(' | ') || '\u00A0'}
                  </div>
                </Tooltip>

              {/* Blocks container - third row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {(() => {
                const sessionType = session.session_type || 'training';

                // DESCANSO - Bloco único
                if (sessionType === 'rest') {
                  return (
                    <div
                      style={{
                        ...blockStyle,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        color: colors.textSecondary,
                        gap: '0.5rem',
                      }}
                    >
                      <Moon size={48} strokeWidth={1.5} />
                      <div>Descanso</div>
                    </div>
                  );
                }

                // JOGO - Nome do adversário + Bloco "Não relacionados"
                if (sessionType === 'match') {
                  return (
                    <>
                      {/* Informação do Jogo - ocupa 5/6 do espaço */}
                      <div
                        style={{
                          ...blockStyle,
                          flex: '5 1 0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          fontWeight: '600',
                          color: colors.text,
                          gap: '0.5rem',
                        }}
                      >
                        <Trophy size={48} strokeWidth={1.5} />
                        <div>JOGO</div>
                        {session.opponent_name && (
                          <div style={{ fontSize: '1rem', color: colors.textSecondary }}>
                            vs {session.opponent_name}
                          </div>
                        )}
                      </div>

                      {/* Bloco "Não relacionados" - ocupa 1/6 do espaço */}
                      {session.blocks && session.blocks.length > 0 && (
                        <div
                          style={{
                            ...blockStyle,
                            flex: '1 1 0',
                          }}
                          onClick={() => {
                            setSelectedSession(session);
                            setInitialModalTab(0);
                            setShowUnifiedModal(true);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = colors.primary;
                            e.currentTarget.style.backgroundColor = colors.surfaceHover;
                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = colors.border;
                            e.currentTarget.style.backgroundColor = colors.surface;
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={blockNameStyle}>Não relacionados</div>
                          {session.blocks[0]?.activity ? (
                            <div style={{ fontSize: '0.7rem', color: colors.text, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              {session.blocks[0].activity.title?.title && (
                                <Tooltip
                                  content={session.blocks[0].activity.title.title}
                                  position="bottom"
                                  delay={400}
                                  maxWidth={180}
                                >
                                  <div style={{ fontWeight: '600', display: 'block', width: '100%' }}>
                                    {session.blocks[0].activity.title.title}
                                  </div>
                                </Tooltip>
                              )}
                              {session.blocks[0].activity.contents?.length > 0 && (
                                <Tooltip
                                  content={session.blocks[0].activity.contents.map(c => c.name).join(' | ')}
                                  position="bottom"
                                  delay={400}
                                  maxWidth={180}
                                >
                                  <div style={{ fontSize: '0.65rem', color: colors.textSecondary, display: 'block', width: '100%' }}>
                                    {session.blocks[0].activity.contents.map(c => abbreviateContent(c.name)).join(', ')}
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          ) : (
                            <div style={blockContentStyle}>Clique para editar</div>
                          )}
                        </div>
                      )}
                    </>
                  );
                }

                // TREINO NORMAL - 6 blocos
                return session.blocks?.map((block, blockIndex) => (
                  <div
                    key={block.id}
                    style={blockStyle}
                    onClick={() => {
                      setSelectedSession(session);
                      setInitialModalTab(blockIndex);
                      setShowUnifiedModal(true);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.backgroundColor = colors.surfaceHover;
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.backgroundColor = colors.surface;
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={blockNameStyle}>{block.name}</div>
                    {block.activity ? (
                      <div style={{ fontSize: '0.7rem', color: colors.text, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {block.activity.title?.title && (
                          <Tooltip
                            content={block.activity.title.title}
                            position="bottom"
                            delay={400}
                            maxWidth={180}
                          >
                            <div style={{ fontWeight: '600', display: 'block', width: '100%' }}>
                              {block.activity.title.title}
                            </div>
                          </Tooltip>
                        )}
                        {block.activity.contents?.length > 0 && (
                          <Tooltip
                            content={block.activity.contents.map(c => c.name).join(' | ')}
                            position="bottom"
                            delay={400}
                            maxWidth={180}
                          >
                            <div style={{ fontSize: '0.65rem', color: colors.textSecondary, display: 'block', width: '100%' }}>
                              {block.activity.contents.map(c => abbreviateContent(c.name)).join(', ')}
                            </div>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <div style={blockContentStyle}>Clique para editar</div>
                    )}
                  </div>
                ));
              })()}
              </div>

              {/* Duration Badge - always visible to maintain alignment - fourth row */}
              <div style={durationBadgeStyle}>
                <span>⏱</span>
                <span>{getTotalDuration(session)} min</span>
              </div>
              </div>
            );
          })}
        </div>
      </div>

      <UnifiedTrainingModal
        isOpen={showUnifiedModal}
        onClose={() => setShowUnifiedModal(false)}
        session={selectedSession}
        initialTab={initialModalTab}
        isMatchDay={selectedSession?.session_type === 'match'}
        onSave={async (data) => {
          console.log('Saving unified training data:', data);
          try {
            // Save each block's activity
            for (const [blockId, activityData] of Object.entries(data.blockData)) {
              // Skip empty blocks
              if (!activityData.titleId && !activityData.description &&
                  activityData.selectedContents.length === 0 &&
                  activityData.selectedStages.length === 0) {
                continue;
              }

              // Convert camelCase to snake_case for backend
              const backendData = {
                ...activityData,
                duration_minutes: activityData.durationMinutes,
                // Ensure groups is always an array, never null
                groups: activityData.selectedGroups || [],
              };
              delete backendData.durationMinutes;
              delete backendData.selectedGroups;

              // Find the block to check if it has an existing activity
              const block = selectedSession?.blocks?.find(b => b.id === blockId);

              if (block?.activity?.id) {
                // Update existing activity
                await trainingService.updateActivity(block.activity.id, backendData);
              } else {
                // Create new activity
                await trainingService.createActivity({
                  ...backendData,
                  block_id: blockId,
                });
              }
            }

            // Upload files to session
            if (data.files && data.files.length > 0) {
              console.log('Uploading files:', data.files.length);
              for (const fileData of data.files) {
                try {
                  await trainingService.uploadSessionFile(selectedSession.id, fileData.file, fileData.title);
                } catch (error) {
                  console.error('Error uploading file:', fileData.name, error);
                  // Continue with other files even if one fails
                }
              }
            }

            // Invalidate cache for this week to force fresh data
            const cacheKey = currentWeek.identifier;
            setMicrocycleCache(prev => {
              const newCache = { ...prev };
              delete newCache[cacheKey];
              return newCache;
            });

            // Reload data first, then close modal
            await loadMicrocycle();
            setShowUnifiedModal(false);
          } catch (error) {
            console.error('Error saving training data:', error);
            alert('Erro ao salvar treino: ' + error.message);
          }
        }}
      />

      <CreateTitleModal
        isOpen={showCreateTitle}
        onClose={() => setShowCreateTitle(false)}
        onSave={() => setShowCreateTitle(false)}
      />

      <TrainingSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        session={selectedSession}
      />

      <SessionTypeModal
        isOpen={showSessionTypeModal}
        onClose={() => setShowSessionTypeModal(false)}
        session={selectedSession}
        onSave={async (data) => {
          try {
            await trainingService.updateSessionType(selectedSession.id, data);
            setShowSessionTypeModal(false);
            // Invalidate cache and reload microcycle
            const cacheKey = currentWeek.identifier;
            setMicrocycleCache(prev => {
              const newCache = { ...prev };
              delete newCache[cacheKey];
              return newCache;
            });
            await loadMicrocycle();
          } catch (error) {
            console.error('Error updating session type:', error);
            alert('Erro ao atualizar tipo de sessão');
          }
        }}
      />
    </div>
  );
}
