import { useState, useEffect, useCallback } from 'react';
import { Target, ClipboardList, Pencil } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { themeService } from '../../services/themeService';
import { ThemeSelectionModal } from './ThemeSelectionModal';

export function MonthlyThemeBanner({ clubId, currentMonth }) {
  const { colors } = useTheme();
  const isMobile = useIsMobile();
  const [theme, setTheme] = useState(null);
  const [adherence, setAdherence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentMonth || !clubId) return;
    setLoading(true);
    try {
      const [themeData, adherenceData] = await Promise.all([
        themeService.getTheme(currentMonth, clubId),
        themeService.getAdherence(currentMonth, clubId),
      ]);
      setTheme(themeData);
      setAdherence(adherenceData);
    } catch (error) {
      console.error('Error fetching theme data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, clubId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (data) => {
    await themeService.saveTheme(data);
    setShowModal(false);
    fetchData();
  };

  if (loading) return null;

  const adherencePercent = adherence?.adherencePercent ?? 0;

  const getAdherenceColor = (pct) => {
    if (pct >= 75) return '#22c55e';
    if (pct >= 50) return '#eab308';
    return '#ef4444';
  };

  const containerStyle = {
    padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: `1px solid ${colors.border}`,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '08',
    gap: isMobile ? '0.5rem' : '0.75rem',
  };

  const leftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.4rem' : '0.5rem',
    flex: 1,
    minWidth: 0,
  };

  const buttonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    fontSize: isMobile ? '0.8rem' : '0.875rem',
    color: colors.primary,
    fontWeight: '500',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  };

  // No theme defined - show only a tiny link-style button
  if (!theme) {
    return (
      <>
        <div style={{
          marginBottom: '0.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.2rem 0.4rem',
              fontSize: isMobile ? '0.7rem' : '0.75rem',
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            title="Definir tema do mes"
          >
            <ClipboardList size={12} />
            Definir tema do mes
          </button>
        </div>
        <ThemeSelectionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          onDelete={fetchData}
          currentTheme={null}
          clubId={clubId}
          month={currentMonth}
        />
      </>
    );
  }

  // Theme exists
  const adherenceColor = getAdherenceColor(adherencePercent);

  const progressBarContainerStyle = {
    width: isMobile ? '60px' : '80px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: colors.border,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const progressBarFillStyle = {
    width: `${Math.min(adherencePercent, 100)}%`,
    height: '100%',
    borderRadius: '3px',
    backgroundColor: adherenceColor,
    transition: 'width 0.3s ease',
  };

  return (
    <>
      <div style={containerStyle}>
        <div style={leftStyle}>
          <Target size={isMobile ? 16 : 18} color={colors.primary} style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            color: colors.text,
            fontWeight: '500',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Tema: {theme.primary_content_name}
          </span>
          {theme.secondary_content_name && (
            <span style={{
              fontSize: isMobile ? '0.7rem' : '0.75rem',
              color: colors.textSecondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              + {theme.secondary_content_name}
            </span>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '0.4rem' : '0.5rem',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: isMobile ? '0.75rem' : '0.8rem',
            fontWeight: '700',
            color: adherenceColor,
          }}>
            {adherencePercent}%
          </span>
          <div style={progressBarContainerStyle}>
            <div style={progressBarFillStyle} />
          </div>
          <button
            style={{
              ...buttonStyle,
              padding: '0.25rem',
            }}
            onClick={() => setShowModal(true)}
            title="Editar tema"
          >
            <Pencil size={isMobile ? 14 : 16} color={colors.primary} />
          </button>
        </div>
      </div>
      <ThemeSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        onDelete={() => {
          setTheme(null);
          setAdherence(null);
          fetchData();
        }}
        currentTheme={theme}
        clubId={clubId}
        month={currentMonth}
      />
    </>
  );
}
