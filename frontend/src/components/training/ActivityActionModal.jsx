import { useState, useEffect } from 'react';
import { AlertTriangle, Archive, Edit2, Trash2, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { trainingService } from '../../services/trainingService';

/**
 * Modal de confirmação para ações em títulos de atividades (editar/excluir)
 * Exibe informações sobre o impacto da ação no histórico de treinos
 */
export function ActivityActionModal({
  isOpen,
  onClose,
  activity,
  action, // 'edit' | 'delete'
  onConfirm,
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => {
    if (isOpen && activity?.id) {
      checkUsage();
    }
  }, [isOpen, activity?.id]);

  async function checkUsage() {
    setLoadingUsage(true);
    try {
      const { count } = await trainingService.getTitleUsageCount(activity.id);
      setUsageCount(count || 0);
    } catch (error) {
      console.error('Error checking usage:', error);
      setUsageCount(0);
    } finally {
      setLoadingUsage(false);
    }
  }

  async function handleConfirm() {
    console.log('ActivityActionModal handleConfirm called, action:', action, 'activity:', activity?.id);
    setLoading(true);
    try {
      console.log('Calling onConfirm...');
      await onConfirm();
      console.log('onConfirm completed successfully');
      onClose();
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Erro ao realizar ação: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const isDelete = action === 'delete';
  const hasUsage = usageCount > 0;

  const infoBoxStyle = {
    padding: '1rem',
    backgroundColor: colors.background,
    borderRadius: '0.5rem',
    border: `1px solid ${colors.border}`,
    marginBottom: '1rem',
  };

  const warningBoxStyle = {
    padding: '1rem',
    backgroundColor: `${colors.warning || '#f59e0b'}15`,
    borderRadius: '0.5rem',
    border: `1px solid ${colors.warning || '#f59e0b'}40`,
    marginBottom: '1rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
  };

  const infoIconStyle = {
    padding: '0.5rem',
    backgroundColor: `${colors.primary}15`,
    borderRadius: '0.375rem',
    color: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const bulletStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    color: colors.text,
  };

  const bulletDotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    marginTop: '0.5rem',
    flexShrink: 0,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDelete ? 'Arquivar Atividade' : 'Editar Atividade'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={isDelete ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={loading || loadingUsage}
            icon={isDelete ? <Archive size={18} /> : <Edit2 size={18} />}
          >
            {loading ? 'Processando...' : isDelete ? 'Confirmar Arquivamento' : 'Confirmar Edição'}
          </Button>
        </>
      }
    >
      {loadingUsage ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: colors.textSecondary }}>
          Verificando uso da atividade...
        </div>
      ) : (
        <>
          {/* Info da atividade */}
          <div style={infoBoxStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={infoIconStyle}>
                <Info size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>Atividade selecionada:</div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: colors.text }}>{activity?.title}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
              Esta atividade foi utilizada em <strong style={{ color: colors.text }}>{usageCount}</strong> treino{usageCount !== 1 ? 's' : ''}.
            </div>
          </div>

          {/* Aviso de impacto */}
          {hasUsage && (
            <div style={warningBoxStyle}>
              <AlertTriangle size={24} style={{ color: colors.warning || '#f59e0b', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '600', color: colors.text, marginBottom: '0.5rem' }}>
                  Atenção: Esta ação afeta o histórico
                </div>
                <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                  {isDelete
                    ? 'Esta atividade já foi usada em treinos. Ao arquivá-la, ela não aparecerá mais para seleção em novos treinos, mas os treinos antigos continuarão mostrando o nome original.'
                    : 'Esta atividade já foi usada em treinos. Ao editá-la, o novo nome/descrição será mostrado em TODOS os treinos que usaram esta atividade, incluindo os antigos.'
                  }
                </div>
              </div>
            </div>
          )}

          {/* Explicação do que vai acontecer */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.text, marginBottom: '0.75rem' }}>
              O que vai acontecer:
            </div>

            {isDelete ? (
              <>
                <div style={bulletStyle}>
                  <div style={bulletDotStyle} />
                  <span>A atividade será <strong>arquivada</strong> (não excluída permanentemente)</span>
                </div>
                <div style={bulletStyle}>
                  <div style={bulletDotStyle} />
                  <span>Ela <strong>não aparecerá</strong> mais na lista de atividades disponíveis</span>
                </div>
                <div style={bulletStyle}>
                  <div style={bulletDotStyle} />
                  <span>Treinos antigos que usaram esta atividade <strong>continuarão funcionando</strong></span>
                </div>
                <div style={bulletStyle}>
                  <div style={bulletDotStyle} />
                  <span>O histórico de treinos será <strong>preservado integralmente</strong></span>
                </div>
              </>
            ) : (
              <>
                <div style={bulletStyle}>
                  <div style={bulletDotStyle} />
                  <span>O nome e/ou descrição da atividade serão <strong>atualizados</strong></span>
                </div>
                {hasUsage ? (
                  <>
                    <div style={bulletStyle}>
                      <div style={bulletDotStyle} />
                      <span>Treinos antigos mostrarão o <strong>novo nome</strong> desta atividade</span>
                    </div>
                    <div style={bulletStyle}>
                      <div style={bulletDotStyle} />
                      <span>Se precisar manter o nome antigo, considere <strong>criar uma nova</strong> atividade</span>
                    </div>
                  </>
                ) : (
                  <div style={bulletStyle}>
                    <div style={bulletDotStyle} />
                    <span>Como não foi usada ainda, a edição não afetará nenhum treino</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Confirmação */}
          <div style={{
            padding: '1rem',
            backgroundColor: isDelete ? `${colors.danger || '#ef4444'}10` : `${colors.primary}10`,
            borderRadius: '0.5rem',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: colors.text,
          }}>
            {isDelete
              ? 'Deseja arquivar esta atividade?'
              : 'Deseja prosseguir com a edição?'
            }
          </div>
        </>
      )}
    </Modal>
  );
}
