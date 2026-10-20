// Team colours. Each army gets one pair (primary tunic/shield, secondary trim/crest); the
// client builds a palette row from it. Armies in one battle never share a pair.

export interface TeamColor {
  name: string;
  primary: number;
  secondary: number;
}

export const TEAM_COLORS: TeamColor[] = [
  { name: 'Crimson', primary: 0xb3262c, secondary: 0xe3b456 },
  { name: 'Royal blue', primary: 0x2b4fb5, secondary: 0xe8e4d8 },
  { name: 'Purple', primary: 0x6b2c8f, secondary: 0xe3b23c },
  { name: 'Green', primary: 0x2f7d3b, secondary: 0xeadcb0 },
  { name: 'Orange', primary: 0xd2691f, secondary: 0x3b2a1a },
  { name: 'Teal', primary: 0x16898a, secondary: 0xf0ece0 },
  { name: 'Black', primary: 0x2c2c33, secondary: 0xc8333a },
  { name: 'Ochre', primary: 0xcf9e1f, secondary: 0x2c4c9c },
  { name: 'White', primary: 0xe4ded0, secondary: 0x3456a8 },
  { name: 'Maroon', primary: 0x7c1b2d, secondary: 0xd6b47e },
  { name: 'Sky', primary: 0x5b9bd5, secondary: 0xf2efe6 },
  { name: 'Magenta', primary: 0xa3297b, secondary: 0x1f1a24 },
];
