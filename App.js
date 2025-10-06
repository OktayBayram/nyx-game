import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AchievementsProvider } from './shared/AchievementsContext';
import { SettingsProvider } from './shared/SettingsContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SettingsProvider>
      <AchievementsProvider>
        <NavigationContainer>
        <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Lobby" 
          component={LobbyScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Game" 
          component={GameScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
        </Stack.Navigator>
        </NavigationContainer>
      </AchievementsProvider>
    </SettingsProvider>
  );
}