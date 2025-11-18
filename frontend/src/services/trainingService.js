import { api } from './api';
import { cache } from '../utils/cache';

export const trainingService = {
  async getMicrocycle(weekIdentifier) {
    return await api.get(`/training-management/microcycles/${weekIdentifier}`);
  },

  async getSession(sessionId) {
    return await api.get(`/training-management/sessions/${sessionId}`);
  },

  async updateSession(sessionId, data) {
    return await api.put(`/training-management/sessions/${sessionId}`, data);
  },

  async updateSessionType(sessionId, data) {
    return await api.patch(`/training-management/sessions/${sessionId}/type`, data);
  },

  async updateActivity(activityId, data) {
    return await api.put(`/training-management/activities/${activityId}`, data);
  },

  async createActivity(data) {
    return await api.post('/training-management/activities', data);
  },

  async upsertActivityForBlock(blockId, data) {
    // This will create or update activity for a specific block
    return await api.post(`/training-management/blocks/${blockId}/activity`, data);
  },

  async getContents() {
    const cacheKey = 'training_contents';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await api.get('/training-management/contents');
    cache.set(cacheKey, data, 300000); // 5 minutes
    return data;
  },

  async getStages() {
    const cacheKey = 'training_stages';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const data = await api.get('/training-management/stages');
    cache.set(cacheKey, data, 300000); // 5 minutes
    return data;
  },

  async getTitles() {
    // Don't cache titles as they can be created/updated frequently
    return await api.get('/training-management/titles?per_page=all');
  },

  async createTitle(data) {
    return await api.post('/training-management/titles', data);
  },

  // Session Files
  async uploadSessionFile(sessionId, file, title) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    // Use request directly to avoid JSON.stringify on FormData
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${api.baseURL}/training-management/sessions/${sessionId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        // Don't set Content-Type - browser will set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  },

  async getSessionFiles(sessionId) {
    return await api.get(`/training-management/sessions/${sessionId}/files`);
  },

  async deleteSessionFile(fileId) {
    return await api.delete(`/training-management/session-files/${fileId}`);
  },

  async getSessionFile(fileId) {
    return await api.get(`/training-management/session-files/${fileId}`);
  },

  // Statistics
  async getStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await api.get(`/training-management/stats${queryString ? '?' + queryString : ''}`);
  },
};
