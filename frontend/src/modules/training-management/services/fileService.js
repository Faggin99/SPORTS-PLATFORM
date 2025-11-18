import api from './api';

const BASE_PATH = '/training-management/files';

export const fileService = {
  async upload(file, fileType, phase, sessionId = null, activityId = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    formData.append('phase', phase);
    if (sessionId) formData.append('session_id', sessionId);
    if (activityId) formData.append('activity_id', activityId);

    const response = await api.post(`${BASE_PATH}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async delete(fileId) {
    await api.delete(`${BASE_PATH}/${fileId}`);
  },
};
