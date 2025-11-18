import { useState } from 'react';
import { fileService } from '../services/fileService';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = async (file, fileType, phase, sessionId = null, activityId = null) => {
    try {
      setUploading(true);
      setProgress(0);
      const data = await fileService.upload(file, fileType, phase, sessionId, activityId);
      setProgress(100);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress, error };
}
