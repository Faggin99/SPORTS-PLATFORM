import { api } from '../../../services/api';

export const fileService = {
  async upload(file, fileType, phase, sessionId = null, activityId = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    formData.append('phase', phase);
    if (sessionId) formData.append('session_id', sessionId);
    if (activityId) formData.append('activity_id', activityId);
    return await api.upload('/files/upload', formData);
  },

  async delete(fileId) {
    return await api.delete(`/files/${fileId}`);
  },
};
