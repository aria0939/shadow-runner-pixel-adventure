// levels/levels.js — Level layouts in a compact textual format.
//
// Each level is a grid of characters where:
//   '.'  = empty
//   '#'  = solid ground (grass-top)
//   'D'  = dirt block
//   'B'  = brick block
//   'Q'  = question block (gives a coin)
//   'P'  = pipe section
//   'S'  = stone platform
//   'C'  = coin pickup
//   'E'  = enemy spawn (walker)
//   'F'  = flying enemy spawn
//   'H'  = checkpoint flag
//   'X'  = exit gate
//   '@'  = hero spawn point
//   'A'  = shadow energy pickup
//   '^'  = spike / hazard (Level 2+)
//
// Tile size = 32 px on screen (after scaling).
// Hero jump height ≈ 5 tiles (160px). Place platforms within 4 tiles vertically.

export const TILE_SIZE = 32;

export const LEVELS = [
  {
    name: "Green Valley",
    nameFa: "درهٔ سبز",
    subtitle: "آموزشی",
    bg: "bg-green-valley",
    rows: [
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "..........................C.C.C...............C.C.C...........................................",
      "..........................SSSS...............SSSSS............................................",
      "..........C.C...............................C.C.C..............................................",
      "..........SSS......................Q.Q.Q.....................................................",
      "..................................SSS..........................................................",
      "@.........C......................C..........C....E.....C.C.C......H.................X..........",
      "................................................................................................",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
      "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
    ],
  },
];

export function getLevel(index) {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))];
}
