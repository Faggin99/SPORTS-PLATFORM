import React from 'react';
import BlockCard from './BlockCard';

export default function DayColumn({ session, onBlockClick }) {
  return (
    <div className="day-column">
      <h3>{session.day_name}</h3>
      <p>{session.date}</p>
      <div className="blocks">
        {session.blocks?.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            onClick={() => onBlockClick(block)}
          />
        ))}
      </div>
    </div>
  );
}
