import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  LiquidGlassView,
  createLiquidTopTabBar,
  useLiquidColors,
} from '@mohamedabdelnaby/react-native-liquid';
import { PHOTOS } from '../data';

const TopTab = createMaterialTopTabNavigator();
const tabBar = createLiquidTopTabBar();

function PhotosTab() {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <FlatList
      data={PHOTOS}
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.grid,
        { paddingBottom: tabBarHeight + 16 },
      ]}
      renderItem={({ item }) => (
        <Image source={{ uri: item.image }} style={styles.tile} />
      )}
    />
  );
}

function ColorsTab() {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <FlatList
      data={PHOTOS}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      renderItem={({ item }) => (
        <View style={[styles.swatch, { backgroundColor: item.color }]}>
          <LiquidGlassView cornerRadius={16} style={styles.swatchLabel}>
            <Text style={styles.swatchText}>{item.color}</Text>
          </LiquidGlassView>
        </View>
      )}
    />
  );
}

function AboutTab() {
  const { colors } = useLiquidColors();

  return (
    <View style={styles.about}>
      <Text style={[styles.aboutText, { color: colors.secondaryLabel }]}>
        The bar above is LiquidTopTabBar. Swipe between tabs and the selection
        pill follows the pager position.
      </Text>
    </View>
  );
}

export function DiscoverScreen() {
  return (
    <TopTab.Navigator tabBar={tabBar}>
      <TopTab.Screen name="Photos" component={PhotosTab} />
      <TopTab.Screen name="Colors" component={ColorsTab} />
      <TopTab.Screen name="About" component={AboutTab} />
    </TopTab.Navigator>
  );
}

const styles = StyleSheet.create({
  grid: {
    padding: 8,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    margin: 8,
    borderRadius: 20,
  },
  swatch: {
    height: 120,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    justifyContent: 'flex-end',
    padding: 12,
  },
  swatchLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  swatchText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  about: {
    padding: 24,
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 22,
  },
});
