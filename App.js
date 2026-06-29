import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen  from './src/screens/SplashScreen';
import HomeScreen    from './src/screens/HomeScreen';
import ArenasScreen  from './src/screens/ArenasScreen';
import GameScreen    from './src/screens/GameScreen';
import RulesScreen   from './src/screens/RulesScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Splash"  component={SplashScreen} />
        <Stack.Screen name="Home"    component={HomeScreen} />
        <Stack.Screen name="Arenas"  component={ArenasScreen} />
        <Stack.Screen name="Game"    component={GameScreen} />
        <Stack.Screen name="Rules"   component={RulesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
