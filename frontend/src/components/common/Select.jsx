import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function Select({ label, options = [], value, onChange, placeholder = 'Selecione...', fullWidth = false, ...props }) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const selectBoxRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectBoxRef.current && !selectBoxRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectBoxRef.current) {
      const rect = selectBoxRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerStyle = {
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: colors.text,
    marginBottom: '0.375rem',
  };

  const selectBoxStyle = {
    position: 'relative',
    minHeight: '2.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const placeholderStyle = {
    color: colors.textSecondary,
    fontSize: '0.875rem',
  };

  const dropdownStyle = {
    position: 'fixed',
    top: `${dropdownPosition.top}px`,
    left: `${dropdownPosition.left}px`,
    width: `${dropdownPosition.width}px`,
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxHeight: '280px',
    overflowY: 'auto',
    overflowX: 'hidden',
    zIndex: 10000,
  };

  const searchContainerStyle = {
    padding: '0.5rem',
    borderBottom: `1px solid ${colors.border}`,
    position: 'sticky',
    top: 0,
    backgroundColor: colors.background,
    zIndex: 1,
  };

  const searchInputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem 0.5rem 2rem',
    fontSize: '0.875rem',
    border: `1px solid ${colors.border}`,
    borderRadius: '0.375rem',
    backgroundColor: colors.background,
    color: colors.text,
    outline: 'none',
  };

  const searchIconStyle = {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.textSecondary,
    pointerEvents: 'none',
  };

  const optionStyle = (isSelected) => ({
    padding: '0.75rem',
    cursor: 'pointer',
    backgroundColor: isSelected ? colors.primaryLight : 'transparent',
    color: colors.text,
    borderBottom: `1px solid ${colors.border}`,
    transition: 'background-color 0.2s',
  });

  const chevronStyle = {
    transition: 'transform 0.2s',
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div ref={dropdownRef} style={dropdownStyle}>
          <div style={searchContainerStyle}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={searchIconStyle} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Buscar..."
                style={searchInputStyle}
              />
            </div>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: colors.textSecondary }}>
                Nenhum item encontrado
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  style={optionStyle(option.value === value)}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={(e) => {
                    if (option.value !== value) {
                      e.target.style.backgroundColor = colors.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (option.value !== value) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>,
      document.body
    );
  };

  return (
    <>
      <div style={containerStyle} {...props}>
        {label && <label style={labelStyle}>{label}</label>}
        <div ref={selectBoxRef} style={selectBoxStyle} onClick={() => setIsOpen(!isOpen)}>
          <span style={selectedOption ? { color: colors.text } : placeholderStyle}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown size={18} style={chevronStyle} />
        </div>
      </div>
      {renderDropdown()}
    </>
  );
}
