import { useState, useEffect } from 'react';
import { X, Trophy, Users, Plus, Trash2, Goal, Shield, AlertTriangle, Clock, Edit2, UserPlus, Download, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { EventModal } from './EventModal';
import { gameService } from '../../services/gameService';
import { useAthletes } from '../../modules/training-management/hooks/useAthletes';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function GameModal({ isOpen, onClose, session, onSave }) {
  const { colors } = useTheme();
  const { athletes } = useAthletes();

  const [opponentName, setOpponentName] = useState('');
  const [matchDuration, setMatchDuration] = useState(90);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sub-modais
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => {
    if (isOpen && session) {
      loadMatchData();
    }
  }, [isOpen, session]);

  const loadMatchData = async () => {
    if (!session?.id) return;

    setLoading(true);
    try {
      // Carregar dados existentes
      setOpponentName(session.opponent_name || '');
      setMatchDuration(session.match_duration || 90);

      const matchData = await gameService.getMatchData(session.id);

      setSelectedPlayers(matchData.players.map(p => ({
        athlete_id: p.athlete_id,
        status: p.status,
        minutes_played: p.minutes_played || 0,
        athlete: p.athlete,
        name: p.athlete?.name,
        jersey_number: p.athlete?.jersey_number,
      })));

      setEvents(matchData.events.map(e => ({
        id: e.id,
        event_type: e.event_type,
        team: e.team,
        goal_type: e.goal_type,
        minute: e.minute,
        player: e.player,
      })));
    } catch (error) {
      console.error('Erro ao carregar dados do jogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session?.id) return;

    setSaving(true);
    try {
      await gameService.saveAllMatchData(session.id, {
        opponent_name: opponentName,
        match_duration: matchDuration,
        players: selectedPlayers,
        events: events,
      });

      onSave?.({
        opponent_name: opponentName,
        match_duration: matchDuration,
      });

      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados do jogo');
    } finally {
      setSaving(false);
    }
  };

  const handlePlayersConfirm = (players) => {
    setSelectedPlayers(players.map(p => ({
      ...p,
      minutes_played: selectedPlayers.find(sp => sp.athlete_id === p.athlete_id)?.minutes_played || 0,
    })));
    setShowPlayerModal(false);
  };

  const handleAddEvent = (event) => {
    setEvents([...events, { ...event, id: Date.now() }]);
    setShowEventModal(false);
  };

  const handleRemoveEvent = (eventId) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const updatePlayerMinutes = (athleteId, minutes) => {
    const value = parseInt(minutes) || 0;
    // Não permitir valor maior que a duração do jogo
    const clampedValue = Math.min(Math.max(value, 0), matchDuration);
    setSelectedPlayers(selectedPlayers.map(p =>
      p.athlete_id === athleteId ? { ...p, minutes_played: clampedValue } : p
    ));
  };

  if (!isOpen) return null;

  const starters = selectedPlayers.filter(p => p.status === 'starter');
  const substitutes = selectedPlayers.filter(p => p.status === 'substitute');

  const goalsScored = events.filter(e => e.event_type === 'goal_scored').length;
  const goalsConceded = events.filter(e => e.event_type === 'goal_conceded').length;

  const getEventIcon = (type) => {
    switch (type) {
      case 'goal_scored': return <Goal size={16} color="#22c55e" />;
      case 'goal_conceded': return <Shield size={16} color="#ef4444" />;
      case 'red_card': return <AlertTriangle size={16} color="#dc2626" />;
      default: return null;
    }
  };

  const getEventLabel = (event) => {
    switch (event.event_type) {
      case 'goal_scored': return 'Gol Feito';
      case 'goal_conceded': return 'Gol Tomado';
      case 'red_card': return `Expulsão (${event.team === 'own' ? 'Nosso' : 'Adv.'})`;
      default: return '';
    }
  };

  const getGoalTypeLabel = (goalType) => {
    const types = {
      'offensive_org': 'Org. Ofensiva',
      'offensive_transition': 'Transição Of.',
      'free_kick': 'Falta',
      'corner': 'Escanteio',
      'penalty': 'Pênalti',
    };
    return types[goalType] || '';
  };

  const exportToPdf = () => {
    if (selectedPlayers.length === 0) {
      alert('Selecione jogadores antes de exportar');
      return;
    }

    const gameDate = session?.date ? session.date.split('-').reverse().join('/') : '';
    const opponent = opponentName || 'Adversário';

    // Criar documento PDF em formato A4 retrato
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Configurações de cores
    const primaryColor = [41, 128, 185]; // Azul profissional
    const secondaryColor = [52, 73, 94]; // Cinza escuro
    const headerBgColor = [236, 240, 241]; // Cinza claro
    const starterColor = [34, 197, 94]; // Verde
    const substituteColor = [245, 158, 11]; // Laranja

    const pageWidth = doc.internal.pageSize.width;

    // Título do documento
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('CONVOCAÇÃO', pageWidth / 2, 20, { align: 'center' });

    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`Jogo do dia ${gameDate}`, pageWidth / 2, 28, { align: 'center' });

    // Adversário
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`vs ${opponent}`, pageWidth / 2, 36, { align: 'center' });

    let currentY = 48;

    // Seção de Titulares
    if (starters.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...starterColor);
      doc.text(`TITULARES (${starters.length})`, 14, currentY);
      currentY += 3;

      const startersTableData = starters.map((p, idx) => [
        idx + 1,
        p.jersey_number || '-',
        p.name || p.athlete?.name,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Camisa', 'Nome']],
        body: startersTableData,
        theme: 'striped',
        headStyles: {
          fillColor: starterColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [50, 50, 50],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
      });

      currentY = doc.lastAutoTable.finalY + 10;
    }

    // Seção de Reservas
    if (substitutes.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...substituteColor);
      doc.text(`RESERVAS (${substitutes.length})`, 14, currentY);
      currentY += 3;

      const substitutesTableData = substitutes.map((p, idx) => [
        starters.length + idx + 1,
        p.jersey_number || '-',
        p.name || p.athlete?.name,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Camisa', 'Nome']],
        body: substitutesTableData,
        theme: 'striped',
        headStyles: {
          fillColor: substituteColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [50, 50, 50],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
      });

      currentY = doc.lastAutoTable.finalY + 10;
    }

    // Resumo
    doc.setFillColor(...headerBgColor);
    doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('RESUMO', 20, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total de Jogadores: ${selectedPlayers.length}`, 20, currentY + 13);
    doc.text(`Titulares: ${starters.length}`, 80, currentY + 13);
    doc.text(`Reservas: ${substitutes.length}`, 130, currentY + 13);

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const generatedDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Gerado em: ${generatedDate}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

    // Gerar nome do arquivo
    const fileName = `Convocacao_${opponent.replace(/\s+/g, '_')}_${gameDate.replace(/\//g, '-')}.pdf`;

    // Download
    doc.save(fileName);
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
    backdropFilter: 'blur(2px)',
  };

  const modalStyle = {
    backgroundColor: colors.background,
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '1100px',
    height: 'auto',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: `1px solid ${colors.border}`,
  };

  const headerStyle = {
    padding: '1rem 1.5rem',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  };

  const contentStyle = {
    flex: 1,
    overflow: 'auto',
    padding: '1rem 1.5rem',
  };

  const footerStyle = {
    padding: '1rem 1.5rem',
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    flexShrink: 0,
  };

  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '0.375rem',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: '0.9rem',
    outline: 'none',
  };

  const sectionStyle = {
    backgroundColor: colors.surface,
    borderRadius: '0.5rem',
    border: `1px solid ${colors.border}`,
    padding: '1rem',
    height: '100%',
  };

  const sectionTitleStyle = {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const playerRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0',
    borderBottom: `1px solid ${colors.border}20`,
  };

  const eventRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: colors.background,
    borderRadius: '0.375rem',
    marginBottom: '0.5rem',
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Trophy size={24} style={{ color: colors.primary }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: colors.text }}>
                  Dados do Jogo
                </h2>
                <span style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
                  {session?.day_name} - {session?.date ? session.date.split('-').reverse().join('/') : ''}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: colors.textSecondary,
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div style={contentStyle}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: colors.textSecondary }}>
                Carregando...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Row 1: Adversário e Duração */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 200px',
                  gap: '1rem',
                  alignItems: 'end',
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '500', color: colors.text }}>
                      Adversário
                    </label>
                    <input
                      type="text"
                      value={opponentName}
                      onChange={(e) => setOpponentName(e.target.value)}
                      placeholder="Nome do adversário..."
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '500', color: colors.text }}>
                      Duração (min)
                    </label>
                    <input
                      type="number"
                      value={matchDuration}
                      onChange={(e) => setMatchDuration(parseInt(e.target.value) || 90)}
                      min="1"
                      max="150"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Placar resumido */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '2rem',
                  padding: '0.75rem',
                  backgroundColor: `${colors.primary}10`,
                  borderRadius: '0.5rem',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22c55e' }}>{goalsScored}</div>
                    <div style={{ fontSize: '0.7rem', color: colors.textSecondary }}>Gols Feitos</div>
                  </div>
                  <div style={{
                    width: '1px',
                    backgroundColor: colors.border,
                    margin: '0 1rem',
                  }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>{goalsConceded}</div>
                    <div style={{ fontSize: '0.7rem', color: colors.textSecondary }}>Gols Tomados</div>
                  </div>
                </div>

                {/* Row 2: Jogadores e Eventos lado a lado */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  minHeight: '300px',
                }}>
                  {/* Coluna Esquerda: Jogadores */}
                  <div style={sectionStyle}>
                    <div style={{ ...sectionTitleStyle, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={18} color={colors.primary} />
                        <span>Jogadores ({selectedPlayers.length})</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {selectedPlayers.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={exportToPdf}
                            icon={<FileText size={14} />}
                            title="Exportar convocação para PDF"
                          >
                            PDF
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowPlayerModal(true)}
                          icon={<UserPlus size={14} />}
                        >
                          Selecionar
                        </Button>
                      </div>
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      {selectedPlayers.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          padding: '2rem 1rem',
                          color: colors.textSecondary,
                          fontSize: '0.85rem',
                        }}>
                          Nenhum jogador selecionado
                          <br />
                          <span style={{ fontSize: '0.75rem' }}>
                            Clique em "Selecionar" para adicionar
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* Titulares */}
                          {starters.length > 0 && (
                            <div style={{ marginBottom: '0.75rem' }}>
                              <div style={{
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                color: '#22c55e',
                                marginBottom: '0.25rem',
                                textTransform: 'uppercase',
                              }}>
                                Titulares ({starters.length})
                              </div>
                              {starters.map((player) => (
                                <div key={player.athlete_id} style={playerRowStyle}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: '#22c55e20',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: '600',
                                    color: '#22c55e',
                                    flexShrink: 0,
                                  }}>
                                    {player.jersey_number || '-'}
                                  </div>
                                  <span style={{
                                    flex: 1,
                                    fontSize: '0.8rem',
                                    color: colors.text,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}>
                                    {player.name || player.athlete?.name}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                                    <input
                                      type="number"
                                      value={player.minutes_played}
                                      onChange={(e) => updatePlayerMinutes(player.athlete_id, e.target.value)}
                                      min="0"
                                      max={matchDuration}
                                      style={{
                                        width: '45px',
                                        padding: '0.2rem 0.3rem',
                                        borderRadius: '0.25rem',
                                        border: `1px solid ${colors.border}`,
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        fontSize: '0.75rem',
                                        textAlign: 'center',
                                      }}
                                    />
                                    <span style={{ fontSize: '0.65rem', color: colors.textSecondary }}>min</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reservas */}
                          {substitutes.length > 0 && (
                            <div>
                              <div style={{
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                color: '#f59e0b',
                                marginBottom: '0.25rem',
                                textTransform: 'uppercase',
                              }}>
                                Reservas ({substitutes.length})
                              </div>
                              {substitutes.map((player) => (
                                <div key={player.athlete_id} style={playerRowStyle}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: '#f59e0b20',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: '600',
                                    color: '#f59e0b',
                                    flexShrink: 0,
                                  }}>
                                    {player.jersey_number || '-'}
                                  </div>
                                  <span style={{
                                    flex: 1,
                                    fontSize: '0.8rem',
                                    color: colors.text,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}>
                                    {player.name || player.athlete?.name}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                                    <input
                                      type="number"
                                      value={player.minutes_played}
                                      onChange={(e) => updatePlayerMinutes(player.athlete_id, e.target.value)}
                                      min="0"
                                      max={matchDuration}
                                      style={{
                                        width: '45px',
                                        padding: '0.2rem 0.3rem',
                                        borderRadius: '0.25rem',
                                        border: `1px solid ${colors.border}`,
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        fontSize: '0.75rem',
                                        textAlign: 'center',
                                      }}
                                    />
                                    <span style={{ fontSize: '0.65rem', color: colors.textSecondary }}>min</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Coluna Direita: Eventos */}
                  <div style={sectionStyle}>
                    <div style={{ ...sectionTitleStyle, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Goal size={18} color={colors.primary} />
                        <span>Eventos ({events.length})</span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowEventModal(true)}
                        icon={<Plus size={14} />}
                      >
                        Adicionar
                      </Button>
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      {events.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          padding: '2rem 1rem',
                          color: colors.textSecondary,
                          fontSize: '0.85rem',
                        }}>
                          Nenhum evento registrado
                          <br />
                          <span style={{ fontSize: '0.75rem' }}>
                            Clique em "Adicionar" para registrar gols e cartões
                          </span>
                        </div>
                      ) : (
                        events
                          .sort((a, b) => a.minute - b.minute)
                          .map((event) => (
                          <div key={event.id} style={eventRowStyle}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: colors.surface,
                              border: `1px solid ${colors.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {getEventIcon(event.event_type)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: '500', color: colors.text }}>
                                {getEventLabel(event)}
                                {event.goal_type && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    color: colors.textSecondary,
                                    fontWeight: '400',
                                    marginLeft: '0.5rem'
                                  }}>
                                    ({getGoalTypeLabel(event.goal_type)})
                                  </span>
                                )}
                              </div>
                              <div style={{
                                fontSize: '0.7rem',
                                color: colors.textSecondary,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}>
                                <Clock size={10} />
                                {event.minute}'
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveEvent(event.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                color: colors.textSecondary,
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-modais */}
      <PlayerSelectionModal
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        athletes={athletes}
        selectedPlayers={selectedPlayers}
        onConfirm={handlePlayersConfirm}
      />

      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onAdd={handleAddEvent}
        matchDuration={matchDuration}
      />
    </>
  );
}
