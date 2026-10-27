import type { ReactNode } from 'react';
import {
  Pressable,
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
import { LiquidGlassView } from '../LiquidGlassView';
import { useLiquidColors } from '../theme';

type MorphProps = {
  /**
   * Animates content changes like iOS 26: the glass springs to its new size
   * while the old title and icon blur away and the new ones blur in, e.g.
   * Mute → Unmute. iOS 26 uses the glass's own press effect instead of the
   * scale animation.
   * @default false
   */
  morph?: boolean;
  /**
   * Identifies the content for `morph`. Change it to animate a change that
   * the title alone doesn't show, like a new icon. Defaults to the title.
   */
  contentKey?: string;
};

export type LiquidButtonSize = 'small' | 'regular' | 'large';

export type LiquidButtonProps = Omit<GlassPressableProps, 'tintColor'> &
  MorphProps & {
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
  morph = false,
  contentKey,
  ...rest
}: LiquidButtonProps) {
  const { colors } = useLiquidColors(colorScheme);
  const prominent = variant === 'prominent';
  const metrics = SIZES[size];
  const labelColor = prominent ? '#FFFFFF' : (tintColor ?? colors.label);
  const layout = {
    height: metrics.height,
    paddingHorizontal: metrics.paddingHorizontal,
  };
  const content = (
    <>
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
    </>
  );

  if (morph) {
    return (
      <MorphGlass
        {...rest}
        colorScheme={colorScheme}
        tintColor={prominent ? (tintColor ?? colors.tint) : undefined}
        cornerRadius={metrics.height / 2}
        contentKey={contentKey ?? title ?? ''}
        style={style}
        contentStyle={[styles.button, layout]}
      >
        {content}
      </MorphGlass>
    );
  }

  return (
    <GlassPressable
      accessibilityRole="button"
      {...rest}
      colorScheme={colorScheme}
      tintColor={prominent ? (tintColor ?? colors.tint) : undefined}
      cornerRadius={metrics.height / 2}
      style={[styles.button, layout, style]}
    >
      {content}
    </GlassPressable>
  );
}

export type LiquidIconButtonProps = Omit<GlassPressableProps, 'children'> &
  MorphProps & {
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
  morph = false,
  contentKey,
  ...rest
}: LiquidIconButtonProps) {
  if (morph) {
    return (
      <MorphGlass
        {...rest}
        cornerRadius={size / 2}
        contentKey={contentKey ?? ''}
        style={style}
        contentStyle={[styles.icon, { width: size, height: size }]}
      >
        {children}
      </MorphGlass>
    );
  }

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
  disabled: {
    opacity: 0.45,
  },
});

export type MorphGlassProps = Omit<
  GlassPressableProps,
  'children' | 'pressScale'
> & {
  contentKey: string;
  contentStyle: GlassPressableProps['style'];
  children: ReactNode;
};

/**
 * The glass is the outermost view, so a size change springs from where the
 * button is laid out. The content is keyed: a new key replaces it, and the
 * native glass blurs the old content out and the new content in.
 */
export function MorphGlass({
  glassStyle,
  tintColor,
  colorScheme,
  cornerRadius,
  style,
  contentKey,
  contentStyle,
  disabled,
  children,
  ...rest
}: MorphGlassProps) {
  return (
    <LiquidGlassView
      morph
      interactive={!disabled}
      glassStyle={glassStyle}
      tintColor={tintColor}
      colorScheme={colorScheme}
      cornerRadius={cornerRadius}
      style={[style, disabled ? styles.disabled : null]}
    >
      <Pressable
        key={contentKey}
        accessibilityRole="button"
        {...rest}
        disabled={disabled}
        style={contentStyle}
      >
        {children}
      </Pressable>
    </LiquidGlassView>
  );
}
