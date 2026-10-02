export interface Palette {
  skyTop: string;
  skyBottom: string;
  far: string;
  mid: string;
  solid: string;
  solidTop: string;
  solidDark: string;
  water: string;
  foam: string;
  hazard: string;
  accent: string;
  shadow: string;
}

export const PALETTES: Palette[] = [
  // 1 The Storm: grey-teal
  {
    skyTop: '#16222b', skyBottom: '#4a6572', far: '#26414d', mid: '#1f3540',
    solid: '#6b4a2f', solidTop: '#8a6a45', solidDark: '#4a331f',
    water: '#2d6a7a', foam: '#cfe8ee', hazard: '#b8b8b8', accent: '#ffd166', shadow: '#000000',
  },
  // 2 The Cyclops' Cave: firelit
  {
    skyTop: '#120a08', skyBottom: '#2a1410', far: '#1c0f0b', mid: '#26150f',
    solid: '#4a3a32', solidTop: '#6a5648', solidDark: '#2e231d',
    water: '#3b2a24', foam: '#d9a066', hazard: '#d9a066', accent: '#ff9f1c', shadow: '#000000',
  },
  // 3 The Sirens: blue-gold
  {
    skyTop: '#1d4e89', skyBottom: '#f2c14e', far: '#3a6ea5', mid: '#2d5986',
    solid: '#c9b79c', solidTop: '#e8d9bd', solidDark: '#9c8a70',
    water: '#2a73b5', foam: '#ffffff', hazard: '#d4a017', accent: '#fff3b0', shadow: '#0a2540',
  },
  // 4 Scylla and Charybdis: dark red
  {
    skyTop: '#2b0a0a', skyBottom: '#8c2f1c', far: '#4a1410', mid: '#3a0f0c',
    solid: '#3d3535', solidTop: '#5a4f4f', solidDark: '#262020',
    water: '#5a1a1a', foam: '#e07a5f', hazard: '#e63946', accent: '#ffb4a2', shadow: '#000000',
  },
  // 5 Ithaca: dawn
  {
    skyTop: '#5b6ea8', skyBottom: '#ffd6a5', far: '#8e9aaf', mid: '#6b8f71',
    solid: '#7a6b4f', solidTop: '#8fb369', solidDark: '#5c4d36',
    water: '#6fa8dc', foam: '#ffffff', hazard: '#b08968', accent: '#ffe8a3', shadow: '#000000',
  },
];
