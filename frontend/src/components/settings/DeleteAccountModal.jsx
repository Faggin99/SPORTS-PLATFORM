import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTheme } from '../../contexts/ThemeContext';

const CONFIRM_WORD = 'EXCLUIR';

/**
 * Modal de 2 passos para excluir conta:
 *  1) Explica consequências (dados apagados/anonimizados, assinatura cancelada, sem retorno).
 *  2) Exige digitar 'EXCLUIR' + senha atual (se a conta tiver senha).
 *
 * Props:
 *  - isOpen, onClose
 *  - onConfirm(password | null) → chamado no final; parent faz a chamada de API + logout
 *  - requiresPassword: bool — se false, o campo de senha some (conta só-Google sem senha setada)
 *  - userEmail: string — mostrado no aviso pra reforçar qual conta será excluída
 */
export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  requiresPassword = true,
  userEmail,
}) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmText('');
      setPassword('');
      setShowPwd(false);
      setSubmitting(false);
      setError('');
    }
  }, [isOpen]);

  const danger = colors.error || '#ef4444';

  const canConfirm =
    confirmText.trim().toUpperCase() === CONFIRM_WORD &&
    (!requiresPassword || password.length > 0);

  async function handleFinalConfirm() {
    if (!canConfirm || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await onConfirm(requiresPassword ? password : null);
      // Parent fecha o modal + navega. Se der certo, não voltamos aqui.
    } catch (e) {
      setError(e?.message || 'Erro ao excluir a conta. Tente novamente.');
      setSubmitting(false);
    }
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.text,
  };
  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: '0.5rem',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="Excluir minha conta"
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Cabeçalho de perigo */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '0.875rem 1rem',
            backgroundColor: `${danger}10`,
            border: `1px solid ${danger}40`,
            borderRadius: '0.5rem',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={20} color={danger} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.85rem', color: colors.text, lineHeight: 1.5 }}>
            <strong>Esta ação é permanente e não pode ser desfeita.</strong>
            {userEmail && (
              <div style={{ marginTop: 4, color: colors.textSecondary, fontSize: '0.78rem' }}>
                Conta: <span style={{ fontFamily: 'monospace' }}>{userEmail}</span>
              </div>
            )}
          </div>
        </div>

        {step === 1 && (
          <>
            <div style={{ fontSize: '0.875rem', color: colors.text, lineHeight: 1.55 }}>
              Ao excluir sua conta:
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', color: colors.textSecondary }}>
                <li>Seu perfil e login serão <strong>removidos ou anonimizados</strong> (LGPD).</li>
                <li>Seus <strong>treinos, atletas, clubes e conteúdos</strong> serão apagados.</li>
                <li>Sua <strong>assinatura ativa será cancelada</strong> — você não será cobrado novamente.</li>
                <li>Você <strong>perderá acesso imediatamente</strong> e será deslogado.</li>
                <li>Se você foi convidado(a) por outro treinador, ele(a) perderá seu acesso à conta dele(a).</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button
                variant="danger"
                icon={<Trash2 size={16} />}
                onClick={() => setStep(2)}
              >
                Entendi, quero continuar
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: '0.875rem', color: colors.text, lineHeight: 1.5 }}>
              Pra confirmar, digite <strong style={{ color: danger, fontFamily: 'monospace' }}>{CONFIRM_WORD}</strong>{' '}
              {requiresPassword ? 'e informe sua senha atual.' : 'abaixo.'}
            </div>

            <div>
              <label style={labelStyle}>
                Digite <span style={{ fontFamily: 'monospace', color: danger }}>{CONFIRM_WORD}</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                style={inputStyle}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder={CONFIRM_WORD}
              />
            </div>

            {requiresPassword && (
              <div>
                <label style={labelStyle}>Sua senha atual</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.textSecondary,
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '0.6rem 0.75rem',
                  backgroundColor: `${danger}15`,
                  color: danger,
                  border: `1px solid ${danger}40`,
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setStep(1)} disabled={submitting}>
                Voltar
              </Button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" onClick={onClose} disabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  icon={<Trash2 size={16} />}
                  onClick={handleFinalConfirm}
                  disabled={!canConfirm || submitting}
                >
                  {submitting ? 'Excluindo…' : 'Excluir permanentemente'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
