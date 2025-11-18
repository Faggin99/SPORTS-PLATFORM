import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Users, List, Grid, FileText } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import { athleteService } from '../services/athleteService';
import PlayerModal from '../components/plantel/PlayerModal';
import PlayersTable from '../components/plantel/PlayersTable';
import GroupColumn from '../components/plantel/GroupColumn';
import { generatePlantelPDF } from '../utils/pdfGenerator';

export default function PlantelPage() {
  const { colors } = useTheme();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [groupChanges, setGroupChanges] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('table'); // 'table' or 'groups'
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'position'
  const itemsPerPage = 10;

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    try {
      setLoading(true);
      const data = await athleteService.getAll();
      setAthletes(data);
      setError(null);
    } catch (err) {
      console.error('Error loading athletes:', err);
      setError('Erro ao carregar atletas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = async (data) => {
    try {
      await athleteService.create({
        ...data,
        status: 'active',
        group: null,
      });
      await loadAthletes();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating player:', err);
      throw err;
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleUpdatePlayer = async (id, data) => {
    try {
      await athleteService.update(id, data);
      await loadAthletes();
    } catch (err) {
      console.error('Error updating player:', err);
      throw err;
    }
  };

  const handleSaveEditedPlayer = async (data) => {
    if (editingPlayer) {
      await handleUpdatePlayer(editingPlayer.id, data);
      setEditingPlayer(null);
      setIsModalOpen(false);
    }
  };

  const handleDeletePlayer = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este atleta?')) {
      try {
        await athleteService.delete(id);
        await loadAthletes();
      } catch (err) {
        console.error('Error deleting player:', err);
        alert('Erro ao excluir atleta');
      }
    }
  };

  const handleAthleteMove = (athlete, newGroup) => {
    // Update local state
    setGroupChanges(prev => ({
      ...prev,
      [athlete.id]: newGroup,
    }));
    setHasChanges(true);

    // Update athletes list locally for immediate feedback
    setAthletes(prev =>
      prev.map(a =>
        a.id === athlete.id ? { ...a, group: newGroup } : a
      )
    );
  };

  const handleSaveGroupChanges = async () => {
    try {
      setSaving(true);
      const updates = Object.entries(groupChanges).map(([id, group]) => ({
        id: id, // ID is ULID string, don't parse to int
        group: group === null ? null : String(group),
      }));

      console.log('Sending batch update:', updates);

      if (updates.length > 0) {
        await athleteService.batchUpdateGroups(updates);
        setGroupChanges({});
        setHasChanges(false);
        await loadAthletes();
      }
    } catch (err) {
      console.error('Error saving group changes:', err);
      console.error('Error details:', err.response?.data);
      alert('Erro ao salvar alterações de grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = () => {
    try {
      generatePlantelPDF(athletes);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Erro ao gerar PDF do plantel');
    }
  };

  const getAthletesByGroup = (groupNumber) => {
    return athletes.filter(a => String(a.group) === String(groupNumber));
  };

  // Ordem de posições para ordenação
  const positionOrder = {
    'GR': 1,
    'DD': 2, 'DC': 3, 'DE': 4,
    'MD': 5, 'MC': 6, 'ME': 7, 'MOF': 8,
    'ED': 9, 'EE': 10,
    'PL': 11, 'SA': 12
  };

  // Athletes ordenados e paginados
  const sortedAthletes = useMemo(() => {
    let sorted = [...athletes];

    if (sortBy === 'position') {
      sorted.sort((a, b) => {
        const orderA = positionOrder[a.position] || 999;
        const orderB = positionOrder[b.position] || 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return sorted;
  }, [athletes, sortBy]);

  const paginatedAthletes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAthletes.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAthletes, currentPage]);

  const totalPages = Math.ceil(sortedAthletes.length / itemsPerPage);

  const pageStyle = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexShrink: 0,
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  };

  const sectionStyle = {
    marginBottom: '1rem',
    flexShrink: 0,
  };

  const sectionTitleStyle = {
    fontSize: '1rem',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '0.65rem',
  };

  const tabsContainerStyle = {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  };

  const tabStyle = (isActive) => ({
    padding: '0.65rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: isActive ? colors.primary : colors.text,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${isActive ? colors.primary : 'transparent'}`,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  });

  const contentSectionStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  };

  const groupsContainerStyle = {
    display: 'flex',
    gap: '0.65rem',
    width: '100%',
    height: '100%',
  };

  const paginationStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    padding: '0.75rem',
    flexShrink: 0,
  };

  const pageButtonStyle = (isActive) => ({
    padding: '0.4rem 0.75rem',
    fontSize: '0.875rem',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? colors.primary : colors.text,
    backgroundColor: isActive ? `${colors.primary}15` : 'transparent',
    border: `1px solid ${isActive ? colors.primary : colors.border}`,
    borderRadius: '0.25rem',
    cursor: isActive ? 'default' : 'pointer',
    transition: 'all 0.2s',
  });

  const saveButtonContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem',
    backgroundColor: colors.surface,
    borderRadius: '0.5rem',
    border: `1px solid ${colors.border}`,
  };

  const loadingStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem',
    color: colors.textMuted,
  };

  const errorStyle = {
    padding: '1rem',
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '0.5rem',
    color: '#c33',
    marginBottom: '1rem',
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={loadingStyle}>
          <Users size={40} strokeWidth={1.5} style={{ marginRight: '0.5rem' }} />
          Carregando plantel...
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {error && <div style={errorStyle}>{error}</div>}

      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <Users size={40} strokeWidth={1.5} />
          Plantel de Atletas
        </h1>
        <div style={actionsStyle}>
          <Button
            icon={<FileText size={22} strokeWidth={1.5} />}
            onClick={handleGeneratePDF}
            variant="secondary"
          >
            Gerar PDF
          </Button>
          <Button
            icon={<Plus size={22} strokeWidth={1.5} />}
            onClick={() => {
              setEditingPlayer(null);
              setIsModalOpen(true);
            }}
          >
            Novo Atleta
          </Button>
        </div>
      </div>

      <div style={tabsContainerStyle}>
        <button
          style={tabStyle(activeTab === 'table')}
          onClick={() => setActiveTab('table')}
        >
          <List size={20} strokeWidth={1.5} />
          Lista de Atletas
        </button>
        <button
          style={tabStyle(activeTab === 'groups')}
          onClick={() => setActiveTab('groups')}
        >
          <Grid size={20} strokeWidth={1.5} />
          Grupos de Treino
        </button>
      </div>

      <div style={contentSectionStyle}>
        {activeTab === 'table' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
              <h2 style={sectionTitleStyle}>Lista de Atletas</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: colors.text }}>Ordenar por:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.875rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: colors.background,
                    color: colors.text,
                    cursor: 'pointer',
                  }}
                >
                  <option value="name">Nome</option>
                  <option value="position">Posição</option>
                </select>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <PlayersTable
                players={paginatedAthletes}
                onEdit={handleEditPlayer}
                onDelete={handleDeletePlayer}
              />
            </div>

            {totalPages > 1 && (
              <div style={paginationStyle}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.875rem',
                    color: currentPage === 1 ? colors.textMuted : colors.text,
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.25rem',
                    cursor: currentPage === 1 ? 'default' : 'pointer',
                  }}
                >
                  Anterior
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={pageButtonStyle(currentPage === page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.875rem',
                    color: currentPage === totalPages ? colors.textMuted : colors.text,
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.25rem',
                    cursor: currentPage === totalPages ? 'default' : 'pointer',
                  }}
                >
                  Próximo
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexShrink: 0 }}>
              <h2 style={sectionTitleStyle}>Grupos de Treino</h2>
              {hasChanges && (
                <Button
                  icon={<Save size={20} strokeWidth={1.5} />}
                  onClick={handleSaveGroupChanges}
                  disabled={saving}
                  size="sm"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              )}
            </div>

            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <div style={groupsContainerStyle}>
                <GroupColumn
                  groupNumber={null}
                  groupName="Sem Grupo"
                  athletes={getAthletesByGroup(null)}
                  onAthleteMove={handleAthleteMove}
                />
                <GroupColumn
                  groupNumber="1"
                  groupName="Grupo 1"
                  athletes={getAthletesByGroup('1')}
                  onAthleteMove={handleAthleteMove}
                />
                <GroupColumn
                  groupNumber="2"
                  groupName="Grupo 2"
                  athletes={getAthletesByGroup('2')}
                  onAthleteMove={handleAthleteMove}
                />
                <GroupColumn
                  groupNumber="3"
                  groupName="Grupo 3"
                  athletes={getAthletesByGroup('3')}
                  onAthleteMove={handleAthleteMove}
                />
                <GroupColumn
                  groupNumber="Transição"
                  groupName="Transição"
                  athletes={getAthletesByGroup('Transição')}
                  onAthleteMove={handleAthleteMove}
                />
                <GroupColumn
                  groupNumber="DM"
                  groupName="DM"
                  athletes={getAthletesByGroup('DM')}
                  onAthleteMove={handleAthleteMove}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <PlayerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlayer(null);
        }}
        onSave={editingPlayer ? handleSaveEditedPlayer : handleCreatePlayer}
        player={editingPlayer}
      />
    </div>
  );
}
