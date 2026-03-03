// Client → Server message types
export const C = {
  JOIN: "join",
  ARENA: "arena",
  START: "start",
  POS: "pos",
  FELL: "fell",
  REMATCH: "rematch",
};

// Server → Client message types
export const S = {
  ROOM: "room",
  COUNTDOWN: "countdown",
  GO: "go",
  POS: "pos",
  BUMP: "bump",
  KO: "ko",
  RESULT: "result",
  LEFT: "left",
  ERROR: "error",
  ITEM_SPAWN: "item_spawn",
  ITEM_COLLECT: "item_collect",
  ITEM_DESPAWN: "item_despawn",
  POWERUP_END: "powerup_end",
};
