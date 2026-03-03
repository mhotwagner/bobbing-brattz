import igniteBg from "/assets/ignite-bg.webp";
import glamourBg from "/assets/glamour-bg-new.webp";
import whitelotusBg from "/assets/whitelotus-bg-new.webp";

// Item assets
import igniteChiliSrc from "/assets/ignite-chili.webp";
import igniteCocktailSrc from "/assets/ignite-cocktail.webp";
import igniteDiscoballSrc from "/assets/ignite-discoball.webp";
import igniteFirepitSrc from "/assets/ignite-firepit.webp";
import whitelotusHatSrc from "/assets/whitelotus-hat.webp";
import whitelotusLotusSrc from "/assets/whitelotus-lotus.webp";
import whitelotusMojitoSrc from "/assets/white-lotus-mojito.webp";
import whitelotusPoolfloatSrc from "/assets/whitelotus-poolfloat.webp";
import glamourBouquetSrc from "/assets/glamour-bouquet.webp";
import glamourChampagneSrc from "/assets/glamour-champagne.webp";
import glamourCorkSrc from "/assets/glamour-cork.webp";
import glamourRingSrc from "/assets/glamour-ring.webp";

export const ARENAS = [
  {
    id: "ignite",
    name: "Ignite",
    subtitle: "Red Party",
    bg: igniteBg,
    ringColor: "rgba(255, 60, 30, 0.35)",
    ringBorder: "rgba(255, 100, 50, 0.8)",
    items: ["ignite-chili", "ignite-cocktail", "ignite-discoball", "ignite-firepit"],
  },
  {
    id: "whitelotus",
    name: "White Lotus",
    subtitle: "White Party",
    bg: whitelotusBg,
    ringColor: "rgba(255, 255, 255, 0.2)",
    ringBorder: "rgba(255, 255, 255, 0.7)",
    items: ["whitelotus-hat", "whitelotus-lotus", "white-lotus-mojito", "whitelotus-poolfloat"],
  },
  {
    id: "glamour",
    name: "Tropical Glamour",
    subtitle: "Wedding",
    bg: glamourBg,
    ringColor: "rgba(255, 200, 100, 0.25)",
    ringBorder: "rgba(255, 215, 0, 0.8)",
    items: ["glamour-bouquet", "glamour-champagne", "glamour-cork", "glamour-ring"],
  },
];

export const ARENA_MAP = Object.fromEntries(
  ARENAS.map((a) => [a.id, a])
);

export const ITEM_ASSETS = {
  "ignite-chili": igniteChiliSrc,
  "ignite-cocktail": igniteCocktailSrc,
  "ignite-discoball": igniteDiscoballSrc,
  "ignite-firepit": igniteFirepitSrc,
  "whitelotus-hat": whitelotusHatSrc,
  "whitelotus-lotus": whitelotusLotusSrc,
  "white-lotus-mojito": whitelotusMojitoSrc,
  "whitelotus-poolfloat": whitelotusPoolfloatSrc,
  "glamour-bouquet": glamourBouquetSrc,
  "glamour-champagne": glamourChampagneSrc,
  "glamour-cork": glamourCorkSrc,
  "glamour-ring": glamourRingSrc,
};
