import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useClub } from '../../contexts/ClubContext';

export function ClubSelector() {
  const { colors } = useTheme();
  const { clubs, selectedClub, selectClub, getLogoUrl } = useClub();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (clubs.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        color: colors.textSecondary,
      }}>
        <Building2 size={16} />
        <span>Nenhum clube</span>
      </div>
    );
  }

  const containerStyle = {
    position: 'relative',
    display: 'inline-block',
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    color: colors.text,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s',
  };

  const logoStyle = {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    objectFit: 'cover',
    backgroundColor: colors.primary + '20',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const dropdownStyle = {
    position: 'absolute',
    top: 'calc(100% + 0.25rem)',
    left: 0,
    minWidth: '200px',
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    maxHeight: '300px',
    overflowY: 'auto',
  };

  const clubItemStyle = (isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
    borderLeft: isSelected ? `3px solid ${colors.primary}` : '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const clubNameStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: colors.text,
  };

  const clubDescStyle = {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    marginTop: '0.125rem',
  };

  function handleClubSelect(club) {
    selectClub(club);
    setIsOpen(false);
  }

  return (
    <div style={containerStyle} ref={dropdownRef}>
      <button
        style={buttonStyle}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.surface}
      >
        {selectedClub?.logo_path && getLogoUrl(selectedClub.logo_path) ? (
          <img src={getLogoUrl(selectedClub.logo_path)} alt={selectedClub.name} style={logoStyle} />
        ) : (
          <div style={logoStyle}>
            <Building2 size={14} color={colors.primary} />
          </div>
        )}
        <span>{selectedClub?.name || 'Selecionar clube'}</span>
        <ChevronDown size={16} style={{
          marginLeft: '0.25rem',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s'
        }} />
      </button>

      {isOpen && (
        <div style={dropdownStyle}>
          {clubs.map((club) => (
            <div
              key={club.id}
              style={clubItemStyle(selectedClub?.id === club.id)}
              onClick={() => handleClubSelect(club)}
              onMouseEnter={(e) => {
                if (selectedClub?.id !== club.id) {
                  e.currentTarget.style.backgroundColor = colors.surfaceHover;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedClub?.id !== club.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {club.logo_path && getLogoUrl(club.logo_path) ? (
                <img src={getLogoUrl(club.logo_path)} alt={club.name} style={logoStyle} />
              ) : (
                <div style={logoStyle}>
                  <Building2 size={14} color={colors.primary} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={clubNameStyle}>{club.name}</div>
                {club.description && (
                  <div style={clubDescStyle}>{club.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
