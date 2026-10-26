# Third-party notices

## AndroidLiquidGlass

The Android glass effects (backdrop recording, blur, vibrancy, lens refraction,
highlight and shadows) in `android/src/main/java/com/mohamedabdelnaby/reactnativeliquid/backdrop`
are vendored from **AndroidLiquidGlass** by Kyant
(<https://github.com/Kyant0/AndroidLiquidGlass>), version 1.0.5 sources.

- License: Apache License 2.0, see [LICENSE-AndroidLiquidGlass](LICENSE-AndroidLiquidGlass).
- Changes: the package was renamed to `com.mohamedabdelnaby.reactnativeliquid.backdrop`, and
  support for the `RoundedRectangularShape` type from Kyant's separate `shapes` library was
  removed (only `CornerBasedShape`s such as `RoundedCornerShape` are used here).

Each vendored file keeps the original copyright notice and states this modification.
