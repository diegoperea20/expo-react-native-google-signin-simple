import { View, Text, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

// Get credentials
const { 
  googleWebClientId, 
  googleIosClientId 
} = Constants.expoConfig?.extra || {};

// Configuration Google Sign-In
GoogleSignin.configure({
  webClientId: googleWebClientId,
  iosClientId: googleIosClientId, 
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

type UserInfo = {
  user: {
    id: string;
    name: string;
    email: string;
    photo: string | null;
  } | null;
  error: string | null;
};

export default function App() {
  const [userInfo, setUserInfo] = useState<UserInfo>({ user: null, error: null });
  const [isSigninInProgress, setIsSigninInProgress] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Check if user is already signed in
  useEffect(() => {
    const checkSignInStatus = async () => {
      try {
        // Try to get current user directly
        const userInfo = await GoogleSignin.getCurrentUser();
        if (userInfo?.user) {
          setUserInfo({
            user: {
              id: userInfo.user.id || '',
              name: userInfo.user.name || 'No Name',
              email: userInfo.user.email || '',
              photo: userInfo.user.photo || null,
            },
            error: null,
          });
          setIsSignedIn(true);
        }
      } catch (_error) {
        console.log('No existing session found');
        setUserInfo({ user: null, error: null });
        setIsSignedIn(false);
      }
    };

    checkSignInStatus();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigninInProgress(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      try {
        await GoogleSignin.signOut();
      } catch (_signOutError) {
        console.log('No previous session to sign out from');
      }
      
      await GoogleSignin.signIn();
      const currentUser = await GoogleSignin.getCurrentUser();
      
      if (!currentUser?.user) {
        throw new Error('Failed to retrieve user information');
      }
      
      setUserInfo({
        user: {
          id: currentUser.user.id || '',
          name: currentUser.user.name || 'No Name',
          email: currentUser.user.email || '',
          photo: currentUser.user.photo || null,
        },
        error: null,
      });
      
      setIsSignedIn(true);
      
    } catch (error: any) {
      let errorMessage = 'An error occurred during sign in';
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available or outdated';
      } else {
        console.error('Google Sign-In Error:', error);
      }
      
      setUserInfo(prev => ({ ...prev, error: errorMessage }));
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSigninInProgress(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      setUserInfo({ user: null, error: null });
      setIsSignedIn(false);
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-1 items-center justify-center p-5">
        <Text className="text-2xl font-bold text-gray-800 mb-8">Welcome</Text>
        
        {isSigninInProgress ? (
          <View className="items-center justify-center p-5">
            <ActivityIndicator size="large" color="#4285F4" />
            <Text className="mt-2 text-gray-600 text-base">Signing in...</Text>
          </View>
        ) : isSignedIn && userInfo.user ? (
          <View className="items-center bg-white p-6 rounded-xl shadow-md w-full max-w-[300px]">
            {userInfo.user.photo && (
              <Image
                source={{ uri: userInfo.user.photo }}
                className="w-24 h-24 rounded-full mb-4 border-2 border-gray-200"
                resizeMode="cover"
              />
            )}
            <Text className="text-lg font-bold text-gray-800 mb-1 text-center">
              {userInfo.user.name}
            </Text>
            <Text className="text-base text-gray-500 mb-6 text-center">
              {userInfo.user.email}
            </Text>
            
            <TouchableOpacity
              className="flex-row items-center justify-center py-3 px-6 bg-red-500 rounded-lg w-full"
              onPress={handleSignOut}
              disabled={isSigninInProgress}
            >
              <MaterialCommunityIcons name="logout" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            className="flex-row items-center justify-center py-3 px-6 bg-blue-500 rounded-lg w-full max-w-[300px] shadow-md"
            onPress={handleGoogleSignIn}
            disabled={isSigninInProgress}
          >
            <MaterialCommunityIcons name="google" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Sign in with Google</Text>
          </TouchableOpacity>
        )}
        
        {userInfo.error && (
          <Text className="text-red-500 mt-5 text-center px-5">
            {userInfo.error}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}