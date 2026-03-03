import mattSrc from "/assets/matt.webp";
import brianSrc from "/assets/brian.webp";
import ruSrc from "/assets/ru.webp";

export const CHARACTERS = [
  { id: "matt", name: "Matt", src: mattSrc },
  { id: "brian", name: "Brian", src: brianSrc },
  { id: "ru", name: "Ru", src: ruSrc },
];

export const CHARACTER_MAP = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c])
);
