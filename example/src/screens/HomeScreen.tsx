import { memo, useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  LiquidButton,
  LiquidGlassView,
  LiquidMenu,
  isLiquidGlassSupported,
  useLiquidColors,
  useLiquidHeaderHeight,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { PHOTOS, type Photo } from '../data';
import { AppearanceSwitch } from '../AppearanceSwitch';
import type { RootStackParamList } from '../../App';
import { ComposeIcon, PlusIcon } from '../HeaderIcons';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const PhotoCard = memo(function PhotoCardContent({
  photo,
  onPress,
}: {
  photo: Photo;
  onPress: (photo: Photo) => void;
}) {
  const mode = useColorScheme() ?? 'light';

  return (
    <Pressable onPress={() => onPress(photo)} style={styles.card}>
      <Image source={{ uri: photo.image }} style={styles.image} />
      <LiquidGlassView
        glassStyle="clear"
        colorScheme={mode}
        cornerRadius={20}
        style={styles.caption}
      >
        <Text style={styles.captionTitle}>{photo.title}</Text>
        <Text style={styles.captionSubtitle}>{photo.subtitle}</Text>
      </LiquidGlassView>
    </Pressable>
  );
});

export function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<Navigation>();
  const { colors } = useLiquidColors();
  const headerHeight = useLiquidHeaderHeight();
  const [editing, setEditing] = useState(false);

  // Telegram's Chats header: Edit becomes Done and the circles blur away while
  // editing; pushing a photo morphs Edit into the back button.
  useLiquidNavigationHeader(navigation, {
    title: 'Liquid',
    backButton: false,
    left: {
      title: editing ? 'Done' : 'Edit',
      onPress: () => setEditing(value => !value),
    },
    right: editing
      ? []
      : [
          {
            key: 'add',
            accessibilityLabel: 'New story',
            icon: <PlusIcon color={colors.label} />,
          },
          {
            key: 'compose',
            accessibilityLabel: 'Compose',
            icon: <ComposeIcon color={colors.label} />,
          },
        ],
  });

  const openPhoto = useCallback(
    (photo: Photo) =>
      navigation.navigate('Details', {
        title: photo.title,
        image: photo.image,
      }),
    [navigation],
  );

  return (
    <FlatList
      data={PHOTOS}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <PhotoCard photo={item} onPress={openPhoto} />}
      contentContainerStyle={{
        paddingTop: headerHeight + 8,
        paddingBottom: tabBarHeight + 16,
      }}
      ListHeaderComponent={
        <View style={styles.header}>
          <LiquidMenu
            accessibilityLabel="More"
            items={[
              { title: 'Select chats', systemImage: 'checkmark.circle' },
              { title: 'Read all', systemImage: 'text.bubble' },
              { title: 'Delete all', systemImage: 'trash', destructive: true },
            ]}
            style={styles.moreButton}
          >
            <Text style={[styles.more, { color: colors.label }]}>•••</Text>
          </LiquidMenu>
          <Text style={[styles.largeTitle, { color: colors.label }]}>
            Liquid
          </Text>
          <Text style={[styles.note, { color: colors.secondaryLabel }]}>
            {isLiquidGlassSupported
              ? 'Native Liquid Glass is active on this device.'
              : 'This OS version renders the fallback material.'}
          </Text>
          <AppearanceSwitch style={styles.appearance} />
          <LiquidButton
            title="Glass Lab"
            onPress={() => navigation.navigate('GlassLab')}
            style={styles.labButton}
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  moreButton: {
    marginBottom: 12,
  },
  more: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
  },
  note: {
    fontSize: 15,
    marginTop: 4,
  },
  appearance: {
    marginTop: 16,
  },
  labButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 28,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  caption: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  captionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  captionSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    marginTop: 2,
  },
});
