import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  type ColorValue,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import {
  GlassPressable,
  type GlassPressableProps,
} from '../internal/GlassPressable';
import { useLiquidColors } from '../theme';

export type LiquidButtonSize = 'small' | 'regular' | 'large';

export type LiquidButtonProps = Omit<GlassPressableProps, 'tintColor'> & {
  /** Text of the button. Use `children` for custom content. */
  title?: string;
  /** Element rendered before the title. */
  icon?: ReactNode;
  /**
   * `glass` is the plain material. `prominent` tints the glass with
   * `tintColor`, like SwiftUI's `.glassProminent`.
   * @default 'glass'
   */
  variant?: 'glass' | 'prominent';
  /** Accent color for `prominent` buttons and the label of `glass` buttons. */
  tintColor?: ColorValue;
  /** @default 'regular' */
  size?: LiquidButtonSize;
  textStyle?: StyleProp<TextStyle>;
};

const SIZES = {
  small: { height: 34, paddingHorizontal: 14, fontSize: 15 },
  regular: { height: 44, paddingHorizontal: 20, fontSize: 17 },
  large: { height: 52, paddingHorizontal: 24, fontSize: 17 },
};

export function LiquidButton({
  title,
  icon,
  variant = 'glass',
  tintColor,
  size = 'regular',
  colorScheme,
  style,
  textStyle,
  children,
  ...rest
}: LiquidButtonProps) {
  const { colors } = useLiquidColors(colorScheme);
  const prominent = variant === 'prominent';
  const metrics = SIZES[size];
  const labelColor = prominent ? '#FFFFFF' : (tintColor ?? colors.label);

  return (
    <GlassPressable
      accessibilityRole="button"
      {...rest}
      colorScheme={colorScheme}
      tintColor={prominent ? (tintColor ?? colors.tint) : undefined}
      cornerRadius={metrics.height / 2}
      style={[
        styles.button,
        {
          height: metrics.height,
          paddingHorizontal: metrics.paddingHorizontal,
        },
        style,
      ]}
    >
      {icon}
      {title != null ? (
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: labelColor, fontSize: metrics.fontSize },
            icon != null ? styles.titleWithIcon : null,
            textStyle,
          ]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </GlassPressable>
  );
}

export type LiquidIconButtonProps = Omit<GlassPressableProps, 'children'> & {
  /** The icon to render. */
  children: ReactNode;
  /** Diameter of the button. @default 44 */
  size?: number;
};

/** Circular glass button for icons, e.g. toolbar and header actions. */
export function LiquidIconButton({
  size = 44,
  style,
  children,
  ...rest
}: LiquidIconButtonProps) {
  return (
    <GlassPressable
      accessibilityRole="button"
      {...rest}
      cornerRadius={size / 2}
      style={[styles.icon, { width: size, height: size }, style]}
    >
      {children}
    </GlassPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600',
  },
  titleWithIcon: {
    marginLeft: 8,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
