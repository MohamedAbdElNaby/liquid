export type Photo = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  color: string;
};

const COLORS = [
  '#FF6B6B',
  '#FFB347',
  '#4ECDC4',
  '#5567FF',
  '#B967FF',
  '#2ECC71',
  '#FF8FB1',
  '#1E90FF',
];

const TITLES = [
  'Desert Bloom',
  'Northern Lights',
  'Coral Reef',
  'City at Dusk',
  'Alpine Lake',
  'Rain Forest',
  'Lavender Fields',
  'Open Ocean',
];

export const PHOTOS: Photo[] = TITLES.map((title, i) => ({
  id: String(i),
  title,
  subtitle: `Collection ${i + 1}`,
  image: `https://picsum.photos/id/${[10, 1015, 1016, 1036, 1039, 1043, 1050, 1069][i]}/800/600`,
  color: COLORS[i % COLORS.length]!,
}));
