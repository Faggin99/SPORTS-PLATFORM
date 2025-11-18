import React from 'react';

export default function BlockCard({ block, onClick }) {
  const activity = block.activity;

  return (
    <div className="block-card" onClick={onClick}>
      <h4>{block.name}</h4>
      {activity?.title && <p>{activity.title.title}</p>}
      {activity?.duration_minutes && <span>{activity.duration_minutes} min</span>}
    </div>
  );
}
