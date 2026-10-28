import { useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  LiquidHeaderProvider,
  createLiquidHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { Tabs } from './src/Tabs';
import { DetailsScreen } from './src/screens/DetailsScreen';
import { BarHeaderScreen } from './src/screens/BarHeaderScreen';
import { GlassLabScreen } from './src/screens/GlassLabScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { MergeScreen } from './src/screens/MergeScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Details: { title: string; image: string };
  BarHeader: undefined;
  GlassLab: undefined;
  EditProfile: undefined;
  Profile: { title: string; image: string };
  Merge: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const floatingHeader = createLiquidHeader();
const barHeader = createLiquidHeader({ variant: 'bar' });

export default function App() {
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <LiquidHeaderProvider>
          <Stack.Navigator
            screenOptions={{ header: floatingHeader, headerTransparent: true }}
          >
            <Stack.Screen
              name="Tabs"
              component={Tabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Details"
              component={DetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BarHeader"
              component={BarHeaderScreen}
              options={{ title: 'Bar header', header: barHeader }}
            />
            <Stack.Screen
              name="GlassLab"
              component={GlassLabScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Merge"
              component={MergeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              // The profile grows out of the chat's header instead of sliding in.
              options={{ headerShown: false, animation: 'fade' }}
            />
          </Stack.Navigator>
        </LiquidHeaderProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
