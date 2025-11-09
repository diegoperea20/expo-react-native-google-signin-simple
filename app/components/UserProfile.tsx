import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type UserProfileProps = {
  user: {
    name: string;
    email: string;
    photo: string | null;
  };
  onSignOut: () => Promise<void>;
  onViewTasks: () => void;
  isSigninInProgress: boolean;
};

export const UserProfile = ({
  user,
  onSignOut,
  onViewTasks,
  isSigninInProgress,
}: UserProfileProps) => (
  <View className="flex-1 items-center justify-center p-5">
    <View className="items-center bg-white p-6 rounded-xl shadow-md w-full max-w-[300px]">
      {user.photo && (
        <Image
          source={{ uri: user.photo }}
          className="w-24 h-24 rounded-full mb-4 border-2 border-gray-200"
          resizeMode="cover"
        />
      )}
      <Text className="text-lg font-bold text-gray-800 mb-1 text-center">
        {user.name}
      </Text>
      <Text className="text-base text-gray-500 mb-6 text-center">
        {user.email}
      </Text>
      
      <TouchableOpacity
        className="flex-row items-center justify-center py-3 px-6 bg-blue-500 rounded-lg w-full mb-3"
        onPress={onViewTasks}
        disabled={isSigninInProgress}
      >
        <MaterialCommunityIcons name="format-list-checks" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">My Tasks</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        className="flex-row items-center justify-center py-3 px-6 bg-red-500 rounded-lg w-full"
        onPress={onSignOut}
        disabled={isSigninInProgress}
      >
        <MaterialCommunityIcons name="logout" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">Sign Out</Text>
      </TouchableOpacity>
    </View>
  </View>
);
