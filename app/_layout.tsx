import { Stack } from "expo-router";
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import "../app/global.css";

export default function RootLayout() {
  return (
    <View className="flex-1 bg-gray-100 pt-6">
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </View>
  );
}
