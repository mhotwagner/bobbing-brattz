import React, { useState } from "react";
import { CHARACTERS } from "../lib/characters";
import CharacterPicker from "../components/CharacterPicker";

export default function Landing({ onQuickPlay, onPrivateRoom }) {
  const [character, setCharacter] = useState(null);

  return (
    <div className="brawl-landing">
      <h1>Brat Brawl</h1>
      <p>Knock 'em off the island. Last one standing wins.</p>

      <CharacterPicker
        characters={CHARACTERS}
        selected={character}
        taken={[]}
        onSelect={setCharacter}
      />

      <div className="brawl-landing__actions">
        <button
          className="brawl-btn"
          onClick={() => character && onQuickPlay(character)}
          disabled={!character}
        >
          Quick Play
        </button>
        <button
          className="brawl-btn brawl-btn--secondary"
          onClick={() => character && onPrivateRoom(character)}
          disabled={!character}
        >
          Private Room
        </button>
      </div>
    </div>
  );
}
