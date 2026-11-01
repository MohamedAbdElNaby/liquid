import { memo, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useLiquidColorScheme, type LiquidColorSchemeSetting } from '../theme';
import { GlassShapeV2 } from './GlassShapeV2';

/** Minimum touch target: 44 pt on iOS, 48 dp on Android. */
export const GLASS_BUTTON_V2_SIZE = Platform.OS === 'android' ? 48 : 44;

export type GlassButtonV2Props = {
  /** An icon; alone it makes a circle. */
  icon?: ReactNode;
  /** A text label; makes a capsule. */
  title?: string;
  onPress?: () => void;
  /** Fills the glass (prominent button). The content turns white. */
  tintColor?: ColorValue;
  /** Colour of the title; icons colour themselves. */
  color?: ColorValue;
  /** @default 'regular' */
  variant?: 'regular' | 'clear';
  /**
   * 0 = regular to 1 = clear. Android: continuous (less blur and frost).
   * iOS: the nearer system style. Overrides `variant`.
   */
  clarity?: number;
  /** Android: how strongly the page bends at the rim, 0 to 1. @default 1 */
  refraction?: number;
  /** Android: brightness of the lit rim, 0 to 1. @default 1 */
  shine?: number;

  colorScheme?: LiquidColorSchemeSetting;
  reduceTransparency?: 'system' | 'on' | 'off';
  disabled?: boolean;
  /** Required when there is no `title`, so VoiceOver and TalkBack can read it. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** A floating glass circle or capsule, like the iOS 26 header buttons. */
export const GlassButtonV2 = memo(function GlassButtonV2Impl({
  icon,
  title,
  onPress,
  tintColor,
  color,
  variant = 'regular',
  colorScheme = 'system',
  reduceTransparency = 'system',
  clarity,
  refraction,
  shine,
  disabled = false,
  accessibilityLabel,
  style,
}: GlassButtonV2Props) {
  const dark = useLiquidColorScheme(colorScheme) === 'dark';
  const contentColor =
    color ?? (tintColor != null ? '#FFFFFF' : dark ? '#FFFFFF' : '#000000');
  const circle = title == null;
  return (
    <GlassShapeV2
      shape="capsule"
      variant={variant}
      clarity={clarity}
      refraction={refraction}
      shine={shine}
      tintColor={tintColor}
      interactive={!disabled}
      colorScheme={colorScheme}
      reduceTransparency={reduceTransparency}
      style={[circle ? styles.circle : styles.capsule, style]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled }}
        style={[styles.content, disabled && styles.disabled]}
      >
        {icon != null ? <View style={styles.icon}>{icon}</View> : null}
        {title != null ? (
          <Text style={[styles.title, { color: contentColor }]}>{title}</Text>
        ) : null}
      </Pressable>
    </GlassShapeV2>
  );
});

const styles = StyleSheet.create({
  circle: {
    width: GLASS_BUTTON_V2_SIZE,
    height: GLASS_BUTTON_V2_SIZE,
  },
  capsule: {
    height: GLASS_BUTTON_V2_SIZE,
    minWidth: GLASS_BUTTON_V2_SIZE,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 6,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
});
