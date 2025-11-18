import React, { useState } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';

/**
 * File uploader component for training materials
 * @param {Object} props
 * @param {string} props.fileType - Type of file (plan, video, image)
 * @param {string} props.phase - Training phase (planning, execution, evaluation)
 * @param {string} props.sessionId - Associated session ID (optional)
 * @param {string} props.activityId - Associated activity ID (optional)
 * @param {Function} props.onUploadComplete - Callback when upload completes
 */
export default function FileUploader({ fileType, phase, sessionId, activityId, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const { upload, uploading, progress, error } = useFileUpload();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await upload(selectedFile, fileType, phase, sessionId, activityId);
      onUploadComplete?.(result);
      setSelectedFile(null);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className="file-uploader">
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        accept={fileType === 'video' ? 'video/*' : fileType === 'image' ? 'image/*' : '*'}
      />

      {selectedFile && (
        <div className="file-info">
          <p>{selectedFile.name}</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? `Uploading... ${progress}%` : 'Upload'}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
