import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { trainingService } from '../../services/trainingService';

const DIM_LIST = [
  { key: 'tatico',  label: 'Tático',  color: '#3b82f6' },
  { key: 'fisico',  label: 'Físico',  color: '#f59e0b' },
  { key: 'tecnico', label: 'Técnico', color: '#a855f7' },
  { key: 'mental',  label: 'Mental',  color: '#10b981' },
];

export function EditActivityModal({ isOpen, onClose, activity, onSave }) {
  const [loading, setLoading] = useState(false);
  const [contents, setContents] = useState([]);
  const [formData, setFormData] = useState({ title: '', dimension: '', content_id: '', description: '' });

  useEffect(() => {
    if (isOpen) {
      loadContents();
    }
  }, [isOpen, activity]);

  async function loadContents() {
    try {
      const response = await trainingService.getContents();
      const loaded = (response?.data || []).filter(c => c.active !== false);
      setContents(loaded);
      if (activity) {
        const current = loaded.find(c => c.id === activity.content_id);
        setFormData({
          title: activity.title || '',
          dimension: current?.dimension || '',
          content_id: activity.content_id || '',
          description: activity.description || '',
        });
      }
    } catch (error) {
      console.error('Error loading contents:', error);
    }
  }

  const contentsOfDimension = contents.filter(c => c.dimension === formData.dimension);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dimension) { alert('Selecione o pilar.'); return; }
    if (!formData.content_id) { alert('Selecione o conteúdo.'); return; }
    if (!formData.title.trim()) { alert('Informe o nome.'); return; }
    setLoading(true);
    try {
      await onSave({ title: formData.title, content_id: formData.content_id, description: formData.description });
      onClose();
    } catch (error) {
      console.error('Error updating activity:', error);
      alert('Erro ao atualizar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Atividade"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} icon={<Save size={18} />}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Pilar *
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {DIM_LIST.map((d) => {
              const isSelected = formData.dimension === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setFormData({ ...formData, dimension: d.key, content_id: '' })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 0.8rem', borderRadius: '999px',
                    border: `1.5px solid ${isSelected ? d.color : '#cbd5e1'}`,
                    backgroundColor: isSelected ? `${d.color}1A` : 'transparent',
                    color: isSelected ? d.color : 'inherit',
                    fontSize: '0.825rem', fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: d.color }} />
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <Select
          label="Conteúdo *"
          fullWidth
          required
          options={contentsOfDimension.map((c) => ({ value: c.id, label: c.name }))}
          value={formData.content_id}
          onChange={(e) => setFormData({ ...formData, content_id: e.target.value })}
          placeholder={formData.dimension ? 'Selecione um conteúdo...' : 'Selecione o pilar primeiro'}
        />

        <Input
          label="Nome da Atividade *"
          fullWidth
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />

        <Textarea
          label="Descrição (opcional)"
          fullWidth
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </form>
    </Modal>
  );
}
