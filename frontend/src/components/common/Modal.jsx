import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Button } from './Button';

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  const { colors } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: '400px',
    md: '600px',
    lg: '800px',
    xl: '1200px',
    full: '95vw',
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: isMobile ? 0 : '1rem',
    backdropFilter: 'blur(2px)',
  };

  const modalStyle = {
    backgroundColor: colors.background || '#ffffff',
    borderRadius: isMobile ? '0.75rem 0.75rem 0 0' : '0.5rem',
    maxWidth: isMobile ? '100vw' : sizes[size],
    width: '100%',
    margin: isMobile ? 0 : undefined,
    maxHeight: isMobile ? '90vh' : '95vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isMobile ? '0 -4px 20px rgba(0, 0, 0, 0.3)' : '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    zIndex: 1001,
    border: isMobile ? 'none' : `1px solid ${colors.border}`,
  };

  const headerStyle = {
    padding: isMobile ? '0.75rem' : '1.5rem',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  };

  const titleStyle = {
    fontSize: isMobile ? '1rem' : '1.25rem',
    fontWeight: '600',
    color: colors.text,
    margin: 0,
  };

  const contentStyle = {
    padding: isMobile ? '0.75rem' : '1.5rem',
    overflowY: 'auto',
    flex: 1,
  };

  const footerStyle = {
    padding: isMobile ? '0.75rem' : '1rem 1.5rem',
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'flex-end',
    gap: isMobile ? '0.5rem' : '0.5rem',
    flexShrink: 0,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X size={24} strokeWidth={1.5} />}
          />
        </div>
        <div style={contentStyle}>
          {children}
        </div>
        {footer && (
          <div style={footerStyle}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
