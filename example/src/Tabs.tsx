import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createLiquidBottomTabBar,
  createLiquidHeader,
  useLiquidColors,
} from '@mohamedabdelnaby/react-native-liquid';
import { HomeScreen } from './screens/HomeScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ControlsScreen } from './screens/ControlsScreen';

export type TabParamList = {
  Home: undefined;
  Discover: undefined;
  Controls: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={[styles.icon, { color }]}>{glyph}</Text>;
}

function SearchAccessory() {
  const { colors } = useLiquidColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search"
      onPress={() => Alert.alert('Search', 'Accessory pressed')}
      style={styles.accessory}
    >
      <Text style={[styles.icon, { color: colors.label }]}>⌕</Text>
    </Pressable>
  );
}

const tabBar = createLiquidBottomTabBar({ accessory: <SearchAccessory /> });
const header = createLiquidHeader({ variant: 'bar' });

const homeIcon = ({ color }: { color: string }) => (
  <TabIcon glyph="⌂" color={color} />
);
const discoverIcon = ({ color }: { color: string }) => (
  <TabIcon glyph="◎" color={color} />
);
const controlsIcon = ({ color }: { color: string }) => (
  <TabIcon glyph="◐" color={color} />
);

export function Tabs() {
  return (
    <Tab.Navigator tabBar={tabBar} screenOptions={{ header }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarIcon: homeIcon,
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarBadge: 3,
          tabBarIcon: discoverIcon,
        }}
      />
      <Tab.Screen
        name="Controls"
        component={ControlsScreen}
        options={{
          headerShown: false,
          tabBarIcon: controlsIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 22,
    lineHeight: 26,
  },
  accessory: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
