import React from 'react';

/**
 * Modal for managing training session blocks and activities
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.block - The training block being edited
 * @param {Function} props.onSave - Callback when saving changes
 */
export default function TrainingModal({ isOpen, onClose, block, onSave }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Editar Treino</h2>
        <p>Block: {block?.name}</p>
        {/* TODO: Add ActivityForm component here */}
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={() => onSave(block)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
