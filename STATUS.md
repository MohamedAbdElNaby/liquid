# Work status

Paused on 2026-10-22. This file tracks where the work stopped. It is not published to npm.

## Done

- Native `RNLiquidGlassView` and `RNLiquidGlassContainerView` (Fabric).
  - iOS: `UIGlassEffect` / `UIGlassContainerEffect` on iOS 26+, system blur fallback.
  - Android: AndroidLiquidGlass (`io.github.kyant0:backdrop:1.0.6`) in a `ComposeView`, fed by `ViewTreeBackdrop`, which records the views behind the glass into a `RenderNode` before every frame.
- JS components: `LiquidGlassView`, `LiquidGlassContainer`, `LiquidButton`, `LiquidIconButton`, `LiquidToggle`, `LiquidSlider`, `LiquidSegmentedControl`, `LiquidSearchBar`, `LiquidBottomTabBar`, `LiquidTopTabBar`, `LiquidHeader` (+ `create*` factories).
- Typecheck and lint pass. The Android library compiles with Kotlin 2.2 (React Native 0.88). The iOS app builds with Xcode 27.

## Tested in `../LiquidPlayground` (React Native CLI app)

Install the library there from a tarball: `yarn prepare && npm pack --pack-destination ..`, then `npm install ../mohamedabdelnaby-react-native-liquid-0.1.0.tgz` in the playground.

- Android (Xiaomi, Android 13): real glass on every component, tab switching, push/back, scrolling over sliders.
- iOS 27 simulator: real glass, tab bar with accessory, container merging, controls, Glass Lab.

Bugs found and fixed while testing:

1. bob rewrote `./native` to `./native/index.js`, so the web fallback shipped on both platforms. Platform files must share the extension (`NativeLiquidGlass.native.tsx` + `NativeLiquidGlass.tsx`).
2. ComposeView was measured before attach, which crashed. It is now laid out from its attach listener.
3. Glass went blank after switching tabs or navigating. Compose bound to the react-native-screens Fragment view lifecycle. Fixed with `GlassLifecycleOwner`.
4. `LiquidSlider` blocked vertical scrolling. It now claims only horizontal drags.
5. Android default blur raised to 8 dp (`clear`: 2 dp) so bars stay readable.

## Next steps

- [ ] iOS: `colorScheme="dark"` does not darken `UIGlassEffect`, which adapts to what is behind it, so white labels can sit on light glass. Plan: when the scheme is `dark` and no tint is set, apply a subtle dark `tintColor` in `RNLiquidGlassView.mm`, then rebuild iOS.
- [ ] Check on iOS: Discover (bar header + top tabs), Details (floating header), Bar header screen.
- [ ] Check on Android: Details screen (floating header back button and `headerRight` capsule) and Home captions.
- [ ] The Expo `example/` app can't bundle on this machine: `~/node_modules` contains Expo SDK 54 packages that shadow the example's SDK 58 ones. Either remove `~/node_modules` and `~/package.json`, or switch the example to a vanilla React Native app.
- [ ] Push to `origin` (https://github.com/MohamedAbdElNaby/liquid.git).

## Commands

```sh
# library
yarn typecheck && yarn lint && yarn prepare

# playground (in ../LiquidPlayground)
npx react-native start
cd android && ./gradlew installDebug
cd ios && LANG=en_US.UTF-8 pod install && open LiquidPlayground.xcworkspace
```
