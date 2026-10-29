import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LiquidButton,
  LiquidIconButton,
  useLiquidColors,
  useLiquidHeaderHeight,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import type { RootStackParamList } from '../../App';
import { SearchIcon } from '../HeaderIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'Details'>;

// Chat screen. The floating header (shared with Home) morphs
// Edit into the back button, shows the title and a subtitle in a glass
// capsule and an avatar circle. The bottom bar's Mute button morphs to Unmute.
export function DetailsScreen({ navigation, route }: Props) {
  const headerHeight = useLiquidHeaderHeight();
  const insets = useSafeAreaInsets();
  const { colors } = useLiquidColors();
  const [muted, setMuted] = useState(false);
  const [gifted, setGifted] = useState(false);

  useLiquidNavigationHeader(navigation, {
    title: route.params.title,
    subtitle: '4,610 subscribers',
    onTitlePress: () => navigation.navigate('Profile', route.params),
    right: [
      {
        key: 'avatar',
        accessibilityLabel: 'Profile',
        onPress: () => navigation.navigate('Profile', route.params),
        content: (
          <Image source={{ uri: route.params.image }} style={styles.avatar} />
        ),
      },
    ],
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: insets.bottom + 80,
        }}
      >
        <Image source={{ uri: route.params.image }} style={styles.hero} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.label }]}>
            {route.params.title}
          </Text>
          <Text style={[styles.text, { color: colors.secondaryLabel }]}>
            The header stays on screen while this screen is pushed: Home's Edit
            capsule becomes the back button and its two circles become the
            avatar. Tap Mute and the gift to see the label and icon morph.
          </Text>
        </View>
      </ScrollView>
      <View
        pointerEvents="box-none"
        style={[styles.bottomBar, { bottom: insets.bottom + 8 }]}
      >
        <LiquidIconButton
          morph
          contentKey={gifted ? 'gifted' : 'gift'}
          accessibilityLabel="Gift"
          onPress={() => setGifted(value => !value)}
        >
          <Text style={[styles.glyph, { color: colors.label }]}>
            {gifted ? '✓' : '🎁'}
          </Text>
        </LiquidIconButton>
        <LiquidButton
          morph
          title={muted ? 'Unmute' : 'Mute'}
          onPress={() => setMuted(value => !value)}
          style={styles.mute}
        />
        <LiquidIconButton accessibilityLabel="Search">
          <SearchIcon color={colors.label} />
        </LiquidIconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
  },
  hero: {
    width: '100%',
    aspectRatio: 1,
  },
  body: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mute: {
    minWidth: 120,
  },
  glyph: {
    fontSize: 20,
  },
});
