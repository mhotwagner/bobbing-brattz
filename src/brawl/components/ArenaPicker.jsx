import React from "react";

export default function ArenaPicker({ arenas, selected, onSelect }) {
  return (
    <div className="brawl-arena-picker">
      {arenas.map((a) => (
        <div
          key={a.id}
          className={`brawl-arena-card${selected === a.id ? " brawl-arena-card--selected" : ""}`}
          style={{ backgroundImage: `url(${a.bg})` }}
          onClick={() => onSelect(a.id)}
        >
          <span>{a.name}</span>
        </div>
      ))}
    </div>
  );
}
