# Changelog

## 1.4.2 (2026-10-30)

Includes the 1.4.1 changes below: 1.4.1 was tagged on GitHub but never
published to npm.

### Fixed

- Android: `LiquidMenu` opens like iOS. The menu grows out of the button as a
  drop: clear glass over the button at first (no more dark disc), then its
  blur, material and shadow build up as it grows and the items sharpen in. It
  starts on the first frame and grows frame by frame, so it no longer pauses
  or jumps when opening the menu stalls the app. The button stays under the
  drop until the drop covers it, and comes back as the menu shrinks into it.
- Android: a `bare` `LiquidMenu` inside a glass (a toolbar capsule) opens out of
  that whole glass, like iOS: the capsule becomes the drop that grows into the
  menu, and the menu shrinks back into the capsule when it closes.
- Android: the end of a menu's close is smooth, like iOS. The drop and the
  button it shrinks into cross-fade while the drop is nearly the button's size,
  instead of the button popping back under a drop still on screen, and the
  close ends there rather than in the spring's slow tail.
- Android: a morph could snap to its end. Its spring ran on the clock, so when
  the app stalled as the morph started (a busy GPU, a screen recorder), it had
  already finished by the next frame. It now advances once per drawn frame, by
  at most a 30 fps frame, so it always stretches through.
- Android: glass no longer re-records what is behind it on every frame when
  nothing there changed, and glass that is off screen is skipped. A new
  recording makes the GPU blur that glass again, so every glass on screen was
  re-blurred on every frame of any animation. Busy screens animate faster
  (Glass Lab: UI thread per frame 25 ms → 8 ms).

## 1.4.1 (2026-10-30, not published to npm; shipped in 1.4.2)

### Changed

- Android: regular glass blurs at 20 dp by default (was 8), a frost closer to
  iOS regular glass; in dark mode it lightens what is behind it, like iOS,
  instead of dimming it into navy pills. Pass `blurRadius` to keep the old
  look.

### Fixed

- Header: `useLiquidNavigationHeader(navigation, …)` gave a TypeScript error
  (TS2345) with React Navigation's own `navigation` object in 1.4.0. The
  header's `addListener` type is loose again, so every navigator's
  `navigation` is accepted.
- Android: a `morph` glass flashed its final shape for one frame before
  animating from the old one (the Select / menu buttons of the example). The
  old shape is now applied while the view is laid out, so the first frame at
  the new size already starts from it.
- Android: the tab bars' lifted drop (bottom and top) had a thick white
  outline. Its edge is now a faint glint on a hairline, like iOS.
- Android: when a morph also added or removed a child (e.g. the toolbar's
  "•••" menu), the content that stayed (the "≡") jumped to its new place
  while the glass was still stretching. Like iOS, it now fades out and back
  in with the rest.
- Android: content in a morphing glass could stay half faded (e.g. the ✕ of
  the example's toolbar) when a second morph started during the fade. The
  fade now always returns to the content's own opacity.
- Android: in dark mode a neighbouring glass was drawn into a lens as a dark
  grey pill, showing as a dark smudge during morphs. It is now the same light
  frost as the glass itself.
- Bottom tab bar search: no more "Passing an object as the argument to
  'navigate' is deprecated" warning from React Navigation 7 when the search
  opens, changes or closes.

## 1.4.0 (2026-10-30)

Glass edges that shine, a progressive blur, and a header that follows its
screen. Adds native props and two native views on iOS: after upgrading run
`cd ios && pod install` and rebuild the app (a JS reload is not enough).

### New

**Glass edges** (`LiquidGlassView`, `LiquidButton`, `LiquidIconButton`, the header's glass)

- `specularEdge`: the iOS 26 light-glass edge, like the Messages call buttons:
  a fine hairline, a white glow inside the top edge and a white line along the
  bottom. It shines without tinting the glass. iOS and Android.
  - Tune it with `specularTopOpacity`, `specularBottomOpacity`,
    `specularHairlineOpacity`, `specularGlowHeight` and `specularBottomHeight`
    (a tall bottom shine mirrors the top: glow and hairline).
- `cornerReflection`: light catching the top-left and bottom-right corners like
  a lens (a soft bloom and a brighter glint).
- `backdropBlur`: blurs the page behind the glass, inside its shape. With
  `glassStyle: 'clear'` the glass shows the page softly blurred and bent at the
  edges, between clear and regular. Android: dp.
- `rimColor` / `rimWidth`: a specular rim on the edge. `rimSideOpacity` (iOS)
  keeps some of it along the sides, `rimGradient: 'vertical'` runs it along the
  top and bottom edges and fades it down the sides, `rimShadeColor` adds a dark
  edge on the far side, `rimEdgeColor` a hairline all round the glass.
- `sheenOpacity` (iOS): a soft white reflection across the top of the glass.
- `fadeCurve: 'ease'` for `fadeBottom`: an S-curve that melts into the content
  with no visible start or end (iOS and Android).

**`LiquidProgressiveBlur`** (new component, new native view on iOS)

A blur that is strongest at the top and weakens downwards, with a tint that
fades out with it: the scroll edge behind a bar in iOS 26 Photos. iOS uses a
variable blur; Android stacks glass layers that blur more and fade out higher.
An iOS binary built before this view falls back to one fading glass, so an
over-the-air JS update never shows "Unimplemented component".

**Header** (`useLiquidNavigationHeader`, `<LiquidNavigationHeader>`)

- `edgeGlass: true | { … }`: liquid glass behind the buttons, from the top of
  the screen, melting into the content. `style: 'blur'` draws a progressive
  blur instead (`maxBlur`, `tintColor`, `fadeHeight`, `fadeCurve`). `edge`
  still takes your own element.
- `glass`, `backGlass` and `titleGlass` style the back button, the buttons and
  the title capsule (`titleGlass: false` is plain text). They take every glass
  prop above. `titleAlign: 'start' | 'center' | 'end'`.
- `LiquidHeaderProvider`: `direction` (`'ltr'` or `'rtl'`, for apps that flip
  their layout in JS), `scrollEdgeEffect={false}` (hides iOS 26's top scroll
  edge) and `extendScrollEdge` (experimental: extends the system scroll edge
  behind the header).
- New native views `RNLiquidScrollEdge` and `RNLiquidScrollEdgeContainer`
  (iOS; no-ops on Android).
- With no other header to morph into, the header now follows its screen: it
  slides in and out with the screen on iOS and fades with it on Android,
  instead of lingering over the previous screen. The navigation object passed
  to the header may expose `beforeRemove` and `transitionStart` listeners for
  this (React Navigation's does); without them the header behaves as before.

### Fixed

- iOS: the rim and sheen of a pressed button stayed the old size inside the
  grown glass, so it looked like two buttons. They now live in the glass and
  grow with it.
- Android: the glass behind a fading edge (`fadeBottom`) ignored the fade, so
  buttons over it turned flat white.
- Android: the back chevron no longer points down in right-to-left layouts.

### Docs

`USAGE.md`, `CONTEXT.md` and the README describe the new props, the progressive
blur and `edgeGlass`. `CONTEXT.md` has a new section on glass edges.

## 1.3.0

- Header: your own back icon, title and subtitle components, a leading title
  that melts with the back button.
- iOS: `LiquidGlassContainer` passes touches on its empty glass through when it
  is `box-none`.
