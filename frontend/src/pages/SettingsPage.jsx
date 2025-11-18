import { useState, useEffect } from 'react';
import { User, Camera, Save, Lock, Settings } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ChangePasswordModal } from '../components/settings/ChangePasswordModal';
import { PhotoCropModal } from '../components/settings/PhotoCropModal';
import { api } from '../services/api';

export function SettingsPage() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
  });
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhotoCropModal, setShowPhotoCropModal] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await api.get('/profile');
      setUser(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put('/profile', formData);
      alert('Perfil atualizado com sucesso!');
      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setSelectedPhotoFile(file);
    setShowPhotoCropModal(true);

    // Reset input
    e.target.value = '';
  }

  async function handlePhotoUpload(file) {
    const formData = new FormData();
    formData.append('photo', file);

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${api.baseURL}/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      await loadProfile();
      setShowPhotoCropModal(false);
      setSelectedPhotoFile(null);
      alert('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erro ao fazer upload da foto');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(passwordData) {
    setLoading(true);
    try {
      await api.put('/profile', passwordData);
      alert('Senha alterada com sucesso!');
      setShowPasswordModal(false);
    } catch (error) {
      console.error('Error changing password:', error);
      const message = error.response?.data?.message || 'Erro ao alterar senha';
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  const getPhotoUrl = () => {
    if (!user?.profile_photo) return null;
    return `${api.baseURL.replace('/api', '')}/storage/${user.profile_photo}`;
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
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

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem 2rem 1rem',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: colors.text,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <Settings size={40} strokeWidth={1.5} />
          Configurações
        </h1>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '1.5rem 2rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          {/* Coluna Esquerda - Perfil */}
          <div>
            <Card style={{ height: 'fit-content' }}>
        <div style={{ padding: '1.5rem' }}>
          {/* Foto de Perfil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                position: 'relative',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: colors.surfaceHover,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                border: `2px solid ${colors.border}`,
                flexShrink: 0,
              }}
              onClick={() => getPhotoUrl() && setShowPhotoModal(true)}
            >
              {getPhotoUrl() ? (
                <img
                  src={getPhotoUrl()}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User size={40} color={colors.textSecondary} />
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.text, marginBottom: '0.5rem' }}>
                Foto de Perfil
              </h3>
              <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginBottom: '0.75rem' }}>
                Clique na foto para visualizar
              </p>
              <label htmlFor="photo-upload" style={{ cursor: 'pointer' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: colors.text,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}>
                  <Camera size={18} />
                  Alterar Foto
                </div>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Telefone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={inputStyle}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label style={labelStyle}>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  maxLength={500}
                />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                  {formData.bio.length}/500
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <Button type="submit" icon={<Save size={18} />} disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Card>
          </div>

          {/* Coluna Direita - Segurança */}
          <div>
            <Card style={{ height: 'fit-content' }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: '600', color: colors.text, marginBottom: '0.25rem' }}>
                      Segurança
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: colors.textSecondary }}>
                      Altere sua senha
                    </p>
                  </div>
                  <Button
                    icon={<Lock size={16} />}
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPasswordModal(true)}
                    disabled={loading}
                  >
                    Alterar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Senha */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSave={handlePasswordChange}
      />

      {/* Modal de Crop de Foto */}
      <PhotoCropModal
        isOpen={showPhotoCropModal}
        onClose={() => {
          setShowPhotoCropModal(false);
          setSelectedPhotoFile(null);
        }}
        onSave={handlePhotoUpload}
        selectedFile={selectedPhotoFile}
      />

      {/* Modal de Foto */}
      {showPhotoModal && getPhotoUrl() && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowPhotoModal(false)}
        >
          <img
            src={getPhotoUrl()}
            alt="Profile"
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
}
