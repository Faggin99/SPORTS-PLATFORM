import { useState, useEffect } from 'react';
import { Save, Trash2, Plus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { MultiSelect } from '../common/MultiSelect';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { trainingService } from '../../services/trainingService';
import { CreateTitleModal } from './CreateTitleModal';

export function ActivityModal({ isOpen, onClose, onSave, block, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [contents, setContents] = useState([]);
  const [stages, setStages] = useState([]);
  const [titles, setTitles] = useState([]);
  const [showCreateTitle, setShowCreateTitle] = useState(false);

  const [formData, setFormData] = useState({
    selectedContents: [],
    selectedStages: [],
    titleId: '',
    description: '',
    group: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Reset state when modal closes
      setFormData({
        selectedContents: [],
        selectedStages: [],
        titleId: '',
        description: '',
        group: '',
      });
      setContents([]);
      setStages([]);
      setTitles([]);
    }
  }, [isOpen, block]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [contentsRes, stagesRes, titlesRes] = await Promise.all([
        trainingService.getContents(),
        trainingService.getStages(),
        trainingService.getTitles(),
      ]);

      const loadedContents = contentsRes || [];
      const loadedStages = stagesRes || [];
      const loadedTitles = Array.isArray(titlesRes) ? titlesRes : titlesRes?.data || [];

      setContents(loadedContents);
      setStages(loadedStages);
      setTitles(loadedTitles);

      // Now map activity data to form
      const activity = block?.activity;

      if (activity) {
        // Map saved stage_names to stage IDs
        const stageIds = activity.stages
          ?.map(activityStage => {
            const globalStage = loadedStages.find(s => s.name === activityStage.stage_name);
            return globalStage?.id;
          })
          .filter(id => id) || []; // Remove nulls

        setFormData({
          selectedContents: activity.contents?.map((c) => c.id) || [],
          selectedStages: stageIds,
          titleId: activity.title_id || '',
          description: activity.description || '',
          group: activity.groups?.[0] || '',
        });
      } else {
        // Reset form for new activity
        setFormData({
          selectedContents: [],
          selectedStages: [],
          titleId: '',
          description: '',
          group: '',
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setContents([]);
      setStages([]);
      setTitles([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Erro ao salvar atividade: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir esta atividade?')) {
      await onDelete();
      onClose();
    }
  };

  const handleCreateTitle = (newTitle) => {
    const titleData = newTitle?.data || newTitle;
    setTitles([...titles, titleData]);
    setFormData({ ...formData, titleId: titleData.id });
    setShowCreateTitle(false);
  };

  const groupOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'g1', label: 'G1' },
    { value: 'g2', label: 'G2' },
    { value: 'g3', label: 'G3' },
    { value: 'g4', label: 'G4' },
  ];

  // Filter out "Descanso" from contents
  const filteredContents = contents.filter((c) => c.name !== 'Descanso');

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={block?.activity ? `Editar - ${block.name}` : `Nova Atividade - ${block?.name || ''}`}
        size="md"
        footer={
          <>
            {block?.activity && onDelete && (
              <Button variant="danger" onClick={handleDelete} icon={<Trash2 size={18} />}>
                Excluir
              </Button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} icon={<Save size={18} />}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </>
        }
      >
        {isLoadingData ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            Carregando dados...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <MultiSelect
              label="Conteúdos"
              options={filteredContents.map((c) => ({ value: c.id, label: c.name }))}
              value={formData.selectedContents}
              onChange={(value) => setFormData({ ...formData, selectedContents: value })}
              placeholder="Selecione conteúdos..."
            />

          <MultiSelect
            label="Etapas"
            options={stages.map((s) => ({ value: s.id, label: s.name }))}
            value={formData.selectedStages}
            onChange={(value) => setFormData({ ...formData, selectedStages: value })}
            placeholder="Selecione etapas..."
          />

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Select
                label="Título da Atividade"
                fullWidth
                options={titles.map((t) => ({ value: t.id, label: t.title }))}
                value={formData.titleId}
                onChange={(e) => setFormData({ ...formData, titleId: e.target.value })}
                placeholder="Selecione um título..."
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowCreateTitle(true)}
              icon={<Plus size={18} />}
              style={{ marginBottom: 0 }}
            >
              Novo
            </Button>
          </div>

          <Select
            label="Grupo"
            fullWidth
            options={groupOptions}
            value={formData.group}
            onChange={(e) => setFormData({ ...formData, group: e.target.value })}
            placeholder="Selecione um grupo..."
          />

          <Textarea
            label="Descrição"
            fullWidth
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Adicione uma descrição para esta atividade..."
          />
          </form>
        )}
      </Modal>

      <CreateTitleModal
        isOpen={showCreateTitle}
        onClose={() => setShowCreateTitle(false)}
        onSave={handleCreateTitle}
      />
    </>
  );
}
