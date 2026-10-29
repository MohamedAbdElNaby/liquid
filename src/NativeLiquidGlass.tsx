import { Switch, View, type ViewProps, type ViewStyle } from 'react-native';
import type { NativeProps as GlassProps } from './native/LiquidGlassViewNativeComponent';
import type { NativeProps as ContainerProps } from './native/LiquidGlassContainerViewNativeComponent';
import type { NativeProps as SwitchProps } from './native/LiquidSwitchNativeComponent';
import type { NativeProps as SliderProps } from './native/LiquidSliderNativeComponent';
import type { NativeProps as TabBarProps } from './native/LiquidTabBarNativeComponent';
import type { NativeProps as MenuProps } from './native/LiquidMenuNativeComponent';
import type { NativeProps as SearchProps } from './native/LiquidSearchNativeComponent';

// Fallbacks for platforms without the native components (e.g. web).

export function NativeLiquidGlassView({
  fadeBottom: _fadeBottom,
  rimColor: _rimColor,
  rimWidth: _rimWidth,
  rimSideOpacity: _rimSideOpacity,
  rimShadeColor: _rimShadeColor,
  rimEdgeColor: _rimEdgeColor,
  rimGradient: _rimGradient,
  sheenOpacity: _sheenOpacity,
  glassStyle,
  glassTintColor,
  cornerRadius,
  colorScheme,
  style,
  interactive: _interactive,
  morph: _morph,
  blurRadius: _blurRadius,
  refractionHeight: _refractionHeight,
  refractionAmount: _refractionAmount,
  chromaticAberration: _chromaticAberration,
  depthEffect: _depthEffect,
  highlight: _highlight,
  shadow: _shadow,
  children,
  ...rest
}: GlassProps) {
  const dark = colorScheme === 'dark';
  const clear = glassStyle === 'clear';
  const material = {
    backgroundColor: dark
      ? `rgba(28, 28, 30, ${clear ? 0.3 : 0.6})`
      : `rgba(255, 255, 255, ${clear ? 0.25 : 0.6})`,
    borderRadius: cornerRadius ?? undefined,
    borderWidth: 1,
    borderColor: dark
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.5)',
    // Honored by react-native-web.
    backdropFilter: 'blur(20px) saturate(180%)',
  } as ViewStyle;

  return (
    <View {...rest} style={[material, style]}>
      {glassTintColor != null ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: cornerRadius ?? undefined,
            backgroundColor: glassTintColor,
            opacity: 0.75,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}

export function NativeLiquidGlassContainerView({
  spacing: _spacing,
  ...rest
}: ContainerProps) {
  return <View {...(rest as ViewProps)} />;
}

export function NativeLiquidSwitch({
  value,
  disabled,
  onTintColor,
  offTintColor,
  thumbTintColor,
  onValueChange,
  style,
}: SwitchProps) {
  return (
    <Switch
      value={value ?? false}
      disabled={disabled ?? false}
      trackColor={{ true: onTintColor, false: offTintColor }}
      thumbColor={thumbTintColor as string | undefined}
      onValueChange={(next) =>
        onValueChange?.({ nativeEvent: { value: next } } as never)
      }
      style={style}
    />
  );
}

export function NativeLiquidSlider({ style }: SliderProps) {
  return <View style={style} />;
}

export function NativeLiquidTabBar({
  selectedIndex: _selectedIndex,
  glassStyle: _glassStyle,
  glassTintColor: _glassTintColor,
  selectionColor: _selectionColor,
  focusedTintColor: _focusedTintColor,
  lensTintColor: _lensTintColor,
  backdropBlur: _backdropBlur,
  colorScheme: _colorScheme,
  lensEnabled: _lensEnabled,
  pagerPosition: _pagerPosition,
  onTabSelect: _onTabSelect,
  onTabLongPress: _onTabLongPress,
  ...rest
}: TabBarProps) {
  return <View {...(rest as ViewProps)} />;
}

export function NativeLiquidMenu({
  items: _items,
  title: _title,
  glassStyle: _glassStyle,
  colorScheme: _colorScheme,
  menuWidth: _menuWidth,
  bare: _bare,
  onItemSelect: _onItemSelect,
  onOpenChange: _onOpenChange,
  ...rest
}: MenuProps) {
  return <View {...(rest as ViewProps)} />;
}

export function NativeLiquidSearch({
  expanded: _expanded,
  placeholder: _placeholder,
  text: _text,
  glassStyle: _glassStyle,
  glassTintColor: _glassTintColor,
  colorScheme: _colorScheme,
  variant: _variant,
  headerHeight: _headerHeight,
  fieldHeight: _fieldHeight,
  onExpandedChange: _onExpandedChange,
  onChangeText: _onChangeText,
  onSearchSubmit: _onSearchSubmit,
  ...rest
}: SearchProps) {
  return <View {...(rest as ViewProps)} />;
}

/** The system scroll edge effect is iOS-only: nothing to do elsewhere. */
export function NativeLiquidScrollEdge(
  _props: ViewProps & { hideTopEdge?: boolean }
) {
  return null;
}

/** No scroll edge effect elsewhere: a plain view. */
export function NativeLiquidScrollEdgeContainer({
  extendScrollEdge: _extendScrollEdge,
  screenKey: _screenKey,
  ...props
}: ViewProps & { extendScrollEdge?: boolean; screenKey?: string }) {
  return <View {...props} />;
}
