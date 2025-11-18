import { useState, useRef, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTheme } from '../../contexts/ThemeContext';

export function PhotoCropModal({ isOpen, onClose, onSave, selectedFile }) {
  const { colors } = useTheme();
  const [imageUrl, setImageUrl] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setImageUrl(url);

      // Reset state
      setScale(1);
      setPosition({ x: 0, y: 0 });

      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (imageUrl && imageRef.current) {
      drawImage();
    }
  }, [imageUrl, scale, position]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;

    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    const size = 400; // Canvas size - increased for better quality
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Calculate image dimensions maintaining aspect ratio
    const aspectRatio = img.width / img.height;
    let drawWidth = size * scale;
    let drawHeight = size * scale;

    if (aspectRatio > 1) {
      drawHeight = drawWidth / aspectRatio;
    } else {
      drawWidth = drawHeight * aspectRatio;
    }

    // Calculate position (centered + user offset)
    const x = (size - drawWidth) / 2 + position.x;
    const y = (size - drawHeight) / 2 + position.y;

    // Draw image
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, drawWidth, drawHeight);
    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];

    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to blob with compression to ensure it's under 2MB
    canvas.toBlob((blob) => {
      if (blob) {
        // Check blob size (2MB = 2 * 1024 * 1024 bytes)
        if (blob.size > 2 * 1024 * 1024) {
          // If too large, reduce quality
          canvas.toBlob((smallerBlob) => {
            if (smallerBlob) {
              const file = new File([smallerBlob], selectedFile.name, { type: 'image/jpeg' });
              onSave(file);
            }
          }, 'image/jpeg', 0.7);
        } else {
          const file = new File([blob], selectedFile.name, { type: 'image/jpeg' });
          onSave(file);
        }
      }
    }, 'image/jpeg', 0.85);
  };

  const handleClose = () => {
    setImageUrl(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ajustar Foto de Perfil"
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Preview Area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: '300px',
              height: '300px',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '300px',
                height: '300px',
                borderRadius: '50%',
              }}
            />
            {imageUrl && (
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Preview"
                style={{ display: 'none' }}
                onLoad={drawImage}
              />
            )}
          </div>

          <p style={{
            fontSize: '0.875rem',
            color: colors.textSecondary,
            textAlign: 'center',
          }}>
            Arraste para posicionar • Use os botões abaixo para ajustar o zoom
          </p>
        </div>

        {/* Zoom Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            icon={<ZoomOut size={18} />}
            disabled={scale <= 0.5}
          >
            Menos
          </Button>

          <div style={{
            flex: 1,
            maxWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: 'pointer',
              }}
            />
            <span style={{
              fontSize: '0.875rem',
              color: colors.textSecondary,
              minWidth: '3rem',
              textAlign: 'right',
            }}>
              {Math.round(scale * 100)}%
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            icon={<ZoomIn size={18} />}
            disabled={scale >= 3}
          >
            Mais
          </Button>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          paddingTop: '1rem',
          borderTop: `1px solid ${colors.border}`,
        }}>
          <Button
            variant="secondary"
            onClick={handleClose}
            icon={<X size={18} />}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            icon={<Check size={18} />}
          >
            Salvar Foto
          </Button>
        </div>
      </div>
    </Modal>
  );
}
