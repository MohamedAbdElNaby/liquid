import { useLayoutEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  LiquidButton,
  LiquidIconButton,
  useLiquidColors,
  useLiquidHeaderHeight,
} from '@mohamedabdelnaby/react-native-liquid';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Details'>;

export function DetailsScreen({ navigation, route }: Props) {
  const headerHeight = useLiquidHeaderHeight();
  const { colors } = useLiquidColors();
  const [liked, setLiked] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: ({ tintColor }) => (
        <Text
          accessibilityRole="button"
          onPress={() => setLiked((value) => !value)}
          style={[
            styles.headerAction,
            { color: liked ? '#FF2D55' : tintColor },
          ]}
        >
          {liked ? '♥' : '♡'}
        </Text>
      ),
    });
  }, [navigation, liked]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: headerHeight }}>
      <Image source={{ uri: route.params.image }} style={styles.hero} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.label }]}>
          {route.params.title}
        </Text>
        <Text style={[styles.text, { color: colors.secondaryLabel }]}>
          This screen uses LiquidHeader with the floating variant. The back
          button is a LiquidIconButton and headerRight renders inside a glass
          capsule.
        </Text>
        <View style={styles.actions}>
          <LiquidButton
            title="Share"
            icon={<Text style={styles.emoji}>↗</Text>}
          />
          <LiquidButton
            title={liked ? 'Liked' : 'Like'}
            variant="prominent"
            tintColor="#FF2D55"
            onPress={() => setLiked((value) => !value)}
          />
          <LiquidIconButton accessibilityLabel="More">
            <Text style={[styles.emoji, { color: colors.label }]}>⋯</Text>
          </LiquidIconButton>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  emoji: {
    fontSize: 18,
  },
  headerAction: {
    fontSize: 22,
    paddingHorizontal: 4,
  },
});
