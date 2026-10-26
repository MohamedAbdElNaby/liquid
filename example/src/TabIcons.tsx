import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { color: string; size: number; focused: boolean };

// SVG tab icons. Home and Lab swap to a filled icon when focused (two icons);
// Discover and Controls keep one icon and only change color. The tab bar's
// liquid drop shows the focused version of whichever tab it passes over.

export function HomeIcon({ color, size, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DiscoverIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="m15.5 8.5-2 5-5 2 2-5z" fill={color} />
    </Svg>
  );
}

export function ControlsIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 7h10M18 7h2M4 17h2M10 17h10"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={16} cy={7} r={2.2} fill="none" stroke={color} strokeWidth={1.8} />
      <Circle cx={8} cy={17} r={2.2} fill="none" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function LabIcon({ color, size, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.5 14.3 9.7 21.5 12l-7.2 2.3L12 21.5l-2.3-7.2L2.5 12l7.2-2.3z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
