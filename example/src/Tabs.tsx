import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createLiquidBottomTabBar,
  createLiquidHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { HomeScreen } from './screens/HomeScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ControlsScreen } from './screens/ControlsScreen';
import { GlassLabScreen } from './screens/GlassLabScreen';
import { ControlsIcon, DiscoverIcon, HomeIcon, LabIcon } from './TabIcons';

export type TabParamList = {
  Home: undefined;
  Discover: undefined;
  Controls: undefined;
  Lab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const tabBar = createLiquidBottomTabBar({
  search: { placeholder: 'Search photos' },
});
const header = createLiquidHeader({ variant: 'bar' });

type IconArgs = { color: string; size: number; focused: boolean };

const homeIcon = (props: IconArgs) => <HomeIcon {...props} />;
const discoverIcon = (props: IconArgs) => <DiscoverIcon {...props} />;
const controlsIcon = (props: IconArgs) => <ControlsIcon {...props} />;
const labIcon = (props: IconArgs) => <LabIcon {...props} />;

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

