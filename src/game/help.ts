/** Content for the How to Play screen. Keep it in step with the controls (engine/input.ts) and each act. */

export interface ControlHelp {
  action: string;
  keys: string;
  touch: string;
}

export const CONTROLS: ControlHelp[] = [
  { action: 'Move', keys: 'Arrow keys or A / D', touch: '◀ ▶ buttons' },
  { action: 'Jump', keys: 'Space, Up, W or Z', touch: 'A button' },
  { action: 'Action', keys: 'X, S, Down or Shift', touch: 'B button' },
  { action: 'Pause', keys: 'P or Esc', touch: 'Pause button' },
];

export const GENERAL_TIPS = [
  'Get home. Each act has its own rules, so read the hints at the start of every act.',
  'Flags (and buoys) are checkpoints: dying only sends you back to the last one.',
  'Your total time and lives lost are scored. Lower is better for both.',
];

export interface ActHelp {
  id: number;
  name: string;
  tips: string[];
}

export const ACT_TIPS: ActHelp[] = [
  {
    id: 1,
    name: 'The Storm',
    tips: [
      'You sail a ship. Arrows steer it in all four directions (Up and Down use the Jump and Action keys).',
      'Slip through the gaps in the reef. The gaps slide up and down, so time your pass.',
      'A shrinking red ring warns of lightning. Chevrons on the screen edges warn of a gust that will push you.',
    ],
  },
  {
    id: 2,
    name: "The Cyclops' Cave",
    tips: [
      'Hold ACTION to creep: slow, but silent.',
      'Stand fully inside a shadow, still or creeping, to hide. Running through one will not hide you, and a flaring brazier lights up nearby shadows.',
      'Bumping sheep, the dog, and falling rocks all make noise, and the Cyclops walks over to look.',
      'Take the stake from his den. That blinds him, and he then hunts by sound: creep, or stay close to the stampeding sheep to hide your noise.',
    ],
  },
  {
    id: 3,
    name: 'The Sirens',
    tips: [
      'The song drags you backwards, and surges after every beat.',
      'Press ACTION just as the ring closes on you to resist the pull for a moment.',
      'A badly timed press does nothing, so wait for the next beat and keep moving.',
    ],
  },
  {
    id: 4,
    name: 'Scylla and Charybdis',
    tips: [
      'The screen scrolls and the whirlpool on the left edge is deadly. It also drags at you when you are close.',
      'Scylla aims where you are going, so standing still or running dead straight is not safe. Change speed or direction.',
      'You can jump twice before you land. Hold ACTION to sprint (it tires you, and running it dry leaves you winded and slower).',
      'Cracked rock crumbles if you linger. Hop the spikes and the thrown logs.',
    ],
  },
  {
    id: 5,
    name: 'Ithaca',
    tips: [
      'In the hall you are a beggar. If a suitor sees you running, jumping or walking tall, suspicion fills and your disguise fails.',
      'Hold ACTION to stoop. You are safe in view but slow, and stooping tires you out.',
      'Hop the tables while nobody is looking.',
      'At the great bow: hold ACTION to draw and release in the green. Then press JUMP when the marker lines up with the rings.',
    ],
  },
];
