/**
 * LoadingOverlay Component
 *
 * A reusable loading overlay that can be used across the application
 * to show loading states without clearing existing content.
 *
 * Props:
 * - isLoading: boolean - Controls visibility of the overlay
 * - message: string (optional) - Custom loading message to display
 */

export function LoadingOverlay({ isLoading, message = 'Carregando...' }) {
  if (!isLoading) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(2px)',
  };

  const spinnerStyle = {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  const messageStyle = {
    marginTop: '1rem',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '500',
  };

  return (
    <div style={overlayStyle}>
      <div style={spinnerStyle} />
      {message && <div style={messageStyle}>{message}</div>}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
