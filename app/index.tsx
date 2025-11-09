import { SafeAreaView } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { supabase } from '../supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import { LoginForm } from './components/LoginForm';
import { UserProfile } from './components/UserProfile';
import { TasksScreen } from './screens/TasksScreen';

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
  id: string;
  name: string;
  email: string;
  photo: string | null;
} | null;

type Screen = 'login' | 'profile' | 'tasks';

export default function App() {
  const [userInfo, setUserInfo] = useState<UserInfo>(null);
  const [isSigninInProgress, setIsSigninInProgress] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');

  // Check if user is already signed in
  useEffect(() => {
    const checkSignInStatus = async () => {
      try {
        const userInfo = await GoogleSignin.getCurrentUser();
        if (userInfo?.user) {
          setUserInfo({
            id: userInfo.user.id || '',
            name: userInfo.user.name || 'No Name',
            email: userInfo.user.email || '',
            photo: userInfo.user.photo || null,
          });
          setCurrentScreen('profile');
        }
      } catch {
        console.log('No existing session found');
        setUserInfo(null);
        setCurrentScreen('login');
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

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingUser) {
        await supabase
          .from('users')
          .update({ updatedAt: new Date().toISOString() })
          .eq('id', userId);
      } else {
        await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();
      }
    } catch (error) {
      console.error('Error managing user:', error);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSigninInProgress(true);
      
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      try {
        await GoogleSignin.signOut();
      } catch {
        console.log('No previous session to sign out from');
      }
      
      await GoogleSignin.signIn();
      const { accessToken, idToken } = await GoogleSignin.getTokens();
      
      if (!accessToken || !idToken) {
        throw new Error('Failed to get authentication tokens');
      }

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

      await createOrUpdateUser(user.id, userEmail, userName, userPhoto);

      setUserInfo({
        id: user.id,
        name: userName,
        email: userEmail,
        photo: userPhoto,
      });
      
      setCurrentScreen('profile');
      
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
      
      alert(errorMessage);
    } finally {
      setIsSigninInProgress(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      await supabase.auth.signOut();
      
      setUserInfo(null);
      setCurrentScreen('login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleViewTasks = () => {
    setCurrentScreen('tasks');
  };

  const handleBackToProfile = () => {
    setCurrentScreen('profile');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginForm
            onSignIn={handleGoogleSignIn}
            isSigninInProgress={isSigninInProgress}
          />
        );
      case 'profile':
        return userInfo && (
          <UserProfile
            user={userInfo}
            onSignOut={handleSignOut}
            onViewTasks={handleViewTasks}
            isSigninInProgress={isSigninInProgress}
          />
        );
      case 'tasks':
        return userInfo && (
          <TasksScreen
            userEmail={userInfo.email}
            onBack={handleBackToProfile}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {renderScreen()}
    </SafeAreaView>
  );
}