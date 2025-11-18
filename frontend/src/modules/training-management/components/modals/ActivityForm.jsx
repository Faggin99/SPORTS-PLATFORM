import React, { useState } from 'react';

/**
 * Form for creating/editing training activities
 * @param {Object} props
 * @param {Object} props.activity - The activity being edited (null for new)
 * @param {Function} props.onSubmit - Callback when form is submitted
 */
export default function ActivityForm({ activity, onSubmit }) {
  const [formData, setFormData] = useState({
    title_id: activity?.title_id || '',
    duration_minutes: activity?.duration_minutes || '',
    location: activity?.location || '',
    notes: activity?.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="activity-form">
      <div className="form-group">
        <label htmlFor="title_id">Título</label>
        <select
          id="title_id"
          name="title_id"
          value={formData.title_id}
          onChange={handleChange}
          required
        >
          <option value="">Selecione...</option>
          {/* TODO: Load titles from API */}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="duration_minutes">Duração (minutos)</label>
        <input
          type="number"
          id="duration_minutes"
          name="duration_minutes"
          value={formData.duration_minutes}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="location">Local</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notas</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="4"
        />
      </div>

      <button type="submit">Salvar</button>
    </form>
  );
}
