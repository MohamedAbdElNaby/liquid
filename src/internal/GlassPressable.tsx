import type { ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LiquidGlassView, type LiquidGlassViewProps } from '../LiquidGlassView';
import { usePressAnimation } from './animations';

export type GlassPressableProps = Omit<PressableProps, 'style' | 'children'> &
  Pick<
    LiquidGlassViewProps,
    | 'glassStyle'
    | 'tintColor'
    | 'colorScheme'
    | 'cornerRadius'
    | 'rimColor'
    | 'rimWidth'
    | 'rimSideOpacity'
    | 'rimShadeColor'
    | 'rimEdgeColor'
    | 'sheenOpacity'
    | 'blurRadius'
  > & {
    /** Style of the glass surface. */
    style?: StyleProp<ViewStyle>;
    /** How much the glass grows while pressed. @default 1.06 */
    pressScale?: number;
    children?: ReactNode;
  };

/** Glass surface that bulges while pressed, like iOS 26 interactive glass. */
export function GlassPressable({
  glassStyle,
  tintColor,
  colorScheme,
  cornerRadius,
  rimColor,
  rimWidth,
  rimSideOpacity,
  rimShadeColor,
  rimEdgeColor,
  sheenOpacity,
  blurRadius,
  style,
  pressScale = 1.06,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: GlassPressableProps) {
  const {
    pressed,
    onPressIn: animateIn,
    onPressOut: animateOut,
  } = usePressAnimation();

  const scale = pressed.interpolate({
    inputRange: [0, 1],
    outputRange: [1, pressScale],
  });

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        animateIn();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateOut();
        onPressOut?.(event);
      }}
    >
      <Animated.View
        style={[{ transform: [{ scale }] }, disabled ? styles.disabled : null]}
      >
        <LiquidGlassView
          interactive={!disabled}
          glassStyle={glassStyle}
          tintColor={tintColor}
          colorScheme={colorScheme}
          cornerRadius={cornerRadius}
          rimColor={rimColor}
          rimWidth={rimWidth}
          rimSideOpacity={rimSideOpacity}
          rimShadeColor={rimShadeColor}
          rimEdgeColor={rimEdgeColor}
          sheenOpacity={sheenOpacity}
          blurRadius={blurRadius}
          style={style}
        >
          {children}
        </LiquidGlassView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
  },
});
