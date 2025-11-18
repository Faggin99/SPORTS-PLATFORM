import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const TenantContext = createContext({});

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      // Extrai subdomínio da URL
      const subdomain = extractSubdomain(window.location.hostname);

      if (!subdomain) {
        console.warn('Subdomínio não identificado');
        setLoading(false);
        return;
      }

      // Busca dados do tenant da API
      const response = await api.get(`/tenant/${subdomain}`);
      setTenant(response.data);

      // Aplica tema do tenant
      applyTheme(response.data.theme_config);
    } catch (error) {
      console.error('Erro ao carregar dados do tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractSubdomain = (hostname) => {
    const parts = hostname.split('.');

    // Localhost ou IP - sem subdomínio
    if (parts.length <= 1 || hostname === 'localhost') {
      return null;
    }

    return parts[0];
  };

  const applyTheme = (themeConfig) => {
    if (!themeConfig) return;

    const root = document.documentElement;

    Object.entries(themeConfig).forEach(([key, value]) => {
      root.style.setProperty(`--${key.replace('_', '-')}`, value);
    });
  };

  const updateConfig = async (config) => {
    try {
      const response = await api.put(`/tenant/${tenant.id}/config`, config);
      setTenant(response.data);
      applyTheme(response.data.theme_config);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao atualizar configurações',
      };
    }
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        updateConfig,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}
