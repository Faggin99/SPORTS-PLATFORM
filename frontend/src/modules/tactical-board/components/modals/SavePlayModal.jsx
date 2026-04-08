import { useState } from 'react';
import Modal from 'react-modal';
import { X, Save } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function SavePlayModal({ isOpen, onClose, onSave, initialData = {} }) {
  const { colors } = useTheme();
  const [name, setName] = useState(initialData.name || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setSaving(false);
    }
  };

  const modalStyle = {
    content: {
      maxWidth: '440px',
      width: '90%',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.surface,
      color: colors.text,
      position: 'fixed',
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
    },
    overlay: {
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 9999,
      position: 'fixed',
      inset: 0,
    },
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem',
    borderRadius: '0.375rem',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={modalStyle} ariaHideApp={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Salvar Jogada</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block', color: colors.textSecondary }}>
            Nome *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Saída de bola por baixo"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block', color: colors.textSecondary }}>
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional da jogada..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: name.trim() && !saving ? colors.primary : colors.border,
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}
