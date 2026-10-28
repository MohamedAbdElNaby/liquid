import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function SearchIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx={10.5}
        cy={10.5}
        r={6.5}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
      />
      <Path
        d="m15.5 15.5 5 5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function QrIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x={3}
        y={3}
        width={7}
        height={7}
        rx={2}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <Rect
        x={14}
        y={3}
        width={7}
        height={7}
        rx={2}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <Rect
        x={3}
        y={14}
        width={7}
        height={7}
        rx={2}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M14 14h3v3h-3zM18 18h3v3h-3z" fill={color} />
    </Svg>
  );
}

export function PlusIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ComposeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="m17.5 3.5 3 3L12 15l-4 1 1-4z"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 6l12 12M18 6 6 18"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
