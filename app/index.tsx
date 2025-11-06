import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
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
        // If there's an error, just continue without setting user as signed in
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
      
      // Check if device has Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Sign out first to ensure clean state
      try {
        await GoogleSignin.signOut();
      } catch (_signOutError) {
        console.log('No previous session to sign out from');
      }
      
      // Sign in
      await GoogleSignin.signIn();
      
      // Get user info after successful sign in
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        
        {isSigninInProgress ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>Signing in...</Text>
          </View>
        ) : isSignedIn && userInfo.user ? (
          <View style={styles.profileContainer}>
            {userInfo.user.photo && (
              <Image
                source={{ uri: userInfo.user.photo }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.userName}>{userInfo.user.name}</Text>
            <Text style={styles.userEmail}>{userInfo.user.email}</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.signOutButton]}
              onPress={handleSignOut}
              disabled={isSigninInProgress}
            >
              <MaterialCommunityIcons name="logout" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.signInButton]}
            onPress={handleGoogleSignIn}
            disabled={isSigninInProgress}
          >
            <MaterialCommunityIcons name="google" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Sign in with Google</Text>
          </TouchableOpacity>
        )}
        
        {userInfo.error && (
          <Text style={styles.errorText}>{userInfo.error}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signInButton: {
    backgroundColor: '#4285F4',
  },
  signOutButton: {
    backgroundColor: '#EA4335',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  buttonIcon: {
    marginRight: 10,
  },
  profileContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#f0f0f0',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#EA4335',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});