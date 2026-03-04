import React from "react";
import { ITEM_ASSETS } from "../lib/arenas";

const ITEM_SIZE = 48;

export default function ArenaItem({ itemId, nx, ny, asset, powerup, centerX, centerY, arenaRadius }) {
  const screenX = centerX + nx * arenaRadius;
  const screenY = centerY + ny * arenaRadius;
  const src = ITEM_ASSETS[asset];

  return (
    <div
      className={`brawl-item brawl-item--${powerup}`}
      data-item-id={itemId}
      style={{
        position: "absolute",
        left: screenX - ITEM_SIZE / 2,
        top: screenY - ITEM_SIZE / 2,
        width: ITEM_SIZE,
        height: ITEM_SIZE,
      }}
    >
      {src && <img src={src} alt={asset} draggable={false} />}
    </div>
  );
}
