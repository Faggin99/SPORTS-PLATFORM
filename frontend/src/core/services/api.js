import axios from 'axios';

// Cria instância do Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor - adiciona token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Adiciona tenant_id se disponível
    const tenantId = localStorage.getItem('tenant_id');
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - trata erros globalmente
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Erro de autenticação - redireciona para login
      if (error.response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      // Erro de permissão
      if (error.response.status === 403) {
        console.error('Sem permissão para esta ação');
      }

      // Erro do servidor
      if (error.response.status >= 500) {
        console.error('Erro no servidor. Tente novamente mais tarde.');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
