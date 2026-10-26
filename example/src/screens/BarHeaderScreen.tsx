import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLiquidHeaderHeight } from '@mohamed_abd_elnaby/react-native-liquid';
import { PHOTOS } from '../data';

const ROWS = Array.from({ length: 30 }, (_, i) => ({
  id: String(i),
  color: PHOTOS[i % PHOTOS.length]!.color,
}));

export function BarHeaderScreen() {
  const headerHeight = useLiquidHeaderHeight();

  return (
    <FlatList
      data={ROWS}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingTop: headerHeight }}
      renderItem={({ item }) => (
        <View style={[styles.row, { backgroundColor: item.color }]}>
          <Text style={styles.text}>Row {item.id}: scroll under the bar</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    height: 72,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
