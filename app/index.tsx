import { View, Text, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { supabase } from '../supabaseClient';
import * as WebBrowser from 'expo-web-browser';

// Required for Google OAuth in Expo
WebBrowser.maybeCompleteAuthSession();

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

  const createOrUpdateUser = async (userId: string, email: string, name: string, photoUrl: string | null) => {
    try {
      const userData = {
        id: userId,
        email: email,
        name: name,
        image: photoUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Try to update existing user first
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingUser) {
        // Only update the updatedAt timestamp for existing users
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            updatedAt: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) throw updateError;
        return updatedUser;
      } else {
        // Create new user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (insertError) throw insertError;
        return newUser;
      }
    } catch (error) {
      console.error('Error managing user:', error);
      throw error;
    }
  };

  const createOrUpdateAccount = async (userId: string, email: string, name: string, accessToken: string, refreshToken: string, idToken: string, photoUrl?: string | null) => {
  try {
    // First, check if the account exists
    const { data: existingAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('provider_account_id', userId)
      .single();

    // Generate a UUID for new accounts
    const uuid = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const accountData: any = {
      id: uuid(),  // Generate UUID for new accounts
      user_id: userId,
      type: 'oauth',
      provider: 'google',
      provider_account_id: userId,
      refresh_token: refreshToken,
      access_token: accessToken,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      scope: 'email profile',
      id_token: idToken,
      session_state: 'active',
    };

    // Only include name if the column exists in the table
    if (existingAccount?.hasOwnProperty('name')) {
      accountData.name = name;
    }

    if (existingAccount) {
      // For existing accounts, keep the original ID
      accountData.id = existingAccount.id;
      // Update existing account
      const { data: updatedAccount, error: updateError } = await supabase
        .from('accounts')
        .update(accountData)
        .eq('provider_account_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedAccount;
    } else {
      // Create new account with generated UUID
      const { data: newAccount, error: insertError } = await supabase
        .from('accounts')
        .insert([accountData])
        .select()
        .single();

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }
      return newAccount;
    }
  } catch (error) {
    console.error('Error managing account:', error);
    throw error;
  }
};

  const handleGoogleSignIn = async () => {
  try {
    setIsSigninInProgress(true);
    
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    try {
      await GoogleSignin.signOut();
    } catch (_signOutError) {
      console.log('No previous session to sign out from');
    }
    
    const userInfo = await GoogleSignin.signIn();
    const { accessToken, idToken } = await GoogleSignin.getTokens();
    
    if (!accessToken || !idToken) {
      throw new Error('Failed to get authentication tokens');
    }

    // Sign in with Supabase using Google OAuth
    const { data: { user, session }, error: supabaseError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      access_token: accessToken,
    });

    if (supabaseError || !user || !session) {
      throw supabaseError || new Error('Failed to authenticate with Supabase');
    }

    const userName = user.user_metadata?.full_name || 'No Name';
    const userEmail = user.email || '';
    const userPhoto = user.user_metadata?.avatar_url || null;

    // Create or update user in users table
    await createOrUpdateUser(
      user.id,
      userEmail,
      userName,
      userPhoto
    );

    // Create or update account in accounts table
    await createOrUpdateAccount(
      user.id,
      userEmail,
      userName,
      accessToken,
      session.refresh_token || '',
      idToken,
      userPhoto
    );

    // Update UI state
    setUserInfo({
      user: {
        id: user.id,
        name: userName,
        email: userEmail,
        photo: userPhoto,
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
      console.error('Sign-in Error:', error);
      errorMessage = error.message || errorMessage;
    }
    
    setUserInfo(prev => ({ ...prev, error: errorMessage }));
    Alert.alert('Error', errorMessage);
  } finally {
    setIsSigninInProgress(false);
  }
};

  const handleSignOut = async () => {
    try {
      // Sign out from Google
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Update UI state
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