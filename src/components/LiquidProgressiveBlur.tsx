import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  UIManager,
  View,
  type ColorValue,
  type ViewProps,
} from 'react-native';
import { LiquidGlassView } from '../LiquidGlassView';
import { NativeLiquidProgressiveBlur } from '../NativeLiquidGlass';
import type { LiquidColorSchemeSetting } from '../theme';

/** A fade longer than any view: the glass fades over its whole height. */
const WHOLE_HEIGHT = 100000;

/** Android: glass layers stacked into one progressive blur. */
const ANDROID_LAYERS = 3;

let nativeBlur: boolean | undefined;

/**
 * Whether the app binary has the native view. An over-the-air JS update can
 * reach a binary built before it, which would draw "Unimplemented component"
 * in its place: such a binary gets the glass fallback instead.
 */
function hasNativeBlur() {
  if (nativeBlur === undefined) {
    nativeBlur =
      Platform.OS === 'ios' &&
      UIManager.hasViewManagerConfig('RNLiquidProgressiveBlur');
  }
  return nativeBlur;
}

export type LiquidProgressiveBlurProps = ViewProps & {
  /** Blur radius where the blur is full, in points (Android: dp). @default 20 */
  maxBlur?: number;
  /** A colour over the blur that fades out with it, e.g. `rgba(255, 255, 255, 0.8)`. */
  tintColor?: ColorValue;
  /** How many points at the bottom fade out. @default the whole height */
  fadeHeight?: number;
  /** `'ease'` fades along an S-curve with no visible start or end. @default 'ease' */
  fadeCurve?: 'linear' | 'ease';
  /** Android: overrides `maxBlur`, in dp. */
  blurRadius?: number;
  /** Android: pins the light or dark material. */
  colorScheme?: LiquidColorSchemeSetting;
};

/** Glass with no lens, rim or shadow: only the blurred page and the tint. */
const PLAIN_GLASS = {
  highlight: false,
  shadow: false,
  refractionHeight: 0,
  refractionAmount: 0,
} as const;

/**
 * A blur that is strongest at the top and weakens down the view, with a tint
 * fading out with it: the iOS 26 scroll edge behind a bar (Photos, Telegram).
 *
 * iOS: a real progressive blur (Core Animation's variable blur, falling back
 * to an even blur that fades out). Android: plain glass layers stacked, each
 * blurring more and fading out higher, so the blur weakens down the view.
 * iOS binaries built before this view: one plain glass fading the same way.
 */
export function LiquidProgressiveBlur({
  maxBlur = 20,
  tintColor,
  fadeHeight,
  fadeCurve = 'ease',
  blurRadius,
  colorScheme,
  pointerEvents = 'none',
  ...rest
}: LiquidProgressiveBlurProps) {
  if (hasNativeBlur()) {
    return (
      <NativeLiquidProgressiveBlur
        {...rest}
        pointerEvents={pointerEvents}
        maxBlurRadius={maxBlur}
        blurTintColor={tintColor}
        fadeHeight={fadeHeight ?? 0}
        fadeCurve={fadeCurve}
      />
    );
  }
  if (Platform.OS === 'android') {
    return (
      <StackedBlur
        {...rest}
        pointerEvents={pointerEvents}
        blur={blurRadius ?? maxBlur}
        tintColor={tintColor}
        fadeHeight={fadeHeight}
        fadeCurve={fadeCurve}
        colorScheme={colorScheme}
      />
    );
  }
  return (
    <LiquidGlassView
      {...rest}
      {...PLAIN_GLASS}
      pointerEvents={pointerEvents}
      glassStyle="regular"
      colorScheme={colorScheme}
      tintColor={tintColor}
      blurRadius={blurRadius ?? maxBlur}
      fadeBottom={fadeHeight ?? WHOLE_HEIGHT}
      fadeCurve={fadeCurve}
    />
  );
}

/**
 * Android's progressive blur. Glass never samples other glass, so each layer
 * blurs the page itself: the weakest spans the whole fade, each next one
 * blurs more and fades out sooner. At the top all are solid and the
 * strongest shows; going down they fade out one by one, leaving weaker blur.
 */
function StackedBlur({
  blur,
  tintColor,
  fadeHeight,
  fadeCurve,
  colorScheme,
  style,
  onLayout,
  ...rest
}: ViewProps & {
  blur: number;
  tintColor?: ColorValue;
  fadeHeight?: number;
  fadeCurve: 'linear' | 'ease';
  colorScheme?: LiquidColorSchemeSetting;
}) {
  const [height, setHeight] = useState(0);
  const fade = fadeHeight != null ? Math.min(fadeHeight, height) : height;
  const solid = height - fade;
  return (
    <View
      {...rest}
      style={style}
      onLayout={(event) => {
        setHeight(event.nativeEvent.layout.height);
        onLayout?.(event);
      }}
    >
      {height > 0
        ? Array.from({ length: ANDROID_LAYERS }, (_, index) => {
            // Its share of the fade: all of it for the weakest (first) layer.
            const reach = (fade * (ANDROID_LAYERS - index)) / ANDROID_LAYERS;
            return (
              <LiquidGlassView
                key={index}
                {...PLAIN_GLASS}
                glassStyle="clear"
                colorScheme={colorScheme}
                // Every layer carries the tint: where one fades out, the
                // next one's tint shows, so it fades with the blur.
                tintColor={tintColor}
                blurRadius={(blur * (index + 1)) / ANDROID_LAYERS}
                fadeBottom={reach}
                fadeCurve={fadeCurve}
                style={[styles.layer, { height: solid + reach }]}
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
