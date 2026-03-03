import React from "react";

export default function CharacterPicker({ characters, selected, taken, onSelect }) {
  return (
    <div className="brawl-char-picker">
      {characters.map((c) => {
        const isTaken = taken.includes(c.id);
        const isSelected = selected === c.id;
        return (
          <div
            key={c.id}
            className={`brawl-char-card${isSelected ? " brawl-char-card--selected" : ""}${isTaken ? " brawl-char-card--taken" : ""}`}
            onClick={() => !isTaken && onSelect(c.id)}
          >
            <img src={c.src} alt={c.name} draggable={false} />
            <span>{c.name}</span>
          </div>
        );
      })}
    </div>
  );
}
