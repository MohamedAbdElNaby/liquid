# CONTEXT.md — building iOS 26 style screens with react-native-liquid

This file is for AI coding agents (and people) adding Liquid Glass UI to a
React Native app with `@mohamed_abd_elnaby/react-native-liquid`. It explains
what each piece is for, how the pieces fit together, and the mistakes that
break the animations. For every prop, see `USAGE.md` next to this file.

## Ground rules

- New Architecture (Fabric) only, React Native 0.80+. Not Expo Go.
- After installing or upgrading: `cd ios && pod install`, then rebuild the
  native app. JS-only reloads are not enough after a native change.
- Every animation runs natively. Do not wrap library components in
  `Animated.View`s that change `opacity`: native glass stops drawing under a
  fading parent. Animate `transform` instead.
- Components follow the system light/dark theme (`colorScheme="system"`).
  `Appearance.setColorScheme('dark' | 'light' | 'auto')` switches the whole app.
- Right-to-left layout works with `I18nManager.forceRTL(true)` (applies on the
  next launch). Do not mirror anything by hand. An app that flips its layout
  in JS instead passes `direction="rtl"` to `LiquidHeaderProvider`.

## The app shell

A typical app is a native stack with bottom tabs inside it, and one floating
glass header drawn over everything:

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  LiquidHeaderProvider,
  createLiquidBottomTabBar,
} from '@mohamed_abd_elnaby/react-native-liquid';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Created once, outside render.
const tabBar = createLiquidBottomTabBar({
  search: { placeholder: 'Search', route: 'Search' },
});

function Tabs() {
  return (
    <Tab.Navigator tabBar={tabBar} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Chats" component={ChatsScreen} options={{ tabBarIcon: chatsIcon }} />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ tabBarIcon: contactsIcon }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: settingsIcon }} />
      {/* No tab item: shown while the tab bar's search field is open. */}
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <LiquidHeaderProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'fade' }} />
          </Stack.Navigator>
        </LiquidHeaderProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

Rules that make the header morph:

- Turn off every navigator's own header (`headerShown: false`) and give every
  screen its header with `useLiquidNavigationHeader(navigation, options)`.
  Because one header is shared, switching tabs or pushing a screen morphs it:
  Edit becomes Sort or the back button, two circles merge into one, and the
  title blurs across.
- Pad content with `useLiquidHeaderHeight()` at the top and
  `useBottomTabBarHeight()` at the bottom; both bars float over the content.
- The back button appears automatically in a stack (`canGoBack()`), never for
  tabs. Force it with `backButton: true | false`; `backIcon` replaces the chevron.
- Titles: `titleComponent` / `subtitleComponent` take your own text (the app's
  font), or `titleStyle` / `subtitleStyle` restyle the built-in text. Keep
  passing `title` so a changed title still morphs. `titlePosition: 'leading'`
  puts the capsule right after the back button in the same glass, so pressing
  either melts into the other; `titleCapsule` boxes a centered title.

## Header recipes (`useLiquidNavigationHeader`)

```tsx
// Chats tab: Edit, title, two circles.
useLiquidNavigationHeader(navigation, {
  title: 'Chats',
  left: { title: editing ? 'Done' : 'Edit', onPress: toggleEditing },
  right: editing ? [] : [
    { key: 'story', icon: <PlusIcon />, onPress: newStory },
    { key: 'compose', icon: <ComposeIcon />, onPress: compose },
  ],
});

// Chat screen: back, title capsule with a subtitle, avatar circle.
useLiquidNavigationHeader(navigation, {
  title: chat.name,
  subtitle: '4,610 subscribers',
  onTitlePress: openProfile,
  right: [{ key: 'avatar', content: <Image source={avatar} style={{ width: 44, height: 44 }} />, onPress: openProfile }],
});

// Settings: QR on the left, a search circle that morphs into a field.
useLiquidNavigationHeader(navigation, {
  left: { key: 'qr', icon: <QrIcon /> },
  search: { value: query, onChangeText: setQuery, placeholder: 'Search' },
});
```

How items morph, so you can predict the animation:

- Items are matched by **place**. When the item in a place changes `key` (or
  `title` when there is no key), its glass springs to the new size and the old
  content blurs out while the new one blurs in. Same key = nothing moves.
- `right` fills places from the right edge. Fewer items: the inner ones slide
  into their neighbour, fuse, and shrink away.
- **Merge into the pressed button**: put `null` in the places that should stay
  empty. Pressing the first of two buttons and setting
  `right: [newItem, null]` slides the second into the first and shows
  `newItem` where the pressed one was. `right: [null, newItem]` does the
  opposite. The new item's `icon` and `tintColor` are up to you, so a blue
  button can stay blue.
- `stretch: true` makes an item take the free width (a search field).
- Buttons that come back together grow in place.

## Search

| Need | Use |
| --- | --- |
| Header row with a full-width field under it (a contacts list) | `LiquidSearchHeader` under the shared header, `headerHeight={LIQUID_HEADER_HEIGHT}`, no children; clear the header (`useLiquidNavigationHeader(navigation, {})`) while searching so the field rises into its place, and hide the tab bar with `tabBarStyle: { display: 'none' }`. |
| Search circle in the header (a settings screen) | `search` option of `useLiquidNavigationHeader`. |
| Search circle next to the tab bar opening a search screen | `createLiquidBottomTabBar({ search: { route: 'Search' } })` and a `Search` tab screen; it reads `route.params?.query`. Closing returns to the previous tab. |
| Round button that becomes a field anywhere | `LiquidExpandableSearch` (children show next to it while closed). |
| A plain glass field | `LiquidSearchBar`. |

## Profile screen (a channel or user profile)

Open it with `animation: 'fade'` so the photo can grow out of the chat
header's avatar. The scroll view must be an `Animated.ScrollView` driving a
native `Animated.Value`:

```tsx
const scrollY = useRef(new Animated.Value(0)).current;
const entrance = useLiquidProfileEntrance();
const heroHeight = useLiquidProfileHeaderHeight();

useLiquidNavigationHeader(navigation, { right: collapsed ? [{ key: 'more', icon: <MoreIcon /> }] : [] });

<Animated.ScrollView
  onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
  scrollEventThrottle={16}
  snapToOffsets={useLiquidProfileSnapOffsets()}
  snapToEnd={false}
  contentContainerStyle={{ paddingTop: heroHeight }}
>
  …
</Animated.ScrollView>
<LiquidProfileHeader
  scrollY={scrollY}
  entrance={entrance}
  title="Channel"
  subtitle="3,995 subscribers"
  collapsedSubtitle="17 photos, 124 videos"
  image={{ uri: photo }}
  actions={[{ key: 'mute', title: 'mute', icon: <BellIcon /> }]}
  onCollapsedChange={setCollapsed}
/>
```

It rests in three states: full photo, round avatar, glass bar. Put a
`LiquidStickyView` over the scroll view for a control (Media / Links) that
pins under the bar.

## Buttons that change content

`<LiquidButton morph title={muted ? 'Unmute' : 'Mute'} />` and
`<LiquidIconButton morph contentKey={liked ? 'liked' : 'like'}>`: the glass
resizes and the content blurs across. Without `morph` the content just
swaps.

## Pitfalls

- A header that does not morph: the screen still has a navigator header, or
  uses `createLiquidHeader` instead of `useLiquidNavigationHeader`.
- Items jumping instead of morphing: keys change in every place at once.
  Keep stable keys for buttons that should stay.
- The tab bar hides with `navigation.setOptions({ tabBarStyle: { display: 'none' } })`,
  not by unmounting it.
- Content under the bars: pad it, both bars float.
- Android: glass needs Android 12+, refraction Android 13+; older versions get
  a frosted material. Glass shapes never fuse on Android; merges are imitated.
- iOS: build with Xcode 26 for Liquid Glass; older iOS gets a blur material.
