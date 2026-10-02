export const SPRITE_COLORS: Record<string, string | undefined> = {
  h: '#3b2a1a', // hair
  s: '#e0ac82', // skin
  r: '#b3342b', // tunic
  b: '#5a3a1e', // belt and boots
  w: '#f2f2f2',
};

const TOP = [
  '....hhhh....',
  '...hhhhhh...',
  '...hsssssh..',
  '...ssssss...',
  '....ssss....',
  '...rrrrrr...',
  '..rrrrrrrr..',
  '..srrrrrrs..',
  '..srrbbrrs..',
  '..srrrrrrs..',
  '...rrrrrr...',
];

const LEGS_IDLE = ['...rr..rr...', '...rr..rr...', '...rr..rr...', '...bb..bb...', '..bbb..bbb..'];
const LEGS_A = ['...rr.rr....', '..rr...rr...', '..rr...rr...', '..bb...bb...', '.bbb...bbb..'];
const LEGS_B = ['....rrrr....', '....rrrr....', '...rr..rr...', '...bb..bb...', '..bbb..bbb..'];

/** Each frame is 12 wide and 16 tall; the physics body is 10x14 drawn at (-1, -2). */
export const ODYSSEUS = {
  idle: [...TOP, ...LEGS_IDLE],
  runA: [...TOP, ...LEGS_A],
  runB: [...TOP, ...LEGS_B],
};
