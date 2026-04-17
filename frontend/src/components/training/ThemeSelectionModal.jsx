import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { trainingService } from '../../services/trainingService';
import { themeService } from '../../services/themeService';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function ThemeSelectionModal({ isOpen, onClose, onSave, onDelete, currentTheme, clubId, month }) {
  const { colors } = useTheme();
  const [contents, setContents] = useState([]);
  const [primaryContentId, setPrimaryContentId] = useState('');
  const [secondaryContentId, setSecondaryContentId] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [year, monthNum] = month ? month.split('-') : ['', ''];
  const monthLabel = monthNum
    ? `${monthNames[parseInt(monthNum) - 1]} ${year}`
    : '';

  useEffect(() => {
    if (isOpen) {
      trainingService.getContents().then((data) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setContents(list);
      }).catch((err) => {
        console.error('Error loading contents:', err);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentTheme) {
      setPrimaryContentId(currentTheme.primary_content_id || '');
      setSecondaryContentId(currentTheme.secondary_content_id || '');
      setDescription(currentTheme.description || '');
    } else if (isOpen) {
      setPrimaryContentId('');
      setSecondaryContentId('');
      setDescription('');
    }
  }, [isOpen, currentTheme]);

  const handleSave = async () => {
    if (!primaryContentId) return;
    setSaving(true);
    try {
      await onSave({
        month,
        club_id: clubId,
        primary_content_id: primaryContentId,
        secondary_content_id: secondaryContentId || null,
        description: description || null,
      });
    } catch (error) {
      console.error('Error saving theme:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTheme?.id) return;
    if (!window.confirm('Tem certeza que deseja remover o tema deste mes?')) return;
    setDeleting(true);
    try {
      await themeService.deleteTheme(currentTheme.id);
      if (onDelete) onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting theme:', error);
      alert('Erro ao remover tema: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const primaryOptions = contents.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const secondaryOptions = [
    { value: '', label: 'Nenhum' },
    ...contents
      .filter((c) => c.id !== primaryContentId)
      .map((c) => ({
        value: c.id,
        label: c.name,
      })),
  ];

  const fieldGap = { marginBottom: '1rem' };

  const footer = (
    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <div>
        {currentTheme?.id && (
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            {deleting ? 'Removendo...' : 'Remover Tema'}
          </Button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!primaryContentId || saving}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tema do Mes - ${monthLabel}`}
      size="md"
      footer={footer}
    >
      <div style={fieldGap}>
        <Select
          label="Conteudo Principal"
          options={primaryOptions}
          value={primaryContentId}
          onChange={(e) => {
            setPrimaryContentId(e.target.value);
            if (e.target.value === secondaryContentId) {
              setSecondaryContentId('');
            }
          }}
          placeholder="Selecione o conteudo principal..."
          fullWidth
        />
      </div>
      <div style={fieldGap}>
        <Select
          label="Conteudo Secundario (opcional)"
          options={secondaryOptions}
          value={secondaryContentId}
          onChange={(e) => setSecondaryContentId(e.target.value)}
          placeholder="Selecione o conteudo secundario..."
          fullWidth
        />
      </div>
      <div style={fieldGap}>
        <Textarea
          label="Objetivo / Descricao (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o objetivo do mes..."
          rows={3}
          fullWidth
        />
      </div>
    </Modal>
  );
}
