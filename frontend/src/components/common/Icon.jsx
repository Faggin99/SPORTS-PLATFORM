import { useTheme } from '../../contexts/ThemeContext';

/**
 * Icon Wrapper Component
 *
 * Wraps Lucide icons to ensure they re-render properly when theme changes
 * and maintain visibility in both light and dark themes.
 *
 * Usage:
 * import { Icon } from './components/common/Icon';
 * import { ChevronLeft } from 'lucide-react';
 *
 * <Icon icon={ChevronLeft} size={18} />
 *
 * Or use directly with inline icon:
 * <Icon icon={<ChevronLeft size={18} />} />
 */
export function Icon({ icon: IconComponent, size = 20, color, className, style, ...props }) {
  const { theme, colors } = useTheme();

  // If icon is already a component element (like <ChevronLeft />), render it directly
  if (typeof IconComponent !== 'function') {
    return IconComponent;
  }

  const iconStyle = {
    color: color || 'currentColor',
    display: 'inline-block',
    verticalAlign: 'middle',
    flexShrink: 0,
    ...style,
  };

  return (
    <IconComponent
      key={theme} // Force re-render on theme change
      size={size}
      className={className}
      style={iconStyle}
      strokeWidth={2}
      {...props}
    />
  );
}
