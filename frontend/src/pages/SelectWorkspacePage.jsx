import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Crown, Building2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';

export function SelectWorkspacePage() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { workspaces, loading, setActiveId, createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  function pick(id) {
    setActiveId(id);
    navigate('/home');
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const ws = await createWorkspace(newName.trim());
      if (ws?.id) {
        setActiveId(ws.id);
        navigate('/home');
      }
    } catch (err) {
      alert(err?.message || 'Erro ao criar conta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, display: 'flex', flexDirection: 'column', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 540, width: '100%', margin: '0 auto', flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: colors.text, fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Escolha sua conta</h1>
          <p style={{ color: colors.textSecondary, fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Logado como <strong>{user?.email}</strong>. Cada conta tem sua própria assinatura e dados separados.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: colors.textSecondary }}>Carregando…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => pick(w.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: colors.text,
                }}
              >
                <Building2 size={20} color={colors.primary} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{w.name}</div>
                  <div style={{ fontSize: '0.75rem', color: colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    {w.is_owner ? <><Crown size={11} /> Proprietário</> : `Membro como ${w.role}`}
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem 1rem',
                backgroundColor: 'transparent',
                border: `1px dashed ${colors.border}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                color: colors.primary,
                textAlign: 'left',
              }}
            >
              <Plus size={20} />
              <div style={{ fontWeight: 600 }}>Criar nova conta (outra assinatura)</div>
            </button>
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent', border: `1px solid ${colors.border}`,
              color: colors.textSecondary, borderRadius: '0.375rem',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.85rem',
            }}
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Criar nova conta"
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={busy || !newName.trim()}>{busy ? 'Criando…' : 'Criar'}</Button>
          </div>
        }
      >
        <p style={{ color: colors.textSecondary, fontSize: '0.875rem', marginTop: 0 }}>
          Cada conta nova começa no <strong>plano Free</strong>, grátis pra sempre. Você pode trocar entre suas contas a qualquer momento.
        </p>
        <Input
          label="Nome da conta"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex.: Escolinha Bola Pra Frente"
          fullWidth
          autoFocus
        />
      </Modal>
    </div>
  );
}
