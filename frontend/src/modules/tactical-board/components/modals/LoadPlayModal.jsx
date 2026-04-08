import { useEffect } from 'react';
import Modal from 'react-modal';
import { X, Trash2, Calendar, Layout } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FIELD_TYPES } from '../../utils/fieldDimensions';

const fieldTypeLabels = {
  [FIELD_TYPES.FOOTBALL_11]: 'Futebol 11',
  [FIELD_TYPES.FUTSAL]: 'Futsal',
};

export default function LoadPlayModal({ isOpen, onClose, onLoad, onDelete, plays = [], loading, onFetch }) {
  const { colors } = useTheme();

  useEffect(() => {
    if (isOpen && onFetch) {
      onFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const modalStyle = {
    content: {
      maxWidth: '560px',
      width: '90%',
      maxHeight: '80vh',
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
      overflow: 'auto',
    },
    overlay: {
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 9999,
      position: 'fixed',
      inset: 0,
    },
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={modalStyle} ariaHideApp={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Carregar Jogada</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: colors.textSecondary, padding: '2rem 0' }}>Carregando...</p>
      ) : plays.length === 0 ? (
        <p style={{ textAlign: 'center', color: colors.textSecondary, padding: '2rem 0' }}>
          Nenhuma jogada salva ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {plays.map((play) => (
            <div
              key={play.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.background,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onClick={() => { onLoad(play); onClose(); }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{play.name}</div>
                {play.description && (
                  <div style={{ fontSize: '0.8rem', color: colors.textSecondary, marginTop: '0.125rem' }}>
                    {play.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.375rem', fontSize: '0.75rem', color: colors.textSecondary }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Layout size={12} />
                    {fieldTypeLabels[play.field_type] || play.field_type}
                  </span>
                  <span>{play.keyframes?.length || 0} frames</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    {formatDate(play.updated_at)}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Deletar "${play.name}"?`)) {
                    onDelete(play.id);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '0.375rem',
                  borderRadius: '0.25rem',
                }}
                title="Deletar jogada"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
