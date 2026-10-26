# Using @mohamedabdelnaby/react-native-liquid

A copy-paste guide to every component. It ships with the package, so you can
find it at `node_modules/@mohamedabdelnaby/react-native-liquid/USAGE.md`, and
point an AI coding assistant at it.

Everything is imported from one place:

```tsx
import { LiquidToggle, createLiquidBottomTabBar /* ... */ } from '@mohamedabdelnaby/react-native-liquid';
```

## 1. Setup

```sh
yarn add @mohamedabdelnaby/react-native-liquid react-native-safe-area-context
# Only the navigators you use:
yarn add @react-navigation/native @react-navigation/bottom-tabs @react-navigation/material-top-tabs @react-navigation/native-stack

cd ios && pod install && cd ..
npx react-native run-ios      # or run-android
```

Rules that apply to the whole library:

- **New Architecture only** (React Native 0.80+). Works in React Native CLI apps
  and Expo dev builds, **not in Expo Go**.
- It is a native module: after installing or updating, **rebuild the app**
  (`pod install` on iOS, a Gradle build on Android). A Metro reload is not enough.
- Every animation runs natively. There is no Reanimated dependency.
- Wrap the app in `SafeAreaProvider` (React Navigation already does this).
- Every component takes `colorScheme`: `'system'` (default), `'light'` or `'dark'`.
- iOS 26+ gets native Liquid Glass; older iOS gets a blur material. Android 12+
  gets AndroidLiquidGlass; Android 13+ adds refraction.

## 2. Bottom tab bar

```tsx
import { createBottomTabNavigator, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { createLiquidBottomTabBar } from '@mohamedabdelnaby/react-native-liquid';

const Tab = createBottomTabNavigator();

// Create it once, outside of render.
const tabBar = createLiquidBottomTabBar({
  search: { placeholder: 'Search', onChangeText: (text) => console.log(text) },
});

export function Tabs() {
  return (
    <Tab.Navigator tabBar={tabBar}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
          tabBarBadge: 3,
        }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// The bar floats over the screens: pad scrollable content.
function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  return <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }} />;
}
```

Options (pass to `createLiquidBottomTabBar` or `<LiquidBottomTabBar {...props} />`):

| Option | Default | What it does |
| --- | --- | --- |
| `search` | | Search button after the bar that opens a field with a close button. The bar rises above the keyboard. Takes `placeholder`, `value`, `onChangeText`, `onSubmit`, `expanded`, `defaultExpanded`, `onExpandedChange`. |
| `accessory` | | Any element in a glass circle after the bar (wrap it in `Pressable`). Ignored when `search` is set. |
| `glassStyle` | `'clear'` | `'regular'` or `'clear'`. |
| `glassTintColor` | frosted white / dark gray | Tint of the bar's glass. |
| `blur` | `0.8` | How much the content under the bar is frosted, 0 to 1. |
| `selectionColor` | soft gray / dark | Pill behind the focused tab. |
| `activeTintColor` / `inactiveTintColor` | | Icon and label colors. |
| `lens` | `true` | The liquid drop that lifts while pressing and dragging. |
| `height` / `horizontalMargin` / `bottomOffset` | `62` / `20` / safe area | Size and position. |

Screen options it reads: `tabBarIcon`, `tabBarLabel`, `tabBarShowLabel`,
`tabBarBadge`, `tabBarActiveTintColor`, `tabBarInactiveTintColor`,
`tabBarLabelStyle`, `tabBarHideOnKeyboard`, `tabBarStyle: { display: 'none' }`.

## 3. Top tab bar

```tsx
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createLiquidTopTabBar, LIQUID_TOP_TAB_BAR_HEIGHT } from '@mohamedabdelnaby/react-native-liquid';

const TopTab = createMaterialTopTabNavigator();
const topTabBar = createLiquidTopTabBar();

<TopTab.Navigator tabBar={topTabBar}>
  <TopTab.Screen name="Photos" component={Photos} />
  <TopTab.Screen name="Albums" component={Albums} />
</TopTab.Navigator>;

// The bar floats over the pages: pad their content.
<FlatList contentContainerStyle={{ paddingTop: LIQUID_TOP_TAB_BAR_HEIGHT }} /* ... */ />;
```

Options: `floating` (`true`), `glassStyle` (`'clear'`), `glassTintColor`,
`blur` (`0.8`), `selectionColor`, `lensTintColor`, `activeTintColor`,
`inactiveTintColor`, `lens` (`true`), `height` (`44`), `style`, `containerStyle`.
Set `floating: false` to keep the bar above the pages instead of over them.

## 4. Header

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createLiquidHeader, useLiquidHeaderHeight } from '@mohamedabdelnaby/react-native-liquid';

const Stack = createNativeStackNavigator();
const header = createLiquidHeader(); // floating controls, or createLiquidHeader({ variant: 'bar' })

<Stack.Navigator screenOptions={{ header, headerTransparent: true }}>
  <Stack.Screen name="Details" component={Details} options={{ title: 'Details' }} />
</Stack.Navigator>;

// With headerTransparent, pad the content:
const headerHeight = useLiquidHeaderHeight();
```

It reads `title`, `headerTitle`, `headerTitleAlign`, `headerTitleStyle`,
`headerTintColor`, `headerLeft`, `headerRight` and `headerBackTitle`.

## 5. Toggle

```tsx
const [on, setOn] = useState(false);

<LiquidToggle value={on} onValueChange={setOn} />

// Every part can be recolored:
<LiquidToggle
  value={on}
  onValueChange={setOn}
  onTintColor="#FF3B30"                  // track when on
  offTintColor="rgba(255, 59, 48, 0.25)" // track when off
  thumbTintColor="#FFF4F2"               // thumb at rest
  lensTintColor="rgba(255, 59, 48, 0.12)" // glass lens while pressed
/>
```

| Prop | Default | What it does |
| --- | --- | --- |
| `value` / `onValueChange` | | Controlled value. Required. |
| `onTintColor` | system green | Track color when on. |
| `offTintColor` | translucent gray | Track color when off. |
| `thumbTintColor` | white | Thumb color at rest. |
| `lensTintColor` | clear | Tint of the glass lens the thumb becomes while pressed. |
| `disabled` | `false` | Dims the toggle and ignores touches. |

Pressing turns the thumb into a clear glass lens that grows past the track,
slides while the track fills with color, then settles back into a solid thumb.
The thumb can be dragged. The default size is 64 x 32; pass `style={{ width }}`
to scale it. The animation runs natively on both platforms.

## 6. Slider

```tsx
const [volume, setVolume] = useState(0.5);

<LiquidSlider value={volume} onValueChange={setVolume} />
<LiquidSlider value={step} onValueChange={setStep} minimumValue={0} maximumValue={10} step={1} tintColor="#FF9500" />
```

Props: `value`, `onValueChange`, `onSlidingStart`, `onSlidingComplete`,
`minimumValue` (0), `maximumValue` (1), `step` (0 = continuous), `tintColor`,
`disabled`.

## 7. Buttons

```tsx
<LiquidButton title="Continue" variant="prominent" tintColor="#007AFF" onPress={next} />
<LiquidButton title="Cancel" onPress={cancel} size="small" />
<LiquidIconButton accessibilityLabel="Add" onPress={add}>
  <PlusIcon />
</LiquidIconButton>
```

`LiquidButton`: `title`, `icon`, `variant` (`'glass' | 'prominent'`),
`tintColor`, `size` (`'small' | 'regular' | 'large'`), `textStyle`, plus all
`Pressable` props. `LiquidIconButton`: `children`, `size` (diameter, 44).

## 8. Segmented control

```tsx
const [index, setIndex] = useState(0);

<LiquidSegmentedControl segments={['Day', 'Week', 'Month']} selectedIndex={index} onChange={setIndex} />
```

Props: `segments`, `selectedIndex`, `onChange`, `height` (36),
`activeTintColor`, `inactiveTintColor`, `selectionColor`, `disabled`, `textStyle`.

## 9. Search

```tsx
// A glass search field:
<LiquidSearchBar value={query} onChangeText={setQuery} placeholder="Search" />

// A round button that opens into a field with a close button.
// Children show next to the button while it is closed.
<LiquidExpandableSearch value={query} onChangeText={setQuery} onSubmit={search} placeholder="Search">
  <Text style={styles.title}>Library</Text>
</LiquidExpandableSearch>
```

`LiquidExpandableSearch` can be controlled with `expanded` and
`onExpandedChange`, or left alone with `defaultExpanded`.

## 10. Menu

```tsx
<LiquidMenu
  title="Photo"
  items={[
    { title: 'Share', systemImage: 'square.and.arrow.up', onPress: share },
    { title: 'Favorite', checked: isFavorite, onPress: toggleFavorite },
    {
      title: 'Move to',
      children: [
        { title: 'Album', onPress: moveToAlbum },
        { title: 'Trash', destructive: true, onPress: trash },
      ],
    },
    { title: 'Delete', systemImage: 'trash', destructive: true, onPress: remove },
  ]}
>
  <Text>•••</Text>
</LiquidMenu>
```

Item fields: `title`, `subtitle`, `systemImage` (iOS SF Symbol name),
`destructive`, `disabled`, `checked`, `onPress`, `children` (a submenu),
`inline` (iOS: show children as a section). Use `bare` when the menu button sits
inside another glass shape, such as a toolbar.

## 11. Glass views

```tsx
<LiquidGlassView cornerRadius={24} style={{ padding: 16 }}>
  <Text>Any content on glass</Text>
</LiquidGlassView>

// Shapes that morph and merge (iOS 26). Keep spacing below the gap.
<LiquidGlassContainer spacing={8} style={{ flexDirection: 'row', gap: 16 }}>
  <LiquidGlassView morph interactive cornerRadius={22} style={{ width: expanded ? 104 : 44, height: 44 }} />
  <LiquidGlassView morph interactive cornerRadius={22} style={{ width: 44, height: 44 }} />
</LiquidGlassContainer>
```

`LiquidGlassView` props: `glassStyle`, `tintColor`, `interactive`,
`cornerRadius`, `morph`, `colorScheme`, and on Android `blurRadius`,
`refractionHeight`, `refractionAmount`, `chromaticAberration`, `depthEffect`,
`highlight`, `shadow`.

## 12. Theme and helpers

```tsx
const { scheme, colors } = useLiquidColors(); // colors.label, colors.tint, colors.tabBarGlass, ...
if (isLiquidGlassSupported) {
  // iOS 26+ or Android 12+
}
```

## 13. Light, dark or follow the system

Every component defaults to `colorScheme="system"`, so the simplest way to
switch the whole app is React Native's `Appearance` API:

```tsx
import { Appearance } from 'react-native';

Appearance.setColorScheme('dark');  // force dark
Appearance.setColorScheme('light'); // force light
Appearance.setColorScheme('auto');  // follow the system again
```

A ready-made switch:

```tsx
const MODES = ['system', 'light', 'dark'] as const;

function AppearanceSwitch() {
  const [mode, setMode] = useState<(typeof MODES)[number]>('system');

  return (
    <LiquidSegmentedControl
      segments={['System', 'Light', 'Dark']}
      selectedIndex={MODES.indexOf(mode)}
      onChange={(index) => {
        const next = MODES[index]!;
        setMode(next);
        Appearance.setColorScheme(next === 'system' ? 'auto' : next);
      }}
    />
  );
}
```

Pass `colorScheme="light"` or `"dark"` to a single component to pin it
regardless of the app theme. Use `useColorScheme()` for your own colors and
your `NavigationContainer` theme so the rest of the app follows too.

## 14. Common problems

| Problem | Fix |
| --- | --- |
| `No member named '...' in '...Props'` when building iOS | Run `cd ios && pod install`, then rebuild. |
| `Unable to load script` on an Android phone | `adb reverse tcp:8081 tcp:8081` (use your Metro port). |
| Content hidden under a bar | Pad it with `useBottomTabBarHeight()`, `LIQUID_TOP_TAB_BAR_HEIGHT` or `useLiquidHeaderHeight()`. |
| Glass looks flat on Android | Needs Android 12+ for blur, 13+ for refraction. `SurfaceView`, video and map content can't be sampled. |
| Toggle or slider fights a `ScrollView` | It shouldn't: both keep horizontal drags. Report it with your layout. |
| Works in Expo Go? | No. Use a development build. |
