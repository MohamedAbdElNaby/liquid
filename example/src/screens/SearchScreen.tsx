import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  useLiquidColors,
  useLiquidHeaderHeight,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { PHOTOS } from '../data';
import type { TabParamList } from '../Tabs';

type Props = BottomTabScreenProps<TabParamList, 'Search'>;

// Shown while the tab bar's search field is open. The tab bar passes what the
// user types as the `query` param.
export function SearchScreen({ navigation, route }: Props) {
  const headerHeight = useLiquidHeaderHeight();
  const { colors } = useLiquidColors();
  const query = route.params?.query ?? '';
  const results = PHOTOS.filter(photo =>
    photo.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useLiquidNavigationHeader(navigation, { title: 'Search', backButton: false });

  return (
    <FlatList
      data={results}
      keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: headerHeight + 8,
        paddingBottom: 140,
      }}
      ListHeaderComponent={
        <Text style={[styles.caption, { color: colors.secondaryLabel }]}>
          {query.length > 0
            ? `${results.length} ${
                results.length === 1 ? 'result' : 'results'
              } for “${query}”`
            : 'Type to search the photos'}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Image source={{ uri: item.image }} style={styles.thumb} />
          <View>
            <Text style={[styles.title, { color: colors.label }]}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryLabel }]}>
              {item.subtitle}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 14,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
});
