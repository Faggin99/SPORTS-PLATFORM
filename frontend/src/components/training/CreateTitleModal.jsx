import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { trainingService } from '../../services/trainingService';

export function CreateTitleModal({ isOpen, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [contents, setContents] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content_id: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadContents();
    }
  }, [isOpen]);

  async function loadContents() {
    try {
      const response = await trainingService.getContents();
      setContents(response?.data || []);
    } catch (error) {
      console.error('Error loading contents:', error);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validação: conteúdo é obrigatório
    if (!formData.content_id) {
      alert('Por favor, selecione um conteúdo antes de cadastrar o tema.');
      setLoading(false);
      return;
    }

    try {
      const newTitle = await trainingService.createTitle(formData);
      onSave(newTitle);
      setFormData({ title: '', content_id: '', description: '' });
      onClose();
    } catch (error) {
      console.error('Error creating title:', error);
      alert('Erro ao criar tema: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Novo Tema de Atividade"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} icon={<Save size={18} />}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Select
          label="Conteúdo *"
          fullWidth
          required
          options={contents.map((c) => ({ value: c.id, label: c.name }))}
          value={formData.content_id}
          onChange={(e) => setFormData({ ...formData, content_id: e.target.value })}
          placeholder="Selecione um conteúdo..."
        />

        <Input
          label="Tema da Atividade *"
          fullWidth
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Posse de Bola 4x4+2"
        />

        <Textarea
          label="Descrição (opcional)"
          fullWidth
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Adicione uma descrição para esta atividade..."
        />
      </form>
    </Modal>
  );
}
