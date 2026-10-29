import { useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LiquidProfileHeader,
  LiquidSegmentedControl,
  LiquidStickyView,
  useLiquidColors,
  useLiquidHeaderHeight,
  useLiquidNavigationHeader,
  useLiquidProfileEntrance,
  useLiquidProfileHeaderHeight,
  useLiquidProfileSnapOffsets,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { PHOTOS } from '../data';
import { QrIcon } from '../HeaderIcons';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

// A channel profile, opened by tapping the chat's avatar: the photo
// grows out of the avatar circle into the hero. Scrolling turns it into a
// round avatar, then lifts the name into the bar.
export function ProfileScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useLiquidColors();
  const dark = useColorScheme() === 'dark';
  const cellSize = Math.floor((useWindowDimensions().width - 4) / 3);
  const heroHeight = useLiquidProfileHeaderHeight();
  const snapOffsets = useLiquidProfileSnapOffsets();
  const entrance = useLiquidProfileEntrance();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [tab, setTab] = useState(0);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Where the Media / Links gap sits in the scroll content.
  const [tabsOffset, setTabsOffset] = useState(0);
  const barHeight = useLiquidHeaderHeight();

  // A glass "more" circle joins the back button once the header collapses.
  useLiquidNavigationHeader(navigation, {
    right: collapsed
      ? [
          {
            key: 'more',
            accessibilityLabel: 'More',
            icon: (
              <Text style={[styles.moreGlyph, { color: colors.label }]}>
                •••
              </Text>
            ),
          },
        ]
      : [],
  });

  const glyph = (text: string) => (
    <Text style={styles.actionGlyph}>{text}</Text>
  );
  const card = dark ? '#1C1C1E' : '#FFFFFF';

  return (
    <View
      style={[styles.screen, { backgroundColor: dark ? '#000000' : '#F2F2F7' }]}
    >
      <Animated.ScrollView
        scrollEventThrottle={16}
        // Rests on the photo, the round avatar or the bar; free below that.
        snapToOffsets={snapOffsets}
        snapToEnd={false}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        contentContainerStyle={{
          paddingTop: heroHeight + 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Animated.View
          style={{
            opacity: entrance.progress,
            transform: [
              {
                translateY: entrance.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [120, 0],
                }),
              },
            ],
          }}
        >
          <View style={[styles.card, { backgroundColor: card }]}>
            <View style={styles.cardRow}>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, { color: colors.label }]}>
                  share link
                </Text>
                <Text style={[styles.cardValue, { color: colors.tint }]}>
                  https://t.me/liquid_photos
                </Text>
              </View>
              <QrIcon color={colors.tint} size={24} />
            </View>
            <View
              style={[styles.separator, { backgroundColor: colors.track }]}
            />
            <Text style={[styles.cardLabel, { color: colors.label }]}>
              description
            </Text>
            <Text style={[styles.cardValue, { color: colors.label }]}>
              Photos from {route.params.title}, shared every week.
            </Text>
          </View>
          {/* The Media / Links control floats over this gap (see below). */}
          <View
            onLayout={event =>
              setTabsOffset(heroHeight + 16 + event.nativeEvent.layout.y)
            }
            style={styles.tabsGap}
          />
          <View style={styles.grid}>
            {[...PHOTOS, ...PHOTOS].map((photo, i) => (
              <Image
                key={`${photo.id}-${i}`}
                source={{ uri: photo.image }}
                style={{ width: cellSize, height: cellSize }}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.ScrollView>
      <LiquidProfileHeader
        scrollY={scrollY}
        entrance={entrance}
        title={route.params.title}
        subtitle="3,995 subscribers"
        collapsedSubtitle="17 photos, 124 videos"
        onCollapsedChange={setCollapsed}
        edgeHeight={barHeight + 64}
        image={{ uri: route.params.image }}
        actions={[
          {
            key: 'mute',
            title: muted ? 'unmute' : 'mute',
            icon: glyph(muted ? '🔕' : '🔔'),
            onPress: () => setMuted(value => !value),
          },
          { key: 'discuss', title: 'discuss', icon: glyph('💬') },
          {
            key: 'leave',
            title: 'leave',
            icon: glyph('⇥'),
            onPress: navigation.goBack,
          },
          { key: 'more', title: 'more', icon: glyph('•••') },
        ]}
      />
      {/* Scrolls with the content, then stays under the name. */}
      {tabsOffset > 0 ? (
        <LiquidStickyView
          scrollY={scrollY}
          offset={tabsOffset}
          pinTop={barHeight + 4}
          // Slides in rather than fading: glass doesn't draw under a fading parent.
          style={{
            transform: [
              {
                translateX: entrance.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              },
            ],
          }}
        >
          <LiquidSegmentedControl
            segments={['Media', 'Links']}
            selectedIndex={tab}
            onChange={setTab}
            style={styles.tabs}
          />
        </LiquidStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  actionGlyph: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
  },
  cardValue: {
    fontSize: 17,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  tabs: {
    width: 170,
  },
  tabsGap: {
    height: 36,
    marginVertical: 14,
  },
  moreGlyph: {
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 2,
  },
});
