import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTheme } from '../../contexts/ThemeContext';

export function ChangePasswordModal({ isOpen, onClose, onSave }) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validação local
    const newErrors = {};

    if (!formData.current_password) {
      newErrors.current_password = 'Senha atual é obrigatória';
    }

    if (!formData.password) {
      newErrors.password = 'Nova senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'A senha deve ter no mínimo 6 caracteres';
    }

    if (!formData.password_confirmation) {
      newErrors.password_confirmation = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'As senhas não conferem';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  const handleClose = () => {
    setFormData({
      current_password: '',
      password: '',
      password_confirmation: '',
    });
    setErrors({});
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    });
    onClose();
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    paddingRight: '2.5rem',
    borderRadius: '0.375rem',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: '1rem',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: colors.text,
  };

  const errorStyle = {
    color: colors.error || '#ef4444',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  };

  const inputContainerStyle = {
    position: 'relative',
  };

  const eyeButtonStyle = {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.textSecondary,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Alterar Senha"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Senha Atual */}
          <div>
            <label style={labelStyle}>Senha Atual</label>
            <div style={inputContainerStyle}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.current_password}
                onChange={(e) => {
                  setFormData({ ...formData, current_password: e.target.value });
                  setErrors({ ...errors, current_password: null });
                }}
                style={{
                  ...inputStyle,
                  borderColor: errors.current_password ? (colors.error || '#ef4444') : colors.border,
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                style={eyeButtonStyle}
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.current_password && (
              <div style={errorStyle}>{errors.current_password}</div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}` }} />

          {/* Nova Senha */}
          <div>
            <label style={labelStyle}>Nova Senha</label>
            <div style={inputContainerStyle}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setErrors({ ...errors, password: null });
                }}
                style={{
                  ...inputStyle,
                  borderColor: errors.password ? (colors.error || '#ef4444') : colors.border,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                style={eyeButtonStyle}
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <div style={errorStyle}>{errors.password}</div>
            )}
            <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
              Mínimo de 6 caracteres
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div>
            <label style={labelStyle}>Confirmar Nova Senha</label>
            <div style={inputContainerStyle}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.password_confirmation}
                onChange={(e) => {
                  setFormData({ ...formData, password_confirmation: e.target.value });
                  setErrors({ ...errors, password_confirmation: null });
                }}
                style={{
                  ...inputStyle,
                  borderColor: errors.password_confirmation ? (colors.error || '#ef4444') : colors.border,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                style={eyeButtonStyle}
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password_confirmation && (
              <div style={errorStyle}>{errors.password_confirmation}</div>
            )}
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              icon={<Lock size={18} />}
            >
              Alterar Senha
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
