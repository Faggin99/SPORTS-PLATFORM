import { SideSheet } from './SideSheet';

// Modal foi convertido em SideSheet (slide lateral).
// API mantida compatível: isOpen, onClose, title, children, size, footer.
// O prop `size` mapeia para a largura do sheet.
const sizeToWidth = {
  sm: 400,
  md: 560,
  lg: 760,
  xl: 980,
  full: 1280,
};

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  return (
    <SideSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={sizeToWidth[size] ?? sizeToWidth.md}
      footer={footer}
    >
      {children}
    </SideSheet>
  );
}
