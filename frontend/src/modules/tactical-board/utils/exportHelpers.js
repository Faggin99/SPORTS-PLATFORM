// Generate a filename for video export
export function generateVideoFilename(playName) {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = (playName || 'jogada')
    .replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
  return `${safeName}_${date}.webm`;
}

// Check if MediaRecorder is supported
export function isMediaRecorderSupported() {
  return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

// Get supported video MIME type
export function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
}
