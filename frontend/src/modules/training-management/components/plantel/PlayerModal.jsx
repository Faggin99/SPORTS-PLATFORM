import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/common/Modal';
import { Input } from '../../../../components/common/Input';
import { Select } from '../../../../components/common/Select';
import { Textarea } from '../../../../components/common/Textarea';
import { Button } from '../../../../components/common/Button';
import { useTheme } from '../../../../contexts/ThemeContext';

const POSITIONS = [
  { value: 'GR', label: 'Goleiro (GR)' },
  { value: 'DD', label: 'Defesa Direito (DD)' },
  { value: 'DC', label: 'Defesa Central (DC)' },
  { value: 'DE', label: 'Defesa Esquerdo (DE)' },
  { value: 'MC', label: 'Médio Centro (MC)' },
  { value: 'MD', label: 'Médio Direito (MD)' },
  { value: 'ME', label: 'Médio Esquerdo (ME)' },
  { value: 'MOF', label: 'Médio Ofensivo (MOF)' },
  { value: 'ED', label: 'Extremo Direito (ED)' },
  { value: 'EE', label: 'Extremo Esquerdo (EE)' },
  { value: 'PL', label: 'Ponta de Lança (PL)' },
  { value: 'SA', label: 'Segundo Avançado (SA)' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'injured', label: 'Lesionado' },
  { value: 'suspended', label: 'Suspenso' },
  { value: 'inactive', label: 'Inativo' },
];

const GROUP_OPTIONS = [
  { value: '', label: 'Sem grupo' },
  { value: '1', label: 'Grupo 1' },
  { value: '2', label: 'Grupo 2' },
  { value: '3', label: 'Grupo 3' },
  { value: 'Transição', label: 'Transição' },
  { value: 'DM', label: 'DM' },
];

export default function PlayerModal({ isOpen, onClose, onSave, player = null }) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    status: 'active',
    observation: '',
    group: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || '',
        position: player.position || '',
        status: player.status || 'active',
        observation: player.observation || '',
        group: player.group || '',
      });
    } else {
      setFormData({
        name: '',
        position: '',
        status: 'active',
        observation: '',
        group: '',
      });
    }
    setErrors({});
  }, [player, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!formData.position) {
      newErrors.position = 'Posição é obrigatória';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar atleta:', error);
      console.error('Resposta do servidor:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Erro ao salvar atleta. Tente novamente.';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const errorMessageStyle = {
    color: colors.error,
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={player ? 'Editar Atleta' : 'Novo Atleta'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={formStyle}>
        <Input
          label="Nome do Atleta"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          placeholder="Digite o nome completo"
          fullWidth
          required
        />

        <Select
          label="Posição"
          value={formData.position}
          onChange={(e) => handleChange('position', e.target.value)}
          options={POSITIONS}
          placeholder="Selecione a posição"
          fullWidth
          required
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          options={STATUS_OPTIONS}
          fullWidth
        />

        <Select
          label="Grupo"
          value={formData.group}
          onChange={(e) => handleChange('group', e.target.value)}
          options={GROUP_OPTIONS}
          placeholder="Selecione o grupo"
          fullWidth
        />

        <Textarea
          label="Observação"
          value={formData.observation}
          onChange={(e) => handleChange('observation', e.target.value)}
          placeholder="Adicione observações sobre o atleta"
          fullWidth
          rows={3}
        />

        {errors.submit && (
          <div style={errorMessageStyle}>{errors.submit}</div>
        )}
      </form>
    </Modal>
  );
}
