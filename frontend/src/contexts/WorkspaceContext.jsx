import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

const STORAGE_KEY = 'active_workspace_id';

export function WorkspaceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeId, setActiveIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [loading, setLoading] = useState(true);

  const setActiveId = useCallback((id) => {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    setActiveIdState(id);
    // Notifica outros hooks (useSubscription, etc) que workspace mudou
    window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { workspaceId: id } }));
  }, []);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/workspaces');
      const list = res?.data || [];
      setWorkspaces(list);
      // Se workspace ativa atual não existe mais, escolhe a primeira própria.
      const stored = localStorage.getItem(STORAGE_KEY);
      const stillValid = stored && list.some(w => w.id === stored);
      if (!stillValid && list.length > 0) {
        const firstOwn = list.find(w => w.is_owner) || list[0];
        setActiveId(firstOwn.id);
      } else if (list.length === 0) {
        setActiveId(null);
      }
    } catch (err) {
      console.error('load workspaces', err);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setActiveId]);

  useEffect(() => { load(); }, [load]);

  const createWorkspace = useCallback(async (name) => {
    const ws = await api.post('/workspaces', { name });
    await load();
    if (ws?.id) setActiveId(ws.id);
    return ws;
  }, [load, setActiveId]);

  // Troca pra outra workspace com sub utilizável (auto-recover de paywall).
  // Retorna o id da workspace nova, ou null se nenhuma disponível.
  const swapToUsableWorkspace = useCallback(() => {
    const usable = workspaces.find(w => w.usable && w.id !== activeId);
    if (usable) {
      setActiveId(usable.id);
      return usable.id;
    }
    return null;
  }, [workspaces, activeId, setActiveId]);

  const renameWorkspace = useCallback(async (id, name) => {
    const ws = await api.put(`/workspaces/${id}`, { name });
    await load();
    return ws;
  }, [load]);

  const activeWorkspace = workspaces.find(w => w.id === activeId) || null;

  const value = {
    workspaces,
    activeId,
    activeWorkspace,
    loading,
    setActiveId,
    refresh: load,
    createWorkspace,
    renameWorkspace,
    swapToUsableWorkspace,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be inside WorkspaceProvider');
  return ctx;
}
