import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type LoginFormProps = {
  onSignIn: () => Promise<void>;
  isSigninInProgress: boolean;
};

export const LoginForm = ({ onSignIn, isSigninInProgress }: LoginFormProps) => (
  <View className="flex-1 items-center justify-center p-5">
    <Text className="text-2xl font-bold text-gray-800 mb-8">Welcome</Text>
    {isSigninInProgress ? (
      <View className="items-center justify-center p-5">
        <ActivityIndicator size="large" color="#4285F4" />
        <Text className="mt-2 text-gray-600 text-base">Signing in...</Text>
      </View>
    ) : (
      <TouchableOpacity
        className="flex-row items-center justify-center py-3 px-6 bg-blue-500 rounded-lg w-full max-w-[300px] shadow-md"
        onPress={onSignIn}
        disabled={isSigninInProgress}
      >
        <MaterialCommunityIcons name="google" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">Sign in with Google</Text>
      </TouchableOpacity>
    )}
  </View>
);
