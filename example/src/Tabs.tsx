import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createLiquidBottomTabBar,
  createLiquidHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { HomeScreen } from './screens/HomeScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ControlsScreen } from './screens/ControlsScreen';
import { GlassLabScreen } from './screens/GlassLabScreen';

export type TabParamList = {
  Home: undefined;
  Discover: undefined;
  Controls: undefined;
  Lab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={[styles.icon, { color }]}>{glyph}</Text>;
}

const tabBar = createLiquidBottomTabBar({
  search: { placeholder: 'Search photos' },
});
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
const labIcon = ({ color }: { color: string }) => (
  <TabIcon glyph="✦" color={color} />
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
      <Tab.Screen
        name="Lab"
        component={GlassLabScreen}
        options={{
          headerShown: false,
          tabBarIcon: labIcon,
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
});
